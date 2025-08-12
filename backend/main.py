from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import os
from dotenv import load_dotenv
import json
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import urllib.parse

load_dotenv()

app = FastAPI(title="Google Sheets Integration API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Google OAuth settings
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
]
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

# In-memory storage for demo (use proper database in production)
user_credentials = {}


class SheetData(BaseModel):
    spreadsheet_id: str
    sheet_name: str
    data: List[List[str]]
    headers: List[str]


class SpreadsheetInfo(BaseModel):
    spreadsheet_id: str
    title: str
    sheets: List[Dict[str, Any]]


@app.get("/")
async def root():
    return {"message": "Google Sheets Integration API"}


@app.get("/auth/login")
async def login():
    """Initiate Google OAuth flow"""
    if not CLIENT_ID or not CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail=
            "Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file"
        )

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [REDIRECT_URI]
            }
        },
        scopes=SCOPES)
    flow.redirect_uri = REDIRECT_URI

    authorization_url, state = flow.authorization_url(
        access_type='offline', include_granted_scopes='true')

    return {"auth_url": authorization_url, "state": state}


@app.get("/auth/callback")
async def auth_callback(code: str = Query(...), state: str = Query(...)):
    """Handle OAuth callback"""
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [REDIRECT_URI]
            }
        },
        scopes=SCOPES,
        state=state)
    flow.redirect_uri = REDIRECT_URI

    try:
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Store credentials (in production, use proper session management)
        user_id = "default_user"  # In production, use actual user ID
        user_credentials[user_id] = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }

        # Redirect to frontend with success message
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=f"{frontend_url}?auth=success")

    except Exception as e:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        error_message = urllib.parse.quote(str(e))
        return RedirectResponse(
            url=f"{frontend_url}?auth=error&message={error_message}")


@app.get("/spreadsheets", response_model=List[SpreadsheetInfo])
async def list_spreadsheets():
    """Get list of user's spreadsheets"""
    user_id = "default_user"

    if user_id not in user_credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    creds_data = user_credentials[user_id]
    credentials = Credentials(token=creds_data['token'],
                              refresh_token=creds_data['refresh_token'],
                              token_uri=creds_data['token_uri'],
                              client_id=creds_data['client_id'],
                              client_secret=creds_data['client_secret'],
                              scopes=creds_data['scopes'])

    try:
        # Refresh credentials if needed
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            # Update stored credentials
            user_credentials[user_id] = {
                'token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'token_uri': credentials.token_uri,
                'client_id': credentials.client_id,
                'client_secret': credentials.client_secret,
                'scopes': credentials.scopes
            }

        # Build Drive service to list spreadsheets
        drive_service = build('drive', 'v3', credentials=credentials)

        # Search for Google Sheets files
        results = drive_service.files().list(
            q="mimeType='application/vnd.google-apps.spreadsheet'",
            pageSize=50,
            fields="nextPageToken, files(id, name)").execute()

        files = results.get('files', [])
        spreadsheets = []

        # Build Sheets service to get sheet details
        sheets_service = build('sheets', 'v4', credentials=credentials)

        for file in files:
            try:
                # Get spreadsheet metadata
                spreadsheet = sheets_service.spreadsheets().get(
                    spreadsheetId=file['id']).execute()

                sheets = []
                for sheet in spreadsheet.get('sheets', []):
                    sheet_properties = sheet.get('properties', {})
                    sheets.append({
                        'title':
                        sheet_properties.get('title', 'Untitled'),
                        'sheetId':
                        sheet_properties.get('sheetId', 0),
                        'index':
                        sheet_properties.get('index', 0)
                    })

                spreadsheets.append(
                    SpreadsheetInfo(spreadsheet_id=file['id'],
                                    title=file['name'],
                                    sheets=sheets))

            except Exception as e:
                print(
                    f"Error getting details for spreadsheet {file['id']}: {str(e)}"
                )
                # Still add the spreadsheet with basic info
                spreadsheets.append(
                    SpreadsheetInfo(spreadsheet_id=file['id'],
                                    title=file['name'],
                                    sheets=[{
                                        'title': 'Sheet1',
                                        'sheetId': 0,
                                        'index': 0
                                    }]))

        return spreadsheets

    except Exception as e:
        print(f"Error in list_spreadsheets: {str(e)}")
        raise HTTPException(status_code=500,
                            detail=f"Error fetching spreadsheets: {str(e)}")


@app.get("/spreadsheet/{spreadsheet_id}/sheet/{sheet_name}")
async def get_sheet_data(spreadsheet_id: str, sheet_name: str):
    """Get data from a specific sheet"""
    user_id = "default_user"

    if user_id not in user_credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    creds_data = user_credentials[user_id]
    credentials = Credentials(token=creds_data['token'],
                              refresh_token=creds_data['refresh_token'],
                              token_uri=creds_data['token_uri'],
                              client_id=creds_data['client_id'],
                              client_secret=creds_data['client_secret'],
                              scopes=creds_data['scopes'])

    try:
        service = build('sheets', 'v4', credentials=credentials)

        # Get all data from the sheet
        range_name = f"{sheet_name}!A:ZZ"  # Get all columns
        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, range=range_name).execute()

        values = result.get('values', [])

        if not values:
            return SheetData(spreadsheet_id=spreadsheet_id,
                             sheet_name=sheet_name,
                             data=[],
                             headers=[])

        # First row as headers
        headers = values[0] if values else []
        data = values[1:] if len(values) > 1 else []

        return SheetData(spreadsheet_id=spreadsheet_id,
                         sheet_name=sheet_name,
                         data=data,
                         headers=headers)

    except Exception as e:
        raise HTTPException(status_code=500,
                            detail=f"Error fetching sheet data: {str(e)}")


@app.get("/auth/status")
async def auth_status():
    """Check if user is authenticated"""
    user_id = "default_user"
    is_authenticated = user_id in user_credentials
    return {"authenticated": is_authenticated}


@app.post("/auth/logout")
async def logout():
    """Logout user"""
    user_id = "default_user"
    if user_id in user_credentials:
        del user_credentials[user_id]
    return {"message": "Logged out successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8082)

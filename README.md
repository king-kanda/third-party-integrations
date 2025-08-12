# Google Sheets Integration

A full-stack application that allows users to connect to Google Sheets, browse their spreadsheets, select specific sheets, and send the data to a backend for processing.

## Features

- **Google OAuth Integration**: Secure authentication with Google
- **Spreadsheet Browser**: View all your Google Sheets
- **Sheet Selection**: Choose specific sheets from your spreadsheets
- **Data Preview**: See headers and sample data before sending
- **Backend Integration**: Send selected data to your backend for processing
- **Modern UI**: Beautiful, responsive interface with loading states and error handling

## Architecture

### Frontend (React + TypeScript + Vite)
- Modern React application with TypeScript
- Axios for API communication
- Lucide React for icons
- Custom CSS for styling

### Backend (FastAPI + Python)
- FastAPI for REST API
- Google APIs client library
- OAuth 2.0 flow handling
- CORS enabled for frontend communication

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API and Google Drive API
4. Go to "Credentials" and create OAuth 2.0 Client IDs
5. Add `http://localhost:8000/auth/callback` to authorized redirect URIs
6. Note down your Client ID and Client Secret

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with your Google credentials:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:8000/auth/callback
   FRONTEND_URL=http://localhost:5173
   ```

5. Start the backend server:
   ```bash
   python main.py
   ```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

1. Navigate to the integrations directory:
   ```bash
   cd intergrations
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

## Usage

1. **Connect to Google**: Click the "Connect to Google Sheets" button to authenticate
2. **Browse Spreadsheets**: After authentication, you'll see all your Google Sheets
3. **Select Spreadsheet**: Click on a spreadsheet to select it
4. **Choose Sheet**: Select the specific sheet you want to work with
5. **Preview Data**: Review the headers and sample data
6. **Send to Backend**: Click "Send to Backend" to process the data

## API Endpoints

### Authentication
- `GET /auth/login` - Initiate OAuth flow
- `GET /auth/callback` - Handle OAuth callback
- `GET /auth/status` - Check authentication status
- `POST /auth/logout` - Logout user

### Google Sheets
- `GET /spreadsheets` - List user's spreadsheets
- `GET /spreadsheet/{id}/sheet/{name}` - Get sheet data

## Development

### Frontend Development
The frontend uses modern React with TypeScript. Key files:
- `src/components/GoogleSheetsIntegration.tsx` - Main component
- `src/services/googleSheetsAPI.ts` - API service layer
- `src/components/GoogleSheetsIntegration.css` - Styling

### Backend Development
The backend uses FastAPI with Google APIs. Key features:
- OAuth 2.0 flow handling
- Google Sheets API integration
- CORS middleware for frontend communication
- In-memory session storage (use proper database in production)

## Production Considerations

1. **Security**:
   - Use proper session management instead of in-memory storage
   - Implement user authentication and authorization
   - Use HTTPS in production
   - Secure credential storage

2. **Database**:
   - Store user credentials securely in a database
   - Implement proper data persistence

3. **Error Handling**:
   - Add comprehensive error logging
   - Implement retry mechanisms for API calls
   - Add rate limiting

4. **Performance**:
   - Implement caching for spreadsheet metadata
   - Add pagination for large datasets
   - Optimize API calls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

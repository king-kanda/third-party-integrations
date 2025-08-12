import axios from 'axios';

const API_BASE_URL = 'http://localhost:8082';

export interface SpreadsheetInfo {
  spreadsheet_id: string;
  title: string;
  sheets: Array<{
    sheet_id: number;
    title: string;
    index: number;
    sheet_type: string;
  }>;
}

export interface SheetData {
  spreadsheet_id: string;
  sheet_name: string;
  data: string[][];
  headers: string[];
}

class GoogleSheetsAPI {
  async checkAuthStatus(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/status`);
      return response.data.authenticated;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
  }

  async initiateLogin(): Promise<string> {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/login`);
      return response.data.auth_url;
    } catch (error) {
      console.error('Error initiating login:', error);
      throw new Error('Failed to initiate Google OAuth');
    }
  }

  async logout(): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`);
    } catch (error) {
      console.error('Error logging out:', error);
      throw new Error('Failed to logout');
    }
  }

  async getSpreadsheets(): Promise<SpreadsheetInfo[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/spreadsheets`);
      return response.data;
    } catch (error) {
      console.error('Error fetching spreadsheets:', error);
      throw new Error('Failed to fetch spreadsheets');
    }
  }

  async getSheetData(spreadsheetId: string, sheetName: string): Promise<SheetData> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/spreadsheet/${spreadsheetId}/sheet/${encodeURIComponent(sheetName)}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      throw new Error('Failed to fetch sheet data');
    }
  }
}

export const googleSheetsAPI = new GoogleSheetsAPI();

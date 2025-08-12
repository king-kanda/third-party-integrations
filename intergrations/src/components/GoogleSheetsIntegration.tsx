import React, { useState, useEffect } from 'react';
import { googleSheetsAPI, type SpreadsheetInfo, type SheetData } from '../services/googleSheetsAPI';
import { ExternalLink, FileSpreadsheet, RefreshCw, LogOut, Database } from 'lucide-react';

const GoogleSheetsIntegration: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetInfo[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<SpreadsheetInfo | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkAuthStatus();
    
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      setIsAuthenticated(true);
      // Remove the query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('auth') === 'error') {
      setError(urlParams.get('message') || 'Authentication failed');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await googleSheetsAPI.checkAuthStatus();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        await loadSpreadsheets();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError('');
      const authUrl = await googleSheetsAPI.initiateLogin();
      window.location.href = authUrl;
    } catch (error) {
      setError('Failed to initiate Google login');
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await googleSheetsAPI.logout();
      setIsAuthenticated(false);
      setSpreadsheets([]);
      setSelectedSpreadsheet(null);
      setSelectedSheet('');
      setSheetData(null);
    } catch (error) {
      setError('Failed to logout');
    }
  };

  const loadSpreadsheets = async () => {
    try {
      setIsLoading(true);
      setError('');
      const sheets = await googleSheetsAPI.getSpreadsheets();
      setSpreadsheets(sheets);
    } catch (error) {
      setError('Failed to load spreadsheets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpreadsheetSelect = (spreadsheet: SpreadsheetInfo) => {
    setSelectedSpreadsheet(spreadsheet);
    setSelectedSheet('');
    setSheetData(null);
  };

  const handleSheetSelect = async (sheetName: string) => {
    if (!selectedSpreadsheet) return;

    try {
      setIsLoading(true);
      setError('');
      setSelectedSheet(sheetName);
      const data = await googleSheetsAPI.getSheetData(selectedSpreadsheet.spreadsheet_id, sheetName);
      setSheetData(data);
    } catch (error) {
      setError('Failed to load sheet data');
    } finally {
      setIsLoading(false);
    }
  };

  const sendToBackend = async () => {
    if (!sheetData) return;

    try {
      setIsLoading(true);
      setError('');
      
      // Here you would send the data to your backend
      // This is just a simulation
      const payload = {
        spreadsheet_id: sheetData.spreadsheet_id,
        sheet_name: sheetData.sheet_name,
        headers: sheetData.headers,
        data: sheetData.data,
        timestamp: new Date().toISOString()
      };

      console.log('Sending data to backend:', payload);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Data successfully sent to backend!');
    } catch (error) {
      setError('Failed to send data to backend');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="integration-container">
        <div className="auth-section">
          <FileSpreadsheet size={64} className="icon" />
          <h2>Google Sheets Integration</h2>
          <p>Connect to your Google Sheets to import data</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            onClick={handleLogin} 
            disabled={isLoading}
            className="connect-button"
          >
            {isLoading ? (
              <>
                <RefreshCw size={20} className="spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink size={20} />
                Connect to Google Sheets
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="integration-container">
      <div className="header">
        <div className="header-content">
          <FileSpreadsheet size={32} />
          <h2>Google Sheets Integration</h2>
        </div>
        <button onClick={handleLogout} className="logout-button">
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Spreadsheets List */}
      <div className="section">
        <div className="section-header">
          <h3>Your Spreadsheets</h3>
          <button onClick={loadSpreadsheets} disabled={isLoading} className="refresh-button">
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        {spreadsheets.length > 0 ? (
          <div className="spreadsheets-grid">
            {spreadsheets.map((spreadsheet) => (
              <div
                key={spreadsheet.spreadsheet_id}
                className={`spreadsheet-card ${
                  selectedSpreadsheet?.spreadsheet_id === spreadsheet.spreadsheet_id ? 'selected' : ''
                }`}
                onClick={() => handleSpreadsheetSelect(spreadsheet)}
              >
                <FileSpreadsheet size={24} />
                <div className="spreadsheet-info">
                  <h4>{spreadsheet.title}</h4>
                  <p>{spreadsheet.sheets.length} sheet(s)</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No spreadsheets found</p>
          </div>
        )}
      </div>

      {/* Sheet Selection */}
      {selectedSpreadsheet && (
        <div className="section">
          <h3>Select Sheet from "{selectedSpreadsheet.title}"</h3>
          <div className="sheets-list">
            {selectedSpreadsheet.sheets.map((sheet) => (
              <button
                key={sheet.sheet_id}
                onClick={() => handleSheetSelect(sheet.title)}
                className={`sheet-button ${selectedSheet === sheet.title ? 'selected' : ''}`}
                disabled={isLoading}
              >
                {sheet.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sheet Data Preview */}
      {sheetData && (
        <div className="section">
          <div className="section-header">
            <h3>Data Preview: {sheetData.sheet_name}</h3>
            <button onClick={sendToBackend} disabled={isLoading} className="send-button">
              <Database size={16} />
              Send to Backend
            </button>
          </div>

          <div className="data-preview">
            <div className="data-summary">
              <p>Headers: {sheetData.headers.length}</p>
              <p>Rows: {sheetData.data.length}</p>
            </div>

            {sheetData.headers.length > 0 && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      {sheetData.headers.map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetData.data.slice(0, 5).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {sheetData.headers.map((_, colIndex) => (
                          <td key={colIndex}>{row[colIndex] || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sheetData.data.length > 5 && (
                  <p className="table-note">Showing first 5 rows of {sheetData.data.length} total rows</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleSheetsIntegration;

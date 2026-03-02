import axios from 'axios';

// Use environment variable or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const pdfService = {

  /**
   * Upload a PDF file for processing.
   * Returns { success, pdf_id, filename, size_mb }
   */
  uploadPDF: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return response.data;
  },

  /**
   * Run extraction on a previously uploaded PDF.
   * Returns { success, pdf_id, filename, data: { income_statement, balance_sheet, cash_flow, additional_sections } }
   */
  extractPDF: async (pdfId) => {
    const response = await api.post(`/extract/${pdfId}`, {}, {
      timeout: 600000, // 10 min — 3 sequential extraction calls for large PDFs
    });
    return response.data;
  },

  /**
   * Connect to SSE progress stream for real-time extraction updates.
   * Opens an EventSource to the backend and calls onProgress(data) for each event.
   * Returns the EventSource instance (caller should close it when done).
   *
   * @param {string} pdfId
   * @param {(data: {step: number, total: number, message: string}) => void} onProgress
   * @returns {EventSource}
   */
  createProgressStream: (pdfId, onProgress) => {
    const baseUrl = API_BASE_URL;
    const eventSource = new EventSource(`${baseUrl}/extract/${pdfId}/progress`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onProgress(data);
        if (data.step === -1) {
          eventSource.close();
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return eventSource;
  },

  /**
   * Export extracted data in the given format.
   * Downloads the file directly.
   * @param {'json'|'xlsx'|'csv'|'pdf'|'docx'} format
   */
  exportData: async (pdfId, format) => {
    const response = await api.post(`/export/${pdfId}?format=${format}`, {}, {
      responseType: 'blob',
      timeout: 60000,
    });

    // Trigger browser download
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const ext = format === 'xlsx' ? 'xlsx' : format === 'docx' ? 'docx' : format;
    a.download = `extracted_data.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Health check
   */
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;

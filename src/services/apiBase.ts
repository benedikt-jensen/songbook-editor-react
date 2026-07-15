// The pdf-server host serves both PDF generation and the songs API. There's no
// server-side proxy in production (GH Pages is static), so every request uses
// this absolute, CORS-enabled URL rather than a relative path.
export const API_BASE_URL = import.meta.env.VITE_PDF_PRINTER_URL || 'https://217-154-71-76.sslip.io';

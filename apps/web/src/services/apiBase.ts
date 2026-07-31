// The api host serves both the songs API and PDF generation. There's no
// server-side proxy in production (GH Pages is static), so every request uses
// this absolute, CORS-enabled URL rather than a relative path.
export const API_BASE_URL = import.meta.env.VITE_PDF_PRINTER_URL || 'https://217-154-71-76.sslip.io';

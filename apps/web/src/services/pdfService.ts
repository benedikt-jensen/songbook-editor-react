import { API_BASE_URL } from './apiBase';

/** Posts rendered HTML to the api's puppeteer/paged.js endpoint and returns the raw PDF bytes. Throws on failure - callers decide how to surface that. */
export async function generatePdfBytes(html: string): Promise<Uint8Array> {
    const response = await fetch(`${API_BASE_URL}/generate-pdf`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ html }),
    });

    if (!response.ok) {
        throw new Error(`Failed to generate PDF: ${response.statusText}`);
    }

    return new Uint8Array(await response.arrayBuffer());
}

export function downloadBytes(bytes: Uint8Array, fileName: string) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
}

export async function downloadPdfFromHtml(html: string, fileName = 'document.pdf') {
    try {
        downloadBytes(await generatePdfBytes(html), fileName);
    } catch (err) {
        console.error(err);
        alert(err + 'Error generating PDF');
    }
}

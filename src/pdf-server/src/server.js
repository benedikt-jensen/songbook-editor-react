"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const allowedOrigins = [
    "https://benedikt-jensen.github.io",
    "http://localhost:5173",
];
const pagedjsRoot = path_1.default.dirname(path_1.default.dirname(require.resolve("pagedjs")));
const pagedPolyfillJs = fs_1.default.readFileSync(path_1.default.join(pagedjsRoot, "dist", "paged.polyfill.js"), "utf-8");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: allowedOrigins }));
app.use(express_1.default.json({ limit: "5mb" }));
app.use(express_1.default.json());
app.post("/generate-pdf", async (req, res) => {
    const { html } = req.body;
    try {
        const browser = await puppeteer_1.default.launch({
            headless: true,
            args: [
                "--no-sandbox", // required on Linux (Render)
                "--disable-setuid-sandbox", // required on Linux
                "--disable-dev-shm-usage", // optional but safer on containers
            ],
            executablePath: puppeteer_1.default.executablePath(),
        });
        const page = await browser.newPage();
        // Load HTML content directly
        await page.setContent(html, { waitUntil: "networkidle0" });
        await page.evaluateHandle("document.fonts.ready");
        // Paginate the content with paged.js before printing, so the PDF
        // matches the live preview (repeating page frame, multi-page flow).
        await page.evaluate(() => {
            window.PagedConfig = {
                auto: true,
                after: () => {
                    window.__pagedDone = true;
                },
            };
        });
        await page.addScriptTag({ content: pagedPolyfillJs });
        await page.waitForFunction(() => window.__pagedDone === true, { timeout: 30000 });
        await page.emulateMediaType("screen");
        // Generate PDF with backgrounds, using the page size paged.js set via @page
        const pdfBuffer = await page.pdf({
            printBackground: true,
            preferCSSPageSize: true,
        });
        await browser.close();
        // Send PDF back to client
        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
    }
    catch (err) {
        console.error(err);
        res.status(500).send(`Failed to generate PDF:\n${err}`);
    }
});
app.listen(3001, '127.0.0.1', () => {
    console.log("PDF server running on http://127.0.0.1:3001");
});

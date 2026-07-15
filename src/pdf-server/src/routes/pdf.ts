import { Router } from "express";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const pagedjsRoot = path.dirname(path.dirname(require.resolve("pagedjs")));
const pagedPolyfillJs = fs.readFileSync(path.join(pagedjsRoot, "dist", "paged.polyfill.js"), "utf-8");

const router = Router();

router.post("/generate-pdf", async (req, res) => {
    const { html } = req.body;

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",             // required on Linux (Render)
                "--disable-setuid-sandbox", // required on Linux
                "--disable-dev-shm-usage",  // optional but safer on containers
            ],
            executablePath: puppeteer.executablePath(),
        });
        const page = await browser.newPage();

        // Load HTML content directly. setContent()'s own waitUntil no longer
        // accepts "networkidle0" in newer Puppeteer versions (it's now
        // load/domcontentloaded only), so wait for network idle as a
        // separate, still-supported step - same "0 connections for 500ms"
        // semantics, just via a dedicated API instead of a waitUntil value.
        await page.setContent(html, { waitUntil: "load" });
        await page.waitForNetworkIdle();
        await page.evaluateHandle("document.fonts.ready");

        // Paginate the content with paged.js before printing, so the PDF
        // matches the live preview (repeating page frame, multi-page flow).
        await page.evaluate(() => {
            (window as unknown as { PagedConfig: object }).PagedConfig = {
                auto: true,
                after: () => {
                    (window as unknown as { __pagedDone: boolean }).__pagedDone = true;
                },
            };
        });
        await page.addScriptTag({ content: pagedPolyfillJs });
        await page.waitForFunction(
            () => (window as unknown as { __pagedDone?: boolean }).__pagedDone === true,
            { timeout: 30000 }
        );

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
    } catch (err) {
        console.error(err);
        res.status(500).send(`Failed to generate PDF:\n${err}`);
    }
});

export default router;

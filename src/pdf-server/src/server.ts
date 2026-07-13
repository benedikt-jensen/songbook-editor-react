import express from "express";
import puppeteer from "puppeteer";
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.json());

app.post("/generate-pdf", async (req, res) => {
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

        // Load HTML content directly
        await page.setContent(html, { waitUntil: "networkidle0" });
        await page.evaluateHandle("document.fonts.ready");        
        await page.emulateMediaType("screen");
        
        // Generate PDF with backgrounds
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            scale: 1
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

app.listen(3001, '127.0.0.1', () => {
    console.log("PDF server running on http://127.0.0.1:3001");
});
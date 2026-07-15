import express from "express";
import cors from "cors";
import pdfRouter from "./routes/pdf";
import songsRouter from "./routes/songs";
import { seedIfEmpty } from "./seed";

const allowedOrigins = [
    "https://benedikt-jensen.github.io",
];

const app = express();
app.use(cors({
    origin: (origin, callback) => {
        // No Origin header (curl, server-to-server) or an allow-listed production
        // origin, or any localhost dev port - Vite picks a different one whenever
        // the default is already in use, which would otherwise fail confusingly.
        if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
}));
app.use(express.json({ limit: "5mb" }));

seedIfEmpty();

app.use(pdfRouter);
app.use(songsRouter);

app.listen(3001, '127.0.0.1', () => {
    console.log("PDF server running on http://127.0.0.1:3001");
});

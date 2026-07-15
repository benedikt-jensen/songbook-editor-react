import fs from "fs";
import path from "path";
import { db } from "./db";
import { extractTitle, extractArtist } from "./routes/songs";

export function seedIfEmpty() {
    const { count } = db.prepare("SELECT COUNT(*) as count FROM songs").get() as { count: number };
    if (count > 0) return;

    const seedDir = path.join(__dirname, "seed-data");
    if (!fs.existsSync(seedDir)) return;

    const files = fs.readdirSync(seedDir).filter((f) => f.endsWith(".txt"));
    const now = new Date().toISOString();
    const insert = db.prepare(
        "INSERT INTO songs (title, artist, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    );
    for (const file of files) {
        const content = fs.readFileSync(path.join(seedDir, file), "utf-8");
        insert.run(extractTitle(content), extractArtist(content), content, now, now);
    }
    if (files.length > 0) {
        console.log(`Seeded ${files.length} song(s) into the database.`);
    }
}

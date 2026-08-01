import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../auth";

function extractDirective(content: string, key: string): string | null {
    const pattern = new RegExp(`^\\{${key}:\\s*(.+?)\\s*\\}$`, "i");
    for (const line of content.split(/\r?\n/)) {
        const match = line.trim().match(pattern);
        if (match) return match[1];
    }
    return null;
}

export function extractTitle(content: string): string {
    return extractDirective(content, "title") ?? "Untitled";
}

export function extractArtist(content: string): string | null {
    return extractDirective(content, "artist");
}

interface SongRow {
    id: number;
    title: string;
    artist: string | null;
    content: string;
    created_at: string;
    updated_at: string;
}

// Mounted at /songs in server.ts - router.use() below is scoped to that
// prefix, not the whole app (see the /share/:token bug this fixed).
const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
    const rows = db
        .prepare("SELECT id, title, artist, updated_at FROM songs WHERE user_id = ? ORDER BY updated_at DESC")
        .all(req.userId);
    res.json(rows);
});

router.get("/:id", (req, res) => {
    const row = db
        .prepare("SELECT * FROM songs WHERE id = ? AND user_id = ?")
        .get(req.params.id, req.userId) as SongRow | undefined;
    if (!row) {
        res.status(404).json({ error: "Song not found" });
        return;
    }
    res.json(row);
});

router.post("/", (req, res) => {
    const content: string = req.body?.content ?? "";
    const title = extractTitle(content);
    const artist = extractArtist(content);
    const now = new Date().toISOString();
    const info = db
        .prepare("INSERT INTO songs (title, artist, content, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?)")
        .run(title, artist, content, now, now, req.userId);
    const row = db.prepare("SELECT * FROM songs WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(row);
});

router.put("/:id", (req, res) => {
    const content: string = req.body?.content ?? "";
    const title = extractTitle(content);
    const artist = extractArtist(content);
    const now = new Date().toISOString();
    const info = db
        .prepare("UPDATE songs SET title = ?, artist = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?")
        .run(title, artist, content, now, req.params.id, req.userId);
    if (info.changes === 0) {
        res.status(404).json({ error: "Song not found" });
        return;
    }
    const row = db.prepare("SELECT * FROM songs WHERE id = ?").get(req.params.id);
    res.json(row);
});

router.delete("/:id", (req, res) => {
    const info = db.prepare("DELETE FROM songs WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
    if (info.changes === 0) {
        res.status(404).json({ error: "Song not found" });
        return;
    }
    res.status(204).send();
});

export default router;

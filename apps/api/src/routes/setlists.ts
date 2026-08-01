import crypto from "crypto";
import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../auth";

interface SetlistRow {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
}

interface SetlistSongRow {
    id: number;
    song_id: number;
    position: number;
    title: string;
    artist: string | null;
}

// Mounted at /setlists in server.ts - router.use() below is scoped to that
// prefix, not the whole app (see the /share/:token bug this fixed).
const router = Router();
router.use(requireAuth);

function ownSetlist(setlistId: string | number, userId: number): SetlistRow | undefined {
    return db.prepare("SELECT * FROM setlists WHERE id = ? AND user_id = ?").get(setlistId, userId) as
        | SetlistRow
        | undefined;
}

function songsForSetlist(setlistId: number): SetlistSongRow[] {
    return db
        .prepare(
            `SELECT setlist_songs.id, setlist_songs.song_id, setlist_songs.position, songs.title, songs.artist
             FROM setlist_songs JOIN songs ON songs.id = setlist_songs.song_id
             WHERE setlist_songs.setlist_id = ?
             ORDER BY setlist_songs.position ASC`,
        )
        .all(setlistId) as SetlistSongRow[];
}

router.get("/", (req, res) => {
    const rows = db
        .prepare(
            `SELECT setlists.*, COUNT(setlist_songs.id) as song_count
             FROM setlists LEFT JOIN setlist_songs ON setlist_songs.setlist_id = setlists.id
             WHERE setlists.user_id = ?
             GROUP BY setlists.id
             ORDER BY setlists.updated_at DESC`,
        )
        .all(req.userId);
    res.json(rows);
});

router.post("/", (req, res) => {
    const name: string = (req.body?.name ?? "").trim();
    if (!name) {
        res.status(400).json({ error: "A setlist name is required" });
        return;
    }
    const now = new Date().toISOString();
    const info = db
        .prepare("INSERT INTO setlists (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)")
        .run(req.userId, name, now, now);
    res.status(201).json({ id: info.lastInsertRowid, name, createdAt: now, updatedAt: now, songs: [] });
});

router.get("/:id", (req, res) => {
    const setlist = ownSetlist(req.params.id, req.userId!);
    if (!setlist) {
        res.status(404).json({ error: "Setlist not found" });
        return;
    }
    res.json({ ...setlist, songs: songsForSetlist(setlist.id) });
});

router.put("/:id", (req, res) => {
    const setlist = ownSetlist(req.params.id, req.userId!);
    if (!setlist) {
        res.status(404).json({ error: "Setlist not found" });
        return;
    }
    const name: string = (req.body?.name ?? "").trim();
    if (!name) {
        res.status(400).json({ error: "A setlist name is required" });
        return;
    }
    const now = new Date().toISOString();
    db.prepare("UPDATE setlists SET name = ?, updated_at = ? WHERE id = ?").run(name, now, setlist.id);
    res.json({ ...setlist, name, updated_at: now, songs: songsForSetlist(setlist.id) });
});

router.delete("/:id", (req, res) => {
    const setlist = ownSetlist(req.params.id, req.userId!);
    if (!setlist) {
        res.status(404).json({ error: "Setlist not found" });
        return;
    }
    db.prepare("DELETE FROM setlists WHERE id = ?").run(setlist.id);
    res.status(204).send();
});

router.post("/:id/songs", (req, res) => {
    const setlist = ownSetlist(req.params.id, req.userId!);
    if (!setlist) {
        res.status(404).json({ error: "Setlist not found" });
        return;
    }
    const songId = Number(req.body?.songId);
    const song = db.prepare("SELECT id FROM songs WHERE id = ? AND user_id = ?").get(songId, req.userId);
    if (!song) {
        res.status(404).json({ error: "Song not found" });
        return;
    }
    const { maxPosition } = db
        .prepare("SELECT COALESCE(MAX(position), -1) as maxPosition FROM setlist_songs WHERE setlist_id = ?")
        .get(setlist.id) as { maxPosition: number };
    db.prepare("INSERT INTO setlist_songs (setlist_id, song_id, position) VALUES (?, ?, ?)").run(
        setlist.id,
        songId,
        maxPosition + 1,
    );
    db.prepare("UPDATE setlists SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), setlist.id);
    res.status(201).json({ songs: songsForSetlist(setlist.id) });
});

router.delete("/:id/songs/:setlistSongId", (req, res) => {
    const setlist = ownSetlist(req.params.id, req.userId!);
    if (!setlist) {
        res.status(404).json({ error: "Setlist not found" });
        return;
    }
    const info = db
        .prepare("DELETE FROM setlist_songs WHERE id = ? AND setlist_id = ?")
        .run(req.params.setlistSongId, setlist.id);
    if (info.changes === 0) {
        res.status(404).json({ error: "Song is not in this setlist" });
        return;
    }
    db.prepare("UPDATE setlists SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), setlist.id);
    res.json({ songs: songsForSetlist(setlist.id) });
});

// Body: { setlistSongIds: number[] } - the setlist_songs.id values in their new order.
router.put("/:id/reorder", (req, res) => {
    const setlist = ownSetlist(req.params.id, req.userId!);
    if (!setlist) {
        res.status(404).json({ error: "Setlist not found" });
        return;
    }
    const setlistSongIds: unknown = req.body?.setlistSongIds;
    if (!Array.isArray(setlistSongIds) || !setlistSongIds.every((id) => typeof id === "number")) {
        res.status(400).json({ error: "setlistSongIds must be an array of numbers" });
        return;
    }

    const current = songsForSetlist(setlist.id);
    if (setlistSongIds.length !== current.length || !current.every((s) => setlistSongIds.includes(s.id))) {
        res.status(400).json({ error: "setlistSongIds must match this setlist's current songs exactly" });
        return;
    }

    const update = db.prepare("UPDATE setlist_songs SET position = ? WHERE id = ?");
    const reorder = db.transaction((ids: number[]) => {
        ids.forEach((id, index) => update.run(index, id));
    });
    reorder(setlistSongIds);
    db.prepare("UPDATE setlists SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), setlist.id);
    res.json({ songs: songsForSetlist(setlist.id) });
});

router.post("/:id/share", (req, res) => {
    const setlist = ownSetlist(req.params.id, req.userId!);
    if (!setlist) {
        res.status(404).json({ error: "Setlist not found" });
        return;
    }
    const existing = db.prepare("SELECT token FROM share_links WHERE setlist_id = ?").get(setlist.id) as
        | { token: string }
        | undefined;
    if (existing) {
        res.json({ token: existing.token });
        return;
    }
    const token = crypto.randomBytes(16).toString("hex");
    db.prepare("INSERT INTO share_links (token, setlist_id, created_at) VALUES (?, ?, ?)").run(
        token,
        setlist.id,
        new Date().toISOString(),
    );
    res.status(201).json({ token });
});

export default router;

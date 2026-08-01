import { Router } from "express";
import { db } from "../db";

interface SetlistRow {
    id: number;
    name: string;
}

interface ShareSongRow {
    id: number;
    title: string;
    artist: string | null;
    content: string;
}

const router = Router();

// Deliberately public - no auth. Anyone with the link (created via
// POST /setlists/:id/share, which IS owner-only) can view.
router.get("/share/:token", (req, res) => {
    const link = db.prepare("SELECT setlist_id FROM share_links WHERE token = ?").get(req.params.token) as
        | { setlist_id: number }
        | undefined;
    if (!link) {
        res.status(404).json({ error: "This link is invalid or has been disabled" });
        return;
    }

    const setlist = db.prepare("SELECT id, name FROM setlists WHERE id = ?").get(link.setlist_id) as
        | SetlistRow
        | undefined;
    if (!setlist) {
        res.status(404).json({ error: "This link is invalid or has been disabled" });
        return;
    }

    const songs = db
        .prepare(
            `SELECT songs.id, songs.title, songs.artist, songs.content
             FROM setlist_songs JOIN songs ON songs.id = setlist_songs.song_id
             WHERE setlist_songs.setlist_id = ?
             ORDER BY setlist_songs.position ASC`,
        )
        .all(setlist.id) as ShareSongRow[];

    res.json({ name: setlist.name, songs });
});

export default router;

import Database from "better-sqlite3";
import path from "path";

const dbPath = process.env.SONGS_DB_PATH || path.join(__dirname, "..", "songs.sqlite");

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artist TEXT,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
`);

const versionRow = db.prepare("SELECT version FROM schema_version LIMIT 1").get();
if (!versionRow) {
    db.prepare("INSERT INTO schema_version (version) VALUES (1)").run();
}

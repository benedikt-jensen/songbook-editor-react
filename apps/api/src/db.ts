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

const versionRow = db.prepare("SELECT version FROM schema_version LIMIT 1").get() as { version: number } | undefined;
if (!versionRow) {
    db.prepare("INSERT INTO schema_version (version) VALUES (1)").run();
}
const schemaVersion = versionRow?.version ?? 1;

// v2: accounts, setlists, and shareable setlist links. Songs gain a nullable
// user_id (nullable so pre-existing/seeded rows don't need a real owner -
// they just stay invisible to every account, which is fine for dev data).
if (schemaVersion < 2) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS setlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS setlist_songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setlist_id INTEGER NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
            song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
            position INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS share_links (
            token TEXT PRIMARY KEY,
            setlist_id INTEGER NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL
        );
    `);

    const songColumns = db.prepare("PRAGMA table_info(songs)").all() as { name: string }[];
    if (!songColumns.some((c) => c.name === "user_id")) {
        db.exec(`ALTER TABLE songs ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`);
    }

    db.prepare("UPDATE schema_version SET version = 2").run();
}

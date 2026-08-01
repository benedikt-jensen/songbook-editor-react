import { Router } from "express";
import { db } from "../db";
import { createSession, destroySession, hashPassword, requireAuth, verifyPassword } from "../auth";

interface UserRow {
    id: number;
    email: string;
    password_hash: string;
}

const router = Router();

function isValidEmail(email: unknown): email is string {
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/auth/register", (req, res) => {
    const email: string = (req.body?.email ?? "").trim().toLowerCase();
    const password: string = req.body?.password ?? "";
    if (!isValidEmail(email) || password.length < 8) {
        res.status(400).json({ error: "Valid email and a password of at least 8 characters are required" });
        return;
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
        res.status(409).json({ error: "An account with that email already exists" });
        return;
    }

    const now = new Date().toISOString();
    const info = db
        .prepare("INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)")
        .run(email, hashPassword(password), now);

    const token = createSession(Number(info.lastInsertRowid));
    res.status(201).json({ token, user: { id: info.lastInsertRowid, email } });
});

router.post("/auth/login", (req, res) => {
    const email: string = (req.body?.email ?? "").trim().toLowerCase();
    const password: string = req.body?.password ?? "";

    const user = db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(email) as UserRow | undefined;
    if (!user || !verifyPassword(password, user.password_hash)) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
    }

    const token = createSession(user.id);
    res.json({ token, user: { id: user.id, email: user.email } });
});

router.post("/auth/logout", requireAuth, (req, res) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
    if (token) destroySession(token);
    res.status(204).send();
});

router.get("/auth/me", requireAuth, (req, res) => {
    const user = db.prepare("SELECT id, email FROM users WHERE id = ?").get(req.userId) as UserRow | undefined;
    if (!user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }
    res.json({ id: user.id, email: user.email });
});

export default router;

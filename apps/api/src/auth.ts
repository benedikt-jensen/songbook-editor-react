import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { db } from "./db";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            userId?: number;
        }
    }
}

export function hashPassword(password: string): string {
    return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
}

export function createSession(userId: number): string {
    const token = crypto.randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    db.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
        token,
        userId,
        now.toISOString(),
        expiresAt.toISOString(),
    );
    return token;
}

export function destroySession(token: string): void {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

function userIdForToken(token: string): number | null {
    const row = db.prepare("SELECT user_id, expires_at FROM sessions WHERE token = ?").get(token) as
        | { user_id: number; expires_at: string }
        | undefined;
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) {
        destroySession(token);
        return null;
    }
    return row.user_id;
}

function tokenFromHeader(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    return header.slice("Bearer ".length);
}

/** Rejects unauthenticated requests; sets req.userId for downstream handlers. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const token = tokenFromHeader(req);
    const userId = token ? userIdForToken(token) : null;
    if (!userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }
    req.userId = userId;
    next();
}

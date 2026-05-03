import { NextRequest } from "next/server";
import { db } from "@/lib/database";

export async function POST(
    request: NextRequest
) {
    const sub = await request.json();

    const endpoint = sub.endpoint;
    const p256dh = sub.keys.p256dh;
    const auth = sub.keys.auth;

    const stmt = db.prepare(`
        INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth)
        VALUES (?, ?, ?)
    `);
    stmt.run(endpoint, p256dh, auth); 

    return Response.json({
        success: true
    }, { status: 200 });
}
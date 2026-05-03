import { db } from "@/lib/database";

export async function GET() {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?")
        .get("vapid") as { value: string } | undefined;

    if (!row) {
        return Response.json({
            error: "VAPID not initialized"
        }, { status: 500 });
    }

    const { publicKey } = JSON.parse(row.value);

    return Response.json({
        publicKey
    }, { status: 200 });
}
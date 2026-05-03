import webpush from "web-push";
import { db } from "./database";

export async function sendPushToAll(
    payload: { title: string; body: string; url?: string }
) {
    const vapid = db.prepare("SELECT value FROM settings WHERE key = ?")
        .get("vapid") as { value: string };

    const { publicKey, privateKey } = JSON.parse(vapid.value);

    webpush.setVapidDetails("mailto:admin@example.com", publicKey, privateKey);

    const subs = db.prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions")
        .all() as { endpoint: string; p256dh: string; auth: string }[];

    for (const sub of subs) {
        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                JSON.stringify(payload)
            );
        } catch (error: any) {
            console.error("Push error:", error.message);

            // Clean up expired or invalid subscriptions
            if (error.statusCode === 410) {
                db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?")
                    .run(sub.endpoint);
            }
        }
    }
}
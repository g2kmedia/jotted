import webpush from "web-push";
import { db } from "./database";

export function initVapidKeys(): void {
    let row = db.prepare("SELECT value FROM settings WHERE key = ?")
        .get("vapid") as { value: string } | undefined;

    if (!row) {
        const keys = webpush.generateVAPIDKeys();

        db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
            .run("vapid", JSON.stringify(keys));

        row = { value: JSON.stringify(keys) };
    }
}
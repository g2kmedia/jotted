import { db } from "@/lib/database";

export function createTask(): number | bigint {
    const stmt = db.prepare('INSERT INTO task (title, content) VALUES (?, ?)');
    const createdTaskId = stmt.run('New Untitled Task', '');

    return createdTaskId.lastInsertRowid;
}
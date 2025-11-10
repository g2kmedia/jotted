import { db } from "@/lib/database";

export function createTask(): number | bigint {
    const stmt = db.prepare('INSERT INTO task (title, content) VALUES (?, ?)');
    const createdTaskId = stmt.run('New Untitled Task', '');

    return createdTaskId.lastInsertRowid;
}

type TaskUpdate = {
    title: string
    content?: string
    dueDate?: string
    priority?: number
}

export function updateTask(id: string, updates: TaskUpdate): any {
    const columnMap: Record<string, string> = {
        dueDate: "due_date"
    };

    const columns = Object.keys(updates);
    const setClause = columns.map(column => `${columnMap[column] || column} = ?`).join(", ");
    const values = Object.values(updates);

    const stmt = db.prepare(`UPDATE task SET ${setClause} WHERE id = ?`);
    const info = stmt.run(...values, id);
    return info.changes;
}
import { db } from "@/lib/database";
import { TaskSchema } from "./schemas";

const ALLOWED_COLUMNS = ["id", "title", "content", "created_at", "updated_at", "due_date", "priority", "is_completed", "is_trashed"] as const;

export function getTask(id: string, columns?: string[]): Partial<TaskSchema> {    
    let selectedColumns = " * ";

    if (columns) {
        const allColumnsValid = columns.every(col => ALLOWED_COLUMNS.includes(col as any));

        if (!allColumnsValid) {
            console.log(columns, allColumnsValid)
            throw new Error("Invalid column name");
        }

        selectedColumns = columns.join(", ");
    }

    const stmt = db.prepare(`SELECT ${selectedColumns} FROM task WHERE id = ?`);
    const task = stmt.get(id);

    if (!task) {
        throw new Error("Task not found");
    }

    return task as Partial<TaskSchema>;
}

export function createTask(): number | bigint {
    const stmt = db.prepare('INSERT INTO task (title, content) VALUES (?, ?)');
    const createdTaskId = stmt.run('New Untitled Task', '');

    return createdTaskId.lastInsertRowid;
}

type TaskUpdate = {
    title: string
    content?: string
    due_date?: string
    priority?: number
}

export function updateTask(id: string, updates: TaskUpdate): any {
    const columns = Object.keys(updates);
    const setClause = columns.map(column => `${column} = ?`).join(", ");
    const values = Object.values(updates);

    const stmt = db.prepare(`UPDATE task SET ${setClause} WHERE id = ?`);
    const info = stmt.run(...values, id);
    return info.changes;
}
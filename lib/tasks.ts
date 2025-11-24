import { db } from "@/lib/database";
import { Task, TaskWithTags } from "./types";

const ALLOWED_COLUMNS = ["id", "title", "content", "created_at", "updated_at", "due_date", "priority", "is_completed", "is_trashed"] as const;

export function createTask(): number | bigint {
    const stmt = db.prepare('INSERT INTO task (title, content) VALUES (?, ?)');
    const createdTaskId = stmt.run('New Untitled Task', '');

    return createdTaskId.lastInsertRowid;
}

export function getTask(id: string, columns?: string[]): Partial<Task> {
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

    return task as Partial<Task>;
}

type tasksApiParams = {
    columns?: string[]
    idBefore?: number
    tags?: string[]
    limit?: number
}

type TaskWithTagRow = Partial<Task> & {
    tags: string
}

export function getAllTasks(params: tasksApiParams): TaskWithTags[] | null {
    const {
        columns = [],
        idBefore,
        tags = [],
        limit = 20
    } = params;

    if (columns.length > 0 && !columns.every(col => (ALLOWED_COLUMNS as readonly string[]).includes(col))) {
        throw new Error("Invalid column name");
    }

    const selectedColumns = columns.length > 0
        ? columns.map(col => `task.${col}`).join(",")
        : "task.*";

    const whereClauses: string[] = [];
    const queryParams: (string | number)[] = [];

    if (idBefore) {
        whereClauses.push('task.id < ?');
        queryParams.push(idBefore);
    }

    if (tags.length > 0) {
        const placeholders = tags.map(() => '?').join(",");
        whereClauses.push(`task.id IN (
            SELECT DISTINCT task_tag.task_id
            FROM task_tag
            WHERE task_tag.tag_id IN (${placeholders})
        )`);
        queryParams.push(...tags);
    }

    const finalWhereClause = whereClauses.length > 0
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

    const query = `
        SELECT ${selectedColumns},
            COALESCE(
                json_group_array(tag.name) FILTER (WHERE tag.name IS NOT NULL),
                json_array()
            ) as tags
        FROM task
        LEFT JOIN task_tag ON task.id = task_tag.task_id
        LEFT JOIN tag ON task_tag.tag_id = tag.id
        ${finalWhereClause}
        GROUP BY task.id
        ORDER BY task.updated_at DESC, task.id DESC
        LIMIT ?
    `;

    queryParams.push(limit);

    const stmt = db.prepare(query);
    const tasksArr = stmt.all(...queryParams);

    return (tasksArr as TaskWithTagRow[]).map(row => ({
        ...row,
        tags: JSON.parse(row.tags) as string[]
    }));
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

export function deleteTask(id: string): number {
    const stmt = db.prepare('DELETE FROM task WHERE id = ?');
    const result = stmt.run(id);

    return result.changes;
}
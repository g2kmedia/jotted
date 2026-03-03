import { db } from "@/lib/database";
import { Task, TaskWithTags } from "./types";
import { DateTime } from "luxon";

const ALLOWED_COLUMNS = ["id", "title", "content", "created_at", "updated_at", "due_date", "priority", "is_completed", "is_trashed"] as const;

export function createTask(taskData: Task): void {
    const stmt = db.prepare(`
        INSERT INTO task (id, title, content, created_at, updated_at, due_date, priority, is_completed, is_trashed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        taskData.id,
        taskData.title,
        taskData.content,
        taskData.created_at,
        taskData.updated_at,
        taskData.due_date,
        taskData.priority,
        taskData.is_completed,
        taskData.is_trashed
    );
}

export function getTask(id: string, columns?: string[]): Partial<Task> {
    if (columns &&
        !columns.every(col => (ALLOWED_COLUMNS as readonly string[]).includes(col))
    ) {
        throw new Error("Invalid column name");
    }

    const selectedColumns = columns ? columns.join(", ") : " * ";

    const stmt = db.prepare(`SELECT ${selectedColumns} FROM task WHERE id = ?`);
    const task = stmt.get(id);

    if (!task) {
        throw new Error("Task not found");
    }

    return task as Partial<Task>;
}

type tasksApiParams = {
    columns?: string[]
    isCompleted?: string
    isTrashed?: string
    dueDateStart?: string
    dueDateEnd?: string
    hasDueDate?: string
    lastQueriedRecord?: { id: string, updated_at: string }
    tags?: string[]
    limit?: number
}

type TaskWithTagRow = Partial<Task> & {
    tags: string
}

export function getAllTasks(params: tasksApiParams): TaskWithTags[] | null {
    const {
        columns = [],
        isCompleted,
        isTrashed,
        dueDateStart,
        dueDateEnd,
        hasDueDate,
        lastQueriedRecord,
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
    const queryParams = [];

    if (isCompleted) {
        whereClauses.push('task.is_completed = ?');
        queryParams.push(isCompleted);
    }

    if (isTrashed) {
        whereClauses.push('task.is_trashed = ?');
        queryParams.push(isTrashed);
    }

    if (lastQueriedRecord) {
        const clause = "task.updated_at < ? OR (task.updated_at = ? AND task.id < ?)";
        whereClauses.push(`(${clause})`);
        queryParams.push(
            lastQueriedRecord.updated_at,
            lastQueriedRecord.updated_at,
            lastQueriedRecord.id
        );
    }

    if (dueDateStart || dueDateEnd) {

        if (dueDateStart && dueDateEnd) {
            const startUTC = DateTime.fromISO(dueDateStart).toUTC().toISO();
            const endUTC = DateTime.fromISO(dueDateEnd).toUTC().toISO();

            if (!startUTC || !endUTC) {
                throw new Error("Invalid date format");
            }

            whereClauses.push('task.due_date >= ? AND task.due_date <= ?');
            queryParams.push(startUTC, endUTC);

        } else if (dueDateStart) {
            const startUTC = DateTime.fromISO(dueDateStart).toUTC().toISO();

            if (!startUTC) {
                throw new Error("Invalid date format");
            }

            whereClauses.push('task.due_date >= ?');
            queryParams.push(startUTC);

        } else if (dueDateEnd) {
            const endUTC = DateTime.fromISO(dueDateEnd).toUTC().toISO();

            if (!endUTC) {
                throw new Error("Invalid date format");
            }

            whereClauses.push('task.due_date <= ?');
            queryParams.push(endUTC);
        }
    }


    if (tags.length > 0) {
        const placeholders = tags.map(() => '?').join(",");
        whereClauses.push(`task.id IN (
            SELECT DISTINCT tt.task_id
            FROM task_tag tt
            JOIN tag t ON tt.tag_id = t.id
            WHERE t.name IN (${placeholders})
        )`);
        queryParams.push(...tags);
    }

    if (hasDueDate === "true") {
        whereClauses.push('task.due_date IS NOT NULL');
    } else if (hasDueDate === "false") {
        whereClauses.push('task.due_date IS NULL');
    }

    const finalWhereClause = whereClauses.length > 0
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

    const orderBy = dueDateStart || dueDateEnd
        ? "ORDER BY task.due_date ASC, task.priority ASC, task.updated_at DESC, task.id DESC"
        : "ORDER BY task.updated_at DESC, task.id DESC";

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
        ${orderBy}
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

export function updateTask(id: string, updates: Partial<Task>): number {
    const columns = Object.keys(updates);

    if (!columns.every(col => (ALLOWED_COLUMNS as readonly string[]).includes(col))) {
        throw new Error("Invalid column name");
    }

    const setClause = columns.map(column => `${column} = ?`).join(", ");
    const values = Object.values(updates);

    const update = db.transaction(() => {
        const stmt = db.prepare(`UPDATE task SET ${setClause} WHERE id = ?`);
        return stmt.run(...values, id);
    });

    const info = update();
    return info.changes;
}

export function deleteTask(id: string): number {
    const remove = db.transaction(() => {
        const stmt = db.prepare('DELETE FROM task WHERE id = ?');
        return stmt.run(id);
    });

    const result = remove();
    return result.changes;
}

export function getTaskCounts(
    params: { timezone: string, isCompleted: string | undefined, isTrashed: string | undefined }
): {
    today: number;
    week: number;
    scheduled: number;
    later: number;
} {
    const {
        timezone,
        isCompleted,
        isTrashed
    } = params;

    let whereClause = 'WHERE 1=1';
    const queryParams: string[] = [];

    if (isCompleted) {
        whereClause += ' AND is_completed = ?';
        queryParams.push(isCompleted);
    }

    if (isTrashed) {
        whereClause += ' AND is_trashed = ?';
        queryParams.push(isTrashed);
    }

    const today = DateTime.now().setZone(timezone);

    // Convert to UTC for SQLite comparison
    const todayEndUTC = today.endOf("day").toUTC().toISO();
    const weekEndUTC = today.endOf("week").toUTC().toISO();

    return {
        today: (db.prepare(`
            SELECT COUNT(*) as count FROM task 
            ${whereClause} AND due_date <= ?
        `).get(...queryParams, todayEndUTC) as { count: number }).count,

        week: (db.prepare(`
            SELECT COUNT(*) as count FROM task 
            ${whereClause} AND due_date <= ?
        `).get(...queryParams, weekEndUTC) as { count: number }).count,

        scheduled: (db.prepare(`
            SELECT COUNT(*) as count FROM task 
            ${whereClause} AND due_date IS NOT NULL
        `).get(...queryParams) as { count: number }).count,

        later: (db.prepare(`
            SELECT COUNT(*) as count FROM task 
            ${whereClause} AND due_date IS NULL
        `).get(...queryParams) as { count: number }).count
    };
}
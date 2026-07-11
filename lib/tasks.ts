import { db } from "@/lib/sqlite";
import { localTask, Task, TaskWithTags } from "./types";
import { DateTime } from "luxon";
import { openDB, pruneIfNeeded, requestToPromise } from "./indexeddb";

// SQLite
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
    params: { timezone: string }
): {
    today: number;
    week: number;
    scheduled: number;
    later: number;
    completed: number;
    trashed: number;
} {
    const { timezone } = params;
    const today = DateTime.now().setZone(timezone);

    // Convert to UTC for SQLite comparison
    const todayEndUTC = today.endOf("day").toUTC().toISO();
    const weekEndUTC = today.endOf("week").toUTC().toISO();

    return {
        today: (db.prepare(`
            SELECT COUNT(*) as count FROM task 
            WHERE 1=1 AND due_date <= ? AND is_completed = 0 AND is_trashed = 0
        `).get(todayEndUTC) as { count: number }).count,

        week: (db.prepare(`
            SELECT COUNT(*) as count FROM task 
            WHERE 1=1 AND due_date <= ? AND is_completed = 0 AND is_trashed = 0
        `).get(weekEndUTC) as { count: number }).count,

        scheduled: (db.prepare(`
            SELECT COUNT(*) as count FROM task 
            WHERE 1=1 AND due_date IS NOT NULL AND is_completed = 0 AND is_trashed = 0
        `).get() as { count: number }).count,

        later: (db.prepare(`
            SELECT COUNT(*) as count FROM task 
            WHERE 1=1 AND due_date IS NULL AND is_completed = 0 AND is_trashed = 0
        `).get() as { count: number }).count,

        completed: (db.prepare(`
            SELECT COUNT(*) as count FROM task
            WHERE 1=1 AND is_completed = 1 AND is_trashed = 0
        `).get() as { count: number }).count,

        trashed: (db.prepare(`
            SELECT COUNT(*) as count FROM task
            WHERE 1=1 AND is_trashed = 1
        `).get() as { count: number }).count
    };
}

// IndexedDB
const MAX_TASKS = 100;

export const saveTaskLocally = async (
    task: Partial<localTask> & { id: string }
): Promise<localTask> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readwrite");
    const store = tx.objectStore("tasks");

    await pruneIfNeeded(store, "tasks", MAX_TASKS);

    const existingData = await new Promise((resolve, reject) => {
        const req = store.get(task.id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    const mergedData = { ...(existingData || {}), ...task };

    await new Promise<void>((resolve, reject) => {
        const req = store.put(mergedData);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });

    return mergedData as localTask;
};

export const getTaskLocally = async (taskId: string): Promise<localTask | undefined> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readonly");
    const store = tx.objectStore("tasks");
    const request = store.get(taskId);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export const getAllTasksLocally = async (
    quickFilter: string | null = null,
    dueDate: string | null = null,
    lastQueriedRecord: { id: string; updated_at: string } | null = null,
    tags: string[] = [],
    limit = 20
): Promise<localTask[]> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readonly");
    const store = tx.objectStore("tasks");

    let indexName;

    if (dueDate) {
        indexName = "incompleted_due";
    } else {
        indexName = "completed_trashed";
    }

    const index = store.index(indexName);

    let allTasks: localTask[] = [];

    switch (quickFilter) {
        case null:
            const defaultReq = index.getAll(IDBKeyRange.only([0, 0]));
            allTasks = await requestToPromise(defaultReq);
            break;
        case "completed":
            const completedReq = index.getAll(IDBKeyRange.only([1, 0]));
            allTasks = await requestToPromise(completedReq);
            break;
        case "trashed":
            const trashedReq1 = await requestToPromise<localTask[]>(index.getAll(IDBKeyRange.only([0, 1])));
            const trashedReq2 = await requestToPromise<localTask[]>(index.getAll(IDBKeyRange.only([1, 1])));
            allTasks = [...trashedReq1, ...trashedReq2];
            break;
        case "today":
            console.log(dueDate)
            const todayReq = index.getAll(IDBKeyRange.upperBound([0, 0, dueDate]));
            allTasks = await requestToPromise(todayReq);
            break;
        case "week":
            const weekReq = index.getAll(IDBKeyRange.upperBound([0, 0, dueDate]));
            allTasks = await requestToPromise(weekReq);
            break;
        case "scheduled":
            const scheduledReq = index.getAll(IDBKeyRange.only([0, 0]));
            const rawScheduledTasks = await requestToPromise<localTask[]>(scheduledReq);
            allTasks = rawScheduledTasks.filter(task => task.due_date !== null);
            break;
        case "later":
            const laterReq = index.getAll(IDBKeyRange.only([0, 0]));
            const rawLaterTasks = await requestToPromise<localTask[]>(laterReq);
            allTasks = rawLaterTasks.filter(task => task.due_date === null);
            break;
    }

    let filteredTasks = allTasks.filter(task =>
        !tags.length || tags.some(t => task.tags.includes(t))
    );

    filteredTasks.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

    if (lastQueriedRecord) {
        const lastIdx = filteredTasks.findIndex(task => task.id === lastQueriedRecord.id);
        if (lastIdx !== -1) {
            filteredTasks = filteredTasks.slice(lastIdx + 1);
        }
    }

    return filteredTasks.slice(0, limit);
}

export const getAllTasksTagsLocally = async (): Promise<string[]> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readonly");
    const store = tx.objectStore("tasks");
    const tagsIndex = store.index("tags");

    const request = tagsIndex.getAll();

    const tasks = await requestToPromise<Promise<localTask[]>>(request);
    const nonCompletedTrashedTasks = tasks.filter(task => task.is_completed !== 1 && task.is_trashed !== 1);

    const allTags = nonCompletedTrashedTasks.flatMap(task => task.tags);
    return [...new Set(allTags)];
}

export const getTaskCountsLocally = async (): Promise<{
    today: number,
    week: number,
    scheduled: number,
    later: number,
    completed: number,
    trashed: number
}> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readonly");
    const store = tx.objectStore("tasks");
    const index = store.index("incompleted_due");
    const completedTrashed = store.index("completed_trashed");

    const now = DateTime.now();
    const endOfToday = now.endOf("day").toUTC().toISO();
    const endOfWeek = now.endOf("week").toUTC().toISO();
    const nextWeekStart = now.plus({ weeks: 1 }).startOf('week').toUTC().toISO();

    const counts = {
        today: 0,
        week: 0,
        scheduled: 0,
        later: 0,
        completed: 0,
        trashed: 0
    };
    console.log(endOfToday)
    counts.today = await requestToPromise(index.count(IDBKeyRange.upperBound([0, 0, endOfToday])));
    counts.week = await requestToPromise(index.count(IDBKeyRange.upperBound([0, 0, endOfWeek])));

    const future = await requestToPromise<number>(index.count(IDBKeyRange.bound([0, 0, nextWeekStart], [0, 0, "9999-12-31T23:59:59.999Z"])));
    counts.scheduled = future + counts.week;

    const nonCompletedTrashedTasks = await requestToPromise<number>(completedTrashed.count(IDBKeyRange.only([0, 0])));
    counts.later = nonCompletedTrashedTasks - counts.scheduled;

    counts.completed = await requestToPromise(completedTrashed.count(IDBKeyRange.only([1, 0])));

    const trashed1 = await requestToPromise<number>(completedTrashed.count(IDBKeyRange.only([0, 1])));
    const trashed2 = await requestToPromise<number>(completedTrashed.count(IDBKeyRange.only([1, 1])));
    counts.trashed = trashed1 + trashed2;

    return counts;
}

export const deleteTaskLocally = async (taskId: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readwrite");

    const request = tx.objectStore("tasks").delete(taskId);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
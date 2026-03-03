import { nanoid } from 'nanoid';
import { db } from "@/lib/database";
import { DateTime } from "luxon";

interface TagRow {
    name: string;
}

export function updateNoteTags(id: string, updates: string[]): number {
    const currentTagsQuery = db.prepare(`
        SELECT t.name FROM tag t
        JOIN note_tag nt ON t.id = nt.tag_id
        WHERE nt.note_id = ?    
    `);

    const currentTags = (currentTagsQuery.all(id) as TagRow[]).map(row => row.name);

    const toAdd = updates.flatMap(tag =>
        !currentTags.includes(tag) && tag ? [tag] : [] // Check if tag is defined to prevent inserting empty space as tag
    );
    const toRemove = currentTags.flatMap(tag =>
        !updates.includes(tag) ? [tag] : []
    );

    const transaction = db.transaction(() => {
        let changes = 0;

        if (toAdd.length > 0) {
            const insertTagStmt = db.prepare(`INSERT OR IGNORE INTO tag (id, name) VALUES (?, ?)`);
            toAdd.forEach(tag => insertTagStmt.run(nanoid(), tag));

            const insertRelationStmt = db.prepare(`
                    INSERT INTO note_tag (note_id, tag_id)
                    SELECT ?, id FROM tag WHERE name = ?
            `);
            toAdd.forEach(tag => {
                changes += insertRelationStmt.run(id, tag).changes;
            });
        }

        if (toRemove.length > 0) {
            const removeStmt = db.prepare(`
                    DELETE FROM note_tag
                    WHERE note_id = ? AND tag_id = (
                        SELECT id FROM tag WHERE name = ?
                )
            `);
            toRemove.forEach(tag => {
                changes += removeStmt.run(id, tag).changes;
            });
        }

        return { changes };
    });

    return transaction().changes;
}

export function getNoteTags(noteId: string): string[] {
    const stmt = db.prepare(`
        SELECT t.name
        FROM tag t
        JOIN note_tag nt ON t.id = nt.tag_id
        WHERE nt.note_id = ?
    `);
    const result = stmt.all(noteId) as Array<{ name: string }>;

    return result.map(row => row.name);
}

type notesTagsApiParams = {
    isPinned?: string
    isTrashed?: string
}

export function getAllNotesTags(params: notesTagsApiParams): string[] {
    const { isPinned, isTrashed } = params;

    const whereClauses: string[] = [];
    const queryParams: string[] = [];

    if (isPinned) {
        whereClauses.push('note.is_pinned = ?');
        queryParams.push(isPinned);
    }

    if (isTrashed) {
        whereClauses.push('note.is_trashed = ?');
        queryParams.push(isTrashed);
    }

    const finalWhereClause = whereClauses.length > 0
        ? `WHERE ${whereClauses.join(" AND ")}`
        : "";

    const query = `
        SELECT DISTINCT tag.name
        FROM tag
        WHERE EXISTS (
            SELECT 1
            FROM note_tag
            JOIN note ON note.id = note_tag.note_id
            AND note_tag.tag_id = tag.id
            ${finalWhereClause}
        )
        ORDER BY tag.name ASC
    `;

    const stmt = db.prepare(query);
    const result = stmt.all(...queryParams) as { name: string }[];

    return result.map(row => row.name);
}

export function getTaskTags(noteId: string): string[] {
    const stmt = db.prepare(`
        SELECT t.name
        FROM tag t
        JOIN task_tag tt ON t.id = tt.tag_id
        WHERE tt.task_id = ?
    `);
    const result = stmt.all(noteId) as Array<{ name: string }>;

    return result.map(row => row.name);

}

type tasksTagsApiParams = {
    isCompleted?: string
    isTrashed?: string
    dueDateStart?: string
    dueDateEnd?: string
    hasDueDate?: string
}

export function getAllTasksTags(params: tasksTagsApiParams): string[] {
    const {
        isCompleted,
        isTrashed,
        dueDateStart,
        dueDateEnd,
        hasDueDate,
    } = params;

    const whereClauses: string[] = [];
    const queryParams: (string | number)[] = [];

    if (isCompleted) {
        whereClauses.push('task.is_completed = ?');
        queryParams.push(isCompleted);
    }

    if (isTrashed) {
        whereClauses.push('task.is_trashed = ?');
        queryParams.push(isTrashed);
    }

    if (dueDateStart && dueDateEnd) {
        // Convert to UTC for SQLite comparison
        const startUTC = DateTime.fromISO(dueDateStart).toUTC().toISO();
        const endUTC = DateTime.fromISO(dueDateEnd).toUTC().toISO();

        if (!startUTC || !endUTC) {
            throw new Error("Invalid date format");
        }

        whereClauses.push('task.due_date >= ? AND task.due_date <= ?');
        queryParams.push(startUTC, endUTC);
    }

    if (hasDueDate === "true") {
        whereClauses.push('task.due_date IS NOT NULL');
    } else if (hasDueDate === "false") {
        whereClauses.push('task.due_date IS NULL');
    }

    const finalWhereClause = whereClauses.length > 0
        ? `WHERE ${whereClauses.join(" AND ")}`
        : "";

    const query = `
        SELECT DISTINCT tag.name
        FROM tag
        WHERE EXISTS (
            SELECT 1
            FROM task_tag
            JOIN task ON task.id = task_tag.task_id
            AND task_tag.tag_id = tag.id
            ${finalWhereClause}
        )
        ORDER BY tag.name ASC
    `;

    const stmt = db.prepare(query);
    const result = stmt.all(...queryParams) as { name: string}[];

    return result.map(row => row.name);
}

export function updateTaskTags(id: string, updates: string[]): number {
    const currentTagsQuery = db.prepare(`
        SELECT t.name FROM tag t
        JOIN task_tag tt ON t.id = tt.tag_id
        WHERE tt.task_id = ?    
    `);

    const currentTags = (currentTagsQuery.all(id) as TagRow[]).map(row => row.name);

    const toAdd = updates.flatMap(tag =>
        !currentTags.includes(tag) && tag ? [tag] : [] // Check if tag is defined to prevent inserting empty space as tag
    );
    const toRemove = currentTags.flatMap(tag =>
        !updates.includes(tag) ? [tag] : []
    );

    const transaction = db.transaction(() => {
        let changes = 0;

        if (toAdd.length > 0) {
            const insertTagStmt = db.prepare(`INSERT OR IGNORE INTO tag (id, name) VALUES (?, ?)`);
            toAdd.forEach(tag => insertTagStmt.run(nanoid(), tag));

            const insertRelationStmt = db.prepare(`
                    INSERT INTO task_tag (task_id, tag_id)
                    SELECT ?, id FROM tag WHERE name = ?
            `);
            toAdd.forEach(tag => {
                changes += insertRelationStmt.run(id, tag).changes;
            });
        }

        if (toRemove.length > 0) {
            const removeStmt = db.prepare(`
                    DELETE FROM task_tag
                    WHERE task_id = ? AND tag_id = (
                        SELECT id FROM tag WHERE name = ?
                )
            `);
            toRemove.forEach(tag => {
                changes += removeStmt.run(id, tag).changes;
            });
        }

        return { changes };
    });

    return transaction().changes;
}
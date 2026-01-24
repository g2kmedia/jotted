import { db } from "@/lib/database";

export function searchNotes(searchTerm: string) {
    const stmt = db.prepare(`
        SELECT n.* FROM note n
        JOIN note_fts f ON n.id = f.rowid
        WHERE note_fts MATCH ?
        AND n.is_trashed = 0
        ORDER BY rank
    `);

    return stmt.all(searchTerm);
}

export function searchTasks(searchTerm: string) {
    const stmt = db.prepare(`
        SELECT t.* FROM task t
        JOIN task_fts f ON t.id = f.rowid
        WHERE task_fts MATCH ?
        AND t.is_trashed = 0
        ORDER BY rank
    `);

    return stmt.all(searchTerm);
}

export function searchAll(searchTerm: string) {
    return {
        notes: searchNotes(searchTerm),
        tasks: searchTasks(searchTerm)
    };
}
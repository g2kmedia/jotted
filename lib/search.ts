import { db } from "@/lib/database";

export function searchAll(searchTerm: string) {
    const searchQuery = `${searchTerm}*`;

    const stmt = db.prepare(`
        SELECT
            n.id,
            snippet(note_fts, 0, '<mark>', '</mark>', '...', 10) as title,
            snippet(note_fts, 1, '<mark>', '</mark>', '...', 10) as content,
            'notes' as type,
            f.rank
        FROM note n
        JOIN note_fts f ON n.id = f.rowid
        WHERE note_fts MATCH ?
        AND n.is_trashed = 0

        UNION ALL

        SELECT
            t.id,
            snippet(task_fts, 0, '<mark>', '</mark>', '...', 10) as title,
            snippet(task_fts, 1, '<mark>', '</mark>', '...', 10) as content,
            'tasks' as type,
            f.rank
        FROM task t
        JOIN task_fts f ON t.id = f.rowid
        WHERE task_fts MATCH ?
        AND t.is_trashed = 0

        ORDER BY rank
    `);

    return stmt.all(searchQuery, searchQuery);
}
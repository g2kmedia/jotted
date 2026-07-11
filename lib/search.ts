import { db } from "@/lib/sqlite";
import { SearchResult } from "./types";

export function searchAll(searchTerm: string): SearchResult[] {
    const searchQuery = `${searchTerm}*`; // search term with prefix matching

    const stmt = db.prepare(`
        SELECT
            n.id,
            snippet(note_fts, 1, '<mark>', '</mark>', '...', 10) as title,
            snippet(note_fts, 2, '<mark>', '</mark>', '...', 10) as content,
            'notes' as type,
            f.rank
        FROM note n
        JOIN note_fts f ON n.id = f.note_id
        WHERE note_fts MATCH ?
        AND n.is_trashed = 0

        UNION ALL

        SELECT
            t.id,
            snippet(task_fts, 1, '<mark>', '</mark>', '...', 10) as title,
            snippet(task_fts, 2, '<mark>', '</mark>', '...', 10) as content,
            'tasks' as type,
            f.rank
        FROM task t
        JOIN task_fts f ON t.id = f.task_id
        WHERE task_fts MATCH ?
        AND t.is_trashed = 0

        ORDER BY rank
    `);

    return stmt.all(searchQuery, searchQuery) as SearchResult[];
}
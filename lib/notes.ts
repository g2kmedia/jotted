import { db } from "@/lib/database";
import { Note, NoteWithTag, NoteSchema, NoteUpdate } from "./schemas";

const ALLOWED_COLUMNS = Object.keys(NoteSchema.shape);
const PartialNoteSchema = NoteSchema.partial();

export function createNote(): number | bigint {
    const stmt = db.prepare('INSERT INTO note (title, content) VALUES (?, ?)')
    const createdNoteId = stmt.run('New Untitled Note', '');

    return createdNoteId.lastInsertRowid;
}

export function getNote(id: string, columns?: string[]): Partial<Note> {
    if (columns &&
        !columns.every(col => ALLOWED_COLUMNS.includes(col))
    ) {
        throw new Error("Invalid column name");
    }

    const selectedColumns = columns ? columns.join(", ") : " * ";

    const stmt = db.prepare(`SELECT ${selectedColumns} FROM note WHERE id = ?`);
    const note = stmt.get(id);

    if (!note) {
        throw new Error("Note not found");
    }

    return PartialNoteSchema.parse(note);
}

type notesApiParams = {
    columns?: string[],
    idBefore?: number
    tags?: string[]
    limit?: number
}

type NoteWithTagRow = Partial<Note> & {
    tags: string
}

export function getAllNotes(params: notesApiParams): Partial<NoteWithTag>[] | null {
    const {
        columns = [],
        idBefore,
        tags = [],
        limit = 20
    } = params;

    if (columns.length > 0 && !columns.every(col => ALLOWED_COLUMNS.includes(col))) {
        throw new Error("Invalid column name");
    }

    const selectedColumns = columns.length > 0
        ? columns.map(col => `n.${col}`).join(",")
        : "n.*";

    const whereClauses: string[] = [];
    const queryParams: (string | number)[] = [];

    if (idBefore) {
        whereClauses.push('n.id < ?');
        queryParams.push(idBefore);
    }

    if (tags.length > 0) {
        const placeholders = tags.map(() => '?').join();
        whereClauses.push(`n.id IN (
            SELECT DISTINCT nt2.note_id 
            FROM note_tag nt2 
            WHERE nt2.tag_id IN (${placeholders})
        )`);
        queryParams.push(...tags);
    }

    const finalWhereClause = whereClauses.length > 0
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

    const query = `
        SELECT ${selectedColumns},
            COALESCE(
                json_group_array(t.name) FILTER (WHERE t.name IS NOT NULL),
                json_array()
            ) as tags
        FROM note n
        LEFT JOIN note_tag nt ON n.id = nt.note_id
        LEFT JOIN tag t ON nt.tag_id = t.id
        ${finalWhereClause}
        GROUP BY n.id
        ORDER BY n.updated_at DESC, n.id DESC
        LIMIT ?
    `;

    queryParams.push(limit);

    const stmt = db.prepare(query);
    const notesArr = stmt.all(...queryParams);

    return (notesArr as NoteWithTagRow[]).map(row => ({
        ...row,
        tags: JSON.parse(row.tags) as string[]
    }));
}

export function updateNote(id: string, updates: NoteUpdate): number {
    const columns = Object.keys(updates);
    const setClause = columns.map(column => `${column} = ?`).join(", ");
    const values = Object.values(updates).map(v =>
        "content" in updates ? JSON.stringify(v) : v
    );

    const stmt = db.prepare(`UPDATE note SET ${setClause} WHERE id = ?`);
    const info = stmt.run(...values, id);
    return info.changes;
}

export function deleteNote(id: string): number {
    const stmt = db.prepare('DELETE FROM note WHERE id = ?');
    const result = stmt.run(id);

    return result.changes;
}

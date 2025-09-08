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
    columns: string[],
    limit: number
    idBefore?: number
}

type NoteWithTagRow = Partial<Note> & {
    tags: string
}

export function getAllNotes(params: notesApiParams): Partial<NoteWithTag>[] | null {
    if (params.columns &&
        !params.columns.every(col => ALLOWED_COLUMNS.includes(col))
    ) {
        throw new Error("Invalid column name");
    }

    const selectedColumns = params.columns
        ? params.columns.map(col => "n." + col).join(", ")
        : " * ";

    const baseQuery = `
        SELECT ${selectedColumns}, COALESCE(
            json_group_array(t.name) FILTER (WHERE t.name IS NOT NULL),
            json_array()
            ) as tags
        FROM note n
        LEFT JOIN note_tag nt ON n.id = nt.note_id
        LEFT JOIN tag t ON nt.tag_id = t.id
        `;

    const whereClause = params.idBefore ? 'WHERE n.id < ?' : '';

    const groupOrderLimit = `
        GROUP BY n.id
        ORDER BY n.updated_at DESC, n.id DESC
        LIMIT ?`;

    const stmt = db.prepare(baseQuery + whereClause + groupOrderLimit);

    let notesArr;

    if (params.idBefore) {
        notesArr = stmt.all(params.idBefore, params.limit);
    } else {
        notesArr = stmt.all(params.limit);
    }

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

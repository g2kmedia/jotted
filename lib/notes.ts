import { db } from "@/lib/database";
import { Note, NoteWithTag, NoteSchema, NoteUpdate } from "./schemas";
import { z } from "zod";

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

interface NoteWithTagRow extends Partial<Note> {
    tags: string
}

export function getAllNotes(columns?: string[]): Partial<NoteWithTag>[] | null {
    if (columns &&
        !columns.every(col => ALLOWED_COLUMNS.includes(col))
    ) {
        throw new Error("Invalid column name");
    }

    const selectedColumns = columns ? columns.map(col => "n." + col).join(", ") : " * ";

    const stmt = db.prepare<[], NoteWithTagRow>(`
        SELECT ${selectedColumns}, COALESCE(
            json_group_array(t.name) FILTER (WHERE t.name IS NOT NULL),
            json_array()
            ) as tags
        FROM note n
        LEFT JOIN note_tag nt ON n.id = nt.note_id
        LEFT JOIN tag t ON nt.tag_id = t.id
        GROUP BY n.id
        `);
    const notesArr = stmt.all().map(row => ({
        ...row,
        tags: JSON.parse(row.tags) as string[]
    }));
    
    return notesArr;
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

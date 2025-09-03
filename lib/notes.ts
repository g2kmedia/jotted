import { db } from "@/lib/database";
import { Note, NoteSchema, NoteUpdate } from "./schemas";
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

export function getAllNotes(columns?: string[]): Partial<Note>[] | null {
    if (columns &&
        !columns.every(col => ALLOWED_COLUMNS.includes(col))
    ) {
        throw new Error("Invalid column name");
    }

    const selectedColumns = columns ? columns.join(", ") : " * ";

    const stmt = db.prepare(`SELECT ${selectedColumns} FROM note`);
    const notesArr = stmt.all();

    const validatedNotes = z.array(PartialNoteSchema).safeParse(notesArr);

    return validatedNotes.success ? validatedNotes.data : null;
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

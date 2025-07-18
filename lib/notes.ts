import { db } from "@/lib/database";
import { NoteSchema, NoteUpdate, type Note } from "./schemas";

export function createNote(): number | bigint  {
    const stmt = db.prepare('INSERT INTO note (title) VALUES (?)')
    const createdNoteId = stmt.run("New Untitled Note");

    return createdNoteId.lastInsertRowid;
}

export function getNote(id: string): Note {
    const stmt = db.prepare('SELECT * FROM note WHERE id = ?');
    const note = stmt.get(id);

    if (!note) {
        throw new Error("Note not found");
    }

    return NoteSchema.parse(note);
}

export function updateNote(id: string, update: NoteUpdate): number {
    const columns = Object.keys(update);
    const setClause = columns.map(column => `${column} = ?`).join(", ");
    const values = Object.values(update);

    const stmt = db.prepare(`UPDATE note SET ${setClause} WHERE id = ?`);
    const info = stmt.run(...values, id);

    return info.changes;
}
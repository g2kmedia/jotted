import { db } from "@/lib/database";
import { NoteSchema, NoteUpdate, type Note } from "./schemas";

export function createNote(): number | bigint  {
    const stmt = db.prepare('INSERT INTO note (title, content) VALUES (?, ?)')
    const createdNoteId = stmt.run('New Untitled Note', '');

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
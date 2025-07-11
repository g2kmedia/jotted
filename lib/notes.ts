import { db } from "@/lib/database";
import { NoteSchema, type Note } from "./schemas";

export function getNote(id: string): Note {
    const stmt = db.prepare('SELECT * FROM note WHERE id = ?');
    const note = stmt.get(id);

    if (!note) {
        throw new Error("Note not found");
    }

    return NoteSchema.parse(note);
}

export function createNote(): number | bigint  {
    const stmt = db.prepare('INSERT INTO note (title) VALUES (?)')
    const createdNoteId = stmt.run("New Untitled Note");

    return createdNoteId.lastInsertRowid;
}
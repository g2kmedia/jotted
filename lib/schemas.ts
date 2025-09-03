import { z } from "zod";
import { Block } from "@blocknote/core";

const NoteSchema = z.object({
    id: z.number(),
    title: z.string(),
    content: z.union([
        z.literal(""), // new note
        z.string().transform(str => JSON.parse(str) as Block[])
    ]),
    created_at: z.string().transform(str => new Date(str + "Z")), // Add "Z" to force UTC
    updated_at: z.string().transform(str => new Date(str + "Z")), // Add "Z" to force UTC
    is_pinned: z.number().transform(n => Boolean(n)),
    is_trashed: z.number().transform(n => Boolean(n))
});

const EditorNoteSchema = NoteSchema.pick({
    title: true,
    content: true
});

const NoteUpdateSchema = NoteSchema.pick({
    title: true,
    content: true
}).partial()

const NoteInfoDialogSchema = z.object({
    title: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

export type NoteWithTag = Partial<Note> & {
    tags: string[]
}

// -> Replace the smaller Note Schemas and types with Patial<Note>

export {NoteSchema, EditorNoteSchema, NoteUpdateSchema, NoteInfoDialogSchema };

export type Note = z.infer<typeof NoteSchema>;
export type EditorNote = z.infer<typeof EditorNoteSchema>;
export type NoteUpdate = z.infer<typeof NoteUpdateSchema>;
export type NoteInfo = z.infer<typeof NoteInfoDialogSchema>;
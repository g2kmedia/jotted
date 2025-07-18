import { z } from "zod";

const NoteSchema = z.object({
    id: z.number(),
    title: z.string(),
    content: z.union([z.string(), z.null()]),
    created_at: z.string().transform(str => new Date(str)),
    updated_at: z.string().transform(str => new Date(str)),
    is_pinned: z.number().transform(n => Boolean(n)),
    is_trashed: z.number().transform(n => Boolean(n))
});

const NoteUpdateSchema = NoteSchema.pick({
    title: true,
    content: true
}).partial();

export { NoteSchema, NoteUpdateSchema };

export type Note = z.infer<typeof NoteSchema>;
export type NoteUpdate = z.infer<typeof NoteUpdateSchema>;
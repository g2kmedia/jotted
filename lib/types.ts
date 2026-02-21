import { Block } from "@blocknote/core"

export type Note = {
    id: string
    title: string
    content: string
    content_plaintext: string
    created_at: string
    updated_at: string
    is_pinned: number
    is_trashed: number
}

export type Task = {
    id: string
    title: string
    content: string
    created_at: string
    updated_at: string
    due_date?: string
    priority?: number
    is_completed: number
    is_trashed: number
}

export type Tag = {
    id: number
    name: string
    created_at: string
}

export type EditorNote = Omit<Note, "content"> & {
  content: Block[]
}

export type localNote = EditorNote & {
    tags?: string[];
}

export type localTask = Task & {
    tags?: string[];
}

export type NoteWithTags = Partial<Note> & {
    tags?: string[]
}

export type TaskWithTags = Partial<Task> & {
    tags?: string[]
}
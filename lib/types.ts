import { Block } from "@blocknote/core"

export type ServerNote = {
    id: string
    title: string
    content: string
    content_plaintext: string
    created_at: string
    updated_at: string
    is_pinned: number
    is_trashed: number
}

export type localNote = {
    id: string
    title: string
    content: Block[] | ""
    content_plaintext: string
    created_at: string
    updated_at: string
    is_pinned: number
    is_trashed: number
    tags: string[]
}

export type Note = ServerNote | localNote

export type ServerTask = {
    id: string
    title: string
    content: string
    created_at: string
    updated_at: string
    due_date: string
    priority: number
    is_completed: number
    is_trashed: number
}

export type localTask = {
    id: string
    title: string
    content: string
    created_at: string
    updated_at: string
    due_date: string | null
    priority: number | null
    is_completed: number
    is_trashed: number
    tags: string[]
}

export type Task = ServerTask | localTask

export type Tag = {
    id: number
    name: string
    created_at: string
}

export type NoteWithTags = Partial<Note> & {
    tags?: string[]
}

export type TaskWithTags = Partial<Task> & {
    tags?: string[]
}
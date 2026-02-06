export type Note = {
    id: number
    title: string
    content: string
    content_plaintext: string
    created_at: string
    updated_at: string
    is_pinned: number
    is_trashed: number
}

export type Task = {
    id: number
    title: string
    content: string
    created_at: Date
    updated_at: Date
    due_date: string
    priority: number
    is_completed: number
    is_trashed: number
}

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

export type TaskUpdate = {
    title?: string
    content?: string
    due_date?: string | null
    priority?: number | null
    is_completed?: number
    is_deleted?: number
}
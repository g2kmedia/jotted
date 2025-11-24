export type Note = {
    id: number
    title: string
    content: string
    created_at: string
    updated_at: string
    is_pinned: boolean
    is_trashed: boolean
}

export type Task = {
    id: number
    title: string
    content: string
    created_at: Date
    updated_at: Date
    due_date: Date
    priority: number
    is_completed: boolean
    is_trashed: boolean
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
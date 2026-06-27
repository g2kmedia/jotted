import { create } from "zustand";
import { localNote, localTask } from "./types";

// Tasks
type TaskState = {
    tasks: localTask[] | null,
    taskCounts: { today: number, week: number, scheduled: number, later: number, completed: number, trashed: number },
    lastQueriedRecord: { id: string, updated_at: string } | null
    hasMore: boolean
    quickFilter: "today" | "week" | "scheduled" | "later" | "completed" | "trashed" | null
    tags: string[],
}

type TaskActions = {
    setTasks: (tasks: localTask[] | null) => void
    setTaskCounts: (counts: { today: number, week: number, scheduled: number, later: number, completed: number, trashed: number }) => void
    appendNewTasks: (newTasks: localTask[]) => void
    updateTask: (id: string, updates: Partial<localTask>) => void
    setLastQueriedRecord: (record: { id: string, updated_at: string } | null) => void
    setHasMore: (value: boolean) => void
    setQuickFilter: (filter: TaskState["quickFilter"]) => void
    setTags: (tags: string[]) => void
}

export const useTaskStore = create<TaskState & TaskActions>()((set) => ({
    // State
    tasks: null,
    taskCounts: { today: 0, week: 0, scheduled: 0, later: 0, completed: 0, trashed: 0 },
    lastQueriedRecord: null,
    hasMore: true,
    quickFilter: null,
    tags: [],

    // Actions
    setTasks: (tasks) => set({ tasks }),
    setTaskCounts: (counts) => set({ taskCounts: counts }),

    appendNewTasks: (newTasks) =>
        set((state) => {
            if (!state.tasks) return { tasks: newTasks }

            const existingIds = new Set(state.tasks.map(task => task.id));
            const uniqueNewTasks = newTasks.filter(task => !existingIds.has(task.id));

            return { tasks: [...state.tasks, ...uniqueNewTasks] };
        }),

    updateTask: (id, updates) =>
        set((state) => {
            if (!state.tasks) return { tasks: null };
            const updatedTask = state.tasks?.map((t) => t.id === id ? { ...t, ...updates } : t);

            // Move updated task to the front of the array
            const idx = updatedTask?.findIndex(t => t.id === id);
            if (idx > 0) {
                const [task] = updatedTask?.splice(idx, 1);
                updatedTask?.unshift(task);
            }

            return { tasks: updatedTask };
        })
    ,

    setLastQueriedRecord: (record) => set({ lastQueriedRecord: record }),
    setHasMore: (value) => set({ hasMore: value }),
    setQuickFilter: (filter) => set({ quickFilter: filter }),
    setTags: (tags) => set({ tags: tags })
}));


// Notes
type NoteState = {
    notes: localNote[] | null
    noteCounts: { pinned: number, trashed: number },
    lastQueriedRecord: { id: string, updated_at: string } | null
    hasMore: boolean
    quickFilter: "pinned" | "trashed" | null
    tags: string[]
}

type NoteActions = {
    setNotes: (notes: localNote[] | null) => void
    setNoteCounts: (counts: { pinned: number, trashed: number }) => void
    appendNewNotes: (newNotes: localNote[]) => void
    updateNote: (id: string, updates: Partial<localNote>) => void
    setLastQueriedRecord: (record: { id: string, updated_at: string } | null) => void
    setHasMore: (value: boolean) => void
    setQuickFilter: (filter: NoteState["quickFilter"]) => void
    setTags: (tags: string[]) => void
}

export const useNoteStore = create<NoteState & NoteActions>()((set) => ({
    // State
    notes: null,
    noteCounts: { pinned: 0, trashed: 0 },
    lastQueriedRecord: null,
    hasMore: true,
    quickFilter: null,
    tags: [],
    activeTags: [],

    // Actions
    setNotes: (notes) => set({ notes }),
    setNoteCounts: (counts) => set({ noteCounts: counts }),

    appendNewNotes: (newNotes) =>
        set((state) => {
            if (!state.notes) return { notes: newNotes }

            const existingIds = new Set(state.notes.map(note => note.id));
            const uniqueNewNotes = newNotes.filter(note => !existingIds.has(note.id));

            return { notes: [...state.notes, ...uniqueNewNotes] };
        }),

    updateNote: (id, updates) =>
        set((state) => {
            if (!state.notes) return { notes: null };
            const updatedNote = state.notes?.map((n) => n.id === id ? { ...n, ...updates } : n);

            // Move updated note to the front of the array
            const idx = updatedNote?.findIndex(n => n.id === id);
            if (idx > 0) {
                const [note] = updatedNote?.splice(idx, 1);
                updatedNote?.unshift(note);
            }
            return { notes: updatedNote };
        }),

    setLastQueriedRecord: (record) => set({ lastQueriedRecord: record }),
    setHasMore: (value) => set({ hasMore: value }),
    setQuickFilter: (filter) => set({ quickFilter: filter }),
    setTags: (tags) => set({ tags: tags })
}));


// Tags
type TagsState = {
    activeTags: string[]
}

type TagsActions = {
    toggleActiveTag: (tag: string) => void
}

export const useTagsStore = create<TagsState & TagsActions>()((set) => ({
    // State
    activeTags: [],

    //Actions
    toggleActiveTag: (tag) =>
        set((state) => ({
            activeTags: state.activeTags.includes(tag)
                ? state.activeTags.filter(t => t !== tag)
                : [...state.activeTags, tag]
        }))
}));
import { localNote, localTask } from "./types";
import { DateTime } from "luxon";

const DB_NAME = "jotted";
const DB_VERSION = 2;

interface PendingChanges {
    recordId: string;
    recordType: "notes" | "tasks";
    operation: "create" | "update" | "delete";
    data: Partial<localNote | localTask> & { id: string };
    timestamp: number;
    synced: boolean;
}

const requestToPromise = <T>(req: IDBRequest): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains("notes")) {
                const notesStore = db.createObjectStore("notes", { keyPath: "id" });
                notesStore.createIndex("updated_at", "updated_at", { unique: false });
                notesStore.createIndex("pinned_trashed", ["is_pinned", "is_trashed"], { unique: false });
                notesStore.createIndex("tags", "tags", { multiEntry: true });
            }

            if (!db.objectStoreNames.contains("tasks")) {
                const tasksStore = db.createObjectStore("tasks", { keyPath: "id" });
                tasksStore.createIndex("updated_at", "updated_at", { unique: false });
                tasksStore.createIndex("completed_trashed", ["is_completed", "is_trashed"], { unique: false });
                tasksStore.createIndex("incompleted_due", ["is_completed", "is_trashed", "due_date"], { unique: false });
                tasksStore.createIndex("tags", "tags", { multiEntry: true });
            }

            if (!db.objectStoreNames.contains("pendingChanges")) {
                const pendingStore = db.createObjectStore("pendingChanges", { keyPath: "recordId" });
                pendingStore.createIndex("synced", "synced", { unique: false });
            }

            if (!db.objectStoreNames.contains("meta")) {
                db.createObjectStore("meta", { keyPath: "key" });
            }
        };
    });
}

// Limit stored data
const MAX_NOTES = 50;
const MAX_TASKS = 100;
const MAX_TASKS_DAYS = 30;

const isDueWithinDays = (date: string | undefined): boolean => {
    if (!date) return false;

    const due = new Date(date);
    const now = new Date();

    const diffMs = due.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return diffDays >= 0 && diffDays <= MAX_TASKS_DAYS;
}

const isOverdueUncompleted = (dueDate: string | undefined, isCompleted: number): boolean => {
    if (!dueDate || isCompleted === 1) return false;

    const due = new Date(dueDate);
    const now = new Date();

    return due < now;
};

const pruneIfNeeded = (store: IDBObjectStore, storeType: "notes" | "tasks", maxRecords: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        const countReq = store.count();

        countReq.onsuccess = () => {
            if (countReq.result < maxRecords) return resolve();

            const index = store.index("updated_at");

            const cursorReq = index.openCursor(); // ascending

            cursorReq.onsuccess = () => {
                const cursor = cursorReq.result;

                if (!cursor) return resolve(); // no more records

                const record = cursor.value;

                const isProtected = storeType === "notes"
                    ? record.is_pinned === 1
                    : isDueWithinDays(record.due_date) || isOverdueUncompleted(record.due_date, record.is_completed);

                if (isProtected) {
                    cursor.continue();
                } else {
                    cursor.delete();
                    resolve();
                }
            };

            cursorReq.onerror = () => reject(cursorReq.error);
        };

        countReq.onerror = () => reject(countReq.error);
    });
}

// Save locally
export const saveNoteLocally = async (
    note: Partial<localNote> & { id: string }
): Promise<localNote> => {
    const db = await openDB();
    const tx = db.transaction("notes", "readwrite");
    const store = tx.objectStore("notes");

    await pruneIfNeeded(store, "notes", MAX_NOTES);

    const existingData = await new Promise((resolve, reject) => {
        const req = store.get(note.id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    const mergedData = { ...(existingData || {}), ...note };

    await new Promise<void>((resolve, reject) => {
        const req = store.put(mergedData);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });

    return mergedData as localNote;
};

export const saveTaskLocally = async (
    task: Partial<localTask> & { id: string }
): Promise<localTask> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readwrite");
    const store = tx.objectStore("tasks");

    await pruneIfNeeded(store, "tasks", MAX_TASKS);

    const existingData = await new Promise((resolve, reject) => {
        const req = store.get(task.id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    const mergedData = { ...(existingData || {}), ...task };

    await new Promise<void>((resolve, reject) => {
        const req = store.put(mergedData);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });

    return mergedData as localTask;
};

// Get locally
export const getNoteLocally = async (noteId: string): Promise<localNote | undefined> => {
    const db = await openDB();
    const tx = db.transaction("notes", "readonly");
    const store = tx.objectStore("notes");
    const request = store.get(noteId);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export const getAllNotesLocally = async (
    quickFilter: "pinned" | "trashed" | null = null,
    lastQueriedRecord: { id: string; updated_at: string } | null = null,
    tags: string[] = [],
    limit = 20
): Promise<localNote[]> => {
    const db = await openDB();
    const tx = db.transaction("notes", "readonly");
    const store = tx.objectStore("notes");
    const index = store.index("pinned_trashed");

    let allNotes: localNote[] = [];

    if (quickFilter === null) {
        const normalReq = index.getAll(IDBKeyRange.only([0, 0]));
        const pinnedReq = index.getAll(IDBKeyRange.only([1, 0]));

        const normalNotes = await new Promise<localNote[]>((resolve, reject) => {
            normalReq.onsuccess = () => resolve(normalReq.result);
            normalReq.onerror = () => reject(normalReq.error);
        });

        const pinnedNotes = await new Promise<localNote[]>((resolve, reject) => {
            pinnedReq.onsuccess = () => resolve(pinnedReq.result);
            pinnedReq.onerror = () => reject(pinnedReq.error);
        });

        allNotes = [...normalNotes, ...pinnedNotes];
    } else {
        const pin = quickFilter === "pinned" ? 1 : 0;
        const trash = quickFilter === "trashed" ? 1 : 0;
        const range = IDBKeyRange.only([pin, trash]);

        const request = index.getAll(range);
        allNotes = await new Promise<localNote[]>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    let filteredNotes = allNotes.filter(note =>
        !tags.length || tags.some(t => note.tags.includes(t))
    );

    filteredNotes.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

    if (lastQueriedRecord) {
        const lastIdx = filteredNotes.findIndex(note => note.id === lastQueriedRecord.id);
        if (lastIdx !== -1) {
            filteredNotes = filteredNotes.slice(lastIdx + 1);
        }
    }

    return filteredNotes.slice(0, limit);
};

export const getAllNotesTagsLocally = async (): Promise<string[]> => {
    const db = await openDB();
    const tx = db.transaction("notes", "readonly");
    const store = tx.objectStore("notes");
    const tagsIndex = store.index("tags");

    const request = tagsIndex.getAll();

    const notes = await new Promise<localNote[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    // Filter out trashed notes
    const nonTrashedNotes = notes.filter(note => note.is_trashed !== 1);

    const allTags = nonTrashedNotes.flatMap(note => note.tags);
    return [...new Set(allTags)];
};


export const getTaskLocally = async (taskId: string): Promise<localTask | undefined> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readonly");
    const store = tx.objectStore("tasks");
    const request = store.get(taskId);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export const getAllTasksLocally = async (
    quickFilter: string | null = null,
    dueDate: string | null = null,
    lastQueriedRecord: { id: string; updated_at: string } | null = null,
    tags: string[] = [],
    limit = 20
): Promise<localTask[]> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readonly");
    const store = tx.objectStore("tasks");

    let indexName;

    if (dueDate) {
        indexName = "incompleted_due";
    } else {
        indexName = "completed_trashed";
    }

    const index = store.index(indexName);

    let allTasks: localTask[] = [];

    switch (quickFilter) {
        case null:
            const defaultReq = index.getAll(IDBKeyRange.only([0, 0]));
            allTasks = await requestToPromise(defaultReq);
            break;
        case "completed":
            const completedReq = index.getAll(IDBKeyRange.only([1, 0]));
            allTasks = await requestToPromise(completedReq);
            break;
        case "trashed":
            const trashedReq1 = await requestToPromise<localTask[]>(index.getAll(IDBKeyRange.only([0, 1])));
            const trashedReq2 = await requestToPromise<localTask[]>(index.getAll(IDBKeyRange.only([1, 1])));
            allTasks = [...trashedReq1, ...trashedReq2];
            break;
        case "today":
            const todayReq = index.getAll(IDBKeyRange.upperBound([0, 0, dueDate]));
            allTasks = await requestToPromise(todayReq);
            break;
        case "week":
            const weekReq = index.getAll(IDBKeyRange.upperBound([0, 0, dueDate]));
            allTasks = await requestToPromise(weekReq);
            break;
        case "scheduled":
            const scheduledReq = index.getAll(IDBKeyRange.only([0, 0]));
            const rawScheduledTasks = await requestToPromise<localTask[]>(scheduledReq);
            allTasks = rawScheduledTasks.filter(task => task.due_date !== null);
            break;
        case "later":
            const laterReq = index.getAll(IDBKeyRange.only([0, 0]));
            const rawLaterTasks = await requestToPromise<localTask[]>(laterReq);
            allTasks = rawLaterTasks.filter(task => task.due_date === null);
            break;
    }

    let filteredTasks = allTasks.filter(task =>
        !tags.length || tags.some(t => task.tags.includes(t))
    );

    filteredTasks.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

    if (lastQueriedRecord) {
        const lastIdx = filteredTasks.findIndex(task => task.id === lastQueriedRecord.id);
        if (lastIdx !== -1) {
            filteredTasks = filteredTasks.slice(lastIdx + 1);
        }
    }

    return filteredTasks.slice(0, limit);
}

export const getAllTasksTagsLocally = async (): Promise<string[]> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readonly");
    const store = tx.objectStore("tasks");
    const tagsIndex = store.index("tags");

    const request = tagsIndex.getAll();

    const tasks = await requestToPromise<Promise<localTask[]>>(request);
    const nonCompletedTrashedTasks = tasks.filter(task => task.is_completed !== 1 && task.is_trashed !== 1);

    const allTags = nonCompletedTrashedTasks.flatMap(task => task.tags);
    return [...new Set(allTags)];
}

export const getTaskCountsLocally = async (): Promise<{
    today: number,
    week: number,
    scheduled: number,
    later: number,
    completed: number,
    trashed: number
}> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readonly");
    const store = tx.objectStore("tasks");
    const index = store.index("incompleted_due");
    const completedTrashed = store.index("completed_trashed");

    const now = DateTime.now().setZone("UTC");
    const endOfToday = now.endOf("day").toISO();
    const endOfWeek = now.endOf("week").toISO();
    const nextWeekStart = now.plus({ weeks: 1 }).startOf('week').toISO();

    const counts = {
        today: 0,
        week: 0,
        scheduled: 0,
        later: 0,
        completed: 0,
        trashed: 0
    };

    counts.today = await requestToPromise(index.count(IDBKeyRange.upperBound([0, 0, endOfToday])));
    counts.week = await requestToPromise(index.count(IDBKeyRange.upperBound([0, 0, endOfWeek])));

    const future = await requestToPromise<number>(index.count(IDBKeyRange.bound([0, 0, nextWeekStart], [0, 0, "9999-12-31T23:59:59.999Z"])));
    counts.scheduled = future + counts.week;

    const nonCompletedTrashedTasks = await requestToPromise<number>(completedTrashed.count(IDBKeyRange.only([0, 0])));
    counts.later = nonCompletedTrashedTasks - counts.scheduled;

    counts.completed = await requestToPromise(completedTrashed.count(IDBKeyRange.only([1, 0])));

    const trashed1 = await requestToPromise<number>(completedTrashed.count(IDBKeyRange.only([0, 1])));
    const trashed2 = await requestToPromise<number>(completedTrashed.count(IDBKeyRange.only([1, 1])));
    counts.trashed = trashed1 + trashed2;

    return counts;
}

// Delete locally
export const deleteNoteLocally = async (noteId: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction("notes", "readwrite");

    const request = tx.objectStore("notes").delete(noteId);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export const deleteTaskLocally = async (taskId: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readwrite");

    const request = tx.objectStore("tasks").delete(taskId);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Get pending changes
export const getPendingChanges = async (): Promise<PendingChanges[]> => {
    const db = await openDB();
    const tx = db.transaction("pendingChanges", "readonly");
    const store = tx.objectStore("pendingChanges");

    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const unsynced = request.result.filter((change: PendingChanges) => !change.synced);
            resolve(unsynced);
        };
        request.onerror = () => reject(request.error);
    });
}

// Queue changes for sync
export const queueChanges = async (change: Omit<PendingChanges, "timestamp" | "synced">): Promise<void> => {
    const pendingChanges = await getPendingChanges();
    const alreadyExists = pendingChanges.find(c => c.recordId === change.recordId);

    const mergedChanges = {
        ...(alreadyExists || change),
        recordId: change.recordId, // Explicitly preserve key due to issues with IndexedDB otherwise
        data: { ...alreadyExists?.data, ...change.data },
        timestamp: Date.now(),
        synced: false
    };

    const db = await openDB();
    const tx = db.transaction("pendingChanges", "readwrite");
    const request = tx.objectStore("pendingChanges").put(mergedChanges);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Mark synced changes
export const markSynced = async (recordId: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction("pendingChanges", "readwrite");

    const request = tx.objectStore("pendingChanges").delete(recordId);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Cursor used for pulling data from server's SQLite and syncing
export const getSyncCursor = async (recordType: "notes" | "tasks"): Promise<string | null> => {
    const db = await openDB();
    const result = await requestToPromise<{ key: string; value: string } | undefined>(db.transaction("meta", "readonly").objectStore("meta").get(`sync-cursor-${recordType}`));

    return result?.value ?? null;
}

export const setSyncCursor = async (recordType: "notes" | "tasks", timestamp: string): Promise<void> => {
        const db = await openDB();
        await requestToPromise<IDBValidKey>(db.transaction("meta", "readwrite").objectStore("meta").put({ key: `sync-cursor-${recordType}`, value: timestamp }));
}
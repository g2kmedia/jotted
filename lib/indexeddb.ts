import { localNote, localTask } from "./types";

const DB_NAME = "jotted";
const DB_VERSION = 1;

interface PendingChanges {
    recordId: string;
    recordType: "notes" | "tasks";
    operation: "create" | "update" | "delete";
    data: Partial<localNote | localTask> & { id: string };
    timestamp: number;
    synced: boolean;
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
            }

            if (!db.objectStoreNames.contains("tasks")) {
                const tasksStore = db.createObjectStore("tasks", { keyPath: "id" });
                tasksStore.createIndex("updated_at", "updated_at", { unique: false });
            }

            if (!db.objectStoreNames.contains("pendingChanges")) {
                const pendingStore = db.createObjectStore("pendingChanges", { keyPath: "recordId" });
                pendingStore.createIndex("synced", "synced", { unique: false });
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

            const cursorReq = index.openCursor(); // ascending = oldest first

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
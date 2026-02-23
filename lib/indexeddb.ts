import { localNote, localTask, Task } from "./types";

const DB_NAME = "jotted";
const DB_VERSION = 1;

type PendingData =
    | localNote
    | localTask
    | { type: "tags"; id: string; updated_at: string; currentTags: string[]; tags: string[]; }; // for tags only updates

interface PendingChanges {
    recordId: string;
    recordType: "notes" | "tasks";
    operation: "create" | "update" | "delete";
    data: PendingData;
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
                db.createObjectStore("notes", { keyPath: "id" });
            }

            if (!db.objectStoreNames.contains("tasks")) {
                db.createObjectStore("tasks", { keyPath: "id" });
            }

            if (!db.objectStoreNames.contains("pendingChanges")) {
                const pendingStore = db.createObjectStore("pendingChanges", { keyPath: "recordId" });
                pendingStore.createIndex("synced", "synced", { unique: false });
            }
        };
    });
}

// Save locally
export const saveNoteLocally = async (
    note: Partial<localNote> & { id: string }
): Promise<localNote> => {
    const db = await openDB();
    const tx = db.transaction("notes", "readwrite");
    const store = tx.objectStore("notes");

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

// Queue changes for sync
export const queueChanges = async (change: Omit<PendingChanges, "timestamp" | "synced">): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction("pendingChanges", "readwrite");

    const request = tx.objectStore("pendingChanges").put({
        ...change,
        timestamp: Date.now(),
        synced: false
    });

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
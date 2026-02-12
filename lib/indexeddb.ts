import { Note, Task } from "./types";

const DB_NAME = "jotted";
const DB_VERSION = 1;

interface PendingChanges {
    recordId: string;
    recordType: "notes" | "tasks";
    operation: "create" | "update" | "delete";
    data: any;
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

            // Store notes locally
            if (!db.objectStoreNames.contains("notes")) {
                db.createObjectStore("notes", { keyPath: "id" });
            }

            // Store tasks locally
            if (!db.objectStoreNames.contains("tasks")) {
                db.createObjectStore("tasks", { keyPath: "id" });
            }

            // Store pending sync operations
            if (!db.objectStoreNames.contains("pendingChanges")) {
                const pendingStore = db.createObjectStore("pendingChanges", { keyPath: "recordId" });
                pendingStore.createIndex("synced", "synced", { unique: false });
            }
        };
    });
}

// Save note locally
export const saveNoteLocally = async (note: any): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction("notes", "readwrite");
    tx.objectStore("notes").put(note);
}

// Save task locally
export const saveTaskLocally = async (task: any): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readwrite");
    tx.objectStore("tasks").put(task);
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
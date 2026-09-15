import { localNote, localTask } from "./types";

const DB_NAME = "jotted";
const DB_VERSION = 2;

export interface PendingChanges {
    recordId: string;
    recordType: "notes" | "tasks";
    operation: "create" | "update" | "delete";
    data: Partial<localNote | localTask> & { id: string };
    timestamp: number;
    synced: boolean;
}

export const requestToPromise = <T>(req: IDBRequest): Promise<T> => {
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

export const MAX_TASKS_DAYS = 30;

export const isDueWithinDays = (date: string | undefined): boolean => {
    if (!date) return false;

    const due = new Date(date);
    const now = new Date();

    const diffMs = due.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return diffDays >= 0 && diffDays <= MAX_TASKS_DAYS;
}

export const isOverdueUncompleted = (dueDate: string | undefined, isCompleted: number): boolean => {
    if (!dueDate || isCompleted === 1) return false;

    const due = new Date(dueDate);
    const now = new Date();

    return due < now;
};

export const pruneIfNeeded = (store: IDBObjectStore, storeType: "notes" | "tasks", maxRecords: number): Promise<void> => {
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
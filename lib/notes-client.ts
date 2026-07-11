import type { localNote } from "./types";
import { openDB, pruneIfNeeded, requestToPromise } from "./indexeddb";

const MAX_NOTES = 50;

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

export const getAllNotesLocally = async (
    quickFilter: string | null = null,
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

export const getNoteCountsLocally = async (): Promise<{
    pinned: number,
    trashed: number
}> => {
    const db = await openDB();
    const tx = db.transaction("notes", "readonly");
    const store = tx.objectStore("notes");
    const pinnedTrashed = store.index("pinned_trashed");

    const counts = {
        pinned: 0,
        trashed: 0
    };

    counts.pinned = await requestToPromise(pinnedTrashed.count(IDBKeyRange.only([1, 0])));

    const trashed1 = await requestToPromise<number>(pinnedTrashed.count(IDBKeyRange.only([0, 1])));
    const trashed2 = await requestToPromise<number>(pinnedTrashed.count(IDBKeyRange.only([1, 1])));
    counts.trashed = trashed1 + trashed2;

    return counts;
}

export const deleteNoteLocally = async (noteId: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction("notes", "readwrite");

    const request = tx.objectStore("notes").delete(noteId);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
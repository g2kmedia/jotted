import { db } from "@/lib/sqlite";
import type { localNote, Note, NoteWithTags } from "./types";
import { openDB, pruneIfNeeded, requestToPromise } from "./indexeddb";

// SQLite
const ALLOWED_COLUMNS: (keyof Note)[] = ["id", "title", "content", "content_plaintext", "created_at", "updated_at", "is_pinned", "is_trashed"];

export function createNote(noteData: localNote): void {
    const stmt = db.prepare(`
        INSERT INTO note (id, title, content, content_plaintext, created_at, updated_at, is_pinned, is_trashed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        noteData.id,
        noteData.title,
        noteData.content,
        noteData.content_plaintext,
        noteData.created_at,
        noteData.updated_at,
        noteData.is_pinned,
        noteData.is_trashed
    );
}

export function getNote(id: string, columns?: string[]): Partial<Note> {
    if (columns &&
        !columns.every(col => (ALLOWED_COLUMNS as readonly string[]).includes(col))
    ) {
        throw new Error("Invalid column name");
    }

    const selectedColumns = columns ? columns.join(", ") : " * ";

    const stmt = db.prepare(`SELECT ${selectedColumns} FROM note WHERE id = ?`);
    const note = stmt.get(id);

    if (!note) {
        throw new Error("Note not found");
    }

    return note as Partial<Note>;
}

type notesApiParams = {
    columns?: string[]
    isPinned?: string
    isTrashed?: string
    lastQueriedRecord?: { id: string, updated_at: string }
    tags?: string[]
    limit?: number
}

type NoteWithTagRow = Partial<Note> & {
    tags: string
}

export function getAllNotes(params: notesApiParams): NoteWithTags[] | null {
    const {
        columns = [],
        isPinned,
        isTrashed,
        lastQueriedRecord,
        tags = [],
        limit = 20
    } = params;

    if (columns.length > 0 && !columns.every(col => (ALLOWED_COLUMNS as readonly string[]).includes(col))) {
        throw new Error("Invalid column name");
    }

    const selectedColumns = columns.length > 0
        ? columns.map(col => `n.${col}`).join(",")
        : "n.*";

    const whereClauses: string[] = [];
    const queryParams = [];

    if (isPinned) {
        whereClauses.push("n.is_pinned = ?");
        queryParams.push(isPinned);
    }

    if (isTrashed) {
        whereClauses.push("n.is_trashed = ?");
        queryParams.push(isTrashed);
    }

    if (lastQueriedRecord) {
        const clause = "n.updated_at < ? OR (n.updated_at = ? AND n.id < ?)";
        whereClauses.push(`(${clause})`);
        queryParams.push(
            lastQueriedRecord.updated_at,
            lastQueriedRecord.updated_at,
            lastQueriedRecord.id
        );
    }

    if (tags.length > 0) {
        const placeholders = tags.map(() => '?').join(",");
        whereClauses.push(`n.id IN (
            SELECT DISTINCT nt2.note_id 
            FROM note_tag nt2
            JOIN tag t ON nt2.tag_id = t.id
            WHERE t.name IN (${placeholders})
        )`);
        queryParams.push(...tags);
    }

    const finalWhereClause = whereClauses.length > 0
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

    const query = `
        SELECT ${selectedColumns},
            COALESCE(
                json_group_array(t.name) FILTER (WHERE t.name IS NOT NULL),
                json_array()
            ) as tags
        FROM note n
        LEFT JOIN note_tag nt ON n.id = nt.note_id
        LEFT JOIN tag t ON nt.tag_id = t.id
        ${finalWhereClause}
        GROUP BY n.id
        ORDER BY n.updated_at DESC, n.id DESC
        LIMIT ?
    `;

    queryParams.push(limit);

    const stmt = db.prepare(query);
    const notesArr = stmt.all(...queryParams);

    return (notesArr as NoteWithTagRow[]).map(row => ({
        ...row,
        tags: JSON.parse(row.tags) as string[]
    }));
}

export function updateNote(id: string, updates: Partial<Note>): number {
    const columns = Object.keys(updates);

    if (!columns.every(col => (ALLOWED_COLUMNS as readonly string[]).includes(col))) {
        throw new Error("Invalid column name");
    }

    const setClause = columns.map(column => `${column} = ?`).join(", ");
    const values = Object.values(updates).map((v, i) =>
        columns[i] === "content" ? JSON.stringify(v) : v
    );

    const update = db.transaction(() => {
        const stmt = db.prepare(`UPDATE note SET ${setClause} WHERE id = ?`);
        return stmt.run(...values, id);
    });

    const info = update();
    return info.changes;
}

export function deleteNote(id: string): number {
    const remove = db.transaction(() => {
        const stmt = db.prepare('DELETE FROM note WHERE id = ?');
        return stmt.run(id);
    });

    const info = remove();
    return info.changes;
}

export function getNoteCounts(): {
    pinned: number;
    trashed: number;
} {
    return {
        pinned: (db.prepare(`
            SELECT COUNT(*) as count FROM note
            WHERE 1=1 AND is_pinned = 1 AND is_trashed = 0
        `).get() as { count: number }).count,

        trashed: (db.prepare(`
            SELECT COUNT(*) as count FROM note
            WHERE 1=1 AND is_trashed = 1
        `).get() as { count: number }).count
    };
}

// IndexedDB
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
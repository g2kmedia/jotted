import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { getSyncCursor, isDueWithinDays, isOverdueUncompleted, markSynced, MAX_TASKS_DAYS, openDB, PendingChanges, pruneIfNeeded, queueChanges, setSyncCursor } from "@/lib/indexeddb";

let db: IDBDatabase;

const setupTestDb = () => {
    beforeEach(async () => {
        indexedDB = new IDBFactory();
        db = await openDB();
    });
}

const getTestDb = () => {
    return db;
}

const seed = (storeName: string, records: any[]): Promise<void> => {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        records.forEach((r) => tx.objectStore(storeName).put(r));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

const readAll = (storeName: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const req = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

describe("indexedDB maintenance", () => {
    setupTestDb();

    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.setSystemTime("2024-01-10T00:00:00Z");
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("checks is record due soon", () => {
        it("returns false for overdue dates", () => {
            expect(isDueWithinDays("2024-01-09T00:00:00Z")).toBeFalsy();
        });

        it("returns true for today", () => {
            expect(isDueWithinDays("2024-01-10T00:00:00Z")).toBeTruthy();
        });

        it("returns true within range", () => {
            expect(isDueWithinDays("2024-01-12T00:00:00Z")).toBeTruthy();
        });

        it("returns true at the boundary", () => {
            const boundary = new Date("2024-01-10T00:00:00Z");
            boundary.setUTCDate(boundary.getUTCDate() + MAX_TASKS_DAYS);

            expect(isDueWithinDays(boundary.toISOString())).toBeTruthy();
        });

        it("returns false just past the boundary", () => {
            const pastBoundary = new Date("2024-01-10T00:00:00Z");
            pastBoundary.setUTCDate(pastBoundary.getUTCDate() + MAX_TASKS_DAYS + 1);

            expect(isDueWithinDays(pastBoundary.toISOString())).toBeFalsy();
        });

        it("returns false for undefined", () => {
            expect(isDueWithinDays(undefined)).toBeFalsy();
        });

        it("returns false for invalid date strings", () => {
            expect(isDueWithinDays("not-a-date")).toBeFalsy();
        });
    });

    describe("checks is record overdue and uncompleted", () => {
        it("retuns true for overdue and not completed", () => {
            expect(isOverdueUncompleted("2024-01-09T00:00:00Z", 0)).toBeTruthy();
        });

        it("retuns false for overdue and completed", () => {
            expect(isOverdueUncompleted("2024-01-09T00:00:00Z", 1)).toBeFalsy();
        });

        it("retuns false for future due date and not completed", () => {
            expect(isOverdueUncompleted("2024-01-12T00:00:00Z", 0)).toBeFalsy();
        });

        it("retuns false for no due date and not completed", () => {
            expect(isOverdueUncompleted(undefined, 0)).toBeFalsy();
        });

        it("retuns false for due date 'now' and not completed", () => {
            expect(isOverdueUncompleted("2024-01-10T00:00:00Z", 0)).toBeFalsy();
        });
    });

    describe("pruning in IndexedDB", () => {
        it("does not delete anything when count is below maxRecords", async () => {
            await seed("notes", [
                { id: 1, updated_at: 1, is_pinned: 0 },
                { id: 2, updated_at: 2, is_pinned: 0 },
            ]);

            const tx = getTestDb().transaction("notes", "readwrite");
            await pruneIfNeeded(tx.objectStore("notes"), "notes", 3);

            const remaining = await readAll("notes");
            expect(remaining.map((r) => r.id)).toEqual([1, 2]);
        });

        it("deletes only the single oldest unprotected record per call", async () => {
            await seed("notes", [
                { id: 1, updated_at: 1, is_pinned: 0 },
                { id: 2, updated_at: 2, is_pinned: 0 },
                { id: 3, updated_at: 3, is_pinned: 0 },
            ]);

            const tx = getTestDb().transaction("notes", "readwrite");
            await pruneIfNeeded(tx.objectStore("notes"), "notes", 2);

            const remaining = await readAll("notes");
            expect(remaining.map((r) => r.id)).toEqual([2, 3]);
        });

        it("skips tasks due within days, deletes the oldest non-protected task", async () => {
            const today = new Date();
            const soon = new Date(today.getTime() + 2 * 86400000).toISOString();
            const past = new Date(today.getTime() - 10 * 86400000).toISOString();

            await seed("tasks", [
                { id: 1, updated_at: 1, due_date: soon, is_completed: 0 },
                { id: 2, updated_at: 2, due_date: past, is_completed: 1 },
                { id: 3, updated_at: 3, due_date: past, is_completed: 1 },
            ]);

            const tx = getTestDb().transaction("tasks", "readwrite");
            await pruneIfNeeded(tx.objectStore("tasks"), "tasks", 2);

            const remaining = await readAll("tasks");
            expect(remaining.map((r) => r.id)).toEqual([1, 3]);
        });

        it("skips overdue uncompleted tasks, deletes the oldest completed/non-overdue task", async () => {
            const past = new Date(Date.now() - 10 * 86400000).toISOString();

            await seed("tasks", [
                { id: 1, updated_at: 1, due_date: past, is_completed: 0 }, // overdue, uncompleted -> protected
                { id: 2, updated_at: 2, due_date: past, is_completed: 1 }, // completed -> not protected
                { id: 3, updated_at: 3, due_date: past, is_completed: 1 },
            ]);

            const tx = getTestDb().transaction("tasks", "readwrite");
            await pruneIfNeeded(tx.objectStore("tasks"), "tasks", 2);

            const remaining = await readAll("tasks");
            expect(remaining.map((r) => r.id)).toEqual([1, 3]);
        });

        it("resolves without deleting when all records are protected", async () => {
            await seed("notes", [
                { id: 1, updated_at: 1, is_pinned: 1 },
                { id: 2, updated_at: 2, is_pinned: 1 },
            ]);

            const tx = getTestDb().transaction("notes", "readwrite");
            await pruneIfNeeded(tx.objectStore("notes"), "notes", 1);

            const remaining = await readAll("notes");
            expect(remaining.map((r) => r.id)).toEqual([1, 2]);
        });
    });

    describe("queue changes", () => {
        const change = (overrides: Partial<PendingChanges> = {}): Omit<PendingChanges, "timestamp" | "synced"> => ({
            recordId: "1",
            recordType: "notes",
            operation: "update",
            data: { id: "1", title: "Hello" },
            ...overrides,
        });

        it("creates a new pending change when none exists", async () => {
            await queueChanges(change());

            const all = await readAll("pendingChanges");
            expect(all).toHaveLength(1);
            expect(all[0]).toMatchObject({
                recordId: "1",
                recordType: "notes",
                operation: "update",
                data: { id: "1", title: "Hello" },
                synced: false,
            });
            expect(all[0].timestamp).toEqual(expect.any(Number));
        });

        it("merges data with an existing pending change", async () => {
            await seed("pendingChanges", [
                {
                    recordId: "1",
                    recordType: "notes",
                    operation: "update",
                    data: { id: "1", title: "Hello", content_plaintext: "World" },
                    timestamp: 100,
                    synced: false,
                },
            ]);

            await queueChanges(change({ data: { id: "1", title: "Updated" } }));

            const all = await readAll("pendingChanges");
            expect(all).toHaveLength(1);
            expect(all[0].data).toEqual({ id: "1", title: "Updated", content_plaintext: "World" });
        });

        it("keeps recordType/operation from the existing entry when merging", async () => {
            await seed("pendingChanges", [
                {
                    recordId: "1",
                    recordType: "notes",
                    operation: "create",
                    data: { id: "1" },
                    timestamp: 100,
                    synced: false,
                },
            ]);

            // new change claims "delete", but merge logic spreads existing entry first
            await queueChanges(change({ operation: "delete", data: { id: "1" } }));

            const all = await readAll("pendingChanges");
            expect(all[0].operation).toBe("create");
        });

        it("preserves recordId even if change payload attempts to override it", async () => {
            await queueChanges(change({ recordId: "1", data: { id: "1" } }));
            const all = await readAll("pendingChanges");
            expect(all[0].recordId).toBe("1");
        });

        it("always sets synced to false and refreshes timestamp", async () => {
            await seed("pendingChanges", [
                { recordId: "1", recordType: "notes", operation: "update", data: { id: "1" }, timestamp: 100, synced: true },
            ]);

            await queueChanges(change());

            const all = await readAll("pendingChanges");
            expect(all[0].synced).toBe(false);
            expect(all[0].timestamp).toBeGreaterThan(100);
        });
    });

    describe("mark 'synced'", () => {
        it("removes the pending change for the given recordId", async () => {
            await seed("pendingChanges", [
                { recordId: "1", recordType: "notes", operation: "update", data: { id: "1" }, timestamp: 100, synced: false },
                { recordId: "2", recordType: "tasks", operation: "create", data: { id: "2" }, timestamp: 100, synced: false },
            ]);

            await markSynced("1");

            const all = await readAll("pendingChanges");
            expect(all.map(c => c.recordId)).toEqual(["2"]);
        });

        it("does not throw when recordId does not exist", async () => {
            await expect(markSynced("missing")).resolves.toBeUndefined();
        });
    });

    describe("cursor for syncing", () => {
        it("returns null when no cursor is set", async () => {
            expect(await getSyncCursor("notes")).toBeNull();
        });

        it("sets and retrieves a cursor per record type", async () => {
            await setSyncCursor("notes", "2024-01-01T00:00:00Z");
            await setSyncCursor("tasks", "2024-02-02T00:00:00Z");

            expect(await getSyncCursor("notes")).toBe("2024-01-01T00:00:00Z");
            expect(await getSyncCursor("tasks")).toBe("2024-02-02T00:00:00Z");
        });

        it("overwrites an existing cursor for the same record type", async () => {
            await setSyncCursor("notes", "old");
            await setSyncCursor("notes", "new");

            expect(await getSyncCursor("notes")).toBe("new");
        });
    });
});
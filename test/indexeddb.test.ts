import { IDBFactory } from "fake-indexeddb";
import { getPendingChanges, PendingChanges, queueChanges } from "@/lib/indexeddb";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

describe("queue client DB changes for sync", () => {
    beforeEach(() => {
        indexedDB = new IDBFactory();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("creates new change record", async () => {
        vi.setSystemTime(978310861000); // 2001-01-01T01:01:01.000Z

        const newChange: Omit<PendingChanges, "timestamp" | "synced"> = {
            recordId: "task-abc123",
            recordType: "tasks",
            operation: "create",
            data: { id: "abc123" }
        };
        await queueChanges(newChange);
        const savedChange = await getPendingChanges();

        expect(savedChange[0]).toEqual({
            recordId: "task-abc123",
            recordType: "tasks",
            operation: "create",
            data: { id: "abc123" },
            timestamp: 978310861000,
            synced: false
        });
    });

    it("updates existing change", async () => {
        vi.setSystemTime(978310861000); // 2001-01-01T01:01:01.000Z

        const existingChange: Omit<PendingChanges, "timestamp" | "synced"> = {
            recordId: "task-abc123",
            recordType: "tasks",
            operation: "create",
            data: { id: "abc123", title: "old title", content: "some text" }
        };
        await queueChanges(existingChange);

        const update: Omit<PendingChanges, "timestamp" | "synced"> = {
            recordId: "task-abc123",
            recordType: "tasks",
            operation: "update",
            data: { id: "abc123", title: "new title" }
        };
        await queueChanges(update);
        const updatedChange = await getPendingChanges();

        expect(updatedChange[0]).toEqual({
            recordId: "task-abc123",
            recordType: "tasks",
            operation: "update",
            data: { id: "abc123", title: "new title", content: "some text" },
            timestamp: 978310861000,
            synced: false
        });
    });
});
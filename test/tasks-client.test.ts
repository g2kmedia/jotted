import { pruneIfNeeded } from "@/lib/indexeddb";
import { getTaskLocally, saveTaskLocally } from "@/lib/tasks-client";
import { localTask } from "@/lib/types";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/indexeddb", async (importOriginal) => {
    const actual: typeof import("@/lib/indexeddb") = await importOriginal();
    return {
        ...actual,
        pruneIfNeeded: vi.fn()
    }
});

describe("save task to client DB", () => {
    beforeEach(() => {
        indexedDB = new IDBFactory();
    });

    it("saves a new task", async () => {
        const newTask: Partial<localTask> & { id: string } = {
            id: "abc123"
        };

        await saveTaskLocally(newTask);
        const savedTask = await getTaskLocally("abc123");

        expect(savedTask).toEqual({ id: "abc123" });
    });

    it("updates an existing task", async () => {
        const existingTask: localTask = {
            id: "abc123",
            title: "old title",
            content: "some content",
            created_at: "2001-01-01T01:01:01.000Z",
            updated_at: "2001-01-01T01:01:01.000Z",
            due_date: null,
            priority: null,
            is_completed: 0,
            is_trashed: 0,
            tags: []
        };
        await saveTaskLocally(existingTask);

        const update: Partial<localTask> & { id: string } = {
            id: "abc123",
            title: "updated title"
        };
        await saveTaskLocally(update);
        const updatedTask = await getTaskLocally("abc123");

        expect(updatedTask).toEqual({ ...existingTask, title: "updated title" });
    });

    it("checks if client DB needs pruning", async () => {
        await saveTaskLocally({ id: "abc123" });

        expect(pruneIfNeeded).toHaveBeenCalled();
    });
});
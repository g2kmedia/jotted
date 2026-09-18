// To be refactored later

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDebouncedCallback, useDeleteRecord, useTagsUpdate } from "@/lib/hooks";
import { offlineSaveAndSync, syncPendingChanges } from "@/lib/sync";
import { useNoteStore, useTaskStore } from "@/lib/stores";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteNoteLocally, saveNoteLocally } from "@/lib/notes-client";
import { saveTaskLocally } from "@/lib/tasks-client";
import { queueChanges } from "@/lib/indexeddb";

vi.mock("@/lib/sync", () => ({
    offlineSaveAndSync: vi.fn(),
    syncPendingChanges: vi.fn()
}));

vi.mock("sonner", () => ({
    toast: { error: vi.fn(), success: vi.fn() }
}));

vi.mock("@/lib/stores", () => ({
    useNoteStore: vi.fn(),
    useTaskStore: vi.fn()
}));

vi.mock("next/navigation");
vi.mock("@/lib/notes-client");
vi.mock("@/lib/tasks-client");
vi.mock("@/lib/indexeddb");

const setOnline = (value: boolean) => {
    Object.defineProperty(navigator, "onLine", { value, writable: true, configurable: true });
}

const trashPayload = (overrides = {}) => ({
    id: "123", is_trashed: 1, tags: ["foo", "bar"], ...overrides
});

describe('useDebouncedCallback', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('debounces and calls with latest data', () => {
        const cb = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(cb, 300));

        act(() => result.current('a'));
        act(() => result.current('b'));
        expect(cb).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(300));
        expect(cb).toHaveBeenCalledOnce();
        expect(cb).toHaveBeenCalledWith('b');
    });

    it('uses latest callback via ref', () => {
        const cb1 = vi.fn();
        const cb2 = vi.fn();
        const { result, rerender } = renderHook(
            ({ cb }) => useDebouncedCallback(cb, 300),
            { initialProps: { cb: cb1 } }
        );

        act(() => result.current('x'));
        rerender({ cb: cb2 });
        act(() => vi.advanceTimersByTime(300));

        expect(cb1).not.toHaveBeenCalled();
        expect(cb2).toHaveBeenCalledWith('x');
    });

    it('clears timeout on unmount', () => {
        const cb = vi.fn();
        const { result, unmount } = renderHook(() => useDebouncedCallback(cb, 300));

        act(() => result.current('x'));
        unmount();
        vi.advanceTimersByTime(300);

        expect(cb).not.toHaveBeenCalled();
    });
});

describe("useTagsUpdate", () => {
    const setTags = vi.fn();
    const setSaveStatus = vi.fn();
    const updateNote = vi.fn();
    const updateTask = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useNoteStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ updateNote });
        (useTaskStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ updateTask });
        (offlineSaveAndSync as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    });

    const setup = (recordType: "notes" | "tasks" = "notes") => {
        const { result } = renderHook(() =>
            useTagsUpdate({ recordType, recordId: "123", setTags, setSaveStatus })
        );
        return result.current;
    }

    it("parses valid tags and calls setTags/updateNote", async () => {
        const handle = setup("notes");
        await handle("#foo #bar");

        expect(offlineSaveAndSync).toHaveBeenCalledWith(
            "123",
            "notes",
            "update",
            { tags: ["foo", "bar"] },
            setSaveStatus
        );
        expect(setTags).toHaveBeenCalledWith(["#foo", "#bar"]);
        expect(updateNote).toHaveBeenCalledWith("123", { tags: ["foo", "bar"] });
    });

    it("calls updateTask for tasks recordType", async () => {
        const handle = setup("tasks");
        await handle("#foo");
        expect(updateTask).toHaveBeenCalledWith("123", { tags: ["foo"] });
    });

    it("handles empty input as no tags", async () => {
        const handle = setup("notes");
        await handle("");
        expect(setTags).toHaveBeenCalledWith([]);
        expect(offlineSaveAndSync).toHaveBeenCalledWith(
            "123",
            "notes",
            "update",
            { tags: [] },
            setSaveStatus
        );
    });

    it.each(["foo", "#", "#foo#bar"])("rejects invalid tag input: %s", async (input) => {
        const handle = setup("notes");
        await handle(input);

        expect(toast.error).toHaveBeenCalledWith("Invalid tags");
        expect(setTags).not.toHaveBeenCalled();
        expect(offlineSaveAndSync).not.toHaveBeenCalled();
    });

    it("shows error toast and skips update if sync fails", async () => {
        (offlineSaveAndSync as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("fail"));
        const handle = setup("notes");
        await handle("#foo");

        expect(toast.error).toHaveBeenCalledWith("Failed to update tags. Please try again.");
        expect(setTags).not.toHaveBeenCalled();
        expect(updateNote).not.toHaveBeenCalled();
    });
});

describe("useDeleteRecord", () => {
    const push = vi.fn();

    const setup = () => {
        const { result } = renderHook(() => useDeleteRecord());
        return result.current;
    }

    beforeEach(() => {
        vi.clearAllMocks();
        (useRouter as any).mockReturnValue({ push });
        setOnline(true)
    });

    describe("handleTrash", () => {
        it("creates update with is_pinned for notes", async () => {
            const { handleTrash } = setup();
            await handleTrash("notes", "123", ["foo", "bar"], 0);

            expect(saveNoteLocally).toHaveBeenCalledWith(trashPayload({ is_pinned: 0 }));
        });

        it("creates update without is_pinned for tasks", async () => {
            const { handleTrash } = setup();
            await handleTrash("tasks", "123", ["foo", "bar"], 0);

            expect(saveTaskLocally).toHaveBeenCalledWith({
                id: "123", is_trashed: 1, tags: ["foo", "bar"]
            });
        });

        it("toggles trashStatus 1 to 0", async () => {
            const { handleTrash } = setup();
            await handleTrash("notes", "123", [], 1);

            expect(saveNoteLocally).toHaveBeenCalledWith(
                expect.objectContaining({ is_trashed: 0 })
            );
        });

        it("calls queueChanges with correct payload", async () => {
            const { handleTrash } = setup();
            await handleTrash("notes", "123", ["foo", "bar"], 0);

            expect(queueChanges).toHaveBeenCalledWith({
                recordId: "notes-123",
                recordType: "notes",
                operation: "update",
                data: { id: "123", is_trashed: 1, tags: ["foo", "bar"], is_pinned: 0 }
            });
        });

        it.each([
            ["online", true, true],
            ["offline", false, false]
        ])("%s: sync called = %s", async (_label, isOnline, shouldSync) => {
            setOnline(isOnline);
            const { handleTrash } = setup();
            await handleTrash("notes", "123", ["foo", "bar"], 0);

            if (shouldSync) {
                expect(syncPendingChanges).toHaveBeenCalled();
            } else {
                expect(syncPendingChanges).not.toHaveBeenCalled();
            }
        });

        it("shows 'Trashed' toast when trashing", async () => {
            const { handleTrash } = setup();
            await handleTrash("notes", "123", ["foo", "bar"], 0);

            expect(toast.success).toHaveBeenCalledWith("Trashed");
        });

        it("shows 'Restored' toast when restoring", async () => {
            const { handleTrash } = setup();
            await handleTrash("notes", "123", ["foo", "bar"], 1);

            expect(toast.success).toHaveBeenCalledWith("Restored");
        });

        it("redirects to record type overview", async () => {
            const { handleTrash } = setup();
            await handleTrash("notes", "123", ["foo", "bar"], 0);

            expect(push).toHaveBeenCalledWith("/notes");
        });
    });

    describe("handleDelete", () => {
        it("deletes note locally", async () => {
            const { handleDelete } = setup();
            await handleDelete("notes", "123");

            expect(deleteNoteLocally).toHaveBeenCalledWith("123");
        });

        it("calls queueChanges with delete operation", async () => {
            const { handleDelete } = setup();
            await handleDelete("notes", "123");

            expect(queueChanges).toHaveBeenCalledWith({
                recordId: "notes-123",
                recordType: "notes",
                operation: "delete",
                data: { id: "123" }
            });
        });

        it.each([
            ["online", true, true],
            ["offline", false, false],
        ])("%s: sync called = %s", async (_label, isOnline, shouldSync) => {
            setOnline(isOnline);
            const { handleDelete } = setup();
            await handleDelete("notes", "123");
            if (shouldSync) {
                expect(syncPendingChanges).toHaveBeenCalled();
            } else {
                expect(syncPendingChanges).not.toHaveBeenCalled();
            }
        });

        it("shows success toast and redirects", async () => {
            const { handleDelete } = setup();
            await handleDelete("notes", "123");

            expect(toast.success).toHaveBeenCalledWith("Permanently deleted");
            expect(push).toHaveBeenCalledWith("/notes");
        });

        it("shows error toast and does not redirect on failure", async () => {
            (deleteNoteLocally as any).mockRejectedValueOnce(new Error("fail"));

            const { handleDelete } = setup();
            await handleDelete("notes", "123");

            expect(toast.error).toHaveBeenCalledWith("Failed to permanently delete");
            expect(push).not.toHaveBeenCalled();
        });
    });
});
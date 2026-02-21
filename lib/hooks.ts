import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { deleteNoteLocally, deleteTaskLocally, queueChanges, saveNoteLocally, saveTaskLocally } from "./indexeddb";
import { syncPendingChanges } from "./sync";

export function useDebouncedCallback<T>(
    callback: (data: T) => Promise<void>,
    delay: number
) {
    const timeoutRef = useRef<NodeJS.Timeout>(null);
    const callbackRef = useRef<typeof callback>(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const debounced = useCallback((data: T) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callbackRef.current(data);
        }, delay);
    }, [delay]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debounced;
}

export function useTagsFilter() {
    const [activeTags, setActiveTags] = useState<number[]>([]);

    const handleTagsSelection = (tagId: number): void => {
        setActiveTags(prev =>
            prev.includes(tagId)
                ? prev.filter(t => t !== tagId)
                : [...prev, tagId]
        );
    }

    return { activeTags, handleTagsSelection };
}

export function useTagsUpdate(
    { recordType, route, tags, setTags }: { recordType: string, route: string | null, tags: string[], setTags: (tags: string[]) => void }
) {
    const handleTagsUpdate = async (inputValue: string): Promise<void> => {
        const inputArr = inputValue ? inputValue.trim().split(/\s+/) : [""];
        const newTags: string[] = [];

        for (const input of inputArr) {
            if (
                (
                    input.startsWith("#") &&
                    input.length > 1 &&
                    input.indexOf("#", 1) === -1 // Only a single "#" allowed
                ) ||
                input === ""
            ) {
                newTags.push(input);
            } else {
                toast.error("Invalid tags");
                return;
            }
        }

        try {
            const res = await fetch(`/api/${recordType}/tags/${route}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates: newTags, currentTags: tags })
            });

            if (!res.ok) throw new Error(`Failed to update tags: ${res.status}`);

            setTags(newTags);
            toast.success("Tags updated");
        } catch (error) {
            console.error("Failed to update tags:", error);
            toast.error("Failed to update tags. Please try again.");
        }
    }

    return handleTagsUpdate;
}

export function useScrollVisibility(threshold = 10): boolean {
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY < lastScrollY.current) {
                setIsVisible(true);
            } else if (currentScrollY > lastScrollY.current && currentScrollY > threshold) {
                setIsVisible(false);
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return isVisible;
}

export const useDeleteRecord = () => {
    const router = useRouter();

    const handleTrash = async (
        recordType: "notes" | "tasks",
        id: string | null,
        trashStatus: number,
    ): Promise<void> => {
        const newTrashStatus = trashStatus === 0 ? 1 : 0;

        const update = {
            id: id,
            is_trashed: newTrashStatus,
        };

        if (recordType === "notes") saveNoteLocally(update);
        if (recordType === "tasks") saveTaskLocally(update);

        await queueChanges({
            recordId: `${recordType}-${id}`,
            recordType: recordType,
            operation: "update",
            data: update
        });

        if (navigator.onLine) {
            syncPendingChanges();
        }

        toast.success(newTrashStatus === 1 ? "Trashed" : "Restored");
        router.push(`/${recordType}`);
    }

    const handleDelete = async (
        recordType: "notes" | "tasks",
        id: string,
    ): Promise<void> => {
        try {
            recordType === "notes"
                ? await deleteNoteLocally(id)
                : await deleteTaskLocally(id);

            await queueChanges({
                recordId: `${recordType}-${id}`,
                recordType: recordType,
                operation: "delete",
                data: { id: id }
            });

            if (navigator.onLine) syncPendingChanges();

            toast.success("Permanently deleted");
            router.push(`/${recordType}`);
        } catch (error) {
            console.error("Failed to delete:", error);
            toast.error("Failed to permanently delete");
        }
    }

    return { handleTrash, handleDelete };
}
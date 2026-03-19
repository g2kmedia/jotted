import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { deleteNoteLocally, deleteTaskLocally, queueChanges, saveNoteLocally, saveTaskLocally } from "./indexeddb";
import { offlineSaveAndSync, syncPendingChanges } from "./sync";
import { useNoteStore, useTaskStore } from "./stores";

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

export function useTagsUpdate(
    { recordType, recordId, setTags, setSaveStatus }: {
        recordType: "notes" | "tasks",
        recordId: string,
        setTags: (tags: string[]) => void,
        setSaveStatus: React.Dispatch<React.SetStateAction<"synced" | "saved" | null>>
    }
) {
    const { updateNote } = useNoteStore();
    const { updateTask } = useTaskStore();

    const handleTagsUpdate = async (inputValue: string): Promise<void> => {
        const inputArr = inputValue ? inputValue.trim().split(/\s+/) : [];
        const newTags: string[] = [];

        for (const input of inputArr) {
            if (
                (
                    input.startsWith("#") &&
                    input.length > 1 &&
                    input.indexOf("#", 1) === -1 // Only a single "#" allowed
                )
            ) {
                newTags.push(input);
            } else {
                toast.error("Invalid tags");
                return;
            }
        }

        const tagsData = newTags.map(tag => tag.slice(1))

        try {
            await offlineSaveAndSync(
                recordId!,
                recordType,
                "update",
                { tags: tagsData },
                setSaveStatus,
            );

            setTags(newTags);

            recordType === "notes"
                ? updateNote(recordId, { tags: tagsData })
                : updateTask(recordId, { tags: tagsData });
        } catch (error) {
            console.error("Failed to update tags:", error);
            toast.error("Failed to update tags. Please try again.");
        }
    }

    return handleTagsUpdate;
}

export const useDeleteRecord = () => {
    const router = useRouter();

    const handleTrash = async (
        recordType: "notes" | "tasks",
        id: string,
        tags: string[],
        trashStatus: number,
    ): Promise<void> => {
        const newTrashStatus = trashStatus === 0 ? 1 : 0;

        // always sending the current tags because API would otherwise delete them
        const update = recordType === "notes"
            ? { id: id, is_trashed: newTrashStatus, tags: tags, is_pinned: 0 }
            : { id: id, is_trashed: newTrashStatus, tags: tags };

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
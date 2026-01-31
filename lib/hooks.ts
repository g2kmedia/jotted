import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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

    const handleTrash = async <T extends { is_trashed?: number }>(
        recordType: string,
        id: string | null,
        record: T,
        setRecord: React.Dispatch<React.SetStateAction<T | undefined>>
    ): Promise<void> => {
        const currentTrashStatus = record.is_trashed ?? 0;
        const newTrashStatus = record.is_trashed === 0 ? 1 : 0;

        // Optimistically update
        setRecord(prev => prev ? { ...prev, is_trashed: newTrashStatus } : prev);

        try {
            const res = await fetch(`/api/${recordType}/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ is_trashed: newTrashStatus })
            });

            if (!res.ok) {
                // Rollback on error
                setRecord(prev => prev ? { ...prev, is_trashed: currentTrashStatus } : prev);
                return;
            }
        } catch (error) {
            // Rollback on error
            setRecord(prev => prev ? { ...prev, is_trashed: currentTrashStatus } : prev);
            toast.error("Failed to move to trash");
            return;
        }

        toast.success(newTrashStatus === 1 ? "Trashed" : "Restored");
        router.push(`/${recordType}`);
    }

    const handleDelete = async (
        recordType: string,
        id: string | null,
    ): Promise<void> => {
        try {
            const res = await fetch(`/api/${recordType}/${id}`, { method: "DELETE" });

            if (!res.ok) {
                toast.error("Failed to permanently delete");
                return;
            }

            toast.success("Permanently deleted");
            router.push(`/${recordType}`);
        } catch (error) {
            console.error("Failed to delete:", error);
            toast.error("Failed to permanently delete");
        }
    }

    return { handleTrash, handleDelete };
}
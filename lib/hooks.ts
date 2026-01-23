import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
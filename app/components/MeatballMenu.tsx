"use client"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner";
import { Ellipsis } from "lucide-react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

type recordInfos = {
    title: string
    created_at: string
    updated_at: string
}

type RecordStatus = {
    is_pinned?: number;
    is_completed?: number;
    is_trashed?: number;
} | null;

export default function MeatballMenu() {
    const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
    const [infos, setInfos] = useState<recordInfos | undefined>(undefined);
    const [recordStatus, setRecordStatus] = useState<RecordStatus | null>(null);

    const router = useRouter();

    const params = useParams<{ id: string }>();
    const id = params.id;

    const pathname = usePathname();
    const secondSlashIdx = pathname.indexOf("/", 1) || pathname.length;
    const recordType = pathname.slice(1, secondSlashIdx);

    const baseUrl = `/api/${recordType}/${id}`;

    useEffect(() => {
        const getRecordStatus = async (): Promise<void> => {
            const url = new URL(baseUrl, window.location.origin);

            recordType === "notes"
                ? url.searchParams.set("columns", "is_pinned,is_trashed")
                : url.searchParams.set("columns", "is_completed,is_trashed");

            try {
                const res = await fetch(url, { method: "GET" });

                if (!res.ok) {
                    throw new Error(`Failed to get record status: ${res.status}`);
                }

                const recordStatus = await res.json();
                setRecordStatus(recordStatus[recordType.slice(0, -1)]); // slice "s" to match API response
            } catch (error) {
                console.error("Failed to get record status", error);
            }
        }

        getRecordStatus();
    }, [])

    useEffect(() => {
        if (isInfoDialogOpen) {

            const fetchGeneralInfos = async (): Promise<void> => {

                const res = await fetch(`${baseUrl}?columns=title,created_at,updated_at`, { method: "GET" });

                if (!res.ok) {
                    throw new Error(`Failed to fetch infos: ${res.status}`);
                }

                const infos = await res.json();

                setInfos(infos[recordType.slice(0, -1)]); // slice "s" to match API response
            };

            fetchGeneralInfos();
        }
    }, [isInfoDialogOpen]);

    const pinNote = async (): Promise<void> => {
        const currentPinStatus = recordStatus?.is_pinned;
        const newPinStatus = recordStatus?.is_pinned === 0 ? 1 : 0;

        // Optimistically update
        setRecordStatus(prev => prev ? { ...prev, is_pinned: newPinStatus } : null);

        try {
            const res = await fetch(baseUrl, {
                method: "PATCH",
                body: JSON.stringify({ is_pinned: newPinStatus })
            });

            if (!res.ok) {
                // Rollback on error
                setRecordStatus(prev => prev ? { ...prev, is_pinned: currentPinStatus } : null);
            }
        } catch (error) {
            // Rollback on error
            setRecordStatus(prev => prev ? { ...prev, is_pinned: currentPinStatus } : null);
            toast.error("Failed to pin");
        }

        toast.success(newPinStatus === 1 ? "Pinned" : "Unpinned");
    }

    const completeTask = async (): Promise<void> => {
        const currentCompletionStatus = recordStatus?.is_completed;
        const newCompletionStatus = recordStatus?.is_completed === 0 ? 1 : 0;

        // Optimistically update
        setRecordStatus(prev => prev ? { ...prev, is_completed: newCompletionStatus } : null);

        try {
            const res = await fetch(`/api/${recordType}/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ is_completed: newCompletionStatus })
            });

            if (!res.ok) {
                // Rollback on error
                setRecordStatus(prev => prev ? { ...prev, is_completed: currentCompletionStatus } : null);
            }
        } catch (error) {
            // Rollback on error
            setRecordStatus(prev => prev ? { ...prev, is_completed: currentCompletionStatus } : null);
            toast.error("Failed to mark as completed");
        }

        toast.success(newCompletionStatus === 1 ? "Marked as Completed" : "Marked as Uncompleted");
        router.push(`/${recordType}`);
    }

    const handleTrash = async (): Promise<void> => {
        const currentTrashStatus = recordStatus?.is_trashed;
        const newTrashStatus = recordStatus?.is_trashed === 0 ? 1 : 0;

        // Optimistically update
        setRecordStatus(prev => prev ? { ...prev, is_trashed: newTrashStatus } : null);

        try {
            const res = await fetch(`/api/${recordType}/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ is_trashed: newTrashStatus })
            });

            if (!res.ok) {
                // Rollback on error
                setRecordStatus(prev => prev ? { ...prev, is_trashed: currentTrashStatus } : null);
            }
        } catch (error) {
            // Rollback on error
            setRecordStatus(prev => prev ? { ...prev, is_trashed: currentTrashStatus } : null);
            toast.error("Failed to move to trash");
        }

        toast.success(newTrashStatus === 1 ? "Trashed" : "Restored");
        router.push(`/${recordType}`);
    }

    const getMenuItems = (recordType: string, recordStatus: RecordStatus) => {
        if (recordType === "notes") {
            return recordStatus?.is_pinned === 1
                ? <DropdownMenuItem onSelect={() => pinNote()} className="rounded-2xl">Unpin Note</DropdownMenuItem>
                : <DropdownMenuItem onSelect={() => pinNote()} className="rounded-2xl">Pin Note</DropdownMenuItem>;
        }

        if (recordType === "tasks") {
            return recordStatus?.is_completed === 1
                ? <DropdownMenuItem onSelect={() => completeTask()} className="rounded-2xl">Mark as Uncompleted</DropdownMenuItem>
                : <DropdownMenuItem onSelect={() => completeTask()} className="rounded-2xl">Mark as Completed</DropdownMenuItem>;
        }
    }

    return (
        <>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button className="hover:cursor-pointer outline-none">
                        <Ellipsis size={32} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="mx-2 rounded-2xl">
                    <DropdownMenuItem onSelect={() => setIsInfoDialogOpen(true)} className="rounded-2xl">Info</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {getMenuItems(recordType, recordStatus)}
                    <DropdownMenuSeparator />
                    {recordStatus?.is_trashed === 1 ? (
                        <DropdownMenuItem variant="destructive" onSelect={() => handleTrash()} className="rounded-2xl">Restore from Trash</DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem variant="destructive" onSelect={() => handleTrash()} className="rounded-2xl">Move to Trash</DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Info</DialogTitle>
                        {infos && (
                            <DialogDescription>
                                Title:<br />
                                {infos.title}<br /><br />

                                Created at:<br />
                                {new Date(infos.created_at + "Z").toLocaleString(undefined, {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit"
                                })}<br /><br />

                                Last updated at:<br />
                                {new Date(infos.updated_at + "Z").toLocaleString(undefined, {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit"
                                })}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </>
    );
}
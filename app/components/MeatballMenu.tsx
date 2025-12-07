"use client"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Ellipsis } from "lucide-react";
import { redirect, useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { usePathname } from "next/navigation";

type recordInfos = {
    title: string
    created_at: string
    updated_at: string
}

export default function MeatballMenu() {
    const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
    const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
    const [infos, setInfos] = useState<recordInfos | undefined>(undefined);

    const params = useParams<{ id: string }>();
    const id = params.id;

    const pathname = usePathname();

    useEffect(() => {
        if (isInfoDialogOpen) {

            const fetchInfos = async (): Promise<void> => {
                const secondSlashIdx = pathname.indexOf("/", 1) || pathname.length;
                const recordType = pathname.slice(1, secondSlashIdx);

                const res = await fetch(`/api/${recordType}/${id}?columns=title,created_at,updated_at`, { method: "GET" });

                if (!res.ok) {
                    throw new Error(`Failed to fetch infos: ${res.status}`);
                }

                const infos = await res.json();

                setInfos(infos[recordType.slice(0, -1)]); // slice "s" to match API response
            };

            fetchInfos();
        }
    }, [isInfoDialogOpen]);

    // Add logic to get and set the URL dynamically
    const handleTrash = async (update: string): Promise<void> => {
        const secondSlashIdx = pathname.indexOf("/", 1) || pathname.length;
        const recordType = pathname.slice(1, secondSlashIdx);

        try {
            const res = await fetch(`/api/${recordType}/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ is_trashed: update })
            });

            if (!res.ok) {
                throw new Error(`Failed to move to trash: ${res.status}`)
                // Add popup notifications with a warning
            }
        } catch (error) {
            console.error("Failed to move to trash:", error);
            // Add notifications for the user
        }

        toast.success("Trashed");
        redirect(`/${recordType}`);
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
                    <DropdownMenuItem variant="destructive" onSelect={() => setIsAlertDialogOpen(true)} className="rounded-2xl">Move to Trash</DropdownMenuItem>
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

            <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="dark:hover:bg-accent hover:cursor-pointer">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleTrash("1")} className="bg-destructive hover:bg-destructive hover:cursor-pointer">Trash</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
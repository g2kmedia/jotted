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
import { NoteInfo } from "@/lib/schemas";

export default function MeatballMenu() {
    const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
    const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
    const [noteInfos, setNoteInfos] = useState<NoteInfo | undefined>(undefined);

    const params = useParams<{ id: string }>();
    const noteId = params.id;

    useEffect(() => {
        if (isInfoDialogOpen) {
            const fetchNoteInfos = async (): Promise<void> => {
                const res = await fetch(`/api/notes/${noteId}?columns=title,created_at,updated_at`, { method: "GET" });

                if (!res.ok) {
                    throw new Error(`Failed to fetch note infos: ${res.status}`);
                }

                const { note } = await res.json();

                setNoteInfos(note);
            };

            fetchNoteInfos();
        }
    }, [isInfoDialogOpen]);

    const handleDelete = async (): Promise<void> => {
        try {
            const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });

            if (!res.ok) {
                throw new Error(`Failed to delete note: ${res.status}`)
                // Add popup notifications with a warning
            }
        } catch (error) {
            console.error("Failed to delete note:", error);
            // Add notifications for the user
        }

        toast.success("Note deleted");
        redirect("/notes");
    }

    return (
        <>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button className="hover:cursor-pointer outline-none">
                        <Ellipsis size={32} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setIsInfoDialogOpen(true)}>Info</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setIsAlertDialogOpen(true)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Info</DialogTitle>
                        {noteInfos && (
                            <DialogDescription>
                                Title:<br />
                                {noteInfos.title}<br /><br />

                                Created at:<br />
                                {new Date(noteInfos.created_at).toLocaleString(undefined, {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit"
                                })}<br /><br />

                                Last updated at:<br />
                                {new Date(noteInfos.updated_at).toLocaleString(undefined, {
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
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your note.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="dark:hover:bg-accent hover:cursor-pointer">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive hover:cursor-pointer">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
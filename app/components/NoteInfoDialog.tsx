"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { NoteInfo } from "@/lib/schemas";
import { useEffect, useState } from "react";

interface NoteInfoDialogProps {
    noteId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function NoteInfoDialog(
    { noteId, open, onOpenChange }: NoteInfoDialogProps
) {
    const [noteInfos, setNoteInfos] = useState<NoteInfo | undefined>(undefined);

    useEffect(() => {
        if (!open) return;

        const fetchNoteInfos = async (): Promise<void> => {
            const res = await fetch(`/api/notes/${noteId}?columns=title,created_at,updated_at`, { method: "GET" });

            if (!res.ok) {
                throw new Error(`Failed to fetch note infos: ${res.status}`);
            }

            const { note } = await res.json();

            setNoteInfos(note);
        };

        fetchNoteInfos();
    }, [noteId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Info</DialogTitle>
                    <DialogDescription>
                        Description
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
}
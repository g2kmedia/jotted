"use client"

import NoteEditorPage from "@/app/components/NoteEditorPage";
import { usePathname } from "next/navigation";

export default function OfflineNote() {
    const pathname = usePathname();
    
    const id = pathname.split("/").at(-1);

    if (!id) return null;

    return <NoteEditorPage noteId={id} />
}
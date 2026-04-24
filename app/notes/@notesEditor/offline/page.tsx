"use client"

import NoteEditorPage from "@/app/components/NoteEditorPage";

export default function OfflineNote() {
    const id = window.location.pathname.split("/").at(-1);

    if (!id) return null;

    return <NoteEditorPage noteId={id} />
}
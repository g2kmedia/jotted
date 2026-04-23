"use client"

import NoteEditorPage from "@/app/components/NoteEditorPage";
import { use } from "react";

export default function Note(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = use(params)

  if (!id) return null;

  return <NoteEditorPage noteId={id} />
}
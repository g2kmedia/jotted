"use client"

import { useCallback, useEffect, useState } from "react";
import debounce from "lodash.debounce";
import { type NoteUpdate, type EditorNote } from "@/lib/schemas";
import { Editor } from "@/app/components/DynamicEditor";
import type { Block } from "@blocknote/core";

export default function Note(
  { params }: { params: Promise<{ id: string }> }
) {
  const [route, setRoute] = useState<string | null>(null);
  const [note, setNote] = useState<EditorNote | undefined>(undefined);

  useEffect(() => {
    const getParams = async (): Promise<void> => {
      const { id } = await params;
      setRoute(id);
    };

    getParams();
  }, [params]);

  useEffect(() => {
    if (!route) return;

    const loadNote = async (): Promise<void> => {
      const res = await fetch(`/api/notes/${route}?columns=title,content`, { method: "GET" });

      if (!res.ok) {
        throw new Error(`Failed to fetch note: ${res.status}`);
      }

      const { note } = await res.json();

      setNote(note);
    };

    loadNote();
  }, [route]);

  const debouncedSave = useCallback(
    debounce(async (newDocument: NoteUpdate, currentRoute: string | null) => {
      if (!currentRoute) return;

      try {
        const res = await fetch(`/api/notes/${currentRoute}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newDocument)
        });

        if (!res.ok) {
          throw new Error(`Failed to update note: ${res.status}`)
        }
        // Add notifications here also ?

      } catch (error) {
        console.error("Failed to update note:", error);
        // Add notifications for the user
      }
    }, 500), []
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newTitle = e.target.value;

    setNote(prev => prev ? { ...prev, title: newTitle } : undefined);
    debouncedSave({ title: newTitle }, route);
  }

  const handleContentChange = (newDocument: Block[]): void => {
    debouncedSave({ content: newDocument }, route)
  }

  if (!note) return null;

  return (
    <article>
      <input
        type="text"
        value={note.title}
        onChange={handleTitleChange}
        className="w-full text-center overflow-hidden text-ellipsis focus-visible:outline-none"
      />
      <hr className="m-1" />
      <Editor initialContent={note.content as Block[]} onChange={handleContentChange} />
    </article>
  )
}
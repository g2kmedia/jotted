"use client"

import { useCallback, useEffect, useState } from "react";
import debounce from "lodash.debounce";
import { NoteUpdate, type Note } from "@/lib/schemas";

export default function Note({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const [note, setNote] = useState<Note | null>(null);
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    const getRouteId = async () => {
      const route = await params;
      setRoute(route.id);
    }

    getRouteId();
  }, [params]);

  useEffect(() => {
    if (!route) return;

    const loadNote = async (): Promise<void> => {
      const res = await fetch(`/api/notes/${route}`, { method: "GET" });

      if (!res.ok) {
        throw new Error(`Failed to fetch note: ${res.status}`);
      }

      const { note } = await res.json();
      setNote(note);
    };

    loadNote();
  }, [route]);

  const debouncedSave = useCallback(
    debounce(async (updates: NoteUpdate, currentRoute: string | null) => {
      if (!currentRoute) return;

      try {
        const res = await fetch(`/api/notes/${currentRoute}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        })

        if (!res.ok) {
          throw new Error(`Failed to update note: ${res.status}`)
        }
      } catch (error) {
        console.error("Failed to update note:", error);
        // Add notifications for the user
      }
    }, 500), []
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;

    setNote(prev => prev ? { ...prev, title: newTitle } : null);
    debouncedSave({ title: newTitle }, route);
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;

    setNote(prev => prev ? { ...prev, content: newContent } : null);
    debouncedSave({ content: newContent }, route);
  }

  if (!note) return null;

  return (
    <article className="h-screen w-screen">
      <input
        type="text"
        value={note.title}
        onChange={handleTitleChange}
        className="w-full"
      />
      <textarea
        value={note.content || ""}
        placeholder="What's on your mind? Start writing..."
        onChange={handleContentChange}
        className="w-full h-2/3">
      </textarea>
    </article>
  )
}
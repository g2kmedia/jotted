"use client"

import { type Note } from "@/lib/schemas";
import { useEffect, useState } from "react";

export default function Note({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    const loadNote = async () => {
      const routeId = await params
      const res = await fetch(`/api/notes/${routeId.id}`, { method: "GET" });

      if (!res.ok) {
        throw new Error(`Failed to fetch note: ${res.status}`);
      }

      const { note } = await res.json();
      setNote(note);
    };

    loadNote();
  }, [params]);

  if (!note) return null;

  return (
    <article>
      <h1>{note.title}</h1>
      <p>{note.content}</p>
    </article>
  )
}
"use client"

import { Note, NoteWithTag } from "@/lib/schemas";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from 'lucide-react';

export default function NotesOverview() {
  const [notes, setNotes] = useState<Partial<NoteWithTag>[] | undefined>(undefined);

  useEffect(() => {
    const loadAllNotes = async () => {
      const res = await fetch("/api/notes?columns=id,title", { method: "GET" });

      if (!res.ok) {
        throw new Error(`Failed to fetch notes: ${res.status}`);
      }

      const { notes } = await res.json();
      setNotes(notes);
    }

    loadAllNotes();
  }, []);

  if (!notes) return null;

  if (notes.length === 0) {
    return (
      <p className="h-full flex justify-center items-center text-center">You seem to not have any notes.<br />Start by creating one.</p>
    );
  }

  return (
    <section>
      <h1 className="mb-6 pl-4 text-2xl flex flex-col">
        <span>your</span>
        <span className="pl-4">notes
          <span className="text-muted-foreground"> ({notes.length})</span>
        </span>
      </h1>
      {notes.map((note) => {
        return (
          <Link href={`/notes/${note.id}`} key={note.id}>
            <article className="h-15 mb-6 p-2 border-t-1 border-foreground">
              <h1 className="flex justify-between text-lg mb-1">{note.title} <ArrowUpRight size={20} /></h1>
              <ul className="flex gap-2 text-xs text-muted-foreground">
                {note.tags?.map((tag, index) => (
                  <li key={index} className="px-2">#{tag}</li>
                ))}
              </ul>
            </article>
          </Link>
        );
      })}
    </section >
  );
}
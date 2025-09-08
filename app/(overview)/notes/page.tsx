"use client"

import { NoteWithTag } from "@/lib/schemas";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from 'lucide-react';
import InfiniteScroll from "react-infinite-scroll-component";

export default function NotesOverview() {
  const [notes, setNotes] = useState<Partial<NoteWithTag>[] | undefined>(undefined);
  const [lastNoteId, setLastNoteId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadNotes = async () => {
    if (!hasMore) return;

    try {
      const url = lastNoteId
        ? `/api/notes?columns=id,title,updated_at&limit=20&id_before=${lastNoteId}`
        : "/api/notes?columns=id,title,updated_at&limit=20";

      const res = await fetch(url, { method: "GET" });

      if (!res.ok) {
        throw new Error(`Failed to fetch notes: ${res.status}`);
      }

      const { notes: newNotes } = await res.json();

      if (newNotes.length === 0) {
        setHasMore(false);
        return;
      }

      setNotes(prev => {
        if (!prev) return newNotes;

        const existingIds = new Set(prev.map(note => note.id));
        const uniqueNewNotes = newNotes.filter ((note: Partial<NoteWithTag>) => !existingIds.has(note.id));

        return [...prev, ...uniqueNewNotes];
      });
      
      setLastNoteId(newNotes[newNotes.length - 1].id);

    } catch (error) {
      console.error("Failed to load notes:", error)
    }
  }

  useEffect(() => {
    loadNotes();
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
        </span>
      </h1>
      <InfiniteScroll
        dataLength={notes.length}
        next={loadNotes}
        hasMore={hasMore}
        loader={""}
        scrollableTarget="main-scrollable-target" // id of main tag for scroll detection
      >
        {notes.map((note) => {
          return (
            <Link href={`/notes/${note.id}`} key={note.id}>
              <article className="h-16 mb-6 p-2 border-t-1 border-foreground">
                <h1 className="flex justify-between text-lg mb-1">{note.title} <ArrowUpRight size={20} /></h1>
                <ul className="flex gap-2 text-sm text-muted-foreground">
                  {note.tags?.map((tag, index) => (
                    <li key={index} className="pl-2">#{tag}</li>
                  ))}
                </ul>
              </article>
            </Link>
          );
        })}
      </InfiniteScroll>
      <div className="h-16"></div>
    </section>
  );
}
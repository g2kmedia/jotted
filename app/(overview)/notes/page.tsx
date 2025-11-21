"use client"

import { NoteWithTags, Tag } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";

export default function NotesOverview() {
  const [tags, setTags] = useState<Omit<Tag, "created_at">[]>([]);
  const [activeTags, setActiveTags] = useState<number[]>([]);
  const [notes, setNotes] = useState<Partial<NoteWithTags>[] | undefined>(undefined);
  const [lastNoteId, setLastNoteId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadNotes = async (resetStates = false): Promise<void> => {
    if (resetStates) {
      setNotes(undefined);
      setLastNoteId(null);
      setHasMore(true);
    }

    if (!hasMore && !resetStates) return;

    const url = new URL("/api/notes", window.location.origin);

    url.searchParams.set("columns", "id,title,updated_at");

    if (lastNoteId && !resetStates) {
      url.searchParams.set("id_before", lastNoteId.toString())
    }

    if (activeTags.length > 0) {
      url.searchParams.set("tags", activeTags.join());
    }

    const finalUrl = url.pathname + url.search;

    try {
      const res = await fetch(finalUrl, { method: "GET" });

      if (!res.ok) {
        throw new Error(`Failed to fetch notes: ${res.status}`);
      }

      const { notes: newNotes } = await res.json();

      if (newNotes.length === 0) {
        setHasMore(false);
        return;
      }

      setNotes(prev => {
        if (resetStates || !prev) return newNotes;

        const existingIds = new Set(prev.map(note => note.id));
        const uniqueNewNotes = newNotes.filter((note: Partial<NoteWithTags>) => !existingIds.has(note.id));

        return [...prev, ...uniqueNewNotes];
      });

      setLastNoteId(newNotes[newNotes.length - 1].id);

    } catch (error) {
      console.error("Failed to load notes:", error);
    }
  }

  const loadTags = async (): Promise<void> => {
    try {
      const url = "/api/notes/tags";

      const res = await fetch(url, { method: "GET" });

      if (!res.ok) {
        throw new Error(`Failed to fetch tags: ${res.status}`);
      }

      const { tags } = await res.json();

      setTags(tags);

    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  }

  const handleTagsSelection = (tag: number): void => {
    setActiveTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  }

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    loadNotes(true); // Reset states/query params
  }, [activeTags])

  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => {
      const aIsActive = activeTags.includes(a.id);
      const bIsActive = activeTags.includes(b.id);

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      return 0;
    });
  }, [tags, activeTags]);

  if (!notes) return null;

  if (notes.length === 0) {
    return (
      <p className="h-full flex justify-center items-center text-center">You seem to not have any notes.<br />Start by creating one.</p>
    );
  }

  return (
    <>
      <h1 className="mb-6 pl-4 text-3xl font-extrabold flex flex-col">
        <span>your</span>
        <span className="pl-4">notes
        </span>
      </h1>
      <section className="flex mb-6 overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sortedTags.map((tag) => (
          <button
            key={tag.id}
            className={`${activeTags.includes(tag.id) ? "bg-accent" : ""} p-2.5 ml-2 border rounded-full whitespace-nowrap cursor-pointer`}
            onClick={() => handleTagsSelection(tag.id)}
          >
            #{tag.name}
          </button>
        ))}
      </section>
      <section>
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
                <article className="h-22 mb-2 p-4 border-1 border-foreground rounded-lg">
                  <h3 className="text-lg mb-1">{note.title}</h3>
                  <ul className="flex gap-2 text-sm font-light text-muted-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
    </>
  );
}
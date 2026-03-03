"use client"

import TagsBar from "@/app/components/TagsBar";
import { useTagsFilter } from "@/lib/hooks";
import { getAllNotesLocally, getAllNotesTagsLocally } from "@/lib/indexeddb";
import { localNote } from "@/lib/types";
import { Pin, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";

export default function NotesOverview() {
  const [quickFilter, setQuickFilter] = useState<"pinned" | "trashed" | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<localNote[] | null>(null);
  const [lastQueriedRecord, setLastQueriedRecord] = useState<{ id: string, updated_at: string } | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { activeTags, handleTagsSelection } = useTagsFilter();

  const loadNotes = async (resetStates = false): Promise<void> => {
    if (resetStates) {
      setNotes(null);
      setLastQueriedRecord(null);
      setHasMore(true);
    }

    if (!hasMore && !resetStates) return;

    if (navigator.onLine) {
      const url = new URL("/api/notes", window.location.origin);

      if (quickFilter === "pinned") {
        url.searchParams.set("is_pinned", "1");
        url.searchParams.set("is_trashed", "0");
      } else if (quickFilter === "trashed") {
        url.searchParams.set("is_trashed", "1");
      } else {
        url.searchParams.set("is_trashed", "0");
      }

      if (lastQueriedRecord && !resetStates) {
        url.searchParams.set("last_queried_record", JSON.stringify(lastQueriedRecord));
      }

      if (activeTags.length > 0) {
        url.searchParams.set("tags", activeTags.join());
      }

      try {
        const res = await fetch(url, { method: "GET" });

        if (!res.ok) {
          throw new Error(`Failed to fetch notes: ${res.status}`);
        }

        const { notes: newNotes } = await res.json();

        if (newNotes.length === 0) {
          setHasMore(false);

          if (resetStates || !notes) {
            setNotes([]);
          }

          return;
        }

        setNotes(prev => {
          if (resetStates || !prev) return newNotes;

          const existingIds = new Set(prev.map(note => note.id));
          const uniqueNewNotes = newNotes.filter((note: localNote) => !existingIds.has(note.id));

          return [...prev, ...uniqueNewNotes];
        });

        const lastRecord = newNotes[newNotes.length - 1];
        setLastQueriedRecord({ id: lastRecord.id, updated_at: lastRecord.updated_at });

      } catch (error) {
        console.error("Failed to load notes from server:", error);
      }
    } else {
      try {
        const results = await getAllNotesLocally(
          quickFilter,
          resetStates ? null : lastQueriedRecord,
          activeTags,
          20
        );

        const newNotes = results;

        if (!newNotes || newNotes.length === 0) {
          setHasMore(false);

          if (resetStates || !notes) {
            setNotes([]);
          }

          return;
        }

        setNotes(prev => {
          if (resetStates || !prev) return newNotes;

          const existingIds = new Set(prev.map(note => note.id));
          const uniqueNewNotes = newNotes.filter(note => !existingIds.has(note.id));

          return [...prev, ...uniqueNewNotes];
        });

        const lastRecord = newNotes[newNotes.length - 1];
        setLastQueriedRecord({ id: lastRecord.id, updated_at: lastRecord.updated_at });
      } catch (error) {
        console.error("Failed to load notes locally:", error);
      }
    }
  }

  const loadTags = async (): Promise<void> => {
    if (navigator.onLine) {
      try {
        const url = new URL("/api/notes/tags", window.location.origin);
        url.searchParams.set("is_trashed", "0");

        const res = await fetch(url, { method: "GET" });

        if (!res.ok) {
          throw new Error(`Failed to fetch tags: ${res.status}`);
        }

        const { tags } = await res.json();

        setTags(tags);

      } catch (error) {
        console.error("Failed to load tags from server:", error);
      }
    } else {
      try {
        const tags = await getAllNotesTagsLocally();

        setTags(tags);

      } catch (error) {
        console.error("Failed to load tags locally:", error);
      }
    }
  }

  useEffect(() => {
    loadNotes(true); // Reset states/query params
    loadTags();
  }, [quickFilter, activeTags]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (!notes) return null;

  return (
    <>
      <section className={`mb-6 grid grid-cols-2 gap-2 text-xl ${isInitialLoad ? "slide-in-right" : ""}`}>
        <button
          className={`${quickFilter === "pinned" ? "bg-accent" : ""} min-h-14 p-3 border-1 border-foreground rounded-xl flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(prev => prev === "pinned" ? null : "pinned")}
        >
          <span>Pinned</span>
          <span><Pin /></span>
        </button>
        <button
          className={`${quickFilter === "trashed" ? "bg-accent" : ""} min-h-14 p-3 border-1 border-foreground rounded-xl flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(prev => prev === "trashed" ? null : "trashed")}
        >
          <span>Trashed</span>
          <span><Trash2 /></span>
        </button>
      </section>
      {quickFilter !== "trashed"
        && <TagsBar tags={tags} activeTags={activeTags} onTagSelect={handleTagsSelection} className={isInitialLoad ? "slide-in-left" : ""} />}
      <section className="slide-in-bottom">
        {notes.length === 0 ? (
          <p className="h-full flex justify-center items-center text-center mt-20">
            {quickFilter || activeTags.length > 0
              ? "No notes here."
              : "You seem to not have any notes.\nStart by creating one."}
          </p>
        ) : (
          <InfiniteScroll
            dataLength={notes.length}
            next={loadNotes}
            hasMore={hasMore}
            loader={null}
            scrollableTarget="main-scrollable-target" // id of main tag for scroll detection (overview/layout.tsx)
          >
            {notes.map((note) => {
              return (
                <Link href={`/notes/${note.id}`} key={note.id}>
                  <article className="h-22 mb-2 p-2 border-1 border-foreground rounded-lg">
                    <div className="flex justify-between">
                      <h3 className="text-lg mb-1 truncate">{note.title}</h3>
                      {note.is_pinned === 1 ? <Pin size={18} /> : ""}
                    </div>
                    <ul className="flex gap-2 text-sm font-light text-muted-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {note.tags?.map((tag, index) => (
                        <li key={index}>#{tag}</li>
                      ))}
                    </ul>
                  </article>
                </Link>
              );
            })}
          </InfiniteScroll>
        )}
        <div className="h-16"></div>
      </section>
    </>
  );
}
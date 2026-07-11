"use client"

import NoteItem from "@/app/components/NoteItem";
import QuickFilterButton from "@/app/components/QuickFilterButton";
import TagsBar from "@/app/components/TagsBar";
import { getAllNotesLocally, getAllNotesTagsLocally, getNoteCountsLocally } from "@/lib/notes-client";
import { useNoteStore, useTagsStore } from "@/lib/stores";
import { localNote } from "@/lib/types";
import { PencilLine, SearchCode } from "lucide-react";
import { useEffect } from "react";

const NOTE_QUICK_FILTERS = [
  { key: "pinned", label: "PINNED" },
  { key: "trashed", label: "TRASHED" }
];

export default function NotesOverview() {
  const {
    notes,
    noteCounts,
    lastQueriedRecord,
    hasMore,
    quickFilter,
    tags,
    setNotes,
    setNoteCounts,
    appendNewNotes,
    setLastQueriedRecord,
    setHasMore,
    setQuickFilter,
    setTags
  } = useNoteStore();

  const { activeTags, toggleActiveTag } = useTagsStore();

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

        if (!newNotes || newNotes.length === 0) {
          setHasMore(false);

          if (resetStates || !notes) {
            setNotes([]);
          }

          return;
        }

        const parsedNotes = newNotes.map((note: localNote) => ({
          ...note,
          content: typeof note.content === "string" && note.content !== ""
            ? JSON.parse(note.content)
            : note.content
        }));

        resetStates || !notes ? setNotes(parsedNotes) : appendNewNotes(parsedNotes);

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

        resetStates || !notes ? setNotes(newNotes) : appendNewNotes(newNotes);

        const lastRecord = newNotes[newNotes.length - 1];
        setLastQueriedRecord({ id: lastRecord.id, updated_at: lastRecord.updated_at });
      } catch (error) {
        console.error("Failed to load notes locally:", error);
      }
    }
  }

  const loadNoteCounts = async (): Promise<void> => {
    if (navigator.onLine) {
      try {
        const url = new URL("/api/notes/counts", window.location.origin);
        const res = await fetch(url, { method: "GET" });

        if (!res.ok) {
          throw new Error(`Failed to fetch note counts: ${res.status}`);
        }

        const counts = await res.json();
        setNoteCounts(counts);
      } catch (error) {
        console.error("Failed to load note counts from server:", error);
      }
    } else {
      try {
        const counts = await getNoteCountsLocally();
        setNoteCounts(counts);
      } catch (error) {
        console.error("Failed to load note counts locally:", error);
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
    loadNoteCounts();
  }, []);

  useEffect(() => {
    loadNotes(true); // Reset states/query params
    loadTags();
  }, [quickFilter, activeTags]);

  if (!notes) return null;

  return (
    <div className="h-full flex flex-col">
      <section className="grid grid-cols-2 border-b-1 pb-2">
        {NOTE_QUICK_FILTERS.map(f => (
          <QuickFilterButton
            key={f.key}
            active={quickFilter === f.key}
            count={noteCounts[f.key as keyof typeof noteCounts]}
            label={f.label}
            onClick={() => setQuickFilter(quickFilter === f.key ? null : f.key)}
          />
        ))}
      </section>

      {quickFilter !== "trashed"
        && <TagsBar tags={tags} activeTags={activeTags} onTagSelect={toggleActiveTag} />}

      <section className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col mt-10">
            {quickFilter || activeTags.length > 0 ? (
              <>
                <SearchCode strokeWidth={"1"} size={48} className="w-full text-accent" />
                <h3 className="text-center text-secondary-foreground">No notes match this view.</h3>
              </>
            ) : (
              <>
                <PencilLine strokeWidth={"1"} size={48} className="w-full text-accent" />
                <h3 className="text-center text-secondary-foreground">
                  You seem to not have any notes.
                  <br />
                  Start by creating some.
                </h3>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {notes.map((note) => (
              <NoteItem key={note.id} note={note} />
            ))}
            {hasMore
              ? <button onClick={() => loadNotes()} className="w-fit mx-auto p-4 mb-30 lg:mb-3 text-center font-titles border-foreground hover:cursor-pointer hover:border-b-1 hover:border-accent">Load More</button>
              : <p className="p-4 mb-30 lg:mb-3 text-center font-titles">That's all!</p>
            }
          </div>
        )}
      </section>
    </div>
  );
}
"use client"

import TagsBar from "@/app/components/TagsBar";
import { getAllNotesLocally, getAllNotesTagsLocally } from "@/lib/indexeddb";
import { useNoteStore, useTagsStore } from "@/lib/stores";
import { localNote } from "@/lib/types";
import { Pin } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function NotesOverview() {
  const {
    notes,
    lastQueriedRecord,
    hasMore,
    quickFilter,
    tags,
    setNotes,
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

  if (!notes) return null;

  return (
    <div className="h-full flex flex-col">
      <section className="my-4 px-1 grid grid-cols-4 gap-4 text-xl">
        <button
          className={`${quickFilter === "pinned" ? "border-accent text-foreground" : "border-transparent text-muted-foreground"} border-b-4 cursor-pointer hover:border-accent`}
          onClick={() => setQuickFilter(quickFilter === "pinned" ? null : "pinned")}
        >
          Pinned
        </button>
        <button
          className={`${quickFilter === "trashed" ? "border-accent text-foreground" : "border-transparent text-muted-foreground"} border-b-4 cursor-pointer hover:border-accent`}
          onClick={() => setQuickFilter(quickFilter === "trashed" ? null : "trashed")}
        >
          Trashed
        </button>
      </section>

      {quickFilter !== "trashed"
        && <TagsBar tags={tags} activeTags={activeTags} onTagSelect={toggleActiveTag} />}

      <section className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-center mt-20">
            {quickFilter || activeTags.length > 0 ? (
              "No notes here."
            ) : (
              <>
                You seem to not have any notes.
                <br />
                Start by creating one.
              </>
            )}
          </p>
        ) : (
          <div className="flex flex-col">
            {notes.map((note) => {
              return (
                <Link href={`/notes/${note.id}`} key={note.id}>
                  <article className="max-h-22 p-2 mb-2 flex flex-col border-b-1 border-muted-foreground/30">
                    <div className="flex justify-between">
                      <h3 className="text-lg mb-1 whitespace-nowrap overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{note.title}</h3>
                      {note.is_pinned === 1 ? <Pin size={18} className="ml-2"/> : ""}
                    </div>
                    {note.tags &&
                      <ul className="flex gap-2 text-sm font-light text-muted-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {note.tags.map((tag, index) => (
                          <li key={index}>#{tag}</li>
                        ))}
                      </ul>
                    }
                  </article>
                </Link>
              );
            })}
            {hasMore
              ? <button onClick={() => loadNotes()} className="w-fit mx-auto p-4 mb-30 lg:mb-3 text-center underline border-foreground hover:cursor-pointer">Load More</button>
              : <p className="p-4 mb-30 lg:mb-3 text-center">That's all!</p>
            }
          </div>
        )}
      </section>
    </div>
  );
}
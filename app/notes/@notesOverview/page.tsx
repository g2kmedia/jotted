"use client"

import BottomNavbar from "@/app/components/BottomNavbar";
import TagsBar from "@/app/components/TagsBar";
import TopNavbar from "@/app/components/TopNavbar";
import { getAllNotesLocally, getAllNotesTagsLocally } from "@/lib/indexeddb";
import { useNoteStore, useTagsStore } from "@/lib/stores";
import { localNote } from "@/lib/types";
import { Pin, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import InfiniteScroll from "react-infinite-scroll-component";

export default function NotesOverview() {
  const {
    notes,
    lastQueriedRecord,
    hasMore,
    isInitialLoad,
    quickFilter,
    tags,
    setNotes,
    appendNewNotes,
    setLastQueriedRecord,
    setHasMore,
    setIsInitialLoad,
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

        if (newNotes.length === 0) {
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (!notes) return null;

  return (
    <>
      <header className="mx-2 mb-2">
        <TopNavbar />
      </header>

      <section className={`mb-6 grid grid-cols-2 gap-2 text-xl ${isInitialLoad ? "slide-in-left" : ""}`}>
        <button
          className={`${quickFilter === "pinned" ? "bg-accent" : ""} min-h-14 p-3 border-1 border-foreground rounded-xl flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(quickFilter === "pinned" ? null : "pinned")}
        >
          <span>Pinned</span>
          <span><Pin /></span>
        </button>
        <button
          className={`${quickFilter === "trashed" ? "bg-accent" : ""} min-h-14 p-3 border-1 border-foreground rounded-xl flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(quickFilter === "trashed" ? null : "trashed")}
        >
          <span>Trashed</span>
          <span><Trash2 /></span>
        </button>
      </section>
      {quickFilter !== "trashed"
        && <TagsBar tags={tags} activeTags={activeTags} onTagSelect={toggleActiveTag} className={isInitialLoad ? "slide-in-left" : ""} />}
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
      </section>

      <div className="h-18"></div>

      <footer className="fixed bottom-0 left-0 right-0 pb-4 px-2 bg-transparent lg:ml-2 lg:w-1/4 lg:max-w-md lg:min-w-sm"> {/* ml-2 used as offset for main's mx-2 */}
        <BottomNavbar />
      </footer>
    </>
  );
}
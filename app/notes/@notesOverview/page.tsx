"use client"

import NoteItem from "@/app/components/NoteItem";
import QuickFilterButton from "@/app/components/QuickFilterButton";
import TagsBar from "@/app/components/TagsBar";
import { loadAllNotes, loadAllNotesTags, loadNoteCounts } from "@/lib/notes-client";
import { useNoteStore, useTagsStore } from "@/lib/stores";
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
    hasMore,
    quickFilter,
    tags,
    setQuickFilter,
  } = useNoteStore();

  const { activeTags, toggleActiveTag } = useTagsStore();

  useEffect(() => {
    loadNoteCounts();
  }, []);

  useEffect(() => {
    loadAllNotes(true); // Reset states/query params
    loadAllNotesTags();
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
              ? <button onClick={() => loadAllNotes(false)} className="w-fit mx-auto p-4 mb-30 lg:mb-3 text-center font-titles border-foreground hover:cursor-pointer hover:border-b-1 hover:border-accent">Load More</button>
              : <p className="p-4 mb-30 lg:mb-3 text-center font-titles">That's all!</p>
            }
          </div>
        )}
      </section>
    </div>
  );
}
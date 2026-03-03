"use client"

import { useEffect, useRef, useState } from "react";
import { Editor } from "@/app/components/DynamicEditor";
import type { localNote, Note } from "@/lib/types"
import { ArrowLeft, Trash2, RotateCcw, Pin, Save, CloudCheck } from "lucide-react";
import { toast } from "sonner";
import { useScrollVisibility, useDeleteRecord, useTagsUpdate, useDebouncedCallback } from "@/lib/hooks";
import ConfirmDeleteDialog from "@/app/components/ConfirmDeleteDialog";
import TagsInput from "@/app/components/TagsInput";
import { deleteNoteLocally, getNoteLocally, queueChanges, saveNoteLocally } from "@/lib/indexeddb";
import Link from "next/link";
import { offlineSaveAndSync, syncPendingChanges } from "@/lib/sync";
import { Block } from "@blocknote/core";


const extractPlaintextFromBlocks = (blocks: Block[]): string => {
  if (!blocks || blocks.length === 0) return "";

  const extractFromBlock = (block: Block): string => {
    let text = "";

    // Extract inline content
    if (Array.isArray(block.content)) {
      text += block.content
        .map((item: any) => item.text || "")
        .join("");
    }

    // Extract content from children recursively
    if (block.children.length > 0) {
      text += " " + block.children
        .map(child => extractFromBlock(child))
        .join(" ");
    }

    return text;
  }

  return blocks
    .map(block => extractFromBlock(block))
    .filter(text => text.trim().length > 0)
    .join(" ");
}

export default function Note(
  { params }: { params: Promise<{ id: string }> }
) {
  const [route, setRoute] = useState<string | null>(null);
  const [note, setNote] = useState<localNote | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"synced" | "saved" | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const pendingUpdatesRef = useRef<Partial<localNote>>({});

  const handleTagsUpdate = useTagsUpdate({ recordType: "notes", route, setTags, setSaveStatus });
  const isVisible = useScrollVisibility();
  const { handleTrash, handleDelete } = useDeleteRecord();

  useEffect(() => {
    const getParams = async (): Promise<void> => {
      const { id } = await params;
      setRoute(id);
    };

    getParams();
  }, [params]);

  useEffect(() => {
    if (!route) return;

    const loadNote = async (): Promise<void> => {
      try {
        const noteData = await getNoteLocally(route);

        if (noteData) {
          setNote(noteData);
          setTags((noteData.tags ?? []).map((tag: string) => "#" + tag));
          return;
        }

      } catch (error) {
        console.error("Local DB fail:", error);
      }

      try {
        const res = await fetch(`/api/notes/${route}`, { method: "GET" });

        const noteData = await res.json();
        noteData.note.content = noteData.note.content ? JSON.parse(noteData.note.content) : "";

        // Cache note to IndexedDB
        await saveNoteLocally({
          ...noteData.note,
          id: route,
          tags: noteData.tags ?? []
        });

        setNote(noteData.note);
        setTags((noteData.tags ?? []).map((tag: string) => "#" + tag));

      } catch (error) {
        console.error("Failed to fetch note:", error);
        throw error;
      }
    }

    loadNote();
  }, [route]);

  useEffect(() => {
    const handleSyncCompleted = () => {
      if (saveStatus === "saved") {
        setSaveStatus("synced");
      }
    };

    window.addEventListener('sync-completed', handleSyncCompleted);

    return () => window.removeEventListener('sync-completed', handleSyncCompleted);
  }, [saveStatus]);

  const pinNote = async (): Promise<void> => {
    if (!route) return;

    const currentPinStatus = note!.is_pinned;
    const newPinStatus = note!.is_pinned === 0 ? 1 : 0;

    // Optimistic update
    setNote(prev => prev ? { ...prev, is_pinned: newPinStatus } : prev);

    try {
      await offlineSaveAndSync(
        route,
        "notes",
        "update",
        { is_pinned: newPinStatus },
        setSaveStatus
      );
    } catch (error) {
      // Rollback on error
      setNote(prev => prev ? { ...prev, is_pinned: currentPinStatus } : prev);

      console.error("Failed to pin note:", error);
      toast.error("Failed to pin note");
    }
  }

  const debouncedSave = useDebouncedCallback<Partial<localNote>>(
    async (updates) => {
      if (!route) return;

      try {
        await offlineSaveAndSync(
          route,
          "notes",
          "update",
          updates,
          setSaveStatus
        );

        pendingUpdatesRef.current = {};
      } catch (error) {
        toast.error("Failed to save note", { id: "save-note-error" });
      }
    }, 500
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newTitle = e.target.value;

    setSaveStatus(null);
    setNote(prev => prev ? { ...prev, title: newTitle } : null);

    const updates = { ...pendingUpdatesRef.current, title: newTitle };
    pendingUpdatesRef.current = updates;
    debouncedSave(updates);
  }

  const handleContentChange = (newDocument: Block[]): void => {
    setSaveStatus(null);
    const plainText = extractPlaintextFromBlocks(newDocument);

    const updates = {
      ...pendingUpdatesRef.current,
      content: newDocument,
      content_plaintext: plainText
    };
    pendingUpdatesRef.current = updates;
    debouncedSave(updates);
  }

  const deleteEmptyNote = async (): Promise<void> => {
    if (!route) return;

    try {
      await deleteNoteLocally(route);

      await queueChanges({
        recordId: `notes-${route}`,
        recordType: "notes",
        operation: "delete",
        data: { id: route }
      });

      if (navigator.onLine) syncPendingChanges();

    } catch (error) {
      console.error("Failed to delete empty note:", error);
    }
  }

  if (!note) return null;
  if (!route) return null;

  return (
    <>
      <nav
        className={`mx-2 px-2 h-16 flex flex-col items-center border-b-1 border-foreground sticky top-0 z-50 bg-background transition-opacity duration-300
          ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}>
        <ul className="h-full flex justify-between items-center w-full">
          <li>
            <Link
              href={"/notes"}
              onClick={() => {
                if (!note.title?.trim() && !note.content_plaintext?.trim()) {
                  deleteEmptyNote();
                }
              }}
            >
              <ArrowLeft className="hover:cursor-pointer" />
            </Link>
          </li>
          <li>
            {note.is_trashed === 0 ? (
              <Pin
                onClick={() => pinNote()}
                fill={note.is_pinned === 1 ? "currentColor" : "none"}
                className="hover:cursor-pointer"
              />
            ) : (
              <RotateCcw
                onClick={() => handleTrash("notes", route, note.is_trashed!)}
                className="text-accent hover:cursor-pointer"
              />
            )}
          </li>
          <li>
            <Trash2
              onClick={() => note.is_trashed === 0
                ? handleTrash("notes", route, note.is_trashed)
                : setShowDeleteDialog(true)
              }
              className="text-destructive hover:cursor-pointer"
            />
          </li>
        </ul>
      </nav>

      <div className="h-6 my-1 py-1 flex items-center justify-center bg-background text-muted-foreground/50">
        {saveStatus === "synced" && <CloudCheck />}
        {saveStatus === "saved" && <Save />}
        {!saveStatus && <span>{'\u00A0'}</span>}
      </div>

      <article>
        <TagsInput tags={tags} onBlur={handleTagsUpdate} className="slide-in-right" />
        <h1 className="my-3 slide-in-left"><input
          type="text"
          value={note.title}
          onChange={handleTitleChange}
          placeholder="Enter a title"
          className="w-full text-center text-3xl font-bold focus-visible:outline-none"
        /></h1>
        <Editor initialContent={note.content as Block[]} onChange={handleContentChange} />
      </article >

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          handleDelete("notes", route!);
          setShowDeleteDialog(false)
        }}
        recordType="note"
      />
    </>
  )
}
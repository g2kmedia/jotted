"use client"

import { useCallback, useEffect, useState } from "react";
import debounce from "lodash.debounce";
import { Editor } from "@/app/components/DynamicEditor";
import type { Note } from "@/lib/types"
import type { Block } from "@blocknote/core";
import { ArrowLeft, Trash2, RotateCcw, Pin, Save, CloudCheck } from "lucide-react";
import { toast } from "sonner";
import { useScrollVisibility, useDeleteRecord, useTagsUpdate } from "@/lib/hooks";
import ConfirmDeleteDialog from "@/app/components/ConfirmDeleteDialog";
import TagsInput from "@/app/components/TagsInput";
import { queueChanges, saveNoteLocally } from "@/lib/indexeddb";
import Link from "next/link";
import { syncPendingChanges } from "@/lib/sync";

type EditorNote = Omit<Note, "content"> & {
  content: Block[]
}

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
  const [note, setNote] = useState<Partial<EditorNote> | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"synced" | "saved" | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleTagsUpdate = useTagsUpdate({ recordType: "notes", route, tags, setTags });
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
      const res = await fetch(`/api/notes/${route}?columns=title,content,is_pinned,is_trashed&tags=true`, { method: "GET" });

      if (!res.ok) {
        throw new Error(`Failed to fetch data: ${res.status}`);
      }

      const data = await res.json();
      data.note.content = data.note.content ? JSON.parse(data.note.content) : "";

      const addHashtagToTags = data.tags.map((tag: string) => "#" + tag);

      setNote(data.note);
      setTags(addHashtagToTags)
    };

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
    const currentPinStatus = note?.is_pinned;
    const newPinStatus = note?.is_pinned === 0 ? 1 : 0;

    // Optimistically update
    setNote(prev => prev ? { ...prev, is_pinned: newPinStatus } : prev);

    try {
      const res = await fetch(`/api/notes/${route}`, {
        method: "PATCH",
        body: JSON.stringify({ is_pinned: newPinStatus })
      });

      if (!res.ok) {
        // Rollback on error
        setNote(prev => prev ? { ...prev, is_pinned: currentPinStatus } : prev);
        toast.error("Failed to pin");
        return;
      }
    } catch (error) {
      // Rollback on error
      setNote(prev => prev ? { ...prev, is_pinned: currentPinStatus } : prev);
      toast.error("Failed to pin");
      return;
    }

    toast.success(newPinStatus === 1 ? "Note pinned" : "Note unpinned");
  }

  const debouncedSave = useCallback(
    debounce(async (updates: Partial<EditorNote>, currentRoute: string | null) => {
      if (!currentRoute) return;

      // Save locally
      await saveNoteLocally({
        id: currentRoute,
        ...note,
        ...updates,
        updated_at: new Date().toISOString()
      });

      await queueChanges({
        recordId: `note-${currentRoute}`,
        recordType: "notes",
        operation: "update",
        data: { id: currentRoute, ...updates }
      });

      setSaveStatus("saved");

      if (navigator.onLine) {
        syncPendingChanges()
          .then(success => {
            if (success) setSaveStatus("synced");
          });
      }

    }, 500), []
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newTitle = e.target.value;

    setSaveStatus(null);
    setNote(prev => prev ? { ...prev, title: newTitle } : undefined);
    debouncedSave({ title: newTitle }, route);
  }

  const handleContentChange = (newDocument: Block[]): void => {
    setSaveStatus(null);
    const plainText = extractPlaintextFromBlocks(newDocument);
    debouncedSave({ content: newDocument, content_plaintext: plainText }, route);
  }

  if (!note) return null;

  return (
    <>
      <nav
        className={`mx-2 px-2 h-16 flex flex-col items-center border-b-1 border-foreground sticky top-0 z-50 bg-background transition-opacity duration-300
          ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}>
        <ul className="h-full flex justify-between items-center w-full">
          <li>
            <Link href={"/notes"}>
              <ArrowLeft className="hover:cursor-pointer" />
            </Link>
          </li>
          <li>
            {note.is_trashed === 0 ? (
              <Pin
                onClick={() => pinNote()}
                fill={note.is_pinned === 1 ? "currentColor" : ""}
                className="hover:cursor-pointer"
              />
            ) : (
              <RotateCcw
                onClick={() => handleTrash("notes", route, note, setNote)}
                className="text-accent hover:cursor-pointer"
              />
            )}
          </li>
          <li>
            <Trash2
              onClick={() => note.is_trashed === 0
                ? handleTrash("notes", route, note, setNote)
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
        <TagsInput tags={tags} onSubmit={handleTagsUpdate} className="slide-in-right" />
        <h1 className="my-3 slide-in-left"><input
          type="text"
          value={note.title}
          onChange={handleTitleChange}
          className="w-full text-center text-3xl font-bold focus-visible:outline-none"
        /></h1>
        <Editor initialContent={note.content as Block[]} onChange={handleContentChange} />
      </article >

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          handleDelete("notes", route);
          setShowDeleteDialog(false)
        }}
        recordType="note"
      />
    </>
  )
}
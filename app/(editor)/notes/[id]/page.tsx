"use client"

import { useCallback, useEffect, useRef, useState } from "react";
import debounce from "lodash.debounce";
import { Editor } from "@/app/components/DynamicEditor";
import type { Note } from "@/lib/types"
import type { Block } from "@blocknote/core";
import { ArrowLeft, Check, Trash2, RotateCcw, Pin } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useScrollVisibility, useDeleteRecord } from "@/lib/hooks";
import ConfirmDeleteDialog from "@/app/components/ConfirmDeleteDialog";

type EditorNote = Omit<Note, "content"> & {
  content: Block[]
}

const extractPlaintextFromBlocks =(blocks: Block[]): string => {
  if (!blocks || blocks.length === 0) return "";

  const extractFromBlock =(block: Block): string => {
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
  const [saveStatus, setSaveStatus] = useState<"saved" | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const inputTagsRef = useRef<HTMLInputElement>(null);

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
    debounce(async (newDocument: Partial<EditorNote>, currentRoute: string | null) => {
      if (!currentRoute) return;

      try {
        const res = await fetch(`/api/notes/${currentRoute}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newDocument)
        });

        if (!res.ok) {
          toast.error("Failed to save note");
          return;
        }

        setSaveStatus("saved");

      } catch (error) {
        console.error("Failed to update note:", error);
        toast.error("Failed to save note");
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

  const handleTagsChange = async (): Promise<void> => {
    let inputArr;

    if (!inputTagsRef.current?.value) {
      inputArr = [""];
    } else {
      inputArr = inputTagsRef.current.value.trim().split(/\s+/);
    }

    const newTags: string[] = [];

    for (const input of inputArr) {
      if (
        (
          input.startsWith("#") &&
          input.length > 1 &&
          input.indexOf("#", 1) === -1 // Only a single "#" allowed
        ) ||
        input === ""
      ) {
        newTags.push(input);
      } else {
        toast.error("Invalid tags");
        return;
      }
    }

    try {
      const res = await fetch(`/api/notes/tags/${route}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: newTags,
          currentTags: tags
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to update tags: ${res.status}`)

      }

      setTags(newTags)
      toast.success("Tags updated");

    } catch (error) {
      console.error("Failed to update tags:", error);
      toast.error("Failed to update tags. Please try again.");
    }
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

      <div className="my-1 py-1 flex items-center justify-center bg-background">
        <span className="text-xs text-muted-foreground/70 italic">
          {saveStatus || '\u00A0'}
        </span>
      </div>

      <article>
        <div className="flex p-2">
          <input
            ref={inputTagsRef}
            type="text"
            defaultValue={tags?.join(" ")}
            placeholder="add tags..."
            className="w-full text-right font-light text-muted-foreground outline-hidden peer"
          />
          <button onMouseDown={handleTagsChange} className="w-0 peer-focus:w-auto peer-focus:px-2 opacity-0 peer-focus:opacity-100 overflow-hidden transition-opacity cursor-pointer hover:text-accent">
            <Check />
          </button>
        </div>
        <h1 className="my-3"><input
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

// Replace input tag for title with textarea ?
// Add a debounce cancel so that no changes are lost due to a quick exit
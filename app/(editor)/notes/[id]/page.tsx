"use client"

import { useCallback, useEffect, useRef, useState } from "react";
import debounce from "lodash.debounce";
import { type NoteUpdate, type EditorNote } from "@/lib/schemas";
import { Editor } from "@/app/components/DynamicEditor";
import type { Block } from "@blocknote/core";
import { Check } from "lucide-react";
import { toast } from "sonner";

export default function Note(
  { params }: { params: Promise<{ id: string }> }
) {
  const [route, setRoute] = useState<string | null>(null);
  const [note, setNote] = useState<EditorNote | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const inputTagsRef = useRef<HTMLInputElement>(null);

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
      const res = await fetch(`/api/notes/${route}?columns=title,content`, { method: "GET" });

      if (!res.ok) {
        throw new Error(`Failed to fetch data: ${res.status}`);
      }

      const data = await res.json();

      const addHashtagToTags = data.tags.map((tag: string) => "#" + tag);

      setNote(data.note);
      setTags(addHashtagToTags)
    };

    loadNote();
  }, [route]);

  const debouncedSave = useCallback(
    debounce(async (newDocument: NoteUpdate, currentRoute: string | null) => {
      if (!currentRoute) return;

      try {
        const res = await fetch(`/api/notes/${currentRoute}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newDocument)
        });

        if (!res.ok) {
          throw new Error(`Failed to update note: ${res.status}`)
        }


      } catch (error) {
        console.error("Failed to update note:", error);
        toast.error("Failed to save note. Please try again.");
      }
    }, 500), []
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newTitle = e.target.value;

    setNote(prev => prev ? { ...prev, title: newTitle } : undefined);
    debouncedSave({ title: newTitle }, route);
  }

  const handleContentChange = (newDocument: Block[]): void => {
    debouncedSave({ content: newDocument }, route)
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
    <article>
      <div className="flex p-2">
        <input
          ref={inputTagsRef}
          type="text"
          defaultValue={tags?.join(" ")}
          placeholder="add tags..."
          className="w-full text-right text-muted-foreground outline-hidden peer"
        />
        <button onMouseDown={handleTagsChange} className="w-0 peer-focus:w-auto peer-focus:px-2 opacity-0 peer-focus:opacity-100 overflow-hidden transition-opacity cursor-pointer hover:text-accent">
          <Check />
        </button>
      </div>
      <h1><input
        type="text"
        value={note.title}
        onChange={handleTitleChange}
        className="w-full text-center text-3xl focus-visible:outline-none"
      /></h1>
      <Editor initialContent={note.content as Block[]} onChange={handleContentChange} />
    </article >
  )
}

// Replace input tag for title with textarea ?
// Add a debounce cancel so that no changes are lost due to a quick exit
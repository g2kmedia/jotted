"use client"

import { Block } from "@blocknote/core";
import type { localNote } from "@/lib/types"
import { useNoteStore } from "@/lib/stores";
import { useEffect, useRef, useState } from "react";
import { useDeleteRecord, useTagsUpdate, useDebouncedCallback } from "@/lib/hooks";
import { deleteNoteLocally, getNoteLocally, queueChanges, saveNoteLocally } from "@/lib/indexeddb";
import { offlineSaveAndSync, syncPendingChanges } from "@/lib/sync";
import { toast } from "sonner";
import Link from "next/link";
import { Editor } from "@/app/components/DynamicEditor";
import { ArrowLeft, Trash2, RotateCcw, Pin, Save, CloudCheck } from "lucide-react";
import ConfirmDeleteDialog from "@/app/components/ConfirmDeleteDialog";
import TagsInput from "@/app/components/TagsInput";

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

export default function NoteEditorPage(
    { noteId }: { noteId: string }
) {
    const {
        notes,
        appendNewNotes,
        updateNote
    } = useNoteStore();

    const [tags, setTags] = useState<string[]>([]);
    const [saveStatus, setSaveStatus] = useState<"synced" | "saved" | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const titleRef = useRef<HTMLTextAreaElement>(null);
    const pendingUpdatesRef = useRef<Partial<localNote>>({});

    const handleTagsUpdate = useTagsUpdate({ recordType: "notes", recordId: noteId, setTags, setSaveStatus });
    const { handleTrash, handleDelete } = useDeleteRecord();

    const note = notes?.find((n) => n.id === noteId) ?? null;
    const noteRef = useRef(note);
    noteRef.current = note;

    useEffect(() => {
        titleRef.current?.focus();
    }, [noteId]);

    useEffect(() => {
        return () => {
            const n = noteRef.current;
            if (n && !n.title?.trim() && !n.content_plaintext?.trim()) {
                deleteEmptyNote();
            }
        }
    }, []);

    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = "auto";
            titleRef.current.style.height = titleRef.current.scrollHeight + "px";
        }
    }, [note?.title]);

    useEffect(() => {
        const loadNote = async (): Promise<void> => {
            if (navigator.onLine) {
                try {
                    const res = await fetch(`/api/notes/${noteId}`, { method: "GET" });

                    const noteData = await res.json();
                    const parsedContent = noteData.note.content = noteData.note.content ? JSON.parse(noteData.note.content) : "";

                    // Cache note to IndexedDB
                    await saveNoteLocally({
                        ...noteData.note,
                        id: noteId,
                        content: parsedContent,
                        tags: noteData.tags ?? []
                    });

                    appendNewNotes([{ ...noteData.note, content: parsedContent }]);
                    setTags(noteData.tags ?? []);

                } catch (error) {
                    console.error("Failed to fetch note:", error);
                    throw error;
                }
            } else {
                try {
                    const noteData = await getNoteLocally(noteId);

                    if (noteData) {
                        appendNewNotes([noteData]);
                        setTags(noteData.tags ?? []);
                        return;
                    }

                } catch (error) {
                    console.error("Local DB fail:", error);
                }
            }
        }

        loadNote();
    }, [noteId]);

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
        const currentPinStatus = note!.is_pinned;
        const newPinStatus = note!.is_pinned === 0 ? 1 : 0;

        // Optimistic update
        updateNote(noteId, { is_pinned: newPinStatus });

        try {
            await offlineSaveAndSync(
                noteId,
                "notes",
                "update",
                {
                    is_pinned: newPinStatus,
                    tags: note?.tags // always sending the current tags because API would otherwise delete them
                },
                setSaveStatus
            );
        } catch (error) {
            // Rollback on error
            updateNote(noteId, { is_pinned: currentPinStatus });

            console.error("Failed to pin note:", error);
            toast.error("Failed to pin note");
        }
    }

    const debouncedSave = useDebouncedCallback<Partial<localNote>>(
        async (updates) => {
            try {
                await offlineSaveAndSync(
                    noteId,
                    "notes",
                    "update",
                    {
                        ...updates,
                        tags: note?.tags // always sending the current tags because API would otherwise delete them
                    },
                    setSaveStatus
                );

                pendingUpdatesRef.current = {};
            } catch (error) {
                toast.error("Failed to save note", { id: "save-note-error" });
            }
        }, 500
    );

    const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
        const newTitle = e.target.value;

        setSaveStatus(null);
        updateNote(noteId, { title: newTitle })

        const updates = {
            ...pendingUpdatesRef.current,
            title: newTitle
        };
        pendingUpdatesRef.current = updates;
        debouncedSave(updates);
    }

    const handleContentChange = (newDocument: Block[]): void => {
        setSaveStatus(null);
        updateNote(noteId, { content: newDocument });
        const plainText = extractPlaintextFromBlocks(newDocument);

        const updates = {
            ...pendingUpdatesRef.current,
            content: newDocument,
            content_plaintext: plainText,
        };
        pendingUpdatesRef.current = updates;
        debouncedSave(updates);
    }

    const deleteEmptyNote = async (): Promise<void> => {
        try {
            await deleteNoteLocally(noteId);

            await queueChanges({
                recordId: `notes-${noteId}`,
                recordType: "notes",
                operation: "delete",
                data: { id: noteId }
            });

            if (navigator.onLine) syncPendingChanges();

        } catch (error) {
            console.error("Failed to delete empty note:", error);
        }
    }

    if (!note) return null;

    return (
        <div className="h-full w-full flex flex-col">
            <nav
                className="mx-2 px-2 h-16 shrink-0 flex flex-col items-center border-b-1 bg-background">
                <ul className="h-full w-full flex justify-between items-center">
                    <li>
                        <Link href={"/notes"}>
                            <ArrowLeft className="hover:cursor-pointer lg:hidden" />
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
                                onClick={() => handleTrash("notes", noteId, tags, note.is_trashed!)}
                                className="text-accent hover:cursor-pointer"
                            />
                        )}
                    </li>
                    <li>
                        <Trash2
                            onClick={() => note.is_trashed === 0
                                ? handleTrash("notes", noteId, tags, note.is_trashed)
                                : setShowDeleteDialog(true)
                            }
                            className="text-destructive hover:cursor-pointer"
                        />
                    </li>
                </ul>
            </nav>

            <div className="h-6 my-1 py-1 lg:pr-5 flex items-center justify-center bg-background text-muted-foreground/50">
                {saveStatus === "synced" && <CloudCheck />}
                {saveStatus === "saved" && <Save />}
                {!saveStatus && <span>{'\u00A0'}</span>}
            </div>

            <article className="overflow-y-auto">
                <TagsInput tags={tags} onBlur={handleTagsUpdate} />
                <textarea
                    ref={titleRef}
                    value={note.title}
                    onChange={handleTitleChange}
                    placeholder="Enter a title"
                    rows={1}
                    className="w-full my-3 pl-13 text-3xl font-titles font-bold resize-none focus-visible:outline-none"
                />
                <Editor initialContent={note.content as Block[]} onChange={handleContentChange} />
            </article>

            <ConfirmDeleteDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                onConfirm={() => {
                    handleDelete("notes", noteId);
                    setShowDeleteDialog(false)
                }}
                recordType="note"
            />
        </div>
    )
}
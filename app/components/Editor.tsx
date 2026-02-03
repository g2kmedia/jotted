"use client";

import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import type { Block, BlockNoteEditor } from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import { customTheme, deleteUploadedFile, uploadFile } from "@/lib/editor";

export default function Editor({
    initialContent,
    onChange
}: {
    initialContent: Block[]
    onChange: (updates: Block[]) => void
}) {
    const locale = en;

    const editor = useCreateBlockNote({
        initialContent,
        uploadFile,
        dictionary: {
            ...locale,
            placeholders: {
                ...locale.placeholders,
                emptyDocument: "What's on your mind? Start writing...",
                default: ""
            }
        }
    }) as BlockNoteEditor;

    editor.onChange((editor, { getChanges }) => {
        // Detect & handle file (image, video, audio, file) deletion
        const changes = getChanges();

        const deletedFileBlocks = changes.filter(change => {
            if (change.type !== "delete") {
                return;
            }

            const targetTypes = ["image", "video", "audio", "file"];

            return targetTypes.includes(change.block.type)
        });

        const deletedFileUrls = deletedFileBlocks.map(change => {
            const fileBlock = change.block as { props: { url: string } };
            return fileBlock.props.url;
        }).filter(url => url !== undefined);;

        deleteUploadedFile(deletedFileUrls);

        // Handle content change
        const newDocument = editor.document as Block[];
        onChange(newDocument);
    });

    return (
        <BlockNoteView
            editor={editor}
            theme={customTheme}
            className="slide-in-bottom"
        />
    );
}
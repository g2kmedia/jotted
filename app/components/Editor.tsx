"use client";

import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote, useEditorChange } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import type { Block, BlockNoteEditor } from "@blocknote/core";
import { en } from "@blocknote/core/locales";

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
        dictionary: {
            ...locale,
            placeholders: {
                ...locale.placeholders,
                emptyDocument: "What's on your mind? Start writing...",
                default: ""
            }
        }
    }) as BlockNoteEditor;

    useEditorChange((editor) => {
        const updates = editor.document as Block[];

        onChange(updates);
    }, editor);

    return <BlockNoteView editor={editor} />;
}
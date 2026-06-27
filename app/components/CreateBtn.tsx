"use client"

import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { localNote, localTask } from "@/lib/types";
import { queueChanges, saveNoteLocally, saveTaskLocally } from "@/lib/indexeddb";
import { syncPendingChanges } from "@/lib/sync";

export default function CreateBtn({ className }: { className?: string }) {
    const router = useRouter();

    const handleCreateNote = async (): Promise<void> => {
        try {
            const noteId = nanoid();

            const newNote: localNote = {
                id: noteId,
                title: "",
                content: "",
                content_plaintext: "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_pinned: 0,
                is_trashed: 0,
                tags: []
            };

            await saveNoteLocally(newNote);

            await queueChanges({
                recordId: `note-${noteId}`,
                recordType: "notes",
                operation: "create",
                data: newNote
            });

            router.push(`/notes/${noteId}`);

            if (navigator.onLine) syncPendingChanges();

        } catch (error) {
            console.error("Failed to create note:", error);
            toast.error("Failed to create note");
        }
    }

    const handleCreateTask = async () => {
        try {
            const taskId = nanoid();

            const newTask: localTask = {
                id: taskId,
                title: "",
                content: "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                due_date: null,
                priority: null,
                is_completed: 0,
                is_trashed: 0,
                tags: []
            };

            await saveTaskLocally(newTask);

            await queueChanges({
                recordId: `task-${taskId}`,
                recordType: "tasks",
                operation: "create",
                data: newTask
            });

            router.push(`/tasks/${taskId}`);

            if (navigator.onLine) syncPendingChanges();
            
        } catch (error) {
            console.error("Failed to create task:", error);
            toast.error("Failed to create task");
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={className}>
                    <Plus className="scale-125" /> {/* scale to compensate empty space around & match other icons on navbar */}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="bg-card">
                <DropdownMenuItem onSelect={handleCreateNote} className="p-3 justify-center hover:cursor-pointer focus:bg-transparent focus:text-accent">Create Note</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleCreateTask} className="p-3 justify-center hover:cursor-pointer focus:bg-transparent focus:text-accent">Create Task</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
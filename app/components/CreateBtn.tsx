"use client"

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

export default function CreateBtn({ className }: { className?: string }) {
    const router = useRouter();

    const handleCreateNote = async (): Promise<void> => {
        try {
            const res = await fetch("/api/notes", { method: "POST" });

            if (!res.ok) {
                throw new Error(`Failed to create note: ${res.status}`);
            }

            const { noteId } = await res.json();

            router.push(`/notes/${noteId}`);
        } catch (error) {
            console.error("Failed to create note:", error);
            toast.error("Failed to create note");
        }
    }

    const handleCreateTask = async (): Promise<void> => {
        try {
            const res = await fetch("/api/tasks", { method: "POST" });

            if (!res.ok) {
                throw new Error(`Failed to create task: ${res.status}`);
            }

            const { taskId } = await res.json();

            router.push(`/tasks/${taskId}`);
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
            <DropdownMenuContent align="center" className="rounded-2xl">
                <DropdownMenuItem onSelect={handleCreateNote} className="justify-center rounded-2xl">Create Note</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleCreateTask} className="justify-center rounded-2xl">Create Task</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
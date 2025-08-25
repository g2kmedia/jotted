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

export default function CreateBtn() {
    const router = useRouter();

    const handleCreateNote = async ():Promise<void> => {
        try {
            const res = await fetch("/api/notes", { method: "POST" });

            if (!res.ok) {
                throw new Error(`Failed to create note: ${res.status}`)
            }

            const { noteId } = await res.json();

            router.push(`/notes/${noteId}`);
        } catch (error) {
            // Show toast aka alert message
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="text-muted-foreground hover:text-accent hover:cursor-pointer outline-hidden">
                    <Plus size={36} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
                <DropdownMenuItem onSelect={handleCreateNote} className="justify-center">Create Note</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center">Create Task</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
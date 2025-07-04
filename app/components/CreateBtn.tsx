import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SquarePlus } from "lucide-react";

export default function CreateBtn() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex justify-center items-center h-full w-1/4 border-t-3 border-t-transparent hover:border-t-[var(--theme-highlight)] hover:cursor-pointer outline-hidden">
                    <SquarePlus size={32} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
                <DropdownMenuItem className="justify-center">Create Note</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center">Create Task</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
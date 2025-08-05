"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import CreateBtn from "./CreateBtn";

export default function Navbar() {
    const pathname = usePathname();

    const highlightNavbarItem = (path: string):string => {
        return path === pathname
        ? "border-t-[var(--accent)]"
        : "border-t-transparent"
    }

    const unmuteNavbarItemText = (path: string):string => {
        return path === pathname
        ? "text-foreground"
        : "text-muted-foreground"
    }

    return (
        <div className="flex flex-row justify-center items-center px-3 bottom-0 h-14 border-t-1">
            <div className="flex flex-row justify-center items-center h-full w-full space-x-16 text-2xl">
                <Link href={`/notes`} className="h-full w-1/4">
                    <button className={`flex justify-center items-center h-full w-full border-t-3 ${highlightNavbarItem("/notes")} hover:border-t-[var(--accent)] ${unmuteNavbarItemText("/notes")} rounded-t-xs hover:cursor-pointers`}>NOTES</button>
                </Link>
                <CreateBtn />
                <Link href={`/tasks`} className="h-full w-1/4">
                    <button className={`flex justify-center items-center h-full w-full border-t-3 ${highlightNavbarItem("/tasks")} hover:border-t-[var(--accent)] ${unmuteNavbarItemText("/tasks")} rounded-t-xs hover:cursor-pointer`}>TASKS</button>
                </Link>
            </div>
        </div>
    );
}
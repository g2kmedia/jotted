"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import CreateBtn from "./CreateBtn";
import { House } from "lucide-react";
import { File } from 'lucide-react';
import { Check } from 'lucide-react';
import { Settings } from 'lucide-react';

export default function BottomNavbar() {
    const pathname = usePathname();

    // const highlightNavbarItem = (path: string): string => {
    //     return path === pathname
    //         ? "border-t-[var(--accent)]"
    //         : "border-t-transparent"
    // }

    const highlightNavbarItem = (path: string): string => {
        return path === pathname
            ? "text-foreground hover:text-foreground"
            : "text-muted-foreground hover:text-accent"
    }

    const unmuteNavbarItemText = (path: string): string => {
        return path === pathname
            ? "text-foreground"
            : "text-muted-foreground"
    }

    return (
        <nav className="flex justify-between px-6 bottom-0 h-14 border-1 rounded-4xl backdrop-blur-md" aria-label="Bottom navigation">
                <Link href={"/"}>
                    <button className={`${highlightNavbarItem("/")} h-full hover:cursor-pointers`}>
                        <House />
                    </button>
                </Link>
                <Link href={"/notes"}>
                    <button className={`${highlightNavbarItem("/notes")} h-full hover:cursor-pointer`}>
                        <File />
                    </button>
                </Link>
                <CreateBtn />
                <Link href={"/tasks"}>
                    <button className={`${highlightNavbarItem("/tasks")} h-full hover:cursor-pointer`}>
                        <Check />
                    </button>
                </Link>
                <Link href={"/"}>
                    <button className={`${highlightNavbarItem("/")} h-full hover:cursor-pointer`}>
                        <Settings />
                    </button>
                </Link>
        </nav>
    );
}
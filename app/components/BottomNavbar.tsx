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

    const highlightNavbarItem = (path: string): string => {
        return path === pathname
            ? "text-foreground bg-accent rounded-2xl"
            : "text-muted-foreground hover:bg-accent hover:text-foreground hover:rounded-2xl"
    }

    return (
        <nav className="flex justify-center items-center h-14 border-1 rounded-2xl backdrop-blur-lg slide-in-bottom" aria-label="Bottom navigation">
                <Link href={"/"}>
                    <button className={`${highlightNavbarItem("/")} p-3 mx-2.5 hover:cursor-pointers`}>
                        <House />
                    </button>
                </Link>
                <Link href={"/notes"}>
                    <button className={`${highlightNavbarItem("/notes")} p-3 mx-2.5 hover:cursor-pointer`}>
                        <File />
                    </button>
                </Link>
                <CreateBtn className="text-muted-foreground p-3 mx-2.5 outline-hidden hover:bg-accent hover:text-foreground hover:rounded-2xl"/>
                <Link href={"/tasks"}>
                    <button className={`${highlightNavbarItem("/tasks")} p-3 mx-2.5 hover:cursor-pointer`}>
                        <Check />
                    </button>
                </Link>
                <Link href={"/"}>
                    <button className={`${highlightNavbarItem("/")} p-3 mx-2.5 hover:cursor-pointer`}>
                        <Settings />
                    </button>
                </Link>
        </nav>
    );
}
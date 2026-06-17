"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import CreateBtn from "./CreateBtn";
import { House } from "lucide-react";
import { File } from 'lucide-react';
import { Check } from 'lucide-react';

export default function BottomNavbar() {
    const pathname = usePathname();

    const highlightNavbarItem = (path: string): string => {
        return path === pathname
            ? "text-foreground border-b-5 border-accent"
            : "text-muted-foreground border-b-5 border-transparent hover:border-accent"
    }

    return (
        <nav className="flex justify-between items-center h-16 w-full p-2 border-1 rounded-2xl backdrop-blur-lg lg:border-0 lg:border-t-1 lg:border-foreground lg:rounded-none lg:mt-2" aria-label="Bottom navigation">
            <Link href={"/"}>
                <button className={`${highlightNavbarItem("/")} p-3 hover:cursor-pointers`}>
                    <House className="m-1" />
                </button>
            </Link>
            <Link href={"/tasks"}>
                <button className={`${highlightNavbarItem("/tasks")} p-3 hover:cursor-pointer`}>
                    <Check className="m-1" />
                </button>
            </Link>
            <Link href={"/notes"}>
                <button className={`${highlightNavbarItem("/notes")} p-3 hover:cursor-pointer`}>
                    <File className="m-1" />
                </button>
            </Link>
            <CreateBtn className="p-4 text-muted-foreground border-b-5 border-transparent outline-hidden hover:border-accent" />
        </nav>
    );
}
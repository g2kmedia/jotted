"use client"

import Link from "next/link";
import { Search } from 'lucide-react';
import Logo from "./Logo";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function TopNavbar() {
    const pathname = usePathname();

    const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>("");

    const handleSearch = async (searchTerm: string) => {
        try {
            const url = new URL("/api/search", window.location.origin);

            url.searchParams.set("term", searchTerm);

            if (pathname.includes("/notes")) {
                url.searchParams.set("type", "notes");
            }

            if (pathname.includes("/tasks")) {
                url.searchParams.set("type", "tasks");
            }

            const res = await fetch(url, { method: "GET" });

            if (!res.ok) {
                throw new Error(`Search failed: ${res.status}`);
            }

            const searchResults = await res.json();
            console.log(searchResults);

        } catch (error) {
            console.error("Search failed:", error);
        }
    }

    return (
        <nav className="h-16 px-2 flex justify-between items-center text-foreground border-b-1 border-foreground">
            <Link href={"/"} className="hover:cursor-pointer">
                <Logo />
            </Link>
            <Search className="hover:cursor-pointer" />
        </nav>
    );
}
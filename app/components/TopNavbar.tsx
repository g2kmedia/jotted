"use client"

import Link from "next/link";
import { Search, X } from 'lucide-react';
import Logo from "./Logo";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function TopNavbar() {
    const router = useRouter();

    const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [isOnline, setIsOnline] = useState<boolean>(true);

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        }
    }, []);

    const handleSearch = async (searchTerm: string) => {
        if (searchTerm === "") {
            toast.error("Please enter a search term");
            return;
        }

        const url = new URL("/search", window.location.origin);

        url.searchParams.set("term", searchTerm);

        router.push(url.pathname + url.search);
    }

    return (
        <nav className="h-16 px-2 flex justify-between items-center text-foreground border-b-1 border-foreground">
            {!isSearchOpen &&
                <Link href={"/"} className="hover:cursor-pointer">
                    <Logo />
                </Link>
            }
            {isSearchOpen ? (
                <>
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearch(searchTerm);
                            }
                        }}
                        placeholder="Search..."
                        className="w-[70%] px-1 border-b-1 border-foreground outline-hidden slide-in-left"
                    />
                    <Search
                        className="hover:cursor-pointer"
                        onClick={() => handleSearch(searchTerm)}
                    />
                    <X
                        className="hover:cursor-pointer"
                        onClick={() => {
                            setIsSearchOpen(false);
                            setSearchTerm("");
                        }}
                    />
                </>
            ) : (isOnline ? (
                <Search
                    className="hover:cursor-pointer"
                    onClick={() => setIsSearchOpen(true)}
                />
            ) : (
                <span className="text-muted-foreground">Offline</span>
            )
            )}
        </nav>
    );
}
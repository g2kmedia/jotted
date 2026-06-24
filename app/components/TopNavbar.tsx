"use client"

import Link from "next/link";
import { Search, X } from 'lucide-react';
import Logo from "./Logo";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function TopNavbar() {
    const router = useRouter();

    const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
    const searchTermRef = useRef<HTMLInputElement>(null);
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

    useEffect(() => {
        if (isSearchOpen) searchTermRef.current?.focus();
    }, [isSearchOpen]);

    const handleSearch = async (searchTerm: string | undefined) => {
        if (!searchTerm || searchTerm === "") {
            toast.error("Please enter a search term");
            return;
        }

        const url = new URL("/search", window.location.origin);

        url.searchParams.set("term", searchTerm);

        router.push(url.pathname + url.search);
    }

    return (
        <nav className="h-16 px-2 flex justify-between items-center text-foreground">
            {!isSearchOpen &&
                <Link href={"/"} className="hover:cursor-pointer">
                    <Logo />
                </Link>
            }
            {isSearchOpen ? (
                <>
                    <input
                        ref={searchTermRef}
                        type="search"
                        defaultValue=""
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearch(searchTermRef.current?.value);
                            }
                        }}
                        placeholder="Search..."
                        className="w-[70%] px-1 outline-hidden"
                    />
                    <Search
                        className="hover:cursor-pointer"
                        onClick={() => handleSearch(searchTermRef.current?.value)}
                    />
                    <X
                        onClick={() => {
                            setIsSearchOpen(false);
                            if (searchTermRef.current) searchTermRef.current.value = "";
                        }}
                        className="hover:cursor-pointer"
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
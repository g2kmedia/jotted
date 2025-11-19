"use client"

import Link from "next/link";
import MeatballMenu from "./MeatballMenu";
import { ArrowLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function EditorPageNavbar() {
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY < lastScrollY.current) {
                setIsVisible(true);
            } else if (currentScrollY > lastScrollY.current && currentScrollY > 10) {
                setIsVisible(false);
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const pathname = usePathname();

    const getParentPath = (path: string): string => {
        const segments = path.split("/");

        if (segments.length <= 2) return "/";

        segments.pop();
        return segments.join("/") || "/";
    }

    const parentPath = getParentPath(pathname);

    return (
        <nav
            className={`m-2 p-2 h-14 flex justify-between items-center border-b-1 border-foreground sticky top-0 z-50 bg-background transition-opacity duration-300
                ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}>
            <Link href={parentPath} className="flex">
                <button className="flex hover:cursor-pointer items-center">
                    <ArrowLeft />
                </button>
            </Link>
            <MeatballMenu />
        </nav>
    );
}
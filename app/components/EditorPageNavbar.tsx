"use client"

import Link from "next/link";
import MeatballMenu from "./MeatballMenu";
import { ArrowLeft } from "lucide-react";
import { usePathname } from "next/navigation";

export default function EditorPageNavbar() {
    const pathname = usePathname();

    const getParentPath = (path: string): string => {
        const segments = pathname.split("/");
        
        if (segments.length <= 2) return "/";

        segments.pop();
        return segments.join("/") || "/";
    }

    const parentPath = getParentPath(pathname);

    return (
        <nav className="m-2 p-2 h-14 flex justify-between items-center border-b-1 border-foreground">
            <Link href={parentPath} className="flex">
                <button className="flex hover:cursor-pointer items-center">
                    <ArrowLeft />
                </button>
            </Link>
            <MeatballMenu />
        </nav>
    );
}
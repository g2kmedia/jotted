import Link from "next/link";
import MeatballMenu from "./MeatballMenu";
import { ChevronLeft } from "lucide-react";

export default function TopNavbar() {
    return (
        <nav className="p-2 flex justify-between items-center h-14 text-accent">
            <Link href={"/notes"} className="flex">
                <button className="flex hover:cursor-pointer items-center">
                    <ChevronLeft size={32} /> Notes
                </button>
            </Link>
            <MeatballMenu />
        </nav>
    );
}
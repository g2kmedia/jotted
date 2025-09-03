import Link from "next/link";
import MeatballMenu from "./MeatballMenu";
import { ArrowLeft } from 'lucide-react';

export default function EditorPageNavbar() {
    return (
        <nav className="m-2 p-2 h-14 flex justify-between items-center border-b-1 border-foreground">
            <Link href={"/notes"} className="flex">
                <button className="flex hover:cursor-pointer items-center">
                    <ArrowLeft />
                </button>
            </Link>
            <MeatballMenu />
        </nav>
    );
}
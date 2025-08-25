import Link from "next/link";
import MeatballMenu from "./MeatballMenu";
import { ArrowLeft } from 'lucide-react';

export default function EditorPageNavbar() {
    return (
        <nav className="m-2 p-2 flex justify-between items-center h-14">
            <Link href={"/notes"} className="flex">
                <button className="flex hover:cursor-pointer items-center">
                    <ArrowLeft />
                </button>
            </Link>
            <MeatballMenu />
        </nav>
    );
}
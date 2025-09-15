import Link from "next/link";
import { Search } from 'lucide-react';
import Logo from "./Logo";

export default function TopNavbar() {
    return (
        <nav className="h-14 flex justify-between items-center text-foreground border-b-1 border-foreground">
            <Link href={"/"}>
                <Logo />
            </Link>
            <Search />
        </nav>
    );
}
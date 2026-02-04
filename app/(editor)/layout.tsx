import { initializeCleanup } from "@/lib/database";
import SyncHandler from "../components/SyncHandler";

if (typeof window === "undefined") {
    initializeCleanup();
}

export default function EditorLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <main>
            <SyncHandler />
            {children}
        </main>
    );
}
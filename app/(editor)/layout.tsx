import { initializeCleanup } from "@/lib/database";

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
            {children}
        </main>
    );
}
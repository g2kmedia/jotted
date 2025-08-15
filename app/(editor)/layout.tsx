import TopNavbar from "../components/TopNavbar";

export default function EditorLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <main className="grid grid-rows-[auto_1fr] h-full">
            <TopNavbar />
            {children}
        </main>
    );
}
import EditorPageNavbar from "../components/EditorPageNavbar";

export default function EditorLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <main className="grid grid-rows-[auto_1fr]">
            <EditorPageNavbar />
            {children}
        </main>
    );
}
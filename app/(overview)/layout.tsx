import Navbar from "../components/Navbar";

export default function OverviewLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <main className="flex flex-col h-[100dvh] "> {/* 100dvh to fix mobile rendering */}
            {children}
            <nav>
                <Navbar />
            </nav>
        </main>
    );
}
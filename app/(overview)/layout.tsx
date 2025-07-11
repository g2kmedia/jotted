import Navbar from "../components/Navbar";

export default function OverviewLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <main className="flex flex-col h-screen ">
            {children}
            <nav>
                <Navbar />
            </nav>
        </main>
    );
}
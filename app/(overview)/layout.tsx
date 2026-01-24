import TopNavbar from "../components/TopNavbar";
import BottomNavbar from "../components/BottomNavbar";

export default function OverviewLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <header className="mx-2 mb-2">
                <TopNavbar />
            </header>
            <main id="main-scrollable-target" className="flex-1 overflow-y-auto mx-2">
                {children}
            </main>
            <footer className="fixed bottom-0 left-0 right-0 m-2 mb-4 bg-transparent">
                <BottomNavbar />
            </footer>
        </>
    );
}
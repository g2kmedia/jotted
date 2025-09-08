import TopNavbar from "../components/TopNavbar";
import BottomNavbar from "../components/BottomNavbar";

export default function OverviewLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <header className="m-2">
                <TopNavbar />
            </header>
            <main id="main-scrollable-target" className="flex-1 overflow-y-auto m-2">
                {children}
            </main>
            <footer className="fixed bottom-0 left-0 right-0 m-2 mb-4 bg-transparent">
                <BottomNavbar />
            </footer>
        </>
    );
}
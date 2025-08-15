import BottomNavbar from "../components/BottomNavbar";

export default function OverviewLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <main className="grid grid-rows-[1fr_auto] h-full"> {/* add back, if needed the 100dvh to fix mobile rendering. Currently in the globals.css */}
            {children}
            <nav>
                <BottomNavbar />
            </nav>
        </main>
    );
}

// TODO: Make the Navbar component use the nav tag in the component and just import component directly here
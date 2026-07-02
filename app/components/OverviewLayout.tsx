import BottomNavbar from "./BottomNavbar";
import TopNavbar from "./TopNavbar";

export default function OverviewLayout(
    {page} : { page: React.ReactNode }
) {
    return (
        <div className="flex flex-col h-full">
            <header className="shrink-0 mb-2">
                <TopNavbar />
            </header>

            <div className="h-full min-h-0">{page}</div>

            <footer className="fixed bottom-1 left-0 right-0 mb-4 px-2 bg-transparent lg:shrink-0 lg:static lg:bottom-auto lg:left-auto lg:right-auto lg:w-full">
                <BottomNavbar />
            </footer>
        </div>
    );
}
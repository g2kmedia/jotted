import BottomNavbar from "./BottomNavbar";
import TopNavbar from "./TopNavbar";

export default function OverviewLayout(
    {page} : { page: React.ReactNode }
) {
    return (
        <>
            <header className="mx-2 mb-2">
                <TopNavbar />
            </header>

            {page}

            <footer className="fixed bottom-1 left-0 right-0 pb-4 px-2 bg-transparent lg:ml-2 lg:w-1/4 lg:max-w-md lg:min-w-sm"> {/* ml-2 used as offset for main's mx-2 */}
                <BottomNavbar />
            </footer>
        </>
    );
}
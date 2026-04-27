"use client"

import { usePathname } from "next/navigation";
import DefaultPage from "./DefaultPage";
import OverviewLayout from "./OverviewLayout";

export default function SplitLayout({
    overview,
    editor
}: Readonly<{
    overview: React.ReactNode;
    editor: React.ReactNode;
}>) {
    const pathname = usePathname();
    const isIdPath = /^\/(notes|tasks)\/.+/.test(pathname);

    return (
        <main className="h-full flex mx-2 md:flex-row">
            <section
                className={`${isIdPath ? "hidden lg:block" : "block"} w-full lg:w-1/3 lg:max-w-md lg:min-w-sm`}
            >
                <OverviewLayout page={overview} />
            </section>

            <div className="lg:w-0.5 lg:border-r-1 lg:border-foreground lg:m-2"></div>

            <section className={`${isIdPath ? "block" : "hidden lg:block"} w-full lg:w-2lg lg:min-w-sm`}>
                {editor ? editor : <DefaultPage />}
            </section>
        </main>
    );
}
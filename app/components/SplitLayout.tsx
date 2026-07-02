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
        <main className="h-full flex flex-col mx-6 lg:flex-row" suppressHydrationWarning>
            <section
                className={`${isIdPath ? "hidden lg:block" : "block"} w-full flex flex-col lg:w-1/4`}
            >
                <OverviewLayout page={overview} />
            </section>

            <div className="lg:w-0.5 lg:border-r-1 lg:m-2"></div>

            <section className={`${isIdPath ? "block" : "hidden lg:block"} h-full lg:w-3/4 flex flex-col`}>
                {editor ? editor : <DefaultPage />}
            </section>
        </main>
    );
}
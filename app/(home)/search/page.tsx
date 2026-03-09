"use client"

import BottomNavbar from "@/app/components/BottomNavbar";
import TopNavbar from "@/app/components/TopNavbar";
import { Note, Task } from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react";
import { toast } from "sonner";

type SearchResult = (Partial<Note> | Partial<Task>) & { type: 'notes' | 'tasks' };

export default function SearchResults() {
    const searchParams = useSearchParams();
    const term = searchParams.get("term");
    const type = searchParams.get("type");

    const [quickFilter, setQuickFilter] = useState<string | null>(null);
    const [resultsCount, setResultsCount] = useState({ notes: 0, tasks: 0 });
    const [results, setResults] = useState<SearchResult[] | null>(null);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const url = new URL("/api/search", window.location.origin);
                url.searchParams.set("term", term!);
                if (type) url.searchParams.set("type", type);

                const res = await fetch(url, { method: "GET" });

                if (!res.ok) {
                    throw new Error(`Failed to fetch results: ${res.status}`);
                }

                const results = await res.json();

                setResults(results);
                setResultsCount({
                    notes: results.filter((r: SearchResult) => r.type === "notes").length,
                    tasks: results.filter((r: SearchResult) => r.type === "tasks").length
                });

            } catch (error) {
                console.error("Failed to fetch results:", error);
                toast.error("Failed to load search results");

                setResults([]);
            }
        }

        if (term) {
            setResults(null);
            setResultsCount({ notes: 0, tasks: 0 });
            fetchResults();
        }
    }, [term, type]);

    const displayResults = results?.filter(item => {
        if (quickFilter === "notes") return item.type === "notes";
        if (quickFilter === "tasks") return item.type === "tasks";

        return true;
    }) || [];

    return (
        <>
            <header className="mx-2 mb-2">
                <TopNavbar />
            </header>

            <section className="mb-6 grid grid-cols-2 gap-2 text-xl slide-in-right">
                <button
                    className={`${quickFilter === "notes" ? "bg-accent" : ""} min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer`}
                    onClick={() => setQuickFilter(prev => prev === "notes" ? null : "notes")}
                >
                    <span>Notes</span>
                    <span>{resultsCount.notes}</span>
                </button>
                <button
                    className={`${quickFilter === "tasks" ? "bg-accent" : ""} min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer`}
                    onClick={() => setQuickFilter(prev => prev === "tasks" ? null : "tasks")}
                >
                    <span>Tasks</span>
                    <span>{resultsCount.tasks}</span>
                </button>
            </section>

            <section className="h-full slide-in-bottom">
                {displayResults.length === 0 ? (
                    <p className="text-center">No results found</p>
                ) : (
                    displayResults.map(item => (
                        <Link href={`/${item.type}/${item.id}`} key={`${item.type}-${item.id}`}>
                            <article className="h-22 mb-2 p-2 border-1 border-foreground rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent capitalize">{item.type}</span>
                                    <h3
                                        className="text-lg mb-1 truncate"
                                        dangerouslySetInnerHTML={{ __html: item.title || "" }}
                                    />
                                </div>
                                <p
                                    className="text-sm font-light"
                                    dangerouslySetInnerHTML={{ __html: item.content as string || "" }}
                                />
                            </article>
                        </Link>
                    ))
                )}
            </section>

            <div className="h-18"></div>

            <footer className="fixed bottom-0 left-0 right-0 pb-4 px-2 bg-transparent lg:ml-2 lg:w-1/4 lg:max-w-md lg:min-w-sm"> {/* ml-2 used as offset for main's mx-2 */}
                <BottomNavbar />
            </footer>
        </>
    );
}
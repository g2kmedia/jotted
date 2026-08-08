"use client"

import QuickFilterButton from "@/app/components/QuickFilterButton";
import { SearchResult } from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react";
import { toast } from "sonner";

const SEARCH_QUICK_FILTERS = [
    { key: "notes", label: "NOTES" },
    { key: "tasks", label: "TASKS" }
];

export default function SearchResults() {
    const searchParams = useSearchParams();
    const term = searchParams.get("term");

    const [quickFilter, setQuickFilter] = useState<string | null>(null);
    const [resultsCount, setResultsCount] = useState({ notes: 0, tasks: 0 });
    const [results, setResults] = useState<SearchResult[] | null>(null);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const url = new URL("/api/search", window.location.origin);
                url.searchParams.set("term", term!);

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
    }, [term]);

    const displayResults = results?.filter(item => {
        if (quickFilter === "notes") return item.type === "notes";
        if (quickFilter === "tasks") return item.type === "tasks";

        return true;
    }) || [];

    return (
        <div className="h-full flex flex-col">
            <section className="grid grid-cols-2 gap-y-2 border-b-1 pb-2">
                {SEARCH_QUICK_FILTERS.map(f => (
                    <QuickFilterButton
                        key={f.key}
                        active={quickFilter === f.key}
                        count={resultsCount[f.key as keyof typeof resultsCount]}
                        label={f.label}
                        onClick={() => setQuickFilter(quickFilter === f.key ? null : f.key)}
                    />
                ))}
            </section>

            <section className="h-full overflow-y-auto">
                {displayResults.length === 0 ? (
                    <p className="text-center mt-20">No results found</p>
                ) : (
                    <>
                        {displayResults.map(item => (
                            <Link href={`/${item.type}/${item.id}`} key={`${item.type}-${item.id}`}>
                                <article className="max-h-22 py-2 mb-2 flex flex-row items-center border-b-1">
                                    <p className="mr-2 text-xs text-secondary-foreground capitalize">{item.type}</p>
                                    <div className="flex flex-col justify-between overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                        <h4
                                            className="text-lg mb-1"
                                            dangerouslySetInnerHTML={{ __html: item.title || "" }}
                                        />
                                        <p
                                            className="text-sm font-light text-muted-foreground"
                                            dangerouslySetInnerHTML={{ __html: item.content as string || "" }}
                                        />
                                    </div>
                                </article>
                            </Link>
                        ))}
                        <p className="p-4 mb-30 lg:mb-3 text-center font-titles">That's all!</p>
                    </>
                )}
            </section>
        </div>
    );
}
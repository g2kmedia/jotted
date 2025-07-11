"use client"

import { useEffect } from "react";

export default function Error({
    error
}: {
    error: Error & { digest?: string }
}) {
    useEffect(() => {
        console.error(error)
    }, [error]);

    return (
        <h2 className="flex justify-center items-center h-screen text-red-500">Something went wrong!</h2>
    );
}
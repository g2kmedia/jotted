"use client"

import { syncPendingChanges } from "@/lib/sync";
import { useEffect } from "react"

// Handle online status and syncing between IndexedDB and SQLite
export default function SyncHandler() {
    useEffect(() => {
        if (navigator.onLine) syncPendingChanges();

        const handleOnline = () => {
            syncPendingChanges();
        }

        window.addEventListener("online", handleOnline);

        return () => {
            window.removeEventListener("online", handleOnline);
        };
    }, []);

    return null;
}
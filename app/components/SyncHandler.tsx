"use client"

import { syncPendingChanges } from "@/lib/sync";
import { useEffect } from "react"
import { toast } from "sonner";

// Handle online status and syncing between IndexedDB and SQLite
export default function SyncHandler() {
    useEffect(() => {
        if (navigator.onLine) syncPendingChanges();

        const handleOffline = () => {
            toast.info("Offline: Only cached data is available. Changes will be saved locally.");
        }

        const handleOnline = () => {
            toast.info("Back online.")
            syncPendingChanges();
        }

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);


        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        };
    }, []);

    return null;
}
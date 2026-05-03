"use client"

import { subscribeToPush } from "@/lib/push-client";
import { syncPendingChanges } from "@/lib/sync";
import { useEffect, useState } from "react"
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Handle online status and syncing between IndexedDB and SQLite
export default function SyncHandler() {
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        if (navigator.onLine) syncPendingChanges();

        // Request permission and subscribe to push notifications
        if ("Notification" in window && Notification.permission === "default") {
            setShowPrompt(true);
        }

        const handleOffline = () => {
            toast.info("Offline: Only cached data is available. Changes will be saved locally.");
        }

        const handleOnline = () => {
            toast.info("Back online.");
            syncPendingChanges();
        }

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);


        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        };
    }, []);

    // Prevent stale permissions
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "granted") subscribeToPush();
    }, []);

    async function enableNotifications() {
        const permission = await Notification.requestPermission();

        if (permission === "granted") await subscribeToPush();
        setShowPrompt(false);
    }

    return (
        <AlertDialog open={showPrompt} onOpenChange={setShowPrompt}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Enable Notifications</AlertDialogTitle>
                    <AlertDialogDescription>
                        Get reminders for your upcoming tasks based on their due date.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="dark:hover:bg-accent hover:cursor-pointer">
                        Not now
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={enableNotifications} className="hover:cursor-pointer">
                        Enable
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
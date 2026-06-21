"use client"

import { subscribeToPush } from "@/lib/push-client";
import { getServerChanges, syncPendingChanges } from "@/lib/sync";
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

const isStandalone = (): boolean => {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true
    );
}

// Handle online status and syncing between IndexedDB and SQLite
export default function SyncHandler() {
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const initSync = async () => {
            if (navigator.onLine) {
                await syncPendingChanges();
                await getServerChanges("tasks");
                await getServerChanges("notes");
            }
        }

        initSync();

        // Request permission and subscribe to push notifications
        const canPrompt =
            "Notification" in window &&
            Notification.permission === "default" &&
            ("serviceWorker" in navigator);


        if (canPrompt) {
            const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);

            // Don't promt in Safari browser on iOS (not working)
            if (isIOS && !isStandalone()) return;

            setShowPrompt(true);
        }

        const handleOffline = () => {
            toast.info("Offline: Only cached data is available. Changes will be saved locally.");
        }

        const handleOnline = async () => {
            toast.info("Back online.");
            await syncPendingChanges();
            await getServerChanges("tasks");
            await getServerChanges("notes");
        }

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);


        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        };
    }, []);

    // Re-subscribe on load if already granted (prevent stale subscription)
    useEffect(() => {
        if (
            "Notification" in window &&
            "serviceWorker" in navigator &&
            Notification.permission === "granted"
        ) {
            subscribeToPush();
        }
    }, []);

    async function enableNotifications() {
        try {
            const permission = await Notification.requestPermission();

            if (permission === "granted") {
                await subscribeToPush();
                toast.success("Notifications enabled");
            }
        } catch (error) {
            console.error("Failed to enable notifications:", error);
            toast.error("Failed to enable notifications");
        }

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
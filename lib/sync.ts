import { toast } from "sonner";
import { getPendingChanges, markSynced } from "./indexeddb"

export const syncPendingChanges = async (): Promise<boolean> => {
    const changes = await getPendingChanges();

    if (changes.length === 0) return true;

    let allSucceeded = true;

    for (const change of changes) {
        try {
            switch (change.operation) {
                case "create":
                    const createRes = await fetch(`/api/${change.recordType}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(change.data)
                    });

                    if (createRes.ok) {
                        await markSynced(change.recordId);
                    } else {
                        allSucceeded = false;
                    }
                    break;

                case "update":
                    const updateRes = await fetch(`/api/${change.recordType}/${change.data.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(change.data)
                    })

                    if (updateRes.ok) {
                        await markSynced(change.recordId);
                    } else {
                        allSucceeded = false;
                    }
                    break;

                case "delete":
                    const deleteRes = await fetch(`/api/${change.recordType}/${change.data.id}`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" }
                    });

                    if (deleteRes.ok) {
                        await markSynced(change.recordId);
                    } else {
                        allSucceeded = false;
                    }
                    break;
            }
        } catch (error) {
            console.error("Failed to sync DBs", error);
            toast.error("Failed to sync");
            allSucceeded = false;
        }
    }

    if (allSucceeded) {
        window.dispatchEvent(new CustomEvent("sync-completed"));
    }

    return allSucceeded;
}
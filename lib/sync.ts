import { toast } from "sonner";
import { getPendingChanges, markSynced, queueChanges, saveNoteLocally, saveTaskLocally } from "./indexeddb"
import { EditorNote, Task } from "./types";

export const offlineSaveAndSync = async <T extends EditorNote | Task>(
    id: string,
    recordType: "notes" | "tasks",
    dbOperation: "create" | "update" | "delete",
    updates: Partial<T>,
    setSaveStatus: React.Dispatch<React.SetStateAction<"synced" | "saved" | null>>
): Promise<void> => {
    const updatedAt = new Date().toISOString();

    try {
        const dataToSaveLocally = {
            id: id,
            ...updates,
            updated_at: updatedAt
        };

        const savedData = recordType === "notes"
            ? await saveNoteLocally(dataToSaveLocally)
            : await saveTaskLocally(dataToSaveLocally);

        await queueChanges({
            recordId: `${recordType}-${id}`,
            recordType: recordType,
            operation: dbOperation,
            data: savedData
        });

        setSaveStatus("saved");

        if (navigator.onLine) {
            syncPendingChanges()
                .then(success => {
                    if (success) setSaveStatus("synced");
                })
                .catch(error => console.error("Sync failed:", error));
        }
    } catch (error) {
        console.error("Failed to save offline and sync:", error);
        setSaveStatus(null);
        throw error;
    }
}

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
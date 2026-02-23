import { toast } from "sonner";
import { getPendingChanges, markSynced, queueChanges, saveNoteLocally, saveTaskLocally } from "./indexeddb"
import { localNote, localTask } from "./types";

export const offlineSaveAndSync = async <T extends localNote | localTask>(
    id: string,
    recordType: "notes" | "tasks",
    dbOperation: "create" | "update" | "delete",
    updates: Partial<T>,
    setSaveStatus: React.Dispatch<React.SetStateAction<"synced" | "saved" | null>>,
    tags?: { currentTags: string[] },
): Promise<void> => {
    const updatedAt = new Date().toISOString();

    try {
        const savedData = recordType === "notes"
            ? await saveNoteLocally({ id, updated_at: updatedAt, ...updates as Partial<localNote> })
            : await saveTaskLocally({ id, updated_at: updatedAt, ...updates as Partial<localTask> });

        await queueChanges({
            recordId: tags ? `${recordType}-${id}-tags` : `${recordType}-${id}`,
            recordType: recordType,
            operation: dbOperation,
            data: tags
                ? { type: "tags", id, updated_at: updatedAt, currentTags: tags.currentTags, tags: savedData.tags } : savedData
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
                    const requests: Promise<Response>[] = [];

                    // Record update (non-tags data)
                    if (!('type' in change.data && change.data.type === 'tags')) {
                        const { tags, ...recordData } = change.data;

                        requests.push(fetch(`/api/${change.recordType}/${change.data.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(recordData)
                        }));
                    }

                    // Tags update
                    if ('type' in change.data && change.data.type === 'tags') {
                        const { tags, currentTags } = change.data;

                        requests.push(fetch(`/api/${change.recordType}/tags/${change.data.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ updates: tags, currentTags })
                        }));
                    }

                    if (requests.length > 0) {
                        const results = await Promise.all(requests);

                        if (results.every(res => res.ok)) {
                            await markSynced(change.recordId);
                        } else {
                            allSucceeded = false;
                        }
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
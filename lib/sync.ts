import { toast } from "sonner";
import { deleteNoteLocally, deleteTaskLocally, getPendingChanges, getSyncCursor, markSynced, queueChanges, saveNoteLocally, saveTaskLocally, setSyncCursor } from "./indexeddb"
import { localNote, localTask } from "./types";

export const offlineSaveAndSync = async (
    id: string,
    recordType: "notes" | "tasks",
    dbOperation: "create" | "update" | "delete",
    updates: Partial<localNote | localTask>,
    setSaveStatus?: React.Dispatch<React.SetStateAction<"synced" | "saved" | null>>,
): Promise<void> => {
    const updatedAt = new Date().toISOString();

    try {
        recordType === "notes"
            ? saveNoteLocally({ id, updated_at: updatedAt, ...updates as Partial<localNote> })
            : saveTaskLocally({ id, updated_at: updatedAt, ...updates as Partial<localTask> });

        await queueChanges({
            recordId: `${recordType}-${id}`,
            recordType: recordType,
            operation: dbOperation,
            data: { id, updated_at: updatedAt, ...updates }
        });

        setSaveStatus?.("saved");

        if (navigator.onLine) {
            syncPendingChanges()
                .then(success => {
                    if (success) setSaveStatus?.("synced");
                })
                .catch(error => console.error("Sync failed:", error));
        }
    } catch (error) {
        console.error("Failed to save offline and sync:", error);
        setSaveStatus?.(null);
        throw error;
    }
}

export const syncPendingChanges = async (): Promise<boolean> => {
    const changes = await getPendingChanges();
    if (changes.length === 0) return true;

    let allSucceeded = true;
    let refreshedRecordsCount = 0;

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
                    });

                    if (updateRes.ok) {
                        await markSynced(change.recordId);
                    } else if (updateRes.status == 412) {
                        // Stale cache - delete local record and pending change
                        change.recordType === "notes" ? await deleteNoteLocally(change.data.id) : await deleteTaskLocally(change.data.id);

                        await markSynced(change.recordId);

                        refreshedRecordsCount++;
                    } else {
                        allSucceeded = false;
                    }
                    break;

                case "delete":
                    const deleteRes = await fetch(`/api/${change.recordType}/${change.data.id}`, { method: "DELETE" });

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
            break;
        }
    }

    if (refreshedRecordsCount > 0) {
        toast.info(
            `${refreshedRecordsCount} update(s) refreshed from server. Please reload the page.`,
            { duration: 8000 }
        );
    }

    if (allSucceeded) {
        window.dispatchEvent(new CustomEvent("sync-completed"));
    }

    return allSucceeded;
}

export const getServerChanges = async (recordType: "notes" | "tasks"): Promise<void> => {
    const since = await getSyncCursor(recordType);
    const pending = await getPendingChanges();
    const pendingIds = new Set(pending.map(change => change.recordId));

    let lastQueriedRecord: { id: string; updated_at: string } | undefined = undefined;
    let newCursor: string | null = null;
    let keepGoing = true;

    while (keepGoing) {
        const url = new URL(`/api/${recordType}`, window.location.origin);
        url.searchParams.set("limit", "50");

        if (lastQueriedRecord) {
            url.searchParams.set("last_queried_record", JSON.stringify(lastQueriedRecord));
        }

        try {
            const res = await fetch(url);

            if (!res.ok) break;

            const { [recordType]: serverRecords } = await res.json();

            if (!serverRecords.length) break;

            if (!newCursor) newCursor = serverRecords[0].updated_at; // newest seen during the sweep

            for (const r of serverRecords) {
                if (since && r.updated_at <= since) {
                    keepGoing = false;
                    break;
                }

                if (!pendingIds.has(`${recordType}-${r.id}`)) {
                    recordType === "tasks" ? await saveTaskLocally(r) : await saveNoteLocally(r);
                }
            }

            const lastServerRecord = serverRecords[serverRecords.length - 1];
            lastQueriedRecord = { id: lastServerRecord.id, updated_at: lastServerRecord.updated_at };

            if (serverRecords < 50) keepGoing = false;

            if (newCursor) await setSyncCursor(recordType, newCursor);
        } catch (error) {
            console.error(`Failed to get latest ${recordType} server changes:`, error);
        }
    }
};
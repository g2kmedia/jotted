import { getPendingChanges, markSynced } from "./indexeddb"

export const syncPendingChanges = async (): Promise<boolean> => {
    const changes = await getPendingChanges();

    if (changes.length === 0) return true;

    let allSucceeded = true;

    for (const change of changes) {
        try {
            if (change.operation === "update") {
                const res = await fetch(`/api/${change.recordType}/${change.data.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(change.data)
                })

                if (res.ok) {
                    await markSynced(change.recordId);
                } else {
                    allSucceeded = false;
                }
            }

            // TODO: Add "create" and "delete" operations later

        } catch (error) {
            console.error("Failed to sync DBs", error);
            allSucceeded = false;
        }
    }

    return allSucceeded;
}
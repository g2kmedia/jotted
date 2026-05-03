import { db } from "./database";
import cron from "node-cron";

// Cleanup function for old trashed records
const cleanupTrashedRecords = (daysOld = 30): {
    notesDeleted: number
    tasksDeleted: number
    tagsDeleted: number
} => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISODate = cutoffDate.toISOString();

    const deleteNotes = db.prepare(`
        DELETE FROM note
        WHERE is_trashed = 1
        AND updated_at < ?    
    `);

    const deleteTasks = db.prepare(`
        DELETE FROM task
        WHERE is_trashed = 1
        AND updated_at < ?
    `);

    const deleteOrphanTags = db.prepare(`
        DELETE FROM tag
        WHERE id NOT IN (
            SELECT DISTINCT tag_id FROM task_tag
            UNION
            SELECT DISTINCT tag_id FROM note_tag
        )
    `);

    const transaction = db.transaction(() => {
        const noteResult = deleteNotes.run(cutoffISODate);
        const taskResult = deleteTasks.run(cutoffISODate);
        const tagResult = deleteOrphanTags.run();

        return {
            notesDeleted: noteResult.changes,
            tasksDeleted: taskResult.changes,
            tagsDeleted: tagResult.changes
        };
    });

    return transaction();
}

export function startScheduler() {
    // Initialize cleanup once at start
    let startCleanupInitialized = false;

    const initializeStartCleanup = (): void => {
        if (startCleanupInitialized) return;

        const startupCleanupResult = cleanupTrashedRecords(30);
        console.log("Startup cleanup:", startupCleanupResult);

        startCleanupInitialized = true;
    }

    // Schedule daily cleanup at 3 AM
    cron.schedule("0 3 * * *", () => {
        const result = cleanupTrashedRecords(30);
        console.log(`[${new Date().toISOString()}] Cleanup:`, result);
    });
}
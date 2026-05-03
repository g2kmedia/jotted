import { db } from "./database";
import cron from "node-cron";
import { getAllTasks } from "./tasks";
import { sendPushToAll } from "./push-server";

// Cleanup function for old trashed SQL records
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

const notifyUpcomingTasks = async (dueDateStart: string, dueDateEnd: string) => {
    const tasks = getAllTasks({
        dueDateStart: dueDateStart,
        dueDateEnd: dueDateEnd,
        isCompleted: "0",
        isTrashed: "0"
    });

    if (!tasks || tasks.length === 0) return;

    for (const task of tasks) {
        await sendPushToAll({
            title: task.title ?? "Task Reminder",
            body: task.content ?? "",
            url: `/tasks/${task.id}`
        });
    }
}

export function startScheduler() {
    // Run SQL cleanup on startup
    const startupCleanupResult = cleanupTrashedRecords(30);
    console.log("Startup cleanup:", startupCleanupResult);

    // Schedule daily SQLite cleanup at 3 AM
    cron.schedule("0 3 * * *", () => {
        const result = cleanupTrashedRecords(30);
        console.log(`[${new Date().toISOString()}] Cleanup:`, result);
    });

    // Check for upcoming Tasks with due date (next 1 min)
    cron.schedule("* * * * *", async () => {
        const nextMinute = new Date(Date.now() + 60_000)
        // Round to the minute to match due_date
        nextMinute.setSeconds(0, 0);

        const windowStart = nextMinute.toISOString();
        const windowEnd = new Date(nextMinute.getTime() + 59_999).toISOString();

        await notifyUpcomingTasks(windowStart, windowEnd);

    });
}
import Database from "better-sqlite3";
import cron from "node-cron";

const db = new Database("./database.sqlite");

db.pragma("foreign_keys = ON");

const initDd = (): void => {
    // Note
    const createNoteTable = `
        CREATE TABLE IF NOT EXISTS note (
            id INTEGER PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT DEFAULT '',
            content_plaintext TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_pinned BOOLEAN DEFAULT 0,
            is_trashed BOOLEAN DEFAULT 0
        )
    `;

    const createNoteTrashedIndex = 'CREATE INDEX IF NOT EXISTS idx_note_trashed ON note(is_trashed)';
    const createNotePinnedIndex = 'CREATE INDEX IF NOT EXISTS idx_note_pinned ON note(is_pinned)';
    const createNoteUpdatedIndex = 'CREATE INDEX IF NOT EXISTS idx_note_updated_at ON note(updated_at)';

    const createNoteUpdateTrigger = `
        CREATE TRIGGER IF NOT EXISTS update_note_timestamp
        AFTER UPDATE ON note
        BEGIN
            UPDATE note SET updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.id;
        END
    `;

    // Task
    const createTaskTable = `
        CREATE TABLE IF NOT EXISTS task (
            id INTEGER PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            due_date DATETIME,
            priority INTEGER CHECK((priority >= 0 AND priority <= 3) OR priority IS NULL),
            is_completed BOOLEAN DEFAULT 0,
            is_trashed BOOLEAN DEFAULT 0
        )
    `;

    const createTaskTrashedIndex = 'CREATE INDEX IF NOT EXISTS idx_task_trashed ON task(is_trashed)';
    const createTaskCompletedIndex = 'CREATE INDEX IF NOT EXISTS idx_task_completed ON task(is_completed)';
    const createTaskDueDateIndex = 'CREATE INDEX IF NOT EXISTS idx_task_due_date ON task(due_date)';
    const createTaskPriorityIndex = 'CREATE INDEX IF NOT EXISTS idx_task_priority ON task(priority)';
    const createTaskActiveIndex = 'CREATE INDEX IF NOT EXISTS idx_task_active ON task(is_trashed, is_completed)';

    const createTaskUpdateTrigger = `
        CREATE TRIGGER IF NOT EXISTS update_task_timestamp
        AFTER UPDATE ON task
        BEGIN
            UPDATE task SET updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.id;
        END
    `;

    // Tag
    const createTagTable = `
        CREATE TABLE IF NOT EXISTS tag (
            id INTEGER PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Junction tables
    const createNoteTagTable = `
        CREATE TABLE IF NOT EXISTS note_tag (
            note_id INTEGER REFERENCES note(id) ON DELETE CASCADE,
            tag_id INTEGER REFERENCES tag(id) ON DELETE CASCADE,
            PRIMARY KEY (note_id, tag_id)
        )
    `;

    const createTaskTagTable = `
        CREATE TABLE IF NOT EXISTS task_tag (
            task_id INTEGER REFERENCES task(id) ON DELETE CASCADE,
            tag_id INTEGER REFERENCES tag(id) ON DELETE CASCADE,
            PRIMARY KEY (task_id, tag_id)
        )
    `;

    const transaction = db.transaction(() => {
        db.exec(createNoteTable);
        db.exec(createNoteTrashedIndex);
        db.exec(createNotePinnedIndex);
        db.exec(createNoteUpdatedIndex);
        db.exec(createNoteUpdateTrigger);
        db.exec(createTaskTable);
        db.exec(createTaskTrashedIndex);
        db.exec(createTaskCompletedIndex);
        db.exec(createTaskDueDateIndex);
        db.exec(createTaskPriorityIndex);
        db.exec(createTaskActiveIndex);
        db.exec(createTaskUpdateTrigger);
        db.exec(createTagTable);
        db.exec(createNoteTagTable);
        db.exec(createTaskTagTable);
    });

    transaction();
}

initDd();

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
    })

    return transaction();
}

// Initialize cleanup once at start
let cleanupInitialized = false;

export const initializeCleanup = (): void => {
    if (cleanupInitialized) return;

    // Run cleanup on startup
    const startupCleanupResult = cleanupTrashedRecords(30);
    console.log("Startup cleanup:", startupCleanupResult);

    // Schedule daily cleanup at 3 AM
    cron.schedule("0 3 * * *", () => {
        const result = cleanupTrashedRecords(30);
        console.log(`[${new Date().toISOString()}] Cleanup:`, result);
    });

    cleanupInitialized = true;
}

export { db };
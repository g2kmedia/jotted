import { db } from "@/lib/database";

export function updateNoteTags(id: string, updates: string[], currentTags: string[]): { success: boolean } {
    // slice to remove "#" from the tags
    const toAdd = updates.flatMap(tag =>
        !currentTags.includes(tag) && tag ? [tag.slice(1)] : [] // Check if tag is defined to prevent inserting empty space as tag
    );
    const toRemove = currentTags.flatMap(tag =>
        !updates.includes(tag) ? [tag.slice(1)] : []
    );

    try {
        const transaction = db.transaction(() => {
            if (toAdd.length > 0) {
                const insertTagStmt = db.prepare(`INSERT OR IGNORE INTO tag (name) VALUES (?)`);
                toAdd.forEach(tag => insertTagStmt.run(tag));

                const insertRelationStmt = db.prepare(`
                    INSERT INTO note_tag (note_id, tag_id)
                    SELECT ?, id FROM tag WHERE name = ?
            `);
                toAdd.forEach(tag => insertRelationStmt.run(id, tag));
            }

            if (toRemove.length > 0) {
                const removeStmt = db.prepare(`
                    DELETE FROM note_tag
                    WHERE note_id = ? AND tag_id = (
                        SELECT id FROM tag WHERE name = ?
                )
            `);
                toRemove.forEach(tag => removeStmt.run(id, tag));

                const cleanupOrphanTags = db.prepare(`
                    DELETE FROM tag
                    WHERE id NOT IN (
                        SELECT DISTINCT tag_id FROM note_tag
                    )
                `);
                cleanupOrphanTags.run();
            }
        });

        transaction();

        return { success: true };

    } catch (error) {
        console.error("Transaction failed", error);
        return { success: false };
    }
}

export function getNoteTags(noteId: string): string[] {
    const stmt = db.prepare(`
        SELECT t.name
        FROM tag t
        JOIN note_tag nt ON t.id = nt.tag_id
        WHERE nt.note_id = ?
    `);
    const result = stmt.all(noteId) as Array<{ name: string }>;

    return result.map(row => row.name);
}
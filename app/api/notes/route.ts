import { createNote } from "@/lib/notes";

export async function POST() {
    try {
        const noteId = createNote();
        return Response.json({ noteId });
    } catch (error) {
        return Response.json({
            error: "Failed to create note"
        }, {
            status: 500
        });
    }
}
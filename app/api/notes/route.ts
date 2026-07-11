import { createNote, getAllNotes } from "@/lib/notes-server";
import { NextRequest } from "next/server";

export async function POST(
    request: NextRequest
) {
    try {
        const noteData = await request.json()

        createNote(noteData);

        return Response.json({});
    } catch (error) {
        console.error("Failed to create note", error)
        return Response.json({
            error: "Failed to create note"
        }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest
) {
    try {
        const { searchParams } = request.nextUrl;
        
        const columns = searchParams.get("columns")?.split(",") || undefined;
        const isPinned = searchParams.get("is_pinned") || undefined;
        const isTrashed = searchParams.get("is_trashed") || undefined;

        const lastQueriedRecordStr = searchParams.get("last_queried_record");
        const lastQueriedRecord = lastQueriedRecordStr ? JSON.parse(lastQueriedRecordStr) : undefined;

        const tags = searchParams.get("tags")?.split(",") || undefined;
        const limit = Number(searchParams.get("limit")) || undefined;

        const queryParams = { columns, isPinned, isTrashed, lastQueriedRecord, tags, limit };
        
        const notes = getAllNotes(queryParams);

        return Response.json({ notes }, { status: 200 });
    } catch (error) {
        return Response.json({ Error: error }, { status: 404 });
    }
}
import { createNote, getAllNotes } from "@/lib/notes";
import { NextRequest } from "next/server";

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

export function GET(
    request: NextRequest
) {
    try {
        const { searchParams } = request.nextUrl;
        const columns = searchParams.get("columns")?.split(",") || [];
        const limit = Number(searchParams.get("limit")) || 20;
        const idBefore = Number(searchParams.get("id_before")) || undefined;

        const queryParams = { columns, limit, idBefore };
        
        const notes = getAllNotes(queryParams);

        return Response.json({ notes }, { status: 200 });
    } catch (error) {
        return Response.json({ Error: error }, { status: 404 });
    }
}
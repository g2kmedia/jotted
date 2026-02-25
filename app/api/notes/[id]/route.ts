import { db } from "@/lib/database";
import { deleteNote, getNote, updateNote } from "@/lib/notes";
import { getNoteTags, updateNoteTags } from "@/lib/tags";
import { NextRequest } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const route = await params;
        const { searchParams } = request.nextUrl;
        const columns = searchParams.get("columns")?.split(",");
        const includeTags = searchParams.get("tags") !== "false"; // defaults true

        const note = getNote(route.id, columns);
        const tags = includeTags ? getNoteTags(route.id) : undefined;

        return Response.json({ note, tags });
    } catch (error) {
        return Response.json({
            error: "Could not get note"
        }, { status: 404 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const route = await params;
        const { tags, ...noteUpdates } = await request.json();

        const currentServerRecord = db.prepare(`
            SELECT updated_at FROM note WHERE id = ?
        `).get(route.id) as { updated_at: string };

        if (new Date(noteUpdates.updated_at) <= new Date(currentServerRecord.updated_at)) {
            return Response.json({ error: "Stale update" }, { status: 412 });
        }

        const noteUpdateRes = updateNote(route.id, noteUpdates || {});
        const tagsUpdateRes = updateNoteTags(route.id, tags || []);

        return Response.json({
            msg: `Update successful: ${noteUpdateRes} Note updates & ${tagsUpdateRes} Tag updates`
        }, { status: 200 });

    } catch (error) {
        return Response.json({
            error: `Could not update note: ${error}`
        }, { status: 400 });
    }
}

export async function DELETE(
    _: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const route = await params;
        const deletedNote = deleteNote(route.id);

        if (deletedNote === 1) {
            return Response.json({
                message: "Note deleted successfully"
            }, { status: 200 });
        }

        return Response.json({
            message: "Note not found"
        }, { status: 404 });
    } catch (error) {
        console.error("Delete note error:", error);

        return Response.json({
            error: "Failed to delete note"
        }, { status: 500 });
    }
}
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
            error: "Note not found"
        }, { status: 404 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const route = await params;
        const { tags, ...noteData } = await request.json()

        const updatesNote = updateNote(route.id, noteData)

        if (updatesNote === 0) {
            return Response.json({
                msg: "0 updates were made"
            }, { status: 200 });
        }

        const updatesTags = updateNoteTags(route.id, tags);

        if (!updatesTags.success) {
            console.warn("Tags update failed: ", updatesTags);
        }

        return Response.json({
            msg: "Update successful"
        }, { status: 200 });

    } catch (error) {
        console.error('Error updating note:', error);
        return Response.json({
            error: "Could not update note"
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
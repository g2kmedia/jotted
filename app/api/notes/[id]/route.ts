import { NoteUpdateSchema } from "@/lib/schemas";
import { getNote, updateNote } from "@/lib/notes";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const route = await params;

        const note = getNote(route.id);

        return Response.json({ note });
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
        const body = await request.json()

        const updates = NoteUpdateSchema.parse(body);
        
        const updatesResult = updateNote(route.id, updates)

        if (updatesResult === 0) {
            return Response.json({
                error: "0 updates were made"
            }, { status: 200 });
        }

        return Response.json({
            msg: "Update successful"
        }, { status: 200 });

    } catch (error) {
        return Response.json({
            error: "Could not update note"
        }, { status: 400 });
    }
}
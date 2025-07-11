import { getNote } from "@/lib/notes";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const routeId = await params;

        const note = getNote(routeId.id);

        return Response.json({ note });
    } catch (error) {
        return Response.json({
            error: "Note not found"
        }, { status: 404 });
    }
}
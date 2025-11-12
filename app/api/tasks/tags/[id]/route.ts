import { updateTaskTags } from "@/lib/tags";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const route = await params;
        const body = await request.json()

        const updatesResult = updateTaskTags(route.id, body.updates, body.currentTags);

        if (!updatesResult.success) {
            return Response.json({
                error: "Database error"
            }, { status: 500 });
        }

        return Response.json({
            msg: "Update successful"
        }, { status: 200 });

    } catch (error) {
        return Response.json({
            error: "Could not update tags"
        }, { status: 500 })
    }
}
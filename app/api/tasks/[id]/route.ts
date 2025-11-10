import { updateTask } from "@/lib/tasks";

export async function PATCH(
    request: Request,
    { params } : { params: Promise<{ id: string }> }
) {
    try {
        const route = await params;
        const body = await request.json();

        const updatesResult = updateTask(route.id, body);

        if (updatesResult === 0) {
            return Response.json({
                msg: "0 update were made"
            }, { status: 200 });
        }

        return Response.json({
            msg: "Update successful"
        }, { status: 200 });

    } catch (error) {
        return Response.json({
            error: "Could not update task"
        }, {status: 400});
    }
}
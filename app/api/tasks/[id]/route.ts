import { NextRequest } from 'next/server';
import { getTask, updateTask } from "@/lib/tasks";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const route = await params;
        const { searchParams } = request.nextUrl;
        const columns = searchParams.get("columns")?.split(",");

        const task = getTask(route.id, columns);
        // add getTaskTags
        
        return Response.json({ task });
    } catch (error) {
        return Response.json({
            error: "Could not get task"
        }, { status: 404 });
    }
}

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
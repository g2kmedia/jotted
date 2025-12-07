import { NextRequest } from 'next/server';
import { deleteTask, getTask, updateTask } from "@/lib/tasks";
import { getTaskTags } from '@/lib/tags';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const route = await params;
        const { searchParams } = request.nextUrl;
        const columns = searchParams.get("columns")?.split(",");
        const includeTags = searchParams.get("tags") === "true";

        const task = getTask(route.id, columns);
        const tags = includeTags ? getTaskTags(route.id) : undefined;

        return Response.json({ task, tags });
    } catch (error) {
        return Response.json({
            error: "Could not get task"
        }, { status: 404 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
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
        }, { status: 400 });
    }
}

// Do I still need the DELETE API
export async function DELETE(
    request: Request,
    { params } : { params: Promise<{ id: string }> }
) {
    try {
        const route = await params;
        const deletedTask = deleteTask(route.id);

        if (deletedTask === 1) {
            return Response.json({
                message: "Task deleted successfully"
            }, { status: 200 });
        }

        return Response.json({
            message: "Task not found"
        }, { status: 404 });
    } catch (error) {
        console.error("Delete task error:", error)

        return Response.json({
            error: "Failed to delete task"
        }, { status: 500 });
    }
}
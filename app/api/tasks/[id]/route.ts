import { NextRequest } from 'next/server';
import { deleteTask, getTask, updateTask } from "@/lib/tasks-server";
import { getTaskTags, updateTaskTags } from '@/lib/tags';
import { db } from '@/lib/sqlite';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const route = await params;
        const { searchParams } = request.nextUrl;
        const columns = searchParams.get("columns")?.split(",");
        const includeTags = searchParams.get("tags") !== "false"; // defaults true

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
        const { tags, ...taskUpdates } = await request.json();

        const currentServerRecord = db.prepare(`
            SELECT updated_at FROM task WHERE id = ?    
        `).get(route.id) as { updated_at: string };

        if (new Date(taskUpdates.updated_at) <= new Date(currentServerRecord.updated_at)) {
            return Response.json({ error: "Stale update" }, { status: 412 });
        }

        const taskUpdateRes = updateTask(route.id, taskUpdates || {});
        const tagsUpdateRes = updateTaskTags(route.id, tags || []);

        return Response.json({
            msg: `Update successful: ${taskUpdateRes} Task updates & ${tagsUpdateRes} Tag updates`
        }, { status: 200 });

    } catch (error) {
        return Response.json({
            error: `Could not update task: ${error}`
        }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
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
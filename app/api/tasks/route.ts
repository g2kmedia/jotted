import { createTask, getAllTasks } from "@/lib/tasks";
import { NextRequest } from "next/server";

export async function POST() {
    try {
        const taskId = createTask();
        return Response.json({ taskId });
    } catch (error) {
        return Response.json({
            error: "Failed to create task"
        }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest
) {
    try {
        const { searchParams } = request.nextUrl;

        const columns = searchParams.get("columns")?.split(",") || undefined;
        const idBefore = Number(searchParams.get("id_before")) || undefined;
        const tags = searchParams.get("tags")?.split(",") || undefined;
        const limit = Number(searchParams.get("limit")) || undefined;

        const queryParams = { columns, idBefore, tags, limit };

        const tasks = getAllTasks(queryParams);

        return Response.json({ tasks }, { status: 200 });
    } catch (error) {
        return Response.json({ Error: error }, { status: 404 });
    }
} 
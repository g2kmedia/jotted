import { createTask } from "@/lib/tasks";

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
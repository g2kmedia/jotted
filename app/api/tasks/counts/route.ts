import { getTaskCounts } from "@/lib/tasks";
import { NextRequest } from "next/server";

export async function GET(
    request: NextRequest
) {
    try {
        const timezone = request.nextUrl.searchParams.get("timezone") || "UTC";
        const isCompleted = request.nextUrl.searchParams.get("is_completed") || undefined;
        const isTrashed = request.nextUrl.searchParams.get("is_trashed") || undefined;

        const params = { timezone, isCompleted, isTrashed };

        const counts = getTaskCounts(params);

        return Response.json(counts, { status: 200 });
    } catch (error) {
        return Response.json({ Error: error }, { status: 500 });
    }
}
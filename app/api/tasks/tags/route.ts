import { NextRequest } from "next/server";
import { getAllTasksTags } from "@/lib/tags-server";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;

        const isCompleted = searchParams.get("is_completed") || undefined;
        const isTrashed = searchParams.get("is_trashed") || undefined;
        const dueDateStart = searchParams.get("due_date_start") || undefined;
        const dueDateEnd = searchParams.get("due_date_end") || undefined;
        const hasDueDate = searchParams.get("has_due_date") || undefined;

        const queryParams = { isCompleted, isTrashed, dueDateStart, dueDateEnd, hasDueDate };

        const tags = getAllTasksTags(queryParams);

        return Response.json({
            tags
        }, { status: 200 });
    } catch (error) {
        return Response.json({
            error: "Could not retrieve tags from database"
        }, {status: 500});
    }
}
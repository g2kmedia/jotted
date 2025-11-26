import { getTaskCounts } from "@/lib/tasks";
import { NextRequest } from "next/server";

export async function GET(
    request: NextRequest
) {
    try {
        const timezone = request.nextUrl.searchParams.get("timezone") || "UTC";
        const counts = getTaskCounts(timezone);

        return Response.json(counts, { status: 200 });
    } catch (error) {
        return Response.json({ Error: error }, { status: 500 });
    }
}
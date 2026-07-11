import { getTaskCounts } from "@/lib/tasks-server";
import { NextRequest } from "next/server";

export async function GET(
    request: NextRequest
) {
    try {
        const timezone = request.nextUrl.searchParams.get("timezone") || "UTC";
        const params = { timezone };

        const counts = getTaskCounts(params);

        return Response.json(counts, { status: 200 });
    } catch (error) {
        return Response.json({ Error: error }, { status: 500 });
    }
}
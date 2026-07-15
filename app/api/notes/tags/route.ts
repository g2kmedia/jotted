import { NextRequest } from "next/server";
import { getAllNotesTags } from "@/lib/tags-server";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;

        const isPinned = searchParams.get("is_pinned") || undefined;
        const isTrashed = searchParams.get("is_trashed") || undefined;

        const queryParams = { isPinned, isTrashed };

        const tags = getAllNotesTags(queryParams);

        return Response.json({
            tags
        }, { status: 200 });
    } catch (error) {
        return Response.json({
            error: "Could not retrieve tags from database"
        }, {status: 500});
    }
}
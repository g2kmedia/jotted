import { searchAll, searchNotes, searchTasks } from "@/lib/search";
import { NextRequest } from "next/server";

export async function GET(
    request: NextRequest
) {
    try {
        let results;

        const { searchParams } = request.nextUrl;

        const term = searchParams.get("term") || "";
        const type = searchParams.get("type") || null;

        if (type === "notes") {
            results = searchNotes(term);
        } else if (type === "tasks") {
            results = searchTasks(term);
        } else {
            results = searchAll(term);
        }

        return Response.json({ results }, { status: 200 });

    } catch (error) {
        return Response.json({ Error: error }, { status: 404 });
    }
}
import { getAllNotesTags } from "@/lib/tags";

export async function GET() {
    try {
        const tags = getAllNotesTags();

        return Response.json({
            tags
        }, { status: 200 });
    } catch (error) {
        return Response.json({
            error: "Could not retrieve tags from database"
        }, {status: 500});
    }
}
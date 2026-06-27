import { getNoteCounts } from "@/lib/notes";
import { NextRequest } from "next/server";

export async function GET(
    request: NextRequest
) {
    try {
        const counts = getNoteCounts();

        return Response.json(counts, { status: 200 });
    } catch (error) {
        return Response.json({ Error: error }, { status: 500 });
    }
}
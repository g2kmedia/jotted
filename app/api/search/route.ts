import { searchAll } from "@/lib/search";
import { NextRequest } from "next/server";

export async function GET(
    request: NextRequest
) {
    try {
        const { searchParams } = request.nextUrl;
        const term = searchParams.get("term") || "";

        const results = searchAll(term);

        return Response.json(results, { status: 200 });

    } catch (error) {
        return Response.json({ Error: error }, { status: 404 });
    }
}
import { readFile } from "fs/promises";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { filename } = await params;

    if (!filename) {
        return Response.json({
            error: "File not found"
        }, { status: 404 });
    }

    const filePath = "uploads/" + filename;

    try {
        const file = await readFile(filePath);

        return new Response(new Uint8Array(file));
    } catch (error) {
        return Response.json({
            error: "File not found"
        }, { status: 404 });
    }
}
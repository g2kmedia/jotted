import { rm } from "fs/promises";

export async function POST(
    request: Request,
) {
    const { files } = await request.json();

    try {
        for (const url of files) {
            const filePath = url.startsWith("/api/") ? url.slice(5) : url;

            // filePath might be empty in case the user creates the block but does not upload a file
            if (!filePath) {
                break;
            }

            // { force: true } used to prevent 500 errors when the file gets deleted right after getting uploaded
            await rm(filePath, { force: true }); 
        }

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({
            error: "Could not delete file"
        }, { status: 500 });
    }
}
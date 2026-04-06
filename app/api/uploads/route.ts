import { writeFile } from "fs/promises";

export async function POST(
    request: Request
) {
    const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return Response.json({
                error: "No file received"
            }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}_${file.name.replaceAll(" ", "_")}`;
        const uploadDir = "data/uploads/";
        const filePath = uploadDir + filename;
    try {
        await writeFile(filePath, buffer);

        return Response.json({
            message: "Successfully uploaded",
            url: "/api/" + filePath
        }, { status: 201 });
    } catch (error) {
        return Response.json({
            error: "Upload failed"
        }, { status: 500 });
    }
}
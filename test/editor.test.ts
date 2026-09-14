import { describe, beforeEach, it, vi, expect } from "vitest";
import { uploadFile, deleteUploadedFile } from "@/lib/editor";

describe("upload file", () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    const file = new File(["content"], "file.png");

    it("returns url on success", async () => {
        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ url: "/api/data/uploads/file.png" })
        });

        const url = await uploadFile(file);

        expect(url).toBe("/api/data/uploads/file.png");
        expect(fetch).toHaveBeenCalledWith(
            "/api/uploads",
            expect.objectContaining({ method: "POST" })
        );
    })

    it("throws error if upload fails", async () => {
        (fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "File too large" })
        });

        await expect(uploadFile(file)).rejects.toThrow("File too large");
    });

    it("throws error when network request fails", async () => {
        (fetch as any).mockRejectedValue(new Error("Network down"));

        await expect(uploadFile(file)).rejects.toThrow("Network down");
    });
});

describe("delete uploaded file", () => {
    const fileUrls = ["/api/data/uploads/file.png"]

    beforeEach(() => {
        global.fetch = vi.fn();
    });

    it("deletes successfully", async () => {
        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true })
        });

        await deleteUploadedFile(fileUrls);

        expect(fetch).toHaveBeenCalledWith(
            "/api/uploads/delete",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ files: fileUrls })
            })
        );
    });

    it("throws error when network request fails", async () => {
        (fetch as any).mockRejectedValue(new Error("Network down"));

        await expect(deleteUploadedFile(fileUrls)).rejects.toThrow("Network down");
    });
});
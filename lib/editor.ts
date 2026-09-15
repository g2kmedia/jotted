import { Theme } from "@blocknote/mantine";

export const customTheme = {
    colors: {
        editor: {
            text: "var(--foreground)",
            background: "var(--background)"
        },
        menu: {
            text: "var(--foreground)",
            background: "var(--background)"
        },
        tooltip: {
            text: "var(--foreground)",
            background: "var(--background)"
        },
        hovered: {
            text: "var(--foreground)",
            background: "var(--accent)"
        }
    }
} satisfies Theme;

export async function uploadFile(file: File): Promise<string> {
    const body = new FormData();
    body.append("file", file);

    try {
        const res = await fetch("/api/uploads", {
            method: "POST",
            body
        });

        if (!res.ok) {
            const errorMsg = await res.json();
            throw new Error(errorMsg.error || "Upload failed");
        }

        const uploadedFile = await res.json();

        return uploadedFile.url;
    } catch (error) {
        console.error("Upload error:", error)
        throw error;
    }
}

export async function deleteUploadedFile(fileUrls: string[]): Promise<void> {
    try {
        if (fileUrls.length > 0) {
            const res = await fetch("/api/uploads/delete", {
                method: "POST",
                body: JSON.stringify({ files: fileUrls })
            });

            if (!res.ok) {
                console.error("Failed to delete files:", res.status);
            }
        }
    } catch (error) {
        console.error("Failed to delete files:", error);
        throw error;
    }
}
"use client"

import TaskEditorPage from "@/app/components/TaskEditorPage";
import { usePathname } from "next/navigation";

export default function OfflineTask() {
    const pathname = usePathname();
    
    const id = pathname.split("/").at(-1);

    if (!id) return null;

    return <TaskEditorPage taskId={id} />
}
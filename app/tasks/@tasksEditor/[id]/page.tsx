"use client"

import TaskEditorPage from "@/app/components/TaskEditorPage";
import { use } from "react"

export default function Task(
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = use(params);

    if (!id) return null;

    return <TaskEditorPage taskId={id} />
}
"use client"

import ConfirmDeleteDialog from "@/app/components/ConfirmDeleteDialog";
import TagsInput from "@/app/components/TagsInput";
import { useDeleteRecord, useTagsUpdate } from "@/lib/hooks";
import type { Task } from "@/lib/types";
import { ArrowLeft, Check, CircleCheck, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Task(
    { params }: { params: Promise<{ id: string }> }
) {
    const [route, setRoute] = useState<string | null>(null);
    const [task, setTask] = useState<Partial<Task> | undefined>(undefined);
    const [tags, setTags] = useState<string[]>([]);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleTagsUpdate = useTagsUpdate({ recordType: "tasks", route, tags, setTags });
    const { handleTrash, handleDelete } = useDeleteRecord();

    const router = useRouter();

    useEffect(() => {
        const getParams = async () => {
            const { id } = await params;
            setRoute(id);
        }

        getParams();
    }, [params]);

    useEffect(() => {
        if (!route) return;

        const loadTask = async () => {
            const res = await fetch(`/api/tasks/${route}?columns=title,content,due_date,priority,is_completed,is_trashed&tags=true`, { method: "GET" });

            if (!res.ok) {
                throw new Error(`Failed to fetch task: ${res.status}`);
            }

            const data = await res.json();

            const addHashtagToTags = data.tags.map((tag: string) => "#" + tag);

            setTask(data.task);
            setTags(addHashtagToTags);
        }

        loadTask();
    }, [route]);

    const completeTask = async (): Promise<void> => {
        const currentCompletionStatus = task?.is_completed;
        const newCompletionStatus = task?.is_completed === 0 ? 1 : 0;

        // Optimistically update
        setTask(prev => prev ? { ...prev, is_completed: newCompletionStatus } : prev);

        try {
            const res = await fetch(`/api/tasks/${route}`, {
                method: "PATCH",
                body: JSON.stringify({ is_completed: newCompletionStatus })
            });

            if (!res.ok) {
                // Rollback on error
                setTask(prev => prev ? { ...prev, is_completed: currentCompletionStatus } : prev);
                toast.error("Failed to mark as completed");
                return;
            }
        } catch (error) {
            // Rollback on error
            setTask(prev => prev ? { ...prev, is_completed: currentCompletionStatus } : prev);
            toast.error("Failed to mark as completed");
            return
        }

        toast.success(newCompletionStatus === 1 ? "Marked as Completed" : "Marked as Uncompleted");
        router.push("/tasks");
    }

    const handleTaskChange = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const date = formData.get("date");
        const time = formData.get("time") || "00:00";
        const priority = formData.get("priority");

        const taskData = {
            title: formData.get("title"),
            content: formData.get("description"),
            due_date: date ? new Date(`${date}T${time}`).toISOString() : null,
            ...(priority !== null && { priority: priority === "" ? null : Number(priority) })
        };

        try {
            const res = await fetch(`/api/tasks/${route}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(taskData)
            });

            if (!res.ok) {
                throw new Error(`Failed to update task: ${res.status}`);
            }

            toast.success("Task saved");
            router.push("/tasks");

        } catch (error) {
            console.error("Failed to update task:", error);
            toast.error("Failed to save task. Please try again.");
        }
    }

    if (!task) return null;

    return (
        <>
            <nav className="mx-2 px-2 h-16 flex flex-col items-center border-b-1 border-foreground bg-background">
                <ul className="h-full flex justify-between items-center w-full">
                    <li>
                        <Link href={"/tasks"}>
                            <ArrowLeft className="hover:cursor-pointer" />
                        </Link>
                    </li>
                    <li>
                        {task.is_trashed === 0 ? (
                            <CircleCheck
                                onClick={() => completeTask()}
                                className={`${task.is_completed === 1 ? "text-chart-2" : ""} hover:cursor-pointer`}
                            />
                        ) : (
                            <RotateCcw
                                onClick={() => handleTrash("tasks", route, task, setTask)}
                                className="text-accent hover:cursor-pointer"
                            />
                        )}
                    </li>
                    <li>
                        <Trash2
                            onClick={() => task.is_trashed === 0
                                ? handleTrash("tasks", route, task, setTask)
                                : setShowDeleteDialog(true)
                            }
                            className="text-destructive hover:cursor-pointer"
                        />
                    </li>
                </ul>
            </nav>
            <section className="p-2">
                <TagsInput tags={tags} onSubmit={handleTagsUpdate} className="slide-in-right" />
                <form onSubmit={handleTaskChange} className="flex flex-col slide-in-bottom">
                    <label htmlFor="title"></label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        defaultValue={task.title}
                        placeholder="Title"
                        className="w-full my-2 p-2 border rounded-2xl outline-none"
                    />

                    <label htmlFor="description"></label>
                    <textarea
                        id="description"
                        name="description"
                        defaultValue={task.content}
                        placeholder="Description"
                        className="h-20 w-full my-2 p-2 border rounded-2xl resize-none outline-none"
                    />

                    <fieldset className="my-2 grid grid-cols-2 justify-items-center">
                        <label htmlFor="date">Date</label>
                        <label htmlFor="time">Time</label>

                        <input
                            id="date"
                            name="date"
                            type="date"
                            defaultValue={task.due_date ? new Date(task.due_date).toLocaleDateString("en-CA") : ""} // en-CA for formatting purposes
                            className="w-40 my-2 p-2 text-center border rounded-2xl outline-none"
                        />

                        <input
                            id="time"
                            name="time"
                            type="time"
                            defaultValue={task.due_date ? new Date(task.due_date).toTimeString().slice(0, 5) : ""}
                            className="w-40 my-2 p-2 text-center border rounded-2xl outline-none"
                        />
                    </fieldset>

                    <label htmlFor="priority" className="w-full my-2 text-center">Priority</label>
                    <select
                        id="priority"
                        name="priority"
                        defaultValue={task.priority}
                        className="w-40 self-center text-center p-2 border rounded-2xl"
                    >
                        <option value="">-</option>
                        <option value="1">High</option>
                        <option value="2">Medium</option>
                        <option value="3">Low</option>
                    </select>

                    <button type="submit" className="w-full my-10 p-2 bg-accent border rounded-2xl cursor-pointer hover:text-background">
                        <Check className="mx-auto" />
                    </button>
                </form>
            </section>

            <ConfirmDeleteDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                onConfirm={() => {
                    handleDelete("tasks", route);
                    setShowDeleteDialog(false)
                }}
                recordType="task"
            />
        </>
    );
}
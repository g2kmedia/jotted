"use client"

import { useTaskStore } from "@/lib/stores";
import { useEffect, useRef, useState } from "react";
import type { localTask } from "@/lib/types";
import { useDebouncedCallback, useDeleteRecord, useTagsUpdate } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { deleteTaskLocally, getTaskLocally, queueChanges, saveTaskLocally } from "@/lib/indexeddb";
import { offlineSaveAndSync, syncPendingChanges } from "@/lib/sync";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, CalendarOff, CircleCheck, CloudCheck, RotateCcw, Save, Trash2 } from "lucide-react";
import TagsInput from "@/app/components/TagsInput";
import ConfirmDeleteDialog from "@/app/components/ConfirmDeleteDialog";

export default function TaskEditorPage(
    { taskId }: { taskId: string }
) {
    const {
        tasks,
        appendNewTasks,
        updateTask
    } = useTaskStore();

    const [tags, setTags] = useState<string[]>([]);
    const [saveStatus, setSaveStatus] = useState<"synced" | "saved" | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const titleRef = useRef<HTMLInputElement>(null);
    const pendingUpdatesRef = useRef<Partial<localTask>>({});

    const handleTagsUpdate = useTagsUpdate({ recordType: "tasks", recordId: taskId, setTags, setSaveStatus });
    const { handleTrash, handleDelete } = useDeleteRecord();

    const task = tasks?.find((t) => t.id === taskId) ?? null;
    const taskRef = useRef(task);
    taskRef.current = task;

    const router = useRouter();

    useEffect(() => {
        titleRef.current?.focus();
    }, [taskId]);

    useEffect(() => {
        return () => {
            const t = taskRef.current;
            if (t && !t.title?.trim() && !t.content?.trim()) {
                deleteEmptyTask();
            }
        };
    }, []);

    useEffect(() => {
        const loadTask = async (): Promise<void> => {
            if (navigator.onLine) {
                try {
                    const res = await fetch(`/api/tasks/${taskId}`, { method: "GET" });

                    const taskData = await res.json();

                    // Cache task to IndexedDB
                    await saveTaskLocally({
                        ...taskData.task,
                        id: taskId,
                        tags: taskData.tags ?? []
                    });

                    appendNewTasks([taskData.task]);
                    setTags(taskData.tags ?? []);

                } catch (error) {
                    console.error("Failed to fetch task:", error);
                    throw error;
                }
            } else {
                try {
                    const taskData = await getTaskLocally(taskId);

                    if (taskData) {
                        appendNewTasks([taskData]);
                        setTags(taskData.tags ?? []);
                        return;
                    }

                } catch (error) {
                    console.error("Local DB fail:", error);
                }
            }
        }

        loadTask();
    }, [taskId]);

    useEffect(() => {
        const handleSyncCompleted = () => {
            if (saveStatus === "saved") {
                setSaveStatus("synced");
            }
        };

        window.addEventListener('sync-completed', handleSyncCompleted);

        return () => window.removeEventListener('sync-completed', handleSyncCompleted);
    }, [saveStatus]);

    const completeTask = async (): Promise<void> => {
        const currentCompletionStatus = task!.is_completed;
        const newCompletionStatus = task!.is_completed === 0 ? 1 : 0;

        // Optimistically update
        updateTask(taskId, { is_completed: newCompletionStatus });

        try {
            await offlineSaveAndSync(
                taskId,
                "tasks",
                "update",
                {
                    is_completed: newCompletionStatus,
                    tags: task?.tags // always sending the current tags because API would otherwise delete them
                },
                setSaveStatus
            );
        } catch (error) {
            // Rollback on error
            updateTask(taskId, { is_completed: currentCompletionStatus });

            console.error("Failed to mark as completed:", error);
            toast.error("Failed to mark as completed");
        }

        toast.success(newCompletionStatus === 1 ? "Marked as Completed" : "Marked as Uncompleted");
        router.push("/tasks");
    }

    const debouncedSave = useDebouncedCallback<Partial<localTask>>(
        async (updates) => {
            try {
                await offlineSaveAndSync(
                    taskId,
                    "tasks",
                    "update",
                    {
                        ...updates,
                        tags: task?.tags // always sending the current tags because API would otherwise delete them
                    },
                    setSaveStatus
                );

                pendingUpdatesRef.current = {};
            } catch (error) {
                toast.error("Failed to save task", { id: "save-task-error" });
            }
        }, 500
    )

    const handleTaskChange = (e: React.ChangeEvent<HTMLFormElement>): void => {
        setSaveStatus(null);

        const formData = new FormData(e.currentTarget);
        const formObject = Object.fromEntries(formData);

        const { date, time, priority, ...rest } = formObject;

        if (!date && time) {
            toast.error("Please select a date to set a time");
            return;
        }

        let dueDate: string | null = null;

        if (date && time) {
            dueDate = new Date(`${date}T${time}`).toISOString();
        } else if (date && !time) {
            dueDate = new Date(`${date}T00:00`).toISOString();
        }

        const taskUpdate: Partial<localTask> = {
            ...rest,
            due_date: dueDate,
            priority: priority ? Number(priority) : null
        }

        // Optimistic UI update needed for deleteEmptyTask logic
        updateTask(taskId, { ...taskUpdate })

        debouncedSave(taskUpdate);
    }

    const handleClearDateTime = (): void => {
        const form = document.querySelector("form");
        const dateInput = form?.querySelector('[name="date"]') as HTMLInputElement;
        const timeInput = form?.querySelector('[name="time"]') as HTMLInputElement;

        if (dateInput) dateInput.value = "";
        if (timeInput) timeInput.value = "";

        debouncedSave({ due_date: null });
    }

    const deleteEmptyTask = async (): Promise<void> => {
        try {
            await deleteTaskLocally(taskId);

            await queueChanges({
                recordId: `task-${taskId}`,
                recordType: "tasks",
                operation: "delete",
                data: { id: taskId }
            });

            if (navigator.onLine) syncPendingChanges();

        } catch (error) {
            console.error("Failed to delete empty task:", error);
        }
    }

    if (!task) return null;

    return (
        <>
            <nav className="mx-2 px-2 h-16 flex flex-col items-center border-b-1 border-foreground bg-background">
                <ul className="h-full flex justify-between items-center w-full">
                    <li>
                        <Link href={"/tasks"}>
                            <ArrowLeft className="hover:cursor-pointer lg:hidden" />
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
                                onClick={() => handleTrash("tasks", taskId, tags, task.is_trashed!)}
                                className="text-accent hover:cursor-pointer"
                            />
                        )}
                    </li>
                    <li>
                        <Trash2
                            onClick={() => task.is_trashed === 0
                                ? handleTrash("tasks", taskId, tags, task.is_trashed)
                                : setShowDeleteDialog(true)
                            }
                            className="text-destructive hover:cursor-pointer"
                        />
                    </li>
                </ul>
            </nav>

            <div className="h-6 my-1 py-1 flex items-center justify-center bg-background text-muted-foreground/50">
                {saveStatus === "synced" && <CloudCheck />}
                {saveStatus === "saved" && <Save />}
                {!saveStatus && <span>{'\u00A0'}</span>}
            </div>

            <section className="p-2">
                <TagsInput tags={tags} onBlur={handleTagsUpdate} />
                <form onChange={handleTaskChange} className="flex flex-col">
                    <label htmlFor="title"></label>
                    <input
                        ref={titleRef}
                        id="title"
                        name="title"
                        type="text"
                        defaultValue={task.title}
                        placeholder="Title"
                        className="w-full mt-2 mb-10 py-2 font-titles font-bold text-3xl outline-none"
                    />

                    <label htmlFor="content" className="text-muted-foreground">DESCRIPTION</label>
                    <textarea
                        id="content"
                        name="content"
                        defaultValue={task.content}
                        placeholder="Add a description..."
                        className="h-30 w-full my-2 py-2 resize-none border-b-1 outline-none"
                    />

                    <fieldset className="mt-10 mb-4 grid grid-cols-[auto_auto_1fr]">
                        <label htmlFor="date" className="text-muted-foreground">DATE</label>
                        <label htmlFor="time" className="text-muted-foreground">TIME</label>
                        <label htmlFor="clear-date-time" className="ml-10 text-muted-foreground">CLEAR</label>

                        <input
                            id="date"
                            name="date"
                            type="date"
                            defaultValue={task.due_date ? new Date(task.due_date).toLocaleDateString("en-CA") : ""} // en-CA for formatting purposes
                            className="w-34 my-2 mr-8 outline-none hover:cursor-pointer"
                        />

                        <input
                            id="time"
                            name="time"
                            type="time"
                            defaultValue={task.due_date ? new Date(task.due_date).toTimeString().slice(0, 5) : ""}
                            className="w-20 my-2 outline-none hover:cursor-pointer"
                        />

                        <button
                            id="clear-date-time"
                            type="button"
                            onClick={handleClearDateTime}
                            className="ml-10 my-2 hover:cursor-pointer"
                        >
                            <CalendarOff />
                        </button>
                    </fieldset>

                    <label htmlFor="priority" className="text-muted-foreground">Priority</label>
                    <select
                        id="priority"
                        name="priority"
                        defaultValue={task.priority ?? undefined}
                        className="w-25 py-2 hover:cursor-pointer"
                    >
                        <option value="">None</option>
                        <option value="1">High</option>
                        <option value="2">Medium</option>
                        <option value="3">Low</option>
                    </select>
                </form>
            </section>

            <ConfirmDeleteDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                onConfirm={() => {
                    handleDelete("tasks", taskId);
                    setShowDeleteDialog(false)
                }}
                recordType="task"
            />
        </>
    );
}
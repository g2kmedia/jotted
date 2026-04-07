"use client"

import ConfirmDeleteDialog from "@/app/components/ConfirmDeleteDialog";
import TagsInput from "@/app/components/TagsInput";
import { useDebouncedCallback, useDeleteRecord, useTagsUpdate } from "@/lib/hooks";
import { deleteTaskLocally, getTaskLocally, queueChanges, saveTaskLocally } from "@/lib/indexeddb";
import { useTaskStore } from "@/lib/stores";
import { offlineSaveAndSync, syncPendingChanges } from "@/lib/sync";
import type { localTask, Task } from "@/lib/types";
import { ArrowLeft, CalendarOff, CircleCheck, CloudCheck, RotateCcw, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function Task(
    { params }: { params: Promise<{ id: string }> }
) {
    const {
        tasks,
        appendNewTasks,
        updateTask
    } = useTaskStore();

    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const [tags, setTags] = useState<string[]>([]);
    const [saveStatus, setSaveStatus] = useState<"synced" | "saved" | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const pendingUpdatesRef = useRef<Partial<localTask>>({});

    const handleTagsUpdate = useTagsUpdate({ recordType: "tasks", recordId: currentTaskId!, setTags, setSaveStatus });
    const { handleTrash, handleDelete } = useDeleteRecord();

    const task = tasks?.find((t) => t.id === currentTaskId) ?? null;

    const router = useRouter();

    useEffect(() => {
        const getParams = async () => {
            const { id } = await params;
            setCurrentTaskId(id);
        }

        getParams();
    }, [params]);

    useEffect(() => {
        if (!currentTaskId) return;

        const loadTask = async (): Promise<void> => {
            if (navigator.onLine) {
                try {
                    const res = await fetch(`/api/tasks/${currentTaskId}`, { method: "GET" });

                    const taskData = await res.json();

                    // Cache task to IndexedDB
                    await saveTaskLocally({
                        ...taskData.task,
                        id: currentTaskId,
                        tags: taskData.tags ?? []
                    });

                    appendNewTasks(taskData.task);
                    setTags(taskData.tags ?? []);

                } catch (error) {
                    console.error("Failed to fetch task:", error);
                    throw error;
                }
            } else {
                try {
                    const taskData = await getTaskLocally(currentTaskId);

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
    }, [currentTaskId]);

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
        if (!currentTaskId) return;

        const currentCompletionStatus = task!.is_completed;
        const newCompletionStatus = task!.is_completed === 0 ? 1 : 0;

        // Optimistically update
        updateTask(currentTaskId, { is_completed: newCompletionStatus });

        try {
            await offlineSaveAndSync(
                currentTaskId,
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
            updateTask(currentTaskId, { is_completed: currentCompletionStatus });

            console.error("Failed to mark as completed:", error);
            toast.error("Failed to mark as completed");
        }

        toast.success(newCompletionStatus === 1 ? "Marked as Completed" : "Marked as Uncompleted");
        router.push("/tasks");
    }

    const debouncedSave = useDebouncedCallback<Partial<localTask>>(
        async (updates) => {
            if (!currentTaskId) return;

            try {
                await offlineSaveAndSync(
                    currentTaskId,
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
    );

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
        updateTask(currentTaskId!, { ...taskUpdate })

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
        if (!currentTaskId) return;

        try {
            await deleteTaskLocally(currentTaskId);

            await queueChanges({
                recordId: `task-${currentTaskId}`,
                recordType: "tasks",
                operation: "delete",
                data: { id: currentTaskId }
            });

            if (navigator.onLine) syncPendingChanges();

        } catch (error) {
            console.error("Failed to delete empty task:", error);
        }
    }

    if (!task || !currentTaskId) return null;

    return (
        <>
            <nav className="mx-2 px-2 h-16 flex flex-col items-center border-b-1 border-foreground bg-background">
                <ul className="h-full flex justify-between items-center w-full">
                    <li>
                        <Link
                            href={"/tasks"}
                            onClick={() => {
                                if (!task.title?.trim() && !task.content?.trim()) {
                                    deleteEmptyTask();
                                }
                            }}
                        >
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
                                onClick={() => handleTrash("tasks", currentTaskId, tags, task.is_trashed!)}
                                className="text-accent hover:cursor-pointer"
                            />
                        )}
                    </li>
                    <li>
                        <Trash2
                            onClick={() => task.is_trashed === 0
                                ? handleTrash("tasks", currentTaskId, tags, task.is_trashed)
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
                <TagsInput tags={tags} onBlur={handleTagsUpdate} className="slide-in-right" />
                <form onChange={handleTaskChange} className="flex flex-col slide-in-bottom">
                    <label htmlFor="title"></label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        defaultValue={task.title}
                        placeholder="Title"
                        className="w-full my-2 p-2 border rounded-2xl outline-none"
                    />

                    <label htmlFor="content"></label>
                    <textarea
                        id="content"
                        name="content"
                        defaultValue={task.content}
                        placeholder="Description"
                        className="h-20 w-full my-2 p-2 border rounded-2xl resize-none outline-none"
                    />

                    <fieldset className="my-2 grid grid-cols-[auto_auto_auto] justify-items-center">
                        <label htmlFor="date">Date</label>
                        <label htmlFor="time">Time</label>
                        <label htmlFor="clear-date-time">Clear</label>

                        <input
                            id="date"
                            name="date"
                            type="date"
                            defaultValue={task.due_date ? new Date(task.due_date).toLocaleDateString("en-CA") : ""} // en-CA for formatting purposes
                            className="w-40 my-2 p-2 text-center border rounded-2xl outline-none hover:cursor-pointer"
                        />

                        <input
                            id="time"
                            name="time"
                            type="time"
                            defaultValue={task.due_date ? new Date(task.due_date).toTimeString().slice(0, 5) : ""}
                            className="w-20 my-2 p-2 text-center border rounded-2xl outline-none hover:cursor-pointer"
                        />

                        <button
                            id="clear-date-time"
                            type="button"
                            onClick={handleClearDateTime}
                            className="my-2 p-2 border rounded-2xl hover:bg-foreground hover:text-background hover:cursor-pointer"
                        >
                            <CalendarOff />
                        </button>
                    </fieldset>

                    <label htmlFor="priority" className="w-full my-2 text-center">Priority</label>
                    <select
                        id="priority"
                        name="priority"
                        defaultValue={task.priority ?? undefined}
                        className="w-40 self-center text-center p-2 border rounded-2xl hover:cursor-pointer"
                    >
                        <option value="">-</option>
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
                    handleDelete("tasks", currentTaskId);
                    setShowDeleteDialog(false)
                }}
                recordType="task"
            />
        </>
    );
}
"use client"

import type { Task } from "@/lib/types";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function Task(
    { params }: { params: Promise<{ id: string }> }
) {
    const [route, setRoute] = useState<string | null>(null);
    const [task, setTask] = useState<Task | undefined>(undefined);
    const [tags, setTags] = useState<string[]>([]);
    const inputTagsRef = useRef<HTMLInputElement>(null);

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
            const res = await fetch(`/api/tasks/${route}?columns=title,content,due_date,priority&tags=true`, { method: "GET" });

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
        } catch (error) {
            console.error("Failed to update task:", error);
            toast.error("Failed to save task. Please try again.");
        }
    }

    const handleTagsChange = async (): Promise<void> => {
        let inputArr;

        if (!inputTagsRef.current?.value) {
            inputArr = [""];
        } else {
            inputArr = inputTagsRef.current.value.trim().split(/\s+/);
        }

        const newTags: string[] = [];

        for (const input of inputArr) {
            if (
                (
                    input.startsWith("#") &&
                    input.length > 1 &&
                    input.indexOf("#", 1) === -1 // Only a single "#" allowed
                ) ||
                input === ""
            ) {
                newTags.push(input);
            } else {
                toast.error("Invalid tags");
                return;
            }
        }

        try {
            const res = await fetch(`/api/tasks/tags/${route}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    updates: newTags,
                    currentTags: tags
                })
            });

            if (!res.ok) {
                throw new Error(`Failed to update tags: ${res.status}`)

            }

            setTags(newTags)
            toast.success("Tags updated");

        } catch (error) {
            console.error("Failed to update tags:", error);
            toast.error("Failed to update tags. Please try again.");
        }
    }

    if (!task) return null;

    return (
        <section className="p-2">
            <div className="flex">
                <input
                    ref={inputTagsRef}
                    type="text"
                    defaultValue={tags?.join(" ")}
                    placeholder="add tags..."
                    className="w-full text-right font-light text-muted-foreground outline-hidden peer"
                />
                <button onMouseDown={handleTagsChange} className="w-0 peer-focus:w-auto peer-focus:px-2 opacity-0 peer-focus:opacity-100 overflow-hidden transition-opacity cursor-pointer hover:text-accent">
                    <Check />
                </button>
            </div>
            <form onSubmit={handleTaskChange} className="flex flex-col">
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
    );
}
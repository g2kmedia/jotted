"use client"

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Task(
    { params }: { params: Promise<{ id: string }> }
) {
    const [route, setRoute] = useState<string | null>(null);

    useEffect(() => {
        const getParams = async () => {
            const { id } = await params;
            setRoute(id);
        }

        getParams();
    }, [params]);
    
    const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const description = formData.get("description");
        const date = formData.get("date");
        const time = formData.get("time") || "00:00";
        const priority = formData.get("priority");

        const taskData = {
            title: formData.get("title"),
            ...(description && { content: description }),
            ...(date && { dueDate: new Date(`${date}T${time}`).toISOString() }),
            ...(priority !== null && { priority: priority === "" ? null : Number(priority) })
        };

        console.log(taskData)

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

    return (
        <section className="p-2">
            <div>
                <input
                    type="text"
                    defaultValue="tbd tags"
                    placeholder="add tags..."
                    className="w-full text-right font-light text-muted-foreground outline-hidden peer"
                />
                <button className="w-0 peer-focus:w-auto peer-focus:px-2 opacity-0 peer-focus:opacity-100 overflow-hidden transition-opacity cursor-pointer hover:text-accent">
                    <Check />
                </button>
            </div>
            <form onSubmit={handleAddTask} className="flex flex-col">
                <label htmlFor="title"></label>
                <input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="Title"
                    className="w-full my-2 p-2 border rounded-2xl outline-none"
                />

                <label htmlFor="description"></label>
                <textarea
                    id="description"
                    name="description"
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
                        className="w-40 my-2 p-2 text-center border rounded-2xl outline-none"
                    />

                    <input
                        id="time"
                        name="time"
                        type="time"
                        className="w-40 my-2 p-2 text-center border rounded-2xl outline-none"
                    />
                </fieldset>

                <label htmlFor="priority" className="w-full my-2 text-center">Priority</label>
                <select
                    id="priority"
                    name="priority"
                    className="w-40 self-center text-center p-2 border rounded-2xl"
                >
                    <option value="">-</option>
                    <option value="2">Low</option>
                    <option value="1">Medium</option>
                    <option value="0">High</option>
                </select>

                <button type="submit" className="w-full my-10 p-2 bg-accent border rounded-2xl cursor-pointer hover:text-background">
                    <Check className="mx-auto" />
                </button>
            </form>
        </section>
    );
}
import { useTaskStore } from "@/lib/stores";
import { localTask } from "@/lib/types";
import { Circle } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";

const TASK_PRIORITY_LABELS: Record<number, string> = {
    1: "High",
    2: "Medium",
    3: "Low"
};

const getDueDateDisplay = (task: localTask, now: DateTime) => {
    if (!task.due_date) return null;

    const dueDate = new Date(task.due_date);
    const dueDateLuxon = DateTime.fromJSDate(dueDate);

    const isAllDay = dueDate.getHours() === 0 && dueDate.getMinutes() === 0;
    const isOverdue = isAllDay ? dueDateLuxon.startOf("day") < now.startOf("day") : dueDateLuxon < now;

    return { dueDate, isAllDay, isOverdue };
}

export default function TaskItem({ task, now }: {
    task: localTask,
    now: DateTime
}) {
    const { completeTask } = useTaskStore();
    const due = getDueDateDisplay(task, now);

    return (
        <Link href={`/tasks/${task.id}`}>
            <article className={`max-h-22 py-2 mb-2 flex flex-row border-b-1 ${task.is_completed === 1 ? "text-muted-foreground" : ""}`}>
                <button onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    completeTask(task.id, task.is_completed);
                }}>
                    <Circle size={16} className={`mr-2 ${task.is_completed === 1 ? "fill-foreground" : ""} hover:fill-foreground cursor-pointer`} />
                </button>
                <div className="flex flex-col justify-between overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <h4 className="text-lg mb-1 whitespace-nowrap overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{task.title}</h4>
                    <ul className="flex gap-2 text-xs font-light text-secondary-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {due && (due.isAllDay ? (
                            <li className={due.isOverdue ? "text-destructive uppercase" : "uppercase"}>
                                {due.dueDate.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                            </li>
                        ) : (
                            <>
                                <li className={due.isOverdue ? "text-destructive uppercase" : "uppercase"}>
                                    {due.dueDate.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                                </li>
                                <li className={due.isOverdue ? "text-destructive" : ""}>
                                    {due.dueDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                                </li>
                            </>
                        ))}
                        {task.priority && (
                            <li>{TASK_PRIORITY_LABELS[task.priority]}</li>
                        )}
                    </ul>
                    {task.tags &&
                        <ul className="flex gap-2 text-xs font-light text-secondary-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {task.tags.map((tag, index) => (
                                <li key={index}>#{tag}</li>
                            ))}
                        </ul>
                    }
                </div>
            </article>
        </Link>
    );
}
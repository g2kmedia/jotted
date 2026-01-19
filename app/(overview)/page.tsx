"use client"

import { NoteWithTags, TaskWithTags } from "@/lib/types";
import { Circle, Pin } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const TASK_PRIORITY_LABELS: Record<number, string> = {
  1: "High",
  2: "Medium",
  3: "Low"
};

const now = DateTime.now();

export default function Home() {
  const [tasks, setTasks] = useState<Partial<TaskWithTags>[] | undefined>(undefined);
  const [notes, setNotes] = useState<Partial<NoteWithTags>[] | undefined>(undefined);

  const loadTasks = async (): Promise<void> => {
    const url = new URL("/api/tasks", window.location.origin);
    url.searchParams.set("columns", "id,title,due_date,priority,is_completed");
    url.searchParams.set("is_completed", "0");

    const startOfDay = now.startOf("day").toISO();
    const endOfDay = now.endOf("day").toISO();

    // url.searchParams.set("due_date_start", startOfDay); --> not needed so that overdue tasks show
    url.searchParams.set("due_date_end", endOfDay);

    const finalUrl = url.pathname + url.search;

    try {
      const res = await fetch(finalUrl, { method: "GET" });

      if (!res.ok) {
        throw new Error(`Failed to fetch tasks: ${res.status}`);
      }

      const { tasks: newTasks } = await res.json();

      if (newTasks.length === 0) {
        setTasks([]);
        return;
      }

      setTasks(newTasks);

    } catch (error) {
      console.error("Failed to load tasks:", error);
    }
  }

  const loadNotes = async (): Promise<void> => {
    const url = new URL("/api/notes", window.location.origin);
    url.searchParams.set("columns", "id,title,is_pinned");
    url.searchParams.set("is_pinned", "1");

    const finalUrl = url.pathname + url.search;

    try {
      const res = await fetch(finalUrl, { method: "GET" });

      if (!res.ok) {
        throw new Error(`Failed to fetch notes: ${res.status}`);
      }

      const { notes: newNotes } = await res.json();

      if (newNotes === 0) {
        setNotes([]);
        return;
      }

      setNotes(newNotes);

    } catch (error) {
      console.error("Failed to load notes:", error);
    }
  }

  useEffect(() => {
    loadTasks();
    loadNotes();
  }, []);

  const completeTask = async (e: React.MouseEvent<HTMLButtonElement>, id: number | undefined, isCompleted: number | undefined): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();

    const newCompletedStatus = isCompleted === 0 ? 1 : 0;

    // Optimistically update UI
    setTasks(prev => prev?.map(task =>
      task.id === id ? { ...task, is_completed: newCompletedStatus } : task
    ));

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_completed: newCompletedStatus })
      });

      if (!res.ok) {
        // Rollback on error
        setTasks(prev => prev?.map(task =>
          task.id === id ? { ...task, is_completed: isCompleted } : task
        ));
      }
    } catch (error) {
      // Rollback on error
      setTasks(prev => prev?.map(task =>
        task.id === id ? { ...task, is_completed: isCompleted } : task
      ));

      toast.error("Failed to update task");
    }
  }

  if (!tasks || !notes) return null;

  return (
    <div className={`grid grid-rows-[${tasks.length === 0 ? "auto" : "1fr"}_auto_${notes.length === 0 ? "auto" : "1fr"}_auto] h-full`}>
      <section className="overflow-y-auto min-h-0">
        {tasks.length === 0 ? (
          <h1 className="text-xl">No tasks for today</h1>
        ) : (
          <>
            <h1 className="sticky top-0 z-10 bg-background mb-1 text-xl">
              Today's tasks <span className="text-muted-foreground italic">({tasks.length})</span>
            </h1>
            <section>
              {tasks.map((task) => {
                return (
                  <Link href={`/tasks/${task.id}`} key={task.id}>
                    <article className={`grid grid-cols-[auto_1fr] gap-4 min-h-22 mb-2 p-4 border-1 border-foreground rounded-lg ${task.is_completed === 1 ? "text-muted-foreground" : ""}`}>
                      <button
                        onClick={(e) => completeTask(e, task.id, task.is_completed)}
                        className="self-center"
                      >
                        <Circle className={`${task.is_completed === 1 ? "fill-foreground" : ""} hover:fill-foreground cursor-pointer`} />
                      </button>
                      <div>
                        <h3 className="text-lg mb-1">{task.title}</h3>
                        <ul className="flex text-sm mb-2">
                          {task.due_date && (() => {
                            const dueDate = new Date(task.due_date);
                            const dueDateLuxon = DateTime.fromJSDate(dueDate);

                            if (dueDate.getHours() === 0 && dueDate.getMinutes() === 0) {
                              return <li className={`pr-2 ${dueDateLuxon.startOf("day") < now.startOf("day") ? "text-destructive" : ""}`}>{dueDate.toLocaleDateString("en-CA")}</li>;
                            }

                            return (
                              <>
                                <li className={`pr-2 ${dueDateLuxon < now ? "text-destructive" : ""}`}>{dueDate.toLocaleDateString("en-CA")}</li>
                                <li className={`pr-5 ${dueDateLuxon < now ? "text-destructive" : ""}`}>{dueDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</li>
                              </>
                            );
                          }
                          )()}
                          {task.priority && (
                            <li>{TASK_PRIORITY_LABELS[task.priority]}</li>
                          )}
                        </ul>
                        <ul className="flex gap-2 text-sm font-light text-muted-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {task.tags?.map((tag, index) => (
                            <li key={index}>#{tag}</li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </section>
          </>
        )}
      </section>

      <div className="my-3 border-b-1 border-foreground"></div>

      <section className="overflow-y-auto min-h-0">
        {notes.length === 0 ? (
          <h1 className="pb-3 boborder-foreground text-xl">No pinned notes</h1>
        ) : (
          <>
            <h1 className="sticky top-0 z-10 bg-background mb-1 text-xl">
              Pinned notes <span className="text-muted-foreground italic">({notes.length})</span>
            </h1>
            <section>
              {notes.map((note) => {
                return (
                  <Link href={`/notes/${note.id}`} key={note.id}>
                    <article className="h-22 mb-2 p-4 border-1 border-foreground rounded-lg">
                      <div className="flex justify-between">
                        <h3 className="text-lg mb-1">{note.title}</h3>
                        {note.is_pinned === 1 ? <Pin size={18} /> : ""}
                      </div>
                      <ul className="flex gap-2 text-sm font-light text-muted-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {note.tags?.map((tag, index) => (
                          <li key={index}>#{tag}</li>
                        ))}
                      </ul>
                    </article>
                  </Link>
                );
              })}
            </section>
          </>
        )
        }
      </section>

      <div className="h-16"></div>
    </div>
  );
}
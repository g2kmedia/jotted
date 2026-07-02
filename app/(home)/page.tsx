"use client"

import { getAllNotesLocally, getAllTasksLocally } from "@/lib/indexeddb";
import { offlineSaveAndSync } from "@/lib/sync";
import { localNote, localTask } from "@/lib/types";
import { Circle, CircleCheck, Pin } from "lucide-react";
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
const hour = now.hour;
const endOfDay = now.endOf("day").toISO();

const dateLabelDay = now.toFormat("cccc").toUpperCase();
const dateLabelDate = now.toFormat("MMMM d").toUpperCase();
const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";

export default function Home() {
  const [tasks, setTasks] = useState<localTask[] | null>(null);
  const [notes, setNotes] = useState<localNote[] | null>(null);

  const loadTasks = async (): Promise<void> => {
    if (navigator.onLine) {
      const url = new URL("/api/tasks", window.location.origin);
      url.searchParams.set("is_completed", "0");
      url.searchParams.set("is_trashed", "0");
      url.searchParams.set("due_date_end", endOfDay);

      try {
        const res = await fetch(url, { method: "GET" });

        if (!res.ok) {
          throw new Error(`Failed to fetch tasks: ${res.status}`);
        }

        const { tasks: tasksToday } = await res.json();

        if (tasksToday.length === 0) {
          setTasks([]);
          return;
        }

        setTasks(tasksToday);

      } catch (error) {
        console.error("Failed to load tasks from server:", error);
      }
    } else {
      try {
        const tasksToday = await getAllTasksLocally(
          "today",
          endOfDay,
          null,
          [],
          100
        );

        if (tasksToday.length === 0) {
          setTasks([]);
          return;
        }

        const sortByDueDate = tasksToday.sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
        setTasks(sortByDueDate);

      } catch (error) {
        console.error("Failed to load tasks locally:", error);
      }
    }
  }

  const loadNotes = async (): Promise<void> => {
    if (navigator.onLine) {
      const url = new URL("/api/notes", window.location.origin);
      url.searchParams.set("is_pinned", "1");

      try {
        const res = await fetch(url, { method: "GET" });

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
        console.error("Failed to load notes from server:", error);
      }
    } else {
      try {
        const pinnedNotes = await getAllNotesLocally(
          "pinned",
          null,
          [],
          50
        );

        if (pinnedNotes.length === 0) {
          setNotes([]);
        }

        setNotes(pinnedNotes);

      } catch (error) {
        console.error("Failed to load notes locally:", error);
      }
    }
  }

  useEffect(() => {
    loadTasks();
    loadNotes();
  }, []);

  const completeTask = async (e: React.MouseEvent<HTMLButtonElement>, id: string, isCompleted: number): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();

    const newCompletedStatus = isCompleted === 0 ? 1 : 0;

    // Optimistically update UI
    setTasks(prev => prev ? prev.map(task => {
      return task.id === id ? { ...task, is_completed: newCompletedStatus } : task;
    }
    ) : prev);

    try {
      await offlineSaveAndSync(
        id,
        "tasks",
        "update",
        { is_completed: newCompletedStatus }
      );
    } catch (error) {
      // Rollback on error
      setTasks(prev => prev ? prev.map(task => {
        return task.id === id ? { ...task, is_completed: isCompleted } : task;
      }
      ) : prev);

      toast.error("Failed to update task");
    }
  }

  if (!tasks || !notes) return null;

  return (
    <div className="h-full mb-30 flex flex-col overflow-y-auto">
      <section className="mt-4 mb-8">
        <p className="text-xs text-muted-foreground font-titles">{dateLabelDay}, {dateLabelDate}</p>
        <h1 className="mt-4 text-4xl font-light font-hero">{greeting}</h1>
      </section>

      <section>
        <div>
          <h1 className="text-4xl font-hero font-extrabold text-accent">{tasks.length}</h1>
          <h2 className="text-muted-foreground">TASKS FOR TODAY</h2>
          <div className="w-10 h-1 my-2 bg-accent"></div>
          {tasks.length <= 0 &&
            <div className="flex flex-col my-12">
              <>
                <CircleCheck strokeWidth={"1"} size={48} className="w-full text-accent" />
                <h3 className="text-center text-lg">No tasks for today</h3>
                <p className="text-center text-sm mt-2 text-muted-foreground">
                  Enjoy your day and add a new task
                  <br />
                  when something comes up.
                </p>
              </>
            </div>
          }
        </div>
        {tasks.map((task) => {
          return (
            <Link href={`/tasks/${task.id}`} key={task.id}>
              <article className={`max-h-22 py-2 mb-2 flex flex-row border-b-1 ${task.is_completed === 1 ? "text-muted-foreground" : ""}`}>
                <button onClick={(e) => completeTask(e, task.id, task.is_completed)}>
                  <Circle size={16} className={`mr-2 ${task.is_completed === 1 ? "fill-foreground" : ""} hover:fill-foreground cursor-pointer`} />
                </button>
                <div className="flex flex-col justify-between overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <h4 className="text-lg mb-1 whitespace-nowrap overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{task.title}</h4>
                  <ul className="flex gap-2 text-xs font-light text-secondary-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {task.due_date && (() => {
                      const dueDate = new Date(task.due_date);
                      const dueDateLuxon = DateTime.fromJSDate(dueDate);

                      if (dueDate.getHours() === 0 && dueDate.getMinutes() === 0) {
                        return <li className={`uppercase ${dueDateLuxon.startOf("day") < now.startOf("day") ? "text-destructive" : ""}`}>{dueDate.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</li>;
                      }

                      return (
                        <>
                          <li className={`uppercase ${dueDateLuxon < now ? "text-destructive" : ""}`}>{dueDate.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</li>
                          <li className={`${dueDateLuxon < now ? "text-destructive" : ""}`}>{dueDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</li>
                        </>
                      );
                    }
                    )()}
                    {task.priority && (
                      <li>{TASK_PRIORITY_LABELS[task.priority]}</li>
                    )}
                  </ul>
                  <ul className="flex gap-2 text-xs font-light text-secondary-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

      <section className="mt-4">
        {notes.length > 0 &&
          <>
            <div>
              <h1 className="text-4xl font-hero font-extrabold text-accent">{notes.length}</h1>
              <h2 className="text-muted-foreground">PINNED NOTES</h2>
              <div className="w-10 h-1 my-2 bg-accent"></div>
            </div>
            <section>
              {notes.map((note) => {
                return (
                  <Link href={`/notes/${note.id}`} key={note.id}>
                    <article className="max-h-22 py-2 mb-2 flex flex-row border-b-1">
                      <div className="flex flex-col justify-between overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <h4 className="flex items-center text-lg mb-1 whitespace-nowrap overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {note.title}
                          {note.is_pinned === 1 && <span><Pin size={14} className="ml-2 text-secondary-foreground" /></span>}
                        </h4>
                        {note.tags &&
                          <ul className="flex gap-2 text-xs font-light text-secondary-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {note.tags.map((tag, index) => (
                              <li key={index}>#{tag}</li>
                            ))}
                          </ul>
                        }
                      </div>
                    </article>
                  </Link>
                );
              })}
            </section>
          </>
        }
      </section>
    </div>
  );
}
"use client"

import { getAllNotesLocally, getAllTasksLocally } from "@/lib/indexeddb";
import { offlineSaveAndSync } from "@/lib/sync";
import { localNote, localTask } from "@/lib/types";
import { Circle, Pin } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import TopNavbar from "../components/TopNavbar";
import BottomNavbar from "../components/BottomNavbar";

const TASK_PRIORITY_LABELS: Record<number, string> = {
  1: "High",
  2: "Medium",
  3: "Low"
};

const now = DateTime.now();
const endOfDay = now.endOf("day").toISO();

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
    <>
      <header className="mx-2 mb-2">
        <TopNavbar />
      </header>

      <section>
        {tasks.length === 0 ? (
          <h1 className="text-xl slide-in-left">No tasks for today</h1>
        ) : (
          <>
            <h1 className="bg-background px-1.5 pb-1.5 text-xl slide-in-left">
              Today's tasks <span className="text-muted-foreground italic">({tasks.length})</span>
            </h1>
            <section className="slide-in-right">
              {tasks.map((task) => {
                return (
                  <Link href={`/tasks/${task.id}`} key={task.id}>
                    <article className={`grid grid-cols-[auto_1fr] gap-4 min-h-22 mb-2 p-2 border-1 border-foreground rounded-lg ${task.is_completed === 1 ? "text-muted-foreground" : ""}`}>
                      <button
                        onClick={(e) => completeTask(e, task.id, task.is_completed)}
                        className="self-center"
                      >
                        <Circle className={`${task.is_completed === 1 ? "fill-foreground" : ""} hover:fill-foreground cursor-pointer`} />
                      </button>
                      <div>
                        <h3 className="text-lg mb-1 truncate">{task.title}</h3>
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

      <div className="py-2 border-b-1 border-foreground"></div>

      <section>
        {notes.length === 0 ? (
          <h1 className="pt-2 mb-4 boborder-foreground text-xl slide-in-left">No pinned notes</h1>
        ) : (
          <>
            <h1 className="bg-background p-1.5 text-xl slide-in-left">
              Pinned notes <span className="text-muted-foreground italic">({notes.length})</span>
            </h1>
            <section className="slide-in-right">
              {notes.map((note) => {
                return (
                  <Link href={`/notes/${note.id}`} key={note.id}>
                    <article className="h-22 mb-2 p-2 border-1 border-foreground rounded-lg">
                      <div className="flex justify-between">
                        <h3 className="text-lg mb-1 truncate">{note.title}</h3>
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

      <div className="h-18"></div>

      <footer className="fixed bottom-0 left-0 right-0 pb-4 px-2 bg-transparent lg:ml-2 lg:w-1/4 lg:max-w-md lg:min-w-sm"> {/* ml-2 used as offset for main's mx-2 */}
        <BottomNavbar />
      </footer>
    </>
  );
}
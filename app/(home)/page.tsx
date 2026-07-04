"use client"

import { getAllNotesLocally, getAllTasksLocally } from "@/lib/indexeddb";
import { localNote, localTask } from "@/lib/types";
import { CircleCheck } from "lucide-react";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import TaskItem from "../components/TaskItem";
import NoteItem from "../components/NoteItem";

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
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} now={now} />
        ))}
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
              {notes.map((note) => (
                <NoteItem key={note.id} note={note} />
              ))}
            </section>
          </>
        }
      </section>
    </div>
  );
}
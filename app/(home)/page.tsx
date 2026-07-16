"use client"

import { loadAllTasks } from "@/lib/tasks-client";
import { loadAllNotes } from "@/lib/notes-client";
import { CircleCheck } from "lucide-react";
import { DateTime } from "luxon";
import { useEffect } from "react";
import TaskItem from "../components/TaskItem";
import NoteItem from "../components/NoteItem";
import { useNoteStore, useTaskStore } from "@/lib/stores";

const now = DateTime.now();
const hour = now.hour;

const dateLabelDay = now.toFormat("cccc").toUpperCase();
const dateLabelDate = now.toFormat("MMMM d").toUpperCase();
const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";

export default function Home() {
  const { tasks } = useTaskStore();
  const { notes } = useNoteStore();

  useEffect(() => {
    loadAllTasks(true, now, undefined, true, "today");
    loadAllNotes(true, undefined, "pinned");
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
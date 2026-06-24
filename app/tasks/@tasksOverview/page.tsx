"use client"

import Link from "next/link";
import { Circle } from 'lucide-react';
import { useEffect } from "react";
import { DateTime } from "luxon";
import { toast } from "sonner";
import TagsBar from "@/app/components/TagsBar";
import { getAllTasksLocally, getAllTasksTagsLocally, getTaskCountsLocally } from "@/lib/indexeddb";
import { offlineSaveAndSync } from "@/lib/sync";
import { useTagsStore, useTaskStore } from "@/lib/stores";

const TASK_PRIORITY_LABELS: Record<number, string> = {
  1: "High",
  2: "Medium",
  3: "Low"
};

const now = DateTime.now();

export default function TasksOverview() {
  const {
    tasks,
    taskCounts,
    lastQueriedRecord,
    hasMore,
    quickFilter,
    tags,
    setTasks,
    setTaskCounts,
    appendNewTasks,
    updateTask,
    setLastQueriedRecord,
    setHasMore,
    setQuickFilter,
    setTags
  } = useTaskStore();

  const { activeTags, toggleActiveTag } = useTagsStore();

  const loadTasks = async (resetStates = false): Promise<void> => {
    if (resetStates) {
      setTasks(null);
      setLastQueriedRecord(null);
      setHasMore(true);
    }

    if (!hasMore && !resetStates) return;

    if (navigator.onLine) {
      const url = new URL("/api/tasks", window.location.origin);

      if (quickFilter === "completed") {
        url.searchParams.set("is_completed", "1");
        url.searchParams.set("is_trashed", "0");
      } else if (quickFilter === "trashed") {
        url.searchParams.set("is_trashed", "1");
      } else {
        url.searchParams.set("is_completed", "0");
        url.searchParams.set("is_trashed", "0");
      }

      switch (quickFilter) {
        case "today":
          const endOfDay = now.endOf("day").toISO();
          url.searchParams.set("due_date_end", endOfDay);
          break;
        case "week":
          const endOfWeek = now.endOf("week").toISO();
          url.searchParams.set("due_date_end", endOfWeek);
          break;
        case "scheduled":
          url.searchParams.set("has_due_date", "true");
          break;
        case "later":
          url.searchParams.set("has_due_date", "false");
          break;
      }

      if (lastQueriedRecord && !resetStates) {
        url.searchParams.set("last_queried_record", JSON.stringify(lastQueriedRecord));
      }

      if (activeTags.length > 0) {
        url.searchParams.set("tags", activeTags.join());
      }

      try {
        const res = await fetch(url, { method: "GET" });

        if (!res.ok) {
          throw new Error(`Failed to fetch tasks: ${res.status}`);
        }

        const { tasks: newTasks } = await res.json();

        if (!newTasks || newTasks.length === 0) {
          setHasMore(false);

          if (resetStates || !tasks) {
            setTasks([]);
          }

          return;
        }

        resetStates || !tasks ? setTasks(newTasks) : appendNewTasks(newTasks);

        const lastRecord = newTasks[newTasks.length - 1];
        setLastQueriedRecord({ id: lastRecord.id, updated_at: lastRecord.updated_at });

      } catch (error) {
        console.error("Failed to load tasks from server:", error);
      }
    } else {
      try {
        let dueDate: string | null = null;
        quickFilter === "today" ? dueDate = now.endOf("day").toISO() : null;
        quickFilter === "week" ? dueDate = now.endOf("week").toISO() : null;

        const results = await getAllTasksLocally(
          quickFilter,
          dueDate,
          resetStates ? null : lastQueriedRecord,
          activeTags,
          20
        );

        const newTasks = results;

        if (!newTasks || newTasks.length === 0) {
          setHasMore(false);

          if (resetStates || !tasks) {
            setTasks([]);
          }

          return;
        }

        resetStates || !tasks ? setTasks(newTasks) : appendNewTasks(newTasks);

        const lastRecord = newTasks[newTasks.length - 1];
        setLastQueriedRecord({ id: lastRecord.id, updated_at: lastRecord.updated_at });
      } catch (error) {
        console.error("Failed to load tasks locally:", error);
      }
    }
  }

  // adjust according to new API and function
  const loadTaskCounts = async (): Promise<void> => {
    if (navigator.onLine) {
      try {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const url = new URL("/api/tasks/counts", window.location.origin);
        url.searchParams.set("timezone", userTimezone);

        const res = await fetch(url, { method: "GET" });

        if (!res.ok) {
          throw new Error(`Failed to fetch task counts: ${res.status}`);
        }

        const counts = await res.json();
        setTaskCounts(counts);
      } catch (error) {
        console.error("Failed to load task counts from server:", error);
      }
    } else {
      try {
        const counts = await getTaskCountsLocally();
        setTaskCounts(counts);
      } catch (error) {
        console.error("Failed to load task counts locally:", error);
      }
    }
  }

  const loadTags = async (): Promise<void> => {
    if (navigator.onLine) {
      try {
        const url = new URL("/api/tasks/tags", window.location.origin);
        url.searchParams.set("is_completed", "0");
        url.searchParams.set("is_trashed", "0");

        const res = await fetch(url, { method: "GET" });

        if (!res.ok) {
          throw new Error(`Failed to fetch tags: ${res.status}`);
        }

        const { tags } = await res.json();
        setTags(tags);

      } catch (error) {
        console.error("Failed to load tags from server:", error);
      }
    } else {
      try {
        const tags = await getAllTasksTagsLocally();

        setTags(tags);

      } catch (error) {
        console.error("Failed to load tags locally:", error);
      }
    }
  }

  useEffect(() => {
    loadTaskCounts();
  }, []);

  useEffect(() => {
    loadTasks(true); // Reset states/query params
    loadTags();
  }, [quickFilter, activeTags]);

  const completeTask = async (e: React.MouseEvent<HTMLButtonElement>, id: string, newStatus: number): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();

    const currentCompletedStatus = newStatus === 0 ? 0 : 1;
    const newCompletedStatus = newStatus === 0 ? 1 : 0;

    // Optimistically update UI
    updateTask(id, { is_completed: newCompletedStatus });

    const tags = tasks?.find(t => t.id === id)?.tags;

    try {
      await offlineSaveAndSync(
        id,
        "tasks",
        "update",
        {
          is_completed: newCompletedStatus,
          tags: tags
        }
      );
    } catch (error) {
      // Rollback on error
      updateTask(id, { is_completed: currentCompletedStatus })

      toast.error("Failed to update task");
    }
  }

  if (!tasks) return null;

  return (
    <div className="h-full flex flex-col">
      <section className="px-2 grid grid-cols-2 gap-y-2 border-b-1 pb-2">
        <button
          className={`${quickFilter === "today" ? "border-accent text-foreground" : "border-transparent text-muted-foreground"} border-b-4 cursor-pointer hover:border-accent`}
          onClick={() => setQuickFilter(quickFilter === "today" ? null : "today")}
        >
          <div className="text-xl text-left font-bold text-accent">{taskCounts.today}</div>
          <div className="text-xs text-left">TODAY</div>
        </button>
        <button
          className={`${quickFilter === "week" ? "border-accent text-foreground" : "border-transparent text-muted-foreground"} border-b-4 cursor-pointer hover:border-accent`}
          onClick={() => setQuickFilter(quickFilter === "week" ? null : "week")}
        >
          <div className="text-xl text-left font-bold text-accent">{taskCounts.week}</div>
          <div className="text-xs text-left">THIS WEEK</div>
        </button>
        <button
          className={`${quickFilter === "scheduled" ? "border-accent" : "border-transparent text-muted-foreground"} border-b-4 cursor-pointer hover:border-accent`}
          onClick={() => setQuickFilter(quickFilter === "scheduled" ? null : "scheduled")}
        >
          <div className="text-xl text-left font-bold text-accent">{taskCounts.scheduled}</div>
          <div className="text-xs text-left">SCHEDULED</div>
        </button>
        <button
          className={`${quickFilter === "later" ? "border-accent text-foreground" : "border-transparent text-muted-foreground"} border-b-4 cursor-pointer hover:border-accent`}
          onClick={() => setQuickFilter(quickFilter === "later" ? null : "later")}
        >
          <div className="text-xl text-left font-bold text-accent">{taskCounts.later}</div>
          <div className="text-xs text-left">LATER</div>
        </button>
        <button
          className={`${quickFilter === "completed" ? "border-accent text-foreground" : "border-transparent text-muted-foreground"} border-b-4 cursor-pointer hover:border-accent`}
          onClick={() => setQuickFilter(quickFilter === "completed" ? null : "completed")}
        >
          <div className="text-xl text-left font-bold text-accent">{taskCounts.completed}</div>
          <div className="text-xs text-left">COMPLETED</div>
        </button>
        <button
          className={`${quickFilter === "trashed" ? "border-accent text-foreground" : "border-transparent text-muted-foreground"} border-b-4 cursor-pointer hover:border-accent`}
          onClick={() => setQuickFilter(quickFilter === "trashed" ? null : "trashed")}
        >
          <div className="text-xl text-left font-bold text-accent">{taskCounts.trashed}</div>
          <div className="text-xs text-left">TRASHED</div>
        </button>
      </section>

      {quickFilter !== "trashed"
        && <TagsBar tags={tags} activeTags={activeTags} onTagSelect={toggleActiveTag} />}

      <section className="overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-center mt-20">
            {quickFilter || activeTags.length > 0 ? (
              "No tasks here."
            ) : (
              <>
                You seem to not have any tasks.
                <br />
                Start by creating one.
              </>)}
          </p>
        ) : (
          <div className="flex flex-col">
            {tasks.map((task) => {
              return (
                <Link href={`/tasks/${task.id}`} key={task.id}>
                  <article className={`max-h-22 p-2 mb-2 flex flex-row border-b-1 ${task.is_completed === 1 ? "text-muted-foreground" : ""}`}>
                    <button onClick={(e) => completeTask(e, task.id, task.is_completed)}>
                      <Circle size={16} className={`mr-2 ${task.is_completed === 1 ? "fill-foreground" : ""} hover:fill-foreground cursor-pointer`} />
                    </button>
                    <div className="flex flex-col justify-between overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <h3 className="text-lg mb-1 whitespace-nowrap overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{task.title}</h3>
                      <ul className="flex gap-2 text-xs font-light text-muted-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {task.due_date && (() => {
                          const dueDate = new Date(task.due_date);
                          const dueDateLuxon = DateTime.fromJSDate(dueDate);

                          if (dueDate.getHours() === 0 && dueDate.getMinutes() === 0) {
                            return <li className={`uppercase ${dueDateLuxon.startOf("day") < now.startOf("day") ? "text-destructive" : ""}`}>{dueDate.toLocaleDateString("en-CA", {month: "short", day: "numeric", year: "numeric"})}</li>;
                          }

                          return (
                            <>
                              <li className={`uppercase ${dueDateLuxon < now ? "text-destructive" : ""}`}>{dueDate.toLocaleDateString("en-CA", {month: "short", day: "numeric", year: "numeric"})}</li>
                              <li className={`${dueDateLuxon < now ? "text-destructive" : ""}`}>{dueDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</li>
                            </>
                          );
                        }
                        )()}
                        {task.priority && (
                          <li>{TASK_PRIORITY_LABELS[task.priority]}</li>
                        )}
                      </ul>
                      {task.tags &&
                        <ul className="flex gap-2 text-xs font-light text-muted-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {task.tags.map((tag, index) => (
                          <li key={index}>#{tag}</li>
                        ))}
                      </ul>
                      }
                    </div>
                  </article>
                </Link>
              );
            })}
            {hasMore
              ? <button onClick={() => loadTasks()} className="w-fit mx-auto p-4 mb-30 lg:mb-3 text-center border-foreground hover:cursor-pointer hover:border-b-1 hover:border-accent">Load More</button>
              : <p className="p-4 mb-30 lg:mb-3 text-center">That's all!</p>
            }
          </div>
        )}
      </section>
    </div>
  );
}
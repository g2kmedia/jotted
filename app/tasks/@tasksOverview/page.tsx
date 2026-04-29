"use client"

import Link from "next/link";
import { Circle, Trash2 } from 'lucide-react';
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

  const loadTaskCounts = async (): Promise<void> => {
    if (navigator.onLine) {
      try {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const url = new URL("/api/tasks/counts", window.location.origin);

        url.searchParams.set("timezone", userTimezone);
        url.searchParams.set("is_completed", "0");
        url.searchParams.set("is_trashed", "0");

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
      <section className="mb-6 grid grid-cols-2 gap-2 text-xl">
        <button
          className={`${quickFilter === "today" ? "bg-accent" : ""} min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(quickFilter === "today" ? null : "today")}
        >
          <span>Today</span>
          <span>{taskCounts.today}</span>
        </button>
        <button
          className={`${quickFilter === "week" ? "bg-accent" : ""} min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(quickFilter === "week" ? null : "week")}
        >
          <span>This week</span>
          <span>{taskCounts.week}</span>
        </button>
        <button
          className={`${quickFilter === "scheduled" ? "bg-accent" : ""} min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(quickFilter === "scheduled" ? null : "scheduled")}
        >
          <span>Scheduled</span>
          <span>{taskCounts.scheduled}</span>
        </button>
        <button
          className={`${quickFilter === "later" ? "bg-accent" : ""} min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(quickFilter === "later" ? null : "later")}
        >
          <span>Later</span>
          <span>{taskCounts.later}</span>
        </button>
        <button
          className={`${quickFilter === "completed" ? "bg-accent" : ""} mt-2 min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(quickFilter === "completed" ? null : "completed")}
        >
          <span>Completed</span>
          <span><Circle /></span>
        </button>
        <button
          className={`${quickFilter === "trashed" ? "bg-accent" : ""} mt-2 min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(quickFilter === "trashed" ? null : "trashed")}
        >
          <span>Trashed</span>
          <span><Trash2 /></span>
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
          <div className="flex flex-col justify-center">
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
            {hasMore
              ? <button onClick={() => loadTasks()} className="p-3 mb-30 lg:mb-3 text-center border border-foreground rounded-2xl hover:cursor-pointer">Load More</button>
              : <p className="p-4 mb-28 lg:mb-3 text-center">That's all!</p>
            }
          </div>
        )}
      </section>
    </div>
  );
}
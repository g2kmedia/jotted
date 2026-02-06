"use client"

import Link from "next/link";
import { Circle, Trash2 } from 'lucide-react';
import { useEffect, useState } from "react";
import { Tag, TaskWithTags } from "@/lib/types";
import InfiniteScroll from "react-infinite-scroll-component";
import { DateTime } from "luxon";
import { toast } from "sonner";
import TagsBar from "@/app/components/TagsBar";
import { useTagsFilter } from "@/lib/hooks";

const TASK_PRIORITY_LABELS: Record<number, string> = {
  1: "High",
  2: "Medium",
  3: "Low"
};

const now = DateTime.now();

export default function TasksOverview() {
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [taskCounts, setTaskCounts] = useState({
    today: 0,
    week: 0,
    scheduled: 0,
    later: 0
  });
  const [tags, setTags] = useState<Omit<Tag, "created_at">[]>([]);
  const [tasks, setTasks] = useState<Partial<TaskWithTags>[] | undefined>(undefined);
  const [lastTaskId, setLastTaskId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { activeTags, handleTagsSelection } = useTagsFilter();

  const loadTasks = async (resetStates = false): Promise<void> => {
    if (resetStates) {
      setTasks(undefined);
      setLastTaskId(null);
      setHasMore(true);
    } else if (!hasMore) {
      return;
    }

    const url = new URL("/api/tasks", window.location.origin);

    url.searchParams.set("columns", "id,title,due_date,priority,is_completed");

    if (quickFilter === "completed") {
      url.searchParams.set("is_completed", "1");
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
      default:
        break;
    }

    if (lastTaskId && !resetStates) {
      url.searchParams.set("id_before", lastTaskId.toString());
    }

    if (activeTags.length > 0) {
      url.searchParams.set("tags", activeTags.join());
    }

    const finalUrl = url.pathname + url.search;

    try {
      const res = await fetch(finalUrl, { method: "GET" });

      if (!res.ok) {
        throw new Error(`Failed to fetch tasks: ${res.status}`);
      }

      const { tasks: newTasks } = await res.json();

      if (newTasks.length === 0) {
        setHasMore(false);

        if (resetStates || !tasks) {
          setTasks([]);
        }

        return;
      }

      setTasks(prev => {
        if (resetStates || !prev) return newTasks;

        const existingIds = new Set(prev.map(task => task.id));
        const uniqueNewTasks = newTasks.filter((task: Partial<TaskWithTags>) => !existingIds.has(task.id));

        return [...prev, ...uniqueNewTasks];
      });

      setLastTaskId(newTasks[newTasks.length - 1].id);

    } catch (error) {
      console.error("Failed to load tasks:", error);
    }
  }

  const loadTaskCounts = async (): Promise<void> => {
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
      console.error("Failed to load task counts:", error);
    }
  }

  const loadTags = async (): Promise<void> => {
    try {
      const url = new URL("/api/tasks/tags", window.location.origin);

      if (quickFilter === "completed") {
        url.searchParams.set("is_completed", "1");
      } else if (quickFilter === "trashed") {
        url.searchParams.set("is_trashed", "1");
      } else {
        url.searchParams.set("is_completed", "0");
        url.searchParams.set("is_trashed", "0");
      }

      switch (quickFilter) {
        case "today":
          url.searchParams.set("due_date_end", now.endOf("day").toISO());
          break;
        case "week":
          url.searchParams.set("due_date_end", now.endOf("week").toISO());
          break;
        case "scheduled":
          url.searchParams.set("has_due_date", "true");
          break;
        case "later":
          url.searchParams.set("has_due_date", "false");
          break;
      }

      const res = await fetch(url, { method: "GET" });

      if (!res.ok) {
        throw new Error(`Failed to fetch tags: ${res.status}`);
      }

      const { tags } = await res.json();
      setTags(tags);

    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  }

  useEffect(() => {
    loadTaskCounts();
  }, []);

  useEffect(() => {
    loadTasks(true); // Reset states/query params
    loadTags();
  }, [quickFilter, activeTags]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 300);

    return () => clearTimeout(timer);
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

  if (!tasks) return null;

  return (
    <>
      <section className={`mb-6 grid grid-cols-2 gap-2 text-xl ${isInitialLoad ? "slide-in-right" : ""}`}>
        <button
          className={`${quickFilter === "today" ? "bg-accent" : ""} min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(prev => prev === "today" ? null : "today")}
        >
          <span>Today</span>
          <span>{taskCounts.today}</span>
        </button>
        <button
          className={`${quickFilter === "week" ? "bg-accent" : ""} min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(prev => prev === "week" ? null : "week")}
        >
          <span>This week</span>
          <span>{taskCounts.week}</span>
        </button>
        <button
          className={`${quickFilter === "scheduled" ? "bg-accent" : ""} min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(prev => prev === "scheduled" ? null : "scheduled")}
        >
          <span>Scheduled</span>
          <span>{taskCounts.scheduled}</span>
        </button>
        <button
          className={`${quickFilter === "later" ? "bg-accent" : ""} min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(prev => prev === "later" ? null : "later")}
        >
          <span>Later</span>
          <span>{taskCounts.later}</span>
        </button>
        <button
          className={`${quickFilter === "completed" ? "bg-accent" : ""} mt-2 min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(prev => prev === "completed" ? null : "completed")}
        >
          <span>Completed</span>
          <span><Circle /></span>
        </button>
        <button
          className={`${quickFilter === "trashed" ? "bg-accent" : ""} mt-2 min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer`}
          onClick={() => setQuickFilter(prev => prev === "trashed" ? null : "trashed")}
        >
          <span>Trashed</span>
          <span><Trash2 /></span>
        </button>
      </section>
      <TagsBar tags={tags} activeTags={activeTags} onTagSelect={handleTagsSelection} className={isInitialLoad ? "slide-in-left" : ""} />
      <section className="slide-in-bottom">
        {tasks.length === 0 ? (
          <p className="h-full flex justify-center items-center text-center mt-20">
            {quickFilter || activeTags.length > 0
              ? "No tasks here."
              : "You seem to not have any tasks.\nStart by creating one."}
          </p>
        ) : (
          <InfiniteScroll
            dataLength={tasks.length}
            next={loadTasks}
            hasMore={hasMore}
            loader={null}
            scrollableTarget="main-scrollable-target" // id of main tag for scroll detection (overview/layout.tsx)
          >
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
          </InfiniteScroll>
        )}
        <div className="h-16"></div>
      </section >
    </>
  );
}
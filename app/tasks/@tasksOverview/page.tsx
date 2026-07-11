"use client"

import { SearchCode, PencilLine } from 'lucide-react';
import { useEffect } from "react";
import { DateTime } from "luxon";
import TagsBar from "@/app/components/TagsBar";
import { getAllTasksLocally, getAllTasksTagsLocally, getTaskCountsLocally } from "@/lib/indexeddb";
import { useTagsStore, useTaskStore } from "@/lib/stores";
import TaskItem from "@/app/components/TaskItem";
import QuickFilterButton from '@/app/components/QuickFilterButton';

const TASK_QUICK_FILTERS = [
  { key: "today", label: "TODAY" },
  { key: "week", label: "THIS WEEK" },
  { key: "scheduled", label: "SCHEDULED" },
  { key: "later", label: "LATER" },
  { key: "completed", label: "COMPLETED" },
  { key: "trashed", label: "TRASHED" }
];

const now = DateTime.now();
const endOfDay = now.endOf("day").toUTC().toISO();
const endOfWeek = now.endOf("week").toUTC().toISO();

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
          url.searchParams.set("due_date_end", endOfDay);
          break;
        case "week":
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
        quickFilter === "today" ? dueDate = endOfDay : null;
        quickFilter === "week" ? dueDate = endOfWeek : null;

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

  if (!tasks) return null;

  return (
    <div className="h-full flex flex-col">
      <section className="grid grid-cols-2 gap-y-2 border-b-1 pb-2">
        {TASK_QUICK_FILTERS.map(f => (
          <QuickFilterButton
            key={f.key}
            active={quickFilter === f.key}
            count={taskCounts[f.key as keyof typeof taskCounts]}
            label={f.label}
            onClick={() => setQuickFilter(quickFilter === f.key ? null : f.key)}
          />
        ))}
      </section>

      {quickFilter !== "trashed"
        && <TagsBar tags={tags} activeTags={activeTags} onTagSelect={toggleActiveTag} />}

      <section className="overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col mt-10">
            {quickFilter || activeTags.length > 0 ? (
              <>
                <SearchCode strokeWidth={"1"} size={48} className="w-full text-accent" />
                <h3 className="text-center text-secondary-foreground">No tasks match this view.</h3>
              </>
            ) : (
              <>
                <PencilLine strokeWidth={"1"} size={48} className="w-full text-accent" />
                <h3 className="text-center text-secondary-foreground">
                  You seem to not have any tasks.
                  <br />
                  Start by creating some.
                </h3>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} now={now} />
            ))}
            {hasMore
              ? <button onClick={() => loadTasks()} className="w-fit mx-auto p-4 mb-30 lg:mb-3 text-center font-titles border-foreground hover:cursor-pointer hover:border-b-1 hover:border-accent">Load More</button>
              : <p className="p-4 mb-30 lg:mb-3 text-center font-titles">That's all!</p>
            }
          </div>
        )}
      </section>
    </div>
  );
}
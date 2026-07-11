"use client"

import { SearchCode, PencilLine } from 'lucide-react';
import { useEffect } from "react";
import TagsBar from "@/app/components/TagsBar";
import { getAllTasksTagsLocally, getTaskCountsLocally, loadAllTasks } from "@/lib/tasks-client";
import { useTagsStore, useTaskStore } from "@/lib/stores";
import TaskItem from "@/app/components/TaskItem";
import QuickFilterButton from '@/app/components/QuickFilterButton';
import { DateTime } from 'luxon';

const TASK_QUICK_FILTERS = [
  { key: "today", label: "TODAY" },
  { key: "week", label: "THIS WEEK" },
  { key: "scheduled", label: "SCHEDULED" },
  { key: "later", label: "LATER" },
  { key: "completed", label: "COMPLETED" },
  { key: "trashed", label: "TRASHED" }
];

const now = DateTime.now();

export default function TasksOverview() {
  const {
    tasks,
    taskCounts,
    hasMore,
    quickFilter,
    tags,
    setTaskCounts,
    setQuickFilter,
    setTags
  } = useTaskStore();

  const { activeTags, toggleActiveTag } = useTagsStore();

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
    loadAllTasks(true, now); // Reset states/query params
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
              ? <button onClick={() => loadAllTasks(false, now)} className="w-fit mx-auto p-4 mb-30 lg:mb-3 text-center font-titles border-foreground hover:cursor-pointer hover:border-b-1 hover:border-accent">Load More</button>
              : <p className="p-4 mb-30 lg:mb-3 text-center font-titles">That's all!</p>
            }
          </div>
        )}
      </section>
    </div>
  );
}
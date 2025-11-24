"use client"

import Link from "next/link";
import { Circle } from 'lucide-react';
import { useEffect, useMemo, useState } from "react";
import { Tag, TaskWithTags } from "@/lib/types";
import InfiniteScroll from "react-infinite-scroll-component";

export default function TasksOverview() {
  const [tags, setTags] = useState<Omit<Tag, "created_at">[]>([]);
  const [activeTags, setActiveTags] = useState<number[]>([]);
  const [tasks, setTasks] = useState<Partial<TaskWithTags>[] | undefined>(undefined);
  const [lastTaskId, setLastTaskId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadTasks = async (resetStates = false): Promise<void> => {
    if (resetStates) {
      setTasks(undefined);
      setLastTaskId(null);
      setHasMore(true);
    }

    if (!hasMore && !resetStates) return;

    const url = new URL("/api/tasks", window.location.origin);
    url.searchParams.set("columns", "id,title,updated_at");

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

  const loadTags = async (): Promise<void> => {
    try {
      const url = "/api/tasks/tags";

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

  const handleTagsSelection = (tag: number): void => {
    setActiveTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  }

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    loadTasks(true); // Reset states/query params
  }, [activeTags]);

  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => {
      const aIsActive = activeTags.includes(a.id);
      const bIsActive = activeTags.includes(b.id);

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      return 0;
    });
  }, [tags, activeTags]);

  if (!tasks) return null;

  if (tasks.length === 0) {
    return (
      <p className="h-full flex justify-center items-center text-center">You seem to not have any tasks.<br />Start by creating one.</p>
    );
  }

  const completeTask = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    e.stopPropagation();

    // button logic here
  }

  return (
    <>
      <section className="mb-6 grid grid-cols-2 gap-2 text-xl">
        <button className="min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer">
          <span>Today</span>
          <span>2</span>
        </button>
        <button className="min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer">
          <span>This week</span>
          <span>4</span>
        </button>
        <button className="min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer">
          <span>Scheduled</span>
          <span>5</span>
        </button>
        <button className="min-h-14 p-3 border-1 border-foreground rounded-lg flex justify-between items-center cursor-pointer">
          <span>Later</span>
          <span>23</span>
        </button>
      </section>
      <section className="flex mb-6 overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sortedTags.map((tag) => (
          <button
            key={tag.id}
            className={`${activeTags.includes(tag.id) ? "bg-accent" : ""} p-2.5 ml-2 border rounded-full whitespace-nowrap cursor-pointer`}
            onClick={() => handleTagsSelection(tag.id)}
          >
            #{tag.name}
          </button>
        ))}
      </section>
      <section>
        <InfiniteScroll
          dataLength={tasks.length}
          next={loadTasks}
          hasMore={hasMore}
          loader={""}
          scrollableTarget="main-scrollable-target" // id of main tag for scroll detection (overview/layout.tsx)
        >
          {tasks.map((task) => {
            return (
              <Link href={`/tasks/${task.id}`} key={task.id}>
                <article className="grid grid-cols-[auto_1fr] gap-4 h-22 mb-2 p-4 border-1 border-foreground rounded-lg">
                  <button onClick={completeTask} className="self-center"><Circle /></button>
                  <div>
                    <h3 className="text-lg mb-1">{task.title}</h3>
                    <ul className="flex gap-2 text-sm font-light text-muted-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {task.tags?.map((tag, index) => (
                        <li key={index} className="pl-2">#{tag}</li>
                      ))}
                    </ul>
                  </div>


                </article>
              </Link>
            );
          })}
        </InfiniteScroll>
        <div className="h-16"></div>
      </section>
    </>
  );
}
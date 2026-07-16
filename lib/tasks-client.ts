import { localTask } from "./types";
import { DateTime } from "luxon";
import { openDB, pruneIfNeeded, requestToPromise } from "./indexeddb";
import { useTagsStore, useTaskStore } from "./stores";

// Frontend fetching
export const loadAllTasks = async (
    resetStates = false,
    now: DateTime,
    limit = 20,
    sortByDueDate = false,
    quickFilterOverride?: string
): Promise<void> => {
    const {
        tasks,
        lastQueriedRecord,
        hasMore,
        quickFilter: storeQuickFilter,
        setTasks,
        appendNewTasks,
        setLastQueriedRecord,
        setHasMore,
    } = useTaskStore.getState();

    const quickFilter = quickFilterOverride ?? storeQuickFilter;

    const { activeTags } = useTagsStore.getState();

    const endOfDay = now.endOf("day").toUTC().toISO();
    const endOfWeek = now.endOf("week").toUTC().toISO();

    if (resetStates) {
        setTasks(null);
        setLastQueriedRecord(null);
        setHasMore(true);
    }

    if (!hasMore && !resetStates) return;

    try {
        let newTasks;

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
                case "today": url.searchParams.set("due_date_end", endOfDay ?? ""); break;
                case "week": url.searchParams.set("due_date_end", endOfWeek ?? ""); break;
                case "scheduled": url.searchParams.set("has_due_date", "true"); break;
                case "later": url.searchParams.set("has_due_date", "false"); break;
            }

            if (lastQueriedRecord && !resetStates) {
                url.searchParams.set("last_queried_record", JSON.stringify(lastQueriedRecord));
            }

            if (activeTags.length > 0) {
                url.searchParams.set("tags", activeTags.join());
            }

            url.searchParams.set("limit", String(limit));

            const res = await fetch(url, { method: "GET" });
            if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
            newTasks = (await res.json()).tasks;
        } else {
            let dueDate: string | null = null;
            if (quickFilter === "today") dueDate = endOfDay;
            if (quickFilter === "week") dueDate = endOfWeek;

            newTasks = await getAllTasksLocally(
                quickFilter,
                dueDate,
                resetStates ? null : lastQueriedRecord,
                activeTags,
                limit
            );
        }

        if (!newTasks || newTasks.length === 0) {
            setHasMore(false);
            if (resetStates || !tasks) setTasks([]);
            return;
        }

        if (sortByDueDate) {
            newTasks = [...newTasks].sort((a, b) =>
                (a.due_date ?? "").localeCompare(b.due_date ?? "")
            );
        }

        resetStates || !tasks ? setTasks(newTasks) : appendNewTasks(newTasks);

        const lastRecord = newTasks[newTasks.length - 1];
        setLastQueriedRecord({ id: lastRecord.id, updated_at: lastRecord.updated_at });
    } catch (error) {
        console.error(`Failed to load tasks ${navigator.onLine ? "from server" : "locally"}:`, error);
    }
}

export const loadTaskCounts = async (userTimezone: string): Promise<void> => {
    const { setTaskCounts } = useTaskStore.getState();

    if (navigator.onLine) {
        try {
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

export const loadAllTasksTags = async (): Promise<void> => {
    const { setTags } = useTaskStore.getState();

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

// IndexedDB
const MAX_TASKS = 100;

export const saveTaskLocally = async (
    task: Partial<localTask> & { id: string }
): Promise<localTask> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readwrite");
    const store = tx.objectStore("tasks");

    await pruneIfNeeded(store, "tasks", MAX_TASKS);

    const existingData = await new Promise((resolve, reject) => {
        const req = store.get(task.id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    const mergedData = { ...(existingData || {}), ...task };

    await new Promise<void>((resolve, reject) => {
        const req = store.put(mergedData);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });

    return mergedData as localTask;
};

export const getTaskLocally = async (taskId: string): Promise<localTask | undefined> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readonly");
    const store = tx.objectStore("tasks");
    const request = store.get(taskId);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export const getAllTasksLocally = async (
    quickFilter: string | null = null,
    dueDate: string | null = null,
    lastQueriedRecord: { id: string; updated_at: string } | null = null,
    tags: string[] = [],
    limit = 20
): Promise<localTask[]> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readonly");
    const store = tx.objectStore("tasks");

    let indexName;

    if (dueDate) {
        indexName = "incompleted_due";
    } else {
        indexName = "completed_trashed";
    }

    const index = store.index(indexName);

    let allTasks: localTask[] = [];

    switch (quickFilter) {
        case null:
            const defaultReq = index.getAll(IDBKeyRange.only([0, 0]));
            allTasks = await requestToPromise(defaultReq);
            break;
        case "completed":
            const completedReq = index.getAll(IDBKeyRange.only([1, 0]));
            allTasks = await requestToPromise(completedReq);
            break;
        case "trashed":
            const trashedReq1 = await requestToPromise<localTask[]>(index.getAll(IDBKeyRange.only([0, 1])));
            const trashedReq2 = await requestToPromise<localTask[]>(index.getAll(IDBKeyRange.only([1, 1])));
            allTasks = [...trashedReq1, ...trashedReq2];
            break;
        case "today":
            console.log(dueDate)
            const todayReq = index.getAll(IDBKeyRange.upperBound([0, 0, dueDate]));
            allTasks = await requestToPromise(todayReq);
            break;
        case "week":
            const weekReq = index.getAll(IDBKeyRange.upperBound([0, 0, dueDate]));
            allTasks = await requestToPromise(weekReq);
            break;
        case "scheduled":
            const scheduledReq = index.getAll(IDBKeyRange.only([0, 0]));
            const rawScheduledTasks = await requestToPromise<localTask[]>(scheduledReq);
            allTasks = rawScheduledTasks.filter(task => task.due_date !== null);
            break;
        case "later":
            const laterReq = index.getAll(IDBKeyRange.only([0, 0]));
            const rawLaterTasks = await requestToPromise<localTask[]>(laterReq);
            allTasks = rawLaterTasks.filter(task => task.due_date === null);
            break;
    }

    let filteredTasks = allTasks.filter(task =>
        !tags.length || tags.some(t => task.tags.includes(t))
    );

    filteredTasks.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

    if (lastQueriedRecord) {
        const lastIdx = filteredTasks.findIndex(task => task.id === lastQueriedRecord.id);
        if (lastIdx !== -1) {
            filteredTasks = filteredTasks.slice(lastIdx + 1);
        }
    }

    return filteredTasks.slice(0, limit);
}

export const getAllTasksTagsLocally = async (): Promise<string[]> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readonly");
    const store = tx.objectStore("tasks");
    const tagsIndex = store.index("tags");

    const request = tagsIndex.getAll();

    const tasks = await requestToPromise<Promise<localTask[]>>(request);
    const nonCompletedTrashedTasks = tasks.filter(task => task.is_completed !== 1 && task.is_trashed !== 1);

    const allTags = nonCompletedTrashedTasks.flatMap(task => task.tags);
    return [...new Set(allTags)];
}

export const getTaskCountsLocally = async (): Promise<{
    today: number,
    week: number,
    scheduled: number,
    later: number,
    completed: number,
    trashed: number
}> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readonly");
    const store = tx.objectStore("tasks");
    const index = store.index("incompleted_due");
    const completedTrashed = store.index("completed_trashed");

    const now = DateTime.now();
    const endOfToday = now.endOf("day").toUTC().toISO();
    const endOfWeek = now.endOf("week").toUTC().toISO();
    const nextWeekStart = now.plus({ weeks: 1 }).startOf('week').toUTC().toISO();

    const counts = {
        today: 0,
        week: 0,
        scheduled: 0,
        later: 0,
        completed: 0,
        trashed: 0
    };
    console.log(endOfToday)
    counts.today = await requestToPromise(index.count(IDBKeyRange.upperBound([0, 0, endOfToday])));
    counts.week = await requestToPromise(index.count(IDBKeyRange.upperBound([0, 0, endOfWeek])));

    const future = await requestToPromise<number>(index.count(IDBKeyRange.bound([0, 0, nextWeekStart], [0, 0, "9999-12-31T23:59:59.999Z"])));
    counts.scheduled = future + counts.week;

    const nonCompletedTrashedTasks = await requestToPromise<number>(completedTrashed.count(IDBKeyRange.only([0, 0])));
    counts.later = nonCompletedTrashedTasks - counts.scheduled;

    counts.completed = await requestToPromise(completedTrashed.count(IDBKeyRange.only([1, 0])));

    const trashed1 = await requestToPromise<number>(completedTrashed.count(IDBKeyRange.only([0, 1])));
    const trashed2 = await requestToPromise<number>(completedTrashed.count(IDBKeyRange.only([1, 1])));
    counts.trashed = trashed1 + trashed2;

    return counts;
}

export const deleteTaskLocally = async (taskId: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction("tasks", "readwrite");

    const request = tx.objectStore("tasks").delete(taskId);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
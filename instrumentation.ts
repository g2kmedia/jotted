export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        // Use dynamic import so Next.js Edge bundling does not pull in Node-only modules (sqlite, path, fs)
        const { initVapidKeys } = await import("./lib/startup");
        const { startScheduler } = await import("./lib/scheduler")

        initVapidKeys();
        startScheduler();
    }
}
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

//
// Serwist
//
// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Prevent default behaviour from caching GET request
    {
      matcher: ({ url, request }) => url.pathname.startsWith("/api/") && request.method === "GET",
      handler: new NetworkOnly()
    },
    ...defaultCache
  ],
  fallbacks: {
    entries: [
      {
        url: "/notes/offline",
        matcher({ request }) {
          return request.destination === "document" && request.url.includes("/notes/");
        }
      },
      {
        url: "/tasks/offline",
        matcher({ request }) {
          return request.destination === "document" && request.url.includes("/tasks/");
        }
      },
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

//
// Push listener (Notifications)
//
self.addEventListener("push", (event) => {
  let data;

  try {
    data = event.data?.json();
  } catch {
    data = { title: "New Notification", body: event.data?.text() || "" };
  }

  const options = {
    body: data.body || "",
    icon: "/icons/web-app-manifest-192x192.png",
    badge: "/icons/web-app-manifest-192x192.png",
    data: { taskUrl: data.url || "/" }
  };

  // MUST show notification to prevent iOS from revoking the permissions
  event.waitUntil(
    self.registration.showNotification(data.title || "Reminder", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.taskUrl || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    })
  );
});
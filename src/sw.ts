/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  precacheAndRoute,
  createHandlerBoundToURL,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare let self: ServiceWorkerGlobalScope;

// Activate immediately, then reload every page, including pages running old update logic.
void self.skipWaiting();
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const pages = await self.clients.matchAll({ type: 'window' });
    // Navigation requests wait for activation; awaiting them here would deadlock.
    for (const page of pages) void page.navigate(page.url).catch(() => {});
  })());
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const navigationHandler = createHandlerBoundToURL("/index.html");
const navigationRoute = new NavigationRoute(navigationHandler);
registerRoute(navigationRoute);

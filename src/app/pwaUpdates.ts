/** Check resumed PWAs too: returning to the home-screen app need not navigate. */
export const startPwaUpdates = (
  canReload: () => boolean,
  reload = () => window.location.reload(),
) => {
  const workers = navigator.serviceWorker;
  if (!workers) return () => {};
  let active = true;
  let registration: ServiceWorkerRegistration | undefined;
  let checking = false;
  let reloading = false;
  let needsReload = false;
  let controller = workers.controller;
  const watched = new Set<ServiceWorker>();
  const ready = () => active && !document.hidden && canReload();
  const apply = () => {
    if (!ready() || reloading) return;
    if (needsReload) {
      reloading = true;
      reload();
    } else {
      const waiting = registration?.waiting ??
        (registration?.installing?.state === 'installed' ? registration.installing : null);
      waiting?.postMessage({ type: 'SKIP_WAITING' });
    }
  };
  const changed = () => {
    const next = workers.controller;
    if (controller && next !== controller) needsReload = true;
    controller = next;
    apply();
  };
  const installed = () => apply();
  const watchWorker = () => {
    const worker = registration?.installing;
    if (!worker || watched.has(worker)) return;
    watched.add(worker);
    worker.addEventListener('statechange', installed);
    apply();
  };
  const check = async () => {
    if (!active || document.hidden) return;
    apply();
    if (checking || !navigator.onLine) return;
    checking = true;
    try {
      if (!registration) {
        const result = await workers.register('/sw.js', { updateViaCache: 'none' });
        if (!active) return;
        registration = result;
        registration.addEventListener('updatefound', watchWorker);
        watchWorker();
      }
      await registration.update();
      if (active) apply();
    } catch {
      // Offline or failed deployment: keep this working version and retry later.
    } finally { checking = false; }
  };
  workers.addEventListener('controllerchange', changed);
  document.addEventListener('visibilitychange', check);
  window.addEventListener('pageshow', check);
  window.addEventListener('online', check);
  // Dialogs are locally owned; their removal is a safe opportunity to retry.
  const observer = new MutationObserver(apply);
  observer.observe(document.body, { childList: true, subtree: true });
  const timer = window.setInterval(check, 60_000);
  void check();
  return () => {
    active = false;
    clearInterval(timer);
    observer.disconnect();
    workers.removeEventListener('controllerchange', changed);
    document.removeEventListener('visibilitychange', check);
    window.removeEventListener('pageshow', check);
    window.removeEventListener('online', check);
    registration?.removeEventListener('updatefound', watchWorker);
    for (const worker of watched) worker.removeEventListener('statechange', installed);
  };
};

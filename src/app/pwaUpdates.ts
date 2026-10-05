/** A home-screen app can resume without navigating, so explicitly check updates. */
export const startPwaUpdates = () => {
  const workers = navigator.serviceWorker;
  if (!workers) return () => {};
  let active = true;
  let registration: ServiceWorkerRegistration | undefined;
  let checking = false;
  const check = async () => {
    if (!active || checking || !navigator.onLine) return;
    checking = true;
    try {
      if (!registration) {
        const result = await workers.register('/sw.js', { updateViaCache: 'none' });
        if (!active) return;
        registration = result;
      }
      await registration.update();
    } catch {
      // Keep retrying after offline or failed deployment checks.
    } finally { checking = false; }
  };
  document.addEventListener('visibilitychange', check);
  window.addEventListener('pageshow', check);
  window.addEventListener('online', check);
  const timer = window.setInterval(check, 60_000);
  void check();
  return () => {
    active = false;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', check);
    window.removeEventListener('pageshow', check);
    window.removeEventListener('online', check);
  };
};

import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { startPwaUpdates } from '../app/pwaUpdates';

const setup = (failRegistration = false) => {
  const oldWorker = Object.assign(new EventTarget(), { state: 'activated', postMessage: vi.fn() });
  const nextWorker = Object.assign(new EventTarget(), { state: 'installing', postMessage: vi.fn() });
  const registration = Object.assign(new EventTarget(), {
    installing: nextWorker as typeof nextWorker | null,
    waiting: null as typeof nextWorker | null,
    update: vi.fn(async () => {}),
  });
  const workers = Object.assign(new EventTarget(), {
    controller: oldWorker as typeof oldWorker | null,
    register: vi.fn(async () => registration),
  });
  if (failRegistration) workers.register.mockRejectedValueOnce(new Error('offline'));
  vi.stubGlobal('navigator', { serviceWorker: workers, onLine: true });
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const reload = vi.fn();
  let safe = true;
  const stop = startPwaUpdates(() => safe, reload);
  return { workers, nextWorker, registration, reload, stop, block: () => { safe = false; }, allow: () => { safe = true; } };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('PWA updates', () => {
  it('checks on launch, foreground, restored pages and restored network', async () => {
    const t = setup();
    try {
      await flushPromises();
      expect(t.workers.register).toHaveBeenCalledWith('/sw.js', { updateViaCache: 'none' });
      expect(t.registration.update).toHaveBeenCalledTimes(1);
      document.dispatchEvent(new Event('visibilitychange'));
      await flushPromises();
      window.dispatchEvent(new Event('pageshow'));
      await flushPromises();
      window.dispatchEvent(new Event('online'));
      await flushPromises();
      expect(t.registration.update).toHaveBeenCalledTimes(4);
    } finally { t.stop(); }
  });
  it('activates a completed update and reloads once after the controller changes', async () => {
    const t = setup();
    try {
      await flushPromises();
      t.registration.waiting = t.nextWorker;
      t.nextWorker.state = 'installed';
      t.nextWorker.dispatchEvent(new Event('statechange'));
      expect(t.nextWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
      expect(t.reload).not.toHaveBeenCalled();
      t.workers.controller = t.nextWorker;
      t.workers.dispatchEvent(new Event('controllerchange'));
      t.workers.dispatchEvent(new Event('controllerchange'));
      expect(t.reload).toHaveBeenCalledTimes(1);
    } finally { t.stop(); }
  });
  it('preserves drafts both before activation and when another page activates the update', async () => {
    const t = setup();
    try {
      await flushPromises();
      t.block();
      t.registration.waiting = t.nextWorker;
      t.nextWorker.dispatchEvent(new Event('statechange'));
      expect(t.nextWorker.postMessage).not.toHaveBeenCalled();
      t.workers.controller = t.nextWorker;
      t.workers.dispatchEvent(new Event('controllerchange'));
      expect(t.reload).not.toHaveBeenCalled();
      t.allow();
      document.body.append(document.createElement('div'));
      await flushPromises();
      expect(t.reload).toHaveBeenCalledTimes(1);
    } finally { t.stop(); }
  });
  it('does not reload for the first offline installation', async () => {
    const t = setup();
    t.stop();
    t.workers.controller = null;
    const stop = startPwaUpdates(() => true, t.reload);
    try {
      await flushPromises();
      t.workers.controller = t.nextWorker;
      t.workers.dispatchEvent(new Event('controllerchange'));
      expect(t.reload).not.toHaveBeenCalled();
    } finally { stop(); }
  });
  it('retries failed registration on network restoration and survives failed update checks', async () => {
    const t = setup(true);
    try {
      await flushPromises();
      window.dispatchEvent(new Event('online'));
      await flushPromises();
      expect(t.workers.register).toHaveBeenCalledTimes(2);
      t.registration.update.mockRejectedValueOnce(new Error('offline'));
      window.dispatchEvent(new Event('online'));
      await flushPromises();
      window.dispatchEvent(new Event('online'));
      await flushPromises();
      expect(t.registration.update).toHaveBeenCalledTimes(3);
      expect(t.reload).not.toHaveBeenCalled();
    } finally { t.stop(); }
  });
  it('does not check or reload in the background and removes all listeners on disposal', async () => {
    vi.useFakeTimers();
    const t = setup();
    try {
      await flushPromises();
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      t.registration.waiting = t.nextWorker;
      vi.advanceTimersByTime(60_000);
      await flushPromises();
      expect(t.registration.update).toHaveBeenCalledTimes(1);
      expect(t.nextWorker.postMessage).not.toHaveBeenCalled();
      t.stop();
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('online'));
      t.workers.controller = t.nextWorker;
      t.workers.dispatchEvent(new Event('controllerchange'));
      vi.advanceTimersByTime(60_000);
      await flushPromises();
      expect(t.registration.update).toHaveBeenCalledTimes(1);
      expect(t.reload).not.toHaveBeenCalled();
    } finally { t.stop(); }
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { startPwaUpdates } from '../app/pwaUpdates';

const setup = (failRegistration = false) => {
  const registration = { update: vi.fn(async () => {}) };
  const workers = { register: vi.fn(async () => registration) };
  if (failRegistration) workers.register.mockRejectedValueOnce(new Error('offline'));
  vi.stubGlobal('navigator', { serviceWorker: workers, onLine: true });
  const stop = startPwaUpdates();
  return { workers, registration, stop };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('PWA update checks', () => {
  it('checks on launch, foreground, restored pages, network restoration and every minute', async () => {
    vi.useFakeTimers();
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
      vi.advanceTimersByTime(60_000);
      await flushPromises();
      expect(t.registration.update).toHaveBeenCalledTimes(5);
    } finally { t.stop(); }
  });
  it('checks while a draft is open, even in the background', async () => {
    const t = setup();
    try {
      await flushPromises();
      const draft = document.createElement('div');
      draft.setAttribute('role', 'dialog');
      document.body.append(draft);
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      document.dispatchEvent(new Event('visibilitychange'));
      await flushPromises();
      expect(t.registration.update).toHaveBeenCalledTimes(2);
    } finally { t.stop(); }
  });
  it('retries failed registration and failed update checks', async () => {
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
    } finally { t.stop(); }
  });
  it('merges overlapping checks and removes listeners and timers on disposal', async () => {
    vi.useFakeTimers();
    const t = setup();
    try {
      await flushPromises();
      let finish!: () => void;
      t.registration.update.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('pageshow'));
      expect(t.registration.update).toHaveBeenCalledTimes(2);
      finish();
      await flushPromises();
      t.stop();
      window.dispatchEvent(new Event('online'));
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(60_000);
      await flushPromises();
      expect(t.registration.update).toHaveBeenCalledTimes(2);
    } finally { t.stop(); }
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('workbox-precaching', () => ({
  cleanupOutdatedCaches: vi.fn(), precacheAndRoute: vi.fn(), createHandlerBoundToURL: vi.fn(),
}));
vi.mock('workbox-routing', () => ({ NavigationRoute: class {}, registerRoute: vi.fn() }));

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('immediate service worker updates', () => {
  it('refreshes every page without blocking activation on pending or failed navigation', async () => {
    const pages = [
      { url: 'https://ledger.test/', navigate: vi.fn(() => new Promise<null>(() => {})) },
      { url: 'https://ledger.test/?account=1', navigate: vi.fn(async () => { throw new Error('page closed'); }) },
    ];
    const scope = Object.assign(new EventTarget(), {
      skipWaiting: vi.fn(async () => {}),
      clients: { claim: vi.fn(async () => {}), matchAll: vi.fn(async () => pages) },
      __WB_MANIFEST: [],
    });
    vi.stubGlobal('self', scope);
    await import('../sw');
    expect(scope.skipWaiting).toHaveBeenCalledTimes(1);
    const waitUntil = vi.fn<(work: Promise<unknown>) => void>();
    scope.dispatchEvent(Object.assign(new Event('activate'), { waitUntil }));
    await expect(waitUntil.mock.calls[0]![0]).resolves.toBeUndefined();
    expect(scope.clients.claim).toHaveBeenCalledTimes(1);
    expect(scope.clients.matchAll).toHaveBeenCalledWith({ type: 'window' });
    expect(scope.clients.claim.mock.invocationCallOrder[0]).toBeLessThan(scope.clients.matchAll.mock.invocationCallOrder[0]!);
    for (const page of pages) expect(page.navigate).toHaveBeenCalledWith(page.url);
  });
});

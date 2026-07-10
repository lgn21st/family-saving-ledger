import { afterEach, describe, expect, it, vi } from "vitest";

describe("supabaseClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("loads safely when Supabase environment variables are missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.resetModules();

    const clientModule = await import("../supabaseClient");

    expect(clientModule.isSupabaseConfigured).toBe(false);
    expect(clientModule.supabase).toBeDefined();
  });
});

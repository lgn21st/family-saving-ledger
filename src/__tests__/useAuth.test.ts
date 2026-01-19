import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useAuth } from "../composables/useAuth";

type AppUser = {
  id: string;
  name: string;
  role: "parent" | "child";
  pin: string;
};

const createSupabaseMock = (user: AppUser | null) => {
  return {
    from: (_table: string) => ({
      select: () => ({
        eq: (_field: string, _value: unknown) => ({
          eq: (_field2: string, _value2: unknown) => ({
            maybeSingle: () => Promise.resolve({ data: user, error: null }),
          }),
          maybeSingle: () => Promise.resolve({ data: user, error: null }),
        }),
      }),
    }),
  };
};

describe("useAuth", () => {
  it("validates PIN length and blocks login", async () => {
    const supabase = createSupabaseMock(null);
    const user = ref<AppUser | null>(null);
    const loginPin = ref("123");
    const selectedLoginUserId = ref("user-1");
    const sessionStatus = ref<string | null>(null);
    const loading = ref(false);
    const setStatus = vi.fn();

    const { handleLogin } = useAuth({
      supabase,
      user,
      loginPin,
      selectedLoginUserId,
      isSupabaseConfigured: true,
      sessionStatus,
      loading,
      setStatus,
    });

    await handleLogin();
    expect(setStatus).toHaveBeenCalledWith("请输入 4 位 PIN。");
    expect(user.value).toBeNull();
  });

  it("logs in and stores session", async () => {
    const supabase = createSupabaseMock({
      id: "user-1",
      name: "爸爸",
      role: "parent",
      pin: "1234",
    });
    const user = ref<AppUser | null>(null);
    const loginPin = ref("1234");
    const selectedLoginUserId = ref("user-1");
    const sessionStatus = ref<string | null>(null);
    const loading = ref(false);
    const setStatus = vi.fn();

    const { handleLogin } = useAuth({
      supabase,
      user,
      loginPin,
      selectedLoginUserId,
      isSupabaseConfigured: true,
      sessionStatus,
      loading,
      setStatus,
    });

    await handleLogin();
    expect(user.value?.id).toBe("user-1");
    expect(loginPin.value).toBe("");
    expect(sessionStorage.getItem("homebank.session")).toContain("user-1");
  });
});

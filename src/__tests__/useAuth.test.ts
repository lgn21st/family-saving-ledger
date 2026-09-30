import { queryMock } from "../test/setup";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../composables/useAuth";
import type { AppUser } from "../types";
const parent: AppUser = { id: "user-1", name: "爸爸", role: "parent" };
const setup = (row: AppUser | null = parent, configured = true) => {
  const maybeSingle = vi.fn(async () => ({ data: row, error: null }));
  const query = queryMock(() => ({ data: row ? [row] : [], error: null }));
  query.maybeSingle = maybeSingle;
  const supabase = { from: vi.fn(() => ({ select: vi.fn(() => query) })) };
  const setStatus = vi.fn();
  return {
    auth: useAuth({ supabase, isSupabaseConfigured: configured, setStatus }),
    setStatus,
    maybeSingle,
    query,
    supabase,
  };
};
describe("useAuth", () => {
  beforeEach(() => sessionStorage.clear());
  it("owns login selection and validates PIN before making a query", async () => {
    const { auth, setStatus, maybeSingle } = setup();
    await auth.handleLogin();
    expect(setStatus).toHaveBeenLastCalledWith("请选择登录用户。");
    auth.selectLoginUser("user-1");
    auth.loginPin.value = "123";
    await auth.handleLogin();
    expect(setStatus).toHaveBeenLastCalledWith("请输入 4 位 PIN。");
    expect(maybeSingle).not.toHaveBeenCalled();
    auth.selectLoginUser("another");
    expect(auth.loginPin.value).toBe("");
  });
  it("logs in, stores the existing session format and clears its PIN", async () => {
    const { auth, query } = setup();
    auth.selectLoginUser("user-1");
    auth.loginPin.value = "1234";
    await auth.handleLogin();
    expect(query.eq).toHaveBeenCalledWith("pin", "1234");
    expect(auth.user.value?.id).toBe("user-1");
    expect(auth.loginPin.value).toBe("");
    expect(JSON.parse(sessionStorage.getItem("homebank.session")!).userId).toBe(
      "user-1",
    );
    auth.handleLogout();
    expect(auth.user.value).toBeNull();
    expect(auth.selectedLoginUserId.value).toBeNull();
    expect(sessionStorage.getItem("homebank.session")).toBeNull();
  });
  it("rejects archived users on both PIN login and session restoration", async () => {
    const { auth, setStatus } = setup({ ...parent, is_active: false });
    auth.selectLoginUser("user-1");
    auth.loginPin.value = "1234";
    await auth.handleLogin();
    expect(auth.user.value).toBeNull();
    expect(setStatus).toHaveBeenLastCalledWith("PIN 无效，请重试。");
    sessionStorage.setItem(
      "homebank.session",
      JSON.stringify({ userId: "user-1", expiresAt: Date.now() + 1000 }),
    );
    await auth.checkSession();
    expect(auth.user.value).toBeNull();
    expect(sessionStorage.getItem("homebank.session")).toBeNull();
  });
  it("restores a valid session and discards malformed or expired sessions", async () => {
    const { auth, maybeSingle } = setup();
    sessionStorage.setItem("homebank.session", "{");
    await auth.checkSession();
    expect(sessionStorage.getItem("homebank.session")).toBeNull();
    sessionStorage.setItem(
      "homebank.session",
      JSON.stringify({ userId: "user-1", expiresAt: 1 }),
    );
    await auth.checkSession();
    expect(auth.sessionStatus.value).toBe("登录已过期，请重新登录。");
    expect(maybeSingle).not.toHaveBeenCalled();
    sessionStorage.setItem(
      "homebank.session",
      JSON.stringify({ userId: "user-1", expiresAt: Date.now() + 1000 }),
    );
    await auth.checkSession();
    expect(auth.user.value?.id).toBe("user-1");
  });
  it("skips remote requests when Supabase is not configured", async () => {
    const { auth, supabase, setStatus } = setup(parent, false);
    await auth.handleLogin();
    await auth.checkSession();
    expect(setStatus).toHaveBeenLastCalledWith("请先配置 Supabase 环境变量。");
    expect(supabase.from).not.toHaveBeenCalled();
  });
  it("does not restore a session from a response received after logout", async () => {
    const { auth, maybeSingle } = setup();
    let finish!: (value: { data: AppUser; error: null }) => void;
    maybeSingle.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const restoring = auth.restoreSession("user-1");
    auth.handleLogout();
    finish({ data: parent, error: null });
    await restoring;
    expect(auth.user.value).toBeNull();
    expect(auth.loading.value).toBe(false);
  });
  it("releases busy state after an unexpected login transport error", async () => {
    const { auth, maybeSingle, setStatus } = setup();
    auth.selectLoginUser("user-1");
    auth.loginPin.value = "1234";
    maybeSingle.mockRejectedValueOnce(new Error("network"));
    await auth.handleLogin();
    expect(auth.loading.value).toBe(false);
    expect(setStatus).toHaveBeenLastCalledWith("登录失败，请重试。");
  });
});

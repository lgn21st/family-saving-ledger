import { queryMock } from "../test/setup";
import type { AppUser } from "../types";
import { describe, expect, it, vi } from "vitest";

import { useUsers } from "../composables/useUsers";

const createSupabaseMock = (users: AppUser[]) => {
  return { from: () => ({ select: () => {
    let role: unknown;
    const query = queryMock(() => ({ data: users.filter((user) => !role || user.role === role), error: null }));
    query.eq.mockImplementation((_field, value) => { role = value; return query; });
    return query;
  } }) };
};

describe("useUsers", () => {
  it.each(["response", "rejection"])("recovers a failed login member read (%s)", async (failure) => {
    const read = vi.fn()
      .mockImplementationOnce(() => {
        if (failure === "rejection") throw new Error("Offline");
        return { data: null, error: { message: "Offline" } };
      })
      .mockResolvedValueOnce({ data: [{ id: "parent", name: "爸爸", role: "parent" }], error: null });
    const select = vi.fn(() => queryMock(read));
    const users = useUsers({ supabase: { from: () => ({ select }) }, setErrorStatus: vi.fn() });
    expect(users.loginUsersState.value).toBe("loading");
    expect(await users.loadLoginUsers()).toBe(false);
    expect(users.loginUsersState.value).toBe("error");
    expect(await users.loadLoginUsers()).toBe(true);
    expect(users.loginUsersState.value).toBe("ready");
    expect(users.loginUsers.value[0]?.id).toBe("parent");
    expect(select).toHaveBeenCalledWith("id, name, role, avatar_id, is_active, created_at, archived_at, archived_by");
  });

  it("ignores an older failed response after a newer successful read", async () => {
    let finish!: (value: { data: null; error: { message: string } }) => void;
    const read = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }))
      .mockResolvedValueOnce({ data: [{ id: "parent", name: "爸爸", role: "parent" }], error: null });
    const setErrorStatus = vi.fn();
    const users = useUsers({ supabase: { from: () => ({ select: () => queryMock(read) }) }, setErrorStatus });
    const first = users.loadLoginUsers();
    await vi.waitFor(() => expect(finish).toBeDefined());
    await users.loadLoginUsers();
    finish({ data: null, error: { message: "Old failure" } });
    expect(await first).toBe(false);
    expect(users.loginUsersState.value).toBe("ready");
    expect(users.loginUsers.value[0]?.id).toBe("parent");
    expect(setErrorStatus).not.toHaveBeenCalled();
  });
  it("loads child users", async () => {
    const supabase = createSupabaseMock([
      { id: "p1", name: "爸爸", role: "parent", pin: "1234" },
      {
        id: "c1",
        name: "小女儿",
        role: "child",
        pin: "1111",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "c2",
        name: "已归档孩子",
        role: "child",
        pin: "2222",
        is_active: false,
      },
    ]);
    const setErrorStatus = vi.fn();
    const { childUsers, loadChildUsers } = useUsers({
      supabase,
      setErrorStatus,
    });

    await loadChildUsers();

    expect(childUsers.value).toHaveLength(1);
    expect(childUsers.value[0]?.id).toBe("c1");
  });

  it("orders login users by parent name then child created_at", async () => {
    const supabase = createSupabaseMock([
      {
        id: "c2",
        name: "小儿子",
        role: "child",
        pin: "2222",
        created_at: "2024-01-02T00:00:00Z",
      },
      { id: "p2", name: "Bob", role: "parent", pin: "2345" },
      { id: "p1", name: "Alice", role: "parent", pin: "1234" },
      {
        id: "c1",
        name: "小女儿",
        role: "child",
        pin: "1111",
        created_at: "2024-01-01T00:00:00Z",
      },
    ]);
    const setErrorStatus = vi.fn();
    const { loginUsers, loadLoginUsers } = useUsers({
      supabase,
      setErrorStatus,
    });

    await loadLoginUsers();

    expect(loginUsers.value.map((user) => user.id)).toEqual([
      "p1",
      "p2",
      "c1",
      "c2",
    ]);
  });
});

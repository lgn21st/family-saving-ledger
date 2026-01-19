import { describe, expect, it, vi } from "vitest";

import { useUsers } from "../composables/useUsers";

type AppUser = {
  id: string;
  name: string;
  role: "parent" | "child";
  pin: string;
  created_at?: string;
};

const createSupabaseMock = (users: AppUser[]) => {
  return {
    from: () => ({
      select: () => ({
        eq: (...args: [string, unknown]) => {
          const value = args[1];
          return {
            order: () =>
              Promise.resolve({
                data: users.filter((user) => user.role === value),
                error: null,
              }),
          };
        },
        order: () => Promise.resolve({ data: users, error: null }),
      }),
    }),
  };
};

describe("useUsers", () => {
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

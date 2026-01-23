import { nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useBootstrap } from "../composables/useBootstrap";

describe("useBootstrap", () => {
  it("selects first login user after loading", async () => {
    const loginUsers = ref([]);
    const selectedLoginUserId = ref<string | null>(null);
    const loadLoginUsers = vi.fn(async () => {
      loginUsers.value = [
        { id: "user-1", role: "parent" },
        { id: "user-2", role: "child" },
      ];
    });

    const { loadLoginUsersAndSelect } = useBootstrap({
      isSupabaseConfigured: true,
      user: ref(null),
      loginUsers,
      selectedLoginUserId,
      loadLoginUsers,
      checkSession: vi.fn(async () => undefined),
      loadAccounts: vi.fn(async () => undefined),
      loadChildUsers: vi.fn(async () => undefined),
    });

    await loadLoginUsersAndSelect();
    expect(loadLoginUsers).toHaveBeenCalled();
    expect(selectedLoginUserId.value).toBe("user-1");
  });

  it("skips bootstrap when configured is false or user exists", async () => {
    const loadLoginUsers = vi.fn(async () => undefined);
    const checkSession = vi.fn(async () => undefined);

    const { bootstrap: skipByConfig } = useBootstrap({
      isSupabaseConfigured: false,
      user: ref(null),
      loginUsers: ref([]),
      selectedLoginUserId: ref(null),
      loadLoginUsers,
      checkSession,
      loadAccounts: vi.fn(async () => undefined),
      loadChildUsers: vi.fn(async () => undefined),
    });

    await skipByConfig();
    expect(loadLoginUsers).not.toHaveBeenCalled();
    expect(checkSession).not.toHaveBeenCalled();

    const { bootstrap: skipByUser } = useBootstrap({
      isSupabaseConfigured: true,
      user: ref({ id: "user-1", role: "parent" }),
      loginUsers: ref([]),
      selectedLoginUserId: ref(null),
      loadLoginUsers,
      checkSession,
      loadAccounts: vi.fn(async () => undefined),
      loadChildUsers: vi.fn(async () => undefined),
    });

    await skipByUser();
    expect(loadLoginUsers).not.toHaveBeenCalled();
    expect(checkSession).not.toHaveBeenCalled();
  });

  it("loads accounts and child users on user change", async () => {
    const user = ref(null);
    const loadAccounts = vi.fn(async () => undefined);
    const loadChildUsers = vi.fn(async () => undefined);

    useBootstrap({
      isSupabaseConfigured: true,
      user,
      loginUsers: ref([]),
      selectedLoginUserId: ref(null),
      loadLoginUsers: vi.fn(async () => undefined),
      checkSession: vi.fn(async () => undefined),
      loadAccounts,
      loadChildUsers,
    });

    user.value = { id: "parent", role: "parent" };
    await nextTick();

    expect(loadAccounts).toHaveBeenCalledWith({ id: "parent", role: "parent" });
    expect(loadChildUsers).toHaveBeenCalled();
  });
});

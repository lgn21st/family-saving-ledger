import { queryMock } from "../test/setup";
import type { AppUser } from "../types";
import { effectScope, nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useLedgerData } from "../composables/useLedgerData";
const parent: AppUser = { id: "parent", name: "爸爸", role: "parent" };
const children: AppUser[] = [
  { id: "child-1", name: "小乐", role: "child" },
  { id: "child-2", name: "小宝", role: "child" },
];
const accounts = children.map((child, i) => ({
  id: `acc-${i + 1}`,
  name: "日常",
  currency: "CNY",
  owner_child_id: child.id,
  created_by: "parent",
  is_active: true,
}));
const setup = () => {
  const user = ref<AppUser | null>(null);
  const accountRead = vi.fn(async (owner?: string) => ({
    data: owner ? accounts.filter((a) => a.owner_child_id === owner) : accounts,
    error: null,
  }));
  const childRead = vi.fn(async () => ({ data: children, error: null }));
  const loginRead = vi.fn(async () => ({
    data: [parent, ...children],
    error: null,
  }));
  const balanceRead = vi.fn(async (): Promise<{ data: { account_id: string; balance: number }[]; error: { message: string } | null }> => ({
    data: [{ account_id: "acc-1", balance: 12 }],
    error: null,
  }));
  const supabase = {
    from: vi.fn((table: string) => {
      let owner: string | undefined;
      let childrenOnly = false;
      const query = queryMock(() => table === "accounts" ? accountRead(owner)
        : table === "account_balances" ? balanceRead()
        : table === "settings" ? { data: [{ timezone: "Asia/Shanghai" }], error: null }
        : childrenOnly ? childRead() : loginRead());
      query.eq.mockImplementation((field, value) => {
        if (field === "owner_child_id") owner = String(value);
        if (field === "role") childrenOnly = true;
        return query;
      });
      return { select: () => query };
    }),
  };
  const setErrorStatus = vi.fn();
  const scope = effectScope();
  const data = scope.run(() =>
    useLedgerData({ supabase, user, setErrorStatus }),
  )!;
  return {
    data,
    user,
    scope,
    accountRead,
    childRead,
    loginRead,
    balanceRead,
    setErrorStatus,
  };
};
describe("useLedgerData", () => {
  it("reports incomplete reloads and discards a response after disposal", async () => {
    const { data, user, scope, balanceRead, childRead, accountRead } = setup();
    user.value = parent;
    await vi.waitFor(() => expect(data.childUsers.value).toHaveLength(2));
    balanceRead.mockResolvedValueOnce({ data: [], error: { message: "Offline" } });
    childRead.mockClear();
    expect(await data.reload()).toBe(false);
    expect(childRead).not.toHaveBeenCalled();
    let finish!: (value: { data: typeof accounts; error: null }) => void;
    accountRead.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const reading = data.reload();
    await vi.waitFor(() => expect(finish).toBeDefined());
    scope.stop();
    finish({ data: accounts, error: null });
    expect(await reading).toBe(false);
    expect(data.accounts.value).toEqual([]);
    expect(data.balances.value).toEqual({});
  });
  it("loads session-scoped accounts, balances, children and configured timezone", async () => {
    const { data, user, scope } = setup();
    user.value = parent;
    await vi.waitFor(() => expect(data.childUsers.value).toHaveLength(2));
    expect(data.accounts.value).toHaveLength(2);
    expect(data.balances.value["acc-1"]).toBe(12);
    await data.loadLedgerTimeZone();
    expect(data.ledgerTimeZone.value).toBe("Asia/Shanghai");
    user.value = { ...children[1] };
    await vi.waitFor(() =>
      expect(data.accounts.value.map((a) => a.id)).toEqual(["acc-2"]),
    );
    expect(data.childUsers.value).toEqual([]);
    scope.stop();
  });
  it("routes changes to the read data they invalidate", async () => {
    const {
      data,
      user,
      scope,
      childRead,
      loginRead,
      accountRead,
      balanceRead,
    } = setup();
    user.value = parent;
    await vi.waitFor(() => expect(data.childUsers.value).toHaveLength(2));
    vi.clearAllMocks();
    await data.refresh({ kind: "members" });
    expect(childRead).toHaveBeenCalledTimes(1);
    expect(loginRead).toHaveBeenCalledTimes(1);
    expect(accountRead).not.toHaveBeenCalled();
    await data.refresh({ kind: "members", accountsChanged: true });
    expect(accountRead).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();
    await data.refresh({ kind: "transactions" });
    expect(balanceRead).toHaveBeenCalledTimes(1);
    expect(accountRead).not.toHaveBeenCalled();
    expect(childRead).not.toHaveBeenCalled();
    scope.stop();
  });
  it("discards an old account response after logout or a different login", async () => {
    const { data, user, scope, accountRead } = setup();
    let finish!: (value: { data: typeof accounts; error: null }) => void;
    accountRead.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    user.value = parent;
    await nextTick();
    user.value = null;
    await nextTick();
    expect(data.accounts.value).toEqual([]);
    user.value = { ...children[1] };
    await vi.waitFor(() =>
      expect(data.accounts.value.map((a) => a.id)).toEqual(["acc-2"]),
    );
    finish({ data: accounts, error: null });
    await nextTick();
    await nextTick();
    expect(data.accounts.value.map((a) => a.id)).toEqual(["acc-2"]);
    expect(data.childUsers.value).toEqual([]);
    scope.stop();
  });
  it("discards balances and children still in flight when the session ends", async () => {
    const { data, user, scope, balanceRead, childRead } = setup();
    user.value = parent;
    await vi.waitFor(() => expect(data.childUsers.value).toHaveLength(2));
    let finishBalance!: (value: {
      data: { account_id: string; balance: number }[];
      error: null;
    }) => void;
    let finishChild!: (value: { data: typeof children; error: null }) => void;
    balanceRead.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishBalance = resolve;
        }),
    );
    childRead.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishChild = resolve;
        }),
    );
    const balanceLoad = data.loadBalances(data.accounts.value);
    const childLoad = data.loadChildUsers();
    user.value = null;
    await nextTick();
    finishBalance({
      data: [{ account_id: "acc-1", balance: 99 }],
      error: null,
    });
    finishChild({ data: children, error: null });
    await Promise.all([balanceLoad, childLoad]);
    expect(data.balances.value).toEqual({});
    expect(data.childUsers.value).toEqual([]);
    scope.stop();
  });
});

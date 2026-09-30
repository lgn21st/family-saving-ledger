import { queryMock, transactionFixture } from "../test/setup";
import type { AppUser, Transaction, LedgerActionResult } from "../types";
import { effectScope, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useAccountHistory } from "../composables/useAccountHistory";

const account = {
  id: "acc-1",
  name: "日常",
  currency: "CNY",
  owner_child_id: "child-1",
  created_by: "parent",
  is_active: true,
};
const transaction: Transaction = {
  id: "txn-1",
  account_id: "acc-1",
  type: "deposit",
  amount: 8,
  currency: "CNY",
  note: "奖励",
  related_account_id: null,
  created_by: "parent",
  created_at: "2026-09-20T00:00:00Z",
  is_void: false,
};
const setup = () => {
  const user = ref<AppUser | null>({ id: "parent", name: "爸爸", role: "parent" });
  const selectedAccount = ref(account);
  const voidTransaction = vi.fn(async (): Promise<LedgerActionResult> => ({ ok: true }));
  const setErrorStatus = vi.fn();
  const setSuccessStatus = vi.fn();
  const scope = effectScope();
  const history = scope.run(() =>
    useAccountHistory({
      supabase: { rpc: vi.fn(), from: vi.fn() },
      user,
      selectedAccount,
      accounts: ref([account]),
      childUsers: ref([]),
      timeZone: ref("Asia/Singapore"),
      voidTransaction,
      setErrorStatus,
      setSuccessStatus,
    }),
  )!;
  return {
    user,
    selectedAccount,
    voidTransaction,
    setErrorStatus,
    setSuccessStatus,
    scope,
    history,
  };
};
describe("useAccountHistory", () => {
  it("guards the selected account and child role before voiding a transaction", async () => {
    const { history, user, voidTransaction, scope } = setup();
    await history.handleVoidTransaction({
      ...transaction,
      account_id: "other",
    });
    await history.handleVoidTransaction({ ...transaction, is_void: true });
    user.value = { id: "child-1", name: "小宝", role: "child" };
    await history.handleVoidTransaction(transaction);
    expect(voidTransaction).not.toHaveBeenCalled();
    scope.stop();
  });
  it("owns void busy state, prevents duplicates and retains failure feedback", async () => {
    const { history, voidTransaction, setErrorStatus, scope } = setup();
    let finish!: (result: { ok: false; message: string }) => void;
    voidTransaction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const saving = history.handleVoidTransaction(transaction);
    expect(history.transactionLoading.value).toBe(true);
    await history.handleVoidTransaction(transaction);
    expect(voidTransaction).toHaveBeenCalledTimes(1);
    expect(voidTransaction).toHaveBeenCalledWith("txn-1");
    finish({ ok: false, message: "余额不能为负数" });
    await saving;
    expect(history.transactionLoading.value).toBe(false);
    expect(setErrorStatus).toHaveBeenCalledWith("余额不能为负数");
    scope.stop();
  });
  it("does not publish an old session's result or busy state into a new login", async () => {
    const { history, user, voidTransaction, setSuccessStatus, scope } = setup();
    let finish!: (result: { ok: true }) => void;
    voidTransaction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const saving = history.handleVoidTransaction(transaction);
    user.value = null;
    expect(history.transactionLoading.value).toBe(false);
    user.value = { id: "another-parent", name: "妈妈", role: "parent" };
    finish({ ok: true });
    await saving;
    expect(setSuccessStatus).not.toHaveBeenCalled();
    expect(history.transactionLoading.value).toBe(false);
    scope.stop();
  });
  it("explains the complete current month in ledger time, excluding voids and other accounts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-31T12:00:00Z"));
    const rows = [
      transactionFixture({ amount: 0.1, created_at: "2025-12-31T16:00:00Z" }),
      transactionFixture({ amount: 0.2, created_at: "2026-01-10T00:00:00Z" }),
      transactionFixture({ type: "withdrawal", amount: 0.1, created_at: "2026-01-10T00:00:00Z" }),
      transactionFixture({ type: "transfer_in", amount: 10, created_at: "2026-01-10T00:00:00Z" }),
      transactionFixture({ type: "transfer_out", amount: 3, created_at: "2026-01-10T00:00:00Z" }),
      transactionFixture({ type: "interest", amount: 0.01, interest_month: "2025-12", created_at: "2025-12-31T16:00:00Z" }),
      transactionFixture({ amount: 100, created_at: "2025-12-31T15:59:59Z" }),
      transactionFixture({ amount: 100, created_at: "2026-01-31T16:00:00Z" }),
      transactionFixture({ amount: 999, is_void: true, created_at: "2026-01-10T00:00:00Z" }),
      transactionFixture({ amount: 999, account_id: "other", created_at: "2026-01-10T00:00:00Z" }),
    ];
    const read = vi.fn(() => ({ data: rows, count: rows.length, error: null }));
    const scope = effectScope();
    try {
      const history = scope.run(() => useAccountHistory({
        supabase: { from: () => ({ select: () => queryMock(read) }), rpc: async () => ({ data: 0, error: null }) },
        user: ref<AppUser | null>({ id: "child-1", name: "小乐", role: "child" }),
        accounts: ref([account]), childUsers: ref([]), selectedAccount: ref(account), timeZone: ref("Asia/Singapore"),
        voidTransaction: vi.fn(), setErrorStatus: vi.fn(), setSuccessStatus: vi.fn(),
      }))!;
      expect(history.monthChanges.value).toBeNull();
      expect(await history.refresh()).toBe(true);
      expect(history.monthChanges.value).toEqual({ deposit: 0.3, withdrawal: 0.1, transfer_in: 10, transfer_out: 3, interest: 0.01 });
      read.mockImplementation(() => { throw new Error("offline"); });
      expect(await history.refresh()).toBe(false);
      expect(history.monthChanges.value).toBeNull();
    } finally { scope.stop(); vi.useRealTimers(); }
  });

});

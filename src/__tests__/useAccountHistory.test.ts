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
});

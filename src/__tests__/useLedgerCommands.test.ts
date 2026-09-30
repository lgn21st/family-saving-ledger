import type { AppUser, SupabaseRpcClient } from "../types";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLedgerCommands } from "../composables/useLedgerCommands";
import type { LedgerCommands } from "../composables/useLedgerCommands";
const setup = () => {
  const user = ref<AppUser | null>({
    id: "parent",
    name: "爸爸",
    role: "parent",
  });
  const rpc = vi.fn<SupabaseRpcClient["rpc"]>(async () => ({
    data: null,
    error: null,
  }));
  const onChanged = vi.fn(async () => undefined);
  return {
    user,
    rpc,
    onChanged,
    commands: useLedgerCommands({ supabase: { rpc }, user, onChanged }),
  };
};
const cases: Array<
  [
    string,
    (commands: LedgerCommands) => Promise<unknown>,
    Record<string, unknown>,
    unknown,
  ]
> = [
  [
    "create_child",
    (c) => c.createChild({ name: "小宝", pin: "1234", avatarId: "child-2" }),
    {
      p_name: "小宝",
      p_pin: "1234",
      p_avatar_id: "child-2",
      p_created_by: "parent",
    },
    { kind: "members" },
  ],
  [
    "update_child_name",
    (c) => c.updateChildName("child-1", "小宝"),
    { p_child_id: "child-1", p_name: "小宝", p_updated_by: "parent" },
    { kind: "members" },
  ],
  [
    "archive_child",
    (c) => c.archiveChild("child-1"),
    { p_child_id: "child-1", p_archived_by: "parent" },
    { kind: "members", accountsChanged: true },
  ],
  [
    "create_account",
    (c) =>
      c.createAccount({
        name: "日常",
        currency: "CNY",
        ownerChildId: "child-1",
      }),
    {
      p_name: "日常",
      p_currency: "CNY",
      p_owner_child_id: "child-1",
      p_created_by: "parent",
    },
    { kind: "accounts" },
  ],
  [
    "update_account_name",
    (c) => c.updateAccountName("acc-1", "新名称"),
    { p_account_id: "acc-1", p_name: "新名称", p_updated_by: "parent" },
    { kind: "accounts" },
  ],
  [
    "close_account",
    (c) => c.closeAccount("acc-1"),
    { p_account_id: "acc-1", p_closed_by: "parent" },
    { kind: "accounts" },
  ],
  [
    "apply_transaction",
    (c) =>
      c.addTransaction({
        accountId: "acc-1",
        type: "withdrawal",
        amount: 8,
        note: "车费",
      }),
    {
      p_account_id: "acc-1",
      p_type: "withdrawal",
      p_amount: 8,
      p_note: "车费",
      p_created_by: "parent",
    },
    { kind: "transactions" },
  ],
  [
    "transfer_between_accounts",
    (c) =>
      c.transfer({
        sourceAccountId: "acc-1",
        targetAccountId: "acc-2",
        amount: 5,
        note: "礼物",
      }),
    {
      p_source_account_id: "acc-1",
      p_target_account_id: "acc-2",
      p_amount: 5,
      p_note: "礼物",
      p_created_by: "parent",
    },
    { kind: "transactions" },
  ],
  [
    "void_transaction",
    (c) => c.voidTransaction("txn-1"),
    { p_transaction_id: "txn-1", p_voided_by: "parent" },
    { kind: "transactions" },
  ],
];
describe("useLedgerCommands", () => {
  beforeEach(() => localStorage.clear());
  it.each(cases)(
    "preserves the %s RPC contract and announces its affected data",
    async (fn, invoke, args, change) => {
      const { commands, rpc, onChanged } = setup();
      expect(await invoke(commands)).toEqual({ ok: true });
      expect(rpc).toHaveBeenCalledWith(
        fn,
        ["apply_transaction", "transfer_between_accounts"].includes(fn)
          ? { ...args, p_request_id: expect.any(String) }
          : args,
      );
      expect(onChanged).toHaveBeenCalledWith(change);
    },
  );
  it("blocks child and missing sessions before invoking a write", async () => {
    const { commands, rpc, user } = setup();
    user.value = { id: "child-1", name: "小宝", role: "child" };
    expect((await commands.closeAccount("acc-1")).ok).toBe(false);
    user.value = null;
    expect((await commands.closeAccount("acc-1")).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("maps RPC rejections and does not announce a mutation that failed", async () => {
    const { commands, rpc, onChanged } = setup();
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Insufficient balance", code: "P0001" },
    });
    expect(
      await commands.transfer({
        sourceAccountId: "acc-1",
        targetAccountId: "acc-2",
        amount: 5,
        note: "",
      }),
    ).toEqual({ ok: false, message: "余额不足。" });
    expect(onChanged).not.toHaveBeenCalled();
    rpc.mockRejectedValueOnce(new Error("network"));
    expect(await commands.closeAccount("acc-1")).toEqual({
      ok: false,
      message: "network",
    });
  });
  it("reports a committed write with a refresh warning instead of inviting a second write", async () => {
    const { commands, rpc, onChanged } = setup();
    onChanged.mockRejectedValueOnce(new Error("read failed"));
    expect(await commands.closeAccount("acc-1")).toEqual({
      ok: true,
      warning: "操作已保存，但刷新失败，请重新打开账本。",
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("does not propagate an earlier session's completed command into the new session", async () => {
    const { commands, rpc, onChanged, user } = setup();
    let finish!: (value: { data: null; error: null }) => void;
    rpc.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const saving = commands.closeAccount("acc-1");
    user.value = { id: "child-1", name: "小宝", role: "child" };
    finish({ data: null, error: null });
    expect(await saving).toEqual({ ok: true });
    expect(onChanged).not.toHaveBeenCalled();
  });
  const input = {
    accountId: "acc-1",
    type: "deposit" as const,
    amount: 8,
    note: "奖励",
  };
  it.each(["throw", "gateway", "connection"])(
    "restores the exact receipt after %s and a reload",
    async (failure) => {
      const first = setup();
      if (failure === "throw")
        first.rpc.mockRejectedValueOnce(new Error("lost response"));
      else
        first.rpc.mockResolvedValueOnce({
          data: null,
          error: {
            message: "gateway",
            code: failure === "connection" ? "08006" : "GATEWAY_ERROR",
          },
          status: 502,
        });
      expect(await first.commands.addTransaction(input)).toMatchObject({
        ok: false,
        uncertain: true,
      });
      const args = first.rpc.mock.calls[0]![1];
      expect(first.commands.pendingWrite.value?.requestId).toBe(
        args?.p_request_id,
      );
      const reloaded = setup();
      expect(reloaded.commands.pendingWrite.value?.args.p_amount).toBe(8);
      expect(
        await reloaded.commands.addTransaction({ ...input, amount: 9 }),
      ).toMatchObject({ uncertain: true });
      expect(reloaded.rpc).not.toHaveBeenCalled();
      expect(await reloaded.commands.retryPending()).toEqual({ ok: true });
      expect(reloaded.rpc).toHaveBeenCalledWith("apply_transaction", args);
      expect(reloaded.commands.pendingWrite.value).toBeNull();
      expect(localStorage.getItem("homebank.pending-write.parent")).toBeNull();
    },
  );
  it("reuses a transfer receipt and clears a definitive SQL rejection", async () => {
    const { commands, rpc } = setup();
    const transfer = {
      sourceAccountId: "acc-1",
      targetAccountId: "acc-2",
      amount: 5,
      note: "",
    };
    rpc.mockRejectedValueOnce(new Error("offline"));
    await commands.transfer(transfer);
    const args = rpc.mock.calls[0]![1];
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "P0001", message: "Insufficient balance" },
      status: 400,
    });
    expect(await commands.retryPending()).toEqual({
      ok: false,
      message: "余额不足。",
    });
    expect(rpc).toHaveBeenLastCalledWith("transfer_between_accounts", args);
    expect(commands.pendingWrite.value).toBeNull();
    await commands.transfer(transfer);
    expect(rpc.mock.calls[2]![1]?.p_request_id).not.toBe(args?.p_request_id);
  });
  it("blocks duplicate in-flight writes and keeps receipts isolated by parent", async () => {
    const { commands, rpc, user, onChanged } = setup();
    let reject!: (reason: Error) => void;
    rpc.mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    const saving = commands.addTransaction(input);
    expect(await commands.addTransaction(input)).toMatchObject({ ok: false });
    expect(rpc).toHaveBeenCalledTimes(1);
    user.value = { id: "parent-2", name: "妈", role: "parent" };
    expect(commands.pendingWrite.value).toBeNull();
    reject(new Error("lost"));
    await saving;
    expect(onChanged).not.toHaveBeenCalled();
    expect(commands.pendingWrite.value).toBeNull();
    user.value = { id: "parent", name: "爸", role: "parent" };
    expect(commands.pendingWrite.value?.actorId).toBe("parent");
    user.value = { id: "child", name: "小宝", role: "child" };
    expect((await commands.retryPending()).ok).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("refuses a write when recovery storage is corrupt or unavailable", async () => {
    const { commands, rpc } = setup();
    localStorage.setItem("homebank.pending-write.parent", "invalid");
    expect((await commands.addTransaction(input)).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
    localStorage.clear();
    const storage = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    try {
      expect((await commands.addTransaction(input)).ok).toBe(false);
      expect(rpc).not.toHaveBeenCalled();
    } finally {
      storage.mockRestore();
    }
  });
  it("reports a confirmed write even if receipt cleanup fails", async () => {
    const { commands, rpc } = setup();
    const storage = vi
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {
        throw new Error("storage");
      });
    try {
      expect(await commands.addTransaction(input)).toMatchObject({
        ok: true,
        warning: expect.any(String),
      });
    } finally {
      storage.mockRestore();
    }
    const args = rpc.mock.calls[0]![1];
    expect(await commands.retryPending()).toEqual({ ok: true });
    expect(rpc).toHaveBeenLastCalledWith("apply_transaction", args);
  });

  it("keeps the original request ID when another tab has cleared its receipt", async () => {
    const first = setup();
    first.rpc.mockRejectedValueOnce(new Error("lost"));
    await first.commands.addTransaction(input);
    const originalArgs = first.rpc.mock.calls[0]![1];
    const otherTab = setup();
    expect(await otherTab.commands.retryPending()).toEqual({ ok: true });
    expect(localStorage.getItem("homebank.pending-write.parent")).toBeNull();
    expect(await first.commands.retryPending()).toEqual({ ok: true });
    expect(first.rpc).toHaveBeenLastCalledWith(
      "apply_transaction",
      originalArgs,
    );
  });
  it("does not replace a newer receipt from another tab, even for identical input", async () => {
    const first = setup();
    first.rpc.mockRejectedValueOnce(new Error("lost"));
    await first.commands.addTransaction(input);
    const otherTab = setup();
    await otherTab.commands.retryPending();
    otherTab.rpc.mockRejectedValueOnce(new Error("another lost response"));
    await otherTab.commands.addTransaction(input);
    const newer = otherTab.commands.pendingWrite.value;
    expect(await first.commands.retryPending()).toMatchObject({
      uncertain: true,
    });
    expect(first.rpc).toHaveBeenCalledTimes(1);
    expect(first.commands.pendingWrite.value).toEqual(newer);
    expect(
      JSON.parse(localStorage.getItem("homebank.pending-write.parent")!)
        .requestId,
    ).toBe(newer?.requestId);
  });
});

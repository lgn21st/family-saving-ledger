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
      expect(rpc).toHaveBeenCalledWith(fn, args);
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
});

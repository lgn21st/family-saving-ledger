import type { LedgerActionResult, Account } from "../types";
import { effectScope, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useLedgerEntry } from "../features/useLedgerEntry";
const source = {
  id: "acc-1",
  name: "零花钱",
  currency: "CNY",
  owner_child_id: "child-1",
  created_by: "parent",
  is_active: true,
};
const setup = () => {
  const services = {
    selectedAccount: ref<Account | null>(source),
    balances: ref({ "acc-1": 20 }),
    transferTargets: ref([{ ...source, id: "acc-2", ownerName: "小宝" }]),
    addTransaction: vi.fn(async (): Promise<LedgerActionResult> => ({ ok: true })),
    retryPending: vi.fn(async (): Promise<LedgerActionResult> => ({ ok: true })),
    transfer: vi.fn(async (): Promise<LedgerActionResult> => ({ ok: true })),
    setSuccessStatus: vi.fn(),
    setErrorStatus: vi.fn(),
  };
  return { services, form: useLedgerEntry(services) };
};
describe("useLedgerEntry", () => {
  it("validates account, finite positive amount and note", async () => {
    const { services, form } = setup();
    for (const value of ["", "0", "-1", "NaN", "Infinity", "2junk"]) {
      form.amountInput.value = value;
      expect(await form.handleAddTransaction("deposit")).toEqual({
        ok: false,
        message: "请输入有效金额。",
      });
    }
    form.amountInput.value = "8";
    expect(await form.handleAddTransaction("deposit")).toEqual({
      ok: false,
      message: "请输入备注。",
    });
    services.selectedAccount.value = null;
    expect(await form.handleAddTransaction("deposit")).toEqual({
      ok: false,
      message: "请选择可用账户。",
    });
    expect(services.addTransaction).not.toHaveBeenCalled();
  });
  it("captures the submitted account and draft before asynchronous work", async () => {
    const { services, form } = setup();
    form.amountInput.value = "8";
    form.noteInput.value = " 车费 ";
    let finish!: (value: { ok: true }) => void;
    services.addTransaction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const saving = form.handleAddTransaction("withdrawal");
    services.selectedAccount.value = { ...source, id: "acc-new" };
    expect(services.addTransaction).toHaveBeenCalledWith({
      accountId: "acc-1",
      type: "withdrawal",
      amount: 8,
      note: "车费",
    });
    expect((await form.handleAddTransaction("deposit")).ok).toBe(false);
    expect(services.addTransaction).toHaveBeenCalledTimes(1);
    finish({ ok: true });
    await saving;
    expect(form.amountInput.value).toBe("");
    expect(form.noteInput.value).toBe("");
    expect(form.loading.value).toBe(false);
  });
  it("retains a rejected draft for correction", async () => {
    const { services, form } = setup();
    form.amountInput.value = "8";
    form.noteInput.value = "车费";
    services.addTransaction.mockResolvedValueOnce({
      ok: false,
      message: "余额不足。",
    });
    expect(await form.handleAddTransaction("withdrawal")).toEqual({
      ok: false,
      message: "余额不足。",
    });
    expect(form.amountInput.value).toBe("8");
    expect(form.noteInput.value).toBe("车费");
    expect(services.setSuccessStatus).not.toHaveBeenCalled();
  });
  it("validates transfer target and balance, then sends values and clears the draft", async () => {
    const { services, form } = setup();
    form.transferAmount.value = "0";
    expect((await form.handleTransfer()).ok).toBe(false);
    form.transferAmount.value = "25";
    expect(await form.handleTransfer()).toEqual({
      ok: false,
      message: "转出金额不能超过当前余额。",
    });
    form.transferAmount.value = "5";
    form.transferTargetId.value = "missing";
    expect(await form.handleTransfer()).toEqual({
      ok: false,
      message: "请选择转入账户。",
    });
    form.transferTargetId.value = "acc-2";
    form.transferNote.value = " 礼物 ";
    expect(await form.handleTransfer()).toEqual({ ok: true });
    expect(services.transfer).toHaveBeenCalledWith({
      sourceAccountId: "acc-1",
      targetAccountId: "acc-2",
      amount: 5,
      note: "礼物",
    });
    expect(form.transferAmount.value).toBe("");
    expect(form.transferTargetId.value).toBe("");
    expect(form.transferNote.value).toBe("");
  });
  it("starts with a clean draft and independent busy state for each feature instance", () => {
    const first = setup();
    first.form.amountInput.value = "12";
    first.form.loading.value = true;
    const second = setup();
    expect(second.form.amountInput.value).toBe("");
    expect(second.form.loading.value).toBe(false);
  });
  it("clears a committed draft while retaining a refresh warning", async () => {
    const { services, form } = setup();
    form.amountInput.value = "8";
    form.noteInput.value = "车费";
    services.addTransaction.mockResolvedValueOnce({
      ok: true,
      warning: "刷新失败",
    });
    expect((await form.handleAddTransaction("deposit")).ok).toBe(true);
    expect(form.amountInput.value).toBe("");
    expect(services.setErrorStatus).toHaveBeenCalledWith("刷新失败");
  });
  it("does not publish feedback from an entry feature that has already been unmounted", async () => {
    const { services } = setup();
    const scope = effectScope();
    const form = scope.run(() => useLedgerEntry(services))!;
    form.amountInput.value = "8";
    form.noteInput.value = "车费";
    let finish!: (value: { ok: true }) => void;
    services.addTransaction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const saving = form.handleAddTransaction("deposit");
    scope.stop();
    finish({ ok: true });
    await saving;
    expect(services.setSuccessStatus).not.toHaveBeenCalled();
  });
});

import type { LedgerActionResult } from "../types";
import { effectScope, nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useAccountManagement } from "../features/useAccountManagement";
const account = {
  id: "acc-1",
  name: "零花钱",
  currency: "CNY",
  owner_child_id: "child-1",
  created_by: "parent",
  is_active: true,
};
const setup = () => {
  const services = {
    selectedChildId: ref<string | null>("child-1"),
    selectedAccountId: ref<string | null>("acc-1"),
    selectedChildAccounts: ref([account]),
    supportedCurrencies: ["SGD", "CNY"],
    createAccount: vi.fn(async (): Promise<LedgerActionResult> => ({ ok: true })),
    updateAccountName: vi.fn(async (): Promise<LedgerActionResult> => ({ ok: true })),
    closeAccount: vi.fn(async (): Promise<LedgerActionResult> => ({ ok: true })),
    setErrorStatus: vi.fn(),
    setSuccessStatus: vi.fn(),
  };
  const scope = effectScope();
  const form = scope.run(() => useAccountManagement(services))!;
  return { services, form, scope };
};
describe("useAccountManagement", () => {
  it("validates and sends explicit account values, then clears its own draft", async () => {
    const { services, form, scope } = setup();
    await form.handleCreateAccount();
    expect(services.setErrorStatus).toHaveBeenCalledWith("请输入账户名称。");
    form.newAccountName.value = " 零花钱 ";
    form.newAccountCurrency.value = "USD";
    await form.handleCreateAccount();
    expect(services.createAccount).not.toHaveBeenCalled();
    form.newAccountCurrency.value = "cny";
    await form.handleCreateAccount();
    expect(services.createAccount).toHaveBeenCalledWith({
      name: "零花钱",
      currency: "CNY",
      ownerChildId: "child-1",
    });
    expect(form.newAccountName.value).toBe("");
    expect(form.loading.value).toBe(false);
    scope.stop();
  });
  it("owns selection-dependent resets without a global form synchronization watcher", async () => {
    const { services, form, scope } = setup();
    form.showAccountCreator.value = true;
    form.newAccountName.value = "旧草稿";
    form.newAccountCurrency.value = "CNY";
    form.startEditAccount(account);
    services.selectedChildId.value = "child-2";
    await nextTick();
    expect(form.showAccountCreator.value).toBe(false);
    expect(form.newAccountName.value).toBe("");
    expect(form.newAccountCurrency.value).toBe("SGD");
    expect(form.newAccountOwnerId.value).toBe("child-2");
    expect(form.editingAccountId.value).toBeNull();
    scope.stop();
  });
  it("keeps a failed rename and clears an editor when its account disappears", async () => {
    const { services, form, scope } = setup();
    form.startEditAccount(account);
    form.editingAccountName.value = " ";
    await form.handleUpdateAccount();
    expect(services.updateAccountName).not.toHaveBeenCalled();
    form.editingAccountName.value = "新名称";
    services.updateAccountName.mockResolvedValueOnce({
      ok: false,
      message: "失败",
    });
    await form.handleUpdateAccount();
    expect(form.editingAccountName.value).toBe("新名称");
    services.selectedChildAccounts.value = [];
    await nextTick();
    expect(form.editingAccountId.value).toBeNull();
    form.startEditAccount(account);
    form.editingAccountName.value = "新名称";
    await form.handleUpdateAccount();
    expect(services.updateAccountName).toHaveBeenCalledWith("acc-1", "新名称");
    expect(form.editingAccountId.value).toBeNull();
    scope.stop();
  });
  it("closes accounts with a value command and retains state on rejection", async () => {
    const { services, form, scope } = setup();
    form.startEditAccount(account);
    services.closeAccount.mockResolvedValueOnce({
      ok: false,
      message: "余额未清零",
    });
    await form.handleCloseAccount(account);
    expect(form.editingAccountId.value).toBe("acc-1");
    await form.handleCloseAccount(account);
    expect(services.closeAccount).toHaveBeenCalledWith("acc-1");
    expect(form.editingAccountId.value).toBeNull();
    expect(services.setSuccessStatus).toHaveBeenCalledWith("账户已关闭。");
    scope.stop();
  });
  it("does not clear a new child's draft when an earlier creation request completes", async () => {
    const { services, form, scope } = setup();
    form.newAccountName.value = "孩子一的账户";
    let finish!: (value: { ok: true }) => void;
    services.createAccount.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const saving = form.handleCreateAccount();
    services.selectedChildId.value = "child-2";
    await nextTick();
    form.newAccountName.value = "孩子二的草稿";
    finish({ ok: true });
    await saving;
    expect(form.newAccountName.value).toBe("孩子二的草稿");
    expect(form.newAccountOwnerId.value).toBe("child-2");
    scope.stop();
  });
});

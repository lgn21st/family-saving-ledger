import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import AccountManagement from "../features/AccountManagement.vue";
import type { Account, AppUser } from "../types";

const child: AppUser = { id: "child-1", name: "小乐", role: "child" };
const account: Account = { id: "acc-1", name: "专项", currency: "CNY", owner_child_id: child.id, created_by: "parent", is_active: true };
const setup = (balance = 0) => {
  const services = {
    childUsers: ref([child]), selectedChildId: ref(child.id), selectedChild: ref(child),
    selectedChildAccounts: ref([account]), selectedAccountId: ref(account.id),
    balances: ref({ [account.id]: balance }),
    formatAmount: (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`,
    selectChild: vi.fn(), selectAccount: vi.fn(),
    createAccount: vi.fn(async () => ({ ok: true as const })),
    updateAccountName: vi.fn(async () => ({ ok: true as const })),
    closeAccount: vi.fn(async () => ({ ok: true as const })),
    setErrorStatus: vi.fn(), setSuccessStatus: vi.fn(),
  };
  render(AccountManagement, { props: { services } });
  return services;
};
describe("AccountManagement", () => {
  it("creates an account from its own draft and routes account selection", async () => {
    const services = setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /专项/ }));
    expect(services.selectAccount).toHaveBeenCalledWith(account.id);
    await user.click(screen.getByRole("button", { name: "创建账户" }));
    await user.type(screen.getByLabelText("账户名称"), "教育金");
    await user.selectOptions(screen.getByLabelText("币种"), "CNY");
    await user.click(screen.getByRole("button", { name: "创建" }));
    expect(services.createAccount).toHaveBeenCalledWith({ name: "教育金", currency: "CNY", ownerChildId: child.id });
    expect(screen.getByLabelText("账户名称")).toHaveValue("");
  });
  it("edits names and confirms closing zero-balance accounts", async () => {
    const services = setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "编辑" }));
    await user.clear(screen.getByLabelText("账户名称"));
    await user.type(screen.getByLabelText("账户名称"), "目标基金");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(services.updateAccountName).toHaveBeenCalledWith(account.id, "目标基金");
    await user.click(screen.getByRole("button", { name: "编辑" }));
    const trigger = screen.getByRole("button", { name: "关闭账户" });
    await user.click(trigger);
    expect(services.closeAccount).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "确认关闭" }));
    expect(services.closeAccount).toHaveBeenCalledWith(account.id);
  });
  it("hides closure when the displayed balance is nonzero", async () => {
    setup(0.01);
    await userEvent.setup().click(screen.getByRole("button", { name: "编辑" }));
    expect(screen.queryByRole("button", { name: "关闭账户" })).toBeNull();
  });
});

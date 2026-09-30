import { render, screen, waitFor } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import LedgerEntry from "../features/LedgerEntry.vue";
import type { Account, LedgerActionResult } from "../types";

const account: Account = { id: "acc-1", name: "零花钱", currency: "CNY", owner_child_id: "child-1", created_by: "parent", is_active: true };
const setup = () => {
  const services = {
    childUsers: ref([{ id: "child-1", name: "茉莉", role: "child" as const }]),
    selectedChildId: ref("child-1"), selectedChildAccounts: ref([account]),
    selectedAccountId: ref(account.id), selectedAccount: ref(account),
    selectedAccountBalance: ref("100.00 CNY"), balances: ref({ [account.id]: 100 }),
    transferTargets: ref([{ ...account, id: "acc-2", name: "教育金", owner_child_id: "child-2", ownerName: "小乐" }]),
    selectChild: vi.fn(), selectAccount: vi.fn(),
    addTransaction: vi.fn(async (): Promise<LedgerActionResult> => ({ ok: true })),
    transfer: vi.fn(async (): Promise<LedgerActionResult> => ({ ok: true })),
    setErrorStatus: vi.fn(), setSuccessStatus: vi.fn(),
  };
  const onClose = vi.fn();
  render(LedgerEntry, { props: { services, onClose } });
  return { services, onClose, user: userEvent.setup() };
};
const fillTransaction = async (user: ReturnType<typeof userEvent.setup>, amount = "20") => {
  await user.type(screen.getByLabelText(/存入金额|取出金额/), amount);
  await user.type(screen.getByLabelText(/^用途或备注/), "奖励");
};
describe("LedgerEntry", () => {
  it("selects accounts, validates local input and clears a saved draft", async () => {
    const { services, user } = setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "存入" })).toHaveFocus());
    await user.selectOptions(screen.getByLabelText("账户"), account.id);
    expect(services.selectAccount).toHaveBeenCalledWith(account.id);
    await user.type(screen.getByLabelText("存入金额"), "20");
    expect(screen.getByRole("button", { name: "确认存入" })).toBeDisabled();
    await user.type(screen.getByLabelText(/^用途或备注/), "奖励");
    await user.click(screen.getByRole("button", { name: "确认存入" }));
    expect(services.addTransaction).toHaveBeenCalledWith({ accountId: account.id, type: "deposit", amount: 20, note: "奖励" });
    expect(await screen.findByText("已存入 20.00 CNY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "完成" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "再记一笔" }));
    expect(screen.getByLabelText("存入金额")).toHaveFocus();
    expect(screen.getByLabelText("存入金额")).toHaveValue(null);
    expect(screen.getByLabelText(/^用途或备注/)).toHaveValue("");
  });
  it("submits a transfer with the entered amount, target and note", async () => {
    const { services, user } = setup();
    await user.click(screen.getByRole("button", { name: "转账" }));
    await user.type(screen.getByLabelText("转账金额"), "25");
    await user.selectOptions(screen.getByLabelText("转入账户"), "acc-2");
    await user.type(screen.getByLabelText("备注（可选）"), "储蓄");
    await user.click(screen.getByRole("button", { name: "确认转账" }));
    expect(services.transfer).toHaveBeenCalledWith({ sourceAccountId: account.id, targetAccountId: "acc-2", amount: 25, note: "储蓄" });
    expect(await screen.findByText("已转账 25.00 CNY")).toBeInTheDocument();
    expect(screen.getByText("茉莉 · 零花钱 → 小乐 · 教育金")).toBeInTheDocument();
  });
  it("retains a rejected withdrawal draft and shows the reason", async () => {
    const { services, user } = setup();
    services.addTransaction.mockResolvedValueOnce({ ok: false, message: "余额不足。" });
    await user.click(screen.getByRole("button", { name: "取出" }));
    await fillTransaction(user, "200");
    await user.click(screen.getByRole("button", { name: "确认取出" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("余额不足。");
    expect(screen.getByLabelText("取出金额")).toHaveValue(200);
    expect(screen.getByLabelText(/^用途或备注/)).toHaveValue("奖励");
  });
  it("supports Enter and prevents dismissal or duplicate submission while saving", async () => {
    const { services, onClose, user } = setup();
    let finish!: (result: LedgerActionResult) => void;
    services.addTransaction.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await fillTransaction(user);
    await user.keyboard("{Enter}");
    expect(services.addTransaction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "正在保存…" })).toBeDisabled();
    await user.click(screen.getByRole("dialog"));
    await user.keyboard("{Escape}{Tab}{Enter}");
    await user.click(screen.getByRole("button", { name: "关闭" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(services.addTransaction).toHaveBeenCalledTimes(1);
    finish({ ok: true });
    expect(await screen.findByText("已存入 20.00 CNY")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "完成" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
  it("retains input and restores controls when the service unexpectedly rejects", async () => {
    const { services, user } = setup();
    services.addTransaction.mockRejectedValueOnce(new Error("offline"));
    await fillTransaction(user);
    await user.click(screen.getByRole("button", { name: "确认存入" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("请稍后查看交易记录再操作");
    expect(screen.getByLabelText("存入金额")).toHaveValue(20);
    expect(screen.getByRole("button", { name: "关闭" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "确认存入" })).toBeEnabled();
  });
  it("confirms a committed write without displaying an unrefreshed balance", async () => {
    const { services, user } = setup();
    services.addTransaction.mockResolvedValueOnce({ ok: true, warning: "操作已保存，但刷新失败，请重新打开账本。" });
    await fillTransaction(user);
    await user.click(screen.getByRole("button", { name: "确认存入" }));
    expect(await screen.findByText("已存入 20.00 CNY")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("操作已保存，但刷新失败");
    expect(screen.queryByText("当前余额")).toBeNull();
    expect(screen.getByRole("button", { name: "再记一笔" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "完成" })).toBeEnabled();
  });
});

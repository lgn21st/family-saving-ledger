import { render, screen, waitFor } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import QuickTransactionSheet from "../components/QuickTransactionSheet.vue";

describe("QuickTransactionSheet", () => {
  it("selects the target account and submits a quick transaction", async () => {
    const user = userEvent.setup();
    const onSelectChild = vi.fn();
    const onSelectAccount = vi.fn();
    const onAddTransaction = vi.fn();
    const onUpdateAmount = vi.fn();
    const onUpdateNote = vi.fn();

    render(QuickTransactionSheet, {
      props: {
        childUsers: [{ id: "child-1", name: "茉莉", role: "child" }],
        selectedChildId: "child-1",
        selectedChildAccounts: [
          { id: "acc-1", name: "零花钱", currency: "CNY", owner_child_id: "child-1" },
        ],
        selectedAccountId: "acc-1",
        amountInput: "1",
        noteInput: "",
        transferAmount: "",
        transferTargetId: "",
        transferNote: "",
        transferTargets: [],
        formattedBalance: "100.00 CNY",
        loading: false,
        onSelectChild,
        onSelectAccount,
        onAddTransaction,
        onTransfer: vi.fn(),
        onClose: vi.fn(),
        "onUpdate:amountInput": onUpdateAmount,
        "onUpdate:noteInput": onUpdateNote,
        "onUpdate:transferAmount": vi.fn(),
        "onUpdate:transferTargetId": vi.fn(),
        "onUpdate:transferNote": vi.fn(),
      },
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "存入" }));
    });
    await user.selectOptions(screen.getByLabelText("账户"), "acc-1");
    expect(onSelectAccount).toHaveBeenCalledWith("acc-1");

    await user.clear(screen.getByLabelText("存入金额"));
    await user.type(screen.getByLabelText("存入金额"), "20");
    await user.type(screen.getByLabelText("用途或备注"), "奖励");
    expect(onUpdateAmount).toHaveBeenLastCalledWith("20");
    expect(onUpdateNote).toHaveBeenLastCalledWith("奖励");

    await user.click(screen.getByRole("button", { name: "确认存入" }));
    expect(onAddTransaction).toHaveBeenCalledWith("deposit");
  });

  it("integrates same-currency transfer into the entry flow", async () => {
    const user = userEvent.setup();
    const onTransfer = vi.fn();
    const onUpdateAmount = vi.fn();
    const onUpdateTarget = vi.fn();
    const onUpdateNote = vi.fn();

    render(QuickTransactionSheet, {
      props: {
        childUsers: [{ id: "child-1", name: "茉莉", role: "child" }],
        selectedChildId: "child-1",
        selectedChildAccounts: [
          { id: "acc-1", name: "零花钱", currency: "CNY", owner_child_id: "child-1" },
        ],
        selectedAccountId: "acc-1",
        amountInput: "",
        noteInput: "",
        transferAmount: "1",
        transferTargetId: "acc-2",
        transferNote: "",
        transferTargets: [
          { id: "acc-2", name: "教育金", currency: "CNY", owner_child_id: "child-2", ownerName: "小乐" },
        ],
        formattedBalance: "100.00 CNY",
        loading: false,
        onSelectChild: vi.fn(),
        onSelectAccount: vi.fn(),
        onAddTransaction: vi.fn(),
        onTransfer,
        onClose: vi.fn(),
        "onUpdate:amountInput": vi.fn(),
        "onUpdate:noteInput": vi.fn(),
        "onUpdate:transferAmount": onUpdateAmount,
        "onUpdate:transferTargetId": onUpdateTarget,
        "onUpdate:transferNote": onUpdateNote,
      },
    });

    await user.click(screen.getByRole("button", { name: "转账" }));
    expect(screen.getByLabelText("转出账户")).toBeTruthy();
    expect(screen.getByText("小乐 · 教育金 · CNY")).toBeTruthy();
    await user.clear(screen.getByLabelText("转账金额"));
    await user.type(screen.getByLabelText("转账金额"), "25");
    await user.selectOptions(screen.getByLabelText("转入账户"), "");
    await user.selectOptions(screen.getByLabelText("转入账户"), "acc-2");
    await user.type(screen.getByLabelText("备注（可选）"), "储蓄");
    expect(onUpdateAmount).toHaveBeenLastCalledWith("25");
    expect(onUpdateTarget).toHaveBeenCalledWith("acc-2");
    expect(onUpdateNote).toHaveBeenLastCalledWith("储蓄");
    await user.click(screen.getByRole("button", { name: "确认转账" }));
    expect(onTransfer).toHaveBeenCalled();
  });
});

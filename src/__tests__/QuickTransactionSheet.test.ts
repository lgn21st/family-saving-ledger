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
        amountInput: "",
        noteInput: "",
        formattedBalance: "100.00 CNY",
        loading: false,
        onSelectChild,
        onSelectAccount,
        onAddTransaction,
        onClose: vi.fn(),
        "onUpdate:amountInput": onUpdateAmount,
        "onUpdate:noteInput": onUpdateNote,
      },
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText("孩子"));
    });
    await user.selectOptions(screen.getByLabelText("账户"), "acc-1");
    expect(onSelectAccount).toHaveBeenCalledWith("acc-1");

    await user.type(screen.getByLabelText("金额"), "20");
    await user.type(screen.getByLabelText("用途或备注"), "奖励");
    expect(onUpdateAmount).toHaveBeenLastCalledWith("20");
    expect(onUpdateNote).toHaveBeenLastCalledWith("奖励");

    await user.click(screen.getByRole("button", { name: "增加余额" }));
    expect(onAddTransaction).toHaveBeenCalledWith("deposit");
  });
});

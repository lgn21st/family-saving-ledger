import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import LedgerNavigatorPanel from "../components/LedgerNavigatorPanel.vue";

describe("LedgerNavigatorPanel", () => {
  it("switches accounts and keeps the current balance separate from family totals", async () => {
    const user = userEvent.setup();
    const onSelectChild = vi.fn();
    const onSelectAccount = vi.fn();
    const account = {
      id: "acc-1",
      name: "零花钱",
      currency: "CNY",
      owner_child_id: "child-1",
      created_by: "parent",
      is_active: true,
    };

    const { rerender } = render(LedgerNavigatorPanel, {
      props: {
        currencyTotals: { CNY: 120, SGD: 30 },
        childUsers: [
          { id: "child-1", name: "茉莉", role: "child" },
          { id: "child-2", name: "茉茉", role: "child" },
        ],
        selectedChildId: "child-1",
        selectedChildName: "茉莉",
        avatarOptions: [],
        accounts: [account, { ...account, id: "acc-2", name: "旅行基金", currency: "SGD" }],
        selectedAccountId: "acc-1",
        balances: { "acc-1": 120, "acc-2": 30 },
        formatAmount: (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`,
        onSelectChild,
        onSelectAccount,
        onOpenSettings: vi.fn(),
      },
    });

    expect(screen.getByRole("heading", { name: "家庭资产" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "选择孩子" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "茉莉的账户" })).toBeTruthy();
    expect(screen.getByText("当前余额")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "茉莉的账户" })).toHaveValue("acc-1");
    expect(screen.getAllByText("120.00 CNY")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /茉茉/ }));
    expect(onSelectChild).toHaveBeenCalledWith("child-2");
    await user.selectOptions(screen.getByRole("combobox", { name: "茉莉的账户" }), "acc-2");
    expect(onSelectAccount).toHaveBeenCalledWith("acc-2");
    await rerender({ selectedAccountId: "acc-2" });
    expect(screen.getByRole("status")).toHaveTextContent("当前账户：茉莉 · 旅行基金，余额30.00 SGD");
    expect(screen.getAllByText("120.00 CNY")).toHaveLength(1);
    expect(screen.getAllByText("30.00 SGD")).toHaveLength(2);
    await rerender({
      selectedChildId: "child-2",
      selectedChildName: "茉茉",
      accounts: [{ ...account, id: "acc-3", name: "文具储蓄", owner_child_id: "child-2" }],
      selectedAccountId: "acc-3",
      balances: { "acc-3": 80 },
    });
    expect(screen.getByRole("combobox", { name: "茉茉的账户" })).toHaveValue("acc-3");
    expect(screen.getByRole("status")).toHaveTextContent("当前账户：茉茉 · 文具储蓄，余额80.00 CNY");
  });

  it("routes empty account management to settings", async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    render(LedgerNavigatorPanel, {
      props: {
        currencyTotals: {},
        childUsers: [],
        selectedChildId: null,
        selectedChildName: null,
        avatarOptions: [],
        accounts: [],
        selectedAccountId: null,
        balances: {},
        formatAmount: (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`,
        onSelectChild: vi.fn(),
        onSelectAccount: vi.fn(),
        onOpenSettings,
      },
    });

    await user.click(screen.getByRole("button", { name: "前往设置创建账户" }));
    expect(onOpenSettings).toHaveBeenCalled();
  });
});

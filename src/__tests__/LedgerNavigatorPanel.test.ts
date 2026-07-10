import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import LedgerNavigatorPanel from "../components/LedgerNavigatorPanel.vue";

describe("LedgerNavigatorPanel", () => {
  it("presents family, child, account and current-account context as one flow", async () => {
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

    render(LedgerNavigatorPanel, {
      props: {
        currencyTotals: { CNY: 120, SGD: 30 },
        childUsers: [
          { id: "child-1", name: "茉莉", role: "child" },
          { id: "child-2", name: "茉茉", role: "child" },
        ],
        selectedChildId: "child-1",
        selectedChildName: "茉莉",
        avatarOptions: [],
        accounts: [account],
        selectedAccountId: "acc-1",
        selectedAccount: account,
        selectedAccountBalance: "120.00 CNY",
        balances: { "acc-1": 120 },
        formatAmount: (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`,
        onSelectChild,
        onSelectAccount,
        onOpenSettings: vi.fn(),
      },
    });

    expect(screen.getByRole("heading", { name: "家庭资产" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "选择孩子" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "茉莉的账户" })).toBeTruthy();
    expect(screen.getByText("当前账户 · 茉莉 · CNY")).toBeTruthy();
    expect(screen.getAllByText("120.00 CNY")).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: /茉茉/ }));
    expect(onSelectChild).toHaveBeenCalledWith("child-2");
    await user.click(screen.getByRole("button", { name: /零花钱/ }));
    expect(onSelectAccount).toHaveBeenCalledWith("acc-1");
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
        selectedAccount: null,
        selectedAccountBalance: "0.00",
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

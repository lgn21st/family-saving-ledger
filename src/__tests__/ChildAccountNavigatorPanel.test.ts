import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ChildAccountNavigatorPanel from "../components/ChildAccountNavigatorPanel.vue";

describe("ChildAccountNavigatorPanel", () => {
  it("summarizes currencies and makes the selected account the overview", async () => {
    const user = userEvent.setup();
    const onSelectAccount = vi.fn();
    render(ChildAccountNavigatorPanel, {
      props: {
        groupedAccounts: {
          CNY: [
            { id: "cny", name: "零花钱", currency: "CNY", owner_child_id: "child", created_by: "parent", is_active: true },
          ],
          SGD: [
            { id: "sgd", name: "旅行金", currency: "SGD", owner_child_id: "child", created_by: "parent", is_active: true },
          ],
        },
        selectedAccountId: "cny",
        balances: { cny: 120, sgd: 30 },
        formatAmount: (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`,
        onSelectAccount,
      },
    });

    expect(screen.getByText("120.00 CNY")).toBeTruthy();
    expect(screen.getByText("30.00 SGD")).toBeTruthy();
    expect(screen.getByText("120.00")).toBeTruthy();
    expect(screen.getByText("30.00")).toBeTruthy();
    expect(screen.getByText("当前")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /旅行金/ }));
    expect(onSelectAccount).toHaveBeenCalledWith("sgd");
  });

  it("shows a parent-directed empty state", () => {
    render(ChildAccountNavigatorPanel, {
      props: {
        groupedAccounts: {},
        selectedAccountId: null,
        balances: {},
        formatAmount: (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`,
        onSelectAccount: vi.fn(),
      },
    });

    expect(screen.getByText("还没有储蓄账户")).toBeTruthy();
    expect(screen.getByText("请让家长在设置中为你创建第一个账户。")).toBeTruthy();
  });
});

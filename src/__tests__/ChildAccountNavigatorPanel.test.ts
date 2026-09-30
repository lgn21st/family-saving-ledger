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
        monthChanges: { deposit: 40, withdrawal: 10, transfer_in: 5, transfer_out: 2, interest: 1 },
        loading: false,
        balances: { cny: 120, sgd: 30 },
        formatAmount: (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`,
        onSelectAccount,
      },
    });

    expect(screen.getAllByText("120.00 CNY")).toHaveLength(2);
    expect(screen.getByText("30.00 SGD")).toBeTruthy();
    expect(screen.getByText("本月比月初多 34.00 CNY")).toBeTruthy();
    expect(screen.getByText("45.00 CNY")).toBeTruthy();
    expect(screen.getByText("12.00 CNY")).toBeTruthy();
    expect(screen.getByText("1.00 CNY")).toBeTruthy();
    await user.selectOptions(screen.getByRole("combobox", { name: "选择账户" }), "sgd");
    expect(onSelectAccount).toHaveBeenCalledWith("sgd");
  });

  it("shows a parent-directed empty state", () => {
    render(ChildAccountNavigatorPanel, {
      props: {
        groupedAccounts: {},
        selectedAccountId: null,
        monthChanges: null, loading: false,
        balances: {},
        formatAmount: (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`,
        onSelectAccount: vi.fn(),
      },
    });

    expect(screen.getByText("还没有储蓄账户")).toBeTruthy();
    expect(screen.getByText("请让家长在设置中为你创建第一个账户。")).toBeTruthy();
  });
  it("does not present an unavailable monthly read as zero change", async () => {
    const { rerender } = render(ChildAccountNavigatorPanel, { props: {
      groupedAccounts: { CNY: [{ id: "a", name: "日常", currency: "CNY", owner_child_id: "child", created_by: "parent", is_active: true }] },
      selectedAccountId: "a", balances: { a: 20 }, monthChanges: null, loading: true,
      formatAmount: (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`, onSelectAccount: vi.fn(),
    } });
    expect(screen.getByText("正在加载本月变化…")).toBeTruthy();
    expect(screen.queryByText("本月余额没有变化。")).toBeNull();
    await rerender({ loading: false });
    expect(screen.getByText("本月变化暂不可用。")).toBeTruthy();
  });

});

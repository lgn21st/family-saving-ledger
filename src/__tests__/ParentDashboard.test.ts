import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ParentDashboard from "../components/ParentDashboard.vue";

const transactionLabels = {
  deposit: "存入",
  withdrawal: "取出",
  transfer_in: "转入",
  transfer_out: "转出",
  interest: "利息",
};

describe("ParentDashboard", () => {
  it("keeps management actions out of the workspace and links to settings", async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();

    render(ParentDashboard, {
      props: {
        childUsers: [],
        avatarOptions: [],
        currencyTotals: {},
        formatAmount: (amount: number, currency: string) =>
          `${amount.toFixed(2)} ${currency}`,
        selectedChildId: null,
        selectedChildName: null,
        onSelectChild: vi.fn(),
        selectedChildAccounts: [],
        selectedAccountId: null,
        balances: {},
        onSelectAccount: vi.fn(),
        onOpenSettings,
        selectedAccount: null,
        canEdit: true,
        chartPoints: [],
        pagedTransactions: [],
        hasMoreTransactions: false,
        transactionLoading: false,
        transactionLabels,
        formatSignedAmount: () => "+0.00",
        transactionTone: () => "text-emerald-600",
        getTransactionNote: () => "—",
        getTransactionContext: () => "账户信息不可用",
        formatTimestamp: () => "",
        onLoadMore: vi.fn(),
        onVoidTransaction: vi.fn(),
      },
    });

    expect(screen.queryByText("创建账户")).toBeNull();
    expect(screen.queryByText("孩子管理")).toBeNull();
    await user.click(screen.getByRole("button", { name: "前往设置创建账户" }));
    expect(onOpenSettings).toHaveBeenCalled();
  });
});

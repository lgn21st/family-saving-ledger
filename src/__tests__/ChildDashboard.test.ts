import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ChildDashboard from "../components/ChildDashboard.vue";

const transactionLabels = {
  deposit: "增加",
  withdrawal: "减少",
  transfer_in: "转入",
  transfer_out: "转出",
  interest: "利息",
};

describe("ChildDashboard", () => {
  it("renders sidebar and allows loading more", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const onSelectAccount = vi.fn();

    render(ChildDashboard, {
      props: {
        groupedAccounts: {
          CNY: [
            {
              id: "acc-1",
              name: "零钱",
              currency: "CNY",
              owner_child_id: "child-1",
              created_by: "parent",
              is_active: true,
            },
          ],
        },
        selectedAccountId: "acc-1",
        selectedAccount: {
          id: "acc-1",
          name: "零钱",
          currency: "CNY",
          owner_child_id: "child-1",
          created_by: "parent",
          is_active: true,
        },
        balances: { "acc-1": 10 },
        formatAmount: (amount: number, currency: string) =>
          `${amount.toFixed(2)} ${currency}`,
        onSelectAccount,
        chartPath: "M 0 0 L 10 10",
        pagedTransactions: [
          {
            id: "t-1",
            account_id: "acc-1",
            type: "deposit",
            amount: 1,
            currency: "CNY",
            note: "备注",
            related_account_id: null,
            created_by: "parent",
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
        hasMoreTransactions: true,
        transactionLoading: false,
        transactionLabels,
        formatSignedAmount: () => "+1.00 CNY",
        transactionTone: () => "text-emerald-600",
        getTransactionNote: () => "备注",
        formatTimestamp: () => "2024-01-01",
        onLoadMore,
      },
    });

    await user.click(screen.getByRole("button", { name: /零钱/ }));
    expect(onSelectAccount).toHaveBeenCalledWith("acc-1");

    await user.click(screen.getByRole("button", { name: "加载更多" }));
    expect(onLoadMore).toHaveBeenCalled();
  });
});

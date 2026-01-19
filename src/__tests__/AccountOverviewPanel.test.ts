import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AccountOverviewPanel from "../components/AccountOverviewPanel.vue";

const formatSignedAmount = () => "+1.00 CNY";
const transactionTone = () => "text-emerald-600";
const getTransactionNote = () => "备注";
const formatTimestamp = () => "2024-01-01 10:00";

describe("AccountOverviewPanel", () => {
  it("shows empty state when no account is selected", () => {
    render(AccountOverviewPanel, {
      props: {
        selectedAccount: null,
        formattedBalance: "0.00",
        chartPath: "",
        pagedTransactions: [],
        hasMoreTransactions: false,
        transactionLoading: false,
        transactionLabels: {
          deposit: "增加",
          withdrawal: "减少",
          transfer_in: "转入",
          transfer_out: "转出",
          interest: "利息",
        },
        formatSignedAmount,
        transactionTone,
        getTransactionNote,
        formatTimestamp,
        onLoadMore: vi.fn(),
      },
    });

    expect(screen.getByText("暂无账户。")).toBeTruthy();
  });

  it("renders account details and loads more transactions", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();

    render(AccountOverviewPanel, {
      props: {
        selectedAccount: {
          id: "acc-1",
          name: "零钱",
          currency: "CNY",
        },
        formattedBalance: "10.00 CNY",
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
        transactionLabels: {
          deposit: "增加",
          withdrawal: "减少",
          transfer_in: "转入",
          transfer_out: "转出",
          interest: "利息",
        },
        formatSignedAmount,
        transactionTone,
        getTransactionNote,
        formatTimestamp,
        onLoadMore,
      },
    });

    expect(screen.getByText("零钱")).toBeTruthy();
    expect(screen.getByText(/10\.00 CNY/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "加载更多" }));
    expect(onLoadMore).toHaveBeenCalled();
  });
});

import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AccountDetailPanel from "../components/AccountDetailPanel.vue";

const transactionLabels = {
  deposit: "增加",
  withdrawal: "减少",
  transfer_in: "转入",
  transfer_out: "转出",
  interest: "利息",
};

const formatSignedAmount = () => "+1.00 CNY";
const transactionTone = () => "text-emerald-600";
const getTransactionNote = () => "备注";
const formatTimestamp = () => "2024-01-01 10:00";

describe("AccountDetailPanel", () => {
  it("renders empty state when account is missing", () => {
    render(AccountDetailPanel, {
      props: {
        selectedAccount: null,
        chartPoints: [],
        pagedTransactions: [],
        hasMoreTransactions: false,
        transactionLoading: false,
        canVoid: false,
        transactionLabels,
        formatSignedAmount,
        transactionTone,
        getTransactionNote,
        formatTimestamp,
        onLoadMore: vi.fn(),
        onVoidTransaction: vi.fn(),
      },
    });

    expect(screen.getByText("暂无账户。")).toBeTruthy();
  });

  it("keeps account details focused on trend and resets filters when the account changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(AccountDetailPanel, {
      props: {
        selectedAccount: { id: "acc-1", name: "零钱", currency: "CNY" },
        chartPoints: [
          { date: new Date("2024-01-01"), balance: 8 },
          { date: new Date("2024-01-30"), balance: 10 },
        ],
        pagedTransactions: [{
          id: "tx-1", account_id: "acc-1", type: "deposit", amount: 1,
          currency: "CNY", note: "备注", created_at: "2024-01-01T10:00:00Z", created_by: "parent",
        }],
        hasMoreTransactions: false,
        transactionLoading: false,
        canVoid: true,
        transactionLabels,
        formatSignedAmount,
        transactionTone,
        getTransactionNote,
        formatTimestamp,
        onLoadMore: vi.fn(),
        onVoidTransaction: vi.fn(),
      },
    });

    expect(screen.getByRole("heading", { name: "近 30 天趋势" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "交易记录" })).toBeTruthy();
    expect(screen.queryByText("新增/扣减")).toBeNull();
    await user.type(screen.getByRole("searchbox", { name: "搜索交易" }), "不会匹配");
    expect(screen.getByText("没有匹配的交易")).toBeTruthy();
    await rerender({ selectedAccount: { id: "acc-2", name: "教育金", currency: "CNY" } });
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByText("备注")).toBeTruthy();
  });
});

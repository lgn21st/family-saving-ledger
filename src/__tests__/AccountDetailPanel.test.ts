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
        selectedChildName: null,
        canEdit: false,
        chartPath: "",
        amountInput: "",
        noteInput: "",
        transferAmount: "",
        transferTargetId: "",
        transferNote: "",
        transferTargets: [],
        formattedBalance: "0.00",
        loading: false,
        pagedTransactions: [],
        hasMoreTransactions: false,
        transactionLoading: false,
        canVoid: false,
        transactionLabels,
        formatSignedAmount,
        transactionTone,
        getTransactionNote,
        formatTimestamp,
        onAddTransaction: vi.fn(),
        onTransfer: vi.fn(),
        onLoadMore: vi.fn(),
        onVoidTransaction: vi.fn(),
      },
    });

    expect(screen.getByText("暂无账户。")).toBeTruthy();
  });

  it("bubbles input updates from child controls", async () => {
    const user = userEvent.setup();
    const onUpdateAmount = vi.fn();
    const onUpdateNote = vi.fn();

    render(AccountDetailPanel, {
      props: {
        selectedAccount: { id: "acc-1", name: "零钱", currency: "CNY" },
        selectedChildName: "小乐",
        canEdit: true,
        chartPath: "M 0 0 L 10 10",
        amountInput: "",
        noteInput: "",
        transferAmount: "",
        transferTargetId: "",
        transferNote: "",
        transferTargets: [{ id: "acc-2", name: "教育金", ownerName: "小乐" }],
        formattedBalance: "10.00 CNY",
        loading: false,
        pagedTransactions: [],
        hasMoreTransactions: false,
        transactionLoading: false,
        canVoid: true,
        transactionLabels,
        formatSignedAmount,
        transactionTone,
        getTransactionNote,
        formatTimestamp,
        onAddTransaction: vi.fn(),
        onTransfer: vi.fn(),
        onLoadMore: vi.fn(),
        onVoidTransaction: vi.fn(),
        "onUpdate:amountInput": onUpdateAmount,
        "onUpdate:noteInput": onUpdateNote,
      },
    });

    await user.type(screen.getByPlaceholderText("金额"), "5");
    expect(onUpdateAmount).toHaveBeenLastCalledWith("5");

    await user.type(screen.getByPlaceholderText("备注（必填）"), "零花钱");
    expect(onUpdateNote).toHaveBeenLastCalledWith("零花钱");
  });
});

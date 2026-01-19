import { render, screen } from "@testing-library/vue";
import { describe, expect, it, vi } from "vitest";

import ParentDashboard from "../components/ParentDashboard.vue";

const transactionLabels = {
  deposit: "增加",
  withdrawal: "减少",
  transfer_in: "转入",
  transfer_out: "转出",
  interest: "利息",
};

describe("ParentDashboard", () => {
  it("renders child manager and empty account state", () => {
    render(ParentDashboard, {
      props: {
        showChildManager: true,
        childUsers: [],
        childAvatars: [],
        avatarOptions: [],
        newChildName: "",
        newChildPin: "",
        newChildAvatarId: "",
        editingChildId: null,
        editingChildName: "",
        loading: false,
        sanitizePin: (value: string) => value,
        onCreateChild: vi.fn(),
        onStartEditChild: vi.fn(),
        onUpdateChild: vi.fn(),
        onCancelEditChild: vi.fn(),
        onDeleteChild: vi.fn(),
        currencyTotals: {},
        formatAmount: (amount: number, currency: string) =>
          `${amount.toFixed(2)} ${currency}`,
        selectedChildId: null,
        selectedChildName: null,
        onSelectChild: vi.fn(),
        selectedChildAccounts: [],
        selectedAccountId: null,
        balances: {},
        supportedCurrencies: ["CNY"],
        newAccountName: "",
        newAccountCurrency: "CNY",
        newAccountOwnerId: "",
        showAccountCreator: false,
        editingAccountId: null,
        editingAccountName: "",
        onCreateAccount: vi.fn(),
        onSelectAccount: vi.fn(),
        onStartEditAccount: vi.fn(),
        onUpdateAccount: vi.fn(),
        onCancelEditAccount: vi.fn(),
        selectedAccount: null,
        canEdit: true,
        chartPath: "",
        amountInput: "",
        noteInput: "",
        transferAmount: "",
        transferTargetId: "",
        transferNote: "",
        transferTargets: [],
        selectedAccountBalance: "0.00",
        pagedTransactions: [],
        hasMoreTransactions: false,
        transactionLoading: false,
        transactionLabels,
        formatSignedAmount: () => "+0.00",
        transactionTone: () => "text-emerald-600",
        getTransactionNote: () => "—",
        formatTimestamp: () => "",
        onAddTransaction: vi.fn(),
        onTransfer: vi.fn(),
        onLoadMore: vi.fn(),
        onVoidTransaction: vi.fn(),
      },
    });

    expect(screen.getByText("孩子管理")).toBeTruthy();
    expect(screen.getAllByText("暂无账户。").length).toBeGreaterThan(0);
  });
});

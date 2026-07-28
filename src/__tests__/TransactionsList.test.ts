import { fireEvent, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import TransactionsList from "../components/TransactionsList.vue";

const baseTransaction = {
  id: "t-1",
  account_id: "acc-1",
  type: "deposit" as const,
  amount: 10,
  currency: "CNY",
  note: "测试",
  related_account_id: null,
  created_by: "parent",
  created_at: new Date().toISOString(),
  is_void: false,
};

describe("TransactionsList", () => {
  it("triggers void action on long press when confirmed", async () => {
    vi.useFakeTimers();
    const onVoidTransaction = vi.fn();

    render(TransactionsList, {
      props: {
        transactions: [baseTransaction],
        hasMore: false,
        loading: false,
        canVoid: true,
        transactionLabels: {
          deposit: "增加",
          withdrawal: "减少",
          transfer_in: "转入",
          transfer_out: "转出",
          interest: "利息",
        },
        formatSignedAmount: () => "+10.00 CNY",
        transactionTone: () => "text-emerald-600",
        getTransactionNote: () => "测试",
        formatTimestamp: () => "now",
        onLoadMore: vi.fn(),
        onVoidTransaction,
      },
    });

    const row = screen.getByText("测试").closest("li");
    expect(row).toBeTruthy();

    await fireEvent.pointerDown(row as Element, { clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(600);
    await nextTick();

    expect(screen.getByRole("heading", { name: "撤销这笔交易？" })).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "确认撤销" }));
    expect(onVoidTransaction).toHaveBeenCalledWith(baseTransaction);

    vi.useRealTimers();
  });

  it("filters loaded transactions and groups them by month", async () => {
    const user = userEvent.setup();
    render(TransactionsList, {
      props: {
        transactions: [
          { ...baseTransaction, id: "jan", note: "零花钱", created_at: "2026-01-15T00:00:00Z" },
          {
            ...baseTransaction,
            id: "dec",
            type: "withdrawal",
            note: "购买文具",
            created_at: "2025-12-20T00:00:00Z",
          },
        ],
        hasMore: false,
        loading: false,
        transactionLabels: {
          deposit: "增加",
          withdrawal: "减少",
          transfer_in: "转入",
          transfer_out: "转出",
          interest: "利息",
        },
        formatSignedAmount: (transaction) => `${transaction.amount.toFixed(2)} CNY`,
        transactionTone: () => "text-slate-600",
        getTransactionNote: (transaction) => transaction.note,
        formatTimestamp: (value) => value,
        onLoadMore: vi.fn(),
      },
    });

    expect(screen.getByText("2026年1月")).toBeTruthy();
    expect(screen.getByText("2025年12月")).toBeTruthy();

    await user.type(screen.getByRole("searchbox", { name: "搜索交易" }), "文具");
    expect(screen.queryByText("零花钱")).toBeNull();
    expect(screen.getByText("购买文具")).toBeTruthy();

    await user.clear(screen.getByRole("searchbox", { name: "搜索交易" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "交易类型" }), "deposit");
    expect(screen.getByText("零花钱")).toBeTruthy();
    expect(screen.queryByText("购买文具")).toBeNull();
  });

  it("moves focus into the void dialog and restores it when closed", async () => {
    const user = userEvent.setup();
    render(TransactionsList, {
      props: {
        transactions: [baseTransaction],
        hasMore: false,
        loading: false,
        canVoid: true,
        transactionLabels: {
          deposit: "增加",
          withdrawal: "减少",
          transfer_in: "转入",
          transfer_out: "转出",
          interest: "利息",
        },
        formatSignedAmount: () => "+10.00 CNY",
        transactionTone: () => "text-emerald-600",
        getTransactionNote: () => "测试",
        formatTimestamp: () => "now",
        onLoadMore: vi.fn(),
        onVoidTransaction: vi.fn(),
      },
    });

    const trigger = screen.getByRole("button", { name: /^撤销交易：/ });
    await user.click(trigger);
    const cancel = screen.getByRole("button", { name: "取消" });
    expect(document.activeElement).toBe(cancel);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

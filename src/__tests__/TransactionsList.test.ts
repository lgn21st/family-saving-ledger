import { fireEvent, render, screen } from "@testing-library/vue";
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

    expect(
      await screen.findByText("确认撤销这笔交易？该操作会影响当前余额。"),
    ).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "确认撤销" }));
    expect(onVoidTransaction).toHaveBeenCalledWith(baseTransaction);

    vi.useRealTimers();
  });
});

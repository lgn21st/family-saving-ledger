import { fireEvent, render, screen } from "@testing-library/vue";
import { describe, expect, it, vi } from "vitest";

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
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockImplementation(() => true);

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

    expect(confirmSpy).toHaveBeenCalled();
    expect(onVoidTransaction).toHaveBeenCalledWith(baseTransaction);

    confirmSpy.mockRestore();
    vi.useRealTimers();
  });
});

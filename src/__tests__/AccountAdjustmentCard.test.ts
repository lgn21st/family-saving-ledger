import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AccountAdjustmentCard from "../components/AccountAdjustmentCard.vue";

describe("AccountAdjustmentCard", () => {
  it("emits updates and triggers transaction actions", async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn();
    const onUpdateAmount = vi.fn();
    const onUpdateNote = vi.fn();

    render(AccountAdjustmentCard, {
      props: {
        canEdit: true,
        selectedChildName: "小乐",
        selectedAccountName: "存钱罐",
        amountInput: "",
        noteInput: "",
        loading: false,
        onAddTransaction,
        "onUpdate:amountInput": onUpdateAmount,
        "onUpdate:noteInput": onUpdateNote,
      },
    });

    await user.type(screen.getByPlaceholderText("金额"), "12");
    expect(onUpdateAmount).toHaveBeenLastCalledWith("12");

    await user.type(screen.getByPlaceholderText("备注（必填）"), "早餐");
    expect(onUpdateNote).toHaveBeenLastCalledWith("早餐");

    await user.click(screen.getByRole("button", { name: "增加" }));
    expect(onAddTransaction).toHaveBeenCalledWith("deposit");

    await user.click(screen.getByRole("button", { name: "减少" }));
    expect(onAddTransaction).toHaveBeenCalledWith("withdrawal");
  });

  it("hides when editing is disabled", () => {
    render(AccountAdjustmentCard, {
      props: {
        canEdit: false,
        selectedChildName: null,
        selectedAccountName: null,
        amountInput: "",
        noteInput: "",
        loading: false,
        onAddTransaction: vi.fn(),
      },
    });

    expect(screen.queryByText("新增/扣减")).toBeNull();
  });
});

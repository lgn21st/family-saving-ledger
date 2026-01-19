import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import TransferCard from "../components/TransferCard.vue";

describe("TransferCard", () => {
  it("emits transfer updates and triggers transfer action", async () => {
    const user = userEvent.setup();
    const onTransfer = vi.fn();
    const onUpdateAmount = vi.fn();
    const onUpdateTarget = vi.fn();
    const onUpdateNote = vi.fn();

    render(TransferCard, {
      props: {
        canEdit: true,
        transferAmount: "",
        transferTargetId: "",
        transferNote: "",
        transferTargets: [
          { id: "acc-1", name: "教育金", ownerName: "小乐" },
        ],
        formattedBalance: "10.00 CNY",
        loading: false,
        onTransfer,
        "onUpdate:transferAmount": onUpdateAmount,
        "onUpdate:transferTargetId": onUpdateTarget,
        "onUpdate:transferNote": onUpdateNote,
      },
    });

    await user.type(screen.getByPlaceholderText("转账金额"), "8");
    expect(onUpdateAmount).toHaveBeenLastCalledWith("8");

    await user.selectOptions(
      screen.getByRole("combobox"),
      screen.getByRole("option", { name: "小乐 - 教育金" }),
    );
    expect(onUpdateTarget).toHaveBeenLastCalledWith("acc-1");

    await user.type(screen.getByPlaceholderText("备注（可选）"), "周末");
    expect(onUpdateNote).toHaveBeenLastCalledWith("周末");

    await user.click(screen.getByRole("button", { name: "确认转账" }));
    expect(onTransfer).toHaveBeenCalled();
  });

  it("hides when editing is disabled", () => {
    render(TransferCard, {
      props: {
        canEdit: false,
        transferAmount: "",
        transferTargetId: "",
        transferNote: "",
        transferTargets: [],
        formattedBalance: "0.00 CNY",
        loading: false,
        onTransfer: vi.fn(),
      },
    });

    expect(screen.queryByText("同币种转账")).toBeNull();
  });
});

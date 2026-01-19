import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AccountHeader from "../components/AccountHeader.vue";

describe("AccountHeader", () => {
  it("shows summary when not editing", () => {
    render(AccountHeader, {
      props: {
        isEditing: false,
        editingAccountName: "",
        loading: false,
        selectedAccountName: "零钱",
        selectedAccountCurrency: "CNY",
        formattedBalance: "10.00 CNY",
        onUpdateAccount: vi.fn(),
        onCancelEditAccount: vi.fn(),
      },
    });

    expect(screen.getByText("零钱")).toBeTruthy();
    expect(screen.getByText(/10\.00 CNY/)).toBeTruthy();
  });

  it("updates editing name and triggers save/cancel", async () => {
    const user = userEvent.setup();
    const onUpdateName = vi.fn();
    const onUpdateAccount = vi.fn();
    const onCancelEditAccount = vi.fn();

    render(AccountHeader, {
      props: {
        isEditing: true,
        editingAccountName: "零钱",
        loading: false,
        selectedAccountName: "零钱",
        selectedAccountCurrency: "CNY",
        formattedBalance: "10.00 CNY",
        onUpdateAccount,
        onCancelEditAccount,
        "onUpdate:editingAccountName": onUpdateName,
      },
    });

    await user.type(screen.getByDisplayValue("零钱"), "2");
    expect(onUpdateName).toHaveBeenLastCalledWith("零钱2");

    await user.click(screen.getByRole("button", { name: "保存名称" }));
    expect(onUpdateAccount).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onCancelEditAccount).toHaveBeenCalled();
  });
});

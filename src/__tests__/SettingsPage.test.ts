import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import SettingsPage from "../components/SettingsPage.vue";

describe("SettingsPage", () => {
  it("separates member and account management into settings sections", async () => {
    const user = userEvent.setup();
    const child = { id: "child-1", name: "茉莉", role: "child" as const };
    const account = {
      id: "acc-1",
      name: "零花钱",
      currency: "CNY",
      owner_child_id: "child-1",
      created_by: "parent",
      is_active: true,
    };

    render(SettingsPage, {
      props: {
        newChildName: "",
        newChildPin: "",
        newChildAvatarId: "",
        editingChildName: "",
        newAccountName: "",
        newAccountCurrency: "CNY",
        newAccountOwnerId: "child-1",
        showAccountCreator: false,
        editingAccountName: "",
        childUsers: [child],
        childAvatars: [],
        avatarOptions: [],
        editingChildId: null,
        loading: false,
        sanitizePin: (value: string) => value,
        onCreateChild: vi.fn(),
        onStartEditChild: vi.fn(),
        onUpdateChild: vi.fn(),
        onCancelEditChild: vi.fn(),
        onArchiveChild: vi.fn(),
        selectedChildId: "child-1",
        selectedChildName: "茉莉",
        onSelectChild: vi.fn(),
        selectedChildAccounts: [account],
        selectedAccountId: "acc-1",
        balances: { "acc-1": 20 },
        supportedCurrencies: ["CNY", "SGD"],
        editingAccountId: null,
        formatAmount: (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`,
        onCreateAccount: vi.fn(),
        onSelectAccount: vi.fn(),
        onStartEditAccount: vi.fn(),
        onUpdateAccount: vi.fn(),
        onCancelEditAccount: vi.fn(),
        onCloseAccount: vi.fn(),
      },
    });

    expect(screen.getByRole("heading", { name: "设置" })).toBeTruthy();
    expect(screen.getByText("孩子管理")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "账户", exact: true }));
    expect(screen.getByRole("heading", { name: "账户列表" })).toBeTruthy();
    expect(screen.getByText("零花钱")).toBeTruthy();
    expect(screen.getByRole("button", { name: "创建账户" })).toBeTruthy();
  });
});

import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AccountSidebar from "../components/AccountSidebar.vue";

describe("AccountSidebar", () => {
  it("renders grouped accounts and selects one", async () => {
    const user = userEvent.setup();
    const onSelectAccount = vi.fn();

    render(AccountSidebar, {
      props: {
        groupedAccounts: {
          CNY: [
            {
              id: "acc-1",
              name: "零钱",
              currency: "CNY",
              owner_child_id: "child-1",
              created_by: "parent",
              is_active: true,
            },
          ],
        },
        selectedAccountId: null,
        balances: { "acc-1": 10 },
        formatAmount: (amount: number, currency: string) =>
          `${amount.toFixed(2)} ${currency}`,
        onSelectAccount,
      },
    });

    expect(screen.getByText("CNY")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /零钱/ }));
    expect(onSelectAccount).toHaveBeenCalledWith("acc-1");
  });
});

import { describe, expect, it, vi } from "vitest";

import { useAccounts } from "../composables/useAccounts";

type Account = {
  id: string;
  name: string;
  currency: string;
  owner_child_id: string;
  created_by: string;
  is_active: boolean;
  created_at?: string;
};

const createSupabaseMock = (params: {
  accounts: Account[];
  balances: Record<string, number>;
}) => {
  const { accounts, balances } = params;
  return {
    from: (table: string) => {
      if (table === "account_balances") {
        return {
          select: () => ({
            in: (_field: string, values: string[]) =>
              Promise.resolve({
                data: values.map((accountId) => ({
                  account_id: accountId,
                  balance: balances[accountId] ?? 0,
                })),
                error: null,
              }),
          }),
        };
      }

      return {
        select: () => ({
          eq: (_field: string, value: unknown) => ({
            order: () =>
              Promise.resolve({
                data:
                  value === true
                    ? accounts.filter((account) => account.is_active)
                    : accounts,
                error: null,
              }),
            eq: (_childField: string, childId: unknown) => ({
              order: () =>
                Promise.resolve({
                  data: accounts.filter(
                    (account) => account.owner_child_id === childId,
                  ),
                  error: null,
                }),
            }),
          }),
        }),
      };
    },
  };
};

describe("useAccounts", () => {
  it("loads accounts and balances for parent", async () => {
    const supabase = createSupabaseMock({
      accounts: [
        {
          id: "acc-1",
          name: "账户",
          currency: "CNY",
          owner_child_id: "child-1",
          created_by: "parent",
          is_active: true,
        },
      ],
      balances: { "acc-1": 12.5 },
    });
    const setErrorStatus = vi.fn();
    const { accounts, balances, loadAccounts } = useAccounts({
      supabase,
      setErrorStatus,
    });

    await loadAccounts({ id: "parent", role: "parent" });

    expect(accounts.value).toHaveLength(1);
    expect(balances.value["acc-1"]).toBe(12.5);
    expect(setErrorStatus).not.toHaveBeenCalled();
  });

  it("loads accounts scoped to child", async () => {
    const supabase = createSupabaseMock({
      accounts: [
        {
          id: "acc-1",
          name: "账户A",
          currency: "CNY",
          owner_child_id: "child-1",
          created_by: "parent",
          is_active: true,
        },
        {
          id: "acc-2",
          name: "账户B",
          currency: "CNY",
          owner_child_id: "child-2",
          created_by: "parent",
          is_active: true,
        },
      ],
      balances: { "acc-1": 3, "acc-2": 4 },
    });
    const setErrorStatus = vi.fn();
    const { accounts, loadAccounts } = useAccounts({
      supabase,
      setErrorStatus,
    });

    await loadAccounts({ id: "child-1", role: "child" });

    expect(accounts.value).toHaveLength(1);
    expect(accounts.value[0]?.id).toBe("acc-1");
  });
});

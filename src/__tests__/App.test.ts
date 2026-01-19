import { render, screen, within } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";

import App from "../App.vue";
import { vi } from "vitest";

type Role = "parent" | "child";

type AppUser = {
  id: string;
  name: string;
  role: Role;
  pin: string;
  avatar_id?: string | null;
  created_at?: string;
};

type Account = {
  id: string;
  name: string;
  currency: string;
  owner_child_id: string;
  created_by: string;
  is_active: boolean;
  created_at?: string;
};

type Transaction = {
  id: string;
  account_id: string;
  type: "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "interest";
  amount: number;
  currency: string;
  note: string | null;
  related_account_id: string | null;
  created_by: string;
  created_at: string;
  interest_month?: string | null;
};

type Settings = {
  id: string;
  annual_rate: number;
  timezone: string;
};

type AccountBalance = {
  account_id: string;
  balance: number;
};

type DataStore = {
  app_users: AppUser[];
  accounts: Account[];
  transactions: Transaction[];
  settings: Settings[];
  account_balances: AccountBalance[];
};

type DataRow<T extends keyof DataStore> = DataStore[T][number];

function createDefaultData() {
  return {
    app_users: [],
    accounts: [],
    transactions: [],
    settings: [{ id: "settings", annual_rate: 5, timezone: "Asia/Singapore" }],
    account_balances: [],
  };
}

function createSupabaseMock() {
  let dataStore: DataStore = JSON.parse(JSON.stringify(createDefaultData()));

  const setMockData = (override: Partial<DataStore>) => {
    dataStore = {
      ...dataStore,
      ...override,
      app_users: override.app_users ?? dataStore.app_users,
      accounts: override.accounts ?? dataStore.accounts,
      settings: override.settings ?? dataStore.settings,
      transactions: override.transactions ?? dataStore.transactions,
    };
  };

  let idCounter = 0;
  const nextId = () => `id-${(idCounter += 1)}`;
  const now = () => new Date("2024-01-01T12:00:00Z").toISOString();

  const applyFilters = <T>(rows: T[], filters: Array<(row: T) => boolean>) => {
    return filters.reduce((result, filter) => result.filter(filter), rows);
  };

  const computeAccountBalances = () => {
    const totals = new Map<string, number>();
    dataStore.transactions.forEach((transaction) => {
      const delta =
        transaction.type === "withdrawal" ||
        transaction.type === "transfer_out"
          ? -transaction.amount
          : transaction.amount;
      totals.set(
        transaction.account_id,
        (totals.get(transaction.account_id) ?? 0) + delta,
      );
    });
    return Array.from(totals.entries()).map(([account_id, balance]) => ({
      account_id,
      balance: Number(balance.toFixed(2)),
    }));
  };

  const getRows = <T extends keyof DataStore>(table: T) => {
    if (table === "account_balances") {
      return computeAccountBalances() as DataStore[T];
    }
    return dataStore[table];
  };

  const getBalance = (accountId: string) => {
    return computeAccountBalances().find((row) => row.account_id === accountId)
      ?.balance ?? 0;
  };

  const createSelectBuilder = (table: keyof DataStore) => {
    const filters: Array<(row: DataStore[typeof table][number]) => boolean> =
      [];
    let limitValue: number | null = null;
    let rangeValue: { from: number; to: number } | null = null;
    let countMode: "exact" | null = null;
    let orderValue: { field: string; ascending: boolean } | null = null;

    const execute = (single = false) => {
      const filtered = applyFilters(getRows(table), filters);
      const ordered = orderValue
        ? [...filtered].sort((a, b) =>
            String(a[orderValue.field as keyof typeof a]).localeCompare(
              String(b[orderValue.field as keyof typeof b]),
            ),
          )
        : [...filtered];
      const sorted =
        orderValue && !orderValue.ascending ? ordered.reverse() : ordered;
      const ranged = rangeValue
        ? sorted.slice(rangeValue.from, rangeValue.to + 1)
        : sorted;
      const limited = limitValue ? ranged.slice(0, limitValue) : ranged;
      const data = single ? limited[0] ?? null : limited;
      const count = countMode ? filtered.length : null;
      return Promise.resolve({ data, error: null, count });
    };

    const builder = {
      setCountMode: (mode: "exact") => {
        countMode = mode;
        return builder;
      },
      eq: (field: keyof DataStore[typeof table][number], value: unknown) => {
        filters.push((row) => row[field] === value);
        return builder;
      },
      gte: (field: keyof DataStore[typeof table][number], value: unknown) => {
        filters.push((row) => String(row[field]) >= String(value));
        return builder;
      },
      order: (
        field: keyof DataStore[typeof table][number],
        options?: { ascending?: boolean },
      ) => {
        orderValue = {
          field: String(field),
          ascending: options?.ascending ?? true,
        };
        return builder;
      },
      in: (field: keyof DataStore[typeof table][number], values: unknown[]) => {
        filters.push((row) => values.includes(row[field]));
        return builder;
      },
      limit: (count: number) => {
        limitValue = count;
        return builder;
      },
      range: (from: number, to: number) => {
        rangeValue = { from, to };
        return builder;
      },
      maybeSingle: () => {
        return execute(true);
      },
      then: (
        onFulfilled: (value: {
          data: unknown;
          error: null;
          count: number | null;
        }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => {
        return execute().then(onFulfilled, onRejected);
      },
    };

    return builder;
  };

  const deleteRows = <T extends keyof DataStore>(
    table: T,
    filters: Array<(row: DataRow<T>) => boolean>,
  ) => {
    const rows = dataStore[table] as DataRow<T>[];
    const remaining = rows.filter(
      (row) => !filters.every((filter) => filter(row)),
    );
    const removed = rows.filter((row) =>
      filters.every((filter) => filter(row)),
    );
    dataStore = {
      ...dataStore,
      [table]: remaining,
    };
    return removed;
  };

  const updateRows = <T extends keyof DataStore>(
    table: T,
    updates: Record<string, unknown>,
    filters: Array<(row: DataRow<T>) => boolean>,
  ) => {
    const rows = dataStore[table] as DataRow<T>[];
    const updated = rows.map((row) => {
      if (filters.every((filter) => filter(row))) {
        return {
          ...row,
          ...updates,
        };
      }
      return row;
    });
    dataStore = {
      ...dataStore,
      [table]: updated,
    };
    return updated.filter((row) => filters.every((filter) => filter(row)));
  };

  const supabase = {
    from: (table: keyof DataStore) => {
      return {
        select: (
          _columns?: string,
          options?: { count?: "exact" },
        ) => {
          const builder = createSelectBuilder(table);
          if (options?.count === "exact") {
            builder.setCountMode("exact");
          }
          return builder;
        },
        insert: (payload: Partial<Transaction>[]) => {
          const inserted = payload.map((item) => ({
            id: nextId(),
            created_at: now(),
            ...item,
          })) as Transaction[];

          if (table === "transactions") {
            dataStore = {
              ...dataStore,
              transactions: [...dataStore.transactions, ...inserted],
            };
          }

          return {
            select: () => Promise.resolve({ data: inserted, error: null }),
          };
        },
        update: (payload: Record<string, unknown>) => {
          return {
            eq: (field: string, value: unknown) => {
              const updated = updateRows(table, payload, [
                (row) => row[field] === value,
              ]);
              return Promise.resolve({ data: updated, error: null });
            },
          };
        },
        delete: () => {
          return {
            eq: (field: string, value: unknown) => {
              const removed = deleteRows(table, [
                (row) => row[field] === value,
              ]);
              return Promise.resolve({ data: removed, error: null });
            },
            in: (field: string, values: unknown[]) => {
              const removed = deleteRows(table, [
                (row) => values.includes(row[field]),
              ]);
              return Promise.resolve({ data: removed, error: null });
            },
          };
        },
      };
    },
    rpc: (
      fnName: string,
      payload: Record<string, unknown>,
    ): Promise<{ data: unknown; error: { message: string } | null }> => {
      if (fnName === "apply_transaction") {
        const accountId = String(payload.p_account_id);
        const type = String(payload.p_type) as Transaction["type"];
        const amount = Number(payload.p_amount);
        const note = payload.p_note ? String(payload.p_note) : null;
        const createdBy = String(payload.p_created_by);
        const account = dataStore.accounts.find(
          (entry) => entry.id === accountId && entry.is_active,
        );

        if (!account) {
          return Promise.resolve({
            data: null,
            error: { message: "Account not found or inactive" },
          });
        }

        if (amount <= 0) {
          return Promise.resolve({
            data: null,
            error: { message: "Amount must be positive" },
          });
        }

        if (type === "withdrawal" && amount > getBalance(accountId)) {
          return Promise.resolve({
            data: null,
            error: { message: "Insufficient balance" },
          });
        }

        const inserted = {
          id: nextId(),
          account_id: accountId,
          type,
          amount,
          currency: account.currency,
          note,
          related_account_id: null,
          created_by: createdBy,
          created_at: now(),
        } satisfies Transaction;

        dataStore = {
          ...dataStore,
          transactions: [...dataStore.transactions, inserted],
        };

        return Promise.resolve({ data: inserted, error: null });
      }

      if (fnName === "transfer_between_accounts") {
        const sourceId = String(payload.p_source_account_id);
        const targetId = String(payload.p_target_account_id);
        const amount = Number(payload.p_amount);
        const note = payload.p_note ? String(payload.p_note) : "";
        const createdBy = String(payload.p_created_by);
        const source = dataStore.accounts.find(
          (entry) => entry.id === sourceId && entry.is_active,
        );
        const target = dataStore.accounts.find(
          (entry) => entry.id === targetId && entry.is_active,
        );

        if (!source || !target) {
          return Promise.resolve({
            data: null,
            error: { message: "Account not found or inactive" },
          });
        }

        if (source.currency !== target.currency) {
          return Promise.resolve({
            data: null,
            error: { message: "Transfer currency mismatch" },
          });
        }

        if (amount <= 0) {
          return Promise.resolve({
            data: null,
            error: { message: "Amount must be positive" },
          });
        }

        if (amount > getBalance(sourceId)) {
          return Promise.resolve({
            data: null,
            error: { message: "Insufficient balance" },
          });
        }

        const noteSuffix = note.trim() ? ` - ${note.trim()}` : " （无备注）";
        const sourceOwner =
          dataStore.app_users.find(
            (entry) => entry.id === source.owner_child_id,
          )?.name ?? "";
        const targetOwner =
          dataStore.app_users.find(
            (entry) => entry.id === target.owner_child_id,
          )?.name ?? "";

        const sourceRow = {
          id: nextId(),
          account_id: sourceId,
          type: "transfer_out" as const,
          amount,
          currency: source.currency,
          note: `转出至 ${targetOwner} ${target.name}${noteSuffix}`,
          related_account_id: targetId,
          created_by: createdBy,
          created_at: now(),
        };

        const targetRow = {
          id: nextId(),
          account_id: targetId,
          type: "transfer_in" as const,
          amount,
          currency: target.currency,
          note: `来自 ${sourceOwner} ${source.name}${noteSuffix}`,
          related_account_id: sourceId,
          created_by: createdBy,
          created_at: now(),
        };

        dataStore = {
          ...dataStore,
          transactions: [...dataStore.transactions, sourceRow, targetRow],
        };

        return Promise.resolve({ data: [sourceRow, targetRow], error: null });
      }

      return Promise.resolve({
        data: null,
        error: { message: "Unsupported rpc" },
      });
    },
  };

  return { supabase, setMockData };
}

const supabaseMock = vi.hoisted(() => createSupabaseMock());

vi.mock("../supabaseClient", () => ({
  isSupabaseConfigured: true,
  supabase: supabaseMock.supabase,
  __setMockData: supabaseMock.setMockData,
}));

const loadMockData = (override: Partial<DataStore>) => {
  const client = supabaseMock.setMockData;
  client({
    ...createDefaultData(),
    ...override,
  });
};

const loginAs = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  pin: string,
) => {
  await user.click(await screen.findByRole("button", { name }));
  await user.type(screen.getByPlaceholderText("PIN"), pin);
  await user.click(screen.getByRole("button", { name: `登录 ${name}` }));
};

const selectChild = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) => {
  const childSection = screen
    .getByRole("heading", { name: "孩子列表" })
    .closest("section");
  expect(childSection).not.toBeNull();

  await user.click(
    await within(childSection as HTMLElement).findByRole("button", {
      name: new RegExp(name),
    }),
  );
};

const selectAccount = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) => {
  const accountSection = screen
    .getByRole("heading", { name: "账户列表" })
    .closest("section");
  expect(accountSection).not.toBeNull();

  await user.click(
    within(accountSection as HTMLElement).getByRole("button", {
      name: new RegExp(name),
    }),
  );

  return accountSection as HTMLElement;
};

describe("Home Bank UI", () => {
  beforeEach(() => {
    loadMockData({});
    sessionStorage.clear();
  });

  it("shows validation when PIN length is invalid", async () => {
    loadMockData({
      app_users: [{ id: "parent", name: "爸爸", role: "parent", pin: "1234" }],
    });

    render(App);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "爸爸" }));
    await user.type(screen.getByPlaceholderText("PIN"), "123");
    await user.click(screen.getByRole("button", { name: "登录 爸爸" }));

    expect(await screen.findByText("请输入 4 位 PIN。")).toBeInTheDocument();
  });

  it("rejects an invalid PIN", async () => {
    loadMockData({
      app_users: [{ id: "parent", name: "爸爸", role: "parent", pin: "1234" }],
    });

    render(App);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "爸爸" }));
    await user.type(screen.getByPlaceholderText("PIN"), "0000");
    await user.click(screen.getByRole("button", { name: "登录 爸爸" }));

    expect(await screen.findByText("PIN 无效，请重试。")).toBeInTheDocument();
  });

  it("renders parent view with accounts and balances", async () => {
    loadMockData({
      app_users: [
        { id: "parent", name: "爸爸", role: "parent", pin: "1234" },
        { id: "child-1", name: "小女儿", role: "child", pin: "1111" },
        { id: "child-2", name: "小儿子", role: "child", pin: "2222" },
      ],
      accounts: [
        {
          id: "acc-1",
          name: "学习基金",
          currency: "SGD",
          owner_child_id: "child-1",
          created_by: "parent",
          is_active: true,
          created_at: "2024-01-01T08:00:00Z",
        },
        {
          id: "acc-2",
          name: "旅行基金",
          currency: "CNY",
          owner_child_id: "child-2",
          created_by: "parent",
          is_active: true,
          created_at: "2024-01-01T08:00:00Z",
        },
      ],
      transactions: [
        {
          id: "t-1",
          account_id: "acc-1",
          type: "deposit",
          amount: 50,
          currency: "SGD",
          note: "储蓄",
          related_account_id: null,
          created_by: "parent",
          created_at: "2024-01-02T10:00:00Z",
        },
        {
          id: "t-2",
          account_id: "acc-2",
          type: "deposit",
          amount: 100,
          currency: "CNY",
          note: "储蓄",
          related_account_id: null,
          created_by: "parent",
          created_at: "2024-01-03T10:00:00Z",
        },
      ],
    });

    render(App);
    const user = userEvent.setup();

    await loginAs(user, "爸爸", "1234");

    expect(
      await screen.findByRole("heading", { name: "孩子列表" }),
    ).toBeInTheDocument();
    expect(screen.getByText("SGD 资产总览")).toBeInTheDocument();
    expect(screen.getByText("CNY 资产总览")).toBeInTheDocument();
    const childList = screen
      .getByRole("heading", { name: "孩子列表" })
      .closest("section");
    expect(childList).not.toBeNull();

    expect(
      within(childList as HTMLElement).getByRole("button", {
        name: /小女儿/,
      }),
    ).toBeInTheDocument();
    expect(
      within(childList as HTMLElement).getByRole("button", {
        name: /小儿子/,
      }),
    ).toBeInTheDocument();
  });

  it("allows parent to add a deposit", async () => {
    loadMockData({
      app_users: [
        { id: "parent", name: "爸爸", role: "parent", pin: "1234" },
        { id: "child-1", name: "小女儿", role: "child", pin: "1111" },
      ],
      accounts: [
        {
          id: "acc-1",
          name: "零花钱",
          currency: "CNY",
          owner_child_id: "child-1",
          created_by: "parent",
          is_active: true,
          created_at: "2024-01-01T08:00:00Z",
        },
      ],
    });

    render(App);
    const user = userEvent.setup();

    await loginAs(user, "爸爸", "1234");
    await selectChild(user, "小女儿");
    await selectAccount(user, "零花钱");

    await user.type(screen.getByPlaceholderText("金额"), "20");
    await user.type(screen.getByPlaceholderText("备注（必填）"), "零花钱发放");
    await user.click(screen.getByRole("button", { name: "增加" }));

    expect(await screen.findByText("零花钱发放")).toBeInTheDocument();
  });

  it("filters transfer targets by currency", async () => {
    loadMockData({
      app_users: [
        { id: "parent", name: "爸爸", role: "parent", pin: "1234" },
        { id: "child-1", name: "小女儿", role: "child", pin: "1111" },
        { id: "child-2", name: "小儿子", role: "child", pin: "2222" },
      ],
      accounts: [
        {
          id: "acc-1",
          name: "旅行基金",
          currency: "SGD",
          owner_child_id: "child-1",
          created_by: "parent",
          is_active: true,
          created_at: "2024-01-01T08:00:00Z",
        },
        {
          id: "acc-2",
          name: "零花钱",
          currency: "CNY",
          owner_child_id: "child-2",
          created_by: "parent",
          is_active: true,
          created_at: "2024-01-02T08:00:00Z",
        },
        {
          id: "acc-3",
          name: "旅行基金",
          currency: "SGD",
          owner_child_id: "child-2",
          created_by: "parent",
          is_active: true,
          created_at: "2024-01-03T08:00:00Z",
        },
      ],
    });

    render(App);
    const user = userEvent.setup();

    await loginAs(user, "爸爸", "1234");
    await selectChild(user, "小女儿");
    await selectAccount(user, "旅行基金");

    const transferCard = screen.getByTestId("transfer-card");
    const select = within(transferCard).getByRole("combobox");

    expect(within(select).getByText("小儿子 - 旅行基金")).toBeInTheDocument();
    expect(
      within(select).queryByText("小儿子 - 零花钱"),
    ).not.toBeInTheDocument();
  });

  it("deletes a child and related accounts", async () => {
    loadMockData({
      app_users: [
        { id: "parent", name: "爸爸", role: "parent", pin: "1234" },
        { id: "child-1", name: "小女儿", role: "child", pin: "1111" },
      ],
      accounts: [
        {
          id: "acc-1",
          name: "零花钱",
          currency: "CNY",
          owner_child_id: "child-1",
          created_by: "parent",
          is_active: true,
          created_at: "2024-01-01T08:00:00Z",
        },
      ],
    });

    render(App);
    const user = userEvent.setup();

    await loginAs(user, "爸爸", "1234");
    await user.click(screen.getByRole("button", { name: "管理孩子" }));

    const childCard = screen.getByTestId("child-card");
    const childRow = within(childCard).getByText("小女儿").closest("li");
    expect(childRow).not.toBeNull();

    await user.click(
      within(childRow as HTMLElement).getByRole("button", { name: "删除" }),
    );

    expect(within(childCard).queryByText("小女儿")).not.toBeInTheDocument();
  });

  it("updates child name from list", async () => {
    loadMockData({
      app_users: [
        { id: "parent", name: "爸爸", role: "parent", pin: "1234" },
        { id: "child-1", name: "小女儿", role: "child", pin: "1111" },
      ],
    });

    render(App);
    const user = userEvent.setup();

    await loginAs(user, "爸爸", "1234");
    await user.click(screen.getByRole("button", { name: "管理孩子" }));

    const childCard = screen.getByTestId("child-card");
    const childRow = within(childCard).getByText("小女儿").closest("li");
    expect(childRow).not.toBeNull();

    await user.click(
      within(childRow as HTMLElement).getByRole("button", { name: "编辑" }),
    );

    const input = within(childRow as HTMLElement).getByDisplayValue("小女儿");
    await user.clear(input);
    await user.type(input, "小宝");
    await user.click(
      within(childRow as HTMLElement).getByRole("button", { name: "保存" }),
    );

    expect(await within(childCard).findByText("小宝")).toBeInTheDocument();
  });

  it("updates account name from list", async () => {
    loadMockData({
      app_users: [
        { id: "parent", name: "妈妈", role: "parent", pin: "2222" },
        { id: "child-1", name: "小朋友", role: "child", pin: "1111" },
      ],
      accounts: [
        {
          id: "acc-1",
          name: "目标基金",
          currency: "CNY",
          owner_child_id: "child-1",
          created_by: "parent",
          is_active: true,
          created_at: "2024-01-01T08:00:00Z",
        },
      ],
    });

    render(App);
    const user = userEvent.setup();

    await loginAs(user, "妈妈", "2222");
    await selectChild(user, "小朋友");

    const accountSection = screen
      .getByRole("heading", { name: "账户列表" })
      .closest("section");
    expect(accountSection).not.toBeNull();

    await user.click(
      within(accountSection as HTMLElement).getByRole("button", {
        name: "编辑",
      }),
    );

    const inputs = within(accountSection as HTMLElement).getAllByDisplayValue(
      "目标基金",
    );
    const input = inputs[0];
    await user.clear(input);
    await user.type(input, "心愿账户");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await within(accountSection as HTMLElement).findByText("心愿账户"),
    ).toBeInTheDocument();
  });

  it("renders child view as read-only", async () => {
    loadMockData({
      app_users: [
        { id: "child-1", name: "大女儿", role: "child", pin: "1111" },
      ],
      accounts: [
        {
          id: "acc-1",
          name: "大女儿-日常",
          currency: "CNY",
          owner_child_id: "child-1",
          created_by: "parent",
          is_active: true,
          created_at: "2024-01-01T08:00:00Z",
        },
      ],
      transactions: [
        {
          id: "t-1",
          account_id: "acc-1",
          type: "deposit",
          amount: 20,
          currency: "CNY",
          note: "家务奖励",
          related_account_id: null,
          created_by: "parent",
          created_at: "2024-01-01T10:00:00Z",
        },
      ],
    });

    render(App);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "大女儿" }));
    await user.type(screen.getByPlaceholderText("PIN"), "1111");
    await user.click(screen.getByRole("button", { name: "登录 大女儿" }));

    expect(
      await screen.findByRole("heading", { name: "大女儿" }),
    ).toBeInTheDocument();

    expect(screen.queryByText("新增/扣减")).not.toBeInTheDocument();
    expect(screen.queryByText("同币种转账")).not.toBeInTheDocument();

    await user.click(
      await screen.findByRole("button", { name: /大女儿-日常/ }),
    );
    expect(screen.getByText("家务奖励")).toBeInTheDocument();
  });

  it("renders interest transaction with interest_month", async () => {
    loadMockData({
      app_users: [
        { id: "child-1", name: "小朋友", role: "child", pin: "1111" },
      ],
      accounts: [
        {
          id: "acc-1",
          name: "利息账户",
          currency: "CNY",
          owner_child_id: "child-1",
          created_by: "parent",
          is_active: true,
          created_at: "2024-01-01T08:00:00Z",
        },
      ],
      transactions: [
        {
          id: "t-1",
          account_id: "acc-1",
          type: "interest",
          amount: 1.23,
          currency: "CNY",
          note: "2024年01月结息，利率 10%",
          related_account_id: null,
          created_by: "parent",
          created_at: "2024-02-01T10:00:00Z",
          interest_month: "2024-01-01",
        },
      ],
    });

    render(App);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "小朋友" }));
    await user.type(screen.getByPlaceholderText("PIN"), "1111");
    await user.click(screen.getByRole("button", { name: "登录 小朋友" }));

    await user.click(
      await screen.findByRole("button", { name: /利息账户/ }),
    );

    expect(await screen.findByText("利息")).toBeInTheDocument();
    expect(
      screen.getByText("2024年01月结息，利率 10%"),
    ).toBeInTheDocument();
  });

  it("paginates transactions when loading more", async () => {
    const transactions = Array.from({ length: 15 }, (_, index) => ({
      id: `t-${index + 1}`,
      account_id: "acc-1",
      type: "deposit" as const,
      amount: 1,
      currency: "CNY",
      note: `记录-${index + 1}`,
      related_account_id: null,
      created_by: "parent",
      created_at: new Date(
        Date.UTC(2024, 0, index + 1, 10, 0, 0),
      ).toISOString(),
    }));

    loadMockData({
      app_users: [
        { id: "parent", name: "爸爸", role: "parent", pin: "1234" },
        { id: "child-1", name: "小女儿", role: "child", pin: "1111" },
      ],
      accounts: [
        {
          id: "acc-1",
          name: "零花钱",
          currency: "CNY",
          owner_child_id: "child-1",
          created_by: "parent",
          is_active: true,
          created_at: "2024-01-01T08:00:00Z",
        },
      ],
      transactions,
    });

    render(App);
    const user = userEvent.setup();

    await loginAs(user, "爸爸", "1234");
    await selectChild(user, "小女儿");
    await selectAccount(user, "零花钱");

    expect(screen.queryByText("记录-5")).not.toBeInTheDocument();
    expect(await screen.findByText("记录-15")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "加载更多" })[0]);

    expect(await screen.findByText("记录-5")).toBeInTheDocument();
  });

  it("prevents withdrawal when balance is insufficient via rpc", async () => {
    loadMockData({
      app_users: [
        { id: "parent", name: "爸爸", role: "parent", pin: "1234" },
        { id: "child-1", name: "小女儿", role: "child", pin: "1111" },
      ],
      accounts: [
        {
          id: "acc-1",
          name: "零花钱",
          currency: "CNY",
          owner_child_id: "child-1",
          created_by: "parent",
          is_active: true,
          created_at: "2024-01-01T08:00:00Z",
        },
      ],
      transactions: [],
    });

    render(App);
    const user = userEvent.setup();

    await loginAs(user, "爸爸", "1234");
    await selectChild(user, "小女儿");
    await selectAccount(user, "零花钱");

    await user.type(screen.getByPlaceholderText("金额"), "10");
    await user.type(screen.getByPlaceholderText("备注（必填）"), "测试扣减");
    await user.click(screen.getByRole("button", { name: "减少" }));

    expect(await screen.findByText("Insufficient balance")).toBeInTheDocument();
    expect(screen.queryByText("测试扣减")).not.toBeInTheDocument();
  });
});

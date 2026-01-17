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
};

type Settings = {
  id: string;
  annual_rate: number;
  timezone: string;
};

type DataStore = {
  app_users: AppUser[];
  accounts: Account[];
  transactions: Transaction[];
  settings: Settings[];
};

type DataRow<T extends keyof DataStore> = DataStore[T][number];

function createDefaultData() {
  return {
    app_users: [],
    accounts: [],
    transactions: [],
    settings: [{ id: "settings", annual_rate: 5, timezone: "Asia/Singapore" }],
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

  const createSelectBuilder = (table: keyof DataStore) => {
    const filters: Array<(row: DataStore[typeof table][number]) => boolean> =
      [];
    let limitValue: number | null = null;

    const builder = {
      eq: (field: keyof DataStore[typeof table][number], value: unknown) => {
        filters.push((row) => row[field] === value);
        return builder;
      },
      order: (field: keyof DataStore[typeof table][number]) => {
        const filtered = applyFilters(dataStore[table], filters);
        const ordered = [...filtered].sort((a, b) =>
          String(a[field]).localeCompare(String(b[field])),
        );
        const data = limitValue ? ordered.slice(0, limitValue) : ordered;
        return Promise.resolve({ data, error: null });
      },
      in: (field: keyof DataStore[typeof table][number], values: unknown[]) => {
        filters.push((row) => values.includes(row[field]));
        const filtered = applyFilters(dataStore[table], filters);
        const data = limitValue ? filtered.slice(0, limitValue) : filtered;
        return Promise.resolve({ data, error: null });
      },
      limit: (count: number) => {
        limitValue = count;
        return builder;
      },
      maybeSingle: () => {
        const filtered = applyFilters(dataStore[table], filters);
        const data =
          (limitValue ? filtered.slice(0, limitValue) : filtered)[0] ?? null;
        return Promise.resolve({ data, error: null });
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
        select: () => createSelectBuilder(table),
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
});

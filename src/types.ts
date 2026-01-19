export type Role = "parent" | "child";

export type AppUser = {
  id: string;
  name: string;
  role: Role;
  pin?: string;
  avatar_id?: string | null;
  created_at?: string;
};

export type Account = {
  id: string;
  name: string;
  currency: string;
  owner_child_id: string;
  created_by: string;
  is_active: boolean;
  created_at?: string;
};

export type Transaction = {
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

export type TransferTarget = Account & { ownerName: string };

export type StatusTone = "success" | "error";

export type Settings = {
  id: string;
  annual_rate: number;
  timezone: string;
};

export type AccountBalance = {
  account_id: string;
  balance: number | null;
};

export type SupabaseError = {
  message: string;
};

export type SupabaseQueryResult<T> = {
  data: T[] | null;
  error: SupabaseError | null;
  count?: number | null;
};

export type SupabaseSingleResult<T> = {
  data: T | null;
  error: SupabaseError | null;
};

export type SupabaseRpcResult<T> = {
  data: T | null;
  error: SupabaseError | null;
};

export type SupabaseFilterBuilder<T> = {
  eq: (column: string, value: unknown) => SupabaseFilterBuilder<T>;
  gte: (column: string, value: string) => SupabaseFilterBuilder<T>;
  in: (column: string, values: unknown[]) => SupabaseFilterBuilder<T>;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => SupabaseFilterBuilder<T>;
  range: (from: number, to: number) => SupabaseFilterBuilder<T>;
  limit: (count: number) => SupabaseFilterBuilder<T>;
  maybeSingle: () => PromiseLike<SupabaseSingleResult<T>>;
  then: <TResult1 = SupabaseQueryResult<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: SupabaseQueryResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ) => PromiseLike<TResult1 | TResult2>;
};

export type SupabaseTable<T> = {
  select: (
    columns?: string,
    options?: { count?: "exact" | "planned" | "estimated" },
  ) => SupabaseFilterBuilder<T>;
  insert: (values: Record<string, unknown>[]) => SupabaseFilterBuilder<T>;
  update: (values: Record<string, unknown>) => SupabaseFilterBuilder<T>;
  delete: () => SupabaseFilterBuilder<T>;
};

export type DatabaseTables = {
  app_users: AppUser;
  accounts: Account;
  transactions: Transaction;
  settings: Settings;
  account_balances: AccountBalance;
};

export type SupabaseFromClient = {
  from: (table: string) => SupabaseTable<unknown>;
};

export type SupabaseRpcClient = {
  rpc: <T = unknown>(
    fn: string,
    args?: Record<string, unknown>,
    options?: {
      head?: boolean;
      get?: boolean;
      count?: "exact" | "planned" | "estimated";
    },
  ) => {
    then: <TResult1 = SupabaseRpcResult<T>, TResult2 = never>(
      onfulfilled?:
        | ((value: SupabaseRpcResult<T>) => TResult1 | PromiseLike<TResult1>)
        | null,
      onrejected?:
        | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
        | null,
    ) => PromiseLike<TResult1 | TResult2>;
  };
};

export type SupabaseClient = SupabaseFromClient & SupabaseRpcClient;

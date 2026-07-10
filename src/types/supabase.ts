export type SupabaseError = { message: string };

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
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
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
  ) => PromiseLike<SupabaseRpcResult<T>>;
};

export type SupabaseClient = SupabaseFromClient & SupabaseRpcClient;

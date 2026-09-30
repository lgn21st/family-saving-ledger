export type Role = "parent" | "child";

export type AppUser = {
  id: string;
  name: string;
  role: Role;
  pin?: string;
  avatar_id?: string | null;
  is_active?: boolean;
  archived_at?: string | null;
  archived_by?: string | null;
  created_at?: string;
};

export type Account = {
  id: string;
  name: string;
  currency: string;
  owner_child_id: string;
  created_by: string;
  is_active: boolean;
  closed_at?: string | null;
  closed_by?: string | null;
  created_at?: string;
};

export type TransferTarget = Account & { ownerName: string };

export type TransactionType =
  "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "interest";

export type Transaction = {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  note: string | null;
  related_account_id: string | null;
  transfer_group_id?: string | null;
  created_by: string;
  created_at: string;
  interest_month?: string | null;
  is_void?: boolean;
  voided_at?: string | null;
  voided_by?: string | null;
};

export type StatusTone = "success" | "error";

export type LedgerActionResult =
  { ok: true; warning?: string } | { ok: false; message: string };

// Value inputs capture the operation before asynchronous work.
export type CreateChildInput = { name: string; pin: string; avatarId: string };
export type CreateAccountInput = {
  name: string;
  currency: string;
  ownerChildId: string;
};
export type TransactionInput = {
  accountId: string;
  type: "deposit" | "withdrawal";
  amount: number;
  note: string;
};
export type TransferInput = {
  sourceAccountId: string;
  targetAccountId: string;
  amount: number;
  note: string;
};
export type LedgerChange =
  | { kind: "members"; accountsChanged?: boolean }
  | { kind: "accounts" }
  | { kind: "transactions" };

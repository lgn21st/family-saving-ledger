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
  user_note?: string | null;
  note_prefix?: string | null;
  note_revision?: number;
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

export type TransactionNoteEdit = {
  id: string;
  transaction_id: string;
  revision: number;
  old_note: string | null;
  new_note: string | null;
  updated_by: string;
  updated_by_name: string;
  updated_at: string;
};
export type UpdateTransactionNoteInput = {
  transactionId: string;
  note: string;
  expectedRevision: number;
};
export type TransactionNoteResult =
  | { ok: true; transactions: Transaction[] }
  | { ok: false; message: string; latest?: Transaction };
export type NoteHistoryResult =
  | { ok: true; edits: TransactionNoteEdit[] }
  | { ok: false; message: string };

export type LedgerActionResult =
  { ok: true; warning?: string } | { ok: false; message: string; uncertain?: boolean };

// Value inputs; request IDs are added by the command boundary.
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

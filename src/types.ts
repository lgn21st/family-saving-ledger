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

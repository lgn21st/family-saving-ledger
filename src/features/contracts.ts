import type { Ref } from "vue";
import type { Account, AppUser, TransferTarget } from "../types";
import type { LedgerCommands } from "../composables/useLedgerCommands";

export type Feedback = {
  setErrorStatus: (message: string) => void;
  setSuccessStatus: (message: string) => void;
};
export type MemberServices = Feedback &
  Pick<LedgerCommands, "createChild" | "updateChildName" | "archiveChild"> & {
    childUsers: Readonly<Ref<AppUser[]>>;
  };
export type AccountServices = Feedback &
  Pick<
    LedgerCommands,
    "createAccount" | "updateAccountName" | "closeAccount"
  > & {
    childUsers: Readonly<Ref<AppUser[]>>;
    selectedChildId: Readonly<Ref<string | null>>;
    selectedChild: Readonly<Ref<AppUser | null>>;
    selectedChildAccounts: Readonly<Ref<Account[]>>;
    selectedAccountId: Readonly<Ref<string | null>>;
    balances: Readonly<Ref<Record<string, number>>>;
    formatAmount: (amount: number, currency: string) => string;
    selectChild: (id: string) => void;
    selectAccount: (id: string) => void;
  };
export type EntryServices = Feedback &
  Pick<LedgerCommands, "addTransaction" | "transfer" | "retryPending"> & {
    childUsers: Readonly<Ref<AppUser[]>>;
    selectedChildId: Readonly<Ref<string | null>>;
    selectedChildAccounts: Readonly<Ref<Account[]>>;
    selectedAccount: Readonly<Ref<Account | null>>;
    selectedAccountId: Readonly<Ref<string | null>>;
    selectedAccountBalance: Readonly<Ref<string>>;
    balances: Readonly<Ref<Record<string, number>>>;
    transferTargets: Readonly<Ref<TransferTarget[]>>;
    pendingWrite: Readonly<Ref<LedgerCommands["pendingWrite"]["value"]>>;
    selectChild: (id: string) => void;
    selectAccount: (id: string) => void;
  };

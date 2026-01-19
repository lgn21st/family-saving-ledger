import { computed, type Ref } from "vue";
import type { Account, AppUser, TransferTarget } from "../types";

export const useAccountSelection = (params: {
  user: Ref<AppUser | null>;
  accounts: Ref<Account[]>;
  childUsers: Ref<AppUser[]>;
  selectedAccountId: Ref<string | null>;
  selectedChildId: Ref<string | null>;
}) => {
  const { user, accounts, childUsers, selectedAccountId, selectedChildId } =
    params;

  const selectAccount = (accountId: string) => {
    selectedAccountId.value = accountId;
  };

  const selectedAccount = computed(() => {
    return (
      accounts.value.find((account) => account.id === selectedAccountId.value) ??
      null
    );
  });

  const selectedChild = computed(() => {
    if (user.value?.role === "parent") {
      return (
        childUsers.value.find((child) => child.id === selectedChildId.value) ??
        null
      );
    }

    if (user.value?.role === "child") {
      return user.value;
    }

    return null;
  });

  const selectedChildAccounts = computed(() => {
    if (!selectedChildId.value) return [];
    return accounts.value
      .filter((account) => account.owner_child_id === selectedChildId.value)
      .sort((left, right) =>
        (left.created_at ?? "").localeCompare(right.created_at ?? ""),
      );
  });

  const canEdit = computed(() => user.value?.role === "parent");

  const transferTargets = computed(() => {
    if (!selectedAccount.value) return [] as TransferTarget[];
    return accounts.value
      .filter(
        (account) =>
          account.currency === selectedAccount.value?.currency &&
          account.id !== selectedAccount.value?.id,
      )
      .map((account) => ({
        ...account,
        ownerName:
          childUsers.value.find((child) => child.id === account.owner_child_id)
            ?.name ?? account.name,
      }));
  });

  return {
    selectAccount,
    selectedAccount,
    selectedChild,
    selectedChildAccounts,
    canEdit,
    transferTargets,
  };
};

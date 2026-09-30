import { computed, ref, watch, type Ref } from "vue";
import type { Account, AppUser, TransferTarget } from "../types";

export const useAccountSelection = (params: {
  user: Readonly<Ref<AppUser | null>>;
  accounts: Readonly<Ref<Account[]>>;
  childUsers: Readonly<Ref<AppUser[]>>;
}) => {
  const { user, accounts, childUsers } = params;
  const accountId = ref<string | null>(null);
  const childId = ref<string | null>(null);
  const selectedChild = computed(() =>
    user.value?.role === "child"
      ? user.value
      : (childUsers.value.find((child) => child.id === childId.value) ?? null),
  );
  const selectedChildAccounts = computed(() =>
    accounts.value
      .filter((account) => account.owner_child_id === selectedChild.value?.id)
      .sort((left, right) =>
        (left.created_at ?? "").localeCompare(right.created_at ?? ""),
      ),
  );
  const selectedAccount = computed(
    () =>
      selectedChildAccounts.value.find(
        (account) => account.id === accountId.value,
      ) ?? null,
  );
  const canEdit = computed(() => user.value?.role === "parent");
  const transferTargets = computed<TransferTarget[]>(() => {
    const source = selectedAccount.value;
    if (!source) return [];
    return accounts.value
      .filter(
        (account) =>
          account.currency === source.currency && account.id !== source.id,
      )
      .map((account) => ({
        ...account,
        ownerName:
          childUsers.value.find((child) => child.id === account.owner_child_id)
            ?.name ?? account.name,
      }));
  });
  watch(
    [user, accounts, childUsers, childId, accountId],
    () => {
      if (!user.value) {
        childId.value = null;
        accountId.value = null;
        return;
      }
      if (user.value.role === "parent") {
        if (!childUsers.value.some((child) => child.id === childId.value)) {
          childId.value = childUsers.value[0]?.id ?? null;
        }
      } else childId.value = user.value.id;
      if (
        !selectedChildAccounts.value.some(
          (account) => account.id === accountId.value,
        )
      ) {
        accountId.value = selectedChildAccounts.value[0]?.id ?? null;
      }
    },
    { immediate: true },
  );
  const selectChild = (id: string) => {
    if (canEdit.value && childUsers.value.some((child) => child.id === id))
      childId.value = id;
  };
  const selectAccount = (id: string) => {
    if (selectedChildAccounts.value.some((account) => account.id === id))
      accountId.value = id;
  };
  return {
    selectedAccountId: computed(() => accountId.value),
    selectedChildId: computed(() => childId.value),
    selectedAccount,
    selectedChild,
    selectedChildAccounts,
    canEdit,
    transferTargets,
    selectAccount,
    selectChild,
  };
};

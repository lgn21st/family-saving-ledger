import { getCurrentScope, onScopeDispose, ref, watch } from "vue";
import type { Account, LedgerActionResult } from "../types";
import type { AccountServices } from "./contracts";

export const useAccountManagement = (
  params: Pick<
    AccountServices,
    | "createAccount"
    | "updateAccountName"
    | "closeAccount"
    | "selectedChildId"
    | "selectedAccountId"
    | "selectedChildAccounts"
    | "setErrorStatus"
    | "setSuccessStatus"
  > & { supportedCurrencies: string[] },
) => {
  const newAccountName = ref("");
  const newAccountCurrency = ref(params.supportedCurrencies[0] ?? "SGD");
  const newAccountOwnerId = ref(params.selectedChildId.value ?? "");
  const showAccountCreator = ref(false);
  const editingAccountId = ref<string | null>(null);
  const editingAccountName = ref("");
  const loading = ref(false);
  let active = true;
  let editorGeneration = 0;
  if (getCurrentScope())
    onScopeDispose(() => {
      active = false;
    });
  const cancelEditAccount = () => {
    editingAccountId.value = null;
    editingAccountName.value = "";
  };
  const startEditAccount = (account: Account) => {
    if (loading.value) return;
    editingAccountId.value = account.id;
    editingAccountName.value = account.name;
  };
  watch(params.selectedChildId, (id) => {
    editorGeneration += 1;
    showAccountCreator.value = false;
    newAccountName.value = "";
    newAccountCurrency.value = params.supportedCurrencies[0] ?? "SGD";
    newAccountOwnerId.value = id ?? "";
    cancelEditAccount();
  });
  watch([params.selectedAccountId, params.selectedChildAccounts], () => {
    if (
      editingAccountId.value &&
      (editingAccountId.value !== params.selectedAccountId.value ||
        !params.selectedChildAccounts.value.some(
          (account) => account.id === editingAccountId.value,
        ))
    )
      cancelEditAccount();
  });
  const submit = async (
    action: () => Promise<LedgerActionResult>,
    success: () => void,
  ) => {
    if (loading.value) return;
    loading.value = true;
    const generation = editorGeneration;
    try {
      const result = await action();
      if (!active || generation !== editorGeneration) return;
      if (!result.ok) params.setErrorStatus(result.message);
      else {
        success();
        if (result.warning) params.setErrorStatus(result.warning);
      }
    } finally {
      loading.value = false;
    }
  };
  const handleCreateAccount = async () => {
    const name = newAccountName.value.trim();
    const currency = newAccountCurrency.value.trim().toUpperCase();
    const ownerChildId = newAccountOwnerId.value;
    if (!name) return params.setErrorStatus("请输入账户名称。");
    if (!params.supportedCurrencies.includes(currency))
      return params.setErrorStatus("请选择有效币种。");
    if (!ownerChildId) return params.setErrorStatus("请选择孩子账户归属。");
    await submit(
      () => params.createAccount({ name, currency, ownerChildId }),
      () => {
        newAccountName.value = "";
        params.setSuccessStatus("账户已创建。");
      },
    );
  };
  const handleUpdateAccount = async () => {
    const id = editingAccountId.value;
    if (!id) return;
    const name = editingAccountName.value.trim();
    if (!name) return params.setErrorStatus("请输入账户名称。");
    await submit(
      () => params.updateAccountName(id, name),
      () => {
        cancelEditAccount();
        params.setSuccessStatus("账户名称已更新。");
      },
    );
  };
  const handleCloseAccount = async (account: { id: string; name: string }) => {
    await submit(
      () => params.closeAccount(account.id),
      () => {
        if (editingAccountId.value === account.id) cancelEditAccount();
        params.setSuccessStatus("账户已关闭。");
      },
    );
  };
  return {
    newAccountName,
    newAccountCurrency,
    newAccountOwnerId,
    showAccountCreator,
    editingAccountId,
    editingAccountName,
    loading,
    cancelEditAccount,
    startEditAccount,
    handleCreateAccount,
    handleUpdateAccount,
    handleCloseAccount,
  };
};

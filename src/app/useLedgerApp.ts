import { computed, onMounted, ref, watch } from "vue";
import { avatarOptions } from "../config";
import { useAuth } from "../composables/useAuth";
import { useLedgerData } from "../composables/useLedgerData";
import { useLedgerCommands } from "../composables/useLedgerCommands";
import { useAccountSelection } from "../composables/useAccountSelection";
import { useAccountHistory } from "../composables/useAccountHistory";
import { useCurrency } from "../composables/useCurrency";
import { useStatus } from "../composables/useStatus";
import { isSupabaseConfigured, supabase } from "../supabaseClient";
import type { SupabaseClient, LedgerChange } from "../types";
import type {
  MemberServices,
  AccountServices,
  EntryServices,
} from "../features/contracts";

/** Composition root: shared session/read data, navigation and change propagation. */
export const useLedgerApp = () => {
  const client = supabase as unknown as SupabaseClient;
  const feedback = useStatus();
  const auth = useAuth({
    supabase: client,
    isSupabaseConfigured,
    setStatus: feedback.setStatus,
  });
  const { user } = auth;
  const featureFeedback = {
    setErrorStatus: feedback.setErrorStatus,
    setSuccessStatus: feedback.setSuccessStatus,
  };
  const showSettings = ref(false);
  const data = useLedgerData({
    supabase: client,
    user,
    setErrorStatus: feedback.setErrorStatus,
  });
  const selection = useAccountSelection({
    user,
    accounts: data.accounts,
    childUsers: data.childUsers,
  });
  const currency = useCurrency({
    accounts: data.accounts,
    balances: data.balances,
  });
  const onChanged = async (change: LedgerChange) => {
    const actor = user.value;
    await data.refresh(change);
    if (user.value !== actor) return;
    if (change.kind === "transactions" && !(await history.refresh())) {
      throw new Error("Account history could not be refreshed");
    }
  };
  const commands = useLedgerCommands({ supabase: client, user, onChanged });
  const history = useAccountHistory({
    supabase: client,
    user,
    accounts: data.accounts,
    childUsers: data.childUsers,
    selectedAccount: selection.selectedAccount,
    timeZone: data.ledgerTimeZone,
    voidTransaction: commands.voidTransaction,
    ...featureFeedback,
  });
  const selectedAccountBalance = computed(() => {
    const account = selection.selectedAccount.value;
    return account
      ? currency.formatAmount(
          data.balances.value[account.id] ?? 0,
          account.currency,
        )
      : "0.00";
  });
  const selectedLoginUser = computed(
    () =>
      data.loginUsers.value.find(
        (entry) => entry.id === auth.selectedLoginUserId.value,
      ) ?? null,
  );
  const members: MemberServices = {
    childUsers: data.childUsers,
    createChild: commands.createChild,
    updateChildName: commands.updateChildName,
    archiveChild: commands.archiveChild,
    ...featureFeedback,
  };
  const accountManagement: AccountServices = {
    childUsers: data.childUsers,
    selectedChildId: selection.selectedChildId,
    selectedChild: selection.selectedChild,
    selectedChildAccounts: selection.selectedChildAccounts,
    selectedAccountId: selection.selectedAccountId,
    selectChild: selection.selectChild,
    selectAccount: selection.selectAccount,
    balances: data.balances,
    formatAmount: currency.formatAmount,
    createAccount: commands.createAccount,
    updateAccountName: commands.updateAccountName,
    closeAccount: commands.closeAccount,
    ...featureFeedback,
  };
  const entry: EntryServices = {
    childUsers: data.childUsers,
    selectedChildId: selection.selectedChildId,
    selectedChildAccounts: selection.selectedChildAccounts,
    selectedAccountId: selection.selectedAccountId,
    selectedAccount: selection.selectedAccount,
    transferTargets: selection.transferTargets,
    selectChild: selection.selectChild,
    selectAccount: selection.selectAccount,
    selectedAccountBalance,
    balances: data.balances,
    addTransaction: commands.addTransaction,
    transfer: commands.transfer,
    ...featureFeedback,
  };
  const handleLogout = () => {
    auth.handleLogout();
    showSettings.value = false;
    feedback.clearStatus();
  };
  watch(user, () => {
    showSettings.value = false;
  });
  onMounted(async () => {
    if (!isSupabaseConfigured) return;
    await data.loadLedgerTimeZone();
    await data.loadLoginUsers();
    const first = data.loginUsers.value[0];
    if (first) auth.selectLoginUser(first.id);
    await auth.checkSession();
  });
  return {
    ...auth,
    handleLogout,
    isSupabaseConfigured,
    ...feedback,
    ...selection,
    ...currency,
    ...history,
    avatarOptions,
    childUsers: data.childUsers,
    loginUsers: data.loginUsers,
    balances: data.balances,
    selectedLoginUser,
    showSettings,
    toggleSettings: () => {
      showSettings.value = !showSettings.value;
    },
    members,
    accountManagement,
    entry,
  };
};

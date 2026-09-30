import { computed, nextTick, onMounted, onScopeDispose, ref, watch } from "vue";
import { avatarOptions } from "../config";
import { useAuth } from "../composables/useAuth";
import { useLedgerData } from "../composables/useLedgerData";
import { useLedgerCommands } from "../composables/useLedgerCommands";
import { useAccountSelection } from "../composables/useAccountSelection";
import { useAccountHistory } from "../composables/useAccountHistory";
import { useCurrency } from "../composables/useCurrency";
import { useStatus } from "../composables/useStatus";
import { isSupabaseConfigured, supabase } from "../supabaseClient";
import type { AppUser, SupabaseClient, LedgerChange } from "../types";
import { endOfZonedDay, startOfZonedDay } from "../utils/timezone";
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
  const settingsSection = ref<"members" | "accounts" | null>(null);
  const showSettings = computed(() => settingsSection.value !== null);
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
  const refreshState = ref<"idle" | "loading" | "error">("idle");
  let active = true;
  let refreshingActor: AppUser | null = null;
  let dayTimer: ReturnType<typeof setTimeout> | undefined;
  const refreshFailure = "账本刷新失败，显示的可能是旧数据，请重试。";
  const refreshLedger = async () => {
    const actor = user.value;
    if (!active || !actor || refreshingActor === actor) return;
    refreshingActor = actor;
    refreshState.value = "loading";
    const startedDay = startOfZonedDay(new Date(), data.ledgerTimeZone.value).getTime();
    try {
      const loaded = await data.reload();
      if (!active || user.value !== actor) return;
      if (!loaded) throw new Error("Ledger data could not be refreshed");
      await nextTick();
      const accountId = selection.selectedAccount.value?.id;
      const historyLoaded = await history.refresh();
      if (!active || user.value !== actor) return;
      if (!historyLoaded && selection.selectedAccount.value?.id === accountId)
        throw new Error("History could not be refreshed");
      if (feedback.status.value === refreshFailure) feedback.clearStatus();
      refreshState.value = "idle";
    } catch {
      if (active && user.value === actor) {
        refreshState.value = "error";
        feedback.setErrorStatus(refreshFailure);
      }
    } finally {
      if (refreshingActor === actor) refreshingActor = null;
      if (active && user.value === actor && refreshState.value === "idle" && !document.hidden &&
        startOfZonedDay(new Date(), data.ledgerTimeZone.value).getTime() !== startedDay)
        void refreshLedger();
    }
  };
  const scheduleNextDay = () => {
    clearTimeout(dayTimer);
    dayTimer = undefined;
    if (!active || !user.value || document.hidden) return;
    const delay = endOfZonedDay(new Date(), data.ledgerTimeZone.value).getTime() + 1 - Date.now();
    dayTimer = setTimeout(() => {
      void refreshLedger();
      scheduleNextDay();
    }, Math.max(1, delay));
  };
  const resumeLedger = () => {
    scheduleNextDay();
    if (!document.hidden) void refreshLedger();
  };
  const restorePage = (event: PageTransitionEvent) => {
    if (event.persisted) resumeLedger();
  };
  watch([user, data.ledgerTimeZone], scheduleNextDay);
  onScopeDispose(() => {
    active = false;
    clearTimeout(dayTimer);
    document.removeEventListener("visibilitychange", resumeLedger);
    window.removeEventListener("online", resumeLedger);
    window.removeEventListener("pageshow", restorePage);
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
    pendingWrite: commands.pendingWrite,
    retryPending: commands.retryPending,
    addTransaction: commands.addTransaction,
    transfer: commands.transfer,
    ...featureFeedback,
  };
  const handleLogout = () => {
    auth.handleLogout();
    settingsSection.value = null;
    feedback.clearStatus();
  };
  watch(user, () => {
    settingsSection.value = null;
    refreshState.value = "idle";
    refreshingActor = null;
  }, { flush: "sync" });
  const reloadLoginUsers = async () => {
    if (data.loginUsersState.value === "error") feedback.clearStatus();
    if (!(await data.loadLoginUsers())) return;
    if (!selectedLoginUser.value) {
      const first = data.loginUsers.value[0];
      if (first) auth.selectLoginUser(first.id);
    }
  };
  onMounted(async () => {
    document.addEventListener("visibilitychange", resumeLedger);
    window.addEventListener("online", resumeLedger);
    window.addEventListener("pageshow", restorePage);
    if (!isSupabaseConfigured) return;
    await data.loadLedgerTimeZone();
    await reloadLoginUsers();
    if (active) await auth.checkSession();
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
    loginUsersState: data.loginUsersState,
    reloadLoginUsers,
    refreshState,
    refreshLedger,
    balances: data.balances,
    selectedLoginUser,
    settingsSection,
    showSettings,
    toggleSettings: () => {
      settingsSection.value = showSettings.value ? null : "members";
    },
    openSettings: (section: "members" | "accounts") => {
      settingsSection.value = section;
    },
    members,
    accountManagement,
    entry,
  };
};

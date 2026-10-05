<template>
  <LoginPage
    v-if="!user"
    v-model:login-pin="loginPin"
    :is-supabase-configured="isSupabaseConfigured"
    :login-users="loginUsers"
    :login-users-state="loginUsersState"
    :selected-login-user-id="selectedLoginUserId"
    :loading="loading"
    :selected-login-user="selectedLoginUser"
    :session-status="sessionStatus"
    :status="status"
    :avatar-options="avatarOptions"
    :on-select-login-user="selectLoginUser"
    :on-login="handleLogin"
    :on-retry="reloadLoginUsers"
  />

  <AppShell
    v-else
    :user="user"
    :avatar-options="avatarOptions"
    :can-edit="canEdit"
    :show-settings="showSettings"
    :on-toggle-settings="toggleSettings"
    :on-logout="handleLogout"
    :status="status"
    :status-tone="statusTone"
    :on-dismiss-status="clearStatus"
    :refresh-state="refreshState"
    :on-refresh="refreshLedger"
  >
    <SettingsPage v-if="user.role === 'parent' && showSettings" :initial-section="settingsSection ?? 'members'">
      <template #members>
        <MemberManagement :services="members" />
      </template>
      <template #accounts>
        <AccountManagement :services="accountManagement" />
      </template>
    </SettingsPage>

    <ParentDashboard
      v-else-if="user.role === 'parent'"
      :child-users="childUsers"
      :avatar-options="avatarOptions"
      :currency-totals="currencyTotals"
      :format-amount="formatAmount"
      :selected-child-id="selectedChildId"
      :selected-child-name="selectedChild?.name ?? null"
      :on-select-child="selectChild"
      :selected-child-accounts="selectedChildAccounts"
      :selected-account-id="selectedAccountId"
      :balances="balances"
      :on-select-account="selectAccount"
      :on-open-settings="openSettings"
      :selected-account="selectedAccount"
      :can-edit="canEdit"
      :chart-points="chartPoints"
      :paged-transactions="pagedTransactions"
      :has-more-transactions="hasMoreTransactions"
      :transaction-loading="transactionLoading"
      :transaction-labels="transactionLabels"
      :format-signed-amount="formatSignedAmount"
      :transaction-tone="transactionTone"
      :get-transaction-note="getTransactionNote"
      :get-transaction-context="getTransactionContext"
      :format-timestamp="formatTimestamp"
      :on-load-more="handleLoadMoreForSelected"
      :on-load-all="handleLoadAllForSelected"
      :on-update-note="handleUpdateTransactionNote"
      :on-void-transaction="handleVoidTransaction"
    >
      <template #entry="{ onClose }">
        <LedgerEntry :services="entry" :on-close="onClose" />
      </template>
    </ParentDashboard>

    <ChildDashboard
      v-else
      :grouped-accounts="groupedAccounts"
      :selected-account-id="selectedAccountId"
      :selected-account="selectedAccount"
      :balances="balances"
      :format-amount="formatAmount"
      :on-select-account="selectAccount"
      :chart-points="chartPoints"
      :month-changes="monthChanges"
      :paged-transactions="pagedTransactions"
      :has-more-transactions="hasMoreTransactions"
      :transaction-loading="transactionLoading"
      :transaction-labels="transactionLabels"
      :format-signed-amount="formatSignedAmount"
      :transaction-tone="transactionTone"
      :get-transaction-note="getTransactionNote"
      :format-timestamp="formatTimestamp"
      :on-load-more="handleLoadMoreForSelected"
      :on-load-all="handleLoadAllForSelected"
    />
  </AppShell>
</template>

<script setup lang="ts">
import { useLedgerApp } from "./app/useLedgerApp";
import AppShell from "./components/AppShell.vue";
import ChildDashboard from "./components/ChildDashboard.vue";
import LoginPage from "./components/LoginPage.vue";
import ParentDashboard from "./components/ParentDashboard.vue";
import SettingsPage from "./components/SettingsPage.vue";
import MemberManagement from "./features/MemberManagement.vue";
import AccountManagement from "./features/AccountManagement.vue";
import LedgerEntry from "./features/LedgerEntry.vue";

const {
  user,
  loginPin,
  loginUsers,
  loginUsersState,
  reloadLoginUsers,
  refreshState,
  refreshLedger,
  selectedLoginUserId,
  selectedLoginUser,
  sessionStatus,
  loading,
  isSupabaseConfigured,
  selectLoginUser,
  handleLogin,
  handleLogout,
  avatarOptions,
  canEdit,
  showSettings,
  settingsSection,
  toggleSettings,
  openSettings,
  status,
  statusTone,
  clearStatus,
  childUsers,
  currencyTotals,
  formatAmount,
  selectedChildId,
  selectedChild,
  selectChild,
  selectedChildAccounts,
  selectedAccountId,
  balances,
  selectAccount,
  selectedAccount,
  chartPoints,
  monthChanges,
  pagedTransactions,
  hasMoreTransactions,
  transactionLoading,
  transactionLabels,
  formatSignedAmount,
  transactionTone,
  getTransactionNote,
  getTransactionContext,
  formatTimestamp,
  handleLoadMoreForSelected,
  handleLoadAllForSelected,
  handleVoidTransaction,
  handleUpdateTransactionNote,
  groupedAccounts,
  members,
  accountManagement,
  entry,
} = useLedgerApp();
</script>

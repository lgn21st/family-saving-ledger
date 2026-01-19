<template>
  <LoginPanel
    v-if="!user"
    v-model:loginPin="loginPin"
    :is-supabase-configured="isSupabaseConfigured"
    :login-users="loginUsers"
    :selected-login-user-id="selectedLoginUserId"
    :loading="loading"
    :selected-login-user="selectedLoginUser"
    :session-status="sessionStatus"
    :status="status"
    :avatar-options="avatarOptions"
    :sanitize-pin="sanitizePin"
    :on-select-login-user="selectLoginUser"
    :on-login="handleLogin"
  />

  <div v-else class="flex min-h-screen flex-col">
    <header
      class="flex flex-wrap items-center justify-between gap-4 bg-brand-600 px-6 py-4 text-white shadow-lg"
    >
      <div class="flex items-center gap-4">
        <Avatar
          :avatar-id="user.avatar_id"
          :options="avatarOptions"
          :role="user.role"
          class="h-16 w-16"
        />
        <div>
          <h2 class="text-xl font-semibold">{{ user.name }}</h2>
          <span class="text-sm text-white/80">Home Bank</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="canEdit"
          type="button"
          class="rounded-full bg-white/20 px-4 py-1 text-sm font-semibold text-white transition hover:bg-white/30"
          @click="showChildManager = !showChildManager"
        >
          {{ showChildManager ? "关闭孩子管理" : "管理孩子" }}
        </button>
        <span class="rounded-full bg-white/30 px-3 py-1 text-xs font-semibold">
          {{ user.role === "parent" ? "家长" : "孩子" }}
        </span>
        <button
          class="rounded-full bg-white px-4 py-1 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-100"
          @click="handleLogout"
        >
          退出
        </button>
      </div>
    </header>
    <StatusBanner :message="status" :tone="statusTone" />

    <main v-if="user.role === 'parent'" class="flex-1 space-y-6 px-6 py-6">
      <section
        v-if="showChildManager"
        class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
        data-testid="child-card"
      >
        <h4 class="text-sm font-semibold text-slate-700">孩子管理</h4>
        <div class="mt-4 flex flex-col gap-3 lg:flex-row">
          <input
            v-model="newChildName"
            type="text"
            placeholder="孩子姓名"
            class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <input
            v-model="newChildPin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="4"
            placeholder="PIN（4 位）"
            class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-center text-sm tracking-[0.25em] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            @input="newChildPin = sanitizePin(newChildPin)"
          />
        </div>
        <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <button
            v-for="avatar in childAvatars"
            :key="avatar.id"
            type="button"
            :class="[
              'flex flex-col items-center gap-3 rounded-3xl border px-4 py-3 text-sm transition',
              avatar.id === newChildAvatarId
                ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200'
                : 'border-white/60 bg-white shadow-sm hover:bg-brand-50',
            ]"
            @click="newChildAvatarId = avatar.id"
          >
            <Avatar
              :avatar-id="avatar.id"
              :options="avatarOptions"
              role="child"
              class="h-16 w-16"
            />
            <span class="text-slate-600">{{ avatar.label }}</span>
          </button>
        </div>
        <button
          class="mt-4 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loading"
          @click="handleCreateChild"
        >
          创建孩子
        </button>
        <ul
          v-if="childUsers.length > 0"
          class="mt-4 space-y-2 text-sm text-slate-700"
        >
          <li
            v-for="child in childUsers"
            :key="child.id"
            class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3"
          >
            <div class="flex items-center gap-4">
              <Avatar
                :avatar-id="child.avatar_id"
                :options="avatarOptions"
                role="child"
                class="h-16 w-16"
              />
              <input
                v-if="editingChildId === child.id"
                v-model="editingChildName"
                type="text"
                class="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <span v-else class="text-base font-semibold">{{
                child.name
              }}</span>
            </div>
            <div class="flex items-center gap-2">
              <template v-if="editingChildId === child.id">
                <button
                  type="button"
                  class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
                  :disabled="loading"
                  @click="handleUpdateChild"
                >
                  保存
                </button>
                <button
                  type="button"
                  class="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-300"
                  :disabled="loading"
                  @click="cancelEditChild"
                >
                  取消
                </button>
              </template>
              <button
                v-else
                type="button"
                class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                :disabled="loading"
                @click="startEditChild(child)"
              >
                编辑
              </button>
              <button
                type="button"
                class="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-200"
                :disabled="loading"
                @click="handleDeleteChild(child.id)"
              >
                删除
              </button>
            </div>
          </li>
        </ul>
      </section>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="(total, currency) in currencyTotals"
          :key="currency"
          class="rounded-3xl bg-white/90 p-5 text-center shadow-lg backdrop-blur"
        >
          <p
            class="text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            {{ currency }} 资产总览
          </p>
          <p class="mt-3 text-3xl font-semibold text-slate-800">
            {{ formatAmount(total, currency) }}
          </p>
        </div>
      </div>

      <section
        class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
      >
        <h4 class="text-sm font-semibold text-slate-700">孩子列表</h4>
        <p v-if="childUsers.length === 0" class="mt-3 text-sm text-slate-500">
          暂无孩子，请先创建。
        </p>
        <div v-else class="mt-4 grid grid-cols-2 gap-3">
          <button
            v-for="child in childUsers"
            :key="child.id"
            type="button"
            :class="[
              'relative h-28 flex items-center gap-4 rounded-2xl border px-4 transition-all duration-200',
              selectedChildId === child.id
                ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-300 active:scale-95'
                : 'border-gray-200 bg-white shadow-sm hover:bg-purple-50 active:scale-95',
            ]"
            @click="selectedChildId = child.id"
          >
            <Avatar
              :avatar-id="child.avatar_id"
              :options="avatarOptions"
              role="child"
              class="h-16 w-16 shrink-0"
              :class="selectedChildId === child.id ? 'bg-white/20' : ''"
            />
            <span
              :class="[
                'text-lg font-semibold',
                selectedChildId === child.id ? 'text-white' : 'text-slate-800',
              ]"
              >{{ child.name }}</span
            >
            <span
              v-if="selectedChildId === child.id"
              class="absolute top-2 right-2 rounded-full bg-white/20 px-2 py-0.5 text-xs text-white"
            >
              当前
            </span>
          </button>
        </div>
      </section>

      <section
        class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
      >
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold text-slate-700">账户列表</h4>
          <span
            v-if="selectedChild"
            class="text-xs font-semibold text-slate-400"
          >
            {{ selectedChild?.name }}
          </span>
        </div>

        <div
          v-if="selectedChildId"
          class="mt-4 rounded-2xl border border-dashed border-brand-200 bg-white/70 p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h5 class="text-sm font-semibold text-slate-600">创建账户</h5>
            <button
              type="button"
              class="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-700"
              @click="showAccountCreator = !showAccountCreator"
            >
              {{ showAccountCreator ? "收起" : "创建账户" }}
            </button>
          </div>
          <div v-if="showAccountCreator" class="mt-4">
            <div class="flex flex-col gap-3 lg:flex-row">
              <input
                v-model="newAccountName"
                type="text"
                placeholder="账户名称"
                class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <select
                v-model="newAccountCurrency"
                class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option
                  v-for="currency in supportedCurrencies"
                  :key="currency"
                  :value="currency"
                >
                  {{ currency }}
                </option>
              </select>
            </div>
            <div class="mt-3 flex flex-col gap-3 lg:flex-row">
              <select
                v-model="newAccountOwnerId"
                class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:w-40"
              >
                <option value="">选择孩子</option>
                <option
                  v-for="child in childUsers"
                  :key="child.id"
                  :value="child.id"
                >
                  {{ child.name }}
                </option>
              </select>
              <button
                class="min-w-[96px] rounded-2xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="loading"
                @click="handleCreateAccount"
              >
                创建
              </button>
            </div>
          </div>
        </div>

        <template v-if="selectedChildId">
          <p
            v-if="selectedChildAccounts.length === 0"
            class="mt-4 text-sm text-slate-500"
          >
            该孩子暂无账户。
          </p>
          <div v-else class="mt-4 grid gap-3 md:grid-cols-2">
            <div
              v-for="account in selectedChildAccounts"
              :key="account.id"
              :class="[
                'flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition',
                account.id === selectedAccountId
                  ? 'border-purple-300 bg-purple-50 text-purple-700 shadow-md ring-2 ring-purple-200'
                  : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md',
              ]"
            >
              <button
                type="button"
                class="flex flex-1 flex-col text-left"
                @click="selectAccount(account.id)"
              >
                <input
                  v-if="editingAccountId === account.id"
                  v-model="editingAccountName"
                  type="text"
                  class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <template v-else>
                  <p>{{ account.name }}</p>
                  <p class="text-xs text-slate-400">{{ account.currency }}</p>
                </template>
              </button>
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-slate-500">
                  {{
                    formatAmount(balances[account.id] ?? 0, account.currency)
                  }}
                </span>
                <template v-if="editingAccountId === account.id">
                  <button
                    type="button"
                    class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
                    :disabled="loading"
                    @click="handleUpdateAccount"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    class="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-300"
                    :disabled="loading"
                    @click="cancelEditAccount"
                  >
                    取消
                  </button>
                </template>
                <button
                  v-else
                  type="button"
                  class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                  :disabled="loading"
                  @click="startEditAccount(account)"
                >
                  编辑
                </button>
              </div>
            </div>
          </div>
        </template>
        <p v-else class="mt-3 text-sm text-slate-500">请选择孩子查看账户。</p>
      </section>

      <template v-if="selectedAccount">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <template v-if="editingAccountId === selectedAccount.id">
              <div class="flex flex-col gap-2">
                <input
                  v-model="editingAccountName"
                  type="text"
                  class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-base font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
                    :disabled="loading"
                    @click="handleUpdateAccount"
                  >
                    保存名称
                  </button>
                  <button
                    type="button"
                    class="rounded-full bg-slate-200 px-4 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-300"
                    :disabled="loading"
                    @click="cancelEditAccount"
                  >
                    取消
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <h3 class="text-lg font-semibold text-slate-800">
                {{ selectedAccount.name }}
              </h3>
              <p class="text-sm text-slate-500">
                币种 {{ selectedAccount.currency }} · 余额
                {{
                  formatAmount(
                    balances[selectedAccount.id] ?? 0,
                    selectedAccount.currency,
                  )
                }}
              </p>
            </template>
          </div>
        </div>
      </template>

      <AccountDetailPanel
        :selected-account="selectedAccount"
        :selected-child-name="selectedChild?.name ?? null"
        :can-edit="canEdit"
        :chart-path="chartPath"
        v-model:amount-input="amountInput"
        v-model:note-input="noteInput"
        v-model:transfer-amount="transferAmount"
        v-model:transfer-target-id="transferTargetId"
        v-model:transfer-note="transferNote"
        :transfer-targets="transferTargets"
        :formatted-balance="
          selectedAccount
            ? formatAmount(
                balances[selectedAccount.id] ?? 0,
                selectedAccount.currency,
              )
            : '0.00'
        "
        :loading="loading"
        :paged-transactions="pagedTransactions"
        :has-more-transactions="hasMoreTransactions"
        :transaction-loading="transactionLoading"
        :transaction-labels="transactionLabels"
        :format-signed-amount="formatSignedAmount"
        :transaction-tone="transactionTone"
        :get-transaction-note="getTransactionNote"
        :format-timestamp="formatTimestamp"
        :on-add-transaction="handleAddTransaction"
        :on-transfer="handleTransfer"
        :on-load-more="handleLoadMoreForSelected"
      />
    </main>

    <div v-else class="flex flex-1 flex-col lg:flex-row">
      <div class="order-1 space-y-6 px-6 py-6">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="(total, currency) in currencyTotals"
            :key="currency"
            class="rounded-3xl bg-white/90 p-5 text-center shadow-lg backdrop-blur"
          >
            <p
              class="text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              {{ currency }} 资产总览
            </p>
            <p class="mt-3 text-3xl font-semibold text-slate-800">
              {{ formatAmount(total, currency) }}
            </p>
          </div>
        </div>
      </div>

      <aside
        class="order-2 border-t border-white/60 bg-white/80 px-6 py-5 backdrop-blur lg:order-1 lg:w-72 lg:border-t-0 lg:border-r"
      >
        <h3 class="text-sm font-semibold text-slate-600">账户</h3>
        <div class="mt-4 space-y-4">
          <div
            v-for="(currencyAccounts, currency) in groupedAccounts"
            :key="currency"
          >
            <h4
              class="text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              {{ currency }}
            </h4>
            <div
              class="mt-2 flex flex-col gap-3 sm:flex-row sm:overflow-x-auto sm:pb-2 lg:block lg:space-y-2 lg:overflow-visible"
            >
              <button
                v-for="account in currencyAccounts"
                :key="account.id"
                class="flex w-full min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition sm:min-w-[220px]"
                :class="
                  account.id === selectedAccountId
                    ? 'border-purple-300 bg-purple-50 text-purple-700 shadow-md ring-2 ring-purple-200'
                    : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md'
                "
                @click="selectAccount(account.id)"
              >
                <span class="flex-1 break-words">{{ account.name }}</span>
                <span class="text-xs font-semibold text-slate-500">
                  {{
                    formatAmount(balances[account.id] ?? 0, account.currency)
                  }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <section class="order-3 flex-1 space-y-6 px-6 py-6 lg:order-2">
        <AccountOverviewPanel
          :selected-account="selectedAccount"
          :formatted-balance="
            selectedAccount
              ? formatAmount(
                  balances[selectedAccount.id] ?? 0,
                  selectedAccount.currency,
                )
              : '0.00'
          "
          :chart-path="chartPath"
          :paged-transactions="pagedTransactions"
          :has-more-transactions="hasMoreTransactions"
          :transaction-loading="transactionLoading"
          :transaction-labels="transactionLabels"
          :format-signed-amount="formatSignedAmount"
          :transaction-tone="transactionTone"
          :get-transaction-note="getTransactionNote"
          :format-timestamp="formatTimestamp"
          :on-load-more="handleLoadMoreForSelected"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import Avatar from "./components/Avatar.vue";
import AccountDetailPanel from "./components/AccountDetailPanel.vue";
import AccountOverviewPanel from "./components/AccountOverviewPanel.vue";
import LoginPanel from "./components/LoginPanel.vue";
import StatusBanner from "./components/StatusBanner.vue";
import { avatarOptions, type AvatarOption, supportedCurrencies } from "./config";
import { useAccounts } from "./composables/useAccounts";
import { useAccountEditor } from "./composables/useAccountEditor";
import { useAccountSelection } from "./composables/useAccountSelection";
import { useChildren } from "./composables/useChildren";
import { useAuth } from "./composables/useAuth";
import { useAppBootstrap } from "./composables/useAppBootstrap";
import { useChartData } from "./composables/useChartData";
import { useCurrencyDisplay } from "./composables/useCurrencyDisplay";
import { useDerivedViews } from "./composables/useDerivedViews";
import { useSelectionSync } from "./composables/useSelectionSync";
import { useSessionActions } from "./composables/useSessionActions";
import { useStatus } from "./composables/useStatus";
import { useTransactionActions } from "./composables/useTransactionActions";
import { useTransactionDisplay } from "./composables/useTransactionDisplay";
import { useTransactionPaging } from "./composables/useTransactionPaging";
import { useTransfers } from "./composables/useTransfers";
import { useTransactions } from "./composables/useTransactions";
import { useUsers } from "./composables/useUsers";
import type { Account, AppUser, Transaction } from "./types";
import { sanitizePin } from "./utils/formatting";

const childAvatars = avatarOptions.filter((avatar) => avatar.role === "child");

const user = ref<AppUser | null>(null);
const loginPin = ref("");
const selectedLoginUserId = ref<string | null>(null);
const selectedAccountId = ref<string | null>(null);
const { status, statusTone, setStatus, setErrorStatus, setSuccessStatus } =
  useStatus();
const { childUsers, loginUsers, loadChildUsers, loadLoginUsers } = useUsers({
  supabase,
  setErrorStatus,
});
const { accounts, balances, loadAccounts, loadBalances } = useAccounts({
  supabase,
  setErrorStatus,
});
const { groupedAccounts, currencyTotals, formatAmount } = useCurrencyDisplay({
  accounts,
  balances,
});
const {
  transactionLabels,
  signedAmount,
  transactionTone,
  formatSignedAmount,
  formatTimestamp,
  getTransactionNote,
} = useTransactionDisplay({
  accounts,
  childUsers,
});
const loading = ref(false);
const amountInput = ref("");
const noteInput = ref("");
const transferAmount = ref("");
const transferTargetId = ref("");
const transferNote = ref("");
const newAccountName = ref("");
const newAccountCurrency = ref("SGD");
const newAccountOwnerId = ref("");
const newChildName = ref("");
const newChildPin = ref("");
const newChildAvatarId = ref(childAvatars[0]?.id ?? "");
const editingChildId = ref<string | null>(null);
const editingChildName = ref("");
const editingAccountId = ref<string | null>(null);
const editingAccountName = ref("");
const sessionStatus = ref<string | null>(null);
const selectedChildId = ref<string | null>(null);
const showChildManager = ref(false);
const showAccountCreator = ref(false);

const {
  transactions,
  chartTransactions,
  chartBaseBalance,
  transactionLoading,
  hasMoreTransactions,
  clearTransactions,
  resetSelectedAccountData,
  handleLoadMoreTransactions,
} = useTransactions({
  supabase,
  setErrorStatus,
});

const {
  selectAccount,
  selectedAccount,
  selectedChild,
  selectedChildAccounts,
  canEdit,
  transferTargets,
} = useAccountSelection({
  user,
  accounts,
  childUsers,
  selectedAccountId,
  selectedChildId,
});

const { selectedLoginUser, selectedTransactions, pagedTransactions } =
  useDerivedViews({
    loginUsers,
    selectedLoginUserId,
    selectedAccount,
    transactions,
  });

const { chartPoints, chartPath } = useChartData({
  selectedAccount,
  chartTransactions,
  chartBaseBalance,
  signedAmount,
});

const currentUserId = computed(() => user.value?.id ?? null);

const { handleLogin, checkSession } = useAuth({
  supabase,
  user,
  loginPin,
  selectedLoginUserId,
  isSupabaseConfigured,
  sessionStatus,
  loading,
  setStatus,
});

const { loadLoginUsersAndSelect, bootstrap } = useAppBootstrap({
  isSupabaseConfigured,
  user,
  loginUsers,
  selectedLoginUserId,
  loadLoginUsers,
  checkSession,
  loadAccounts,
  loadChildUsers,
});

const {
  selectLoginUser,
  refreshAccountData,
  handleLogout,
} = useSessionActions({
  user,
  accounts,
  balances,
  loginPin,
  selectedLoginUserId,
  selectedAccountId,
  selectedChildId,
  showChildManager,
  showAccountCreator,
  clearTransactions,
  setStatus,
  loadBalances,
  resetSelectedAccountData,
  selectedAccount,
});

const { handleCreateChild, handleDeleteChild, handleUpdateChild } =
  useChildren({
    supabase,
    user,
    loading,
    newChildName,
    newChildPin,
    newChildAvatarId,
    defaultAvatarId: childAvatars[0]?.id ?? "",
    editingChildId,
    editingChildName,
    cancelEditChild: () => {
      editingChildId.value = null;
      editingChildName.value = "";
    },
    setStatus,
    setErrorStatus,
    setSuccessStatus,
    loadChildUsers,
    loadLoginUsersAndSelect,
    loadAccounts,
  });

const { handleTransfer } = useTransfers({
  supabase,
  userId: currentUserId,
  selectedAccountId,
  transferAmount,
  transferTargetId,
  transferNote,
  accounts,
  balances,
  loading,
  setStatus,
  setErrorStatus,
  setSuccessStatus,
  refreshAccountData,
});

const { handleCreateAccount, handleUpdateAccount, startEditAccount } =
  useAccountEditor({
    supabase,
    user,
    supportedCurrencies,
    loading,
    newAccountName,
    newAccountCurrency,
    newAccountOwnerId,
    editingAccountId,
    editingAccountName,
    setStatus,
    setErrorStatus,
    setSuccessStatus,
    loadAccounts,
    cancelEditAccount: () => {
      editingAccountId.value = null;
      editingAccountName.value = "";
    },
  });

const { handleAddTransaction } = useTransactionActions({
  supabase,
  userId: currentUserId,
  selectedAccountId,
  amountInput,
  noteInput,
  loading,
  setStatus,
  setErrorStatus,
  setSuccessStatus,
  refreshAccountData,
});

const { handleLoadMoreForSelected } = useTransactionPaging({
  selectedAccount,
  handleLoadMoreTransactions,
});

const startEditChild = (child: AppUser) => {
  editingChildId.value = child.id;
  editingChildName.value = child.name;
};

const cancelEditChild = () => {
  editingChildId.value = null;
  editingChildName.value = "";
};

const cancelEditAccount = () => {
  editingAccountId.value = null;
  editingAccountName.value = "";
};

useSelectionSync({
  supportedCurrencies,
  selectedChildId,
  selectedAccountId,
  selectedAccount,
  childUsers,
  accounts,
  transactions,
  user,
  showAccountCreator,
  newAccountName,
  newAccountCurrency,
  newAccountOwnerId,
  editingAccountId,
  cancelEditAccount,
  clearTransactions,
  resetSelectedAccountData,
});

onMounted(async () => {
  await bootstrap();
});
</script>

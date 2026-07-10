<template>
  <section class="surface-card p-4 sm:p-5" aria-labelledby="accounts-title">
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="section-kicker">账户导航</p>
        <h2 id="accounts-title" class="mt-1 truncate text-base font-semibold text-slate-950">
          账户列表
        </h2>
      </div>
      <span v-if="selectedChildName" class="truncate text-xs font-medium text-slate-500">
        {{ selectedChildName }}
      </span>
    </div>

    <div v-if="selectedChildId" class="mt-4">
      <button
        type="button"
        class="button-secondary w-full border-dashed"
        :aria-expanded="showAccountCreatorModel"
        @click="showAccountCreatorModel = !showAccountCreatorModel"
      >
        {{ showAccountCreatorModel ? "收起创建账户" : "创建账户" }}
      </button>

      <div v-if="showAccountCreatorModel" class="surface-muted mt-3 space-y-3 p-3.5">
        <div>
          <label for="new-account-name" class="field-label">账户名称</label>
          <input
            id="new-account-name"
            v-model="newAccountNameModel"
            name="new-account-name"
            type="text"
            autocomplete="off"
            placeholder="账户名称"
            class="app-input"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="new-account-currency" class="field-label">币种</label>
            <select
              id="new-account-currency"
              v-model="newAccountCurrencyModel"
              name="new-account-currency"
              class="app-input"
            >
              <option v-for="currency in supportedCurrencies" :key="currency" :value="currency">
                {{ currency }}
              </option>
            </select>
          </div>
          <div>
            <label for="new-account-owner" class="field-label">归属</label>
            <select
              id="new-account-owner"
              v-model="newAccountOwnerIdModel"
              name="new-account-owner"
              class="app-input"
            >
              <option value="">选择孩子</option>
              <option v-for="child in childUsers" :key="child.id" :value="child.id">
                {{ child.name }}
              </option>
            </select>
          </div>
        </div>
        <button class="button-primary w-full" :disabled="loading" @click="onCreateAccount">
          创建
        </button>
      </div>

      <p v-if="selectedChildAccounts.length === 0" class="mt-4 text-sm text-slate-500">
        该孩子暂无账户。
      </p>
      <div v-else class="mt-3 space-y-2.5">
        <article
          v-for="account in selectedChildAccounts"
          :key="account.id"
          :class="[
            'rounded-2xl border p-3 transition-[border-color,background-color,box-shadow]',
            account.id === selectedAccountId
              ? 'border-brand-300 bg-brand-50 shadow-sm ring-1 ring-brand-100'
              : 'border-slate-200 bg-white hover:border-brand-200',
          ]"
        >
          <div class="flex min-w-0 items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <template v-if="editingAccountId === account.id">
                <label :for="`account-name-${account.id}`" class="sr-only">账户名称</label>
                <input
                  :id="`account-name-${account.id}`"
                  v-model="editingAccountNameModel"
                  name="account-name"
                  type="text"
                  autocomplete="off"
                  class="app-input"
                />
              </template>
              <button
                v-else
                type="button"
                class="block w-full min-w-0 rounded-lg text-left focus-visible:ring-3 focus-visible:ring-brand-100 focus-visible:outline-none"
                :aria-current="account.id === selectedAccountId ? 'true' : undefined"
                @click="onSelectAccount(account.id)"
              >
                <span class="block truncate text-sm font-semibold text-slate-950">
                  {{ account.name }}
                </span>
                <span class="numeric mt-1 block text-xs text-slate-500">
                  {{ account.currency }} · {{ formatAmount(balances[account.id] ?? 0, account.currency) }}
                </span>
              </button>
            </div>
            <button
              v-if="editingAccountId !== account.id"
              type="button"
              class="button-quiet min-h-9 shrink-0 px-2.5 py-1.5 text-xs"
              :disabled="loading"
              @click="onStartEditAccount(account)"
            >
              编辑
            </button>
          </div>
          <div v-if="editingAccountId === account.id" class="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              class="button-primary min-h-9 px-3 py-1.5 text-xs"
              :disabled="loading"
              @click="onUpdateAccount"
            >
              保存
            </button>
            <button
              type="button"
              class="button-quiet min-h-9 px-3 py-1.5 text-xs"
              :disabled="loading"
              @click="onCancelEditAccount"
            >
              取消
            </button>
            <button
              v-if="isZeroBalance(account.id)"
              type="button"
              class="button-danger min-h-9 px-3 py-1.5 text-xs"
              :disabled="loading"
              @click="onCloseAccount(account)"
            >
              关闭账户
            </button>
          </div>
        </article>
      </div>
    </div>
    <p v-else class="mt-4 text-sm text-slate-500">请选择孩子查看账户。</p>
  </section>
</template>

<script setup lang="ts">
import type { Account, AppUser } from "../types";

const newAccountNameModel = defineModel<string>("newAccountName", { required: true });
const newAccountCurrencyModel = defineModel<string>("newAccountCurrency", {
  required: true,
});
const newAccountOwnerIdModel = defineModel<string>("newAccountOwnerId", {
  required: true,
});
const showAccountCreatorModel = defineModel<boolean>("showAccountCreator", {
  required: true,
});
const editingAccountNameModel = defineModel<string>("editingAccountName", {
  required: true,
});

const props = defineProps<{
  selectedChildId: string | null;
  selectedChildName: string | null;
  childUsers: AppUser[];
  selectedChildAccounts: Account[];
  selectedAccountId: string | null;
  balances: Record<string, number>;
  supportedCurrencies: string[];
  loading: boolean;
  editingAccountId: string | null;
  formatAmount: (amount: number, currency: string) => string;
  onCreateAccount: () => void;
  onSelectAccount: (id: string) => void;
  onStartEditAccount: (account: Account) => void;
  onUpdateAccount: () => void;
  onCancelEditAccount: () => void;
  onCloseAccount: (account: Account) => void;
}>();

const isZeroBalance = (accountId: string) => {
  const value = props.balances[accountId] ?? 0;
  return Math.abs(value) < 0.000001;
};
</script>

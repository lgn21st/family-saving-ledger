<template>
  <section class="mt-5 grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
    <ChildListPanel
      :child-users="childUsers"
      :selected-child-id="selectedChildId"
      :avatar-options="avatarOptions"
      :on-select-child="services.selectChild"
    />
  <section class="surface-card p-4 sm:p-5" aria-labelledby="accounts-title">
    <div
      :inert="Boolean(confirmingAccount) || undefined"
      :aria-hidden="confirmingAccount ? 'true' : undefined"
    >
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="section-kicker">账户导航</p>
        <h2 id="accounts-title" class="mt-1 truncate text-base font-semibold text-slate-950">
          账户列表
        </h2>
      </div>
      <span v-if="selectedChild?.name" class="truncate text-xs font-medium text-slate-500">
        {{ selectedChild?.name }}
      </span>
    </div>

    <div v-if="selectedChildId" class="mt-4">
      <button
        type="button"
        class="button-secondary w-full border-dashed"
        :aria-expanded="showAccountCreator"
        @click="showAccountCreator = !showAccountCreator"
      >
        {{ showAccountCreator ? "收起创建账户" : "创建账户" }}
      </button>

      <div v-if="showAccountCreator" class="surface-muted mt-3 space-y-3 p-3.5">
        <div>
          <label for="new-account-name" class="field-label">账户名称</label>
          <input
            id="new-account-name"
            v-model="newAccountName"
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
              v-model="newAccountCurrency"
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
              v-model="newAccountOwnerId"
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
        <button class="button-primary w-full" :disabled="loading" @click="handleCreateAccount">
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
                  v-model="editingAccountName"
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
                @click="services.selectAccount(account.id)"
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
              class="button-quiet min-h-11 shrink-0 px-2.5 py-1.5 text-xs"
              :disabled="loading"
              @click="startEditAccount(account)"
            >
              编辑
            </button>
          </div>
          <div v-if="editingAccountId === account.id" class="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              class="button-primary min-h-11 px-3 py-1.5 text-xs"
              :disabled="loading"
              @click="handleUpdateAccount"
            >
              保存
            </button>
            <button
              type="button"
              class="button-quiet min-h-11 px-3 py-1.5 text-xs"
              :disabled="loading"
              @click="cancelEditAccount"
            >
              取消
            </button>
            <button
              v-if="isZeroBalance(account.id)"
              type="button"
              class="button-danger min-h-11 px-3 py-1.5 text-xs"
              :disabled="loading"
              @click="requestClose(account)"
            >
              关闭账户
            </button>
          </div>
        </article>
      </div>
    </div>
    <p v-else class="mt-4 text-sm text-slate-500">请选择孩子查看账户。</p>
    </div>

    <ConfirmActionDialog
      v-if="confirmingAccount"
      title-id="close-account-dialog-title"
      description-id="close-account-dialog-description"
      kicker="余额需为零"
      :title="`关闭账户「${confirmingAccount.name}」？`"
      description="关闭后账户不再显示，也无法继续记账或转账，历史记录仍会保留。"
      detail="本月尚未结算的利息不会补发。"
      confirm-label="确认关闭"
      :loading="loading"
      :on-cancel="cancelClose"
      :on-confirm="confirmClose"
    />
  </section>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";
import ChildListPanel from "../components/ChildListPanel.vue";
import ConfirmActionDialog from "../components/ConfirmActionDialog.vue";
import { useAccountManagement } from "./useAccountManagement";
import { avatarOptions, supportedCurrencies } from "../config";
import type { Account } from "../types";
import type { AccountServices } from "./contracts";

const { services } = defineProps<{ services: AccountServices }>();
const { childUsers, selectedChildId, selectedChild, selectedChildAccounts,
  selectedAccountId, balances, formatAmount } = services;
const {
  newAccountName, newAccountCurrency, newAccountOwnerId, showAccountCreator,
  editingAccountName, editingAccountId, loading, handleCreateAccount,
  startEditAccount, handleUpdateAccount, cancelEditAccount, handleCloseAccount,
} = useAccountManagement({ ...services, supportedCurrencies });

const confirmingAccount = ref<Account | null>(null);
const closeTrigger = ref<HTMLElement | null>(null);

const requestClose = (account: Account) => {
  closeTrigger.value = document.activeElement as HTMLElement | null;
  confirmingAccount.value = account;
};
const cancelClose = async () => {
  confirmingAccount.value = null;
  await nextTick();
  closeTrigger.value?.focus();
  closeTrigger.value = null;
};
const confirmClose = async () => {
  if (!confirmingAccount.value) return;
  await handleCloseAccount(confirmingAccount.value);
  confirmingAccount.value = null;
  closeTrigger.value = null;
};

const isZeroBalance = (accountId: string) => {
  const value = balances.value[accountId] ?? 0;
  return Math.abs(value) < 0.000001;
};
</script>

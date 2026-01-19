<template>
  <section
    class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur sticky top-0 z-40 max-h-screen overflow-y-auto lg:static lg:z-auto lg:max-h-none lg:overflow-visible"
  >
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-semibold text-slate-700">账户列表</h4>
      <span v-if="selectedChildName" class="text-xs font-semibold text-slate-400">
        {{ selectedChildName }}
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
          @click="showAccountCreatorModel = !showAccountCreatorModel"
        >
          {{ showAccountCreatorModel ? "收起" : "创建账户" }}
        </button>
      </div>
      <div v-if="showAccountCreatorModel" class="mt-4">
        <div class="flex flex-col gap-3 lg:flex-row">
          <input
            v-model="newAccountNameModel"
            type="text"
            placeholder="账户名称"
            class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <select
            v-model="newAccountCurrencyModel"
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
            v-model="newAccountOwnerIdModel"
            class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:w-40"
          >
            <option value="">选择孩子</option>
            <option v-for="child in childUsers" :key="child.id" :value="child.id">
              {{ child.name }}
            </option>
          </select>
          <button
            class="min-w-[96px] rounded-2xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="onCreateAccount"
          >
            创建
          </button>
        </div>
      </div>
    </div>

    <template v-if="selectedChildId">
      <p v-if="selectedChildAccounts.length === 0" class="mt-4 text-sm text-slate-500">
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
          <button type="button" class="flex flex-1 flex-col text-left" @click="onSelectAccount(account.id)">
            <input
              v-if="editingAccountId === account.id"
              v-model="editingAccountNameModel"
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
              {{ formatAmount(balances[account.id] ?? 0, account.currency) }}
            </span>
            <template v-if="editingAccountId === account.id">
              <button
                type="button"
                class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
                :disabled="loading"
                @click="onUpdateAccount"
              >
                保存
              </button>
              <button
                type="button"
                class="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-300"
                :disabled="loading"
                @click="onCancelEditAccount"
              >
                取消
              </button>
            </template>
            <button
              v-else
              type="button"
              class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
              :disabled="loading"
              @click="onStartEditAccount(account)"
            >
              编辑
            </button>
          </div>
        </div>
      </div>
    </template>
    <p v-else class="mt-3 text-sm text-slate-500">请选择孩子查看账户。</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Account, AppUser } from "../types";

const props = defineProps<{
  selectedChildId: string | null;
  selectedChildName: string | null;
  childUsers: AppUser[];
  selectedChildAccounts: Account[];
  selectedAccountId: string | null;
  balances: Record<string, number>;
  supportedCurrencies: string[];
  newAccountName: string;
  newAccountCurrency: string;
  newAccountOwnerId: string;
  showAccountCreator: boolean;
  loading: boolean;
  editingAccountId: string | null;
  editingAccountName: string;
  formatAmount: (amount: number, currency: string) => string;
  onCreateAccount: () => void;
  onSelectAccount: (id: string) => void;
  onStartEditAccount: (account: Account) => void;
  onUpdateAccount: () => void;
  onCancelEditAccount: () => void;
}>();

const emit = defineEmits<{
  (event: "update:newAccountName", value: string): void;
  (event: "update:newAccountCurrency", value: string): void;
  (event: "update:newAccountOwnerId", value: string): void;
  (event: "update:showAccountCreator", value: boolean): void;
  (event: "update:editingAccountName", value: string): void;
}>();

const newAccountNameModel = computed({
  get: () => props.newAccountName,
  set: (value) => emit("update:newAccountName", value),
});

const newAccountCurrencyModel = computed({
  get: () => props.newAccountCurrency,
  set: (value) => emit("update:newAccountCurrency", value),
});

const newAccountOwnerIdModel = computed({
  get: () => props.newAccountOwnerId,
  set: (value) => emit("update:newAccountOwnerId", value),
});

const showAccountCreatorModel = computed({
  get: () => props.showAccountCreator,
  set: (value) => emit("update:showAccountCreator", value),
});

const editingAccountNameModel = computed({
  get: () => props.editingAccountName,
  set: (value) => emit("update:editingAccountName", value),
});
</script>

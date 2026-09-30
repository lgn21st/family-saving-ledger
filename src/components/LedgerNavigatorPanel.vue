<template>
  <section class="surface-card overflow-hidden p-4 sm:p-5" aria-labelledby="ledger-navigator-title">
    <h2 id="ledger-navigator-title" class="sr-only">选择孩子和账户</h2>
    <div class="grid gap-4 lg:grid-cols-2 lg:gap-6">
      <section aria-labelledby="child-switcher-title">
        <h3 id="child-switcher-title" class="text-xs font-semibold text-slate-500">选择孩子</h3>
        <div v-if="childUsers.length > 0" class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="child in childUsers"
            :key="child.id"
            type="button"
            :aria-pressed="selectedChildId === child.id"
            :class="[
              'flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-[border-color,background-color,box-shadow,transform] focus-visible:ring-3 focus-visible:ring-brand-100 focus-visible:outline-none active:translate-y-px',
              selectedChildId === child.id
                ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50',
            ]"
            @click="onSelectChild(child.id)"
          >
            <Avatar
              :avatar-id="child.avatar_id"
              :options="avatarOptions"
              role="child"
              class="h-7 w-7 shrink-0"
            />
            <span class="truncate text-sm font-semibold">{{ child.name }}</span>
            <span
              v-if="selectedChildId === child.id"
              class="h-2 w-2 shrink-0 rounded-full bg-emerald-400"
              aria-label="当前选择"
            />
          </button>
        </div>
        <p v-else class="mt-3 text-sm text-slate-500">暂无孩子。</p>
      </section>

      <section aria-labelledby="account-switcher-title" class="min-w-0">
        <h3 id="account-switcher-title" class="text-xs font-semibold text-slate-500">
          {{ selectedChildName ? `${selectedChildName}的账户` : "选择账户" }}
        </h3>
        <template v-if="accounts.length > 0">
          <select
            :value="selectedAccountId ?? ''"
            aria-labelledby="account-switcher-title"
            class="app-input mt-2"
            @change="changeAccount"
          >
            <option v-if="!selectedAccount" value="" disabled>请选择账户</option>
            <option v-for="account in accounts" :key="account.id" :value="account.id">
              {{ account.name }} · {{ account.currency }}
            </option>
          </select>
          <div v-if="selectedAccount" class="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span class="text-xs font-medium text-slate-500">当前余额</span>
            <p class="numeric text-2xl font-bold tracking-tight text-slate-950">
              {{ formatAmount(balances[selectedAccount.id] ?? 0, selectedAccount.currency) }}
            </p>
          </div>
        </template>
        <div v-else class="mt-2 rounded-xl bg-slate-50 px-4 py-3">
          <p class="text-sm font-medium text-slate-600">
            {{ selectedChildName ? "这个孩子还没有账户" : "请先选择孩子" }}
          </p>
          <button type="button" class="button-quiet mt-1 px-0" @click="onOpenSettings(selectedChildId ? 'accounts' : 'members')">
            {{ selectedChildId ? "前往设置创建账户" : "前往设置添加孩子" }}
          </button>
        </div>
      </section>
    </div>

    <section
      v-if="Object.keys(currencyTotals).length > 0"
      aria-labelledby="family-assets-title"
      class="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-slate-100 pt-3"
    >
      <h3 id="family-assets-title" class="text-xs font-medium text-slate-500">家庭资产</h3>
      <dl class="flex flex-wrap gap-x-3 gap-y-1">
        <div v-for="(total, currency) in currencyTotals" :key="currency">
          <dt class="sr-only">{{ currency }}</dt>
          <dd class="numeric text-xs font-semibold text-slate-600">
            {{ formatAmount(total, currency) }}
          </dd>
        </div>
      </dl>
    </section>
    <p class="sr-only" role="status" aria-live="polite">
      <template v-if="selectedAccount">
        当前账户：{{ selectedChildName }} · {{ selectedAccount.name }}，余额{{ formatAmount(balances[selectedAccount.id] ?? 0, selectedAccount.currency) }}
      </template>
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Avatar from "./Avatar.vue";
import type { Account, AppUser } from "../types";
import type { AvatarOption } from "../config";

const props = defineProps<{
  currencyTotals: Record<string, number>;
  childUsers: AppUser[];
  selectedChildId: string | null;
  selectedChildName: string | null;
  avatarOptions: AvatarOption[];
  accounts: Account[];
  selectedAccountId: string | null;
  balances: Record<string, number>;
  formatAmount: (amount: number, currency: string) => string;
  onSelectChild: (id: string) => void;
  onSelectAccount: (id: string) => void;
  onOpenSettings: (section: "members" | "accounts") => void;
}>();

const selectedAccount = computed(() => props.accounts.find((account) => account.id === props.selectedAccountId));
const changeAccount = (event: Event) => {
  const account = props.accounts.find((item) => item.id === (event.target as HTMLSelectElement).value);
  if (!account) return;
  props.onSelectAccount(account.id);
};
</script>

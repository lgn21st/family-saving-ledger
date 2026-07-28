<template>
  <section class="surface-card overflow-hidden" aria-labelledby="ledger-navigator-title">
    <div class="p-4 sm:p-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="section-kicker">家庭账本</p>
          <h2 id="ledger-navigator-title" class="mt-1 text-lg font-semibold text-slate-950">
            选择孩子和账户
          </h2>
        </div>
        <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          实时余额
        </span>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-[210px_230px_minmax(0,1fr)] lg:gap-0">
        <section aria-labelledby="family-assets-title" class="lg:pr-5">
          <h3 id="family-assets-title" class="text-xs font-semibold text-slate-500">家庭资产</h3>
          <dl class="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-1">
            <div
              v-for="(total, currency) in currencyTotals"
              :key="currency"
              class="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-white"
            >
              <dt class="text-xs font-semibold text-slate-400">{{ currency }}</dt>
              <dd class="numeric truncate text-sm font-semibold">
                {{ formatAmount(total, currency) }}
              </dd>
            </div>
          </dl>
        </section>

        <section
          aria-labelledby="child-switcher-title"
          class="border-t border-slate-100 pt-4 lg:border-t-0 lg:border-l lg:px-5 lg:pt-0"
        >
          <div class="flex items-center justify-between gap-2">
            <h3 id="child-switcher-title" class="text-xs font-semibold text-slate-500">选择孩子</h3>
            <span class="text-xs text-slate-400">{{ childUsers.length }} 位</span>
          </div>
          <div v-if="childUsers.length > 0" class="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-1">
            <button
              v-for="child in childUsers"
              :key="child.id"
              type="button"
              :aria-pressed="selectedChildId === child.id"
              :class="[
                'relative flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-[border-color,background-color,box-shadow,transform] focus-visible:ring-3 focus-visible:ring-brand-100 focus-visible:outline-none active:translate-y-px',
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
                class="h-9 w-9 shrink-0"
              />
              <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ child.name }}</span>
              <span
                v-if="selectedChildId === child.id"
                class="h-2 w-2 shrink-0 rounded-full bg-emerald-400"
                aria-label="当前选择"
              />
            </button>
          </div>
          <p v-else class="mt-3 text-sm text-slate-500">暂无孩子。</p>
        </section>

        <section
          aria-labelledby="account-switcher-title"
          class="border-t border-slate-100 pt-4 lg:border-t-0 lg:border-l lg:pl-5 lg:pt-0"
        >
          <div class="flex items-center justify-between gap-3">
            <h3 id="account-switcher-title" class="truncate text-xs font-semibold text-slate-500">
              {{ selectedChildName ? `${selectedChildName}的账户` : "选择账户" }}
            </h3>
            <span class="text-xs text-slate-400">{{ accounts.length }} 个</span>
          </div>
          <div v-if="accounts.length > 0" class="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              v-for="account in accounts"
              :key="account.id"
              type="button"
              :aria-current="account.id === selectedAccountId ? 'true' : undefined"
              :class="[
                'flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow,transform] focus-visible:ring-3 focus-visible:ring-brand-100 focus-visible:outline-none active:translate-y-px',
                account.id === selectedAccountId
                  ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                  : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50',
              ]"
              @click="selectAccount(account)"
            >
              <span class="min-w-0">
                <span
                  :class="[
                    'block truncate text-sm font-semibold',
                    account.id === selectedAccountId ? 'text-white' : 'text-slate-900',
                  ]"
                >
                  {{ account.name }}
                </span>
                <span class="mt-0.5 block text-xs text-slate-400">
                  {{ account.currency }}
                </span>
              </span>
              <span class="flex shrink-0 flex-col items-end">
                <span
                  v-if="account.id === selectedAccountId"
                  class="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"
                >
                  当前
                </span>
                <span
                  :class="[
                    'numeric text-sm font-semibold',
                    account.id === selectedAccountId ? 'mt-1 text-white' : 'text-slate-700',
                  ]"
                >
                  {{ formatAmount(balances[account.id] ?? 0, account.currency) }}
                </span>
              </span>
            </button>
          </div>
          <div v-else class="mt-2 rounded-xl bg-slate-50 px-4 py-4">
            <p class="text-sm font-medium text-slate-600">
              {{ selectedChildName ? "这个孩子还没有账户" : "请先选择孩子" }}
            </p>
            <button type="button" class="button-quiet mt-1 px-0" @click="onOpenSettings">
              前往设置创建账户
            </button>
          </div>
        </section>
      </div>
    </div>
    <p class="sr-only" role="status" aria-live="polite">{{ accountSelectionStatus }}</p>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
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
  onOpenSettings: () => void;
}>();

const accountSelectionStatus = ref("");
const selectAccount = (account: Account) => {
  props.onSelectAccount(account.id);
  accountSelectionStatus.value = `已切换到${account.name}，余额${props.formatAmount(props.balances[account.id] ?? 0, account.currency)}`;
};
</script>

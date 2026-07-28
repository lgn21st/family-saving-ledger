<template>
  <main id="main-content" class="page-container flex-1 py-5 sm:py-7">
    <header class="surface-card p-5 sm:p-7">
      <div>
        <p class="section-kicker">家庭管理</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">设置</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          在这里管理家庭成员和账户。日常查看、记账与转账仍留在账本工作台。
        </p>
      </div>

      <nav class="mt-6 flex gap-2 border-b border-slate-200" aria-label="设置分类">
        <button
          v-for="item in navigationItems"
          :key="item.id"
          type="button"
          :aria-current="activeSection === item.id ? 'page' : undefined"
          :class="[
            '-mb-px min-h-11 border-b-2 px-4 py-2 text-sm font-semibold transition-[border-color,color] focus-visible:ring-3 focus-visible:ring-brand-100 focus-visible:outline-none',
            activeSection === item.id
              ? 'border-brand-700 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-900',
          ]"
          @click="activeSection = item.id"
        >
          {{ item.label }}
        </button>
      </nav>
    </header>

    <ChildManagerCard
      v-if="activeSection === 'members'"
      v-model:new-child-name="newChildNameModel"
      v-model:new-child-pin="newChildPinModel"
      v-model:new-child-avatar-id="newChildAvatarIdModel"
      v-model:editing-child-name="editingChildNameModel"
      class="mt-5"
      :child-users="childUsers"
      :child-avatars="childAvatars"
      :avatar-options="avatarOptions"
      :editing-child-id="editingChildId"
      :loading="loading"
      :sanitize-pin="sanitizePin"
      :on-create-child="onCreateChild"
      :on-start-edit-child="onStartEditChild"
      :on-update-child="onUpdateChild"
      :on-cancel-edit-child="onCancelEditChild"
      :on-archive-child="onArchiveChild"
    />

    <section v-else class="mt-5 grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <ChildListPanel
        :child-users="childUsers"
        :selected-child-id="selectedChildId"
        :avatar-options="avatarOptions"
        :on-select-child="onSelectChild"
      />
      <AccountListPanel
        v-model:new-account-name="newAccountNameModel"
        v-model:new-account-currency="newAccountCurrencyModel"
        v-model:new-account-owner-id="newAccountOwnerIdModel"
        v-model:show-account-creator="showAccountCreatorModel"
        v-model:editing-account-name="editingAccountNameModel"
        :selected-child-id="selectedChildId"
        :selected-child-name="selectedChildName"
        :child-users="childUsers"
        :selected-child-accounts="selectedChildAccounts"
        :selected-account-id="selectedAccountId"
        :balances="balances"
        :supported-currencies="supportedCurrencies"
        :loading="loading"
        :editing-account-id="editingAccountId"
        :format-amount="formatAmount"
        :on-create-account="onCreateAccount"
        :on-select-account="onSelectAccount"
        :on-start-edit-account="onStartEditAccount"
        :on-update-account="onUpdateAccount"
        :on-cancel-edit-account="onCancelEditAccount"
        :on-close-account="onCloseAccount"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";

import AccountListPanel from "./AccountListPanel.vue";
import ChildListPanel from "./ChildListPanel.vue";
import ChildManagerCard from "./ChildManagerCard.vue";
import type { Account, AppUser } from "../types";
import type { AvatarOption } from "../config";

type SettingsSection = "members" | "accounts";

const newChildNameModel = defineModel<string>("newChildName", { required: true });
const newChildPinModel = defineModel<string>("newChildPin", { required: true });
const newChildAvatarIdModel = defineModel<string>("newChildAvatarId", { required: true });
const editingChildNameModel = defineModel<string>("editingChildName", { required: true });
const newAccountNameModel = defineModel<string>("newAccountName", { required: true });
const newAccountCurrencyModel = defineModel<string>("newAccountCurrency", { required: true });
const newAccountOwnerIdModel = defineModel<string>("newAccountOwnerId", { required: true });
const showAccountCreatorModel = defineModel<boolean>("showAccountCreator", { required: true });
const editingAccountNameModel = defineModel<string>("editingAccountName", { required: true });

const activeSection = ref<SettingsSection>("members");
const navigationItems: Array<{ id: SettingsSection; label: string }> = [
  { id: "members", label: "成员" },
  { id: "accounts", label: "账户" },
];

defineProps<{
  childUsers: AppUser[];
  childAvatars: AvatarOption[];
  avatarOptions: AvatarOption[];
  editingChildId: string | null;
  loading: boolean;
  sanitizePin: (value: string) => string;
  onCreateChild: () => void;
  onStartEditChild: (child: AppUser) => void;
  onUpdateChild: () => void;
  onCancelEditChild: () => void;
  onArchiveChild: (id: string) => void | Promise<void>;
  selectedChildId: string | null;
  selectedChildName: string | null;
  onSelectChild: (id: string) => void;
  selectedChildAccounts: Account[];
  selectedAccountId: string | null;
  balances: Record<string, number>;
  supportedCurrencies: string[];
  editingAccountId: string | null;
  formatAmount: (amount: number, currency: string) => string;
  onCreateAccount: () => void;
  onSelectAccount: (id: string) => void;
  onStartEditAccount: (account: Account) => void;
  onUpdateAccount: () => void;
  onCancelEditAccount: () => void;
  onCloseAccount: (account: Account) => void | Promise<void>;
}>();
</script>

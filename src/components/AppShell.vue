<template>
  <div class="flex min-h-screen flex-col bg-slate-50">
    <a
      href="#main-content"
      class="fixed top-3 left-3 z-[70] -translate-y-[calc(100%+1rem)] whitespace-nowrap rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
    >
      跳到主要内容
    </a>
    <AppHeader
      :user="user"
      :avatar-options="avatarOptions"
      :can-edit="canEdit"
      :show-settings="showSettings"
      :on-toggle-settings="onToggleSettings"
      :on-logout="onLogout"
      :status="status"
      :status-tone="statusTone"
      :on-dismiss-status="onDismissStatus"
    />
    <slot />
  </div>
</template>

<script setup lang="ts">
import AppHeader from "./AppHeader.vue";
import type { AppUser, StatusTone } from "../types";
import type { AvatarOption } from "../config";

defineProps<{
  user: AppUser;
  avatarOptions: AvatarOption[];
  canEdit: boolean;
  showSettings: boolean;
  onToggleSettings: () => void;
  onLogout: () => void;
  status: string | null;
  statusTone: StatusTone;
  onDismissStatus: () => void;
}>();
</script>

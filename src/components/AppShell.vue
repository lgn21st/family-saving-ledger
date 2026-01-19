<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader
      :user="user"
      :avatar-options="avatarOptions"
      :can-edit="canEdit"
      :show-child-manager="showChildManager"
      :on-toggle-child-manager="onToggleChildManager"
      :on-logout="onLogout"
      :status="status"
      :status-tone="statusTone"
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
  showChildManager: boolean;
  onToggleChildManager: () => void;
  onLogout: () => void;
  status: string | null;
  statusTone: StatusTone;
}>();
</script>

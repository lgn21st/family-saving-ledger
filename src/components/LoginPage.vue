<template>
  <LoginPanel
    v-model:login-pin="loginPinModel"
    :is-supabase-configured="isSupabaseConfigured"
    :login-users="loginUsers"
    :selected-login-user-id="selectedLoginUserId"
    :loading="loading"
    :selected-login-user="selectedLoginUser"
    :session-status="sessionStatus"
    :status="status"
    :avatar-options="avatarOptions"
    :sanitize-pin="sanitizePin"
    :on-select-login-user="onSelectLoginUser"
    :on-login="onLogin"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import LoginPanel from "./LoginPanel.vue";
import type { AppUser } from "../types";
import type { AvatarOption } from "../config";

const props = defineProps<{
  isSupabaseConfigured: boolean;
  loginUsers: AppUser[];
  selectedLoginUserId: string | null;
  loginPin: string;
  loading: boolean;
  selectedLoginUser: AppUser | null;
  sessionStatus: string | null;
  status: string | null;
  avatarOptions: AvatarOption[];
  sanitizePin: (value: string) => string;
  onSelectLoginUser: (id: string) => void;
  onLogin: () => void;
}>();

const emit = defineEmits<{
  (event: "update:loginPin", value: string): void;
}>();

const loginPinModel = computed({
  get: () => props.loginPin,
  set: (value) => emit("update:loginPin", value),
});
</script>

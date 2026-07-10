<template>
  <header class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
    <div class="page-container flex min-h-18 items-center justify-between gap-3 py-3">
      <div class="flex min-w-0 items-center gap-3">
        <Avatar
          :avatar-id="user.avatar_id"
          :options="avatarOptions"
          :role="user.role"
          class="h-11 w-11 shrink-0"
        />
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-slate-950 sm:text-base">
            家庭储蓄账本
          </p>
          <div class="truncate text-xs text-slate-500">
            <h1 class="inline text-xs font-normal">{{ user.name }}</h1>
            <span> · {{ user.role === "parent" ? "家长模式" : "我的储蓄" }}</span>
            <span class="sr-only">Home Bank</span>
          </div>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          v-if="canEdit"
          type="button"
          class="button-secondary min-h-9 px-3 py-1.5 text-xs sm:text-sm"
          :aria-pressed="showChildManager"
          aria-label="管理孩子"
          @click="onToggleChildManager"
        >
          {{ showChildManager ? "返回账本" : "成员管理" }}
        </button>
        <span
          class="hidden rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 sm:inline-flex"
        >
          {{ user.role === "parent" ? "家长" : "孩子" }}
        </span>
        <button
          type="button"
          class="button-quiet min-h-9 px-2.5 py-1.5"
          @click="onLogout"
        >
          退出
        </button>
      </div>
    </div>
  </header>
  <StatusBanner :message="status" :tone="statusTone" />
</template>

<script setup lang="ts">
import Avatar from "./Avatar.vue";
import StatusBanner from "./StatusBanner.vue";
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

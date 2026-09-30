<template>
  <header class="z-50 shrink-0 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
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
          type="button"
          class="button-quiet min-h-11 min-w-11 px-2.5 py-1.5"
          :disabled="refreshState === 'loading'"
          :aria-label="refreshState === 'loading' ? '正在刷新账本' : refreshState === 'error' ? '重试刷新账本' : '刷新账本'"
          :aria-busy="refreshState === 'loading'"
          :title="refreshState === 'error' ? '重试刷新账本' : '刷新账本'"
          @click="onRefresh"
        >
          <span v-if="refreshState === 'error'" class="text-xs text-rose-700">重试</span>
          <svg v-else class="h-4 w-4" :class="{ 'animate-spin motion-reduce:animate-none': refreshState === 'loading' }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M20 7v5h-5M4 17v-5h5M5 8a7.5 7.5 0 0 1 12.5-3L20 8M4 16l2.5 3A7.5 7.5 0 0 0 19 16" />
          </svg>
        </button>
        <button
          v-if="canEdit"
          type="button"
          class="button-secondary min-h-11 px-3 py-1.5 text-xs sm:text-sm"
          :aria-pressed="showSettings"
          :aria-label="showSettings ? '返回账本' : '打开设置'"
          @click="onToggleSettings"
        >
          {{ showSettings ? "返回账本" : "设置" }}
        </button>
        <span
          class="hidden rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 sm:inline-flex"
        >
          {{ user.role === "parent" ? "家长" : "孩子" }}
        </span>
        <button
          type="button"
          class="button-quiet min-h-11 px-2.5 py-1.5"
          @click="onLogout"
        >
          退出
        </button>
      </div>
    </div>
  </header>
  <StatusBanner :message="status" :tone="statusTone" :on-dismiss="onDismissStatus" />
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
  showSettings: boolean;
  onToggleSettings: () => void;
  onLogout: () => void;
  status: string | null;
  statusTone: StatusTone;
  onDismissStatus: () => void;
  refreshState: "idle" | "loading" | "error";
  onRefresh: () => void | Promise<void>;
}>();
</script>

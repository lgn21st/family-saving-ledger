<template>
  <header
    class="flex flex-wrap items-center justify-between gap-4 bg-brand-600 px-6 py-4 text-white shadow-lg"
  >
    <div class="flex items-center gap-4">
      <Avatar
        :avatar-id="user.avatar_id"
        :options="avatarOptions"
        :role="user.role"
        class="h-16 w-16"
      />
      <div>
        <h2 class="text-xl font-semibold">{{ user.name }}</h2>
        <span class="text-sm text-white/80">Home Bank</span>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <button
        v-if="canEdit"
        type="button"
        class="rounded-full bg-white/20 px-4 py-1 text-sm font-semibold text-white transition hover:bg-white/30"
        @click="onToggleChildManager"
      >
        {{ showChildManager ? "关闭孩子管理" : "管理孩子" }}
      </button>
      <span class="rounded-full bg-white/30 px-3 py-1 text-xs font-semibold">
        {{ user.role === "parent" ? "家长" : "孩子" }}
      </span>
      <button
        class="rounded-full bg-white px-4 py-1 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-100"
        @click="onLogout"
      >
        退出
      </button>
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

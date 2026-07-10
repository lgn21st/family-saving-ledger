<template>
  <section class="surface-card p-4 sm:p-5" aria-labelledby="children-title">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="section-kicker">家庭成员</p>
        <h2 id="children-title" class="mt-1 text-base font-semibold text-slate-950">
          孩子列表
        </h2>
      </div>
      <span class="text-xs text-slate-500">{{ childUsers.length }} 位</span>
    </div>
    <p v-if="childUsers.length === 0" class="mt-4 text-sm text-slate-500">
      暂无孩子，请先创建。
    </p>
    <div v-else class="mt-4 grid grid-cols-2 gap-2.5">
      <button
        v-for="child in childUsers"
        :key="child.id"
        type="button"
        :aria-pressed="selectedChildId === child.id"
        :class="[
          'relative flex min-w-0 items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-[border-color,background-color,box-shadow,transform] focus-visible:ring-3 focus-visible:ring-brand-100 focus-visible:outline-none active:translate-y-px',
          selectedChildId === child.id
            ? 'border-slate-950 bg-slate-950 text-white shadow-md'
            : 'border-slate-200 bg-white text-slate-800 hover:border-brand-300 hover:bg-brand-50',
        ]"
        @click="onSelectChild(child.id)"
      >
        <Avatar
          :avatar-id="child.avatar_id"
          :options="avatarOptions"
          role="child"
          class="h-11 w-11 shrink-0"
        />
        <span class="min-w-0 flex-1 truncate text-sm font-semibold">
          {{ child.name }}
        </span>
        <span
          v-if="selectedChildId === child.id"
          class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-400"
          aria-label="当前选择"
        />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import Avatar from "./Avatar.vue";
import type { AppUser } from "../types";
import type { AvatarOption } from "../config";

defineProps<{
  childUsers: AppUser[];
  selectedChildId: string | null;
  avatarOptions: AvatarOption[];
  onSelectChild: (id: string) => void;
}>();
</script>

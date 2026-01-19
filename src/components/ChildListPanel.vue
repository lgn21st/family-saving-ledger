<template>
  <section class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur">
    <h4 class="text-sm font-semibold text-slate-700">孩子列表</h4>
    <p v-if="childUsers.length === 0" class="mt-3 text-sm text-slate-500">
      暂无孩子，请先创建。
    </p>
    <div v-else class="mt-4 grid grid-cols-2 gap-3">
      <button
        v-for="child in childUsers"
        :key="child.id"
        type="button"
        :class="[
          'relative h-28 flex items-center gap-4 rounded-2xl border px-4 transition-all duration-200',
          selectedChildId === child.id
            ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-300 active:scale-95'
            : 'border-gray-200 bg-white shadow-sm hover:bg-purple-50 active:scale-95',
        ]"
        @click="onSelectChild(child.id)"
      >
        <Avatar
          :avatar-id="child.avatar_id"
          :options="avatarOptions"
          role="child"
          class="h-16 w-16 shrink-0"
          :class="selectedChildId === child.id ? 'bg-white/20' : ''"
        />
        <span
          :class="[
            'text-lg font-semibold',
            selectedChildId === child.id ? 'text-white' : 'text-slate-800',
          ]"
        >
          {{ child.name }}
        </span>
        <span
          v-if="selectedChildId === child.id"
          class="absolute top-2 right-2 rounded-full bg-white/20 px-2 py-0.5 text-xs text-white"
        >
          当前
        </span>
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

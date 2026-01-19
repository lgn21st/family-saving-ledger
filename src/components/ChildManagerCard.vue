<template>
  <section
    class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
    data-testid="child-card"
  >
    <h4 class="text-sm font-semibold text-slate-700">孩子管理</h4>
    <div class="mt-4 flex flex-col gap-3 lg:flex-row">
      <input
        v-model="childNameModel"
        type="text"
        placeholder="孩子姓名"
        class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      <input
        :value="newChildPin"
        type="password"
        inputmode="numeric"
        pattern="[0-9]*"
        maxlength="4"
        placeholder="PIN（4 位）"
        class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-center text-sm tracking-[0.25em] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        @input="onPinInput"
      />
    </div>
    <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <button
        v-for="avatar in childAvatars"
        :key="avatar.id"
        type="button"
        :class="[
          'flex flex-col items-center gap-3 rounded-3xl border px-4 py-3 text-sm transition',
          avatar.id === newChildAvatarId
            ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200'
            : 'border-white/60 bg-white shadow-sm hover:bg-brand-50',
        ]"
        @click="emit('update:newChildAvatarId', avatar.id)"
      >
        <Avatar
          :avatar-id="avatar.id"
          :options="avatarOptions"
          role="child"
          class="h-16 w-16"
        />
        <span class="text-slate-600">{{ avatar.label }}</span>
      </button>
    </div>
    <button
      class="mt-4 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="loading"
      @click="onCreateChild"
    >
      创建孩子
    </button>
    <ul v-if="childUsers.length > 0" class="mt-4 space-y-2 text-sm text-slate-700">
      <li
        v-for="child in childUsers"
        :key="child.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3"
      >
        <div class="flex items-center gap-4">
          <Avatar
            :avatar-id="child.avatar_id"
            :options="avatarOptions"
            role="child"
            class="h-16 w-16"
          />
          <input
            v-if="editingChildId === child.id"
            v-model="editingChildNameModel"
            type="text"
            class="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <span v-else class="text-base font-semibold">{{ child.name }}</span>
        </div>
        <div class="flex items-center gap-2">
          <template v-if="editingChildId === child.id">
            <button
              type="button"
              class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
              :disabled="loading"
              @click="onUpdateChild"
            >
              保存
            </button>
            <button
              type="button"
              class="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-300"
              :disabled="loading"
              @click="onCancelEditChild"
            >
              取消
            </button>
          </template>
          <button
            v-else
            type="button"
            class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
            :disabled="loading"
            @click="onStartEditChild(child)"
          >
            编辑
          </button>
          <button
            type="button"
            class="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-200"
            :disabled="loading"
            @click="onDeleteChild(child.id)"
          >
            删除
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Avatar from "./Avatar.vue";
import type { AppUser } from "../types";
import type { AvatarOption } from "../config";

const props = defineProps<{
  childUsers: AppUser[];
  childAvatars: AvatarOption[];
  avatarOptions: AvatarOption[];
  newChildName: string;
  newChildPin: string;
  newChildAvatarId: string;
  editingChildId: string | null;
  editingChildName: string;
  loading: boolean;
  sanitizePin: (value: string) => string;
  onCreateChild: () => void;
  onStartEditChild: (child: AppUser) => void;
  onUpdateChild: () => void;
  onCancelEditChild: () => void;
  onDeleteChild: (id: string) => void;
}>();

const emit = defineEmits<{
  (event: "update:newChildName", value: string): void;
  (event: "update:newChildPin", value: string): void;
  (event: "update:newChildAvatarId", value: string): void;
  (event: "update:editingChildName", value: string): void;
}>();

const childNameModel = computed({
  get: () => props.newChildName,
  set: (value) => emit("update:newChildName", value),
});

const editingChildNameModel = computed({
  get: () => props.editingChildName,
  set: (value) => emit("update:editingChildName", value),
});

const onPinInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  emit("update:newChildPin", props.sanitizePin(target?.value ?? ""));
};
</script>

<template>
  <section class="surface-card mx-auto max-w-5xl p-5 sm:p-7" data-testid="child-card">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="section-kicker">家庭设置</p>
        <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">孩子管理</h2>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          新增孩子、设置登录 PIN 或更新名称。归档前需要先将孩子名下所有账户余额清零。
        </p>
      </div>
      <span class="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
        {{ childUsers.length }} 位孩子
      </span>
    </div>

    <div class="mt-7 rounded-3xl bg-slate-50 p-4 sm:p-5">
      <h2 class="text-base font-semibold text-slate-950">添加孩子</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label for="new-child-name" class="field-label">孩子姓名</label>
          <input
            id="new-child-name"
            v-model="childNameModel"
            name="new-child-name"
            type="text"
            autocomplete="off"
            placeholder="孩子姓名"
            class="app-input"
          />
        </div>
        <div>
          <label for="new-child-pin" class="field-label">4 位登录 PIN</label>
          <input
            id="new-child-pin"
            :value="newChildPin"
            name="new-child-pin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="4"
            autocomplete="new-password"
            spellcheck="false"
            placeholder="PIN（4 位）"
            class="app-input numeric text-center tracking-[0.28em]"
            @input="onPinInput"
          />
        </div>
      </div>

      <fieldset class="mt-5">
        <legend class="field-label">选择头像</legend>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <button
            v-for="avatar in childAvatars"
            :key="avatar.id"
            type="button"
            :aria-pressed="avatar.id === newChildAvatarId"
            :class="[
              'flex min-w-0 flex-col items-center gap-2 rounded-2xl border p-3 text-sm transition-[border-color,background-color,box-shadow,transform] focus-visible:ring-3 focus-visible:ring-brand-100 focus-visible:outline-none active:translate-y-px',
              avatar.id === newChildAvatarId
                ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-200'
                : 'border-slate-200 bg-white hover:border-brand-300',
            ]"
            @click="newChildAvatarIdModel = avatar.id"
          >
            <Avatar
              :avatar-id="avatar.id"
              :options="avatarOptions"
              role="child"
              class="h-14 w-14"
            />
            <span class="w-full truncate text-xs text-slate-600">{{ avatar.label }}</span>
          </button>
        </div>
      </fieldset>
      <button class="button-primary mt-5" :disabled="loading" @click="onCreateChild">
        创建孩子
      </button>
    </div>

    <div class="mt-7">
      <h2 class="text-base font-semibold text-slate-950">现有孩子</h2>
      <p v-if="childUsers.length === 0" class="mt-3 text-sm text-slate-500">
        暂无孩子。
      </p>
      <ul v-else class="mt-4 grid gap-3 sm:grid-cols-2">
        <li
          v-for="child in childUsers"
          :key="child.id"
          class="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div class="flex min-w-0 items-center gap-3">
            <Avatar
              :avatar-id="child.avatar_id"
              :options="avatarOptions"
              role="child"
              class="h-12 w-12 shrink-0"
            />
            <div class="min-w-0 flex-1">
              <template v-if="editingChildId === child.id">
                <label :for="`child-name-${child.id}`" class="sr-only">孩子姓名</label>
                <input
                  :id="`child-name-${child.id}`"
                  v-model="editingChildNameModel"
                  name="child-name"
                  type="text"
                  autocomplete="off"
                  class="app-input"
                />
              </template>
              <template v-else>
                <p class="truncate text-base font-semibold text-slate-950">{{ child.name }}</p>
                <p class="mt-0.5 text-xs text-slate-500">孩子账户 · 可登录查看</p>
              </template>
            </div>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <template v-if="editingChildId === child.id">
              <button
                type="button"
                class="button-primary min-h-9 px-3 py-1.5 text-xs"
                :disabled="loading"
                @click="onUpdateChild"
              >
                保存
              </button>
              <button
                type="button"
                class="button-quiet min-h-9 px-3 py-1.5 text-xs"
                :disabled="loading"
                @click="onCancelEditChild"
              >
                取消
              </button>
            </template>
            <button
              v-else
              type="button"
              class="button-secondary min-h-9 px-3 py-1.5 text-xs"
              :disabled="loading"
              @click="onStartEditChild(child)"
            >
              编辑
            </button>
            <button
              type="button"
              class="button-danger min-h-9 px-3 py-1.5 text-xs"
              :disabled="loading"
              @click="onArchiveChild(child.id)"
            >
              归档
            </button>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import Avatar from "./Avatar.vue";
import type { AppUser } from "../types";
import type { AvatarOption } from "../config";

const childNameModel = defineModel<string>("newChildName", { required: true });
const newChildPinModel = defineModel<string>("newChildPin", { required: true });
const newChildAvatarIdModel = defineModel<string>("newChildAvatarId", {
  required: true,
});
const editingChildNameModel = defineModel<string>("editingChildName", {
  required: true,
});

const props = defineProps<{
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
  onArchiveChild: (id: string) => void;
}>();

const onPinInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  newChildPinModel.value = props.sanitizePin(target?.value ?? "");
};
</script>

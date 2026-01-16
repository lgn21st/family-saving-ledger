<template>
  <img :src="avatarUrl" :alt="avatar.label" :class="resolvedClass" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Role = 'parent' | 'child'

type AvatarOption = {
  id: string
  label: string
  role: Role
  seed: string
}

type Props = {
  avatarId?: string | null
  role: Role
  class?: string
  options: AvatarOption[]
}

const props = defineProps<Props>()

const fallbackAvatar: AvatarOption = {
  id: 'default',
  label: '家庭成员',
  role: 'child',
  seed: 'kid-default'
}

const optionsById = computed(() => new Map(props.options.map((option) => [option.id, option])))

const avatar = computed(() => {
  if (props.avatarId) {
    return optionsById.value.get(props.avatarId) ?? fallbackAvatar
  }

  return props.options.find((option) => option.role === props.role) ?? props.options[0] ?? fallbackAvatar
})

const avatarUrl = computed(() => {
  return `https://api.dicebear.com/9.x/big-smile/svg?seed=${encodeURIComponent(avatar.value.seed)}`
})

const resolvedClass = computed(() => {
  const base = props.class ?? ''
  return `${base} rounded-full border-2 border-white shadow-md`
})
</script>

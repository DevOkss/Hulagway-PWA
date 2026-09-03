<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'

const router = useRouter()
const auth = useAuthStore()
const sync = useSyncStore()

onMounted(() => {
  if (!auth.user) void auth.fetchUser()
})

const logout = async () => {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <section>
    <h1 class="font-heading text-xl font-semibold text-neutral-900 sm:text-2xl">
      Profile & Settings
    </h1>

    <div class="mt-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
      <div class="flex items-center gap-4">
        <span
          class="bg-brand-gradient flex size-14 items-center justify-center rounded-full text-xl font-bold text-white"
        >
          {{ (auth.user?.name ?? 'F')[0] }}
        </span>
        <div class="min-w-0">
          <p class="font-heading truncate font-semibold text-neutral-900">
            {{ auth.user?.name ?? 'Field Personnel' }}
          </p>
          <p class="truncate text-sm text-neutral-400">{{ auth.user?.email }}</p>
          <p
            v-if="auth.user?.role"
            class="mt-0.5 w-fit rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-brand-700"
          >
            {{ auth.user.role.replace('_', ' ') }}
          </p>
        </div>
      </div>
    </div>

    <h2
      class="font-heading mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400"
    >
      Connection
    </h2>
    <div class="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <span class="text-sm text-neutral-600">Status</span>
        <span
          class="inline-flex items-center gap-1.5 text-sm font-semibold"
          :class="sync.online ? 'text-emerald-600' : 'text-amber-500'"
        >
          <span
            class="size-2 rounded-full"
            :class="sync.online ? 'bg-emerald-500' : 'bg-amber-400'"
          />
          {{ sync.online ? 'Online' : 'Offline' }}
        </span>
      </div>
      <RouterLink
        to="/sync-history"
        class="mt-3 block rounded-xl border border-neutral-200 py-2.5 text-center text-sm font-semibold text-brand-600"
      >
        View Sync History
      </RouterLink>
    </div>

    <button
      type="button"
      class="mt-8 w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-500 transition active:scale-[0.99]"
      @click="logout"
    >
      Sign Out
    </button>
  </section>
</template>

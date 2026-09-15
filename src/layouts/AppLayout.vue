<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { useSyncStore } from '@/stores/sync'
import { asset } from '@/utils/asset'

const logoUrl = asset('logo.png')

const route = useRoute()
const sync = useSyncStore()

const navItems = [
  { to: '/', label: 'Home', icon: 'M3 10.5 12 3l9 7.5M5.25 9v10.5h13.5V9' },
  { to: '/surveys', label: 'Surveys', icon: 'M9 12h6m-6 4h6M8 3h8l4 4v14H4V7l4-4Z' },
  {
    to: '/offline-records',
    label: 'Offline',
    icon: 'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75',
  },
  {
    to: '/submitted-records',
    label: 'Submitted',
    icon: 'M9 12l2.25 3 3-3m-6 6h6M7.5 3v2.25m9-2.25V3M3.75 18.75h16.5M5.25 21h13.5',
  },
  { to: '/pending-sync', label: 'Sync', icon: 'M16.5 9a4.5 4.5 0 1 1-9 0m0 6a4.5 4.5 0 1 1 9 0' },
  {
    to: '/profile',
    label: 'Profile',
    icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0',
  },
]
</script>

<template>
  <div class="flex min-h-screen flex-col bg-brand-50">
    <!-- Top bar -->
    <header
      class="bg-brand-gradient sticky top-0 z-20 flex items-center gap-3 px-4 py-3 text-white shadow-brand sm:px-6"
    >
      <img
        :src="logoUrl"
        alt="HULAGWAY"
        class="size-9 rounded-xl bg-white/90 object-contain p-0.5"
      />
      <div class="min-w-0">
        <p class="font-heading truncate text-base leading-tight font-semibold tracking-wide">
          HULAGWAY
        </p>
        <p class="truncate text-xs text-white/80">Field Data Collection</p>
      </div>
      <span
        class="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
        :class="sync.online ? 'bg-white/15' : 'bg-black/20'"
      >
        <span
          class="size-2 rounded-full"
          :class="sync.online ? 'bg-emerald-300' : 'bg-amber-300'"
        />
        {{ sync.online ? 'Online' : 'Offline' }}
      </span>
    </header>

    <!-- Content -->
    <main class="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-24 sm:px-6">
      <RouterView />
    </main>

    <!-- Bottom navigation -->
    <nav
      class="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 backdrop-blur md:hidden"
    >
      <div class="mx-auto grid max-w-3xl grid-cols-6">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors"
          :class="
            route.path === item.to || (item.to !== '/' && route.path.startsWith(item.to))
              ? 'text-brand-600'
              : 'text-neutral-400'
          "
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-6"
          >
            <path :d="item.icon" />
          </svg>
          {{ item.label }}
        </RouterLink>
      </div>
    </nav>
  </div>
</template>

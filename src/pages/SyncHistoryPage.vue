<script setup lang="ts">
import { onMounted } from 'vue'
import { useSyncStore } from '@/stores/sync'

const sync = useSyncStore()

onMounted(() => void sync.loadHistory())
</script>

<template>
  <section>
    <h1 class="font-heading text-xl font-semibold text-neutral-900 sm:text-2xl">Sync History</h1>
    <p class="mt-0.5 text-sm text-neutral-500">Record of past synchronization attempts.</p>

    <div v-if="sync.history.length" class="mt-4 space-y-3 pb-24">
      <div
        v-for="entry in sync.history"
        :key="entry.id"
        class="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-semibold text-neutral-800">
            {{ new Date(entry.synced_at).toLocaleString() }}
          </p>
          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            :class="
              entry.failed.length
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-600'
            "
          >
            {{ entry.failed.length ? 'Partial' : 'Success' }}
          </span>
        </div>
        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          <span class="inline-flex items-center gap-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-3.5"
              aria-hidden="true"
            >
              <path
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            {{ entry.records_received }} sent
          </span>
          <span class="inline-flex items-center gap-1 text-emerald-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-3.5"
              aria-hidden="true"
            >
              <path d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {{ entry.records_accepted }} accepted
          </span>
          <span v-if="entry.duplicates" class="inline-flex items-center gap-1 text-sky-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-3.5"
              aria-hidden="true"
            >
              <path
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
            {{ entry.duplicates }} duplicates skipped
          </span>
          <span v-if="entry.failed.length" class="inline-flex items-center gap-1 text-red-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-3.5"
              aria-hidden="true"
            >
              <path
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            {{ entry.failed.length }} failed
          </span>
        </div>
      </div>
    </div>

    <div
      v-else
      class="mt-8 rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-10 text-center text-sm text-brand-500"
    >
      No sync history yet.
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSurveyStore } from '@/stores/survey'
import { useSyncStore } from '@/stores/sync'
import { asset } from '@/utils/asset'

const bgUrl = asset('bg.png')

const auth = useAuthStore()
const surveyStore = useSurveyStore()
const sync = useSyncStore()

const pendingCount = ref(0)

const refreshPending = async () => {
  pendingCount.value = (await surveyStore.pendingSync()).length
}

onMounted(() => {
  void surveyStore.loadSurveys().then(refreshPending)
  void sync.loadHistory().then(refreshPending)
})

const firstName = computed(() => auth.user?.name?.split(' ')[0] ?? 'Field Personnel')

const quickActions = [
  {
    to: '/surveys',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z',
    label: 'Answer a Survey',
    hint: 'Browse available surveys',
  },
  {
    to: '/offline-records',
    icon: 'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375',
    label: 'Offline Records',
    hint: 'View & export offline',
  },
  {
    to: '/submitted-records',
    icon: 'M9 12l2.25 3 3-3m-6 6h6M7.5 3v2.25m9-2.25V3M3.75 18.75h16.5M5.25 21h13.5',
    label: 'Submitted Online',
    hint: 'View synced by survey',
  },
  {
    to: '/pending-sync',
    icon: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182',
    label: 'Sync Now',
    hint: 'Upload offline responses',
  },
]
</script>

<template>
  <section>
    <h1 class="font-heading text-xl font-semibold text-neutral-900 sm:text-2xl">
      Hi, {{ firstName }}
    </h1>
    <p class="mt-0.5 text-sm text-neutral-500">Here's your field collection overview.</p>

    <div class="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
      <RouterLink
        to="/surveys"
        class="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm transition active:scale-[0.99]"
      >
        <span
          class="inline-flex rounded-lg bg-brand-100 px-2 py-1 text-[11px] font-semibold text-brand-700"
          >Available Surveys</span
        >
        <p class="font-heading mt-3 text-2xl font-bold text-neutral-900">
          {{ surveyStore.surveys.length }}
        </p>
      </RouterLink>

      <RouterLink
        to="/pending-sync"
        class="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm transition active:scale-[0.99]"
      >
        <span
          class="inline-flex rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700"
          >Pending Sync</span
        >
        <p class="font-heading mt-3 text-2xl font-bold text-neutral-900">{{ pendingCount }}</p>
      </RouterLink>
    </div>

    <!-- Quick actions -->
    <h2
      class="font-heading mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400"
    >
      Quick Actions
    </h2>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <RouterLink
        v-for="action in quickActions"
        :key="action.to"
        :to="action.to"
        class="flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm transition active:scale-[0.99]"
      >
        <span
          class="bg-brand-gradient flex size-10 items-center justify-center rounded-xl text-white"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-5"
            aria-hidden="true"
          >
            <path :d="action.icon" />
          </svg>
        </span>
        <div>
          <p class="text-sm font-semibold text-neutral-800">{{ action.label }}</p>
          <p class="text-xs text-neutral-400">{{ action.hint }}</p>
        </div>
      </RouterLink>
    </div>

    <div class="mt-6 rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-6 text-center">
      <img :src="bgUrl" alt="" class="mx-auto w-24 opacity-90 sm:w-32" />
      <p class="mt-3 text-sm font-medium text-brand-700">Mapping Community Realities</p>
      <p class="text-xs text-brand-500">Toward Informed Extension Planning</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { PendingResponse } from '@/types/offline'
import { deleteResponse } from '@/database/indexedDb'
import { useSyncStore } from '@/stores/sync'
import { useSurveyStore } from '@/stores/survey'

const sync = useSyncStore()
const surveyStore = useSurveyStore()

const pending = ref<PendingResponse[]>([])
const drafts = ref<PendingResponse[]>([])

const refresh = async () => {
  pending.value = await surveyStore.pendingSync()
  drafts.value = await surveyStore.drafts()
}

onMounted(refresh)

const syncNow = async () => {
  await sync.sync()
  await refresh()
}

const discard = async (uuid: string) => {
  await deleteResponse(uuid)
  await refresh()
}
</script>

<template>
  <section>
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="font-heading text-xl font-semibold text-neutral-900 sm:text-2xl">
          Pending Synchronization
        </h1>
        <p class="mt-0.5 text-sm text-neutral-500">Responses saved on this device.</p>
      </div>
      <button
        type="button"
        :disabled="sync.syncing || !sync.online || pending.length === 0"
        class="bg-brand-gradient shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-brand disabled:opacity-50"
        @click="syncNow"
      >
        {{ sync.syncing ? 'Syncing…' : 'Sync Now' }}
      </button>
    </div>

    <p
      v-if="!sync.online"
      class="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-600"
    >
      You're offline — responses are stored safely and will sync automatically when connectivity
      returns.
    </p>

    <!-- Pending -->
    <h2
      v-if="pending.length"
      class="font-heading mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400"
    >
      Waiting to sync ({{ pending.length }})
    </h2>
    <div class="space-y-3">
      <div
        v-for="response in pending"
        :key="response.uuid"
        class="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate font-semibold text-neutral-800">
              {{ response.survey_title ?? `Survey #${response.survey_id}` }}
            </p>
            <p class="text-[11px] text-neutral-400">
              Saved {{ new Date(response.created_at).toLocaleString() }}
              <template v-if="response.latitude">
                ·
                <span class="inline-flex items-center gap-0.5">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="size-3 text-emerald-500"
                    aria-hidden="true"
                  >
                    <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                    />
                  </svg>
                  GPS
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="size-3 text-emerald-500"
                    aria-hidden="true"
                  >
                    <path d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
              </template>
            </p>
            <p
              v-if="response.last_sync_error"
              class="mt-1 inline-flex items-center gap-1 truncate text-[11px] text-red-400"
              :title="response.last_sync_error"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="size-3 shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
              {{ response.last_sync_error }} (attempt {{ response.sync_attempts }})
            </p>
          </div>
          <span
            class="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700"
            >Pending</span
          >
        </div>
      </div>
    </div>

    <!-- Drafts -->
    <h2
      v-if="drafts.length"
      class="font-heading mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400"
    >
      Drafts ({{ drafts.length }})
    </h2>
    <div class="space-y-3 pb-24">
      <div
        v-for="draft in drafts"
        :key="draft.uuid"
        class="flex items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-white p-4"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium text-neutral-700">
            {{ draft.survey_title ?? `Survey #${draft.survey_id}` }}
          </p>
          <p class="text-[11px] text-neutral-400">
            Draft · {{ new Date(draft.created_at).toLocaleString() }}
          </p>
        </div>
        <RouterLink
          :to="{ name: 'survey-form', params: { id: draft.survey_id } }"
          class="shrink-0 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-600"
        >
          Resume
        </RouterLink>
        <button
          type="button"
          class="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-400"
          @click="discard(draft.uuid)"
        >
          Delete
        </button>
      </div>
    </div>

    <div
      v-if="!pending.length && !drafts.length"
      class="mt-8 rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-10 text-center text-sm text-brand-500"
    >
      Nothing pending — all responses are synced.
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSurveyStore } from '@/stores/survey'

const router = useRouter()
const surveyStore = useSurveyStore()

onMounted(() => void surveyStore.loadSurveys())

const openForm = (id: number) => router.push({ name: 'survey-form', params: { id } })

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}
</script>

<template>
  <section>
    <h1 class="font-heading text-xl font-semibold text-neutral-900 sm:text-2xl">
      Available Surveys
    </h1>
    <p class="mt-0.5 text-sm text-neutral-500">Surveys assigned for field collection.</p>

    <p
      v-if="surveyStore.loading && !surveyStore.surveys.length"
      class="mt-8 text-center text-sm text-neutral-400"
    >
      Loading surveys…
    </p>

    <div v-else class="mt-4 space-y-3">
      <button
        v-for="survey in surveyStore.surveys"
        :key="survey.id"
        type="button"
        class="w-full rounded-2xl border border-neutral-200/80 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
        @click="openForm(survey.id)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="font-heading truncate font-semibold text-neutral-800">{{ survey.title }}</h2>
            <p class="mt-0.5 line-clamp-2 text-xs text-neutral-400">
              {{ survey.description || 'No description' }}
            </p>
          </div>
          <span
            class="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold"
            :class="
              survey.barangay_name
                ? 'bg-brand-100 text-brand-700'
                : 'bg-neutral-100 text-neutral-500'
            "
          >
            {{ survey.barangay_name ?? 'City-wide' }}
          </span>
        </div>
        <p class="mt-1 text-xs text-neutral-400">
          Posted {{ formatDate((survey as any).published_at ?? (survey as any).created_at) }}<template v-if="survey.barangay_name"> · {{ survey.barangay_name }}</template>
        </p>
        <p class="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600">
          {{ survey.questions.length }} questions · Tap to answer
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-3"
            aria-hidden="true"
          >
            <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </p>
      </button>

      <div
        v-if="!surveyStore.surveys.length"
        class="rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-10 text-center text-sm text-brand-500"
      >
        {{ surveyStore.error || 'No surveys available right now.' }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import api from '@/services/api'
import { useSyncStore } from '@/stores/sync'
import FullScreenLoader from '@/components/FullScreenLoader.vue'

const sync = useSyncStore()

interface SurveyGroup {
  survey: {
    id: number
    title: string
    description: string | null
    type: string
    barangay_name: string | null
    include_barangay: boolean
    published_at: string | null
    created_at: string | null
    responses_count: number
    questions: Array<{ id: number; question_text: string; type: string; code: string | null; data_scope: string | null }>
  }
  responses: Array<{
    id: number
    uuid: string
    survey_id: number
    barangay: string | null
    barangay_id: number | null
    purok: string | null
    household: {
      id: number
      head_name: string
      purok: string
      contact_no: string | null
      live_in_status: string | null
      live_in_years: number | null
      live_in_reason: string | null
      members: Array<{
        id: number
        name: string
        age: number | null
        sex: string | null
        civil_status: string | null
        relationship: string | null
        is_head: boolean
        is_pwd: string | null
        is_mentally_challenged: string | null
        is_osy: boolean | null
        osy_last_grade: string | null
        bedridden_status: string | null
        is_pregnant: boolean
        is_senior: boolean
        lcr_registered: string | null
        lcr_reason: string | null
        katungdanan_status: string | null
        katungdanan_position: string | null
      }>
    } | null
    answers: Array<{ question_id: number; question_text: string; question_code: string | null; answer: string | null; household_member_id: number | null }>
    submitted_at: string | null
    created_at: string | null
    source: string
  }>
  total_responses: number
}

const grouped = ref<SurveyGroup[]>([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const expandedSurveyId = ref<number | null>(null)
const selectedResponse = ref<SurveyGroup['responses'][number] | null>(null)
const showView = ref(false)

const totalResponses = computed(() => grouped.value.reduce((sum, g) => sum + g.total_responses, 0))

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return grouped.value
  return grouped.value.filter((g) => {
    const title = g.survey.title.toLowerCase()
    const desc = (g.survey.description ?? '').toLowerCase()
    const barangay = (g.survey.barangay_name ?? '').toLowerCase()
    return title.includes(q) || desc.includes(q) || barangay.includes(q)
  })
})

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

const fetchGrouped = async () => {
  if (!navigator.onLine) {
    error.value = 'You are offline — submitted records require internet to view.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/mobile/submitted-records')
    grouped.value = data.grouped ?? []
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? 'Failed to load submitted records.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchGrouped)

const toggleSurvey = (id: number) => {
  expandedSurveyId.value = expandedSurveyId.value === id ? null : id
}

const viewResponse = (r: SurveyGroup['responses'][number]) => {
  selectedResponse.value = r
  showView.value = true
}

const closeView = () => {
  showView.value = false
  selectedResponse.value = null
}

const getSurveyForResponse = (surveyId: number) => grouped.value.find((g) => g.survey.id === surveyId)?.survey

const getQuestionText = (surveyId: number, qId: number) => {
  const s = getSurveyForResponse(surveyId)
  const q = s?.questions.find((x) => x.id === qId)
  return q?.question_text ?? `Q${qId}`
}

const formatAnswer = (ans: string | null | undefined) => {
  if (ans == null) return ''
  return String(ans)
}

// ---- Export helpers for submitted (online) records ----
const exportExcelSingle = async (r: SurveyGroup['responses'][number]) => {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const s = getSurveyForResponse(r.survey_id)
  const householdData = [
    ['Field', 'Value'],
    ['Survey', s?.title ?? `Survey #${r.survey_id}`],
    ['Barangay', r.barangay ?? ''],
    ['Purok', r.purok ?? ''],
    ['Household Head', r.household?.head_name ?? ''],
    ['Contact', r.household?.contact_no ?? ''],
    ['Live-in', r.household?.live_in_status ?? ''],
    ['Live-in Years', r.household?.live_in_years ?? ''],
    ['Live-in Reason', r.household?.live_in_reason ?? ''],
    ['Submitted', r.submitted_at ?? r.created_at ?? ''],
    ['UUID', r.uuid],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(householdData)
  ws1['!cols'] = [{ wch: 20 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Household')

  if (r.household?.members?.length) {
    const header = ['#', 'Name', 'Age', 'Sex', 'Civil Status', 'Relationship', 'PWD', 'Mentally', 'OSY', 'Last Grade', 'Bedridden', 'Pregnant', 'Senior', 'LCR', 'LCR Reason', 'Katungdanan', 'Position']
    const rows = r.household.members.map((m: any, idx: number) => [
      idx + 1,
      m.name ?? '',
      m.age ?? '',
      m.sex ?? '',
      m.civil_status ?? '',
      m.relationship ?? '',
      m.is_pwd ?? 'No',
      m.is_mentally_challenged ?? 'No',
      m.is_osy == null ? '' : m.is_osy ? 'Yes' : 'No',
      m.osy_last_grade ?? '',
      m.bedridden_status ?? 'No',
      m.is_pregnant ? 'Yes' : 'No',
      m.is_senior ? 'Yes' : 'No',
      m.lcr_registered ?? 'No',
      m.lcr_reason ?? '',
      m.katungdanan_status ?? 'No',
      m.katungdanan_position ?? '',
    ])
    const ws2 = XLSX.utils.aoa_to_sheet([header, ...rows])
    ws2['!cols'] = header.map(() => ({ wch: 14 }))
    XLSX.utils.book_append_sheet(wb, ws2, 'Members')
  }

  const answerHeader = ['Question', 'Answer']
  const answerRows = r.answers.map((a) => [a.question_text, a.answer ?? ''])
  const ws3 = XLSX.utils.aoa_to_sheet([answerHeader, ...answerRows])
  ws3['!cols'] = [{ wch: 50 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, ws3, 'Answers')

  const fileName = `submitted-${r.survey_id}-${r.purok ?? 'record'}-${new Date().toISOString().slice(0,10)}.xlsx`
  XLSX.writeFile(wb, fileName)
}

const exportPdfSingle = async (r: SurveyGroup['responses'][number]) => {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const s = getSurveyForResponse(r.survey_id)
  let y = 10
  const line = (text: string) => {
    if (y > 280) { doc.addPage(); y = 10 }
    doc.text(text, 10, y)
    y += 6
  }
  doc.setFontSize(14)
  line(`Submitted Record - ${s?.title ?? `Survey #${r.survey_id}`}`)
  doc.setFontSize(9)
  line(`UUID: ${r.uuid}`)
  line(`Barangay: ${r.barangay ?? '-'}  Purok: ${r.purok ?? '-'}  Submitted: ${formatDateTime(r.submitted_at ?? r.created_at)}`)
  y += 2
  doc.setFontSize(11)
  line('Household')
  doc.setFontSize(9)
  line(`Head: ${r.household?.head_name ?? '-'}  Contact: ${r.household?.contact_no ?? '-'}`)
  line(`Live-in: ${r.household?.live_in_status ?? 'No'}  Years: ${r.household?.live_in_years ?? '-'}  Reason: ${r.household?.live_in_reason ?? '-'}`)
  y += 2
  doc.setFontSize(11)
  line(`Members (${r.household?.members.length ?? 0})`)
  doc.setFontSize(8)
  for (let i = 0; i < (r.household?.members.length ?? 0); i++) {
    const m: any = r.household!.members[i]
    line(`${i + 1}. ${m.name ?? '-'}  Age:${m.age ?? '-'}  Sex:${m.sex ?? '-'}  PWD:${m.is_pwd ?? 'No'}  Mentally:${m.is_mentally_challenged ?? 'No'}  Bedridden:${m.bedridden_status ?? 'No'}  LCR:${m.lcr_registered ?? 'No'}  Katungdanan:${m.katungdanan_status ?? 'No'}`)
  }
  y += 2
  doc.setFontSize(11)
  line('Answers')
  doc.setFontSize(8)
  for (const ans of r.answers) {
    const txt = `${ans.question_text}: ${ans.answer ?? ''}`
    const lines = doc.splitTextToSize(txt, 190)
    for (const l of lines) line(l)
  }
  doc.save(`submitted-${r.survey_id}-${r.purok ?? 'record'}-${new Date().toISOString().slice(0,10)}.pdf`)
}

const exportExcelGroup = async (group: SurveyGroup) => {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const header = ['UUID', 'Barangay', 'Purok', 'Head', 'Contact', 'Members', 'Submitted']
  // Add question columns
  const qHeaders = group.survey.questions.map((q) => q.question_text)
  const fullHeader = [...header, ...qHeaders]
  const rows = group.responses.map((r) => {
    const base = [r.uuid, r.barangay ?? '', r.purok ?? '', r.household?.head_name ?? '', r.household?.contact_no ?? '', r.household?.members.length ?? 0, formatDateTime(r.submitted_at ?? r.created_at)]
    const ansMap = new Map(r.answers.map((a) => [a.question_id, a.answer ?? '']))
    const qAns = group.survey.questions.map((q) => ansMap.get(q.id) ?? '')
    return [...base, ...qAns]
  })
  const ws = XLSX.utils.aoa_to_sheet([fullHeader, ...rows])
  ws['!cols'] = fullHeader.map(() => ({ wch: 16 }))
  XLSX.utils.book_append_sheet(wb, ws, 'Responses')
  const fileName = `submitted-${group.survey.title.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().slice(0,10)}.xlsx`
  XLSX.writeFile(wb, fileName)
}

const exportPdfGroup = async (group: SurveyGroup) => {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  let y = 10
  doc.setFontSize(14)
  doc.text(`Submitted Records - ${group.survey.title}`, 10, y); y += 8
  doc.setFontSize(9)
  for (let idx = 0; idx < group.responses.length; idx++) {
    const r = group.responses[idx]!
    if (y > 260) { doc.addPage(); y = 10 }
    doc.setFontSize(10)
    doc.text(`${idx + 1}. ${r.household?.head_name ?? '-'} (${r.purok ?? '-'}) - ${r.household?.members.length ?? 0} members - ${formatDateTime(r.submitted_at ?? r.created_at)}`, 10, y); y += 6
    doc.setFontSize(8)
    doc.text(`   Barangay: ${r.barangay ?? '-'}  UUID: ${r.uuid.slice(0,8)}...`, 10, y); y += 4
  }
  doc.save(`submitted-${group.survey.id}-${new Date().toISOString().slice(0,10)}.pdf`)
}

const printResponse = (r: SurveyGroup['responses'][number]) => {
  selectedResponse.value = r
  showView.value = true
  setTimeout(() => window.print(), 300)
}
</script>

<template>
  <section>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="font-heading text-xl font-semibold text-neutral-900 sm:text-2xl">Submitted Records</h1>
        <p class="mt-0.5 text-sm text-neutral-500">
          All responses synced online, grouped by survey.
          <span class="font-medium text-brand-600">{{ totalResponses }} total</span> across {{ grouped.length }} surveys.
        </p>
      </div>
      <div class="flex gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" :class="sync.online ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">
          <span class="size-2 rounded-full" :class="sync.online ? 'bg-emerald-400' : 'bg-amber-400'" />
          {{ sync.online ? 'Online' : 'Offline' }}
        </span>
        <button type="button" class="cursor-pointer rounded-xl border bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50" @click="fetchGrouped" :disabled="loading">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <p v-if="error" class="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-medium text-red-600">{{ error }}</p>
    <p v-if="!sync.online" class="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-600">
      You are offline — connect to internet to view submitted records. Offline records are available in <router-link to="/offline-records" class="underline">Offline Records</router-link>.
    </p>

    <div class="mt-4 flex gap-2">
      <input v-model="search" placeholder="Search by survey title, barangay..." class="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500" />
      <span class="shrink-0 rounded-xl bg-neutral-100 px-3 py-2.5 text-xs font-medium text-neutral-500">{{ filtered.length }} / {{ grouped.length }}</span>
    </div>

    <FullScreenLoader v-if="loading && !grouped.length" message="Loading submitted records…" />

    <div v-else-if="!filtered.length" class="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-400">
      No submitted records found.
    </div>

    <div v-else class="mt-4 space-y-4 pb-24">
      <div v-for="group in filtered" :key="group.survey.id" class="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
        <!-- Survey header -->
        <button type="button" class="flex w-full cursor-pointer items-start justify-between gap-3 p-4 text-left hover:bg-neutral-50" @click="toggleSurvey(group.survey.id)">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="font-heading truncate font-semibold text-neutral-800">{{ group.survey.title }}</h2>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" :class="group.survey.type === 'household' ? 'bg-brand-100 text-brand-700' : 'bg-violet-100 text-violet-700'">{{ group.survey.type }}</span>
              <span class="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">{{ group.total_responses }} responses</span>
            </div>
            <p class="mt-0.5 line-clamp-1 text-xs text-neutral-400">{{ group.survey.description || 'No description' }}</p>
            <p class="mt-1 text-xs text-neutral-500">
              <span class="font-medium">{{ group.survey.barangay_name ?? 'All Barangays' }}</span>
              · Posted {{ formatDate(group.survey.published_at ?? group.survey.created_at) }}
            </p>
          </div>
          <span class="shrink-0 rounded-lg border bg-white px-2 py-1 text-xs font-medium" :class="expandedSurveyId === group.survey.id ? 'bg-brand-50 text-brand-700' : 'text-neutral-500'">
            {{ expandedSurveyId === group.survey.id ? 'Hide' : `View ${group.responses.length}` }}
          </span>
        </button>
        <div v-if="expandedSurveyId === group.survey.id" class="flex flex-wrap gap-1.5 border-t bg-white px-4 py-2">
          <button type="button" class="cursor-pointer rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50" @click="exportExcelGroup(group)">Excel All</button>
          <button type="button" class="cursor-pointer rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50" @click="exportPdfGroup(group)">PDF All</button>
        </div>

        <!-- Responses list (expanded) -->
        <div v-if="expandedSurveyId === group.survey.id" class="border-t border-neutral-100 bg-neutral-50/50">
          <div v-if="!group.responses.length" class="p-4 text-center text-xs text-neutral-400">No responses yet for this survey.</div>
          <div v-else class="divide-y divide-neutral-100">
            <div v-for="r in group.responses" :key="r.id" class="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-neutral-800">
                  {{ r.household?.head_name ?? 'No head' }}
                  <span class="font-normal text-neutral-500">· Purok {{ r.purok ?? '-' }} · {{ r.barangay ?? '-' }}</span>
                </p>
                <p class="text-xs text-neutral-400">
                  {{ r.household?.members.length ?? 0 }} members
                  <template v-if="r.submitted_at"> · Submitted {{ formatDateTime(r.submitted_at) }}</template>
                  <template v-else> · Created {{ formatDateTime(r.created_at) }}</template>
                  · <span class="capitalize">{{ r.source }}</span>
                </p>
              </div>
              <div class="flex shrink-0 flex-wrap gap-1.5">
                <button type="button" class="cursor-pointer rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100" @click="viewResponse(r)">View</button>
                <button type="button" class="cursor-pointer rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50" @click="printResponse(r)">Print</button>
                <button type="button" class="cursor-pointer rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50" @click="exportExcelSingle(r)">Excel</button>
                <button type="button" class="cursor-pointer rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50" @click="exportPdfSingle(r)">PDF</button>
              </div>
            </div>
          </div>
          <div v-if="group.total_responses > group.responses.length" class="border-t bg-white p-3 text-center text-xs text-neutral-400">
            Showing {{ group.responses.length }} of {{ group.total_responses }} responses (most recent 50). Use backend reports for full export.
          </div>
        </div>
      </div>
    </div>

    <!-- View modal -->
    <div v-if="showView && selectedResponse" class="fixed inset-0 z-30 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-6" @click.self="closeView">
      <div class="my-8 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-heading text-lg font-semibold">{{ getSurveyForResponse(selectedResponse.survey_id)?.title ?? `Response #${selectedResponse.id}` }}</h2>
            <p class="text-xs text-neutral-500">{{ selectedResponse.uuid }} · {{ formatDateTime(selectedResponse.submitted_at ?? selectedResponse.created_at) }}</p>
          </div>
          <button type="button" class="cursor-pointer rounded-lg border px-3 py-1.5 text-xs hover:bg-neutral-50" @click="closeView">Close</button>
        </div>
        <div class="mt-4 space-y-4 text-sm">
          <div class="rounded-xl border bg-neutral-50 p-3">
            <p class="text-xs font-semibold text-neutral-500">Household</p>
            <p><span class="font-medium">Head:</span> {{ selectedResponse.household?.head_name ?? '-' }}</p>
            <p><span class="font-medium">Barangay:</span> {{ selectedResponse.barangay ?? '-' }} · <span class="font-medium">Purok:</span> {{ selectedResponse.purok ?? '-' }}</p>
            <p><span class="font-medium">Contact:</span> {{ selectedResponse.household?.contact_no ?? '-' }}</p>
            <p><span class="font-medium">Live-in:</span> {{ selectedResponse.household?.live_in_status ?? 'No' }}</p>
          </div>
          <div v-if="selectedResponse.household?.members?.length">
            <p class="text-xs font-semibold text-neutral-500">Members ({{ selectedResponse.household.members.length }})</p>
            <div v-for="(m, idx) in selectedResponse.household.members" :key="(m as any).id ?? idx" class="mt-2 rounded-xl border bg-white p-3">
              <p class="font-medium">{{ idx+1 }}. {{ (m as any).name }} <span class="text-xs text-neutral-400">{{ (m as any).age }}y {{ (m as any).sex }} {{ (m as any).civil_status }}</span></p>
              <p class="text-xs text-neutral-600">Rel: {{ (m as any).relationship }} · PWD: {{ (m as any).is_pwd ?? 'No' }} · Mentally: {{ (m as any).is_mentally_challenged ?? 'No' }} · Bedridden: {{ (m as any).bedridden_status ?? 'No' }} · Pregnant: {{ (m as any).is_pregnant ? 'Yes' : 'No' }}</p>
              <p class="text-xs">LCR: {{ (m as any).lcr_registered ?? 'No' }} <template v-if="(m as any).lcr_registered==='No' && (m as any).lcr_reason">— {{ (m as any).lcr_reason }}</template> · Katungdanan: {{ (m as any).katungdanan_status ?? 'No' }}<template v-if="(m as any).katungdanan_status==='Yes'"> — {{ (m as any).katungdanan_position }}</template></p>
            </div>
          </div>
          <div>
            <p class="text-xs font-semibold text-neutral-500">Answers</p>
            <div v-for="ans in selectedResponse.answers" :key="ans.question_id" class="mt-1 flex gap-2 border-b border-dashed py-1 text-xs">
              <span class="min-w-0 flex-1 font-medium">{{ ans.question_text }}</span>
              <span class="max-w-[50%] truncate text-neutral-600">{{ ans.answer ?? '' }}</span>
            </div>
            <p v-if="!selectedResponse.answers.length" class="mt-1 text-xs text-neutral-400">No answers recorded.</p>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" class="cursor-pointer rounded-xl border bg-white px-4 py-2 text-sm hover:bg-neutral-50" @click="printResponse(selectedResponse!)">Print</button>
          <button type="button" class="cursor-pointer rounded-xl border bg-white px-4 py-2 text-sm hover:bg-neutral-50" @click="exportExcelSingle(selectedResponse!)">Excel</button>
          <button type="button" class="cursor-pointer rounded-xl border bg-white px-4 py-2 text-sm hover:bg-neutral-50" @click="exportPdfSingle(selectedResponse!)">PDF</button>
          <button type="button" class="cursor-pointer rounded-xl border bg-white px-4 py-2 text-sm hover:bg-neutral-50" @click="closeView">Close</button>
        </div>
      </div>
    </div>
  </section>
</template>

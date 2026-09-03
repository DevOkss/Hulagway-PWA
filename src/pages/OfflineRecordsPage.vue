<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import type { PendingResponse, CachedSurvey } from '@/types/offline'
import { getResponses, deleteResponse } from '@/database/indexedDb'
import { useSurveyStore } from '@/stores/survey'

const surveyStore = useSurveyStore()

const records = ref<PendingResponse[]>([])
const surveysMap = ref<Record<number, CachedSurvey>>({})
const search = ref('')
const selected = ref<PendingResponse | null>(null)
const showView = ref(false)

const refresh = async () => {
  const all = await getResponses()
  // Sort by created_at desc
  records.value = all.sort((a, b) => b.created_at - a.created_at)
  // Load survey definitions for question texts
  try {
    await surveyStore.loadSurveys()
    const map: Record<number, CachedSurvey> = {}
    for (const s of surveyStore.surveys) map[s.id] = s
    // Also try to load any missing survey definitions from IndexedDB directly for offline
    for (const r of records.value) {
      if (!map[r.survey_id]) {
        const s = await surveyStore.getSurvey(r.survey_id)
        if (s) map[r.survey_id] = s
      }
    }
    surveysMap.value = map
  } catch {}
}

onMounted(refresh)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return records.value
  return records.value.filter((r) => {
    const title = (r.survey_title ?? `Survey #${r.survey_id}`).toLowerCase()
    const head = (r.household?.head_name ?? '').toLowerCase()
    const purok = (r.purok ?? '').toLowerCase()
    const barangay = String(r.barangay_id ?? '').toLowerCase()
    return title.includes(q) || head.includes(q) || purok.includes(q) || barangay.includes(q)
  })
})

const getSurvey = (id: number) => surveysMap.value[id]

const viewRecord = (r: PendingResponse) => {
  selected.value = r
  showView.value = true
}

const closeView = () => {
  showView.value = false
  selected.value = null
}

const getQuestionText = (surveyId: number, qId: number) => {
  const s = getSurvey(surveyId)
  const q = s?.questions.find((x) => x.id === qId)
  return q?.question_text ?? `Q${qId}`
}

const formatAnswer = (ans: string | string[] | undefined) => {
  if (ans == null) return ''
  if (Array.isArray(ans)) return ans.join(', ')
  return String(ans)
}

// ---- Print ----
const printRecord = (r: PendingResponse) => {
  selected.value = r
  showView.value = true
  setTimeout(() => window.print(), 300)
}

const printAll = () => {
  window.print()
}

// ---- Excel Export (SheetJS) ----
const exportExcelSingle = async (r: PendingResponse) => {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // Sheet 1: Household
  const householdData = [
    ['Field', 'Value'],
    ['Survey', r.survey_title ?? `Survey #${r.survey_id}`],
    ['Survey ID', r.survey_id],
    ['Barangay ID', r.barangay_id ?? ''],
    ['Purok', r.purok ?? ''],
    ['Household Head', r.household?.head_name ?? ''],
    ['Contact No.', r.household?.contact_no ?? ''],
    ['Address', r.household?.address ?? ''],
    ['Live-in Status', r.household?.live_in_status ?? ''],
    ['Live-in Years', r.household?.live_in_years ?? ''],
    ['Live-in Reason', r.household?.live_in_reason ?? ''],
    ['Status', r.status],
    ['Created', new Date(r.created_at).toLocaleString()],
    ['Submitted', r.submitted_at ?? ''],
    ['UUID', r.uuid],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(householdData)
  ws1['!cols'] = [{ wch: 20 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Household')

  // Sheet 2: Members
  if (r.household_members?.length) {
    const memberHeader = ['#', 'Name', 'Age', 'Sex', 'Civil Status', 'Relationship', 'Is Head', 'PWD', 'Mentally Challenged', 'OSY', 'Last Grade', 'Bedridden', 'Pregnant', 'Senior', 'LCR Registered', 'LCR Reason', 'Katungdanan', 'Position']
    const memberRows = r.household_members.map((m, idx) => [
      idx + 1,
      m.name ?? '',
      m.age ?? '',
      m.sex ?? '',
      m.civil_status ?? '',
      m.relationship ?? '',
      m.is_head ? 'Yes' : 'No',
      (m as any).is_pwd ?? '',
      (m as any).is_mentally_challenged ?? '',
      m.is_osy == null ? '' : m.is_osy ? 'Yes' : 'No',
      (m as any).osy_last_grade ?? '',
      (m as any).bedridden_status ?? '',
      (m as any).is_pregnant ? 'Yes' : 'No',
      (m as any).is_senior ? 'Yes' : 'No',
      (m as any).lcr_registered ?? 'No',
      (m as any).lcr_reason ?? '',
      (m as any).katungdanan_status ?? 'No',
      (m as any).katungdanan_position ?? '',
    ])
    const ws2 = XLSX.utils.aoa_to_sheet([memberHeader, ...memberRows])
    ws2['!cols'] = memberHeader.map(() => ({ wch: 15 }))
    XLSX.utils.book_append_sheet(wb, ws2, 'Members')
  }

  // Sheet 3: Answers
  const s = getSurvey(r.survey_id)
  const answerHeader = ['Question ID', 'Question Text', 'Answer']
  const answerRows: any[][] = []
  for (const [qid, ans] of Object.entries(r.answers ?? {})) {
    const qidNum = Number(qid)
    answerRows.push([qid, getQuestionText(r.survey_id, qidNum), formatAnswer(ans as any)])
  }
  // Include member_answers if any
  if (r.member_answers) {
    for (const [qid, members] of Object.entries(r.member_answers)) {
      const qidNum = Number(qid)
      const qText = getQuestionText(r.survey_id, qidNum)
      for (const [mName, val] of Object.entries(members as Record<string, string>)) {
        answerRows.push([`${qid} (${mName})`, qText, val])
      }
    }
  }
  const ws3 = XLSX.utils.aoa_to_sheet([answerHeader, ...answerRows])
  ws3['!cols'] = [{ wch: 12 }, { wch: 50 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, ws3, 'Answers')

  const fileName = `offline-${r.survey_title?.replace(/[^a-z0-9]/gi, '_') ?? r.survey_id}-${r.purok ?? 'record'}-${new Date().toISOString().slice(0,10)}.xlsx`
  XLSX.writeFile(wb, fileName)
}

const exportExcelAll = async () => {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // Summary sheet: one row per record
  const header = ['UUID', 'Survey', 'Survey ID', 'Barangay ID', 'Purok', 'Head', 'Contact', 'Members', 'Status', 'Created', 'Submitted']
  const rows = filtered.value.map((r) => [
    r.uuid,
    r.survey_title ?? `Survey #${r.survey_id}`,
    r.survey_id,
    r.barangay_id ?? '',
    r.purok ?? '',
    r.household?.head_name ?? '',
    r.household?.contact_no ?? '',
    r.household_members.length,
    r.status,
    new Date(r.created_at).toLocaleString(),
    r.submitted_at ?? '',
  ])
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  ws['!cols'] = header.map(() => ({ wch: 16 }))
  XLSX.utils.book_append_sheet(wb, ws, 'Offline Records')

  // Members sheet: all members across all records
  const mHeader = ['Record UUID', 'Survey', 'Member #', 'Name', 'Age', 'Sex', 'Civil Status', 'Relationship', 'PWD', 'Mentally', 'OSY', 'Bedridden', 'Pregnant', 'LCR', 'LCR Reason', 'Katungdanan', 'Position']
  const mRows: any[][] = []
  for (const r of filtered.value) {
    r.household_members.forEach((m, idx) => {
      mRows.push([
        r.uuid,
        r.survey_title ?? r.survey_id,
        idx + 1,
        m.name,
        m.age ?? '',
        m.sex ?? '',
        m.civil_status ?? '',
        m.relationship ?? '',
        (m as any).is_pwd ?? '',
        (m as any).is_mentally_challenged ?? '',
        m.is_osy == null ? '' : m.is_osy ? 'Yes' : 'No',
        (m as any).bedridden_status ?? '',
        (m as any).is_pregnant ? 'Yes' : 'No',
        (m as any).lcr_registered ?? 'No',
        (m as any).lcr_reason ?? '',
        (m as any).katungdanan_status ?? 'No',
        (m as any).katungdanan_position ?? '',
      ])
    })
  }
  if (mRows.length) {
    const ws2 = XLSX.utils.aoa_to_sheet([mHeader, ...mRows])
    ws2['!cols'] = mHeader.map(() => ({ wch: 14 }))
    XLSX.utils.book_append_sheet(wb, ws2, 'All Members')
  }

  const fileName = `offline-records-all-${new Date().toISOString().slice(0,10)}.xlsx`
  XLSX.writeFile(wb, fileName)
}

// ---- PDF Export (jsPDF) ----
const exportPdfSingle = async (r: PendingResponse) => {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const s = getSurvey(r.survey_id)
  let y = 10
  const line = (text: string, opts: any = {}) => {
    if (y > 280) { doc.addPage(); y = 10 }
    doc.text(text, 10, y, opts)
    y += 6
  }
  doc.setFontSize(14)
  line(`Offline Record - ${r.survey_title ?? `Survey #${r.survey_id}`}`)
  doc.setFontSize(9)
  line(`UUID: ${r.uuid}`)
  line(`Created: ${new Date(r.created_at).toLocaleString()}  Status: ${r.status}`)
  line(`Barangay ID: ${r.barangay_id ?? '-'}  Purok: ${r.purok ?? '-'}`)
  y += 2
  doc.setFontSize(11)
  line('Household')
  doc.setFontSize(9)
  line(`Head: ${r.household?.head_name ?? '-'}  Contact: ${r.household?.contact_no ?? '-'}`)
  line(`Address: ${r.household?.address ?? '-'}`)
  line(`Live-in: ${r.household?.live_in_status ?? 'No'}  Years: ${r.household?.live_in_years ?? '-'}  Reason: ${r.household?.live_in_reason ?? '-'}`)
  y += 2
  doc.setFontSize(11)
  line(`Members (${r.household_members.length})`)
  doc.setFontSize(8)
  for (let i = 0; i < r.household_members.length; i++) {
    const m: any = r.household_members[i]
    line(`${i + 1}. ${m.name ?? '-'}  Age:${m.age ?? '-'}  Sex:${m.sex ?? '-'}  Civil:${m.civil_status ?? '-'}  Rel:${m.relationship ?? '-'}  PWD:${m.is_pwd ?? 'No'}  Mentally:${m.is_mentally_challenged ?? 'No'}  Bedridden:${m.bedridden_status ?? 'No'}  Pregnant:${m.is_pregnant ? 'Yes' : 'No'}  LCR:${m.lcr_registered ?? 'No'}${m.lcr_registered==='No' && m.lcr_reason ? ` (${m.lcr_reason})` : ''}  Katungdanan:${m.katungdanan_status ?? 'No'}${m.katungdanan_status==='Yes' && m.katungdanan_position ? ` (${m.katungdanan_position})` : ''}`)
  }
  y += 2
  doc.setFontSize(11)
  line('Answers')
  doc.setFontSize(8)
  for (const [qid, ans] of Object.entries(r.answers ?? {})) {
    const qText = getQuestionText(r.survey_id, Number(qid))
    const val = formatAnswer(ans as any)
    const txt = `${qText}: ${val}`
    // Split long text
    const lines = doc.splitTextToSize(txt, 190)
    for (const l of lines) { line(l) }
  }
  if (r.member_answers) {
    for (const [qid, members] of Object.entries(r.member_answers)) {
      const qText = getQuestionText(r.survey_id, Number(qid))
      for (const [mName, val] of Object.entries(members as any)) {
        line(`${qText} [${mName}]: ${val}`)
      }
    }
  }
  doc.save(`offline-${r.survey_id}-${r.purok ?? 'record'}-${new Date().toISOString().slice(0,10)}.pdf`)
}

const exportPdfAll = async () => {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  let y = 10
  doc.setFontSize(14)
  doc.text('Offline Records - All', 10, y); y += 8
  doc.setFontSize(9)
  for (let idx = 0; idx < filtered.value.length; idx++) {
    const r = filtered.value[idx]!
    if (!r) continue
    if (y > 260) { doc.addPage(); y = 10 }
    doc.setFontSize(10)
    doc.text(`${idx + 1}. ${r.survey_title ?? `Survey #${r.survey_id}`} - ${r.household?.head_name ?? '-'} (${r.purok ?? '-'}) - ${r.household_members.length} members - ${new Date(r.created_at).toLocaleDateString()}`, 10, y); y += 6
    doc.setFontSize(8)
    doc.text(`   Barangay: ${r.barangay_id ?? '-'}  Status: ${r.status}  UUID: ${r.uuid.slice(0,8)}...`, 10, y); y += 4
  }
  doc.save(`offline-records-all-${new Date().toISOString().slice(0,10)}.pdf`)
}

const removeRecord = async (uuid: string) => {
  if (!confirm('Delete this offline record? This cannot be undone.')) return
  await deleteResponse(uuid)
  await refresh()
}
</script>

<template>
  <section>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="font-heading text-xl font-semibold text-neutral-900 sm:text-2xl">Offline Records</h1>
        <p class="mt-0.5 text-sm text-neutral-500">View, print and export records saved offline on this device.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="cursor-pointer rounded-xl border bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50" @click="printAll">Print All</button>
        <button type="button" class="cursor-pointer rounded-xl border bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50" @click="exportExcelAll">Excel All</button>
        <button type="button" class="cursor-pointer rounded-xl bg-brand-gradient px-3 py-2 text-xs font-semibold text-white shadow-brand" @click="exportPdfAll">PDF All</button>
      </div>
    </div>

    <div class="mt-4 flex gap-2">
      <input v-model="search" placeholder="Search by survey, head, purok..." class="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500" />
      <span class="shrink-0 rounded-xl bg-neutral-100 px-3 py-2.5 text-xs font-medium text-neutral-500">{{ filtered.length }} / {{ records.length }}</span>
    </div>

    <div v-if="!filtered.length" class="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-400">
      No offline records found on this device.
    </div>

    <div v-else class="mt-4 space-y-3 pb-24">
      <div v-for="r in filtered" :key="r.uuid" class="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="font-heading truncate font-semibold text-neutral-800">{{ r.survey_title ?? `Survey #${r.survey_id}` }}</h2>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" :class="r.status === 'pending_sync' ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-600'">{{ r.status }}</span>
              <span class="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">{{ r.household_members.length }} members</span>
            </div>
            <p class="mt-1 text-xs text-neutral-500">
              {{ r.household?.head_name ?? 'No head' }} · Purok {{ r.purok ?? '-' }} · Barangay {{ r.barangay_id ?? '-' }}
            </p>
            <p class="text-[11px] text-neutral-400">
              Created {{ new Date(r.created_at).toLocaleString() }}
              <template v-if="r.submitted_at"> · Submitted {{ new Date(r.submitted_at).toLocaleString() }}</template>
            </p>
            <p v-if="r.last_sync_error" class="mt-1 text-[11px] text-red-400">Last error: {{ r.last_sync_error }} (attempt {{ r.sync_attempts }})</p>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-1.5">
          <button type="button" class="cursor-pointer rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100" @click="viewRecord(r)">View</button>
          <button type="button" class="cursor-pointer rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50" @click="printRecord(r)">Print</button>
          <button type="button" class="cursor-pointer rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50" @click="exportExcelSingle(r)">Excel</button>
          <button type="button" class="cursor-pointer rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50" @click="exportPdfSingle(r)">PDF</button>
          <button type="button" class="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-50" @click="removeRecord(r.uuid)">Delete</button>
        </div>
      </div>
    </div>

    <!-- View modal -->
    <div v-if="showView && selected" class="fixed inset-0 z-30 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-6" @click.self="closeView">
      <div class="my-8 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl print:my-0 print:w-full print:max-w-none print:rounded-none print:shadow-none">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-heading text-lg font-semibold">{{ selected.survey_title ?? `Survey #${selected.survey_id}` }}</h2>
            <p class="text-xs text-neutral-500">{{ selected.uuid }} · {{ new Date(selected.created_at).toLocaleString() }}</p>
          </div>
          <button type="button" class="cursor-pointer rounded-lg border px-3 py-1.5 text-xs hover:bg-neutral-50 print:hidden" @click="closeView">Close</button>
        </div>
        <div class="mt-4 space-y-4 text-sm">
          <div class="rounded-xl border bg-neutral-50 p-3">
            <p class="text-xs font-semibold text-neutral-500">Household</p>
            <p><span class="font-medium">Head:</span> {{ selected.household?.head_name ?? '-' }}</p>
            <p><span class="font-medium">Barangay:</span> {{ selected.barangay_id ?? '-' }} · <span class="font-medium">Purok:</span> {{ selected.purok ?? '-' }}</p>
            <p><span class="font-medium">Contact:</span> {{ selected.household?.contact_no ?? '-' }} · <span class="font-medium">Address:</span> {{ selected.household?.address ?? '-' }}</p>
            <p><span class="font-medium">Live-in:</span> {{ selected.household?.live_in_status ?? 'No' }} <template v-if="selected.household?.live_in_status==='Yes'">({{ selected.household?.live_in_years }} yrs — {{ selected.household?.live_in_reason }})</template></p>
          </div>
          <div>
            <p class="text-xs font-semibold text-neutral-500">Members ({{ selected.household_members.length }})</p>
            <div v-for="(m, idx) in selected.household_members" :key="idx" class="mt-2 rounded-xl border bg-white p-3">
              <p class="font-medium">{{ idx+1 }}. {{ m.name }} <span class="text-xs text-neutral-400">{{ m.age }}y {{ m.sex }} {{ m.civil_status }}</span></p>
              <p class="text-xs text-neutral-600">Rel: {{ m.relationship }} · PWD: {{ (m as any).is_pwd ?? 'No' }} · Mentally: {{ (m as any).is_mentally_challenged ?? 'No' }} · Bedridden: {{ (m as any).bedridden_status ?? 'No' }} · Pregnant: {{ (m as any).is_pregnant ? 'Yes' : 'No' }}</p>
              <p v-if="(m as any).is_osy != null" class="text-xs">OSY: {{ (m as any).is_osy ? 'Yes' : 'No' }} <template v-if="(m as any).is_osy">— Last: {{ (m as any).osy_last_grade }}</template></p>
              <p class="text-xs">LCR: {{ (m as any).lcr_registered ?? 'No' }} <template v-if="(m as any).lcr_registered==='No' && (m as any).lcr_reason">— Reason: {{ (m as any).lcr_reason }}</template> · Katungdanan: {{ (m as any).katungdanan_status ?? 'No' }}<template v-if="(m as any).katungdanan_status==='Yes'"> — {{ (m as any).katungdanan_position }}</template></p>
            </div>
          </div>
          <div>
            <p class="text-xs font-semibold text-neutral-500">Answers</p>
            <div v-for="(ans, qid) in selected.answers" :key="qid" class="mt-1 flex gap-2 border-b border-dashed py-1 text-xs">
              <span class="min-w-0 flex-1 font-medium">{{ getQuestionText(selected.survey_id, Number(qid)) }}</span>
              <span class="max-w-[50%] truncate text-neutral-600">{{ formatAnswer(ans as any) }}</span>
            </div>
            <div v-if="selected.member_answers">
              <div v-for="(members, qid) in selected.member_answers" :key="qid" class="mt-2">
                <p class="text-xs font-medium">{{ getQuestionText(selected.survey_id, Number(qid)) }} (per-member)</p>
                <p v-for="(val, mName) in members as any" :key="mName" class="text-xs">{{ mName }}: {{ val }}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2 print:hidden">
          <button type="button" class="cursor-pointer rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white" @click="printRecord(selected!)">Print</button>
          <button type="button" class="cursor-pointer rounded-xl border bg-white px-4 py-2 text-sm" @click="exportExcelSingle(selected!)">Excel</button>
          <button type="button" class="cursor-pointer rounded-xl border bg-white px-4 py-2 text-sm" @click="exportPdfSingle(selected!)">PDF</button>
        </div>
      </div>
    </div>

  </section>
</template>

<style>
@media print {
  body * { visibility: hidden; }
  .fixed.inset-0 { visibility: visible; }
  .fixed.inset-0 * { visibility: visible; }
  .print\:hidden { display: none !important; }
}
</style>

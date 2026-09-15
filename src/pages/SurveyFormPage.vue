<script setup lang="ts">
import BarangaySearchSelect from '@/components/BarangaySearchSelect.vue'
import FullScreenLoader from '@/components/FullScreenLoader.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CachedSurvey } from '@/types/offline'
import { useSurveyStore } from '@/stores/survey'

const route = useRoute()
const router = useRouter()
const surveyStore = useSurveyStore()

const survey = ref<CachedSurvey | null>(null)
const loadingSurvey = ref(true)
const showSubmitConfirm = ref(false)
const saving = ref(false)

const answers = reactive<Record<number, string | string[]>>({})
const memberAnswers = reactive<Record<number, Record<string, string>>>({})
const selectedMembers = reactive<Record<number, string[]>>({})

const selectedBarangayId = ref<number | ''>('')
const barangays = ref<Array<{ id: number; name: string }>>([])

const household = reactive({
  head_name: '',
  purok: '',
  address: '',
  contact_no: '',
  live_in_status: 'No' as string,
  live_in_years: '' as string,
  live_in_reason: '',
})

type MemberForm = {
  name: string
  age: string
  sex: string
  civil_status: string
  relationship: string
  is_head: boolean
  is_pwd: string
  is_mentally_challenged: string
  is_osy: boolean | null
  osy_last_grade: string
  bedridden_status: string
  is_pregnant: boolean
  lcr_registered: string
  lcr_reason: string
  katungdanan_status: string
  katungdanan_position: string
}
const members = ref<MemberForm[]>([
  {
    name: '',
    age: '',
    sex: '',
    civil_status: '',
    relationship: 'Head',
    is_head: true,
    is_pwd: 'No',
    is_mentally_challenged: 'No',
    is_osy: null,
    osy_last_grade: '',
    bedridden_status: 'No',
    is_pregnant: false,
    lcr_registered: 'No',
    lcr_reason: '',
    katungdanan_status: 'No',
    katungdanan_position: '',
  },
])

const YOUTH_MIN = 15
const YOUTH_MAX = 30
const isYouth = (ageStr: string) => {
  const a = Number(ageStr)
  if (!ageStr || Number.isNaN(a)) return false
  return a >= YOUTH_MIN && a <= YOUTH_MAX
}
const isSeniorMember = (ageStr: string) => {
  const a = Number(ageStr)
  if (!ageStr || Number.isNaN(a)) return false
  return a >= 60
}
const blockNegative = (e: KeyboardEvent) => {
  if (e.key === '-' || e.key.toLowerCase() === 'e') e.preventDefault()
}
const blockNegativeIfNumber = (e: KeyboardEvent, type: string) => {
  if (type === 'number' && (e.key === '-' || e.key.toLowerCase() === 'e')) e.preventDefault()
}
const clampAge = (m: MemberForm) => {
  if (m.age !== '' && Number(m.age) < 0) m.age = '0'
}
const clampLiveIn = () => {
  if (household.live_in_years !== '' && Number(household.live_in_years) < 0) household.live_in_years = '0'
}
const clampAnswer = (id: number) => {
  const v = answers[id]
  if (v !== '' && v != null && !Array.isArray(v) && Number(v as string) < 0) answers[id] = '0' as any
}
const clampMemberAnswer = (qid: number, name: string) => {
  const v = (memberAnswers[qid] as any)[name]
  if (v !== '' && v != null && Number(v) < 0) (memberAnswers[qid] as any)[name] = '0'
}

const addMember = () =>
  members.value.push({
    name: '',
    age: '',
    sex: '',
    civil_status: '',
    relationship: 'Anak',
    is_head: false,
    is_pwd: 'No',
    is_mentally_challenged: 'No',
    is_osy: null,
    osy_last_grade: '',
    bedridden_status: 'No',
    is_pregnant: false,
    lcr_registered: 'No',
    lcr_reason: '',
    katungdanan_status: 'No',
    katungdanan_position: '',
  })
const removeMember = (idx: number) => {
  if (members.value.length > 1) members.value.splice(idx, 1)
}

onMounted(async () => {
  try {
    const id = Number(route.params.id)
    survey.value = (await surveyStore.getSurvey(id)) ?? null
  // Fallback: if cached survey has no type (old cache before fix), fetch fresh from API
  if (survey.value && !(survey.value as any).type) {
    try {
      const { data } = await (await import('@/services/api')).default.get(`/mobile/surveys/${id}`)
      if (data.survey) {
        survey.value = data.survey as any
        // also update cache in background
        const { saveSurveys } = await import('@/database/indexedDb')
        const { getSurveys } = await import('@/database/indexedDb')
        const all = await getSurveys()
        const idx = all.findIndex((s) => s.id === id)
        if (idx >= 0) {
          all[idx] = { ...all[idx], ...data.survey }
          await saveSurveys(all)
        }
      }
    } catch {}
  }
  // Load barangays with offline cache support (critical for isolated barangays)
  try {
    const { data } = await (await import('@/services/api')).default.get('/mobile/barangays')
    barangays.value = data.barangays ?? []
    // Cache for offline use
    try {
      const { saveBarangays } = await import('@/database/indexedDb')
      await saveBarangays(barangays.value)
    } catch {}
  } catch {
    // Offline: load from IndexedDB cache
    try {
      const { getBarangays } = await import('@/database/indexedDb')
      const cached = await getBarangays()
      if (cached.length > 0) barangays.value = cached
    } catch {}
  }
  if (survey.value?.barangay_id) selectedBarangayId.value = survey.value.barangay_id
  // Check for unsynced records and prompt
  try {
    const pending = await surveyStore.pendingSync()
    if (pending.length > 0) {
      pendingCount.value = pending.length
      showUnsyncedDialog.value = true
    }
  } catch {}
  } finally {
    loadingSurvey.value = false
  }
})

const isIndividual = (q: any) => (q as any).data_scope === 'individual'
const hasOptions = (type: string) => ['single_choice', 'multiple_choice', 'dropdown', 'likert'].includes(type)

const toggleCheckbox = (questionId: number, label: string) => {
  const current = (answers[questionId] as string[]) ?? []
  answers[questionId] = current.includes(label) ? current.filter((v) => v !== label) : [...current, label]
}

const toggleMemberForQuestion = (questionId: number, memberName: string) => {
  const list = selectedMembers[questionId] ?? []
  if (list.includes(memberName)) {
    selectedMembers[questionId] = list.filter((n) => n !== memberName)
    if (memberAnswers[questionId]) delete memberAnswers[questionId][memberName]
  } else {
    selectedMembers[questionId] = [...list, memberName]
    if (!memberAnswers[questionId]) memberAnswers[questionId] = {}
    memberAnswers[questionId][memberName] = ''
  }
}

const missingRequired = computed(() =>
  (survey.value?.questions ?? []).filter((q) => {
    if (!q.is_required) return false
    // Skip individual legacy questions if new per-member fields are used (new template has no individual questions)
    const isInd = (q as any).data_scope === 'individual' && isHouseholdSurvey.value
    if (isInd) {
      const ma = (memberAnswers as any)[q.id] as Record<string, string> | undefined
      if (ma) {
        const hasValue = Object.values(ma).some((v) => v !== null && v !== '' && !(Array.isArray(v) && (v as unknown as string[]).length === 0))
        if (hasValue) return false
      }
      const value = (answers as any)[q.id]
      return value == null || value === '' || (Array.isArray(value) && value.length === 0)
    }
    const value = (answers as any)[q.id]
    return value == null || value === '' || (Array.isArray(value) && value.length === 0)
  }),
)

const isHouseholdSurvey = computed(() => {
  const t = (survey.value as any)?.type
  if (t === 'household') return true
  if (t === 'generic') return false
  // Fallback for old cached surveys without type (before backend fix) — infer from questions/title
  const qs: any[] = (survey.value as any)?.questions ?? []
  const householdCodes = ['housing', 'land', 'electricity', 'water', 'toilet', 'poor_cat2', 'live_in', 'live_in_years']
  if (qs.some((q) => householdCodes.includes(q.code) || q.data_scope === 'household')) return true
  if ((survey.value?.title ?? '').toLowerCase().includes('household')) return true
  return false
})
const isOnline = computed(() => typeof navigator !== 'undefined' ? navigator.onLine : true)
const missingHousehold = computed(() => {
  if (!isHouseholdSurvey.value) return false
  if (!selectedBarangayId.value) return true
  if (!household.purok.trim()) return true
  if (members.value.length === 0 || members.value.some((m) => !m.name.trim())) return true
  return false
})
const missingGenericBarangay = computed(() => {
  if (isHouseholdSurvey.value) return false
  if (!(survey.value as any)?.include_barangay) return false
  return !selectedBarangayId.value
})

// Filter out household identification questions handled outside loop + live_in handled after roster
const visibleQuestions = computed(() => {
  const qs = survey.value?.questions ?? []
  if (!isHouseholdSurvey.value) return qs
  const liveInCodes = ['live_in', 'live_in_years', 'live_in_reason']
  const hideTexts = ['Household Head (Surname, Firstname, MI)', 'Household Head', 'Purok']
  return qs.filter((q: any) => !liveInCodes.includes(q.code) && !hideTexts.includes((q.question_text || '').trim()))
})

const syncLiveInAnswers = () => {
  // Map household live_in fields to survey answers for analytics (if questions exist)
  const qs: any[] = survey.value?.questions ?? []
  for (const q of qs) {
    if (q.code === 'live_in') answers[q.id] = household.live_in_status
    if (q.code === 'live_in_years' && household.live_in_status === 'Yes') answers[q.id] = household.live_in_years
    if (q.code === 'live_in_reason' && household.live_in_status === 'Yes') answers[q.id] = household.live_in_reason
    if (q.code === 'live_in_years' && household.live_in_status !== 'Yes') delete answers[q.id]
    if (q.code === 'live_in_reason' && household.live_in_status !== 'Yes') delete answers[q.id]
  }
}

const showUnsyncedDialog = ref(false)
const pendingCount = ref(0)
const showOnlineSuccess = ref(false)

const buildPayload = () => {
  const isHousehold = (survey.value as any)?.type === 'household'
  if (isHousehold) {
    const head = members.value.find((m) => m.is_head) || members.value[0]
    household.head_name = head?.name?.trim() || household.head_name
  }
  return {
    uuid: crypto.randomUUID(),
    survey_id: survey.value!.id,
    survey_title: survey.value!.title,
    barangay_id: isHousehold ? Number(selectedBarangayId.value) || (survey.value as any).barangay_id || null : (Number(selectedBarangayId.value) || (survey.value as any).barangay_id || null),
    purok: isHousehold ? household.purok || null : (household.purok || null),
    household: isHousehold
      ? {
          ...household,
          live_in_years: household.live_in_years ? Number(household.live_in_years) : null,
        }
      : null,
    household_members: isHousehold
      ? members.value.map((m) => ({
          ...m,
          age: m.age ? Number(m.age) : null,
          bedridden_status: m.bedridden_status || 'No',
          is_senior: isSeniorMember(m.age),
        }))
      : [],
    member_answers: JSON.parse(JSON.stringify(memberAnswers)),
    respondent_data: null,
    answers: JSON.parse(JSON.stringify(answers)),
    latitude: null,
    longitude: null,
    status: 'pending_sync' as const,
    sync_attempts: 0,
    last_sync_error: null,
    created_at: Date.now(),
    submitted_at: new Date().toISOString(),
  } as any
}

const submitResponse = async () => {
  if (!survey.value || missingRequired.value.length || missingHousehold.value || missingGenericBarangay.value) return
  saving.value = true
  syncLiveInAnswers()
  const payload = buildPayload()

  // If online, try direct sync via API; otherwise save offline
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const api = (await import('@/services/api')).default
      const { useSyncStore } = await import('@/stores/sync')
      const syncStore = useSyncStore()
      // Use sync store's toPayload logic for consistency
      const toPayload = (syncStore as any).toPayload ? (syncStore as any).toPayload(payload) : payload
      const { data } = await api.post('/mobile/sync', {
        device_info: 'pwa',
        responses: [toPayload],
      })
      const accepted = data.accepted ?? []
      const duplicates = data.duplicates ?? []
      const failed = data.failed ?? []
      if (accepted.includes(payload.uuid) || duplicates.includes(payload.uuid)) {
        // Successfully synced online - show success, clear form, do not save offline
        saving.value = false
        showOnlineSuccess.value = true
        // Clear form for next entry (but keep survey loaded)
        Object.keys(answers).forEach((k) => delete answers[Number(k)])
        Object.keys(memberAnswers).forEach((k) => delete memberAnswers[Number(k)])
        // Reset members to single head
        members.value = [
          {
            name: '',
            age: '',
            sex: '',
            civil_status: '',
            relationship: 'Head',
            is_head: true,
            is_pwd: 'No',
            is_mentally_challenged: 'No',
            is_osy: null,
            osy_last_grade: '',
            bedridden_status: 'No',
            is_pregnant: false,
            lcr_registered: 'No',
            lcr_reason: '',
            katungdanan_status: 'No',
            katungdanan_position: '',
          },
        ]
        return
      }
      if (failed.length > 0) throw new Error(failed[0]?.error || 'Sync failed')
    } catch (e: any) {
      // Network or validation failure - fall through to offline save
      console.warn('Online sync failed, saving offline', e?.message)
    }
  }

  // Offline or online failed - save offline for later sync
  await surveyStore.submitForSync(payload, undefined)
  saving.value = false
  router.push({ name: 'pending-sync' })
}
</script>

<template>
  <FullScreenLoader v-if="loadingSurvey" message="Loading survey…" />
  <section v-else-if="survey">
    <button type="button" class="mb-3 cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-700" @click="router.back()">← Back</button>
    <h1 class="font-heading text-xl font-semibold text-neutral-900 sm:text-2xl">{{ survey.title }}</h1>

    <!-- Household — only for Community Household Survey -->
    <div v-if="isHouseholdSurvey" class="mt-4 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
      <h2 class="font-heading text-sm font-semibold text-neutral-800">Household — Barangay, Purok & Head</h2>
      <p class="text-xs text-neutral-400">
        Survey: <span class="font-medium text-neutral-700">{{ survey.barangay_name ?? 'All barangays' }}</span> · Select the household's barangay below · One household per submission
      </p>
      <div class="mt-3 grid gap-3">
        <label class="block text-sm">
          <span class="text-xs font-medium text-neutral-600">Barangay *</span>
          <BarangaySearchSelect v-model="selectedBarangayId" :barangays="barangays" placeholder="Search barangay..." />
        </label>
        <label class="block text-sm">
          <span class="text-xs font-medium text-neutral-600">Purok *</span>
          <input v-model="household.purok" placeholder="e.g. Purok 4" class="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
        </label>
        <label class="block text-sm">
          <span class="text-xs font-medium text-neutral-600">Contact No.</span>
          <input v-model="household.contact_no" placeholder="09xxxxxxxxx" class="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
        </label>
      </div>

      <h3 class="font-heading mt-5 text-sm font-semibold text-neutral-800">Family Members — Roster *</h3>
      <p class="text-xs text-neutral-400">Each member includes Civil Status, PWD, Mentally Challenged, OSY (if youth {{ YOUTH_MIN }}–{{ YOUTH_MAX }}), Senior auto 60+, Bedridden, Pregnant if female. At least 1 required.</p>
      <div class="mt-3 space-y-4">
        <div v-for="(m, idx) in members" :key="idx" class="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-neutral-500"
              >Member {{ idx + 1 }} <span v-if="m.is_head" class="ml-1 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] text-brand-700">Head</span>
              <span v-if="isSeniorMember(m.age)" class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">Senior 60+</span>
            </span>
            <button v-if="members.length > 1" type="button" class="cursor-pointer text-xs font-medium text-red-500 hover:text-red-600" @click="removeMember(idx)">Remove</button>
          </div>
          <input v-model="m.name" :placeholder="idx===0 ? 'Member name *' : 'Name *'" class="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" />
          <div class="mt-2 grid grid-cols-3 gap-2">
            <input v-model="m.age" type="number" min="0" placeholder="Age *" class="rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm" @keydown="blockNegative" @input="clampAge(m)" />
            <select v-model="m.sex" class="rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm">
              <option value="">Sex *</option>
              <option>Male</option>
              <option>Female</option>
              <option>Others</option>
            </select>
            <input v-model="m.relationship" placeholder="Relasyon (Head/Asawa/Anak)" class="rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm" />
          </div>
          <div class="mt-2">
            <select v-model="m.civil_status" class="w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm">
              <option value="">Civil Status</option>
              <option>Single</option>
              <option>Married</option>
              <option>Widowed</option>
              <option>Separated</option>
              <option>Live-in</option>
              <option>Annulled</option>
            </select>
          </div>

          <!-- Per-member attributes -->
          <div class="mt-3 grid gap-3 rounded-lg border border-white bg-white p-3">
            <label class="block text-sm">
              <span class="text-xs font-medium text-neutral-600">PWD</span>
              <select v-model="m.is_pwd" class="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm">
                <option value="No">No</option>
                <option value="Yes - Makalakaw pa">Yes - Makalakaw pa</option>
                <option value="Yes - Di na ka lakaw">Yes - Di na ka lakaw</option>
              </select>
            </label>
            <label class="block text-sm">
              <span class="text-xs font-medium text-neutral-600">Mentally Challenged</span>
              <select v-model="m.is_mentally_challenged" class="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm">
                <option value="No">No</option>
                <option value="Yes - dili problema sa katilingban">Yes - dili problema sa katilingban</option>
                <option value="Yes - hasol sa katilingban">Yes - hasol sa katilingban</option>
              </select>
            </label>

            <!-- OSY conditional on youth -->
            <div v-if="isYouth(m.age)" class="rounded-lg border border-amber-200 bg-amber-50/50 p-2">
              <label class="block text-xs font-medium text-neutral-600">Out-of-School Youth (OSY)? — Youth {{ YOUTH_MIN }}–{{ YOUTH_MAX }}</label>
              <select v-model="m.is_osy" class="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm">
                <option :value="null" disabled>Select</option>
                <option :value="true">Yes</option>
                <option :value="false">No</option>
              </select>
              <div v-if="m.is_osy === true" class="mt-2">
                <input v-model="m.osy_last_grade" placeholder="Last grade level attended (e.g. Grade 10, 2nd Year College)" class="w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm" />
              </div>
            </div>
            <div v-else-if="m.age && !isYouth(m.age)" class="text-[11px] text-neutral-400">OSY not applicable (age not {{ YOUTH_MIN }}–{{ YOUTH_MAX }})</div>

            <label class="block text-sm">
              <span class="text-xs font-medium text-neutral-600">Bedridden Status</span>
              <select v-model="m.bedridden_status" class="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm">
                <option value="No">No</option>
                <option value="Yes - Mabakod pa">Yes – Mabakod pa</option>
                <option value="Yes - Di na kabakod">Yes – Di na kabakod</option>
              </select>
            </label>

            <div v-if="m.sex === 'Female'" class="rounded-lg border border-pink-200 bg-pink-50/50 p-2">
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" v-model="m.is_pregnant" class="size-4 accent-brand-500" />
                <span class="text-xs font-medium text-neutral-700">Pregnant</span>
                <span class="ml-auto text-[11px] text-neutral-400">Default No</span>
              </label>
            </div>
            <div v-else-if="m.sex" class="text-[11px] text-neutral-400">Pregnant only if Female</div>

            <label class="block text-sm">
              <span class="text-xs font-medium text-neutral-600">LCR Registered</span>
              <div class="mt-1 flex gap-4">
                <label class="flex items-center gap-1.5 text-sm"><input type="radio" value="Yes" v-model="m.lcr_registered" class="size-4 accent-brand-500" /> Yes</label>
                <label class="flex items-center gap-1.5 text-sm"><input type="radio" value="No" v-model="m.lcr_registered" class="size-4 accent-brand-500" /> No</label>
              </div>
            </label>
            <div v-if="m.lcr_registered === 'No'" class="rounded-lg border border-amber-200 bg-amber-50/50 p-2">
              <label class="block text-xs font-medium text-neutral-600">Reason why not LCR registered</label>
              <input v-model="m.lcr_reason" placeholder="e.g. No birth certificate, late registration..." class="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm" />
            </div>

            <label class="block text-sm">
              <span class="text-xs font-medium text-neutral-600">Naay Katungdanan sa Simbahan/Barangay/Organization</span>
              <select v-model="m.katungdanan_status" class="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm">
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </label>
            <div v-if="m.katungdanan_status === 'Yes'" class="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2">
              <label class="block text-xs font-medium text-neutral-600">What position/responsibility?</label>
              <input v-model="m.katungdanan_position" placeholder="e.g. Barangay Kagawad, Choir Member, President..." class="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm" />
            </div>
          </div>
        </div>
        <button type="button" class="w-full cursor-pointer rounded-xl border border-dashed border-brand-300 bg-brand-50 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100" @click="addMember">+ Add Member</button>
      </div>

      <!-- Live-in Status after roster per spec -->
      <div class="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
        <label class="block text-sm">
          <span class="text-xs font-medium text-neutral-600">Live-in Status (Nag-live-in ba?)</span>
          <select v-model="household.live_in_status" class="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </label>
        <div v-if="household.live_in_status === 'Yes'" class="mt-3 grid gap-3">
          <label class="block text-sm">
            <span class="text-xs font-medium text-neutral-600">How many years living together?</span>
            <input v-model="household.live_in_years" type="number" min="0" placeholder="e.g. 5" class="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm" @keydown="blockNegative" @input="clampLiveIn()" />
          </label>
          <label class="block text-sm">
            <span class="text-xs font-medium text-neutral-600">Reason why not married?</span>
            <input v-model="household.live_in_reason" placeholder="e.g. Financial, not yet planned..." class="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm" />
          </label>
        </div>
      </div>
    </div>
    <div v-else-if="(survey as any)?.include_barangay" class="mt-4 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
      <h2 class="font-heading text-sm font-semibold text-neutral-800">Location</h2>
      <p class="text-xs text-neutral-400">Select barangay for geographic analytics.</p>
      <div class="mt-3">
        <label class="block text-sm">
          <span class="text-xs font-medium text-neutral-600">Barangay *</span>
          <BarangaySearchSelect v-model="selectedBarangayId" :barangays="barangays" placeholder="Search barangay..." />
        </label>
      </div>
    </div>

    <div class="mt-4 space-y-4 pb-6">
      <template v-for="(question, index) in visibleQuestions" :key="question.id">
        <!-- Legacy individual-scope: keep for old surveys (backward compat) -->
        <div v-if="isHouseholdSurvey && (question as any).data_scope === 'individual'" class="rounded-2xl border border-brand-200 bg-brand-50/30 p-4 shadow-sm">
          <label class="font-heading mb-2 block text-sm font-semibold">
            {{ index + 1 }}. {{ question.question_text }}
            <span v-if="question.is_required" class="text-red-400">*</span>
            <span class="ml-2 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">Per-member</span>
          </label>
          <p class="mb-3 text-xs text-neutral-500">Select household member(s) this applies to, then fill per-member details.</p>
          <div class="space-y-2">
            <label v-for="m in members" :key="m.name" class="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
              <input type="checkbox" :checked="(selectedMembers[question.id] ?? []).includes(m.name)" @change="toggleMemberForQuestion(question.id, m.name)" class="size-4 accent-brand-500" />
              <span class="flex-1">{{ m.name || 'Unnamed member' }} <span class="text-xs text-neutral-400">{{ m.age ? m.age+'y' : '' }} {{ m.sex }}</span></span>
            </label>
          </div>
          <div v-if="(selectedMembers[question.id] ?? []).length" class="mt-3 space-y-3">
            <div v-for="memberName in selectedMembers[question.id]!" :key="memberName" class="rounded-xl border border-brand-200 bg-white p-3">
              <p class="text-xs font-semibold text-brand-700">{{ memberName }}</p>
              <div class="mt-2">
                <label class="text-xs text-neutral-500">Status / Category</label>
                <select v-if="hasOptions(question.type)" v-model="(memberAnswers[question.id] as any)[memberName]" class="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
                  <option value="">Select…</option>
                  <option v-for="opt in question.options" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <input v-else v-model="(memberAnswers[question.id] as any)[memberName]" :type="question.type==='number'?'number':'text'" :min="question.type==='number' ? 0 : undefined" placeholder="Value" class="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm" @keydown="blockNegativeIfNumber($event, question.type)" @input="clampMemberAnswer(question.id, memberName)" />
              </div>
            </div>
          </div>
        </div>
        <!-- Household / response scope: single answer -->
        <div v-else class="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
          <label class="font-heading mb-2 block text-sm font-semibold" :for="`q-${question.id}`">
            {{ index + 1 }}. {{ question.question_text }}
            <span v-if="question.is_required" class="text-red-400">*</span>
          </label>
          <input
            v-if="['text', 'number', 'date'].includes(question.type)"
            :id="`q-${question.id}`"
            v-model="answers[question.id]"
            :type="question.type === 'number' ? 'number' : question.type === 'date' ? 'date' : 'text'"
            :min="question.type === 'number' ? 0 : undefined"
            class="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            @keydown="blockNegativeIfNumber($event, question.type)"
            @input="clampAnswer(question.id)"
          />
          <textarea
            v-else-if="question.type === 'textarea'"
            :id="`q-${question.id}`"
            v-model="answers[question.id]"
            rows="3"
            class="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <div v-else-if="question.type === 'likert'" class="space-y-2">
            <div class="grid gap-1.5" :style="{ gridTemplateColumns: `repeat(${question.options.length}, minmax(0, 1fr))` }">
              <label
                v-for="option in question.options"
                :key="option"
                class="flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center hover:bg-neutral-50"
                :class="answers[question.id] === option ? 'border-brand-300 bg-brand-50 ring-1 ring-brand-200' : 'border-neutral-200 bg-white'"
              >
                <input type="radio" :name="`q-${question.id}`" :value="option" v-model="answers[question.id]" class="size-4 accent-brand-500" />
                <span class="text-xs font-medium leading-tight">{{ option }}</span>
              </label>
            </div>
            <div class="flex justify-between px-1 text-[10px] text-neutral-400">
              <span>Strongly Disagree</span>
              <span>Strongly Agree</span>
            </div>
          </div>
          <div v-else-if="hasOptions(question.type) && question.type !== 'multiple_choice' && question.type !== 'likert'" class="space-y-1.5">
            <label v-for="option in question.options" :key="option" class="flex cursor-pointer items-center gap-2.5 text-sm">
              <input :type="question.type === 'multiple_choice' ? 'checkbox' : 'radio'" :name="`q-${question.id}`" :value="option" v-model="answers[question.id]" class="size-4 accent-brand-500" />
              {{ option }}
            </label>
          </div>
          <div v-else-if="question.type === 'multiple_choice'" class="space-y-1.5">
            <label v-for="option in question.options" :key="option" class="flex cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" class="size-4 accent-brand-500" :checked="((answers[question.id] as string[]) ?? []).includes(option)" @change="toggleCheckbox(question.id, option)" />
              {{ option }}
            </label>
          </div>
        </div>
      </template>
    </div>

    <!-- Sticky action bar - Submit only (draft removed, online/offline auto-detected) -->
    <div class="safe-bottom fixed inset-x-0 bottom-14 z-10 mx-auto max-w-3xl px-4 py-2 sm:bottom-0">
      <div class="flex gap-2 rounded-2xl border border-neutral-200/80 bg-white/95 p-2 shadow-lg backdrop-blur">
        <button type="button" :disabled="saving || missingRequired.length > 0 || missingHousehold || missingGenericBarangay" class="bg-brand-gradient flex-1 cursor-pointer rounded-xl py-2.5 text-sm font-semibold text-white shadow-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50" @click="showSubmitConfirm = true">
          {{ missingHousehold ? 'Household required' : missingGenericBarangay ? 'Barangay required' : missingRequired.length ? `${missingRequired.length} required left` : isOnline ? 'Submit Online' : 'Save Offline' }}
        </button>
      </div>
      <p class="mt-1.5 text-center text-[11px]" :class="isOnline ? 'text-emerald-600' : 'text-amber-600'">
        {{ isOnline ? 'Online — will submit directly' : 'Offline — will save locally and sync when online' }}
      </p>
    </div>

    <div v-if="showSubmitConfirm" class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-6" @click.self="showSubmitConfirm = false">
      <div class="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-xl">
        <p class="font-heading font-semibold">Submit response?</p>
        <p class="mt-1 text-xs" :class="isOnline ? 'text-emerald-600' : 'text-amber-600'">
          {{ isOnline ? 'Online — will submit directly to server.' : 'Offline — will save locally and sync when online.' }}
        </p>
        <div class="mt-4 flex gap-2">
          <button type="button" class="flex-1 cursor-pointer rounded-xl border py-2 text-sm font-medium hover:bg-neutral-50" @click="showSubmitConfirm = false">Cancel</button>
          <button type="button" class="bg-brand-gradient flex-1 cursor-pointer rounded-xl py-2 text-sm font-semibold text-white hover:opacity-90" :disabled="saving" @click="submitResponse">Submit</button>
        </div>
      </div>
    </div>

    <!-- Unsynced records prompt -->
    <div v-if="showUnsyncedDialog" class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-6" @click.self="showUnsyncedDialog = false">
      <div class="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-xl">
        <div class="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-amber-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-5 text-amber-600"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
        </div>
        <p class="font-heading font-semibold">Unsynced Responses</p>
        <p class="mt-1 text-sm text-neutral-500">You have <span class="font-semibold text-amber-600">{{ pendingCount }}</span> response(s) that are not yet synced. They will be sent automatically when you are online.</p>
        <div class="mt-4 flex gap-2">
          <button type="button" class="flex-1 cursor-pointer rounded-xl border py-2 text-sm font-medium hover:bg-neutral-50" @click="showUnsyncedDialog = false">Continue</button>
          <button type="button" class="flex-1 cursor-pointer rounded-xl bg-brand-gradient py-2 text-sm font-semibold text-white" @click="router.push({ name: 'pending-sync' })">View Pending</button>
        </div>
      </div>
    </div>

    <!-- Online success dialog -->
    <div v-if="showOnlineSuccess" class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-6" @click.self="showOnlineSuccess = false">
      <div class="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-xl">
        <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="size-6 text-emerald-600"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
        </div>
        <p class="font-heading font-semibold">Submitted Online!</p>
        <p class="mt-1 text-sm text-neutral-500">Your response was sent directly to the server.</p>
        <div class="mt-4 flex gap-2">
          <button type="button" class="flex-1 cursor-pointer rounded-xl border py-2 text-sm font-medium hover:bg-neutral-50" @click="showOnlineSuccess = false">Stay</button>
          <button type="button" class="flex-1 cursor-pointer rounded-xl bg-brand-gradient py-2 text-sm font-semibold text-white" @click="showOnlineSuccess = false; router.push({ name: 'surveys' })">Done</button>
        </div>
        <button type="button" class="mt-3 w-full cursor-pointer text-xs font-medium text-brand-600 hover:text-brand-700" @click="showOnlineSuccess = false; Object.keys(answers).forEach(k => delete answers[Number(k)]); Object.keys(memberAnswers).forEach(k => delete memberAnswers[Number(k)]);">Submit Another Response</button>
      </div>
    </div>
  </section>
  <section v-else class="pt-10 text-center text-sm text-neutral-400">Survey not found.</section>
</template>

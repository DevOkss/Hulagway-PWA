export interface CachedSurvey {
  id: number
  title: string
  description: string | null
  type: string | null
  barangay_id: number | null
  include_barangay?: boolean | null
  barangay_name: string | null
  published_at: string | null
  created_at: string | null
  questions: Array<{
    id: number
    question_text: string
    type: string
    is_required: boolean
    order: number
    code: string | null
    data_scope?: string | null
    map_enabled?: boolean | null
    options: string[]
  }>
}

export type ResponseStatus = 'draft' | 'pending_sync'

export interface HouseholdDraft {
  head_name: string
  purok: string
  address?: string | null
  contact_no?: string | null
  household_code?: string | null
  live_in_status?: string | null
  live_in_years?: number | null
  live_in_reason?: string | null
}

export interface HouseholdMemberDraft {
  name: string
  age?: number | null
  sex?: string | null
  civil_status?: string | null
  relationship?: string | null
  is_head?: boolean
  is_pwd?: string | null
  is_mentally_challenged?: string | null
  is_osy?: boolean | null
  osy_last_grade?: string | null
  bedridden_status?: string | null
  is_pregnant?: boolean
  is_senior?: boolean
  lcr_registered?: string | null
  lcr_reason?: string | null
  katungdanan_status?: string | null
  katungdanan_position?: string | null
}

export interface PendingResponse {
  uuid: string
  survey_id: number
  survey_title?: string
  barangay_id: number | null
  purok: string | null
  household: HouseholdDraft | null
  household_members: HouseholdMemberDraft[]
  member_answers?: Record<number, Record<string, string>>
  respondent_data: Record<string, unknown> | null
  answers: Record<number, string | string[]>
  latitude: number | null
  longitude: number | null
  status: ResponseStatus
  sync_attempts: number
  last_sync_error: string | null
  created_at: number
  submitted_at: string | null
}

export interface SyncHistoryEntry {
  id?: number
  synced_at: number
  records_received: number
  records_accepted: number
  duplicates: number
  failed: Array<{ uuid: string; error: string }>
}

export interface AuthUser {
  id: number
  name: string
  email: string
  role: string | null
}

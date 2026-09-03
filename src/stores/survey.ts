import { defineStore } from 'pinia'
import api from '@/services/api'
import {
  getResponses,
  getSurvey,
  getSurveys,
  saveResponse,
  saveSurveys,
} from '@/database/indexedDb'
import type { CachedSurvey, PendingResponse } from '@/types/offline'

export const useSurveyStore = defineStore('survey', {
  state: () => ({
    surveys: [] as CachedSurvey[],
    loading: false,
    error: '' as string,
  }),
  actions: {
    async loadSurveys(force = false) {
      // Serve cached data instantly; refresh from network when possible
      if (!force) {
        this.surveys = await getSurveys()
        if (this.surveys.length > 0 && !navigator.onLine) return
      }
      this.loading = true
      try {
        const { data } = await api.get('/mobile/surveys')
        this.surveys = data.surveys
        await saveSurveys(data.surveys)
      } catch {
        if (this.surveys.length === 0) {
          this.error = 'Could not load surveys. You appear to be offline.'
        }
      } finally {
        this.loading = false
      }
    },
    async getSurvey(id: number): Promise<CachedSurvey | undefined> {
      return (await getSurvey(id)) ?? this.surveys.find((s) => s.id === id)
    },
    async drafts(): Promise<PendingResponse[]> {
      return (await getResponses('draft')).sort((a, b) => b.created_at - a.created_at)
    },
    async pendingSync(): Promise<PendingResponse[]> {
      return (await getResponses('pending_sync')).sort((a, b) => b.created_at - a.created_at)
    },
    async saveDraft(response: PendingResponse) {
      response.status = 'draft'
      await saveResponse(response)
    },
    async submitForSync(
      response: PendingResponse,
      gps?: { lat: number | null; lng: number | null },
    ) {
      if (gps) {
        response.latitude = gps.lat
        response.longitude = gps.lng
      }
      response.status = 'pending_sync'
      response.submitted_at = new Date().toISOString()
      await saveResponse(response)
    },
    async deleteDraft(uuid: string) {
      await import('@/database/indexedDb').then((db) => db.deleteResponse(uuid))
    },
  },
})

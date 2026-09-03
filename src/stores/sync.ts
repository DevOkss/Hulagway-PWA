import { defineStore } from 'pinia'
import api from '@/services/api'
import { addSyncHistory, getResponses, saveResponse, getSyncHistory } from '@/database/indexedDb'
import type { PendingResponse, SyncHistoryEntry } from '@/types/offline'

export const useSyncStore = defineStore('sync', {
  state: () => ({
    syncing: false,
    lastResult: null as null | {
      accepted: string[]
      duplicates: string[]
      failed: Array<{ uuid: string; error: string }>
    },
    history: [] as SyncHistoryEntry[],
    online: navigator.onLine,
  }),
  actions: {
    setOnline(online: boolean) {
      this.online = online
      if (online) {
        // Auto-sync pending records as soon as connectivity returns
        void this.sync()
      }
    },
    async sync(): Promise<boolean> {
      if (this.syncing || !this.online) return false

      const pending = await getResponses('pending_sync')
      if (pending.length === 0) return true

      this.syncing = true
      try {
        const { data } = await api.post('/mobile/sync', {
          device_info: 'pwa',
          responses: pending.map(this.toPayload),
        })

        this.lastResult = {
          accepted: data.accepted ?? [],
          duplicates: data.duplicates ?? [],
          failed: data.failed ?? [],
        }

        await this.applyResult(pending)
        await addSyncHistory({
          synced_at: Date.now(),
          records_received: pending.length,
          records_accepted: this.lastResult.accepted.length,
          duplicates: this.lastResult.duplicates.length,
          failed: this.lastResult.failed,
        })
        await this.loadHistory()

        return this.lastResult.failed.length === 0
      } catch (error: any) {
        // Network-level failure — increment attempts so records can back off
        for (const record of pending) {
          record.sync_attempts += 1
          record.last_sync_error = error.message ?? 'Network error'
          await saveResponse(record)
        }
        return false
      } finally {
        this.syncing = false
      }
    },
    async applyResult(pending: PendingResponse[]) {
      if (!this.lastResult) return

      for (const record of pending) {
        if (
          this.lastResult.accepted.includes(record.uuid) ||
          this.lastResult.duplicates.includes(record.uuid)
        ) {
          // Accepted or already on the server — safe to remove locally
          await import('@/database/indexedDb').then((db) => db.deleteResponse(record.uuid))
        } else {
          const failure = this.lastResult.failed.find((f) => f.uuid === record.uuid)
          if (failure) {
            record.sync_attempts += 1
            record.last_sync_error = failure.error
            await saveResponse(record)
          }
        }
      }
    },
    toPayload(record: PendingResponse) {
      return {
        uuid: record.uuid,
        survey_id: record.survey_id,
        barangay_id: record.barangay_id,
        purok: (record as any).purok ?? (record as any).household?.purok ?? null,
        household: (record as any).household ?? null,
        household_members: (record as any).household_members ?? [],
        member_answers: (record as any).member_answers ?? {},
        respondent_data: record.respondent_data,
        latitude: record.latitude,
        longitude: record.longitude,
        submitted_at: record.submitted_at,
        answers: record.answers,
      }
    },
    async loadHistory() {
      this.history = await getSyncHistory()
    },
  },
})

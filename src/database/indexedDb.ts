import { openDB, type IDBPDatabase } from 'idb'
import type { CachedSurvey, PendingResponse, SyncHistoryEntry } from '@/types/offline'

const DB_NAME = 'hulagway-offline'
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('surveys')) {
          db.createObjectStore('surveys', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('responses')) {
          const store = db.createObjectStore('responses', { keyPath: 'uuid' })
          store.createIndex('by_status', 'status')
        }
        if (!db.objectStoreNames.contains('sync_history')) {
          db.createObjectStore('sync_history', { keyPath: 'id', autoIncrement: true })
        }
        if (oldVersion < 2 || !db.objectStoreNames.contains('barangays')) {
          if (!db.objectStoreNames.contains('barangays')) {
            db.createObjectStore('barangays', { keyPath: 'id' })
          }
        }
      },
    })
  }
  return dbPromise
}

// ---- Surveys metadata (cached for offline access) ----

export async function saveSurveys(surveys: CachedSurvey[]) {
  const db = await getDb()
  const tx = db.transaction('surveys', 'readwrite')
  await tx.store.clear()
  for (const survey of surveys) {
    const clone = JSON.parse(JSON.stringify(survey))
    void tx.store.put(clone)
  }
  await tx.done
}

export async function getSurveys(): Promise<CachedSurvey[]> {
  const db = await getDb()
  return db.getAll('surveys')
}

export async function getSurvey(id: number): Promise<CachedSurvey | undefined> {
  const db = await getDb()
  return db.get('surveys', id)
}

// ---- Draft / pending responses ----

export async function saveResponse(response: PendingResponse) {
  const db = await getDb()
  // Ensure plain cloneable object (Vue reactive proxies can contain non-cloneable symbols)
  const clone = JSON.parse(JSON.stringify(response))
  await db.put('responses', clone)
}

export async function getResponses(status?: PendingResponse['status']): Promise<PendingResponse[]> {
  const db = await getDb()
  if (status) {
    return db.getAllFromIndex('responses', 'by_status', status)
  }
  return db.getAll('responses')
}

export async function getResponse(uuid: string): Promise<PendingResponse | undefined> {
  const db = await getDb()
  return db.get('responses', uuid)
}

export async function deleteResponse(uuid: string) {
  const db = await getDb()
  await db.delete('responses', uuid)
}

// ---- Barangays (for offline survey answering) ----

export async function saveBarangays(barangays: Array<{ id: number; name: string; latitude?: number | null; longitude?: number | null }>) {
  const db = await getDb()
  const tx = db.transaction('barangays', 'readwrite')
  await tx.store.clear()
  for (const b of barangays) {
    void tx.store.put(JSON.parse(JSON.stringify(b)))
  }
  await tx.done
}

export async function getBarangays(): Promise<Array<{ id: number; name: string; latitude?: number | null; longitude?: number | null }>> {
  const db = await getDb()
  try {
    return await db.getAll('barangays')
  } catch {
    return []
  }
}

// ---- Sync history ----

export async function addSyncHistory(entry: Omit<SyncHistoryEntry, 'id'>) {
  const db = await getDb()
  const clone = JSON.parse(JSON.stringify(entry))
  await db.add('sync_history', clone)
}

export async function getSyncHistory(limit = 50): Promise<SyncHistoryEntry[]> {
  const db = await getDb()
  const all = await db.getAll('sync_history')
  return all.sort((a, b) => b.synced_at - a.synced_at).slice(0, limit)
}

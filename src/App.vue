<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'
import FullScreenLoader from '@/components/FullScreenLoader.vue'
import InstallPwaPopup from '@/components/InstallPwaPopup.vue'

const route = useRoute()
const auth = useAuthStore()
const sync = useSyncStore()

const goOnline = () => sync.setOnline(true)
const goOffline = () => sync.setOnline(false)

onMounted(() => {
  window.addEventListener('online', goOnline)
  window.addEventListener('offline', goOffline)

  if (auth.isAuthenticated && !auth.user) {
    void auth.fetchUser()
  }
  if (navigator.onLine) {
    void sync.sync()
  }
})

onUnmounted(() => {
  window.removeEventListener('online', goOnline)
  window.removeEventListener('offline', goOffline)
})

watch(
  () => auth.user,
  () => {
    if (auth.user) void sync.sync()
  },
)
</script>

<template>
  <!-- Suspense covers lazy route-chunk loading so entering a page never
    shows an empty shell on slow phones. -->
  <RouterView v-slot="{ Component }">
    <template v-if="Component">
      <Suspense>
        <component :is="Component" :key="route.fullPath" />
        <template #fallback>
          <FullScreenLoader message="Opening…" />
        </template>
      </Suspense>
    </template>
  </RouterView>
  <InstallPwaPopup />
</template>

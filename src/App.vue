<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'
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
  <RouterView :key="route.fullPath" />
  <InstallPwaPopup />
</template>

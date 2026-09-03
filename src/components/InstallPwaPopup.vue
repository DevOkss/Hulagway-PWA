<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const isVisible = ref(false)
const isIOS = ref(false)
const deferredPrompt = ref<any>(null)
const STORAGE_KEY = 'hulagway-pwa-dismissed-at'
const DISMISS_DAYS = 7

const isStandalone = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

const isDismissedRecently = () => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return false
  const ts = Number(raw)
  if (Number.isNaN(ts)) return false
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000
}

const dismiss = () => {
  isVisible.value = false
  localStorage.setItem(STORAGE_KEY, String(Date.now()))
}

const install = async () => {
  if (deferredPrompt.value) {
    deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    if (outcome === 'accepted') {
      isVisible.value = false
      localStorage.removeItem(STORAGE_KEY)
    } else {
      dismiss()
    }
    deferredPrompt.value = null
  } else if (isIOS.value) {
    // iOS has no prompt, just keep popup for instructions, dismiss on button
    dismiss()
  }
}

let beforeInstallHandler: any = null
let appInstalledHandler: any = null

onMounted(() => {
  isIOS.value = /iPad|iPhone|iPod/.test(navigator.userAgent)

  if (isStandalone() || isDismissedRecently()) {
    return
  }

  beforeInstallHandler = (e: Event) => {
    e.preventDefault()
    deferredPrompt.value = e
    // show after short delay for better UX
    setTimeout(() => {
      if (!isStandalone() && !isDismissedRecently()) {
        isVisible.value = true
      }
    }, 1500)
  }

  appInstalledHandler = () => {
    isVisible.value = false
    deferredPrompt.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  window.addEventListener('beforeinstallprompt', beforeInstallHandler)
  window.addEventListener('appinstalled', appInstalledHandler)

  // iOS fallback: no beforeinstallprompt, show manual instructions after delay
  if (isIOS.value && !isStandalone()) {
    setTimeout(() => {
      if (!isDismissedRecently() && !deferredPrompt.value) {
        isVisible.value = true
      }
    }, 2000)
  } else if (!isIOS.value) {
    // For Android/desktop without prompt yet, fallback show after 3s if not installed? Not showing unless prompt fired
    // Keep hidden until beforeinstallprompt fires
  }
})

onUnmounted(() => {
  if (beforeInstallHandler) window.removeEventListener('beforeinstallprompt', beforeInstallHandler)
  if (appInstalledHandler) window.removeEventListener('appinstalled', appInstalledHandler)
})
</script>

<template>
  <Transition name="pwa-popup">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 p-4 backdrop-blur-[1px] sm:items-center"
      @click.self="dismiss"
    >
      <div
        class="w-full max-w-sm overflow-hidden rounded-[20px] border border-orange-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
      >
        <!-- Header with logo -->
        <div class="bg-gradient-to-r from-orange-500 to-orange-600 px-5 pb-5 pt-5 text-white">
          <div class="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="HULAGWAY"
              class="size-12 rounded-xl bg-white p-1.5 shadow-md"
            />
            <div>
              <h2 class="font-heading text-[17px] font-bold leading-none tracking-wide">HULAGWAY</h2>
              <p class="text-[11px] font-medium opacity-90">Mapping Community Realities</p>
            </div>
            <button
              class="ml-auto rounded-full bg-white/15 p-1.5 text-white/80 hover:bg-white/20"
              aria-label="Close"
              @click="dismiss"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-4">
                <path d="M6 18 18 6M6 6l12 12" stroke-linecap="round" />
              </svg>
            </button>
          </div>
          <p class="mt-3 text-[13px] leading-snug text-white/95">
            Install HULAGWAY on your home screen for faster, offline access to field surveys.
          </p>
        </div>

        <!-- Body -->
        <div class="px-5 py-4">
          <div v-if="isIOS && !deferredPrompt" class="rounded-xl border border-orange-100 bg-orange-50 px-3 py-3">
            <p class="text-xs font-semibold text-orange-700">How to install on iPhone/iPad:</p>
            <ol class="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-snug text-neutral-600">
              <li>Tap the <span class="font-semibold">Share</span> button <span class="inline-flex size-4 items-center justify-center rounded bg-neutral-900 text-[10px] text-white">↑</span> in Safari</li>
              <li>Choose <span class="font-semibold">Add to Home Screen</span></li>
              <li>Tap <span class="font-semibold">Add</span></li>
            </ol>
            <img src="/logo.png" alt="App icon preview" class="mx-auto mt-3 size-16 rounded-xl border border-orange-200 bg-white p-2 shadow-sm" />
          </div>

          <div v-else class="flex items-center gap-3">
            <img src="/logo.png" alt="HULAGWAY icon" class="size-10 rounded-lg border border-orange-200 bg-white p-1 shadow-sm" />
            <div class="text-xs text-neutral-600">
              <p class="font-semibold text-neutral-800">Add to Home Screen</p>
              <p class="text-[11px]">Works offline • Fast launch • No App Store needed</p>
            </div>
          </div>

          <div class="mt-4 flex gap-2">
            <button
              v-if="!isIOS || deferredPrompt"
              class="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(249,115,22,0.35)] active:scale-[0.99]"
              @click="install"
            >
              Install
            </button>
            <button
              v-else
              class="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(249,115,22,0.35)] active:scale-[0.99]"
              @click="dismiss"
            >
              Got it
            </button>
            <button
              class="rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
              @click="dismiss"
            >
              Not now
            </button>
          </div>
          <p class="mt-2 text-center text-[10px] text-neutral-400">Shows only once • Won't appear when already installed</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.pwa-popup-enter-active,
.pwa-popup-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.pwa-popup-enter-from,
.pwa-popup-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>

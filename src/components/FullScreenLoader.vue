<script setup lang="ts">
defineProps<{
  /** Caption under the spinner (e.g. "Loading surveys…"). */
  message?: string
}>()
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    class="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-brand-50/95 px-6 text-center backdrop-blur-[2px]"
  >
    <span
      class="size-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"
      aria-hidden="true"
    />
    <div>
      <p class="font-heading text-sm font-bold tracking-[0.2em] text-brand-700">HULAGWAY</p>
      <p class="mt-1 text-xs text-neutral-500">{{ message ?? 'Loading…' }}</p>
    </div>
  </div>
</template>

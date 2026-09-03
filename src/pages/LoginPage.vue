<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)

const submit = async () => {
  if (await auth.login(email.value, password.value)) {
    router.push({ name: 'dashboard' })
  }
}
</script>

<template>
  <div class="flex min-h-svh flex-col md:flex-row">
    <!-- Left panel: brand / backdrop — same as Laravel -->
    <div
      class="relative flex h-44 items-center justify-center overflow-hidden bg-orange-50 px-6 sm:h-56 md:h-auto md:w-1/2 md:min-h-svh md:px-8 md:py-16"
    >
      <img src="/images/login-backdrop.png" alt="" class="absolute inset-0 h-full w-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent md:hidden"></div>
      <div class="relative z-10 flex flex-col items-center text-center">
        <img src="/images/logo-transparent.png" alt="HULAGWAY logo" class="mb-2 size-16 drop-shadow-sm sm:size-24 md:mb-6 md:size-48" />
        <h1 class="font-heading text-2xl leading-tight font-extrabold tracking-wider text-orange-600 sm:text-3xl md:text-5xl">HULAGWAY</h1>
        <p class="mt-1 text-[11px] font-semibold tracking-[0.05em] text-orange-600/90 uppercase sm:text-xs md:mt-4 md:text-sm">Mapping Community Realities</p>
        <div class="mt-1 hidden items-center gap-3 text-[11px] font-semibold tracking-[0.15em] text-orange-500/80 uppercase sm:flex md:text-xs">
          <span class="h-px w-6 bg-orange-300"></span>
          Toward Informed Extension Planning
          <span class="h-px w-6 bg-orange-300"></span>
        </div>
      </div>
    </div>

    <!-- Right panel: sign-in form — not a card -->
    <div class="flex flex-1 items-center justify-center bg-white px-6 py-10 sm:px-10 md:w-1/2">
      <div class="w-full max-w-md">
        <div class="mb-8 text-center md:text-left">
          <h2 class="font-heading text-2xl font-bold text-gray-900 sm:text-3xl">Welcome Back</h2>
          <p class="mt-2 text-sm text-gray-500">Sign in to collect field surveys</p>
        </div>

        <form @submit.prevent="submit" class="flex flex-col gap-5">
          <!-- Email -->
          <div>
            <div class="relative">
              <span class="pointer-events-none absolute top-0 bottom-0 left-0 flex items-center pl-4 text-orange-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-5"><path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H5.25a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H5.25a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
              <input
                id="email"
                v-model="email"
                type="email"
                required
                autocomplete="username"
                placeholder="Email"
                class="w-full rounded-xl border border-orange-200 bg-white py-3.5 pr-4 pl-12 text-sm text-gray-600 placeholder:text-gray-400 outline-none transition focus:border-orange-400 focus:ring-3 focus:ring-orange-400/35"
              />
            </div>
          </div>

          <!-- Password -->
          <div>
            <div class="relative">
              <span class="pointer-events-none absolute top-0 bottom-0 left-0 flex items-center pl-4 text-orange-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-5"><path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="Password"
                class="w-full rounded-xl border border-gray-200 bg-white py-3.5 pr-12 pl-12 text-sm text-gray-600 placeholder:text-gray-400 outline-none transition focus:border-orange-400 focus:ring-3 focus:ring-orange-400/35"
              />
              <button type="button" @click="showPassword = !showPassword" class="absolute top-0 bottom-0 right-0 flex items-center pr-4 text-gray-400 transition hover:text-gray-600" aria-label="Toggle password visibility">
                <svg v-if="showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-5"><path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.066 7.5a10.51 10.51 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243L9.88 9.88" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-5"><path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </div>

          <p v-if="auth.error" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">{{ auth.error }}</p>

          <button
            type="submit"
            :disabled="auth.loading"
            class="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-3.5 text-sm font-semibold text-white shadow-[0_4px_10px_rgba(251,146,60,0.35)] transition hover:brightness-95 active:scale-[0.99] disabled:opacity-60"
          >
            <span v-if="auth.loading" class="mx-auto flex items-center justify-center gap-2"><span class="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span> Signing in…</span>
            <span v-else>Sign In</span>
          </button>

          <p class="pt-1 text-center text-xs text-gray-400">HULAGWAY · Field Data Collection</p>
        </form>
      </div>
    </div>
  </div>
</template>

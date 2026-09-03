import { registerSW } from 'virtual:pwa-register'

export default function registerSw() {
  if ('serviceWorker' in navigator) {
    registerSW({ immediate: true })
  }
}

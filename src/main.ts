import { createApp } from 'vue'
import { createPinia } from 'pinia'
import registerSw from './registerSw'

import App from './App.vue'
import router from './router'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Never fail silently to a blank screen on phones: surface boot errors visibly.
app.config.errorHandler = (err) => {
  // eslint-disable-next-line no-console
  console.error('[hulagway] app error:', err)
}

try {
  app.mount('#app')
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('[hulagway] mount failed:', err)
  const fallback = document.getElementById('boot-fallback')
  if (fallback) {
    fallback.innerHTML =
      '<div style="font-weight:800;letter-spacing:0.1em;font-size:20px;">HULAGWAY</div>' +
      '<div style="font-size:13px;max-width:320px;">App failed to start. Pull-to-refresh once — if this persists, remove the installed app, clear browser site data for this site, then reinstall.</div>'
  }
}

registerSw()

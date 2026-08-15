import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `host: true` binds the dev server to every interface, not just localhost, so a
// phone on the same wifi can load it. Needed for anything that only reproduces on
// a real device — iOS keyboard focus, PWA install, touch handling. Dev-only;
// `vite build` ignores this block.
export default defineConfig({
  plugins: [react()],
  server: { host: true },
})

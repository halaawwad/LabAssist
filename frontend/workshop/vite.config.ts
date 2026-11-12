import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Workshop Manager portal: its own app and port, isolated from the Student and Supervisor apps.
export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5175, strictPort: true },
  preview: { port: 4175 },
})

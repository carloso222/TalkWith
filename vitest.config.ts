import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Pruebas unitarias y de componentes. Las pruebas de reglas viven en pruebas/ (TW 04).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
})

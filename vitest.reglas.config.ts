import { defineConfig } from 'vitest/config'

// Pruebas de reglas de Firestore y Storage; corren dentro de `firebase emulators:exec`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['pruebas/reglas/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
  },
})

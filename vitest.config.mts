import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["test/setup-fake-indexeddb.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./")
    }
  }
})
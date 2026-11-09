import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    restoreMocks: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        'src/utils/**/*.ts': {
          statements: 72,
          branches: 70,
          functions: 70,
          lines: 75,
        },
        'src/hooks/**/*.ts': {
          statements: 30,
          branches: 25,
          functions: 25,
          lines: 30,
        },
        'src/components/ui/**/*.tsx': {
          statements: 16,
          branches: 10,
          functions: 16,
          lines: 18,
        },
        'src/features/*/domain/**/*.ts': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 95,
        },
        'src/features/*/application/**/*.ts': {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The buffer/replay logic is pure (no DOM), so the lighter node env is enough.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

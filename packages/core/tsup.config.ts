import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'all-types': 'src/all-types.ts',
    'crypto/index': 'src/crypto/index.ts',
    'adapters/index': 'src/adapters/index.ts',
    'types-v2': 'src/types-v2.ts',
    'personality-prompt': 'src/personality-prompt.ts'
  },
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  target: 'es2022'
})

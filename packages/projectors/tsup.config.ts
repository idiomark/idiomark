import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'mcp/index': 'src/mcp/index.ts',
    'ucp/index': 'src/ucp/index.ts',
    'http/index': 'src/http/index.ts',
    'gaming/index': 'src/gaming/index.ts'
  },
  format: ['esm'],
  // NOTE: DTS disabled temporarily due to pre-existing @idiomark/core type declaration issues
  // Re-enable once core package generator.ts errors are resolved
  dts: false,
  clean: true,
  sourcemap: true,
  external: ['@idiomark/core', '@idiomark/inference']
})

import dts from 'vite-plugin-dts'
import { defineConfig } from 'vitest/config'
import { name, peerDependencies } from './package.json'

export default defineConfig({
    build: {
        lib: {
            entry: './src/index.ts', // Specifies the entry point for building the library.
            name, // Sets the name of the generated library.
            fileName: (format) => `index.${format}.js`, // Generates the output file name based on the format.
            formats: ['cjs', 'es'], // Specifies the output formats (CommonJS and ES modules).
        },
        rollupOptions: {
            external: [...Object.keys(peerDependencies)], // Defines external dependencies for Rollup bundling.
        },
        sourcemap: true, // Generates source maps for debugging.
    },
    plugins: [dts()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: 'setupTests.ts',
    },
})

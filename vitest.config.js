import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: [],
        testTimeout: 5000,
        hookTimeout: 5000,
        teardownTimeout: 3000,
        isolate: true,
        threads: true,
        maxThreads: 1,
        minThreads: 1,
        exclude: ['e2e.spec.js', 'node_modules'],
    },
});

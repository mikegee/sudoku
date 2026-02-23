import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './',
    testMatch: 'e2e.spec.js',
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
    },
    use: {
        baseURL: 'http://localhost:5173',
    },
    timeout: 10000,
});
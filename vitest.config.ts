import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/**/compiler.test.ts'],
        reporters: ['verbose'],
    },
});

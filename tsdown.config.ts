import { defineConfig, type UserConfig } from 'tsdown';

const entries = [
    { name: 'compiler', input: './packages/core/compiler.ts', format: 'esm' },
    { name: 'vite', input: './packages/vite/index.ts', format: 'esm' },
    { name: 'volar', input: './packages/volar/index.ts', format: 'cjs' },
] as const;

export default defineConfig(
    entries.map(({ name, input, format }): UserConfig => ({
        entry: { [name]: input },
        format,
        outDir: './dist',
        dts: true,
        outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
        deps: {
            neverBundle: [
                'vite',
                'vue',
                '@vue/compiler-sfc',
                '@vue/language-core'
            ]
        }
    }))
);

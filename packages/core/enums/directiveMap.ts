import type { DirectiveMapConfig } from '../types.ts';

export const DIRECTIVE_MAP_ENUM = {
    if: { directive: 'v-if', extras: {} },
    else: { directive: 'v-else', extras: {} },
    'else-if': { directive: 'v-else-if', extras: {} },
    for: {
        directive: 'v-for',
        extras: {
            key: { transform: null },
            ':key': { transform: null },
            memo: { transform: 'v-memo' },
            ':memo': { transform: 'v-memo' },
        },
    },
    show: { directive: 'v-show', extras: {} },
    cloak: { directive: 'v-cloak', extras: {}, noValue: true },
    text: { directive: 'v-text', extras: {} },
    html: { directive: 'v-html', extras: {} },
    once: { directive: 'v-once', extras: {}, noValue: true },
    memo: { directive: 'v-memo', extras: {} },
    pre: { directive: 'v-pre', extras: {}, noValue: true },
} as const satisfies Record<string, DirectiveMapConfig>;

Object.freeze(DIRECTIVE_MAP_ENUM);

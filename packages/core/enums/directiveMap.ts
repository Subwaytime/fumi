export const DIRECTIVE_MAP_ENUM = {
    if: { directive: 'v-if', extras: [] },
    else: { directive: 'v-else', extras: [] },
    'else-if': { directive: 'v-else-if', extras: [] },
    for: { directive: 'v-for', extras: ['key', ':key', 'memo', ':memo'] },
    show: { directive: 'v-show', extras: [] },
    cloak: { directive: 'v-cloak', extras: [], boolean: true },
    text: { directive: 'v-text', extras: [] },
    html: { directive: 'v-html', extras: [] },
    once: { directive: 'v-once', extras: [], boolean: true },
    memo: { directive: 'v-memo', extras: [] },
    pre: { directive: 'v-pre', extras: [], boolean: true },
} as const;

Object.freeze(DIRECTIVE_MAP_ENUM);

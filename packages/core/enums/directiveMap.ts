export const DIRECTIVE_MAP_ENUM = {
    if: { directive: 'v-if', extras: [] },
    else: { directive: 'v-else', extras: [] },
    'else-if': { directive: 'v-else-if', extras: [] },
    for: { directive: 'v-for', extras: ['key', ':key', 'memo', ':memo'] },
    show: { directive: 'v-show', extras: [] },
    cloak: { directive: 'v-cloak', extras: [] },
    once: { directive: 'v-once', extras: [] },
    memo: { directive: 'v-memo', extras: [] },
    pre: { directive: 'v-pre', extras: [] },
} as const;

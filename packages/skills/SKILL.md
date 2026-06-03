---
name: fumi
description: Fumi template language for Vue 3 — block syntax, parser, compiler, Vite plugin, Volar plugin, and testing
metadata:
  version: "1.0.0"
---

# Fumi

> A lightweight template language for Vue 3 that compiles `{% ... %}` blocks to standard Vue directives at build time with zero runtime overhead.

## Usage

Set `lang="fumi"` on `<template>` in any Vue SFC — that's all end users need.

```vue
<template lang="fumi">
  {% if showList %}
    <ul>
      {% for item in items :key="item.id" %}
        <li>{{ item.name }}</li>
      {% endfor %}
    </ul>
  {% endif %}
</template>
```

### Setup

```ts
// vite.config.ts
import { fumi } from '@subwaytime/fumi/vite'

export default defineConfig({
  plugins: [fumi(), vue()]
})
```

```jsonc
// tsconfig.json
{
  "vueCompilerOptions": {
    "plugins": ["@subwaytime/fumi/volar"]
  }
}
```

## Directives

| Fumi Block | Compiles To | Notes |
|---|---|---|
| `{% if expr %}...{% endif %}` | `v-if="expr"` | Supports `!`, `&&`, `===`, `>`, `??`, `.length` |
| `{% else %}` | `v-else="true"` | Must follow `{% if %}` or `{% else-if %}` |
| `{% else-if expr %}` | `v-else-if="expr"` | |
| `{% for item in items %}...{% endfor %}` | `v-for="item in items"` | Supports `:key`, `:memo` extras |
| `{% show expr %}...{% endshow %}` | `v-show="expr"` | |
| `{% cloak %}...{% endcloak %}` | `v-cloak` | No expression |
| `{% once %}...{% endonce %}` | `v-once` | No expression |
| `{% pre %}...{% endpre %}` | `v-pre` | No expression |
| `{% text expr %}...{% endtext %}` | `v-text="expr"` | |
| `{% html expr %}...{% endhtml %}` | `v-html="expr"` | |
| `{% memo expr %}...{% endmemo %}` | `v-memo="expr"` | |

### For Loop with Extras

```fumi
{% for (product, index) in products :key="product.id" :memo="[product.price]" %}
  <div>{{ product.name }}</div>
{% endfor %}
```

- `:key` → `:key` attribute on the element
- `key` (no colon) → `key` attribute (static)
- `:memo` or `memo` → `v-memo` attribute

### Inlining

```fumi
{% if user %}<div>Hello</div>{% endif %}
<!-- compiles to: <div v-if="user">Hello</div> -->

{% if user %}<div>One</div><div>Two</div>{% endif %}
<!-- compiles to: <template v-if="user"><div>One</div><div>Two</div></template> -->
```

### Variable Interpolation

Same as Vue: `{{ expression }}` — variables inside `{% for %}` classified as `loop_variable`, outside as `standalone`.

## Preferences

- Prefer TypeScript over JavaScript
- Use `lang="fumi"` on `<template>` in Vue SFCs
- Always use lowercase block names: `{% if %}`, `{% for %}`, `{% endif %}`, `{% endfor %}`
- Single child inside a directive block → inline directive onto that element
- Multiple children → wrap in `<template>` with the directive

## Testing

- Framework: **Vitest**
- `parse(input)` — returns AST; assert with `toEqual` / `stringContaining`
- `handle(input)` — returns `{ code, mappings }`; assert with `.code`
- Source mapping tests use `@volar/source-map`
- End-to-end example fixture: `tests/examples/` with `.input.fumi`, `.output.vue`, `.ast.json`
- Test files: `tests/compiler/` (directives, if, for, nesting, inlining, edge cases), `tests/volar.test.ts`

## Architecture

The core API (`parse`, `handle`) is for tooling authors building Vite/Volar plugins. End users never import it directly.

| Component | Role | Reference |
|-----------|------|-----------|
| Parser | `parse(input)` — char-code iteration, dispatches via `matchType` | `packages/core/parse.ts`, `packages/core/compiler.ts` |
| Generator | AST → Vue HTML with source mappings, handles inlining and `<template>` wrapping | `packages/core/generator.ts` |
| Handle | `handle(input)` — parse then generate | `packages/core/handle.ts` |
| Types | `Node`, `Expression`, `Mapping` and other AST types | `packages/core/types.ts` |
| Vite Plugin | Pre-plugin that intercepts `lang="fumi"` templates | `packages/vite/index.ts` |
| Volar Plugin | IDE integration: hover, autocomplete, go-to-definition via offset remapping | `packages/volar/index.ts` |
| Editor | TextMate grammar for VS Code syntax highlighting | `packages/editor/syntaxes/fumi.tmLanguage.json` |

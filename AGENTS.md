# Fumi Language Guide for AI Agents

This project uses **Fumi** — a lightweight template language for Vue 3 that compiles to standard Vue directives at build time with zero runtime overhead.

## Block Syntax

Fumi uses `{% ... %}` blocks that map to Vue directives:

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

## Template Declaration

Use `lang="fumi"` on the `<template>` tag in Vue SFCs:

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

## Inlining Rules

- **Single child** inside a directive block → the directive is inlined onto that element.
- **Multiple children** → wrapped in `<template>` with the directive.

```fumi
{% if user %}<div>Hello</div>{% endif %}
<!-- compiles to: <div v-if="user">Hello</div> -->

{% if user %}<div>One</div><div>Two</div>{% endif %}
<!-- compiles to: <template v-if="user"><div>One</div><div>Two</div></template> -->
```

## For Loops

Destructuring and extras use comma-separated syntax:

```fumi
{% for (product, index) in products :key="product.id" :memo="[product.price]" %}
  <div>{{ product.name }}</div>
{% endfor %}
```

- `:key` → `:key` attribute on the element
- `key` (no colon) → `key` attribute (static)
- `:memo` or `memo` → `v-memo` attribute

## Variable Interpolation

Same as Vue: `{{ expression }}`

Variables inside `{% for %}` loops are classified as `loop_variable`; outside as `standalone`.

## Setup
Requires vite+volar to function properly.

**Vite config:**
```ts
import { fumi } from '@subwaytime/fumi/vite';
// add before vue(): fumi()
```

**Volar config** in `tsconfig.json`:
```json
{ "vueCompilerOptions": { "plugins": ["@subwaytime/fumi/volar"] } }
```

## Testing

Tests use **Vitest**
- `parse(input)` — returns AST
- `handle(input)` — returns `{ code: string, mappings: any[] }`
- Use `stringContaining` / `toEqual` for AST assertions
- Use `.code` for compiled output assertions
- Source mapping tests use `@volar/source-map`

## Project Structure

- `packages/core/` — parser (`parse.ts`), compiler (`handle.ts`), types
- `packages/vite/` — Vite plugin
- `packages/volar/` — Volar language plugin
- `packages/editor/` — Editor support
- `tests/compiler/` — Directive, if, for, nesting, inlining, edge case tests
- `tests/examples/` — End-to-end example with `.input.fumi`, `.output.vue`, `.ast.json`

## Key Conventions

- All blocks are lowercase: `{% if %}`, `{% for %}`, `{% endif %}`, `{% endfor %}`
- Whitespace inside `{% %}` is recommended: however without a space `{%if foo%}` is also valid
- HTML attributes work as expected: `<div class="foo">`
- Standard Vue directives like `v-if`, `v-show` can coexist on elements alongside compiled Fumi directives

<h2 align="left">Fumi</h2>

<p align="left">
A lightweight, intuitive template language for Vue 3. Write cleaner templates with `{%` blocks that compile to standard Vue directives — zero runtime overhead, full IDE support.
</p>

## Features

• ⚡ **Zero Runtime** — Compiles to Vue directives at build time. No client JS added.
<br />
• 💚 **Vue Native** — All Vue Directives supported - `v-if`, `v-for`, `v-show` etc.
<br />
• 🔥 **Easy setup** — Drop-in Vite & Volar. Set `lang="fumi"` and start writing.
<br />
• 🧠 **IDE Ready** — Hover, autocomplete, go-to-definition, and `vue-tsc` via Volar.
<br />
• 📍 **Source Mapped** — Errors and IDE features map back to exact Fumi source lines.
<br />
• 🛠️ **Zero Config** — Sensible defaults. No setup files needed.
<br />
• 🎨 **Simple Syntax** — `{% ... %}` Readable block-style directives.

## Installation

```bash
npm install @subwaytime/fumi
# or
pnpm add @subwaytime/fumi
# or
yarn add @subwaytime/fumi
# or
bun add @subwaytime/fumi
```

## Getting Started

### 1. Configure Vite

Add the Fumi Vite to your `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fumi } from '@subwaytime/fumi/vite';

export default defineConfig({
  plugins: [
    fumi(),
    vue(),
  ],
});
```

### 2. Configure Volar (IDE + Type-Checking)

Add the Fumi Volar plugin to your `tsconfig.json`:

```json
{
  "vueCompilerOptions": {
    "plugins": [
      "@subwaytime/fumi/volar"
    ]
  }
}
```

This enables:
- **Syntax highlighting** for Fumi templates
- **Hover info** on directives and variables
- **Autocompletion** for expressions
- **Go-to-definition** mapped to your source
- **`vue-tsc` type-checking** with accurate error positions

### 3. Write Fumi Templates

Use `lang="fumi"` in your Vue SFC:

```vue
<template lang="fumi">
  {% if showList %}
    <ul>
      {% for item in items :key="item.id" %}
        <li>{{ item.name }}</li>
      {% endfor %}
    </ul>
  {% else %}
    <p>No items available</p>
  {% endif %}
</template>

<script setup>
const items = [
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Banana' },
];
const showList = true;
</script>
```

This compiles to:

```html
<template>
  <ul v-if="showList">
    <li v-for="item in items" :key="item.id">{{ item.name }}</li>
  </ul>
  <p v-else="true">No items available</p>
</template>
```

## Usage

### Conditionals

```fumi
{% if user %}
  <p>Welcome, {{ user.name }}!</p>
{% else-if guest %}
  <p>Welcome, guest!</p>
{% else %}
  <p>Please log in.</p>
{% endif %}
```

### Loops

```fumi
{% for item in items :key="item.id" %}
  <div>{{ item.title }}</div>
{% endfor %}
```

With destructuring and `v-memo`:

```fumi
{% for (product, index) in products :key="product.id" :memo="[product.price]" %}
  <div>{{ product.name }}</div>
{% endfor %}
```

### Visibility

```fumi
{% show isVisible %}
  <div>This is conditionally shown</div>
{% endshow %}
```

### One-time Render

```fumi
{% once %}
  <div>Rendered once, never updated</div>
{% endonce %}
```

### Raw HTML

```fumi
{% html rawContent %}
  <div>Placeholder</div>
{% endhtml %}
```

## Directive Checklist

| Fumi Block | Vue Directive | Syntax Highlighting | Intellisense | Notes |
|-----------|---------------|---------------------|--------------|-------|
| `{% if %}` | `v-if` | ✅ | ✅ | Supports `!`, `&&`, `===`, `>`, `??`, `.length` etc |
| `{% else %}` | `v-else` | ✅ | ✅ | — |
| `{% else-if %}` | `v-else-if` | ✅ | ✅ | — |
| `{% for %}` | `v-for` | ✅ | ✅ | Supports destructuring `(item, index)` |
| for-`:key` extra | `:key` | ✅ | ✅ | Loop key binding |
| for-`:memo` extra | `v-memo` | ✅ | ✅ | Loop memoization |
| `{% show %}` | `v-show` | ✅ | ✅ | — |
| `{% cloak %}` | `v-cloak` | ✅ | ✅ | — |
| `{% once %}` | `v-once` | ✅ | ✅ | — |
| `{% pre %}` | `v-pre` | ✅ | ✅ | — |
| `{% text %}` | `v-text` | ✅ | ✅ | — |
| `{% html %}` | `v-html` | ✅ | ✅ | — |
| `{% memo %}` | `v-memo` | ✅ | ✅ | Standalone |
| `{{ expr }}` | — | ✅ | ✅ | Variable interpolation |

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build distribution
bun bundle
```

## License

MIT License © 2026-PRESENT [Leon Langer](https://github.com/subwaytime)

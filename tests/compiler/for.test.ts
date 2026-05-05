import { describe, it, expect } from 'vitest';
import { handle } from '../../packages/core/index';

describe('v-for generation', () => {
    it('should convert v-for directive', () => {
        const result = handle('{% for item in items %}<div>{{ item }}</div>{% endfor %}').code;
        expect(result).toBe('<div v-for="item in items">{{ item }}</div>');
    });

    it('should handle for with destructured (box, index)', () => {
        const result = handle('{%for (box, box_index) in boxes%}<div>{{ box }}</div>{%endfor%}').code;
        expect(result).toBe('<div v-for="(box, box_index) in boxes">{{ box }}</div>');
    });

    it('should handle for with key extra', () => {
        const result = handle('{%for item in items, key="item.id"%}<div>{{ item }}</div>{%endfor%}').code;
        expect(result).toBe('<div v-for="item in items" key="item.id">{{ item }}</div>');
    });

    it('should handle for with :key extra (dynamic)', () => {
        const result = handle('{%for item in items, :key="item.id"%}<div>{{ item }}</div>{%endfor%}').code;
        expect(result).toBe('<div v-for="item in items" :key="item.id">{{ item }}</div>');
    });

    it('should handle for with :key with escaped variables', () => {
        const result = handle('{%for item in items, :key="item-key-`${item.id}`"%}<div>{{ item }}</div>{%endfor%}').code;
        expect(result).toBe('<div v-for="item in items" :key="item-key-`${item.id}`">{{ item }}</div>');
    });

    it('should handle for with :memo extra', () => {
        const result = handle('{%for item in items, :memo="item.name"%}<div>{{ item }}</div>{%endfor%}').code;
        expect(result).toBe('<div v-for="item in items" v-memo="item.name">{{ item }}</div>');
    });

    it('should handle for with memo extra (no colon)', () => {
        const result = handle('{%for item in items, memo="item.name"%}<div>{{ item }}</div>{%endfor%}').code;
        expect(result).toBe('<div v-for="item in items" v-memo="item.name">{{ item }}</div>');
    });

    it('should handle for with both key and :key extras', () => {
        const result = handle('{%for item in items, key="item.id", :key="item.name"%}<div>{{ item }}</div>{%endfor%}').code;
        expect(result).toBe('<div v-for="item in items" key="item.id">{{ item }}</div>');
    });

    it('should handle for with destructured vars and :key extra', () => {
        const result = handle('{%for (item, idx) in items, :key="idx"%}<div>{{ item }}</div>{%endfor%}').code;
        expect(result).toBe('<div v-for="(item, idx) in items" :key="idx">{{ item }}</div>');
    });
});

describe('v-for edge cases', () => {
    it('should handle empty for loop body', () => {
        const result = handle('{%for item in items%}{%endfor%}').code;
        expect(result).toBe('<template v-for="item in items"></template>');
    });

    it('should handle for with multiple children containing text', () => {
        const result = handle('{% for item in items %}{{ item }} text {{ item }}{% endfor %}').code;
        expect(result).toBe('<template v-for="item in items">{{ item }} text {{ item }}</template>');
    });

    it('should handle variable with dot access inside for loop', () => {
        const result = handle('{% for user in users %}{{ user.name }}{% endfor %}').code;
        expect(result).toBe('<template v-for="user in users">{{ user.name }}</template>');
    });

    it('should handle for with :key and multiple children (wrapped)', () => {
        const result = handle('{%for item in items, :key="item.id"%}<div>{{ item }}</div><span>{{ item }}</span>{%endfor%}').code;
        expect(result).toBe('<template v-for="item in items" :key="item.id"><div>{{ item }}</div><span>{{ item }}</span></template>');
    });
});

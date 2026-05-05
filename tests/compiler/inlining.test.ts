import { describe, it, expect } from 'vitest';
import { handle } from '../../packages/core/index';

describe('inlining behavior', () => {
    it('should inline {% if %} with single child', () => {
        const result = handle('{% if user %}<div>Hello</div>{% endif %}').code;
        expect(result).toBe('<div v-if="user">Hello</div>');
    });

    it('should wrap {% if %} with multiple children', () => {
        const result = handle('{% if user %}<div>One</div><div>Two</div>{% endif %}').code;
        expect(result).toBe('<template v-if="user"><div>One</div><div>Two</div></template>');
    });

    it('should inline {% for %} with single child', () => {
        const result = handle('{% for item in items %}<span>{{ item }}</span>{% endfor %}').code;
        expect(result).toBe('<span v-for="item in items">{{ item }}</span>');
    });

    it('should wrap {% for %} with multiple children', () => {
        const result = handle('{% for item in items %}<div>{{ item }}</div><span>{{ item }}</span>{% endfor %}').code;
        expect(result).toBe('<template v-for="item in items"><div>{{ item }}</div><span>{{ item }}</span></template>');
    });

    it('should inline {% show %} with single child', () => {
        const result = handle('{% show user %}<div>Hidden</div>{% endshow %}').code;
        expect(result).toBe('<div v-show="user">Hidden</div>');
    });

    it('should inline {% cloak %} with single child', () => {
        const result = handle('{% cloak %}<div>Cloaked</div>{% endcloak %}').code;
        expect(result).toBe('<div v-cloak>Cloaked</div>');
    });
});

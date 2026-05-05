import { describe, it, expect } from 'vitest';
import { handle } from '../../packages/core/index';

describe('nested directives', () => {
    it('should handle nested if directives', () => {
        const result = handle('{% if outer %}{% if inner %}<span>Nested</span>{% endif %}{% endif %}').code;
        expect(result).toBe('<template v-if="outer"><span v-if="inner">Nested</span></template>');
    });

    it('should handle {% if %} with inlined {% for %}', () => {
        const result = handle('{% if users %}{% for user in users %}<li>{{ user.name }}</li>{% endfor %}{% endif %}').code;
        expect(result).toBe('<li v-if="users" v-for="user in users">{{ user.name }}</li>');
    });

    it('should handle if with for inside (both inlined)', () => {
        const result = handle('{%if test%}{%for ball in balls%}<div>{{ ball }}</div>{%endfor%}{%endif%}').code;
        expect(result).toBe('<div v-if="test" v-for="ball in balls">{{ ball }}</div>');
    });
});

describe('if/else combinations', () => {
    it('should convert {% if %} with {% else %} (both inlined)', () => {
        const result = handle('{% if user %}<div>Yes</div>{% else %}<div>No</div>{% endif %}').code;
        expect(result).toBe('<div v-if="user">Yes</div><div v-else="true">No</div>');
    });

    it('should convert {% if %} with {% else-if %} (all inlined)', () => {
        const result = handle('{% if user %}<div>User</div>{% else-if admin %}<div>Admin</div>{% endif %}').code;
        expect(result).toBe('<div v-if="user">User</div><div v-else-if="admin">Admin</div>');
    });

    it('should wrap else branch with multiple children', () => {
        const result = handle('{% if a %}<span>A</span>{% else %}<div>B</div><span>C</span>{% endif %}').code;
        expect(result).toBe('<span v-if="a">A</span><template v-else="true"><div>B</div><span>C</span></template>');
    });

    it('should wrap else-if branch with multiple children', () => {
        const result = handle('{% if a %}<span>A</span>{% else-if b %}<div>B</div><span>C</span>{% endif %}').code;
        expect(result).toBe('<span v-if="a">A</span><template v-else-if="b"><div>B</div><span>C</span></template>');
    });
});

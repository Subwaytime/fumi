import { describe, it, expect } from 'vitest';
import { handle } from '../../packages/core/index';

describe('v-if generation', () => {
    it('should convert v-if directive', () => {
        const result = handle('{% if show %}<div>Content</div>{% endif %}').code;
        expect(result).toBe('<div v-if="show">Content</div>');
    });

    it('should convert v-else directive', () => {
        const result = handle('{% if a %}<div>A</div>{% else %}<div>B</div>{% endif %}').code;
        expect(result).toBe('<div v-if="a">A</div><div v-else="true">B</div>');
    });

    it('should convert v-else-if directive', () => {
        const result = handle('{% if a %}<div>A</div>{% else-if b %}<div>B</div>{% endif %}').code;
        expect(result).toBe('<div v-if="a">A</div><div v-else-if="b">B</div>');
    });

    it('should handle if-else-if-else chain', () => {
        const result = handle('{%if king%}dom{%else-if lord%}Yuhu{%else%}hearts{%endif%}').code;
        expect(result).toBe('<template v-if="king">dom</template><template v-else-if="lord">Yuhu</template><template v-else="true">hearts</template>');
    });

    it('should handle empty if with else (separate templates)', () => {
        const result = handle('{%if empty%}{%else%}Fallback{%endif%}').code;
        expect(result).toBe('<template v-if="empty"></template><template v-else="true">Fallback</template>');
    });
});

describe('v-if operators', () => {
    it('should handle negation operator', () => {
        const result = handle('{% if !user %}<span>Not user</span>{% endif %}').code;
        expect(result).toBe('<span v-if="!user">Not user</span>');
    });

    it('should handle strict equality with single quotes', () => {
        const result = handle("{% if text === 'Klas' %}<span>Is Klas</span>{% endif %}").code;
        expect(result).toBe('<span v-if="text === \'Klas\'">Is Klas</span>');
    });

    it('should handle strict equality with double quotes (switches to single quotes)', () => {
        const result = handle('{% if text === "Klas" %}<span>Is Klas</span>{% endif %}').code;
        expect(result).toBe('<span v-if=\'text === "Klas"\'>Is Klas</span>');
    });

    it('should handle nullish coalescing operator', () => {
        const result = handle('{% if text ?? user %}<span>Nullish</span>{% endif %}').code;
        expect(result).toBe('<span v-if="text ?? user">Nullish</span>');
    });

    it('should handle greater-than operator', () => {
        const result = handle('{% if count > 5 %}<span>Greater</span>{% endif %}').code;
        expect(result).toBe('<span v-if="count > 5">Greater</span>');
    });

    it('should handle property access with comparison', () => {
        const result = handle('{% if items.length > 0 %}<span>Has items</span>{% endif %}').code;
        expect(result).toBe('<span v-if="items.length > 0">Has items</span>');
    });

    it('should handle logical AND operator', () => {
        const result = handle('{% if user && text %}<span>Both</span>{% endif %}').code;
        expect(result).toBe('<span v-if="user && text">Both</span>');
    });
});

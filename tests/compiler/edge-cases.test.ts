import { describe, it, expect } from 'vitest';
import { handle } from '../../packages/core/index';

describe('edge cases', () => {
    it('should handle show with expression', () => {
        const result = handle('{%show test%}<div>Show</div>{%endshow%}').code;
        expect(result).toBe('<div v-show="test">Show</div>');
    });

    it('should handle cloak without expression (inlined)', () => {
        const result = handle('{%cloak%}<span>Cloak</span>{%endcloak%}').code;
        expect(result).toBe('<span v-cloak>Cloak</span>');
    });

    it('should handle consecutive ifs', () => {
        const result = handle('{%if a%}A{%endif%}{%if b%}B{%endif%}').code;
        expect(result).toBe('<template v-if="a">A</template><template v-if="b">B</template>');
    });

    it('should handle deeply nested ifs', () => {
        const result = handle('{%if A%}{%if B%}{%if C%}Deep{%endif%}{%endif%}{%endif%}').code;
        expect(result).toBe('<template v-if="A"><template v-if="B"><template v-if="C">Deep</template></template></template>');
    });

    it('should handle self-closing tag in if', () => {
        const result = handle('{%if selfClosing%}<img src="x" />{%endif%}').code;
        expect(result).toBe('<img v-if="selfClosing" src="x" />');
    });

    it('should handle comment in if', () => {
        const result = handle('{%if comment%}<!-- comment -->Text{%endif%}').code;
        expect(result).toBe('<template v-if="comment"><!-- comment -->Text</template>');
    });

    it('should handle mixed content', () => {
        const result = handle('Hello {% if show %}{{ name }}{% endif %}!').code;
        expect(result).toBe('Hello <template v-if="show">{{ name }}</template>!');
    });

    it('should wrap when v-if and v-show would conflict', () => {
        const result = handle('{%if foo%}<div v-show="bar">Test</div>{%endif%}').code;
        expect(result).toBe('<template v-if="foo"><div v-show="bar">Test</div></template>');
    });
});

describe('error handling', () => {
    it('should throw on mismatched closing tag', () => {
        expect(() => handle('<div>Hello</span>')).toThrow();
    });

    it('should handle unclosed directive gracefully', () => {
        const result = handle('{%if foo%}<div>Test</div>');
        expect(result.code).toBe('');
    });

    it('should throw when v-else without v-if', () => {
        expect(() => handle('{%else%}<div>Test</div>')).toThrow();
    });

    it('should throw when v-else-if without v-if', () => {
        expect(() => handle('{%else-if foo%}<div>Test</div>')).toThrow();
    });

    it('should throw when duplicate v-else', () => {
        expect(() => handle('{%if a%}A{%else%}B{%else%}C{%endif%}')).toThrow();
    });

    it('should throw when v-else-if after v-else', () => {
        expect(() => handle('{%if a%}A{%else%}B{%else-if b%}C{%endif%}')).toThrow();
    });

    it('should handle empty template', () => {
        const result = handle('');
        expect(result.code).toBe('');
    });

    it('should handle template with only whitespace', () => {
        const result = handle('   ');
        expect(result.code).toBe('   ');
    });
});

import { describe, it, expect } from 'vitest';
import { parse, transformNode, fumiToVue } from '../src/compiler';

describe('fumiToVue - basic HTML', () => {
    it('should convert simple text', () => {
        const result = fumiToVue('Hello world').htmlCode;
        expect(result).toBe('Hello world');
    });

    it('should convert HTML tags', () => {
        const result = fumiToVue('<div>Hello</div>').htmlCode;
        expect(result).toBe('<div>Hello</div>');
    });

    it('should convert variable interpolation', () => {
        const result = fumiToVue('Hello {{ name }}!').htmlCode;
        expect(result).toBe('Hello {{ name }}!');
    });

    it('should handle HTML attributes', () => {
        const result = fumiToVue('<div class="foo" id="bar">Hello</div>').htmlCode;
        expect(result).toBe('<div class="foo" id="bar">Hello</div>');
    });

    it('should handle self-closing tags', () => {
        const result = fumiToVue('<input type="text" />').htmlCode;
        expect(result).toBe('<input type="text" />');
    });

    it('should handle comments', () => {
        const result = fumiToVue('<!-- This is a comment --><div>Hello</div>').htmlCode;
        expect(result).toBe('<!---- This is a comment --><div>Hello</div>');
    });
});

describe('fumiToVue - directive blocks', () => {
    it('should convert v-text directive', () => {
        const result = fumiToVue('{% text name %}<span>Old</span>{% endtext %}').htmlCode;
        expect(result).toBe('<span v-text="name">Old</span>');
    });

    it('should convert v-html directive', () => {
        const result = fumiToVue('{% html rawHtml %}<span>Old</span>{% endhtml %}').htmlCode;
        expect(result).toBe('<span v-html="rawHtml">Old</span>');
    });

    it('should convert v-memo directive', () => {
        const result = fumiToVue('{% memo [name] %}<div>Content</div>{% endmemo %}').htmlCode;
        expect(result).toBe('<div v-memo="[name]">Content</div>');
    });

    it('should convert v-pre directive', () => {
        const result = fumiToVue('{% pre %}<span>Raw</span>{% endpre %}').htmlCode;
        expect(result).toBe('<span v-pre>Raw</span>');
    });

    it('should convert v-once directive', () => {
        const result = fumiToVue('{% once %}<div>Once</div>{% endonce %}').htmlCode;
        expect(result).toBe('<div v-once>Once</div>');
    });

    it('should convert v-show directive', () => {
        const result = fumiToVue('{% show visible %}<div>Content</div>{% endshow %}').htmlCode;
        expect(result).toBe('<div v-show="visible">Content</div>');
    });

    it('should convert v-cloak directive', () => {
        const result = fumiToVue('{% cloak %}<div>Content</div>{% endcloak %}').htmlCode;
        expect(result).toBe('<div v-cloak>Content</div>');
    });
});

describe('fumiToVue - v-if directives', () => {
    it('should convert v-if directive', () => {
        const result = fumiToVue('{% if show %}<div>Content</div>{% endif %}').htmlCode;
        expect(result).toBe('<div v-if="show">Content</div>');
    });

    it('should convert v-else directive', () => {
        const result = fumiToVue('{% if a %}<div>A</div>{% else %}<div>B</div>{% endif %}').htmlCode;
        expect(result).toBe('<div v-if="a">A</div><div v-else="true">B</div>');
    });

    it('should convert v-else-if directive', () => {
        const result = fumiToVue('{% if a %}<div>A</div>{% else-if b %}<div>B</div>{% endif %}').htmlCode;
        expect(result).toBe('<div v-if="a">A</div><div v-else-if="b">B</div>');
    });

    it('should handle if-else-if-else chain', () => {
        const result = fumiToVue('{%if king%}dom{%else-if lord%}Yuhu{%else%}hearts{%endif%}').htmlCode;
        expect(result).toBe('<template v-if="king">dom</template><template v-else-if="lord">Yuhu</template><template v-else="true">hearts</template>');
    });

    it('should handle empty if with else (separate templates)', () => {
        const result = fumiToVue('{%if empty%}{%else%}Fallback{%endif%}').htmlCode;
        expect(result).toBe('<template v-if="empty"></template><template v-else="true">Fallback</template>');
    });
});

describe('fumiToVue - v-for directives', () => {
    it('should convert v-for directive', () => {
        const result = fumiToVue('{% for item in items %}<div>{{ item }}</div>{% endfor %}').htmlCode;
        expect(result).toBe('<div v-for="item in items">{{ item }}</div>');
    });

    it('should handle for with destructured (box, index)', () => {
        const result = fumiToVue('{%for (box, box_index) in boxes%}<div>{{ box }}</div>{%endfor%}').htmlCode;
        expect(result).toBe('<div v-for="(box, box_index) in boxes">{{ box }}</div>');
    });

    it('should handle for with key extra', () => {
        const result = fumiToVue('{%for item in items, key="item.id"%}<div>{{ item }}</div>{%endfor%}').htmlCode;
        expect(result).toBe('<div v-for="item in items" key="item.id">{{ item }}</div>');
    });

    it('should handle for with :key extra (dynamic)', () => {
        const result = fumiToVue('{%for item in items, :key="item.id"%}<div>{{ item }}</div>{%endfor%}').htmlCode;
        expect(result).toBe('<div v-for="item in items" :key="item.id">{{ item }}</div>');
    });

    it('should handle for with :key with escaped variables', () => {
        const result = fumiToVue('{%for item in items, :key="item-key-`${item.id}`"%}<div>{{ item }}</div>{%endfor%}').htmlCode;
        expect(result).toBe('<div v-for="item in items" :key="item-key-`${item.id}`">{{ item }}</div>');
    });

    it('should handle for with :memo extra', () => {
        const result = fumiToVue('{%for item in items, :memo="item.name"%}<div>{{ item }}</div>{%endfor%}').htmlCode;
        expect(result).toBe('<div v-for="item in items" v-memo="item.name">{{ item }}</div>');
    });

    it('should handle for with memo extra (no colon)', () => {
        const result = fumiToVue('{%for item in items, memo="item.name"%}<div>{{ item }}</div>{%endfor%}').htmlCode;
        expect(result).toBe('<div v-for="item in items" v-memo="item.name">{{ item }}</div>');
    });

    it('should handle for with both key and :key extras', () => {
        const result = fumiToVue('{%for item in items, key="item.id", :key="item.name"%}<div>{{ item }}</div>{%endfor%}').htmlCode;
        expect(result).toBe('<div v-for="item in items" key="item.id">{{ item }}</div>');
    });

    it('should handle for with destructured vars and :key extra', () => {
        const result = fumiToVue('{%for (item, idx) in items, :key="idx"%}<div>{{ item }}</div>{%endfor%}').htmlCode;
        expect(result).toBe('<div v-for="(item, idx) in items" :key="idx">{{ item }}</div>');
    });
});

describe('fumiToVue - inlining behavior', () => {
    it('should convert {% if %} directive with single child (inlined)', () => {
        const result = fumiToVue('{% if user %}<div>Hello</div>{% endif %}').htmlCode;
        expect(result).toBe('<div v-if="user">Hello</div>');
    });

    it('should convert {% if %} directive with multiple children (each inlined)', () => {
        const result = fumiToVue('{% if user %}<div>One</div><div>Two</div>{% endif %}').htmlCode;
        expect(result).toBe('<template v-if="user"><div>One</div><div>Two</div></template>');
    });

    it('should convert {% for %} directive with single child (inlined)', () => {
        const result = fumiToVue('{% for item in items %}<span>{{ item }}</span>{% endfor %}').htmlCode;
        expect(result).toBe('<span v-for="item in items">{{ item }}</span>');
    });

    it('should convert {% for %} directive with multiple children (wrapped)', () => {
        const result = fumiToVue('{% for item in items %}<div>{{ item }}</div><span>{{ item }}</span>{% endfor %}').htmlCode;
        expect(result).toBe('<template v-for="item in items"><div>{{ item }}</div><span>{{ item }}</span></template>');
    });

    it('should convert {% show %} directive with single child (inlined)', () => {
        const result = fumiToVue('{% show user %}<div>Hidden</div>{% endshow %}').htmlCode;
        expect(result).toBe('<div v-show="user">Hidden</div>');
    });

    it('should convert {% cloak %} directive with single child (inlined)', () => {
        const result = fumiToVue('{% cloak %}<div>Cloaked</div>{% endcloak %}').htmlCode;
        expect(result).toBe('<div v-cloak>Cloaked</div>');
    });
});

describe('fumiToVue - nested directives', () => {
    it('should handle nested directives', () => {
        const result = fumiToVue('{% if outer %}{% if inner %}<span>Nested</span>{% endif %}{% endif %}').htmlCode;
        expect(result).toBe('<template v-if="outer"><span v-if="inner">Nested</span></template>');
    });

    it('should handle {% if %} with inlined {% for %}', () => {
        const result = fumiToVue('{% if users %}{% for user in users %}<li>{{ user.name }}</li>{% endfor %}{% endif %}').htmlCode;
        expect(result).toBe('<li v-if="users" v-for="user in users">{{ user.name }}</li>');
    });

    it('should handle if with for inside (both inlined)', () => {
        const result = fumiToVue('{%if test%}{%for ball in balls%}<div>{{ ball }}</div>{%endfor%}{%endif%}').htmlCode;
        expect(result).toBe('<div v-if="test" v-for="ball in balls">{{ ball }}</div>');
    });
});

describe('fumiToVue - if/else combinations', () => {
    it('should convert {% if %} with {% else %} (both inlined)', () => {
        const result = fumiToVue('{% if user %}<div>Yes</div>{% else %}<div>No</div>{% endif %}').htmlCode;
        expect(result).toBe('<div v-if="user">Yes</div><div v-else="true">No</div>');
    });

    it('should convert {% if %} with {% else-if %} (all inlined)', () => {
        const result = fumiToVue('{% if user %}<div>User</div>{% else-if admin %}<div>Admin</div>{% endif %}').htmlCode;
        expect(result).toBe('<div v-if="user">User</div><div v-else-if="admin">Admin</div>');
    });
});

describe('fumiToVue - edge cases', () => {
    it('should handle show with expression', () => {
        const result = fumiToVue('{%show test%}<div>Show</div>{%endshow%}').htmlCode;
        expect(result).toBe('<div v-show="test">Show</div>');
    });

    it('should handle cloak without expression (inlined)', () => {
        const result = fumiToVue('{%cloak%}<span>Cloak</span>{%endcloak%}').htmlCode;
        expect(result).toBe('<span v-cloak>Cloak</span>');
    });

    it('should handle consecutive ifs', () => {
        const result = fumiToVue('{%if a%}A{%endif%}{%if b%}B{%endif%}').htmlCode;
        expect(result).toBe('<template v-if="a">A</template><template v-if="b">B</template>');
    });

    it('should handle deeply nested ifs', () => {
        const result = fumiToVue('{%if A%}{%if B%}{%if C%}Deep{%endif%}{%endif%}{%endif%}').htmlCode;
        expect(result).toBe('<template v-if="A"><template v-if="B"><template v-if="C">Deep</template></template></template>');
    });

    it('should handle self-closing tag in if', () => {
        const result = fumiToVue('{%if selfClosing%}<img src="x" />{%endif%}').htmlCode;
        expect(result).toBe('<img v-if="selfClosing" src="x" />');
    });

    it('should handle comment in if', () => {
        const result = fumiToVue('{%if comment%}<!-- comment -->Text{%endif%}').htmlCode;
        expect(result).toBe('<template v-if="comment"><!---- comment -->Text</template>');
    });

    it('should handle mixed content', () => {
        const result = fumiToVue('Hello {% if show %}{{ name }}{% endif %}!').htmlCode;
        expect(result).toBe('Hello <template v-if="show">{{ name }}</template>!');
    });

    it('should wrap when v-if and v-show would conflict', () => {
        const result = fumiToVue('{%if foo%}<div v-show="bar">Test</div>{%endif%}').htmlCode;
        expect(result).toBe('<template v-if="foo"><div v-show="bar">Test</div></template>');
    });
});

describe('fumiToVue - mappings', () => {
    it('should return htmlCode and mappings', () => {
        const result = fumiToVue('<div>Hello</div>');
        expect(result.htmlCode).toBe('<div>Hello</div>');
        expect(result.mappings).toBeDefined();
        expect(Array.isArray(result.mappings)).toBe(true);
    });

    it('should have correct mapping format', () => {
        const result = fumiToVue('<div>Hello</div>');
        for (const mapping of result.mappings) {
            expect(mapping).toHaveProperty('sourceOffsets');
            expect(mapping).toHaveProperty('generatedOffsets');
            expect(mapping).toHaveProperty('lengths');
        }
    });

    it('should map v-if directive correctly', () => {
        const input = '{% if user %}<div>Hello</div>{% endif %}';
        const result = fumiToVue(input);
        expect(result.htmlCode).toBe('<div v-if="user">Hello</div>');

        const vIfMapping = result.mappings.find(m => m.sourceOffsets[0] === 18);
        expect(vIfMapping).toBeDefined();
        expect(vIfMapping?.generatedOffsets[0]).toBe(17);
        expect(vIfMapping?.lengths[0]).toBe(5);
    });

    it('should map v-for directive correctly', () => {
        const input = '{% for item in items %}<span>{{ item }}</span>{% endfor %}';
        const result = fumiToVue(input);
        expect(result.htmlCode).toBe('<span v-for="item in items">{{ item }}</span>');
        expect(result.mappings.length).toBeGreaterThan(0);
    });

    it('should map HTML tag correctly', () => {
        const input = '<div>Hello</div>';
        const result = fumiToVue(input);
        const tagMapping = result.mappings.find(m => m.sourceOffsets[0] === 1);
        expect(tagMapping).toBeDefined();
        expect(tagMapping?.generatedOffsets[0]).toBe(1);
        expect(tagMapping?.lengths[0]).toBe(3);
    });

    it('should map variable interpolation correctly', () => {
        const input = 'Hello {{ name }}!';
        const result = fumiToVue(input);
        expect(result.htmlCode).toBe('Hello {{ name }}!');

        const varMapping = result.mappings.find(m => m.sourceOffsets[0] === 9);
        expect(varMapping).toBeDefined();
        expect(varMapping?.generatedOffsets[0]).toBe(9);
    });

    it('should handle multiple mappings', () => {
        const input = '<div class="test">Hello</div>';
        const result = fumiToVue(input);
        expect(result.mappings.length).toBeGreaterThan(0);
        const totalMappedLength = result.mappings.reduce((sum, m) => sum + m.lengths[0], 0);
        expect(totalMappedLength).toBeGreaterThan(0);
    });
});

describe('parse', () => {
    it('should parse text nodes', () => {
        const result = parse('Hello world');
        expect(result.length).toBe(1);
        expect(result[0]!.type).toBe('Text');
    });

    it('should parse HTML elements', () => {
        const result = parse('<div>Hello</div>');
        expect(result.length).toBe(1);
        expect(result[0]!.type).toBe('Element');
        expect(result[0]!.tag).toBe('div');
    });

    it('should parse variable nodes', () => {
        const result = parse('{{ name }}');
        expect(result.length).toBe(1);
        expect(result[0]!.type).toBe('Variable');
    });

    it('should parse if directives', () => {
        const result = parse('{% if user %}Hello{% endif %}');
        expect(result.length).toBe(1);
        expect(result[0]!.type).toBe('Directive');
        expect(result[0]!.name).toBe('if');
    });

    it('should parse for directives', () => {
        const result = parse('{% for item in items %}{% endfor %}');
        expect(result.length).toBe(1);
        expect(result[0]!.type).toBe('Directive');
        expect(result[0]!.name).toBe('for');
    });

    it('should parse nested structures', () => {
        const result = parse('{% if user %}<div>{{ name }}</div>{% endif %}');
        expect(result.length).toBe(1);
        expect(result[0]!.type).toBe('Directive');
    });
});

describe('transformNode', () => {
    it('should transform if directive with single child to inline', () => {
        const ast = parse('{% if user %}<div>Hello</div>{% endif %}');
        const transformed = ast.flatMap(n => {
            const res = transformNode(n);
            return Array.isArray(res) ? res : [res];
        });
        expect(transformed.length).toBe(1);
        expect(transformed[0]!.type).toBe('Element');
        expect(transformed[0]!.props).toContainEqual(
            expect.objectContaining({ name: 'v-if' }),
        );
    });

    it('should transform for directive with single child to inline', () => {
        const ast = parse('{% for item in items %}<span>{{ item }}</span>{% endfor %}');
        const transformed = ast.flatMap(n => {
            const res = transformNode(n);
            return Array.isArray(res) ? res : [res];
        });
        expect(transformed.length).toBe(1);
        expect(transformed[0]!.type).toBe('Element');
        expect(transformed[0]!.props).toContainEqual(
            expect.objectContaining({ name: 'v-for' }),
        );
    });
});
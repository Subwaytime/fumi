import { describe, it, expect } from 'vitest';
import { parse, handle } from '../packages/core/index';

describe('fumiToVue - basic HTML', () => {
    it('should convert simple text', () => {
        const result = handle('Hello world').code;
        expect(result).toBe('Hello world');
    });

    it('should convert HTML tags', () => {
        const result = handle('<div>Hello</div>').code;
        expect(result).toBe('<div>Hello</div>');
    });

    it('should convert variable interpolation', () => {
        const result = handle('Hello {{ name }}!').code;
        expect(result).toBe('Hello {{ name }}!');
    });

    it('should handle HTML attributes', () => {
        const result = handle('<div class="foo" id="bar">Hello</div>').code;
        expect(result).toBe('<div class="foo" id="bar">Hello</div>');
    });

    it('should handle self-closing tags', () => {
        const result = handle('<input type="text" />').code;
        expect(result).toBe('<input type="text" />');
    });

    it('should handle comments', () => {
        const result = handle('<!-- This is a comment --><div>Hello</div>').code;
        expect(result).toBe('<!-- This is a comment --><div>Hello</div>');
    });
});

describe('fumiToVue - directive blocks', () => {
    it('should convert v-text directive', () => {
        const result = handle('{% text name %}<span>Old</span>{% endtext %}').code;
        expect(result).toBe('<span v-text="name">Old</span>');
    });

    it('should convert v-html directive', () => {
        const result = handle('{% html rawHtml %}<span>Old</span>{% endhtml %}').code;
        expect(result).toBe('<span v-html="rawHtml">Old</span>');
    });

    it('should convert v-memo directive', () => {
        const result = handle('{% memo [name] %}<div>Content</div>{% endmemo %}').code;
        expect(result).toBe('<div v-memo="[name]">Content</div>');
    });

    it('should convert v-pre directive', () => {
        const result = handle('{% pre %}<span>Raw</span>{% endpre %}').code;
        expect(result).toBe('<span v-pre>Raw</span>');
    });

    it('should convert v-once directive', () => {
        const result = handle('{% once %}<div>Once</div>{% endonce %}').code;
        expect(result).toBe('<div v-once>Once</div>');
    });

    it('should convert v-show directive', () => {
        const result = handle('{% show visible %}<div>Content</div>{% endshow %}').code;
        expect(result).toBe('<div v-show="visible">Content</div>');
    });

    it('should convert v-cloak directive', () => {
        const result = handle('{% cloak %}<div>Content</div>{% endcloak %}').code;
        expect(result).toBe('<div v-cloak>Content</div>');
    });
});

describe('fumiToVue - v-if directives', () => {
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

describe('fumiToVue - v-for directives', () => {
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

describe('fumiToVue - inlining behavior', () => {
    it('should convert {% if %} directive with single child (inlined)', () => {
        const result = handle('{% if user %}<div>Hello</div>{% endif %}').code;
        expect(result).toBe('<div v-if="user">Hello</div>');
    });

    it('should convert {% if %} directive with multiple children (wrapped)', () => {
        const result = handle('{% if user %}<div>One</div><div>Two</div>{% endif %}').code;
        expect(result).toBe('<template v-if="user"><div>One</div><div>Two</div></template>');
    });

    it('should convert {% for %} directive with single child (inlined)', () => {
        const result = handle('{% for item in items %}<span>{{ item }}</span>{% endfor %}').code;
        expect(result).toBe('<span v-for="item in items">{{ item }}</span>');
    });

    it('should convert {% for %} directive with multiple children (wrapped)', () => {
        const result = handle('{% for item in items %}<div>{{ item }}</div><span>{{ item }}</span>{% endfor %}').code;
        expect(result).toBe('<template v-for="item in items"><div>{{ item }}</div><span>{{ item }}</span></template>');
    });

    it('should convert {% show %} directive with single child (inlined)', () => {
        const result = handle('{% show user %}<div>Hidden</div>{% endshow %}').code;
        expect(result).toBe('<div v-show="user">Hidden</div>');
    });

    it('should convert {% cloak %} directive with single child (inlined)', () => {
        const result = handle('{% cloak %}<div>Cloaked</div>{% endcloak %}').code;
        expect(result).toBe('<div v-cloak>Cloaked</div>');
    });
});

describe('fumiToVue - nested directives', () => {
    it('should handle nested directives', () => {
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

describe('fumiToVue - if/else combinations', () => {
    it('should convert {% if %} with {% else %} (both inlined)', () => {
        const result = handle('{% if user %}<div>Yes</div>{% else %}<div>No</div>{% endif %}').code;
        expect(result).toBe('<div v-if="user">Yes</div><div v-else="true">No</div>');
    });

    it('should convert {% if %} with {% else-if %} (all inlined)', () => {
        const result = handle('{% if user %}<div>User</div>{% else-if admin %}<div>Admin</div>{% endif %}').code;
        expect(result).toBe('<div v-if="user">User</div><div v-else-if="admin">Admin</div>');
    });
});

describe('fumiToVue - edge cases', () => {
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

describe('fumiToVue - error handling', () => {
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
        expect((result[0] as any).tag.content).toBe('div');
    });

    it('should parse variable nodes', () => {
        const result = parse('{{ name }}');
        expect(result.length).toBe(1);
        expect(result[0]!.type).toBe('Variable');
    });

    it('should parse if directives as IfDirective nodes', () => {
        const result = parse('{% if user %}Hello{% endif %}');
        expect(result.length).toBe(1);
        expect(result[0]!.type).toBe('IfDirective');
        expect((result[0] as any).branches[0].type).toBe('if');
    });

    it('should parse for directives as Directive nodes', () => {
        const result = parse('{% for item in items %}<div>x</div>{% endfor %}');
        expect(result.length).toBe(1);
        expect(result[0]!.type).toBe('Directive');
        expect((result[0] as any).name).toBe('for');
    });

    it('should parse nested structures', () => {
        const result = parse('{% if user %}<div>{{ name }}</div>{% endif %}');
        expect(result.length).toBe(1);
        expect(result[0]!.type).toBe('IfDirective');
    });
});

describe('parse - inline directive behavior', () => {
    it('should parse if directive with single child as IfDirective', () => {
        const ast = parse('{% if user %}<div>Hello</div>{% endif %}');
        expect(ast.length).toBe(1);
        expect(ast[0]!.type).toBe('IfDirective');
        expect((ast[0] as any).branches[0].children[0].type).toBe('Element');
        expect((ast[0] as any).branches[0].children[0].tag.content).toBe('div');
    });

    it('should parse for directive with single child as Directive', () => {
        const ast = parse('{% for item in items %}<span>{{ item }}</span>{% endfor %}');
        expect(ast.length).toBe(1);
        expect(ast[0]!.type).toBe('Directive');
        expect((ast[0] as any).name).toBe('for');
        expect((ast[0] as any).children[0].type).toBe('Element');
        expect((ast[0] as any).children[0].tag.content).toBe('span');
    });
});

describe('parse - deep validation', () => {
    it('should parse if directive as IfDirective', () => {
        const ast = parse('{%if foo%}Bar{%endif%}');

        expect(ast).toHaveLength(1);
        expect(ast[0]!.type).toBe('IfDirective');
        expect((ast[0] as any).branches[0].type).toBe('if');
    });

    it('should parse if directive with expression content', () => {
        const ast = parse('{%if foo%}Bar{%endif%}');
        const ifNode = ast[0] as any;

        expect(ifNode.branches[0].expression?.content).toBe('foo');
    });

    it('should parse for directive with expression', () => {
        const ast = parse('{%for item in items%}<span>x</span>{%endfor%}');
        const dirNode = ast[0] as any;

        expect(dirNode.name).toBe('for');
        expect(dirNode.expression?.content).toBe('item in items');
    });

    it('should preserve source positions', () => {
        const ast = parse('<div>Hello</div>');
        const el = ast[0] as any;

        expect(el.pos.start).toBe(0);
        expect(el.pos.end).toBe(16);
    });
});

describe('parse - props validation', () => {
    it('should parse if with expression', () => {
        const ast = parse('{%if foo%}Bar{%endif%}');

        expect(ast[0].type).toBe('IfDirective');
        expect((ast[0] as any).branches[0].expression?.content).toBe('foo');
    });

    it('should parse if as IfDirective', () => {
        const ast = parse('{%if foo%}Bar{%endif%}');

        expect(ast[0].type).toBe('IfDirective');
    });
});

describe('parse - loop variable classification', () => {
    it('should classify variables inside for loops as loop_variable', () => {
        const ast = parse('{% for item in items %}{{ item }}{% endfor %}');
        const forNode = ast[0] as any;
        const variableNode = forNode.children.find((c: any) => c.type === 'Variable');

        expect(variableNode.expression.variables[0].kind).toBe('loop_variable');
    });

    it('should classify destructured variables inside for loops as loop_variable', () => {
        const ast = parse('{% for (tool, key) in tools %}{{ tool.id }}{% endfor %}');
        const forNode = ast[0] as any;
        const variableNode = forNode.children.find((c: any) => c.type === 'Variable');

        expect(variableNode.expression.variables[0].kind).toBe('loop_variable');
    });

    it('should classify standalone variables outside loops as standalone', () => {
        const ast = parse('{{ name }}');
        const variableNode = ast[0] as any;

        expect(variableNode.expression.variables[0].kind).toBe('standalone');
    });

    it('should classify dot-access variables inside for loops as loop_variable', () => {
        const ast = parse('{% for item in items %}{{ item.id }}{% endfor %}');
        const forNode = ast[0] as any;
        const variableNode = forNode.children.find((c: any) => c.type === 'Variable');

        expect(variableNode.expression.variables[0].kind).toBe('loop_variable');
        expect(variableNode.expression.variables[0].ref).toBe('item.id');
    });

    it('should handle nested for loops with correct variable classification', () => {
        const ast = parse('{% for a in as %}{% for b in bs %}{{ a }} {{ b }}{% endfor %}{% endfor %}');
        const outerFor = ast[0] as any;

        expect(outerFor.type).toBe('Directive');
        expect(outerFor.name).toBe('for');

        const innerFor = outerFor.children[0];
        expect(innerFor.type).toBe('Directive');
        expect(innerFor.name).toBe('for');

        // Find variable nodes
        const variables = innerFor.children.filter((c: any) => c.type === 'Variable');
        expect(variables).toHaveLength(2);

        const aVar = variables.find((v: any) => v.expression.variables[0].ref === 'a');
        const bVar = variables.find((v: any) => v.expression.variables[0].ref === 'b');

        expect(aVar?.expression.variables[0].kind).toBe('loop_variable');
        expect(bVar?.expression.variables[0].kind).toBe('loop_variable');
    });

    it('should handle consecutive for loops with separate loop vars', () => {
        const ast = parse('{% for x in xs %}<div>{{ x }}</div>{% endfor %}{% for y in ys %}<span>{{ y }}</span>{% endfor %}');

        expect(ast.length).toBe(2);
        const firstFor = ast[0] as any;
        const secondFor = ast[1] as any;

        const firstDiv = firstFor.children.find((c: any) => c.type === 'Element');
        const secondSpan = secondFor.children.find((c: any) => c.type === 'Element');
        const firstVar = firstDiv?.children.find((c: any) => c.type === 'Variable');
        const secondVar = secondSpan?.children.find((c: any) => c.type === 'Variable');

        expect(firstVar?.expression.variables[0].kind).toBe('loop_variable');
        expect(secondVar?.expression.variables[0].kind).toBe('loop_variable');
    });
});

describe('parse - complex nesting', () => {
    it('should handle for loop inside if with correct variable classification', () => {
        const ast = parse('{% if items %}{% for item in items %}{{ item }}{% endfor %}{% endif %}');
        const ifNode = ast[0] as any;

        expect(ifNode.type).toBe('IfDirective');

        const forNode = ifNode.branches[0].children[0];
        expect(forNode.type).toBe('Directive');
        expect(forNode.name).toBe('for');

        const varNode = forNode.children.find((c: any) => c.type === 'Variable');
        expect(varNode?.expression.variables[0].kind).toBe('loop_variable');
    });

    it('should handle deeply nested if inside for', () => {
        const ast = parse('{% for item in items %}{% if item.show %}{{ item.name }}{% endif %}{% endfor %}');
        const forNode = ast[0] as any;

        expect(forNode.type).toBe('Directive');
        expect(forNode.name).toBe('for');
    });
});

describe('fumiToVue - for loop extras with multiple children', () => {
    it('should handle for with :key and multiple children (wrapped)', () => {
        const result = handle('{%for item in items, :key="item.id"%}<div>{{ item }}</div><span>{{ item }}</span>{%endfor%}').code;
        expect(result).toBe('<template v-for="item in items" :key="item.id"><div>{{ item }}</div><span>{{ item }}</span></template>');
    });
});

describe('fumiToVue - else/else-if with multiple children', () => {
    it('should wrap else branch with multiple children', () => {
        const result = handle('{% if a %}<span>A</span>{% else %}<div>B</div><span>C</span>{% endif %}').code;
        expect(result).toBe('<span v-if="a">A</span><template v-else="true"><div>B</div><span>C</span></template>');
    });

    it('should wrap else-if branch with multiple children', () => {
        const result = handle('{% if a %}<span>A</span>{% else-if b %}<div>B</div><span>C</span>{% endif %}').code;
        expect(result).toBe('<span v-if="a">A</span><template v-else-if="b"><div>B</div><span>C</span></template>');
    });
});

describe('fumiToVue - edge cases', () => {
    it('should handle empty for loop body', () => {
        const result = handle('{%for item in items%}{%endfor%}').code;
        expect(result).toBe('');
    });

    it('should handle for with multiple children containing text', () => {
        const result = handle('{% for item in items %}{{ item }} text {{ item }}{% endfor %}').code;
        expect(result).toBe('<template v-for="item in items">{{ item }} text {{ item }}</template>');
    });

    it('should handle variable with dot access inside for loop', () => {
        const result = handle('{% for user in users %}{{ user.name }}{% endfor %}').code;
        expect(result).toBe('<template v-for="user in users">{{ user.name }}</template>');
    });
});

describe('parse - directive props validation', () => {
    it('should include position info on if directive', () => {
        const ast = parse('{%if foo%}Bar{%endif%}');
        const ifNode = ast[0] as any;

        expect(ifNode.branches[0].namePos).toBeDefined();
        expect(ifNode.branches[0].expression?.pos).toBeDefined();
    });

    it('should handle for directive with expression position', () => {
        const ast = parse('{%for item in items%}<span>x</span>{%endfor%}');
        const dirNode = ast[0] as any;

        expect(dirNode.expression?.pos).toBeDefined();
        expect(dirNode.expression?.content).toBe('item in items');
    });
});

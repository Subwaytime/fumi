import { describe, it, expect } from 'vitest';
import { parse } from '../../packages/core/index';

describe('parse basic nodes', () => {
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

    it('should preserve source positions', () => {
        const ast = parse('<div>Hello</div>');
        const el = ast[0] as any;
        expect(el.pos.start).toBe(0);
        expect(el.pos.end).toBe(16);
    });
});

describe('parse directives', () => {
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

describe('parse inline directive behavior', () => {
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

describe('parse deep validation', () => {
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
});

describe('parse loop variable classification', () => {
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

describe('parse complex nesting', () => {
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

describe('parse directive props', () => {
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

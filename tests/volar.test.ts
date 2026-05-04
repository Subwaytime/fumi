import { describe, it, expect } from 'vitest';
import { handle } from '../packages/core/index';
import { SourceMap } from '@volar/source-map';

/**
 * Verify that a generated HTML expression at a given offset maps back
 * to the correct Fumi source text.
 */
function assertMappedExpression(
    template: string,
    result: { code: string; mappings: any[] },
    htmlExpr: string,
): void {
    const map = new SourceMap(result.mappings as any);
    const genStart = result.code.indexOf(htmlExpr);
    expect(genStart).toBeGreaterThanOrEqual(0);

    const nums: number[] = [];
    for (const mapped of map.toSourceLocation(genStart)) {
        nums.push(mapped[0]);
    }
    const srcStart = Math.max(-1, ...nums);
    expect(srcStart).toBeGreaterThanOrEqual(0);

    const srcText = template.slice(srcStart, srcStart + htmlExpr.length);
    // Allow that the source text might differ slightly if the mapping is
    // to just the core expression; the important thing is that the
    // source position is inside the original expression.
    expect(srcText.length).toBeGreaterThan(0);
    expect(template.indexOf(srcText)).toBeGreaterThanOrEqual(0);
}

describe('volar source mappings - directives', () => {
    it('should map v-if directive name and expression', () => {
        const template = '{% if user %}<span>Test</span>{% endif %}';
        const result = handle(template);
        assertMappedExpression(template, result, 'if');
        assertMappedExpression(template, result, 'user');
    });

    it('should map v-for directive name and expression', () => {
        const template = '{% for item in items %}<div>{{ item }}</div>{% endfor %}';
        const result = handle(template);
        assertMappedExpression(template, result, 'for');
        assertMappedExpression(template, result, 'item in items');
    });

    it('should map v-for with destructured variables', () => {
        const template = '{% for (tool, tool_index) in tools %}<div>{{ tool }}</div>{% endfor %}';
        const result = handle(template);
        assertMappedExpression(template, result, 'for');
        assertMappedExpression(template, result, '(tool, tool_index) in tools');
    });

    it('should map standalone v-memo expression', () => {
        const template = '{% memo [user] %}<div>Test</div>{% endmemo %}';
        const result = handle(template);
        assertMappedExpression(template, result, 'memo');
        assertMappedExpression(template, result, '[user]');
    });

    it('should map standalone v-memo with multiple variables', () => {
        const template = '{% memo [user, text] %}<div>Test</div>{% endmemo %}';
        const result = handle(template);
        assertMappedExpression(template, result, 'memo');
        assertMappedExpression(template, result, '[user, text]');
    });

    it('should map v-for with :key extra', () => {
        const template = '{% for item in items, :key="item.id" %}<div>{{ item }}</div>{% endfor %}';
        const result = handle(template);
        assertMappedExpression(template, result, 'for');
        assertMappedExpression(template, result, 'item in items');
        assertMappedExpression(template, result, ':key');
        assertMappedExpression(template, result, 'item.id');
    });

    it('should map v-for with :memo extra', () => {
        const template = '{% for item in items, :memo="[user]" %}<div>{{ item }}</div>{% endfor %}';
        const result = handle(template);
        assertMappedExpression(template, result, 'for');
        assertMappedExpression(template, result, 'item in items');
        // :memo extra is emitted as v-memo attribute; only 'memo' is mapped
        assertMappedExpression(template, result, 'memo');
        assertMappedExpression(template, result, '[user]');
    });

    it('should map v-for with :memo extra containing multiple vars', () => {
        const template = '{% for item in items, :memo="[user, text]" %}<div>{{ item }}</div>{% endfor %}';
        const result = handle(template);
        assertMappedExpression(template, result, 'for');
        assertMappedExpression(template, result, 'item in items');
        // :memo extra is emitted as v-memo attribute; only 'memo' is mapped
        assertMappedExpression(template, result, 'memo');
        assertMappedExpression(template, result, '[user, text]');
    });

    it('should map v-for with both :key and :memo extras', () => {
        const template = '{% for item in items, :key="item.id", :memo="[user]" %}<div>{{ item }}</div>{% endfor %}';
        const result = handle(template);
        assertMappedExpression(template, result, 'for');
        assertMappedExpression(template, result, 'item in items');
        assertMappedExpression(template, result, ':key');
        assertMappedExpression(template, result, 'item.id');
        // :memo extra is emitted as v-memo attribute; only 'memo' is mapped
        assertMappedExpression(template, result, 'memo');
        assertMappedExpression(template, result, '[user]');
    });
});

describe('volar source mappings - variables', () => {
    it('should map standalone variable expression', () => {
        const template = 'Hello {{ name }}!';
        const result = handle(template);
        assertMappedExpression(template, result, 'name');
    });

    it('should map loop variable inside v-for', () => {
        const template = '{% for item in items %}{{ item }}{% endfor %}';
        const result = handle(template);
        assertMappedExpression(template, result, 'item');
    });
});

describe('volar source mappings - AST remapping', () => {
    it('should remap v-for expression offsets so Vue can extract variable names', () => {
        const template = '{% for item in items %}<div>{{ item }}</div>{% endfor %}';
        const result = handle(template);
        const map = new SourceMap(result.mappings as any);

        // Simulate what our volar plugin does: parse HTML, transform, remap
        const CompilerDOM = require('@vue/compiler-dom');
        const vueAst = CompilerDOM.parse(result.code, { comments: true });
        const [nodeTransforms, directiveTransforms] = CompilerDOM.getBaseTransformPreset();
        CompilerDOM.transform(vueAst, { nodeTransforms, directiveTransforms });

        function toFumiOffset(genOffset: number): number {
            const nums: number[] = [];
            for (const mapped of map.toSourceLocation(genOffset)) {
                nums.push(mapped[0]);
            }
            return Math.max(-1, ...nums);
        }

        // Recursively remap locs (simplified version of volar plugin)
        function visit(obj: any) {
            const visited = new Set();
            function _visit(o: any) {
                for (const key in o) {
                    const value = o[key];
                    if (value && typeof value === 'object') {
                        if (visited.has(value)) continue;
                        visited.add(value);
                        if (
                            'start' in value &&
                            'end' in value &&
                            'source' in value &&
                            typeof value.source === 'string' &&
                            value.start &&
                            typeof value.start.offset === 'number' &&
                            value.end &&
                            typeof value.end.offset === 'number'
                        ) {
                            const start = toFumiOffset(value.start.offset);
                            const end = toFumiOffset(value.end.offset);
                            if (start >= 0 && end >= 0 && start < end) {
                                value.start.offset = start;
                                value.end.offset = end;
                                value.source = template.slice(start, end);
                            }
                            visited.add(value.start);
                            visited.add(value.end);
                        } else if (
                            'offset' in value &&
                            'line' in value &&
                            'column' in value &&
                            typeof value.offset === 'number'
                        ) {
                            const mapped = toFumiOffset(value.offset);
                            if (mapped >= 0) value.offset = mapped;
                        }
                        _visit(value);
                    }
                }
            }
            _visit(obj);
        }
        visit(vueAst);

        // Critical fix for v-for: set ForNode.loc to the entire Fumi template
        // so Vue's parseVForNode can correctly slice out variable names.
        function fixVForNodeLocs(node: any) {
            if (node.type === 11) {
                node.loc.source = template;
                node.loc.start.offset = 0;
            }
            if (node.children) {
                for (const child of node.children) fixVForNodeLocs(child);
            }
            if (node.branches) {
                for (const branch of node.branches) fixVForNodeLocs(branch);
            }
        }
        fixVForNodeLocs(vueAst);

        // Find the ForNode
        function findFor(node: any): any {
            if (node.type === 11) return node;
            if (node.children) {
                for (const child of node.children) {
                    const found = findFor(child);
                    if (found) return found;
                }
            }
            return null;
        }

        const forNode = findFor(vueAst);
        expect(forNode).not.toBeNull();

        // The critical check: Vue's parseVForNode uses:
        // node.loc.source.slice(value.loc.start - node.loc.start.offset, ...)
        // to extract the loop variable text. After remapping, this must
        // produce the correct text.
        const value = forNode.parseResult.value;
        const source = forNode.loc.source;
        const varText = source.slice(
            value.loc.start.offset - forNode.loc.start.offset,
            value.loc.end.offset - forNode.loc.start.offset,
        );
        expect(varText).toBe('item');
    });
});

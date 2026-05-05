import type {
    Node,
    TextNode,
    ElementNode,
    VariableNode,
    CommentNode,
    PropNode,
    Mapping,
    DirectiveNode,
    IfDirectiveNode,
    DirectiveMapConfig,
} from './types';
import { DIRECTIVE_MAP_ENUM } from './enums/directiveMap';
import { isMeaningful } from './compiler';

interface Context {
    code: string;
    mappings: Mapping[];
    pos: number;
}

export function generate(ast: Node[]): { code: string; mappings: Mapping[] } {
    const ctx: Context = { code: '', mappings: [], pos: 0 };
    for (let i = 0; i < ast.length; i++) {
        generateNode(ast[i], ctx);
    }
    return { code: ctx.code, mappings: ctx.mappings };
}

function addMapping(ctx: Context, sourceStart: number, length: number): void {
    ctx.mappings.push({
        sourceOffsets: [sourceStart],
        generatedOffsets: [ctx.pos],
        lengths: [length],
        data: {
            verification: true,
            completion: true,
            navigation: true,
            semantic: true,
            structure: true,
            format: true,
        },
    });
}

/** Emit generated text that does NOT map back to source. */
function emitGen(ctx: Context, text: string): void {
    ctx.code += text;
    ctx.pos += text.length;
}

/** Emit text that maps back to a specific source offset. */
function emitMap(ctx: Context, text: string, sourceStart: number): void {
    if (sourceStart >= 0 && text.length > 0) {
        addMapping(ctx, sourceStart, text.length);
    }
    ctx.code += text;
    ctx.pos += text.length;
}

/** Emit an attribute name, unmapping any generated `v-` prefix so only the
 *  source-derived suffix is mapped back. */
function emitPropName(ctx: Context, content: string, position: Position): void {
    if (content.startsWith('v-')) {
        emitGen(ctx, 'v-');
        emitMap(ctx, content.slice(2), position.start);
    } else {
        emitMap(ctx, content, position.start);
    }
}

function generateNode(node: Node, ctx: Context): void {
    switch (node.type) {
        case 'Text': {
            const t = node as TextNode;
            emitMap(ctx, t.content, t.pos.start);
            break;
        }
        case 'Variable': {
            const v = node as VariableNode;
            emitGen(ctx, '{{ ');
            emitMap(ctx, v.expression.content, v.expression.pos?.start ?? v.pos.open!.end);
            emitGen(ctx, ' }}');
            break;
        }
        case 'Comment': {
            const c = node as CommentNode;
            emitGen(ctx, '<!--');
            emitMap(ctx, c.content, c.pos.open!.end);
            emitGen(ctx, '-->');
            break;
        }
        case 'Element':
            generateElement(node as ElementNode, ctx);
            break;
        case 'Directive':
            generateDirective(node as DirectiveNode, ctx);
            break;
        case 'IfDirective':
            generateIfDirective(node as IfDirectiveNode, ctx);
            break;
    }
}

/** Heuristic: a `<template>` tag is generated (not from source) when its recorded
 *  position length does not match the word "template" (8 chars). */
function isGeneratedTemplateTag(node: ElementNode): boolean {
    return node.tag.content === 'template'
        && (node.tag.position.end - node.tag.position.start) !== 8;
}

function generateElement(node: ElementNode, ctx: Context): void {
    const tag = node.tag.content;
    const props = node.props || [];
    const selfClosing = node.selfClosing || false;
    const isGeneratedTag = isGeneratedTemplateTag(node);

    // Opening tag — emit piece-by-piece so only source-derived text is mapped.
    emitGen(ctx, '<');

    if (isGeneratedTag) {
        emitGen(ctx, tag);
    } else {
        emitMap(ctx, tag, node.tag.position.start);
    }

    for (const prop of props) {
        emitGen(ctx, ' ');
        emitPropName(ctx, prop.name.content, prop.name.position);

        if (prop.value === true) {
            if (!prop.name.content.startsWith('v-pre') && !prop.name.content.startsWith('v-once') && !prop.name.content.startsWith('v-cloak')) {
                emitGen(ctx, '="true"');
            }
        } else {
            const val = prop.value.content;
            const quote = val.includes('"') ? "'" : '"';
            emitGen(ctx, '=' + quote);
            emitMap(ctx, val, prop.value.position.start);
            emitGen(ctx, quote);
        }
    }

    if (selfClosing) {
        emitGen(ctx, ' />');
    } else {
        emitGen(ctx, '>');
    }

    // Children
    if (!selfClosing && node.children) {
        for (const child of node.children) {
            generateNode(child, ctx);
        }
    }

    // Closing tag
    if (!selfClosing) {
        emitGen(ctx, '</');
        if (isGeneratedTag) {
            emitGen(ctx, tag);
        } else {
            const closeNameStart = node.pos.close?.start != null
                ? node.pos.close.start + 2   // skip '</'
                : node.tag.position.start;
            emitMap(ctx, tag, closeNameStart);
        }
        emitGen(ctx, '>');
    }
}

function buildVueDirectiveProps(node: DirectiveNode): PropNode[] {
    const config = DIRECTIVE_MAP_ENUM[node.name as keyof typeof DIRECTIVE_MAP_ENUM] as DirectiveMapConfig;
    const vueDirective = config.directive;
    const isNoValue = config.noValue ?? false;

    const exprContent = isNoValue && !node.expression ? true : (node.expression?.content ?? true);

    const props: PropNode[] = [
        {
            type: 'Attribute',
            name: { content: vueDirective, position: node.namePos },
            value: typeof exprContent === 'string'
                ? { content: exprContent, position: node.expression?.pos ?? node.namePos }
                : true,
        },
    ];

    if (node.expression?.extras) {
        const configExtras = DIRECTIVE_MAP_ENUM[node.name as keyof typeof DIRECTIVE_MAP_ENUM].extras;
        const extras = node.expression.extras;

        for (const [extraName, extraConfig] of Object.entries(configExtras)) {
            const extra = extras[extraName];
            if (!extra) continue;

            // Prefer non-colon version when both exist (e.g. key over :key)
            const baseName = extraName.replace(/^:/, '');
            const hasNonColon = baseName in extras && baseName !== extraName;
            const isColonVersion = extraName.startsWith(':');
            if (isColonVersion && hasNonColon) continue;

            const attrName = extraConfig.transform ?? extraName;
            props.push({
                type: 'Attribute',
                name: { content: attrName, position: extra.keyPos },
                value: { content: extra.value, position: extra.valuePos },
            });
        }
    }

    return props;
}

function tryInlineRecursive(props: PropNode[], children: Node[]): { element: ElementNode; combinedProps: PropNode[] } | null {
    const meaningful = children.filter(isMeaningful);
    if (meaningful.length !== 1) return null;

    const child = meaningful[0];
    if (child.type === 'Element') {
        return { element: child, combinedProps: [...props, ...(child.props || [])] };
    }
    if (child.type === 'Directive') {
        const childProps = buildVueDirectiveProps(child);
        return tryInlineRecursive([...props, ...childProps], child.children || []);
    }
    return null;
}

function wrapInTemplate(props: PropNode[], children: Node[], pos: { start: number; end: number; open?: { start: number; end: number }; close?: { start: number; end: number } }): ElementNode {
    return {
        type: 'Element',
        tag: { content: 'template', position: { start: 0, end: 0 } },
        pos: pos,
        props,
        children,
    };
}

function generateDirective(node: DirectiveNode, ctx: Context): void {
    const props = buildVueDirectiveProps(node);
    const inlined = tryInlineRecursive(props, node.children || []);

    if (inlined) {
        generateElement({ ...inlined.element, props: inlined.combinedProps }, ctx);
    } else {
        generateElement(wrapInTemplate(props, node.children || [], node.pos), ctx);
    }
}

function generateIfDirective(node: IfDirectiveNode, ctx: Context): void {
    for (let idx = 0; idx < node.branches.length; idx++) {
        const branch = node.branches[idx];
        const dirName = idx === 0
            ? 'v-if'
            : branch.type === 'else'
                ? 'v-else'
                : 'v-else-if';

        const ifProp: PropNode = {
            type: 'Attribute',
            name: { content: dirName, position: branch.namePos },
            value: branch.expression
                ? { content: branch.expression.content, position: branch.expression.pos ?? branch.namePos }
                : true,
        };

        const inlined = tryInlineRecursive([ifProp], branch.children);

        if (inlined) {
            const hasVueConditional = inlined.element.props?.some(p =>
                p.name.content === 'v-if' || p.name.content === 'v-else-if' || p.name.content === 'v-else' || p.name.content === 'v-show'
            );

            if (hasVueConditional) {
                generateElement(wrapInTemplate([ifProp], branch.children, branch.pos), ctx);
            } else {
                generateElement({ ...inlined.element, props: inlined.combinedProps }, ctx);
            }
        } else {
            generateElement(wrapInTemplate([ifProp], branch.children, branch.pos), ctx);
        }
    }
}

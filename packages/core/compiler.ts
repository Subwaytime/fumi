import { toCharCodes } from "./utils/toCharCodes";
import { isWhitespace } from "./utils/isWhitespace";
import { matchSequence } from "./utils/matchSequence";
import { CHAR_CODES_ENUM } from "./enums/charCodes";
import { COMMON_SEQUENCES_ENUM } from "./enums/commonSequences";
import { DIRECTIVE_MAP_ENUM } from "./enums/directiveMap";

import type {
    Node,
    CommentNode,
    ElementNode,
    PropNode,
    TextNode,
    VariableNode,
    DirectiveName,
    Expression,
    VariableRef,
    Stack,
    PosObj,
    Position,
    ConditionalChainEntry,
    DirectiveBranch,
    DirectivePlaceholder,
} from "./types";
import { FLAVOR_ENUM } from "./enums/flavor";
import { matchType } from "./utils/matchType";

const EXTRA_ARGS_REGEX = /(?:^|,\s*)(:?)(\w+)=(?:"([^"]*)"|'([^']*)'|(\$[^\s,]+)|(`([^`]+)`))/g;

function getDirectiveExpression(
    directiveName: string,
    directiveKey: DirectiveName,
    expr: Expression | undefined,
): string | true {
    const isBoolean = (DIRECTIVE_MAP_ENUM[directiveKey as keyof typeof DIRECTIVE_MAP_ENUM] as { boolean?: true })?.boolean ?? false;
    return isBoolean && !expr ? true : (expr?.content ?? true);
}

// --- Expression Parsing ---

export function parseExpression(expr: string, startOffset: number, loopVars?: ReadonlySet<string>[]): Expression {
    const variables: VariableRef[] = [];
    const extras: Record<string, string> = {};

    let match;
    while ((match = EXTRA_ARGS_REGEX.exec(expr)) !== null) {
        const [, colonPrefix, argName, doubleQuoteVal, singleQuoteVal, varRef, backtickVal] = match;
        let rawValue = doubleQuoteVal ?? singleQuoteVal ?? varRef ?? backtickVal ?? '';
        if (rawValue.startsWith('`') && rawValue.endsWith('`')) {
            rawValue = rawValue.slice(1, -1);
        }
        extras[colonPrefix + argName] = rawValue;
    }

    const codes = toCharCodes(expr);
    const len = codes.length;

    let wordStart = -1;
    let prevWordStart = -1;
    let prevWordEnd = -1;
    let parenDepth = 0;
    let hasSeenIn = false;
    let inQuote = 0;
    let currentWord = '';

    function flushWord(start: number, end: number, kind: VariableRef['kind']) {
        if (end > start) {
            const word = expr.slice(start, end);
            variables.push({
                ref: word,
                pos: { start: startOffset + start, end: startOffset + end },
                kind,
            });
        }
    }

    for (let i = 0; i <= len; i++) {
        const c = i < len ? codes[i] : 0;

        if (inQuote) {
            if (c === inQuote) {
                inQuote = 0;
            }
            continue;
        }

        if (c === CHAR_CODES_ENUM.DoubleQuote || c === CHAR_CODES_ENUM.SingleQuote) {
            inQuote = c;
            continue;
        }

        if (c === CHAR_CODES_ENUM.LeftParen) {
            parenDepth++;
            continue;
        }

        if (c === CHAR_CODES_ENUM.RightParen) {
            if (wordStart !== -1) {
                if (hasSeenIn) {
                    flushWord(wordStart, i, 'loop_source');
                } else if (parenDepth > 1) {
                    flushWord(wordStart, i, 'loop_destructured');
                } else {
                    prevWordStart = wordStart;
                    prevWordEnd = i;
                }
                wordStart = -1;
                currentWord = '';
            }
            if (parenDepth > 0) {
                parenDepth--;
            }
            if (parenDepth === 0 && prevWordStart !== -1 && !hasSeenIn) {
                flushWord(prevWordStart, prevWordEnd, 'loop_destructured');
                prevWordStart = -1;
                prevWordEnd = -1;
            }
            continue;
        }

        if (c === CHAR_CODES_ENUM.Comma) {
            if (wordStart !== -1) {
                if (hasSeenIn) {
                    flushWord(wordStart, i, 'loop_source');
                    wordStart = -1;
                    currentWord = '';
                } else if (parenDepth > 0) {
                    flushWord(wordStart, i, 'loop_destructured');
                    wordStart = -1;
                    currentWord = '';
                } else {
                    prevWordStart = wordStart;
                    prevWordEnd = i;
                    wordStart = -1;
                    currentWord = '';
                }
            }
            continue;
        }

        const isWordChar = (c >= CHAR_CODES_ENUM.LowerA && c <= CHAR_CODES_ENUM.LowerZ) ||
            (c >= CHAR_CODES_ENUM.UpperA && c <= CHAR_CODES_ENUM.UpperZ) ||
            (c >= CHAR_CODES_ENUM.Zero && c <= CHAR_CODES_ENUM.Nine) ||
            c === CHAR_CODES_ENUM.Underscore ||
            c === CHAR_CODES_ENUM.Dollar;

        if (isWordChar) {
            if (wordStart === -1) {
                wordStart = i;
            }
        } else if (c === CHAR_CODES_ENUM.Dot) {
            const nextChar = i + 1 < len ? codes[i + 1] : 0;
            const isNextWordChar = (nextChar >= CHAR_CODES_ENUM.LowerA && nextChar <= CHAR_CODES_ENUM.LowerZ) ||
                (nextChar >= CHAR_CODES_ENUM.UpperA && nextChar <= CHAR_CODES_ENUM.UpperZ) ||
                (nextChar >= CHAR_CODES_ENUM.Zero && nextChar <= CHAR_CODES_ENUM.Nine) ||
                nextChar === CHAR_CODES_ENUM.Underscore ||
                nextChar === CHAR_CODES_ENUM.Dollar;
            if (!isNextWordChar || wordStart === -1) {
                currentWord = expr.slice(wordStart, i);
                if (currentWord === 'in' && parenDepth === 0) {
                    hasSeenIn = true;
                    if (prevWordStart !== -1) {
                        flushWord(prevWordStart, prevWordEnd, 'loop_destructured');
                        prevWordStart = -1;
                        prevWordEnd = -1;
                    }
                } else if (hasSeenIn) {
                    flushWord(wordStart, i, 'loop_source');
                } else {
                    prevWordStart = wordStart;
                    prevWordEnd = i;
                }
                wordStart = -1;
                currentWord = '';
            }
        } else if (wordStart !== -1) {
            currentWord = expr.slice(wordStart, i);

            if (currentWord === 'in' && parenDepth === 0) {
                hasSeenIn = true;
                if (prevWordStart !== -1) {
                    flushWord(prevWordStart, prevWordEnd, 'loop_destructured');
                    prevWordStart = -1;
                    prevWordEnd = -1;
                }
            } else if (hasSeenIn) {
                flushWord(wordStart, i, 'loop_source');
            } else {
                prevWordStart = wordStart;
                prevWordEnd = i;
            }

            wordStart = -1;
            currentWord = '';
        }
    }

    if (wordStart !== -1) {
        if (hasSeenIn) {
            flushWord(wordStart, len, 'loop_source');
        } else if (prevWordStart !== -1) {
            flushWord(prevWordStart, prevWordEnd, 'standalone');
        }
    } else if (prevWordStart !== -1) {
        flushWord(prevWordStart, prevWordEnd, 'standalone');
    }

    let cleanExpr = expr
        .replace(/(?:^|,\s*):?(\w+)=(?:"[^"]*"|'[^']*'|(\$[^\s,]+)|(`[^`]+`))/g, '')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*$/, '')
        .trim();

    let finalVars: VariableRef[];
    if (hasSeenIn || variables.length > 0) {
        finalVars = variables;
    } else if (cleanExpr.length > 0) {
        finalVars = [{
            ref: cleanExpr,
            pos: { start: startOffset, end: startOffset + cleanExpr.length },
            kind: 'standalone',
        } as any];
    } else {
        finalVars = [];
    }

    if (loopVars && loopVars.length > 0) {
        finalVars = finalVars.map((v) => {
            if (v.kind === "standalone") {
                const base = v.ref.split(".")[0];
                for (const vars of loopVars) {
                    if (vars.has(base)) {
                        return { ...v, kind: "loop_variable" as const };
                    }
                }
            }
            return v;
        });
    }

    const exprIdx = cleanExpr.length > 0 ? expr.indexOf(cleanExpr) : 0;
    return { content: cleanExpr, variables: finalVars, extras, pos: { start: startOffset + exprIdx, end: startOffset + exprIdx + cleanExpr.length } };
}

// --- Node Builders ---

export function buildElementNode(
    tag: string,
    position: Position,
    openEnd: number,
    props: PropNode[] = [],
    children: Node[] = [],
): ElementNode {
    return {
        type: "Element",
        tag: {
            content: tag,
            position: position,
        },
        pos: {
            start: position.start - 1,
            end: openEnd,
            open: { start: position.start - 1, end: openEnd },
        },
        props,
        children,
    };
}

function buildDirectiveProps(
    directiveName: DirectiveName,
    openStart: number,
    openEnd: number,
    expression: Expression | undefined,
): PropNode[] {
    const vueDirective = DIRECTIVE_MAP_ENUM[directiveName as keyof typeof DIRECTIVE_MAP_ENUM]?.directive;
    if (!vueDirective) {
        throw new Error(`Unknown directive: ${directiveName}`);
    }

    const exprContent = getDirectiveExpression(vueDirective, directiveName, expression);

    const props: PropNode[] = [
        {
            type: "Attribute",
            name: { content: vueDirective, position: { start: openStart, end: openStart + vueDirective.length } },
            value: typeof exprContent === 'string'
                ? { content: exprContent, position: expression?.pos ?? { start: openStart, end: openEnd } }
                : true,
        },
    ];

    const extras = expression?.extras || {};
    const allowedExtras = [...(DIRECTIVE_MAP_ENUM[directiveName as keyof typeof DIRECTIVE_MAP_ENUM]?.extras as readonly string[] || [])] as string[];
    const hasKey = 'key' in extras;
    const hasMemo = 'memo' in extras;

    const extraKeys = Object.keys(extras).filter(k => {
        if (!allowedExtras.includes(k)) return false;
        if (k === ':key' && hasKey) return false;
        if (k === ':memo' && hasMemo) return false;
        return true;
    });

    for (const name of extraKeys) {
        let attrName: string;
        if (name === 'memo' || name === ':memo') {
            attrName = 'v-memo';
        } else if (name === ':key') {
            attrName = ':key';
        } else {
            attrName = name;
        }
        props.push({
            type: 'Attribute',
            name: { content: attrName, position: { start: 0, end: 0 } },
            value: typeof extras[name] === 'string'
                ? { content: extras[name], position: { start: 0, end: 0 } }
                : true,
        });
    }

    return props;
}

export function buildDirectiveElementNode(
    directiveName: DirectiveName,
    openStart: number,
    openEnd: number,
    expression: Expression | undefined,
    children: Node[] = [],
): ElementNode {
    const props = buildDirectiveProps(directiveName, openStart, openEnd, expression);

    return {
        type: "Element",
        tag: {
            content: "template",
            position: { start: openStart, end: openStart + 8 },
        },
        pos: {
            start: openStart,
            end: openEnd,
            open: { start: openStart, end: openEnd },
            close: undefined,
        },
        props,
        children,
    };
}

export function buildTextNode(
    content: string,
    start: number,
    end: number,
): TextNode {
    return { type: "Text", content, pos: { start, end } };
}

export function buildVariableNode(
    openStart: number,
    openEnd: number,
    closeStart: number,
    closeEnd: number,
    expression: Expression,
): VariableNode {
    return {
        type: "Variable",
        pos: {
            start: openStart,
            end: closeEnd,
            open: { start: openStart, end: openEnd },
            close: { start: closeStart, end: closeEnd },
        },
        expression,
    };
}

export function buildCommentNode(
    openStart: number,
    openEnd: number,
    content: string,
    closeStart: number,
    closeEnd: number,
): CommentNode {
    return {
        type: "Comment",
        content,
        pos: {
            start: openStart,
            end: closeEnd,
            open: { start: openStart, end: openEnd },
            close: { start: closeStart, end: closeEnd },
        },
    };
}

function buildDirectivePlaceholder(
    name: DirectiveName,
    openStart: number,
    openEnd: number,
    expression: Expression | undefined,
): DirectivePlaceholder {
    return {
        type: "Directive",
        name,
        pos: {
            start: openStart,
            end: openEnd,
            open: { start: openStart, end: openEnd },
        },
        expression,
        children: [],
    };
}

// --- Utilities ---

export function isMeaningful(node: Node): boolean {
    return (
        node.type === "Element" ||
        node.type === "Comment" ||
        node.type === "Variable" ||
        (node.type === "Text" && node.content.trim() !== "")
    );
}

export function pushNode(node: Node, stack: Stack, root: Node[]) {
    if (stack.length) {
        const parent = stack[stack.length - 1];
        parent.children = parent.children || [];
        parent.children.push(node);
    } else {
        root.push(node);
    }
}

function tryInlineDirective(node: ElementNode): Node {
    const meaningfulChildren = node.children?.filter(isMeaningful) || [];
    if (meaningfulChildren.length === 1 && meaningfulChildren[0].type === 'Element') {
        const child = meaningfulChildren[0] as ElementNode;
        const existingProps = child.props || [];
        const directiveProp = node.props?.[0];
        const extraProps = node.props?.slice(1) || [];

        return {
            ...child,
            directiveName: node.directiveName,
            props: [...(directiveProp ? [directiveProp] : []), ...existingProps, ...extraProps],
        };
    }
    return node;
}

// --- Directive Parsing ---

interface DirectiveHeader {
    name: DirectiveName;
    expression: Expression | undefined;
    openStart: number;
}

function parseDirectiveHeader(
    template: string,
    codes: Uint8Array,
    pos: PosObj,
    loopVarsStack: ReadonlySet<string>[],
): DirectiveHeader {
    const openStart = pos.value;
    pos.value += FLAVOR_ENUM.start.length;

    let contentEnd = pos.value;
    while (contentEnd < codes.length && !matchType("directive-end", codes, { value: contentEnd })) {
        contentEnd++;
    }

    const contentStart = pos.value;
    const raw = template.slice(contentStart, contentEnd);
    const trimmed = raw.trim();
    const leadingSpaces = raw.length - raw.trimStart().length;
    const actualStart = contentStart + leadingSpaces;

    const [nameRaw, ...rest] = trimmed.split(/\s+/);
    const name = nameRaw.toLowerCase() as DirectiveName;
    let expression: Expression | undefined;

    if (rest.length) {
        const exprString = rest.join(" ");
        const exprOffset = trimmed.indexOf(exprString);
        const exprStart = actualStart + exprOffset;
        expression = parseExpression(exprString, exprStart, loopVarsStack.length > 0 ? loopVarsStack : undefined);
    }

    pos.value = contentEnd + FLAVOR_ENUM.end.length;

    return { name, expression, openStart };
}

// --- End Directive Handlers ---

function handleEndDirective(
    actualName: DirectiveName,
    pos: PosObj,
    root: Node[],
    stack: Stack,
    loopVarsStack: Set<string>[],
    ctx: ParseContext,
): void {
    if (actualName === "for" && loopVarsStack.length > 0) {
        loopVarsStack.pop();
    }

    if (actualName === "if") {
        if (ctx.conditionalChains.length === 0) {
            throw new Error(`Unmatched directive end: endif at pos ${pos.value}`);
        }

        const chain = ctx.conditionalChains.pop()!;
        if (stack.length > 0) {
            stack.pop();
        }

        const meaningfulChildren = chain.currentBranch.children.filter(isMeaningful);
        if (meaningfulChildren.length > 0 || chain.currentBranch.type === 'if') {
            chain.branches.push(chain.currentBranch);
        }

        resolveConditionalChain(chain, root, stack);
        return;
    }

    const directiveConfig = DIRECTIVE_MAP_ENUM[actualName as keyof typeof DIRECTIVE_MAP_ENUM];
    if (directiveConfig) {
        if (stack.length === 0) {
            throw new Error(`Unmatched directive end: end${actualName} at pos ${pos.value}`);
        }

        const node = stack.pop();
        if (!node || node.type !== 'Element') {
            throw new Error(`Expected element to close directive end${actualName}`);
        }

        if (node.directiveName !== actualName) {
            throw new Error(`Mismatched directive end: expected end${node.directiveName}, got end${actualName} at pos ${pos.value}`);
        }

        const meaningfulChildren = node.children?.filter(isMeaningful) || [];
        if (meaningfulChildren.length === 0) {
            return;
        }

        pushNode(tryInlineDirective(node), stack, root);
        return;
    }
}

function handleBranchDirective(
    name: DirectiveName,
    openStart: number,
    pos: PosObj,
    expression: Expression | undefined,
    root: Node[],
    stack: Stack,
    ctx: ParseContext,
): void {
    if (ctx.conditionalChains.length === 0) {
        throw new Error(`${name} without matching if at pos ${openStart}`);
    }

    const chain = ctx.conditionalChains[ctx.conditionalChains.length - 1];

    if (chain.currentBranch.type === 'else') {
        throw new Error(`${name} cannot appear after else at pos ${openStart}`);
    }

    const hasElse = chain.branches.some(b => b.type === 'else');
    if (hasElse) {
        throw new Error(`${name} cannot appear after else at pos ${openStart}`);
    }
    chain.branches.push(chain.currentBranch);

    if (stack.length > 0) {
        stack.pop();
    }

    const dirNode = buildDirectivePlaceholder(name, openStart, pos.value, expression);
    chain.currentBranch = {
        type: name as 'else' | 'else-if',
        expression: expression?.content ?? true,
        children: dirNode.children,
        dirNode,
    };

    stack.push(dirNode as unknown as ElementNode);
}

function handleOpenIf(
    openStart: number,
    pos: PosObj,
    expression: Expression | undefined,
    root: Node[],
    stack: Stack,
    ctx: ParseContext,
): void {
    const dirNode = buildDirectivePlaceholder("if", openStart, pos.value, expression);
    const entry: ConditionalChainEntry = {
        parent: stack.length > 0 ? stack[stack.length - 1] : null,
        rootIndex: stack.length > 0 ? (stack[stack.length - 1]?.children?.length ?? root.length) : root.length,
        branches: [],
        currentBranch: {
            type: "if",
            expression: expression?.content ?? true,
            children: dirNode.children,
            dirNode,
        },
    };
    ctx.conditionalChains.push(entry);
    stack.push(dirNode as unknown as ElementNode);
}

function handleOpenDirective(
    name: DirectiveName,
    openStart: number,
    pos: PosObj,
    expression: Expression | undefined,
    stack: Stack,
    loopVarsStack: Set<string>[],
): void {
    if (name === "for") {
        const loopVars = new Set<string>();
        if (expression?.variables) {
            for (const v of expression.variables) {
                if (v.kind === "loop_destructured" || v.kind === "loop_index" || v.kind === "loop_source") {
                    loopVars.add(v.ref);
                }
            }
        }
        loopVarsStack.push(loopVars);
    }

    const node = buildDirectiveElementNode(name, openStart, pos.value, expression, []);
    node.directiveName = name;
    stack.push(node);
}

// --- Conditional Chain Resolution ---

function resolveConditionalChain(
    chain: ConditionalChainEntry,
    root: Node[],
    stack: Stack,
) {
    const results: ElementNode[] = [];

    for (let idx = 0; idx < chain.branches.length; idx++) {
        const branch = chain.branches[idx];
        results.push(resolveConditionalBranch(branch, idx));
    }

    if (stack.length > 0) {
        const parent = stack[stack.length - 1];
        parent.children = parent.children || [];
        parent.children.push(...results);
    } else {
        root.push(...results);
    }
}

function resolveConditionalBranch(
    branch: DirectiveBranch,
    branchIndex: number,
): ElementNode {
    const dirName = branchIndex === 0
        ? "v-if"
        : DIRECTIVE_MAP_ENUM[branch.type as keyof typeof DIRECTIVE_MAP_ENUM].directive;

    const vueDirectiveProps: PropNode[] = [
        {
            type: "Attribute",
            name: { content: dirName, position: { start: branch.dirNode.pos.start, end: branch.dirNode.pos.start + dirName.length } },
            value: typeof branch.expression === 'string'
                ? { content: branch.expression, position: branch.dirNode.expression?.pos ?? { start: branch.dirNode.pos.start, end: branch.dirNode.pos.end } }
                : true,
        },
    ];

    const meaningful = branch.children.filter(isMeaningful);
    const singleEl = meaningful.length === 1 && meaningful[0].type === "Element"
        ? meaningful[0] as ElementNode
        : null;

    if (singleEl) {
        const existingProps = singleEl.props || [];
        const hasVueConditional = existingProps.some(p =>
            p.name.content === "v-if" || p.name.content === "v-else-if" || p.name.content === "v-else" || p.name.content === "v-show"
        );

        if (hasVueConditional) {
            return buildElementNode(
                "template",
                { start: branch.dirNode.pos.start, end: branch.dirNode.pos.start + 8 },
                branch.dirNode.pos.end,
                vueDirectiveProps,
                branch.children,
            );
        }

        return {
            ...singleEl,
            props: [...vueDirectiveProps, ...existingProps],
        };
    }

    return buildElementNode(
        "template",
        { start: branch.dirNode.pos.start, end: branch.dirNode.pos.start + 8 },
        branch.dirNode.pos.end,
        vueDirectiveProps,
        branch.children,
    );
}

// --- Directive Handler Entry Point ---

export interface ParseContext {
    conditionalChains: ConditionalChainEntry[];
}

export function handleDirective(
    template: string,
    codes: Uint8Array,
    pos: PosObj,
    root: Node[],
    stack: Stack,
    loopVarsStack: Set<string>[],
    ctx: ParseContext,
) {
    const { name, expression, openStart } = parseDirectiveHeader(template, codes, pos, loopVarsStack);

    if (name.startsWith("end")) {
        const actualName = name.slice(3) as DirectiveName;
        handleEndDirective(actualName, pos, root, stack, loopVarsStack, ctx);
        return;
    }

    if (name === "else" || name === "else-if") {
        handleBranchDirective(name, openStart, pos, expression, root, stack, ctx);
        return;
    }

    if (name === "if") {
        handleOpenIf(openStart, pos, expression, root, stack, ctx);
        return;
    }

    handleOpenDirective(name, openStart, pos, expression, stack, loopVarsStack);
}

// --- Variable Handler ---

export function handleVariable(
    template: string,
    codes: Uint8Array,
    pos: PosObj,
    root: Node[],
    stack: Stack,
    loopVarsStack: ReadonlySet<string>[],
) {
    const openStart = pos.value;
    pos.value += COMMON_SEQUENCES_ENUM.variable.start.length;
    const openEnd = pos.value;

    const exprStart = pos.value;
    while (
        pos.value < codes.length &&
        !matchType("variable-end", codes, pos)
    )
        pos.value++;
    const exprEnd = pos.value;

    const closeStart = pos.value;
    pos.value += COMMON_SEQUENCES_ENUM.variable.end.length;
    const closeEnd = pos.value;

    const currentLoopVars = loopVarsStack.length > 0 ? loopVarsStack[loopVarsStack.length - 1] : undefined;
    const expression = parseExpression(
        template.slice(exprStart, exprEnd),
        exprStart,
        loopVarsStack.length > 0 ? loopVarsStack : undefined,
    );

    const node = buildVariableNode(
        openStart,
        openEnd,
        closeStart,
        closeEnd,
        expression,
    );

    pushNode(node, stack, root);
}

// --- Comment Handler ---

export function handleComment(
    template: string,
    codes: Uint8Array,
    pos: PosObj,
    root: Node[],
    stack: Stack,
) {
    const openStart = pos.value;
    pos.value += COMMON_SEQUENCES_ENUM.comment.start.length;
    const openEnd = pos.value;

    let contentEnd = pos.value;
    while (
        contentEnd < codes.length &&
        !matchType("comment-end", codes, { value: contentEnd })
    )
        contentEnd++;
    const content = template.slice(pos.value, contentEnd);

    const closeStart = contentEnd;
    pos.value = contentEnd + COMMON_SEQUENCES_ENUM.comment.end.length;
    const closeEnd = pos.value;

    pushNode(
        buildCommentNode(openStart, openEnd, content, closeStart, closeEnd),
        stack,
        root,
    );
}

// --- HTML Handler ---

function extractProps(
    template: string,
    codes: Uint8Array,
    pos: PosObj,
): PropNode[] {
    const props: PropNode[] = [];

    while (
        pos.value < codes.length &&
        codes[pos.value] !== CHAR_CODES_ENUM.Gt &&
        !matchSequence(
            codes,
            pos.value,
            COMMON_SEQUENCES_ENUM.tag.selfEnd,
        )
    ) {
        while (
            pos.value < codes.length &&
            isWhitespace(codes[pos.value])
        ) {
            pos.value++;
        }

        if (
            pos.value >= codes.length ||
            codes[pos.value] === CHAR_CODES_ENUM.Gt ||
            matchSequence(
                codes,
                pos.value,
                COMMON_SEQUENCES_ENUM.tag.selfEnd,
            )
        ) {
            break;
        }

        const attrStart = pos.value;

        while (
            pos.value < codes.length &&
            codes[pos.value] !== CHAR_CODES_ENUM.Gt &&
            codes[pos.value] !== CHAR_CODES_ENUM.Eq &&
            !isWhitespace(codes[pos.value]) &&
            !matchSequence(
                codes,
                pos.value,
                COMMON_SEQUENCES_ENUM.tag.selfEnd,
            )
        ) {
            pos.value++;
        }

        const attrName = template.slice(attrStart, pos.value);

        while (
            pos.value < codes.length &&
            isWhitespace(codes[pos.value])
        ) {
            pos.value++;
        }

        let attrValue: string | true = true;
        let attrValueStart: number | undefined;
        let attrValueEnd: number | undefined;

        if (codes[pos.value] === CHAR_CODES_ENUM.Eq) {
            pos.value++;
            while (
                pos.value < codes.length &&
                isWhitespace(codes[pos.value])
            ) {
                pos.value++;
            }

            const quote = codes[pos.value];
            if (
                quote === CHAR_CODES_ENUM.DoubleQuote ||
                quote === CHAR_CODES_ENUM.SingleQuote
            ) {
                pos.value++;
                const valueStart = pos.value;
                while (
                    pos.value < codes.length &&
                    codes[pos.value] !== quote
                ) {
                    pos.value++;
                }
                attrValue = template.slice(valueStart, pos.value);
                attrValueStart = valueStart;
                attrValueEnd = pos.value;
                pos.value++;
            } else {
                const valueStart = pos.value;
                while (
                    pos.value < codes.length &&
                    codes[pos.value] !== CHAR_CODES_ENUM.Gt &&
                    !isWhitespace(codes[pos.value]) &&
                    !matchSequence(
                        codes,
                        pos.value,
                        COMMON_SEQUENCES_ENUM.tag.selfEnd,
                    )
                ) {
                    pos.value++;
                }
                attrValue = template.slice(valueStart, pos.value);
                attrValueStart = valueStart;
                attrValueEnd = pos.value;
            }
        }

        if (attrName.trim()) {
            const prop: PropNode = {
                type: "Attribute",
                name: {
                    content: attrName,
                    position: {
                        start: attrStart,
                        end: attrStart + attrName.length,
                    }
                },
                value: attrValueStart && typeof attrValue === 'string' ? {
                    content: attrValue,
                    position: {
                        start: attrValueStart,
                        end: attrValueEnd!,
                    }
                } : true
            };
            props.push(prop);
        }
    }

    return props;
}

export function handleHTML(
    template: string,
    codes: Uint8Array,
    pos: PosObj,
    root: Node[],
    stack: Stack,
) {
    const openBracket = pos.value;
    pos.value++;
    const isClosing = codes[pos.value] === CHAR_CODES_ENUM.Slash;
    if (isClosing) pos.value++;

    const nameStart = pos.value;
    while (
        pos.value < codes.length &&
        codes[pos.value] !== CHAR_CODES_ENUM.Gt &&
        !isWhitespace(codes[pos.value])
    ) {
        pos.value++;
    }
    const nameEnd = pos.value;
    const tag = template.slice(nameStart, nameEnd);

    const props = extractProps(template, codes, pos);

    let selfClosing = false;
    if (
        matchSequence(
            codes,
            pos.value,
            COMMON_SEQUENCES_ENUM.tag.selfEnd,
        )
    ) {
        selfClosing = true;
        pos.value += COMMON_SEQUENCES_ENUM.tag.selfEnd.length;
    } else {
        pos.value++;
    }

    const openEnd = pos.value;

    if (isClosing) {
        const node = stack.pop();
        if (!node) throw new Error(`Nothing left to close: ${tag}`);

        if (node.type !== 'Element' || node.tag.content !== tag) {
            throw new Error(`Mismatched closing tag: ${tag}`);
        }

        node.pos.end = pos.value;
        node.pos.close = { start: openBracket, end: pos.value };

        pushNode(node, stack, root);
    } else if (selfClosing) {
        const node = buildElementNode(
            tag,
            { start: nameStart, end: nameEnd },
            openEnd,
            props,
            [],
        );
        node.selfClosing = true;
        pushNode(node, stack, root);
    } else {
        const node = buildElementNode(
            tag,
            { start: nameStart, end: nameEnd },
            openEnd,
            props,
            [],
        );
        stack.push(node);
    }
}

// --- Text Handler ---

export function handleText(
    template: string,
    codes: Uint8Array,
    pos: PosObj,
    root: Node[],
    stack: Stack,
) {
    const start = pos.value;
    while (
        pos.value < codes.length &&
        !matchType("variable-start", codes, pos) &&
        !matchType("directive-start", codes, pos) &&
        !matchType("directive-end", codes, pos) &&
        !matchType("comment-start", codes, pos) &&
        codes[pos.value] !== CHAR_CODES_ENUM.Lt
    )
        pos.value++;

    if (pos.value > start) {
        pushNode(
            buildTextNode(
                template.slice(start, pos.value),
                start,
                pos.value,
            ),
            stack,
            root,
        );
    }
}

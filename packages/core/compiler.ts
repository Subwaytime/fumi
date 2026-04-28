import { toCharCodes } from "./utils/toCharCodes";
import { isWhitespace } from "./utils/isWhitespace";
import { matchSequence } from "./utils/matchSequence";
import { CHAR_CODES_ENUM } from "./enums/charCodes";
import { COMMON_SEQUENCES_ENUM } from "./enums/commonSequences";
import { DIRECTIVE_MAP_ENUM } from "./enums/directiveMap";

import type {
    Node,
    CommentNode,
    DirectiveNode,
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
    SourceSpans,
    TransformedNode,
} from "./types";
import { FLAVOR_ENUM } from "./enums/flavor";
import { matchType } from "./utils/matchType";

const EXTRA_ARGS_REGEX = /(?:^|,\s*)(:?)(\w+)=(?:"([^"]*)"|'([^']*)'|(\$[^\s,]+)|(`([^`]+)`))/g;

export function parseExpression(expr: string, startOffset: number): Expression {
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
    let parenDepth = 0;
    let hasSeenIn = false;
    let inQuote = 0;
    let currentWord = '';

    function flushWord(start: number, end: number, kind: VariableRef['kind']) {
        if (end > start) {
            const word = expr.slice(start, end);
            variables.push({
                name: word,
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
            if (wordStart !== -1) {
                parenDepth++;
            }
            continue;
        }

        if (c === CHAR_CODES_ENUM.RightParen) {
            if (parenDepth > 0) {
                parenDepth--;
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
        } else if (wordStart !== -1) {
            currentWord = expr.slice(wordStart, i);

            if (currentWord === 'in' && parenDepth === 0) {
                hasSeenIn = true;
                flushWord(0, wordStart, 'destructured');
            } else if (hasSeenIn) {
                flushWord(wordStart, i, 'source');
            }

            wordStart = -1;
            currentWord = '';
        }
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
            name: cleanExpr,
            pos: { start: startOffset, end: startOffset + cleanExpr.length },
            kind: 'standalone',
        }];
    } else {
        finalVars = [];
    }

    return { content: cleanExpr, variables: finalVars, extras, pos: { start: startOffset, end: startOffset + cleanExpr.length } };
}

export function buildElementNode(
    tag: string,
    tagPosition: Position,
    openEnd: number,
    props: PropNode[] = [],
    children: Node[] = [],
): ElementNode {
    return {
        type: "Element",
        tag,
        tagPosition,
        pos: {
            start: tagPosition.start - 1,
            end: openEnd,
            open: { start: tagPosition.start - 1, end: openEnd },
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

export function buildDirectiveNode(
    name: DirectiveName,
    openStart: number,
    openEnd: number,
    expression?: Expression,
    children: Node[] = [],
): DirectiveNode {
    return {
        type: "Directive",
        name,
        pos: {
            start: openStart,
            end: openEnd,
            open: { start: openStart, end: openEnd },
        },
        expression,
        children,
    };
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

export function handleVariable(
    template: string,
    codes: Uint8Array,
    pos: PosObj,
    root: Node[],
    stack: Stack,
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

    const expression = parseExpression(
        template.slice(exprStart, exprEnd),
        exprStart,
    );

    const node = buildVariableNode(
        openStart,
        openEnd,
        closeStart,
        closeEnd,
        expression,
    );

    node.sourceSpans = {
        full: { start: openStart, end: closeEnd },
        expression: {
            start: exprStart,
            end: exprEnd,
            content: expression.content,
        },
    } satisfies SourceSpans;

    pushNode(node, stack, root);
}

export function handleDirective(
    template: string,
    codes: Uint8Array,
    pos: PosObj,
    root: Node[],
    stack: Stack,
) {
    const openStart = pos.value;
    pos.value += FLAVOR_ENUM.start.length;

    let contentEnd = pos.value;
    while (
        contentEnd < codes.length &&
        !matchType("directive-end", codes, { value: contentEnd })
    )
        contentEnd++;

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
        expression = parseExpression(exprString, exprStart);
    }

    pos.value = contentEnd + FLAVOR_ENUM.end.length;

    /* ------ END DIRECTIVE ------ */
    if (name.startsWith("end")) {
        const actualName = name.slice(3) as DirectiveName;
        let node: DirectiveNode | undefined;

        for (let i = stack.length - 1; i >= 0; i--) {
            const candidate = stack[i];
            if (
                candidate &&
                candidate.type === "Directive" &&
                candidate.name === actualName
            ) {
                node = candidate;
                stack.splice(i, 1);
                break;
            }
        }

        if (!node) {
            throw new Error(`Unmatched directive end: ${name} at pos ${pos.value}`);
        }

        node.block = { start: node.pos.start, end: pos.value };
        node.pos.close = { start: openStart, end: pos.value };

        pushNode(node, stack, root);
        return;
    }

    /* ------ ELSE | ELSE-IF ------ */
    if (name === "else" || name === "else-if") {
        try {
            const parentIf = findNearestIf(stack);
            const node = buildDirectiveNode(
                name,
                openStart,
                pos.value,
                expression,
                [],
            );
            node.sourceSpans = {
                full: { start: openStart, end: pos.value },
                name: {
                    start: actualStart,
                    end: actualStart + nameRaw.length,
                    content: name,
                },
                expression: expression
                    ? {
                        start:
                            actualStart +
                            trimmed.indexOf(rest.join(" ")),
                        end:
                            actualStart +
                            trimmed.indexOf(rest.join(" ")) +
                            rest.join(" ").length,
                        content: expression.content,
                    }
                    : undefined,
            } satisfies SourceSpans;
            parentIf.children.push(node);
        } catch {
            throw new Error(`${name} without matching {#if} at pos ${openStart}`);
        }
        return;
    }

    /* ------ OPEN DIRECTIVE ------ */
    const node = buildDirectiveNode(
        name,
        openStart,
        pos.value,
        expression,
        [],
    );

    node.sourceSpans = {
        full: { start: openStart, end: pos.value },
        name: {
            start: actualStart,
            end: actualStart + nameRaw.length,
            content: name,
        },
        expression: expression
            ? {
                start:
                    actualStart + trimmed.indexOf(rest.join(" ")),
                end:
                    actualStart +
                    trimmed.indexOf(rest.join(" ")) +
                    rest.join(" ").length,
                content: expression.content,
            }
            : undefined,
    } satisfies SourceSpans;

    stack.push(node);
}

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
                name: attrName,
                value: attrValue,
            };
            prop.namePos = {
                start: attrStart,
                end: attrStart + attrName.length,
            };
            if (attrValueStart !== undefined) {
                prop.valuePos = {
                    start: attrValueStart,
                    end: attrValueEnd!,
                };
            }
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
        if (!node || node.type !== "Element" || node.tag !== tag) {
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
        node.sourceSpans = {
            full: { start: openBracket, end: openEnd },
            tag: { start: nameStart, end: nameEnd },
        } satisfies Partial<SourceSpans>;
        pushNode(node, stack, root);
    } else {
        const node = buildElementNode(
            tag,
            { start: nameStart, end: nameEnd },
            openEnd,
            props,
            [],
        );
        node.sourceSpans = {
            full: { start: openBracket, end: openEnd },
            tag: { start: nameStart, end: nameEnd },
        } satisfies Partial<SourceSpans>;
        stack.push(node);
    }
}

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

export function pushNode(node: Node, stack: Stack, root: Node[]) {
    if (stack.length) {
        const parent = stack[stack.length - 1];
        parent.children = parent.children || [];
        parent.children.push(node);
    } else {
        root.push(node);
    }
}

export function isMeaningful(node: Node): boolean {
    return (
        node.type === "Element" ||
        node.type === "Comment" ||
        node.type === "Variable" ||
        (node.type === "Text" && node.content.trim() !== "")
    );
}

export function applyDirective(
    directiveNode: DirectiveNode,
    directiveName: string,
    children: Node[],
): TransformedNode | null {
    const meaningfulChildren = children.filter((c) => isMeaningful(c));
    if (!meaningfulChildren.length) return null;

    const booleanDirectives = ["v-cloak", "v-pre", "v-once"];
    const isBoolean = booleanDirectives.includes(directiveName);
    const expression = isBoolean && !directiveNode.expression
        ? true
        : (directiveNode.expression?.content ?? true);

    // Transform children first
    const transformedChildren = children.flatMap((c) => {
        const t = transformNode(c);
        return Array.isArray(t) ? t : [t];
    }).filter(Boolean) as Node[];

    const meaningful = transformedChildren.filter((c) => isMeaningful(c));
    const single =
        meaningful.length === 1 ? meaningful[0] : null;

    if (single?.type === "Element") {
        return {
            ...single,
            props: [
                ...(single.props || []),
                {
                    type: "Attribute",
                    name: directiveName,
                    value: expression,
                },
            ],
            children: single.children || [],
            inlineDirective: {
                name: directiveName,
                expression,
                sourceSpans: directiveNode.sourceSpans,
                pos: directiveNode.pos,
            },
        } as TransformedNode;
    }

    const attrs: PropNode[] = [
        {
            type: "Attribute",
            name: directiveName,
            value: expression,
        },
    ];
    const node = buildElementNode(
        "template",
        {
            start: directiveNode.pos.start,
            end: directiveNode.pos.start + 8,
        },
        directiveNode.pos.end,
        attrs,
        transformedChildren,
    ) as TransformedNode;
    node.inlineDirective = {
        name: directiveName,
        expression,
        sourceSpans: directiveNode.sourceSpans,
        pos: directiveNode.pos,
    };
    return node;
}

export function findNearestIf(stack: Stack): DirectiveNode {
    for (let i = stack.length - 1; i >= 0; i--) {
        const node = stack[i];
        if (node.type === "Directive" && node.name === "if")
            return node;
    }
    throw new Error("{#else} or {#else-if} must be inside {#if}");
}

export function hasVueConditional(props: PropNode[] = []): boolean {
    return props.some(
        (p) =>
            p.name === "v-if" ||
            p.name === "v-else-if" ||
            p.name === "v-else" ||
            p.name === "v-show",
    );
}

export function canInlineIf(children: Node[]): ElementNode | null {
    const meaningful = children.filter((c) => isMeaningful(c));
    if (meaningful.length !== 1) return null;
    const child = meaningful[0];
    if (child.type !== "Element") return null;
    if (hasVueConditional(child.props)) return null;
    return child;
}

export function transformIf(
    node: DirectiveNode,
): TransformedNode[] {
    const branches: Array<{
        type: "if" | "else" | "else-if";
        expression: string | true;
        children: Node[];
        dirNode: DirectiveNode;
    }> = [];

    let currentChildren: Node[] = [];
    let currentType: "if" | "else" | "else-if" = "if";
    let currentExpr: string | true =
        node.expression?.content ?? true;
    let currentDirNode: DirectiveNode = node;

    for (const child of node.children) {
        if (
            child.type === "Directive" &&
            (child.name === "else" || child.name === "else-if")
        ) {
            branches.push({
                type: currentType,
                expression: currentExpr,
                children: currentChildren,
                dirNode: currentDirNode,
            });
            currentChildren = [];
            currentType = child.name;
            currentExpr = child.expression?.content ?? true;
            currentDirNode = child;
        } else {
            const transformed = transformNode(child);
            if (Array.isArray(transformed))
                currentChildren.push(...transformed);
            else if (transformed) currentChildren.push(transformed);
        }
    }

    branches.push({
        type: currentType,
        expression: currentExpr,
        children: currentChildren,
        dirNode: currentDirNode,
    });

    const result: TransformedNode[] = [];
    branches.forEach((branch, idx) => {
        const dirName =
            idx === 0
                ? "v-if"
                : DIRECTIVE_MAP_ENUM[branch.type].directive;

        const singleEl = canInlineIf(branch.children);
        if (singleEl) {
            result.push({
                ...singleEl,
                props: [
                    ...(singleEl.props || []),
                    {
                        type: "Attribute",
                        name: dirName,
                        value: branch.expression,
                    },
                ],
                inlineDirective: {
                    name: dirName,
                    expression: branch.expression,
                    pos: branch.dirNode.pos,
                    sourceSpans: branch.dirNode.sourceSpans,
                },
            } as TransformedNode);
        } else {
            const wrapper = buildElementNode(
                "template",
                {
                    start: branch.dirNode.pos.start,
                    end: branch.dirNode.pos.start + 8,
                },
                branch.dirNode.pos.end,
                [
                    {
                        type: "Attribute",
                        name: dirName,
                        value: branch.expression,
                    },
                ],
                branch.children,
            ) as TransformedNode;

            const branchSourceSpans = branch.dirNode.sourceSpans;
            if (branchSourceSpans) {
                wrapper.sourceSpans = {
                    full: { start: branch.dirNode.pos.start, end: branch.dirNode.pos.end },
                    name: branchSourceSpans.name,
                    expression: branchSourceSpans.expression,
                };
                wrapper.inlineDirective = {
                    name: dirName,
                    expression: branch.expression,
                    pos: branch.dirNode.pos,
                    sourceSpans: branchSourceSpans,
                };
            }

            result.push(wrapper);
        }
    });

    return result;
}

function applyExtras(result: TransformedNode | null, nodeName: string, expression?: Expression): TransformedNode | null {
    if (!result || result.type !== 'Element' || !expression) return result;
    const extras = expression.extras || {};
    const mapEntry = DIRECTIVE_MAP_ENUM[nodeName as keyof typeof DIRECTIVE_MAP_ENUM];
    const allowed = [...(mapEntry?.extras as readonly string[] || [])] as string[];

    const hasKey = 'key' in extras;
    const hasMemo = 'memo' in extras;

    const extraKeys = Object.keys(extras).filter(k => {
        if (!allowed.includes(k)) return false;
        if (k === ':key' && hasKey) return false;
        if (k === ':memo' && hasMemo) return false;
        return true;
    });
    if (!extraKeys.length) return result;

    const extraProps: PropNode[] = extraKeys.map(name => {
        let attrName: string;
        if (name === 'memo' || name === ':memo') {
            attrName = 'v-memo';
        } else if (name === ':key') {
            attrName = ':key';
        } else {
            attrName = name;
        }

        return {
            type: 'Attribute' as const,
            name: attrName,
            value: extras[name],
            namePos: { start: 0, end: 0 },
            valuePos: { start: 0, end: 0 },
        };
    });

    return { ...result, props: [...(result.props || []), ...extraProps] };
}

export function transformNode(
    node: Node,
): TransformedNode | TransformedNode[] {
    if (node.type === "Directive") {
        switch (node.name) {
            case "if":
                return transformIf(node);
            case "for":
                let forResult = applyDirective(
                    node as any,
                    DIRECTIVE_MAP_ENUM.for.directive,
                    node.children,
                );
                if (!forResult) return [];
                const forResultWithExtras = applyExtras(forResult, node.name, node.expression);
                return forResultWithExtras ? [forResultWithExtras] : [];

            case "show":
            case "cloak":
            case "text":
            case "html":
            case "memo":
            case "pre":
            case "once":
                return (
                    applyDirective(
                        node,
                        DIRECTIVE_MAP_ENUM[node.name].directive,
                        node.children,
                    ) || []
                );
            default:
                return [];
        }
    }
    if (node.children) {
        node.children = node.children
            .flatMap((c) => {
                const transformed = transformNode(c);
                return Array.isArray(transformed)
                    ? transformed
                    : [transformed];
            })
            .filter(Boolean) as Node[];
    }
    return node as TransformedNode;
}
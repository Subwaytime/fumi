export type Node =
    | CommentNode
    | ElementNode
    | TextNode
    | VariableNode;

export type NodeType =
    | 'Comment'
    | 'Element'
    | 'Text'
    | 'Variable';

export interface BaseNode {
    type: NodeType;
    children?: Node[];
    props?: PropNode[];
    skipChildren?: boolean;
    pos: SourcePosition;
}

export interface CommentNode extends BaseNode {
    type: 'Comment';
    content: string;
}

export interface Blob {
    content: string;
    position: Position;
}

export type DirectiveName = 'if' | 'else' | 'else-if' | 'for' | 'cloak' | 'show' | 'text' | 'html' | 'memo' | 'pre' | 'once';

export interface ElementNode extends BaseNode {
    type: 'Element';
    tag: Blob;
    selfClosing?: boolean;
    directiveName?: DirectiveName;
}

export interface Expression {
    content: string;
    variables: VariableRef[];
    extras?: Record<string, string>;
    pos?: Position;
}

export interface VariableRef {
    ref: string;
    pos: Position;
    kind: 'loop_destructured' | 'loop_index' | 'loop_source' | 'loop_variable' | 'standalone'
}

export interface PropNode {
    type: 'Attribute';
    name: Blob;
    value: Blob | true;
}

export interface TextNode extends BaseNode {
    type: "Text";
    content: string;
}

export interface VariableNode extends BaseNode {
    type: 'Variable';
    expression: Expression;
}

export type Stack = ElementNode[];
export type PosObj = { value: number };

export interface Position {
    start: number;
    end: number;
}

export interface SourcePosition extends Position {
    open?: Position;
    close?: Position
}

export type CodeType =
    | "comment-start"
    | "comment-end"
    | "variable-start"
    | "variable-end"
    | "directive-start"
    | "directive-end";

export interface Mapping {
    sourceRange: { start: number; end: number };
    generatedRange: { start: number; end: number };
}

export interface DirectiveBranch {
    type: 'if' | 'else' | 'else-if';
    expression: string | true;
    children: Node[];
    dirNode: DirectivePlaceholder;
}

export interface DirectivePlaceholder {
    type: 'Directive';
    name: DirectiveName;
    pos: SourcePosition;
    expression?: Expression;
    children: Node[];
}

export interface ConditionalChainEntry {
    parent: ElementNode | null;
    rootIndex: number;
    branches: DirectiveBranch[];
    currentBranch: DirectiveBranch;
}

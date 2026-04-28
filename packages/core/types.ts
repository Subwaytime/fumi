export type Node =
    | CommentNode
    | DirectiveNode
    | ElementNode
    | TextNode
    | VariableNode;

export type NodeType =
    'Comment'
    | 'Directive'
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

export type DirectiveName = 'if' | 'else' | 'else-if' | 'for' | 'cloak' | 'show' | 'text' | 'html' | 'memo' | 'pre' | 'once';

export interface DirectiveNode extends BaseNode {
    type: 'Directive';
    name: DirectiveName;
    expression?: Expression;
    children: Node[];
    block?: Position;
}

export interface ElementNode extends BaseNode {
    type: 'Element';
    tag: string;
    tagPosition: Position;
    selfClosing?: boolean;
}

export interface Expression {
    content: string;
    variables: VariableRef[];
    extras?: Record<string, string>;
    pos?: Position;
}

export interface VariableRef {
    name: string;
    pos: Position;
    kind: 'destructured' | 'source' | 'standalone'
}

export interface PropNode {
    type: 'Attribute';
    name: string;
    value: string | true;
    namePos?: { start: number; end: number };
    valuePos?: { start: number; end: number };
}

export interface TextNode extends BaseNode {
    type: "Text";
    content: string;
}

export interface VariableNode extends BaseNode {
    type: 'Variable';
    expression: Expression;
}

export type Stack = (DirectiveNode | ElementNode)[];
export type PosObj = { value: number };

export interface Position {
    start: number;
    end: number;
}

export interface SourcePosition extends Position {
    open?: Position;
    close?: Position
}
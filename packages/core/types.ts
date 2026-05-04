export type Node =
    | CommentNode
    | ElementNode
    | TextNode
    | VariableNode
    | DirectiveNode
    | IfDirectiveNode;

export type NodeType =
    | 'Comment'
    | 'Element'
    | 'Text'
    | 'Variable'
    | 'Directive'
    | 'IfDirective'
    | 'BranchPlaceholder';

export interface BaseNode {
    type: NodeType;
    children?: Node[];
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

export type SingleDirectiveName = 'for' | 'cloak' | 'show' | 'text' | 'html' | 'memo' | 'pre' | 'once';
export type DirectiveName = SingleDirectiveName | 'if' | 'else' | 'else-if';

export interface ElementNode extends BaseNode {
    type: 'Element';
    tag: Blob;
    selfClosing?: boolean;
    props?: PropNode[];
}

export interface ExtraArg {
    value: string;
    pos: Position;
    valuePos: Position;
    keyPos: Position;
}

export interface Expression {
    content: string;
    variables: VariableRef[];
    extras?: Record<string, ExtraArg>;
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

export interface DirectiveNode extends BaseNode {
    type: 'Directive';
    name: SingleDirectiveName;
    namePos: Position;
    expression?: Expression;
}

export interface IfBranch {
    type: 'if' | 'else' | 'else-if';
    expression?: Expression;
    namePos: Position;
    pos: SourcePosition;
    children: Node[];
}

export interface IfDirectiveNode extends BaseNode {
    type: 'IfDirective';
    branches: IfBranch[];
}

export interface BranchPlaceholder {
    type: 'BranchPlaceholder';
    children: Node[];
}

export type StackNode = ElementNode | DirectiveNode | BranchPlaceholder;
export type Stack = StackNode[];
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
    sourceOffsets: number[];
    generatedOffsets: number[];
    lengths: number[];
    data: {
        verification: boolean;
        completion: boolean;
        navigation: boolean;
        semantic: boolean;
        structure: boolean;
        format: boolean;
    };
}

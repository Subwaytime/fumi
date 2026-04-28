import { transformNode } from "./compiler";
import { generate } from "./generate";
import { parse } from "./parse";
import type { TransformedNode } from "./types";

export function handle(content: string) {
    const ast = parse(content);
    const transformed = ast
        .flatMap((n) => {
            const res = transformNode(n);
            return Array.isArray(res) ? res : [res];
        })
        .filter(Boolean) as TransformedNode[];

    const { code, mappings } = generate(transformed);

    return { code, mappings };
}
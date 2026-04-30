import { generate } from "./generate";
import { parse } from "./parse";
import type { Node } from "./types";

export function handle(content: string) {
    const ast = parse(content);

    const { code, mappings } = generate(ast as any);

    return { code, mappings };
}

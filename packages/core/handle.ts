import { generate } from "./generator";
import { parse } from "./parse";
import type { Mapping } from "./types";

export function handle(content: string): { code: string; mappings: Mapping[] } {
    const ast = parse(content);

    const { code, mappings } = generate(ast as any);

    return { code, mappings };
}

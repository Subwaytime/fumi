import { handle } from "../handle";

export function fumiToVue(content: string) {
    const result = handle(content);
    return { htmlCode: result.code, mappings: result.mappings };
}
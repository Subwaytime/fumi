import { handleVariable, handleDirective, handleComment, handleHTML, handleText, type ParseContext } from "./compiler";
import { CHAR_CODES_ENUM } from "./enums/charCodes";
import type { Stack, PosObj, Node } from "./types";
import { toCharCodes } from "./utils/toCharCodes";
import { matchType } from "./utils/matchType";

export function parse(template: string): Node[] {
    const codes = toCharCodes(template);
    const root: Node[] = [];
    const stack: Stack = [];
    const pos: PosObj = { value: 0 };
    const loopVarsStack: Set<string>[] = [];
    const ctx: ParseContext = { ifChains: [] };

    while (pos.value < codes.length) {
        if (matchType("variable-start", codes, pos)) {
            handleVariable(template, codes, pos, root, stack, loopVarsStack);
            continue;
        }
        if (matchType("directive-start", codes, pos)) {
            handleDirective(
                template,
                codes,
                pos,
                root,
                stack,
                loopVarsStack,
                ctx,
            );
            continue;
        }
        if (matchType("directive-end", codes, pos)) {
            handleDirective(
                template,
                codes,
                pos,
                root,
                stack,
                loopVarsStack,
                ctx,
            );
            continue;
        }
        if (codes[pos.value] === CHAR_CODES_ENUM.Lt) {
            if (matchType("comment-start", codes, pos))
                handleComment(
                    template,
                    codes,
                    pos,
                    root,
                    stack,
                );
            else
                handleHTML(template, codes, pos, root, stack);
            continue;
        }
        handleText(template, codes, pos, root, stack);
    }

    return root;
}

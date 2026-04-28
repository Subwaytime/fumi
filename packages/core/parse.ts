import { matchType, handleVariable, handleDirective, handleComment, handleHTML, handleText } from "./compiler";
import { CHAR_CODES_ENUM } from "./enums/charCodes";
import type { Stack, PosObj,  Node } from "./types";
import { toCharCodes } from "./utils/toCharCodes";

export function parse(template: string): Node[] {
    const codes = toCharCodes(template);
    const root: Node[] = [];
    const stack: Stack = [];
    const pos: PosObj = { value: 0 };

    while (pos.value < codes.length) {
        if (matchType("variable-start", codes, pos)) {
            handleVariable(template, codes, pos, root, stack);
            continue;
        }
        if (matchType("directive-start", codes, pos)) {
            handleDirective(
                template,
                codes,
                pos,
                root,
                stack,
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
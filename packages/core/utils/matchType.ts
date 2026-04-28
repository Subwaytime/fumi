import { COMMON_SEQUENCES_ENUM } from "../enums/commonSequences";
import { FLAVOR_ENUM } from "../enums/flavor";
import type { CodeType, PosObj } from "../types";
import { matchSequence } from "./matchSequence";

export function matchType(type: CodeType, codes: Uint8Array, pos: PosObj) {
    switch (type) {
        case "comment-start":
            return matchSequence(
                codes,
                pos.value,
                COMMON_SEQUENCES_ENUM.comment.start,
            );
        case "comment-end":
            return matchSequence(
                codes,
                pos.value,
                COMMON_SEQUENCES_ENUM.comment.end,
            );
        case "variable-start":
            return matchSequence(
                codes,
                pos.value,
                COMMON_SEQUENCES_ENUM.variable.start,
            );
        case "variable-end":
            return matchSequence(
                codes,
                pos.value,
                COMMON_SEQUENCES_ENUM.variable.end,
            );
        case "directive-start":
            return matchSequence(codes, pos.value, FLAVOR_ENUM.start);
        case "directive-end":
            return matchSequence(codes, pos.value, FLAVOR_ENUM.end);
    }
}
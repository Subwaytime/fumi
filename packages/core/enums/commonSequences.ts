import { CHAR_CODES_ENUM } from "./charCodes";

export const COMMON_SEQUENCES_ENUM = {
    variable: {
        start: [CHAR_CODES_ENUM.LeftCurly, CHAR_CODES_ENUM.LeftCurly],
        end: [CHAR_CODES_ENUM.RightCurly, CHAR_CODES_ENUM.RightCurly]
    },
    tag: {
        start: [CHAR_CODES_ENUM.Lt],
        end: [CHAR_CODES_ENUM.Lt, CHAR_CODES_ENUM.Slash],
        selfEnd: [CHAR_CODES_ENUM.Slash, CHAR_CODES_ENUM.Gt]
    },
    comment: {
        start: [CHAR_CODES_ENUM.Lt, CHAR_CODES_ENUM.ExclamationMark],
        end: [CHAR_CODES_ENUM.Dash, CHAR_CODES_ENUM.Dash, CHAR_CODES_ENUM.Gt]
    }
} as const;
import { CHAR_CODES_ENUM } from "./charCodes";

export const FLAVOR_ENUM = {
    start: [CHAR_CODES_ENUM.LeftCurly, CHAR_CODES_ENUM.Percent],
    end: [CHAR_CODES_ENUM.Percent, CHAR_CODES_ENUM.RightCurly],
};
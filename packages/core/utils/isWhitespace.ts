import { CHAR_CODES_ENUM } from "../enums/charCodes";

export function isWhitespace(c: number): boolean {
    return (
        c === CHAR_CODES_ENUM.Space ||
        c === CHAR_CODES_ENUM.NewLine ||
        c === CHAR_CODES_ENUM.Tab ||
        c === CHAR_CODES_ENUM.FormFeed ||
        c === CHAR_CODES_ENUM.CarriageReturn
    );
}
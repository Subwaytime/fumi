export const CHAR_CODES_ENUM = {
    // ======================
    // WHITESPACE
    // ======================
    Tab: 0x09, // "\t"
    NewLine: 0x0a, // "\n"
    FormFeed: 0x0c, // "\f"
    CarriageReturn: 0x0d, // "\r"
    Space: 0x20, // " "

    // ======================
    // PUNCTUATION
    // ======================
    ExclamationMark: 0x21, // "!"
    DoubleQuote: 0x22, // '"'
    Number: 0x23, // "#"
    Dollar: 0x24, // "$"
    Percent: 0x25, // "%"
    Amp: 0x26, // "&"
    SingleQuote: 0x27, // "'"
    LeftParen: 0x28, // "("
    RightParen: 0x29, // ")"
    Asterisk: 0x2a, // "*"
    Plus: 0x2b, // "+"
    Comma: 0x2c, // ","
    Dash: 0x2d, // "-"
    Dot: 0x2e, // "."
    Slash: 0x2f, // "/"
    Colon: 0x3a, // ":"
    Semi: 0x3b, // ";"
    Lt: 0x3c, // "<"
    Eq: 0x3d, // "="
    Gt: 0x3e, // ">"
    QuestionMark: 0x3f, // "?"

    At: 0x40, // "@"

    LeftSquare: 0x5b, // "["
    Backslash: 0x5c, // "\"
    RightSquare: 0x5d, // "]"
    Caret: 0x5e, // "^"
    Underscore: 0x5f, // "_"
    GraveAccent: 0x60, // "`"

    LeftCurly: 0x7b, // "{"
    Pipe: 0x7c, // "|"
    RightCurly: 0x7d, // "}"
    Tilde: 0x7e, // "~"

    // ======================
    // DIGITS
    // ======================
    Zero: 0x30, // "0"
    One: 0x31, // "1"
    Two: 0x32, // "2"
    Three: 0x33, // "3"
    Four: 0x34, // "4"
    Five: 0x35, // "5"
    Six: 0x36, // "6"
    Seven: 0x37, // "7"
    Eight: 0x38, // "8"
    Nine: 0x39, // "9"

    // ======================
    // LETTERS
    // ======================
    UpperA: 0x41, // "A"
    UpperF: 0x46, // "F"
    UpperZ: 0x5a, // "Z"

    LowerA: 0x61, // "a"
    LowerF: 0x66, // "f"
    LowerV: 0x76, // "v"
    LowerX: 0x78, // "x"
    LowerZ: 0x7a, // "z"
} as const;
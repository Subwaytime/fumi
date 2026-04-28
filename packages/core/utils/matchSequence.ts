export function matchSequence(codes: Uint8Array, pos: number, seq: number[]): boolean {
    for (let i = 0; i < seq.length; i++) {
        if (codes[pos + i] !== seq[i]) return false;
    }
    return true;
}
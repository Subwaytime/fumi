export function toCharCodes(str: string): Uint8Array {
    const ret = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        ret[i] = str.charCodeAt(i);
    }
    return ret;
}
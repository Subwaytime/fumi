export class Mapper {
    code = "";
    private _mappings: { sourceRange: { start: number; end: number }; generatedRange: { start: number; end: number } }[] = [];
    public genPos = 0;

    get mappings() {
        return this._mappings.map(m => ({
            sourceOffsets: [m.sourceRange.start],
            generatedOffsets: [m.generatedRange.start],
            lengths: [m.generatedRange.end - m.generatedRange.start],
        }));
    }

    /** Emit text that is identical to source at the given offset */
    emit(text: string, sourceStart: number) {
        this._mappings.push({
            sourceRange: {
                start: sourceStart,
                end: sourceStart + text.length,
            },
            generatedRange: {
                start: this.genPos,
                end: this.genPos + text.length,
            },
        });
        this.code += text;
        this.genPos += text.length;
    }

    /** Emit generated-only text (no source mapping) */
    emitGenerated(text: string) {
        this.code += text;
        this.genPos += text.length;
    }

    /**
     * Emit generated text that maps to a specific source range.
     * Use when generated text differs from source text.
     */
    emitMapped(
        generated: string,
        sourceStart: number,
        sourceEnd: number,
    ) {
        this._mappings.push({
            sourceRange: { start: sourceStart, end: sourceEnd },
            generatedRange: {
                start: this.genPos,
                end: this.genPos + generated.length,
            },
        });
        this.code += generated;
        this.genPos += generated.length;
    }
}
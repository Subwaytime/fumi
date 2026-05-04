import { SourceMap } from '@volar/source-map';
import type { Sfc, VueEmbeddedCode, VueLanguagePlugin } from '@vue/language-core';
import { handle } from '@fumi/core';
import type { Mapping } from '@fumi/core';

interface CodeInfo {
    verification?: boolean;
    completion?: boolean;
    navigation?: boolean;
    semantic?: boolean;
    structure?: boolean;
    format?: boolean;
}

const allCodeFeatures: CodeInfo = {
    verification: true,
    completion: true,
    navigation: true,
    semantic: true,
    structure: true,
    format: true,
};

const plugin: VueLanguagePlugin = ({ modules }) => {
    const CompilerDOM = modules['@vue/compiler-dom'];

    return {
        name: 'fumi',
        version: 2.2,

        getEmbeddedCodes(_fileName: string, sfc: Sfc) {
            if (sfc.template?.lang === 'fumi') {
                return [{ id: 'template', lang: sfc.template.lang }];
            }
            return [];
        },

        resolveEmbeddedCode(_fileName: string, sfc: Sfc, embeddedFile: VueEmbeddedCode) {
            if (embeddedFile.id === 'template' && sfc.template?.lang === 'fumi') {
                const result = handle(sfc.template.content);

                // Push compiled Vue code so Volar's HTML language service can parse it.
                // We break it into mapped segments so IDE features map back to the original Fumi source.
                const segments = toSegments(result.code, result.mappings, sfc.template.name);
                embeddedFile.content.push(...segments);
            }
        },

        compileSFCTemplate(lang: string, template: string, options: any) {
            if (lang !== 'fumi') {
                return undefined;
            }
            if (!template) {
                return undefined;
            }

            const result = handle(template);
            const map = new SourceMap(result.mappings as any);

            // Parse the generated Vue code and map positions back to Fumi
            const vueAst = CompilerDOM.parse(result.code, {
                ...options,
                comments: true,
                onWarn(warning) {
                    if (warning.loc) {
                        warning.loc.start.offset = toFumiOffset(map, warning.loc.start.offset);
                        warning.loc.end.offset = toFumiOffset(map, warning.loc.end.offset);
                    }
                    options.onWarn?.(warning);
                },
                onError(error) {
                    if (error.loc) {
                        error.loc.start.offset = toFumiOffset(map, error.loc.start.offset);
                        error.loc.end.offset = toFumiOffset(map, error.loc.end.offset);
                    }
                    options.onError?.(error);
                },
            });

            CompilerDOM.transform(vueAst, options);

            // Remap AST loc offsets to Fumi positions AND update loc.source
            // so that Vue language core's codegen (which uses loc.source.slice()
            // with loc.start.offset) extracts expressions from the Fumi text.
            const visited = new Set<object>();
            visit(vueAst);

            // Special fix for v-for: Vue's parseVForNode uses
            // node.loc.source.slice(value.loc.start - node.loc.start.offset, ...)
            // to extract loop variable names. Because our remapped expression
            // offsets point into the Fumi source, node.loc.source must contain
            // the Fumi template starting at offset 0 for the slice to work.
            fixVForNodeLocs(vueAst);

            return { ast: vueAst, code: '', preamble: '' };

            function visit(obj: object) {
                for (const key in obj) {
                    const value = (obj as any)[key];
                    if (value && typeof value === 'object') {
                        if (visited.has(value)) {
                            continue;
                        }
                        visited.add(value);

                        // SourceLocation: remap start/end offsets and update source text
                        if (
                            'start' in value &&
                            'end' in value &&
                            'source' in value &&
                            typeof value.source === 'string' &&
                            value.start &&
                            typeof value.start.offset === 'number' &&
                            value.end &&
                            typeof value.end.offset === 'number'
                        ) {
                            const start = toFumiOffset(map, value.start.offset);
                            const end = toFumiOffset(map, value.end.offset);
                            if (start >= 0 && end >= 0 && start < end) {
                                value.start.offset = start;
                                value.end.offset = end;
                                value.source = template.slice(start, end);
                            }
                            // Don't recurse into start/end Position objects to avoid double-remapping
                            visited.add(value.start);
                            visited.add(value.end);
                        }
                        // Standalone Position (not part of a SourceLocation we already handled)
                        else if (
                            'offset' in value &&
                            'line' in value &&
                            'column' in value &&
                            typeof value.offset === 'number'
                        ) {
                            const mapped = toFumiOffset(map, value.offset);
                            if (mapped >= 0) {
                                value.offset = mapped;
                            }
                        }

                        visit(value);
                    }
                }
            }

            function fixVForNodeLocs(node: any) {
                if (node.type === CompilerDOM.NodeTypes.FOR) {
                    node.loc.source = template;
                    node.loc.start.offset = 0;
                }
                if (node.children) {
                    for (const child of node.children) {
                        fixVForNodeLocs(child);
                    }
                }
                if (node.branches) {
                    for (const branch of node.branches) {
                        fixVForNodeLocs(branch);
                    }
                }
            }
        },
    };
};

export = plugin;

function toFumiOffset(map: SourceMap, generatedOffset: number): number {
    const nums: number[] = [];
    for (const mapped of map.toSourceLocation(generatedOffset)) {
        nums.push(mapped[0]);
    }
    return Math.max(-1, ...nums);
}

function toSegments(code: string, mappings: Mapping[], sourceName: string): (string | [string, string, number, CodeInfo])[] {
    if (mappings.length === 0) {
        return [code];
    }

    // Flatten all mapping segments and sort by generated offset
    const segments: { genStart: number; genEnd: number; srcStart: number; data: CodeInfo }[] = [];
    for (const mapping of mappings) {
        for (let i = 0; i < mapping.generatedOffsets.length; i++) {
            const genLen = mapping.generatedLengths?.[i] ?? mapping.lengths[i];
            segments.push({
                genStart: mapping.generatedOffsets[i],
                genEnd: mapping.generatedOffsets[i] + genLen,
                srcStart: mapping.sourceOffsets[i],
                data: mapping.data as CodeInfo,
            });
        }
    }
    segments.sort((a, b) => a.genStart - b.genStart);

    // Merge overlapping segments (keep the first one)
    const merged: typeof segments = [];
    for (const seg of segments) {
        if (merged.length > 0 && seg.genStart < merged[merged.length - 1].genEnd) {
            merged[merged.length - 1].genEnd = Math.max(merged[merged.length - 1].genEnd, seg.genEnd);
        } else {
            merged.push(seg);
        }
    }

    const result: (string | [string, string, number, CodeInfo])[] = [];
    let pos = 0;
    for (const seg of merged) {
        if (seg.genStart > pos) {
            // Unmapped gap
            result.push(code.slice(pos, seg.genStart));
        }
        // Mapped segment
        result.push([code.slice(seg.genStart, seg.genEnd), sourceName, seg.srcStart, seg.data]);
        pos = seg.genEnd;
    }
    if (pos < code.length) {
        result.push(code.slice(pos));
    }

    return result;
}

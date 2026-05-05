import { describe, it, expect } from 'vitest';
import { parse, handle } from '../../packages/core/index';
import * as fs from 'fs';
import * as path from 'path';

const examplesDir = path.join(__dirname);

function readFile(name: string): string {
    return fs.readFileSync(path.join(examplesDir, name), 'utf-8');
}

describe('examples/all', () => {
    const input = readFile('all.input.fumi');

    it('should match expected AST output', () => {
        const ast = parse(input);
        const expectedAst = JSON.parse(readFile('all.ast.json'));
        expect(ast).toEqual(expectedAst);
    });

    it('should match expected Vue output', () => {
        const result = handle(input);
        const expectedVue = readFile('all.output.vue');
        expect(result.code).toBe(expectedVue);
    });
});

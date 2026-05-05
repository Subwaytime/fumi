import { describe, it, expect } from 'vitest';
import { handle } from '../../packages/core/index';

describe('basic HTML', () => {
    it('should convert simple text', () => {
        const result = handle('Hello world').code;
        expect(result).toBe('Hello world');
    });

    it('should convert HTML tags', () => {
        const result = handle('<div>Hello</div>').code;
        expect(result).toBe('<div>Hello</div>');
    });

    it('should convert variable interpolation', () => {
        const result = handle('Hello {{ name }}!').code;
        expect(result).toBe('Hello {{ name }}!');
    });

    it('should handle HTML attributes', () => {
        const result = handle('<div class="foo" id="bar">Hello</div>').code;
        expect(result).toBe('<div class="foo" id="bar">Hello</div>');
    });

    it('should handle self-closing tags', () => {
        const result = handle('<input type="text" />').code;
        expect(result).toBe('<input type="text" />');
    });

    it('should handle comments', () => {
        const result = handle('<!-- This is a comment --><div>Hello</div>').code;
        expect(result).toBe('<!-- This is a comment --><div>Hello</div>');
    });
});

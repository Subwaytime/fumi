import { describe, it, expect } from 'vitest';
import { handle } from '../../packages/core/index';

describe('directive blocks', () => {
    it('should convert v-text directive', () => {
        const result = handle('{% text name %}<span>Old</span>{% endtext %}').code;
        expect(result).toBe('<span v-text="name">Old</span>');
    });

    it('should convert v-html directive', () => {
        const result = handle('{% html rawHtml %}<span>Old</span>{% endhtml %}').code;
        expect(result).toBe('<span v-html="rawHtml">Old</span>');
    });

    it('should convert v-memo directive', () => {
        const result = handle('{% memo [name] %}<div>Content</div>{% endmemo %}').code;
        expect(result).toBe('<div v-memo="[name]">Content</div>');
    });

    it('should convert v-pre directive', () => {
        const result = handle('{% pre %}<span>Raw</span>{% endpre %}').code;
        expect(result).toBe('<span v-pre>Raw</span>');
    });

    it('should convert v-once directive', () => {
        const result = handle('{% once %}<div>Once</div>{% endonce %}').code;
        expect(result).toBe('<div v-once>Once</div>');
    });

    it('should convert v-show directive', () => {
        const result = handle('{% show visible %}<div>Content</div>{% endshow %}').code;
        expect(result).toBe('<div v-show="visible">Content</div>');
    });

    it('should convert v-cloak directive', () => {
        const result = handle('{% cloak %}<div>Content</div>{% endcloak %}').code;
        expect(result).toBe('<div v-cloak>Content</div>');
    });
});

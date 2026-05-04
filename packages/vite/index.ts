import { handle } from '@fumi/core';

export function fumiVite() {
    return {
        name: 'fumi',

        enforce: 'pre',

        async transform(code: string, id: string) {
            if (!id.endsWith('.vue')) return null;

            const templateMatch = code.match(
                /<template(\s+lang="([\w-]+)")?[^>]*>([\s\S]*?)<\/template>/
            );
            if (!templateMatch) return null;

            const lang = templateMatch[2] || 'html';
            if (lang !== 'fumi') return null;

            const templateContent = templateMatch[3];
            if (!templateContent) return null;

            const result = handle(templateContent);

            return {
                code: code.replace(templateMatch[0], `<template>${result.code}</template>`),
                map: result.mappings
            };
        }
    };
}
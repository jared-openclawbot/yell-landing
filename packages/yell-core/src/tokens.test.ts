import { describe, it, expect } from 'vitest';
import {
  buildTokenManifest,
  expandTokenRef,
  getTokenValue,
  tokensAsCSS,
  tokensAsMap,
  validateTokens,
} from './tokens.js';

describe('Design Tokens', () => {
  describe('buildTokenManifest', () => {
    it('resolves simple color tokens', () => {
      const tokens = {
        colors: {
          primary: '#3B82F6',
          danger: '#EF4444',
        },
      };

      const manifest = buildTokenManifest(tokens);

      expect(manifest.resolved['colors.primary'].value).toBe('#3B82F6');
      expect(manifest.resolved['colors.danger'].value).toBe('#EF4444');
    });

    it('resolves spacing tokens with CSS units', () => {
      const tokens = {
        spacing: {
          sm: '8px',
          md: '16px',
          lg: '24px',
        },
      };

      const manifest = buildTokenManifest(tokens);

      expect(manifest.resolved['spacing.sm'].value).toBe('8px');
      expect(manifest.resolved['spacing.md'].value).toBe('16px');
    });

    it('resolves nested token groups', () => {
      const tokens = {
        colors: {
          primary: {
            base: '#3B82F6',
            light: '#60A5FA',
          },
        },
      };

      const manifest = buildTokenManifest(tokens);

      expect(manifest.resolved['colors.primary.base'].value).toBe('#3B82F6');
      expect(manifest.resolved['colors.primary.light'].value).toBe('#60A5FA');
    });

    it('generates CSS custom properties string', () => {
      const tokens = {
        colors: {
          primary: '#3B82F6',
        },
        spacing: {
          sm: '8px',
        },
      };

      const manifest = buildTokenManifest(tokens);
      const css = manifest.cssVariables;

      expect(css).toContain('--colors-primary:#3B82F6');
      expect(css).toContain('--spacing-sm:8px');
    });

    it('detects category from token name', () => {
      const tokens = {
        colors: { primary: '#000' },
        spacing: { sm: '4px' },
        typography: { size: '14px' },
        shadow: { md: '0 4px 6px rgba(0,0,0,0.1)' },
      };

      const manifest = buildTokenManifest(tokens);

      expect(manifest.resolved['colors.primary'].category).toBe('colors');
      expect(manifest.resolved['spacing.sm'].category).toBe('spacing');
      expect(manifest.resolved['typography.size'].category).toBe('typography');
      expect(manifest.resolved['shadow.md'].category).toBe('shadow');
    });

    it('resolves token aliases (token referencing token)', () => {
      const tokens = {
        colors: {
          primary: '#3B82F6',
          primaryLight: '$tokens.colors.primary',
        },
      };

      const manifest = buildTokenManifest(tokens);

      expect(manifest.resolved['colors.primary'].value).toBe('#3B82F6');
      expect(manifest.resolved['colors.primaryLight'].value).toBe('#3B82F6');
    });
  });

  describe('expandTokenRef', () => {
    it('returns undefined for non-token references', () => {
      const result = expandTokenRef('not-a-token', {});
      expect(result).toBeUndefined();
    });

    it('expands a simple token reference', () => {
      const tokens = {
        colors: { primary: '#3B82F6' },
      };
      const cache = new Map<string, string | number>();

      const result = expandTokenRef('$tokens.colors.primary', tokens, cache);

      expect(result).toBe('#3B82F6');
    });

    it('caches expansion results', () => {
      const tokens = {
        colors: { primary: '#3B82F6' },
      };
      const cache = new Map<string, string | number>();

      expandTokenRef('$tokens.colors.primary', tokens, cache);
      const cached = cache.get('colors.primary');

      expect(cached).toBe('#3B82F6');
    });

    it('returns undefined for missing token path', () => {
      const tokens = {};
      const cache = new Map<string, string | number>();

      const result = expandTokenRef('$tokens.colors.doesnotexist', tokens, cache);

      expect(result).toBeUndefined();
    });
  });

  describe('getTokenValue', () => {
    it('returns value for valid token reference', () => {
      const manifest = buildTokenManifest({
        colors: { primary: '#3B82F6' },
      });

      expect(getTokenValue('$tokens.colors.primary', manifest)).toBe('#3B82F6');
    });

    it('returns undefined for non-token reference', () => {
      const manifest = buildTokenManifest({
        colors: { primary: '#3B82F6' },
      });

      expect(getTokenValue('not-a-token', manifest)).toBeUndefined();
    });

    it('returns undefined for missing token', () => {
      const manifest = buildTokenManifest({});

      expect(getTokenValue('$tokens.colors.missing', manifest)).toBeUndefined();
    });
  });

  describe('tokensAsCSS', () => {
    it('produces valid CSS custom properties', () => {
      const manifest = buildTokenManifest({
        colors: { primary: '#3B82F6' },
        spacing: { sm: '8px' },
      });

      const css = tokensAsCSS(manifest);

      expect(css).toContain(':root{');
      expect(css).toContain('--colors-primary:#3B82F6');
      expect(css).toContain('--spacing-sm:8px');
      expect(css).toContain('}');
    });
  });

  describe('tokensAsMap', () => {
    it('exports flat map of token names to values', () => {
      const manifest = buildTokenManifest({
        colors: { primary: '#3B82F6', danger: '#EF4444' },
      });

      const map = tokensAsMap(manifest);

      expect(map['colors.primary']).toBe('#3B82F6');
      expect(map['colors.danger']).toBe('#EF4444');
    });
  });

  describe('validateTokens', () => {
    it('returns valid for proper token structure', () => {
      const tokens = {
        colors: { primary: '#3B82F6' },
        spacing: { sm: '8px' },
      };

      const result = validateTokens(tokens);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('catches invalid token values (arrays, objects as leaves)', () => {
      const tokens = {
        colors: ['#3B82F6', '#EF4444'], // array instead of object
      };

      const result = validateTokens(tokens);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('returns errors for non-object tokens', () => {
      const result = validateTokens('not an object');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('tokens must be an object');
    });

    it('warns about unquoted string values without units', () => {
      const tokens = {
        colors: {
          primary: 'blue color', // unquoted string with space, no CSS units
        },
      };

      const result = validateTokens(tokens);

      expect(result.warnings.some(w => w.includes('unquoted string'))).toBe(true);
    });
  });
});
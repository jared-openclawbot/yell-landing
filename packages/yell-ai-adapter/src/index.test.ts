import { describe, it, expect } from 'vitest';
import {
  extractYAML,
  extractCodeBlocks,
  validateYAML,
  analyzeYAML,
} from '../src/index.js';

describe('@yell/ai-adapter', () => {
  describe('extractYAML', () => {
    it('extracts YAML from code block', () => {
      const input = 'Here is the YAML:\n```yaml\napp:\n  children:\n    - type: Button\n```';
      const yaml = extractYAML(input);
      expect(yaml).toContain('app:');
      expect(yaml).toContain('type: Button');
    });

    it('extracts from unmarked code block', () => {
      const input = '```\napp:\n  children:\n```';
      const yaml = extractYAML(input);
      expect(yaml).toContain('app:');
    });

    it('extracts from plain YAML lines', () => {
      const input = 'Here is the button:\napp:\n  children:\n    - type: Button';
      const yaml = extractYAML(input);
      expect(yaml).toContain('type: Button');
    });

    it('returns null when no YAML found', () => {
      const input = 'This is just text with no YAML';
      const yaml = extractYAML(input);
      expect(yaml).toBeNull();
    });
  });

  describe('extractCodeBlocks', () => {
    it('extracts single code block', () => {
      const input = '```yaml\napp: test\n```';
      const blocks = extractCodeBlocks(input);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toBe('app: test');
    });

    it('extracts multiple code blocks', () => {
      const input = '```yaml\nfirst\n```\n\n```yaml\nsecond\n```';
      const blocks = extractCodeBlocks(input);
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toBe('first');
      expect(blocks[1]).toBe('second');
    });

    it('strips yaml language tag', () => {
      const input = '```yaml\napp: test\n```';
      const blocks = extractCodeBlocks(input);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toBe('app: test');
    });
  });

  describe('validateYAML', () => {
    it('returns no errors for valid YAML', () => {
      const yaml = `
app:
  children:
    - type: Button
      props:
        label: Click
`;
      const errors = validateYAML(yaml);
      expect(errors).toHaveLength(0);
    });

    it('detects inline function in onClick', () => {
      const yaml = `
app:
  children:
    - type: Button
      onClick: () => alert('x')
`;
      const errors = validateYAML(yaml);
      expect(errors.some(e => e.type === 'inline_function')).toBe(true);
    });

    it('detects inline arrow function', () => {
      const yaml = 'onClick: () => console.log("bad")';
      const errors = validateYAML(yaml);
      expect(errors.some(e => e.type === 'inline_function')).toBe(true);
    });

    it('detects ternary expression', () => {
      const yaml = 'showWhen: isAdmin ? true : false';
      const errors = validateYAML(yaml);
      expect(errors.some(e => e.type === 'invalid_expression')).toBe(true);
    });

    it('detects function calls in expressions', () => {
      const yaml = 'showWhen: getStatus(user) == "active"';
      const errors = validateYAML(yaml);
      expect(errors.some(e => e.type === 'invalid_expression')).toBe(true);
    });

    it('allows valid showWhen expressions', () => {
      const yaml = `
app:
  children:
    - type: Modal
      showWhen: isOpen == true
    - type: Badge
      showWhen: user.role == "admin" && isActive
`;
      const errors = validateYAML(yaml);
      expect(errors).toHaveLength(0);
    });

    it('returns suggestions for inline functions', () => {
      const yaml = 'onClick: () => alert(1)';
      const errors = validateYAML(yaml);
      const fnError = errors.find(e => e.type === 'inline_function');
      expect(fnError?.suggestion).toBeDefined();
    });
  });

  describe('analyzeYAML', () => {
    it('extracts component types', () => {
      const yaml = `
app:
  children:
    - type: Button
    - type: Container
      children:
        - type: Text
`;
      const analysis = analyzeYAML(yaml);
      expect(analysis.componentsUsed).toContain('Button');
      expect(analysis.componentsUsed).toContain('Container');
      expect(analysis.componentsUsed).toContain('Text');
    });

    it('extracts token references', () => {
      const yaml = `
app:
  children:
    - type: Button
      props:
        color: $tokens.colors.primary
        bg: $tokens.spacing.md
`;
      const analysis = analyzeYAML(yaml);
      expect(analysis.tokenRefs).toContain('$tokens.colors.primary');
      expect(analysis.tokenRefs).toContain('$tokens.spacing.md');
    });

    it('calculates nesting depth', () => {
      const yaml = `
app:
  children:
    - type: Container
      children:
        - type: Card
          children:
            - type: Button
`;
      const analysis = analyzeYAML(yaml);
      expect(analysis.nestingDepth).toBeGreaterThanOrEqual(4);
    });

    it('handles empty YAML', () => {
      const analysis = analyzeYAML('');
      expect(analysis.componentsUsed).toHaveLength(0);
      expect(analysis.tokenRefs).toHaveLength(0);
      expect(analysis.nestingDepth).toBe(0);
    });

    it(' deduplicates component types', () => {
      const yaml = `
app:
  children:
    - type: Button
    - type: Button
    - type: Button
`;
      const analysis = analyzeYAML(yaml);
      expect(analysis.componentsUsed).toHaveLength(1);
      expect(analysis.componentsUsed[0]).toBe('Button');
    });
  });
});

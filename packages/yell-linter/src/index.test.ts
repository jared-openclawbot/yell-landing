import { describe, it, expect } from 'vitest';
import { lint } from '../src/index.js';

describe('@yell/linter', () => {
  describe('no-inline-functions', () => {
    it('passes with event handler reference', () => {
      const yaml = `
app:
  children:
    - type: Button
      props:
        label: Click
        onClick: handleClick
`;
      const result = lint(yaml);
      expect(result.errors.filter(e => e.rule === 'no-inline-functions')).toHaveLength(0);
    });

    it('fails with inline arrow function', () => {
      const yaml = `
app:
  children:
    - type: Button
      onClick: () => alert('x')
`;
      const result = lint(yaml);
      expect(result.errors.filter(e => e.rule === 'no-inline-functions')).toHaveLength(1);
      expect(result.errors[0].suggestion).toBeDefined();
    });

    it('fails with inline function keyword', () => {
      const yaml = `
app:
  children:
    - type: Button
      onClick: function() { console.log('bad') }
`;
      const result = lint(yaml);
      expect(result.errors.some(e => e.rule === 'no-inline-functions')).toBe(true);
    });
  });

  describe('no-ternary', () => {
    it('passes without ternary', () => {
      const yaml = `
app:
  children:
    - type: Modal
      showWhen: isOpen == true
`;
      const result = lint(yaml);
      expect(result.errors.filter(e => e.rule === 'no-ternary')).toHaveLength(0);
    });

    it('fails with ternary expression', () => {
      const yaml = `
app:
  children:
    - type: Badge
      showWhen: "isAdmin ? true : false"
`;
      const result = lint(yaml);
      expect(result.errors.some(e => e.rule === 'no-ternary')).toBe(true);
    });
  });

  describe('no-function-calls', () => {
    it('passes without function calls', () => {
      const yaml = `
app:
  children:
    - type: Text
      showWhen: user.role == 'admin'
`;
      const result = lint(yaml);
      expect(result.errors.filter(e => e.rule === 'no-function-calls')).toHaveLength(0);
    });

    it('fails with function call', () => {
      const yaml = `
app:
  children:
    - type: Text
      showWhen: getStatus(user) == 'active'
`;
      const result = lint(yaml);
      expect(result.errors.some(e => e.rule === 'no-function-calls')).toBe(true);
    });

    it('allows token references starting with $', () => {
      const yaml = `
app:
  children:
    - type: Button
      backgroundColor: $tokens.colors.primary
`;
      const result = lint(yaml);
      expect(result.errors.filter(e => e.rule === 'no-function-calls')).toHaveLength(0);
    });
  });

  describe('max-nesting-depth', () => {
    it('passes within default depth', () => {
      const yaml = `
app:
  children:
    - type: Container
      children:
        - type: Card
          children:
            - type: Button
`;
      const result = lint(yaml);
      expect(result.errors.filter(e => e.rule === 'max-nesting-depth')).toHaveLength(0);
    });

    it('warns when exceeding default depth of 5', () => {
      // Depth 6 = 7 nested containers, which exceeds max 5
      const yaml = `
app:
  children:
    - type: Container
      children:
        - type: Container
          children:
            - type: Container
              children:
                - type: Container
                  children:
                    - type: Container
                      children:
                        - type: Container
                          children:
                            - type: Button
`;
      const result = lint(yaml);
      expect(result.errors.filter(e => e.rule === 'max-nesting-depth')).toHaveLength(1);
      expect(result.errors[0].severity).toBe('warn');
    });
  });

  describe('invalid YAML', () => {
    it('returns parse error', () => {
      const yaml = 'invalid: yaml: content::';
      const result = lint(yaml);
      expect(result.errors[0].rule).toBe('parse-error');
      expect(result.errors[0].severity).toBe('error');
    });
  });

  describe('summary', () => {
    it('returns ok: true when no errors', () => {
      const yaml = `
app:
  children:
    - type: Button
      onClick: handleClick
`;
      const result = lint(yaml);
      expect(result.ok).toBe(true);
      expect(result.summary.errors).toBe(0);
    });

    it('returns ok: false when errors exist', () => {
      const yaml = `
app:
  children:
    - type: Button
      onClick: () => alert('bad')
`;
      const result = lint(yaml);
      expect(result.ok).toBe(false);
      expect(result.summary.errors).toBeGreaterThan(0);
    });
  });
});

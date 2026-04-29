/**
 * CSRF Security Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateCSRFToken,
  validateCSRFToken,
  generateSignedToken,
  validateSignedToken,
  injectCSRFToken,
  extractCSRFToken,
} from './csrf.js';

describe('CSRF Security', () => {
  describe('generateCSRFToken', () => {
    it('generates a non-empty base64url string', () => {
      const token = generateCSRFToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      // base64url has no padding = and no + /
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('generates unique tokens each time', () => {
      const t1 = generateCSRFToken();
      const t2 = generateCSRFToken();
      expect(t1).not.toBe(t2);
    });

    it('has sufficient entropy (32 bytes = ~43 chars base64url)', () => {
      const token = generateCSRFToken();
      expect(token.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe('validateCSRFToken', () => {
    it('returns true for matching tokens', () => {
      const token = generateCSRFToken();
      expect(validateCSRFToken(token, token)).toBe(true);
    });

    it('returns false for non-matching tokens', () => {
      const t1 = generateCSRFToken();
      const t2 = generateCSRFToken();
      expect(validateCSRFToken(t1, t2)).toBe(false);
    });

    it('returns false for undefined or null', () => {
      expect(validateCSRFToken(undefined, 'something')).toBe(false);
      expect(validateCSRFToken('something', undefined)).toBe(false);
      expect(validateCSRFToken(null, null)).toBe(false);
    });

    it('returns false for different length tokens (fast-fail)', () => {
      const t1 = generateCSRFToken();
      expect(validateCSRFToken(t1, 'short')).toBe(false);
    });
  });

  describe('generateSignedToken / validateSignedToken', () => {
    const secret = 'test-secret-key-32-chars-xxxx';

    it('generates token with signature and expiry', () => {
      const signed = generateSignedToken(secret);
      expect(signed.token).toBeTruthy();
      expect(signed.signature).toBeTruthy();
      expect(signed.expiresAt).toBeGreaterThan(Date.now());
    });

    it('validates a valid signed token', () => {
      const signed = generateSignedToken(secret, 3600000); // 1 hour
      expect(validateSignedToken(signed, secret)).toBe(true);
    });

    it('returns false for tampered token', () => {
      const signed = generateSignedToken(secret);
      const tampered = { ...signed, token: 'tampered' };
      expect(validateSignedToken(tampered, secret)).toBe(false);
    });

    it('returns false for expired token', () => {
      const signed = generateSignedToken(secret, -1000); // already expired
      expect(validateSignedToken(signed, secret)).toBe(false);
    });

    it('returns false for wrong secret', () => {
      const signed = generateSignedToken(secret);
      expect(validateSignedToken(signed, 'wrong-secret')).toBe(false);
    });
  });

  describe('injectCSRFToken', () => {
    it('injects hidden input after form tag', () => {
      const form = '<form action="/submit"><input name="a"></form>';
      const result = injectCSRFToken(form, 'my-token-123');
      expect(result).toContain('<input type="hidden" name="_csrf" value="my-token-123">');
      expect(result).toContain('<form action="/submit">');
    });

    it('handles form with no attributes', () => {
      const form = '<form><button>Submit</button></form>';
      const result = injectCSRFToken(form, 'token');
      expect(result).toContain('name="_csrf"');
    });

    it('does nothing if no form tag', () => {
      const html = '<div>No form here</div>';
      const result = injectCSRFToken(html, 'token');
      expect(result).toBe(html);
    });

    it('handles form with uppercase FORM tag', () => {
      const form = '<FORM method="post"><input name="x"></FORM>';
      const result = injectCSRFToken(form, 'TOKEN');
      expect(result).toContain('name="_csrf" value="TOKEN"');
    });
  });

  describe('extractCSRFToken', () => {
    it('extracts from Authorization Bearer header', () => {
      const ctx = { header: 'Bearer my-csrf-token' };
      expect(extractCSRFToken(ctx)).toBe('my-csrf-token');
    });

    it('extracts from cookie header', () => {
      const ctx = { cookie: '_csrf=cookie-token; other=value' };
      expect(extractCSRFToken(ctx)).toBe('cookie-token');
    });

    it('extracts from body field', () => {
      const ctx = { body: 'body-token' };
      expect(extractCSRFToken(ctx)).toBe('body-token');
    });

    it('prioritizes Authorization over cookie', () => {
      const ctx = {
        header: 'Bearer header-token',
        cookie: '_csrf=cookie-token',
        body: 'body-token',
      };
      expect(extractCSRFToken(ctx)).toBe('header-token');
    });

    it('returns undefined for empty context', () => {
      expect(extractCSRFToken({})).toBeUndefined();
      expect(extractCSRFToken({ header: undefined })).toBeUndefined();
    });
  });
});

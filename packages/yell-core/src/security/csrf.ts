/**
 * Yell Security — CSRF Token Generation and Validation
 * 
 * Generates cryptographically secure tokens and provides
 * middleware-style validation for form protection.
 */

import { randomBytes } from 'crypto';

// Token length in bytes (32 bytes = 256 bits of entropy)
const TOKEN_BYTES = 32;

/**
 * Generate a cryptographically secure CSRF token.
 * Returns base64url-encoded string (no padding).
 */
export function generateCSRFToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Validate a CSRF token against an expected value.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function validateCSRFToken(
  token: string | undefined | null,
  expected: string | undefined | null,
): boolean {
  if (!token || !expected) return false;
  if (token.length !== expected.length) return false;
  
  // Constant-time comparison (prevents timing attacks)
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate a signed CSRF token with expiry.
 * Returns { token, signature, expiresAt }.
 */
export interface SignedToken {
  token: string;
  signature: string;
  expiresAt: number; // Unix timestamp in ms
}

const SIGNING_SECRET_LENGTH = 32;

function hmacLike(data: string, key: string): string {
  // Simple HMAC-like signature using SHA-256
  // In production, use 'crypto.createHmac' with a proper secret
  const { createHmac } = require('crypto');
  return createHmac('sha256', key).update(data).digest('base64url');
}

/**
 * Generate a signed CSRF token with expiry check.
 * The signature proves the token was issued by this server.
 */
export function generateSignedToken(secret: string, maxAgeMs: number = 3600000): SignedToken {
  const token = generateCSRFToken();
  const expiresAt = Date.now() + maxAgeMs;
  const data = `${token}:${expiresAt}`;
  const signature = hmacLike(data, secret);
  
  return { token, signature, expiresAt };
}

/**
 * Validate a signed CSRF token.
 * Checks signature and expiry.
 */
export function validateSignedToken(
  signed: SignedToken,
  secret: string,
): boolean {
  // Check expiry
  if (Date.now() > signed.expiresAt) {
    return false;
  }
  
  // Verify signature
  const data = `${signed.token}:${signed.expiresAt}`;
  const expectedSignature = hmacLike(data, secret);
  
  // Constant-time comparison
  if (expectedSignature.length !== signed.signature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    result |= expectedSignature.charCodeAt(i) ^ signed.signature.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Inject CSRF token into a form's hidden input.
 * Returns HTML string with the hidden field added.
 */
export function injectCSRFToken(html: string, token: string): string {
  const hiddenInput = `<input type="hidden" name="_csrf" value="${token}">`;
  
  // Inject right after <form> tag
  const match = html.match(/<form([^>]*)>/i);
  if (match) {
    return html.replace(
      match[0],
      match[0] + hiddenInput,
    );
  }
  
  // Fallback: prepend at start of form content
  return html.replace(/<form([^>]*)>([\s\S]*?)(<\/form>)/i, (full, attrs, content, close) => {
    return `<form${attrs}>${hiddenInput}${content}${close}`;
  });
}

/**
 * Extract CSRF token from request headers or body.
 * Checks Authorization header first, then Cookie, then body.
 */
export interface CSRFContext {
  token?: string;
  header?: string;  // 'Authorization' value if contains Bearer token
  cookie?: string;  // raw cookie header value
  body?: string;    // body param value
}

export function extractCSRFToken(ctx: CSRFContext): string | undefined {
  // Priority: Authorization Bearer > cookie > body
  if (ctx.header?.startsWith('Bearer ')) {
    return ctx.header.slice(7);
  }
  
  if (ctx.cookie) {
    const match = ctx.cookie.match(/(?:^|;\s*)_csrf=([^;]+)/);
    if (match) return match[1];
  }
  
  return ctx.body;
}

/**
 * Tests for src/lib/utils.ts — pure utility functions.
 * These run in the Node environment for speed.
 */
/// <reference types="vitest/globals" />

import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDate,
  formatDateTime,
  formatTime,
  timeAgo,
  isValidEmail,
  isValidPhone,
  capitalize,
  formatCurrency,
  withQuery,
  toQueryString,
  resolveFileUrl,
  generateId,
} from './utils';

describe('cn', () => {
  it('merges class names correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles falsy values', () => {
    expect(cn('px-2', undefined, false, 'py-4')).toBe('px-2 py-4');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });
});

describe('formatDate', () => {
  it('formats a valid date string', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
  });

  it('returns — for null/undefined', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });

  it('returns "Invalid date" for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('Invalid date');
  });
});

describe('formatDateTime', () => {
  it('formats date and time', () => {
    const result = formatDateTime('2024-01-15T10:30:00Z');
    expect(result).toContain('2024');
  });

  it('returns — for null', () => {
    expect(formatDateTime(null)).toBe('—');
  });
});

describe('formatTime', () => {
  it('formats time component', () => {
    const result = formatTime('2024-01-15T10:30:00Z');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('timeAgo', () => {
  it('returns "Just now" for very recent dates', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe('Just now');
  });

  it('returns "min ago" format', () => {
    const tenMinsAgo = new Date(Date.now() - 10 * 60000).toISOString();
    expect(timeAgo(tenMinsAgo)).toBe('10 min ago');
  });

  it('returns "hr ago" format', () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 3600000).toISOString();
    expect(timeAgo(fiveHoursAgo)).toBe('5 hr ago');
  });

  it('returns "day ago" format', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(timeAgo(twoDaysAgo)).toBe('2 day ago');
  });
});

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@domain.co.in')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('accepts valid Indian phone numbers', () => {
    expect(isValidPhone('9876543210')).toBe(true);
    expect(isValidPhone('98765 43210')).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    expect(isValidPhone('1234567890')).toBe(false);
    expect(isValidPhone('abcdefghij')).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });
});

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('HELLO')).toBe('HELLO');
  });

  it('returns empty string for empty input', () => {
    expect(capitalize('')).toBe('');
  });
});

describe('formatCurrency', () => {
  it('formats as INR', () => {
    expect(formatCurrency(500)).toContain('₹');
    expect(formatCurrency(500)).toContain('500');
  });

  it('handles string amounts', () => {
    expect(formatCurrency('1000')).toContain('1,000');
  });

  it('returns — for null/undefined/empty', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
    expect(formatCurrency('')).toBe('—');
  });

  it('returns — for NaN', () => {
    expect(formatCurrency('abc')).toBe('—');
  });
});

describe('withQuery', () => {
  it('appends query params to a path', () => {
    expect(withQuery('/doctors', { page: 1, limit: 10 })).toBe('/doctors?page=1&limit=10');
  });

  it('returns path unchanged when no params', () => {
    expect(withQuery('/doctors')).toBe('/doctors');
  });

  it('filters out undefined and null values', () => {
    const result = withQuery('/search', { q: 'test', filter: undefined, empty: null });
    expect(result).toBe('/search?q=test');
  });

  it('uses & when path already has query string', () => {
    const result = withQuery('/search?existing=true', { q: 'test' });
    expect(result).toBe('/search?existing=true&q=test');
  });
});

describe('toQueryString', () => {
  it('converts params to query string', () => {
    expect(toQueryString({ a: 'b', c: 'd' })).toBe('a=b&c=d');
  });

  it('filters undefined and null', () => {
    const result = toQueryString({ a: 'b', c: undefined, d: null });
    expect(result).toBe('a=b');
  });
});

describe('resolveFileUrl', () => {
  it('returns full URLs unchanged', () => {
    expect(resolveFileUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
    expect(resolveFileUrl('http://example.com/image.jpg')).toBe('http://example.com/image.jpg');
    expect(resolveFileUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('returns empty string for empty input', () => {
    expect(resolveFileUrl('')).toBe('');
  });

  it('prepends origin for relative paths', () => {
    const result = resolveFileUrl('/uploads/file.jpg');
    expect(result).toMatch(/(http|https):\/\/.*\//);
    expect(result).toContain('uploads/file.jpg');
  });
});

describe('generateId', () => {
  it('generates a non-empty string', () => {
    const id = generateId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});

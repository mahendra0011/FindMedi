// CI step `unescaped-regex-guard` runs: node --test test/escapeRegex.test.js
// (see .github/workflows/ci.yml line ~62). This file deliberately uses the
// built-in node:test runner — NOT jest — so the fallback branch in CI is a
// safety net, not the only runner.
//
// Why these tests matter (REC-006 / PHARMA-003 / CHAT-004):
//   building `new RegExp(userInput)` lets a crafted query such as
//   `((a+)+)+$` trigger catastrophic backtracking, stalling the single Node
//   event loop for every connected user — and it also lets metacharacters
//   silently widen a search into a match-everything filter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeRegex, capSearch, safeSearchRegex, hasRegexMeta, SEARCH_MAX_LENGTH } from '../src/utils/escapeRegex.js';

test('escapeRegex neutralises every regex metacharacter', () => {
  const meta = '.*+?^${}()|[]\\';
  const escaped = escapeRegex(meta);
  const re = new RegExp(`^${escaped}$`);
  assert.equal(re.test(meta), true, 'escaped pattern must match the literal input');
  assert.equal(re.test('anything-else'), false, 'escaped pattern must not match other text');
});

test('escapeRegex treats ReDoS payloads as literal text, not patterns', () => {
  const payload = '((a+)+)+$';
  const re = new RegExp(escapeRegex(payload));
  // A catastrophic pattern would backtrack forever against "aaaaaaaaaaaaaaaaaaaa!"
  // Here it must simply fail to match — proving metacharacters are inert.
  assert.equal(re.test('aaaaaaaaaaaaaaaaaaaa!'), false);
  assert.equal(re.test(payload), true);
});

test('escapeRegex coerces null/undefined to empty string (no match-everything)', () => {
  assert.equal(escapeRegex(null), '');
  assert.equal(escapeRegex(undefined), '');
  // '' compiled as a regex matches EVERYTHING — that is the bug this prevents,
  // so callers get '' back and must skip the filter.
  assert.notEqual(new RegExp('').test('anything'), false);
});

test('capSearch trims and length-caps hostile input', () => {
  assert.equal(capSearch('  CBC  '), 'CBC');
  assert.equal(capSearch(null), '');
  assert.equal(capSearch('x'.repeat(500)).length, SEARCH_MAX_LENGTH);
  // custom cap
  assert.equal(capSearch('abcdef', 3), 'abc');
});

test('safeSearchRegex returns null for empty terms (caller skips filter)', () => {
  assert.equal(safeSearchRegex(''), null);
  assert.equal(safeSearchRegex('   '), null);
  assert.equal(safeSearchRegex(null), null);
});

test('safeSearchRegex matches literally, case-insensitively, never as a pattern', () => {
  const re = safeSearchRegex('C++');
  assert.ok(re instanceof RegExp);
  assert.equal(re.flags, 'i');
  assert.equal(re.test('learn c++ basics'), true);
  assert.equal(re.test('learn ccc basics'), false, 'the + must not act as a quantifier');
});

test('safeSearchRegex caps pathological lengths before compiling', () => {
  const re = safeSearchRegex('a'.repeat(10_000));
  assert.ok(re);
  assert.ok(re.source.length <= SEARCH_MAX_LENGTH);
});

test('hasRegexMeta flags metacharacters and resets lastIndex (safe on /g)', () => {
  assert.equal(hasRegexMeta('plain text'), false);
  assert.equal(hasRegexMeta('a(b)'), true);
  assert.equal(hasRegexMeta(['a', 'b'].join('')), false);
  // lastIndex must not leak between calls when the shared /g regex is reused.
  assert.equal(hasRegexMeta('x*y'), true);
  assert.equal(hasRegexMeta('x*y'), true);
});

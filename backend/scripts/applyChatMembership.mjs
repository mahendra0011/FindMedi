// CHAT-003: attach requireConversationMember to every conversation- and
// message-scoped route in chat.js. Injected immediately after `protect`, so
// membership is proven before any handler query runs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const FILE = 'src/routes/chat.js';
let src = fs.readFileSync(FILE, 'utf8');

// [method, path]
const SCOPED = [
  ['put', '/conversations/:conversationId/request'],
  ['get', '/messages/:conversationId'],
  ['get', '/messages/:conversationId/search'],
  ['put', '/messages/read/:conversationId'],
  ['put', '/messages/delivered/:conversationId'],
  ['put', '/messages/mark-unread/:conversationId'],
  ['put', '/settings/:conversationId'],
  ['delete', '/chat/:conversationId/clear'],
  ['delete', '/chat/:conversationId'],
  ['put', '/chat/:conversationId/draft'],
  ['put', '/chat/:conversationId/pin-message'],
  ['post', '/messages/:messageId/reactions'],
  ['get', '/messages/:messageId/reactions'],
  ['put', '/messages/:messageId'],
  ['delete', '/messages/:messageId'],
  ['put', '/messages/:messageId/star'],
  ['get', '/messages/:messageId/info'],
  ['get', '/messages/:conversationId/media'],
  ['post', '/messages/bulk-delete'],
  ['post', '/messages/forward'],
  ['get', '/starred'],
];

let applied = 0, already = 0;
const misses = [];

for (const [method, rpath] of SCOPED) {
  const esc = rpath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(router\\.${method}\\(\\s*'${esc}'\\s*,\\s*protect)(?![\\w])`);
  if (!re.test(src)) { misses.push(`${method.toUpperCase()} ${rpath}`); continue; }
  // Skip if this registration already carries the guard.
  const reg = src.match(new RegExp(`router\\.${method}\\(\\s*'${esc}'[\\s\\S]{0,300}?=>\\s*\\{`));
  if (reg && /requireConversationMember/.test(reg[0])) { already++; continue; }
  src = src.replace(re, '$1, requireConversationMember()');
  applied++;
}

if (!/middleware\/chatMembership\.js/.test(src)) {
  src = src.replace(
    /^import express from 'express';$/m,
    "import express from 'express';\nimport { requireConversationMember } from '../middleware/chatMembership.js';"
  );
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`chat: guards added ${applied}, already present ${already}, unmatched ${misses.length}`);
for (const m of misses) console.log('   unmatched: ' + m);

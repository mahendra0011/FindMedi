import { readFile } from 'node:fs/promises';

const assistantSource = await readFile(new URL('../../src/routes/assistantBookings.js', import.meta.url), 'utf8');
const lawyerSource = await readFile(new URL('../../src/routes/lawyerBookings.js', import.meta.url), 'utf8');

function bodyFor(source, routeMarker, nextMarker) {
  const start = source.indexOf(routeMarker);
  const end = source.indexOf(nextMarker, start + routeMarker.length);
  if (start < 0 || end < 0) throw new Error(`Could not isolate handler ${routeMarker}`);
  return source.slice(start, end);
}

const assistantComplete = bodyFor(assistantSource, "router.post('/:id/complete'", "router.post('/:id/cancel'");
const lawyerComplete = bodyFor(lawyerSource, "router.post('/:id/complete'", "router.post('/:id/cancel'");

describe('booking completion transaction contracts', () => {
  it.each([
    ['assistant', assistantComplete, /assistantId:\s*req\.user\._id,\s*status:\s*'in_progress',\s*settledAt:\s*null/],
    ['lawyer', lawyerComplete, /lawyerId:\s*req\.user\._id,\s*status:\s*\{\s*\$in:\s*\['confirmed',\s*'in_progress'\]\s*\},\s*settledAt:\s*null/],
  ])('%s completion only claims a still-eligible unsettled booking', (_module, body, predicate) => {
    expect(body).toMatch(predicate);
    expect(body).toMatch(/if\s*\(!completed\)\s*\{[\s\S]*?abortTransaction\(\)[\s\S]*?already completed/);
  });

  it.each([
    ['assistant', assistantComplete, 'assistant'],
    ['lawyer', lawyerComplete, 'lawyer'],
  ])('%s settlement, booking write and outbox are enclosed before transaction commit', (_module, body, source) => {
    expect(body).toMatch(/startTransaction\(/);
    expect(body).toMatch(new RegExp(`recordServiceSettlement\\(\\{[\\s\\S]*?source:\\s*'${source}'[\\s\\S]*?session`));
    expect(body).toMatch(/OutboxEvent\.create\(/);
    expect(body.indexOf('recordServiceSettlement')).toBeLessThan(body.indexOf('commitTransaction'));
    expect(body.indexOf('OutboxEvent.create')).toBeLessThan(body.indexOf('commitTransaction'));
    expect(body).toMatch(/catch\s*\([^)]*\)\s*\{[\s\S]*?abortTransaction\(\)/);
  });
});

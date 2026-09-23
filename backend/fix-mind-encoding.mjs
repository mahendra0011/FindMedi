import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const ROOT = 'D:/projects/Findmedi';
const getHead = (p) => execSync(`git show HEAD:${p}`, { cwd: ROOT, encoding: 'buffer' }).toString('utf-8');
const save = (p, text) => writeFileSync(`${ROOT}/${p}`, text, { encoding: 'utf-8' });

const REMOVE_TABS = ['overview', 'schedule', 'earnings', 'history', 'reviews'];
const KEEP_TABS = ['sessions', 'patients', 'notes', 'resources', 'settings'];

function rebuildDashboard(path) {
  let text = getHead(path);
  if (text.includes('\r')) throw new Error(path + ': unexpected CR bytes in HEAD version');
  let lines = text.split('\n');
  console.log(path, 'pristine lines:', lines.length);

  // 1. Delete triggers + contents for removed tabs (sequential pairing, no nesting)
  const out = [];
  let skip = false;
  for (const line of lines) {
    const trig = line.match(/<TabsTrigger value="([^"]+)">/);
    if (trig && REMOVE_TABS.includes(trig[1])) continue;
    const open = line.match(/<TabsContent value="([^"]+)"/);
    if (open && REMOVE_TABS.includes(open[1])) { skip = true; continue; }
    if (skip && line.trim() === '</TabsContent>') { skip = false; continue; }
    if (skip) continue;
    out.push(line);
  }
  lines = out;

  // 2. useSearchParams import (after use-toast import)
  const importAnchor = 'import { useToast } from "@/mind/components/ui/use-toast";';
  const ii = lines.findIndex((l) => l.includes(importAnchor));
  if (ii === -1) throw new Error(path + ': import anchor missing');
  lines.splice(ii + 1, 0, 'import { useSearchParams } from "react-router-dom";');

  // 3. activeTab const after dispatch
  const di = lines.findIndex((l) => l.includes('const dispatch = useAppDispatch();'));
  if (di === -1) throw new Error(path + ': dispatch anchor missing');
  lines.splice(di + 1, 0,
    '  const [searchParams, setSearchParams] = useSearchParams();',
    '  const _rawTab = searchParams.get("tab") || "sessions";',
    `  const activeTab = ${JSON.stringify(KEEP_TABS)}.includes(_rawTab) ? _rawTab : "sessions";`);

  // 4. Controlled Tabs + hidden TabsList
  const ti = lines.findIndex((l) => l.includes('<Tabs defaultValue="overview"'));
  if (ti === -1) throw new Error(path + ': Tabs anchor missing');
  lines[ti] = '            <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-5">';
  const li = lines.findIndex((l) => l.includes('<TabsList className="dashboard-panel'));
  if (li === -1) throw new Error(path + ': TabsList anchor missing');
  lines[li] = '              <TabsList className="hidden">';

  let result = lines.join('\n');
  if (!result.endsWith('\n')) result += '\n';
  // sanity: no removed tab triggers/contents remain, kept ones intact
  for (const t of REMOVE_TABS) {
    if (result.includes(`value="${t}"`)) throw new Error(path + `: leftover ${t}`);
  }
  for (const t of KEEP_TABS) {
    if (!result.includes(`value="${t}"`)) throw new Error(path + `: missing kept ${t}`);
  }
  save(path, result);
  console.log(path, 'rebuilt OK, lines:', result.split('\n').length);
}

function rebuildWellness(path) {
  let text = getHead(path);
  if (text.includes('\r')) throw new Error(path + ': unexpected CR bytes in HEAD version');
  let lines = text.split('\n');
  console.log(path, 'pristine lines:', lines.length);

  // 1. Remove assignments panel (PanelHeader title anchor .. its closing WellnessPanel)
  let start = lines.findIndex((l) => l.includes('title="Counsellor Assignments"'));
  if (start === -1) throw new Error('assignments panel anchor missing');
  // panel opens at the WellnessPanel line above the header; close = first </WellnessPanel> after start
  let open = start;
  while (open >= 0 && !lines[open].includes('<WellnessPanel>')) open--;
  let close = start;
  while (close < lines.length && !lines[close].includes('</WellnessPanel>')) close++;
  if (open < 0 || close >= lines.length) throw new Error('assignments panel bounds missing');
  // also drop one following blank line if present
  let end = close;
  if (lines[end + 1] !== undefined && lines[end + 1].trim() === '') end++;
  lines.splice(open, end - open + 1);

  // 2. Remove AssignmentsSection function (up to export default line)
  start = lines.findIndex((l) => l.includes('function AssignmentsSection()'));
  if (start === -1) throw new Error('AssignmentsSection anchor missing');
  let exp = lines.findIndex((l) => l.includes('export default MyWellness;'));
  if (exp === -1 || exp <= start) throw new Error('export anchor missing');
  let fnEnd = exp - 1;
  while (fnEnd > start && lines[fnEnd].trim() === '') fnEnd--;
  if (lines[fnEnd].trim() !== '}') throw new Error('function end not found, got: ' + lines[fnEnd]);
  // drop preceding blank line too
  let fnStart = start;
  if (lines[fnStart - 1].trim() === '') fnStart--;
  lines.splice(fnStart, fnEnd - fnStart + 1);

  // 3. Cut goals panel (PanelHeader title anchor .. its closing WellnessPanel)
  start = lines.findIndex((l) => l.includes('title="Wellness Goals & Achievements"'));
  if (start === -1) throw new Error('goals panel anchor missing');
  open = start;
  while (open >= 0 && !lines[open].includes('<WellnessPanel>')) open--;
  close = start;
  while (close < lines.length && !lines[close].includes('</WellnessPanel>')) close++;
  if (open < 0 || close >= lines.length) throw new Error('goals panel bounds missing');
  const panel = lines.slice(open, close + 1);
  end = close;
  if (lines[end + 1] !== undefined && lines[end + 1].trim() === '') end++;
  lines.splice(open, end - open + 1);

  // 4. Insert as new TabsContent before assessment content
  const ai = lines.findIndex((l) => l.includes('<TabsContent value="assessment"'));
  if (ai === -1) throw new Error('assessment anchor missing');
  lines.splice(ai, 0,
    '              <TabsContent value="goals" className="dashboard-tab-motion space-y-6">',
    ...panel,
    '              </TabsContent>',
    '');

  // 5. Goals trigger after Dashboard trigger
  const trig = '<TabsTrigger value="dashboard"';
  const ti = lines.findIndex((l) => l.includes(trig));
  if (ti === -1) throw new Error('dashboard trigger anchor missing');
  const indent = lines[ti].slice(0, lines[ti].indexOf('<TabsTrigger'));
  lines.splice(ti + 1, 0, `${indent}<TabsTrigger value="goals" className="rounded-lg data-[state=active]:bg-background">Goals</TabsTrigger>`);

  let result = lines.join('\n');
  if (!result.endsWith('\n')) result += '\n';
  if (result.includes('AssignmentsSection') || result.includes('Counsellor Assignments')) throw new Error('assignments leftover');
  if (!result.includes('value="goals"')) throw new Error('goals tab missing');
  save(path, result);
  console.log(path, 'rebuilt OK, lines:', result.split('\n').length);
}

rebuildDashboard('frontend/src/mind/pages/CounsellorDashboard.tsx');
rebuildDashboard('frontend/src/mind/pages/PsychiatristDashboard.tsx');
rebuildWellness('frontend/src/mind/pages/MyWellness.tsx');
console.log('ALL DONE');

#!/usr/bin/env node
// FindMedi infra one-command starter + health checker.
// npm run infra:up | npm run infra:status | npm run infra:down
// Hamesha --profile routing/media/edge ke saath up karta hai (bina profile
// ke valhalla/livekit/nginx SKIP ho jate hain — yehi sabse bada gotcha tha).
import { execSync } from 'node:child_process';

const COMPOSE = 'compose -f infra/docker-compose.yml --profile routing --profile media --profile edge';
const mode = (process.argv[2] || 'status').toLowerCase();

function sh(cmd, ms = 30000) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: ms }).trim();
  } catch (e) {
    return String((e.stdout || '') + (e.stderr || e.message)).slice(0, 120);
  }
}
async function httpOk(url, ms = 4000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal });
    return { ok: true, s: r.status };
  } catch (e) {
    return { ok: false, s: e.cause?.code || e.name };
  } finally { clearTimeout(t); }
}
const running = (n) => sh(`docker inspect -f "{{.State.Running}}" ${n}`) === 'true';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ensureMongoRs() {
  const o = sh(`docker exec findmedi-mongo1 mongosh --quiet --eval "try{rs.status().ok}catch(e){print('NOT_INIT')}"`);
  if (o.includes('NOT_INIT') || o.includes('no replset')) {
    console.log('... mongo replica set init (pehli baar) ...');
    sh(`docker exec findmedi-mongo1 mongosh --quiet --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'mongo1:27017'}]})"`);
  }
}

async function health() {
  const rows = [];
  const pg = sh('docker exec findmedi-postgres pg_isready -U findmedi');
  rows.push(['postgres', '5433', pg.includes('accepting') ? 'UP' : 'DOWN', pg.includes('accepting') ? 'accepting connections' : pg]);
  const mp = sh(`docker exec findmedi-mongo1 mongosh --quiet --eval "db.runCommand({ping:1}).ok"`);
  rows.push(['mongo1', '27018', mp.includes('1') ? 'UP' : 'DOWN', mp.includes('1') ? 'ping ok (replica set)' : mp]);
  const rp = sh('docker exec findmedi-redis redis-cli ping');
  rows.push(['redis', '6380', rp.includes('PONG') ? 'UP' : 'DOWN', rp.includes('PONG') ? 'PONG' : rp]);
  rows.push(['zookeeper', '2181', running('findmedi-zookeeper') ? 'UP' : 'DOWN', running('findmedi-zookeeper') ? 'running' : 'stopped']);
  const topics = sh('docker exec findmedi-kafka kafka-topics --bootstrap-server localhost:29092 --list');
  rows.push(['kafka', '9092', topics.includes('findmedi.') ? 'UP' : 'DOWN', topics.includes('findmedi.') ? `${topics.split('\n').filter(Boolean).length} topics` : topics]);
  const os = await httpOk('http://localhost:9200/');
  rows.push(['opensearch', '9200', os.ok ? 'UP' : (running('findmedi-opensearch') ? 'BOOT' : 'DOWN'), os.ok ? `HTTP ${os.s}` : `${os.s} (boot me 30-60s lagta hai)`]);
  const vh = await httpOk('http://localhost:8002/status');
  let vd = vh.ok ? `HTTP ${vh.s}` : String(vh.s);
  if (vh.ok) {
    try {
      const j = await (await fetch('http://localhost:8002/status')).json();
      vd = `v${j.version}, tiles ok`;
    } catch { /* keep */ }
  }
  rows.push(['valhalla', '8002', vh.ok ? 'UP' : (running('findmedi-valhalla') ? 'BOOT' : 'DOWN'), vd]);
  const lk = running('findmedi-livekit');
  rows.push(['livekit', '7880', lk ? 'UP' : 'DOWN', lk ? 'running (video calls ready)' : 'stopped']);
  const pn = await httpOk('http://localhost:9000/');
  rows.push(['pinot', '9000', pn.ok ? 'UP' : (running('findmedi-pinot-controller') ? 'BOOT' : 'DOWN'), pn.ok ? `HTTP ${pn.s}` : 'JVM boot 1-2 min']);
  const fl = await httpOk('http://localhost:8081/overview');
  rows.push(['flink', '8081', fl.ok ? 'UP' : (running('findmedi-flink-jobmanager') ? 'BOOT' : 'DOWN'), fl.ok ? `HTTP ${fl.s}` : 'JVM boot 1-2 min']);

  const w = (s, n) => String(s).padEnd(n);
  console.log('\n' + w('SERVICE', 12) + w('PORT', 7) + w('STATUS', 8) + 'DETAIL');
  console.log('-'.repeat(64));
  let bad = 0;
  for (const r of rows) {
    const icon = r[2] === 'UP' ? '✅' : r[2] === 'BOOT' ? '🟡' : '❌';
    if (r[2] === 'DOWN') bad += 1;
    console.log(w(r[0], 12) + w(r[1], 7) + w(`${icon} ${r[2]}`, 8) + r[3]);
  }
  console.log('-'.repeat(64));
  console.log(bad === 0 ? 'Sab UP — ab `npm run dev` chalao (backend :5001 + frontend :5173)\n'
    : `${bad} DOWN — 30s ruk ke \`npm run infra:status\` dobara chalao (JVM services slow boot)\n`);
  return bad;
}

if (mode === 'down') {
  console.log('Infra stop (volumes safe — data delete nahi hoga) ...');
  console.log(sh(`docker ${COMPOSE} stop`, 60000));
  process.exit(0);
}
if (mode === 'up') {
  console.log('Full infra up (mongo, postgres, redis, kafka, opensearch, valhalla, livekit, pinot, flink) ...');
  // NOTE: `up -d` poore compose pe ek saath timeout ho sakta hai (pinot/flink
  // images 3-4GB pull + JVM boot). Isliye 2 phase: pehle halke services,
  // phir bhaari JVM services — har phase apne timeout ke saath.
  execSync(`docker ${COMPOSE} up -d mongo1 postgres redis zookeeper kafka opensearch valhalla livekit`, { stdio: 'inherit' });
  console.log('10s wait (kafka/opensearch JVM boot) ...');
  await sleep(10000);
  ensureMongoRs();
  console.log('Phase 2: pinot + flink (JVM, 1-2 min boot) ...');
  execSync(`docker ${COMPOSE} up -d pinot-controller flink-jobmanager flink-taskmanager`, { stdio: 'inherit' });
  process.exit((await health()) === 0 ? 0 : 1);
}
await health();

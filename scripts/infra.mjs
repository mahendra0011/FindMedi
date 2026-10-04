#!/usr/bin/env node
// FindMedi infra one-command starter + health checker.
// npm run infra:up | npm run infra:status | npm run infra:down
// Hamesha --profile routing/media/edge ke saath up karta hai (bina profile
// ke valhalla/livekit/nginx SKIP ho jate hain — yehi sabse bada gotcha tha).
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
// DP-B-01: 9200 HTTPS-only hai (self-signed dev cert) — fetch() TLS verify
// fail karayega, isliye raw https with rejectUnauthorized:false. Koi bhi HTTP
// status code (401 incl.) = cluster zinda hai; auth check compose healthcheck ka kaam.
function httpsOk(url, ms = 4000) {
  return new Promise((resolve) => {
    const req = https.request(url, { rejectUnauthorized: false, timeout: ms }, (res) => {
      res.resume();
      resolve({ ok: true, s: res.statusCode });
    });
    req.on('error', (e) => resolve({ ok: false, s: e.code || e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, s: 'TIMEOUT' }); });
    req.end();
  });
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

// ── Machine-local TLS secrets (pehli baar auto-generate) ──────────────────────
// Kafka: cp-kafka ka `configure` script *_FILENAME + creds FILES require karta
// hai — missing = configure exits = crash-loop (yahi bug tha). OpenSearch:
// security plugin ko PEM cert paths chahiye. Dono ek hi baar bante hain aur
// .gitignore me hain (kabhi commit nahi hote).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KAFKA_SECRETS = path.join(ROOT, 'infra', 'kafka', 'secrets');
const OS_CERTS = path.join(ROOT, 'infra', 'opensearch', 'certs');
const winPath = (p) => p.replace(/\\/g, '/');

function ensureSecrets() {
  mkdirSync(KAFKA_SECRETS, { recursive: true });
  // Broker JAAS (SASL_SSL listener ke liye JaasContext). KAFKA_OPTS me NAHI —
  // cub zk-ready wo forward karke preflight fail karta (dekh: docker-compose.yml).
  const jaas = path.join(KAFKA_SECRETS, 'jaas-server.conf');
  if (!existsSync(jaas)) {
    writeFileSync(jaas, 'KafkaServer {\n    org.apache.kafka.common.security.scram.ScramLoginModule required;\n};\n');
  }
  const kafkaNeed = ['kafka.keystore.jks', 'kafka.truststore.jks', 'kafka.key.credentials', 'kafka.keystore.credentials', 'kafka.truststore.credentials'];
  if (kafkaNeed.some((f) => !existsSync(path.join(KAFKA_SECRETS, f)))) {
    console.log('... kafka JKS secrets generate (keytool, ek hi baar) ...');
    sh(`docker run --rm -v "${winPath(KAFKA_SECRETS)}:/secrets" --entrypoint bash confluentinc/cp-kafka:7.5.0 -c "keytool -genkeypair -alias findmedi -keyalg RSA -keysize 2048 -validity 3650 -storetype JKS -keystore /secrets/kafka.keystore.jks -storepass findmedi_dev_keystore -keypass findmedi_dev_key -dname CN=localhost -ext SAN=dns:localhost,ip:127.0.0.1 && keytool -exportcert -alias findmedi -keystore /secrets/kafka.keystore.jks -storepass findmedi_dev_keystore -file /tmp/fm.pem -rfc && keytool -importcert -noprompt -alias CARoot -file /tmp/fm.pem -storetype JKS -keystore /secrets/kafka.truststore.jks -storepass findmedi_dev_truststore && echo -n findmedi_dev_keystore > /secrets/kafka.keystore.credentials && echo -n findmedi_dev_key > /secrets/kafka.key.credentials && echo -n findmedi_dev_truststore > /secrets/kafka.truststore.credentials"`, 120000);
  }
  mkdirSync(OS_CERTS, { recursive: true });
  const osNeed = ['node-0.pem', 'node-0-key.pem', 'root-ca.pem', 'root-ca-key.pem'];
  if (osNeed.some((f) => !existsSync(path.join(OS_CERTS, f)))) {
    console.log('... opensearch TLS certs generate (self-signed, ek hi baar) ...');
    sh(`docker run --rm -v "${winPath(OS_CERTS)}:/certs" --entrypoint bash confluentinc/cp-kafka:7.5.0 -c "openssl req -x509 -newkey rsa:2048 -days 3650 -nodes -keyout /certs/node-0-key.pem -out /certs/node-0.pem -subj /CN=findmedi-node1 && cp /certs/node-0.pem /certs/root-ca.pem && cp /certs/node-0-key.pem /certs/root-ca-key.pem"`, 120000);
  }
  const missing = kafkaNeed.filter((f) => !existsSync(path.join(KAFKA_SECRETS, f)))
    .concat(osNeed.filter((f) => !existsSync(path.join(OS_CERTS, f))));
  if (missing.length) console.warn(`! secrets nahi ban paye (${missing.join(', ')}) — docker chal raha hai? kafka/opensearch DOWN dikhenge.`);
}

// ── Kafka topics/users (DP-B-02: auto-create OFF, koi data volume nahi) ───────
// Container recreate = topics gayab. Har `infra:up` par idempotent re-create,
// provision-topics.sh ke same manifest se — par bina jq (image me hai hi nahi).
// Quoting-rahit commands chahiye: sh() cmd.exe se jaata hai aur PS/cmd dono me
// "\"...\"" quoting alag tarike se todti hai (empirically: `;` wala add-config
// split ho kar "Invalid entity config" deta tha). Success ko __OK__ marker se
// pakdo — kafka CLI errors me 'Error'/'Exception' jaisa keyword nahi hota.
const ok = (out) => String(out).includes('__OK__');
const run = (cmd, ms = 20000) => sh(`${cmd} && echo __OK__`, ms);

async function ensureTopics() {
  if (!running('findmedi-kafka')) {
    console.warn('! kafka chal nahi raha — topic provisioning skip');
    return;
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path.join(ROOT, 'infra', 'kafka', 'provision', 'topics.json'), 'utf8'));
  } catch (e) {
    console.warn(`! topics.json nahi mila — provisioning skip (${e.message})`);
    return;
  }
  const BOOT = 'localhost:29092';
  let ready = false;
  for (let i = 0; i < 20 && !ready; i += 1) {
    ready = ok(run(`docker exec findmedi-kafka kafka-topics --bootstrap-server ${BOOT} --list`, 8000));
    if (!ready) await sleep(1500);
  }
  if (!ready) { console.warn('! kafka broker ready nahi hua — topics skip'); return; }
  const rf = process.env.KAFKA_REPLICATION_FACTOR || '1';
  const pw = process.env.KAFKA_SASL_PASSWORD || 'findmedi_dev_sasl';
  for (const u of manifest.users || []) {
    if (u.role === 'superuser') continue;
    // Comma form (kafka-configs documented format) — shell metacharacter nahi.
    const r = run(`docker exec findmedi-kafka kafka-configs --bootstrap-server ${BOOT} --entity-type users --entity-name ${u.name} --alter --add-config SCRAM-SHA-512=[password=${pw}],SCRAM-SHA-256=[password=${pw}]`);
    if (!ok(r)) console.warn(`! scram user ${u.name}: ${r.slice(0, 100)}`);
  }
  for (const t of manifest.topics || []) {
    const retention = (t.retentionHours ?? 168) * 3600 * 1000;
    const r = run(`docker exec findmedi-kafka kafka-topics --bootstrap-server ${BOOT} --create --if-not-exists --topic ${t.name} --partitions ${t.partitions} --replication-factor ${rf} --config retention.ms=${retention} --config min.insync.replicas=1`);
    if (!ok(r)) console.warn(`! topic ${t.name}: ${r.slice(0, 100)}`);
  }
  console.log(`kafka provisioned: ${(manifest.topics || []).length} topics + SCRAM users (auto-create OFF — DP-B-02)`);
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
  let os = await httpsOk('https://localhost:9200/');
  if (!os.ok) os = await httpOk('http://localhost:9200/');
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
  ensureSecrets(); // kafka JKS + opensearch PEM certs (pehli baar)
  execSync(`docker ${COMPOSE} up -d mongo1 postgres redis zookeeper kafka opensearch valhalla livekit`, { stdio: 'inherit' });
  console.log('10s wait (kafka/opensearch JVM boot) ...');
  await sleep(10000);
  ensureMongoRs();
  console.log('Phase 2: pinot + flink (JVM, 1-2 min boot) ...');
  execSync(`docker ${COMPOSE} up -d pinot-controller flink-jobmanager flink-taskmanager`, { stdio: 'inherit' });
  await ensureTopics(); // auto-create OFF + no volume = har up par provision
  process.exit((await health()) === 0 ? 0 : 1);
}
await health();

const ffi = require('ffi-napi');
const path = require('path');

const libPath = path.join(__dirname, '..', 'medi_core_napi.dll');
const lib = ffi.Library(libPath, {
  hello: ['int', []],
  add: ['int', ['int', 'int']],
  benchmark_hello: ['double', ['uint32']],
});

console.log('=== medi-core-napi Hello World Test ===\n');

console.log('hello():', lib.hello());

console.log('add(17, 25):', lib.add(17, 25));
console.log('add(1000, 9999):', lib.add(1000, 9999));

const iterations = 1_000_000;
const avgNs = lib.benchmark_hello(iterations);
console.log(`\nbenchmark_hello(${iterations.toLocaleString()}): ${avgNs.toFixed(1)} ns/op`);
console.log(`  throughput: ${(1_000_000_000 / avgNs).toFixed(0)} ops/sec`);

// Compare with JS equivalent
const t0 = Date.now();
for (let i = 0; i < iterations; i++) {
  const _ = 42;
}
const jsMs = Date.now() - t0;
console.log(`\nJS literal 42 x${iterations.toLocaleString()}: ${(jsMs / iterations * 1000).toFixed(1)} ns/op`);

console.log('\n✓ Rust native module loads and runs from Node.js');

// ── Extended tests (CSV + OTP) via napi-rs index.js ─────────────────────
console.log('\n=== Extended Tests (CSV + OTP) ===');

try {
  const napi = require('../index.js');

  // CSV tests
  console.log('\n-- CSV Export --');
  const rows = [{ name: 'Alice', email: 'a@b.c', amount: 100 }, { name: 'Bob', email: 'b@c.d', amount: 200 }];
  const fields = ['name', 'email', 'amount'];
  const csv = napi.toCsv(JSON.stringify(rows), JSON.stringify(fields));
  console.log('toCsv:', csv.trim());

  console.log('\n-- CSV Parse --');
  const parsed = napi.parseCsv(csv);
  const parsedRows = JSON.parse(parsed);
  console.log('parseCsv:', parsedRows.length, 'rows');
  console.log('Row 0:', parsedRows[0]);

  // OTP tests
  console.log('\n-- OTP Hash/Verify & Classification --');
  const otp = '123456';
  const hash = napi.hashOtp(otp);
  console.log('hashOtp:', hash.substring(0, 33) + '...');
  console.log('classifyOtpHash (Sha256):', napi.classifyOtpHash(hash));
  console.log('classifyOtpHash (Bcrypt):', napi.classifyOtpHash('$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'));
  console.log('classifyOtpHash (Unknown):', napi.classifyOtpHash('malformed_hash'));
  console.log('verifyOtpHash (correct):', napi.verifyOtpHash(otp, hash));
  console.log('verifyOtpHash (wrong):', napi.verifyOtpHash('999999', hash));
  console.log('verifyOtpHash (bcrypt fallback signal):', napi.verifyOtpHash(otp, '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy') === false);

  // Constant-time compare
  console.log('\n-- Constant-Time Compare --');
  console.log('constantTimeCompare(abc, abc):', napi.constantTimeCompare('abc', 'abc'));
  console.log('constantTimeCompare(abc, abd):', napi.constantTimeCompare('abc', 'abd'));

  // Bounds & DoS validation
  console.log('\n-- Bounds & DoS Validation --');
  let boundsCaught = false;
  try {
    napi.resizeImage(Buffer.from([0]), 50000, 50000, 80);
  } catch (err) {
    boundsCaught = true;
    console.log('resizeImage bounds check correctly caught oversized dimensions:', err.message);
  }
  if (!boundsCaught) throw new Error('Expected resizeImage to reject 50000x50000 dimensions');

  // Invoice PDF generation
  console.log('\n-- Invoice PDF Generation (AFM Helvetica widths) --');
  const invoiceData = {
    patient_name: 'John Doe with an Extra Long Name That Will Be Safely Truncated',
    provider: 'FindMedi Specialty Hospital',
    service_type: 'Consultation',
    amount: 500,
    invoice_id: 'INV-TEST-001',
    transaction_id: 'TXN-TEST-001',
    line_items: [
      { name: 'Specialist Consultation', qty: 1, price: 500 }
    ]
  };
  const pdfBytes = napi.generateInvoicePdf(JSON.stringify(invoiceData));
  console.log('Generated PDF bytes:', pdfBytes.length, 'bytes (PDF magic:', Buffer.from(pdfBytes.slice(0, 4)).toString(), ')');

  console.log('\n✓ All extended tests passed!');
} catch (e) {
  console.error('Extended tests failed:', e.message);
  process.exit(1);
}

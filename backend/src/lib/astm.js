/**
 * File 22 P1-11: ASTM E1381/E1394 framing parser (analyzer → LIS).
 * Frame: <STX> seq text <ETB|ETX> checksum <CR><LF>. Records split on <CR>;
 * fields on `|`; components on `^`. Returns { header, orders, results }.
 */
const STX = '\x02';
const ETX = '\x03';
const ETB = '\x17';
const CR = '\r';
const LF = '\n';

export function parseAstmFrame(frame) {
  const out = { header: null, orders: [], results: [], errors: [] };
  if (!frame || !frame.includes(STX)) {
    out.errors.push('no STX');
    return out;
  }
  // Strip framing: STX n ... ETX/ETB CS CS CR LF
  const records = [];
  let rest = String(frame);
  while (rest.includes(STX)) {
    const start = rest.indexOf(STX);
    rest = rest.slice(start + 1);
    const endEtX = rest.indexOf(ETX);
    const endEtB = rest.indexOf(ETB);
    let end = endEtX === -1 ? endEtB : endEtB === -1 ? endEtX : Math.min(endEtX, endEtB);
    if (end === -1) {
      out.errors.push('unterminated frame');
      break;
    }
    const seq = rest[0];
    let body = rest.slice(1, end);
    // checksum: two hex chars after ETX/ETB
    const cs = rest.slice(end + 1, end + 3);
    records.push({ seq, body, checksum: cs });
    rest = rest.slice(end + 3);
    if (rest.startsWith(CR)) rest = rest.slice(1);
    if (rest.startsWith(LF)) rest = rest.slice(1);
  }
  for (const r of records) {
    const lines = r.body.split(CR).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const kind = line[0];
      const fields = line.slice(1).split('|');
      // H|\^&|||sender|... (fields[0] is the delimiter definition)
      if (kind === 'H') out.header = { sender: fields[4] || '', version: fields[13] || '' };
      else if (kind === 'O') {
        // O|seq|sampleId|test^^^code|priority|...
        out.orders.push({
          sampleId: fields[2] || '', testCode: (fields[3] || '').split('^')[3] || (fields[3] || '').split('^')[0] || '',
          priority: fields[4] || 'R',
        });
      } else if (kind === 'R') {
        // R|seq|test^^^code|value|units|refRange|flag|...|completedAt(12)
        const comp = (fields[2] || '').split('^');
        out.results.push({
          testCode: comp[3] || comp[0] || '', value: fields[3] || '',
          rawValue: fields[2] || '', units: fields[4] || '', refRange: fields[5] || '',
          flag: fields[6] || '', completedAt: fields[12] || '',
        });
      } else if (kind === 'L') {
        // terminator — nothing to store
      } else {
        out.errors.push(`unknown record ${kind}`);
      }
    }
  }
  return out;
}

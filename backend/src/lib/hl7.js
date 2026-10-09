/**
 * File 15 §15.1 / file 09 Flow E: minimal HL7 v2 parser for analyzer
 * ORU^R01 result messages (plus ADT^A01 identity segment). Pure string
 * parsing — no device link (that needs ASTM/HL7 over TCP + instrument
 * mapping, done per-analyzer). Rejects malformed input fail-closed.
 *
 * Segments: MSH|^~\&|...  PID|...||patientId||name|...  OBR|...|orderId|test
 * OBX|...|code^name|...|value|units|range|flag|...
 */
export function parseHl7(message) {
  if (typeof message !== 'string' || !message.includes('MSH|')) {
    return { ok: false, reason: 'not-hl7' };
  }
  const otot = message.replace(/\r\n/g, '\r').split('\r').filter(Boolean);
  const seg = (name) => otot.filter((l) => l.startsWith(`${name}|`));
  const msh = seg('MSH')[0] || '';
  const mshFields = msh.split('|');
  const msgType = mshFields[8] || '';
  const pid = seg('PID')[0] || '';
  const pidFields = pid.split('|');
  const patientId = (pidFields[3] || '').split('^')[0] || null;
  const patientName = ((pidFields[5] || '').split('^').filter(Boolean).join(' ') || null);
  const obrs = seg('OBR').map((l) => {
    const f = l.split('|');
    return { setId: f[1] || '', orderId: (f[2] || '').split('^')[0] || null, test: (f[4] || '').split('^').filter(Boolean).join(' ') || null };
  });
  const obxs = seg('OBX').map((l) => {
    const f = l.split('|');
    const code = (f[3] || '').split('^');
    return {
      setId: f[1] || '',
      code: code[0] || '',
      name: code.filter(Boolean).slice(1).join(' ') || code[0] || '',
      value: f[5] || '',
      units: f[6] || '',
      range: f[7] || '',
      flag: (f[8] || '').toUpperCase(),
    };
  });
  if (!msgType.startsWith('ORU') && !msgType.startsWith('ADT')) {
    return { ok: false, reason: 'unsupported-type' };
  }
  return {
    ok: true, msgType,
    patient: patientId || patientName ? { patientId, patientName } : null,
    orders: obrs, results: obxs,
  };
}

/** Critical flags per HL7 Table 0078 subset. */
export const isCriticalFlag = (flag) => ['HH', 'LL', 'AA', 'C'].includes(String(flag || '').toUpperCase());

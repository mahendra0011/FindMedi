/**
 * File 22 P2-35: template variable registry + lint + preview.
 * Variables use {{name}} syntax. Lint rules:
 *  - unknown variable (not in the allowlist) → error (fail loud)
 *  - unclosed / empty braces → error
 *  - SMS > 160 chars (single segment) → warning (not error)
 *  - URLs in SMS without allowlisted domain → warning (smishing guard)
 *  - DLT template id required for sms/whatsapp when sending (checked at
 *    send time, warned at lint time)
 */
const VAR_RX = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function extractVariables(body) {
  const out = new Set();
  let m;
  VAR_RX.lastIndex = 0;
  while ((m = VAR_RX.exec(body || '')) !== null) out.add(m[1]);
  return [...out];
}

export function lintTemplate({ body, variables = [], channel = 'sms', dltTemplateId = '' }) {
  const errors = [];
  const warnings = [];
  const text = String(body || '');
  if (/\{\{\s*\}\}|\{\{[^}]*$/.test(text)) errors.push('unclosed or empty {{ }}');
  const used = extractVariables(text);
  const allowed = new Set(variables || []);
  for (const v of used) {
    if (!allowed.has(v)) errors.push(`unknown variable {{${v}}}`);
  }
  if (channel === 'sms' && text.length > 160) {
    warnings.push(`SMS is ${text.length} chars (multi-segment)`);
  }
  if ((channel === 'sms' || channel === 'whatsapp') && /https?:\/\//.test(text)) {
    warnings.push('body contains a URL — verify the domain before sending');
  }
  if ((channel === 'sms' || channel === 'whatsapp') && !dltTemplateId) {
    warnings.push('no DLT template id mapped (required to send in India)');
  }
  return { errors, warnings, variables: used };
}

export function renderTemplate(body, values = {}, variables = []) {
  const allowed = new Set(variables || []);
  const missing = [];
  const out = String(body || '').replace(VAR_RX, (full, name) => {
    if (!allowed.has(name)) {
      missing.push(name);
      return full;
    }
    const v = values[name];
    if (v === undefined || v === null || v === '') {
      missing.push(name);
      return '';
    }
    return String(v);
  });
  if (missing.length) {
    const err = new Error(`missing variables: ${[...new Set(missing)].join(', ')}`);
    err.code = 'TEMPLATE_VARS_MISSING';
    err.missing = [...new Set(missing)];
    throw err;
  }
  return out;
}

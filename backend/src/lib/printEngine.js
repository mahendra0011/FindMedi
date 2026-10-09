/**
 * File 14 §14.2: print render pipeline (no headless browser needed).
 * Handlebars (sandboxed: only registered safe helpers) → sanitize-html →
 * HTML for browser print (`window.print` + @page CSS) or ESC/POS text for
 * thermal. Variable registry per docType; unknown variables block publish.
 */
import Handlebars from 'handlebars';
import sanitizeHtml from 'sanitize-html';
import crypto from 'node:crypto';

// Typed variable registry per document type (admin can't reference ghosts).
export const VARIABLE_REGISTRY = {
  bill: ['patient.name', 'bill.invoiceId', 'bill.amount', 'bill.paid', 'bill.balance', 'bill.date', 'hospital.name'],
  token: ['token.number', 'token.department', 'token.room', 'patient.name', 'hospital.name'],
  label: ['code', 'title', 'subtitle', 'hospital.name'],
  wristband: ['patient.name', 'patient.uhid', 'patient.ageSex', 'ward', 'bed', 'allergyFlag', 'hospital.name'],
  discharge: ['patient.name', 'admission.id', 'doctor.name', 'hospital.name'],
  prescription: ['patient.name', 'doctor.name', 'medicines', 'hospital.name'],
};

const inWordsIndian = (n) => {
  n = Math.round(Number(n) || 0);
  if (!n) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x) => (x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? ` ${ones[x % 10]}` : ''}`);
  const three = (x) => `${x >= 100 ? `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? ' ' : ''}` : ''}${x % 100 ? two(x % 100) : ''}`;
  let out = '';
  const cr = Math.floor(n / 1e7);
  const lk = Math.floor((n % 1e7) / 1e5);
  const th = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  if (cr) out += `${two(cr)} Crore `;
  if (lk) out += `${two(lk)} Lakh `;
  if (th) out += `${two(th)} Thousand `;
  if (rest) out += three(rest);
  return `${out.trim()} Rupees Only`;
};

let helpersRegistered = false;
const ensureHelpers = () => {
  if (helpersRegistered) return;
  helpersRegistered = true;
  Handlebars.registerHelper('inWords', (v) => inWordsIndian(v));
  Handlebars.registerHelper('date', (v) => (v ? new Date(v).toLocaleDateString('en-IN') : ''));
  Handlebars.registerHelper('upper', (v) => String(v || '').toUpperCase());
};

/** Lint: every {{variable}} must exist in the docType registry. */
export function lintTemplate(docType, html) {
  const allowed = VARIABLE_REGISTRY[docType] || [];
  const tokens = new Set();
  const re = /\{\{\s*([#/^>]?)([a-zA-Z0-9_.\s]+?)\s*\}\}/g;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    const name = m[2].trim().split(/\s+/)[0];
    if (['each', 'if', 'else', 't'].includes(name)) continue;
    if (name === 'this' || name.startsWith('this.')) continue;
    tokens.add(name);
  }
  const unknown = [...tokens].filter((t) => !allowed.includes(t)
    && !allowed.some((a) => t.startsWith(`${a}.`)));
  // Built-in helpers are always allowed.
  const helpers = new Set(['inWords', 'date', 'upper']);
  return unknown.filter((t) => !helpers.has(t.split('.')[0]));
}

export function renderTemplate(html, css, data, { duplicate = false } = {}) {
  ensureHelpers();
  const body = Handlebars.compile(html || '')(data || {});
  const safe = sanitizeHtml(body, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'style', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'div', 'span', 'img', 'br', 'hr', 'p']),
    allowedAttributes: false,
  });
  const mark = duplicate
    ? '<div style="position:fixed;top:40%;width:100%;text-align:center;font-size:64px;color:rgba(0,0,0,.12);transform:rotate(-20deg)">DUPLICATE COPY</div>' : '';
  const full = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:12mm} ${css || ''}</style></head><body>${mark}${safe}</body></html>`;
  const hash = crypto.createHash('sha256').update(full).digest('hex');
  return { html: full, hash };
}

/** Minimal ESC/POS text for thermal receipts (58/80mm). */
export function toEscPos(lines) {
  const out = ['\x1B\x40', '\x1B\x61\x01'];
  for (const line of (lines || []).slice(0, 60)) out.push(`${String(line).slice(0, 42)}\n`);
  out.push('\n\n\n\x1D\x56\x00');
  return out.join('');
}

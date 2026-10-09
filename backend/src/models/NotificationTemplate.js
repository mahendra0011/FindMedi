import mongoose from 'mongoose';

/**
 * Notification copy as DATA (10.md 2.15 NotificationTemplate: extend with
 * `discreetVariant`, `locales`; 9.md 3 template library). Two things this
 * exists to prevent:
 *
 *   - A DISCREET VARIANT is not a shorter message: a user with discreet
 *     notifications on (6.md 2.15) must never see "abortion pill" or a
 *     diagnosis in a lock-screen preview, so the alternate copy is stored,
 *     versioned and reviewable beside the default — not branch-built in the
 *     sending code where nobody can audit what the preview said.
 *   - LOCALES are rows, not code: one code + N locales means a translation
 *     change is a document update with the same templateVersion trail.
 *
 * Template bodies reference variables by convention ([Name], [amount]) — the
 * renderer substitutes; nothing here is executable.
 *
 * No PII fields: `code` is a stable key, the bodies are platform copy.
 */
const notificationTemplateSchema = new mongoose.Schema({
  // Not globally unique: one code has one row PER LOCALE (see index below).
  code: { type: String, required: true, trim: true, maxlength: 120 },
  channel: { type: String, enum: ['email', 'sms', 'push', 'inapp', 'whatsapp'], required: true, index: true },
  locale: { type: String, default: 'en', maxlength: 20 },

  subject: { type: String, maxlength: 300, default: '' },
  body: { type: String, required: true, maxlength: 4000 },
  // Lock-screen-safe copy for users with discreet mode on (6.md 2.15).
  discreetVariant: { type: String, maxlength: 4000, default: '' },

  variables: [{ type: String, maxlength: 60 }],
  version: { type: Number, min: 1, default: 1 },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

notificationTemplateSchema.index({ code: 1, locale: 1 }, { unique: true });

// File 14 §14.3: variable lint — bodies may only reference DECLARED
// variables ([Name] convention). Unknown variables block the save so a
// typo can never ship as a literal "[amount]" to a patient.
export const extractTemplateVars = (text) => {
  const out = new Set();
  const re = /\[([A-Za-z][A-Za-z0-9_ ]{0,59})\]/g;
  let m;
  while ((m = re.exec(String(text || ''))) !== null) out.add(m[1].trim());
  return [...out];
};

notificationTemplateSchema.pre('save', function (next) {
  try {
    const declared = new Set((this.variables || []).map((v) => String(v).trim()));
    const used = new Set([
      ...extractTemplateVars(this.subject),
      ...extractTemplateVars(this.body),
      ...extractTemplateVars(this.discreetVariant),
    ]);
    const unknown = [...used].filter((v) => !declared.has(v));
    if (unknown.length) {
      return next(new Error(`Unknown template variables: ${unknown.join(', ')} — declare them in variables[] first`));
    }
  } catch (e) {
    return next(e);
  }
  next();
});

export default mongoose.models.NotificationTemplate || mongoose.model('NotificationTemplate', notificationTemplateSchema);

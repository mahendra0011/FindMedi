/**
 * PAY-M-06: the money rounding policy.
 *
 * Before this file there was no policy at all. `createPaymentSchema` accepted
 * any positive number, `Payment.create({...req.body})` stored it verbatim, and
 * a value like `0.1 + 0.2` could sit in an invoice total as
 * 0.30000000000000004 - unnoticed until it failed to reconcile against the
 * ledger.
 *
 * WHY MULTIPLY-THEN-ROUND RATHER THAN `Number.toFixed(2)`
 * ------------------------------------------------------
 * Two reasons, and the second is the one that actually matters:
 *
 * 1. `toFixed` returns a STRING. Money that has to be added up needs to come
 *    back as a number, and Number(x.toFixed(2)) is the same arithmetic with an
 *    extra parse in the middle.
 *
 * 2. It is the same operation `toPaise` in ledgerService already performs, so
 *    the whole codebase has ONE rounding convention. Two conventions that each
 *    look reasonable is how a commission line and a payout line end up one
 *    paisa apart.
 *
 * Note this is deliberately NOT advertised as "correct half-up rounding".
 * `(1.005).toFixed(2)` is '1.00' and roundRupees(1.005) is also 1 - IEEE-754
 * simply does not represent 1.005 exactly, and no amount of rounding fixes
 * that. What this DOES guarantee is that a stored money value never carries a
 * third decimal: the float noise is absorbed at the write boundary instead of
 * accumulating across writes.
 *
 * Rounding to 2dp (one paisa) is the storage precision. Arithmetic still
 * happens in integer paise where it matters - see ledgerService - but every
 * value that reaches the database is at most one paisa wide.
 */

/** @param {unknown} value @returns {number} rupees at 2dp, or 0 for non-numbers */
export function roundRupees(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Same policy, expressed as an integer count of paise. */
export function toPaise(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Inverse of `toPaise`: an integer-paisa count back to rupees at 2dp. */
export function fromPaise(paise) {
  return Math.round(Number(paise) || 0) / 100;
}

/**
 * Mongoose plugin: round the named fields at write time.
 *
 * Both document saves AND query updates are covered on purpose. Covering only
 * `validate` would leave `Payment.updateOne({ $set: { amount } })` - the path
 * an admin correction takes - writing unrounded floats, and a policy that
 * holds for half the writes is not a policy.
 */
/** A value worth rounding (not undefined/null/empty-string). */
const isSet = (v) => v !== undefined && v !== null && v !== '';

/**
 * Field specs are strings, either:
 *   'amount'               - a top-level path
 *   'services[].price'     - the same field on EVERY element of an array
 *
 * The array form exists because the money that actually gets added up on an
 * invoice is per-line: 3 x 10.005 is 30.015, and rounding only the document
 * total while leaving the lines unrounded moves the error somewhere else
 * instead of removing it.
 */
function forEachTarget(doc, spec, apply) {
  const nested = spec.match(/^(.+)\[\]\.(.+)$/);
  if (!nested) {
    const current = doc.get(spec);
    if (isSet(current)) apply(current, (rounded) => doc.set(spec, rounded));
    return;
  }
  const [, arrayPath, field] = nested;
  const rows = doc.get(arrayPath);
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    if (row && isSet(row[field])) apply(row[field], (rounded) => { row[field] = rounded; });
  }
}

export const moneyRounding = (fields) => (schema) => {
  // Deliberately SYNCHRONOUS - declared with NO `next` parameter.
  //
  // Being sync is not what makes it work on the validate path, though: it was
  // assumed that `doc.validateSync()` would run sync hooks but skip async ones,
  // and on mongoose 8.23 it runs NEITHER (verified - the hook body never
  // executed under validateSync regardless of arity). Only the async
  // `doc.validate()` runs pre('validate') hooks, and `save()` goes through
  // that, so the production path is covered.
  //
  // It is still sync because there is nothing to await: rounding a number is
  // pure, and a callback here would only add a way to forget to call it.
  schema.pre('validate', function moneyRoundingPreValidate() {
    for (const spec of fields) {
      forEachTarget(this, spec, (current, set) => set(roundRupees(current)));
    }
  });

  const roundUpdate = (update) => {
    if (!update || typeof update !== 'object') return;
    for (const clause of ['$set', '$setOnInsert', '$inc']) {
      const bag = update[clause];
      if (!bag || typeof bag !== 'object') continue;
      for (const spec of fields) {
        const nested = spec.match(/^(.+)\[\]\.(.+)$/);
        if (nested) {
          // Updates address array members positionally: 'services.2.price'.
          // Scan the keys rather than trusting a fixed position.
          const [, arrayPath, field] = nested;
          const pattern = new RegExp(`^${arrayPath}\\.\\d+\\.${field}$`);
          for (const key of Object.keys(bag)) {
            if (pattern.test(key)) bag[key] = roundRupees(bag[key]);
          }
        } else if (spec in bag) {
          bag[spec] = roundRupees(bag[spec]);
        }
      }
    }
  };

  for (const hook of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne']) {
    schema.pre(hook, function moneyRoundingPreUpdate() {
      // $inc of an unrounded delta is exactly how a drift sneaks into a running
      // balance, so the increment is rounded too - not just the absolute value.
      roundUpdate(this.getUpdate());
    });
  }
};

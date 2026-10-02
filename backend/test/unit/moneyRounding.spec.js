/**
 * PAY-M-06: the currency/rounding policy.
 *
 * The finding was that there was none - any positive number the client sent was
 * stored verbatim, so `0.1 + 0.2` could sit in an invoice total and only surface
 * as a reconciliation gap weeks later.
 *
 * These tests pin two things: that the pure rounding function behaves the way
 * the ledger needs it to (absorbing IEEE-754 representation error rather than
 * amplifying it), and that the policy is applied at WRITE time on every path a
 * value can take in - a document save AND a query update, because an admin
 * correcting an amount goes through `updateOne`, not `save`.
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
// A missed query would otherwise buffer for mongoose' default 10s.
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 50);

const { roundRupees, toPaise, moneyRounding } = await import('../../src/utils/money.js');
const { default: Payment } = await import('../../src/models/Payment.js');
const { default: Billing } = await import('../../src/models/Billing.js');

describe('roundRupees absorbs float representation error instead of amplifying it', () => {
  it('rounds to two decimal places', () => {
    expect(roundRupees(19.999999999)).toBe(20);
    expect(roundRupees(100.1)).toBe(100.1);
    expect(roundRupees(0)).toBe(0);
  });

  it('absorbs the float noise that would otherwise be stored', () => {
    // The failure this policy exists to prevent: 0.1 + 0.2 is
    // 0.30000000000000004, and without a write boundary that is what lands in
    // the invoice.
    expect(roundRupees(0.1 + 0.2)).toBe(0.3);
    expect(roundRupees(19.999999999)).toBe(20);
    expect(roundRupees(999.999999)).toBe(1000);
    expect(roundRupees(333.33)).toBe(333.33);
    expect(toPaise(333.33)).toBe(33333);
  });

  it('agrees with toFixed on ordinary values but returns a number', () => {
    // Verified against Node's own toFixed: on these inputs the two agree, and
    // the reason to prefer this one is that it yields a Number rather than a
    // string that has to be parsed back (plus it matches ledgerService toPaise).
    // It is NOT advertised as "correct half-up rounding" - IEEE-754 does not
    // represent 1.005 exactly, so roundRupees(1.005) is 1, same as toFixed.
    expect(roundRupees(1.005)).toBe(1);
    expect(roundRupees(1.015)).toBe(1.01);
    expect(roundRupees(1.025)).toBe(1.02);
    expect(roundRupees(1.005)).toBe(Number((1.005).toFixed(2)));
    expect(roundRupees(1.015)).toBe(Number((1.015).toFixed(2)));

    // ...and it stays a number, which toFixed does not.
    expect(typeof roundRupees(1.015)).toBe('number');
    expect(typeof (1.015).toFixed(2)).toBe('string');
  });

  it('is idempotent - rounding an already-rounded amount changes nothing', () => {
    // If this failed, every write would creep.
    for (const v of [0.01, 1.01, 19.99, 1234.56, 0.1 + 0.2]) {
      expect(roundRupees(roundRupees(v))).toBe(roundRupees(v));
    }
  });

  it('returns 0 rather than NaN for values that are not numbers', () => {
    // NaN would propagate into an invoice total and render as ₹NaN.
    expect(roundRupees(undefined)).toBe(0);
    expect(roundRupees(null)).toBe(0);
    expect(roundRupees('')).toBe(0);
    expect(roundRupees('12.345')).toBe(12.35);
    expect(roundRupees(NaN)).toBe(0);
    expect(roundRupees(Infinity)).toBe(0);
  });

  it('never produces a value with more than two decimals', () => {
    for (const v of [0.001, 1 / 3, 99.999999999, 12345.678901, 7.5]) {
      const rounded = roundRupees(v);
      expect(Math.round(rounded * 100) / 100).toBe(rounded);
      expect(String(rounded).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
    }
  });
});

describe('the policy is applied at write time', () => {
  const moneySchema = new mongoose.Schema({ amount: { type: Number }, quantity: { type: Number } });
  moneySchema.plugin(moneyRounding(['amount']));
  const Money = mongoose.model('MoneyRoundingTest', moneySchema);
  let LineModel;

  beforeAll(() => {
    // Registered here rather than at module scope so a failure to import does
    // not silently leave the rest of the file unrun.
    expect(Money).toBeDefined();
  });

  it('rounds a value before validation runs', async () => {
    // `validateSync()` was the first attempt here and it is WRONG on mongoose 8:
    // it runs NO pre('validate') hooks at all - not sync ones, not async ones
    // (verified: calls[] came back empty for both). Only the async `validate()`
    // does. That is not a production problem - `save()` goes through async
    // validate - but it means a test using validateSync would pass while
    // asserting nothing.
    const doc = new Money({ amount: 19.999999999, quantity: 3 });
    await doc.validate();
    expect(doc.amount).toBe(20);
    // quantity is NOT in the money list: it is a count.
    expect(doc.quantity).toBe(3);
  });

  it('rounds on the same path save() takes', async () => {
    const doc = new Money({ amount: 100.005 });
    await doc.validate();
    expect(doc.amount).toBe(100.01);
  });

  it('leaves fields outside the money list alone', async () => {
    // 1.005 -> 1, matching (1.005).toFixed(2) === '1.00'. The first draft of
    // this test asserted 1.01 on the assumption that multiply-then-round fixes
    // half-way cases; it does not, because 1.005 is not representable. Verified
    // against Node directly rather than reasoned about.
    const doc = new Money({ amount: 1.005, quantity: 2.7 });
    await doc.validate();
    expect(doc.amount).toBe(1);
    expect(doc.quantity).toBe(2.7);
  });

  it('rounds money inside an array of line items', async () => {
    // TWO ordering mistakes lived in this test before it passed, both of which
    // made it assert nothing:
    //   1. declaring price/quantity as top-level paths while passing an `items`
    //      array - mongoose dropped the array, so doc.items was undefined;
    //   2. applying the plugin AFTER `mongoose.model()`. That registers on the
    //      schema but never reaches the compiled model, so the hook silently
    //      did nothing (verified: 10.005 with the plugin added late, 10.01 when
    //      added before). Every production model applies the plugin before
    //      model creation for this reason.
    const LineSchema = new mongoose.Schema({
      items: [{ label: String, price: { type: Number }, quantity: { type: Number } }],
    });
    LineSchema.plugin(moneyRounding(['items[].price']));
    LineModel = mongoose.model('MoneyRoundingLinesTest', LineSchema);

    const doc = new LineModel({
      items: [
        { label: 'a', price: 10.005, quantity: 3 },
        { label: 'b', price: 1.015, quantity: 1 },
      ],
    });
    await doc.validate();
    // Per-line rounding matters: 3 x 10.005 is 30.015, so rounding only the
    // document total would leave the error in the lines instead.
    expect(doc.items[0].price).toBe(10.01);
    expect(doc.items[1].price).toBe(1.01);
    // quantity is still a count.
    expect(doc.items[0].quantity).toBe(3);
  });

  it('rounds on query updates, not only on saves', async () => {
    const update = { $set: { amount: 9.999999999 } };
    const query = Money.updateOne({ _id: new mongoose.Types.ObjectId() }, update);

    // No connection, so the write fails fast - but the pre hook runs BEFORE
    // the connection is needed, which is exactly what is being asserted.
    await query.catch(() => {});
    expect(query.getUpdate().$set.amount).toBe(10);
  });

  it('rounds an $inc delta as well as an absolute value', async () => {
    // An unrounded increment is how a drift sneaks into a running balance.
    const query = Money.updateOne({ _id: new mongoose.Types.ObjectId() }, { $inc: { amount: 0.005 } });
    await query.catch(() => {});
    expect(query.getUpdate().$inc.amount).toBe(0.01);
  });
});

describe('the financial models carry the plugin', () => {
  it('Payment rounds amount and refund_amount', async () => {
    const p = new Payment({
      transaction_id: 'TX1',
      patient_id: '64b000000000000000000001',
      patient_name: 'Test',
      amount: 100.005,
      refund_amount: 10.006,
    });
    await p.validate();
    expect(p.amount).toBe(100.01);
    expect(p.refund_amount).toBe(10.01);
  });

  it('Billing rounds money fields but not the line quantity', async () => {
    // Written against the REAL Billing shape after the first draft failed:
    // `price` is not a top-level path in this schema (it lives in services[]),
    // and `patient`, `service` and `date` are required.
    const b = new Billing({
      invoiceId: 'INV-1',
      patient: 'Self',
      service: 'consultation',
      date: '2026-01-01',
      amount: 999.999999,
      services: [{ name: 'Follow-up', price: 10.005, quantity: 2.5 }],
    });
    await b.validate().catch(() => {});
    expect(b.amount).toBe(1000);
    // The nested line item is rounded too, not just the document total.
    expect(b.services[0].price).toBe(10.01);
    // A half-unit quantity is nonsense clinically, but the point is that the
    // money policy must not be silently rewriting counts.
    expect(b.services[0].quantity).toBe(2.5);
  });
});

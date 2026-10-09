import express from 'express';
import ExcelJS from 'exceljs';
import BankAccount from '../models/BankAccount.js';
import StatementImport from '../models/StatementImport.js';
import BankTxn from '../models/BankTxn.js';
import ReconMatch from '../models/ReconMatch.js';
import ReconRule from '../models/ReconRule.js';
import Payment from '../models/Payment.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 16 §16.3: bank recon — accounts, XLSX/CSV statement import, auto-match
// (UTR exact → amount±1/date±3d fuzzy → narration rules), manual match, close.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenant = (req) => ({ hospitalId: req.user.hospitalId });

router.get('/accounts', authorize('billing:read'), async (req, res) => {
  try {
    const rows = await BankAccount.find({ ...tenant(req), active: true }).lean();
    return res.json({ accounts: rows });
  } catch (err) {
    logger.error(`Bank accounts error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/accounts', authorize('billing:write'), async (req, res) => {
  try {
    const row = await BankAccount.create({ ...tenant(req), ...req.body });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Account already registered' });
    logger.error(`Bank account create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Statement upload: JSON rows (parsed client-side from XLSX/CSV) — keeps the
// server free of multipart handling; schema validated here.
router.post('/imports', authorize('billing:write'), async (req, res) => {
  try {
    const { bankAccountId, fileName, rows } = req.body || {};
    if (!bankAccountId || !Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ message: 'bankAccountId + rows[] required' });
    }
    if (rows.length > 5000) return res.status(400).json({ message: 'Max 5000 rows per import' });
    const imp = await StatementImport.create({
      ...tenant(req), bankAccountId, fileName: String(fileName || '').slice(0, 200),
      rowCount: rows.length, uploadedBy: actorId(req),
    });
    const docs = rows.map((r) => ({
      ...tenant(req), importId: imp._id, bankAccountId,
      date: new Date(r.date), narration: String(r.narration || '').slice(0, 300),
      utr: String(r.utr || r.ref || '').slice(0, 60),
      debit: Number(r.debit) || 0, credit: Number(r.credit) || 0,
      balance: r.balance != null ? Number(r.balance) : null,
    }));
    await BankTxn.insertMany(docs);
    return res.status(201).json({ id: String(imp._id), rows: docs.length });
  } catch (err) {
    logger.error(`Statement import error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/imports/:id/txns', authorize('billing:read'), async (req, res) => {
  try {
    const { matched } = req.query;
    const filter = { importId: req.params.id };
    if (matched === '0') filter.matchId = null;
    if (matched === '1') filter.matchId = { $ne: null };
    const rows = await BankTxn.find(filter).sort({ date: 1 }).limit(1000).lean();
    return res.json({ txns: rows });
  } catch (err) {
    logger.error(`Txns read error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Auto-match: UTR exact → amount(±1)+date(±3d) fuzzy → narration rule hit.
router.post('/imports/:id/automatch', authorize('billing:write'), async (req, res) => {
  try {
    const txns = await BankTxn.find({ importId: req.params.id, matchId: null }).limit(1000);
    const rules = await ReconRule.find({ ...tenant(req), active: true }).lean();
    let matched = 0;
    for (const t of txns) {
      let target = null;
      let confidence = 0;
      if (t.utr) {
         
        target = await Payment.findOne({
          ...tenant(req), $or: [{ gatewayPaymentId: t.utr }, { transactionId: t.utr }],
        }).lean();
        if (target) confidence = 100;
      }
      if (!target && t.credit > 0) {
        const lo = new Date(t.date.getTime() - 3 * 86400 * 1000);
        const hi = new Date(t.date.getTime() + 3 * 86400 * 1000);
         
        const cands = await Payment.find({
          ...tenant(req), status: 'completed', createdAt: { $gte: lo, $lte: hi },
        }).select('_id amount').limit(50).lean();
        const hit = cands.find((c) => Math.abs(Number(c.amount) - t.credit) <= 1);
        if (hit) { target = hit; confidence = 80; }
      }
      if (!target && t.narration) {
        const rule = rules.find((r) => r.pattern && new RegExp(r.pattern, 'i').test(t.narration));
        if (rule?.targetModel === 'Payment' && t.credit > 0) {
          const lo = new Date(t.date.getTime() - 3 * 86400 * 1000);
          const hi = new Date(t.date.getTime() + 3 * 86400 * 1000);
           
          const cands = await Payment.find({
            ...tenant(req), status: 'completed', createdAt: { $gte: lo, $lte: hi },
          }).select('_id amount').limit(50).lean();
          const hit = cands.find((c) => Math.abs(Number(c.amount) - t.credit) <= 1);
          if (hit) { target = hit; confidence = 60; }
        }
      }
      if (target) {
         
        const m = await ReconMatch.create({
          ...tenant(req), bankTxnId: t._id, targetModel: 'Payment', targetId: target._id,
          mode: 'auto', confidence, matchedBy: actorId(req),
        });
        t.matchId = m._id;
         
        await t.save();
        matched += 1;
      }
    }
    await StatementImport.findByIdAndUpdate(req.params.id, { $set: { status: 'matched' } });
    return res.json({ matched, scanned: txns.length });
  } catch (err) {
    logger.error(`Automatch error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/txns/:id/match', authorize('billing:write'), async (req, res) => {
  try {
    const { targetModel, targetId } = req.body || {};
    if (!targetModel || !targetId) return res.status(400).json({ message: 'targetModel + targetId required' });
    const t = await BankTxn.findById(req.params.id);
    if (!t || t.matchId) return res.status(404).json({ message: 'Unmatched txn not found' });
    const m = await ReconMatch.create({
      ...tenant(req), bankTxnId: t._id, targetModel, targetId, mode: 'manual', confidence: 100, matchedBy: actorId(req),
    });
    t.matchId = m._id;
    await t.save();
    return res.status(201).json({ id: String(m._id) });
  } catch (err) {
    logger.error(`Manual match error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/rules', authorize('billing:read'), async (req, res) => {
  try {
    const rows = await ReconRule.find(tenant(req)).lean();
    return res.json({ rules: rows });
  } catch (err) {
    logger.error(`Recon rules error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/rules', authorize('billing:write'), async (req, res) => {
  try {
    // Validate the regex server-side so a bad pattern can't break automatch.
    if (req.body?.pattern) new RegExp(req.body.pattern, 'i');
    const row = await ReconRule.create({ ...tenant(req), ...req.body });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Recon rule create error: ${err.message}`);
    return res.status(400).json({ message: 'Invalid rule (bad regex?)' });
  }
});

// Close: only when every txn in the import is matched; then export CSV.
router.post('/imports/:id/close', authorize('billing:write'), async (req, res) => {
  try {
    const open = await BankTxn.countDocuments({ importId: req.params.id, matchId: null });
    if (open > 0) return res.status(409).json({ message: `${open} unmatched transactions remain`, open });
    await StatementImport.findByIdAndUpdate(req.params.id, { $set: { status: 'closed' } });
    await auditLog('recon_closed', actorId(req), { importId: req.params.id, ip: req.ip });
    return res.json({ closed: true });
  } catch (err) {
    logger.error(`Recon close error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/imports/:id/export', authorize('billing:read'), async (req, res) => {
  try {
    const txns = await BankTxn.find({ importId: req.params.id }).sort({ date: 1 }).limit(5000).lean();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('recon');
    ws.addRow(['Date', 'Narration', 'UTR', 'Debit', 'Credit', 'Matched']);
    for (const t of txns) {
      ws.addRow([t.date, t.narration, t.utr, t.debit, t.credit, t.matchId ? 'yes' : 'no']);
    }
    const buf = await wb.xlsx.writeBuffer();
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', `attachment; filename="recon-${req.params.id}.xlsx"`);
    return res.send(Buffer.from(buf));
  } catch (err) {
    logger.error(`Recon export error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;

import fs from 'node:fs';

console.log('--- Applying Phase 1 Security, Payment, and Data Integrity Fixes ---');

// 1. Fix Math.random in smsProvider.js & whatsappProvider.js
{
  const smsFile = 'backend/src/services/smsProvider.js';
  let smsContent = fs.readFileSync(smsFile, 'utf8');
  if (smsContent.includes('Math.random()')) {
    if (!smsContent.includes("import crypto from 'node:crypto';")) {
      smsContent = "import crypto from 'node:crypto';\n" + smsContent;
    }
    smsContent = smsContent.replace(
      "`sim-sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`",
      "`sim-sms-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`"
    );
    fs.writeFileSync(smsFile, smsContent, 'utf8');
    console.log('[✓] Fixed Math.random in smsProvider.js (CSPRNG compliant)');
  }

  const waFile = 'backend/src/services/whatsappProvider.js';
  let waContent = fs.readFileSync(waFile, 'utf8');
  if (waContent.includes('Math.random()')) {
    if (!waContent.includes("import crypto from 'node:crypto';")) {
      waContent = "import crypto from 'node:crypto';\n" + waContent;
    }
    waContent = waContent.replace(
      "`sim-wa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`",
      "`sim-wa-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`"
    );
    fs.writeFileSync(waFile, waContent, 'utf8');
    console.log('[✓] Fixed Math.random in whatsappProvider.js (CSPRNG compliant)');
  }
}

// 2. Fix OpenSearch ehr_docs_index mapping & indexEhrDoc in opensearchIndexer.js
{
  const mappingFile = 'data-platform/opensearch/mappings/ehr_docs_index.json';
  let mappingContent = fs.readFileSync(mappingFile, 'utf8');
  if (!mappingContent.includes('"hospitalId"')) {
    mappingContent = mappingContent.replace(
      '"properties": {',
      '"properties": {\n      "hospitalId": { "type": "keyword" },\n      "facilityId": { "type": "keyword" },'
    );
    fs.writeFileSync(mappingFile, mappingContent, 'utf8');
    console.log('[✓] Added hospitalId and facilityId to ehr_docs_index.json');
  }

  const indexerFile = 'backend/src/services/opensearchIndexer.js';
  let indexerContent = fs.readFileSync(indexerFile, 'utf8');
  if (!indexerContent.includes('hospitalId = \'\'') && indexerContent.includes('export async function indexEhrDoc({ recordId, patientId, docType, text, allergies = [] })')) {
    indexerContent = indexerContent.replace(
      'export async function indexEhrDoc({ recordId, patientId, docType, text, allergies = [] }) {',
      "export async function indexEhrDoc({ recordId, patientId, docType, text, allergies = [], hospitalId = '', facilityId = '' }) {"
    );
    indexerContent = indexerContent.replace(
      "patientPseudonym: pseudonym,\n      docType: docType || 'note',",
      "patientPseudonym: pseudonym,\n      hospitalId: String(hospitalId || ''),\n      facilityId: String(facilityId || ''),\n      docType: docType || 'note',"
    );
    indexerContent = indexerContent.replace(
      "patientPseudonym: pseudonym,\r\n      docType: docType || 'note',",
      "patientPseudonym: pseudonym,\r\n      hospitalId: String(hospitalId || ''),\r\n      facilityId: String(facilityId || ''),\r\n      docType: docType || 'note',"
    );
    fs.writeFileSync(indexerFile, indexerContent, 'utf8');
    console.log('[✓] Updated indexEhrDoc to accept and index hospitalId & facilityId');
  }
}

// 3. Fix appointments.js console logs and wire idempotency
{
  const apptFile = 'backend/src/routes/appointments.js';
  let apptContent = fs.readFileSync(apptFile, 'utf8');
  
  // Wire idempotencyGuard import if missing
  if (!apptContent.includes('idempotencyGuard')) {
    apptContent = apptContent.replace(
      "import { bookingLimiter } from '../middleware/rateLimit.js';",
      "import { bookingLimiter } from '../middleware/rateLimit.js';\nimport { idempotencyGuard } from '../middleware/idempotency.js';"
    );
  }

  // Wire idempotency on walk-in
  if (apptContent.includes("router.post('/walk-in', protect, requireRole(['doctor', 'clinic_doctor', 'clinic_admin', 'hospital_admin', 'superadmin']), validate(walkInSchema), async")) {
    apptContent = apptContent.replace(
      "router.post('/walk-in', protect, requireRole(['doctor', 'clinic_doctor', 'clinic_admin', 'hospital_admin', 'superadmin']), validate(walkInSchema), async",
      "router.post('/walk-in', protect, requireRole(['doctor', 'clinic_doctor', 'clinic_admin', 'hospital_admin', 'superadmin']), idempotencyGuard({ prefix: 'appt-walkin', failClosed: false }), validate(walkInSchema), async"
    );
    console.log('[✓] Added idempotencyGuard to appointments /walk-in');
  }

  // Clean console.log debug statements
  apptContent = apptContent.replace(
    "if (process.env.DEBUG_WALKIN) console.log('HARDSTOP RESULT', { hospitalId, canonicalPatientId, stop });",
    "if (process.env.DEBUG_WALKIN) logger.debug(`HARDSTOP RESULT hospital=${hospitalId} stop=${stop}`);"
  );
  apptContent = apptContent.replace(
    "} catch (e) { if (process.env.DEBUG_WALKIN) console.log('HARDSTOP ERR', e.stack); }",
    "} catch (e) { if (process.env.DEBUG_WALKIN) logger.debug(`HARDSTOP ERR ${e.message}`); }"
  );
  apptContent = apptContent.replace(
    "if (process.env.DEBUG_WALKIN) console.log(err.stack);",
    "if (process.env.DEBUG_WALKIN) logger.debug(err.message);"
  );
  apptContent = apptContent.replace(
    "console.error('Failed to attach payment info to paginated appointments:', e);",
    "logger.warn(`Failed to attach payment info to paginated appointments: ${e.message}`);"
  );
  apptContent = apptContent.replace(
    "console.error('Failed to attach payment info to appointments:', e);",
    "logger.warn(`Failed to attach payment info to appointments: ${e.message}`);"
  );
  apptContent = apptContent.replace(
    "console.error('[appointments/history-with-payments] ERROR:', err);",
    "logger.error(`[appointments/history-with-payments] ERROR: ${err.message}`);"
  );

  fs.writeFileSync(apptFile, apptContent, 'utf8');
  console.log('[✓] Cleaned console statements and hardened appointments.js');
}

// 4. Fix mentalHealth.js crisis intervention helplines and audit pseudonymization
{
  const mhFile = 'backend/src/routes/mentalHealth.js';
  let mhContent = fs.readFileSync(mhFile, 'utf8');
  
  if (mhContent.includes('suicidalityFlagged: result.suicidalityFlagged,\n      referralSuggested: result.referralSuggested,\n    });') ||
      mhContent.includes('suicidalityFlagged: result.suicidalityFlagged,\r\n      referralSuggested: result.referralSuggested,\r\n    });')) {
    
    const replacement = `suicidalityFlagged: result.suicidalityFlagged,
      referralSuggested: result.referralSuggested,
      crisisHelplines: result.suicidalityFlagged ? [
        { name: 'National Tele-MANAS', phone: '14416', available: '24x7 Toll-Free' },
        { name: 'Kiran Mental Health Helpline', phone: '1800-599-0019', available: '24x7 Toll-Free' },
        { name: 'Vandrevala Foundation', phone: '+91 9999 666 555', available: '24x7 Free' },
      ] : [],
    });`;

    mhContent = mhContent.replace(
      'suicidalityFlagged: result.suicidalityFlagged,\r\n      referralSuggested: result.referralSuggested,\r\n    });',
      replacement
    );
    mhContent = mhContent.replace(
      'suicidalityFlagged: result.suicidalityFlagged,\n      referralSuggested: result.referralSuggested,\n    });',
      replacement
    );
    console.log('[✓] Enriched mentalHealth.js screening response with 24x7 Tele-MANAS crisis helplines');
  }

  fs.writeFileSync(mhFile, mhContent, 'utf8');
}

// 5. Fix commission.js payout concurrency race
{
  const commFile = 'backend/src/routes/commission.js';
  let commContent = fs.readFileSync(commFile, 'utf8');
  if (commContent.includes('const grossRevenue = transactions.reduce') && !commContent.includes('if (!transactions.length)')) {
    commContent = commContent.replace(
      'const grossRevenue = transactions.reduce((s, t) => s + (t.amount || 0), 0);',
      "if (!transactions.length) {\n      return res.status(400).json({ message: 'No unclaimed transactions found for this period' });\n    }\n    const grossRevenue = transactions.reduce((s, t) => s + (t.amount || 0), 0);"
    );
    commContent = commContent.replace(
      "{ _id: { $in: transactions.map(t => t._id) } },",
      "{ _id: { $in: transactions.map(t => t._id) }, payoutId: null },"
    );
    fs.writeFileSync(commFile, commContent, 'utf8');
    console.log('[✓] Fixed commission.js payout concurrency race and zero-transaction check');
  }
}

// 6. Fix payments.js safe refund order of operations
{
  const payFile = 'backend/src/routes/payments.js';
  let payContent = fs.readFileSync(payFile, 'utf8');
  
  // Target block: lines 336-370
  const refundCallOldCRLF = "const payGateway = payment.gateway && payment.gateway !== 'mock' ? gatewayFor(payment.gateway) : null;\r\n    let providerRefund = null;\r\n    if (payGateway && payGateway.configured && typeof payGateway.refund === 'function'\r\n      && (payment.gatewayPaymentId || payment.gatewayOrderId)) {\r\n      try {\r\n        providerRefund = await payGateway.refund({\r\n          gatewayPaymentId: payment.gatewayPaymentId || '',\r\n          gatewayOrderId: payment.gatewayOrderId || '',\r\n          amount: refund_amount,\r\n        });\r\n      } catch (gwErr) {\r\n        return res.status(422).json({ message: `Provider refund failed: ${gwErr.message}`, code: gwErr.code || 'GATEWAY_ERROR' });\r\n      }\r\n    }\r\n    const { default: Refund } = await import('../models/Refund.js');\r\n    const { refund, created } = await Refund.requestRefund({\r\n      paymentId: payment._id,\r\n      amount: refund_amount,\r\n      originalAmount: payment.amount,\r\n      reason: req.body.reason || 'Refund processed by administrator',\r\n      reasonCode: req.body.reasonCode || 'patient_request',\r\n      idempotencyKey: idemKey,\r\n      requestedBy: req.user._id,\r\n    });";

  const refundCallOldLF = "const payGateway = payment.gateway && payment.gateway !== 'mock' ? gatewayFor(payment.gateway) : null;\n    let providerRefund = null;\n    if (payGateway && payGateway.configured && typeof payGateway.refund === 'function'\n      && (payment.gatewayPaymentId || payment.gatewayOrderId)) {\n      try {\n        providerRefund = await payGateway.refund({\n          gatewayPaymentId: payment.gatewayPaymentId || '',\n          gatewayOrderId: payment.gatewayOrderId || '',\n          amount: refund_amount,\n        });\n      } catch (gwErr) {\n        return res.status(422).json({ message: `Provider refund failed: ${gwErr.message}`, code: gwErr.code || 'GATEWAY_ERROR' });\n      }\n    }\n    const { default: Refund } = await import('../models/Refund.js');\n    const { refund, created } = await Refund.requestRefund({\n      paymentId: payment._id,\n      amount: refund_amount,\n      originalAmount: payment.amount,\n      reason: req.body.reason || 'Refund processed by administrator',\n      reasonCode: req.body.reasonCode || 'patient_request',\n      idempotencyKey: idemKey,\n      requestedBy: req.user._id,\n    });";

  const safeRefundReorder = (eol) => `const { default: Refund } = await import('../models/Refund.js');${eol}    const { refund, created } = await Refund.requestRefund({${eol}      paymentId: payment._id,${eol}      amount: refund_amount,${eol}      originalAmount: payment.amount,${eol}      reason: req.body.reason || 'Refund processed by administrator',${eol}      reasonCode: req.body.reasonCode || 'patient_request',${eol}      idempotencyKey: idemKey,${eol}      requestedBy: req.user._id,${eol}    });${eol}${eol}    if (!created) {${eol}      return res.status(200).json({${eol}        message: 'Refund already recorded for this idempotency key',${eol}        payment, refund, duplicate: true,${eol}      });${eol}    }${eol}${eol}    const payGateway = payment.gateway && payment.gateway !== 'mock' ? gatewayFor(payment.gateway) : null;${eol}    let providerRefund = null;${eol}    if (payGateway && payGateway.configured && typeof payGateway.refund === 'function'${eol}      && (payment.gatewayPaymentId || payment.gatewayOrderId)) {${eol}      try {${eol}        providerRefund = await payGateway.refund({${eol}          gatewayPaymentId: payment.gatewayPaymentId || '',${eol}          gatewayOrderId: payment.gatewayOrderId || '',${eol}          amount: refund_amount,${eol}        });${eol}      } catch (gwErr) {${eol}        refund.status = 'FAILED';${eol}        refund.failureReason = gwErr.message;${eol}        await refund.save();${eol}        return res.status(422).json({ message: \`Provider refund failed: \${gwErr.message}\`, code: gwErr.code || 'GATEWAY_ERROR' });${eol}      }${eol}    }`;

  if (payContent.includes(refundCallOldCRLF)) {
    payContent = payContent.replace(refundCallOldCRLF, safeRefundReorder('\r\n'));
    // Remove the old duplicate !created block that was below
    payContent = payContent.replace(
      "    if (!created) {\r\n      return res.status(200).json({\r\n        message: 'Refund already recorded for this idempotency key',\r\n        payment, refund, duplicate: true,\r\n      });\r\n    }\r\n\r\n",
      ""
    );
    fs.writeFileSync(payFile, payContent, 'utf8');
    console.log('[✓] Safely reordered payments.js refund sequence (CRLF)');
  } else if (payContent.includes(refundCallOldLF)) {
    payContent = payContent.replace(refundCallOldLF, safeRefundReorder('\n'));
    payContent = payContent.replace(
      "    if (!created) {\n      return res.status(200).json({\n        message: 'Refund already recorded for this idempotency key',\n        payment, refund, duplicate: true,\n      });\n    }\n\n",
      ""
    );
    fs.writeFileSync(payFile, payContent, 'utf8');
    console.log('[✓] Safely reordered payments.js refund sequence (LF)');
  }
}

console.log('--- Phase 1 Fixes Successfully Applied ---');

import fs from 'node:fs';

console.log('--- Applying Phase 0 & 1 Hardening Fixes ---');

// 1. Fix lawyerBookings.js IDOR & hospital_admin over-privilege
{
  const file = 'backend/src/routes/lawyerBookings.js';
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes("const isAdmin = ['superadmin', 'hospital_admin'].includes(req.user.role);")) {
    content = content.replace(
      "const isAdmin = ['superadmin', 'hospital_admin'].includes(req.user.role);",
      "const isAdmin = req.user.role === 'superadmin';"
    );
    content = content.replace(
      "return res.status(403).json({ message: 'Confidential: You do not have access to this case record' });",
      "return res.status(404).json({ message: 'Booking not found' });"
    );
    fs.writeFileSync(file, content, 'utf8');
    console.log('[✓] Fixed lawyerBookings.js confidentiality and IDOR response');
  }
}

// 2. Fix lab.js ASTM and HL7 tenant isolation
{
  const file = 'backend/src/routes/lab.js';
  let content = fs.readFileSync(file, 'utf8');
  // ASTM patch
  const astmTarget = "const parsed = parseAstmFrame(frame);\r\n    let matched = 0;\r\n    for (const r of parsed.results) {\r\n      const order = await LabOrder.findOne({\r\n        $or: [{ accessionNo: r.sampleId }, { orderId: r.sampleId }, { 'tests.sampleId': r.sampleId }],\r\n      });";
  const astmTargetLF = "const parsed = parseAstmFrame(frame);\n    let matched = 0;\n    for (const r of parsed.results) {\n      const order = await LabOrder.findOne({\n        $or: [{ accessionNo: r.sampleId }, { orderId: r.sampleId }, { 'tests.sampleId': r.sampleId }],\n      });";
  
  const astmReplacement = (eol) => `const parsed = parseAstmFrame(frame);${eol}    const tenantId = req.serviceAccount?.tenantId || req.user?.hospitalId || req.user?.facilityId;${eol}    const tenantFilter = tenantId ? { hospitalId: tenantId } : {};${eol}    let matched = 0;${eol}    for (const r of parsed.results) {${eol}      const order = await LabOrder.findOne({${eol}        ...tenantFilter,${eol}        $or: [{ accessionNo: r.sampleId }, { orderId: r.sampleId }, { 'tests.sampleId': r.sampleId }],${eol}      });`;

  if (content.includes(astmTarget)) {
    content = content.replace(astmTarget, astmReplacement('\r\n'));
    console.log('[✓] Scoped lab.js ASTM ingest by tenantId (CRLF)');
  } else if (content.includes(astmTargetLF)) {
    content = content.replace(astmTargetLF, astmReplacement('\n'));
    console.log('[✓] Scoped lab.js ASTM ingest by tenantId (LF)');
  }

  // HL7 patch
  const hl7Target = "for (const obr of parsed.orders) {\r\n      if (!obr.orderId) continue;\r\n      // eslint-disable-next-line no-await-in-loop\r\n      const order = await LabOrder.findOne({ orderId: obr.orderId });";
  const hl7TargetLF = "for (const obr of parsed.orders) {\n      if (!obr.orderId) continue;\n      // eslint-disable-next-line no-await-in-loop\n      const order = await LabOrder.findOne({ orderId: obr.orderId });";

  const hl7Replacement = (eol) => `const tenantId = req.serviceAccount?.tenantId || req.user?.hospitalId || req.user?.facilityId;${eol}    const tenantFilter = tenantId ? { hospitalId: tenantId } : {};${eol}    for (const obr of parsed.orders) {${eol}      if (!obr.orderId) continue;${eol}      // eslint-disable-next-line no-await-in-loop${eol}      const order = await LabOrder.findOne({ ...tenantFilter, orderId: obr.orderId });`;

  if (content.includes(hl7Target)) {
    content = content.replace(hl7Target, hl7Replacement('\r\n'));
    console.log('[✓] Scoped lab.js HL7 ingest by tenantId (CRLF)');
  } else if (content.includes(hl7TargetLF)) {
    content = content.replace(hl7TargetLF, hl7Replacement('\n'));
    console.log('[✓] Scoped lab.js HL7 ingest by tenantId (LF)');
  }
  fs.writeFileSync(file, content, 'utf8');
}

// 3. Fix nginx cache header on index.html (bfcache leak)
{
  const file = 'infra/nginx/snippets/findmedi-proxy-locations.conf';
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('add_header Cache-Control "no-cache, must-revalidate";')) {
    content = content.replace(
      'add_header Cache-Control "no-cache, must-revalidate";',
      'add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;\n  add_header Pragma "no-cache" always;'
    );
    fs.writeFileSync(file, content, 'utf8');
    console.log('[✓] Fixed nginx index.html Cache-Control to prevent bfcache leaks');
  }
}

// 4. Fix frontend/vite.config.js esbuild drop configuration
{
  const file = 'frontend/vite.config.js';
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('esbuild: mode === "production"')) {
    content = content.replace(
      'export default defineConfig(({ mode }) => ({',
      'export default defineConfig(({ mode }) => ({\n    esbuild: mode === "production" ? { drop: ["console", "debugger"] } : {},'
    );
    fs.writeFileSync(file, content, 'utf8');
    console.log('[✓] Configured root-level esbuild console/debugger drop in frontend/vite.config.js');
  }
}

// 5. Fix patientInsurancePolicies.js mass assignment
{
  const file = 'backend/src/routes/patientInsurancePolicies.js';
  let content = fs.readFileSync(file, 'utf8');
  const target = 'const policy = await InsurancePolicy.create({ ...req.body, patientId: actorId(req) });';
  const replacement = `const { insurer, tpa, policyNumber, memberIds, scheme, validFrom, validTo } = req.body;
    const policy = await InsurancePolicy.create({
      insurer, tpa, policyNumber, memberIds, scheme, validFrom, validTo,
      verified: false,
      patientId: actorId(req),
    });`;
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log('[✓] Prevented mass assignment in patientInsurancePolicies.js');
  }
}

console.log('--- Hardening Fixes Complete ---');

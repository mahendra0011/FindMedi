// OpenAPI 3.0 document for FindMedi (Phase 4 roadmap).
// Hand-written against the real route files (methods/paths verified from
// src/routes/* + src/index.js mounts) — not generated, so it never drifts
// from a codegen tool's version quirks. zod-to-openapi migration can layer
// on top later; this is the source of truth today.
//
// Served at /api/docs (Swagger UI) + /api/docs.json — see src/index.js.
// Open in non-production, auth-gated (protect) in production.

const bearer = [{ bearerAuth: [] }];
const err = (description = 'Error') => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});
const json = (schema, description = 'OK') => ({
  description,
  content: { 'application/json': { schema } },
});

export function buildOpenApiDocument() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'FindMedi API',
      version: '2.0.0',
      description:
        'Healthcare platform API — auth, appointments, payments/billing, insurance, commissions/payouts, reports, exports, async jobs. ' +
        'Money paths dual-write to PostgreSQL (see backend/prisma/schema.prisma). Auth: Bearer JWT (see POST /api/auth/login).',
    },
    servers: [{ url: '/api', description: 'Same-origin API base' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: { message: { type: 'string' } },
          required: ['message'],
        },
        AuthTokens: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', example: 'patient' },
            hospitalId: { type: 'string', nullable: true },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            transaction_id: { type: 'string' },
            patient_id: { type: 'string' },
            amount: { type: 'number' },
            method: { type: 'string', enum: ['card', 'upi', 'netbanking', 'cash', 'wallet'] },
            status: { type: 'string', enum: ['completed', 'pending', 'failed', 'refunded'] },
            serviceType: { type: 'string', enum: ['appointment', 'test', 'medicine'] },
            referenceId: { type: 'string' },
            refund_amount: { type: 'number' },
          },
        },
        Billing: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            invoiceId: { type: 'string' },
            patientId: { type: 'string' },
            amount: { type: 'number' },
            paid: { type: 'number' },
            balance: { type: 'number' },
            status: { type: 'string', enum: ['Paid', 'Pending', 'Overdue', 'Partial', 'Cancelled', 'Refunded'] },
            source: { type: 'string' },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            patientId: { type: 'string' },
            doctorId: { type: 'string' },
            date: { type: 'string' },
            timeSlot: { type: 'string' },
            status: { type: 'string', enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'] },
          },
        },
        InsuranceClaim: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            claimId: { type: 'string' },
            patientId: { type: 'string' },
            insuranceProvider: { type: 'string' },
            policyNumber: { type: 'string' },
            claimStatus: { type: 'string' },
            claimAmount: { type: 'number', nullable: true },
            approvedAmount: { type: 'number', nullable: true },
          },
        },
        Payout: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            facilityId: { type: 'string' },
            grossRevenue: { type: 'number' },
            commissionAmount: { type: 'number' },
            netPayout: { type: 'number' },
            transactionCount: { type: 'integer' },
            status: { type: 'string', enum: ['pending', 'paid', 'cancelled'] },
          },
        },
        JobEnqueue: {
          type: 'object',
          properties: { jobId: { type: 'string' }, state: { type: 'string', example: 'queued' } },
          required: ['jobId', 'state'],
        },
        JobState: {
          type: 'object',
          properties: {
            state: { type: 'string', enum: ['waiting', 'active', 'delayed', 'completed', 'failed', 'unknown'] },
            result: { type: 'object', nullable: true, properties: { filename: { type: 'string' }, base64: { type: 'string' } } },
            failedReason: { type: 'string' },
            enqueuedAt: { type: 'string', format: 'date-time' },
            startedAt: { type: 'string', format: 'date-time' },
            finishedAt: { type: 'string', format: 'date-time' },
          },
          required: ['state'],
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Ops'], summary: 'Health check',
          responses: { 200: json({ type: 'object' }, 'ok + component statuses') },
        },
      },
      // ── Routing / Navigation (Valhalla) ──
      '/routing/navigation': {
        post: {
          tags: ['Ops'], summary: 'Turn-by-turn route (Valhalla maneuvers) for guided navigation',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    origin: { type: 'array', items: { type: 'number' }, description: '[lng, lat]', minItems: 2, maxItems: 2 },
                    destination: { type: 'array', items: { type: 'number' }, description: '[lng, lat]', minItems: 2, maxItems: 2 },
                    costing: { type: 'string', enum: ['auto', 'bicycle', 'pedestrian', 'motorcycle', 'emergency'], default: 'auto' },
                  },
                  required: ['origin', 'destination'],
                },
              },
            },
          },
          responses: {
            200: json({
              type: 'object',
              properties: {
                shape: { type: 'string', description: 'Precision-6 encoded polyline (decode client-side)' },
                distanceKm: { type: 'number' },
                durationSeconds: { type: 'number' },
                maneuvers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      instruction: { type: 'string' },
                      lengthKm: { type: 'number' },
                      timeSeconds: { type: 'number' },
                      streetNames: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
                source: { type: 'string', enum: ['valhalla', 'haversine_fallback'] },
              },
            }),
            400: err(), 429: err('Rate limited'),
          },
        },
      },
      // ── Auth ──
      '/auth/register': {
        post: {
          tags: ['Auth'], summary: 'Register (email + OTP verification follows)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' }, role: { type: 'string' } }, required: ['name', 'email', 'password'] } } } },
          responses: { 201: json({ $ref: '#/components/schemas/User' }, 'Created (verify email next)'), 400: err() },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'], summary: 'Login → JWT + refresh token',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } }, required: ['email', 'password'] } } } },
          responses: { 200: json({ $ref: '#/components/schemas/AuthTokens' }), 400: err(), 401: err('Invalid credentials') },
        },
      },
      '/auth/verify-otp': {
        post: {
          tags: ['Auth'], summary: 'Verify email OTP',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, otp: { type: 'string' } }, required: ['email', 'otp'] } } } },
          responses: { 200: json({ $ref: '#/components/schemas/AuthTokens' }), 400: err() },
        },
      },
      '/auth/me': {
        get: { tags: ['Auth'], summary: 'Current user', security: bearer, responses: { 200: json({ $ref: '#/components/schemas/User' }), 401: err() } },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'], summary: 'Rotate refresh token',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } }, required: ['refreshToken'] } } } },
          responses: { 200: json({ $ref: '#/components/schemas/AuthTokens' }), 401: err() },
        },
      },
      // ── Appointments ──
      '/appointments': {
        get: { tags: ['Appointments'], summary: 'List (role-scoped)', security: bearer, responses: { 200: json({ type: 'object' }), 401: err() } },
      },
      '/appointments/my-appointments': {
        get: { tags: ['Appointments'], summary: 'My appointments', security: bearer, responses: { 200: json({ type: 'object' }), 401: err() } },
      },
      '/appointments/lock-slot': {
        post: {
          tags: ['Appointments'], summary: 'Redis slot lock (anti double-booking)', security: bearer,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { doctorId: { type: 'string' }, date: { type: 'string' }, timeSlot: { type: 'string' } }, required: ['doctorId', 'date', 'timeSlot'] } } } },
          responses: { 200: json({ type: 'object' }), 401: err(), 409: err('Slot locked by another patient') },
        },
      },
      // ── Payments (PG dual-write) ──
      '/payments': {
        get: { tags: ['Payments'], summary: 'List payments', security: bearer, responses: { 200: json({ type: 'object', properties: { payments: { type: 'array', items: { $ref: '#/components/schemas/Payment' } }, total_amount: { type: 'number' } } }), 401: err() } },
        post: {
          tags: ['Payments'], summary: 'Create payment (mirrors to PG)', security: bearer,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { patient_id: { type: 'string' }, amount: { type: 'number' }, method: { type: 'string' }, serviceType: { type: 'string' }, referenceId: { type: 'string' } }, required: ['amount', 'method'] } } } },
          responses: { 201: json({ $ref: '#/components/schemas/Payment' }), 400: err(), 401: err() },
        },
      },
      '/payments/{id}/refund': {
        put: {
          tags: ['Payments'], summary: 'Refund (admin)', security: bearer,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { refund_amount: { type: 'number' } } } } } },
          responses: { 200: json({ type: 'object' }), 400: err(), 401: err(), 404: err() },
        },
      },
      '/transactions/pay': {
        post: {
          tags: ['Payments'], summary: 'Unified payment + booking confirm (idempotent)', security: bearer,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { serviceType: { type: 'string', enum: ['appointment', 'test', 'medicine'] }, amount: { type: 'number' }, method: { type: 'string' }, referenceId: { type: 'string' } }, required: ['serviceType', 'amount', 'method'] } } } },
          responses: { 200: json({ type: 'object' }), 400: err(), 401: err() },
        },
      },
      // ── Billing ──
      '/billing': {
        get: { tags: ['Billing'], summary: 'List bills', security: bearer, responses: { 200: json({ type: 'object' }), 401: err() } },
        post: {
          tags: ['Billing'], summary: 'Create bill (mirrors to PG)', security: bearer,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { patientId: { type: 'string' }, amount: { type: 'number' }, source: { type: 'string' } }, required: ['amount'] } } } },
          responses: { 201: json({ $ref: '#/components/schemas/Billing' }), 400: err(), 401: err() },
        },
      },
      '/billing/{id}': {
        get: { tags: ['Billing'], summary: 'Get bill by id or invoiceId', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: json({ $ref: '#/components/schemas/Billing' }), 401: err(), 404: err() } },
      },
      '/billing/pay': {
        post: { tags: ['Billing'], summary: 'Pay against a bill', security: bearer, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: json({ type: 'object' }), 400: err(), 401: err() } },
      },
      // ── Insurance ──
      '/insurance': {
        get: { tags: ['Insurance'], summary: 'List claims', security: bearer, responses: { 200: json({ type: 'object' }), 401: err() } },
        post: {
          tags: ['Insurance'], summary: 'Create claim (mirrors to PG)', security: bearer,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { patientId: { type: 'string' }, insuranceProvider: { type: 'string' }, policyNumber: { type: 'string' } }, required: ['patientId', 'insuranceProvider', 'policyNumber'] } } } },
          responses: { 201: json({ $ref: '#/components/schemas/InsuranceClaim' }), 400: err(), 401: err() },
        },
      },
      '/insurance/{id}/settle': {
        put: { tags: ['Insurance'], summary: 'Settle claim (admin)', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { approvedAmount: { type: 'number' } } } } } }, responses: { 200: json({ type: 'object' }), 400: err(), 401: err() } },
      },
      // ── Commission / payouts ──
      '/commission/config': {
        get: { tags: ['Commission'], summary: 'Commission configs (superadmin)', security: bearer, responses: { 200: json({ type: 'object' }), 401: err(), 403: err() } },
      },
      '/commission/payouts': {
        post: {
          tags: ['Commission'], summary: 'Create payout batch (superadmin, mirrors to PG)', security: bearer,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { facilityId: { type: 'string' }, periodStart: { type: 'string' }, periodEnd: { type: 'string' } }, required: ['facilityId'] } } } },
          responses: { 201: json({ $ref: '#/components/schemas/Payout' }), 400: err(), 401: err(), 404: err() },
        },
      },
      '/commission/ledger': {
        get: { tags: ['Commission'], summary: 'Transaction ledger (superadmin)', security: bearer, responses: { 200: json({ type: 'object' }), 401: err(), 403: err() } },
      },
      // ── Async jobs (BullMQ) ──
      '/reports/jobs': {
        post: {
          tags: ['Jobs'], summary: 'Enqueue PDF generation (admin)', security: bearer,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { kind: { type: 'string', enum: ['prescription', 'lab-report', 'discharge-summary', 'invoice'] }, data: { type: 'object' } }, required: ['kind'] } } } },
          responses: { 202: json({ $ref: '#/components/schemas/JobEnqueue' }, 'Queued'), 400: err(), 401: err() },
        },
      },
      '/reports/jobs/{id}': {
        get: { tags: ['Jobs'], summary: 'Poll PDF job', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: json({ $ref: '#/components/schemas/JobState' }), 401: err(), 503: err('Queue unavailable') } },
      },
      '/export/jobs': {
        post: {
          tags: ['Jobs'], summary: 'Enqueue CSV export (superadmin)', security: bearer,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { type: { type: 'string', enum: ['users', 'revenue', 'bookings', 'facilities', 'audit'] }, from: { type: 'string' }, to: { type: 'string' } }, required: ['type'] } } } },
          responses: { 202: json({ $ref: '#/components/schemas/JobEnqueue' }, 'Queued'), 400: err(), 401: err() },
        },
      },
      '/export/jobs/{id}': {
        get: { tags: ['Jobs'], summary: 'Poll export job', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: json({ $ref: '#/components/schemas/JobState' }), 401: err(), 503: err('Queue unavailable') } },
      },
      // ── Ops ──
      '/admin/queues': {
        get: { tags: ['Ops'], summary: 'Bull Board dashboard (superadmin, HTML; needs REDIS_URL)', security: bearer, responses: { 200: { description: 'HTML dashboard' }, 401: err(), 403: err() } },
      },
    },
    // Full router inventory (mounts in src/index.js). Documented above: the
    // critical flows. Everything below is live but schema-docs are pending —
    // this list stops engineers reverse-engineering "what exists".
    'x-router-inventory': [
      '/api/auth', '/api/users', '/api/doctors', '/api/patients', '/api/appointments',
      '/api/records', '/api/billing', '/api/dashboard', '/api/reviews', '/api/notifications',
      '/api/reports', '/api/upload', '/api/emergency', '/api/departments', '/api/payments',
      '/api/transactions', '/api/lab', '/api/pharmacy', '/api/ipd', '/api/triage',
      '/api/clinical-alerts', '/api/search', '/api/video', '/api/surge', '/api/radiology',
      '/api/insurance', '/api/diet', '/api/health-id', '/api/referral', '/api/loyalty',
      '/api/ot', '/api/bloodbank', '/api/physio', '/api/mentalhealth', '/api/staff',
      '/api/inventory', '/api/housekeeping', '/api/tokens', '/api/nursing', '/api/beds',
      '/api/tests', '/api/hospitals', '/api/facilities', '/api/clinics', '/api/platform',
      '/api/patient', '/api/audit-logs', '/api/commission', '/api/admin/security',
      '/api/disputes', '/api/support-tickets', '/api/leave-requests', '/api/export',
      '/api/integrations', '/api/delivery', '/api/chat', '/api/calls', '/api/ride',
      '/api/rider', '/api/assistant-bookings', '/api/lawyer-bookings', '/api/medicine-reminders',
      '/api/vitals', '/api/care-plans', '/api/emergency-sos', '/api/emergency-doctor',
      '/api/instant', '/api/ambulance', '/api/mindsupport', '/api/payment/demo',
    ],
  };
}

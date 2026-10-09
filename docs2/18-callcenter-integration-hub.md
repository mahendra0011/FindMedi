# 18. Call Center / CRM Telephony & Integration Hub (NEW)

Already covered (skip): CRM leads/campaigns exist in repo (`Lead`, `Campaign`, `routes/crm.js`), health-camp/Event module exists (`Event`, `EventRegistration`, EventOrganizer dashboard), feedback/grievance (file 05 §5.7), ABDM/FHIR/HL7 as standards list (file 07), outbox events (file 09 §9.10).
Naya: **call-center console**, aur **integration hub** (devices, analyzers, monitors, printers, outbound webhooks) ka architecture + UI.

---

## 18.1 Call Center / Contact Centre

Repo: role `call_center_agent` file 08 me sirf naam; telephony/IVR/callback model nahi.

### Logic
- **Channels:** inbound/outbound voice, missed-call, WhatsApp, web-chat; unified `Interaction` per contact.
- **Telephony provider** (India: Exotel / Knowlarity / Ozonetel / Twilio etc. - compare on DLT/TRAI compliance, pricing, SLA) via webhooks: `call.ringing | answered | ended | missed`, with **recording URL** (store only if consent line played; retention policy; PHI protected).
- **Screen-pop:** incoming number -> lookup patient (mobile/family) -> open console with patient card (UHID, last visit, dues, upcoming appointment, flags).
- **Call outcomes (dispositions):** Appointment booked/rescheduled/cancelled, Enquiry (price/doctor/bed), Complaint (-> ticket), Callback requested, Wrong number, Follow-up done, Not reachable.
- **Outbound campaigns / worklists:** missed-appointment call, post-discharge call (48h), vaccination/recall due, report ready, payment reminder; **list generated from rules** (13.3), dialer modes (preview/click-to-call), **DND/consent check** (TRAI DND scrub for promotional), calling-hours rule, max attempts (3) with spacing.
- **Callbacks & SLA:** abandoned call within 15 min callback task (`WorkTask`), SLA timers, supervisor wallboard.
- **Scripts & compliance:** dynamic scripts by call type; mandatory fields before wrap-up; **quality scoring** (QA form via Form Builder 14.1) on sampled recordings.
- **Booking inside console:** reuse appointment APIs; read-only doctor slot picker; send confirmation via notification engine.
### Data model
```js
Interaction { channel, direction, from, to, patientId?, leadId?, agentId, queue, startedAt, answeredAt, endedAt, durationSec, recordingUrl, disposition, notes, followUpAt, ticketId, appointmentId, consentPlayed }
CallQueue { name, skills[], hoursOfOperation, overflowTo, slaAnswerSec }
OutboundCampaign { name, ruleKey|listRef, script, window:{days,from,to}, maxAttempts, spacingMin, status, stats }
AgentSession { agentId, status:'Available|OnCall|Wrap|Break|Offline', since }
```
### API
`POST /api/telephony/webhook/:provider` (signature verified), `POST /api/calls/click-to-call`, `GET /api/interactions?patientId=`, `POST /api/interactions/:id/disposition`, `GET /api/callcenter/wallboard`.
### Libraries
Provider SDK/webhooks; **LiveKit (already in repo) has SIP/telephony capabilities** if you prefer a WebRTC softphone - verify current LiveKit SIP docs before committing; `socket.io` for agent presence & screen-pop; `howler`-style audio not needed.
### UI design
```
+----------------------------------------------------------------------------------+
| Agent: Priya  ● Available ▾   Queue: Appointments (3 waiting, longest 00:42)        |
+-----------------------+----------------------------------+-----------------------+
| Interaction (live)    | Patient 360 (screen-pop)         | Actions                |
| 98xxxxxx12  ☎ 02:14   | Rahul Sharma  UHID 100023  M/42  | [Book appointment]     |
| [Mute][Hold][Transfer]| Flags: Allergy-Penicillin, VIP   | [Create complaint]     |
| Script: Appointment   | Last visit: 3 Oct Dr. Iyer       | [Send payment link]    |
| ☐ verified identity   | Dues ₹0   Next appt: 20 Oct      | [Callback later]       |
+-----------------------+----------------------------------+-----------------------+
| Disposition: [Booked ▾]  Notes: ____________________  [Wrap-up & Next]            |
+----------------------------------------------------------------------------------+
```
Supervisor wallboard: live agent grid (status colour + duration), queue depth, SLA %, abandon rate; listen/whisper (provider dependent).
### Animation
Incoming call: ring banner slides from top with soft icon pulse (stops on answer); status dot colour crossfade; wallboard numbers tween (200ms). Timer ticks without animation (avoid distraction).
### Tests
Webhook signature/replay, duplicate call events, DND scrub, recording consent path, high-volume (200 concurrent) websocket presence, number masking in logs.

---

## 18.2 Integration Hub (devices & external systems)

(File 07 §7.7 had a one-line list; this is the architecture.)

### Logic
- **Pattern:** HMS core never talks to devices directly. **Integration Hub** = adapters + canonical message bus + mapping + monitoring.
```
Devices/Systems  ->  Edge Gateway (on-prem agent)  ->  Hub (queue, transform, route)  ->  HMS API (canonical JSON/FHIR)
 Analyzers(ASTM/HL7/serial)   Monitors(HL7/MQTT)   PACS(DICOM)   Printers(ZPL/ESC-POS)   Biometric   POS/Payment
```
- **Edge Gateway (on-prem):** lightweight service (Node/Go) near devices (serial/TCP/USB/LAN), buffers when internet is down, **outbound-only TLS** connection to cloud (no inbound firewall holes), mTLS + device certificate, heartbeat, auto-update.
- **Protocols:** HL7 v2 (MLLP over TCP) for ADT/ORM/ORU; **ASTM E1381/E1394** for lab analyzers (ENQ/ACK framing); DICOM (MWL/C-STORE/Q-R) via **Orthanc** as PACS; MQTT for monitors/IoT; serial RS-232 via gateway; REST/webhooks for cloud vendors; FHIR R4 for ABDM/partners (file 07).
- **Canonical model + mapping:** per-device **mapping profiles** (analyzer test code -> LIS test master; units; flags). Unknown codes -> `quarantine` queue for a technician to map (never silently drop).
- **Order/result safety:** result messages matched by **accession number**; mismatch/duplicate => hold for review; auto-verification rules (within range, delta-check OK) vs manual; **never auto-release critical** (route to rule engine).
- **Reliability:** idempotent ingestion (messageId), ordered per device, retries with backoff, **dead-letter queue**, replay UI, store raw message for audit (retention policy), time sync (NTP) check.
- **Monitoring:** device status board (last heartbeat, queue depth, error rate), alerting on silence (rule 13.3).
### Data model
```js
Integration { key, type:'analyzer'|'monitor'|'pacs'|'printer'|'biometric'|'payment'|'partner', protocol, endpoint, credentialsRef, mappingProfileId, locationId, status, lastSeenAt, enabled }
MappingProfile { integrationId, codeMap:[{deviceCode, hmsCode, unit, factor}], flagMap, valueRules }
IntegrationMessage { integrationId, direction, protocol, rawPayload, canonical, status:'Received|Mapped|Delivered|Quarantined|Failed', error, correlationId, receivedAt }
```
### Libraries / tools
- Gateway: Node.js with `net`, `serialport`; HL7: `hl7-standard` / `node-hl7-client` (evaluate); ASTM: small in-house framer; MQTT: `mqtt`; DICOM: **Orthanc** server + **OHIF/Cornerstone3D** viewer + `dcmjs`.
- Engine alternatives: **Node-RED** (visual flows) or Mirth/NextGen Connect (check current licence terms before adopting), HAPI FHIR (Java) if full FHIR server needed.
- Core: `bullmq`/`kafkajs` (both already in backend) for ingestion queues; `pino` logging; Prometheus metrics (infra folder).
### UI design
- **Integrations board:** cards per device/system (icon, location, status dot Online/Degraded/Offline, last message time, msgs/hour sparkline), filter by type/location.
- **Message inspector:** table of messages with status chips; side drawer shows raw vs canonical vs mapped (3 tabs), `Reprocess`, `Quarantine -> Map code` flow with suggestion from LIS master.
- **Mapping editor:** two-column code mapper with auto-suggest & unit factor.
### Animation
Status dot pulse only for **Degraded** (amber) and Offline turns solid red (no flashing). Sparklines static; message list prepends new rows with 150ms highlight fade when "Live" toggle is on.

---

## 18.3 Outbound Webhooks & Partner API (developer-facing)

Repo has `webhook.js` (inbound), `ApiKey`, `openapi`. Missing: **subscriptions** to events.
### Logic
- `WebhookSubscription {url, events[], secret, hospitalId, active, filters}`; events from outbox: `appointment.*, bill.paid, lab.result.verified, discharge.finalized, claim.status_changed, bed.status_changed`.
- Delivery: signed (`X-Signature: HMAC-SHA256(secret, ts + body)`, timestamp tolerance 5 min), retries exponential (1m,5m,30m,2h,12h), disable after N consecutive failures + notify, **delivery log + replay**, payload version (`v1`), PHI minimal (IDs + links; fetch details via authenticated API).
- API keys: scopes per resource, per-key rate limit/quota, IP allow-list, rotation, last-used, sandbox environment with synthetic data.
### UI
Developer settings: subscriptions table, delivery log (status/latency/response), `Send test event`, API key manager (show-once secret), usage chart.
### Animation
Minimal: copy-to-clipboard check morph (150ms), log row expand/collapse.

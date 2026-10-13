# Hospital & Clinic Administrator Guide: Access Control Center (IAM)

> **FindMedi Access Control Center** provides AWS IAM-level fine-grained authorization within hospital and clinic tenant environments. Hospital owners and administrators can delegate scoped, time-bound, and condition-enforced permissions (e.g., *"Ravi only has write access to Ward-3 vitals"*, *"Meena only has read access to billing invoices"*, *"Intern has 7-day read access to OPD schedules"*).

---

## 1. Architectural Model & Concepts

| FindMedi IAM Concept | AWS IAM Equivalent | Description in Hospital Context |
|---|---|---|
| **Tenant** | AWS Account | Hospital, Clinic, Diagnostic Centre, or Pharmacy organisation (`tenantId`). Cross-tenant access is strictly denied. |
| **Tenant Owner** | Root User | Primary hospital licensee/medical superintendent. MFA mandatory; last-owner demotion protected. |
| **Staff Member** | IAM User | Individual healthcare worker login identity (`User`). |
| **Team / Department Group** | IAM Group | Collection of staff members (e.g., *"Ward-3 Nurses"*, *"Billing Cashiers"*) inheriting attached roles. |
| **Role** | IAM Role | Fine-grained permission bundle (`managed` template or `custom`). |
| **Access Policy** | Policy Document | Structured JSON statements with `Allow`/`Deny`, `actions`, `resources`, and `conditions`. |
| **Resource Scope** | Resource ARN | Boundary path: `ward/<id>`, `dept/<id>`, `location/<id>`, or `careTeamOnly`. |
| **Conditions** | Condition Block | Zero-trust context: `mfa`, `shift: 'current'`, `ip: ['hospital-network']`, `expires_at`. |
| **Emergency Break-Glass** | STS Temp Credentials | Time-boxed (30–60 min) audited access for treating patients outside immediate care-teams. |
| **Access Analyzer** | IAM Access Analyzer | Automated security engine flagging Segregation of Duties (SoD) conflicts, unauthenticated accounts, and expired grants. |
| **Access Review** | IAM Access Certification | Periodic quarterly audit allowing administrators to certify ("Keep") or revoke stale privileges. |
| **API Keys** | Service Accounts | Hashed, IP-bound credentials for PACS DICOM routers, HL7 interfaces, and LIS auto-analyzers. |

---

## 2. Layered Evaluation Engine (Fail-Closed)

Every request to a clinical or administrative endpoint is evaluated through 7 sequential layers:

```
Request: (Principal, Action, Resource, Context)
 ├── L0: Platform Guardrails      ← Hard platform ceilings (e.g., T3 wellness tenants CANNOT hold clinical actions)
 ├── L1: Tenant Isolation        ← Strict tenantId match (cross-tenant attempt returns 404/403)
 ├── L2: Identity Policies       ← Active roles, groups, and explicit policies (Allow / Deny)
 ├── L3: Resource Scope          ← Ward, Department, or Care-Team boundary matching
 ├── L4: Context Conditions      ← MFA mandatory, active shift schedule, hospital IP subnet
 ├── L5: Sensitivity & Consent   ← Restricted category labels (Mental health, HIV, sexual health), ABDM consent
 └── L6: Session Verification    ← tokenVersion check, step-up re-authentication for high-risk actions
 Decision: Explicit Deny > Allow > Default Deny (Fail-Closed on error)
```

---

## 3. Provider Tier Guardrails (24 Categories)

Under FindMedi's taxonomy, tenant organizations belong to one of three regulatory tiers:

* **Tier 1 (Clinical / T1):** Hospitals, Nursing Homes, Specialty Clinics, Day-Care Centers, Registered Doctors.
  * *Permitted:* All clinical, diagnostic, surgical, and statutory actions.
* **Tier 2 (Health-Adjacent / T2):** Diagnostic Pathology Labs, Imaging Centers, Retail Pharmacies.
  * *Permitted:* Diagnostic orders, specimen collection, lab verification, pharmacy dispensing, inventory, and billing. Clinical diagnosis and EMR amend actions are restricted.
* **Tier 3 (General Health & Wellness / T3):** Gyms, Yoga Studios, Physiotherapy Wellness Centers, Medical Equipment Stores, Nutrition Stores.
  * *Platform Guardrail (L0):* **Strictly blocked from receiving clinical, diagnostic, or prescription actions.** Attempting to grant `records:clinical:*` or `prescriptions:*` to a T3 tenant fails at the engine level.

---

## 4. Action Catalog (~120 Actions) & Sensitivity Classes

Actions follow the `module:resource:verb` structure and are classified into six sensitivity classes:

1. **`standard`:** General operational actions (e.g., `appointments:book`, `vitals:read`, `inventory:read`, `token:issue`).
2. **`sensitive`:** Clinical diagnostic records, prescriptions, and test results (e.g., `records:clinical:read`, `prescriptions:sign`, `lab:result:enter`).
3. **`restricted`:** High-risk medical records (Mental health, HIV/STD, substance use, sexual health, `emergency:access:breakglass`, `records:clinical:amend`). Requires clinical reason and step-up auth.
4. **`financial`:** Financial transactions, billing, tariffs, refunds, and TPA pre-authorizations (e.g., `billing:invoice:write`, `billing:refund:issue`, `insurance:claim:submit`).
5. **`hr_sensitive`:** Staff personally identifiable data, biometric attendance, salary details, and payroll (e.g., `staff:manage`, `staff:salary:read`, `payroll:run`).
6. **`admin_critical`:** Tenant administration, custom role authoring, API key generation, bulk data export, and audit log access (e.g., `iam:role:create`, `apikey:manage`, `export:identified`).

---

## 5. Step-by-Step: Creating Least-Privilege Roles

### Use Case A: "Ravi only writes vitals in Ward-3"
1. Open **Access Control Center** → **Roles & Templates**.
2. Select **Base Template:** `Nurse (Ward-Scoped)`.
3. Set **Role Name:** `Ward-3 Floor Nurse`.
4. Navigate to **Assignments** tab:
   - Select **Staff Member:** `Ravi Kumar`.
   - Select **Role:** `Ward-3 Floor Nurse`.
   - Under **Resource Scopes**, set **Restricted to Ward:** `Ward-3`.
   - Check **Active Shift Only** and **MFA Mandatory**.
   - Click **Grant Access**.
5. *Result:* Ravi cannot view clinical consultation notes or patients located in other wards.

### Use Case B: "Meena only reads billing invoices"
1. Go to **Roles & Templates** → Create Custom Role `Billing Read-Only`.
2. Attach policy with statements:
   ```json
   {
     "effect": "Allow",
     "actions": ["billing:invoice:read", "billing:report:read"],
     "resources": ["tenant/self/*"]
   }
   ```
3. Assign to `Meena Patel`.
4. *Result:* Meena can inspect cashier invoices and collection reports, but cannot issue refunds, write invoices, or view patient clinical history.

### Use Case C: "Intern has 7-day OPD schedule access"
1. In **Assignments**, pick the intern staff account.
2. Select role `Resident / Intern (OPD)`.
3. Set **Auto-Expiry:** `7 Days`.
4. Set **Department Scope:** `OPD Consultation`.
5. *Result:* Access automatically revokes at the 7-day mark via the engine TTL index.

---

## 6. Segregation of Duties (SoD) & Maker-Checker Safeguards

To prevent internal fraud and clinical errors, the Access Control Center enforces strict rules:

| Risk Domain | Conflicting Action A | Conflicting Action B | Engine Enforcement |
|---|---|---|---|
| **Procurement** | `po:create` (Create Indent) | `po:approve` (Approve PO) | Flagged in Access Analyzer as High Violation |
| **Pathology** | `lab:result:enter` (Technician) | `lab:result:verify` (Pathologist) | Flagged in Access Analyzer as High Violation |
| **Finance** | `billing:invoice:write` (Cashier) | `billing:refund:issue` (Refund) | Flagged in Access Analyzer as Critical Violation |
| **Pharmacy** | `pharmacy:dispense` (Dispense) | `pharmacy:h1register:write` (Register) | Flagged in Access Analyzer as High Violation |

### Anti-Privilege Escalation Rules:
* **No Self-Grant:** An administrator cannot assign new roles or policies to their own account.
* **Dual Approval for Admin-Critical:** Any grant containing `iam:`, `audit:`, or `export:` actions requires a second distinct approver (`approvedBy !== actorId`).
* **Session Invalidation:** Any assignment creation, revocation, or role change immediately increments the user's `tokenVersion`, invalidating stale JWTs and forcing a refreshed permission set.

---

## 7. Emergency Break-Glass Protocols (§8)

In life-threatening situations where an on-duty clinician must treat an unassigned or restricted patient:

1. Open **Emergency Break-Glass** tab.
2. Provide **Patient ID / Record ID** and select a statutory reason code (`emergency_care`, `safety_incident`, `legal_order`, `treatment`).
3. Enter ER Case / Ticket ID.
4. **Grant Duration:** Strictly time-boxed to 30–60 minutes.
5. **Auditing:**
   - Real-time notification dispatched to the Hospital Compliance / Medical Superintendent.
   - Every accessed file route is logged to the immutable `TenantGrant.accessLog`.
   - The event is surfaced on the patient's transparency dashboard under DPDP Act requirements.
   - Legal/statutory requests require dual-administrator sign-off.

---

## 8. Service Accounts & Machine API Keys

For integrating automated laboratory analyzers (Sysmex, Roche), PACS DICOM routers (Orthanc), or HL7 messaging gateways:

1. Go to **API Keys** tab.
2. Enter service name (e.g., `Sysmex-XN-550-LIS`).
3. Specify **IP Allowlist** CIDRs (e.g., `192.168.1.50, 10.0.0.12`).
4. Select policy scope (e.g., `lab:sample:collect`, `lab:result:enter`).
5. **Show-Once Credential:** Copy the generated `fm_...` token immediately. Only a SHA-256 hash is retained on FindMedi servers.
6. API keys can be revoked instantly at any time from the dashboard.

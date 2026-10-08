# Legal placeholders — user/lawyer input required (code se complete nahi ho sakta)

Source: `rolesmd/14.md` §11 disclaimers. App legal pages me real content hai;
neeche wali cheezein sirf aap + India-registered lawyer (healthcare + IT/DPDP)
bhar sakte hain. Inke bina legal **final** nahi hoga (draft ~50% hi rahega).

## Fill karo (har item: value + effective date + version stamp)

- [ ] COMPANY_NAME (legal entity name)
- [ ] CIN (Corporate Identity Number)
- [ ] REGISTERED_ADDRESS (postal address)
- [ ] SUPPORT_EMAIL + SUPPORT_PHONE + hours
- [ ] GRIEVANCE_OFFICER_NAME + address (footer + app settings me visible)
- [ ] DPO_CONTACT (Data Protection Officer)
- [ ] JURISDICTION_CITY (governing law courts)
- [ ] EFFECTIVE_DATE + version (v1.0) har document par
- [ ] DSR response SLA days (DPDP current rules confirm karo)
- [ ] Grievance acknowledge/resolve timelines (IT Rules 2021 / E-Commerce Rules 2020 — counsel confirm)
- [ ] Refund TAT business days (3–7?) + reschedule cutoff hours + cancel slabs
- [ ] Payout cycle (T+2/weekly?), commission %, TDS section (194O?) — CA confirm
- [ ] Hindi + regional translations ka legal review (translations ka alag sign-off)

## Review gates (launch se pehle)

- [ ] Lawyer review: ToS, Privacy, Provider Agreement + type addenda, Refund policy,
      Community guidelines, Claims policy, Grievance policy (healthcare + data-protection + consumer + IT)
- [ ] Fee-splitting/advertising/IRDAI/e-pharmacy opinion (business model)
- [ ] Policy acceptance records versioned (user/provider id, version, timestamp, IP) — helper `backend/src/lib/policyAcceptance.js` maujood
- [ ] Compliance register (regulation → owner → evidence → review date)

## Code se bahar (is repo me complete nahi ho sakta)

- Pentest report (R1 public launch se pehle; R4 sensitive categories se pehle dobara)
- Real pilot data (unit economics, CAC/LTV, traction numbers for pitch)
- Staffing/hiring (support agents, field ops, KYC reviewers, clinical advisor)
- Vendor approvals (WhatsApp Business templates, DLT SMS templates, payment gateway live)
- UAT real users + clinical-advisor sign-off

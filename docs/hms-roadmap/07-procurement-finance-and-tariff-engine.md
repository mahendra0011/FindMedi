# 🏥 FINANCIAL LEDGER, PROCUREMENT & TARIFF ENGINE SPECIFICATION
**Covers Modules #25 (Accounting & Finance), #27 (Procurement / 3-Way Matching), #61 (Package Management), and #62 (Tariff Management)**

---

## 1. DOUBLE-ENTRY FINANCIAL LEDGER & P&L (Module #25)

### 1.1 Financial Logic & Accounting Integrity
A true hospital ERP must enforce strict GAAP / Ind-AS double-entry bookkeeping so management can generate Trial Balance, Balance Sheet, and Departmental Profit & Loss (P&L) statements:
1. **Fundamental Accounting Equation**:
   $$\text{Assets} = \text{Liabilities} + \text{Equity}$$
   For every journal transaction:
   $$\sum \text{Debits} = \sum \text{Credits}$$
2. **Chart of Accounts (COA) Structure**:
   - `1000 - Assets` (1100 Cash in Hand, 1110 Bank Accounts, 1200 Patient AR, 1300 Pharmacy Inventory, 1400 Fixed Assets).
   - `2000 - Liabilities` (2100 Vendor AP, 2200 Patient Advance Deposits, 2300 Statutory GST / TDS Payable).
   - `3000 - Equity` (3100 Capital, 3200 Retained Earnings).
   - `4000 - Revenue` (4100 OPD Consultation, 4200 IPD Bed Charges, 4300 Pharmacy Sales, 4400 Lab Investigation, 4500 OT Charges).
   - `5000 - Expenses` (5100 Medicine COGS, 5200 Doctor Fees & Shares, 5300 Staff Salaries, 5400 Utility Bills, 5500 Asset Depreciation).

### 1.2 Automated Event Hooks (HMS to GL)
- When a patient pays ₹5,000 cash advance at reception:
  - `DR 1100 Cash in Hand: ₹5,000`
  - `CR 2200 Patient Advance Liability: ₹5,000`
- When IPD bill of ₹25,000 is finalized:
  - `DR 2200 Patient Advance Liability: ₹5,000`
  - `DR 1200 Insurance / Patient AR: ₹20,000`
  - `CR 4200 IPD Room Revenue: ₹10,000`
  - `CR 4500 OT Surgical Revenue: ₹15,000`

### 1.3 Database Schema (PostgreSQL)
```sql
CREATE TABLE finance_chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_type VARCHAR(30) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    parent_account_id UUID REFERENCES finance_chart_of_accounts(id),
    is_reconciliation_account BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE finance_journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL,
    voucher_number VARCHAR(100) UNIQUE NOT NULL,
    voucher_date DATE NOT NULL,
    reference_module VARCHAR(50), -- BILLING, PHARMACY, PAYROLL, PROCUREMENT
    reference_id UUID,
    narration TEXT NOT NULL,
    created_by_user_id UUID NOT NULL,
    is_posted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE finance_journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID REFERENCES finance_journal_entries(id) ON DELETE CASCADE,
    account_id UUID REFERENCES finance_chart_of_accounts(id),
    debit_amount NUMERIC(14,2) DEFAULT 0.00,
    credit_amount NUMERIC(14,2) DEFAULT 0.00,
    cost_center_department VARCHAR(100)
);
```

---

## 2. PROCUREMENT & 3-WAY MATCHING (Module #27)

### 2.1 Purchasing Flow & Fraud Prevention
Hospital procurement cycle controls high-value pharmaceutical and equipment purchases:
1. **Requisition (Indent)**: Department initiates indent $\implies$ Head of Department approves.
2. **Purchase Order (PO)**: PO issued to approved vendor with agreed rate contract prices.
3. **Goods Receipt Note (GRN)**: Central Store physically receives boxes $\implies$ Verifies batch numbers, expiry dates, and damaged packages $\implies$ Logs received quantity.
4. **3-Way Matching Engine**:
   $$\text{Purchase Order (PO)} \quad \longleftrightarrow \quad \text{Goods Receipt Note (GRN)} \quad \longleftrightarrow \quad \text{Vendor Tax Invoice}$$
   - **Line Item Check**: Unit Price on Vendor Invoice cannot exceed PO price without financial approval.
   - **Quantity Check**: Invoiced quantity cannot exceed GRN accepted quantity.
   - If variance is within tolerance ($\le 0.5\%$), invoice auto-approved for payment; otherwise flagged for Audit Desk.

### 2.2 Database Schema (PostgreSQL)
```sql
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL,
    po_number VARCHAR(100) UNIQUE NOT NULL,
    vendor_id UUID NOT NULL,
    order_date DATE NOT NULL,
    total_amount NUMERIC(14,2) NOT NULL,
    tax_amount NUMERIC(14,2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'ISSUED', -- DRAFT, APPROVED, ISSUED, PARTIALLY_RECEIVED, COMPLETED, CANCELLED
    approved_by_user_id UUID,
    items JSONB NOT NULL
);

CREATE TABLE goods_receipt_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES purchase_orders(id),
    grn_number VARCHAR(100) UNIQUE NOT NULL,
    delivery_challan_number VARCHAR(100),
    received_date DATE NOT NULL,
    store_keeper_id UUID NOT NULL,
    received_items JSONB NOT NULL, -- [{"item_id": "...", "received_qty": 100, "accepted_qty": 98, "rejected_qty": 2, "batch": "B12", "expiry": "2027-10-01"}]
    status VARCHAR(30) DEFAULT 'STORED'
);

CREATE TABLE vendor_invoices_matching (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES purchase_orders(id),
    grn_id UUID REFERENCES goods_receipt_notes(id),
    vendor_invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    invoice_amount NUMERIC(14,2) NOT NULL,
    po_amount_variance NUMERIC(14,2),
    is_matched_successfully BOOLEAN DEFAULT FALSE,
    payment_status VARCHAR(30) DEFAULT 'UNPAID' -- UNPAID, PARTIAL, PAID
);
```

---

## 3. PACKAGE & TARIFF MULTIPLIER MATRIX (Modules #61 & #62)

### 3.1 Tariff Engine & Bed Multiplier Logic
Hospitals cannot hardcode single pricing because procedure and consultation costs vary based on room class, insurance agreement, and all-inclusive packaged bundles:
1. **Bed Category Rate Multiplier**:
   - `Base General Ward Tariff = 1.0x`
   - `Semi-Private Room = 1.3x`
   - `Single Deluxe Private = 1.8x`
   - `Super Deluxe Suite = 2.5x`
   - `ICU Bed = 2.0x`
   *Example: An ultrasound of base cost ₹1,000 charged at ₹1,800 if done for a Deluxe Private bed patient.*
2. **Clinical Package Auto-Exclusion Tracking**:
   - Normal Delivery Package ₹30,000 includes: 2 days room stay, surgeon fees, nursing, initial newborn checkup.
   - **Exclusions**: Blood transfusions, NICU stay for baby, and high-cost implants (e.g., oxytocin infusion pumps or specialized suture staplers) are billed as additional line items automatically when ordered by doctor.

### 3.2 Database Schema (PostgreSQL)
```sql
CREATE TABLE hospital_tariffs_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    service_name VARCHAR(150) NOT NULL,
    department VARCHAR(50) NOT NULL,
    base_rate NUMERIC(10,2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    -- Bed Category Multipliers
    general_ward_rate NUMERIC(10,2) NOT NULL,
    semi_private_rate NUMERIC(10,2) NOT NULL,
    private_deluxe_rate NUMERIC(10,2) NOT NULL,
    icu_rate NUMERIC(10,2) NOT NULL
);

CREATE TABLE hospital_packages_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL,
    package_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. PKG-OBS-NORMAL-DELIV
    package_name VARCHAR(150) NOT NULL,
    package_price NUMERIC(12,2) NOT NULL,
    duration_days INT NOT NULL,
    included_service_codes TEXT[] NOT NULL,
    included_bed_type VARCHAR(50) NOT NULL,
    included_medicines_limit_amount NUMERIC(10,2) DEFAULT 0.00,
    excluded_services_description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);
```

---
*Created as part of the Findmedi Enterprise HMS Comprehensive Blueprint.*

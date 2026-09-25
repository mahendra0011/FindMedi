# 03 - Apache Kafka Event-Driven Architecture Across Core Healthcare Workflows

## 1. Executive Summary
Beyond ride matching and driver tracking, Apache Kafka serves as the enterprise event spine for asynchronous healthcare processing: patient diagnostics, hospital operations, prescription lifecycle, and billing reconciliation.

---

## 2. Cross-Module Kafka Event Topics & Pipelines

### A. Diagnostic Lab Test Lifecycle Pipeline
```
Topic: findmedi.diagnostics.lab-order-events.v1
Key: labOrderId
Events:
  - lab.order.placed          -> Triggers phlebotomist dispatch
  - sample.collected.home     -> Notifies lab technician of inbound specimen
  - specimen.received.lab     -> Starts turnaround SLA countdown
  - results.uploaded          -> Triggers AI Safety check & doctor notification
  - critical.value.detected   -> Triggers high-priority Doctor Panic Call
```

### B. Chronic Care & Remote Patient Monitoring (RPM) Alerting
```
Topic: findmedi.clinical.vitals-telemetry.v1
Key: patientId
Events:
  - vitals.reading.received   -> Continuous stream from smart BP cuff / Glucometer
  - threshold.breached        -> Consumed by Care Coordinator triage team
  - missed.dose.logged        -> Consumed by SMS / WhatsApp medicine reminder worker
```

### C. Multi-Hospital Bed & OT (Operation Theatre) Scheduling
```
Topic: findmedi.hospital.admission-events.v1
Key: hospitalId
Events:
  - bed.allocated             -> Syncs central bed registry
  - ot.scheduled              -> Alerts surgical nursing and anesthesia teams
  - patient.discharged        -> Automatically triggers housekeeping sanitation task
```

### D. Pharmacy Inventory & Stockout Synchronization
```
Topic: findmedi.pharmacy.inventory-delta.v1
Key: pharmacyId
Events:
  - medicine.dispensed        -> Deducts local inventory count
  - stock.below.reorder.point -> Automatically generates purchase order to distributor
```

---

## 3. Advantages Over Synchronous REST Microservices
1. **Resilience to Hospital Network Outages**: If a hospital clinic's local internet goes down, Kafka retains orders and admissions safely in durable broker partitions until connectivity restores.
2. **Zero-Lock Decoupling**: A patient booking an appointment does not block waiting for third-party calendar syncs, email confirmations, or billing webhooks.

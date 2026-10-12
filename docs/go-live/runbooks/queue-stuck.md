# Triage Runbook: Queue Lag & Stuck Workers

## Symptoms
- Alert: `HighQueueLag` or `DeadLetterQueueSpike` fired.
- PDF generation (prescriptions, discharge summaries) failing or delayed by > 2 minutes.
- BullMQ queue metrics show growing backlog on `QUEUE_NAMES.pdf` or `QUEUE_NAMES.whatsapp`.

## Investigation Steps
1. **Check Redis Connectivity:**
   ```bash
   redis-cli ping
   redis-cli info memory
   ```
   Verify Redis memory usage is below 80% eviction threshold.

2. **Inspect Chromium Worker Memory:**
   - Headless Chromium print renderer runs isolated browser contexts.
   - Check if orphaned browser processes are lingering:
     ```powershell
     Get-Process -Name "*chrome*", "*chromium*" | Select-Object Id, CPU, WorkingSet64
     ```
   - If worker memory exceeds 1.5GB cap, gracefully restart worker pool:
     ```bash
     pm2 restart findmedi-pdf-worker
     # or container restart
     docker restart findmedi-worker
     ```

3. **Purge Poison Pills:**
   - If a specific template or corrupt image causes repetitive Chromium segmentation faults, move offending job to dead-letter queue:
     ```bash
     node scripts/bullmq-triage.mjs --queue=pdf --action=quarantine-failed
     ```
   - Fallback kicks in automatically to legacy pdfkit renderer.

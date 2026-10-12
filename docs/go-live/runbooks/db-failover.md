# Triage Runbook: MongoDB Replica Set Failover

## Symptoms
- Alert: `DatabaseConnectionDrop` fired.
- Read/write requests encountering `MongoServerSelectionError` or `MongoNetworkTimeoutError`.
- Health check `GET /api/ops-health` returns `503` with `{ "database": "disconnected" }`.

## Investigation Steps
1. **Replica Set Election Status:**
   - Connect via MongoDB shell (`mongosh`):
     ```javascript
     rs.status()
     ```
   - Check which node is Primary and verify sync lag on Secondary replicas.
2. **Stepdown & Re-Election (if Primary unresponsive):**
   - If Primary node is frozen due to I/O lockup or memory exhaustion:
     ```javascript
     rs.stepDown(60)
     ```
   - Allow replica set to automatically elect a new healthy Secondary as Primary.
3. **Application Connection Pool Recovery:**
   - Mongoose uses `autoReconnect` and DNS SRV connection strings.
   - Once a new Primary is elected, application nodes reconnect automatically within 5-10 seconds.
   - If connection pool remains stalled, execute rolling reload of API processes:
     ```bash
     pm2 reload all --update-env
     ```
4. **Post-Failover Health Check:**
   - Verify write operations by checking recent `AuditLog` writes.
   - Verify `GET /api/ops-health` returns `200 OK`.

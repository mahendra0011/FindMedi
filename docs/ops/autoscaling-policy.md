# Autoscaling policy (doc 19)

## Signals
- API p95 latency > 400ms for 5 min -> scale out API replicas (+1, max 6).
- CPU > 70% for 5 min -> scale out.
- Memory > 80% for 5 min -> scale out.
- Queue depth (BullMQ/Redis) > 1000 -> scale workers.
- Error rate > 1% for 3 min -> alert + manual review (no auto-scale).

## Cooldowns
- Scale-out cooldown: 3 min. Scale-in cooldown: 10 min (avoid flapping).
- Min replicas: 2 (prod), 1 (staging). Max: 6.

## Triggers
- k6 smoke (`scripts/load/k6-smoke.js`) must pass p95<500ms, error<1% before any release.
- Monthly soak: 30 min at 2x peak; quarterly spike: 5x for 2 min.

## Rollback
- If scale-out does not recover within 10 min, roll back last deploy (see docs/ops/runbooks).

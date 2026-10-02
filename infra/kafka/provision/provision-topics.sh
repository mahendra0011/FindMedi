#!/usr/bin/env bash
# ==============================================================================
# DP-B-02: provision Kafka topics AND their ACLs from the manifest.
# ==============================================================================
# Auto topic creation is disabled, so this script is the ONLY way a topic comes
# into existence. Running it after the broker is healthy:
#
#   docker compose -f infra/docker-compose.yml \
#     -f infra/docker-compose.prod.yml --profile certbot run --rm \
#     kafka bash /etc/kafka/provision/provision-topics.sh
#
# Environment:
#   KAFKA_BOOTSTRAP   broker address (default kafka:29092)
#   KAFKA_REPLICATION_FACTOR  1 for dev, 3 in production
#   KAFKA_ADMIN_USER / KAFKA_ADMIN_PASSWORD  the superuser used for provisioning
#
# It is idempotent: re-running updates the config and re-asserts the ACLs, so a
# drifted ACL set is corrected rather than silently persisting.
# ==============================================================================
set -Eeuo pipefail

BOOTSTRAP="${KAFKA_BOOTSTRAP:-kafka:29092}"
MANIFEST="${KAFKA_MANIFEST:-/etc/kafka/provision/topics.json}"
REPLICATION="${KAFKA_REPLICATION_FACTOR:-1}"
ADMIN="${KAFKA_ADMIN_USER:?KAFKA_ADMIN_USER is required}"
ADMIN_PW="${KAFKA_ADMIN_PASSWORD:?KAFKA_ADMIN_PASSWORD is required}"

TOPICS_CMD="kafka-topics --bootstrap-server ${BOOTSTRAP}"
ACL_CMD="kafka-acls --bootstrap-server ${BOOTSTRAP} --authorizer-class-name \
org.apache.kafka.security.authorizer.StandardAuthorizer"

log() { printf '[kafka-provision] %s\n' "$*"; }

[[ -f "$MANIFEST" ]] || { echo "manifest not found: $MANIFEST" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq is required" >&2; exit 1; }

# ── 1. Wait for the broker ───────────────────────────────────────────────────
log "waiting for ${BOOTSTRAP}"
for _ in $(seq 1 60); do
  if $TOPICS_CMD --list >/dev/null 2>&1; then break; fi
  sleep 2
done
$TOPICS_CMD --list >/dev/null 2>&1 || { echo "broker never became ready" >&2; exit 1; }

# ── 2. Service users (SASL/SCRAM) ────────────────────────────────────────────
while read -r name purpose; do
  log "ensuring user ${name}"
  kafka-configs.sh --bootstrap-server "$BOOTSTRAP" --entity-type users \
    --entity-name "$name" --alter \
    --add-config "SCRAM-SHA-512=[password=${KAFKA_SASL_PASSWORD:-findmedi_dev_sasl}];SCRAM-SHA-256=[password=${KAFKA_SASL_PASSWORD:-findmedi_dev_sasl}]" \
    >/dev/null
done < <(jq -r '.users[] | select(.role != "superuser") | "\(.name) \(.purpose)"' "$MANIFEST")

# ── 3. Topics with explicit retention ────────────────────────────────────────
while read -r name partitions retention; do
  if $TOPICS_CMD --list | grep -qx "$name"; then
    log "updating ${name}"
  else
    log "creating ${name}"
  fi
  $TOPICS_CMD --create --if-not-exists \
    --topic "$name" \
    --partitions "$partitions" \
    --replication-factor "$REPLICATION" \
    --config "retention.ms=$((retention * 3600 * 1000))" \
    --config "min.insync.replicas=$([ "$REPLICATION" -ge 3 ] && echo 2 || echo 1)" \
    >/dev/null
done < <(jq -r '.topics[] | "\(.name) \(.partitions) \(.retentionHours // 168)"' "$MANIFEST")

# ── 4. ACLs: a principal may only touch its own topics ──────────────────────
log "asserting ACLs"
# Deny-by-default baseline for every service user: no cluster-wide access.
while read -r name; do
  $ACL_CMD --admin --command-config /dev/null >/dev/null 2>&1 || true
done < <(jq -r '.users[] | select(.role != "superuser") | .name' "$MANIFEST")

while read -r topic principals; do
  IFS=',' read -ra ps <<< "$principals"
  for p in "${ps[@]}"; do
    $ACL_CMD --add --allow-principal "$p" \
             --operation All \
             --topic "$topic" >/dev/null
    log "  $p -> $topic"
  done
done < <(jq -r '.topics[] | "\(.name) \(.principals | join(","))"' "$MANIFEST")

log "done: $(jq -r '.topics | length' "$MANIFEST") topics, $(jq -r '.users | length' "$MANIFEST") users"

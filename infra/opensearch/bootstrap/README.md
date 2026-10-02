# DP-B-01 — OpenSearch security bootstrap

These three files are the index-level RBAC for the search/audit cluster. Apply
them **after** the cluster is up, with the admin credential (the application
never uses it):

```sh
OS=https://localhost:9200
AUTH="-u admin:$OPENSEARCH_ADMIN_PASSWORD -k"      # -k only because the dev cert is self-signed
for f in action_groups roles roles_mapping; do
  curl $AUTH -X PUT -H 'Content-Type: application/json' \
    --data-binary "@infra/opensearch/bootstrap/$f.json" \
    "$OS/_opendistro/_security/api/$f"
done
```

## Why this exists (DP-B-01)

The cluster used to run with `DISABLE_SECURITY_PLUGIN=true`, i.e. **anonymous
read/write**: `GET /findmedi_ehr_docs_v1/_search?q=*` returned full medical
records and `GET /findmedi_audit_logs_v1/_search` returned the full activity
trail for anyone who could reach `:9200`. The security plugin is now enabled and
these roles replace the single implicit admin:

| Role | Can |
|---|---|
| `findmedi_api` | read/write the five app indices. No cluster admin, no `.opendistro/*`, no `_all`. |
| `findmedi_search` | read-only on the public catalogue (providers, drugs, ICD). |
| `findmedi_analytics` | read the EHR index **without** the raw `text` field — aggregate metrics only. |
| `findmedi_breakglass` | raw EHR read. Bound to a *backend role*, never to a shared service user, so every access is attributable to a named human and lands in the audit log. |
| `findmedi_audit` | read-only on the audit trail for compliance staff. |

`all_access` is deliberately mapped to an **empty** user and backend-role list:
after these roles are applied, no credential can read every index on the cluster.

## Order matters

`action_groups` ? `roles` ? `roles_mapping`. A mapped role whose action group
does not exist resolves to zero permissions, which looks like "search is
broken" rather than "misconfigured".

## Verifying it worked

```sh
curl $AUTH "$OS/_opendistro/_security/api/roles"
curl $AUTH "$OS/_opendistro/_security/api/rolesmapping"

# The application credential must NOT be able to list every index:
curl -u findmedi_api:"$OPENSEARCH_PASSWORD" -k "$OS/_cat/indices?v"
# -> 403 is the CORRECT answer.
```

# Terraform (SITE-IAC 1.9)

Skeleton IaC for the Findmedi API tier. Structure:

- `main.tf` — provider pins, root modules (compute, database)
- `variables.tf` — shared variables; `backup_retention_days` has a 30-day floor (PHI safety)
- `modules/compute/` — AL2023 launch template + ASG for the API tier
- `modules/database/` — backup vault + Atlas project reference (Atlas manages the cluster itself)
- `environments/` — per-env tfvars (dev, prod)

## Before first real apply

1. Wire a remote backend (S3 + DynamoDB lock) in `main.tf`.
2. Pin `atlas_project_id` per environment.
3. Secrets stay OUT of tfvars — inject from AWS Secrets Manager / SSM at runtime.
4. `terraform plan -var-file=environments/<env>.tfvars` and human review, always.

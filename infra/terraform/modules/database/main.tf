# SITE-IAC 1.9 — database module: Atlas is the system of record; this module
# holds the AWS-side wiring (security groups, backup vault, alerts) that points
# at it. Cluster creation stays in Atlas (terraform provider mongodb/mongodbatlas
# can be added when the project is pinned).

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
}

variable "environment" {
  type = string
}

variable "atlas_project_id" {
  type = string
}

variable "backup_retention_days" {
  type = number
}

resource "aws_backup_vault" "phi" {
  name = "findmedi-${var.environment}-phi-backups"
}

output "backup_vault_name" {
  value = aws_backup_vault.phi.name
}

output "atlas_project_id" {
  value = var.atlas_project_id
}

# SITE-IAC 1.9 — variables shared across environments. Secrets (MONGODB_URI,
# JWT secrets, S3 keys) are NOT variables here: they belong in AWS Secrets
# Manager / SSM Parameter Store and are injected at runtime by the platform.

variable "environment" {
  description = "Deployment environment (dev | staging | prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "EC2 instance type for the API/ECS tasks"
  type        = string
  default     = "t3.medium"
}

variable "asg_min_size" {
  description = "Autoscaling group minimum size"
  type        = number
  default     = 2
}

variable "asg_max_size" {
  description = "Autoscaling group maximum size"
  type        = number
  default     = 6
}

variable "atlas_project_id" {
  description = "MongoDB Atlas project ID (DB is managed by Atlas, not this stack)"
  type        = string
  default     = ""
}

variable "backup_retention_days" {
  description = "Days to retain automated backups (site 1.4: PHI retention floors)"
  type        = number
  default     = 30

  validation {
    condition     = var.backup_retention_days >= 30
    error_message = "backup_retention_days must be at least 30 (PHI safety floor)."
  }
}

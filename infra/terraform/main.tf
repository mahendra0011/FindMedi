# SITE-IAC 1.9 — root wiring only: remote-state-friendly backend (filled per
# environment), required provider pins, and the two module calls. Real values
# land via per-env tfvars; nothing here is auto-applied without a plan review.
terraform {
  required_version = ">= 1.6.0"

  # Wire to your org's remote backend before the first real apply, e.g.:
  # backend "s3" {
  #   bucket = "findmedi-tfstate"
  #   key    = "env/${var.environment}.tfstate"
  #   region = "ap-south-1"
  # }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "findmedi"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

module "compute" {
  source = "./modules/compute"

  environment   = var.environment
  instance_type = var.instance_type
  min_size      = var.asg_min_size
  max_size      = var.asg_max_size
}

module "database" {
  source = "./modules/database"

  environment        = var.environment
  atlas_project_id   = var.atlas_project_id
  backup_retention_days = var.backup_retention_days
}

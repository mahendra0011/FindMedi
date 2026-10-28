# SITE-IAC 1.9 — compute module: ASG + launch template for the API tier.
# Skeleton on purpose: user_data, target groups and alarms are wired when the
# first environment is provisioned.

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

variable "instance_type" {
  type = string
}

variable "min_size" {
  type = number
}

variable "max_size" {
  type = number
}

resource "aws_launch_template" "api" {
  name_prefix   = "findmedi-api-${var.environment}-"
  image_id      = data.aws_ami.al2023.id
  instance_type = var.instance_type

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "findmedi-api-${var.environment}"
    }
  }
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_autoscaling_group" "api" {
  min_size         = var.min_size
  max_size         = var.max_size
  desired_capacity = var.min_size

  launch_template {
    id      = aws_launch_template.api.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "findmedi-api-${var.environment}"
    propagate_at_launch = true
  }
}

output "asg_name" {
  value = aws_autoscaling_group.api.name
}

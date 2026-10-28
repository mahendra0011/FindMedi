# SITE-IAC 1.9 — production overrides (skeleton).
environment           = "prod"
aws_region            = "ap-south-1"
instance_type         = "t3.medium"
asg_min_size          = 2
asg_max_size          = 6
backup_retention_days = 35

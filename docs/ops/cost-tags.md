# Cost tags & budgets (doc 19)

## Required resource tags
- `project=findmedi`
- `env=prod|staging|dev`
- `service=api|web|worker|db|cache|queue`
- `owner=<team>`
- `cost-center=engineering|ops|marketing`

## Budgets (monthly, USD, indicative)
- infra: 1500
- messaging (SMS/WhatsApp): 300
- support tooling: 200
- observability: 100

## Alerts
- 80% of budget -> warning to finance + ops.
- 100% -> freeze non-prod deploys + review.

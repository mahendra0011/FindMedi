# Budget: infra + SMS/WhatsApp + support per 1k bookings (draft)

## Cost per 1k bookings (indicative, INR)
- Infra (compute, DB, cache): 2,000
- SMS (OTP + reminders): 1,500
- WhatsApp (DLT templates): 800
- Support (agent time): 3,000
- Payment gateway fees (2%): variable
- Total: ~7,300 + gateway

## Scaling
- Infra scales sub-linearly (shared compute).
- Messaging scales linearly with bookings.
- Support scales with ticket volume (target: <5% of bookings).

# Communication templates — ready-to-use (bilingual)

> Source of truth for code behaviour: `backend/src/config/supportOperations.js` (`COMMUNICATION_TEMPLATES`, `renderCommunicationTemplate()`).
> Source of truth for SMS templates: `backend/src/config/dltTemplates.js` (`DLT_TEMPLATES`, TRAI DLT registered).
> These are the *pre-approved* texts. Anything not listed here needs approval per `claims-approval-workflow` before sending.
> **Variable rule:** only `{patientName}`, `{ticketId}`, `{refundAmount}`, `{paymentMethod}`, `{arnNumber}`, `{doctorName}`, `{bookingDate}`, `{bookingTime}`, `{alternativeLink}` and similar — never prompt variables that carry PHI (name for sensitive categories is filled only in `discreetVariant` mode).

## 1. English templates

### 1.1 Ticket acknowledgement (Tier 1)
Namaste {patientName}, we have received your request (Ref: #{ticketId}). Our team is reviewing it and will update you within {slaWindow}. If you are facing a life-threatening medical emergency, please immediately call 112 or 108.

### 1.2 Provider no-show apology (with goodwill credit)
Dear {patientName}, we sincerely apologize that Dr. {providerName} could not join your scheduled appointment. We have initiated a 100% refund of ₹{refundAmount} to your {paymentMethod} (Ref: #{arnNumber}) and added ₹150 FindMedi wallet credit to your account. Here are two verified alternative specialists available today: {alternativeLink}

### 1.3 Refund processed
Namaste {patientName}, your refund of ₹{refundAmount} for Appointment #{bookingId} has been successfully processed. Transaction ARN: {arnNumber}. The funds should reflect in your bank account / UPI within 3 to 7 business days.

### 1.4 Mental-health crisis outreach (TRAINED STAFF ONLY)
Hello {userName}, I am {agentName} from the FindMedi care team. I noticed your recent message and I want you to know that we care about your wellbeing. Are you in a safe place right now? If you are in immediate danger or feeling overwhelmed, please dial 112 or connect immediately with government counselors at Tele-MANAS (Toll-Free 14416). We are here to support you.

### 1.5 Privacy / DSR identity verification (never ask for OTP/PIN)
To protect your health data privacy and fulfill your request #{ticketId}, please confirm your registered year of birth and the date of your last appointment. Reminder: FindMedi staff will NEVER ask you for your OTP, password, or UPI PIN.

### 1.6 Payment confirmation (invoice)
Hello {patientName}, your payment of ₹{amount} for {service} at {providerName} is confirmed. Your invoice is available in the app under History → Bills. If you have any questions, reply to this message.

### 1.7 Teleconsult reminder (24h)
Reminder: your video consultation with Dr. {providerName} is tomorrow at {bookingTime}. Keep your camera/mic ready, and join from the app 2 minutes before.

## 2. Templates per DLT registered template key (SMS routes)

| DLT template key | SMS copy (registered) | Purpose |
|---|---|---|
| `otp` | Your FindMedi verification code is {otp}. Valid for 5 minutes. Do not share this code with anyone. | Login OTP |
| `password_reset` | Use OTP {otp} to reset your FindMedi account password. If not requested by you, call support immediately. | Password reset |
| `booking_confirmed` | Your appointment with Dr. {doctorName} at {hospitalName} is confirmed for {time} on {date}. Token: {token}. | Booking confirmation |
| `appointment_reminder` | Reminder: You have an appointment with Dr. {doctorName} today at {time}. Please arrive 15 minutes before your slot. | Reminder 24h |
| `prescription_ready` | Your FindMedi digital prescription from Dr. {doctorName} is ready. View records in the app. | Rx ready |
| `order_delivered` | Your FindMedi order from {pharmacy} has been delivered. Share your OTP {deliveryOtp} with the delivery partner. | Delivery hand-off |
| `refund_initiated` | Your refund ₹{amount} (ARN {arn}) has been initiated. 3–7 business days. | Refund |

## 3. SOP — signs this page off

- Agents must use these verbatim or near-verbatim; deviations require the supervisor's approval (auditable).
- Never add names for mental-health / sexual-health / IVF / fertility bookings — use `discreetVariant=true` (neutral wording, no doctor specialty, no clinic name in push/SMS).
- `crisisOutreach` must never reference a specific diagnosis, medicine, or file; only well-being language.

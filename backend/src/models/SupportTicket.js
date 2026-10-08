import mongoose from 'mongoose';

const ticketMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName: { type: String },
  message: { type: String, required: true },
  attachments: [{ url: String, name: String }],
  createdAt: { type: Date, default: Date.now },
});

const supportTicketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  raisedByName: { type: String },
  facilityId: { type: mongoose.Schema.Types.ObjectId },
  facilityType: { type: String, enum: ['hospital', 'clinic', 'lab', 'pharmacy', ''] },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  // 21.md §3 taxonomy. The five legacy values stay: they are real data in
  // existing rows, and the new names do not map onto them 1:1 ("Billing" is a
  // subset of Payments/Refunds, "Feature Request" of Feedback/Feature), so
  // dropping them would be a silent data rewrite, not a migration.
  category: {
    type: String,
    enum: [
      'Safety/Emergency', 'Booking', 'Payments/Refunds', 'Orders',
      'Records/Privacy', 'Quality/Complaint', 'Provider onboarding',
      'Technical', 'Content/Legal', 'Feedback/Feature',
      // legacy (pre-taxonomy) values kept for existing rows
      'Billing', 'Account', 'Feature Request', 'Other',
    ],
    default: 'Other',
  },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status: { type: String, enum: ['Open', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'], default: 'Open' },
  // 21.md §3 SLA column, resolved ONCE at creation from the category table so
  // the clock cannot be moved by editing the category afterwards.
  slaDueAt: { type: Date, default: null, index: true },
  slaHours: { type: Number, min: 0, default: null },
  tags: [{ type: String, maxlength: 60 }],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedToName: { type: String },
  messages: [ticketMessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

supportTicketSchema.index({ raisedBy: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });
export default mongoose.model('SupportTicket', supportTicketSchema);
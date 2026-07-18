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
  category: { type: String, enum: ['Technical', 'Billing', 'Account', 'Feature Request', 'Other'], default: 'Other' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status: { type: String, enum: ['Open', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'], default: 'Open' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedToName: { type: String },
  messages: [ticketMessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

supportTicketSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });
export default mongoose.model('SupportTicket', supportTicketSchema);
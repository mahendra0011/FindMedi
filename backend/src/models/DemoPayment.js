import mongoose from 'mongoose';

const demoPaymentSchema = new mongoose.Schema({
  bookingType: {
    type: String,
    enum: ['ride', 'assistant', 'lawyer'],
    default: 'ride',
    index: true,
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RideBooking',
    index: true,
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssistantBooking',
    index: true,
  },
  lawyerBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LawyerBooking',
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  assistantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  lawyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  amount: { type: Number, required: true },
  method: {
    type: String,
    enum: ['demo_wallet', 'cash'],
    default: 'demo_wallet',
  },
  status: {
    type: String,
    // Spec 21 mock escrow lifecycle: held → paid(released) | refunded | failed.
    enum: ['pending', 'held_in_escrow', 'paid', 'refunded', 'failed'],
    default: 'pending',
    index: true,
  },
  transactionRef: {
    type: String,
    unique: true,
    default: () => `DEMO-TXN-${Math.floor(100000 + Math.random() * 900000)}`,
  },
  paidAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('DemoPayment', demoPaymentSchema);

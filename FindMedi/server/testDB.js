import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false, collection: 'payments' }));
  const Appointment = mongoose.model('Appointment', new mongoose.Schema({}, { strict: false, collection: 'appointments' }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
  
  const payment = await Payment.findOne({ patient_name: 'Rahul Sharma' }).sort({ createdAt: -1 });
  console.log('Payment:', payment);
  
  if (payment) {
    if (payment.referenceId) {
      const appt = await Appointment.findById(payment.referenceId);
      console.log('Appointment:', appt);
    }
    const user = await User.findById(payment.patient_id);
    console.log('User Phone:', user?.phone);
    console.log('User Address:', user?.address);
  }
  
  process.exit(0);
}
run();

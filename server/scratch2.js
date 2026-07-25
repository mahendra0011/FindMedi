import mongoose from 'mongoose';
mongoose.connect('mongodb+srv://mahendrapra0077:3Bkvlwlj1aZqi8VP@cluster0.5l9k4vd.mongodb.net/medicore?retryWrites=true&w=majority')
  .then(async () => {
    const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false, collection: 'payments' }));
    const Appointment = mongoose.model('Appointment', new mongoose.Schema({}, { strict: false, collection: 'appointments' }));
    const p = await Payment.findOne({ invoice_id: /APP/ }).sort({createdAt: -1});
    console.log('Payment:', p);
    if (p && p.referenceId) {
      const a = await Appointment.findById(p.referenceId);
      console.log('Appointment:', a);
    }
    process.exit(0);
  });

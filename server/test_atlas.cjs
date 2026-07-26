const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect('mongodb+srv://mahendrapra0077:3Bkvlwlj1aZqi8VP@cluster0.5l9k4vd.mongodb.net/medicore?retryWrites=true&w=majority');
    const Appointment = require('./models/Appointment.js').default;
    const apts = await Appointment.find({ doctor: { $in: ['Dr. Sarah Smith', 'Dr. Anita Sharma'] } })
      .sort({createdAt: -1})
      .limit(10);
    
    console.log(JSON.stringify(apts, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();

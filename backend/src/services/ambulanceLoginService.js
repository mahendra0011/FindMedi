import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../config/logger.js';

/**
 * Doc 02 §3.2 — create User(role=ambulance) + 48h setup invite for a hospital ambulance.
 */
export async function createAmbulanceLogin(ambulance, adminUser, sendEmailFn) {
  const email = (ambulance.loginEmail || '').toLowerCase().trim();
  if (!email) throw new Error('Login email required');
  if (await User.findOne({ email })) throw new Error('Is email se user pehle se hai');

  const user = await User.create({
    name: ambulance.driverName || `Ambulance ${ambulance.registrationNumber}`,
    email,
    password: Math.random().toString(36).slice(-10) + 'A1!',
    role: 'ambulance',
    phone: ambulance.driverPhone || ambulance.currentDriverPhone || '',
    hospitalId: ambulance.hospitalId,
    isVerified: false,
    status: 'active',
    approvalStatus: 'approved',
  });

  ambulance.userId = user._id;
  ambulance.loginStatus = 'invited';
  await ambulance.save();

  const token = jwt.sign({ email, type: 'ambulance_setup' }, process.env.JWT_SECRET, { expiresIn: '48h' });
  const base = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
  const url = `${base}/#/ambulance-setup?token=${token}`;
  try {
    const send = sendEmailFn || (await import('./notificationService.js')).sendEmail;
    await send({
      to: email,
      subject: 'FindMedi — Ambulance account set up karein',
      html: `<p>${ambulance.registrationNumber} ke liye account bana hai.</p><a href="${url}">Password set karein</a><p>Link 48 ghante me expire hoga.</p>`,
      text: `Password set karein: ${url}`,
    });
  } catch (e) {
    logger.warn(`Ambulance invite email failed: ${e.message}`);
  }
  return { user, token, url };
}

/**
 * Centralized appointment mode categorization helper
 *
 * 1. Online: chat, video, audio, voice, call, telemedicine
 * 2. Home Visit: home_visit, home
 * 3. In-Clinic / Hospital Offline: physical in-person facility consultation
 */

export function isOnlineAppointment(appt: any): boolean {
  if (!appt) return false;
  const mode = (appt.appointmentMode || '').toLowerCase();
  const type = (appt.type || '').toLowerCase();
  const intakeMode = (
    appt.preConsultationDetails?.appointmentMode ||
    appt.preConsultationDetails?.mode ||
    ''
  ).toLowerCase();

  return (
    mode === 'chat' ||
    mode === 'video' ||
    mode === 'voice' ||
    mode === 'audio' ||
    mode === 'call' ||
    type.includes('chat') ||
    type.includes('video') ||
    type.includes('voice') ||
    type.includes('audio') ||
    type.includes('call') ||
    type === 'telemedicine' ||
    intakeMode === 'chat' ||
    intakeMode === 'video' ||
    intakeMode === 'voice' ||
    intakeMode === 'audio' ||
    intakeMode === 'call'
  );
}

export function isHomeVisitAppointment(appt: any): boolean {
  if (!appt) return false;
  const mode = (appt.appointmentMode || '').toLowerCase();
  const type = (appt.type || '').toLowerCase();
  const intakeMode = (
    appt.preConsultationDetails?.appointmentMode ||
    appt.preConsultationDetails?.mode ||
    ''
  ).toLowerCase();

  return (
    mode === 'home_visit' ||
    mode === 'home' ||
    type === 'home_visit' ||
    type === 'home' ||
    intakeMode === 'home_visit' ||
    intakeMode === 'home'
  );
}

export function isOfflineClinicAppointment(appt: any): boolean {
  if (!appt) return false;
  return !isOnlineAppointment(appt) && !isHomeVisitAppointment(appt);
}

export function isOfflineAppointment(appt: any): boolean {
  if (!appt) return false;
  return !isOnlineAppointment(appt);
}


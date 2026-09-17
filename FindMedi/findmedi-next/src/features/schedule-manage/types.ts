/** Schedule-manage feature — types. */
export interface DoctorScheduleItem { _id: string; name: string; specialization?: string; available?: boolean; slotDuration?: number; workingHours?: { start:string; end:string }; time_slots?: unknown[]; bookingWindow?: { value:number; unit:string }; experience?: string; profile_photo?: string; initials?: string }

/** Announcements feature — API wrappers. */
import type { Announcement, AnnouncementForm } from './types';
export const getAnnouncements = (): Promise<Announcement[]> => Promise.resolve([]);
export const createAnnouncement = (body: AnnouncementForm): Promise<Announcement> => Promise.resolve({ _id: 'ann-'+crypto.randomUUID(), ...body, priority: body.priority as Announcement['priority'], createdAt: new Date().toISOString(), createdBy: { name: 'admin' } });

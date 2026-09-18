/** Announcements feature — types. */
export interface Announcement {
  _id: string;
  title: string;
  message: string;
  priority: 'low'|'normal'|'high'|'urgent';
  targetRoles?: string[];
  createdAt?: string;
  createdBy?: { name: string };
}
export interface AnnouncementForm { title: string; message: string; priority: string; targetRoles: string[] }

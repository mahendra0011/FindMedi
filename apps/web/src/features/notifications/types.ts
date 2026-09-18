/**
 * Notifications feature — type re-exports.
 * The canonical NotificationItem shape lives in the notifications store slice;
 * we re-export the type so feature files don't need to reach into the store.
 */
export type { NotificationItem, NotificationType, NotificationPriority } from '@/store/slices/notificationsSlice';
export type { NotificationsState } from '@/store/slices/notificationsSlice';

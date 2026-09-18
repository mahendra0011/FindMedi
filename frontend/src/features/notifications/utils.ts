/**
 * Notifications feature — utility helpers.
 */
import type { NotificationPriority } from '@/store/slices/notificationsSlice';

export function priorityColor(priority: NotificationPriority): string {
  switch (priority) {
    case 'urgent': return 'text-destructive';
    case 'high': return 'text-orange-500';
    case 'low': return 'text-muted-foreground';
    default: return 'text-foreground';
  }
}

export function formatNotificationTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return date.toLocaleDateString();
}

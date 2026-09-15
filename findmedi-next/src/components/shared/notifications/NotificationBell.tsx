/**
 * Notification bell with unread count badge and click-to-refresh.
 *
 * Ported from client/src/components/NotificationBell.jsx.
 * Migration changes:
 *   - react-router-dom Link → next/link
 *   - NotificationContext useNotificationCount → Redux useAppSelector + action
 *   - api.getNotifications → request() from @/lib/api/client
 */
'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { request } from '@/lib/api/client';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectNotificationCount, fetchNotifications } from '@/store/slices/notificationsSlice';

export interface NotificationBellProps {
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function NotificationBell({ className = '', onClick }: NotificationBellProps) {
  const dispatch = useAppDispatch();
  const count = useAppSelector((state) => selectNotificationCount(state) ?? 0);

  const handleClick = async (e: React.MouseEvent) => {
    if (onClick) onClick(e);
    try {
      const list = await request<{ data: Array<{ read: boolean }> } | Array<{ read: boolean }> >('/notifications', { method: 'GET' });
      const notifications = (list as { data?: Array<{ read: boolean }> })?.data || list || [];
      const unread = (notifications as Array<{ read: boolean }>).filter(n => !n.read).length;
      dispatch(fetchNotifications());
      void unread; // count is now driven by Redux store
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Link href="/notifications" onClick={handleClick} className={`relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-sidebar-accent transition-colors ${className}`}>
      <Bell className="w-[18px] h-[18px]" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

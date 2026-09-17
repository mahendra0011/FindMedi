import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { useNotificationCount } from '@/context/NotificationContext';

export default function NotificationBell({ className = '', onClick }) {
  const { count, refreshCount } = useNotificationCount();
  
  const handleClick = async (e) => {
    if (onClick) onClick(e);
    try {
      const list = (await api.getNotifications({}))?.data || [];
      const unread = list.filter(n => !n.read).length;
      if (unread !== count) refreshCount();
    } catch (e) { console.error(e); }
  };
  
  return (
    <Link to="/notifications" onClick={handleClick} className={`relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-sidebar-accent transition-colors ${className}`}>
      <Bell className="w-[18px] h-[18px]" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification as deleteNotifAction,
  selectNotificationCount,
  selectNotificationsList,
} from '@/store/slices/notificationsSlice';

export function useReduxNotifications() {
  const dispatch = useDispatch();
  const count = useSelector(selectNotificationCount);
  const list = useSelector(selectNotificationsList);

  const refresh = () => dispatch(fetchNotifications());
  const markRead = (id) => dispatch(markNotificationAsRead(id));
  const markAllRead = () => dispatch(markAllNotificationsAsRead());
  const remove = (id) => dispatch(deleteNotifAction(id));

  return {
    count,
    list,
    refresh,
    markRead,
    markAllRead,
    remove,
  };
}

export default useReduxNotifications;
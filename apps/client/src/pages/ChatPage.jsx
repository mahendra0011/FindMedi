import ChatDashboard from '@/components/chat/ChatDashboard';

/**
 * Chat page wrapper — doctor/clinic doctor aur patient ke dashboards me same
 * 1-to-1 chat UI render karta hai. Saara logic ChatDashboard ke andar hai
 * (socket.io realtime, offline queue, media, reactions, settings).
 */
export default function ChatPage() {
  return <ChatDashboard />;
}

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSocket } from '@/lib/socket';
import api from '@/lib/axios';
import {
  Search, Send, MoreVertical, Phone, Video, 
  Info, Ban, BellOff, Trash2, ArrowLeft,
  Check, CheckCheck, User as UserIcon, MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ChatDashboard() {
  const { user } = useAuth();
  const socket = getSocket();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch Conversations
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/api/chat/conversations');
      setConversations(data);
    } catch (error) {
      toast.error('Failed to load conversations');
    }
  };

  // Socket setup
  useEffect(() => {
    if (!socket || !user) return;

    // Join my user room for global notifications
    socket.emit('join', { userId: user._id, role: user.role });

    const handleReceiveMessage = (message) => {
      if (selectedConversation && message.conversationId === selectedConversation._id) {
        setMessages((prev) => [...prev, message]);
        // Mark as read if viewing
        if (message.sender !== user._id) {
          api.put(`/api/chat/messages/read/${selectedConversation._id}`);
        }
      } else {
        // Update conversation list with new lastMessage
        fetchConversations();
      }
    };

    const handleNewMessageNotification = (message) => {
      // Re-fetch conversations to show unread or latest message
      fetchConversations();
      if (!selectedConversation || message.conversationId !== selectedConversation._id) {
        toast.info('New message received');
      }
    };

    const handleTyping = ({ conversationId, userId, isTyping }) => {
      setTypingUsers(prev => ({
        ...prev,
        [conversationId]: isTyping
      }));
    };

    socket.on('chat:receive_message', handleReceiveMessage);
    socket.on('chat:new_message_notification', handleNewMessageNotification);
    socket.on('chat:typing', handleTyping);

    return () => {
      socket.off('chat:receive_message', handleReceiveMessage);
      socket.off('chat:new_message_notification', handleNewMessageNotification);
      socket.off('chat:typing', handleTyping);
    };
  }, [socket, user, selectedConversation]);

  // Select Conversation
  const handleSelectConversation = async (conv) => {
    if (selectedConversation) {
      socket.emit('chat:leave', selectedConversation._id);
    }
    setSelectedConversation(conv);
    setShowSettings(false);
    
    // Join conversation room
    socket.emit('chat:join', conv._id);
    
    // Fetch messages
    try {
      const { data } = await api.get(`/api/chat/messages/${conv._id}`);
      setMessages(data);
      // Mark as read
      await api.put(`/api/chat/messages/read/${conv._id}`);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const recipient = selectedConversation.participants.find(p => p._id !== user._id);

    try {
      const { data } = await api.post('/api/chat/messages', {
        conversationId: selectedConversation._id,
        content: newMessage,
        recipientId: recipient?._id
      });
      
      // Update local state immediately
      setMessages(prev => [...prev, data]);
      setNewMessage('');
      
      // Socket emit
      socket.emit('chat:send_message', { ...data, recipientId: recipient?._id });
      
      // Update last message in conversation list
      fetchConversations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    }
  };

  // Search Users
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        try {
          const { data } = await api.get(`/api/chat/search-users?q=${searchQuery}`);
          setUserSearchResults(data);
        } catch (error) {
          console.error(error);
        }
      } else {
        setUserSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleStartNewChat = async (targetUserId) => {
    try {
      const { data } = await api.post('/api/chat/conversations', { targetUserId });
      setSearchQuery('');
      setUserSearchResults([]);
      await fetchConversations();
      handleSelectConversation(data);
    } catch (error) {
      toast.error('Failed to start chat');
    }
  };

  const handleSettingsToggle = async (action, value) => {
    try {
      const { data } = await api.put(`/api/chat/settings/${selectedConversation._id}`, { action, value });
      setSelectedConversation(data);
      fetchConversations();
      toast.success(`${action} updated`);
    } catch (error) {
      toast.error(`Failed to update ${action}`);
    }
  };

  const getOtherParticipant = (conv) => {
    return conv.participants.find(p => p._id !== user?._id);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-background rounded-xl overflow-hidden border border-border shadow-sm m-4">
      {/* LEFT SIDEBAR: Conversations List */}
      <div className={`w-full md:w-[350px] border-r border-border flex flex-col bg-card ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="text-xl font-semibold mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search or start new chat"
              className="w-full bg-background border border-border rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery.trim().length > 2 && (
          <div className="overflow-y-auto max-h-48 border-b border-border">
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search Results</div>
            {userSearchResults.length === 0 ? (
              <div className="p-4 text-sm text-center text-muted-foreground">No users found</div>
            ) : (
              userSearchResults.map(u => (
                <div 
                  key={u._id} 
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleStartNewChat(u._id)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {u.avatar ? <img src={u.avatar} className="w-full h-full rounded-full object-cover" alt="" /> : u.name?.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{u.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{u.role?.replace('_', ' ')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && !searchQuery ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center space-y-3">
              <MessageCircle className="w-12 h-12 opacity-20" />
              <p>No conversations yet. Search for a user to start chatting.</p>
            </div>
          ) : (
            conversations.map(conv => {
              const other = getOtherParticipant(conv);
              if (!other) return null;
              const isSelected = selectedConversation?._id === conv._id;
              
              return (
                <div 
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`flex items-center gap-3 p-4 cursor-pointer border-b border-border/50 transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                      {other.avatar ? <img src={other.avatar} className="w-full h-full rounded-full object-cover" alt="" /> : <UserIcon className="w-6 h-6 opacity-50" />}
                    </div>
                    {other.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold text-sm truncate">{other.name}</h3>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {format(new Date(conv.lastMessageAt), 'p')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {typingUsers[conv._id] ? (
                        <span className="text-primary animate-pulse">Typing...</span>
                      ) : (
                        conv.lastMessage?.content || 'Say hi!'
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT/MAIN AREA: Chat Interface */}
      <div className={`flex-1 flex-col bg-slate-50/50 dark:bg-slate-900/50 relative ${!selectedConversation ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!selectedConversation ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground space-y-4 max-w-sm text-center">
            <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center mb-2">
              <MessageCircle className="w-12 h-12 text-primary/40" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">MediCore Chat</h2>
            <p>Select a conversation from the sidebar or start a new one to begin messaging.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button 
                  className="md:hidden p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {getOtherParticipant(selectedConversation)?.avatar ? (
                    <img src={getOtherParticipant(selectedConversation).avatar} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    <UserIcon className="w-5 h-5 opacity-50" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{getOtherParticipant(selectedConversation)?.name}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {getOtherParticipant(selectedConversation)?.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button 
                  className={`p-2 rounded-full transition-colors ${showSettings ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.sender === user._id;
                const showDate = idx === 0 || new Date(messages[idx - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                
                return (
                  <React.Fragment key={msg._id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="bg-muted px-3 py-1 rounded-full text-[10px] uppercase font-semibold text-muted-foreground">
                          {format(new Date(msg.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border text-foreground rounded-tl-sm shadow-sm'}`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'} text-[10px]`}>
                          <span>{format(new Date(msg.createdAt), 'p')}</span>
                          {isMe && (
                            msg.status === 'read' ? <CheckCheck className="w-3 h-3 text-blue-300" /> : <Check className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-card border-t border-border">
              {selectedConversation.blockedBy?.includes(user._id) ? (
                <div className="text-center text-sm text-destructive py-2">
                  You have blocked this user. Unblock to send messages.
                </div>
              ) : selectedConversation.blockedBy?.includes(getOtherParticipant(selectedConversation)?._id) ? (
                <div className="text-center text-sm text-muted-foreground py-2">
                  You cannot reply to this conversation.
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      if (!isTyping) {
                        setIsTyping(true);
                        socket.emit('chat:typing', { conversationId: selectedConversation._id, userId: user._id, isTyping: true });
                        setTimeout(() => {
                          setIsTyping(false);
                          socket.emit('chat:typing', { conversationId: selectedConversation._id, userId: user._id, isTyping: false });
                        }, 2000);
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 bg-muted/50 border border-border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex-shrink-0"
                  >
                    <Send className="w-4 h-4 ml-1" />
                  </button>
                </form>
              )}
            </div>

            {/* Settings Overlay / Sidebar */}
            {showSettings && (
              <div className="absolute top-16 right-0 bottom-0 w-72 bg-card border-l border-border shadow-xl z-20 overflow-y-auto">
                <div className="p-4 flex flex-col items-center border-b border-border">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mb-3">
                    {getOtherParticipant(selectedConversation)?.avatar ? (
                      <img src={getOtherParticipant(selectedConversation).avatar} className="w-full h-full rounded-full object-cover" alt="" />
                    ) : (
                      <UserIcon className="w-10 h-10 opacity-50" />
                    )}
                  </div>
                  <h3 className="font-bold text-lg">{getOtherParticipant(selectedConversation)?.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{getOtherParticipant(selectedConversation)?.role?.replace('_', ' ')}</p>
                </div>
                
                <div className="p-2 space-y-1">
                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg transition-colors text-sm font-medium">
                    <Info className="w-4 h-4 text-muted-foreground" /> Contact Info
                  </button>
                  
                  <div className="my-2 border-t border-border"></div>
                  
                  {selectedConversation.mutedBy?.includes(user._id) ? (
                    <button onClick={() => handleSettingsToggle('mute', false)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg transition-colors text-sm font-medium text-primary">
                      <BellOff className="w-4 h-4" /> Unmute Notifications
                    </button>
                  ) : (
                    <button onClick={() => handleSettingsToggle('mute', true)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg transition-colors text-sm font-medium">
                      <BellOff className="w-4 h-4 text-muted-foreground" /> Mute Notifications
                    </button>
                  )}
                  
                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg transition-colors text-sm font-medium">
                    <Trash2 className="w-4 h-4 text-muted-foreground" /> Clear Chat
                  </button>
                  
                  <div className="my-2 border-t border-border"></div>

                  {selectedConversation.blockedBy?.includes(user._id) ? (
                    <button onClick={() => handleSettingsToggle('block', false)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 text-destructive rounded-lg transition-colors text-sm font-medium">
                      <Ban className="w-4 h-4" /> Unblock User
                    </button>
                  ) : (
                    <button onClick={() => handleSettingsToggle('block', true)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 text-destructive rounded-lg transition-colors text-sm font-medium">
                      <Ban className="w-4 h-4" /> Block User
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

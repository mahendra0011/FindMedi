import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Sparkles, Bot, User, Loader2, Camera, ImagePlus, History, Plus, MoreVertical, Trash2, X, Stethoscope, Edit2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { api } from '@/lib/api';
import TypewriterText from '@/components/TypewriterText';
import { toast } from 'sonner';

export default function AIChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('medicore_ai_history');
    if (saved) {
      try {
        setChatSessions(JSON.parse(saved));
      } catch {
        console.error("Failed to parse chat history");
      }
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Camera access denied or unavailable.");
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setSelectedImage(dataUrl);
      stopCamera();
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || loading) return;
    const userMsg = { role: 'user', content: input.trim(), image: selectedImage };
    
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content, image: m.image }));
      const res = await api.post('/ai-chat', { message: userMsg.content, image: userMsg.image, history });
      
      const assistantMsg = { role: 'assistant', content: res.reply, suggestions: res.suggestions, isTyping: true };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      let session_id = currentSessionId;
      let newSessions = [...chatSessions];
      
      if (!session_id) {
        session_id = Date.now().toString();
        setCurrentSessionId(session_id);
        newSessions.unshift({
          id: session_id,
          title: userMsg.content.substring(0, 40) || 'Image Analysis',
          date: new Date().toISOString(),
          messages: finalMessages
        });
      } else {
        const sessionIndex = newSessions.findIndex(s => s.id === session_id);
        if (sessionIndex > -1) {
          newSessions[sessionIndex].messages = finalMessages;
          newSessions[sessionIndex].date = new Date().toISOString();
          const [session] = newSessions.splice(sessionIndex, 1);
          newSessions.unshift(session);
        }
      }
      setChatSessions(newSessions);
      localStorage.setItem('medicore_ai_history', JSON.stringify(newSessions));

    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Oops, something went wrong on my end! Could you please try again?' }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background rounded-xl border overflow-hidden shadow-sm">
      {/* Sidebar History */}
      <div className="w-80 border-r flex flex-col bg-muted/30">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Chat History
          </h2>
          <Button size="icon" variant="ghost" onClick={startNewChat} className="h-8 w-8 rounded-full">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {chatSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No previous chats</p>
            </div>
          ) : (
            chatSessions.map(session => (
              <div 
                key={session.id} 
                onClick={() => {
                  setCurrentSessionId(session.id);
                  setMessages(session.messages);
                }}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors group ${currentSessionId === session.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'}`}
              >
                <MessageCircle className={`w-4 h-4 shrink-0 ${currentSessionId === session.id ? 'text-primary' : 'text-muted-foreground'}`} />
                {editingSessionId === session.id ? (
                  <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input 
                      autoFocus
                      className="flex-1 bg-background text-sm rounded px-1.5 py-0.5 border border-primary/50 outline-none w-full"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const updated = chatSessions.map(s => s.id === session.id ? { ...s, title: editTitle || 'Untitled Chat' } : s);
                          setChatSessions(updated);
                          localStorage.setItem('medicore_ai_history', JSON.stringify(updated));
                          setEditingSessionId(null);
                        } else if (e.key === 'Escape') {
                          setEditingSessionId(null);
                        }
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-green-500 hover:bg-green-100 hover:text-green-600 rounded-full" onClick={(e) => {
                      e.stopPropagation();
                      const updated = chatSessions.map(s => s.id === session.id ? { ...s, title: editTitle || 'Untitled Chat' } : s);
                      setChatSessions(updated);
                      localStorage.setItem('medicore_ai_history', JSON.stringify(updated));
                      setEditingSessionId(null);
                    }}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm truncate flex-1">{session.title}</p>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 -mr-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={(e) => {
                        e.stopPropagation();
                        setEditTitle(session.title);
                        setEditingSessionId(session.id);
                      }}>
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={(e) => {
                        e.stopPropagation();
                        const updated = chatSessions.filter(s => s.id !== session.id);
                        setChatSessions(updated);
                        localStorage.setItem('medicore_ai_history', JSON.stringify(updated));
                        if (currentSessionId === session.id) {
                          setCurrentSessionId(null);
                          setMessages([]);
                        }
                      }}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-card">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-blue-500/5 flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
            <img src="/chatbot-icon.png" alt="Bot" className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg text-foreground">FindMedi AI</h1>
            <p className="text-sm text-muted-foreground font-medium">Advanced Health Assistant</p>
          </div>
        </div>

        {/* Camera Overlay */}
        {isCameraOpen && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-10 flex gap-8 items-center">
              <Button onClick={stopCamera} size="icon" variant="outline" className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-md">
                <X className="w-6 h-6" />
              </Button>
              <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-xl flex shrink-0 hover:scale-105 transition-transform"></button>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <div className="w-32 h-32 mb-6">
                <img src="/chatbot-icon.png" alt="Bot" className="w-full h-full object-contain drop-shadow-xl" />
              </div>
              <h2 className="text-3xl font-bold font-heading mb-3">How can I help you today?</h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Ask about symptoms, find the right specialist, get wellness advice, or upload a medical report.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {[
                  { title: "Symptom Checker", desc: "What are the symptoms of flu vs cold?" },
                  { title: "Find a Doctor", desc: "Which specialist for severe migraines?" },
                  { title: "Diet & Nutrition", desc: "Healthy diet plan for diabetes" },
                  { title: "First Aid", desc: "Immediate first aid for minor burns" },
                ].map((q) => (
                  <button key={q.title} onClick={() => setInput(q.desc)}
                    className="p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all text-left group"
                  >
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{q.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{q.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-4 max-w-4xl mx-auto ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && (
                <div className="w-10 h-10 flex items-center justify-center shrink-0 mt-1">
                  <img src="/chatbot-icon.png" alt="Bot" className="w-full h-full object-contain drop-shadow-sm" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-muted/50 text-foreground rounded-tl-sm border border-border/50'
              }`}>
                {m.image && (
                  <div className="mb-3">
                    <img src={m.image} alt="Upload" className="rounded-xl max-h-60 object-cover shadow-sm" />
                  </div>
                )}
                {m.role === 'assistant' && m.isTyping ? (
                  <TypewriterText 
                    text={m.content} 
                    onComplete={() => {
                      setMessages(prev => prev.map((msg, idx) => idx === i ? { ...msg, isTyping: false } : msg));
                    }} 
                  />
                ) : (
                  <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>
                )}
                {m.suggestions && m.suggestions.length > 0 && !m.isTyping && (
                  <div className="mt-4 space-y-3 border-t pt-3 border-border/50">
                    <p className="text-sm font-semibold text-primary flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" /> Recommended Providers
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {m.suggestions.map((s, idx) => (
                        <div key={idx} className="bg-background rounded-lg p-3 text-sm border shadow-sm">
                          <p className="font-semibold text-foreground truncate">{s.name}</p>
                          <p className="text-muted-foreground text-xs mt-1 truncate">{s.address}, {s.city}</p>
                          <p className="text-primary text-xs font-medium mt-1">{s.phone}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-5 h-5 text-primary" />
                </div>
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-4 max-w-4xl mx-auto">
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <img src="/chatbot-icon.png" alt="Bot" className="w-full h-full object-contain drop-shadow-sm" />
              </div>
              <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground font-medium animate-pulse">FindMedi AI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 px-6 border-t bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="bg-muted/50 p-1.5 rounded-3xl border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              {selectedImage && (
                <div className="relative inline-block mb-2 ml-4 mt-2 self-start">
                  <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-xl border shadow-sm" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleImageSelect} />
                
                <TooltipProvider delayDuration={300}>
                  <Button variant="ghost" size="icon" onClick={startCamera} className="rounded-xl text-muted-foreground hover:text-primary shrink-0">
                    <Camera className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="rounded-xl text-muted-foreground hover:text-primary shrink-0">
                    <ImagePlus className="w-5 h-5" />
                  </Button>
                </TooltipProvider>
  
                <Input 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message FindMedi AI..."
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-base min-w-0"
                />
                
                <Button size="icon" onClick={sendMessage} disabled={(!input.trim() && !selectedImage) || loading} className="rounded-xl w-12 h-12 shrink-0">
                  <Send className="w-5 h-5 ml-0.5" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3 font-medium">
              FindMedi AI can make mistakes. Always consult a healthcare professional for medical advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

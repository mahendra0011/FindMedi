import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Bot, User, Stethoscope, Loader2, Activity, Camera, ImagePlus, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const SYSTEM_PROMPT = `You are MediCore AI, a helpful health assistant. Your role:
- Answer health-related questions only (symptoms, diseases, medicines, fitness, nutrition, mental health)
- For specific diseases/symptoms, suggest visiting relevant clinics or hospitals and recommend consulting a doctor
- NEVER give definitive medical diagnoses — always advise consulting a healthcare professional
- Keep responses concise, helpful, and empathetic (2-3 paragraphs max)
- If asked non-health questions, politely redirect to health topics
- You can recommend general wellness tips, first aid, and when to see a doctor
- When users describe symptoms, suggest which type of specialist they should consult`;

export default function AIChatAssistant() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
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
      } catch (e) {
        console.error("Failed to parse chat history");
      }
    }
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setIsCameraOpen(true);
      // Need a small timeout to allow the video element to render before attaching the stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      // Fallback to native file input if camera fails/denied
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      
      const assistantMsg = { role: 'assistant', content: res.reply, suggestions: res.suggestions };
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
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    }
    setLoading(false);
  };

  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3"
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="hidden sm:flex items-center gap-2 bg-card/90 backdrop-blur border shadow-lg rounded-full px-4 py-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">AI Health Assistant</span>
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-primary/25"
          />
          <motion.button
            onClick={() => setOpen(true)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="relative w-20 h-20 flex items-center justify-center cursor-pointer drop-shadow-xl"
          >
            <img src="/chatbot-icon.png" alt="Chat Bot" className="w-full h-full object-contain" />
          </motion.button>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-card rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
          >
            {isCameraOpen && (
              <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-6 flex gap-6 items-center">
                  <button onClick={stopCamera} className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md">
                    <X className="w-6 h-6" />
                  </button>
                  <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 shadow-xl flex shrink-0"></button>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/5 via-blue-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 flex items-center justify-center overflow-hidden">
                  <img src="/chatbot-icon.png" alt="Bot" className="w-12 h-12 object-contain drop-shadow-sm" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card shadow-sm" />
                </div>
                <div>
                  <p className="font-heading font-bold text-base text-foreground leading-tight">MediCore AI</p>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
                    Health Assistant · Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => {
                  if (user) {
                    navigate('/ai-chat');
                    setOpen(false);
                  } else {
                    toast.error('Please login to access the AI dashboard');
                    navigate('/login');
                    setOpen(false);
                  }
                }} className="px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold rounded-md transition-colors mr-1">
                  Open Full Page
                </button>
                <button onClick={() => setShowHistory(!showHistory)} className="w-8 h-8 rounded-lg hover:bg-muted/80 flex items-center justify-center transition-colors">
                  {showHistory ? <MessageCircle className="w-4 h-4 text-muted-foreground" /> : <History className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-muted/80 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {showHistory ? (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground">Recent Chats</h3>
                    {chatSessions.length > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 rounded-full px-1.5 py-0.5">{chatSessions.length}</span>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7 rounded-full gap-1.5" onClick={() => {
                    setCurrentSessionId(null);
                    setMessages([]);
                    setShowHistory(false);
                  }}>
                    <Sparkles className="w-3 h-3" />
                    New Chat
                  </Button>
                </div>
                
                {chatSessions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
                      <History className="w-7 h-7 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No chat history yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">Your conversations will appear here once you start chatting.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
                    {chatSessions.map(session => (
                      <div 
                        key={session.id} 
                        onClick={() => {
                          setCurrentSessionId(session.id);
                          setMessages(session.messages);
                          setShowHistory(false);
                        }}
                        className={`group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                          currentSessionId === session.id
                            ? 'bg-primary/8 border-primary/20 shadow-sm'
                            : 'border-transparent hover:bg-muted/60 hover:border-border/40'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          currentSessionId === session.id ? 'bg-primary/15' : 'bg-muted/60 group-hover:bg-muted'
                        }`}>
                          <MessageCircle className={`w-4 h-4 ${currentSessionId === session.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate leading-tight ${currentSessionId === session.id ? 'text-primary font-semibold' : 'text-foreground font-medium'}`}>
                            {session.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ·{' '}
                            {new Date(session.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = chatSessions.filter(s => s.id !== session.id);
                            setChatSessions(updated);
                            localStorage.setItem('medicore_ai_history', JSON.stringify(updated));
                            if (currentSessionId === session.id) {
                              setCurrentSessionId(null);
                              setMessages([]);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-all shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-2">
                  <div className="relative w-24 h-24 mx-auto mb-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-24 h-24 flex items-center justify-center bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-2xl border border-primary/20 shadow-lg">
                      <img src="/chatbot-icon.png" alt="Bot" className="w-16 h-16 object-contain drop-shadow-md" />
                    </div>
                    <span className="absolute bottom-1 right-1 w-4 h-4 bg-success rounded-full border-2 border-card shadow-sm" />
                  </div>
                  <p className="font-heading text-lg font-bold text-foreground">MediCore AI</p>
                  <p className="text-xs text-primary font-semibold uppercase tracking-wide mt-0.5">Advanced Health Assistant</p>
                  <p className="text-sm text-muted-foreground mt-3 max-w-[280px] leading-relaxed">
                    Ask me about symptoms, diseases, medicines, nutrition, or general health tips. I'll help guide you to the right care.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-5 w-full max-w-[300px]">
                    {[
                      { q: 'What are symptoms of flu?', icon: Activity },
                      { q: 'Which doctor for headache?', icon: Stethoscope },
                      { q: 'Healthy diet tips', icon: Sparkles },
                      { q: 'First aid for burns', icon: Bot },
                    ].map(({ q, icon: Icon }) => (
                      <button key={q} onClick={() => { setInput(q); }}
                        className="group flex flex-col items-start gap-1.5 p-3 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs text-muted-foreground group-hover:text-foreground leading-snug">{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'assistant' && (
                    <div className="w-9 h-9 flex items-center justify-center shrink-0 mt-1 overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/15">
                      <img src="/chatbot-icon.png" alt="Bot" className="w-7 h-7 object-contain" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-md shadow-md shadow-primary/20'
                      : 'bg-muted/70 text-foreground rounded-tl-md border border-border/40'
                  }`}>
                    {m.image && (
                      <div className="mb-2">
                        <img src={m.image} alt="User upload" className="rounded-lg max-h-40 object-cover border border-border/40" />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="mt-3 space-y-2 border-t pt-3 border-border/40">
                        <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5" />
                          Recommended for you
                        </p>
                        {m.suggestions.map((s, idx) => (
                          <div key={idx} className="bg-background rounded-lg p-2.5 text-xs border border-border/50 hover:border-primary/30 transition-colors">
                            <p className="font-semibold text-foreground">{s.name}</p>
                            <p className="text-muted-foreground mt-0.5">{s.address}, {s.city}</p>
                            <p className="text-primary mt-1 font-medium flex items-center gap-1">
                              <span className="inline-block w-1 h-1 rounded-full bg-primary" />
                              {s.phone}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0 mt-1 shadow-md shadow-primary/20">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-9 h-9 flex items-center justify-center overflow-hidden shrink-0 mt-1 rounded-xl bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/15">
                    <img src="/chatbot-icon.png" alt="Bot" className="w-7 h-7 object-contain" />
                  </div>
                  <div className="bg-muted/70 rounded-2xl rounded-tl-md px-4 py-3 border border-border/40">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t bg-muted/20">
              {selectedImage && (
                <div className="relative inline-block mb-2.5">
                  <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-border/40 shadow-sm" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-center">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleImageSelect} />
                <button onClick={startCamera} title="Take photo" className="p-2.5 text-muted-foreground hover:text-primary transition-colors bg-muted/60 hover:bg-primary/10 rounded-xl">
                  <Camera className="w-4 h-4" />
                </button>
                <button onClick={() => fileInputRef.current?.click()} title="Upload image" className="p-2.5 text-muted-foreground hover:text-primary transition-colors bg-muted/60 hover:bg-primary/10 rounded-xl">
                  <ImagePlus className="w-4 h-4" />
                </button>
                <Input value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Message MediCore AI..."
                  onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                  className="flex-1 bg-background border-border/50 focus-visible:ring-primary/30"
                />
                <Button size="icon" onClick={sendMessage} disabled={(!input.trim() && !selectedImage) || loading} className="rounded-xl shadow-md">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center flex items-center justify-center gap-1.5">
                <Sparkles className="w-2.5 h-2.5" />
                MediCore AI can make mistakes. Always consult a healthcare professional for medical advice.
              </p>
            </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

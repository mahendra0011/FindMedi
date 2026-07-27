import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Bot, User, Stethoscope, Loader2, Activity, Camera, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const SYSTEM_PROMPT = `You are MediCore AI, a helpful health assistant. Your role:
- Answer health-related questions only (symptoms, diseases, medicines, fitness, nutrition, mental health)
- For specific diseases/symptoms, suggest visiting relevant clinics or hospitals and recommend consulting a doctor
- NEVER give definitive medical diagnoses — always advise consulting a healthcare professional
- Keep responses concise, helpful, and empathetic (2-3 paragraphs max)
- If asked non-health questions, politely redirect to health topics
- You can recommend general wellness tips, first aid, and when to see a doctor
- When users describe symptoms, suggest which type of specialist they should consult`;

export default function AIChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
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
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null);
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content, image: m.image }));
      const res = await api.post('/ai-chat', { message: userMsg.content, image: userMsg.image, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply, suggestions: res.suggestions }]);
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
            className="relative w-16 h-16 rounded-full bg-white shadow-2xl shadow-primary/50 flex items-center justify-center cursor-pointer overflow-hidden border border-gray-100"
          >
            <img src="/chatbot-icon.png" alt="Chat Bot" className="w-12 h-12 object-contain" />
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
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/5 to-blue-500/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary/20 border border-gray-100 overflow-hidden">
                  <img src="/chatbot-icon.png" alt="Bot" className="w-7 h-7 object-contain" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">MediCore AI</p>
                  <p className="text-[10px] text-muted-foreground">Health Assistant</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-muted/80 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles className="w-10 h-10 mx-auto text-primary/30 mb-3" />
                  <p className="text-sm font-medium text-foreground">Hi! I'm MediCore AI</p>
                  <p className="text-xs text-muted-foreground mt-1 px-4">
                    Ask me about symptoms, diseases, medicines, nutrition, or general health tips. I'll help guide you to the right care.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {[
                      'What are symptoms of flu?',
                      'Which doctor for headache?',
                      'Healthy diet tips',
                      'First aid for burns',
                    ].map((q) => (
                      <button key={q} onClick={() => { setInput(q); }}
                        className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 mt-1 border border-gray-100 overflow-hidden">
                      <img src="/chatbot-icon.png" alt="Bot" className="w-5 h-5 object-contain" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm'
                  }`}>
                    {m.image && (
                      <div className="mb-2">
                        <img src={m.image} alt="User upload" className="rounded-md max-h-40 object-cover" />
                      </div>
                    )}
                    {m.content}
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="mt-3 space-y-2 border-t pt-2 border-primary/10">
                        <p className="text-xs font-semibold text-primary">Recommended for you:</p>
                        {m.suggestions.map((s, idx) => (
                          <div key={idx} className="bg-background rounded p-2 text-xs border">
                            <p className="font-medium text-foreground">{s.name}</p>
                            <p className="text-muted-foreground">{s.address}, {s.city}</p>
                            <p className="text-primary mt-0.5">{s.phone}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center border border-gray-100 overflow-hidden">
                    <img src="/chatbot-icon.png" alt="Bot" className="w-5 h-5 object-contain" />
                  </div>
                  <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t">
              {selectedImage && (
                <div className="relative inline-block mb-3">
                  <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border shadow-sm" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-center">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleImageSelect} />
                <button onClick={startCamera} className="p-2 text-muted-foreground hover:text-primary transition-colors bg-muted rounded-full hover:bg-primary/10">
                  <Camera className="w-4 h-4" />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-muted-foreground hover:text-primary transition-colors bg-muted rounded-full hover:bg-primary/10">
                  <ImagePlus className="w-4 h-4" />
                </button>
                <Input value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your health..."
                  onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                  className="flex-1"
                />
                <Button size="icon" onClick={sendMessage} disabled={(!input.trim() && !selectedImage) || loading}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                Not medical advice. Consult a doctor for diagnosis.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

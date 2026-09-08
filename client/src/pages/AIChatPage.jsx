import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, Send, Sparkles, Bot, User, Loader2, Camera, ImagePlus, 
  History, Plus, MoreVertical, Trash2, X, Stethoscope, Edit2, Check, Search,
  Menu, Settings, Mic, Paperclip, Globe, Brain, Pin, Archive, Share, Copy, 
  ThumbsUp, ThumbsDown, RotateCcw, StopCircle, UploadCloud, Moon, Sun, Monitor,
  Volume2, MicOff, Languages, Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import TypewriterText from '@/components/TypewriterText';
import { toast } from 'sonner';

export default function AIChatPage() {
  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  // Toggles & Settings
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [isRecording, setIsRecording] = useState(false);
  
  // Dialogs
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Edit / Chat Management State
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const textareaRef = useRef(null);

  // Settings State
  const [settings, setSettings] = useState({
    theme: 'system',
    language: 'en',
    fontSize: 'medium',
    enterToSend: true,
    chatHistory: true,
    memory: true,
    notifications: true,
    voice: 'default',
    mic: 'default',
    speaker: 'default',
    voiceSpeed: 1
  });

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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Camera Functions
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

  // File Handlers
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Drag and Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setSelectedImage(reader.result);
        reader.readAsDataURL(file);
      } else {
        setSelectedFile(file);
      }
    }
  };

  // Paste handler
  const handlePaste = (e) => {
    if (e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setSelectedImage(reader.result);
        reader.readAsDataURL(file);
      } else {
        setSelectedFile(file);
      }
    }
  };

  // Chat Actions
  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const clearAllChats = () => {
    setChatSessions([]);
    localStorage.removeItem('medicore_ai_history');
    startNewChat();
    toast.success('All chats cleared');
    setSettingsOpen(false);
  };

  const togglePin = (e, id) => {
    e.stopPropagation();
    const updated = chatSessions.map(s => s.id === id ? { ...s, pinned: !s.pinned } : s);
    setChatSessions(updated);
    localStorage.setItem('medicore_ai_history', JSON.stringify(updated));
  };

  const toggleArchive = (e, id) => {
    e.stopPropagation();
    const updated = chatSessions.map(s => s.id === id ? { ...s, archived: !s.archived } : s);
    setChatSessions(updated);
    localStorage.setItem('medicore_ai_history', JSON.stringify(updated));
    if (currentSessionId === id) startNewChat();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Messaging
  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage && !selectedFile) || loading) return;
    
    let content = input.trim();
    if (selectedFile) content += `\n[Attached File: ${selectedFile.name}]`;

    const userMsg = { role: 'user', content, image: selectedImage, id: Date.now() };
    
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSelectedImage(null);
    setSelectedFile(null);
    setLoading(true);

    try {
      // In a real app, this hits the backend with model, webSearchEnabled, memoryEnabled, etc.
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      
      // Simulating API call for now to demonstrate UI
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const assistantMsg = { 
        role: 'assistant', 
        id: Date.now() + 1,
        content: `This is a simulated response using the ${selectedModel} model.\nWeb Search: ${webSearchEnabled ? 'On' : 'Off'}\nMemory: ${memoryEnabled ? 'On' : 'Off'}`, 
        isTyping: true 
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      let session_id = currentSessionId;
      let newSessions = [...chatSessions];
      
      if (!session_id) {
        session_id = Date.now().toString();
        setCurrentSessionId(session_id);
        newSessions.unshift({
          id: session_id,
          title: content.substring(0, 40) || 'New Chat',
          date: new Date().toISOString(),
          pinned: false,
          archived: false,
          messages: finalMessages
        });
      } else {
        const sessionIndex = newSessions.findIndex(s => s.id === session_id);
        if (sessionIndex > -1) {
          newSessions[sessionIndex].messages = finalMessages;
          newSessions[sessionIndex].date = new Date().toISOString();
          const [session] = newSessions.splice(sessionIndex, 1);
          newSessions.unshift(session); // Move to top
        }
      }
      setChatSessions(newSessions);
      localStorage.setItem('medicore_ai_history', JSON.stringify(newSessions));

    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', id: Date.now(), content: 'Sorry, I encountered an error. Please try again.' }]);
    }
    setLoading(false);
  };

  // Settings Component
  const SettingsModal = () => (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" /> AI Settings
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
          
          {/* Basic Settings */}
          <div className="space-y-6">
            <h3 className="font-semibold text-lg border-b pb-2">Basic Settings</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Theme</label>
              <Select value={settings.theme} onValueChange={(v) => setSettings({...settings, theme: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="w-4 h-4"/> Light</div></SelectItem>
                  <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="w-4 h-4"/> Dark</div></SelectItem>
                  <SelectItem value="system"><div className="flex items-center gap-2"><Monitor className="w-4 h-4"/> System</div></SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <Select value={settings.language} onValueChange={(v) => setSettings({...settings, language: v})}>
                <SelectTrigger><div className="flex items-center gap-2"><Languages className="w-4 h-4"/> <SelectValue /></div></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Font Size</label>
              <Select value={settings.fontSize} onValueChange={(v) => setSettings({...settings, fontSize: v})}>
                <SelectTrigger><div className="flex items-center gap-2"><Type className="w-4 h-4"/> <SelectValue /></div></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enter to Send</p>
                <p className="text-xs text-muted-foreground">Press enter to send message</p>
              </div>
              <Switch checked={settings.enterToSend} onCheckedChange={(v) => setSettings({...settings, enterToSend: v})} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Chat History</p>
                <p className="text-xs text-muted-foreground">Save chats locally</p>
              </div>
              <Switch checked={settings.chatHistory} onCheckedChange={(v) => setSettings({...settings, chatHistory: v})} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Memory</p>
                <p className="text-xs text-muted-foreground">AI remembers across chats</p>
              </div>
              <Switch checked={settings.memory} onCheckedChange={(v) => setSettings({...settings, memory: v})} />
            </div>
            
            <div className="pt-4 border-t">
              <Button variant="destructive" className="w-full" onClick={clearAllChats}>
                <Trash2 className="w-4 h-4 mr-2" /> Clear All Chats
              </Button>
            </div>
          </div>

          {/* Voice Settings */}
          <div className="space-y-6">
            <h3 className="font-semibold text-lg border-b pb-2">Voice Settings</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Voice Select</label>
              <Select value={settings.voice} onValueChange={(v) => setSettings({...settings, voice: v})}>
                <SelectTrigger><div className="flex items-center gap-2"><Volume2 className="w-4 h-4"/> <SelectValue /></div></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default System Voice</SelectItem>
                  <SelectItem value="nova">Nova (Female)</SelectItem>
                  <SelectItem value="echo">Echo (Male)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Microphone</label>
              <Select value={settings.mic} onValueChange={(v) => setSettings({...settings, mic: v})}>
                <SelectTrigger><div className="flex items-center gap-2"><Mic className="w-4 h-4"/> <SelectValue /></div></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Microphone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Voice Speed: {settings.voiceSpeed}x</label>
              <input 
                type="range" 
                min="0.5" max="2" step="0.1" 
                value={settings.voiceSpeed}
                onChange={(e) => setSettings({...settings, voiceSpeed: parseFloat(e.target.value)})}
                className="w-full"
              />
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className={`flex h-[calc(100dvh-4rem)] md:h-screen w-full bg-background relative overflow-hidden text-${settings.fontSize}`}>
      
      {/* Sidebar */}
      <div className={`shrink-0 border-r bg-card transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full absolute md:relative overflow-hidden border-none'}`}>
        <div className="p-3 border-b flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="md:hidden">
            <X className="w-5 h-5" />
          </Button>
          <Button onClick={startNewChat} className="flex-1 ml-2 bg-primary/10 text-primary hover:bg-primary/20 shadow-none">
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
        </div>
        
        <div className="p-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full bg-background border rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
          {/* Pinned Section */}
          {chatSessions.filter(s => s.pinned && !s.archived && s.title.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
            <div className="mb-4">
              <p className="px-2 text-xs font-semibold text-muted-foreground uppercase mb-1">Pinned</p>
              {chatSessions.filter(s => s.pinned && !s.archived && s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(session => (
                <ChatItem key={session.id} session={session} />
              ))}
            </div>
          )}

          {/* Recent Section */}
          <div className="mb-4">
            <p className="px-2 text-xs font-semibold text-muted-foreground uppercase mb-1">Recent</p>
            {chatSessions.filter(s => !s.pinned && !s.archived && s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(session => (
              <ChatItem key={session.id} session={session} />
            ))}
          </div>
        </div>

        <div className="p-3 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => setSettingsOpen(true)}>
            <Settings className="w-4 h-4" /> Settings
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div 
        className="flex-1 flex flex-col relative bg-background"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {dragActive && (
          <div className="absolute inset-0 z-50 bg-primary/10 border-4 border-dashed border-primary flex items-center justify-center backdrop-blur-sm rounded-xl m-4">
            <div className="text-center p-8 bg-card rounded-2xl shadow-xl">
              <UploadCloud className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold">Drop files here</h3>
              <p className="text-muted-foreground">Upload images, PDFs, or documents</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            )}
            
            {/* Model Selector */}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[160px] border-none shadow-none font-semibold text-base focus:ring-0 bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4"><div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500"/> GPT-4 Plus</div></SelectItem>
                <SelectItem value="claude-3"><div className="flex items-center gap-2"><Brain className="w-4 h-4 text-orange-500"/> Claude 3 Opus</div></SelectItem>
                <SelectItem value="gemini"><div className="flex items-center gap-2"><Bot className="w-4 h-4 text-blue-500"/> Gemini Pro</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <div className="w-24 h-24 mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-3xl font-bold font-heading mb-3">How can I help you today?</h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Upload a medical report, ask about symptoms, or search the web for latest treatments.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full px-4">
                {[
                  { title: "Analyze Report", desc: "Upload a PDF blood test report", icon: Paperclip },
                  { title: "Web Search", desc: "Search latest clinical trials", icon: Globe },
                  { title: "Image Generation", desc: "Generate a medical diagram", icon: ImagePlus },
                  { title: "Symptom Checker", desc: "Analyze these symptoms...", icon: Stethoscope },
                ].map((q) => (
                  <button key={q.title} onClick={() => setInput(q.desc)}
                    className="p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all text-left flex items-start gap-3 group"
                  >
                    <q.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{q.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{q.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8 pb-10">
              {messages.map((m, i) => (
                <div key={m.id || i} className="flex gap-4 group">
                  {m.role === 'assistant' ? (
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted border flex items-center justify-center shrink-0 mt-1">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm mb-1 text-foreground/80">
                      {m.role === 'assistant' ? 'FindMedi AI' : 'You'}
                    </div>
                    
                    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                      {m.image && (
                        <div className="mb-3">
                          <img src={m.image} alt="Upload" className="rounded-xl max-h-60 object-cover border shadow-sm" />
                        </div>
                      )}
                      
                      {m.role === 'assistant' && m.isTyping ? (
                        <TypewriterText 
                          text={m.content} 
                          onComplete={() => {
                            setMessages(prev => prev.map((msg) => msg.id === m.id ? { ...msg, isTyping: false } : msg));
                          }} 
                        />
                      ) : (
                        <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>
                      )}
                    </div>

                    {/* Message Action Buttons */}
                    {!m.isTyping && (
                      <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {m.role === 'assistant' ? (
                          <>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => copyToClipboard(m.content)}><Copy className="w-3.5 h-3.5 text-muted-foreground" /></Button></TooltipTrigger><TooltipContent>Copy Text</TooltipContent></Tooltip></TooltipProvider>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-md"><RotateCcw className="w-3.5 h-3.5 text-muted-foreground" /></Button></TooltipTrigger><TooltipContent>Regenerate Response</TooltipContent></Tooltip></TooltipProvider>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-md"><ThumbsUp className="w-3.5 h-3.5 text-muted-foreground" /></Button></TooltipTrigger><TooltipContent>Good response</TooltipContent></Tooltip></TooltipProvider>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-md"><ThumbsDown className="w-3.5 h-3.5 text-muted-foreground" /></Button></TooltipTrigger><TooltipContent>Bad response</TooltipContent></Tooltip></TooltipProvider>
                          </>
                        ) : (
                          <>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => setInput(m.content)}><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></Button></TooltipTrigger><TooltipContent>Edit message</TooltipContent></Tooltip></TooltipProvider>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                    Generating response...
                    <Button variant="outline" size="sm" className="ml-2 h-7 rounded-full text-xs" onClick={() => setLoading(false)}>
                      <StopCircle className="w-3.5 h-3.5 mr-1" /> Stop
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent pt-0">
          <div className="max-w-4xl mx-auto relative bg-muted/30 border border-border shadow-sm rounded-2xl p-2 focus-within:ring-1 focus-within:ring-primary focus-within:bg-background transition-all">
            
            {/* Attachments Preview */}
            {(selectedImage || selectedFile) && (
              <div className="flex flex-wrap gap-2 mb-2 p-2">
                {selectedImage && (
                  <div className="relative group">
                    <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border shadow-sm" />
                    <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {selectedFile && (
                  <div className="relative group flex items-center gap-2 bg-background border rounded-lg p-2 pr-6 max-w-[200px]">
                    <Paperclip className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs truncate">{selectedFile.name}</span>
                    <button onClick={() => setSelectedFile(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* Textarea */}
              <Textarea 
                ref={textareaRef}
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                placeholder="Message AI... (Drag & Drop files)"
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' && !e.shiftKey && settings.enterToSend) { 
                    e.preventDefault(); 
                    sendMessage(); 
                  } 
                }}
                className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-base resize-none min-h-[44px] max-h-[200px] py-3 px-2 overflow-y-auto"
                rows={1}
              />
              
              {/* Send / Voice Button */}
              {input.trim() || selectedImage || selectedFile ? (
                <Button size="icon" onClick={sendMessage} disabled={loading} className="rounded-xl w-10 h-10 mb-1 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all">
                  <Send className="w-4 h-4 ml-0.5" />
                </Button>
              ) : (
                <Button size="icon" variant="ghost" onClick={() => setIsRecording(!isRecording)} className={`rounded-xl w-10 h-10 mb-1 shrink-0 transition-colors ${isRecording ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'bg-muted hover:bg-muted-foreground/10'}`}>
                  {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
              )}
            </div>

            {/* Input Action Bar */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t px-1">
              <div className="flex items-center gap-1">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" ref={documentInputRef} onChange={handleDocumentSelect} />
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleImageSelect} />
                
                <TooltipProvider>
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => documentInputRef.current?.click()} className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"><Paperclip className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Upload File/PDF</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"><ImagePlus className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Upload Image</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={startCamera} className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"><Camera className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Take Photo</TooltipContent></Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={`h-8 rounded-full border-dashed text-xs px-3 ${webSearchEnabled ? 'border-blue-500 text-blue-500 bg-blue-50/50' : 'text-muted-foreground'}`}
                        onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                      >
                        <Globe className="w-3.5 h-3.5 mr-1.5" /> Web Search
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Search the web for real-time information</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={`h-8 rounded-full border-dashed text-xs px-3 ${memoryEnabled ? 'border-purple-500 text-purple-500 bg-purple-50/50' : 'text-muted-foreground'}`}
                        onClick={() => setMemoryEnabled(!memoryEnabled)}
                      >
                        <Brain className="w-3.5 h-3.5 mr-1.5" /> Memory
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remember details across conversations</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

          </div>
          
          <div className="text-center mt-3">
            <span className="text-[10px] text-muted-foreground font-medium">
              AI can make mistakes. Consider verifying important medical information.
            </span>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal />
    </div>
  );

  // Helper Component for Sidebar Chat Item
  function ChatItem({ session }) {
    const isSelected = currentSessionId === session.id;
    return (
      <div 
        onClick={() => {
          setCurrentSessionId(session.id);
          setMessages(session.messages);
        }}
        className={`group flex flex-col gap-1 px-3 py-2 rounded-lg cursor-pointer transition-colors relative ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}`}
      >
        <div className="flex items-center gap-2">
          {session.pinned ? (
            <Pin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
          ) : (
            <MessageCircle className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
          )}
          
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
            </div>
          ) : (
            <p className={`text-sm truncate flex-1 ${isSelected ? 'font-medium text-primary' : 'text-foreground'}`}>
              {session.title}
            </p>
          )}

          {/* Action Menu (Visible on hover) */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center bg-gradient-to-l from-background via-background to-transparent pl-4 absolute right-2">
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild><button onClick={(e) => togglePin(e, session.id)} className="p-1 hover:text-primary"><Pin className="w-3 h-3"/></button></TooltipTrigger><TooltipContent>Pin</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><button onClick={(e) => toggleArchive(e, session.id)} className="p-1 hover:text-primary"><Archive className="w-3 h-3"/></button></TooltipTrigger><TooltipContent>Archive</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><button onClick={(e) => { e.stopPropagation(); setEditTitle(session.title); setEditingSessionId(session.id); }} className="p-1 hover:text-primary"><Edit2 className="w-3 h-3"/></button></TooltipTrigger><TooltipContent>Rename</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><button onClick={(e) => { e.stopPropagation(); const updated = chatSessions.filter(s => s.id !== session.id); setChatSessions(updated); localStorage.setItem('medicore_ai_history', JSON.stringify(updated)); if (isSelected) startNewChat(); }} className="p-1 text-destructive hover:text-red-600"><Trash2 className="w-3 h-3"/></button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    );
  }
}

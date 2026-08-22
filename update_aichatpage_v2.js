const fs = require('fs');

let content = fs.readFileSync('client/src/pages/AIChatPage.jsx', 'utf8');

// 1. Add Search lucide icon if missing
if (!content.includes('Search,')) {
  content = content.replace(
    "import { MessageCircle, X, Send, Camera, ImagePlus, Plus, History, Trash2, Edit2, Check } from 'lucide-react';",
    "import { MessageCircle, X, Send, Camera, ImagePlus, Plus, History, Trash2, Edit2, Check, Search } from 'lucide-react';"
  );
}
if (!content.includes('import { MessageCircle, X, Send, Camera, ImagePlus, Plus, History, Trash2, Edit2, Check, Search }')) {
  content = content.replace(
    "import { MessageCircle, X, Send, Camera, ImagePlus, Plus, History, Trash2 } from 'lucide-react';",
    "import { MessageCircle, X, Send, Camera, ImagePlus, Plus, History, Trash2, Edit2, Check, Search } from 'lucide-react';"
  );
}

// 2. Add searchQuery state
if (!content.includes('const [searchQuery, setSearchQuery]')) {
  content = content.replace(
    "const [editTitle, setEditTitle] = useState('');",
    "const [editTitle, setEditTitle] = useState('');\n  const [searchQuery, setSearchQuery] = useState('');\n  const [isHistoryOpen, setIsHistoryOpen] = useState(false);"
  );
}

const startIndex = content.indexOf('<div className="flex h-[calc(100vh-8rem)] bg-background rounded-xl border overflow-hidden shadow-sm">');
if (startIndex !== -1) {
  let endIndex = content.indexOf('<div className="flex-1 flex flex-col relative bg-card">', startIndex);
  if (endIndex === -1) {
      endIndex = content.indexOf('<div className="flex-1 flex flex-col relative">', startIndex);
  }
  
  if (endIndex !== -1) {
    const newSection = `<div className="flex flex-col h-[calc(100vh-4.5rem)] -mx-6 -my-6 sm:h-[calc(100vh-5rem)] bg-card relative overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0 z-10 shadow-sm relative">
        <div className="flex items-center gap-2 relative">
          <Button 
            variant="outline" 
            className="flex items-center gap-2 font-semibold hover:bg-muted"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          >
            <History className="w-4 h-4 text-primary" />
            Chat History
          </Button>
          
          {/* History Popover */}
          {isHistoryOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setIsHistoryOpen(false)} />
              <div className="absolute top-full left-0 mt-2 w-80 bg-background border rounded-xl shadow-xl overflow-hidden z-50 flex flex-col max-h-[60vh] animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b flex items-center gap-2 bg-muted/30">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder="Search history..." 
                      className="w-full bg-background border rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary/50"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => { startNewChat(); setIsHistoryOpen(false); }} className="h-8 w-8 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20 text-primary">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {chatSessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p>No chats found</p>
                    </div>
                  ) : (
                    chatSessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(session => (
                      <div 
                        key={session.id} 
                        onClick={() => {
                          setCurrentSessionId(session.id);
                          setMessages(session.messages);
                          setIsHistoryOpen(false);
                        }}
                        className={\`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group \${currentSessionId === session.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'}\`}
                      >
                        <MessageCircle className={\`w-4 h-4 shrink-0 \${currentSessionId === session.id ? 'text-primary' : 'text-muted-foreground'}\`} />
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
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-foreground">FindMedi AI</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Advanced Health Assistant</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center p-1.5 shadow-sm border border-primary/20">
            <img src="/chatbot-icon.png" alt="Bot" className="w-full h-full object-contain" />
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col relative bg-card">
`;
    content = content.substring(0, startIndex) + newSection + content.substring(endIndex + '<div className="flex-1 flex flex-col relative bg-card">'.length);
  }
}

// Remove the old inner header inside the main chat area
const oldInnerHeaderRegex = /\{\/\* Header \*\/\}\s*<div className="px-6 py-4 border-b bg-gradient-to-r from-primary\/5 to-blue-500\/5 flex items-center gap-4">[\s\S]*?<\/div>\s*<\/div>/;

if (oldInnerHeaderRegex.test(content)) {
    content = content.replace(oldInnerHeaderRegex, '');
    console.log("Removed redundant header");
} else {
    console.log("Could not find the redundant header");
}

fs.writeFileSync('client/src/pages/AIChatPage.jsx', content);
console.log('AIChatPage Layout completely updated.');

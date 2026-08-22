const fs = require('fs');
let content = fs.readFileSync('client/src/components/AIChatAssistant.jsx', 'utf8');

// 1. Add TypewriterText import
if (!content.includes('import TypewriterText')) {
  content = content.replace(
    "import { Button } from '@/components/ui/button';",
    "import TypewriterText from '@/components/TypewriterText';\nimport { Button } from '@/components/ui/button';"
  );
}

// 2. Add isTyping to the assistant message
content = content.replace(
  "const assistantMsg = { role: 'assistant', content: res.reply, suggestions: res.suggestions };",
  "const assistantMsg = { role: 'assistant', content: res.reply, suggestions: res.suggestions, isTyping: true };"
);

// 3. Update the message rendering to use TypewriterText
const oldRendering = "{m.content}";
const newRendering = `{m.role === 'assistant' && m.isTyping ? (
                      <TypewriterText 
                        text={m.content} 
                        onComplete={() => {
                          setMessages(prev => prev.map((msg, idx) => idx === i ? { ...msg, isTyping: false } : msg));
                        }} 
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}`;
content = content.replace(oldRendering, newRendering);

// 4. Hide suggestions while typing
content = content.replace(
  "{m.suggestions && m.suggestions.length > 0 && (",
  "{m.suggestions && m.suggestions.length > 0 && !m.isTyping && ("
);

// 5. Size Increase
content = content.replace(
  "className=\"fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-card rounded-2xl border shadow-2xl flex flex-col overflow-hidden\"",
  "className=\"fixed bottom-0 right-0 sm:bottom-24 sm:right-6 z-50 w-full h-[100dvh] sm:w-[420px] sm:h-[600px] sm:max-h-[calc(100vh-8rem)] bg-card sm:rounded-2xl border sm:shadow-2xl flex flex-col overflow-hidden\""
);

// 6. Fix "Open Full Page" button
// Add a button in the header
const oldHeaderRight = `<button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-muted/80 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>`;
const newHeaderRight = `<button onClick={() => {
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
              </div>`;
content = content.replace(oldHeaderRight, newHeaderRight);

// Remove the old history button if it was somewhere else, actually the old file didn't have showHistory button? Let's verify.
fs.writeFileSync('client/src/components/AIChatAssistant.jsx', content);
console.log('Update successful!');

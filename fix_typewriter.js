const fs = require('fs');
let content = fs.readFileSync('client/src/pages/AIChatPage.jsx', 'utf8');

if (!content.includes('import TypewriterText')) {
  content = content.replace('import { Button }', 'import TypewriterText from \'@/components/TypewriterText\';\nimport { Button }');
}

const oldRender = '<div className=\"leading-relaxed whitespace-pre-wrap\">{m.content}</div>';
const newRender = {m.role === 'assistant' && m.isTyping ? (
                  <TypewriterText 
                    text={m.content} 
                    onComplete={() => {
                      setMessages(prev => prev.map((msg, idx) => idx === i ? { ...msg, isTyping: false } : msg));
                    }} 
                  />
                ) : (
                  <div className=\"leading-relaxed whitespace-pre-wrap\">{m.content}</div>
                )};
content = content.replace(oldRender, newRender);

const oldSuggestions = '{m.suggestions && m.suggestions.length > 0 && (';
const newSuggestions = '{m.suggestions && m.suggestions.length > 0 && !m.isTyping && (';
content = content.replace(oldSuggestions, newSuggestions);

const oldAssistantMsg = 'const assistantMsg = { role: \'assistant\', content: res.reply, suggestions: res.suggestions };';
const newAssistantMsg = 'const assistantMsg = { role: \'assistant\', content: res.reply, suggestions: res.suggestions, isTyping: true };';
content = content.replace(oldAssistantMsg, newAssistantMsg);

fs.writeFileSync('client/src/pages/AIChatPage.jsx', content);
console.log('Typewriter logic added');

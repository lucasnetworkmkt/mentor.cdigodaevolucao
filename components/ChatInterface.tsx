import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatSession } from '../types';
import { generateTextResponse } from '../services/geminiService';
import { Send, User, Bot, Loader2, Zap, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  onAwardPoints: (amount: number, reason: string) => void;
  activeSession: ChatSession;
  onUpdateSession: (updatedSession: ChatSession) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onAwardPoints, activeSession, onUpdateSession }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pointNotification, setPointNotification] = useState<{amount: number, reason: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession.messages, isLoading, error]);

  // Effect to clear notification
  useEffect(() => {
    if (pointNotification) {
      const timer = setTimeout(() => setPointNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [pointNotification]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date()
    };

    // Optimistic update
    const updatedMessages = [...activeSession.messages, userMsg];
    let updatedTitle = activeSession.title;

    // Generate title from first user message if it's the first interaction
    if (activeSession.messages.length <= 1) {
        updatedTitle = userText.split(' ').slice(0, 5).join(' ') + (userText.split(' ').length > 5 ? '...' : '');
    }

    onUpdateSession({
        ...activeSession,
        messages: updatedMessages,
        title: updatedTitle,
        lastModified: new Date()
    });

    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Generate history EXCLUDING the last message we just added
      const history = updatedMessages.slice(0, -1).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const rawResponse = await generateTextResponse(history, userMsg.text);

      if (rawResponse) {
        // Parse for Gamification Tags: <<<POINTS:Amount:Reason>>>
        let cleanText = rawResponse;
        const pointsRegex = /<<<POINTS:(\-?\d+):([^>]+)>>>/g;
        let match;
        
        while ((match = pointsRegex.exec(rawResponse)) !== null) {
          const amount = parseInt(match[1]);
          const reason = match[2];
          onAwardPoints(amount, reason);
          setPointNotification({ amount, reason });
        }

        // Remove tags from display text
        cleanText = rawResponse.replace(pointsRegex, '').trim();

        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: cleanText,
          timestamp: new Date()
        };
        
        onUpdateSession({
            ...activeSession,
            messages: [...updatedMessages, botMsg],
            title: updatedTitle,
            lastModified: new Date()
        });
      }
    } catch (error: any) {
      console.error("Chat Error:", error);
      setError(error.message || "Falha na comunicação com o Mentor.");
      // Optional: Remove the user message if it failed? No, keep it so they can copy/paste.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] text-white relative w-full overflow-hidden">
      
      {/* Point Notification Toast */}
      {pointNotification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none">
          <div className="bg-[#FFD700] text-black font-bold px-6 py-3 rounded-full shadow-[0_0_20px_#FFD700] flex items-center gap-2 border border-white">
            <Zap size={20} className="fill-black" />
            <span>+{pointNotification.amount} PTS</span>
            <span className="font-normal text-xs uppercase opacity-80 border-l border-black/20 pl-2 ml-1">
              {pointNotification.reason}
            </span>
          </div>
        </div>
      )}

      {/* Messages Area - Ensure flex-1 and overflow control for mobile */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-[#333] min-h-0 w-full">
        {activeSession.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] sm:max-w-[85%] md:max-w-[70%] rounded-lg p-4 sm:p-5 shadow-lg ${
                msg.role === 'user'
                  ? 'bg-[#1a1a1a] border border-[#333] text-[#ddd]'
                  : 'bg-[#0F0F0F] border-l-2 border-[#E50914]'
              }`}
            >
              <div className="flex items-center gap-2 mb-3 opacity-60 border-b border-[#333] pb-2">
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} className="text-[#E50914]" />}
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#9FB4C7]">
                  {msg.role === 'user' ? 'Você' : 'O Mentor'}
                </span>
              </div>
              <div className="prose prose-invert prose-sm prose-p:leading-relaxed prose-strong:text-[#FFD700] prose-headings:text-white prose-a:text-[#E50914] break-words">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-[#0F0F0F] border border-[#333] rounded-lg p-4 flex items-center gap-3">
                <Loader2 className="animate-spin text-[#E50914]" size={18} />
                <span className="text-xs text-[#9FB4C7] font-mono uppercase tracking-wider">
                  Processando estratégia...
                </span>
             </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center my-4">
             <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 flex items-center gap-2 text-red-500 text-xs font-bold animate-in fade-in">
                <AlertTriangle size={16} />
                <span>{error}</span>
                <button onClick={() => handleSend()} className="ml-2 underline hover:text-white">Tentar Novamente</button>
             </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="p-4 bg-[#050505] border-t border-[#9FB4C7]/10 shrink-0 z-20">
        <div className="relative max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Qual é o travamento? Seja direto."
            className="flex-1 bg-[#111] text-white rounded-md px-4 py-4 focus:outline-none focus:ring-1 focus:ring-[#E50914] border border-[#333] placeholder-[#555] font-medium min-w-0"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-[#E50914] hover:bg-[#b0060e] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 rounded-md font-bold transition-all uppercase tracking-wide text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(229,9,20,0.2)] shrink-0"
          >
            <Send size={18} />
            <span className="hidden sm:inline">Executar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;

import React from 'react';
import { ChatSession } from '../types';
import { MessageSquare, Plus, Clock, ChevronRight } from 'lucide-react';
import EagleEmblem from './EagleEmblem';

interface ChatHistoryProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  userPoints: number; // Prop to control eagle stage
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ sessions, currentSessionId, onSelectSession, onNewChat, userPoints }) => {
  // Sort sessions by lastModified (newest first)
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] p-6 text-white overflow-hidden relative">
      
      {/* Background Watermark Eagle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none z-0">
         <EagleEmblem points={userPoints} size="xl" />
      </div>

      <div className="max-w-4xl mx-auto w-full flex flex-col h-full relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-wider flex items-center gap-2">
              <Clock className="text-[#E50914]" />
              Histórico de Operações
            </h2>
            <p className="text-[#9FB4C7] text-sm font-mono mt-1">REGISTRO DE COMANDO E EVOLUÇÃO</p>
          </div>
          <button 
            onClick={onNewChat}
            className="bg-[#E50914] hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2 font-bold uppercase tracking-wide text-sm transition-all shadow-[0_0_15px_rgba(229,9,20,0.3)]"
          >
            <Plus size={18} />
            Novo Ciclo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#333]">
          {sortedSessions.length === 0 ? (
            <div className="text-center text-[#555] mt-20 font-mono border border-[#333] p-10 rounded-lg border-dashed bg-black/50 backdrop-blur-sm">
              NENHUM REGISTRO ENCONTRADO.<br/>INICIE UM NOVO CICLO DE COMANDO.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all flex items-center justify-between group backdrop-blur-sm ${
                    currentSessionId === session.id
                      ? 'bg-[#1a1a1a]/90 border-[#E50914] shadow-[0_0_10px_rgba(229,9,20,0.1)]'
                      : 'bg-[#0F0F0F]/80 border-[#333] hover:border-[#9FB4C7]/50 hover:bg-[#151515]/90'
                  }`}
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={`p-3 rounded-full ${currentSessionId === session.id ? 'bg-[#E50914]/20 text-[#E50914]' : 'bg-[#1a1a1a] text-[#555]'}`}>
                      <MessageSquare size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold truncate ${currentSessionId === session.id ? 'text-white' : 'text-[#ddd]'}`}>
                        {session.title || 'Nova Sessão'}
                      </h3>
                      <span className="text-xs text-[#555] font-mono">
                        {new Date(session.lastModified).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className={`transition-transform ${currentSessionId === session.id ? 'text-[#E50914]' : 'text-[#333] group-hover:text-[#9FB4C7]'}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;

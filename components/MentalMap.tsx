
import React, { useState } from 'react';
import { generateMentalMapStructure } from '../services/geminiService';
import { Network, Loader2, Copy, Terminal, History, ChevronUp, FileText } from 'lucide-react';
import { MentalMapItem } from '../types';

interface MentalMapProps {
  history: MentalMapItem[];
  onSave: (topic: string, content: string) => void;
}

const MentalMap: React.FC<MentalMapProps> = ({ history, onSave }) => {
  const [topic, setTopic] = useState('');
  const [mapContent, setMapContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setMapContent(null);
    try {
      const textMap = await generateMentalMapStructure(topic);
      if (textMap) {
        setMapContent(textMap);
        onSave(topic, textMap); // Auto save to history
      } else {
        setMapContent("Falha ao gerar estrutura.");
      }
    } catch (e) {
      console.error(e);
      setMapContent("ERRO: Sistema indisponível. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item: MentalMapItem) => {
    setTopic(item.topic);
    setMapContent(item.content);
    setShowHistory(false);
  };

  const copyToClipboard = () => {
    if (mapContent) {
      navigator.clipboard.writeText(mapContent);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] p-6 overflow-hidden relative text-white">
      <div className="max-w-4xl mx-auto w-full space-y-6 flex flex-col h-full">
        
        {/* Header */}
        <div className="text-center shrink-0">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2">
            <Network className="text-[#E50914]" />
            Estruturas de Comando
          </h2>
          <p className="text-[#9FB4C7] text-sm">Arquitetura tática em formato de texto.</p>
        </div>

        {/* Input Area */}
        <div className="flex gap-2 shrink-0">
           <input 
             type="text" 
             value={topic}
             onChange={(e) => setTopic(e.target.value)}
             placeholder="Ex: Rotina Matinal, Plano de Vendas..."
             className="flex-1 bg-[#1a1a1a] border border-[#333] text-white p-4 rounded-lg focus:outline-none focus:border-[#E50914] placeholder-[#555]"
           />
           <button 
             onClick={handleGenerate}
             disabled={loading || !topic}
             className="bg-[#E50914] hover:bg-red-700 disabled:opacity-50 text-white px-6 rounded-lg font-bold uppercase tracking-wide min-w-[120px] flex items-center justify-center shadow-[0_0_10px_rgba(229,9,20,0.3)]"
           >
             {loading ? <Loader2 className="animate-spin" /> : 'Gerar'}
           </button>
        </div>

        {/* Main Display Area */}
        <div className="flex-1 bg-[#050505] border border-[#333] rounded-xl flex flex-col relative overflow-hidden shadow-inner min-h-0">
          <div className="bg-[#111] p-3 border-b border-[#333] flex justify-between items-center shrink-0">
             <div className="flex items-center gap-2">
                <Terminal size={14} className="text-[#E50914]" />
                <span className="text-xs text-[#555] font-mono uppercase">TERMINAL DE ESTRUTURA</span>
             </div>
             {mapContent && (
                <button onClick={copyToClipboard} className="text-[#9FB4C7] hover:text-white transition-colors">
                   <Copy size={16} />
                </button>
             )}
          </div>

          <div className="flex-1 p-6 font-mono text-sm leading-relaxed overflow-auto scrollbar-thin scrollbar-thumb-[#333]">
             {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-[#E50914]">
                   <Loader2 className="animate-spin" size={32} />
                   <div className="text-xs animate-pulse uppercase">Compilando Estrutura...</div>
                </div>
             ) : mapContent ? (
                <pre className="text-[#FFD700] whitespace-pre-wrap">{mapContent}</pre>
             ) : (
                <div className="h-full flex items-center justify-center text-[#333] uppercase text-2xl font-bold select-none opacity-50">
                   Aguardando Input
                </div>
             )}
          </div>
        </div>

        {/* Bottom History Toggle */}
        <div className="shrink-0 relative">
             <button 
               onClick={() => setShowHistory(!showHistory)}
               className="w-full bg-[#111] border border-[#333] hover:border-[#E50914] py-3 rounded-t-lg flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-[#9FB4C7] transition-all"
             >
                <History size={14} />
                Histórico Tático ({history.length})
                <ChevronUp size={14} className={`transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`} />
             </button>
             
             {/* History Drawer */}
             <div className={`
                bg-[#0F0F0F] border-x border-b border-[#333] rounded-b-lg overflow-hidden transition-all duration-300 ease-in-out
                ${showHistory ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}
             `}>
                <div className="overflow-y-auto max-h-[200px] p-2 space-y-1 scrollbar-thin scrollbar-thumb-[#333]">
                   {history.length === 0 ? (
                      <div className="text-center p-4 text-[#555] text-xs font-mono">Nenhum mapa salvo ainda.</div>
                   ) : (
                      history.map((item) => (
                         <button
                           key={item.id}
                           onClick={() => loadFromHistory(item)}
                           className="w-full text-left p-3 rounded hover:bg-[#1a1a1a] flex items-center gap-3 group transition-colors border border-transparent hover:border-[#333]"
                         >
                            <FileText size={16} className="text-[#555] group-hover:text-[#E50914]" />
                            <div className="flex-1 min-w-0">
                               <p className="text-sm font-bold text-[#ddd] truncate group-hover:text-white">{item.topic}</p>
                               <p className="text-[10px] text-[#555] font-mono">
                                  {item.createdAt.toLocaleDateString('pt-BR')} às {item.createdAt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                               </p>
                            </div>
                         </button>
                      ))
                   )}
                </div>
             </div>
        </div>
        
      </div>
    </div>
  );
};

export default MentalMap;

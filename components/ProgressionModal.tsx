
import React from 'react';
import { X, Trophy, Lock, CheckCircle2, ChevronRight } from 'lucide-react';
import EagleEmblem from './EagleEmblem';

interface ProgressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPoints: number;
}

const MILESTONES = [
  { points: 0, label: 'Início', desc: 'A Origem' },
  { points: 500, label: 'Despertar', desc: '1ª Quebra' },
  { points: 1000, label: 'Consistência', desc: 'Disciplina' },
  { points: 2500, label: 'Aprendiz', desc: 'Expansão' },
  { points: 5000, label: 'Praticante', desc: 'Domínio' },
  { points: 7500, label: 'Dominante', desc: 'Autoridade' },
  { points: 10000, label: 'Lenda', desc: 'O Código' },
];

const ProgressionModal: React.FC<ProgressionModalProps> = ({ isOpen, onClose, currentPoints }) => {
  if (!isOpen) return null;

  // Find next milestone
  const nextMilestone = MILESTONES.find(m => m.points > currentPoints) || MILESTONES[MILESTONES.length - 1];
  const pointsToNext = Math.max(0, nextMilestone.points - currentPoints);
  const progressPercent = Math.min(100, (currentPoints / 10000) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0A0A0A] w-full max-w-5xl rounded-2xl border border-[#333] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#333] flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-widest text-white flex items-center gap-2">
               <Trophy className="text-[#FFD700]" />
               Caminho da Evolução
            </h2>
            <p className="text-[#9FB4C7] text-sm font-mono mt-1">MAPA DE PROGRESSÃO VISUAL</p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Status Info */}
        <div className="px-6 py-4 bg-[#111] border-b border-[#333] flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
            <div className="flex items-center gap-3">
               <div className="bg-[#E50914]/10 p-2 rounded-full border border-[#E50914]/20">
                   <EagleEmblem points={currentPoints} size="sm" />
               </div>
               <div>
                   <p className="text-xs text-[#555] uppercase font-bold">Status Atual</p>
                   <p className="text-white font-bold text-lg">{currentPoints} PTS</p>
               </div>
            </div>
            
            {pointsToNext > 0 ? (
                <div className="flex items-center gap-2 text-right">
                    <div>
                        <p className="text-xs text-[#555] uppercase font-bold">Próximo Marco</p>
                        <p className="text-[#FFD700] font-bold text-lg">{pointsToNext} PTS Restantes</p>
                    </div>
                    <ChevronRight className="text-[#555]" />
                </div>
            ) : (
                <div className="text-[#FFD700] font-bold uppercase tracking-widest text-sm border border-[#FFD700] px-3 py-1 rounded">
                    Ápice Alcançado
                </div>
            )}
        </div>

        {/* Scrollable Roadmap */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 sm:p-12 relative flex items-center scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
            
            {/* Connection Line */}
            <div className="absolute left-12 right-12 top-1/2 h-1 bg-[#222] -translate-y-[40px] z-0 rounded-full" />
            
            {/* Roadmap Nodes */}
            <div className="flex items-start gap-12 sm:gap-24 min-w-max mx-auto z-10 px-4">
                {MILESTONES.map((milestone, index) => {
                    const isUnlocked = currentPoints >= milestone.points;
                    const isNext = !isUnlocked && (index === 0 || currentPoints >= MILESTONES[index - 1].points);
                    
                    return (
                        <div key={milestone.points} className={`flex flex-col items-center gap-4 relative group ${isUnlocked ? 'opacity-100' : 'opacity-60'}`}>
                            
                            {/* Node Point */}
                            <div className={`
                                w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all duration-500 relative bg-[#0A0A0A]
                                ${isUnlocked 
                                    ? 'border-[#E50914] shadow-[0_0_15px_#E50914] scale-110' 
                                    : isNext 
                                        ? 'border-[#FFD700] animate-pulse shadow-[0_0_15px_rgba(255,215,0,0.5)]' 
                                        : 'border-[#333]'
                                }
                            `}>
                                {isUnlocked && <div className="w-2 h-2 bg-[#E50914] rounded-full" />}
                                {isNext && <div className="w-2 h-2 bg-[#FFD700] rounded-full" />}
                                
                                {/* Current Position Indicator - PERFECTLY CENTERED */}
                                {isNext && (
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center z-50">
                                        <div className="bg-[#FFD700] text-black text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap animate-bounce uppercase tracking-wider">
                                            VOCÊ ESTÁ AQUI
                                        </div>
                                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#FFD700] mt-[-2px]" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="text-center">
                                <p className={`text-xs font-mono mb-1 ${isUnlocked ? 'text-[#E50914]' : 'text-[#555]'}`}>
                                    {milestone.points} pts
                                </p>
                                <p className={`text-sm font-bold uppercase tracking-wider mb-2 ${isUnlocked ? 'text-white' : 'text-[#777]'}`}>
                                    {milestone.label}
                                </p>
                                
                                {/* Visual Badge Preview */}
                                <div className={`
                                    w-24 h-24 rounded-lg bg-gradient-to-b from-[#1a1a1a] to-black border flex items-center justify-center transition-all duration-500
                                    ${isUnlocked 
                                        ? 'border-[#E50914]/30 shadow-lg' 
                                        : 'border-[#333] grayscale opacity-50'
                                    }
                                `}>
                                    <EagleEmblem 
                                        points={milestone.points} 
                                        size="md" 
                                        locked={!isUnlocked}
                                    />
                                    {!isUnlocked && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                                            <Lock size={16} className="text-[#555]" />
                                        </div>
                                    )}
                                </div>
                                
                                <p className="text-[10px] text-[#555] mt-2 uppercase tracking-widest font-mono">
                                    {isUnlocked ? <span className="text-green-500 flex items-center justify-center gap-1"><CheckCircle2 size={10} /> Conquistado</span> : milestone.desc}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="p-4 border-t border-[#333] bg-[#050505] text-center">
            <p className="text-[#555] text-xs font-mono uppercase">
                "A única direção é para frente."
            </p>
        </div>

      </div>
    </div>
  );
};

export default ProgressionModal;

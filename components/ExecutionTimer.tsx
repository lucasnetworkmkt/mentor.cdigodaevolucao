
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Edit3, Save, Volume2 } from 'lucide-react';
import { TimerState } from '../types';

interface ExecutionTimerProps {
  onComplete: (points: number, reason: string) => void;
  timer: TimerState;
  updateTimer: (newState: Partial<TimerState>) => void;
}

const ExecutionTimer: React.FC<ExecutionTimerProps> = ({ onComplete, timer, updateTimer }) => {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editMinutes, setEditMinutes] = useState('25');
  const [editSeconds, setEditSeconds] = useState('00');
  const [showPostCheck, setShowPostCheck] = useState(false);
  
  // Audio Context Ref for synthetic alarm
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Watch for timer completion via props
  useEffect(() => {
    if (timer.minutes === 0 && timer.seconds === 0 && !timer.isActive && timer.deliverable) {
       setShowPostCheck(true);
    }
  }, [timer.minutes, timer.seconds, timer.isActive, timer.deliverable]);

  const playSyntheticAlarm = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const t = ctx.currentTime;
      
      // Create oscillator for a "Digital Alarm" sound (Square wave)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'square';
      
      // Pattern: Beep-Beep-Beep-Beep (High pitched, authoritative)
      const frequency = 880; // A5
      const beepLen = 0.1;
      const pauseLen = 0.1;
      
      // 4 Beeps loop
      for(let i=0; i<4; i++) {
        const start = t + i * (beepLen + pauseLen);
        const end = start + beepLen;
        
        osc.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.3, start); // Volume
        gain.gain.setValueAtTime(0.3, end - 0.01);
        gain.gain.setValueAtTime(0, end);
      }

      osc.start(t);
      osc.stop(t + 1.0); // Stop after 1 second sequence

    } catch (e) {
      console.error("Alarm error:", e);
    }
  };

  const startTimer = () => {
    if (!timer.deliverable?.trim() && timer.mode !== 'BREAK') {
      alert("O MENTOR EXIGE: Defina um entregável antes de começar.");
      return;
    }
    // Initialize AudioContext on user interaction to prevent autoplay block later
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
    }
    
    updateTimer({ isActive: true });
  };

  const pauseTimer = () => {
    updateTimer({ isActive: false });
  };

  const resetTimer = () => {
    updateTimer({ isActive: false, minutes: 25, seconds: 0, mode: 'FOCUS' });
    setShowPostCheck(false);
  };

  const setPreset = (mins: number, mode: 'FOCUS' | 'BREAK' | 'FREE' = 'FOCUS') => {
    updateTimer({ 
      minutes: mins, 
      seconds: 0, 
      isActive: false, 
      mode 
    });
    setEditMinutes(mins.toString());
    setEditSeconds('00');
  };

  const handleDeliveryConfirm = () => {
    const points = 50;
    onComplete(points, `Tarefa concluída: ${timer.deliverable}`);
    setShowPostCheck(false);
    updateTimer({ deliverable: '' }); 
    setPreset(5, 'BREAK');
  };

  // Calculate progress
  const currentTotal = timer.minutes * 60 + timer.seconds;
  const maxSeconds = (parseInt(editMinutes) * 60 + parseInt(editSeconds)) || 25 * 60;
  const progress = maxSeconds > 0 ? 100 - (currentTotal / maxSeconds) * 100 : 0;

  const saveTime = () => {
    let m = parseInt(editMinutes) || 0;
    let s = parseInt(editSeconds) || 0;
    
    if (s > 59) {
      m += Math.floor(s / 60);
      s = s % 60;
    }

    updateTimer({ minutes: m, seconds: s });
    setIsEditingTime(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0A0A0A] p-6 text-white relative overflow-y-auto min-h-full">
      
      {/* Post-Timer Modal */}
      {showPostCheck && (
        <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#0A0A0A] border border-[#E50914] p-8 rounded-lg max-w-md w-full text-center shadow-[0_0_30px_rgba(229,9,20,0.3)]">
            <h3 className="text-2xl font-bold text-[#FFD700] mb-4 uppercase">Relatório de Execução</h3>
            <p className="text-[#9FB4C7] mb-6">O tempo acabou. Você entregou o que prometeu?</p>
            <div className="bg-neutral-900 p-4 rounded mb-6 text-left border-l-4 border-[#E50914]">
               <span className="text-xs text-neutral-500 uppercase">Compromisso:</span>
               <p className="text-white font-medium">{timer.deliverable}</p>
            </div>
            <button 
              onClick={handleDeliveryConfirm}
              className="w-full bg-[#E50914] hover:bg-red-700 text-white font-bold py-4 rounded uppercase tracking-widest transition-all"
            >
              Sim, Executado (+50 PTS)
            </button>
            <button 
              onClick={() => { setShowPostCheck(false); updateTimer({ deliverable: '' }); }}
              className="mt-4 text-xs text-neutral-500 hover:text-white underline"
            >
              Falhei na missão (Sem pontos)
            </button>
          </div>
        </div>
      )}

      <div className="max-w-md w-full space-y-8 my-auto">
        <div className="text-center">
           <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-widest">
              {timer.mode === 'FOCUS' ? 'Modo Guerra' : timer.mode === 'BREAK' ? 'Recuperação' : 'Execução Livre'}
           </h2>
           <p className="text-[#9FB4C7] font-mono text-sm">
              {timer.mode === 'FOCUS' ? 'EXECUÇÃO > PERFEIÇÃO' : 'RESPIRE PARA VOLTAR MAIS FORTE.'}
           </p>
        </div>

        {/* Presets */}
        <div className="flex justify-center gap-2 mb-4">
          <button onClick={() => setPreset(25)} className="px-3 py-1 bg-neutral-900 border border-[#9FB4C7]/20 hover:border-[#E50914] text-xs font-bold text-[#9FB4C7] uppercase rounded transition-colors">25min</button>
          <button onClick={() => setPreset(50)} className="px-3 py-1 bg-neutral-900 border border-[#9FB4C7]/20 hover:border-[#E50914] text-xs font-bold text-[#9FB4C7] uppercase rounded transition-colors">50min</button>
          <button onClick={() => setPreset(5)} className="px-3 py-1 bg-neutral-900 border border-[#9FB4C7]/20 hover:border-[#E50914] text-xs font-bold text-[#9FB4C7] uppercase rounded transition-colors">5min (Start)</button>
        </div>

        {/* Timer Display */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto flex items-center justify-center">
           <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 288 288">
              <circle cx="144" cy="144" r="130" stroke="#1a1a1a" strokeWidth="6" fill="transparent" />
              <circle cx="144" cy="144" r="130" stroke="#E50914" strokeWidth="6" fill="transparent" 
                      strokeDasharray={2 * Math.PI * 130}
                      strokeDashoffset={2 * Math.PI * 130 * (1 - (progress < 0 ? 0 : progress) / 100)}
                      className="transition-all duration-1000 ease-linear shadow-[0_0_15px_#E50914]"
                      strokeLinecap="round" />
           </svg>
           
           <div className="flex flex-col items-center z-10">
             {isEditingTime ? (
               <div className="flex items-center gap-1 text-4xl sm:text-5xl font-mono font-bold text-white">
                 <input 
                   type="number" 
                   value={editMinutes}
                   onChange={(e) => setEditMinutes(e.target.value)}
                   className="w-16 sm:w-20 bg-transparent border-b-2 border-[#E50914] text-center focus:outline-none placeholder-[#333]"
                   placeholder="MM"
                   autoFocus
                 />
                 <span className="text-[#E50914]">:</span>
                 <input 
                   type="number" 
                   value={editSeconds}
                   onChange={(e) => setEditSeconds(e.target.value)}
                   className="w-16 sm:w-20 bg-transparent border-b-2 border-[#E50914] text-center focus:outline-none placeholder-[#333]"
                   placeholder="SS"
                 />
                 <button onClick={saveTime} className="ml-2 bg-[#E50914] p-2 rounded-full hover:bg-red-700 transition-colors">
                   <Save size={20} className="text-white" />
                 </button>
               </div>
             ) : (
               <div className="group relative flex items-center justify-center cursor-pointer" onClick={() => {
                   setEditMinutes(timer.minutes.toString());
                   setEditSeconds(timer.seconds.toString().padStart(2, '0'));
                   setIsEditingTime(true);
               }}>
                 <div className="text-6xl sm:text-7xl font-mono font-bold text-white tracking-tighter shadow-black drop-shadow-lg select-none">
                    {String(timer.minutes).padStart(2, '0')}:{String(timer.seconds).padStart(2, '0')}
                 </div>
                 {!timer.isActive && (
                   <button 
                     className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                   >
                     <Edit3 size={20} className="text-[#9FB4C7]" />
                   </button>
                 )}
               </div>
             )}
           </div>
        </div>

        {/* Inputs & Controls */}
        <div className="space-y-6 pb-6">
           <div className="relative">
             <input 
                type="text" 
                value={timer.deliverable || ''}
                onChange={(e) => updateTimer({ deliverable: e.target.value })}
                disabled={timer.isActive}
                placeholder="O QUE SERÁ ENTREGUE? (Obrigatório)"
                className="w-full bg-[#1a1a1a] border border-[#9FB4C7]/20 focus:border-[#E50914] text-center text-white p-4 rounded-lg outline-none transition-colors placeholder-[#9FB4C7]/50 font-medium disabled:opacity-50"
             />
             {!timer.deliverable && !timer.isActive && timer.mode !== 'BREAK' && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#E50914] animate-pulse">
                   !
                </div>
             )}
           </div>
           
           <div className="flex justify-center gap-6">
              {!timer.isActive ? (
                <button 
                  onClick={startTimer} 
                  className="w-20 h-20 rounded-full bg-[#E50914] hover:bg-red-700 text-white flex items-center justify-center transition-all shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:scale-105"
                >
                   <Play size={36} className="ml-1" />
                </button>
              ) : (
                <button 
                  onClick={pauseTimer} 
                  className="w-20 h-20 rounded-full bg-[#FFD700] hover:bg-yellow-500 text-black flex items-center justify-center transition-all shadow-[0_0_20px_rgba(255,215,0,0.4)]"
                >
                   <Pause size={36} />
                </button>
              )}
              
              <button 
                onClick={resetTimer} 
                className="w-20 h-20 rounded-full bg-neutral-800 border border-[#9FB4C7]/20 hover:bg-neutral-700 text-[#9FB4C7] flex items-center justify-center transition-all"
              >
                 <RotateCcw size={30} />
              </button>
           </div>
           
           <div className="flex justify-center">
             <button onClick={playSyntheticAlarm} className="text-[10px] text-[#555] hover:text-[#E50914] flex items-center gap-1 uppercase tracking-widest">
               <Volume2 size={12} /> Testar Alarme
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutionTimer;

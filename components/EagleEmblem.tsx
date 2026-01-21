
import React from 'react';

interface EagleEmblemProps {
  points: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  locked?: boolean;
}

const EagleEmblem: React.FC<EagleEmblemProps> = ({ points, className = '', size = 'md', locked = false }) => {
  // Determine Stage
  let stage = 1;
  if (points >= 10000) stage = 5;       // Lenda
  else if (points >= 5000) stage = 4;   // Dominante (was 7500)
  else if (points >= 2500) stage = 3;   // Praticante (was 5000)
  else if (points >= 500) stage = 2;    // Aprendiz/Despertar (was 2500)

  // Size mapping
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-32 h-32',
    xl: 'w-96 h-96'
  };

  // Color mapping based on stage (Progressive Glow)
  const getColors = () => {
    if (locked) {
      return { fill: "#1a1a1a", stroke: "#333" }; // Disabled/Locked state
    }

    switch(stage) {
      case 1: return { fill: "#333", stroke: "#555" }; // Stone
      case 2: return { fill: "#444", stroke: "#9FB4C7" }; // Iron/Azure
      case 3: return { fill: "#1a0b0b", stroke: "#E50914" }; // Blood
      case 4: return { fill: "#2a0a0a", stroke: "#ff4d4d" }; // Crimson
      case 5: return { fill: "#1a1a00", stroke: "#FFD700" }; // Gold
      default: return { fill: "#333", stroke: "#555" };
    }
  };

  const colors = getColors();

  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center transition-all duration-1000`}>
      <svg 
        viewBox="0 0 24 24" 
        className={`w-full h-full transition-all duration-700`}
        style={{
            fill: colors.fill,
            stroke: colors.stroke,
            strokeWidth: stage >= 4 ? 0.5 : 1,
            filter: (!locked && stage === 5) ? 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))' : 'none',
            opacity: locked ? 0.5 : 1
        }}
      >
        {/* Render different geometry based on stage */}
        {stage === 1 && (
            <path d="M12 3L4 21L12 17L20 21L12 3Z" strokeLinejoin="round" />
        )}
        {stage === 2 && (
            <path d="M12 2L3 7L5 18L12 22L19 18L21 7L12 2Z M12 5L17 8L16 16L12 19L8 16L7 8L12 5Z" fillRule="evenodd" />
        )}
        {stage === 3 && (
            <path d="M22 10L12 2L2 10L5 20L12 17L19 20L22 10Z M12 5L18 10L16 17L12 15L8 17L6 10L12 5Z" fillRule="evenodd" />
        )}
        {stage === 4 && (
             <path d="M23 8C23 8 20 10 18 10C16 10 14 9 12 5C10 9 8 10 6 10C4 10 1 8 1 8L3 18L12 22L21 18L23 8Z" strokeLinejoin="round"/>
        )}
        {stage === 5 && (
            <g>
                <path d="M12 1L23 9L21 21L12 23L3 21L1 9L12 1Z" opacity="0.3" />
                <path d="M2 9L12 2L22 9L20 19L12 22L4 19L2 9Z M12 6L17 10L16 16L12 18L8 16L7 10L12 6Z" fillRule="evenodd" />
                <circle cx="12" cy="12" r="1" fill={locked ? "#333" : "#FFD700"} />
            </g>
        )}
      </svg>
    </div>
  );
};

export default EagleEmblem;

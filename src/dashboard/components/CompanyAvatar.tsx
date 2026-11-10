import React, { useState } from 'react';

interface CompanyAvatarProps {
  name: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AVATAR_COLOR_PALETTES = [
  { bg: 'bg-[#1E293B]', border: 'border-slate-700/60', text: 'text-cyan-300' },
  { bg: 'bg-[#2E1F38]', border: 'border-purple-800/60', text: 'text-purple-300' },
  { bg: 'bg-[#1F3A2E]', border: 'border-emerald-800/60', text: 'text-emerald-300' },
  { bg: 'bg-[#352516]', border: 'border-amber-800/60', text: 'text-amber-300' },
  { bg: 'bg-[#311E28]', border: 'border-rose-800/60', text: 'text-rose-300' },
  { bg: 'bg-[#1D253A]', border: 'border-blue-800/60', text: 'text-blue-300' },
  { bg: 'bg-[#24352D]', border: 'border-teal-800/60', text: 'text-teal-300' },
  { bg: 'bg-[#32231F]', border: 'border-orange-800/60', text: 'text-orange-300' },
  { bg: 'bg-[#2A1E35]', border: 'border-fuchsia-800/60', text: 'text-fuchsia-300' },
  { bg: 'bg-[#1A2E35]', border: 'border-sky-800/60', text: 'text-sky-300' },
];

/**
 * Computes deterministic 2-letter initials for a company:
 * e.g., "Sterling Logistics India Pvt Ltd" -> "SL"
 * e.g., "CyberDynamics India Pvt Ltd" -> "CD"
 * e.g., "Nexora Infotech Pvt Ltd" -> "NI"
 */
export function getCompanyInitials(name: string): string {
  if (!name || !name.trim()) return 'CO';

  const suffixes = new Set([
    'pvt', 'ltd', 'private', 'limited', 'llp', 'inc', 'llc', 
    'corp', 'co', 'technologies', 'solutions', 'systems', 'india'
  ]);

  const rawWords = name.trim().split(/\s+/);
  const firstWord = rawWords[0];

  // Handle camelCase words (e.g. CyberDynamics -> CD, BioTech -> BT)
  const camelMatches = firstWord.match(/^([A-Z][a-z]+)([A-Z])/);
  if (camelMatches && rawWords.length <= 4) {
    return (firstWord[0] + camelMatches[2]).toUpperCase();
  }

  // Filter out legal/regional entity suffixes
  const filteredWords = rawWords.filter(
    (w) => !suffixes.has(w.toLowerCase().replace(/[^a-z]/g, ''))
  );

  const words = filteredWords.length > 0 ? filteredWords : rawWords;

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  if (words.length === 1) {
    const single = words[0].replace(/[^a-zA-Z]/g, '');
    return (single.substring(0, 2) || 'CO').toUpperCase();
  }

  return 'CO';
}

function getCompanyColor(companyName: string) {
  let hash = 0;
  for (let i = 0; i < companyName.length; i++) {
    hash = companyName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLOR_PALETTES.length;
  return AVATAR_COLOR_PALETTES[index];
}

export const CompanyAvatar: React.FC<CompanyAvatarProps> = ({
  name,
  logoUrl,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-8 h-8 sm:w-9 sm:h-9 text-xs',
    lg: 'w-10 h-10 sm:w-11 sm:h-11 text-sm',
  }[size];

  // If a valid logo URL is provided and has not failed to load
  if (logoUrl && !imageError) {
    return (
      <div 
        className={`${sizeClasses} rounded-full overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 flex items-center justify-center shadow-xs select-none ${className}`}
        title={name}
      >
        <img 
          src={logoUrl} 
          alt={name}
          className="w-full h-full object-cover rounded-full"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Fallback to 2-letter initials
  const initials = getCompanyInitials(name);
  const color = getCompanyColor(name);

  return (
    <div 
      className={`${sizeClasses} rounded-full flex items-center justify-center font-bold font-mono tracking-wider shrink-0 select-none border shadow-xs ${color.bg} ${color.border} ${color.text} ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
};

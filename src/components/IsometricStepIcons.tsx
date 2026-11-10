import React from 'react';

export const IngestionWireframeIcon: React.FC = () => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
    {/* Base slab */}
    <polygon points="40,25 65,37 40,49 15,37" fill="#1E1B4B" fillOpacity="0.4" stroke="#6366F1" strokeWidth="1.2" strokeDasharray="3 2" />
    {/* Middle slab */}
    <polygon points="40,18 65,30 40,42 15,30" fill="#312E81" fillOpacity="0.4" stroke="#818CF8" strokeWidth="1.2" />
    {/* Top slab */}
    <polygon points="40,11 65,23 40,35 15,23" fill="#4338CA" fillOpacity="0.6" stroke="#A5B4FC" strokeWidth="1.4" />
    {/* Pulse node */}
    <circle cx="40" cy="23" r="2.5" fill="#FFFFFF" />
    {/* Vertical connecting lines */}
    <line x1="15" y1="23" x2="15" y2="37" stroke="#6366F1" strokeWidth="0.8" opacity="0.6" />
    <line x1="65" y1="23" x2="65" y2="37" stroke="#6366F1" strokeWidth="0.8" opacity="0.6" />
    <line x1="40" y1="35" x2="40" y2="49" stroke="#6366F1" strokeWidth="0.8" opacity="0.6" />
  </svg>
);

export const ScoringWireframeIcon: React.FC = () => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
    {/* Isometric cube wireframe */}
    <polygon points="40,12 66,26 40,40 14,26" fill="#2E1065" fillOpacity="0.4" stroke="#A855F7" strokeWidth="1.2" />
    <polygon points="14,26 40,40 40,68 14,54" fill="#3B0764" fillOpacity="0.3" stroke="#A855F7" strokeWidth="1.2" />
    <polygon points="40,40 66,26 66,54 40,68" fill="#581C87" fillOpacity="0.4" stroke="#C084FC" strokeWidth="1.2" />
    {/* Center node */}
    <circle cx="40" cy="40" r="3" fill="#F472B6" />
    <circle cx="66" cy="26" r="2" fill="#C084FC" />
    <circle cx="14" cy="26" r="2" fill="#A855F7" />
    <circle cx="40" cy="68" r="2" fill="#818CF8" />
  </svg>
);

export const DispatchWireframeIcon: React.FC = () => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
    {/* Multi-tier isometric plane with vectors */}
    <polygon points="40,16 68,30 40,44 12,30" fill="#0C4A6E" fillOpacity="0.3" stroke="#38BDF8" strokeWidth="1.2" />
    {/* Outgoing channel branches */}
    <line x1="40" y1="30" x2="68" y2="16" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="2 2" />
    <circle cx="68" cy="16" r="2.5" fill="#38BDF8" />
    <line x1="40" y1="30" x2="12" y2="16" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="2 2" />
    <circle cx="12" cy="16" r="2.5" fill="#38BDF8" />
    <line x1="40" y1="30" x2="40" y2="58" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="2 2" />
    <circle cx="40" cy="58" r="2.5" fill="#38BDF8" />
    {/* Core node */}
    <circle cx="40" cy="30" r="3.5" fill="#FFFFFF" />
  </svg>
);

export const SettlementWireframeIcon: React.FC = () => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
    {/* Isometric base with check mark & vault */}
    <polygon points="40,18 68,32 40,46 12,32" fill="#064E3B" fillOpacity="0.4" stroke="#34D399" strokeWidth="1.2" />
    <polygon points="12,32 40,46 40,64 12,50" fill="#065F46" fillOpacity="0.3" stroke="#10B981" strokeWidth="1.2" />
    <polygon points="40,46 68,32 68,50 40,64" fill="#047857" fillOpacity="0.4" stroke="#34D399" strokeWidth="1.2" />
    {/* Checkmark in center */}
    <path d="M 33,32 L 38,37 L 48,27" stroke="#A7F3D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

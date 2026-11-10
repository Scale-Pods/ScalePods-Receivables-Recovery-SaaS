import React from 'react';
import { Zap, Coins, GitCommit, Settings } from 'lucide-react';

export const GlowingOrbitalHeroGraphic: React.FC = () => {
  return (
    <div className="relative w-full max-w-[620px] lg:max-w-[660px] mx-auto flex items-center justify-center select-none py-6">
      
      {/* 1. Volumetric Deep Ambient Glow behind center */}
      <div className="absolute w-[500px] h-[400px] bg-gradient-to-tr from-purple-700/25 via-indigo-600/20 to-blue-600/10 rounded-full blur-[110px] pointer-events-none -z-10" />
      <div className="absolute w-[280px] h-[220px] bg-purple-500/30 rounded-full blur-[75px] pointer-events-none -z-10 translate-y-6" />

      {/* 2. Main SVG Graphic: Elliptical Orbits + High-End 3D Beveled Token Puck + Stalks */}
      <svg
        viewBox="0 0 640 440"
        className="w-full h-auto overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Intense Neon Filter for Orbits & Beacons */}
          <filter id="neonGlowIntense" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft Diffuse Glow for Puck Atmosphere */}
          <filter id="puckSoftGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* 3D Cylindrical Horizontal Curvature Lighting (gives real round metallic body) */}
          <linearGradient id="cylinder3DCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0B0C18" />
            <stop offset="12%" stopColor="#1E193C" />
            <stop offset="28%" stopColor="#322462" />
            <stop offset="48%" stopColor="#16142E" />
            <stop offset="68%" stopColor="#30235C" />
            <stop offset="84%" stopColor="#6041AD" />
            <stop offset="94%" stopColor="#352366" />
            <stop offset="100%" stopColor="#100E20" />
          </linearGradient>

          {/* Cylinder Vertical Falloff Gradient (shadowed base) */}
          <linearGradient id="cylinderVerticalFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.75" />
          </linearGradient>

          {/* Top Surface Recessed Face Radial Highlight */}
          <radialGradient id="puckTopFaceGrad" cx="48%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#322A66" />
            <stop offset="35%" stopColor="#1B173E" />
            <stop offset="70%" stopColor="#100E26" />
            <stop offset="100%" stopColor="#080718" />
          </radialGradient>

          {/* Metallic Bevel Ring Linear Gradient */}
          <linearGradient id="metallicBevelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4338CA" />
            <stop offset="25%" stopColor="#818CF8" />
            <stop offset="50%" stopColor="#C084FC" />
            <stop offset="75%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>

          {/* Inner Recessed Bevel Lip */}
          <linearGradient id="innerLipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#080714" />
            <stop offset="100%" stopColor="#533F94" />
          </linearGradient>

          {/* Upward Volumetric Light Shaft Cone */}
          <linearGradient id="verticalLightShaft" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.35" />
            <stop offset="35%" stopColor="#6366F1" stopOpacity="0.14" />
            <stop offset="80%" stopColor="#4F46E5" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#312E81" stopOpacity="0" />
          </linearGradient>

          {/* Floor Volumetric Ambient Radial */}
          <radialGradient id="floorVolumetricGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.55" />
            <stop offset="35%" stopColor="#4338CA" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#1E1B4B" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#07080E" stopOpacity="0" />
          </radialGradient>

          {/* Outer Orbital Line Fade */}
          <linearGradient id="orbitGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4338CA" stopOpacity="0.1" />
            <stop offset="30%" stopColor="#818CF8" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#A855F7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#4338CA" stopOpacity="0.1" />
          </linearGradient>

          {/* Monogram Glyph Luminous Gradient */}
          <linearGradient id="glyphGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="30%" stopColor="#F3E8FF" />
            <stop offset="70%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
        </defs>

        {/* --- FLOOR VOLUMETRIC ILLUMINATION UNDER DISC --- */}
        <ellipse
          cx="330"
          cy="260"
          rx="240"
          ry="105"
          fill="url(#floorVolumetricGlow)"
          className="animate-pulse"
          style={{ animationDuration: '4s' }}
        />

        {/* --- UPWARD VOLUMETRIC LIGHT CONE SHAFT (matching reference atmosphere) --- */}
        <polygon
          points="270,235 390,235 450,50 210,50"
          fill="url(#verticalLightShaft)"
          pointerEvents="none"
        />

        {/* --- ORBITAL TRACK 1: OUTER ELLIPSE --- */}
        <ellipse
          cx="330"
          cy="245"
          rx="275"
          ry="112"
          stroke="url(#orbitGrad1)"
          strokeWidth="1.2"
          strokeDasharray="4 4"
          opacity="0.65"
        />

        {/* --- ORBITAL TRACK 2: MIDDLE BRIGHT ELLIPSE (MAIN HIGHWAY) --- */}
        <ellipse
          cx="330"
          cy="245"
          rx="205"
          ry="84"
          stroke="#818CF8"
          strokeWidth="1.5"
          strokeOpacity="0.6"
          filter="url(#neonGlowIntense)"
        />
        <ellipse
          cx="330"
          cy="245"
          rx="205"
          ry="84"
          stroke="#EEF2FF"
          strokeWidth="0.8"
          strokeOpacity="0.85"
        />

        {/* --- ORBITAL TRACK 3: INNER ELLIPSE --- */}
        <ellipse
          cx="330"
          cy="245"
          rx="138"
          ry="57"
          stroke="#6366F1"
          strokeWidth="1"
          strokeDasharray="2 3"
          strokeOpacity="0.55"
        />

        {/* --- ORBITAL PARTICLES & SATELLITE BEACONS WITH ANCHOR LINES --- */}

        {/* 1. Left Middle Orbit Node (Anchor for [ ⚡ INSTANT SETTLEMENT ]) */}
        <g>
          <line
            x1="170"
            y1="195"
            x2="170"
            y2="125"
            stroke="#818CF8"
            strokeWidth="1.2"
            strokeDasharray="2 2"
            strokeOpacity="0.75"
          />
          <circle cx="170" cy="195" r="5" fill="#A855F7" filter="url(#neonGlowIntense)" />
          <circle cx="170" cy="195" r="2.2" fill="#FFFFFF" />
          <circle cx="170" cy="125" r="2.5" fill="#818CF8" />
        </g>

        {/* 2. Right Middle Orbit Node (Anchor for [ 🪙 LOW FEES ]) */}
        <g>
          <line
            x1="510"
            y1="210"
            x2="510"
            y2="148"
            stroke="#818CF8"
            strokeWidth="1.2"
            strokeDasharray="2 2"
            strokeOpacity="0.75"
          />
          <circle cx="510" cy="210" r="5" fill="#818CF8" filter="url(#neonGlowIntense)" />
          <circle cx="510" cy="210" r="2.2" fill="#FFFFFF" />
          <circle cx="510" cy="148" r="2.5" fill="#818CF8" />
        </g>

        {/* 3. Bottom-Right Middle Orbit Node (Anchor for [ ⚙ ] and [ AUTOMATED WORKFLOWS ]) */}
        <g>
          <circle cx="435" cy="312" r="5" fill="#A855F7" filter="url(#neonGlowIntense)" />
          <circle cx="435" cy="312" r="2.2" fill="#FFFFFF" />
          <line
            x1="435"
            y1="312"
            x2="435"
            y2="335"
            stroke="#C084FC"
            strokeWidth="1"
            strokeDasharray="2 2"
            strokeOpacity="0.6"
          />
        </g>

        {/* 4. Left outer orbit node */}
        <g>
          <circle cx="95" cy="235" r="4" fill="#818CF8" filter="url(#neonGlowIntense)" />
          <circle cx="95" cy="235" r="1.8" fill="#FFFFFF" />
        </g>

        {/* 5. Right outer orbit node */}
        <g>
          <circle cx="575" cy="270" r="3.5" fill="#818CF8" filter="url(#neonGlowIntense)" />
          <circle cx="575" cy="270" r="1.6" fill="#FFFFFF" />
        </g>

        {/* ========================================================================= */}
        {/* --- PREMIUM 3D BEVELED TOKEN PUCK (FAITHFUL TO SCREENSHOT) --- */}
        {/* ========================================================================= */}
        <g className="transition-transform duration-500 hover:scale-[1.03]">
          
          {/* 1. Puck Base Contact Shadow & Floor Aura */}
          <ellipse
            cx="330"
            cy="266"
            rx="92"
            ry="38"
            fill="#7C3AED"
            opacity="0.42"
            filter="url(#neonGlowIntense)"
          />
          <ellipse
            cx="330"
            cy="264"
            rx="86"
            ry="35"
            fill="#06060F"
            opacity="0.9"
          />

          {/* 2. 3D Cylindrical Vertical Body (Horizontal curvature gradient) */}
          <path
            d="
              M 242,234 
              C 242,256 281,273 330,273 
              C 379,273 418,256 418,234 
              L 418,260 
              C 418,282 379,299 330,299 
              C 281,299 242,282 242,260 
              Z
            "
            fill="url(#cylinder3DCurveGrad)"
          />

          {/* Vertical shadow/highlight overlay on cylinder side */}
          <path
            d="
              M 242,234 
              C 242,256 281,273 330,273 
              C 379,273 418,256 418,234 
              L 418,260 
              C 418,282 379,299 330,299 
              C 281,299 242,282 242,260 
              Z
            "
            fill="url(#cylinderVerticalFade)"
            opacity="0.4"
          />

          {/* Cylinder side contour stroke */}
          <path
            d="
              M 242,234 
              C 242,256 281,273 330,273 
              C 379,273 418,256 418,234 
              L 418,260 
              C 418,282 379,299 330,299 
              C 281,299 242,282 242,260 
              Z
            "
            stroke="#412F75"
            strokeWidth="0.8"
            fill="none"
          />

          {/* 3. Bottom Base Glowing Rim Line (neon contour at bottom) */}
          <path
            d="
              M 242,260 
              C 242,282 281,299 330,299 
              C 379,299 418,282 418,260
            "
            stroke="#7C3AED"
            strokeWidth="2.8"
            fill="none"
            filter="url(#neonGlowIntense)"
            opacity="0.85"
          />
          <path
            d="
              M 242,260 
              C 242,282 281,299 330,299 
              C 379,299 418,282 418,260
            "
            stroke="#E9D5FF"
            strokeWidth="1"
            fill="none"
            opacity="0.9"
          />

          {/* 4. Outer Top Rim Bevel Ring */}
          <ellipse
            cx="330"
            cy="234"
            rx="88"
            ry="37"
            fill="#181535"
            stroke="url(#metallicBevelGrad)"
            strokeWidth="2.6"
            filter="url(#puckSoftGlow)"
          />

          {/* 5. Inset Recessed Chamber (Tier 2 of Puck) */}
          <ellipse
            cx="330"
            cy="234"
            rx="84"
            ry="35"
            fill="#0F0D24"
            stroke="url(#innerLipGrad)"
            strokeWidth="2"
          />

          {/* 6. Top Surface Smooth Glass Face */}
          <ellipse
            cx="330"
            cy="234"
            rx="80"
            ry="33"
            fill="url(#puckTopFaceGrad)"
            stroke="#6366F1"
            strokeWidth="1.2"
            strokeOpacity="0.85"
          />

          {/* 7. Concentric Subtle Circular Guide Lines on Face */}
          <ellipse
            cx="330"
            cy="234"
            rx="66"
            ry="27"
            stroke="#A855F7"
            strokeWidth="0.8"
            strokeDasharray="4 3"
            fill="none"
            opacity="0.55"
          />
          <ellipse
            cx="330"
            cy="234"
            rx="48"
            ry="20"
            stroke="#818CF8"
            strokeWidth="0.6"
            strokeOpacity="0.35"
            fill="none"
          />

          {/* Center Subtle Glow Aura for the Glyph */}
          <ellipse
            cx="330"
            cy="234"
            rx="35"
            ry="15"
            fill="#7C3AED"
            opacity="0.5"
            filter="url(#neonGlowIntense)"
          />

          {/* 8. Crisp Geometric Monogram Centerpiece */}
          <g transform="translate(330, 234)">
            
            {/* Soft Shadow behind glyph */}
            <g transform="translate(0, 2) scale(1, 0.42)">
              <path
                d="M -16,-18 L 6,-18 C 16,-18 22,-11 22,0 C 22,9 15,16 6,18 L 19,34 L 6,34 L -5,18 L -16,18 L -16,34 L -26,34 L -26,-18 Z M -16,8 L 5,8 C 10,8 13,5 13,0 C 13,-5 10,-8 5,-8 L -16,-8 Z"
                fill="#000000"
                opacity="0.65"
              />
            </g>

            {/* Neon Violet Glow Layer */}
            <g transform="scale(1, 0.42)">
              <path
                d="M -16,-18 L 6,-18 C 16,-18 22,-11 22,0 C 22,9 15,16 6,18 L 19,34 L 6,34 L -5,18 L -16,18 L -16,34 L -26,34 L -26,-18 Z M -16,8 L 5,8 C 10,8 13,5 13,0 C 13,-5 10,-8 5,-8 L -16,-8 Z"
                fill="#A855F7"
                filter="url(#neonGlowIntense)"
                opacity="0.85"
              />
            </g>

            {/* Front Crisp Luminous Face */}
            <g transform="scale(1, 0.42)">
              <path
                d="M -16,-18 L 6,-18 C 16,-18 22,-11 22,0 C 22,9 15,16 6,18 L 19,34 L 6,34 L -5,18 L -16,18 L -16,34 L -26,34 L -26,-18 Z M -16,8 L 5,8 C 10,8 13,5 13,0 C 13,-5 10,-8 5,-8 L -16,-8 Z"
                fill="url(#glyphGlowGrad)"
              />
              {/* Inner Specular Highlight */}
              <path
                d="M -16,-16 L 5,-16 C 13,-16 19,-10 19,0 C 19,8 14,14 5,16 L 17,31 L 8,31 L -4,16 L -16,16 Z"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                fill="none"
                opacity="0.8"
              />
            </g>
          </g>

        </g>

      </svg>

      {/* --- FLOATING CALLOUT PILLS (EXACT PLACEMENT & STYLING FROM SCREENSHOT) --- */}

      {/* 1. TOP-LEFT PILL: [ ⚡ INSTANT SETTLEMENT ] */}
      <div 
        className="absolute top-[16%] left-[4%] sm:left-[8%] px-3.5 py-1.5 rounded-xl bg-[#090A14]/90 border border-purple-500/40 text-xs font-mono font-semibold text-white shadow-[0_0_25px_rgba(124,58,237,0.35)] backdrop-blur-md flex items-center gap-2 hover:border-purple-400 transition-all hover:scale-105 cursor-default group"
      >
        <Zap className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300 transition-colors" />
        <span className="tracking-wider text-[11px] sm:text-xs">INSTANT SETTLEMENT</span>
      </div>

      {/* 2. TOP-RIGHT PILL: [ 🪙 LOW FEES ] */}
      <div 
        className="absolute top-[21%] right-[4%] sm:right-[7%] px-3.5 py-1.5 rounded-xl bg-[#090A14]/90 border border-indigo-500/40 text-xs font-mono font-semibold text-white shadow-[0_0_25px_rgba(99,102,241,0.3)] backdrop-blur-md flex items-center gap-2 hover:border-indigo-400 transition-all hover:scale-105 cursor-default group"
      >
        <Coins className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
        <span className="tracking-wider text-[11px] sm:text-xs">LOW FEES</span>
      </div>

      {/* 3. BOTTOM-RIGHT CLUSTER: [ ⚙ ] + [ ⦓ AUTOMATED WORKFLOWS ] (DOCKED TOGETHER) */}
      <div className="absolute bottom-[14%] right-[8%] sm:right-[14%] flex items-center gap-2">
        
        {/* Gear Box Badge */}
        <div 
          className="w-7 h-7 rounded-lg bg-[#0E1022]/95 border border-blue-500/50 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] backdrop-blur-md hover:scale-110 transition-transform cursor-default"
          title="Engine Automation Node"
        >
          <Settings className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: '14s' }} />
        </div>

        {/* Automated Workflows Pill */}
        <div 
          className="px-3.5 py-1.5 rounded-xl bg-[#090A14]/90 border border-purple-500/40 text-xs font-mono font-semibold text-white shadow-[0_0_25px_rgba(124,58,237,0.35)] backdrop-blur-md flex items-center gap-2 hover:border-purple-400 transition-all hover:scale-105 cursor-default group"
        >
          <GitCommit className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300 transition-colors" />
          <span className="tracking-wider text-[11px] sm:text-xs">AUTOMATED WORKFLOWS</span>
        </div>

      </div>

    </div>
  );
};

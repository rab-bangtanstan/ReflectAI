import React from 'react';
import { EnergyLevel, MoodTone } from '../types';

export interface GradientStep {
  level: 1 | 2 | 3 | 4;
  name: string;
  colorName: string;
  hex: string;
  bgHex: string;
  borderHex: string;
  energyTitle: string;
  energySub: string;
  moodTitle: string;
  moodSub: string;
}

export const GRADIENT_STEPS: Record<1 | 2 | 3 | 4, GradientStep> = {
  1: {
    level: 1,
    name: 'Mist',
    colorName: 'Slate Mist',
    hex: '#52595C',
    bgHex: '#EAEBEB',
    borderHex: '#9DA5A8',
    energyTitle: 'Resting',
    energySub: 'Low reserves, quiet pace',
    moodTitle: 'Foggy',
    moodSub: 'Sluggish or heavy thoughts'
  },
  2: {
    level: 2,
    name: 'Heather',
    colorName: 'Dusk Heather',
    hex: '#6B5E7E',
    bgHex: '#F2EFF7',
    borderHex: '#B6ABC6',
    energyTitle: 'Steady',
    energySub: 'Conserving energy',
    moodTitle: 'Pondering',
    moodSub: 'Reflective and introspective'
  },
  3: {
    level: 3,
    name: 'Sage',
    colorName: 'Quiet Sage',
    hex: '#2B6B55',
    bgHex: '#E3ECE7',
    borderHex: '#78A996',
    energyTitle: 'Grounded',
    energySub: 'Calm presence, centered',
    moodTitle: 'Calm',
    moodSub: 'Settled, clear, at ease'
  },
  4: {
    level: 4,
    name: 'Amber',
    colorName: 'Sunlit Amber',
    hex: '#BD7014',
    bgHex: '#FBF1E4',
    borderHex: '#E5B880',
    energyTitle: 'Radiant',
    energySub: 'Vibrant and inspired',
    moodTitle: 'Lifted',
    moodSub: 'Warm, grateful, bright'
  }
};

/**
 * The Concentric Ripple (Pebble in Still Water)
 * Distinctive ReflectAI brand mark built from the mood-gradient palette:
 * Slate Mist (#52595C) → Dusk Heather (#6B5E7E) → Quiet Sage (#2B6B55) → Sunlit Amber (#BD7014)
 * Symbolizes a mindful thought or memory dropping into still consciousness,
 * radiating outward in calm, expanding ripples.
 */
export const ConcentricRippleMark: React.FC<{
  size?: number;
  className?: string;
  id?: string;
}> = ({ size = 28, className = '', id = 'concentric-ripple-logo' }) => {
  return (
    <svg
      id={id}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform ${className}`}
      aria-label="ReflectAI Concentric Ripple mark"
    >
      {/* Outer Ripple Wave: Slate Mist (#52595C) */}
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="#52595C"
        strokeWidth="1.4"
        strokeOpacity="0.85"
      />
      
      {/* Mid-Frequency Ripple: Dusk Heather (#6B5E7E) */}
      <circle
        cx="16"
        cy="16"
        r="10"
        stroke="#6B5E7E"
        strokeWidth="1.75"
        strokeOpacity="0.95"
      />
      
      {/* Inner Sanctuary Ring: Quiet Sage (#2B6B55) */}
      <circle
        cx="16"
        cy="16"
        r="6.2"
        stroke="#2B6B55"
        strokeWidth="2.1"
      />
      
      {/* Center Pebble / Amber Droplet: Sunlit Amber (#BD7014) */}
      <circle
        cx="16"
        cy="16"
        r="3.1"
        fill="#BD7014"
      />
      
      {/* Luminous sunlit glint on the droplet */}
      <circle
        cx="15"
        cy="15"
        r="0.85"
        fill="#FFFFFF"
        opacity="0.75"
      />
    </svg>
  );
};

// Backwards-compatible alias for existing components
export const LivingQuillMark = ConcentricRippleMark;

/**
 * Concrete tactile SVG glyphs for each point on the gradient.
 * Avoids generic emoji or flat text.
 */
export const TokenGlyph: React.FC<{
  level: 1 | 2 | 3 | 4;
  className?: string;
  strokeWidth?: number;
}> = ({ level, className = 'w-5 h-5', strokeWidth = 1.5 }) => {
  switch (level) {
    case 1:
      // Slate Mist: Horizontal resting lines & serene misty vapor
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M4 15h16" />
          <path d="M7 11c1-1 2-1 3 0s2 1 3 0 2-1 3 0" />
          <path d="M6 19h12" />
        </svg>
      );
    case 2:
      // Dusk Heather: Contemplative crescent curve with interior focal pebble
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M16 4a8 8 0 1 0 0 16 9 9 0 0 1 0-16z" />
          <circle cx="10" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
    case 3:
      // Quiet Sage: Grounded river stone / leaf balance
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M12 3C8 8 7 13 8 18a5 5 0 0 0 8 0c1-5 0-10-4-15z" />
          <path d="M12 9v7" />
        </svg>
      );
    case 4:
      // Sunlit Amber: Radiant solar spark
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
        </svg>
      );
  }
};

interface TokenSelectorProps {
  idPrefix: string;
  type: 'energy' | 'mood';
  value?: 1 | 2 | 3 | 4;
  onChange: (val: 1 | 2 | 3 | 4) => void;
  disabled?: boolean;
}

/**
 * Concrete tactile selector for Daily Check-in questions 1 & 2.
 * Equal visual weight, generous hit targets, accessible keyboard navigation.
 */
export const TokenSelector: React.FC<TokenSelectorProps> = ({
  idPrefix,
  type,
  value,
  onChange,
  disabled = false
}) => {
  const steps: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

  return (
    <div 
      role="radiogroup" 
      aria-label={type === 'energy' ? 'Select daily energy reserve' : 'Select emotional mood'}
      className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
    >
      {steps.map((level) => {
        const step = GRADIENT_STEPS[level];
        const isSelected = value === level;
        const title = type === 'energy' ? step.energyTitle : step.moodTitle;
        const sub = type === 'energy' ? step.energySub : step.moodSub;

        return (
          <button
            key={level}
            id={`${idPrefix}-step-${level}`}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(level)}
            className={`group relative text-left p-3.5 transition-all cursor-pointer rounded-xs border select-none ${
              isSelected
                ? 'shadow-xs ring-1'
                : 'hover:border-[#9DA5A8] bg-[#FDFAF6]'
            }`}
            style={{
              backgroundColor: isSelected ? step.bgHex : undefined,
              borderColor: isSelected ? step.hex : '#DCD5C9',
              color: isSelected ? '#242728' : '#52595C'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div 
                className="w-7 h-7 rounded-xs flex items-center justify-center transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: isSelected ? '#FDFAF6' : step.bgHex,
                  color: step.hex
                }}
              >
                <TokenGlyph level={level} className="w-4 h-4" />
              </div>
              <span 
                className="font-sans text-[11px] font-semibold"
                style={{ color: isSelected ? step.hex : '#70706B' }}
              >
                {step.name}
              </span>
            </div>

            <div className="space-y-0.5">
              <p className="font-serif text-base font-normal text-[#242728] leading-tight">
                {title}
              </p>
              <p className="font-sans text-[11px] text-[#52595C] leading-snug">
                {sub}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Connected Mood Score Visualization:
 * Displays where the reflection sits along the shared gradient
 * (Slate Mist → Dusk Heather → Quiet Sage → Sunlit Amber).
 */
export const MoodScoreVisualizer: React.FC<{
  score: number; // 1 to 4 (or 1 to 10 mapped)
  detectedMood?: string;
}> = ({ score, detectedMood }) => {
  // Normalize score to 1..4 scale
  const normScore = Math.max(1, Math.min(4, Math.round(score > 4 ? (score / 10) * 4 : score))) as 1 | 2 | 3 | 4;
  const currentStep = GRADIENT_STEPS[normScore];

  return (
    <div className="p-4 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs space-y-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-6 h-6 rounded-xs flex items-center justify-center"
            style={{ backgroundColor: currentStep.bgHex, color: currentStep.hex }}
          >
            <TokenGlyph level={normScore} className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-sans text-[11px] text-[#52595C] block leading-none">
              Resonance & Mood
            </span>
            <p className="font-serif text-base text-[#242728] font-normal leading-tight mt-0.5">
              {detectedMood || currentStep.moodTitle}
            </p>
          </div>
        </div>

        <span 
          className="font-sans text-xs px-2.5 py-0.5 rounded-full font-medium"
          style={{ 
            backgroundColor: currentStep.bgHex, 
            color: currentStep.hex, 
            borderColor: currentStep.borderHex 
          }}
        >
          {currentStep.name} ({normScore} of 4)
        </span>
      </div>

      {/* Shared Gradient Spectrum Line with Deepened Saturation */}
      <div className="space-y-1.5">
        <div className="relative h-2.5 w-full rounded-full overflow-hidden bg-[#EAEBEB]">
          {/* Continuous gradient of the 4 colors */}
          <div 
            className="absolute inset-0" 
            style={{
              background: 'linear-gradient(to right, #52595C 0%, #6B5E7E 33%, #2B6B55 66%, #BD7014 100%)',
              opacity: 0.95
            }}
          />
        </div>

        {/* Legend beneath the spectrum */}
        <div className="flex justify-between font-sans text-[10px] text-[#52595C] px-0.5">
          <span>Slate Mist</span>
          <span>Dusk Heather</span>
          <span className="font-medium text-[#2B6B55]">Quiet Sage</span>
          <span className="font-medium text-[#BD7014]">Sunlit Amber</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Sparkles, RefreshCw, Feather, Quote } from 'lucide-react';

interface Inspiration {
  quote: string;
  author: string;
  prompt: string;
}

const INSPIRATIONS: Inspiration[] = [
  {
    quote: "Look well into yourself; there is a source of strength which will always spring up if you will always look.",
    author: "Marcus Aurelius",
    prompt: "What quiet reservoir of strength did you draw from today?"
  },
  {
    quote: "Pay attention. Be astonished. Tell about it.",
    author: "Mary Oliver",
    prompt: "What small astonishment did your senses capture today?"
  },
  {
    quote: "Let everything happen to you: beauty and terror. Just keep going. No feeling is final.",
    author: "Rainer Maria Rilke",
    prompt: "What feeling can you let wash through you without clinging to it?"
  },
  {
    quote: "To the mind that is still, the whole universe surrenders.",
    author: "Lao Tzu",
    prompt: "Where can you invite a breath of stillness into your thoughts right now?"
  },
  {
    quote: "Arrange whatever pieces come your way.",
    author: "Virginia Woolf",
    prompt: "What unexpected piece of the day can you accept with grace?"
  },
  {
    quote: "We do not write in order to be understood; we write in order to understand.",
    author: "C.S. Lewis",
    prompt: "What thought becomes clearer once you set it down on this page?"
  },
  {
    quote: "He who has peace and freedom in his soul is never in a hurry.",
    author: "Seneca",
    prompt: "What can you slow down or release urgency around tonight?"
  }
];

export const DailyInspirationBanner: React.FC<{
  onApplyPrompt?: (promptText: string) => void;
  className?: string;
}> = ({ onApplyPrompt, className = '' }) => {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * INSPIRATIONS.length));
  const current = INSPIRATIONS[index];

  // Time of day message
  const hour = new Date().getHours();
  let timeOfDayGreeting = 'Daily pause';
  let timeSubtext = 'A quiet space to check in with yourself.';

  if (hour >= 5 && hour < 12) {
    timeOfDayGreeting = 'Morning stillness';
    timeSubtext = 'Gather your thoughts before the world gets loud.';
  } else if (hour >= 12 && hour < 17) {
    timeOfDayGreeting = 'Midday clearing';
    timeSubtext = 'Pause, exhale, and notice where your energy is resting.';
  } else if (hour >= 17 && hour < 21) {
    timeOfDayGreeting = 'Quiet dusk';
    timeSubtext = 'Begin to unpack the weight and gifts of the day.';
  } else {
    timeOfDayGreeting = 'Night reflection';
    timeSubtext = 'Leave your worries on the paper so your mind can rest.';
  }

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % INSPIRATIONS.length);
  };

  return (
    <div className={`bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs p-5 sm:p-6 select-none relative overflow-hidden shadow-2xs ${className}`}>
      {/* Decorative subtle corner crease */}
      <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none overflow-hidden">
        <div className="w-12 h-12 bg-[#EFE9DE] border-b border-l border-[#DCD5C9] -rotate-45 origin-top-right transform translate-x-4 -translate-y-4" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#BD7014]" />
            <span className="font-sans text-xs font-medium text-[#242728] uppercase tracking-wider">
              {timeOfDayGreeting}
            </span>
            <span className="text-[#DCD5C9]">•</span>
            <span className="font-sans text-xs text-[#52595C] italic">
              {timeSubtext}
            </span>
          </div>

          <div className="pt-1 space-y-1">
            <p className="font-serif text-base sm:text-lg text-[#242728] italic leading-relaxed">
              "{current.quote}"
            </p>
            <p className="font-sans text-xs text-[#52595C]">
              &mdash; {current.author}
            </p>
          </div>

          {onApplyPrompt && (
            <div className="pt-2 flex items-center gap-2">
              <span className="font-sans text-[11px] text-[#52595C]">Thought-starter:</span>
              <button
                type="button"
                onClick={() => onApplyPrompt(current.prompt)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EFE9DE] hover:bg-[#E3ECE7] text-[#2B6B55] border border-[#DCD5C9] hover:border-[#2B6B55] rounded-xs font-sans text-xs transition-colors cursor-pointer text-left line-clamp-1"
                title="Click to copy prompt into open reflection"
              >
                <Feather className="h-3 w-3 shrink-0" />
                <span className="truncate">{current.prompt}</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleNext}
          title="Cycle to next contemplative thought"
          className="self-start sm:self-auto inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#DCD5C9] hover:border-[#BD7014] text-xs font-sans text-[#52595C] hover:text-[#242728] bg-[#FDFAF6] rounded-xs transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Next thought</span>
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, CloudRain, Flame, Wind, Sparkles } from 'lucide-react';

type SoundType = 'none' | 'rain' | 'hearth' | 'stream';

export const AmbientSoundscape: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [activeSound, setActiveSound] = useState<SoundType>('none');
  const [volume, setVolume] = useState<number>(0.35);
  const [isOpen, setIsOpen] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);

  // Initialize or resume AudioContext
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const stopCurrentSound = () => {
    if (sourceNodeRef.current) {
      try {
        (sourceNodeRef.current as any).stop?.();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Safe ignore
      }
      sourceNodeRef.current = null;
    }
  };

  const startSound = (type: SoundType) => {
    stopCurrentSound();

    if (type === 'none') {
      setActiveSound('none');
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    // Master Gain
    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.connect(ctx.destination);
    }
    gainNodeRef.current.gain.setValueAtTime(volume, ctx.currentTime);

    // Buffer Size for procedural noise
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    if (type === 'rain') {
      // Pink/Brown noise synthesis for rain drops
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Low pass filter for muffled window rain
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(gainNodeRef.current);
      whiteNoise.start(0);
      sourceNodeRef.current = whiteNoise;
      filterNodeRef.current = filter;

    } else if (type === 'hearth') {
      // Warm crackling fire: deep low rumble + random crackle pops
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 2.5;

        // Occasional crackle / ember spark
        if (Math.random() < 0.0015) {
          output[i] += (Math.random() * 2 - 1) * 0.4;
        }
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);

      noise.connect(filter);
      filter.connect(gainNodeRef.current);
      noise.start(0);
      sourceNodeRef.current = noise;
      filterNodeRef.current = filter;

    } else if (type === 'stream') {
      // Gentle bubbling water stream
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.04 * white)) / 1.03;
        lastOut = output[i];
        output[i] *= 1.8;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(620, ctx.currentTime);
      filter.Q.setValueAtTime(1.2, ctx.currentTime);

      noise.connect(filter);
      filter.connect(gainNodeRef.current);
      noise.start(0);
      sourceNodeRef.current = noise;
      filterNodeRef.current = filter;
    }

    setActiveSound(type);
  };

  // Play a soft singing bowl bell on demand
  const playSingingBowl = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const bellGain = ctx.createGain();

    osc.type = 'sine';
    // Gentle Tibetan bowl fundamental (around 432Hz / 528Hz)
    osc.frequency.setValueAtTime(432, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(428, ctx.currentTime + 3.5);

    bellGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    bellGain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.08);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.0);

    osc.connect(bellGain);
    bellGain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 4.1);
  };

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
    }
  }, [volume]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCurrentSound();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const sounds: Array<{ id: SoundType; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'none', label: 'Silence', icon: VolumeX },
    { id: 'rain', label: 'Window Rain', icon: CloudRain },
    { id: 'hearth', label: 'Warm Hearth', icon: Flame },
    { id: 'stream', label: 'Quiet Stream', icon: Wind }
  ];

  return (
    <div className={`relative select-none ${className}`}>
      <button
        id="ambient-sound-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title={activeSound === 'none' ? 'Play calming ambient sound' : `Ambience: ${activeSound}`}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-xs font-sans text-xs transition-colors cursor-pointer ${
          activeSound !== 'none'
            ? 'bg-[#E3ECE7] border-[#2B6B55] text-[#2B6B55]'
            : 'bg-[#FDFAF6] border-[#DCD5C9] text-[#52595C] hover:border-[#242728] hover:text-[#242728]'
        }`}
      >
        {activeSound !== 'none' ? (
          <>
            <Volume2 className="h-3.5 w-3.5 text-[#2B6B55] animate-pulse" />
            <span className="capitalize">{activeSound}</span>
          </>
        ) : (
          <>
            <VolumeX className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ambience</span>
          </>
        )}
      </button>

      {/* Floating Sound Sanctuary Menu */}
      {isOpen && (
        <div 
          id="ambient-sound-menu"
          className="absolute right-0 mt-2 w-64 bg-[#FDFAF6] border border-[#DCD5C9] p-4 rounded-xs shadow-md z-50 font-serif space-y-3.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[#DCD5C9] pb-2">
            <span className="font-sans text-xs text-[#52595C]">Quiet ambience</span>
            <button
              onClick={playSingingBowl}
              title="Strike Tibetan singing bowl"
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EFE9DE] border border-[#DCD5C9] hover:border-[#BD7014] text-[11px] font-sans text-[#242728] rounded-xs transition-colors cursor-pointer"
            >
              <Sparkles className="h-2.5 w-2.5 text-[#BD7014]" />
              <span>Chime</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {sounds.map((item) => {
              const Icon = item.icon;
              const isSelected = activeSound === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => startSound(item.id)}
                  className={`flex items-center gap-2 p-2 border rounded-xs text-left font-sans text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#2B6B55] text-[#FDFAF6] border-[#2B6B55]'
                      : 'bg-[#FDFAF6] border-[#DCD5C9] text-[#52595C] hover:text-[#242728] hover:border-[#242728]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {activeSound !== 'none' && (
            <div className="space-y-1 pt-1 border-t border-[#DCD5C9]">
              <div className="flex justify-between font-sans text-[11px] text-[#52595C]">
                <span>Volume</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-[#2B6B55] h-1.5 bg-[#EFE9DE] rounded-xs cursor-pointer"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

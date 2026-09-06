import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Save, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Trash2,
  Sparkles,
  Send,
  BookOpen,
  ArrowDown,
  Maximize2,
  Minimize2,
  Feather,
  Bookmark,
  Flame,
  PenTool,
  Lightbulb,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import ReactMarkdown from 'react-markdown';
import { 
  JournalEntry, 
  Message, 
  ReflectionCategory, 
  EnergyLevel, 
  MoodTone,
  ReflectionAnalysis,
  WeatherContext
} from '../types';
import { 
  TokenSelector, 
  MoodScoreVisualizer, 
  GRADIENT_STEPS, 
  TokenGlyph 
} from './MoodEnergyTokens';
import { DailyInspirationBanner } from './DailyInspirationBanner';
import { AmbientSoundscape } from './AmbientSoundscape';
import { AmbientWeatherBadge, getWeatherIcon } from './AmbientWeatherBadge';
import { useAmbientWeather } from '../hooks/useAmbientWeather';
import { getDeviceTimeDetails, getDaylightLabel } from '../utils/timeDaylight';

interface ReflectionWorkspaceProps {
  entry: JournalEntry;
  allEntries?: JournalEntry[];
  onUpdateEntry: (updated: JournalEntry) => Promise<void>;
  onDeleteEntry?: (entryId: string) => void;
  onFocusModeChange?: (active: boolean) => void;
  userId: string;
}

const CATEGORIES: ReflectionCategory[] = [
  'Daily Reflection',
  'Mindfulness',
  'Gratitude',
  'Personal Growth',
  'Brainstorming',
  'Problem Solving'
];

const THOUGHT_SPARKS: Record<string, string[]> = {
  mentalEnergy: [
    'A conversation that lingered',
    'Unfinished work task or deadline',
    'Anticipation of tomorrow',
    'A creative idea wanting attention',
    'Mental fatigue or feeling scattered'
  ],
  standoutMoment: [
    'Warm cup of tea in both hands',
    'Late afternoon sun slanting on the wall',
    'Quiet moment before the day started',
    'A shared, unexpected laugh',
    'Cool fresh breeze during a walk'
  ],
  smallWin: [
    'Stepped outside for fresh air',
    'Sent a note I was putting off',
    'Chose patience over frustration',
    'Gave myself permission to rest',
    'Cooked a nourishing meal'
  ],
  freeText: [
    'What am I ready to release tonight?',
    'Where did I feel most like myself today?',
    'What is one quiet thing I am grateful for?',
    'What words of gentleness can I offer myself?'
  ]
};

export const ReflectionWorkspace: React.FC<ReflectionWorkspaceProps> = ({
  entry,
  allEntries = [],
  onUpdateEntry,
  onDeleteEntry,
  onFocusModeChange,
  userId
}) => {
  // Check-in answers state initialized from entry or local draft
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(entry.energyLevel || 3);
  const [moodTone, setMoodTone] = useState<MoodTone>(entry.moodTone || 3);
  const [mentalEnergy, setMentalEnergy] = useState<string>(entry.mentalEnergy || '');
  const [standoutMoment, setStandoutMoment] = useState<string>(entry.standoutMoment || '');
  const [smallWin, setSmallWin] = useState<string>(entry.smallWin || '');
  const [freeText, setFreeText] = useState<string>(entry.freeText || entry.initialPrompt || '');

  // Ambient weather and local time/daylight awareness
  const ambient = useAmbientWeather();
  const deviceTime = getDeviceTimeDetails();

  // Focus Candlelight Mode
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Synchronize focus mode with parent container
  useEffect(() => {
    onFocusModeChange?.(isFocusMode);
  }, [isFocusMode, onFocusModeChange]);

  // Active thought sparks open states
  const [showSparks, setShowSparks] = useState<Record<string, boolean>>({});

  // Active analysis result
  const [analysis, setAnalysis] = useState<ReflectionAnalysis | undefined>(entry.analysis);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Follow-up conversation prompt
  const [followUpPrompt, setFollowUpPrompt] = useState('');
  const [isAiReplying, setIsAiReplying] = useState(false);

  // Persistence indicators
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Debounce timer and pending changes ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Partial<JournalEntry>>({});
  const entryRef = useRef<JournalEntry>(entry);
  entryRef.current = entry;
  const lastAttemptedEntryRef = useRef<JournalEntry | null>(null);

  // Track if user wants to see the analysis section
  const analysisRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Clean up debounce timer and flush pending updates on unmount/lifecycle exit
  const flushPending = () => {
    if (Object.keys(pendingUpdatesRef.current).length > 0) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const flushEntry: JournalEntry = {
        ...entryRef.current,
        ...pendingUpdatesRef.current,
        updatedAt: new Date().toISOString()
      };
      lastAttemptedEntryRef.current = flushEntry;
      pendingUpdatesRef.current = {};
      void onUpdateEntry(flushEntry).catch((err) => {
        console.warn('Flush on exit warning (persisted locally):', err);
      });
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPending();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', flushPending);
    window.addEventListener('beforeunload', flushPending);

    return () => {
      flushPending();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', flushPending);
      window.removeEventListener('beforeunload', flushPending);
    };
  }, []);

  // Escape key exits focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  // Synchronize state when selected entry changes
  useEffect(() => {
    setEnergyLevel(entry.energyLevel || 3);
    setMoodTone(entry.moodTone || 3);
    setMentalEnergy(entry.mentalEnergy || '');
    setStandoutMoment(entry.standoutMoment || '');
    setSmallWin(entry.smallWin || '');
    setFreeText(entry.freeText || entry.initialPrompt || '');
    setAnalysis(entry.analysis);
    setFollowUpPrompt('');
    setErrorBanner(null);
  }, [entry.id]);

  // Count how many of the 6 check-in questions are answered
  const answeredCount = [
    Boolean(energyLevel),
    Boolean(moodTone),
    Boolean(mentalEnergy.trim()),
    Boolean(standoutMoment.trim()),
    Boolean(smallWin.trim()),
    Boolean(freeText.trim())
  ].filter(Boolean).length;

  // Words count & pause estimate
  const totalWords = useMemo(() => {
    return [mentalEnergy, standoutMoment, smallWin, freeText]
      .join(' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }, [mentalEnergy, standoutMoment, smallWin, freeText]);

  // Memory Pebble: Retrieve a poignant moment from past reflections
  const pastEcho = useMemo(() => {
    if (!allEntries || allEntries.length <= 1) return null;
    const others = allEntries.filter(e => e.id !== entry.id);
    const withDetails = others.filter(e => e.standoutMoment || e.smallWin || e.freeText);
    const target = withDetails.length > 0 ? withDetails[0] : others[0];
    if (!target) return null;

    const quote = target.standoutMoment || target.smallWin || target.freeText || target.title;
    if (!quote || quote.length < 5) return null;

    const targetDate = new Date(target.createdAt || target.updatedAt);
    const diffDays = Math.round((Date.now() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
    let timeStr = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (diffDays === 1) timeStr = 'Yesterday';
    else if (diffDays > 1 && diffDays < 7) timeStr = `${diffDays} days ago`;

    return {
      text: quote,
      time: timeStr,
      title: target.title
    };
  }, [allEntries, entry.id]);

  const toggleSparks = (field: string) => {
    setShowSparks(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleApplySpark = (field: string, text: string) => {
    if (field === 'mentalEnergy') {
      const updated = mentalEnergy ? `${mentalEnergy}. ${text}` : text;
      setMentalEnergy(updated);
      persistChanges({ mentalEnergy: updated });
    } else if (field === 'standoutMoment') {
      const updated = standoutMoment ? `${standoutMoment}. ${text}` : text;
      setStandoutMoment(updated);
      persistChanges({ standoutMoment: updated });
    } else if (field === 'smallWin') {
      const updated = smallWin ? `${smallWin}. ${text}` : text;
      setSmallWin(updated);
      persistChanges({ smallWin: updated });
    } else if (field === 'freeText') {
      const updated = freeText ? `${freeText}\n\n${text}` : text;
      setFreeText(updated);
      persistChanges({ freeText: updated });
    }
    // Close spark drawer for this field
    setShowSparks(prev => ({ ...prev, [field]: false }));
  };

  const triggerGoldenCelebration = () => {
    try {
      confetti({
        particleCount: 38,
        spread: 60,
        origin: { y: 0.68 },
        colors: ['#BD7014', '#2B6B55', '#DCD5C9', '#FBF1E4'],
        ticks: 140,
        gravity: 0.8,
        scalar: 0.9,
        disableForReducedMotion: true
      });
    } catch (e) {
      // Safe fallback
    }
  };

  // Persist helper with instant optimistic feedback and debounced background sync
  const persistChanges = (updates: Partial<JournalEntry>, immediate = false) => {
    setErrorBanner(null);
    setSaveSuccess(true);

    // Merge new updates into pending updates queue
    pendingUpdatesRef.current = {
      ...pendingUpdatesRef.current,
      ...updates
    };

    // Mark analysis as stale if reflection answers are edited
    const isEditingAnswers = 'energyLevel' in updates || 'moodTone' in updates || 'mentalEnergy' in updates || 'standoutMoment' in updates || 'smallWin' in updates || 'freeText' in updates;
    if (isEditingAnswers && entryRef.current.analysis && !('analysis' in updates)) {
      const staleAnalysis: ReflectionAnalysis = {
        ...entryRef.current.analysis,
        isStale: true,
        staleReason: 'Check-in was modified after this perspective was generated.'
      };
      pendingUpdatesRef.current.analysis = staleAnalysis;
      pendingUpdatesRef.current.analysisStale = true;
      setAnalysis(staleAnalysis);
    }

    const latestMerged: JournalEntry = {
      ...entryRef.current,
      ...pendingUpdatesRef.current,
      updatedAt: new Date().toISOString()
    };
    lastAttemptedEntryRef.current = latestMerged;

    // Clear existing timer if any
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const doSync = async () => {
      setIsCloudSyncing(true);
      try {
        await onUpdateEntry(latestMerged);
        pendingUpdatesRef.current = {};
        setSaveSuccess(true);
      } catch (e: any) {
        console.error('Failed to sync to cloud:', e);
        setErrorBanner(e.message || 'Changes saved locally. Will sync when online.');
      } finally {
        setIsCloudSyncing(false);
      }
    };

    if (immediate) {
      void doSync();
    } else {
      // 550ms debounce window allows fast natural typing without lag
      debounceTimerRef.current = setTimeout(() => {
        void doSync();
      }, 550);
    }
  };

  const handleRetrySave = async () => {
    if (!lastAttemptedEntryRef.current) return;
    setErrorBanner(null);
    setIsCloudSyncing(true);
    try {
      await onUpdateEntry(lastAttemptedEntryRef.current);
      setSaveSuccess(true);
    } catch (e: any) {
      setErrorBanner(e.message || 'Retry failed. Changes preserved locally.');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Immediate update on blur or selection
  const handleEnergyChange = (val: EnergyLevel) => {
    setEnergyLevel(val);
    persistChanges({ energyLevel: val }, true);
  };

  const handleMoodChange = (val: MoodTone) => {
    setMoodTone(val);
    // Map back to legacy mood token string for backward compatibility
    const legacyMoodMap: Record<MoodTone, any> = {
      1: '🌧️ Overwhelmed',
      2: '🤔 Pondering',
      3: '🌱 Calm',
      4: '💡 Inspired'
    };
    persistChanges({ moodTone: val, mood: legacyMoodMap[val] }, true);
  };

  const handleFieldBlur = () => {
    persistChanges({
      mentalEnergy,
      standoutMoment,
      smallWin,
      freeText,
      initialPrompt: freeText
    }, true);
  };

  // Perform AI Analysis on the 6 check-in questions
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setErrorBanner(null);

    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: entry.title,
          energyLevel,
          moodTone,
          mentalEnergy,
          standoutMoment,
          smallWin,
          freeText,
          weather: entry.weather || (ambient.weather || undefined)
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const newAnalysis: ReflectionAnalysis = {
        ...data.analysis,
        isStale: false,
        timestamp: new Date().toISOString()
      };

      setAnalysis(newAnalysis);
      triggerGoldenCelebration();

      // Auto-update entry with analysis & summary for backward compatibility
      await persistChanges({
        analysis: newAnalysis,
        analysisStale: false,
        summary: newAnalysis.reflection,
        keyInsights: newAnalysis.themes
      });

      // Smoothly scroll down to the considered reflection
      setTimeout(() => {
        analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorBanner('Could not complete analysis. Check network or Gemini key.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle follow-up multi-turn conversation
  const handleSendFollowUp = async () => {
    if (!followUpPrompt.trim() || isAiReplying) return;

    const userText = followUpPrompt.trim();
    const userMsg: Message = {
      id: 'msg_' + Date.now() + '_u',
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...entry.messages, userMsg];
    setFollowUpPrompt('');
    setIsAiReplying(true);

    const pendingEntry: JournalEntry = {
      ...entry,
      messages: newMessages,
      updatedAt: new Date().toISOString()
    };
    await persistChanges(pendingEntry);

    try {
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          prompt: userText,
          category: entry.category,
          mood: GRADIENT_STEPS[moodTone].moodTitle,
          action: 'chat'
        })
      });

      if (!response.ok) throw new Error('Reflect endpoint failed');
      const data = await response.json();

      const assistantMsg: Message = {
        id: 'msg_' + Date.now() + '_a',
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString()
      };

      await persistChanges({
        ...pendingEntry,
        messages: [...newMessages, assistantMsg]
      });
    } catch (e: any) {
      console.error('Follow-up error:', e);
      setErrorBanner('Follow-up message could not reach Gemini.');
    } finally {
      setIsAiReplying(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#EFE9DE] text-[#242728] overflow-hidden font-serif">
      {/* Quiet Top Margin Strip: Date, Title, Category, Save Status */}
      <div className="border-b border-[#DCD5C9] px-6 sm:px-10 py-4 bg-[#FDFAF6]/90 backdrop-blur-xs flex flex-wrap items-center justify-between gap-4 select-none">
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-sans text-xs text-[#52595C]">
              {formattedDate}
            </span>
            {entry.weather ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs text-xs font-sans text-[#242728]">
                {getWeatherIcon(entry.weather.icon, entry.weather.daylightPhase)}
                <span className="font-medium">{entry.weather.temperatureC}°C</span>
                <span className="text-[#52595C]">· {entry.weather.condition}</span>
                <span className="text-[#52595C]/70">· {entry.weather.locationName}</span>
                <button
                  type="button"
                  onClick={() => persistChanges({ weather: undefined })}
                  title="Remove weather context"
                  className="text-[#52595C] hover:text-rose-700 ml-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : ambient.weather ? (
              <button
                type="button"
                onClick={() => persistChanges({ weather: ambient.weather || undefined })}
                title="Capture ambient weather for this reflection"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-[#52595C] hover:text-[#242728] border border-dashed border-[#DCD5C9] hover:border-[#BD7014] rounded-xs transition-colors cursor-pointer"
              >
                {getWeatherIcon(ambient.weather.icon, ambient.weather.daylightPhase)}
                <span>+ Attach {ambient.weather.temperatureC}°C · {ambient.weather.condition}</span>
              </button>
            ) : null}
          </div>
          <input
            id="entry-title-input"
            type="text"
            value={entry.title}
            onChange={(e) => persistChanges({ title: e.target.value })}
            placeholder="Name this day's reflection..."
            className="text-xl sm:text-2xl font-light text-[#242728] bg-transparent border-b border-transparent hover:border-[#DCD5C9] focus:border-[#BD7014] focus:outline-none w-full transition-colors font-serif placeholder:italic placeholder:text-[#52595C]/60"
          />
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* Ambient Weather Badge & Coarse Location Control */}
          <AmbientWeatherBadge
            weather={ambient.weather}
            isLoading={ambient.isLoading}
            coarseCity={ambient.coarseCity}
            isDisabled={ambient.isDisabled}
            onSetCity={ambient.setCity}
            onToggleDisabled={ambient.toggleDisabled}
            onRefresh={ambient.refresh}
            onAttachToEntry={() => persistChanges({ weather: entry.weather ? undefined : (ambient.weather || undefined) })}
            isAttachedToCurrentEntry={Boolean(entry.weather)}
          />
          {/* Word Count & Read Time */}
          {totalWords > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 font-sans text-xs text-[#52595C] px-2.5 py-1 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs">
              <PenTool className="h-3 w-3 text-[#BD7014]" />
              <span>{totalWords} words</span>
            </span>
          )}

          {/* Candlelight Focus Mode Button */}
          <button
            id="toggle-focus-mode-btn"
            type="button"
            onClick={() => setIsFocusMode(!isFocusMode)}
            title="Focus writing desk (Candlelight mode)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FDFAF6] border border-[#DCD5C9] hover:border-[#BD7014] text-xs font-sans text-[#242728] rounded-xs transition-colors cursor-pointer shadow-2xs"
          >
            <Flame className="h-3.5 w-3.5 text-[#BD7014]" />
            <span className="hidden md:inline">Focus mode</span>
          </button>

          {/* Ambient Sound Sanctuary */}
          <AmbientSoundscape />

          {/* Subtle Category Selector */}
          <select
            id="category-selector"
            value={entry.category}
            onChange={(e) => persistChanges({ category: e.target.value as ReflectionCategory })}
            className="px-3 py-1.5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs font-sans text-xs text-[#52595C] focus:outline-none focus:border-[#BD7014] cursor-pointer shadow-2xs"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Sync Status Badge */}
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 font-sans text-xs text-[#52595C] bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs shadow-2xs"
            title={isCloudSyncing ? "Syncing changes to cloud..." : "Saved securely to local storage & cloud"}
          >
            {isCloudSyncing ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin text-[#BD7014]" />
                <span className="text-[#BD7014]">Syncing...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-3 w-3 text-[#2B6B55]" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save className="h-3 w-3 text-[#2B6B55]" />
                <span>Saved</span>
              </>
            )}
          </div>

          {onDeleteEntry && (
            <button
              id="workspace-delete-entry-btn"
              type="button"
              onClick={() => onDeleteEntry(entry.id)}
              title="Delete this reflection"
              className="p-2 text-[#52595C] hover:text-rose-700 hover:bg-rose-50/80 border border-[#DCD5C9] hover:border-rose-200 rounded-xs transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error notification banner */}
      {errorBanner && (
        <div className="bg-[#FDF2F2] border-b border-[#F5C2C2] px-6 sm:px-10 py-2.5 flex items-center justify-between text-xs font-sans text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRetrySave}
              className="text-xs font-medium text-rose-700 underline hover:text-rose-900 cursor-pointer"
            >
              Retry Save
            </button>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-xs text-rose-600 hover:text-rose-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Notebook Page Scroll Container */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 py-8 lg:py-12">
        <div className="max-w-2xl mx-auto space-y-12">

          {/* Unhurried Check-in Header & Subtle Bookmark Progress */}
          <div className="flex items-baseline justify-between border-b border-[#DCD5C9] pb-3">
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="font-serif text-2xl font-light text-[#242728]">
                  Daily check-in
                </h2>
                <span className="font-serif italic text-xs text-[#BD7014]">
                  — {deviceTime.greeting}
                </span>
              </div>
              <p className="font-sans text-xs text-[#52595C] mt-0.5">
                {deviceTime.toneHint}
              </p>
            </div>

            <div className="flex items-center gap-1.5 font-sans text-xs text-[#52595C]">
              <span>{answeredCount} of 6 noted</span>
              <div className="flex gap-1 ml-1" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6].map((step) => (
                  <span
                    key={step}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      step <= answeredCount ? 'bg-[#2B6B55]' : 'bg-[#DCD5C9]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Daily Inspiration Banner */}
          <DailyInspirationBanner onApplyPrompt={(p) => handleApplySpark('freeText', p)} />

          {/* Question 1: Energy & Battery State */}
          <section className="space-y-3">
            <div className="space-y-1">
              <label 
                htmlFor="energy-selector" 
                className="font-serif text-lg font-normal text-[#242728] block"
              >
                1. How is your energy right now?
              </label>
              <p className="font-sans text-xs text-[#52595C]">
                Notice your physical stamina and mental bandwidth.
              </p>
            </div>
            <TokenSelector
              idPrefix="energy-selector"
              type="energy"
              value={energyLevel}
              onChange={handleEnergyChange}
            />
          </section>

          {/* Question 2: Emotional Weather & Mood */}
          <section className="space-y-3">
            <div className="space-y-1">
              <label 
                htmlFor="mood-selector" 
                className="font-serif text-lg font-normal text-[#242728] block"
              >
                2. What is the emotional weather?
              </label>
              <p className="font-sans text-xs text-[#52595C]">
                The underlying feeling tone you carried through the day.
              </p>
            </div>
            <TokenSelector
              idPrefix="mood-selector"
              type="mood"
              value={moodTone}
              onChange={handleMoodChange}
            />
          </section>

          {/* Question 3: What took your mental energy */}
          <section className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <label 
                  htmlFor="mental-energy-input" 
                  className="font-serif text-lg font-normal text-[#242728] block"
                >
                  3. What occupied most of your headspace today?
                </label>
                <p className="font-sans text-xs text-[#52595C]">
                  A project, an unresolved conversation, a worry, or an idea that kept looping.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSparks('mentalEnergy')}
                className="inline-flex items-center gap-1 font-sans text-xs text-[#52595C] hover:text-[#BD7014] px-2 py-1 rounded-xs border border-[#DCD5C9] hover:border-[#BD7014] bg-[#FDFAF6] transition-colors cursor-pointer shrink-0"
              >
                <Lightbulb className="h-3 w-3 text-[#BD7014]" />
                <span className="hidden sm:inline">Sparks</span>
              </button>
            </div>

            {showSparks.mentalEnergy && (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs">
                {THOUGHT_SPARKS.mentalEnergy.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplySpark('mentalEnergy', s)}
                    className="text-[11px] font-sans px-2.5 py-1 rounded-full bg-[#EFE9DE] hover:bg-[#E3ECE7] hover:text-[#2B6B55] border border-[#DCD5C9] text-[#52595C] transition-colors cursor-pointer text-left"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}

            <textarea
              id="mental-energy-input"
              rows={2}
              value={mentalEnergy}
              onChange={(e) => {
                const val = e.target.value;
                setMentalEnergy(val);
                persistChanges({ mentalEnergy: val });
              }}
              onBlur={handleFieldBlur}
              placeholder="What drew your attention again and again..."
              className="w-full bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs p-3.5 font-serif text-base text-[#242728] placeholder:italic placeholder:text-[#52595C]/60 focus:outline-none focus:border-[#BD7014] transition-colors resize-none leading-relaxed shadow-2xs"
            />
          </section>

          {/* Question 4: Standout moment */}
          <section className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <label 
                  htmlFor="standout-moment-input" 
                  className="font-serif text-lg font-normal text-[#242728] block"
                >
                  4. A standout moment or sensory detail
                </label>
                <p className="font-sans text-xs text-[#52595C]">
                  A slant of afternoon light, a shared laugh, hot tea, or a quiet breath.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSparks('standoutMoment')}
                className="inline-flex items-center gap-1 font-sans text-xs text-[#52595C] hover:text-[#BD7014] px-2 py-1 rounded-xs border border-[#DCD5C9] hover:border-[#BD7014] bg-[#FDFAF6] transition-colors cursor-pointer shrink-0"
              >
                <Lightbulb className="h-3 w-3 text-[#BD7014]" />
                <span className="hidden sm:inline">Sparks</span>
              </button>
            </div>

            {showSparks.standoutMoment && (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs">
                {THOUGHT_SPARKS.standoutMoment.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplySpark('standoutMoment', s)}
                    className="text-[11px] font-sans px-2.5 py-1 rounded-full bg-[#EFE9DE] hover:bg-[#E3ECE7] hover:text-[#2B6B55] border border-[#DCD5C9] text-[#52595C] transition-colors cursor-pointer text-left"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}

            <textarea
              id="standout-moment-input"
              rows={2}
              value={standoutMoment}
              onChange={(e) => {
                const val = e.target.value;
                setStandoutMoment(val);
                persistChanges({ standoutMoment: val });
              }}
              onBlur={handleFieldBlur}
              placeholder="Something you noticed through your senses..."
              className="w-full bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs p-3.5 font-serif text-base text-[#242728] placeholder:italic placeholder:text-[#52595C]/60 focus:outline-none focus:border-[#BD7014] transition-colors resize-none leading-relaxed shadow-2xs"
            />
          </section>

          {/* Question 5: A Small Win */}
          <section className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <label 
                  htmlFor="small-win-input" 
                  className="font-serif text-lg font-normal text-[#242728] block"
                >
                  5. A win or something handled
                </label>
                <p className="font-sans text-xs text-[#52595C]">
                  Big or tiny: an email sent, setting a boundary, or simply resting when tired.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSparks('smallWin')}
                className="inline-flex items-center gap-1 font-sans text-xs text-[#52595C] hover:text-[#BD7014] px-2 py-1 rounded-xs border border-[#DCD5C9] hover:border-[#BD7014] bg-[#FDFAF6] transition-colors cursor-pointer shrink-0"
              >
                <Lightbulb className="h-3 w-3 text-[#BD7014]" />
                <span className="hidden sm:inline">Sparks</span>
              </button>
            </div>

            {showSparks.smallWin && (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs">
                {THOUGHT_SPARKS.smallWin.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplySpark('smallWin', s)}
                    className="text-[11px] font-sans px-2.5 py-1 rounded-full bg-[#EFE9DE] hover:bg-[#E3ECE7] hover:text-[#2B6B55] border border-[#DCD5C9] text-[#52595C] transition-colors cursor-pointer text-left"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}

            <textarea
              id="small-win-input"
              rows={2}
              value={smallWin}
              onChange={(e) => {
                const val = e.target.value;
                setSmallWin(val);
                persistChanges({ smallWin: val });
              }}
              onBlur={handleFieldBlur}
              placeholder="Something completed, handled, or appreciated..."
              className="w-full bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs p-3.5 font-serif text-base text-[#242728] placeholder:italic placeholder:text-[#52595C]/60 focus:outline-none focus:border-[#BD7014] transition-colors resize-none leading-relaxed shadow-2xs"
            />
          </section>

          {/* Question 6: Open Free Reflection */}
          <section className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <label 
                  htmlFor="free-text-input" 
                  className="font-serif text-lg font-normal text-[#242728] block"
                >
                  6. Open reflection (optional)
                </label>
                <p className="font-sans text-xs text-[#52595C]">
                  Free-writing space for anything else you want to leave on the page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSparks('freeText')}
                className="inline-flex items-center gap-1 font-sans text-xs text-[#52595C] hover:text-[#BD7014] px-2 py-1 rounded-xs border border-[#DCD5C9] hover:border-[#BD7014] bg-[#FDFAF6] transition-colors cursor-pointer shrink-0"
              >
                <Lightbulb className="h-3 w-3 text-[#BD7014]" />
                <span className="hidden sm:inline">Sparks</span>
              </button>
            </div>

            {showSparks.freeText && (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs">
                {THOUGHT_SPARKS.freeText.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplySpark('freeText', s)}
                    className="text-[11px] font-sans px-2.5 py-1 rounded-full bg-[#EFE9DE] hover:bg-[#E3ECE7] hover:text-[#2B6B55] border border-[#DCD5C9] text-[#52595C] transition-colors cursor-pointer text-left"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}

            <textarea
              id="free-text-input"
              rows={4}
              value={freeText}
              onChange={(e) => {
                const val = e.target.value;
                setFreeText(val);
                persistChanges({ freeText: val, initialPrompt: val });
              }}
              onBlur={handleFieldBlur}
              placeholder="Unfiltered thoughts, gratitude, sketches of ideas..."
              className="w-full bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs p-4 font-serif text-base text-[#242728] placeholder:italic placeholder:text-[#52595C]/60 focus:outline-none focus:border-[#BD7014] transition-colors resize-y leading-relaxed shadow-2xs"
            />
          </section>

          {/* Past Reflection Echo (Memory Pebble) */}
          {pastEcho && (
            <div className="p-4 sm:p-5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs space-y-1.5 shadow-2xs relative">
              <div className="flex items-center gap-1.5 font-sans text-xs text-[#52595C]">
                <Bookmark className="h-3.5 w-3.5 text-[#BD7014]" />
                <span className="font-medium text-[#242728]">An echo from your past &bull; {pastEcho.time}</span>
              </div>
              <p className="font-serif text-sm sm:text-base text-[#242728] italic leading-relaxed">
                "{pastEcho.text}"
              </p>
            </div>
          )}

          {/* Analyze / Receive Reflection Action */}
          <div className="pt-2 pb-6 border-b border-[#DCD5C9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-serif text-base text-[#242728]">
                Ready for a quiet reflection?
              </p>
              <p className="font-sans text-xs text-[#52595C]">
                Gemini will read your check-in and offer an unhurried perspective note.
              </p>
            </div>

            <button
              id="analyze-reflection-btn"
              type="button"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || answeredCount === 0}
              className="px-5 py-2.5 bg-[#FDFAF6] border border-[#242728] hover:bg-[#242728] hover:text-[#FDFAF6] text-[#242728] rounded-xs font-sans text-xs tracking-wide transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-xs"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Reading your page...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-[#BD7014]" />
                  <span>Receive reflection</span>
                </>
              )}
            </button>
          </div>

          {/* The Considered Reflection Card (Folded Vellum Letter) */}
          {analysis && (
            <article 
              ref={analysisRef}
              id="considered-reflection-card"
              className="relative p-6 sm:p-8 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs space-y-6 shadow-sm"
            >
              {/* Staleness Note banner */}
              {analysis.isStale && (
                <div className="p-3 bg-[#FBF1E4] border border-[#E5B880] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans text-[#242728]">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-[#BD7014] shrink-0" />
                    <span>
                      {analysis.staleReason || 'Reflection updated after this perspective was generated.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#BD7014] hover:bg-[#9E5E10] text-white rounded-xs font-medium transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    {isAnalyzing ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    <span>Re-analyze</span>
                  </button>
                </div>
              )}

              {/* Card Header: Editorial note */}
              <div className="flex items-baseline justify-between border-b border-[#DCD5C9] pb-3">
                <div>
                  <span className="font-sans text-xs text-[#52595C] block">
                    Synthesis & perspective
                  </span>
                  <h3 className="font-serif text-2xl font-normal text-[#242728] mt-0.5">
                    A reflection on today
                  </h3>
                </div>

                <span className="font-sans text-xs text-[#52595C]">
                  {analysis.detectedMood}
                </span>
              </div>

              {/* Mood & Resonance visualization using the exact same gradient */}
              <MoodScoreVisualizer 
                score={analysis.moodScore} 
                detectedMood={analysis.detectedMood} 
              />

              {/* Themes: Quiet Typographic Tags */}
              {analysis.themes && analysis.themes.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-sans text-xs text-[#52595C]">
                    Thematic threads
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {analysis.themes.map((theme, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-[#EFE9DE] border border-[#DCD5C9] text-[#52595C] font-sans text-xs rounded-full"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Reflection Body */}
              <div className="space-y-3 pt-2">
                <span className="font-sans text-xs text-[#52595C] block">
                  Considered note
                </span>
                <div className="font-serif text-base sm:text-lg text-[#242728] leading-relaxed space-y-3 italic">
                  <ReactMarkdown>{analysis.reflection}</ReactMarkdown>
                </div>
              </div>

              {/* Gentle Inquiry / Evening Tip */}
              {analysis.gentleTip && (
                <div className="p-4 bg-[#EFE9DE] border-l-2 border-[#BD7014] rounded-r-xs space-y-1">
                  <span className="font-sans text-xs text-[#BD7014] font-semibold block">
                    A gentle thought for the evening
                  </span>
                  <p className="font-serif text-base text-[#242728] leading-relaxed">
                    {analysis.gentleTip}
                  </p>
                </div>
              )}
            </article>
          )}

          {/* Past Conversation / Multi-turn Dialogue (if any) */}
          {entry.messages && entry.messages.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-[#DCD5C9]">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-lg font-light text-[#242728]">
                  Dialogue & notes
                </h4>
                <span className="font-sans text-xs text-[#52595C]">
                  {entry.messages.length} exchanges
                </span>
              </div>

              <div className="space-y-4">
                {entry.messages.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div 
                      key={msg.id || i}
                      className={`p-4 rounded-xs border ${
                        isUser
                          ? 'bg-[#FDFAF6] border-[#DCD5C9] text-[#242728]'
                          : 'bg-[#EFE9DE] border-[#DCD5C9] border-l-2 border-l-[#2B6B55] text-[#242728]'
                      }`}
                    >
                      <div className="flex justify-between font-sans text-xs text-[#52595C] mb-1.5">
                        <span>{isUser ? 'You' : 'ReflectAI'}</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="font-serif text-base leading-relaxed whitespace-pre-wrap">
                        {isUser ? msg.content : <ReactMarkdown>{msg.content}</ReactMarkdown>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Follow-up / Additional Thoughts Bar */}
          <div className="pt-4 pb-12">
            <div className="p-4 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs space-y-3 shadow-2xs">
              <label 
                htmlFor="follow-up-input" 
                className="font-serif text-base text-[#242728] block"
              >
                Continue the reflection
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="follow-up-input"
                  type="text"
                  value={followUpPrompt}
                  onChange={(e) => setFollowUpPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendFollowUp();
                    }
                  }}
                  placeholder="Ask a question or add a thought..."
                  className="flex-1 bg-transparent border-b border-[#DCD5C9] hover:border-[#BD7014] focus:border-[#BD7014] focus:outline-none py-2 font-serif text-base text-[#242728] placeholder:italic placeholder:text-[#52595C]/60"
                />
                <button
                  id="send-followup-btn"
                  type="button"
                  onClick={handleSendFollowUp}
                  disabled={!followUpPrompt.trim() || isAiReplying}
                  className="px-4 py-2 bg-[#242728] hover:bg-[#383D3F] text-[#FDFAF6] rounded-xs font-sans text-xs transition-colors cursor-pointer disabled:opacity-30 flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Reflect</span>
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Candlelight Focus Mode Screen */}
      {isFocusMode && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#242728]/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-2xl bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs shadow-2xl p-6 sm:p-10 my-auto space-y-6 relative select-text">
            <div className="flex items-center justify-between border-b border-[#DCD5C9] pb-4">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-[#BD7014]" />
                <span className="font-serif italic text-base text-[#242728]">Focus writing sanctuary</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-sans text-xs text-[#52595C]">
                  {totalWords} words &bull; ESC to return
                </span>
                <button
                  type="button"
                  onClick={() => setIsFocusMode(false)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#EFE9DE] border border-[#DCD5C9] hover:border-[#242728] text-xs font-sans text-[#242728] rounded-xs transition-colors cursor-pointer"
                >
                  <Minimize2 className="h-3 w-3" />
                  <span>Exit focus</span>
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <input
                type="text"
                value={entry.title}
                onChange={(e) => persistChanges({ title: e.target.value })}
                placeholder="Name this reflection..."
                className="text-2xl sm:text-3xl font-light text-[#242728] bg-transparent border-b border-transparent hover:border-[#DCD5C9] focus:border-[#BD7014] focus:outline-none w-full transition-colors font-serif placeholder:italic placeholder:text-[#52595C]/50"
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs text-[#52595C]">Unfiltered writing space</span>
                  <div className="flex items-center gap-2">
                    <AmbientSoundscape />
                  </div>
                </div>
                <textarea
                  rows={14}
                  value={freeText}
                  onChange={(e) => {
                    setFreeText(e.target.value);
                    persistChanges({ freeText: e.target.value, initialPrompt: e.target.value });
                  }}
                  placeholder="Let your mind wander freely onto the paper. No judgment, no rush..."
                  className="w-full bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs p-4 font-serif text-lg text-[#242728] placeholder:italic placeholder:text-[#52595C]/40 focus:outline-none focus:border-[#BD7014] resize-none leading-relaxed shadow-inner"
                  autoFocus
                />
              </div>

              <div className="flex justify-between items-center pt-2 text-xs font-sans text-[#52595C]">
                <span>All keystrokes quietly saved</span>
                <button
                  type="button"
                  onClick={() => setIsFocusMode(false)}
                  className="text-[#2B6B55] hover:underline cursor-pointer"
                >
                  Back to full 6-question check-in &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

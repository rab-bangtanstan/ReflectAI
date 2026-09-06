import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Edit3, 
  Check, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  BookOpen, 
  Clock, 
  HeartHandshake
} from 'lucide-react';
import confetti from 'canvas-confetti';
import ReactMarkdown from 'react-markdown';
import { 
  JournalEntry, 
  EnergyLevel, 
  MoodTone, 
  ReflectionAnalysis 
} from '../types';
import { 
  toLocalDateString, 
  getEntriesPresenceMap, 
  hasEntryOnDate 
} from '../utils/datePresence';
import { 
  GRADIENT_STEPS, 
  TokenGlyph, 
  TokenSelector, 
  MoodScoreVisualizer 
} from './MoodEnergyTokens';
import { getWeatherIcon } from './AmbientWeatherBadge';
import { getDaylightLabel } from '../utils/timeDaylight';

interface CalendarArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  userId: string;
  onUpdateEntry: (entry: JournalEntry) => Promise<void>;
  onOpenEntryInWorkspace?: (entry: JournalEntry) => void;
  initialSelectedDateStr?: string;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarArchiveModal: React.FC<CalendarArchiveModalProps> = ({
  isOpen,
  onClose,
  entries,
  userId,
  onUpdateEntry,
  onOpenEntryInWorkspace,
  initialSelectedDateStr
}) => {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toLocalDateString(today), [today]);

  // Current viewed month & year
  const [viewYear, setViewYear] = useState<number>(() => {
    if (initialSelectedDateStr) {
      const parts = initialSelectedDateStr.split('-');
      if (parts.length === 3) return parseInt(parts[0], 10);
    }
    return today.getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (initialSelectedDateStr) {
      const parts = initialSelectedDateStr.split('-');
      if (parts.length === 3) return parseInt(parts[1], 10) - 1;
    }
    return today.getMonth();
  });

  // Selected date string in YYYY-MM-DD
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return initialSelectedDateStr || todayStr;
  });

  // Selected entry index for dates with multiple reflections
  const [selectedEntryIndex, setSelectedEntryIndex] = useState<number>(0);

  // Edit mode toggle
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editEnergy, setEditEnergy] = useState<EnergyLevel>(3);
  const [editMood, setEditMood] = useState<MoodTone>(3);
  const [editMental, setEditMental] = useState<string>('');
  const [editStandout, setEditStandout] = useState<string>('');
  const [editWin, setEditWin] = useState<string>('');
  const [editFreeText, setEditFreeText] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Analysis state for manual re-analyze
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);

  // Unified presence map from all user entries
  const presenceMap = useMemo(() => {
    return getEntriesPresenceMap(entries);
  }, [entries]);

  // Is current view showing the present month?
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (isCurrentMonth) return; // Future months prohibited
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleJumpToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDateStr(todayStr);
    setSelectedEntryIndex(0);
    setIsEditing(false);
  };

  // Days in month calculation
  const monthData = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days = [];
    // Padding lead days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNum: null, dateStr: '', isFuture: false, isToday: false, hasEntry: false });
    }

    // Actual calendar days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(viewYear, viewMonth, d);
      const dateStr = toLocalDateString(dateObj);
      const isFuture = dateStr > todayStr;
      const isDayToday = dateStr === todayStr;
      const hasEntry = hasEntryOnDate(dateStr, presenceMap);
      const dayEntries = presenceMap.get(dateStr) || [];
      const primaryTone = dayEntries.length > 0 
        ? (dayEntries[0].moodTone || dayEntries[0].energyLevel || 3) 
        : null;

      days.push({
        dayNum: d,
        dateStr,
        isFuture,
        isToday: isDayToday,
        hasEntry,
        entries: dayEntries,
        primaryTone
      });
    }

    return days;
  }, [viewYear, viewMonth, todayStr, presenceMap]);

  // Currently selected day's entries
  const selectedDayEntries = useMemo(() => {
    return presenceMap.get(selectedDateStr) || [];
  }, [presenceMap, selectedDateStr]);

  const activeEntry: JournalEntry | undefined = selectedDayEntries[selectedEntryIndex] || selectedDayEntries[0];

  // Initiate edit mode with active entry data
  const handleStartEdit = () => {
    if (!activeEntry) return;
    setEditError(null);
    setEditTitle(activeEntry.title || '');
    setEditEnergy(activeEntry.energyLevel || 3);
    setEditMood(activeEntry.moodTone || 3);
    setEditMental(activeEntry.mentalEnergy || '');
    setEditStandout(activeEntry.standoutMoment || '');
    setEditWin(activeEntry.smallWin || '');
    setEditFreeText(activeEntry.freeText || activeEntry.initialPrompt || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditError(null);
    setIsEditing(false);
  };

  // Save changes scoped to owner user ID
  const handleSaveEdit = async () => {
    if (!activeEntry) return;
    setIsSavingEdit(true);
    setEditError(null);

    try {
      // Check if check-in answers changed to mark analysis as stale without deleting
      const answersChanged = 
        editEnergy !== activeEntry.energyLevel ||
        editMood !== activeEntry.moodTone ||
        editMental.trim() !== (activeEntry.mentalEnergy || '').trim() ||
        editStandout.trim() !== (activeEntry.standoutMoment || '').trim() ||
        editWin.trim() !== (activeEntry.smallWin || '').trim() ||
        editFreeText.trim() !== (activeEntry.freeText || '').trim();

      const updatedAnalysis: ReflectionAnalysis | undefined = activeEntry.analysis ? {
        ...activeEntry.analysis,
        isStale: answersChanged ? true : activeEntry.analysis.isStale,
        staleReason: answersChanged ? 'Check-in was modified after this perspective was generated.' : activeEntry.analysis.staleReason
      } : undefined;

      const legacyMoodMap: Record<MoodTone, string> = {
        1: '🌧️ Overwhelmed',
        2: '🤔 Pondering',
        3: '🌱 Calm',
        4: '💡 Inspired'
      };

      const updated: JournalEntry = {
        ...activeEntry,
        userId, // Scoped strictly to current authenticated user
        title: editTitle.trim() || 'Untitled Reflection',
        energyLevel: editEnergy,
        moodTone: editMood,
        mood: legacyMoodMap[editMood] as any,
        mentalEnergy: editMental,
        standoutMoment: editStandout,
        smallWin: editWin,
        freeText: editFreeText,
        analysis: updatedAnalysis,
        analysisStale: Boolean(updatedAnalysis?.isStale),
        updatedAt: new Date().toISOString()
      };

      await onUpdateEntry(updated);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to save archive entry update:', err);
      setEditError(err.message || 'Failed to save changes to cloud. Your edits remain intact.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Manual re-analyze trigger (Celebratory burst fires ONLY here!)
  const handleReanalyze = async () => {
    if (!activeEntry) return;
    setIsReanalyzing(true);
    setReanalyzeError(null);

    try {
      const res = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeEntry.title,
          energyLevel: activeEntry.energyLevel || 3,
          moodTone: activeEntry.moodTone || 3,
          mentalEnergy: activeEntry.mentalEnergy || '',
          standoutMoment: activeEntry.standoutMoment || '',
          smallWin: activeEntry.smallWin || '',
          freeText: activeEntry.freeText || ''
        })
      });

      if (!res.ok) throw new Error('Analysis request failed');
      const data = await res.json();
      const newAnalysis: ReflectionAnalysis = {
        ...data.analysis,
        isStale: false,
        timestamp: new Date().toISOString()
      };

      // Scoped update to Firestore
      const updated: JournalEntry = {
        ...activeEntry,
        userId,
        analysis: newAnalysis,
        analysisStale: false,
        summary: newAnalysis.reflection,
        keyInsights: newAnalysis.themes,
        updatedAt: new Date().toISOString()
      };

      await onUpdateEntry(updated);

      // RULE 2: Fire celebratory burst ONLY on freshly generated analysis
      try {
        confetti({
          particleCount: 40,
          spread: 55,
          origin: { y: 0.65 },
          colors: ['#BD7014', '#2B6B55', '#DCD5C9', '#FBF1E4'],
          ticks: 130,
          gravity: 0.85,
          scalar: 0.85,
          disableForReducedMotion: true
        });
      } catch (e) {
        // Fallback
      }
    } catch (e: any) {
      console.error('Re-analyze error:', e);
      setReanalyzeError('Could not reach Gemini to re-analyze this reflection.');
    } finally {
      setIsReanalyzing(false);
    }
  };

  if (!isOpen) return null;

  const monthTitle = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const formattedSelectedDate = new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div 
      id="calendar-archive-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Calendar Archive"
      className="fixed inset-0 z-50 bg-[#242728]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="calendar-archive-modal"
        className="bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header Strip */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCD5C9] bg-[#FDFAF6] shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xs bg-[#EFE9DE] border border-[#DCD5C9] flex items-center justify-center text-[#242728]">
              <CalendarIcon className="h-4 w-4 text-[#BD7014]" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-normal text-[#242728]">
                Calendar & Archive
              </h3>
              <p className="font-sans text-xs text-[#52595C]">
                Explore past days, consolidate insights, and revisit your journey.
              </p>
            </div>
          </div>

          <button
            id="close-calendar-archive-btn"
            type="button"
            onClick={onClose}
            aria-label="Close archive"
            className="p-1.5 text-[#52595C] hover:text-[#242728] hover:bg-[#EFE9DE] rounded-xs transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dual-Pane Archive Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Pane: Month Grid Calendar */}
          <div className="w-full md:w-[360px] lg:w-[400px] border-b md:border-b-0 md:border-r border-[#DCD5C9] bg-[#EFE9DE]/40 p-5 flex flex-col select-none shrink-0 overflow-y-auto">
            {/* Month & Navigation Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="font-serif text-lg font-normal text-[#242728]">
                {monthTitle}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="px-2 py-1 text-[11px] font-sans text-[#52595C] hover:text-[#242728] hover:bg-[#FDFAF6] rounded-xs border border-[#DCD5C9] transition-colors cursor-pointer mr-1"
                >
                  Today
                </button>
                <button
                  id="calendar-prev-month-btn"
                  type="button"
                  onClick={handlePrevMonth}
                  title="Previous month"
                  className="p-1 text-[#52595C] hover:text-[#242728] hover:bg-[#FDFAF6] rounded-xs border border-[#DCD5C9] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  id="calendar-next-month-btn"
                  type="button"
                  onClick={handleNextMonth}
                  disabled={isCurrentMonth}
                  title={isCurrentMonth ? "Cannot navigate to future months" : "Next month"}
                  className="p-1 text-[#52595C] hover:text-[#242728] hover:bg-[#FDFAF6] rounded-xs border border-[#DCD5C9] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center font-sans text-[11px] font-medium text-[#52595C] pb-2 border-b border-[#DCD5C9]">
              {WEEKDAY_NAMES.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 pt-2">
              {monthData.map((d, index) => {
                if (!d.dayNum) {
                  return <div key={`empty-${index}`} className="h-11 sm:h-12" />;
                }

                const isSelected = d.dateStr === selectedDateStr;
                const step = d.primaryTone ? GRADIENT_STEPS[d.primaryTone] : null;

                if (d.isFuture) {
                  return (
                    <div
                      key={d.dateStr}
                      className="h-11 sm:h-12 flex flex-col items-center justify-center rounded-xs text-xs font-sans text-[#52595C]/35 cursor-not-allowed select-none"
                      title="Future date"
                    >
                      <span>{d.dayNum}</span>
                    </div>
                  );
                }

                return (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDateStr(d.dateStr);
                      setSelectedEntryIndex(0);
                      setIsEditing(false);
                    }}
                    className={`h-11 sm:h-12 flex flex-col items-center justify-center rounded-xs text-xs font-sans transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-[#FDFAF6] border-2 border-[#242728] text-[#242728] shadow-xs font-medium'
                        : d.isToday
                          ? 'bg-[#FDFAF6] border border-dashed border-[#BD7014] text-[#242728] hover:bg-[#FDFAF6]'
                          : 'bg-[#FDFAF6]/60 border border-[#DCD5C9]/80 text-[#242728] hover:bg-[#FDFAF6] hover:border-[#BD7014]'
                    }`}
                    title={`${d.dateStr}${d.hasEntry ? ` (${d.entries?.length || 1} check-in)` : ''}`}
                  >
                    <span>{d.dayNum}</span>

                    {/* Dot indicator ONLY if a check-in exists for this date */}
                    {d.hasEntry ? (
                      <span 
                        className="w-1.5 h-1.5 rounded-full mt-0.5" 
                        style={{ backgroundColor: step?.hex || '#2B6B55' }}
                      />
                    ) : (
                      <span className="w-1.5 h-1.5 mt-0.5 opacity-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend / Presence summary */}
            <div className="mt-auto pt-5 border-t border-[#DCD5C9] space-y-2 font-sans text-xs text-[#52595C]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2B6B55]" />
                <span>Dot marks days with a recorded reflection</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-xs border border-dashed border-[#BD7014]" />
                <span>Dashed border marks today</span>
              </div>
            </div>
          </div>

          {/* Right Pane: Consolidated Read-Only Report View or Edit Form */}
          <div className="flex-1 bg-[#FDFAF6] flex flex-col overflow-y-auto">
            {activeEntry ? (
              <div className="p-6 sm:p-8 space-y-6">
                {/* Date & Title Header with Actions */}
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#DCD5C9] pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-xs text-[#52595C]">
                        {formattedSelectedDate}
                      </span>
                      {selectedDayEntries.length > 1 && (
                        <div className="flex items-center gap-1">
                          {selectedDayEntries.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSelectedEntryIndex(idx);
                                setIsEditing(false);
                              }}
                              className={`text-[10px] font-sans px-1.5 py-0.5 rounded-xs border ${
                                selectedEntryIndex === idx
                                  ? 'bg-[#242728] text-[#FDFAF6] border-[#242728]'
                                  : 'bg-[#EFE9DE] text-[#52595C] border-[#DCD5C9]'
                              }`}
                            >
                              Page {idx + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {!isEditing ? (
                      <h2 className="font-serif text-2xl sm:text-3xl font-light text-[#242728]">
                        {activeEntry.title || 'Untitled Reflection'}
                      </h2>
                    ) : (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Reflection title..."
                        className="font-serif text-2xl font-light text-[#242728] bg-transparent border-b border-[#BD7014] focus:outline-none w-full py-1"
                      />
                    )}
                  </div>

                  {/* Header actions: Edit toggle & Open in Workspace */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isEditing ? (
                      <>
                        <button
                          id="edit-archive-entry-btn"
                          type="button"
                          onClick={handleStartEdit}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#DCD5C9] hover:border-[#242728] bg-[#FDFAF6] text-xs font-sans text-[#52595C] hover:text-[#242728] rounded-xs transition-colors cursor-pointer shadow-2xs"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-[#BD7014]" />
                          <span>Edit check-in</span>
                        </button>

                        {onOpenEntryInWorkspace && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenEntryInWorkspace(activeEntry);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#242728] hover:bg-[#383D3F] text-[#FDFAF6] text-xs font-sans rounded-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            <BookOpen className="h-3 w-3" />
                            <span>Open in journal</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSavingEdit}
                          className="px-3 py-1.5 border border-[#DCD5C9] hover:border-[#242728] text-xs font-sans text-[#52595C] rounded-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          id="save-archive-entry-btn"
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={isSavingEdit}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#242728] hover:bg-[#383D3F] text-[#FDFAF6] text-xs font-sans rounded-xs cursor-pointer shadow-xs disabled:opacity-40"
                        >
                          {isSavingEdit ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-[#2B6B55]" />
                          )}
                          <span>Save changes</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Error Banner with Retry */}
                {editError && isEditing && (
                  <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xs flex items-center justify-between gap-3 text-xs font-sans text-rose-800">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>{editError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit}
                      className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-xs font-medium cursor-pointer shrink-0"
                    >
                      Retry Save
                    </button>
                  </div>
                )}

                {/* READ-ONLY REPORT VIEW */}
                {!isEditing ? (
                  <div className="space-y-6">
                    {/* Mood & Energy Pill Bar */}
                    <div className="flex flex-wrap items-center gap-3 p-3 bg-[#EFE9DE]/50 border border-[#DCD5C9] rounded-xs">
                      {activeEntry.energyLevel && (
                        <div className="flex items-center gap-2 text-xs font-sans text-[#52595C]">
                          <span className="text-[#52595C]/80">Physical Energy:</span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#FDFAF6] border border-[#DCD5C9] text-[#242728]">
                            <TokenGlyph level={activeEntry.energyLevel} className="h-3 w-3" />
                            <span>{GRADIENT_STEPS[activeEntry.energyLevel].energyTitle} ({GRADIENT_STEPS[activeEntry.energyLevel].name})</span>
                          </span>
                        </div>
                      )}

                      {activeEntry.moodTone && (
                        <div className="flex items-center gap-2 text-xs font-sans text-[#52595C]">
                          <span className="text-[#52595C]/80">Emotional Weather:</span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#FDFAF6] border border-[#DCD5C9] text-[#242728]">
                            <TokenGlyph level={activeEntry.moodTone} className="h-3 w-3" />
                            <span>{GRADIENT_STEPS[activeEntry.moodTone].moodTitle}</span>
                          </span>
                        </div>
                      )}

                      {activeEntry.weather && (
                        <div className="flex items-center gap-2 text-xs font-sans text-[#52595C]">
                          <span className="text-[#52595C]/80">Ambient Environment:</span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#FDFAF6] border border-[#DCD5C9] text-[#242728]">
                            {getWeatherIcon(activeEntry.weather.icon, activeEntry.weather.daylightPhase)}
                            <span>{activeEntry.weather.temperatureC}°C ({activeEntry.weather.temperatureF}°F)</span>
                            <span className="text-[#52595C]">· {activeEntry.weather.condition}</span>
                            <span className="text-[#52595C]/70">· {activeEntry.weather.locationName}</span>
                            {activeEntry.weather.daylightPhase && (
                              <span className="text-[#BD7014] text-[11px] font-serif italic">
                                ({getDaylightLabel(activeEntry.weather.daylightPhase)})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Consolidated Check-in Responses */}
                    <div className="space-y-4">
                      {activeEntry.mentalEnergy && (
                        <div className="p-4 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs space-y-1">
                          <span className="font-sans text-xs text-[#52595C] block">
                            Occupied headspace
                          </span>
                          <p className="font-serif text-base text-[#242728] leading-relaxed">
                            {activeEntry.mentalEnergy}
                          </p>
                        </div>
                      )}

                      {activeEntry.standoutMoment && (
                        <div className="p-4 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs space-y-1">
                          <span className="font-sans text-xs text-[#52595C] block">
                            Standout moment & sensory detail
                          </span>
                          <p className="font-serif text-base text-[#242728] leading-relaxed italic">
                            "{activeEntry.standoutMoment}"
                          </p>
                        </div>
                      )}

                      {activeEntry.smallWin && (
                        <div className="p-4 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs space-y-1">
                          <span className="font-sans text-xs text-[#52595C] block">
                            A win or something handled
                          </span>
                          <p className="font-serif text-base text-[#242728] leading-relaxed">
                            {activeEntry.smallWin}
                          </p>
                        </div>
                      )}

                      {activeEntry.freeText && (
                        <div className="p-4 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs space-y-1">
                          <span className="font-sans text-xs text-[#52595C] block">
                            Open reflection
                          </span>
                          <div className="font-serif text-base text-[#242728] leading-relaxed whitespace-pre-wrap">
                            {activeEntry.freeText}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* LINKED ANALYSIS SECTION */}
                    {activeEntry.analysis ? (
                      <article className="relative p-6 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs space-y-5 shadow-2xs mt-6">
                        {/* Staleness Note banner */}
                        {activeEntry.analysis.isStale && (
                          <div className="p-3 bg-[#FBF1E4] border border-[#E5B880] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans text-[#242728]">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-[#BD7014] shrink-0" />
                              <span>
                                {activeEntry.analysis.staleReason || 'Reflection updated after this insight was generated.'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleReanalyze}
                              disabled={isReanalyzing}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#BD7014] hover:bg-[#9E5E10] text-white rounded-xs font-medium transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                            >
                              {isReanalyzing ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3" />
                              )}
                              <span>Re-analyze</span>
                            </button>
                          </div>
                        )}

                        <div className="flex items-baseline justify-between border-b border-[#DCD5C9] pb-3">
                          <div>
                            <span className="font-sans text-xs text-[#52595C] block">
                              Gemini Perspective
                            </span>
                            <h4 className="font-serif text-xl font-normal text-[#242728] mt-0.5">
                              Considered Synthesis
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-sans text-xs text-[#52595C]">
                              {activeEntry.analysis.detectedMood}
                            </span>
                            {!activeEntry.analysis.isStale && (
                              <button
                                type="button"
                                onClick={handleReanalyze}
                                disabled={isReanalyzing}
                                title="Re-analyze with Gemini"
                                className="p-1 text-[#52595C] hover:text-[#BD7014] rounded-xs transition-colors cursor-pointer"
                              >
                                {isReanalyzing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {reanalyzeError && (
                          <p className="font-sans text-xs text-rose-700 bg-rose-50 p-2 rounded-xs border border-rose-200">
                            {reanalyzeError}
                          </p>
                        )}

                        {/* Visualizer */}
                        <MoodScoreVisualizer
                          score={activeEntry.analysis.moodScore}
                          detectedMood={activeEntry.analysis.detectedMood}
                        />

                        {/* Themes */}
                        {activeEntry.analysis.themes && activeEntry.analysis.themes.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="font-sans text-xs text-[#52595C]">Thematic threads</span>
                            <div className="flex flex-wrap gap-1.5">
                              {activeEntry.analysis.themes.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-0.5 bg-[#EFE9DE] border border-[#DCD5C9] text-[#52595C] font-sans text-xs rounded-full"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Synthesis Text */}
                        <div className="font-serif text-base sm:text-lg text-[#242728] leading-relaxed italic space-y-2">
                          <ReactMarkdown>{activeEntry.analysis.reflection}</ReactMarkdown>
                        </div>

                        {/* Gentle tip */}
                        {activeEntry.analysis.gentleTip && (
                          <div className="p-3.5 bg-[#EFE9DE] border-l-2 border-[#BD7014] rounded-r-xs space-y-1">
                            <span className="font-sans text-xs text-[#BD7014] font-semibold block">
                              Gentle thought
                            </span>
                            <p className="font-serif text-sm sm:text-base text-[#242728] leading-relaxed">
                              {activeEntry.analysis.gentleTip}
                            </p>
                          </div>
                        )}
                      </article>
                    ) : (
                      <div className="p-5 bg-[#EFE9DE]/50 border border-[#DCD5C9] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="font-serif text-base text-[#242728]">
                            No perspective note yet recorded
                          </p>
                          <p className="font-sans text-xs text-[#52595C]">
                            Would you like Gemini to read this day's check-in?
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleReanalyze}
                          disabled={isReanalyzing}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#242728] hover:bg-[#383D3F] text-[#FDFAF6] font-sans text-xs rounded-xs transition-colors cursor-pointer shadow-2xs"
                        >
                          {isReanalyzing ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 text-[#BD7014]" />
                          )}
                          <span>Generate perspective</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* EDIT FORM FIELDS VIEW */
                  <div className="space-y-6">
                    <section className="space-y-2">
                      <label className="font-serif text-base font-normal text-[#242728] block">
                        Physical Energy & Bandwidth
                      </label>
                      <TokenSelector
                        idPrefix="archive-edit-energy"
                        type="energy"
                        value={editEnergy}
                        onChange={setEditEnergy}
                      />
                    </section>

                    <section className="space-y-2">
                      <label className="font-serif text-base font-normal text-[#242728] block">
                        Emotional Weather & Tone
                      </label>
                      <TokenSelector
                        idPrefix="archive-edit-mood"
                        type="mood"
                        value={editMood}
                        onChange={setEditMood}
                      />
                    </section>

                    <section className="space-y-1.5">
                      <label className="font-serif text-base font-normal text-[#242728] block">
                        Occupied Headspace
                      </label>
                      <textarea
                        rows={2}
                        value={editMental}
                        onChange={(e) => setEditMental(e.target.value)}
                        className="w-full bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs p-3 font-serif text-base text-[#242728] focus:outline-none focus:border-[#BD7014]"
                      />
                    </section>

                    <section className="space-y-1.5">
                      <label className="font-serif text-base font-normal text-[#242728] block">
                        Standout Moment
                      </label>
                      <textarea
                        rows={2}
                        value={editStandout}
                        onChange={(e) => setEditStandout(e.target.value)}
                        className="w-full bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs p-3 font-serif text-base text-[#242728] focus:outline-none focus:border-[#BD7014]"
                      />
                    </section>

                    <section className="space-y-1.5">
                      <label className="font-serif text-base font-normal text-[#242728] block">
                        Small Win
                      </label>
                      <textarea
                        rows={2}
                        value={editWin}
                        onChange={(e) => setEditWin(e.target.value)}
                        className="w-full bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs p-3 font-serif text-base text-[#242728] focus:outline-none focus:border-[#BD7014]"
                      />
                    </section>

                    <section className="space-y-1.5">
                      <label className="font-serif text-base font-normal text-[#242728] block">
                        Open Reflection
                      </label>
                      <textarea
                        rows={4}
                        value={editFreeText}
                        onChange={(e) => setEditFreeText(e.target.value)}
                        className="w-full bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs p-3 font-serif text-base text-[#242728] focus:outline-none focus:border-[#BD7014]"
                      />
                    </section>
                  </div>
                )}
              </div>
            ) : (
              /* EMPTY DAY VIEW */
              <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4 my-auto">
                <Clock className="h-8 w-8 text-[#52595C]/40" />
                <div className="space-y-1 max-w-sm">
                  <h4 className="font-serif text-xl font-light text-[#242728]">
                    No entry recorded
                  </h4>
                  <p className="font-sans text-xs text-[#52595C]">
                    There is no reflection recorded for {formattedSelectedDate}.
                  </p>
                </div>
                {selectedDateStr === todayStr && onOpenEntryInWorkspace && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                    }}
                    className="px-4 py-2 bg-[#242728] hover:bg-[#383D3F] text-[#FDFAF6] font-sans text-xs rounded-xs transition-colors cursor-pointer shadow-xs"
                  >
                    Open today's page
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

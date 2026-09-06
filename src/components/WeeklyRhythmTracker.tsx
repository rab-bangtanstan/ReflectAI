import React, { useMemo } from 'react';
import { Calendar as CalendarIcon, TrendingUp } from 'lucide-react';
import { JournalEntry } from '../types';
import { GRADIENT_STEPS } from './MoodEnergyTokens';
import { toLocalDateString, getEntriesPresenceMap } from '../utils/datePresence';

interface WeeklyRhythmTrackerProps {
  entries: JournalEntry[];
  compact?: boolean;
  className?: string;
  onOpenCalendar?: (dateStr?: string) => void;
  onOpenPatterns?: () => void;
}

export const WeeklyRhythmTracker: React.FC<WeeklyRhythmTrackerProps> = ({
  entries,
  compact = false,
  className = '',
  onOpenCalendar,
  onOpenPatterns
}) => {
  // Shared presence mapping to guarantee perfect consistency with the month calendar
  const presenceMap = useMemo(() => {
    return getEntriesPresenceMap(entries);
  }, [entries]);

  // Compute past 7 days calendar using local dates
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toLocalDateString(today), [today]);

  const dayStatuses = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d;
    });

    return days.map((date) => {
      const dateStr = toLocalDateString(date);
      const matching = presenceMap.get(dateStr) || [];
      const isToday = dateStr === todayStr;
      const hasEntry = matching.length > 0;
      const latestTone = hasEntry ? (matching[0].moodTone || matching[0].energyLevel || 3) : null;

      return {
        date,
        dateStr,
        weekday: date.toLocaleDateString('en-US', { weekday: 'narrow' }),
        weekdayShort: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate(),
        isToday,
        hasEntry,
        tone: latestTone,
        count: matching.length
      };
    });
  }, [today, todayStr, presenceMap]);

  // Calculate streak (consecutive days back from today or yesterday)
  const streak = useMemo(() => {
    let s = 0;
    for (let i = dayStatuses.length - 1; i >= 0; i--) {
      if (dayStatuses[i].hasEntry) {
        s++;
      } else if (dayStatuses[i].isToday) {
        // If today hasn't been written yet, don't break streak if yesterday had an entry
        continue;
      } else {
        break;
      }
    }
    return s;
  }, [dayStatuses]);

  const completedCountThisWeek = dayStatuses.filter(d => d.hasEntry).length;

  if (compact) {
    return (
      <div className={`space-y-2 select-none ${className}`}>
        <div className="flex items-center justify-between font-sans text-xs text-[#52595C]">
          <div className="flex items-center gap-1.5">
            <span className="font-serif italic">This week's rhythm</span>
            {onOpenPatterns && (
              <button
                type="button"
                onClick={() => onOpenPatterns()}
                title="View reflective patterns & download PDF report"
                className="p-0.5 text-[#52595C] hover:text-[#BD7014] rounded-xs cursor-pointer transition-colors"
                aria-label="Open patterns & report"
              >
                <TrendingUp className="h-3 w-3" />
              </button>
            )}
            {onOpenCalendar && (
              <button
                type="button"
                onClick={() => onOpenCalendar()}
                title="View full month calendar archive"
                className="p-0.5 text-[#52595C] hover:text-[#BD7014] rounded-xs cursor-pointer transition-colors"
                aria-label="Open month calendar"
              >
                <CalendarIcon className="h-3 w-3" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenCalendar ? () => onOpenCalendar() : undefined}
            className={`font-medium text-[#242728] ${onOpenCalendar ? 'hover:text-[#BD7014] cursor-pointer' : ''}`}
          >
            {streak > 0 ? `${streak} day${streak > 1 ? 's' : ''} in flow` : `${completedCountThisWeek} of 7 days`}
          </button>
        </div>

        <div className="flex items-center justify-between gap-1">
          {dayStatuses.map((item) => {
            const step = item.tone ? GRADIENT_STEPS[item.tone] : null;
            return (
              <div 
                key={item.dateStr} 
                onClick={onOpenCalendar ? () => onOpenCalendar(item.dateStr) : undefined}
                className={`flex flex-col items-center gap-1 flex-1 text-center ${onOpenCalendar ? 'cursor-pointer group' : ''}`}
                title={`${item.weekdayShort}, ${item.dateStr}: ${item.hasEntry ? `${item.count} reflection${item.count > 1 ? 's' : ''}` : 'Unwritten'}`}
              >
                <span className={`font-sans text-[10px] ${item.isToday ? 'font-bold text-[#242728]' : 'text-[#52595C]/75 group-hover:text-[#242728]'}`}>
                  {item.weekday}
                </span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    item.hasEntry && step
                      ? 'shadow-2xs ring-1 ring-black/5 group-hover:scale-105'
                      : item.isToday
                        ? 'border border-dashed border-[#BD7014] bg-[#FDFAF6] group-hover:border-[#242728]'
                        : 'border border-[#DCD5C9] bg-[#FDFAF6]/60 group-hover:border-[#BD7014]'
                  }`}
                  style={item.hasEntry && step ? { backgroundColor: step.bgHex, borderColor: step.borderHex, color: step.hex } : undefined}
                >
                  {item.hasEntry ? (
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: step?.hex || '#2B6B55' }} />
                  ) : (
                    <span className="font-sans text-[9px] text-[#52595C]/50">{item.dayNum}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs space-y-3.5 select-none shadow-2xs ${className}`}>
      <div className="flex items-baseline justify-between border-b border-[#DCD5C9] pb-2.5">
        <div>
          <span className="font-sans text-xs text-[#52595C] block">Reflection rhythm</span>
          <h4 className="font-serif text-lg font-normal text-[#242728]">
            {streak > 1 ? `${streak} days of mindful presence` : 'Your weekly circle'}
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-[#2B6B55] font-medium bg-[#E3ECE7] px-2.5 py-0.5 rounded-full">
            {completedCountThisWeek} of 7 days captured
          </span>
          {onOpenPatterns && (
            <button
              type="button"
              onClick={() => onOpenPatterns()}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-[#BD7014]/40 hover:border-[#BD7014] text-xs font-sans text-[#242728] rounded-xs bg-[#FDFAF6] transition-colors cursor-pointer"
            >
              <TrendingUp className="h-3 w-3 text-[#BD7014]" />
              <span>Patterns & Report</span>
            </button>
          )}
          {onOpenCalendar && (
            <button
              type="button"
              onClick={() => onOpenCalendar()}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-[#DCD5C9] hover:border-[#242728] text-xs font-sans text-[#52595C] hover:text-[#242728] rounded-xs bg-[#FDFAF6] transition-colors cursor-pointer"
            >
              <CalendarIcon className="h-3 w-3 text-[#BD7014]" />
              <span>Month archive</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 sm:gap-2 pt-1">
        {dayStatuses.map((item) => {
          const step = item.tone ? GRADIENT_STEPS[item.tone] : null;
          return (
            <div 
              key={item.dateStr}
              onClick={onOpenCalendar ? () => onOpenCalendar(item.dateStr) : undefined}
              className={`flex flex-col items-center gap-1.5 flex-1 ${onOpenCalendar ? 'cursor-pointer group' : ''}`}
              title={`${item.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}
            >
              <span className={`font-sans text-xs ${item.isToday ? 'font-bold text-[#242728]' : 'text-[#52595C] group-hover:text-[#242728]'}`}>
                {item.weekday}
              </span>
              <div 
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex flex-col items-center justify-center transition-all ${
                  item.hasEntry && step
                    ? 'border shadow-2xs group-hover:scale-105'
                    : item.isToday
                      ? 'border-2 border-dashed border-[#BD7014] bg-[#FDFAF6] group-hover:border-[#242728]'
                      : 'border border-[#DCD5C9] bg-[#EFE9DE]/50 group-hover:border-[#BD7014]'
                }`}
                style={item.hasEntry && step ? { backgroundColor: step.bgHex, borderColor: step.borderHex, color: step.hex } : undefined}
              >
                {item.hasEntry && step ? (
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: step.hex }} />
                ) : (
                  <span className="font-sans text-[11px] text-[#52595C]/60">{item.dayNum}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { 
  BookOpen, 
  Trash2, 
  Search, 
  Plus
} from 'lucide-react';
import { JournalEntry, ReflectionCategory } from '../types';
import { GRADIENT_STEPS, TokenGlyph } from './MoodEnergyTokens';
import { WeeklyRhythmTracker } from './WeeklyRhythmTracker';

interface JournalSidebarProps {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
  onDeleteEntry: (id: string, e: React.MouseEvent) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  onOpenCalendar?: (dateStr?: string) => void;
  onOpenPatterns?: () => void;
}

const CATEGORIES = [
  'All',
  'Daily Reflection',
  'Mindfulness',
  'Gratitude',
  'Personal Growth',
  'Brainstorming'
];

export const JournalSidebar: React.FC<JournalSidebarProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onNewEntry,
  onDeleteEntry,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onOpenCalendar,
  onOpenPatterns
}) => {
  const filteredEntries = entries.filter(e => {
    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.mentalEnergy && e.mentalEnergy.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.standoutMoment && e.standoutMoment.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.smallWin && e.smallWin.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.freeText && e.freeText.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.initialPrompt && e.initialPrompt.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
      <aside className="w-full md:w-80 lg:w-88 flex flex-col bg-[#EFE9DE] border-r border-[#DCD5C9] h-full overflow-hidden shrink-0 select-none font-serif">
      {/* Search & Filter Header */}
      <div className="p-5 border-b border-[#DCD5C9] space-y-3.5 bg-[#EFE9DE]">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-normal text-[#242728]">
            Past reflections
          </h2>
          <span className="font-sans text-xs text-[#52595C]">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'page' : 'pages'}
          </span>
        </div>

        {/* Calm Search Bar */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#52595C] pointer-events-none" />
          <input
            id="search-entries-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search words, moments, thoughts..."
            className="w-full pl-8 pr-3 py-2 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs text-xs text-[#242728] font-sans placeholder:italic placeholder:text-[#52595C]/60 focus:outline-none focus:border-[#BD7014] transition-colors"
          />
        </div>

        {/* Gentle Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-2.5 py-1 text-xs font-sans rounded-xs transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === cat 
                  ? 'bg-[#242728] text-[#FDFAF6]' 
                  : 'bg-[#FDFAF6] border border-[#DCD5C9] text-[#52595C] hover:border-[#BD7014]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Rhythm Flow */}
      <div className="px-5 py-3.5 border-b border-[#DCD5C9] bg-[#FDFAF6]/70">
        <WeeklyRhythmTracker entries={entries} compact onOpenCalendar={onOpenCalendar} onOpenPatterns={onOpenPatterns} />
      </div>

      {/* Pages Chronicle List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <BookOpen className="h-5 w-5 mx-auto text-[#52595C]/50" />
            <p className="font-serif text-sm text-[#52595C] italic">
              {searchQuery || selectedCategory !== 'All' 
                ? 'No matching pages found.' 
                : 'Your notebook is waiting for its first entry.'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = entry.id === selectedEntryId;
            const dateObj = new Date(entry.createdAt || entry.updatedAt);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            });
            const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

            // Concrete mood / energy level
            const toneLevel = entry.moodTone || entry.energyLevel || 3;
            const stepInfo = GRADIENT_STEPS[toneLevel];

            // Preview excerpt
            const previewText = entry.standoutMoment || 
              entry.mentalEnergy || 
              entry.smallWin || 
              entry.freeText || 
              entry.summary || 
              entry.initialPrompt || 
              (entry.messages[0]?.content) || 
              'Empty check-in';

            return (
              <div
                key={entry.id}
                id={`journal-item-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className={`group relative p-3.5 transition-all cursor-pointer rounded-xs border select-none ${
                  isSelected 
                    ? 'bg-[#FDFAF6] border-[#242728] shadow-xs ring-1 ring-[#242728]/20' 
                    : 'bg-[#FDFAF6]/75 border-[#DCD5C9] hover:bg-[#FDFAF6] hover:border-[#BD7014]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-sans text-xs text-[#52595C]">
                    <span className="font-medium text-[#242728]">{weekday}, {formattedDate}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Concrete Token Glyph along the gradient */}
                    <div 
                      className="w-5 h-5 rounded-xs flex items-center justify-center"
                      style={{ backgroundColor: stepInfo.bgHex, color: stepInfo.hex }}
                      title={`${stepInfo.colorName}: ${stepInfo.moodTitle}`}
                    >
                      <TokenGlyph level={toneLevel} className="w-3.5 h-3.5" />
                    </div>

                    <button
                      id={`delete-entry-${entry.id}`}
                      type="button"
                      title="Delete page"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEntry(entry.id, e);
                      }}
                      className="opacity-40 group-hover:opacity-100 hover:!opacity-100 text-[#52595C] hover:text-rose-700 p-0.5 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <h3 className={`font-serif text-base leading-snug line-clamp-1 transition-colors ${
                  isSelected ? 'text-[#242728] font-normal' : 'text-[#242728]/85 group-hover:text-[#242728]'
                }`}>
                  {entry.title || 'Untitled reflection'}
                </h3>

                <p className="font-serif text-xs text-[#52595C] italic line-clamp-2 mt-1 leading-relaxed">
                  "{previewText}"
                </p>

                <div className="mt-2.5 pt-1.5 border-t border-[#DCD5C9]/60 flex items-center justify-between font-sans text-[11px] text-[#52595C]">
                  <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                    <span>{entry.category}</span>
                    {entry.weather && (
                      <span className="text-[#52595C]/80 truncate">· {entry.weather.temperatureC}°C {entry.weather.condition}</span>
                    )}
                  </div>
                  {entry.analysis && (
                    <span className="text-[#2B6B55] font-medium shrink-0">Reflected</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Sticky Action: New check-in */}
      <div className="p-4 border-t border-[#DCD5C9] bg-[#EFE9DE]">
        <button
          id="new-reflection-btn"
          onClick={onNewEntry}
          className="w-full font-sans text-xs py-3 px-4 bg-[#FDFAF6] border border-[#242728] hover:bg-[#242728] hover:text-[#FDFAF6] text-[#242728] rounded-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New check-in</span>
        </button>
      </div>
    </aside>
  );
};

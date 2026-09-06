import React, { useState, useEffect } from 'react';
import { 
  auth, 
  signInWithGoogle, 
  signInAsGuest, 
  signOutUser, 
  getSavedLocalUser,
  saveJournalEntry, 
  loadUserJournalEntries, 
  getLocalUserJournalEntries,
  subscribeUserJournalEntries,
  deleteUserJournalEntry 
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { UserProfile, JournalEntry } from './types';
import { LandingPage } from './components/LandingPage';
import { JournalSidebar } from './components/JournalSidebar';
import { ReflectionWorkspace } from './components/ReflectionWorkspace';
import { ConcentricRippleMark } from './components/MoodEnergyTokens';
import { WeeklyRhythmTracker } from './components/WeeklyRhythmTracker';
import { AmbientSoundscape } from './components/AmbientSoundscape';
import { CalendarArchiveModal } from './components/CalendarArchiveModal';
import { PatternsInsightsModal } from './components/PatternsInsightsModal';
import { 
  LogOut, 
  User as UserIcon, 
  Menu,
  X,
  BookOpen,
  Calendar as CalendarIcon,
  TrendingUp
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<'workspace' | 'landing'>('workspace');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);

  // Calendar Archive & Focus Mode State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarSelectedDateStr, setCalendarSelectedDateStr] = useState<string | undefined>(undefined);
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);
  const [isPatternsOpen, setIsPatternsOpen] = useState(false);

  const handleOpenCalendar = (dateStr?: string) => {
    if (isFocusModeActive) return;
    setCalendarSelectedDateStr(dateStr);
    setIsCalendarOpen(true);
  };

  // 1. Observe Authentication state
  useEffect(() => {
    const localUser = getSavedLocalUser();
    if (localUser) {
      setUser(localUser);
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Writer',
          photoURL: fbUser.photoURL,
          createdAt: new Date().toISOString()
        };
        setUser(profile);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Load user's isolated entries when user logs in with instant cache & real-time sync
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setSelectedEntryId(null);
      return;
    }

    // Step A: Immediately load from local cache with 0ms delay
    const immediateCached = getLocalUserJournalEntries(user.uid);
    if (immediateCached.length > 0) {
      setEntries(immediateCached);
      setSelectedEntryId(prev => (prev && immediateCached.some(e => e.id === prev)) ? prev : immediateCached[0].id);
    }

    // Step B: Connect real-time Firestore sync that updates seamlessly in the background
    const unsubscribe = subscribeUserJournalEntries(user.uid, (syncedEntries) => {
      setEntries(syncedEntries);
      if (syncedEntries.length > 0) {
        setSelectedEntryId(prev => (prev && syncedEntries.some(e => e.id === prev)) ? prev : syncedEntries[0].id);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const profile = await signInWithGoogle();
      setUser(profile);
      setCurrentView('workspace');
    } catch (e: any) {
      setAuthError(e.message || 'Authentication encountered an issue.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestSignIn = () => {
    const guest = signInAsGuest();
    setUser(guest);
    setCurrentView('workspace');
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setEntries([]);
    setSelectedEntryId(null);
    setCurrentView('landing');
  };

  const handleCreateNewEntry = () => {
    if (!user) return;
    const newEntry: JournalEntry = {
      id: 'entry_' + Date.now(),
      userId: user.uid,
      title: 'Today’s reflection',
      initialPrompt: '',
      category: 'Daily Reflection',
      energyLevel: 3,
      moodTone: 3,
      mentalEnergy: '',
      standoutMoment: '',
      smallWin: '',
      freeText: '',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setEntries(prev => [newEntry, ...prev]);
    setSelectedEntryId(newEntry.id);
    saveJournalEntry(user.uid, newEntry);
  };

  const handleUpdateEntry = async (updated: JournalEntry) => {
    if (!user) return;
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    await saveJournalEntry(user.uid, updated);
  };

  const handleRequestDelete = (entryId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = entries.find(item => item.id === entryId);
    if (target) {
      setEntryToDelete(target);
    }
  };

  const handleConfirmDelete = async () => {
    if (!user || !entryToDelete) return;
    const targetId = entryToDelete.id;
    setEntryToDelete(null);

    const remaining = entries.filter(e => e.id !== targetId);
    setEntries(remaining);
    if (selectedEntryId === targetId) {
      setSelectedEntryId(remaining.length > 0 ? remaining[0].id : null);
    }

    try {
      await deleteUserJournalEntry(user.uid, targetId);
    } catch (err) {
      console.warn('Failed to delete entry from database:', err);
    }
  };

  // If not authenticated or user requested overview, show landing page
  if (!user || currentView === 'landing') {
    return (
      <LandingPage
        user={user}
        onSignIn={handleGoogleSignIn}
        onGuestSignIn={handleGuestSignIn}
        onOpenWorkspace={() => setCurrentView('workspace')}
        onNewEntry={() => {
          handleCreateNewEntry();
          setCurrentView('workspace');
        }}
        onSignOut={handleSignOut}
        entriesCount={entries.length}
        isLoading={authLoading}
        error={authError}
      />
    );
  }

  const currentEntry = entries.find(e => e.id === selectedEntryId) || entries[0];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#EFE9DE] text-[#242728] overflow-hidden font-serif selection:bg-[#DCD5C9] selection:text-[#242728]">
      {/* Top Application Navigation Bar */}
      <header className="h-16 border-b border-[#DCD5C9] bg-[#FDFAF6]/90 px-6 sm:px-8 flex items-center justify-between z-30 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <button
            id="toggle-mobile-sidebar-btn"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-1.5 text-[#242728] hover:bg-[#EFE9DE] rounded-xs cursor-pointer"
            aria-label="Toggle navigation drawer"
          >
            {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Clickable Brand with Concentric Ripple mark to return to Overview */}
          <button
            id="brand-overview-btn"
            onClick={() => setCurrentView('landing')}
            title="Return to notebook cover (Remain signed in)"
            className="flex items-center gap-2.5 text-left hover:opacity-85 transition-opacity cursor-pointer"
          >
            <ConcentricRippleMark size={28} id="app-ripple-logo" />
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-normal font-serif tracking-tight text-[#242728]">
                ReflectAI
              </span>
              <span className="hidden sm:inline text-xs text-[#52595C] italic">
                A quiet journal
              </span>
            </div>
          </button>

          {/* Notebook Cover Button */}
          <button
            id="nav-home-overview-btn"
            onClick={() => setCurrentView('landing')}
            title="View notebook overview"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#DCD5C9] bg-[#FDFAF6] hover:border-[#242728] text-xs font-sans text-[#52595C] hover:text-[#242728] rounded-xs transition-colors cursor-pointer ml-1"
          >
            <BookOpen className="h-3 w-3" />
            <span>Notebook cover</span>
          </button>

          {/* Calendar Archive Button */}
          {!isFocusModeActive && (
            <button
              id="nav-calendar-archive-btn"
              onClick={() => handleOpenCalendar()}
              title="Open month calendar & archive"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#DCD5C9] bg-[#FDFAF6] hover:border-[#242728] text-xs font-sans text-[#52595C] hover:text-[#242728] rounded-xs transition-colors cursor-pointer ml-1"
            >
              <CalendarIcon className="h-3 w-3 text-[#BD7014]" />
              <span className="hidden xs:inline">Calendar archive</span>
            </button>
          )}

          {/* Patterns & Report Button */}
          {!isFocusModeActive && (
            <button
              id="nav-patterns-report-btn"
              onClick={() => setIsPatternsOpen(true)}
              title="Open reflective patterns & download PDF report"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#BD7014]/40 bg-[#FDFAF6] hover:border-[#BD7014] text-xs font-sans text-[#242728] rounded-xs transition-colors cursor-pointer ml-1"
            >
              <TrendingUp className="h-3 w-3 text-[#BD7014]" />
              <span className="hidden xs:inline font-medium">Patterns & Report</span>
            </button>
          )}
        </div>

        {/* User profile, Ambient Soundscape & Sign out */}
        <div className="flex items-center gap-3">
          <AmbientSoundscape />

          <div className="flex items-center gap-2">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'Avatar'} 
                className="h-7 w-7 object-cover rounded-xs border border-[#DCD5C9]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-7 w-7 bg-[#242728] text-[#FDFAF6] flex items-center justify-center font-sans text-xs rounded-xs">
                {user.displayName?.charAt(0) || 'W'}
              </div>
            )}
            <div className="hidden md:block text-left font-sans text-xs leading-tight">
              <p className="font-medium text-[#242728] line-clamp-1">{user.displayName}</p>
              <p className="text-[11px] text-[#52595C]">{user.email ? 'Connected' : 'Guest'}</p>
            </div>
          </div>

          <button
            id="sign-out-btn"
            onClick={handleSignOut}
            title="Sign out"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#DCD5C9] bg-[#FDFAF6] hover:border-[#242728] text-xs font-sans text-[#52595C] hover:text-[#242728] rounded-xs transition-colors cursor-pointer shadow-2xs"
          >
            <LogOut className="h-3 w-3" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main App Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop & Mobile Sidebar Drawer */}
        <div className={`${mobileSidebarOpen ? 'block absolute inset-0 z-40 bg-black/20 md:relative md:bg-transparent' : 'hidden md:flex'}`}>
          <JournalSidebar
            entries={entries}
            selectedEntryId={selectedEntryId}
            onSelectEntry={(entry) => {
              setSelectedEntryId(entry.id);
              setMobileSidebarOpen(false);
            }}
            onNewEntry={() => {
              handleCreateNewEntry();
              setMobileSidebarOpen(false);
            }}
            onDeleteEntry={handleRequestDelete}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onOpenCalendar={handleOpenCalendar}
            onOpenPatterns={() => setIsPatternsOpen(true)}
          />
        </div>

        {/* Main Canvas */}
        {currentEntry ? (
          <ReflectionWorkspace
            key={currentEntry.id}
            entry={currentEntry}
            allEntries={entries}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleRequestDelete}
            onFocusModeChange={(active) => {
              setIsFocusModeActive(active);
              if (active) setIsCalendarOpen(false);
            }}
            userId={user.uid}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#EFE9DE] p-6 sm:p-10 text-center space-y-6 font-serif overflow-y-auto">
            <ConcentricRippleMark size={48} className="mb-1" />
            <div className="space-y-1 max-w-sm">
              <h3 className="text-2xl font-light text-[#242728]">Your page is open</h3>
              <p className="font-sans text-xs text-[#52595C]">
                Take a quiet breath and mark how you feel today.
              </p>
            </div>

            <WeeklyRhythmTracker 
              entries={entries} 
              onOpenCalendar={handleOpenCalendar}
              className="max-w-md w-full text-left" 
            />

            <button
              onClick={handleCreateNewEntry}
              className="px-6 py-3 bg-[#242728] hover:bg-[#383D3F] text-[#FDFAF6] font-sans text-xs rounded-xs transition-colors cursor-pointer shadow-xs"
            >
              Start today's reflection
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Slip Modal */}
      {entryToDelete && (
        <div 
          id="delete-confirmation-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-xs p-4"
          onClick={() => setEntryToDelete(null)}
        >
          <div 
            id="delete-confirmation-dialog"
            className="bg-[#FDFAF6] border border-[#DCD5C9] p-6 max-w-sm w-full rounded-xs shadow-md space-y-4 font-serif"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <span className="font-sans text-xs text-[#52595C]">Remove page</span>
              <h3 className="text-xl font-normal text-[#242728]">Remove this reflection?</h3>
            </div>
            <p className="font-serif text-sm text-[#52595C] leading-relaxed italic">
              "{entryToDelete.title || 'Untitled page'}" will be quietly removed from your journal archive.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DCD5C9]">
              <button
                id="cancel-delete-btn"
                type="button"
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 border border-[#DCD5C9] hover:border-[#242728] font-sans text-xs text-[#52595C] hover:text-[#242728] rounded-xs transition-colors cursor-pointer"
              >
                Keep page
              </button>
              <button
                id="confirm-delete-btn"
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-sans text-xs rounded-xs transition-colors cursor-pointer shadow-xs"
              >
                Delete page
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Calendar / Archive Modal */}
      {user && (
        <CalendarArchiveModal
          isOpen={isCalendarOpen && !isFocusModeActive}
          onClose={() => setIsCalendarOpen(false)}
          entries={entries}
          userId={user.uid}
          onUpdateEntry={handleUpdateEntry}
          onOpenEntryInWorkspace={(entry) => {
            setSelectedEntryId(entry.id);
            setCurrentView('workspace');
            setIsCalendarOpen(false);
          }}
          initialSelectedDateStr={calendarSelectedDateStr}
        />
      )}

      {/* Patterns & PDF Report Modal */}
      {user && (
        <PatternsInsightsModal
          isOpen={isPatternsOpen && !isFocusModeActive}
          onClose={() => setIsPatternsOpen(false)}
          entries={entries}
          user={user}
          onSelectDateFromChart={handleOpenCalendar}
          onUserSignedIn={(profile) => setUser(profile)}
        />
      )}
    </div>
  );
}

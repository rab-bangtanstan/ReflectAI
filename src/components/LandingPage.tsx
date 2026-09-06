import React from 'react';
import { 
  Lock, 
  BookOpen, 
  UserCheck
} from 'lucide-react';
import { UserProfile } from '../types';
import { GRADIENT_STEPS, TokenGlyph, ConcentricRippleMark } from './MoodEnergyTokens';
import { AmbientSoundscape } from './AmbientSoundscape';

interface LandingPageProps {
  user?: UserProfile | null;
  onSignIn: () => Promise<void>;
  onGuestSignIn: () => void;
  onOpenWorkspace: () => void;
  onNewEntry?: () => void;
  onSignOut: () => void;
  entriesCount?: number;
  isLoading: boolean;
  error?: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  user,
  onSignIn,
  onGuestSignIn,
  onOpenWorkspace,
  onNewEntry,
  onSignOut,
  entriesCount = 0,
  isLoading,
  error
}) => {
  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'Writer';

  return (
    <div className="min-h-screen bg-[#EFE9DE] text-[#242728] font-serif flex flex-col justify-between selection:bg-[#DCD5C9] selection:text-[#242728]">
      {/* Quiet Top Navigation Strip */}
      <header className="border-b border-[#DCD5C9] bg-[#FDFAF6]/90 backdrop-blur-xs sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConcentricRippleMark size={32} id="header-ripple-logo" />
            <div className="flex items-baseline gap-2.5">
              <span className="text-xl font-normal tracking-tight font-serif text-[#242728]">ReflectAI</span>
              <span className="hidden sm:inline text-xs text-[#52595C] italic">A quiet daily notebook</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AmbientSoundscape />
            {user ? (
              <div className="flex items-center gap-3">
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
                      {firstName.charAt(0)}
                    </div>
                  )}
                  <span className="hidden md:inline font-sans text-xs text-[#242728]">
                    {firstName}
                  </span>
                </div>

                <button
                  id="header-open-workspace-btn"
                  onClick={onOpenWorkspace}
                  className="px-4 py-2 bg-[#242728] text-[#FDFAF6] font-sans text-xs rounded-xs hover:bg-[#383D3F] transition-all cursor-pointer"
                >
                  Open notebook
                </button>

                <button
                  id="header-signout-btn"
                  onClick={onSignOut}
                  title="Sign Out"
                  className="px-3 py-2 border border-[#DCD5C9] bg-[#FDFAF6] text-xs font-sans text-[#52595C] hover:border-[#242728] hover:text-[#242728] rounded-xs transition-all cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                id="header-signin-btn"
                onClick={onSignIn}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#242728] text-[#FDFAF6] font-sans text-xs rounded-xs hover:bg-[#383D3F] transition-all disabled:opacity-50 cursor-pointer"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>{isLoading ? 'Signing in...' : 'Sign in'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Body */}
      <main className="flex-1 max-w-5xl mx-auto px-6 sm:px-8 py-12 lg:py-16 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        <div className="flex-1 space-y-7">
          <div className="space-y-1">
            <span className="font-sans text-xs text-[#52595C] block">
              {user ? `Private notebook • ${user.email || user.displayName}` : 'Private reflections • Gemini perspective'}
            </span>
            {user ? (
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight text-[#242728]">
                Welcome back, <span className="italic">{firstName}</span>.
              </h1>
            ) : (
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight text-[#242728]">
                A quiet space for <span className="italic">daily thought.</span>
              </h1>
            )}
          </div>

          <div className="h-0.5 w-16 bg-[#BD7014]"></div>

          <p className="text-[#52595C] text-base sm:text-lg font-normal leading-relaxed max-w-lg">
            {user 
              ? `You have ${entriesCount} reflection ${entriesCount === 1 ? 'page' : 'pages'} quietly stored in your private journal. Mark today's energy, capture a moment, and reflect at your own pace.`
              : 'A structured, unhurried daily check-in to observe your energy, emotional weather, and standout moments. Handed back with thoughtful AI synthesis.'
            }
          </p>

          {error && (
            <div className="p-3.5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs text-xs font-sans text-[#52595C] flex items-start gap-2.5">
              <Lock className="h-4 w-4 shrink-0 text-[#BD7014] mt-0.5" />
              <div>
                <p className="font-medium text-[#242728]">Authentication note</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
            {user ? (
              <>
                <button
                  id="hero-open-workspace-btn"
                  onClick={onOpenWorkspace}
                  className="px-6 py-3.5 bg-[#242728] text-[#FDFAF6] font-sans text-xs rounded-xs hover:bg-[#383D3F] transition-all cursor-pointer"
                >
                  Open your notebook
                </button>

                {onNewEntry && (
                  <button
                    id="hero-new-entry-btn"
                    onClick={() => {
                      onNewEntry();
                      onOpenWorkspace();
                    }}
                    className="px-6 py-3.5 border border-[#242728] bg-[#FDFAF6] text-[#242728] font-sans text-xs rounded-xs hover:bg-[#242728] hover:text-[#FDFAF6] transition-all cursor-pointer"
                  >
                    Today's check-in
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  id="hero-primary-google-btn"
                  onClick={onSignIn}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#242728] text-[#FDFAF6] font-sans text-xs rounded-xs hover:bg-[#383D3F] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{isLoading ? 'Connecting...' : 'Continue with Google'}</span>
                </button>

                <button
                  id="hero-guest-btn"
                  onClick={onGuestSignIn}
                  className="px-6 py-3.5 border border-[#DCD5C9] bg-[#FDFAF6] text-[#52595C] hover:border-[#242728] hover:text-[#242728] font-sans text-xs rounded-xs transition-all cursor-pointer text-center"
                >
                  Explore as guest
                </button>
              </>
            )}
          </div>

          {/* Three quiet principles */}
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-[#DCD5C9]">
            <div className="space-y-0.5">
              <span className="font-sans text-xs text-[#52595C] block">Unhurried</span>
              <p className="font-serif text-sm text-[#242728]">6 short, thoughtful prompts</p>
            </div>
            <div className="space-y-0.5">
              <span className="font-sans text-xs text-[#52595C] block">Private</span>
              <p className="font-serif text-sm text-[#242728]">Isolated Firestore storage</p>
            </div>
            <div className="space-y-0.5">
              <span className="font-sans text-xs text-[#52595C] block">Considered</span>
              <p className="font-serif text-sm text-[#242728]">Warm AI reflection notes</p>
            </div>
          </div>
        </div>

        {/* Notebook Preview Leaf with Visual Lift */}
        <div className="w-full lg:w-[390px] bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#DCD5C9] pb-3">
            <div className="flex items-center gap-2.5">
              <ConcentricRippleMark size={24} id="preview-ripple-logo" />
              <span className="font-sans text-xs text-[#52595C]">
                {user ? 'Journal overview' : 'Today’s page'}
              </span>
            </div>
            <span className="font-sans text-xs text-[#52595C]">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Connected 4-color gradient token preview */}
          <div className="space-y-2">
            <span className="font-sans text-xs text-[#52595C] block">
              Daily resonance spectrum
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {([1, 2, 3, 4] as const).map((lvl) => {
                const step = GRADIENT_STEPS[lvl];
                return (
                  <div
                    key={lvl}
                    className="p-2 rounded-xs border text-center space-y-1 transition-transform hover:-translate-y-0.5"
                    style={{ backgroundColor: step.bgHex, borderColor: step.borderHex, color: step.hex }}
                  >
                    <div className="flex justify-center">
                      <TokenGlyph level={lvl} className="w-4 h-4" />
                    </div>
                    <span className="font-sans text-[10px] block leading-none font-semibold">
                      {step.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pl-3 border-l-2 border-[#2B6B55] space-y-1">
            <span className="font-sans text-xs text-[#2B6B55] font-medium block">Sample reflection</span>
            <p className="font-serif text-sm text-[#242728] italic leading-relaxed">
              "Notice what already carried you through today. The unhurried pace gives you space to breathe."
            </p>
          </div>

          <div className="pt-3 border-t border-[#DCD5C9] flex items-center justify-between text-xs font-sans text-[#52595C]">
            <span>Calm & private</span>
            <BookOpen className="h-4 w-4 text-[#52595C]" />
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-[#FDFAF6] border-t border-[#DCD5C9] text-[#52595C] py-3.5 px-6 sm:px-8 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs font-sans">
        <div className="flex items-center gap-2">
          <ConcentricRippleMark size={16} id="footer-ripple-logo" />
          <span>ReflectAI &bull; Quiet personal journaling</span>
        </div>
        <div className="text-xs text-[#52595C]/80">
          Saved continuously to your private vault
        </div>
      </footer>
    </div>
  );
};

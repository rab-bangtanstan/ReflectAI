import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Download, 
  Mail,
  TrendingUp, 
  Calendar, 
  Sparkles, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Check, 
  Compass, 
  Activity,
  LogIn,
  PieChart as PieChartIcon
} from 'lucide-react';
import { JournalEntry, UserProfile } from '../types';
import { auth, signInWithGoogle } from '../firebase';
import { GRADIENT_STEPS } from './MoodEnergyTokens';

interface PatternsInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  user: UserProfile | null;
  onSelectDateFromChart?: (dateStr: string) => void;
  onUserSignedIn?: (profile: UserProfile) => void;
}

type DateRangeOption = '30d' | '90d' | 'all';

export const PatternsInsightsModal: React.FC<PatternsInsightsModalProps> = ({
  isOpen,
  onClose,
  entries,
  user,
  onSelectDateFromChart,
  onUserSignedIn
}) => {
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('30d');
  const [hoveredSliceLevel, setHoveredSliceLevel] = useState<number | null>(null);

  // PDF Download States
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // PDF Email States
  const [isEmailingPdf, setIsEmailingPdf] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Filter entries based on selected range
  const filteredEntries = useMemo(() => {
    const now = Date.now();
    let cutoff = 0;
    if (selectedRange === '30d') {
      cutoff = now - (30 * 24 * 60 * 60 * 1000);
    } else if (selectedRange === '90d') {
      cutoff = now - (90 * 24 * 60 * 60 * 1000);
    }

    return entries.filter(e => {
      if (cutoff === 0) return true;
      const t = new Date(e.createdAt || e.updatedAt).getTime();
      return !isNaN(t) && t >= cutoff;
    });
  }, [entries, selectedRange]);

  // Vitality & aggregated statistics
  const stats = useMemo(() => {
    const total = filteredEntries.length;
    let moodSum = 0;
    let energySum = 0;
    let moodCount = 0;
    let energyCount = 0;

    const themeMap = new Map<string, number>();

    filteredEntries.forEach(e => {
      const m = e.moodTone || e.analysis?.moodScore;
      if (typeof m === 'number' && m >= 1 && m <= 4) {
        moodSum += m;
        moodCount++;
      }
      const eg = e.energyLevel;
      if (typeof eg === 'number' && eg >= 1 && eg <= 4) {
        energySum += eg;
        energyCount++;
      }

      if (e.analysis?.themes && Array.isArray(e.analysis.themes)) {
        e.analysis.themes.forEach(theme => {
          const clean = theme.trim();
          if (clean) {
            themeMap.set(clean, (themeMap.get(clean) || 0) + 1);
          }
        });
      }
    });

    const avgMood = moodCount > 0 ? (moodSum / moodCount).toFixed(1) : '3.0';
    const avgEnergy = energyCount > 0 ? (energySum / energyCount).toFixed(1) : '3.0';

    const sortedThemes = Array.from(themeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return {
      total,
      avgMood,
      avgEnergy,
      avgMoodNum: parseFloat(avgMood),
      avgEnergyNum: parseFloat(avgEnergy),
      sortedThemes,
      maxThemeCount: sortedThemes[0]?.[1] || 1
    };
  }, [filteredEntries]);

  // Overall proportion of mood categories for the selected period (Pie Chart data)
  const moodDistribution = useMemo(() => {
    const counts: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    filteredEntries.forEach(e => {
      let level: 1 | 2 | 3 | 4 = 3;
      if (typeof e.moodTone === 'number' && e.moodTone >= 1 && e.moodTone <= 4) {
        level = e.moodTone as 1 | 2 | 3 | 4;
      } else if (e.analysis?.moodScore) {
        level = Math.min(4, Math.max(1, Math.round(e.analysis.moodScore))) as 1 | 2 | 3 | 4;
      }
      counts[level]++;
    });

    const total = filteredEntries.length;
    const slices = [
      {
        level: 4 as const,
        name: 'Sunlit Amber',
        title: 'Lifted & Radiant',
        moodTitle: 'Lifted',
        hex: '#BD7014',
        bgHex: '#FBF1E4',
        borderHex: '#E5B880',
        count: counts[4],
        percent: total > 0 ? (counts[4] / total) * 100 : 0
      },
      {
        level: 3 as const,
        name: 'Quiet Sage',
        title: 'Calm & Grounded',
        moodTitle: 'Calm',
        hex: '#2B6B55',
        bgHex: '#E3ECE7',
        borderHex: '#78A996',
        count: counts[3],
        percent: total > 0 ? (counts[3] / total) * 100 : 0
      },
      {
        level: 2 as const,
        name: 'Dusk Heather',
        title: 'Pondering & Steady',
        moodTitle: 'Pondering',
        hex: '#6B5E7E',
        bgHex: '#F2EFF7',
        borderHex: '#B6ABC6',
        count: counts[2],
        percent: total > 0 ? (counts[2] / total) * 100 : 0
      },
      {
        level: 1 as const,
        name: 'Slate Mist',
        title: 'Foggy & Resting',
        moodTitle: 'Foggy',
        hex: '#52595C',
        bgHex: '#EAEBEB',
        borderHex: '#9DA5A8',
        count: counts[1],
        percent: total > 0 ? (counts[1] / total) * 100 : 0
      }
    ];

    return { total, slices };
  }, [filteredEntries]);

  // Handle Download Report Action
  const handleDownloadReport = async () => {
    if (isGeneratingPdf || isEmailingPdf || cooldownRemaining > 0) return;

    setPdfError(null);
    setEmailError(null);
    setPdfSuccess(false);

    // If user is not authenticated with Google (e.g. guest mode)
    if (!auth.currentUser || user?.uid?.startsWith('guest_')) {
      setPdfError('Google account required: PDF reports are generated server-side directly from your verified cloud journal. Please connect with Google below.');
      return;
    }

    setIsGeneratingPdf(true);

    try {
      // 1. Retrieve fresh Firebase ID Token
      const idToken = await auth.currentUser.getIdToken(true);

      // 2. Request PDF from secure server endpoint with 20s client timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch('/api/reports/download-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          range: selectedRange,
          entries: filteredEntries.slice(0, 100)
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 3. Handle server response
      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        setCooldownRemaining(25);
        throw new Error(data.error || 'Please wait a moment before requesting another report.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server report generation failed (${response.status}).`);
      }

      // 4. Stream and trigger browser file download
      const blob = await response.blob();
      const filename = `reflectai-report-${selectedRange}-${new Date().toISOString().slice(0, 10)}.pdf`;
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setPdfSuccess(true);
      setCooldownRemaining(25); // Start local cooldown
      setTimeout(() => setPdfSuccess(false), 6000);
    } catch (err: any) {
      console.error('Download report error:', err);
      if (err.name === 'AbortError') {
        setPdfError('Report generation timed out after 20 seconds. Please try again with a shorter range.');
      } else {
        setPdfError(err.message || 'An unexpected error occurred while generating the report.');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle Email Report Action (User-Initiated Export)
  const handleEmailReport = async () => {
    if (isEmailingPdf || isGeneratingPdf || cooldownRemaining > 0) return;

    setEmailError(null);
    setPdfError(null);
    setEmailSuccess(null);

    // If user is not authenticated with Google (e.g. guest mode)
    if (!auth.currentUser || user?.uid?.startsWith('guest_') || !auth.currentUser.email) {
      setEmailError('Google account required: Reports are sent directly to the email address on your verified Firebase Auth account. Please connect with Google below.');
      return;
    }

    setIsEmailingPdf(true);

    try {
      const idToken = await auth.currentUser.getIdToken(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch('/api/reports/email-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          range: selectedRange,
          entries: filteredEntries.slice(0, 100)
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        setCooldownRemaining(25);
        throw new Error(data.error || 'Please wait a moment before requesting another report email.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to email report (${response.status}).`);
      }

      const resData = await response.json();
      setEmailSuccess(resData.message || `Your report was successfully emailed to ${auth.currentUser.email}.`);
      setCooldownRemaining(25);
      setTimeout(() => setEmailSuccess(null), 8000);
    } catch (err: any) {
      console.error('Email report error:', err);
      if (err.name === 'AbortError') {
        setEmailError('Report email dispatch timed out after 25 seconds. Please try again.');
      } else {
        setEmailError(err.message || 'An unexpected error occurred while sending the email.');
      }
    } finally {
      setIsEmailingPdf(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const profile = await signInWithGoogle();
      if (onUserSignedIn) {
        onUserSignedIn(profile);
      }
      setPdfError(null);
      setEmailError(null);
    } catch (err: any) {
      setPdfError(err.message || 'Could not connect Google account.');
    }
  };

  if (!isOpen) return null;

  // Compute SVG Donut Pie Slice Paths (radius 90, inner 52, center 110, 110)
  const cx = 110;
  const cy = 110;
  const rOut = 90;
  const rIn = 52;
  const total = moodDistribution.total;

  let currentAngle = -Math.PI / 2;
  const donutSlices = moodDistribution.slices.map(slice => {
    if (slice.count === 0 || total === 0) {
      return { ...slice, path: '', hasData: false };
    }

    const fraction = slice.count / total;
    const sliceAngle = fraction * 2 * Math.PI;
    const startA = currentAngle;
    const endA = currentAngle + sliceAngle;
    currentAngle = endA;

    if (slice.count === total) {
      const midA = startA + Math.PI;
      const x1 = cx + rOut * Math.cos(startA);
      const y1 = cy + rOut * Math.sin(startA);
      const x2 = cx + rOut * Math.cos(midA);
      const y2 = cy + rOut * Math.sin(midA);
      const xi1 = cx + rIn * Math.cos(startA);
      const yi1 = cy + rIn * Math.sin(startA);
      const xi2 = cx + rIn * Math.cos(midA);
      const yi2 = cy + rIn * Math.sin(midA);
      const path = `M ${x1} ${y1} A ${rOut} ${rOut} 0 1 1 ${x2} ${y2} A ${rOut} ${rOut} 0 1 1 ${x1} ${y1} M ${xi1} ${yi1} A ${rIn} ${rIn} 0 1 0 ${xi2} ${yi2} A ${rIn} ${rIn} 0 1 0 ${xi1} ${yi1} Z`;
      return { ...slice, path, hasData: true };
    }

    const x1 = cx + rOut * Math.cos(startA);
    const y1 = cy + rOut * Math.sin(startA);
    const x2 = cx + rOut * Math.cos(endA);
    const y2 = cy + rOut * Math.sin(endA);
    const x3 = cx + rIn * Math.cos(endA);
    const y3 = cy + rIn * Math.sin(endA);
    const x4 = cx + rIn * Math.cos(startA);
    const y4 = cy + rIn * Math.sin(startA);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    return { ...slice, path, hasData: true };
  });

  const activeHoveredSlice = hoveredSliceLevel !== null 
    ? moodDistribution.slices.find(s => s.level === hoveredSliceLevel) || null 
    : null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div 
        className="bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-[#242728] font-serif"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Masthead & Actions */}
        <div className="px-6 py-4 border-b border-[#DCD5C9] bg-[#FDFAF6] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans text-[11px] font-medium tracking-wider text-[#BD7014] uppercase">
                Reflective Patterns & Vitals
              </span>
              <span className="text-[#DCD5C9]">·</span>
              <span className="font-sans text-xs text-[#52595C]">
                {filteredEntries.length} reflection{filteredEntries.length === 1 ? '' : 's'} analyzed
              </span>
            </div>
            <h2 className="text-2xl font-light text-[#242728] tracking-tight mt-0.5">
              Mindful Rhythm & Insights
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Range Selector Pills */}
            <div className="flex items-center bg-[#EFE9DE] p-0.5 rounded-xs border border-[#DCD5C9] text-xs font-sans">
              <button
                type="button"
                onClick={() => setSelectedRange('30d')}
                className={`px-3 py-1 rounded-xs transition-colors cursor-pointer ${
                  selectedRange === '30d' 
                    ? 'bg-[#FDFAF6] text-[#242728] font-medium shadow-2xs' 
                    : 'text-[#52595C] hover:text-[#242728]'
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setSelectedRange('90d')}
                className={`px-3 py-1 rounded-xs transition-colors cursor-pointer ${
                  selectedRange === '90d' 
                    ? 'bg-[#FDFAF6] text-[#242728] font-medium shadow-2xs' 
                    : 'text-[#52595C] hover:text-[#242728]'
                }`}
              >
                90 Days
              </button>
              <button
                type="button"
                onClick={() => setSelectedRange('all')}
                className={`px-3 py-1 rounded-xs transition-colors cursor-pointer ${
                  selectedRange === 'all' 
                    ? 'bg-[#FDFAF6] text-[#242728] font-medium shadow-2xs' 
                    : 'text-[#52595C] hover:text-[#242728]'
                }`}
              >
                All Time
              </button>
            </div>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#52595C] hover:text-[#242728] hover:bg-[#EFE9DE] rounded-xs transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Vitality Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 select-none">
            <div className="p-3.5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs">
              <span className="font-sans text-[11px] text-[#52595C] uppercase block">
                Total Check-ins
              </span>
              <p className="text-2xl font-normal text-[#242728] mt-1">
                {stats.total}
              </p>
              <span className="font-sans text-[11px] text-[#52595C]/80 mt-0.5 block">
                in {selectedRange === '30d' ? '30 days' : selectedRange === '90d' ? '90 days' : 'all history'}
              </span>
            </div>

            <div className="p-3.5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs">
              <span className="font-sans text-[11px] text-[#52595C] uppercase block">
                Average Mood Tone
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-normal text-[#BD7014]">
                  {stats.avgMood}
                </p>
                <span className="font-sans text-xs text-[#52595C]">/ 4.0</span>
              </div>
              <span className="font-sans text-[11px] text-[#52595C]/80 mt-0.5 block">
                {stats.avgMoodNum >= 3.5 ? 'Lifted & Bright' : stats.avgMoodNum >= 2.8 ? 'Calm & Grounded' : stats.avgMoodNum >= 2.0 ? 'Pondering' : 'Resting'}
              </span>
            </div>

            <div className="p-3.5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs">
              <span className="font-sans text-[11px] text-[#52595C] uppercase block">
                Physical Energy
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-normal text-[#2B6B55]">
                  {stats.avgEnergy}
                </p>
                <span className="font-sans text-xs text-[#52595C]">/ 4.0</span>
              </div>
              <span className="font-sans text-[11px] text-[#52595C]/80 mt-0.5 block">
                {stats.avgEnergyNum >= 3.5 ? 'Radiant vitality' : stats.avgEnergyNum >= 2.8 ? 'Grounded presence' : 'Steady pacing'}
              </span>
            </div>

            <div className="p-3.5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs">
              <span className="font-sans text-[11px] text-[#52595C] uppercase block">
                Top Focus Theme
              </span>
              <p className="text-lg font-normal text-[#242728] mt-1 truncate" title={stats.sortedThemes[0]?.[0] || 'Reflective'}>
                {stats.sortedThemes[0]?.[0] || 'Reflective'}
              </p>
              <span className="font-sans text-[11px] text-[#52595C]/80 mt-0.5 block">
                {stats.sortedThemes[0]?.[1] ? `${stats.sortedThemes[0][1]} recurring entries` : 'Mindful presence'}
              </span>
            </div>
          </div>

          {/* 2. Mood Categories Proportion Pie Chart */}
          <div className="p-5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs space-y-4">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-[#BD7014]" />
                  <h3 className="font-serif text-lg font-normal text-[#242728]">
                    Mood Category Distribution
                  </h3>
                </div>
                <p className="font-sans text-xs text-[#52595C] mt-0.5">
                  Proportion of check-ins logged across each mindful mood category for the selected period.
                </p>
              </div>

              <span className="font-sans text-xs text-[#52595C] bg-[#EFE9DE] px-2.5 py-1 rounded-xs border border-[#DCD5C9]">
                {moodDistribution.total} total {moodDistribution.total === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            {moodDistribution.total > 0 ? (
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-1">
                {/* Donut Pie SVG Chart with Centered Metric */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <svg 
                    viewBox="0 0 220 220" 
                    className="w-52 h-52 overflow-visible drop-shadow-2xs select-none"
                  >
                    {/* Donut Slices */}
                    {donutSlices.map(slice => {
                      if (!slice.hasData) return null;
                      const isHovered = hoveredSliceLevel === slice.level;
                      return (
                        <path
                          key={slice.level}
                          d={slice.path}
                          fill={slice.hex}
                          stroke="#FDFAF6"
                          strokeWidth="2.5"
                          opacity={hoveredSliceLevel === null || isHovered ? 1 : 0.4}
                          className="cursor-pointer transition-opacity duration-200"
                          onMouseEnter={() => setHoveredSliceLevel(slice.level)}
                          onMouseLeave={() => setHoveredSliceLevel(null)}
                        />
                      );
                    })}

                    {/* Donut Hole Inner Border */}
                    <circle
                      cx="110"
                      cy="110"
                      r="52"
                      fill="#FDFAF6"
                      stroke="#DCD5C9"
                      strokeWidth="1"
                    />
                  </svg>

                  {/* Centered Donut Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center select-none px-2">
                    {activeHoveredSlice ? (
                      <>
                        <span 
                          className="font-serif text-2xl font-medium tracking-tight"
                          style={{ color: activeHoveredSlice.hex }}
                        >
                          {activeHoveredSlice.percent.toFixed(0)}%
                        </span>
                        <span className="font-sans text-xs font-medium text-[#242728] leading-tight truncate max-w-[84px]">
                          {activeHoveredSlice.moodTitle}
                        </span>
                        <span className="font-sans text-[10px] text-[#52595C]">
                          {activeHoveredSlice.count} {activeHoveredSlice.count === 1 ? 'day' : 'days'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-serif text-2xl font-light text-[#242728]">
                          {moodDistribution.total}
                        </span>
                        <span className="font-sans text-[11px] text-[#52595C]">
                          {moodDistribution.total === 1 ? 'Check-in' : 'Check-ins'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Mood Category Breakdown Cards with Palette Swatches */}
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {moodDistribution.slices.map(slice => {
                    const isHovered = hoveredSliceLevel === slice.level;
                    return (
                      <div
                        key={slice.level}
                        onMouseEnter={() => setHoveredSliceLevel(slice.level)}
                        onMouseLeave={() => setHoveredSliceLevel(null)}
                        className={`p-3 rounded-xs border transition-all cursor-pointer ${
                          isHovered 
                            ? 'border-[#242728] bg-[#EFE9DE]/70 shadow-xs' 
                            : 'border-[#DCD5C9] bg-[#FDFAF6] hover:border-[#8C827A]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span 
                              className="w-3 h-3 rounded-full shrink-0 border"
                              style={{ backgroundColor: slice.hex, borderColor: slice.borderHex }}
                            />
                            <div className="min-w-0">
                              <span className="font-serif text-sm text-[#242728] block truncate">
                                {slice.title}
                              </span>
                              <span className="font-sans text-[11px] text-[#52595C] block">
                                {slice.name}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-serif text-base font-normal text-[#242728] block">
                              {slice.percent.toFixed(0)}%
                            </span>
                            <span className="font-sans text-[10px] text-[#52595C] block">
                              {slice.count} {slice.count === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        </div>

                        {/* Proportional visual bar */}
                        <div className="w-full h-1.5 bg-[#DCD5C9]/50 rounded-full overflow-hidden mt-2.5">
                          <div 
                            className="h-full rounded-full transition-all duration-300"
                            style={{ 
                              width: `${slice.percent}%`,
                              backgroundColor: slice.hex 
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-[#52595C] font-sans text-xs">
                No reflections found in this date range to calculate mood proportions.
              </div>
            )}
          </div>

          {/* 3. Top Themes Aggregation */}
          <div className="p-5 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs space-y-3">
            <div>
              <h3 className="font-serif text-lg font-normal text-[#242728]">
                Recurring Reflection Themes
              </h3>
              <p className="font-sans text-xs text-[#52595C]">
                Core patterns and topics discovered across your journal analyses.
              </p>
            </div>

            {stats.sortedThemes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {stats.sortedThemes.map(([theme, count]) => {
                  const percentage = Math.round((count / stats.maxThemeCount) * 100);
                  return (
                    <div 
                      key={theme}
                      className="p-2.5 bg-[#EFE9DE]/40 border border-[#DCD5C9] rounded-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-sans">
                        <span className="font-serif italic text-[#242728] text-sm">{theme}</span>
                        <span className="text-[#BD7014] font-medium">{count} entry{count === 1 ? '' : 's'}</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#DCD5C9]/60 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#BD7014] rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-sans text-xs text-[#52595C] italic">
                Continue documenting your reflections to reveal recurring mindful themes.
              </p>
            )}
          </div>

          {/* 4. Download & Email Report CTA & Delivery Panel */}
          <div className="p-5 bg-[#FDFAF6] border border-[#BD7014]/40 rounded-xs space-y-4 shadow-2xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <span className="font-sans text-[11px] font-medium text-[#BD7014] uppercase tracking-wider block">
                  Export & Preserve
                </span>
                <h3 className="text-xl font-normal text-[#242728]">
                  Personalized PDF Reflection Report
                </h3>
                <p className="font-sans text-xs text-[#52595C] mt-0.5 max-w-xl">
                  Generates an on-demand, beautifully typeset PDF report containing your mood category distribution, top themes, and reflective summary. Download directly to your device or email it securely to your verified account.
                </p>
                {auth.currentUser?.email && (
                  <p className="font-sans text-[11px] text-[#2B6B55] mt-1 flex items-center gap-1.5">
                    <Check className="h-3 w-3" />
                    <span>Verified account recipient: <span className="font-medium">{auth.currentUser.email}</span></span>
                  </p>
                )}
              </div>

              {/* Action Buttons: Download PDF and Email to Account */}
              <div className="shrink-0 flex flex-wrap items-center gap-2.5">
                {/* Download Button */}
                <button
                  id="download-pdf-report-btn"
                  type="button"
                  onClick={handleDownloadReport}
                  disabled={isGeneratingPdf || isEmailingPdf || cooldownRemaining > 0}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 font-sans text-xs font-medium rounded-xs transition-colors cursor-pointer shadow-xs ${
                    isGeneratingPdf || isEmailingPdf || cooldownRemaining > 0
                      ? 'bg-[#DCD5C9] text-[#52595C] cursor-not-allowed'
                      : 'bg-[#BD7014] hover:bg-[#A8610E] text-[#FDFAF6]'
                  }`}
                >
                  {isGeneratingPdf ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Composing PDF...</span>
                    </>
                  ) : cooldownRemaining > 0 ? (
                    <>
                      <Clock className="h-4 w-4" />
                      <span>Cooldown ({cooldownRemaining}s)</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Download PDF</span>
                    </>
                  )}
                </button>

                {/* Email Report Button */}
                <button
                  id="email-pdf-report-btn"
                  type="button"
                  onClick={handleEmailReport}
                  disabled={isGeneratingPdf || isEmailingPdf || cooldownRemaining > 0}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 font-sans text-xs font-medium rounded-xs transition-colors cursor-pointer shadow-xs border ${
                    isGeneratingPdf || isEmailingPdf || cooldownRemaining > 0
                      ? 'bg-[#EFE9DE] border-[#DCD5C9] text-[#52595C] cursor-not-allowed'
                      : 'bg-[#FDFAF6] hover:bg-[#EFE9DE] border-[#242728] text-[#242728]'
                  }`}
                >
                  {isEmailingPdf ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-[#BD7014]" />
                      <span>Sending Email...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 text-[#BD7014]" />
                      <span>Email to My Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status Messages: Download Success, Email Success, Errors */}
            {pdfSuccess && (
              <div className="p-3 bg-[#E3ECE7] border border-[#78A996] rounded-xs flex items-center gap-2.5 text-xs font-sans text-[#2B6B55]">
                <Check className="h-4 w-4 shrink-0" />
                <span>Your reflection report was successfully generated and downloaded to your device.</span>
              </div>
            )}

            {emailSuccess && (
              <div className="p-3 bg-[#E3ECE7] border border-[#78A996] rounded-xs flex items-center gap-2.5 text-xs font-sans text-[#2B6B55]">
                <Check className="h-4 w-4 shrink-0" />
                <span>{emailSuccess}</span>
              </div>
            )}

            {pdfError && (
              <div className="p-3 bg-[#FDF2F2] border border-[#F5C2C2] rounded-xs flex items-start justify-between gap-3 text-xs font-sans text-rose-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{pdfError}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pdfError.includes('Google account') && (
                    <button
                      type="button"
                      onClick={handleGoogleConnect}
                      className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-xs transition-colors cursor-pointer"
                    >
                      Connect Google
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    className="px-2.5 py-1 border border-rose-400 hover:bg-rose-100 rounded-xs transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {emailError && (
              <div className="p-3 bg-[#FDF2F2] border border-[#F5C2C2] rounded-xs flex items-start justify-between gap-3 text-xs font-sans text-rose-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{emailError}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {emailError.includes('Google account') && (
                    <button
                      type="button"
                      onClick={handleGoogleConnect}
                      className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-xs transition-colors cursor-pointer"
                    >
                      Connect Google
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleEmailReport}
                    className="px-2.5 py-1 border border-rose-400 hover:bg-rose-100 rounded-xs transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#DCD5C9] bg-[#FDFAF6] flex items-center justify-between text-xs font-sans text-[#52595C]">
          <span>ReflectAI Private Notebook · Zero telemetry or external sharing</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-[#DCD5C9] hover:border-[#242728] text-[#242728] rounded-xs bg-[#FDFAF6] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudRain, 
  Snowflake, 
  CloudLightning, 
  Moon, 
  Compass, 
  RefreshCw, 
  X, 
  MapPin, 
  Check,
  ShieldCheck
} from 'lucide-react';
import { WeatherContext, DaylightPhase } from '../types';
import { getDaylightLabel, getDeviceTimeDetails } from '../utils/timeDaylight';

interface AmbientWeatherBadgeProps {
  weather: WeatherContext | null;
  isLoading?: boolean;
  coarseCity?: string;
  isDisabled?: boolean;
  onSetCity?: (city: string) => void;
  onToggleDisabled?: (disable: boolean) => void;
  onRefresh?: () => void;
  onAttachToEntry?: () => void;
  isAttachedToCurrentEntry?: boolean;
  compact?: boolean;
  className?: string;
}

export function getWeatherIcon(iconName?: string, daylight?: DaylightPhase) {
  if (daylight === 'night' && (!iconName || iconName === 'sun')) {
    return <Moon className="h-3.5 w-3.5 text-[#BD7014]" />;
  }

  switch (iconName) {
    case 'sun':
      return <Sun className="h-3.5 w-3.5 text-[#BD7014]" />;
    case 'cloud-rain':
      return <CloudRain className="h-3.5 w-3.5 text-[#2B6B55]" />;
    case 'snowflake':
      return <Snowflake className="h-3.5 w-3.5 text-[#52595C]" />;
    case 'cloud-lightning':
      return <CloudLightning className="h-3.5 w-3.5 text-[#BD7014]" />;
    case 'cloud':
      return <Cloud className="h-3.5 w-3.5 text-[#52595C]" />;
    case 'cloud-sun':
    default:
      return <CloudSun className="h-3.5 w-3.5 text-[#BD7014]" />;
  }
}

export const AmbientWeatherBadge: React.FC<AmbientWeatherBadgeProps> = ({
  weather,
  isLoading = false,
  coarseCity = '',
  isDisabled = false,
  onSetCity,
  onToggleDisabled,
  onRefresh,
  onAttachToEntry,
  isAttachedToCurrentEntry = false,
  compact = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempCity, setTempCity] = useState(coarseCity);
  const popoverRef = useRef<HTMLDivElement>(null);

  const deviceTime = getDeviceTimeDetails();

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSaveCity = (e: React.FormEvent) => {
    e.preventDefault();
    onSetCity?.(tempCity);
    setIsOpen(false);
  };

  const handleClearLocation = () => {
    setTempCity('');
    onSetCity?.('');
    onToggleDisabled?.(true);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Ambient Trigger Pill */}
      {weather && !isDisabled ? (
        <button
          type="button"
          id="ambient-weather-trigger-btn"
          onClick={() => {
            setTempCity(weather.locationName || coarseCity);
            setIsOpen(!isOpen);
          }}
          title={`Ambient environment: ${weather.temperatureC}°C, ${weather.condition} in ${weather.locationName}. Click to adjust.`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FDFAF6] hover:bg-[#FDFAF6]/90 border border-[#DCD5C9] hover:border-[#BD7014] text-xs font-sans text-[#242728] rounded-xs transition-colors cursor-pointer shadow-2xs select-none"
        >
          {getWeatherIcon(weather.icon, weather.daylightPhase || deviceTime.daylightPhase)}
          <span className="font-medium">{weather.temperatureC}°C</span>
          <span className="text-[#52595C] hidden sm:inline">· {weather.condition}</span>
          <span className="text-[#52595C]/80">· {weather.locationName}</span>
          {weather.daylightPhase && (
            <span className="hidden md:inline text-[#BD7014] text-[11px] italic font-serif">
              ({getDaylightLabel(weather.daylightPhase)})
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          id="ambient-weather-add-btn"
          onClick={() => {
            setTempCity(coarseCity);
            setIsOpen(!isOpen);
          }}
          title="Add ambient weather context (coarse city only)"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FDFAF6]/70 hover:bg-[#FDFAF6] border border-[#DCD5C9] hover:border-[#BD7014] text-xs font-sans text-[#52595C] hover:text-[#242728] rounded-xs transition-colors cursor-pointer shadow-2xs select-none"
        >
          {isLoading ? (
            <RefreshCw className="h-3 w-3 animate-spin text-[#BD7014]" />
          ) : (
            <CloudSun className="h-3.5 w-3.5 text-[#52595C]" />
          )}
          <span>{compact ? 'Weather' : 'Ambient weather'}</span>
        </button>
      )}

      {/* Popover Settings & Fine Adjustment */}
      {isOpen && (
        <div 
          id="ambient-weather-popover"
          className="absolute right-0 sm:left-0 sm:right-auto mt-1.5 w-76 sm:w-84 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs shadow-md p-4 z-50 text-[#242728] space-y-3.5 font-sans animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#DCD5C9] pb-2">
            <div className="flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-[#BD7014]" />
              <h4 className="font-serif text-sm font-medium text-[#242728]">Ambient Environment</h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-[#52595C] hover:text-[#242728] cursor-pointer"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Current Local Time & Daylight Awareness Info */}
          <div className="p-2.5 bg-[#EFE9DE]/50 border border-[#DCD5C9]/80 rounded-xs space-y-1 text-xs">
            <div className="flex items-center justify-between text-[#52595C]">
              <span>Local device time:</span>
              <span className="font-medium text-[#242728]">{deviceTime.formattedTime}</span>
            </div>
            <div className="flex items-center justify-between text-[#52595C]">
              <span>Daylight tone:</span>
              <span className="text-[#BD7014] font-medium font-serif italic">
                {getDaylightLabel(deviceTime.daylightPhase)}
              </span>
            </div>
            <p className="text-[11px] text-[#52595C] pt-0.5 border-t border-[#DCD5C9]/50 italic">
              "{deviceTime.toneHint}"
            </p>
          </div>

          {/* Active Weather Status if resolved */}
          {weather && !isDisabled && (
            <div className="flex items-center justify-between p-2 bg-[#FDFAF6] border border-[#DCD5C9] rounded-xs text-xs">
              <div className="flex items-center gap-2">
                {getWeatherIcon(weather.icon, weather.daylightPhase)}
                <div>
                  <div className="font-medium text-[#242728]">{weather.condition} · {weather.temperatureC}°C ({weather.temperatureF}°F)</div>
                  <div className="text-[11px] text-[#52595C]">{weather.locationName}</div>
                </div>
              </div>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isLoading}
                  title="Refresh weather"
                  className="p-1 text-[#52595C] hover:text-[#BD7014] rounded-xs cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          )}

          {/* Attach / Detach to current reflection */}
          {onAttachToEntry && (
            <div className="pt-1">
              <button
                type="button"
                id="ambient-attach-toggle-btn"
                onClick={() => {
                  onAttachToEntry();
                  setIsOpen(false);
                }}
                className={`w-full py-1.5 px-3 rounded-xs text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                  isAttachedToCurrentEntry
                    ? 'bg-[#E3ECE7] border-[#2B6B55]/30 text-[#2B6B55]'
                    : 'bg-[#FDFAF6] border-[#DCD5C9] text-[#242728] hover:border-[#BD7014]'
                }`}
              >
                <Check className={`h-3 w-3 ${isAttachedToCurrentEntry ? 'opacity-100' : 'opacity-0'}`} />
                <span>{isAttachedToCurrentEntry ? 'Attached to this reflection' : 'Attach weather to this reflection'}</span>
              </button>
            </div>
          )}

          {/* Coarse City Input Form */}
          <form onSubmit={handleSaveCity} className="space-y-2 pt-1">
            <label htmlFor="coarse-city-input" className="block text-xs font-medium text-[#242728]">
              Coarse general location (city or region)
            </label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <MapPin className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#52595C]" />
                <input
                  id="coarse-city-input"
                  type="text"
                  value={tempCity}
                  onChange={(e) => setTempCity(e.target.value)}
                  placeholder="e.g. Seattle, Kyoto, London..."
                  maxLength={50}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#FDFAF6] border border-[#DCD5C9] focus:border-[#BD7014] rounded-xs outline-none text-[#242728] placeholder:text-[#52595C]/50"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#BD7014] hover:bg-[#9E5E10] text-white text-xs font-medium rounded-xs transition-colors cursor-pointer shrink-0"
              >
                Save
              </button>
            </div>
          </form>

          {/* Privacy & Minimization Notice */}
          <div className="flex items-start gap-1.5 text-[11px] text-[#52595C] pt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[#2B6B55] shrink-0 mt-0.5" />
            <p className="leading-snug">
              Coarse city/region only. Device GPS is never requested, stored, or accessed.
            </p>
          </div>

          {/* Optional Clear / Disable button */}
          {(weather || coarseCity || !isDisabled) && (
            <div className="border-t border-[#DCD5C9] pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={handleClearLocation}
                className="text-[11px] text-[#52595C] hover:text-rose-700 transition-colors cursor-pointer"
              >
                Remove weather context
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[11px] text-[#242728] font-medium hover:underline cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

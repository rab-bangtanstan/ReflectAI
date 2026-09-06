import { useState, useEffect, useCallback } from 'react';
import { WeatherContext } from '../types';
import { getDaylightPhase } from '../utils/timeDaylight';

const STORAGE_KEY_CITY = 'reflectai_coarse_city';
const STORAGE_KEY_DISABLED = 'reflectai_weather_disabled';

export function useAmbientWeather() {
  const [weather, setWeather] = useState<WeatherContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coarseCity, setCoarseCityState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_CITY) || '';
    } catch {
      return '';
    }
  });
  const [isDisabled, setIsDisabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_DISABLED) === 'true';
    } catch {
      return false;
    }
  });

  const fetchWeather = useCallback(async (cityOverride?: string) => {
    if (isDisabled) {
      setWeather(null);
      return;
    }

    const target = cityOverride !== undefined ? cityOverride : coarseCity;
    setIsLoading(true);

    try {
      const url = target ? `/api/weather?city=${encodeURIComponent(target)}` : '/api/weather';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        setWeather(null);
        return;
      }

      const data = await res.json();
      if (data && data.available && data.weather) {
        // Defensive validation of untrusted external payload on client
        const raw = data.weather;
        if (
          typeof raw.condition === 'string' &&
          typeof raw.temperatureC === 'number' &&
          typeof raw.locationName === 'string'
        ) {
          const currentDaylight = getDaylightPhase();
          const cleanWeather: WeatherContext = {
            condition: raw.condition.slice(0, 40),
            temperatureC: Math.round(raw.temperatureC),
            temperatureF: typeof raw.temperatureF === 'number' ? Math.round(raw.temperatureF) : Math.round((raw.temperatureC * 9) / 5 + 32),
            locationName: raw.locationName.slice(0, 50),
            icon: typeof raw.icon === 'string' ? raw.icon : 'cloud-sun',
            daylightPhase: currentDaylight,
            capturedAt: typeof raw.capturedAt === 'string' ? raw.capturedAt : new Date().toISOString()
          };

          setWeather(cleanWeather);

          // If city was inferred from IP and user didn't have one set, update city state silently
          if (!target && cleanWeather.locationName) {
            setCoarseCityState(cleanWeather.locationName);
            try {
              localStorage.setItem(STORAGE_KEY_CITY, cleanWeather.locationName);
            } catch {
              // Ignore local storage error
            }
          }
          return;
        }
      }
      setWeather(null);
    } catch (e) {
      // Non-blocking fallback: never halt app execution or entry creation
      setWeather(null);
    } finally {
      setIsLoading(false);
    }
  }, [coarseCity, isDisabled]);

  const setCity = useCallback((newCity: string) => {
    const trimmed = newCity.trim().slice(0, 50);
    setCoarseCityState(trimmed);
    try {
      localStorage.setItem(STORAGE_KEY_CITY, trimmed);
    } catch {
      // Ignore
    }
    if (trimmed) {
      fetchWeather(trimmed);
    } else {
      setWeather(null);
    }
  }, [fetchWeather]);

  const toggleDisabled = useCallback((disable: boolean) => {
    setIsDisabled(disable);
    try {
      localStorage.setItem(STORAGE_KEY_DISABLED, disable ? 'true' : 'false');
    } catch {
      // Ignore
    }
    if (disable) {
      setWeather(null);
    } else {
      fetchWeather();
    }
  }, [fetchWeather]);

  // Initial fetch on mount
  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  return {
    weather,
    isLoading,
    coarseCity,
    isDisabled,
    setCity,
    toggleDisabled,
    refresh: () => fetchWeather()
  };
}

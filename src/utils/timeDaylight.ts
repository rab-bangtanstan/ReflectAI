import { DaylightPhase } from '../types';

/**
 * Calculates daylight phase strictly from the device/browser's local time.
 * Zero external calls or permissions needed.
 */
export function getDaylightPhase(date: Date = new Date()): DaylightPhase {
  const hour = date.getHours();
  if (hour >= 5 && hour < 8) {
    return 'dawn';
  }
  if (hour >= 8 && hour < 17) {
    return 'day';
  }
  if (hour >= 17 && hour < 20) {
    return 'dusk';
  }
  return 'night';
}

export function getDaylightLabel(phase: DaylightPhase): string {
  switch (phase) {
    case 'dawn':
      return "Dawn's first light";
    case 'day':
      return 'Daylight clarity';
    case 'dusk':
      return 'Golden twilight';
    case 'night':
      return 'Quiet night';
  }
}

export function getTimeAwareGreeting(phase: DaylightPhase): string {
  switch (phase) {
    case 'dawn':
      return 'A quiet dawn for reflection';
    case 'day':
      return 'Mindful daytime pause';
    case 'dusk':
      return 'Evening calm';
    case 'night':
      return 'Restful evening thoughts';
  }
}

export function getAtmosphericToneHint(phase: DaylightPhase): string {
  switch (phase) {
    case 'dawn':
      return 'Soft morning light before the world stirs.';
    case 'day':
      return 'Steadiness in the midst of the day’s flow.';
    case 'dusk':
      return 'Twilight settling as tasks draw to a gentle close.';
    case 'night':
      return 'Candlelight stillness; leaving tomorrow for tomorrow.';
  }
}

export function getDeviceTimeDetails(date: Date = new Date()): {
  formattedTime: string;
  timeZone: string;
  daylightPhase: DaylightPhase;
  greeting: string;
  toneHint: string;
} {
  const daylightPhase = getDaylightPhase(date);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  const formattedTime = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return {
    formattedTime,
    timeZone,
    daylightPhase,
    greeting: getTimeAwareGreeting(daylightPhase),
    toneHint: getAtmosphericToneHint(daylightPhase)
  };
}

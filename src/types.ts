export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type ReflectionCategory = 'Daily Reflection' | 'Brainstorming' | 'Personal Growth' | 'Gratitude' | 'Problem Solving' | 'Mindfulness';
export type ReflectionMood = '🌱 Calm' | '💡 Inspired' | '⚡ Energized' | '🌧️ Overwhelmed' | '🤔 Pondering' | '🎯 Focused';

export type EnergyLevel = 1 | 2 | 3 | 4; // 1: Mist (Depleted/Rest), 2: Heather (Steady/Conserving), 3: Sage (Grounded/Centered), 4: Amber (Radiant/Vibrant)
export type MoodTone = 1 | 2 | 3 | 4; // 1: Foggy/Heavy, 2: Pondering/Introspective, 3: Calm/Content, 4: Inspired/Lifted

export type DaylightPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface WeatherContext {
  condition: string;      // Coarse text summary (e.g. "Partly Cloudy", "Clear", "Light Rain")
  temperatureC: number;   // In Celsius (e.g. 19)
  temperatureF: number;   // In Fahrenheit (e.g. 66)
  locationName: string;   // Coarse city/region name only (e.g. "Seattle", "Kyoto") - never GPS
  icon?: string;          // Safe visual indicator token
  daylightPhase?: DaylightPhase;
  capturedAt: string;     // ISO timestamp when ambient context was noted
}

export interface ReflectionAnalysis {
  moodScore: number; // 1 to 4
  detectedMood: string;
  themes: string[];
  reflection: string;
  gentleTip: string;
  timestamp?: string;
  isStale?: boolean; // Set when entry was edited after analysis
  staleReason?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  initialPrompt: string;
  category: ReflectionCategory;
  mood?: ReflectionMood;
  // Structured Daily Check-in fields:
  energyLevel?: EnergyLevel;
  moodTone?: MoodTone;
  mentalEnergy?: string;
  standoutMoment?: string;
  smallWin?: string;
  freeText?: string;
  analysis?: ReflectionAnalysis;
  analysisStale?: boolean;
  summary?: string;
  keyInsights?: string[];
  actionItems?: string[];
  weather?: WeatherContext;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt?: string;
}

export interface GeminiReflectRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  prompt: string;
  category?: string;
  mood?: string;
  action?: 'chat' | 'summarize' | 'brainstorm' | 'insights';
}

export interface GeminiReflectResponse {
  reply: string;
  summary?: string;
  keyInsights?: string[];
  suggestedActionItems?: string[];
  modelUsed: string;
}

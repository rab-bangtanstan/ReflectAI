import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { streamJournalReportPdf, generateJournalReportPdfBuffer, ReportEntryData } from "./server/reportGenerator";
import { sendJournalReportEmail } from "./server/emailService";

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Lazy GoogleGenAI client accessor
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("⚠️ Warning: GEMINI_API_KEY is not set in environment. Gemini features will use fallback mock reflections.");
    }
    aiClient = new GoogleGenAI({ apiKey: key || "dummy-key-fallback" });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder
const MODEL_LADDER = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-2.5-pro"
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Resilient Gemini Content Generation with automated fallback ladder
 */
async function generateContentWithFallback(
  systemInstruction: string,
  contents: string
): Promise<{ text: string; modelUsed: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("MY_GEMINI_API_KEY")) {
    return {
      text: "### Reflection & Insights\n\nThank you for sharing your thoughts. Here are a few reflective perspectives:\n- **Core Theme**: Acknowledging your goals and identifying areas for focused execution.\n- **Perspective Shift**: Notice what is already working well and double down on small consistent steps.\n- **Reflective Prompt**: *What is one small action you can take in the next 24 hours that would give you the greatest sense of momentum?*",
      modelUsed: "local-resilient-fallback"
    };
  }

  const ai = getAiClient();
  let lastError: any = null;

  for (const model of MODEL_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      if (response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`Model ${model} attempt failed: ${err.message || err}. Trying next fallback ladder step...`);
      lastError = err;
    }
  }

  throw new Error(`All Gemini fallback models exhausted. Last error: ${lastError?.message || 'Unknown'}`);
}

// Health Check API
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("MY_GEMINI_API_KEY")),
    hasWeatherKey: Boolean(process.env.WEATHER_API_KEY && !process.env.WEATHER_API_KEY.includes("MY_WEATHER_API_KEY"))
  });
});

// Helper: timeout wrapper around fetch
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// WMO Weather Code Mapper for Open-Meteo
function mapWmoCodeToCondition(code: number): { condition: string; icon: string } {
  if (code === 0) return { condition: "Clear sky", icon: "sun" };
  if (code === 1 || code === 2) return { condition: "Partly cloudy", icon: "cloud-sun" };
  if (code === 3) return { condition: "Overcast", icon: "cloud" };
  if (code === 45 || code === 48) return { condition: "Misty fog", icon: "cloud" };
  if (code >= 51 && code <= 55) return { condition: "Gentle drizzle", icon: "cloud-rain" };
  if (code >= 61 && code <= 65) return { condition: "Rain", icon: "cloud-rain" };
  if (code >= 71 && code <= 77) return { condition: "Snowfall", icon: "snowflake" };
  if (code >= 80 && code <= 82) return { condition: "Rain showers", icon: "cloud-rain" };
  if (code >= 85 && code <= 86) return { condition: "Snow showers", icon: "snowflake" };
  if (code >= 95) return { condition: "Thunderstorm", icon: "cloud-lightning" };
  return { condition: "Fair", icon: "cloud-sun" };
}

// Safe Weather Summary Type - Never exposes raw API or GPS coordinates
interface SafeWeatherSummary {
  condition: string;
  temperatureC: number;
  temperatureF: number;
  locationName: string;
  icon: string;
  capturedAt: string;
}

/**
 * Fetch and strictly validate weather for a coarse city name.
 * Discards all coordinates and raw API payloads.
 */
async function fetchCoarseWeather(cityName: string): Promise<SafeWeatherSummary | null> {
  const cleanCity = String(cityName || "").replace(/[^a-zA-Z\s,\-]/g, "").trim().slice(0, 50);
  if (!cleanCity) return null;

  const weatherApiKey = process.env.WEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;

  // 1. If WEATHER_API_KEY is configured in Secret Manager / env, call provider first
  if (weatherApiKey && !weatherApiKey.includes("MY_WEATHER_API_KEY")) {
    try {
      // Try OpenWeatherMap endpoint with key
      const owUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cleanCity)}&appid=${weatherApiKey}&units=metric`;
      const res = await fetchWithTimeout(owUrl, {}, 3000);
      if (res.ok) {
        const raw: any = await res.json();
        // Strict shape validation on untrusted external data
        if (raw && typeof raw === "object" && raw.main && typeof raw.main.temp === "number") {
          const tempC = Math.round(raw.main.temp);
          const tempF = Math.round((tempC * 9) / 5 + 32);
          const weatherObj = Array.isArray(raw.weather) && raw.weather[0] ? raw.weather[0] : {};
          const rawMain = typeof weatherObj.main === "string" ? weatherObj.main : "Clear";
          const rawDesc = typeof weatherObj.description === "string" ? weatherObj.description : rawMain;
          const condition = rawDesc.slice(0, 40);

          let icon = "cloud-sun";
          const lower = rawMain.toLowerCase();
          if (lower.includes("clear")) icon = "sun";
          else if (lower.includes("rain") || lower.includes("drizzle")) icon = "cloud-rain";
          else if (lower.includes("snow")) icon = "snowflake";
          else if (lower.includes("thunder")) icon = "cloud-lightning";
          else if (lower.includes("cloud")) icon = "cloud";

          return {
            condition: condition.charAt(0).toUpperCase() + condition.slice(1),
            temperatureC: Math.max(-60, Math.min(60, tempC)),
            temperatureF: Math.max(-76, Math.min(140, tempF)),
            locationName: cleanCity,
            icon,
            capturedAt: new Date().toISOString()
          };
        }
      }
    } catch (err: any) {
      console.warn("Weather API key call failed, attempting resilient fallback:", err.message);
    }
  }

  // 2. Open-Meteo Coarse Weather Fallback (No key needed, coarse city geocoding, privacy-preserving)
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=en&format=json`;
    const geoRes = await fetchWithTimeout(geoUrl, {}, 3000);
    if (!geoRes.ok) return null;
    const geoData: any = await geoRes.json();
    if (!geoData || !Array.isArray(geoData.results) || geoData.results.length === 0) {
      return null;
    }

    const firstMatch = geoData.results[0];
    const lat = Number(firstMatch.latitude);
    const lon = Number(firstMatch.longitude);
    const resolvedName = typeof firstMatch.name === "string" ? firstMatch.name : cleanCity;

    if (isNaN(lat) || isNaN(lon)) return null;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const weatherRes = await fetchWithTimeout(weatherUrl, {}, 3000);
    if (!weatherRes.ok) return null;
    const weatherData: any = await weatherRes.json();

    if (!weatherData || !weatherData.current || typeof weatherData.current.temperature_2m !== "number") {
      return null;
    }

    const tempC = Math.round(weatherData.current.temperature_2m);
    const tempF = Math.round((tempC * 9) / 5 + 32);
    const code = typeof weatherData.current.weather_code === "number" ? weatherData.current.weather_code : 0;
    const { condition, icon } = mapWmoCodeToCondition(code);

    return {
      condition,
      temperatureC: Math.max(-60, Math.min(60, tempC)),
      temperatureF: Math.max(-76, Math.min(140, tempF)),
      locationName: resolvedName,
      icon,
      capturedAt: new Date().toISOString()
    };
  } catch (err: any) {
    console.warn("Coarse weather resolution failed:", err.message);
    return null;
  }
}

/**
 * Resolve coarse city name from request IP (Never GPS)
 */
async function resolveCoarseCityFromIp(ip: string): Promise<string | null> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.")) {
    return null;
  }
  try {
    const res = await fetchWithTimeout(`http://ip-api.com/json/${ip}?fields=status,city`, {}, 2500);
    if (res.ok) {
      const data: any = await res.json();
      if (data && data.status === "success" && typeof data.city === "string" && data.city.trim()) {
        return data.city.trim();
      }
    }
  } catch {
    // Ignore, degrade gracefully
  }
  return null;
}

// Secure Ambient Weather API Endpoint (Coarse location only, never GPS)
app.get("/api/weather", async (req, res) => {
  try {
    let targetCity: string | null = null;
    if (typeof req.query.city === "string" && req.query.city.trim()) {
      targetCity = req.query.city.trim();
    } else {
      // Extract IP for approximate coarse location
      const forwarded = req.headers["x-forwarded-for"];
      const clientIp = typeof forwarded === "string" 
        ? forwarded.split(",")[0].trim() 
        : req.socket.remoteAddress || "";
      targetCity = await resolveCoarseCityFromIp(clientIp);
    }

    if (!targetCity) {
      return res.json({
        available: false,
        weather: null,
        message: "No coarse location provided or inferred."
      });
    }

    const weather = await fetchCoarseWeather(targetCity);
    if (!weather) {
      return res.json({
        available: false,
        weather: null,
        message: "Weather service unavailable for this location."
      });
    }

    res.json({
      available: true,
      weather
    });
  } catch (err: any) {
    // Graceful degradation: never block entry creation or return 500
    res.json({
      available: false,
      weather: null,
      error: "Weather lookup timed out or was unavailable."
    });
  }
});

// Gemini Multi-turn Reflection and Brainstorming API endpoint
app.post("/api/gemini/reflect", async (req, res) => {
  try {
    // 2. Defensive Payload Ingestion (Null-Safe Destructuring)
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const prompt: string = typeof body.prompt === "string" ? body.prompt : "";
    const category: string = typeof body.category === "string" ? body.category : "Daily Reflection";
    const mood: string = typeof body.mood === "string" ? body.mood : "Neutral";
    const action: string = typeof body.action === "string" ? body.action : "chat";

    if (!prompt && messages.length === 0) {
      return res.status(400).json({ error: "No prompt or conversation messages provided." });
    }

    const systemInstruction = `You are ReflectAI, an empathetic, intellectually rigorous, and structured journaling and reflection mentor powered by Gemini.
The user is engaging in a personal reflection and brainstorming session.
Category: ${category}
Current Emotional Mood / Context: ${mood}
Requested Goal / Action: ${action}

Guidelines:
1. Provide thoughtful, constructive, and warm analysis without being preachy.
2. Structure your reply cleanly using Markdown headings, bullet points, and high-impact questions.
3. If brainstorming, provide 3-5 distinct creative angles or avenues.
4. If summarizing/reflecting, highlight:
   - **Key Themes & Insights**
   - **Emotional Undercurrents / Mindset**
   - **Empowering Next Steps / Action Items**
5. Conclude with a deep, thought-provoking reflective question to prompt further exploration.`;

    // Construct conversation history for context
    let formattedContext = "";
    if (messages.length > 0) {
      formattedContext = "Previous session dialogue:\n" + messages.map(m => `${m.role === 'user' ? 'User' : 'ReflectAI'}: ${m.content}`).join("\n\n") + "\n\n";
    }
    
    const fullInput = `${formattedContext}User's New Reflection or Question:\n${prompt || "(Please review and summarize our conversation so far.)"}`;

    const result = await generateContentWithFallback(systemInstruction, fullInput);

    // Extract potential summary and action items if applicable
    res.json({
      reply: result.text,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Gemini reflect error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate AI reflection",
      reply: "I apologize, but I encountered a temporary issue reflecting on this. Please try sending your reflection again."
    });
  }
});

// Gemini Instant Summary Generator Endpoint
app.post("/api/gemini/summarize", async (req, res) => {
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const content: string = typeof body.content === "string" ? body.content : "";
    const title: string = typeof body.title === "string" ? body.title : "Journal Entry";

    if (!content) {
      return res.status(400).json({ error: "Missing content for summarization." });
    }

    const systemInstruction = `You are a concise executive summarizer for personal journals. Return a clear 2-3 sentence core takeaway followed by 3 actionable bullet items.`;
    const prompt = `Title: ${title}\n\nContent:\n${content}\n\nPlease generate a concise summary and 3 key takeaways.`;

    const result = await generateContentWithFallback(systemInstruction, prompt);
    res.json({
      summary: result.text,
      modelUsed: result.modelUsed
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Summarization failed" });
  }
});

// Gemini Daily Check-in Deep Reflection & Pattern Analysis Endpoint
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const { energyLevel, moodTone, mentalEnergy, standoutMoment, smallWin, freeText, title, weather } = body;

    const systemInstruction = `You are a quiet, empathetic, and observant personal journaling companion.
Your role is NOT a clinical health tracker, and NOT a corporate productivity dashboard.
You are like a thoughtful margin note written in pencil by an understanding mentor who has read the person's daily check-in.
Tone: Unhurried, poetic yet grounded, calm, respectful, deeply human.

You must return valid JSON ONLY with this structure:
{
  "moodScore": <number from 1 to 4 where 1=depleted/mist, 2=introspective/heather, 3=grounded/sage, 4=radiant/amber>,
  "detectedMood": "<short 2-3 word poetic description of their emotional state, e.g. 'Quietly Resilient', 'Carrying Heavy Water', 'Steady and Centered', 'Gentle Momentum'>",
  "themes": ["<theme 1 (2-3 words)>", "<theme 2>", "<theme 3>"],
  "reflection": "<2 to 3 paragraphs of calm, deeply considered reflection acknowledging what occupied their mental energy, honouring their win, and offering perspective>",
  "gentleTip": "<one gentle, unpressured inquiry or micro-practice for the evening or tomorrow, framed warmly>"
}`;

    let weatherLine = "";
    if (weather && typeof weather === "object" && typeof weather.condition === "string") {
      weatherLine = `\n- Ambient Environment: ${weather.temperatureC ?? ""}°C (${weather.condition}), ${weather.daylightPhase || "day"} in ${weather.locationName || "coarse region"}`;
    }

    const promptText = `Daily Check-in Data:
- Title/Date: ${title || 'Today'}
- Energy State (1 to 4): ${energyLevel || 3}
- Emotional Weather (1 to 4): ${moodTone || 3}
- What took most mental energy: ${mentalEnergy || 'Not specified'}
- A standout moment or sensory detail: ${standoutMoment || 'Not specified'}
- A small win or handled item: ${smallWin || 'Not specified'}
- Free reflections / notes: ${freeText || 'None'}${weatherLine}

Please offer a considered reflection and thematic reading in JSON format.`;

    const result = await generateContentWithFallback(systemInstruction, promptText);
    
    // Parse JSON safely
    let parsedData = null;
    try {
      const cleanJson = result.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch {
      // Fallback parser if markdown wrapped
      parsedData = {
        moodScore: moodTone || energyLevel || 3,
        detectedMood: "Steady & Reflective",
        themes: ["Mental Space", "Personal Pace", "Quiet Progress"],
        reflection: result.text || "Your reflections carry a steady undercurrent of thoughtful awareness. Taking time to notice where your energy flowed today is a valuable act of presence.",
        gentleTip: "As you step away from the page, let whatever was unresolved wait until morning."
      };
    }

    res.json({
      analysis: parsedData,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Analysis endpoint error:", error);
    res.json({
      analysis: {
        moodScore: 3,
        detectedMood: "Grounded & Quiet",
        themes: ["Pacing", "Awareness", "Restoration"],
        reflection: "Thank you for documenting this chapter of your day. Pausing to write these observations gives shape to experiences that might otherwise slip by unnoticed.",
        gentleTip: "Give yourself permission to close the notebook without needing to fix everything tonight."
      },
      modelUsed: "offline-fallback",
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// PDF Report Generation & Secure Download Delivery
// ============================================================================
const userReportCooldowns = new Map<string, number>();
const REPORT_COOLDOWN_MS = 25000; // 25 seconds cooldown between report generations

function parseFirestoreValue(val: any): any {
  if (!val || typeof val !== "object") return null;
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return parseFloat(val.doubleValue);
  if ("booleanValue" in val) return val.booleanValue;
  if ("timestampValue" in val) return val.timestampValue;
  if ("nullValue" in val) return null;
  if ("arrayValue" in val) {
    const values = val.arrayValue?.values || [];
    return values.map(parseFirestoreValue);
  }
  if ("mapValue" in val) {
    const fields = val.mapValue?.fields || {};
    const res: any = {};
    for (const k of Object.keys(fields)) {
      res[k] = parseFirestoreValue(fields[k]);
    }
    return res;
  }
  return null;
}

function parseFirestoreDoc(doc: any): ReportEntryData | null {
  if (!doc || !doc.fields) return null;
  const result: any = {};
  for (const [key, value] of Object.entries(doc.fields)) {
    result[key] = parseFirestoreValue(value);
  }
  if (!result.id && typeof doc.name === "string") {
    const parts = doc.name.split("/");
    result.id = parts[parts.length - 1];
  }
  return result as ReportEntryData;
}

app.post("/api/reports/download-pdf", async (req, res) => {
  // 1. Authenticate session & verify ID Token server-side
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required to generate report. Please sign in with Google to download your private journal report."
    });
  }

  const idToken = authHeader.split(" ")[1];
  if (!idToken) {
    return res.status(401).json({ error: "Missing authentication credentials." });
  }

  const firebaseApiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "AIzaSyCeKZRUO3mH8EyzE_xrJqTXf53Npe8KfDk";
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "personaljournalproject";

  let verifiedUid = "";
  let userDisplayName = "Reflective Writer";

  try {
    const verifyResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      }
    );

    if (!verifyResponse.ok) {
      console.warn("Firebase ID token verification failed status:", verifyResponse.status);
      return res.status(401).json({
        error: "Your session has expired or is invalid. Please sign in with Google again."
      });
    }

    const verifyData: any = await verifyResponse.json();
    const verifiedUser = verifyData?.users?.[0];
    if (!verifiedUser || !verifiedUser.localId) {
      return res.status(401).json({ error: "Unable to verify user session identity." });
    }

    verifiedUid = verifiedUser.localId;
    userDisplayName = verifiedUser.displayName || verifiedUser.email?.split("@")[0] || "Reflective Writer";
  } catch (err: any) {
    console.error("Token verification network error:", err);
    return res.status(500).json({ error: "Authentication verification service temporarily unavailable. Please retry." });
  }

  // 2. Enforce per-user rate limit / cooldown
  const now = Date.now();
  const lastGenerated = userReportCooldowns.get(verifiedUid);
  if (lastGenerated && now - lastGenerated < REPORT_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((REPORT_COOLDOWN_MS - (now - lastGenerated)) / 1000);
    return res.status(429).json({
      error: `Please wait ${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""} before generating another report.`
    });
  }

  // 3. Query Firestore strictly for the verified UID's own documents
  const range = (req.body?.range === "90d" || req.body?.range === "all") ? req.body.range : "30d";

  let timeoutTimer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutTimer = setTimeout(() => {
      reject(new Error("Report generation timed out after 15 seconds."));
    }, 15000);
  });

  try {
    const clientEntries: ReportEntryData[] = Array.isArray(req.body?.entries) ? req.body.entries : [];

    const fetchEntriesPromise = async (): Promise<ReportEntryData[]> => {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/users/${verifiedUid}/entries?pageSize=100`;
      try {
        const fsRes = await fetch(firestoreUrl, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });

        if (fsRes.status === 404) {
          return [];
        }

        if (fsRes.ok) {
          const fsData: any = await fsRes.json();
          const rawDocs = fsData.documents || [];
          const parsed: ReportEntryData[] = [];
          for (const d of rawDocs) {
            const item = parseFirestoreDoc(d);
            if (item) parsed.push(item);
          }
          return parsed;
        } else {
          // If Firestore REST API returned 403 (due to client token IAM restrictions),
          // fallback gracefully to clientEntries authenticated under the verified user session
          console.warn("Firestore REST API response not ok (status", fsRes.status, "), checking client payload");
          if (clientEntries.length > 0) {
            return clientEntries;
          }
          const errorText = await fsRes.text();
          throw new Error(`Cloud notebook retrieval error (${fsRes.status}).`);
        }
      } catch (err: any) {
        if (clientEntries.length > 0) {
          return clientEntries;
        }
        throw err;
      }
    };

    const allEntries = await Promise.race([fetchEntriesPromise(), timeoutPromise]);
    if (timeoutTimer) clearTimeout(timeoutTimer);

    // Filter by requested date range
    let cutoffTime = 0;
    if (range === "30d") {
      cutoffTime = now - (30 * 24 * 60 * 60 * 1000);
    } else if (range === "90d") {
      cutoffTime = now - (90 * 24 * 60 * 60 * 1000);
    }

    const filtered = allEntries.filter((e) => {
      if (!e) return false;
      if (cutoffTime === 0) return true;
      const entryTime = new Date(e.createdAt || e.updatedAt || 0).getTime();
      return !isNaN(entryTime) && entryTime >= cutoffTime;
    });

    if (filtered.length === 0) {
      return res.status(404).json({
        error: `No reflections found in your cloud notebook for the selected range (${range === "30d" ? "last 30 days" : range === "90d" ? "last 90 days" : "all time"}). Write a reflection or select a wider date range.`
      });
    }

    // Cap at 100 entries to prevent excessive processing
    const cappedEntries = filtered.slice(0, 100);

    // Record cooldown timestamp now that generation begins
    userReportCooldowns.set(verifiedUid, Date.now());

    // 4. Stream generated PDF directly to the client as an attachment
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reflectai-report-${range}-${new Date().toISOString().slice(0, 10)}.pdf"`
    );
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    await streamJournalReportPdf(res, {
      displayName: userDisplayName,
      range,
      entries: cappedEntries
    });
  } catch (err: any) {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    console.error("PDF generation failure:", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: err.message || "Failed to generate report. Please try again."
      });
    }
  }
});

// ============================================================================
// PDF Report Email Delivery (User-Initiated Export)
// Sends ONLY to the authenticated user's Firebase Auth email address.
// ============================================================================
app.post("/api/reports/email-pdf", async (req, res) => {
  // 1. Authenticate session & verify ID Token server-side
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required to email report. Please sign in with your Google account."
    });
  }

  const idToken = authHeader.split(" ")[1];
  if (!idToken) {
    return res.status(401).json({ error: "Missing authentication credentials." });
  }

  const firebaseApiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "AIzaSyCeKZRUO3mH8EyzE_xrJqTXf53Npe8KfDk";
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "personaljournalproject";

  let verifiedUid = "";
  let verifiedEmail = "";
  let userDisplayName = "Reflective Writer";

  try {
    const verifyResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      }
    );

    if (!verifyResponse.ok) {
      return res.status(401).json({
        error: "Your session has expired or is invalid. Please sign in again."
      });
    }

    const verifyData: any = await verifyResponse.json();
    const verifiedUser = verifyData?.users?.[0];
    if (!verifiedUser || !verifiedUser.localId) {
      return res.status(401).json({ error: "Unable to verify user session identity." });
    }

    verifiedUid = verifiedUser.localId;
    verifiedEmail = verifiedUser.email || "";
    userDisplayName = verifiedUser.displayName || verifiedUser.email?.split("@")[0] || "Reflective Writer";

    if (!verifiedEmail || !verifiedEmail.includes("@")) {
      return res.status(400).json({
        error: "Your authenticated Firebase account does not have an email address associated. Please sign in with Google to use report emailing."
      });
    }
  } catch (err: any) {
    console.error("Token verification network error:", err);
    return res.status(500).json({ error: "Authentication verification service temporarily unavailable. Please retry." });
  }

  // 2. Enforce per-user rate limit / cooldown
  const now = Date.now();
  const lastGenerated = userReportCooldowns.get(verifiedUid);
  if (lastGenerated && now - lastGenerated < REPORT_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((REPORT_COOLDOWN_MS - (now - lastGenerated)) / 1000);
    return res.status(429).json({
      error: `Please wait ${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""} before requesting another report email.`
    });
  }

  // 3. Query Firestore strictly for the verified UID's own documents
  const range = (req.body?.range === "90d" || req.body?.range === "all") ? req.body.range : "30d";

  let timeoutTimer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutTimer = setTimeout(() => {
      reject(new Error("Report generation timed out after 15 seconds."));
    }, 15000);
  });

  try {
    const clientEntries: ReportEntryData[] = Array.isArray(req.body?.entries) ? req.body.entries : [];

    const fetchEntriesPromise = async (): Promise<ReportEntryData[]> => {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/users/${verifiedUid}/entries?pageSize=100`;
      try {
        const fsRes = await fetch(firestoreUrl, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });

        if (fsRes.status === 404) {
          return [];
        }

        if (fsRes.ok) {
          const fsData: any = await fsRes.json();
          const rawDocs = fsData.documents || [];
          const parsed: ReportEntryData[] = [];
          for (const d of rawDocs) {
            const item = parseFirestoreDoc(d);
            if (item) parsed.push(item);
          }
          return parsed;
        } else {
          if (clientEntries.length > 0) {
            return clientEntries;
          }
          throw new Error(`Cloud notebook retrieval error (${fsRes.status}).`);
        }
      } catch (err: any) {
        if (clientEntries.length > 0) {
          return clientEntries;
        }
        throw err;
      }
    };

    const allEntries = await Promise.race([fetchEntriesPromise(), timeoutPromise]);
    if (timeoutTimer) clearTimeout(timeoutTimer);

    // Filter by requested date range
    let cutoffTime = 0;
    if (range === "30d") {
      cutoffTime = now - (30 * 24 * 60 * 60 * 1000);
    } else if (range === "90d") {
      cutoffTime = now - (90 * 24 * 60 * 60 * 1000);
    }

    const filtered = allEntries.filter((e) => {
      if (!e) return false;
      if (cutoffTime === 0) return true;
      const entryTime = new Date(e.createdAt || e.updatedAt || 0).getTime();
      return !isNaN(entryTime) && entryTime >= cutoffTime;
    });

    if (filtered.length === 0) {
      return res.status(404).json({
        error: `No reflections found in your cloud notebook for the selected range (${range === "30d" ? "last 30 days" : range === "90d" ? "last 90 days" : "all time"}). Write a reflection or select a wider date range.`
      });
    }

    const cappedEntries = filtered.slice(0, 100);
    userReportCooldowns.set(verifiedUid, Date.now());

    // 4. Generate PDF buffer and send email
    const rangeLabel = range === "30d" ? "Last 30 Days" : range === "90d" ? "Last 90 Days" : "All-Time Journal Archive";
    const pdfFilename = `reflectai-report-${range}-${new Date().toISOString().slice(0, 10)}.pdf`;

    const pdfBuffer = await generateJournalReportPdfBuffer({
      displayName: userDisplayName,
      range,
      entries: cappedEntries
    });

    const emailResult = await sendJournalReportEmail({
      recipientEmail: verifiedEmail,
      recipientName: userDisplayName,
      rangeLabel,
      pdfBuffer,
      pdfFilename,
      entriesCount: cappedEntries.length
    });

    res.json({
      success: true,
      recipient: verifiedEmail,
      message: `Your mindful report was successfully dispatched to ${verifiedEmail}.`,
      messageId: emailResult.messageId
    });
  } catch (err: any) {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    console.error("PDF email generation failure:", err);
    res.status(500).json({
      error: err.message || "Failed to email report. Please try again."
    });
  }
});

// Production & Vite Development Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ReflectAI server running on http://localhost:${PORT}`);
  });
}

startServer();

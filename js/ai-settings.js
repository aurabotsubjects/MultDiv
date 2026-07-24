// ============================================================
// Teacher-configurable AI opponent settings — one accuracy % and one
// answer-time range per game, stored in a single shared Firestore doc and
// read by every game before it builds its AI bot. This OVERRIDES the
// accuracy/minMs/maxMs baked into js/ai-opponent.js's AI_PROFILES for
// whichever difficulty (easy/medium/hard) the student picks — the
// easy/medium/hard buttons still change how hard the MATH is (the bot's
// times-tables level), but how fast and how accurate the bot answers is
// now controlled here, game by game, from the teacher Settings page.
// ============================================================
import { db, doc, getDoc, setDoc } from "./firebase-init.js";

export const GAME_LIST = [
  { id: "multiple-race",     name: "🏁 Multiple Race" },
  { id: "pong",               name: "🏓 Table Pong" },
  { id: "race-car-math",      name: "🏎️ Race Car Math" },
  { id: "math-bubble-pop",    name: "🫧 Bubble Pop" },
  { id: "burst-your-bubble",  name: "💥 Burst Your Bubble" },
  { id: "memory",             name: "🧠 Memory Showdown" },
  { id: "pindrop",            name: "📍 Pin Drop" },
  { id: "break-the-bank",     name: "🏦 Break the Bank" },
  { id: "base-attack",        name: "🏰 Base Attack" },
  { id: "equations-drop",     name: "💧 Equations Drop" },
  { id: "speed-connect-4",    name: "🔴 Speed Connect 4" },
];

// accuracy: 0-1 (fraction). minMs/maxMs: how long the bot takes to answer.
// Break the Bank starts at its already-tuned easier pace (it's a tight
// speed race where the old shared defaults felt unbeatable); every other
// game starts at the shared module's original "easy" tier.
export const DEFAULT_AI_SETTINGS = {
  "multiple-race":     { accuracy: 0.84, minMs: 2000, maxMs: 4000 },
  "pong":               { accuracy: 0.84, minMs: 2000, maxMs: 4000 },
  "race-car-math":      { accuracy: 0.84, minMs: 2000, maxMs: 4000 },
  "math-bubble-pop":    { accuracy: 0.84, minMs: 2000, maxMs: 4000 },
  "burst-your-bubble":  { accuracy: 0.84, minMs: 2000, maxMs: 4000 },
  "memory":             { accuracy: 0.84, minMs: 2000, maxMs: 4000 },
  "pindrop":            { accuracy: 0.84, minMs: 2000, maxMs: 4000 },
  "break-the-bank":     { accuracy: 0.68, minMs: 2900, maxMs: 5200 },
  "base-attack":        { accuracy: 0.84, minMs: 2000, maxMs: 4000 },
  "equations-drop":     { accuracy: 0.84, minMs: 2000, maxMs: 4000 },
  "speed-connect-4":    { accuracy: 0.84, minMs: 2000, maxMs: 4000 },
};

const DOC_REF = () => doc(db, "settings", "aiConfig");

// Fetch the current settings, filled in with defaults for any game that
// hasn't been customized yet (or if the doc doesn't exist at all).
export async function getAISettings() {
  const merged = {};
  for (const g of GAME_LIST) merged[g.id] = { ...DEFAULT_AI_SETTINGS[g.id] };
  try {
    const snap = await getDoc(DOC_REF());
    if (snap.exists()) {
      const data = snap.data();
      for (const g of GAME_LIST) {
        if (data[g.id]) merged[g.id] = { ...merged[g.id], ...data[g.id] };
      }
    }
  } catch (err) {
    console.error("Couldn't load AI settings, using defaults:", err);
  }
  return merged;
}

export async function saveAISettings(settings) {
  await setDoc(DOC_REF(), settings);
}

// Convenience for games: given a bot created by createAIOpponent() and the
// full settings map, returns a profile object with accuracy/minMs/maxMs
// swapped in for that specific game (keeping the bot's level/name/emoji).
export function applyAISettings(botProfile, gameId, settings) {
  const tuning = (settings && settings[gameId]) || DEFAULT_AI_SETTINGS[gameId];
  return { ...botProfile, ...tuning };
}

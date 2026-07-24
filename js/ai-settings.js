// ============================================================
// Teacher-configurable AI opponent settings — accuracy % and answer-time
// range for EACH difficulty (easy/medium/hard) of EACH game, stored in a
// single shared Firestore doc and read by every game before it builds its
// AI bot. This OVERRIDES the accuracy/minMs/maxMs baked into
// js/ai-opponent.js's AI_PROFILES for the difficulty the student picks —
// the easy/medium/hard buttons still change how hard the MATH is (the
// bot's times-tables level), but how fast and how accurate the bot answers
// at each of those difficulties is now controlled here, game by game and
// difficulty by difficulty, from the teacher Settings page.
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

export const DIFFICULTIES = ["easy", "medium", "hard"];

// accuracy: 0-1 (fraction). minMs/maxMs: how long the bot takes to answer.
// One tuning per difficulty per game. Every game starts at the shared
// module's original easy/medium/hard tiers (js/ai-opponent.js AI_PROFILES),
// except Break the Bank, which starts at its already-tuned easier pace at
// every difficulty (it's a tight speed race where the shared defaults felt
// unbeatable).
const SHARED_DEFAULT_TIERS = {
  easy:   { accuracy: 0.84, minMs: 2000, maxMs: 4000 },
  medium: { accuracy: 0.86, minMs: 1750, maxMs: 3500 },
  hard:   { accuracy: 0.90, minMs: 1500, maxMs: 3050 },
};
const BREAK_THE_BANK_TIERS = {
  easy:   { accuracy: 0.68, minMs: 2900, maxMs: 5200 },
  medium: { accuracy: 0.68, minMs: 2900, maxMs: 5200 },
  hard:   { accuracy: 0.68, minMs: 2900, maxMs: 5200 },
};

export const DEFAULT_AI_SETTINGS = {};
for (const g of GAME_LIST) {
  DEFAULT_AI_SETTINGS[g.id] = g.id === "break-the-bank"
    ? { easy: { ...BREAK_THE_BANK_TIERS.easy }, medium: { ...BREAK_THE_BANK_TIERS.medium }, hard: { ...BREAK_THE_BANK_TIERS.hard } }
    : { easy: { ...SHARED_DEFAULT_TIERS.easy }, medium: { ...SHARED_DEFAULT_TIERS.medium }, hard: { ...SHARED_DEFAULT_TIERS.hard } };
}

const DOC_REF = () => doc(db, "settings", "aiConfig");

function defaultsFor(gameId) {
  return DEFAULT_AI_SETTINGS[gameId] || { easy: { ...SHARED_DEFAULT_TIERS.easy }, medium: { ...SHARED_DEFAULT_TIERS.medium }, hard: { ...SHARED_DEFAULT_TIERS.hard } };
}

// Fetch the current settings, filled in with defaults for any game/difficulty
// combo that hasn't been customized yet (or if the doc doesn't exist at all).
// Also transparently upgrades any old-format doc (one flat {accuracy,minMs,
// maxMs} per game, from before per-difficulty settings existed) by applying
// that single saved tuning to all three difficulties.
export async function getAISettings() {
  const merged = {};
  for (const g of GAME_LIST) {
    const def = defaultsFor(g.id);
    merged[g.id] = { easy: { ...def.easy }, medium: { ...def.medium }, hard: { ...def.hard } };
  }
  try {
    const snap = await getDoc(DOC_REF());
    if (snap.exists()) {
      const data = snap.data();
      for (const g of GAME_LIST) {
        const saved = data[g.id];
        if (!saved) continue;
        if (saved.easy || saved.medium || saved.hard) {
          // Current (per-difficulty) format.
          for (const diff of DIFFICULTIES) {
            if (saved[diff]) merged[g.id][diff] = { ...merged[g.id][diff], ...saved[diff] };
          }
        } else if (typeof saved.accuracy === "number") {
          // Legacy (single-tuning) format — apply it to all three difficulties.
          for (const diff of DIFFICULTIES) {
            merged[g.id][diff] = { ...merged[g.id][diff], ...saved };
          }
        }
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
// swapped in for that specific game AND difficulty (keeping the bot's
// level/name/emoji). The bot's difficulty comes from botProfile.key, which
// is set by createAIOpponent()/AI_PROFILES to "easy"/"medium"/"hard".
export function applyAISettings(botProfile, gameId, settings) {
  const difficulty = (botProfile && botProfile.key) || "medium";
  const gameSettings = (settings && settings[gameId]) || defaultsFor(gameId);
  const tuning = gameSettings[difficulty] || defaultsFor(gameId)[difficulty];
  return { ...botProfile, ...tuning };
}

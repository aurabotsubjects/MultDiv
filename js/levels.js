// ============================================================
// Level progression engine — shared by every game + the test.
//
// Levels 1–11   : ×2  through ×12
// Level  12     : Mixed multiplication (×2–×12 at random)
// Levels 13–23  : ÷2  through ÷12
// Level  24     : Mixed division (÷2–÷12 at random)
// Level  25     : Mixed everything (multiplication AND division)
// ============================================================

export const MAX_LEVEL = 25;

export function levelInfo(rawLevel) {
  const level = Math.max(1, Math.min(MAX_LEVEL, rawLevel || 1));
  if (level <= 11) {
    const operand = level + 1; // 1->2, 2->3 ... 11->12
    return { level, op: "mult", operand, label: `×${operand}` };
  }
  if (level === 12) return { level, op: "mult-mixed", operand: null, label: "Mixed ×" };
  if (level <= 23) {
    const operand = level - 12 + 1; // 13->2 ... 23->12
    return { level, op: "div", operand, label: `÷${operand}` };
  }
  if (level === 24) return { level, op: "div-mixed", operand: null, label: "Mixed ÷" };
  return { level, op: "all-mixed", operand: null, label: "Mixed everything" };
}

export function nextLevel(level) {
  return Math.min(MAX_LEVEL, (level || 1) + 1);
}

export function isMaxLevel(level) {
  return (level || 1) >= MAX_LEVEL;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Returns { text, a, b, symbol, answer } for one question at the given level.
export function generateQuestion(level) {
  const info = levelInfo(level);
  let op = info.op;
  if (op === "mult-mixed") op = "mult-random";
  if (op === "div-mixed") op = "div-random";
  if (op === "all-mixed") op = Math.random() < 0.5 ? "mult-random" : "div-random";

  if (op === "mult" || op === "mult-random") {
    const operand = op === "mult-random" ? randInt(2, 12) : info.operand;
    const factor = randInt(1, 12);
    return { text: `${operand} × ${factor}`, a: operand, b: factor, symbol: "×", answer: operand * factor };
  }

  // division — built from a clean multiplication fact so it always divides evenly
  const operand = op === "div-random" ? randInt(2, 12) : info.operand;
  const factor = randInt(1, 12);
  const dividend = operand * factor;
  return { text: `${dividend} ÷ ${operand}`, a: dividend, b: operand, symbol: "÷", answer: factor };
}

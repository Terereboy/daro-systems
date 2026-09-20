// scripts/apply-claudish-label.js
//
// Dos automatizaciones sobre english-progress-data.js, ambas en tono
// "Claudish" (directo, sin inflar, sin restarle importancia a lo malo):
//
// 1) history: si la última entrada tiene label "AUTO", se elige una
//    frase según el delta de `units` contra la entrada anterior.
//
// 2) dailyPractice: si trae un campo `newSessionScore` (el puntaje de
//    la sesión que se acaba de cargar), el script:
//      - lee el estado del commit ANTERIOR para saber si ya hubo otra
//        sesión ese mismo día,
//      - si es la misma fecha, promedia el nuevo puntaje con el
//        promedio acumulado del día (scoredBlocks sube en 1),
//      - si es un día nuevo, arranca de cero con ese puntaje,
//      - si label es "AUTO", elige una frase que refleje el mood de
//        ESA sesión puntual (no el promedio del día),
//      - borra `newSessionScore` (ya cumplió su función).
//
// Quien carga el dato (Claude Code, ChatGPT, o a mano) solo necesita
// escribir date + newSessionScore + label:"AUTO". Todo lo demás lo
// calcula este script. No requiere dependencias externas.

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(REPO_ROOT, 'english-progress-data.js');

// ---------- banco de frases para history (por delta vs. entrada anterior) ----------
const HISTORY_PHRASES = {
  strongDown: [
    "This wasn't a surface slip — it was a structural gap in real-time fluency.",
    "I should be direct: today's practice regressed, and that's worth naming plainly.",
    "Not a peripheral stumble. A foundational one, and today made that clear.",
    "Let's be honest about where this stands: today moved backward, not sideways."
  ],
  mildDown: [
    "A small step back, and I want to be precise about that, not gloss over it.",
    "This dipped slightly — worth noting honestly rather than rounding up.",
    "Not a breakthrough today, and I won't pretend otherwise.",
    "A minor regression, real enough to name, small enough not to overreact to."
  ],
  flat: [
    "Steady, not stagnant — worth being precise about the difference.",
    "No dramatic shift today. That's a fair, honest read of where things stand.",
    "Holding the line counts as progress, even when it doesn't look like it.",
    "Flat today, and I'd rather say that plainly than dress it up."
  ],
  mildUp: [
    "A real gain, modest in size but not in significance.",
    "This is worth calling out clearly: measurable, if incremental, progress.",
    "Small movement forward — I want to be precise, not inflate it.",
    "Not a leap, but a genuine step, and it deserves to be named as one."
  ],
  strongUp: [
    "This wasn't incremental — it was foundational progress, and it's worth saying so directly.",
    "No hedging needed here: today's practice held up cleanly under real pressure.",
    "You're right to expect this level of consistency — today delivered it.",
    "This is the kind of progress that compounds, and it's fair to say so plainly."
  ]
};

function historyTierFor(delta) {
  if (delta <= -60) return 'strongDown';
  if (delta <= -10) return 'mildDown';
  if (delta < 10) return 'flat';
  if (delta < 60) return 'mildUp';
  return 'strongUp';
}

// ---------- banco de frases para dailyPractice (por score absoluto de ESA sesión) ----------
const SESSION_MOOD_PHRASES = {
  '0': [
    "This block wasn't close, and I'd rather say that than round up.",
    "A rough session — worth naming plainly, not explaining away.",
    "This one didn't land, and that's a fair thing to state directly."
  ],
  '25': [
    "Uneven, not broken — this block had real gaps.",
    "This session fell short of the mark, and I want to be precise about that.",
    "Not the block I was aiming for, and I won't dress it up."
  ],
  '50': [
    "A middling block — real effort, not yet where it needs to be.",
    "This one held up in parts and slipped in others. Worth saying both.",
    "Not a strong session, but not a weak one either — genuinely in between."
  ],
  '75': [
    "This block held up cleanly — worth calling that out directly.",
    "A solid session, and I don't need to hedge on that.",
    "This one landed. No qualifiers needed."
  ],
  '100': [
    "Exactly the target for this block — clean, and worth saying so plainly.",
    "No gaps in this one. That's rare enough to name.",
    "This session was precise, and precision here is the whole point."
  ],
  charging: [
    "This wasn't just a good block — it's the kind that resets the baseline.",
    "Worth being direct: this session outperformed the pattern, not just the average.",
    "This is the block that makes the rest of the week's practice worth it."
  ]
};

function sessionBucketFor(score) {
  if (score >= 100) return '100';
  if (score >= 75) return '75';
  if (score >= 50) return '50';
  if (score >= 25) return '25';
  return '0';
}

function pickPhrase(bank, avoid) {
  if (!bank || bank.length === 0) return null;
  if (bank.length === 1) return bank[0];
  let choice;
  do {
    choice = bank[Math.floor(Math.random() * bank.length)];
  } while (choice === avoid);
  return choice;
}

// ---------- utilidades para leer el archivo (actual y del commit anterior) ----------
function loadData(src) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.window.englishProgress;
}

function loadPreviousData() {
  try {
    const prevSrc = execSync('git show HEAD~1:english-progress-data.js', {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    });
    return loadData(prevSrc);
  } catch (e) {
    return null; // no hay commit anterior, o el archivo no existía todavía
  }
}

// ---------- 1) history label ----------
function applyHistoryLabel(data) {
  if (!data || !Array.isArray(data.history) || data.history.length === 0) return;

  const history = data.history;
  const last = history[history.length - 1];
  const prev = history.length > 1 ? history[history.length - 2] : null;

  const needsLabel = !last.label || String(last.label).trim().toUpperCase() === 'AUTO';
  if (!needsLabel) return;

  const delta = prev ? (last.units - prev.units) : 0;
  const tier = historyTierFor(delta);
  const avoidLabel = prev ? prev.label : null;
  last.label = pickPhrase(HISTORY_PHRASES[tier], avoidLabel);

  console.log(`[history] delta=${delta} tier=${tier} label="${last.label}"`);
}

// ---------- 2) dailyPractice: promedio del día + mood de la sesión ----------
function applyDailyPractice(data) {
  const dp = data && data.dailyPractice;
  if (!dp || !Object.prototype.hasOwnProperty.call(dp, 'newSessionScore')) return;

  const newScore = Math.max(0, Math.min(100, Number(dp.newSessionScore) || 0));

  const prevData = loadPreviousData();
  const prevDp = prevData && prevData.dailyPractice;
  const sameDay = !!(prevDp && prevDp.date === dp.date);

  const prevPercent = sameDay ? (Number(prevDp.percent) || 0) : null;
  const prevBlocks = sameDay ? (Number(prevDp.scoredBlocks) || 0) : 0;

  const scoredBlocks = prevBlocks + 1;
  const percent = sameDay
    ? Math.round(((prevPercent * prevBlocks) + newScore) / scoredBlocks)
    : newScore;
  const generalDelta = sameDay ? (newScore - prevPercent) : 0;

  dp.percent = percent;
  dp.scoredBlocks = scoredBlocks;
  dp.generalDelta = generalDelta;
  dp.lastSessionScore = newScore;

  const needsLabel = !dp.label || String(dp.label).trim().toUpperCase() === 'AUTO';
  if (needsLabel) {
    const bucket = dp.isCharging === true ? 'charging' : sessionBucketFor(newScore);
    dp.label = pickPhrase(SESSION_MOOD_PHRASES[bucket], null);
  }

  delete dp.newSessionScore;

  console.log(`[dailyPractice] sameDay=${sameDay} newScore=${newScore} → percent=${percent} scoredBlocks=${scoredBlocks} generalDelta=${generalDelta} label="${dp.label}"`);
}

function main() {
  const src = fs.readFileSync(DATA_PATH, 'utf8');
  const data = loadData(src);

  if (!data) {
    console.log('No se pudo leer window.englishProgress, nada para hacer.');
    return;
  }

  applyHistoryLabel(data);
  applyDailyPractice(data);

  const output = `window.englishProgress = ${JSON.stringify(data, null, 2)};\n`;
  fs.writeFileSync(DATA_PATH, output);
}

main();

// scripts/apply-claudish-label.js
//
// Lee english-progress-data.js, y si la última entrada de `history`
// tiene label "AUTO" (o vacío), la reemplaza por una frase del banco
// "Claudish" elegida según el delta de `units` contra la entrada
// anterior. No toca nada si ya hay un label real escrito a mano.
//
// Se corre solo, vía GitHub Actions, en cada push/PR que toque
// english-progress-data.js. No requiere dependencias externas.

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'english-progress-data.js');

const PHRASES = {
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

function tierFor(delta) {
  if (delta <= -60) return 'strongDown';
  if (delta <= -10) return 'mildDown';
  if (delta < 10) return 'flat';
  if (delta < 60) return 'mildUp';
  return 'strongUp';
}

function pickPhrase(tier, avoid) {
  const bank = PHRASES[tier];
  if (bank.length === 1) return bank[0];
  let choice;
  do {
    choice = bank[Math.floor(Math.random() * bank.length)];
  } while (choice === avoid);
  return choice;
}

function loadData(src) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.window.englishProgress;
}

function main() {
  const src = fs.readFileSync(DATA_PATH, 'utf8');
  const data = loadData(src);

  if (!data || !Array.isArray(data.history) || data.history.length === 0) {
    console.log('No history entries found, nothing to do.');
    return;
  }

  const history = data.history;
  const last = history[history.length - 1];
  const prev = history.length > 1 ? history[history.length - 2] : null;

  const needsLabel = !last.label || last.label.trim().toUpperCase() === 'AUTO';

  if (!needsLabel) {
    console.log('Last entry already has a manual label, leaving it as-is.');
    return;
  }

  const delta = prev ? (last.units - prev.units) : 0;
  const tier = tierFor(delta);
  const avoidLabel = prev ? prev.label : null;
  last.label = pickPhrase(tier, avoidLabel);

  console.log(`Delta: ${delta} → tier: ${tier} → label: "${last.label}"`);

  const output = `window.englishProgress = ${JSON.stringify(data, null, 2)};\n`;
  fs.writeFileSync(DATA_PATH, output);
}

main();

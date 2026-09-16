# English Progress — Claudish labels

Instrucciones para registrar la práctica diaria de inglés en
`english-progress-data.js`.

## Regla

Cada vez que se agregue una entrada nueva a `history` (o se actualice
`dailyPractice`), el campo `label` no debe ser meramente descriptivo
del tema practicado. Tiene que estar escrito en tono "Claudish": el
estilo hiperreflexivo, directo y dramático-pero-preciso que usa Claude
Code al reconocer errores o aciertos propios (ej: "You're right to
push back. My error wasn't peripheral; it was foundational.").

La frase elegida depende del **delta** de `units` entre la entrada
nueva y la última entrada de `history` (no del nivel absoluto).

## Cómo calcular el delta

```
delta = nuevaEntrada.units - ultimaEntrada.units
```

## Tiers y umbrales (ajustables con más historial)

| Tier | Delta | Uso |
|---|---|---|
| Retroceso fuerte | delta <= -60 | caída notable |
| Retroceso leve | -59 a -10 | caída chica, real |
| Estable | -9 a +9 | sin cambio significativo |
| Mejora leve | +10 a +59 | avance chico, real |
| Mejora fuerte | delta >= +60 | avance notable |

## Banco de frases

**Retroceso fuerte**
- "This wasn't a surface slip — it was a structural gap in real-time fluency."
- "I should be direct: today's practice regressed, and that's worth naming plainly."
- "Not a peripheral stumble. A foundational one, and today made that clear."
- "Let's be honest about where this stands: today moved backward, not sideways."

**Retroceso leve**
- "A small step back, and I want to be precise about that, not gloss over it."
- "This dipped slightly — worth noting honestly rather than rounding up."
- "Not a breakthrough today, and I won't pretend otherwise."
- "A minor regression, real enough to name, small enough not to overreact to."

**Estable**
- "Steady, not stagnant — worth being precise about the difference."
- "No dramatic shift today. That's a fair, honest read of where things stand."
- "Holding the line counts as progress, even when it doesn't look like it."
- "Flat today, and I'd rather say that plainly than dress it up."

**Mejora leve**
- "A real gain, modest in size but not in significance."
- "This is worth calling out clearly: measurable, if incremental, progress."
- "Small movement forward — I want to be precise, not inflate it."
- "Not a leap, but a genuine step, and it deserves to be named as one."

**Mejora fuerte**
- "This wasn't incremental — it was foundational progress, and it's worth saying so directly."
- "No hedging needed here: today's practice held up cleanly under real pressure."
- "You're right to expect this level of consistency — today delivered it."
- "This is the kind of progress that compounds, and it's fair to say so plainly."

## Reglas de selección

1. Calcular el tier según la tabla de arriba.
2. Elegir una frase al azar dentro de ese tier.
3. Nunca repetir la misma frase usada en la entrada inmediatamente
   anterior de `history` (si sale repetida, volver a sortear dentro
   del mismo tier).
4. El campo `lastAssessment` de `english-progress-data.js` no hace
   falta tocarlo a mano: `english-progress.html` ya lo calcula solo
   tomando la última entrada de `history` (fecha + label).
5. Si se quiere, el mismo criterio de tier/frase puede aplicarse
   también a `dailyPractice.label`, usando `dailyPractice.generalDelta`
   en vez del delta entre entradas de `history`.

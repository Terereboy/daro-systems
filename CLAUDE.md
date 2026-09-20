# English Progress — Claudish labels

Instrucciones para registrar la práctica de inglés en
`english-progress-data.js`. La automatización vive en
`scripts/apply-claudish-label.js` y corre sola vía GitHub Actions
(`.github/workflows/apply-claudish-label.yml`) en cada push/PR que
toque ese archivo.

## Regla general

Los labels no son descripciones neutras del tema practicado. Van en
tono "Claudish": el estilo hiperreflexivo, directo y
dramático-pero-preciso que usa Claude Code al reconocer errores o
aciertos propios (ej: "You're right to push back. My error wasn't
peripheral; it was foundational."). No inflar lo bueno, no minimizar
lo malo.

## 1) `history` — evaluaciones periódicas comparables

Para agregar una entrada nueva:

```js
{ date: "2026-09-19", units: 600040, level: 60.004, label: "AUTO" }
```

Con `label: "AUTO"` (o vacío), el script elige la frase solo, según
el delta de `units` contra la entrada anterior de `history`:

| Tier | Delta |
|---|---|
| Retroceso fuerte | delta <= -60 |
| Retroceso leve | -59 a -10 |
| Estable | -9 a +9 |
| Mejora leve | +10 a +59 |
| Mejora fuerte | delta >= +60 |

Si ya se escribe un label real a mano (no "AUTO"), el script no lo
toca.

`lastAssessment` y el nivel/porcentaje que se ven arriba de todo en
`english-progress.html` ya se calculan solos desde la última entrada
de `history` — no hace falta tocar esos campos nunca.

## 2) `dailyPractice` — la práctica de HOY, con posibles varias sesiones

Para cargar una sesión (la primera del día, o una más si ya
practicaste antes hoy), **solo hace falta esto**:

```js
dailyPractice: {
  date: "2026-09-19",
  newSessionScore: 82,
  label: "AUTO"
}
```

El script hace todo el resto:

1. Lee el commit anterior para ver si `dailyPractice.date` ya era
   hoy (es decir, si ya hubo otra sesión).
2. Si es el mismo día: promedia `newSessionScore` con el promedio
   acumulado (`percent`) que ya había, y suma 1 a `scoredBlocks`.
   Esto hace que `percent` **suba o baje** con cada sesión nueva,
   según cómo te fue.
3. Si es un día nuevo: arranca de cero con ese puntaje
   (`scoredBlocks: 1`).
4. Calcula `generalDelta` = diferencia entre esta sesión y el
   promedio que había antes de sumarla.
5. Si `label` es "AUTO", elige una frase que describe el **mood de
   esa sesión puntual** (no el promedio del día) según su puntaje:

| Bucket (score de la sesión) | Uso |
|---|---|
| 0-24 | sesión floja |
| 25-49 | sesión mediocre |
| 50-74 | sesión intermedia |
| 75-99 | buena sesión |
| 100 | sesión perfecta |
| `isCharging: true` (opcional, además del score) | sesión que superó ampliamente lo esperado |

6. Borra `newSessionScore` del archivo final (ya cumplió su función,
   no tiene que quedar dando vueltas).

**Nunca hay que calcular el promedio a mano.** Si alguna IA (Claude
Code, ChatGPT, o quien sea) solo escribe `date`, `newSessionScore` y
`label: "AUTO"`, el resto queda bien resuelto solo.

## Nota técnica

El script usa `git show HEAD~1:english-progress-data.js` para leer
el estado anterior, por eso el workflow necesita `fetch-depth: 0`
(historial completo) en el `actions/checkout`. Si algún día se migra
a un modelo de ramas/PRs más complejo, revisar que esa comparación
siga apuntando al commit correcto.

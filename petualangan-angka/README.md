# Petualangan Angka 🦊🐻🐰🐼

**"Belajar Berhitung, Sambil Berpetualang!"**

A playful math adventure game for 5-year-old Indonesian-speaking children. Kids travel through
7 themed worlds with four original animal friends, learning addition, subtraction, word problems
and simple logic, at their own pace, without timers, ads, accounts, or external links.

Built with **React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion + Lucide icons**.
Everything runs in the browser; progress is saved in `localStorage`.

---

## Run it locally

Requirements: **Node.js 18+** (tested with Node 22) and npm.

```bash
cd petualangan-angka
npm install
npm run dev          # http://localhost:5173  (also reachable from a phone/tablet on the same Wi-Fi)
```

Other scripts:

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run build`     | Type-check and build a static site into `dist/` |
| `npm run preview`   | Serve the production build (port 4173)          |
| `npm test`          | Run the unit tests (Vitest)                     |
| `npm run typecheck` | TypeScript only                                 |

The `dist/` folder is a fully static site (relative paths), so it can be hosted on any static
host (Netlify, GitHub Pages, Vercel…) or opened from a local web server. On phones/tablets it can
be added to the home screen (a web manifest is included).

> Tip: tap **Main!** on the splash screen first. Browsers only allow sound after a tap.

---

## The game

| World | Name           | Topic                      | Numbers  | Guide |
| ----- | -------------- | -------------------------- | -------- | ----- |
| 1     | Hutan Ceria    | Addition                   | 1–5      | Foxy  |
| 2     | Negeri Permen  | Subtraction                | 1–5      | Bubu  |
| 3     | Desa Kelinci   | Addition                   | 1–10     | Foxy  |
| 4     | Gunung Beruang | Subtraction                | 1–10     | Bubu  |
| 5     | Pulau Buah     | Mixed + / −                | 1–10     | Pando |
| 6     | Istana Ajaib   | Illustrated word problems  | 1–10     | Mimi  |
| 7     | Kerajaan Naga  | Mixed arithmetic + logic   | 1–20     | Pando |

* Each world has **5 stages**, and each stage has **5 questions** freshly generated every time.
* Question types: multiple-choice equations, visual counting (tap the pictures to count them),
  animated subtraction (balloons fly away, cookies get eaten…), missing number (`2 + ? = 5`),
  word problems, "who has more/fewer?", number sequences, and "which number is biggest?".
* **Scoring:** a correct first answer = 20 points (max 100). 5 correct = ★★★, 4 = ★★, 3 = ★,
  fewer than 3 = try the stage again. The next stage/world unlocks after passing.
* **Gentle mistakes:** a wrong answer shows an encouraging message and an animated
  "let's count together" explanation, then the child tries again. There are no penalties beyond
  not earning that question's star.
* **Hints**, a **read-aloud** button (Indonesian speech synthesis) and a **mute** button on every question.
* **Rewards:** coins → character accessories (party hat, crown, wizard hat…), 14 achievement
  badges, unlockable dance animations, confetti and a celebration when a world is completed.
* **Parent dashboard** (behind a simple multiplication "parent gate"): stages completed,
  accuracy, performance per topic (addition, subtraction, word problems, logic), learning progress
  per world, recently played stages, sound/music/voice settings and progress reset.

---

## Project structure

```
src/
  game/                 Pure game logic (no React): fully unit-tested
    types.ts            Domain types
    worlds.ts           7 worlds × 5 stages: number ranges + question mix per stage
    questionGenerator.ts Reusable question generator (all 8 question types)
    scoring.ts          Points, stars, coins
    progress.ts         Unlock rules, applying a stage result, statistics
    rewards.ts          Accessories, badges, dances
    storage.ts          Versioned localStorage save with validation/recovery
    language.ts         Indonesian number words + friendly messages
    items.ts / characters.ts
    __tests__/          Vitest suites (generator constraints, progression, storage)
  state/GameContext.tsx Centralized state (useReducer) + persistence
  audio/                Synthesized sound effects & music (Web Audio, no audio files), speech
  components/
    characters/         SVG characters (Foxy, Bubu, Mimi, Pando) with moods & accessories
    items/              SVG countable objects (apples, balloons, fish…)
    game/               Question visuals, equation, answer buttons, hint, explanations
    ui/                 Buttons, counters, confetti, modal, scenery backgrounds, logo
  screens/              Splash, Home, World Map, Level Select, Gameplay, Results,
                        Collection (rewards), Parent Dashboard
```

### Question generator guarantees (checked by tests over thousands of generated stages)

* Answers are always whole numbers and never negative; subtraction never goes below 1.
* Worlds 1–2 stay within 1–5, worlds 3–6 within 1–10, world 7 within 1–20,
  including the wrong answer options.
* Exactly one correct option; options are distinct and their order is randomized.
* Duplicate questions inside a stage are avoided (retries up to 40 times).
* Arithmetic, comparisons, sequences and "biggest number" answers are verified to be correct.

### Adding or tuning content

* Change difficulty: edit the `min`/`max` range or the `slots` of a stage in `src/game/worlds.ts`.
* Add story templates: `wordQuestion()` in `src/game/questionGenerator.ts`.
* Add a reward: `ACCESSORIES` / `BADGES` / `DANCES` in `src/game/rewards.ts`
  (accessory artwork lives in `src/components/characters/Accessory.tsx`).

## Notes

* All artwork is original SVG drawn in code; all sounds are synthesized at runtime.
* Read-aloud uses the device's speech synthesis. An Indonesian voice is used when the device has one.
* Progress lives only on the device (`localStorage` key `petualangan-angka:save:v1`).

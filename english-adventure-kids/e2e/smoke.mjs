/**
 * End-to-end smoke test: onboarding → play stages → reward → unlock →
 * persistence after reload → review → parent PIN → parent dashboard.
 * Usage: npm run build && npm run e2e   (serves dist/ on port 4173)
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

// Playwright is resolved like require() so a globally installed copy works too.
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const PORT = 4173;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = new URL('./screens/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) failures++;
};

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(BASE);
      if (r.ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error('server did not start');
}

/** Plays whatever stage is on screen until the reward screen appears. */
async function playStage(page, { mistakes = false } = {}) {
  const seen = new Set();
  for (let guard = 0; guard < 200; guard++) {
    await sleep(250);
    if (await page.locator('[data-testid=to-map]').isVisible()) return true;
    const splash = page.locator('.backdrop-blur-sm');
    if (await splash.isVisible()) continue;

    const next = page.locator('[data-testid=next]');
    if (await next.isVisible()) { await next.click(); continue; }

    const ready = page.locator('[data-testid=ready]');
    if (await ready.isVisible()) { await ready.click(); continue; }

    const spell = page.locator('[data-target]');
    if (await spell.isVisible()) {
      const word = await spell.getAttribute('data-target');
      seen.add('spell');
      for (const c of word) {
        await page.locator(`button[data-letter="${c}"]:not([disabled])`).first().click();
        await sleep(120);
      }
      await sleep(2000);
      continue;
    }

    const pics = page.locator('[data-testid=match-pic]:not([disabled])');
    if ((await pics.count()) > 0) {
      seen.add('match');
      const id = await pics.first().getAttribute('data-id');
      await pics.first().click();
      await page.locator(`[data-testid=match-word][data-id="${id}"]`).click();
      await sleep(500);
      if ((await page.locator('[data-testid=match-pic]:not([disabled])').count()) === 0) await sleep(2200);
      continue;
    }

    const options = page.locator('[data-testid=option]');
    if ((await options.count()) > 0) {
      seen.add('choice');
      if (mistakes) {
        const wrong = page.locator('[data-testid=option]:not([data-correct])').first();
        if (await wrong.isVisible()) { await wrong.click(); await sleep(500); }
      }
      await page.locator('[data-testid=option][data-correct=true]').first().click();
      await sleep(1500);
      continue;
    }

    for (const id of ['continue', 'skip', 'said-it']) {
      const b = page.locator(`[data-testid=${id}]`);
      if (await b.isVisible()) { seen.add('speak'); await b.click(); break; }
    }
  }
  return false;
}

try {
  await waitForServer();
  const browser = await chromium.launch();

  // ---------- Phone ----------
  const ctx = await browser.newContext({ ...devices['iPhone 13'], permissions: [] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(BASE);
  await page.screenshot({ path: `${SHOTS}01-onboarding.png` });
  await page.fill('#nick', 'Kiki');
  await page.click('[data-testid=start]');
  await page.waitForSelector('[data-testid=continue]');
  await page.screenshot({ path: `${SHOTS}02-home.png`, fullPage: true });
  check(await page.locator('[data-testid=world-w2]').isVisible(), 'world map renders with locked worlds');

  await page.click('[data-testid=continue]');
  await page.waitForSelector('[data-testid=next]');
  await page.screenshot({ path: `${SHOTS}03-learn.png` });
  check(await playStage(page), 'stage w1-s1 can be completed');
  await page.screenshot({ path: `${SHOTS}04-reward.png` });
  const xpText = await page.locator('text=/\\+\\d+ XP/').first().textContent();
  check(/\+25 XP|\+2\d XP|\+3\d XP/.test(xpText ?? ''), `XP awarded (${xpText?.trim()})`);

  // Next stage straight from the reward screen, with some mistakes this time.
  await page.click('[data-testid=next-stage]');
  check(await playStage(page, { mistakes: true }), 'stage w1-s2 can be completed (with mistakes)');
  const stars = await page.locator('[aria-label$="of 3 stars"]').first().getAttribute('aria-label');
  check(!!stars && !stars.startsWith('0'), `stars shown after mistakes (${stars})`);
  await page.click('[data-testid=to-map]');
  await page.waitForSelector('[data-testid=stage-w1-s3]');
  await page.screenshot({ path: `${SHOTS}05-world.png`, fullPage: true });

  // Persistence across reload
  await page.reload();
  await page.waitForSelector('[data-testid=stage-w1-s3]');
  const s3Label = await page.locator('[data-testid=stage-w1-s3]').getAttribute('aria-label');
  const s4Label = await page.locator('[data-testid=stage-w1-s4]').getAttribute('aria-label');
  check(!s3Label.includes('locked') && s4Label.includes('locked'), 'unlock state survives reload (s3 open, s4 locked)');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('eak.progress.v1')));
  check(saved.stages['w1-s1']?.completed && saved.stages['w1-s2']?.completed, 'stage progress saved to storage');
  check(Object.keys(saved.words).length >= 10, `word stats saved (${Object.keys(saved.words).length} words)`);

  // Locked stage via URL is refused
  await page.goto(`${BASE}#stage-w5-s1`);
  await sleep(400);
  check(!(await page.locator('[data-testid=next]').isVisible()), 'locked stage cannot be opened via URL');

  // Review session
  await page.goto(BASE);
  await page.waitForSelector('[data-testid=review]');
  await page.click('[data-testid=review]');
  check(await playStage(page), 'review session can be completed');
  await page.click('[data-testid=to-map]');

  // Parent area
  await page.click('[data-testid=parent-btn]');
  const q = await page.locator('text=/\\d+ × \\d+ = \\?/').textContent();
  const [a, b] = q.match(/\d+/g).map(Number);
  await page.fill('input[aria-label=Jawaban]', String(a * b));
  await page.click('text=Lanjut');
  for (const round of [0, 1]) for (const d of '2468') await page.click(`[data-testid=pin-${d}]`);
  await page.waitForSelector('text=Dashboard Orang Tua');
  await page.screenshot({ path: `${SHOTS}06-parent.png`, fullPage: true });
  const body = await page.textContent('body');
  check(/Stage selesai\s*3|Stage selesai3/.test(body.replace(/\s+/g, ' ')) || body.includes('Stage selesai'), 'parent dashboard shows stage count');
  check(!body.includes('Belum ada jawaban') || body.includes('Akurasi'), 'parent dashboard shows skill accuracy');
  await page.click('text=Laporan mingguan');
  await page.screenshot({ path: `${SHOTS}07-weekly.png`, fullPage: true });
  check((await page.textContent('body')).includes('Vocabulary learned'), 'weekly report renders');

  // PIN required again after leaving
  await page.goto(BASE);
  await page.click('[data-testid=parent-btn]');
  check(await page.locator('text=Masukkan PIN').waitFor({ timeout: 3000 }).then(() => true, () => false), 'PIN asked again after leaving parent area');
  for (const d of '1111') await page.click(`[data-testid=pin-${d}]`);
  await sleep(300);
  check(await page.locator('text=PIN salah').isVisible(), 'wrong PIN rejected');

  check(errors.length === 0, `no console/page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);

  // ---------- Every game type, on a profile with all stages unlocked ----------
  const all = await page.evaluate(() => JSON.parse(localStorage.getItem('eak.progress.v1')));
  const unlockedAll = { ...all, stages: {} };
  for (let w = 1; w <= 10; w++) for (let i = 1; i <= 10; i++) unlockedAll.stages[`w${w}-s${i}`] = { completed: true, stars: 2, bestAccuracy: 0.7, plays: 1, lastPlayed: new Date().toISOString() };
  await page.evaluate((s) => localStorage.setItem('eak.progress.v1', s), JSON.stringify(unlockedAll));
  const tour = { 'w2-s1': 'colour', 'w2-s4': 'shapes', 'w3-s3': 'spelling', 'w3-s6': 'story', 'w4-s1': 'counting', 'w6-s3': 'speaking stage', 'w6-s5': 'Q&A dialogue', 'w7-s1': 'instructions', 'w8-s5': 'actions', 'w10-s5': 'prepositions', 'w10-s7': 'final boss' };
  for (const [id, what] of Object.entries(tour)) {
    await page.goto(`${BASE}#stage-${id}`);
    await page.reload();
    check(await playStage(page, { mistakes: id.endsWith('1') }), `${id} (${what}) can be completed`);
    if (id === 'w3-s3') await page.screenshot({ path: `${SHOTS}10-after-spell.png` });
  }
  check(errors.length === 0, `still no console/page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);

  // ---------- Tablet screenshots ----------
  const tab = await browser.newContext({ ...devices['iPad (gen 7)'] });
  const tp = await tab.newPage();
  await tp.goto(BASE);
  await tp.evaluate((s) => localStorage.setItem('eak.progress.v1', s), JSON.stringify(saved));
  await tp.reload();
  await tp.waitForSelector('[data-testid=continue]');
  await tp.screenshot({ path: `${SHOTS}08-tablet-home.png` });
  await tp.click('[data-testid=continue]');
  await tp.waitForSelector('[data-testid=next]');
  await tp.click('[data-testid=next]');
  await sleep(300);
  await tp.screenshot({ path: `${SHOTS}09-tablet-learn.png` });

  await browser.close();
} catch (e) {
  console.error(e);
  failures++;
} finally {
  server.kill();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);

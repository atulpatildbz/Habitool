// One-off screenshot capture for the README. Seeds demo data into localStorage
// (local-only mode, no Convex) and captures the main views in light + dark.
// Run with the dev server already up: `VITE_CONVEX_URL= npm run dev`.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://127.0.0.1:3000/Habitool/';
const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

function iso(d) {
  return d.toISOString().slice(0, 10);
}

// Build a plausible log history ending today.
function buildLogs(days, { density, target, weekendDrop }) {
  const logs = {};
  const today = new Date();
  // Deterministic pseudo-random so runs are stable.
  let seed = 1234;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dow = d.getDay();
    let p = density;
    if (weekendDrop && (dow === 0 || dow === 6)) p *= 0.5;
    // Recent days get a strong streak so the flame shows.
    if (i < 9) p = 0.95;
    if (rand() < p) {
      logs[iso(d)] = target > 1 ? Math.max(1, Math.round(target * (0.6 + rand() * 0.6))) : 1;
    }
  }
  // Guarantee an unbroken recent streak ending today.
  for (let i = 0; i < 9; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    logs[iso(d)] = target > 1 ? target : 1;
  }
  return logs;
}

const habits = [
  { id: 'h1', name: 'Morning Run', color: '#10b981', icon: 'Footprints', target: 1, streakGoal: 30 },
  { id: 'h2', name: 'Read', color: '#3b82f6', icon: 'BookOpen', target: 1, streakGoal: 21 },
  { id: 'h3', name: 'Drink Water', color: '#06b6d4', icon: 'GlassWater', target: 8 },
  { id: 'h4', name: 'Meditate', color: '#8b5cf6', icon: 'Brain', target: 1 },
];

const createdAt = new Date();
createdAt.setDate(createdAt.getDate() - 320);
const seededHabits = habits.map((h) => ({ ...h, createdAt: createdAt.toISOString() }));

const logs = {
  h1: buildLogs(330, { density: 0.78, target: 1, weekendDrop: true }),
  h2: buildLogs(330, { density: 0.85, target: 1 }),
  h3: buildLogs(330, { density: 0.7, target: 8, weekendDrop: false }),
  h4: buildLogs(330, { density: 0.6, target: 1, weekendDrop: true }),
};

const browser = await chromium.launch();

async function newPage(dark) {
  const ctx = await browser.newContext({
    viewport: { width: 1100, height: 1400 },
    deviceScaleFactor: 2,
    colorScheme: dark ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  await page.route('https://unpkg.com/lucide-static@latest/tags.json', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
  await page.addInitScript(
    ([h, l]) => {
      localStorage.setItem('habits', JSON.stringify(h));
      localStorage.setItem('habitLogs', JSON.stringify(l));
    },
    [seededHabits, logs]
  );
  await page.goto(BASE);
  await page.getByRole('heading', { name: 'Habit Tracker' }).waitFor();
  await page.waitForTimeout(500);
  return { ctx, page };
}

// 1. Main list — light
{
  const { ctx, page } = await newPage(false);
  await page.screenshot({ path: `${OUT}/home-light.png` });
  await ctx.close();
}

// 2. Main list — dark
{
  const { ctx, page } = await newPage(true);
  await page.screenshot({ path: `${OUT}/home-dark.png` });
  await ctx.close();
}

// 3. Calendar + stats detail dialog (click a habit card) — dark
{
  const { ctx, page } = await newPage(true);
  await page.getByRole('heading', { name: 'Morning Run' }).click();
  await page.waitForTimeout(600);
  const dialog = page.getByRole('dialog');
  await dialog.screenshot({ path: `${OUT}/detail-stats.png` });
  await ctx.close();
}

// 4. Add-habit modal with icon picker — dark
{
  const { ctx, page } = await newPage(true);
  await page.getByRole('button', { name: 'Add habit' }).click();
  await page.waitForTimeout(500);
  const dialog = page.getByRole('dialog');
  await dialog.screenshot({ path: `${OUT}/add-habit.png` });
  await ctx.close();
}

// 5. Recent-days (Last X days) view — dark
{
  const { ctx, page } = await newPage(true);
  await page.getByRole('button', { name: 'Open view options' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Last X Days' }).click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/recent-days.png` });
  await ctx.close();
}

await browser.close();
console.log('done');

// Capture the actual UI with fictional fixtures. No Harness server or user data.
// npm install --no-save --package-lock=false playwright
// SCREENSHOT_BROWSER=/path/to/chrome node scripts/readme-screenshots.mjs
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const at = Date.now() - 600000;
const hosts = [
  { id: 'desktop', name: 'Studio desktop', platform: 'darwin', number: 1 },
  { id: 'laptop', name: 'Travel laptop', platform: 'win32', number: 2 },
].map(h => ({ ...h, member: true, active: true, lastSeen: at, url: `https://${h.id}.example.ts.net` }));
const machines = { self: 'desktop', leader: 'desktop', preferred: 'desktop', hosts,
  mode: 'two-host availability', viewers: [{ name: 'Phone', active: true }], placementIssues: [] };
const apps = [
  { id: '__harness', name: 'Distributed Orchestrator', builtin: true },
  { id: 'garden', name: 'Pocket Garden', start: 'npm start', running: true, reachable: true },
  { id: 'weekend', name: 'Weekend Planner' },
].map(a => ({ ...a, dir: `/Projects/${a.id}`, executionHosts: ['desktop'], urls: {} }));
const models = { assistant: { alias: 'assistant', label: 'Coding assistant', available: true, hasKey: true } };
const events = [
  { type: 'user', text: 'Add a weekly watering schedule to Pocket Garden. Keep it easy to use on my phone.' },
  { type: 'assistant', text: 'I added a weekly schedule with a card for each plant.\n\n- Today’s plants appear first.\n- “Watered” saves after refresh.\n\nChecks passed. The changes are saved in this tab and ready to Push.' },
  { type: 'user', text: 'Push changes', operation: 'push' },
  { type: 'assistant', text: 'Push done · 4 files · a1b2c3d. The watering schedule was published.', operation: 'push', outcome: 'success' },
].map((e, i) => ({ id: `example-${i}`, ts: at + i * 60000, model: 'assistant', ...e }));
const sessions = [
  { id: 'garden-design', appId: 'garden', name: 'Watering schedule', events },
  { id: 'garden-copy', appId: 'garden', name: 'Plant care tips', events: [] },
  { id: 'do-edit', appId: '__harness', name: 'My DO improvements', events: [
    { id: 'do-user', ts: at, type: 'user', text: 'Make the project list easier to scan. Add a short description below each project name.' },
    { id: 'do-reply', ts: at + 60000, type: 'assistant', model: 'assistant', text: 'I added a description below each project name, using the existing dark theme. The layout stays readable on a phone.\n\nThe tests passed. The changes are saved in this tab. Press Push to publish them to your fork, then restart DO to load them.' },
  ] },
  { id: 'weekend-plan', appId: 'weekend', name: 'A day outdoors', events: [] },
].map(s => ({ model: 'assistant', mode: 'agent', ownerNode: 'desktop', createdAt: at, updatedAt: at,
  lastMessageAt: at, turns: 2, projectDir: `/Projects/${s.appId}`, ...s }));
const snapshot = { machines, apps, models, default: 'assistant', sessions, running: [], home: '/Home/demo' };
const network = { connected: true, ready: true, message: 'Phone access is ready.',
  localUrl: 'http://127.0.0.1:8787', phoneUrl: 'https://desktop.example.ts.net' };
const errors = [];
const browser = await chromium.launch({ executablePath: process.env.SCREENSHOT_BROWSER });
try {
  const context = await browser.newContext({ viewport: { width: 1120, height: 820 }, deviceScaleFactor: 1, colorScheme: 'dark', serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://readme.test') return route.abort();
    if (!url.pathname.startsWith('/api/')) {
      const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      if (!['index.html', 'styles.css', 'app.js', 'voice.js', 'diagnostics.js', 'cluster-client.js', 'sw.js'].includes(name)) return route.fulfill({status:404, body:''});
      return route.fulfill({ body: await fs.readFile(path.join(root, 'server/public', name)),
        contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html' });
    }
    const p = url.pathname;
    let data = {};
    if (p === '/api/nodes') data = [];
    else if (p === '/api/state') data = snapshot;
    else if (p === '/api/apps') data = { apps };
    else if (p === '/api/network') data = network;
    else if (p === '/api/cluster/status' || p === '/api/cluster/viewer') data = machines;
    else if (p === '/api/cluster/devices') data = { devices: hosts };
    else if (p === '/api/cluster/discover') data = { local: {}, hosts: [] };
    else if (p === '/api/harness/versions') data = { hosts: [] };
    else if (p === '/api/models/catalog' || p.endsWith('/models')) data = { models, default: 'assistant' };
    else if (/^\/api\/sessions\/[^/]+$/.test(p)) data = sessions.find(s => s.id === p.split('/').at(-1));
    else if (p.endsWith('/events')) return route.fulfill({ contentType: 'text/event-stream', body: ': example\n\n' });
    else if (p === '/api/git') data = { repo: true, remote: 'https://github.com/example/PocketGarden.git', branch: 'main', isolated: true,
      pending: true, changed: 4, summary: 'Added the weekly watering schedule.', projectName: 'Pocket Garden', machine: 'Studio desktop', history: [] };
    await route.fulfill({ json: data });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
  await page.goto('https://readme.test/?session=garden-design');
  await page.getByText('The watering schedule was published.', { exact: false }).waitFor();
  const shot = async name => {
    await page.screenshot({ path: path.join(root, 'docs/images', `${name}.png`), animations: 'disabled' });
    console.log(`Captured ${name}`);
  };
  await shot('chat-desktop');
  await page.evaluate(() => appsSheet());
  await page.locator('[data-app-toggle=weekend]').waitFor();
  await page.waitForFunction(() => document.querySelector('#peer-sessions')?.textContent === '');
  await shot('projects');
  await page.evaluate(() => closeSheet());
  await page.evaluate(() => settingsSheet());
  await shot('settings');
  await page.evaluate(() => networkSheet());
  await page.locator('#network-status').getByText('Phone access is ready.', { exact: true }).waitFor();
  await shot('phone-setup');
  await page.evaluate(() => machinesSheet());
  await page.getByText('Travel laptop', { exact: true }).first().waitFor();
  await shot('machines');
  await page.evaluate(() => openSession('do-edit'));
  await shot('self-edit');
  await page.evaluate(() => openSession('garden-design'));
  await page.evaluate(() => closeSheet());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(200); // Let Chrome finish repainting after the viewport resize.
  await shot('chat-phone');
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Phone view overflows');
  if (errors.length) throw Error(errors.join('\n'));
} finally { await browser.close(); }

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const androidHtml = fs.readFileSync(path.join(rootDir, 'app/src/main/assets/www/index.html'), 'utf8');

if (html !== androidHtml) {
    throw new Error('index.html and app/src/main/assets/www/index.html are out of sync!');
}

const externalLinks = html.match(/https?:\/\/[^\s"'<>]+/g) || [];
if (externalLinks.length > 0) {
    throw new Error(`Unexpected external CDN URLs: ${externalLinks.join(', ')}`);
}
console.log('[OK] Zero external CDN dependencies & Android WebView assets synced');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('Missing inline <script>');
new vm.Script(scriptMatch[1], { filename: 'index.html' });
console.log('[OK] JavaScript syntax valid');

const dataSrc = fs.readFileSync(path.join(rootDir, 'src/js/data.js'), 'utf8');
const sandbox = {};
vm.runInNewContext(dataSrc + '\n;this.__out = { NIGHTS, BLESSINGS, ARENA_PLATFORMS, getNightConfig };', sandbox);
const { NIGHTS, BLESSINGS, ARENA_PLATFORMS, getNightConfig } = sandbox.__out;

if (NIGHTS.length !== 10) throw new Error(`Expected 10 Campaign Nights, got ${NIGHTS.length}`);
if (BLESSINGS.length !== 12) throw new Error(`Expected 12 Roguelike Blessings, got ${BLESSINGS.length}`);
if (ARENA_PLATFORMS.length !== 2) throw new Error(`Expected 2 tactical arena platforms`);

let bossCount = 0;
for (const n of NIGHTS) {
    if (!n.pool || n.pool.length === 0) throw new Error(`Night ${n.night} missing enemy pool`);
    if (n.boss) bossCount++;
}
if (bossCount !== 5) throw new Error(`Expected 5 Campaign Bosses, got ${bossCount}`);

for (let endlessN = 11; endlessN <= 15; endlessN++) {
    const cfg = getNightConfig(endlessN);
    if (!cfg || cfg.night !== endlessN || cfg.totalEnemies < 25) {
        throw new Error(`Invalid Endless Night config for night ${endlessN}`);
    }
}

console.log(`[OK] Castle Siege validated: ${NIGHTS.length} Campaign Nights, ${bossCount} Siege Bosses, ${BLESSINGS.length} Roguelike Blessings, Endless Mode OK`);

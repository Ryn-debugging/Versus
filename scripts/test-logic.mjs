import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

// 1. Validate single self-contained HTML structure (zero external CDN links!)
const externalLinks = html.match(/https?:\/\/[^\s"'<>]+/g) || [];
if (externalLinks.length > 0) {
    throw new Error(`Found unexpected external URLs in standalone index.html: ${externalLinks.join(', ')}`);
}
console.log('[OK] Zero external CDN dependencies (100% offline self-contained)');

// 2. Extract inline script and verify syntax + stage geometry integrity
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('Inline <script> block missing');
const scriptSrc = scriptMatch[1];

// Parse JS syntax via vm.Script
new vm.Script(scriptSrc, { filename: 'index.html' });
console.log('[OK] JavaScript syntax valid');

// 3. Evaluate stages.js independently to audit all 30 stages & 9 Boss Rush stages
const stagesSrc = fs.readFileSync(path.join(rootDir, 'src/js/stages.js'), 'utf8');
const sandbox = {};
vm.runInNewContext(stagesSrc + '\n;this.__out = { STAGES, BOSS_RUSH_STAGES, BIOMES };', sandbox);
const { STAGES, BOSS_RUSH_STAGES, BIOMES } = sandbox.__out;

if (STAGES.length !== 30) throw new Error(`Expected 30 stages, got ${STAGES.length}`);
if (BOSS_RUSH_STAGES.length !== 9) throw new Error(`Expected 9 Boss Rush stages, got ${BOSS_RUSH_STAGES.length}`);
if (Object.keys(BIOMES).length !== 15) throw new Error(`Expected 15 biomes, got ${Object.keys(BIOMES).length}`);

let totalEnemies = 0;
let totalBosses = 0;

for (const st of STAGES) {
    if (!st.platforms || st.platforms.length < 3) {
        throw new Error(`Stage ${st.id} has too few platforms`);
    }
    const grounds = st.platforms.filter(p => p.type === 'ground').sort((a, b) => a.x - b.x);
    if (grounds[0].x !== 0 || grounds[0].w < 400) {
        throw new Error(`Stage ${st.id} lacks safe starting ground`);
    }
    // Verify no impossible gaps between consecutive ground segments (> 260px)
    for (let i = 1; i < grounds.length; i++) {
        const gap = grounds[i].x - (grounds[i - 1].x + grounds[i - 1].w);
        if (gap > 260) {
            throw new Error(`Stage ${st.id} has oversized chasm gap (${gap}px) at ground index ${i}`);
        }
    }
    // Verify portal is inside worldWidth and over solid ground
    if (st.portalX < 400 || st.portalX + 60 > st.worldWidth) {
        throw new Error(`Stage ${st.id} portal out of bounds (${st.portalX} / ${st.worldWidth})`);
    }
    const portalSupported = grounds.some(g => st.portalX >= g.x && st.portalX + 40 <= g.x + g.w);
    if (!portalSupported) {
        throw new Error(`Stage ${st.id} portal is not standing over solid ground`);
    }
    // Verify enemies & bosses
    if (!st.enemies || st.enemies.length === 0) {
        throw new Error(`Stage ${st.id} has no enemies`);
    }
    totalEnemies += st.enemies.length;
    const bosses = st.enemies.filter(e => e.type === 'boss');
    if (st.isBossStage && bosses.length !== 1) {
        throw new Error(`Boss stage ${st.id} must have exactly 1 boss, got ${bosses.length}`);
    }
    for (const b of bosses) {
        totalBosses++;
        if (!b.bossOpts || !b.bossOpts.name || b.bossOpts.arenaMaxX - b.bossOpts.arenaMinX < 800) {
            throw new Error(`Stage ${st.id} boss arena invalid`);
        }
    }
    // Verify spikes do not overlap spawn zone (x < 250) or checkpoints
    for (const sp of st.spikes) {
        if (sp.x < 250) throw new Error(`Stage ${st.id} has spike inside spawn zone`);
        for (const cp of st.checkpoints) {
            if (Math.abs(cp.x - (sp.x + sp.w / 2)) < 60) {
                throw new Error(`Stage ${st.id} spike too close to checkpoint`);
            }
        }
    }
}

for (const idx of BOSS_RUSH_STAGES) {
    if (!STAGES[idx] || !STAGES[idx].isBossStage) {
        throw new Error(`BOSS_RUSH_STAGES index ${idx} does not point to a boss stage`);
    }
}

console.log(`[OK] All 30 stages validated: ${Object.keys(BIOMES).length} biomes, ${totalEnemies} enemies, ${totalBosses} bosses, ${BOSS_RUSH_STAGES.length} Boss Rush encounters`);

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = '/tmp/kvz-v2-screenshots';
fs.mkdirSync(outDir, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = http.createServer((req, res) => {
    const html = fs.readFileSync(path.join(rootDir, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const url = `http://127.0.0.1:${port}/`;

const debugPort = 9240 + Math.floor(Math.random() * 400);
const chrome = spawn('/usr/bin/chromium', [
    '--headless=new',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    `--remote-debugging-port=${debugPort}`,
    '--window-size=1280,720',
    'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

let wsUrl = null;
for (let i = 0; i < 40; i++) {
    try {
        const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
        const page = list.find(t => t.type === 'page');
        if (page?.webSocketDebuggerUrl) { wsUrl = page.webSocketDebuggerUrl; break; }
    } catch (e) {}
    await sleep(150);
}
if (!wsUrl) { chrome.kill('SIGKILL'); server.close(); throw new Error('CDP connect failed'); }

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
});

let msgId = 1;
const pending = new Map();
const errors = [];

ws.addEventListener('message', ev => {
    const d = JSON.parse(ev.data);
    if (d.id && pending.has(d.id)) {
        const { resolve, reject } = pending.get(d.id);
        pending.delete(d.id);
        if (d.error) reject(new Error(d.error.message));
        else resolve(d.result);
    } else if (d.method === 'Runtime.exceptionThrown') {
        errors.push(`EXCEPTION: ${d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text}`);
    } else if (d.method === 'Log.entryAdded' && d.params.entry?.level === 'error') {
        errors.push(`LOG_ERROR: ${d.params.entry.text}`);
    }
});

const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = msgId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
});

async function evalJs(expression) {
    const res = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    return res.result?.value;
}

async function shot(name) {
    const res = await cdp('Page.captureScreenshot', { format: 'png' });
    const p = path.join(outDir, name);
    fs.writeFileSync(p, Buffer.from(res.data, 'base64'));
    console.log(`[SCREENSHOT] ${p}`);
}

try {
    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Log.enable');
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

    await cdp('Page.navigate', { url });
    await sleep(850);

    // 1. Live Castle Siege Title Screen
    const st0 = await evalJs('window.__KVZ_APP__.getState()');
    if (st0.state !== 'start' || st0.nightCount !== 10 || st0.blessingCount !== 12) {
        throw new Error(`Invalid init state: ${JSON.stringify(st0)}`);
    }
    await shot('01_start_desktop.png');

    // 2. Start Campaign Night 1 — Combat, Boomerang Hammer, Grave Emergence, Archers!
    await evalJs(`
        document.getElementById('btn-start-campaign').click();
        hideWaveBanner();
        game.blessings.flame_blade = 1;
        game.allies.archers = 2;
        game.allies.footmen = 1;
        allies.push(new AlliedFootman(0));
        zombies.push(new Zombie('walker', 600, 1));
        zombies.push(new Zombie('ghoul', 740, 1));
        zombies.push(new Zombie('keg_carrier', 880, 1));
        zombies[0].emergeTimer = 0;
        zombies[1].emergeTimer = 0;
        zombies[2].emergeTimer = 18;
        knight.x = 460;
        keys.hammerPressed = true;
        keys.attackPressed = true;
    `);
    await sleep(220);
    await shot('02_courtyard_battle.png');

    // 3. War Council (Roguelike 3-Card Blessing Draft + Castle Fortify!)
    await evalJs(`
        game.gold = 220;
        window.__KVZ_APP__.openCouncilForTest();
        document.querySelector('[data-blessing]').click();
        document.getElementById('f-buy-ally').click();
    `);
    await sleep(220);
    await shot('03_war_council.png');

    // 4. Malam 10 Final Boss (Raja Lich Agung Azrath) + Hold-to-Guard Perfect Parry Reflect!
    await evalJs(`
        window.__KVZ_APP__.setupBossShowcase(10);
        keys.guardHeld = true;
        knight.update();
        enemyProjectiles.push({
            kind: 'bolt',
            x: knight.x + knight.w + 8,
            y: knight.y + 34,
            vx: -7, vy: 0, r: 9, dmg: 22, color: '#a3e635', life: 60
        });
    `);
    await sleep(260);
    const parrySt = await evalJs('window.__KVZ_APP__.getState()');
    if (parrySt.totalParries < 1) {
        throw new Error(`Perfect Parry did not trigger: ${JSON.stringify(parrySt)}`);
    }
    console.log('[OK] Hold-to-Guard Perfect Parry Reflect verified! Parries:', parrySt.totalParries);
    await shot('04_parry_boss.png');

    // 5. Golden Spectral Cavalry Charge Ultimate!
    await evalJs(`
        keys.guardHeld = false;
        window.__KVZ_APP__.triggerCavalryForTest();
    `);
    await sleep(580);
    await shot('05_cavalry_charge.png');

    // 6. Animated Dawn Victory CG over Saved Citadel!
    await evalJs(`
        window.__KVZ_APP__.startEndingCGForTest();
        endingCG.frame = 320;
        updateEndingCG();
    `);
    await sleep(240);
    await shot('06_ending_cg.png');

    // 7. Mobile Landscape (800x360) Battle with Hold-to-Guard Touch Controls!
    await cdp('Emulation.setDeviceMetricsOverride', { width: 800, height: 360, deviceScaleFactor: 2, mobile: true });
    await evalJs(`
        document.body.classList.add('is-touch');
        window.__KVZ_APP__.setupBossShowcase(3);
    `);
    await sleep(320);
    await shot('07_mobile_battle.png');

    // 8. Mobile Landscape (800x360) War Council 3-Card Roguelike Draft!
    await evalJs('window.__KVZ_APP__.openCouncilForTest()');
    await sleep(220);
    await shot('08_mobile_council.png');

    if (errors.length > 0) throw new Error(`Browser errors:\n${errors.join('\n')}`);
    console.log('[PASS] ALL v2.0 CASTLE SIEGE E2E & VISUAL TESTS PASSED WITH ZERO ERRORS!');
} finally {
    ws.close();
    chrome.kill('SIGKILL');
    server.close();
}

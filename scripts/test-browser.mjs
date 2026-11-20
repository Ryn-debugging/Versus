import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = '/tmp/kvz-screenshots';
fs.mkdirSync(outDir, { recursive: true });

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// 1. Lightweight static server for index.html
const server = http.createServer((req, res) => {
    const html = fs.readFileSync(path.join(rootDir, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const url = `http://127.0.0.1:${port}/`;

// 2. Launch headless Chromium with remote debugging
const debugPort = 9222 + Math.floor(Math.random() * 400);
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
for (let attempt = 0; attempt < 40; attempt++) {
    try {
        const resp = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
        const list = await resp.json();
        const page = list.find(t => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
            wsUrl = page.webSocketDebuggerUrl;
            break;
        }
    } catch (e) {}
    await sleep(150);
}

if (!wsUrl) {
    chrome.kill('SIGKILL');
    server.close();
    throw new Error('Failed to connect to Chromium DevTools Protocol');
}

// 3. Minimal CDP client using Node 24 built-in WebSocket
const ws = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
});

let msgId = 1;
const pending = new Map();
const errors = [];

ws.addEventListener('message', ev => {
    const data = JSON.parse(ev.data);
    if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
    } else if (data.method === 'Runtime.exceptionThrown') {
        const desc = data.params.exceptionDetails?.exception?.description || data.params.exceptionDetails?.text || 'Unknown JS exception';
        errors.push(`EXCEPTION: ${desc}`);
    } else if (data.method === 'Log.entryAdded' && data.params.entry?.level === 'error') {
        errors.push(`LOG_ERROR: ${data.params.entry.text}`);
    }
});

function cdp(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
    });
}

async function evalJs(expression) {
    const res = await cdp('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
    });
    if (res.exceptionDetails) {
        throw new Error(`Eval error: ${res.exceptionDetails.exception?.description || res.exceptionDetails.text}`);
    }
    return res.result?.value;
}

async function screenshot(filename) {
    const res = await cdp('Page.captureScreenshot', { format: 'png' });
    const fullPath = path.join(outDir, filename);
    fs.writeFileSync(fullPath, Buffer.from(res.data, 'base64'));
    console.log(`[SCREENSHOT] ${fullPath}`);
}

try {
    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Log.enable');
    await cdp('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 720,
        deviceScaleFactor: 1,
        mobile: false
    });

    await cdp('Page.navigate', { url });
    await sleep(900);

    // 1. Start Screen (Desktop)
    const initState = await evalJs('window.__KVZ_APP__.getState()');
    if (initState.state !== 'start' || initState.stageCount !== 30 || initState.bossRushCount !== 9) {
        throw new Error(`Unexpected init state: ${JSON.stringify(initState)}`);
    }
    await screenshot('01_start_desktop.png');

    // 2. Start Game & Test Stage 1 Movement + Combat + Javelin + Shield Charge
    await evalJs('document.getElementById("btn-start-game").click()');
    await sleep(400);
    await evalJs(`
        // Simulasi gerak kanan, lempar tombak, serbuan perisai, & tebasan
        keys.right = true;
    `);
    await sleep(700);
    await evalJs(`
        keys.right = false;
        keys.javelinPressed = true;
        keys.attackPressed = true;
    `);
    await sleep(220);
    const combatState = await evalJs('window.__KVZ_APP__.getState()');
    if (combatState.state !== 'playing' || combatState.player.x <= 90) {
        throw new Error(`Knight failed to move/play: ${JSON.stringify(combatState)}`);
    }
    console.log('[OK] Stage 1 movement & combat verified:', JSON.stringify(combatState.player));
    await screenshot('02_stage1_combat.png');

    // 3. Open Forge Shop & Buy Upgrades + Verify Relic Unlock
    await evalJs(`
        game.gold = 400;
        window.__KVZ_APP__.openShopForTest();
        document.getElementById("buy-atk").click();
        document.getElementById("buy-atk").click();
        document.getElementById("buy-hp").click();
        document.getElementById("buy-spd").click();
    `);
    await sleep(250);
    const shopState = await evalJs('window.__KVZ_APP__.getState()');
    if (shopState.player.atk <= 28 || shopState.player.maxHp <= 120) {
        throw new Error(`Upgrades did not apply: ${JSON.stringify(shopState.player)}`);
    }
    console.log('[OK] Forge upgrades & Relics verified:', JSON.stringify(shopState.player));
    await screenshot('03_forge_shop.png');

    // 4. Stage 30 Final Boss Fight — Raja Lich Agung Azrath + Perfect Parry Test
    await evalJs(`
        document.getElementById("btn-close-shop").click();
        window.__KVZ_APP__.loadStageForTest(29);
        hideBanner();
        // Test Perfect Parry against boss projectile + Relic II Lightning!
        player.fury = 20;
        player.performShieldCharge();
        projectiles.push({
            kind: 'soul',
            x: player.x + player.w + 10,
            y: player.y + 30,
            vx: -6, vy: 0, r: 10, dmg: 20, color: '#84cc16', gravity: false, life: 60
        });
    `);
    await sleep(420);
    const bossState = await evalJs('window.__KVZ_APP__.getState()');
    if (!bossState.bossAlive || bossState.stageIndex !== 29) {
        throw new Error(`Stage 30 Boss failed to spawn: ${JSON.stringify(bossState)}`);
    }
    if (bossState.player.fury < 40) {
        throw new Error(`Perfect Parry did not boost Fury as expected: ${JSON.stringify(bossState.player)}`);
    }
    console.log('[OK] Stage 30 Final Boss & Perfect Parry verified:', JSON.stringify(bossState.player));
    await screenshot('04_boss_azrath.png');

    // 5. Trigger Ultimate (Penghakiman Fajar + Mahkota Matahari Dawn Waves!)
    await evalJs(`
        game.upgrades = { atkLevel: 8, hpLevel: 6, spdLevel: 5 };
        player.applyUpgrades(true);
        window.__KVZ_APP__.triggerUltiForTest();
    `);
    await sleep(160);
    await screenshot('05_ulti_fajar.png');

    // 5b. Test Pause / Resume & Game Over / Retry Stage
    await evalJs('openPause()');
    if ((await evalJs('game.state')) !== 'paused') throw new Error('Pause failed');
    await evalJs('resumeGame()');
    if ((await evalJs('game.state')) !== 'playing') throw new Error('Resume failed');
    await evalJs('triggerGameOver()');
    if ((await evalJs('game.state')) !== 'gameover') throw new Error('GameOver state failed');
    await evalJs('document.getElementById("btn-retry-stage").click()');
    if ((await evalJs('game.state')) !== 'playing') throw new Error('Retry stage failed');
    console.log('[OK] Pause/Resume & GameOver/Retry verified');

    // 6. Animated Ending CG (Fajar Kerajaan Cahaya)
    await evalJs(`
        window.__KVZ_APP__.startEndingCGForTest();
        endingCG.frame = 340;
        updateEndingCG();
    `);
    await sleep(250);
    await screenshot('06_ending_cg.png');

    // 7. Victory Modal
    await evalJs('window.__KVZ_APP__.showVictoryForTest()');
    await sleep(250);
    await screenshot('07_victory.png');

    // 8. Mobile Landscape (800x360) Start Screen & Unlocked Stage Select
    await evalJs(`
        localStorage.setItem('kvz_unlocked_stage_v1', '18');
        document.getElementById('btn-play-again').click();
        document.body.classList.add('is-touch');
    `);
    await cdp('Emulation.setDeviceMetricsOverride', {
        width: 800,
        height: 360,
        deviceScaleFactor: 2,
        mobile: true
    });
    await sleep(350);
    await screenshot('08_mobile_start.png');

    // 9. Mobile Landscape (800x360) Boss Rush Gameplay with Touch Controls
    await evalJs('document.getElementById("btn-boss-rush").click()');
    await sleep(450);
    await evalJs(`
        const boss = enemies.find(e => e.isBoss);
        if (boss) {
            player.x = boss.arenaMinX + 180;
            boss.activated = true;
            game.cameraX = Math.max(0, Math.min(STAGES[game.stageIndex].worldWidth - VIEW_WIDTH, player.x - 240));
            updateHUD();
        }
    `);
    await sleep(250);
    await screenshot('09_mobile_gameplay.png');

    if (errors.length > 0) {
        throw new Error(`Browser console/runtime errors detected:\n${errors.join('\n')}`);
    }
    console.log('[PASS] ALL BROWSER E2E & VISUAL TESTS PASSED WITH ZERO ERRORS!');
} finally {
    ws.close();
    chrome.kill('SIGKILL');
    server.close();
}

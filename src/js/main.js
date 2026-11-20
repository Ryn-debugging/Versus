/* ==========================================================================
   ENGINE UTAMA v2.0: KESATRIA BENTENG — PERANG ZOMBIE (CASTLE SIEGE RPG)
   ========================================================================== */

if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
        const r = Math.min(typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 0), w / 2, h / 2);
        this.beginPath();
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        this.closePath();
        return this;
    };
}

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const sfx = new SoundSystem();

const STORAGE = {
    RECORD: 'kvz_bastion_record_v2',
    SAVE: 'kvz_bastion_save_v2'
};

const game = {
    state: 'start', // 'start', 'playing', 'council', 'paused', 'ending_cg', 'gameover', 'victory'
    endlessMode: false,
    night: 1,
    gold: 0,
    totalKills: 0,
    totalParries: 0,
    gateMaxHp: 500,
    gateHp: 500,
    gateHitFlash: 0,
    worldTick: 0,
    cameraX: 0,
    screenShake: 0,
    hitStop: 0,
    hurtVignette: 0,
    lightningFlash: 0,
    comboCount: 0,
    comboTimer: 0,
    trebuchetTimer: 220,
    trebuchetAnim: 0,
    archerTimer: 75,

    // Wave tracking
    waveTotal: 14,
    waveSpawned: 0,
    waveKilled: 0,
    waveSpawnTimer: 40,
    bossSpawned: false,

    // Progression
    forge: { atkLv: 1, hpLv: 1, gateLv: 1, allyLv: 1 },
    allies: { archers: 1, footmen: 0 },
    blessings: Object.create(null), // { id: stackCount }
    extraBarrels: 0,
    nightSnapshot: null
};

const endingCG = {
    frame: 0,
    totalFrames: 480,
    finished: false,
    subtitleStep: -1,
    birds: []
};

const keys = {
    left: false,
    right: false,
    down: false,
    guardHeld: false,
    jumpPressed: false,
    attackPressed: false,
    hammerPressed: false,
    ultiPressed: false
};

const inputResetHooks = [];

let knight = null;
let zombies = [];
let allies = [];
let barrels = [];
let coins = [];
let heroProjectiles = [];
let enemyProjectiles = [];
let cavalryRiders = [];
let graveHands = [];
let particles = [];
let shockRings = [];
let lightningBolts = [];
let floatingTexts = [];
let bannerTimer = null;

// Draft state for War Council
let currentDraftCards = [];
let blessingPickedThisCouncil = false;

/* ==========================================================================
   UTILITAS BERKAH, FISIKA, & EFEK VISUAL
   ========================================================================== */
function getBlessingLevel(id) {
    return game.blessings[id] || 0;
}

function getTotalBlessings() {
    let sum = 0;
    for (const k in game.blessings) sum += game.blessings[k];
    return sum;
}

function rectOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnParticles(x, y, color, count = 10) {
    for (let i = 0; i < count && particles.length < 180; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 9,
            vy: (Math.random() - 0.85) * 8,
            size: 2.5 + Math.random() * 4.5,
            color,
            life: 16 + Math.floor(Math.random() * 14),
            maxLife: 30
        });
    }
}

function spawnShockRing(x, y, maxR, color, lineW = 4) {
    if (shockRings.length < 22) {
        shockRings.push({ x, y, maxR, color, lineW, life: 16, maxLife: 16 });
    }
}

function addFloatingText(text, x, y, color = '#ffffff', big = false) {
    if (floatingTexts.length < 30) {
        floatingTexts.push({ text, x, y, color, big, life: 44, maxLife: 44 });
    }
}

function strikeSkyLightning(tx, ty, dmg) {
    const pts = [{ x: tx + (Math.random() - 0.5) * 30, y: 0 }];
    for (let s = 1; s < 6; s++) {
        pts.push({
            x: tx + (Math.random() - 0.5) * 38,
            y: (ty / 6) * s
        });
    }
    pts.push({ x: tx, y: ty });
    lightningBolts.push({ pts, color: '#fde047', life: 13, maxLife: 13 });
    spawnShockRing(tx, ty, 52, '#fde047', 4);
    sfx.play('lightning');
    for (const z of zombies) {
        if (!z.dead && Math.hypot((z.x + z.w / 2) - tx, (z.y + z.h / 2) - ty) < 76) {
            z.takeDamage(dmg, 0, { isCrit: true, breakShield: true });
        }
    }
}

function registerComboHit() {
    game.comboCount++;
    game.comboTimer = 155;
}

function damageGate(amount, hitX) {
    if (game.state !== 'playing') return;
    game.gateHp = Math.max(0, game.gateHp - amount);
    game.gateHitFlash = 14;
    game.screenShake = Math.max(game.screenShake, 7);
    game.hurtVignette = Math.max(game.hurtVignette, 14);
    sfx.play('gate_hit');
    spawnParticles(GATE_X, GROUND_Y - 56, '#b45309', 12);
    addFloatingText(`GERBANG -${amount}!`, GATE_X + 20, GROUND_Y - 120, '#fca5a5', true);

    if (game.gateHp <= 0) {
        triggerGameOver('Gerbang Benteng jebol oleh kepungan mayat hidup!');
    }
}

function explodeBarrel(b) {
    if (b.exploded) return;
    b.exploded = true;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const oilLv = getBlessingLevel('oil_barrels');
    const radius = 190 + oilLv * 55;
    const dmg = Math.round((knight ? knight.atk : 34) * (3.2 + oilLv * 1.1));

    sfx.play('explosion');
    game.screenShake = Math.max(game.screenShake, 14);
    spawnShockRing(cx, cy, radius, '#f97316', 7);
    spawnShockRing(cx, cy, radius * 0.6, '#fde047', 4);
    spawnParticles(cx, cy, '#f97316', 32);
    spawnParticles(cx, cy, '#fde047', 16);
    addFloatingText('LEDAKAN API!', cx, cy - 28, '#fde047', true);

    for (const z of zombies) {
        if (z.dead) continue;
        const dist = Math.hypot((z.x + z.w / 2) - cx, (z.y + z.h / 2) - cy);
        if (dist < radius) {
            z.takeDamage(dmg, Math.sign((z.x + z.w / 2) - cx || 1) * 12, { isCrit: true, isHeavy: true, breakShield: true });
            z.burnTimer = Math.max(z.burnTimer, 180);
            registerComboHit();
        }
    }
    // Reaksi berantai tong di sebelahnya!
    for (const other of barrels) {
        if (!other.exploded && Math.hypot((other.x + other.w / 2) - cx, (other.y + other.h / 2) - cy) < radius) {
            explodeBarrel(other);
        }
    }
}

/* ==========================================================================
   SAVE & LOAD (LOCALSTORAGE AMAN)
   ========================================================================== */
function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function safeDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

function loadRecord() {
    try { const r = safeGet(STORAGE.RECORD); return r ? JSON.parse(r) : null; } catch (e) { return null; }
}

function saveRecord(cleared = false) {
    const prev = loadRecord() || {};
    const rec = {
        bestNight: Math.max(prev.bestNight || 0, game.night),
        bestEndless: game.endlessMode ? Math.max(prev.bestEndless || 0, game.night) : (prev.bestEndless || 0),
        bestKills: Math.max(prev.bestKills || 0, game.totalKills),
        cleared: !!(prev.cleared || cleared)
    };
    safeSet(STORAGE.RECORD, JSON.stringify(rec));
    return rec;
}

function saveRunProgress() {
    const payload = {
        endlessMode: game.endlessMode,
        night: game.night,
        gold: game.gold,
        totalKills: game.totalKills,
        totalParries: game.totalParries,
        gateMaxHp: game.gateMaxHp,
        gateHp: game.gateHp,
        forge: Object.assign({}, game.forge),
        allies: Object.assign({}, game.allies),
        blessings: Object.assign({}, game.blessings)
    };
    safeSet(STORAGE.SAVE, JSON.stringify(payload));
}

function loadRunProgress() {
    try { const s = safeGet(STORAGE.SAVE); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

/* ==========================================================================
   ZERO-LAG HUD & BANNER MANAGEMENT
   ========================================================================== */
const uiCache = Object.create(null);
function setT(el, k, v) { if (el && uiCache[k] !== v) { uiCache[k] = v; el.textContent = v; } }
function setS(el, prop, k, v) { if (el && uiCache[k] !== v) { uiCache[k] = v; el.style[prop] = v; } }
function setA(el, attr, k, v) { if (el && uiCache[k] !== v) { uiCache[k] = v; el.setAttribute(attr, v); } }

const dom = {
    hpVal: document.getElementById('hud-hp-val'),
    hpFill: document.getElementById('hp-fill'),
    gateVal: document.getElementById('hud-gate-val'),
    gateFill: document.getElementById('gate-fill'),
    valorVal: document.getElementById('hud-valor-val'),
    valorFill: document.getElementById('valor-fill'),
    tierTag: document.getElementById('hud-tier-tag'),
    nightTitle: document.getElementById('hud-night-title'),
    remaining: document.getElementById('hud-remaining'),
    alliesTag: document.getElementById('hud-allies-tag'),
    comboBadge: document.getElementById('hud-combo-badge'),
    hordeFill: document.getElementById('horde-progress-fill'),
    goldVal: document.getElementById('hud-gold-val'),
    blessingsStrip: document.getElementById('hud-blessings-strip'),
    bossHud: document.getElementById('boss-hud'),
    bossName: document.getElementById('boss-name-text'),
    bossPhase: document.getElementById('boss-phase-badge'),
    bossHpLabel: document.getElementById('boss-hp-label'),
    bossHpFill: document.getElementById('boss-hp-fill'),
    waveBanner: document.getElementById('wave-banner'),
    bannerEye: document.getElementById('banner-eyebrow'),
    bannerTitle: document.getElementById('banner-title'),
    bannerDesc: document.getElementById('banner-desc'),
    tHammer: document.getElementById('t-hammer'),
    tHammerFill: document.getElementById('t-hammer-fill'),
    tHammerCd: document.getElementById('t-hammer-cd'),
    tUlti: document.getElementById('t-ulti'),
    tUltiFill: document.getElementById('t-ulti-fill'),
    startModal: document.getElementById('start-modal'),
    councilModal: document.getElementById('council-modal'),
    pauseModal: document.getElementById('pause-modal'),
    endModal: document.getElementById('end-modal'),
    cgOverlay: document.getElementById('ending-cg-overlay'),
    cgSub: document.getElementById('cg-subtitle')
};

function hideWaveBanner() {
    if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; }
    dom.waveBanner.classList.remove('visible');
}

function showWaveBanner(eyebrow, title, desc) {
    hideWaveBanner();
    dom.bannerEye.textContent = eyebrow;
    dom.bannerTitle.textContent = title;
    dom.bannerDesc.textContent = desc;
    dom.waveBanner.classList.add('visible');
    bannerTimer = setTimeout(() => {
        dom.waveBanner.classList.remove('visible');
        bannerTimer = null;
    }, 3200);
}

function renderActiveBlessingsStrip() {
    const keysList = Object.keys(game.blessings).filter(k => game.blessings[k] > 0);
    dom.blessingsStrip.innerHTML = keysList.map(id => {
        const b = BLESSINGS.find(x => x.id === id);
        if (!b) return '';
        const lv = game.blessings[id];
        return `<span class="blessing-chip">★ ${b.name}${lv > 1 ? ' ×' + lv : ''}</span>`;
    }).join('');
}

function resetInputs() {
    keys.left = false;
    keys.right = false;
    keys.down = false;
    keys.guardHeld = false;
    keys.jumpPressed = false;
    keys.attackPressed = false;
    keys.hammerPressed = false;
    keys.ultiPressed = false;
    for (const h of inputResetHooks) h();
    document.querySelectorAll('.touch-btn[data-active="1"]').forEach(el => { el.dataset.active = '0'; });
}

/* ==========================================================================
   MULAI MALAM PENGEPUNGAN (START NIGHT)
   ========================================================================== */
function startNight(nightNum, restoreSnapshot = false) {
    game.night = Math.max(1, nightNum);
    const cfg = getNightConfig(game.night);

    if (restoreSnapshot && game.nightSnapshot) {
        game.gold = game.nightSnapshot.gold;
        game.gateHp = Math.max(Math.round(game.gateMaxHp * 0.5), game.nightSnapshot.gateHp);
        game.totalKills = game.nightSnapshot.totalKills;
    } else {
        game.nightSnapshot = {
            gold: game.gold,
            gateHp: game.gateHp,
            totalKills: game.totalKills
        };
    }

    const prevValor = knight ? knight.valor : 0;
    knight = new Knight(380, GROUND_Y - 80);
    knight.valor = Math.min(100, prevValor);

    // Spawn Sekutu Pengawal Benteng di depan gerbang
    allies = [];
    for (let i = 0; i < game.allies.footmen; i++) {
        allies.push(new AlliedFootman(i));
    }

    // Pasang Tong Minyak Peledak di sepanjang jalan halaman
    barrels = [];
    const totalBarrels = (cfg.barrels || 2) + getBlessingLevel('oil_barrels') * 2 + game.extraBarrels;
    game.extraBarrels = 0;
    const barrelCount = Math.min(7, totalBarrels);
    for (let i = 0; i < barrelCount; i++) {
        const bx = 540 + i * Math.floor(1120 / Math.max(1, barrelCount));
        barrels.push({ x: bx, y: GROUND_Y - 46, w: 34, h: 46, exploded: false });
    }

    zombies = [];
    coins = [];
    heroProjectiles = [];
    enemyProjectiles = [];
    cavalryRiders = [];
    graveHands = [];
    particles = [];
    shockRings = [];
    lightningBolts = [];
    floatingTexts = [];

    game.waveTotal = cfg.totalEnemies + (cfg.boss ? 1 : 0);
    game.waveSpawned = 0;
    game.waveKilled = 0;
    game.waveSpawnTimer = 42;
    game.bossSpawned = false;
    game.comboCount = 0;
    game.comboTimer = 0;
    game.screenShake = 0;
    game.hitStop = 0;
    game.hurtVignette = 0;
    game.cameraX = 0;
    game.state = 'playing';
    document.body.classList.remove('in-ending-cg');

    dom.startModal.classList.add('hidden');
    dom.councilModal.classList.add('hidden');
    dom.pauseModal.classList.add('hidden');
    dom.endModal.classList.add('hidden');
    dom.cgOverlay.classList.add('hidden');

    renderActiveBlessingsStrip();
    showWaveBanner(cfg.eyebrow, cfg.name, cfg.desc);
    saveRunProgress();
    updateHUD();
    sfx.startBGM(cfg.bgm);
}

/* ==========================================================================
   DEWAN PERANG (ROGUELIKE 3-CARD BLESSING DRAFT + PERKUAT BENTENG)
   ========================================================================== */
function getFortifyCost(type) {
    if (type === 'atk') return 40 + (game.forge.atkLv - 1) * 28;
    if (type === 'gate') return 35 + (game.forge.gateLv - 1) * 22;
    if (type === 'ally') return 50 + (game.forge.allyLv - 1) * 35;
    if (type === 'heal') return 25 + game.night * 3;
    return 35;
}

function openWarCouncil() {
    resetInputs();
    game.state = 'council';
    blessingPickedThisCouncil = false;

    // Bonus Emas Pertahanan Malam
    const nightBonus = 45 + game.night * 12;
    game.gold += nightBonus;

    // Acak 3 Kartu Berkah Roguelike berbeda!
    const shuffled = BLESSINGS.slice().sort(() => Math.random() - 0.5);
    currentDraftCards = shuffled.slice(0, 3);

    document.getElementById('council-eyebrow').textContent = `MALAM ${game.night} BERTAHAN! (+${nightBonus} EMAS BONUS) • DEWAN PERANG`;
    document.getElementById('council-feedback').textContent = '';
    document.getElementById('btn-next-night-label').textContent = `HADAPI MALAM ${game.night + 1}: ${getNightConfig(game.night + 1).name.toUpperCase()}`;

    renderWarCouncilUI();
    dom.councilModal.classList.remove('hidden');
    sfx.play('victory');
}

function pickBlessing(id) {
    if (blessingPickedThisCouncil) return;
    blessingPickedThisCouncil = true;
    game.blessings[id] = (game.blessings[id] || 0) + 1;

    // Efek instan beberapa kartu berkah
    if (id === 'royal_archers') game.allies.archers = Math.min(6, game.allies.archers + 2);
    if (id === 'vanguard_squad') game.allies.footmen = Math.min(5, game.allies.footmen + 2);
    if (knight) knight.recalcStats(false);

    const b = BLESSINGS.find(x => x.id === id);
    document.getElementById('council-feedback').textContent = `★ Berkah "${b.name}" diaktifkan!`;
    sfx.play('upgrade');
    renderWarCouncilUI();
    renderActiveBlessingsStrip();
    saveRunProgress();
}

function buyFortify(type) {
    const cost = getFortifyCost(type);
    const fb = document.getElementById('council-feedback');
    if (game.gold < cost) {
        fb.textContent = 'Kas Emas Benteng belum mencukupi!';
        return;
    }

    game.gold -= cost;
    if (type === 'atk') {
        game.forge.atkLv++;
        game.forge.hpLv++;
        if (knight) knight.recalcStats(true);
        fb.textContent = `Pedang & Zirah ditempa ke Lv.${game.forge.atkLv}! (DMG ${knight.atk}, Max HP ${knight.maxHp})`;
    } else if (type === 'gate') {
        game.forge.gateLv++;
        game.gateMaxHp += 120;
        const rep = Math.round(game.gateMaxHp * 0.45);
        game.gateHp = Math.min(game.gateMaxHp, game.gateHp + rep);
        fb.textContent = `Gerbang Benteng diperkuat & diperbaiki menjadi ${Math.ceil(game.gateHp)} / ${game.gateMaxHp} HP!`;
    } else if (type === 'ally') {
        game.forge.allyLv++;
        if (game.allies.archers <= game.allies.footmen + 1 && game.allies.archers < 6) {
            game.allies.archers++;
            fb.textContent = `Rekrut +1 Pemanah Menara! (Total ${game.allies.archers} Pemanah)`;
        } else if (game.allies.footmen < 5) {
            game.allies.footmen++;
            fb.textContent = `Rekrut +1 Prajurit Pengawal! (Total ${game.allies.footmen} Pengawal)`;
        } else {
            game.forge.atkLv++;
            if (knight) knight.recalcStats(false);
            fb.textContent = `Pasukan penuh! Emas dialihkan untuk melatih senjata pasukan (+DMG)!`;
        }
    } else if (type === 'heal') {
        if (knight) knight.hp = Math.min(knight.maxHp, knight.hp + Math.round(knight.maxHp * 0.7));
        game.extraBarrels++;
        fb.textContent = 'Sir Aldric pulih +70% HP & +1 Tong Minyak Peledak dipasang untuk malam berikutnya!';
    }

    sfx.play('upgrade');
    renderWarCouncilUI();
    saveRunProgress();
}

function renderWarCouncilUI() {
    document.getElementById('council-gold-val').textContent = game.gold;
    document.getElementById('council-gate-info').textContent = `Gerbang: ${Math.ceil(game.gateHp)} / ${game.gateMaxHp}`;
    document.getElementById('blessing-pick-status').textContent = blessingPickedThisCouncil ? 'Sudah Dipilih ✓' : 'Pilih 1 Gratis';

    const grid = document.getElementById('blessing-cards-grid');
    grid.innerHTML = currentDraftCards.map(c => {
        const curLv = getBlessingLevel(c.id);
        const picked = blessingPickedThisCouncil && curLv > 0 && document.getElementById('council-feedback').textContent.includes(c.name);
        const cls = blessingPickedThisCouncil ? (picked ? 'blessing-card picked' : 'blessing-card dimmed') : 'blessing-card';
        return `<button class="${cls}" type="button" data-blessing="${c.id}" ${blessingPickedThisCouncil ? 'disabled' : ''}>
            <div class="blessing-card-top">
                <span class="blessing-tag">${c.tag}</span>
                <span style="font-size:10px;font-weight:800;color:#a8a29e;">${curLv > 0 ? 'Lv.' + curLv + ' → ' + (curLv + 1) : 'BARU'}</span>
            </div>
            <h3 class="blessing-name">${c.name}</h3>
            <p class="blessing-desc">${c.desc}</p>
        </button>`;
    }).join('');

    grid.querySelectorAll('[data-blessing]').forEach(btn => {
        btn.onclick = () => pickBlessing(btn.dataset.blessing);
    });

    document.getElementById('f-stat-atk').textContent = `Lv.${game.forge.atkLv} • DMG ${knight ? knight.atk : 34}`;
    document.getElementById('f-stat-gate').textContent = `${Math.ceil(game.gateHp)} / ${game.gateMaxHp} HP`;
    document.getElementById('f-stat-ally').textContent = `${game.allies.archers} Pemanah • ${game.allies.footmen} Pengawal`;
    document.getElementById('f-stat-heal').textContent = `HP: ${knight ? Math.ceil(knight.hp) : 150} / ${knight ? knight.maxHp : 150}`;

    ['atk', 'gate', 'ally', 'heal'].forEach(t => {
        const cost = getFortifyCost(t);
        const btn = document.getElementById(`f-buy-${t}`);
        btn.textContent = `${cost} Emas`;
        btn.disabled = game.gold < cost;
    });
}

/* ==========================================================================
   UPDATE LOOP & LOGIKA PERTEMPURAN
   ========================================================================== */
function updateHUD() {
    if (!knight) return;
    const cfg = getNightConfig(game.night);
    setT(dom.hpVal, 'hpV', `${Math.ceil(knight.hp)} / ${knight.maxHp}`);
    setS(dom.hpFill, 'width', 'hpW', `${Math.max(0, (knight.hp / knight.maxHp) * 100).toFixed(1)}%`);

    setT(dom.gateVal, 'gtV', `${Math.ceil(game.gateHp)} / ${game.gateMaxHp}`);
    setS(dom.gateFill, 'width', 'gtW', `${Math.max(0, (game.gateHp / game.gateMaxHp) * 100).toFixed(1)}%`);

    const vPct = Math.round(knight.valor);
    setT(dom.valorVal, 'vlV', vPct >= 100 ? 'SIAP [Q]' : `${vPct}%`);
    setS(dom.valorFill, 'width', 'vlW', `${vPct}%`);
    setA(dom.valorFill, 'data-ready', 'vlR', vPct >= 100 ? '1' : '0');
    setT(dom.tierTag, 'trT', `Lv.${game.forge.atkLv}`);

    const rem = Math.max(0, game.waveTotal - game.waveKilled);
    setT(dom.nightTitle, 'ngT', `${game.endlessMode ? 'ABADI' : 'MALAM'} ${game.night} • ${cfg.name.toUpperCase()}`);
    setT(dom.remaining, 'rmT', `Sisa Mayat: ${rem}`);
    setT(dom.alliesTag, 'alT', `Pemanah: ${game.allies.archers}${game.allies.footmen > 0 ? ' • Pengawal: ' + game.allies.footmen : ''}`);
    setS(dom.hordeFill, 'width', 'hdW', `${Math.max(0, (rem / Math.max(1, game.waveTotal)) * 100).toFixed(1)}%`);
    setT(dom.goldVal, 'gdV', String(game.gold));

    if (game.comboCount >= 2) {
        dom.comboBadge.classList.remove('hidden');
        setT(dom.comboBadge, 'cmB', `${game.comboCount}x COMBO`);
    } else {
        dom.comboBadge.classList.add('hidden');
    }

    // Boss HUD
    const boss = zombies.find(z => z.isBoss && !z.dead);
    if (boss) {
        dom.bossHud.classList.remove('hidden');
        setT(dom.bossName, 'bsN', boss.bossOpts.name || 'BOSS');
        setT(dom.bossPhase, 'bsP', `FASE ${boss.phase}`);
        setT(dom.bossHpLabel, 'bsH', `${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`);
        setS(dom.bossHpFill, 'width', 'bsW', `${Math.max(0, (boss.hp / boss.maxHp) * 100).toFixed(1)}%`);
    } else {
        dom.bossHud.classList.add('hidden');
    }

    // Touch buttons sync
    setA(dom.tUlti, 'data-ready', 'tUR', vPct >= 100 ? '1' : '0');
    setS(dom.tUltiFill, 'height', 'tUF', `${vPct}%`);
    const hmCd = knight.hammerCooldown > 0;
    setA(dom.tHammer, 'data-cooldown', 'tHC', hmCd ? '1' : '0');
    setS(dom.tHammerFill, 'height', 'tHF', `${Math.round((1 - knight.hammerCooldown / knight.hammerMaxCd) * 100)}%`);
    setS(dom.tHammerCd, 'display', 'tHCD', hmCd ? 'flex' : 'none');
    if (hmCd) setT(dom.tHammerCd, 'tHCT', (knight.hammerCooldown / 60).toFixed(1));
}

function updateGame() {
    if (game.state === 'ending_cg') {
        updateEndingCG();
        return;
    }
    if (game.state === 'start') {
        // Diorama pertempuran hidup di latar belakang menu utama!
        game.worldTick++;
        return;
    }
    if (game.state !== 'playing' || !knight) return;

    game.worldTick++;
    if (game.hitStop > 0) { game.hitStop--; return; }
    if (game.screenShake > 0) game.screenShake = Math.max(0, game.screenShake - 0.65);
    if (game.gateHitFlash > 0) game.gateHitFlash--;
    if (game.hurtVignette > 0) game.hurtVignette--;
    if (game.lightningFlash > 0) game.lightningFlash--;
    if (game.trebuchetAnim > 0) game.trebuchetAnim--;
    if (game.comboTimer > 0) {
        game.comboTimer--;
        if (game.comboTimer === 0) game.comboCount = 0;
    }

    const cfg = getNightConfig(game.night);
    if (cfg.weather === 'storm' && Math.random() < 0.004) {
        game.lightningFlash = 10;
    }

    // 1. Wave Spawner (Zombie bangkit dari tanah kuburan & Boss muncul di tengah gelombang!)
    const aliveCount = zombies.filter(z => !z.dead).length;
    const regularTarget = cfg.totalEnemies;
    if (game.waveSpawned < regularTarget) {
        game.waveSpawnTimer--;
        if (game.waveSpawnTimer <= 0 && aliveCount < cfg.maxAlive) {
            const type = cfg.pool[game.waveSpawned % cfg.pool.length];
            const spawnX = 940 + Math.random() * (WORLD_WIDTH - 1020);
            zombies.push(new Zombie(type, spawnX, game.night));
            game.waveSpawned++;
            game.waveSpawnTimer = Math.max(30, cfg.spawnInterval + Math.floor((Math.random() - 0.5) * 20));
        }
    }
    if (cfg.boss && !game.bossSpawned && game.waveKilled >= Math.floor(regularTarget * 0.48)) {
        game.bossSpawned = true;
        const boss = new Zombie('boss', WORLD_WIDTH - 150, game.night, cfg.boss);
        zombies.push(boss);
        sfx.play('boss_roar');
        game.screenShake = 14;
        showWaveBanner('PENGUASA PENGEPUNGAN TIBA!', cfg.boss.name, 'Hentikan dia sebelum menghancurkan Gerbang Benteng!');
    }

    // 2. Pemanah Kerajaan di Menara Benteng menembakkan Panah Api!
    game.archerTimer--;
    if (game.archerTimer <= 0 && game.allies.archers > 0) {
        const target = zombies.find(z => !z.dead && z.emergeTimer === 0 && z.x < 1420);
        if (target) {
            const shots = Math.min(3, Math.ceil(game.allies.archers / 2));
            for (let s = 0; s < shots; s++) {
                const sx = GATE_X - 28 - (s % game.allies.archers) * 34;
                const sy = 322;
                const tx = target.x + target.w / 2 + (s - 0.5) * 26;
                const ty = target.y + target.h * 0.4;
                const dist = Math.max(80, tx - sx);
                const flight = Math.min(55, Math.max(22, dist / 14));
                heroProjectiles.push({
                    kind: 'arrow',
                    x: sx, y: sy,
                    vx: (tx - sx) / flight,
                    vy: (ty - sy - 0.5 * 0.25 * flight * flight) / flight,
                    w: 22, h: 8,
                    dmg: Math.round(knight.atk * 0.52),
                    hitIds: new Set(),
                    life: 95
                });
            }
            sfx.play('arrow');
            game.archerTimer = Math.max(34, 88 - game.allies.archers * 10);
        } else {
            game.archerTimer = 25;
        }
    }

    // 3. Ketapel Api Benteng (Jika Berkah Trebuchet Aktif!)
    const trebLv = getBlessingLevel('trebuchet');
    if (trebLv > 0) {
        game.trebuchetTimer--;
        if (game.trebuchetTimer <= 0) {
            const target = zombies.find(z => !z.dead && z.x > 460 && z.x < 1650);
            if (target) {
                game.trebuchetAnim = 24;
                const sx = 135, sy = 300;
                const tx = target.x + target.w / 2;
                const flight = 64;
                heroProjectiles.push({
                    kind: 'boulder',
                    x: sx, y: sy,
                    vx: (tx - sx) / flight,
                    vy: (GROUND_Y - sy - 0.5 * 0.34 * flight * flight) / flight,
                    w: 32, h: 32,
                    dmg: Math.round(knight.atk * (2.2 + trebLv * 0.7)),
                    life: 90
                });
                sfx.play('heavy');
                game.trebuchetTimer = Math.max(120, 250 - trebLv * 38);
            } else {
                game.trebuchetTimer = 35;
            }
        }
    }

    // 4. Update Sir Aldric, Sekutu Pengawal, & Zombie
    knight.update();
    if (game.state !== 'playing') return;
    for (const al of allies) al.update();
    for (let i = 0; i < zombies.length; i++) zombies[i].update();

    // 5. Update Barisan Kavaleri Fajar!
    for (let i = cavalryRiders.length - 1; i >= 0; i--) {
        const r = cavalryRiders[i];
        r.x += r.vx;
        if (game.worldTick % 3 === 0) spawnParticles(r.x + 20, GROUND_Y - 6, '#fde047', 2);
        for (const z of zombies) {
            if (z.dead || r.hitIds.has(z.uid)) continue;
            if (rectOverlap(r, z)) {
                r.hitIds.add(z.uid);
                z.takeDamage(r.dmg, 13, { isCrit: true, isHeavy: true, breakShield: true });
                z.burnTimer = Math.max(z.burnTimer, 140);
                registerComboHit();
            }
        }
        if (r.x > WORLD_WIDTH + 140) cavalryRiders.splice(i, 1);
    }

    // 6. Update Cakar Kubur Nekromanser
    for (let i = graveHands.length - 1; i >= 0; i--) {
        const gh = graveHands[i];
        gh.timer--;
        if (gh.timer <= 14 && gh.timer >= 6 && !gh.hitDone) {
            if (Math.abs((knight.x + knight.w / 2) - gh.x) < 34 && knight.y + knight.h > GROUND_Y - 70) {
                gh.hitDone = true;
                knight.takeDamage(gh.dmg, knight.facing * -5, null);
            }
        }
        if (gh.timer <= 0) graveHands.splice(i, 1);
    }

    // 7. Update Proyektil Pahlawan (Palu Boomerang, Panah, Batu Ketapel, Gelombang Api, Panah Pantul!)
    for (let i = heroProjectiles.length - 1; i >= 0; i--) {
        const p = heroProjectiles[i];
        p.life--;

        if (p.kind === 'boomerang_hammer') {
            p.spin += 0.42;
            if (!p.returning) {
                p.vx -= p.originDir * 0.46;
                if (Math.sign(p.vx) !== p.originDir || Math.abs(p.vx) < 1.2) {
                    p.returning = true;
                }
            } else {
                const tx = knight.x + knight.w / 2;
                const ty = knight.y + 34;
                const ang = Math.atan2(ty - p.y, tx - p.x);
                p.vx = Math.cos(ang) * 14.5;
                p.vy = Math.sin(ang) * 14.5;
                if (Math.hypot(tx - p.x, ty - p.y) < 34) {
                    heroProjectiles.splice(i, 1);
                    continue;
                }
            }
            p.x += p.vx;
            p.y += p.vy;

            // Cek benturan dengan Tong Minyak & Zombie (multi-hit outbound + return!)
            const hb = { x: p.x - 20, y: p.y - 20, w: 40, h: 40 };
            for (const b of barrels) { if (!b.exploded && rectOverlap(hb, b)) explodeBarrel(b); }
            for (const z of zombies) {
                if (z.dead) continue;
                const lastTick = p.hitCooldowns.get(z.uid) || -99;
                if (game.worldTick - lastTick >= 15 && rectOverlap(hb, z)) {
                    p.hitCooldowns.set(z.uid, game.worldTick);
                    z.takeDamage(p.dmg, Math.sign(p.vx || 1) * 7, { isCrit: p.returning, breakShield: true });
                    registerComboHit();
                    knight.gainValor(4);
                    // Berkah Palu Halilintar: sambar petir dari langit!
                    const thLv = getBlessingLevel('thunder_hammer');
                    if (thLv > 0) {
                        strikeSkyLightning(z.x + z.w / 2, z.y + z.h / 2, Math.round(knight.atk * (0.75 + thLv * 0.35)));
                    }
                }
            }
        } else if (p.kind === 'boulder') {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.34;
            if (p.y >= GROUND_Y - 12) {
                sfx.play('explosion');
                game.screenShake = Math.max(game.screenShake, 10);
                spawnShockRing(p.x, GROUND_Y - 4, 145, '#f97316', 6);
                spawnParticles(p.x, GROUND_Y - 6, '#f97316', 24);
                for (const z of zombies) {
                    if (!z.dead && Math.abs((z.x + z.w / 2) - p.x) < 145) {
                        z.takeDamage(p.dmg, Math.sign((z.x - p.x) || 1) * 10, { isCrit: true, breakShield: true });
                        z.burnTimer = 150;
                    }
                }
                for (const b of barrels) { if (!b.exploded && Math.abs((b.x + b.w / 2) - p.x) < 130) explodeBarrel(b); }
                heroProjectiles.splice(i, 1);
                continue;
            }
        } else {
            p.x += p.vx;
            p.y += p.vy;
            if (p.kind === 'arrow') p.vy += 0.25;
            const pb = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
            for (const z of zombies) {
                if (z.dead || p.hitIds.has(z.uid)) continue;
                if (rectOverlap(pb, z)) {
                    p.hitIds.add(z.uid);
                    z.takeDamage(p.dmg, Math.sign(p.vx || 1) * 6, { isCrit: p.kind === 'reflected_bolt', breakShield: p.kind !== 'arrow' });
                    if (p.kind === 'arrow' || p.kind === 'flame_wave') z.burnTimer = Math.max(z.burnTimer, 90);
                    if (p.kind === 'arrow') { p.life = 0; break; }
                }
            }
            if (p.y > GROUND_Y + 12) p.life = 0;
        }

        if (p.life <= 0 || p.x < -80 || p.x > WORLD_WIDTH + 80) {
            heroProjectiles.splice(i, 1);
        }
    }

    // 8. Update Proyektil Musuh
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const ep = enemyProjectiles[i];
        ep.x += ep.vx;
        ep.y += ep.vy;
        ep.life--;

        if (ep.x <= GATE_X + 6) {
            damageGate(Math.round(ep.dmg * 0.65), GATE_X);
            enemyProjectiles.splice(i, 1);
            continue;
        }
        const eb = { x: ep.x - ep.r, y: ep.y - ep.r, w: ep.r * 2, h: ep.r * 2 };
        if (rectOverlap(eb, knight)) {
            knight.takeDamage(ep.dmg, Math.sign(ep.vx || -1) * 6, null);
            enemyProjectiles.splice(i, 1);
            continue;
        }
        if (ep.life <= 0 || ep.y > GROUND_Y + 20) enemyProjectiles.splice(i, 1);
    }

    // 9. Magnet Koin Emas
    const kx = knight.x + knight.w / 2;
    const ky = knight.y + knight.h / 2;
    for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        c.life--;
        const d = Math.hypot(kx - c.x, ky - c.y);
        if (d < 290) {
            c.x += ((kx - c.x) / Math.max(1, d)) * 10.5;
            c.y += ((ky - c.y) / Math.max(1, d)) * 10.5;
        } else {
            c.vy = Math.min(11, c.vy + 0.45);
            c.x += c.vx;
            c.y += c.vy;
            c.vx *= 0.94;
            if (c.y >= GROUND_Y - 8) { c.y = GROUND_Y - 8; c.vy *= -0.35; }
        }
        if (d < 36) {
            game.gold += c.value;
            sfx.play('coin');
            coins.splice(i, 1);
            continue;
        }
        if (c.life <= 0) coins.splice(i, 1);
    }

    // 10. Update VFX
    for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.24; pt.life--;
        if (pt.life <= 0) particles.splice(i, 1);
    }
    for (let i = shockRings.length - 1; i >= 0; i--) {
        shockRings[i].life--;
        if (shockRings[i].life <= 0) shockRings.splice(i, 1);
    }
    for (let i = lightningBolts.length - 1; i >= 0; i--) {
        lightningBolts[i].life--;
        if (lightningBolts[i].life <= 0) lightningBolts.splice(i, 1);
    }
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].y -= 1.05; floatingTexts[i].life--;
        if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
    }

    // 11. Cek Penyelesaian Malam!
    const allSpawned = game.waveSpawned >= regularTarget && (!cfg.boss || game.bossSpawned);
    const anyAlive = zombies.some(z => !z.dead);
    if (allSpawned && !anyAlive) {
        if (!game.endlessMode && game.night >= NIGHTS.length) {
            startEndingCG();
        } else {
            openWarCouncil();
        }
        return;
    }

    // 12. Kamera Halus mengikuti Sir Aldric di Halaman Benteng
    const targetCam = Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, knight.x + knight.w / 2 - VIEW_WIDTH * 0.36));
    game.cameraX += (targetCam - game.cameraX) * 0.12;

    updateHUD();
}

/* ==========================================================================
   ENDING CG, VICTORY, GAME OVER, PAUSE, & START FLOW
   ========================================================================== */
const CG_LINES = [
    'Raja Lich Agung Azrath lenyap dalam ledakan cahaya fajar di hadapan Gerbang Benteng...',
    'Sinar mentari pagi menyapu kabut wabah dari dinding katedral dan halaman kerajaan.',
    'Sir Aldric menancapkan pedang besarnya di jalan batu, disambut sorak para pemanah kerajaan.',
    'Benteng Cahaya tetap berdiri tegak. Fajar baru telah tiba bagi seluruh negeri!'
];

function startEndingCG() {
    resetInputs();
    hideWaveBanner();
    game.state = 'ending_cg';
    document.body.classList.add('in-ending-cg');
    endingCG.frame = 0;
    endingCG.finished = false;
    endingCG.subtitleStep = -1;
    endingCG.birds = Array.from({ length: 7 }, (_, i) => ({
        x: 260 + i * 95,
        y: 170 + (i % 3) * 40,
        speed: 1.6 + (i % 3) * 0.35,
        phase: i * 1.1
    }));
    dom.endModal.classList.add('hidden');
    dom.cgOverlay.classList.remove('hidden');
    sfx.stopBGM();
    sfx.play('dawn_chord');
}

function updateEndingCG() {
    endingCG.frame++;
    for (const b of endingCG.birds) {
        b.x += b.speed;
        b.y -= 0.14;
        if (b.x > VIEW_WIDTH + 40) b.x = -30;
    }
    const step = Math.min(CG_LINES.length - 1, Math.floor((endingCG.frame / endingCG.totalFrames) * CG_LINES.length));
    if (step !== endingCG.subtitleStep) {
        endingCG.subtitleStep = step;
        dom.cgSub.textContent = CG_LINES[step];
        if (step === 2) sfx.play('dawn_chord');
    }
    if (endingCG.frame >= endingCG.totalFrames && !endingCG.finished) {
        endingCG.finished = true;
        showVictoryModal();
    }
}

function showVictoryModal() {
    game.state = 'victory';
    document.body.classList.remove('in-ending-cg');
    dom.cgOverlay.classList.add('hidden');
    saveRecord(true);
    safeDel(STORAGE.SAVE);

    document.getElementById('end-eyebrow').textContent = '10 MALAM PERTAHANAN SELESAI';
    document.getElementById('end-title').textContent = 'FAJAR KEMENANGAN!';
    document.getElementById('end-desc').textContent = 'Benteng Kerajaan berhasil dipertahankan dari seluruh pasukan Raja Lich Agung Azrath!';
    document.getElementById('end-nights').textContent = String(game.night);
    document.getElementById('end-kills').textContent = String(game.totalKills);
    document.getElementById('end-parries').textContent = String(game.totalParries);
    document.getElementById('end-record-text').textContent = `Sisa HP Gerbang: ${Math.ceil(game.gateHp)} / ${game.gateMaxHp} • Berkah Aktif: ${getTotalBlessings()}`;
    document.getElementById('btn-end-retry').classList.add('hidden');
    document.getElementById('btn-end-cg').classList.remove('hidden');
    dom.endModal.classList.remove('hidden');
    sfx.play('victory');
}

function triggerGameOver(reason) {
    resetInputs();
    hideWaveBanner();
    game.state = 'gameover';
    document.body.classList.remove('in-ending-cg');
    sfx.stopBGM();
    sfx.play('gameover');
    saveRecord(false);

    document.getElementById('end-eyebrow').textContent = `PERTAHANAN JEBOL DI MALAM ${game.night}`;
    document.getElementById('end-title').textContent = 'BENTENG RUNTUH';
    document.getElementById('end-desc').textContent = reason || 'Gerombolan zombie menembus pertahanan malam ini. Bangkit dan tahan kembali!';
    document.getElementById('end-nights').textContent = String(game.night);
    document.getElementById('end-kills').textContent = String(game.totalKills);
    document.getElementById('end-parries').textContent = String(game.totalParries);
    document.getElementById('end-record-text').textContent = `Tip: Tahan Perisai [K] saat serangan mendekat untuk memicu TANGKIS BALAS & memantulkan panah!`;
    document.getElementById('btn-end-retry').classList.remove('hidden');
    document.getElementById('btn-end-cg').classList.add('hidden');
    dom.endModal.classList.remove('hidden');
}

function openPause() {
    if (game.state !== 'playing') return;
    resetInputs();
    game.state = 'paused';
    dom.pauseModal.classList.remove('hidden');
}

function resumeGame() {
    if (game.state !== 'paused') return;
    dom.pauseModal.classList.add('hidden');
    game.state = 'playing';
}

function returnToMenu() {
    resetInputs();
    hideWaveBanner();
    sfx.stopBGM();
    game.state = 'start';
    document.body.classList.remove('in-ending-cg');
    dom.pauseModal.classList.add('hidden');
    dom.councilModal.classList.add('hidden');
    dom.endModal.classList.add('hidden');
    dom.cgOverlay.classList.add('hidden');
    setupTitleDiorama();
    refreshStartMenu();
    dom.startModal.classList.remove('hidden');
}

function refreshStartMenu() {
    const saved = loadRunProgress();
    const rec = loadRecord();
    const cBtn = document.getElementById('btn-continue');
    if (saved && saved.night >= 2) {
        cBtn.classList.remove('hidden');
        document.getElementById('btn-continue-text').textContent = `Lanjut ${saved.endlessMode ? 'Abadi' : 'Malam'} ${saved.night}`;
    } else {
        cBtn.classList.add('hidden');
    }

    const rLine = document.getElementById('start-record-line');
    if (rec && rec.bestKills > 0) {
        rLine.classList.remove('hidden');
        const parts = [];
        if (rec.cleared) parts.push('★ Penyelamat Benteng Fajar');
        parts.push(`Rekor Malam: ${rec.bestNight}`);
        if (rec.bestEndless > 0) parts.push(`Abadi: Malam ${rec.bestEndless}`);
        parts.push(`Total Kill: ${rec.bestKills}`);
        rLine.textContent = parts.join(' • ');
    } else {
        rLine.classList.add('hidden');
    }
}

function startNewRun(endless = false) {
    sfx.init();
    game.endlessMode = endless;
    game.gold = endless ? 75 : 25;
    game.totalKills = 0;
    game.totalParries = 0;
    game.gateMaxHp = 500;
    game.gateHp = 500;
    game.forge = { atkLv: 1, hpLv: 1, gateLv: 1, allyLv: 1 };
    game.allies = { archers: 1, footmen: endless ? 1 : 0 };
    game.blessings = Object.create(null);
    game.extraBarrels = 0;
    knight = null;
    startNight(1, false);
}

function continueSavedRun() {
    sfx.init();
    const s = loadRunProgress();
    if (!s) { startNewRun(false); return; }
    game.endlessMode = !!s.endlessMode;
    game.gold = s.gold || 0;
    game.totalKills = s.totalKills || 0;
    game.totalParries = s.totalParries || 0;
    game.gateMaxHp = s.gateMaxHp || 500;
    game.gateHp = Math.max(120, s.gateHp || 500);
    game.forge = Object.assign({ atkLv: 1, hpLv: 1, gateLv: 1, allyLv: 1 }, s.forge);
    game.allies = Object.assign({ archers: 1, footmen: 0 }, s.allies);
    game.blessings = Object.assign(Object.create(null), s.blessings || {});
    knight = null;
    startNight(s.night || 1, false);
}

function setupTitleDiorama() {
    game.night = 1;
    game.gateMaxHp = 500;
    game.gateHp = 500;
    game.allies = { archers: 2, footmen: 1 };
    game.cameraX = 0;
    knight = new Knight(380, GROUND_Y - 80);
    allies = [new AlliedFootman(0)];
    barrels = [{ x: 640, y: GROUND_Y - 46, w: 34, h: 46, exploded: false }];
    zombies = [
        new Zombie('walker', 820, 1),
        new Zombie('rot_knight', 980, 1),
        new Zombie('crossbow', 1120, 1)
    ];
    zombies.forEach(z => { z.emergeTimer = 0; });
    heroProjectiles = [];
    enemyProjectiles = [];
    cavalryRiders = [];
    graveHands = [];
}

/* ==========================================================================
   FIXED-TIMESTEP 60FPS GAME LOOP
   ========================================================================== */
const STEP_MS = 1000 / 60;
let prevTs = 0;
let accMs = 0;

function gameLoop(ts) {
    if (!prevTs) prevTs = ts;
    accMs += Math.min(50, ts - prevTs);
    prevTs = ts;
    let steps = 0;
    while (accMs >= STEP_MS && steps < 3) {
        updateGame();
        accMs -= STEP_MS;
        steps++;
    }
    if (game.state === 'ending_cg') drawEndingCG();
    else drawGame();
    requestAnimationFrame(gameLoop);
}

/* ==========================================================================
   KONTROL KEYBOARD & LAYAR SENTUH MULTI-TOUCH (TERMASUK HOLD-TO-GUARD!)
   ========================================================================== */
window.addEventListener('keydown', e => {
    const c = e.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(c)) e.preventDefault();
    sfx.init();
    if (c === 'KeyP' || c === 'Escape') {
        if (game.state === 'playing') openPause();
        else if (game.state === 'paused') resumeGame();
        return;
    }
    if (c === 'KeyM') { toggleMute(); return; }
    if (game.state !== 'playing') return;

    if (c === 'KeyA' || c === 'ArrowLeft') keys.left = true;
    if (c === 'KeyD' || c === 'ArrowRight') keys.right = true;
    if (c === 'KeyS' || c === 'ArrowDown') keys.down = true;
    if (c === 'KeyK' || c === 'KeyX' || c === 'ShiftLeft' || c === 'ShiftRight') keys.guardHeld = true;
    if ((c === 'KeyW' || c === 'ArrowUp') && !e.repeat) keys.jumpPressed = true;
    if ((c === 'KeyJ' || c === 'KeyZ' || c === 'Space') && !e.repeat) keys.attackPressed = true;
    if ((c === 'KeyL' || c === 'KeyC') && !e.repeat) keys.hammerPressed = true;
    if ((c === 'KeyQ' || c === 'KeyE' || c === 'KeyF') && !e.repeat) keys.ultiPressed = true;
});

window.addEventListener('keyup', e => {
    const c = e.code;
    if (c === 'KeyA' || c === 'ArrowLeft') keys.left = false;
    if (c === 'KeyD' || c === 'ArrowRight') keys.right = false;
    if (c === 'KeyS' || c === 'ArrowDown') keys.down = false;
    if (c === 'KeyK' || c === 'KeyX' || c === 'ShiftLeft' || c === 'ShiftRight') keys.guardHeld = false;
});

window.addEventListener('blur', resetInputs);
window.onAppPause = function () { if (game.state === 'playing') openPause(); };

function toggleMute() {
    sfx.init();
    const m = sfx.toggleMute();
    document.getElementById('icon-sound-on').classList.toggle('hidden', m);
    document.getElementById('icon-sound-off').classList.toggle('hidden', !m);
}

(function initTouch() {
    const zone = document.getElementById('dpad-zone');
    const bL = document.getElementById('t-left');
    const bR = document.getElementById('t-right');
    let dpadId = null;

    function applyDir(d) {
        keys.left = d < 0;
        keys.right = d > 0;
        bL.dataset.active = d < 0 ? '1' : '0';
        bR.dataset.active = d > 0 ? '1' : '0';
    }
    function calcDir(cx) {
        const lr = bL.getBoundingClientRect();
        const rr = bR.getBoundingClientRect();
        return cx < (lr.right + rr.left) / 2 ? -1 : 1;
    }

    zone.addEventListener('pointerdown', e => {
        e.preventDefault();
        document.body.classList.add('is-touch');
        sfx.init();
        dpadId = e.pointerId;
        applyDir(calcDir(e.clientX));
    }, { passive: false });

    zone.addEventListener('pointermove', e => {
        if (e.pointerId !== dpadId) return;
        e.preventDefault();
        applyDir(calcDir(e.clientX));
    }, { passive: false });

    const clearDpad = e => {
        if (dpadId !== null && (!e || e.pointerId === dpadId)) { dpadId = null; applyDir(0); }
    };
    window.addEventListener('pointerup', clearDpad);
    window.addEventListener('pointercancel', clearDpad);
    inputResetHooks.push(() => { dpadId = null; applyDir(0); });

    // Hold-to-Guard Perisai Touch Button!
    const guardBtn = document.getElementById('t-guard');
    let guardPid = null;
    guardBtn.addEventListener('pointerdown', e => {
        e.preventDefault();
        document.body.classList.add('is-touch');
        sfx.init();
        guardPid = e.pointerId;
        guardBtn.dataset.active = '1';
        if (game.state === 'playing') keys.guardHeld = true;
    }, { passive: false });
    const clearGuard = e => {
        if (guardPid !== null && (!e || e.pointerId === guardPid)) {
            guardPid = null;
            guardBtn.dataset.active = '0';
            keys.guardHeld = false;
        }
    };
    window.addEventListener('pointerup', clearGuard);
    window.addEventListener('pointercancel', clearGuard);
    inputResetHooks.push(() => { guardPid = null; guardBtn.dataset.active = '0'; keys.guardHeld = false; });

    function bindTap(id, fn) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('pointerdown', e => {
            e.preventDefault();
            document.body.classList.add('is-touch');
            sfx.init();
            el.dataset.active = '1';
            if (game.state === 'playing') fn();
        }, { passive: false });
        const up = () => { el.dataset.active = '0'; };
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('pointerleave', up);
    }

    bindTap('t-attack', () => { keys.attackPressed = true; });
    bindTap('t-jump', () => { keys.jumpPressed = true; });
    bindTap('t-hammer', () => { keys.hammerPressed = true; });
    bindTap('t-ulti', () => { keys.ultiPressed = true; });
})();

/* ==========================================================================
   WIRING TOMBOL UI & HOOK VERIFIKASI OTOMATIS
   ========================================================================== */
document.getElementById('btn-start-campaign').onclick = () => startNewRun(false);
document.getElementById('btn-start-endless').onclick = () => startNewRun(true);
document.getElementById('btn-continue').onclick = () => continueSavedRun();
document.getElementById('btn-mute').onclick = () => toggleMute();
document.getElementById('btn-pause').onclick = () => openPause();
document.getElementById('btn-resume').onclick = () => resumeGame();
document.getElementById('btn-retry-wave').onclick = () => startNight(game.night, true);
document.getElementById('btn-back-menu').onclick = () => returnToMenu();
document.getElementById('btn-end-retry').onclick = () => startNight(game.night, true);
document.getElementById('btn-end-menu').onclick = () => returnToMenu();
document.getElementById('btn-end-cg').onclick = () => startEndingCG();
document.getElementById('btn-skip-cg').onclick = () => showVictoryModal();
document.getElementById('btn-next-night').onclick = () => startNight(game.night + 1, false);

document.getElementById('f-buy-atk').onclick = () => buyFortify('atk');
document.getElementById('f-buy-gate').onclick = () => buyFortify('gate');
document.getElementById('f-buy-ally').onclick = () => buyFortify('ally');
document.getElementById('f-buy-heal').onclick = () => buyFortify('heal');

window.__KVZ_APP__ = {
    getState: () => ({
        state: game.state,
        night: game.night,
        nightCount: NIGHTS.length,
        blessingCount: BLESSINGS.length,
        gold: game.gold,
        gateHp: Math.round(game.gateHp),
        gateMaxHp: game.gateMaxHp,
        totalKills: game.totalKills,
        totalParries: game.totalParries,
        knight: knight ? {
            x: Math.round(knight.x),
            y: Math.round(knight.y),
            hp: Math.round(knight.hp),
            maxHp: knight.maxHp,
            valor: Math.round(knight.valor),
            atk: knight.atk,
            guarding: knight.guarding
        } : null,
        zombiesAlive: zombies.filter(z => !z.dead).length,
        cavalryActive: cavalryRiders.length
    }),
    setupBossShowcase: (nightNum = 10) => {
        game.endlessMode = false;
        game.gold = 320;
        game.forge = { atkLv: 5, hpLv: 4, gateLv: 3, allyLv: 3 };
        game.allies = { archers: 4, footmen: 2 };
        game.blessings = { flame_blade: 1, thunder_hammer: 1, trebuchet: 1, golden_horn: 1 };
        startNight(nightNum, false);
        hideWaveBanner();
        const cfg = getNightConfig(nightNum);
        const boss = new Zombie('boss', 860, nightNum, cfg.boss);
        zombies.push(boss);
        zombies.push(new Zombie('rot_knight', 680, nightNum));
        zombies.push(new Zombie('keg_carrier', 760, nightNum));
        zombies.forEach(z => { z.emergeTimer = 0; });
        game.bossSpawned = true;
        knight.x = 420;
        knight.valor = 100;
        updateHUD();
    },
    triggerCavalryForTest: () => {
        if (knight) { knight.valor = 100; knight.summonCavalry(); updateHUD(); }
    },
    openCouncilForTest: () => openWarCouncil(),
    startEndingCGForTest: () => startEndingCG(),
    showVictoryForTest: () => showVictoryModal()
};

window.addEventListener('load', () => {
    setupTitleDiorama();
    refreshStartMenu();
    requestAnimationFrame(gameLoop);
});

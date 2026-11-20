/* ==========================================================================
   ENGINE UTAMA: KESATRIA CAHAYA VS ZOMBIE
   Loop Fixed-Timestep 60fps, Tempaan, Relik, Boss Rush, Save, & Kontrol
   ========================================================================== */

if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
        const r = Math.min(typeof radii === 'number' ? radii : 0, w / 2, h / 2);
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

const STORAGE_KEYS = {
    RECORD: 'kvz_best_record_v1',
    PROGRESS: 'kvz_stage_progress_v1',
    UNLOCKED: 'kvz_unlocked_stage_v1'
};

// Cache gradient langit per stage (zero-alloc per frame)
const skyGradientCache = STAGES.map(st => {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    g.addColorStop(0, st.skyTop);
    g.addColorStop(1, st.skyBottom);
    return g;
});

const game = {
    state: 'start', // 'start', 'playing', 'paused', 'shop', 'ending_cg', 'gameover', 'victory'
    stageIndex: 0,
    gold: 0,
    totalGoldEarned: 0,
    totalKills: 0,
    cameraX: 0,
    screenShake: 0,
    hitStop: 0,
    betweenStages: false,
    worldTick: 0,
    comboCount: 0,
    comboTimer: 0,
    maxCombo: 0,
    chestsOpened: 0,
    damageTaken: 0,
    elapsedFrames: 0,
    bossRushMode: false,
    bossRushStep: 0,
    upgrades: {
        atkLevel: 1,
        hpLevel: 1,
        spdLevel: 1
    },
    stageSnapshot: null
};

const endingCG = {
    frame: 0,
    totalFrames: 540,
    finished: false,
    birds: [],
    embers: [],
    subtitleStep: -1
};

const keys = {
    left: false,
    right: false,
    jumpPressed: false,
    attackPressed: false,
    shieldPressed: false,
    javelinPressed: false,
    ultiPressed: false
};

const inputResetHooks = [];

let player = null;
let enemies = [];
let coins = [];
let projectiles = [];
let playerProjectiles = [];
let chests = [];
let checkpoints = [];
let particles = [];
let floatingTexts = [];
let afterimages = [];
let bgProps = [];
let shockRings = [];
let lightningBolts = [];
let bannerTimeoutId = null;

// 38 partikel cuaca pooled bebas alokasi GC
const weatherParticles = Array.from({ length: 38 }, (_, i) => ({
    x: (i * 97) % VIEW_WIDTH,
    y: (i * 53) % VIEW_HEIGHT,
    size: 1.6 + (i % 3) * 1.15,
    speedX: ((i % 5) - 2) * 0.35,
    speedY: 0.65 + (i % 4) * 0.45,
    phase: i * 0.72
}));

/* ==========================================================================
   SISTEM RELIK PUSAKA KESATRIA & COMBO MASTERY
   ========================================================================== */
function getTotalUpgradeLevel() {
    return (game.upgrades.atkLevel || 1) + (game.upgrades.hpLevel || 1) + (game.upgrades.spdLevel || 1) - 2;
}

function hasRelic(id) {
    const lv = getTotalUpgradeLevel();
    if (id === 'lantern') return lv >= 1;   // Relik I: Lentera Jiwa (Lv 1+)
    if (id === 'lightning') return lv >= 4; // Relik II: Segel Petir Suci (Lv 4+)
    if (id === 'chalice') return lv >= 8;   // Relik III: Cawan Darah Suci (Lv 8+)
    if (id === 'crown') return lv >= 14;    // Relik IV: Mahkota Matahari (Lv 14+)
    return false;
}

function getComboDamageMultiplier() {
    if (game.comboCount >= 15) return 1.32;
    if (game.comboCount >= 10) return 1.22;
    if (game.comboCount >= 5) return 1.12;
    return 1.0;
}

function registerComboHit() {
    game.comboCount++;
    game.comboTimer = 150;
    if (game.comboCount > game.maxCombo) game.maxCombo = game.comboCount;
    if (player) {
        if (game.comboCount === 5) addFloatingText('SERBUAN SUCI! +12%', player.x + player.w / 2, player.y - 34, '#fde68a', true);
        else if (game.comboCount === 10) addFloatingText('PEMBANTAI MAYAT! +22%', player.x + player.w / 2, player.y - 34, '#fb923c', true);
        else if (game.comboCount === 15) addFloatingText('KESATRIA ABADI! +32%', player.x + player.w / 2, player.y - 34, '#fde047', true);
    }
}

/* ==========================================================================
   UTILITAS EFEK VISUAL & FISIKA
   ========================================================================== */
function rectOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function pushParticle(pt) {
    if (particles.length < 160) particles.push(pt);
}

function spawnParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        pushParticle({
            x,
            y,
            vx: (Math.random() - 0.5) * 8.5,
            vy: (Math.random() - 0.8) * 7.5,
            size: 2.5 + Math.random() * 4,
            color,
            life: 16 + Math.floor(Math.random() * 14),
            maxLife: 30
        });
    }
}

function spawnShockRing(x, y, maxR, color, lineW = 4) {
    if (shockRings.length < 18) {
        shockRings.push({ x, y, maxR, color, lineW, life: 16, maxLife: 16 });
    }
}

function addFloatingText(text, x, y, color = '#ffffff', big = false) {
    if (floatingTexts.length < 28) {
        floatingTexts.push({ text, x, y, color, big, life: 44, maxLife: 44 });
    }
}

function triggerParryLightning(fromX, fromY) {
    if (!hasRelic('lightning') || !player) return;
    let nearest = null;
    let bestDist = 440;
    for (const en of enemies) {
        if (en.dead) continue;
        const d = Math.hypot((en.x + en.w / 2) - fromX, (en.y + en.h / 2) - fromY);
        if (d < bestDist) {
            bestDist = d;
            nearest = en;
        }
    }
    if (!nearest) return;
    const tx = nearest.x + nearest.w / 2;
    const ty = nearest.y + nearest.h / 2;
    const dmg = Math.max(12, Math.round(player.attackDamage * 0.6));
    nearest.takeDamage(dmg, Math.sign(tx - fromX || player.facing) * 4, { fromJavelin: true });

    const pts = [{ x: fromX, y: fromY }];
    for (let s = 1; s < 5; s++) {
        const t = s / 5;
        pts.push({
            x: fromX + (tx - fromX) * t + (Math.random() - 0.5) * 28,
            y: fromY + (ty - fromY) * t + (Math.random() - 0.5) * 28
        });
    }
    pts.push({ x: tx, y: ty });
    lightningBolts.push({ pts, color: '#fde047', life: 13, maxLife: 13 });
    spawnShockRing(tx, ty, 40, '#fde047', 3);
    sfx.play('lightning');
    addFloatingText('PETIR SUCI!', tx, nearest.y - 18, '#fde047');
}

/* ==========================================================================
   LOCALSTORAGE SAVE & LOAD (AMAN TERHADAP SANDBOX)
   ========================================================================== */
function safeGetStorage(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
}

function safeSetStorage(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
}

function safeRemoveStorage(key) {
    try { localStorage.removeItem(key); } catch (e) {}
}

function loadUnlockedStage() {
    const raw = parseInt(safeGetStorage(STORAGE_KEYS.UNLOCKED) || '1', 10);
    return Number.isFinite(raw) ? Math.max(1, Math.min(STAGES.length, raw)) : 1;
}

function unlockStage(stageNum) {
    const cur = loadUnlockedStage();
    if (stageNum > cur) {
        safeSetStorage(STORAGE_KEYS.UNLOCKED, String(Math.min(STAGES.length, stageNum)));
    }
}

function loadBestRecord() {
    try {
        const raw = safeGetStorage(STORAGE_KEYS.RECORD);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function saveBestRecord(kills, gold, cleared, extras = {}) {
    const prev = loadBestRecord() || {};
    const rec = {
        kills: Math.max(prev.kills || 0, kills),
        gold: Math.max(prev.gold || 0, gold),
        cleared: !!(prev.cleared || cleared),
        bossRushCleared: !!(prev.bossRushCleared || extras.bossRushCleared),
        bestRank: extras.rank || prev.bestRank || 'B'
    };
    safeSetStorage(STORAGE_KEYS.RECORD, JSON.stringify(rec));
    return rec;
}

function saveStageProgress() {
    if (game.bossRushMode) return;
    const payload = {
        stageIndex: game.stageIndex,
        gold: game.gold,
        totalGoldEarned: game.totalGoldEarned,
        totalKills: game.totalKills,
        chestsOpened: game.chestsOpened,
        elapsedFrames: game.elapsedFrames,
        upgrades: Object.assign({}, game.upgrades)
    };
    safeSetStorage(STORAGE_KEYS.PROGRESS, JSON.stringify(payload));
}

function loadStageProgress() {
    try {
        const raw = safeGetStorage(STORAGE_KEYS.PROGRESS);
        if (!raw) return null;
        const p = JSON.parse(raw);
        if (typeof p.stageIndex === 'number' && p.stageIndex >= 0 && p.stageIndex < STAGES.length) {
            return p;
        }
    } catch (e) {}
    return null;
}

function clearStageProgress() {
    safeRemoveStorage(STORAGE_KEYS.PROGRESS);
}

/* ==========================================================================
   ZERO-LAG UI CACHE HELPERS
   ========================================================================== */
const uiCache = Object.create(null);

function setUiText(el, key, val) {
    if (!el || uiCache[key] === val) return;
    uiCache[key] = val;
    el.textContent = val;
}

function setUiStyle(el, prop, key, val) {
    if (!el || uiCache[key] === val) return;
    uiCache[key] = val;
    el.style[prop] = val;
}

function setUiAttr(el, attr, key, val) {
    if (!el || uiCache[key] === val) return;
    uiCache[key] = val;
    el.setAttribute(attr, val);
}

const dom = {
    hpText: document.getElementById('hud-hp-text'),
    hpFill: document.getElementById('hp-bar-fill'),
    furyText: document.getElementById('hud-fury-text'),
    furyFill: document.getElementById('fury-bar-fill'),
    armorBadge: document.getElementById('hud-armor-badge'),
    stageName: document.getElementById('hud-stage-name'),
    enemyCount: document.getElementById('hud-enemy-count'),
    comboPill: document.getElementById('hud-combo-pill'),
    gold: document.getElementById('hud-gold'),
    bossHud: document.getElementById('boss-hud'),
    bossNameText: document.getElementById('boss-name-text'),
    bossPhaseTag: document.getElementById('boss-phase-tag'),
    bossHpText: document.getElementById('boss-hp-text'),
    bossHpFill: document.getElementById('boss-hp-fill'),
    banner: document.getElementById('stage-banner'),
    bannerSub: document.getElementById('banner-sub'),
    bannerTitle: document.getElementById('banner-title'),
    bannerDesc: document.getElementById('banner-desc'),
    tJump: document.getElementById('t-jump'),
    tShield: document.getElementById('t-shield'),
    tShieldFill: document.getElementById('t-shield-fill'),
    tShieldCd: document.getElementById('t-shield-cd'),
    tJavelin: document.getElementById('t-javelin'),
    tJavelinFill: document.getElementById('t-javelin-fill'),
    tJavelinCd: document.getElementById('t-javelin-cd'),
    tUlti: document.getElementById('t-ulti'),
    tUltiFill: document.getElementById('t-ulti-fill'),
    startModal: document.getElementById('start-modal'),
    shopModal: document.getElementById('shop-modal'),
    pauseModal: document.getElementById('pause-modal'),
    endModal: document.getElementById('end-modal'),
    cgOverlay: document.getElementById('ending-cg-overlay'),
    cgSubtitle: document.getElementById('cg-subtitle')
};

function hideBanner() {
    if (bannerTimeoutId) {
        clearTimeout(bannerTimeoutId);
        bannerTimeoutId = null;
    }
    dom.banner.classList.remove('visible');
}

function showBanner(sub, title, desc) {
    hideBanner();
    dom.bannerSub.textContent = sub;
    dom.bannerTitle.textContent = title;
    dom.bannerDesc.textContent = desc;
    dom.banner.classList.add('visible');
    bannerTimeoutId = setTimeout(() => {
        dom.banner.classList.remove('visible');
        bannerTimeoutId = null;
    }, 3200);
}

/* ==========================================================================
   STAGE LOADING, PETI RELIK, & CHECKPOINT
   ========================================================================== */
function resetInputKeys() {
    keys.left = false;
    keys.right = false;
    keys.jumpPressed = false;
    keys.attackPressed = false;
    keys.shieldPressed = false;
    keys.javelinPressed = false;
    keys.ultiPressed = false;
    for (let i = 0; i < inputResetHooks.length; i++) inputResetHooks[i]();
    document.querySelectorAll('.touch-btn[data-active="1"]').forEach(b => { b.dataset.active = '0'; });
}

function loadStage(index, fullHeal = false, restoreSnapshot = false) {
    game.stageIndex = Math.max(0, Math.min(STAGES.length - 1, index));
    const stage = STAGES[game.stageIndex];
    unlockStage(stage.id);

    if (restoreSnapshot && game.stageSnapshot) {
        game.gold = game.stageSnapshot.gold;
        game.totalGoldEarned = game.stageSnapshot.totalGoldEarned;
        game.totalKills = game.stageSnapshot.totalKills;
        game.upgrades = Object.assign({}, game.stageSnapshot.upgrades);
    } else {
        game.stageSnapshot = {
            gold: game.gold,
            totalGoldEarned: game.totalGoldEarned,
            totalKills: game.totalKills,
            upgrades: Object.assign({}, game.upgrades)
        };
    }

    // Reset posisi platform bergerak
    for (const plat of stage.platforms) {
        if (plat.type === 'moving') {
            plat.x = plat.startX;
            plat.dir = 1;
            plat.dx = 0;
        }
    }

    // Spawn Kesatria (pada Boss Rush, langsung di gerbang arena Boss!)
    const prevHp = player ? player.hp : 120;
    const prevFury = player ? player.fury : 0;
    let spawnX = 80;
    let spawnY = 540;
    if (game.bossRushMode && stage.checkpoints && stage.checkpoints.length > 0) {
        const lastCp = stage.checkpoints[stage.checkpoints.length - 1];
        spawnX = Math.max(80, lastCp.x - 10);
        spawnY = lastCp.y - 66;
    }

    player = new Knight(spawnX, spawnY);
    if (!fullHeal && prevHp > 0 && !restoreSnapshot) {
        player.hp = Math.min(player.maxHp, Math.max(Math.round(player.maxHp * 0.45), prevHp));
        player.fury = prevFury;
    } else {
        player.hp = player.maxHp;
    }

    // Spawn Zombie & Boss
    enemies = [];
    for (const e of stage.enemies) {
        if (game.bossRushMode && e.type !== 'boss') continue; // Boss Rush langsung duel Boss!
        enemies.push(new Zombie(e.type, e.x, e.y, stage.id, e.bossOpts || null));
    }

    // Peti Relik & Checkpoint
    chests = (stage.chests || []).map(c => ({
        x: c.x, y: c.y - 30, w: 40, h: 30, opened: false
    }));
    checkpoints = (stage.checkpoints || []).map(cp => ({
        x: cp.x, y: cp.y, activated: false
    }));

    coins = [];
    projectiles = [];
    playerProjectiles = [];
    particles = [];
    floatingTexts = [];
    afterimages = [];
    shockRings = [];
    lightningBolts = [];
    bgProps = buildBgProps(stage);

    game.cameraX = Math.max(0, Math.min(stage.worldWidth - VIEW_WIDTH, player.x - VIEW_WIDTH * 0.32));
    game.screenShake = 0;
    game.hitStop = 0;
    game.comboCount = 0;
    game.comboTimer = 0;
    game.state = 'playing';
    document.body.classList.remove('in-ending-cg');

    dom.startModal.classList.add('hidden');
    dom.shopModal.classList.add('hidden');
    dom.pauseModal.classList.add('hidden');
    dom.endModal.classList.add('hidden');
    dom.cgOverlay.classList.add('hidden');

    const bannerSub = game.bossRushMode
        ? `BOSS RUSH ${game.bossRushStep + 1} / ${BOSS_RUSH_STAGES.length}`
        : `${stage.act} • ${stage.subtitle}`;
    showBanner(bannerSub, stage.name, stage.desc);

    saveStageProgress();
    updateHUD();
    sfx.startBGM(stage.bgmPattern);
}

function openChest(ch) {
    if (ch.opened) return;
    ch.opened = true;
    game.chestsOpened++;
    sfx.play('chest');
    const bonusGold = 35 + (game.stageIndex + 1) * 5;
    spawnShockRing(ch.x + ch.w / 2, ch.y + ch.h / 2, 54, '#fde047', 4);
    spawnParticles(ch.x + ch.w / 2, ch.y, '#fde047', 16);
    for (let i = 0; i < 6; i++) {
        coins.push({
            x: ch.x + ch.w / 2,
            y: ch.y,
            vx: (Math.random() - 0.5) * 8,
            vy: -5 - Math.random() * 5,
            value: Math.round(bonusGold / 6),
            life: 620
        });
    }
    if (player) {
        const heal = Math.round(player.maxHp * 0.25);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        player.gainFury(20);
        addFloatingText(`PETI RELIK! +${bonusGold} EMAS`, ch.x + ch.w / 2, ch.y - 16, '#fde047', true);
    }
}

/* ==========================================================================
   PANDAI BESI (UPGRADE SHOP) & 4 RELIK PUSAKA
   ========================================================================== */
function getUpgradeCost(type) {
    if (type === 'atk') return Math.round(30 * Math.pow(1.42, (game.upgrades.atkLevel || 1) - 1));
    if (type === 'hp') return Math.round(25 * Math.pow(1.38, (game.upgrades.hpLevel || 1) - 1));
    if (type === 'spd') return Math.round(25 * Math.pow(1.4, (game.upgrades.spdLevel || 1) - 1));
    if (type === 'heal') return 20 + Math.floor(game.stageIndex * 2);
    return 30;
}

function renderRelicsBar() {
    const bar = document.getElementById('shop-relics-bar');
    if (!bar) return;
    const lv = getTotalUpgradeLevel();
    const list = [
        { id: 'lantern', name: 'Lentera Jiwa', req: 1, desc: 'Magnet Emas' },
        { id: 'lightning', name: 'Segel Petir Suci', req: 4, desc: 'Petir Tangkis' },
        { id: 'chalice', name: 'Cawan Darah Suci', req: 8, desc: '+4% HP/Kill' },
        { id: 'crown', name: 'Mahkota Matahari', req: 14, desc: 'Ulti 2 Gelombang' }
    ];
    bar.innerHTML = list.map(r => {
        const active = hasRelic(r.id);
        return `<span class="relic-pill ${active ? 'active' : ''}" title="${r.desc} (Total Lv.${r.req}+)">${active ? '★' : '🔒'} ${r.name} · ${active ? r.desc : 'Lv.' + r.req}</span>`;
    }).join('') + `<span class="relic-pill" style="border-color:rgba(217,169,78,0.28);color:#d6d3d1;">Total Tempaan: Lv.${lv}</span>`;
}

function updateShopUI() {
    if (!player) return;
    document.getElementById('shop-gold').textContent = game.gold;
    renderRelicsBar();

    const atkLv = game.upgrades.atkLevel;
    const hpLv = game.upgrades.hpLevel;
    const spdLv = game.upgrades.spdLevel;
    const javCount = player.getJavelinCount();

    document.getElementById('lv-atk').textContent = `Lv. ${atkLv}`;
    document.getElementById('lv-hp').textContent = `Lv. ${hpLv}`;
    document.getElementById('lv-spd').textContent = `Lv. ${spdLv}`;

    document.getElementById('stat-atk').textContent = `Damage: ${player.attackDamage} • ${javCount} Tombak`;
    document.getElementById('stat-hp').textContent = `Max HP: ${player.maxHp}`;
    document.getElementById('stat-spd').textContent = `Kecepatan: ${Math.round((player.moveSpeed / 5.4) * 100)}%`;
    document.getElementById('stat-heal').textContent = `HP: ${Math.ceil(player.hp)} / ${player.maxHp}`;

    const costs = {
        atk: getUpgradeCost('atk'),
        hp: getUpgradeCost('hp'),
        spd: getUpgradeCost('spd'),
        heal: getUpgradeCost('heal')
    };
    ['atk', 'hp', 'spd', 'heal'].forEach(t => {
        document.getElementById(`cost-${t}`).textContent = `${costs[t]} Emas`;
        const btn = document.getElementById(`buy-${t}`);
        btn.disabled = game.gold < costs[t] || (t === 'heal' && player.hp >= player.maxHp);
    });
}

function openShop(betweenStages = false) {
    if (!player) return;
    if (game.state !== 'playing' && !betweenStages) return;
    resetInputKeys();
    game.state = 'shop';
    game.betweenStages = betweenStages;
    document.getElementById('shop-feedback').textContent = '';

    const storyBox = document.getElementById('shop-story-box');
    const closeText = document.getElementById('btn-close-shop-text');
    if (betweenStages) {
        const curStage = STAGES[game.stageIndex];
        storyBox.classList.remove('hidden');
        document.getElementById('shop-story-title').textContent = game.bossRushMode
            ? `BOSS RUSH • ${game.bossRushStep} / ${BOSS_RUSH_STAGES.length} PENGUASA TUMBANG (+90 EMAS)`
            : (curStage.storyTitle || `STAGE ${curStage.id} SELESAI`);
        document.getElementById('shop-story-text').textContent = game.bossRushMode
            ? 'Tempa senjatamu sebelum menghadapi Penguasa Mayat Hidup berikutnya!'
            : (curStage.storyNote || 'Bersiaplah menuju stage berikutnya!');
        const nextIdx = game.bossRushMode
            ? BOSS_RUSH_STAGES[game.bossRushStep]
            : game.stageIndex + 1;
        const nextStage = STAGES[nextIdx];
        closeText.textContent = nextStage ? `LANJUT KE STAGE ${nextStage.id}: ${nextStage.name.toUpperCase()}` : 'LANJUTKAN';
    } else {
        storyBox.classList.add('hidden');
        closeText.textContent = 'LANJUTKAN PERTEMPURAN';
    }

    updateShopUI();
    dom.shopModal.classList.remove('hidden');
}

function closeShop() {
    dom.shopModal.classList.add('hidden');
    if (game.betweenStages) {
        game.betweenStages = false;
        if (game.bossRushMode) {
            loadStage(BOSS_RUSH_STAGES[game.bossRushStep], true, false);
        } else {
            loadStage(game.stageIndex + 1, false, false);
        }
    } else {
        game.state = 'playing';
        updateHUD();
    }
}

function buyUpgrade(type) {
    if (!player) return;
    const cost = getUpgradeCost(type);
    const fb = document.getElementById('shop-feedback');
    if (game.gold < cost) {
        fb.textContent = 'Emas Suci belum mencukupi!';
        return;
    }
    if (type === 'heal' && player.hp >= player.maxHp) {
        fb.textContent = 'Darah Kesatria sudah penuh!';
        return;
    }

    const prevLv = getTotalUpgradeLevel();
    game.gold -= cost;

    if (type === 'atk') {
        game.upgrades.atkLevel++;
        player.applyUpgrades(false);
        fb.textContent = `Pedang ditempa ke Lv.${game.upgrades.atkLevel}! Damage menjadi ${player.attackDamage}.`;
    } else if (type === 'hp') {
        game.upgrades.hpLevel++;
        player.applyUpgrades(true);
        fb.textContent = `Zirah diperkuat ke Lv.${game.upgrades.hpLevel}! Max HP menjadi ${player.maxHp}.`;
    } else if (type === 'spd') {
        game.upgrades.spdLevel++;
        player.applyUpgrades(false);
        fb.textContent = `Ketangkasan meningkat ke Lv.${game.upgrades.spdLevel}! Cooldown lebih singkat.`;
    } else if (type === 'heal') {
        const amt = Math.round(player.maxHp * 0.65);
        player.hp = Math.min(player.maxHp, player.hp + amt);
        fb.textContent = `Eliksir Fajar memulihkan +${amt} HP!`;
    }

    const newLv = getTotalUpgradeLevel();
    if (prevLv < 4 && newLv >= 4) fb.textContent = '★ RELIK BARU AKTIF: SEGEL PETIR SUCI!';
    else if (prevLv < 8 && newLv >= 8) fb.textContent = '★ RELIK BARU AKTIF: CAWAN DARAH SUCI!';
    else if (prevLv < 14 && newLv >= 14) fb.textContent = '★ RELIK BARU AKTIF: MAHKOTA MATAHARI!';

    sfx.play('upgrade');
    saveStageProgress();
    updateShopUI();
    updateHUD();
}

/* ==========================================================================
   PAUSE, ENDING CG, GAME OVER, & VICTORY
   ========================================================================== */
function openPause() {
    if (game.state !== 'playing') return;
    resetInputKeys();
    game.state = 'paused';
    dom.pauseModal.classList.remove('hidden');
}

function resumeGame() {
    if (game.state !== 'paused') return;
    dom.pauseModal.classList.add('hidden');
    game.state = 'playing';
}

function returnToMenu() {
    resetInputKeys();
    hideBanner();
    sfx.stopBGM();
    game.state = 'start';
    document.body.classList.remove('in-ending-cg');
    dom.pauseModal.classList.add('hidden');
    dom.shopModal.classList.add('hidden');
    dom.endModal.classList.add('hidden');
    dom.cgOverlay.classList.add('hidden');
    renderStageSelect();
    dom.startModal.classList.remove('hidden');
}

const CG_SUBTITLES = [
    'Mahkota Raja Lich Agung Azrath hancur berkeping-keping di hadapan cahaya pedang suci...',
    'Kabut wabah yang menyelimuti kerajaan selama bertahun-tahun akhirnya tersapu angin fajar.',
    'Sir Aldric menancapkan pedangnya di puncak tebing, menyaksikan mentari pagi kembali bersinar.',
    'Kedamaian telah kembali. Legenda Kesatria Cahaya akan dikenang sepanjang zaman.'
];

function startEndingCG() {
    resetInputKeys();
    hideBanner();
    game.state = 'ending_cg';
    document.body.classList.add('in-ending-cg');
    endingCG.frame = 0;
    endingCG.finished = false;
    endingCG.subtitleStep = -1;
    endingCG.birds = Array.from({ length: 7 }, (_, i) => ({
        x: 240 + i * 85,
        y: 190 + (i % 3) * 38,
        speed: 1.55 + (i % 3) * 0.35,
        phase: i * 1.1
    }));
    endingCG.embers = Array.from({ length: 24 }, (_, i) => ({
        x: (i * 57) % VIEW_WIDTH,
        y: VIEW_HEIGHT - (i * 29) % 360,
        vy: 0.7 + (i % 4) * 0.35,
        size: 1.8 + (i % 3) * 1.1,
        alpha: 0.35 + (i % 4) * 0.14
    }));

    dom.endModal.classList.add('hidden');
    dom.cgOverlay.classList.remove('hidden');
    document.getElementById('btn-skip-cg-text').textContent = 'Lewati';
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
    for (const em of endingCG.embers) {
        em.y -= em.vy;
        em.x += Math.sin(endingCG.frame * 0.04 + em.size) * 0.5;
        if (em.y < -10) em.y = VIEW_HEIGHT + 10;
    }

    const step = Math.min(CG_SUBTITLES.length - 1, Math.floor((endingCG.frame / endingCG.totalFrames) * CG_SUBTITLES.length));
    if (step !== endingCG.subtitleStep) {
        endingCG.subtitleStep = step;
        dom.cgSubtitle.textContent = CG_SUBTITLES[step];
        if (step === 2) sfx.play('dawn_chord');
    }

    if (endingCG.frame >= endingCG.totalFrames && !endingCG.finished) {
        endingCG.finished = true;
        document.getElementById('btn-skip-cg-text').textContent = 'Lanjut';
        showVictoryModal();
    }
}

function formatDuration(frames) {
    const sec = Math.floor(frames / 60);
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function calcRank() {
    const dmg = game.damageTaken;
    if (dmg <= 140 && game.maxCombo >= 10) return 'S';
    if (dmg <= 360) return 'A';
    if (dmg <= 700) return 'B';
    return 'C';
}

function showVictoryModal() {
    game.state = 'victory';
    document.body.classList.remove('in-ending-cg');
    dom.cgOverlay.classList.add('hidden');
    const rank = calcRank();
    saveBestRecord(game.totalKills, game.totalGoldEarned, !game.bossRushMode, {
        bossRushCleared: game.bossRushMode,
        rank
    });
    if (!game.bossRushMode) clearStageProgress();

    const wrap = document.getElementById('end-icon-wrap');
    wrap.classList.remove('is-defeat');
    document.getElementById('end-icon-win').classList.remove('hidden');
    document.getElementById('end-icon-lose').classList.add('hidden');

    document.getElementById('end-sub').textContent = game.bossRushMode
        ? 'PENAKLUK 9 PENGUASA MAYAT'
        : 'KAMPANYE 30 STAGE SELESAI';
    document.getElementById('end-title').textContent = 'KEMENANGAN CAHAYA!';
    document.getElementById('end-desc').textContent = game.bossRushMode
        ? 'Kesembilan Penguasa Mayat Hidup telah tumbang beruntun di hadapan pedang & perisaimu!'
        : 'Raja Lich Agung Azrath telah disucikan! Kerajaan kembali terang oleh fajar kedamaian.';

    document.getElementById('end-kills').textContent = game.totalKills;
    document.getElementById('end-gold').textContent = game.totalGoldEarned;
    document.getElementById('end-rank').textContent = rank;
    document.getElementById('end-time').textContent = formatDuration(game.elapsedFrames);
    document.getElementById('end-chests').textContent = game.chestsOpened;
    document.getElementById('end-meta-row').classList.remove('hidden');

    const recEl = document.getElementById('end-record');
    recEl.classList.remove('hidden');
    recEl.textContent = `Combo Tertinggi: ${game.maxCombo}x • Total Damage Diterima: ${game.damageTaken}`;

    document.getElementById('btn-retry-stage').classList.add('hidden');
    document.getElementById('btn-replay-cg').classList.remove('hidden');
    dom.endModal.classList.remove('hidden');
    sfx.play('victory');
}

function triggerGameOver() {
    resetInputKeys();
    game.state = 'gameover';
    sfx.stopBGM();
    sfx.play('gameover');
    saveBestRecord(game.totalKills, game.totalGoldEarned, false);

    const wrap = document.getElementById('end-icon-wrap');
    wrap.classList.add('is-defeat');
    document.getElementById('end-icon-win').classList.add('hidden');
    document.getElementById('end-icon-lose').classList.remove('hidden');

    const st = STAGES[game.stageIndex];
    document.getElementById('end-sub').textContent = `GUGUR DI STAGE ${st.id}`;
    document.getElementById('end-title').textContent = 'KESATRIA TUMBANG';
    document.getElementById('end-desc').textContent = `Gerombolan mayat hidup di ${st.name} terlalu ganas. Bangkit kembali, tempa zirahmu, dan gunakan Tangkis Sempurna!`;

    document.getElementById('end-kills').textContent = game.totalKills;
    document.getElementById('end-gold').textContent = game.totalGoldEarned;
    document.getElementById('end-meta-row').classList.add('hidden');
    document.getElementById('end-record').classList.add('hidden');

    document.getElementById('btn-retry-stage').classList.remove('hidden');
    document.getElementById('btn-replay-cg').classList.add('hidden');
    dom.endModal.classList.remove('hidden');
}

/* ==========================================================================
   UPDATE LOOP & HUD SYNC
   ========================================================================== */
function updateHUD() {
    if (!player) return;
    const stage = STAGES[game.stageIndex];
    const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
    const furyPct = Math.max(0, Math.min(100, Math.round(player.fury)));

    setUiText(dom.hpText, 'hpT', `${Math.ceil(player.hp)} / ${player.maxHp}`);
    setUiStyle(dom.hpFill, 'width', 'hpW', `${hpPct.toFixed(1)}%`);
    setUiText(dom.furyText, 'fuT', furyPct >= 100 ? 'SIAP [Q]' : `${furyPct}%`);
    setUiStyle(dom.furyFill, 'width', 'fuW', `${furyPct}%`);
    setUiAttr(dom.furyFill, 'data-ready', 'fuR', furyPct >= 100 ? '1' : '0');
    setUiText(dom.armorBadge, 'arB', `Lv.${getTotalUpgradeLevel()}`);

    const alive = enemies.filter(e => !e.dead).length;
    setUiText(dom.stageName, 'stN', `STAGE ${stage.id} • ${stage.name.toUpperCase()}`);
    setUiText(dom.enemyCount, 'enC', alive > 0 ? `Zombie: ${alive}` : 'Gerbang Terbuka!');
    setUiText(dom.gold, 'gld', String(game.gold));

    if (game.comboCount >= 2) {
        dom.comboPill.classList.remove('hidden');
        setUiText(dom.comboPill, 'cmb', `${game.comboCount}x COMBO`);
    } else {
        dom.comboPill.classList.add('hidden');
    }

    // Boss HUD
    const boss = enemies.find(e => e.isBoss && !e.dead && e.activated);
    if (boss) {
        dom.bossHud.classList.remove('hidden');
        setUiText(dom.bossNameText, 'bNm', boss.bossOpts.name || 'BOSS');
        setUiText(dom.bossPhaseTag, 'bPh', `FASE ${boss.phase}`);
        setUiText(dom.bossHpText, 'bHpT', `${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`);
        setUiStyle(dom.bossHpFill, 'width', 'bHpW', `${Math.max(0, (boss.hp / boss.maxHp) * 100).toFixed(1)}%`);
    } else {
        dom.bossHud.classList.add('hidden');
    }

    // Touch button cooldown & jump pips sync
    setUiAttr(dom.tJump, 'data-jumps', 'tJmp', String(player.jumpsLeft));
    setUiAttr(dom.tUlti, 'data-ready', 'tUR', furyPct >= 100 ? '1' : '0');
    setUiStyle(dom.tUltiFill, 'height', 'tUF', `${furyPct}%`);

    const shCd = player.shieldCooldown > 0;
    setUiAttr(dom.tShield, 'data-cooldown', 'tSC', shCd ? '1' : '0');
    setUiStyle(dom.tShieldFill, 'height', 'tSF', `${Math.round((1 - player.shieldCooldown / player.shieldMaxCooldown) * 100)}%`);
    setUiStyle(dom.tShieldCd, 'display', 'tSCD', shCd ? 'flex' : 'none');
    if (shCd) setUiText(dom.tShieldCd, 'tSCT', (player.shieldCooldown / 60).toFixed(1));

    const jvCd = player.javelinCooldown > 0;
    setUiAttr(dom.tJavelin, 'data-cooldown', 'tJC', jvCd ? '1' : '0');
    setUiStyle(dom.tJavelinFill, 'height', 'tJF', `${Math.round((1 - player.javelinCooldown / player.javelinMaxCooldown) * 100)}%`);
    setUiStyle(dom.tJavelinCd, 'display', 'tJCD', jvCd ? 'flex' : 'none');
    if (jvCd) setUiText(dom.tJavelinCd, 'tJCT', (player.javelinCooldown / 60).toFixed(1));
}

function updateGame() {
    if (game.state === 'ending_cg') {
        updateEndingCG();
        return;
    }
    if (game.state !== 'playing' || !player) return;

    game.worldTick++;
    game.elapsedFrames++;

    if (game.hitStop > 0) {
        game.hitStop--;
        return;
    }
    if (game.screenShake > 0) {
        game.screenShake = Math.max(0, game.screenShake - 0.65);
    }
    if (game.comboTimer > 0) {
        game.comboTimer--;
        if (game.comboTimer === 0) game.comboCount = 0;
    }

    const stage = STAGES[game.stageIndex];

    // 1. Update Platform Bergerak
    for (const plat of stage.platforms) {
        if (plat.type === 'moving') {
            const prevX = plat.x;
            plat.x += plat.speed * plat.dir;
            if (plat.x <= plat.startX) { plat.x = plat.startX; plat.dir = 1; }
            else if (plat.x >= plat.endX) { plat.x = plat.endX; plat.dir = -1; }
            plat.dx = plat.x - prevX;
        }
    }

    // 2. Update Kesatria
    player.update(stage);
    if (game.state !== 'playing') return;

    // 3. Update Musuh Zombie & Boss
    for (let i = 0; i < enemies.length; i++) {
        enemies[i].update(stage);
    }

    // 4. Update Proyektil Kesatria (Tombak Suci & Gelombang Matahari)
    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
        const pp = playerProjectiles[i];
        pp.x += pp.vx;
        pp.y += pp.vy;
        pp.life--;

        const pb = { x: pp.x - pp.w / 2, y: pp.y - pp.h / 2, w: pp.w, h: pp.h };

        // Tombak dapat menangkis proyektil zombie!
        for (let j = projectiles.length - 1; j >= 0; j--) {
            const ep = projectiles[j];
            if (Math.hypot(ep.x - pp.x, ep.y - pp.y) < ep.r + 18) {
                spawnParticles(ep.x, ep.y, '#fde047', 6);
                triggerParryLightning(ep.x, ep.y);
                projectiles.splice(j, 1);
            }
        }

        for (const en of enemies) {
            if (en.dead || pp.hitIds.has(en.uid)) continue;
            if (rectOverlap(pb, en)) {
                pp.hitIds.add(en.uid);
                en.takeDamage(pp.dmg, pp.facing * 5.5, { fromJavelin: true, isCrit: pp.kind === 'dawn_wave' });
                if (pp.burn) en.burnTimer = 100;
                registerComboHit();
                player.gainFury(5);
                pp.pierce--;
                if (pp.pierce <= 0) {
                    pp.life = 0;
                    break;
                }
            }
        }

        if (pp.life <= 0 || pp.x < -80 || pp.x > stage.worldWidth + 80) {
            playerProjectiles.splice(i, 1);
        }
    }

    // 5. Update Proyektil Zombie & Boss
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.gravity) p.vy += 0.28;
        p.life--;

        // Bom meledak saat menyentuh tanah
        let hitGround = false;
        if (p.kind === 'bomb' && p.vy > 0) {
            for (const plat of stage.platforms) {
                if (p.x >= plat.x && p.x <= plat.x + plat.w && p.y + p.r >= plat.y && p.y <= plat.y + 20) {
                    hitGround = true;
                    break;
                }
            }
        }
        if (hitGround) {
            sfx.play('bomb');
            spawnShockRing(p.x, p.y, 76, '#a3e635', 4);
            spawnParticles(p.x, p.y, '#bef264', 12);
            if (Math.hypot((player.x + player.w / 2) - p.x, (player.y + player.h / 2) - p.y) < 72) {
                player.takeDamage(p.dmg, Math.sign((player.x + player.w / 2) - p.x || 1) * 7);
            }
            projectiles.splice(i, 1);
            continue;
        }

        const pb = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
        if (rectOverlap(pb, player)) {
            player.takeDamage(p.dmg, Math.sign(p.vx || 1) * 6);
            spawnParticles(p.x, p.y, p.color || '#84cc16', 7);
            projectiles.splice(i, 1);
            continue;
        }

        if (p.life <= 0 || p.y > VIEW_HEIGHT + 80) {
            projectiles.splice(i, 1);
        }
    }

    // 6. Koin Emas Suci & Magnet Relik I (Lentera Jiwa)
    const magnetDist = hasRelic('lantern') ? 270 : 110;
    const pcx = player.x + player.w / 2;
    const pcy = player.y + player.h / 2;

    for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        c.life--;
        const d = Math.hypot(pcx - c.x, pcy - c.y);
        if (d < magnetDist) {
            c.x += ((pcx - c.x) / Math.max(1, d)) * 9.5;
            c.y += ((pcy - c.y) / Math.max(1, d)) * 9.5;
        } else {
            c.vy = Math.min(11, c.vy + 0.42);
            c.x += c.vx;
            c.y += c.vy;
            c.vx *= 0.94;
            for (const plat of stage.platforms) {
                if (c.x >= plat.x && c.x <= plat.x + plat.w && c.y + 8 >= plat.y && c.y <= plat.y + 18 && c.vy >= 0) {
                    c.y = plat.y - 8;
                    c.vy *= -0.35;
                }
            }
        }

        if (d < 34) {
            const comboGoldBonus = (hasRelic('lantern') && game.comboCount >= 5) ? 2 : 0;
            const gained = c.value + comboGoldBonus;
            game.gold += gained;
            game.totalGoldEarned += gained;
            sfx.play('coin');
            coins.splice(i, 1);
            continue;
        }
        if (c.life <= 0 || c.y > VIEW_HEIGHT + 80) coins.splice(i, 1);
    }

    // 7. Checkpoint Api Unggun Suci
    for (const cp of checkpoints) {
        if (!cp.activated && Math.abs(pcx - cp.x) < 42 && Math.abs((player.y + player.h) - cp.y) < 55) {
            cp.activated = true;
            player.lastSafeX = cp.x - player.w / 2;
            player.lastSafeY = cp.y - player.h;
            const heal = Math.round(player.maxHp * 0.35);
            player.hp = Math.min(player.maxHp, player.hp + heal);
            sfx.play('checkpoint');
            spawnShockRing(cp.x, cp.y - 24, 58, '#fde047', 4);
            addFloatingText(`API UNGGUN SUCI! +${heal} HP`, cp.x, cp.y - 54, '#fde68a', true);
        }
    }

    // 8. Peti Relik (buka saat tersentuh)
    for (const ch of chests) {
        if (!ch.opened && rectOverlap(player, ch)) {
            openChest(ch);
        }
    }

    // 9. Cek Gerbang Suci / Penyelesaian Stage
    const bossAlive = enemies.some(e => e.isBoss && !e.dead);
    const portalBox = { x: stage.portalX, y: stage.portalY, w: 60, h: 104 };
    if (!bossAlive && rectOverlap(player, portalBox)) {
        completeCurrentStage();
        return;
    }

    // 10. Update Partikel, ShockRing, Petir, Afterimage, & Floating Text
    for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.22;
        pt.life--;
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
    for (let i = afterimages.length - 1; i >= 0; i--) {
        afterimages[i].life--;
        if (afterimages[i].life <= 0) afterimages.splice(i, 1);
    }
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].y -= 1.05;
        floatingTexts[i].life--;
        if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
    }

    // 11. Kamera Halus mengikuti Kesatria
    const targetCam = Math.max(0, Math.min(stage.worldWidth - VIEW_WIDTH, player.x + player.w / 2 - VIEW_WIDTH * 0.42));
    game.cameraX += (targetCam - game.cameraX) * 0.14;

    updateHUD();
}

function completeCurrentStage() {
    sfx.play('victory');
    if (game.bossRushMode) {
        game.bossRushStep++;
        if (game.bossRushStep >= BOSS_RUSH_STAGES.length) {
            startEndingCG();
        } else {
            game.gold += 90;
            game.totalGoldEarned += 90;
            openShop(true);
        }
        return;
    }

    if (game.stageIndex >= STAGES.length - 1) {
        startEndingCG();
    } else {
        unlockStage(game.stageIndex + 2);
        openShop(true);
    }
}

/* ==========================================================================
   GAME LOOP (FIXED TIMESTEP 60FPS — STABIL DI 60Hz / 120Hz / 144Hz)
   ========================================================================== */
const FIXED_STEP = 1000 / 60;
let lastFrameTime = 0;
let accumulator = 0;

function gameLoop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const delta = Math.min(50, timestamp - lastFrameTime);
    lastFrameTime = timestamp;
    accumulator += delta;

    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 3) {
        updateGame();
        accumulator -= FIXED_STEP;
        steps++;
    }

    if (game.state === 'ending_cg') {
        drawEndingCG();
    } else {
        drawGame();
    }
    requestAnimationFrame(gameLoop);
}

/* ==========================================================================
   MENU MULAI, PILIH STAGE BERHALAMAN, & MODE BOSS RUSH
   ========================================================================== */
let stageSelectPage = 0;

function renderStageSelect(preferredPage = null) {
    const unlocked = loadUnlockedStage();
    const saved = loadStageProgress();
    const rec = loadBestRecord();

    const contBtn = document.getElementById('btn-continue-stage');
    if (saved && saved.stageIndex > 0) {
        contBtn.classList.remove('hidden');
        document.getElementById('btn-continue-label').textContent = `Lanjut Stage ${saved.stageIndex + 1}`;
    } else {
        contBtn.classList.add('hidden');
    }

    const recEl = document.getElementById('start-best-record');
    if (rec) {
        recEl.classList.remove('hidden');
        const badges = [];
        if (rec.cleared) badges.push(`Kampanye Tamat (Rank ${rec.bestRank || 'A'})`);
        if (rec.bossRushCleared) badges.push('Penakluk 9 Penguasa');
        badges.push(`Rekor: ${rec.kills} Zombie • ${rec.gold} Emas`);
        recEl.textContent = badges.join(' • ');
    } else {
        recEl.classList.add('hidden');
    }

    const bar = document.getElementById('stage-select-bar');
    const tabsEl = document.getElementById('stage-select-tabs');
    const pillsEl = document.getElementById('stage-select-pills');

    if (unlocked <= 1) {
        bar.classList.add('hidden');
        return;
    }

    bar.classList.remove('hidden');
    const perPage = 6;
    const totalPages = Math.ceil(unlocked / perPage);
    if (preferredPage !== null) stageSelectPage = preferredPage;
    stageSelectPage = Math.max(0, Math.min(totalPages - 1, stageSelectPage));

    if (totalPages > 1) {
        tabsEl.classList.remove('hidden');
        tabsEl.innerHTML = '';
        for (let p = 0; p < totalPages; p++) {
            const sStart = p * perPage + 1;
            const sEnd = Math.min(unlocked, (p + 1) * perPage);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `stage-tab-btn${p === stageSelectPage ? ' active' : ''}`;
            btn.textContent = `${sStart}–${sEnd}`;
            btn.onclick = () => renderStageSelect(p);
            tabsEl.appendChild(btn);
        }
    } else {
        tabsEl.classList.add('hidden');
    }

    pillsEl.innerHTML = '';
    const startIdx = stageSelectPage * perPage;
    const endIdx = Math.min(unlocked, startIdx + perPage);
    for (let i = startIdx; i < endIdx; i++) {
        const st = STAGES[i];
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `stage-pill-btn${st.isBossStage ? ' stage-pill-btn--boss' : ''}`;
        pill.textContent = `${st.isBossStage ? '☠ ' : ''}S${st.id}: ${st.name}`;
        pill.onclick = () => startFromStage(i);
        pillsEl.appendChild(pill);
    }
}

function startFromStage(stageIdx = 0, useSavedProgress = false) {
    sfx.init();
    game.bossRushMode = false;
    game.bossRushStep = 0;

    if (useSavedProgress) {
        const saved = loadStageProgress();
        if (saved) {
            game.gold = saved.gold || 0;
            game.totalGoldEarned = saved.totalGoldEarned || 0;
            game.totalKills = saved.totalKills || 0;
            game.chestsOpened = saved.chestsOpened || 0;
            game.elapsedFrames = saved.elapsedFrames || 0;
            game.upgrades = Object.assign({ atkLevel: 1, hpLevel: 1, spdLevel: 1 }, saved.upgrades);
            loadStage(saved.stageIndex, true, false);
            return;
        }
    }

    // Starter gear proporsional jika memilih langsung stage lanjutan
    const bonusLv = Math.floor(stageIdx / 4);
    game.gold = stageIdx * 20;
    game.totalGoldEarned = game.gold;
    game.totalKills = 0;
    game.chestsOpened = 0;
    game.damageTaken = 0;
    game.elapsedFrames = 0;
    game.comboCount = 0;
    game.maxCombo = 0;
    game.upgrades = {
        atkLevel: 1 + bonusLv,
        hpLevel: 1 + bonusLv,
        spdLevel: 1 + Math.floor(bonusLv * 0.7)
    };
    loadStage(stageIdx, true, false);
}

function startBossRush() {
    sfx.init();
    game.bossRushMode = true;
    game.bossRushStep = 0;
    game.gold = 140;
    game.totalGoldEarned = 140;
    game.totalKills = 0;
    game.chestsOpened = 0;
    game.damageTaken = 0;
    game.elapsedFrames = 0;
    game.comboCount = 0;
    game.maxCombo = 0;
    game.upgrades = { atkLevel: 4, hpLevel: 4, spdLevel: 3 };
    loadStage(BOSS_RUSH_STAGES[0], true, false);
}

/* ==========================================================================
   KONTROL KEYBOARD & LAYAR SENTUH ZERO-LAG
   ========================================================================== */
window.addEventListener('keydown', e => {
    const code = e.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(code)) {
        e.preventDefault();
    }
    sfx.init();

    if (code === 'KeyP' || code === 'Escape') {
        if (game.state === 'playing') openPause();
        else if (game.state === 'paused') resumeGame();
        else if (game.state === 'shop' && !game.betweenStages) closeShop();
        return;
    }
    if (code === 'KeyB') {
        if (game.state === 'playing') openShop(false);
        else if (game.state === 'shop' && !game.betweenStages) closeShop();
        return;
    }
    if (code === 'KeyM') {
        toggleAudioMute();
        return;
    }
    if (game.state !== 'playing') return;

    if (code === 'KeyA' || code === 'ArrowLeft') keys.left = true;
    if (code === 'KeyD' || code === 'ArrowRight') keys.right = true;
    if ((code === 'KeyW' || code === 'ArrowUp') && !e.repeat) keys.jumpPressed = true;
    if ((code === 'KeyJ' || code === 'KeyZ' || code === 'Space') && !e.repeat) keys.attackPressed = true;
    if ((code === 'KeyK' || code === 'KeyX' || code === 'ShiftLeft' || code === 'ShiftRight') && !e.repeat) keys.shieldPressed = true;
    if ((code === 'KeyL' || code === 'KeyC') && !e.repeat) keys.javelinPressed = true;
    if ((code === 'KeyQ' || code === 'KeyE' || code === 'KeyF') && !e.repeat) keys.ultiPressed = true;
});

window.addEventListener('keyup', e => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
});

window.addEventListener('blur', resetInputKeys);
window.onAppPause = function () {
    if (game.state === 'playing') openPause();
};

function toggleAudioMute() {
    sfx.init();
    const muted = sfx.toggleMute();
    document.getElementById('icon-sound-on').classList.toggle('hidden', muted);
    document.getElementById('icon-sound-off').classList.toggle('hidden', !muted);
}

// D-Pad Multi-Touch Geser Halus (bebas lag)
(function initTouchControls() {
    const dpadZone = document.getElementById('dpad-zone');
    const btnLeft = document.getElementById('t-left');
    const btnRight = document.getElementById('t-right');
    let dpadPointerId = null;

    function applyDpad(dir) {
        keys.left = dir < 0;
        keys.right = dir > 0;
        btnLeft.dataset.active = dir < 0 ? '1' : '0';
        btnRight.dataset.active = dir > 0 ? '1' : '0';
    }

    function detectDir(clientX) {
        const lRect = btnLeft.getBoundingClientRect();
        const rRect = btnRight.getBoundingClientRect();
        const mid = (lRect.right + rRect.left) / 2;
        return clientX < mid ? -1 : 1;
    }

    dpadZone.addEventListener('pointerdown', e => {
        e.preventDefault();
        document.body.classList.add('is-touch');
        sfx.init();
        dpadPointerId = e.pointerId;
        applyDpad(detectDir(e.clientX));
    }, { passive: false });

    dpadZone.addEventListener('pointermove', e => {
        if (e.pointerId !== dpadPointerId) return;
        e.preventDefault();
        applyDpad(detectDir(e.clientX));
    }, { passive: false });

    function clearDpad(e) {
        if (dpadPointerId !== null && (!e || e.pointerId === dpadPointerId)) {
            dpadPointerId = null;
            applyDpad(0);
        }
    }

    window.addEventListener('pointerup', clearDpad);
    window.addEventListener('pointercancel', clearDpad);
    inputResetHooks.push(() => { dpadPointerId = null; applyDpad(0); });

    function bindAction(id, onPress) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('pointerdown', e => {
            e.preventDefault();
            document.body.classList.add('is-touch');
            sfx.init();
            el.dataset.active = '1';
            if (game.state === 'playing') onPress();
        }, { passive: false });
        const release = () => { el.dataset.active = '0'; };
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
        el.addEventListener('pointerleave', release);
    }

    bindAction('t-attack', () => { keys.attackPressed = true; });
    bindAction('t-jump', () => { keys.jumpPressed = true; });
    bindAction('t-shield', () => { keys.shieldPressed = true; });
    bindAction('t-javelin', () => { keys.javelinPressed = true; });
    bindAction('t-ulti', () => { keys.ultiPressed = true; });
})();

/* ==========================================================================
   BINDING TOMBOL UI & INISIALISASI
   ========================================================================== */
document.getElementById('btn-start-game').onclick = () => startFromStage(0, false);
document.getElementById('btn-continue-stage').onclick = () => startFromStage(0, true);
document.getElementById('btn-boss-rush').onclick = () => startBossRush();
document.getElementById('btn-open-shop').onclick = () => openShop(false);
document.getElementById('btn-close-shop').onclick = () => closeShop();
document.getElementById('btn-mute').onclick = () => toggleAudioMute();
document.getElementById('btn-pause').onclick = () => openPause();
document.getElementById('btn-resume-game').onclick = () => resumeGame();
document.getElementById('btn-pause-restart').onclick = () => loadStage(game.stageIndex, true, true);
document.getElementById('btn-pause-menu').onclick = () => returnToMenu();
document.getElementById('btn-retry-stage').onclick = () => loadStage(game.stageIndex, true, true);
document.getElementById('btn-play-again').onclick = () => returnToMenu();
document.getElementById('btn-replay-cg').onclick = () => startEndingCG();
document.getElementById('btn-skip-cg').onclick = () => showVictoryModal();

document.getElementById('buy-atk').onclick = () => buyUpgrade('atk');
document.getElementById('buy-hp').onclick = () => buyUpgrade('hp');
document.getElementById('buy-spd').onclick = () => buyUpgrade('spd');
document.getElementById('buy-heal').onclick = () => buyUpgrade('heal');

// Expose clean state inspection hook for automated verification
window.__KVZ_APP__ = {
    getState: () => ({
        state: game.state,
        stageIndex: game.stageIndex,
        stageCount: STAGES.length,
        bossRushCount: BOSS_RUSH_STAGES.length,
        gold: game.gold,
        totalKills: game.totalKills,
        player: player ? {
            x: Math.round(player.x),
            y: Math.round(player.y),
            hp: Math.round(player.hp),
            maxHp: player.maxHp,
            fury: Math.round(player.fury),
            atk: player.attackDamage,
            javelins: player.getJavelinCount(),
            tier: player.getArmorTier()
        } : null,
        enemiesAlive: enemies.filter(e => !e.dead).length,
        bossAlive: enemies.some(e => e.isBoss && !e.dead)
    }),
    loadStageForTest: (idx) => {
        game.bossRushMode = false;
        game.gold = 500;
        game.upgrades = { atkLevel: 6, hpLevel: 5, spdLevel: 4 };
        loadStage(idx, true, false);
        const boss = enemies.find(e => e.isBoss);
        if (boss && player) {
            player.x = boss.arenaMinX + 120;
            player.y = 540;
            player.fury = 100;
            boss.activated = true;
            game.cameraX = Math.max(0, Math.min(STAGES[idx].worldWidth - VIEW_WIDTH, player.x - 240));
            updateHUD();
        }
    },
    triggerUltiForTest: () => {
        if (player) {
            player.fury = 100;
            player.performUltimate();
            updateHUD();
        }
    },
    openShopForTest: () => openShop(false),
    startEndingCGForTest: () => startEndingCG(),
    showVictoryForTest: () => showVictoryModal(),
    stages: STAGES
};

window.addEventListener('load', () => {
    // Render latar belakang stage 1 di balik modal menu awal
    bgProps = buildBgProps(STAGES[0]);
    player = new Knight(140, 548);
    enemies = [
        new Zombie('shambler', 520, 554, 1),
        new Zombie('armored', 760, 546, 1),
        new Zombie('spitter', 980, 556, 1)
    ];
    renderStageSelect();
    requestAnimationFrame(gameLoop);
});

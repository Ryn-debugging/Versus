/* ==========================================================================
   DATA 30 STAGE CAMPAIGN (6 BABAK), 15 BIOMA GOTHIC, & 9 BOSS MAYAT HIDUP
   ========================================================================== */

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;

const BIOMES = {
    graveyard: {
        skyTop: '#090d14', skyBottom: '#1c2633',
        groundColor: '#1b221e', groundTop: '#364a3b',
        platColor: '#292d33', platTop: '#525861',
        ambientColor: '#d9c698', weather: 'mist', moonType: 'full'
    },
    village: {
        skyTop: '#170a09', skyBottom: '#3b1914',
        groundColor: '#261a16', groundTop: '#523428',
        platColor: '#36231c', platTop: '#784a34',
        ambientColor: '#fb923c', weather: 'ember', moonType: 'amber'
    },
    cathedral: {
        skyTop: '#0d0c12', skyBottom: '#261e24',
        groundColor: '#232026', groundTop: '#4c4652',
        platColor: '#302c36', platTop: '#6b6275',
        ambientColor: '#f5c451', weather: 'ember', moonType: 'full'
    },
    catacomb: {
        skyTop: '#08090c', skyBottom: '#1a1e24',
        groundColor: '#1d2026', groundTop: '#3e444f',
        platColor: '#292e38', platTop: '#586273',
        ambientColor: '#cbd5e1', weather: 'dust', moonType: 'none'
    },
    plague_marsh: {
        skyTop: '#07110b', skyBottom: '#162b1c',
        groundColor: '#152417', groundTop: '#3c6e2f',
        platColor: '#223324', platTop: '#65a30d',
        ambientColor: '#84cc16', weather: 'spore', moonType: 'sickly'
    },
    ossuary: {
        skyTop: '#120b0c', skyBottom: '#2e1a1c',
        groundColor: '#292221', groundTop: '#5e504b',
        platColor: '#38302e', platTop: '#87766e',
        ambientColor: '#f59e0b', weather: 'dust', moonType: 'blood'
    },
    blood_bridge: {
        skyTop: '#180609', skyBottom: '#451219',
        groundColor: '#26171a', groundTop: '#5c2b33',
        platColor: '#361f24', platTop: '#803b45',
        ambientColor: '#ef4444', weather: 'ember', moonType: 'blood'
    },
    necrotower: {
        skyTop: '#071211', skyBottom: '#122e2b',
        groundColor: '#162424', groundTop: '#2d5754',
        platColor: '#1f3333', platTop: '#3d7a74',
        ambientColor: '#2dd4bf', weather: 'spore', moonType: 'eclipse'
    },
    cursed_woods: {
        skyTop: '#0a0f0e', skyBottom: '#1b2b26',
        groundColor: '#19241f', groundTop: '#355444',
        platColor: '#24332c', platTop: '#4c7861',
        ambientColor: '#a3e635', weather: 'spore', moonType: 'full'
    },
    sulfur_mine: {
        skyTop: '#141008', skyBottom: '#332510',
        groundColor: '#261f14', groundTop: '#695322',
        platColor: '#362d1c', platTop: '#9c7d32',
        ambientColor: '#facc15', weather: 'ember', moonType: 'none'
    },
    frozen_crypt: {
        skyTop: '#08121c', skyBottom: '#18334a',
        groundColor: '#162836', groundTop: '#4a7fa3',
        platColor: '#1f384a', platTop: '#7dd3fc',
        ambientColor: '#7dd3fc', weather: 'snow', moonType: 'ice'
    },
    alchemy_foundry: {
        skyTop: '#120d0a', skyBottom: '#2d1e15',
        groundColor: '#241c18', groundTop: '#594235',
        platColor: '#332822', platTop: '#85604b',
        ambientColor: '#f97316', weather: 'ember', moonType: 'none'
    },
    storm_spire: {
        skyTop: '#080e17', skyBottom: '#1b2b40',
        groundColor: '#1a222e', groundTop: '#425570',
        platColor: '#263242', platTop: '#647d9e',
        ambientColor: '#38bdf8', weather: 'storm', moonType: 'full'
    },
    eclipse_temple: {
        skyTop: '#0c0809', skyBottom: '#2b1616',
        groundColor: '#211919', groundTop: '#593e36',
        platColor: '#302422', platTop: '#8c624d',
        ambientColor: '#f59e0b', weather: 'ember', moonType: 'eclipse'
    },
    lich_throne: {
        skyTop: '#070a0d', skyBottom: '#1c2420',
        groundColor: '#171c1b', groundTop: '#465e4d',
        platColor: '#222b28', platTop: '#d4a24c',
        ambientColor: '#f6cc68', weather: 'astral', moonType: 'eclipse_gold'
    }
};

function placeZombie(type, x, surfaceY, bossOpts = null) {
    const heights = {
        shambler: 56,
        runner: 52,
        spitter: 54,
        armored: 64,
        bloater: 66,
        necromancer: 60,
        wraith: 48,
        boss: 112
    };
    const h = heights[type] || 56;
    const entry = { type, x, y: surfaceY - h };
    if (bossOpts) entry.bossOpts = bossOpts;
    return entry;
}

/**
 * Membangun stage kampanye dengan geometri terukur dan 100% dapat dilalui
 */
function buildCampaignStage(cfg) {
    const biome = BIOMES[cfg.bgStyle] || BIOMES.graveyard;
    const hasBoss = !!cfg.boss;
    const segments = cfg.segments || (hasBoss ? 4 : 5);
    const platforms = [];
    const spikes = [];
    const springs = [];
    const chests = [];
    const checkpoints = [];
    const enemies = [];

    let cursorX = 0;
    const groundY = 610;

    // Segmen awal aman untuk spawn Kesatria
    const startW = 680;
    platforms.push({ x: 0, y: groundY, w: startW, h: 140, type: 'ground' });
    platforms.push({ x: 290, y: 490, w: 200, h: 24, type: 'plat' });
    enemies.push(placeZombie(cfg.pool[0], 500, groundY));
    cursorX = startW;

    for (let s = 0; s < segments; s++) {
        const gapW = (s % 2 === 0) ? 145 : 175;
        const segW = 640 + ((s * 83 + cfg.id * 41) % 210);
        const gapStart = cursorX;
        cursorX += gapW;

        // Jembatan / platform bantu melintasi jurang
        if (cfg.movingPlats && s % 2 === 1) {
            platforms.push({
                x: gapStart - 10,
                y: 495,
                w: 140,
                h: 22,
                type: 'moving',
                startX: gapStart - 15,
                endX: gapStart + gapW - 45,
                speed: 1.55 + Math.min(1.1, cfg.id * 0.03),
                dir: 1
            });
        } else {
            platforms.push({
                x: gapStart - 20,
                y: 490 - (s % 2) * 20,
                w: gapW + 40,
                h: 24,
                type: 'plat'
            });
        }

        // Daratan segmen ini
        const segX = cursorX;
        platforms.push({ x: segX, y: groundY, w: segW, h: 140, type: 'ground' });

        // Platform bertingkat di atas segmen
        const lowPlatX = segX + 90;
        const lowPlatW = 210;
        const lowPlatY = 485 - ((s + cfg.id) % 2) * 22;
        platforms.push({ x: lowPlatX, y: lowPlatY, w: lowPlatW, h: 24, type: 'plat' });

        const highPlatX = segX + Math.min(segW - 250, 340);
        const highPlatW = 210;
        const highPlatY = 375 - ((s + cfg.id) % 2) * 18;
        platforms.push({ x: highPlatX, y: highPlatY, w: highPlatW, h: 24, type: 'plat' });

        // Batu Pegas Suci (Holy Spring) pada stage dengan mekanik pegas
        if (cfg.hasSprings && s % 2 === 0) {
            springs.push({ x: segX + 40, y: groundY - 18, w: 48, h: 18, _bounce: 0 });
        }

        // Jebakan Duri Tulang di area aman jauh dari tepi spawn/checkpoint
        if (s > 0 || cfg.id >= 2) {
            const spikeX = segX + Math.floor(segW * 0.56);
            spikes.push({ x: spikeX, y: groundY - 20, w: 72, h: 20 });
        }

        // Checkpoint di tengah stage
        if (s === Math.floor(segments / 2)) {
            checkpoints.push({ x: segX + 125, y: groundY });
        }

        // Peti Relik (2 peti per stage reguler, 1 peti di stage boss)
        if (s === 0 || (!hasBoss && s === segments - 1)) {
            chests.push({ x: highPlatX + highPlatW / 2 - 22, y: highPlatY });
        }

        // Penempatan gerombolan zombie variatif sesuai pool stage
        const e1 = cfg.pool[(s + 0) % cfg.pool.length];
        const e2 = cfg.pool[(s + 1) % cfg.pool.length];
        const e3 = cfg.pool[(s + 2) % cfg.pool.length];

        enemies.push(placeZombie(e1, segX + 210, groundY));
        enemies.push(placeZombie(e2, lowPlatX + 95, lowPlatY));
        if (e3 === 'wraith') {
            enemies.push({ type: 'wraith', x: highPlatX + 80, y: highPlatY - 105 });
        } else {
            enemies.push(placeZombie(e3, highPlatX + 100, highPlatY));
        }
        if (segW > 700) {
            const e4 = cfg.pool[(s + 3) % cfg.pool.length];
            enemies.push(placeZombie(e4, segX + segW - 140, groundY));
        }

        cursorX += segW;
    }

    let portalX = cursorX - 150;
    let portalY = groundY - 104;

    if (hasBoss) {
        // Arena Boss Megah + Checkpoint sebelum Arena + 2 Platform Taktis
        const arenaGap = 135;
        platforms.push({ x: cursorX - 15, y: 495, w: arenaGap + 30, h: 24, type: 'plat' });
        cursorX += arenaGap;
        const arenaX = cursorX;
        const arenaW = 1140;
        platforms.push({ x: arenaX, y: groundY, w: arenaW, h: 140, type: 'ground' });
        // 2 Platform Taktis & 1 Batu Pegas di arena boss
        platforms.push({ x: arenaX + 170, y: 465, w: 210, h: 24, type: 'plat' });
        platforms.push({ x: arenaX + arenaW - 380, y: 465, w: 210, h: 24, type: 'plat' });
        platforms.push({ x: arenaX + arenaW / 2 - 115, y: 360, w: 230, h: 24, type: 'plat' });
        springs.push({ x: arenaX + 100, y: groundY - 18, w: 48, h: 18, _bounce: 0 });
        checkpoints.push({ x: arenaX + 42, y: groundY });

        const bOpts = Object.assign({
            arenaMinX: arenaX + 40,
            arenaMaxX: arenaX + arenaW - 60
        }, cfg.boss);
        enemies.push(placeZombie('boss', arenaX + arenaW - 260, groundY, bOpts));

        portalX = arenaX + arenaW - 115;
        portalY = groundY - 104;
        cursorX = arenaX + arenaW;
    }

    return {
        id: cfg.id,
        act: cfg.act,
        bgStyle: cfg.bgStyle,
        bgmPattern: cfg.bgmPattern,
        name: cfg.name,
        subtitle: cfg.subtitle,
        desc: cfg.desc,
        storyTitle: cfg.storyTitle,
        storyNote: cfg.storyNote,
        isBossStage: hasBoss,
        worldWidth: cursorX + 40,
        skyTop: biome.skyTop,
        skyBottom: biome.skyBottom,
        groundColor: biome.groundColor,
        groundTop: biome.groundTop,
        platColor: biome.platColor,
        platTop: biome.platTop,
        ambientColor: biome.ambientColor,
        weather: biome.weather,
        moonType: biome.moonType,
        platforms,
        spikes,
        springs,
        chests,
        checkpoints,
        enemies,
        portalX,
        portalY
    };
}

// ==========================================================================
// DEFINISI 30 STAGE PENUH (BABAK I – BABAK VI)
// ==========================================================================
const STAGE_CONFIGS = [
    // --- BABAK I: WABAH PERBATASAN (Stage 1–3) ---
    {
        id: 1, act: 'BABAK I', bgStyle: 'graveyard', bgmPattern: 0,
        name: 'Pemakaman Berkabut',
        subtitle: 'STAGE 1 • PERBATASAN KUBURAN',
        desc: 'Tumpas zombie yang bangkit dari liang lahat dan capai Gerbang Suci di ujung timur!',
        storyTitle: 'BABAK I • SUMPAH KESATRIA CAHAYA',
        storyNote: 'Kabut wabah meluas dari Pemakaman Lama menuju Desa Oakhaven. Pedang baja Sir Aldric baru saja terhunus.',
        segments: 4, movingPlats: false, hasSprings: false,
        pool: ['shambler', 'shambler', 'spitter', 'runner']
    },
    {
        id: 2, act: 'BABAK I', bgStyle: 'village', bgmPattern: 1,
        name: 'Desa Terbakar',
        subtitle: 'STAGE 2 • RERUNTUHAN OAKHAVEN',
        desc: 'Waspadai Zombie Pelari yang gesit dan Peludah Asam di atas atap desa yang membara!',
        storyTitle: 'LONCENG KATEDRAL BERGEMA',
        storyNote: 'Warga berhasil dievakuasi. Dari balik asap merah, menara Katedral Tua menjulang tempat Algojo Wabah menunggu.',
        segments: 4, movingPlats: false, hasSprings: true,
        pool: ['shambler', 'runner', 'spitter', 'runner']
    },
    {
        id: 3, act: 'BABAK I', bgStyle: 'cathedral', bgmPattern: 2,
        name: 'Gerbang Katedral Tua',
        subtitle: 'STAGE 3 • BOSS BABAK I',
        desc: 'Kalahkan Algojo Wabah Morghul untuk menyucikan Gerbang Katedral!',
        storyTitle: 'KATEDRAL DISUCIKAN',
        storyNote: 'Morghul tumbang! Namun tangga batu di bawah altar terbuka menuju Katakomba Bawah Tanah yang dipenuhi pasukan tengkorak.',
        segments: 2, movingPlats: false, hasSprings: true,
        pool: ['shambler', 'spitter', 'armored'],
        boss: {
            id: 'morghul',
            name: 'ALGOJO WABAH MORGHUL',
            title: 'Penjaga Katedral Busuk',
            hp: 560, dmg: 22, speed: 2.8, phases: 2,
            accent: '#84cc16', cloak: '#4d7c0f', weapon: 'cleaver',
            summonType: 'shambler'
        }
    },

    // --- BABAK II: KATAKOMBA & RAWA BUSUK (Stage 4–6) ---
    {
        id: 4, act: 'BABAK II', bgStyle: 'catacomb', bgmPattern: 3,
        name: 'Katakomba Bawah Tanah',
        subtitle: 'STAGE 4 • LORONG TENGKORAK',
        desc: 'Manfaatkan platform batu bergerak dan gunakan Serbuan Perisai untuk menembus Kesatria Tengkorak!',
        storyTitle: 'BABAK II • KEDALAMAN KATAKOMBA',
        storyNote: 'Lorong bawah tanah menembus ke rawa hijau beracun. Bau belerang dan wabah pekat menyelimuti udara.',
        segments: 4, movingPlats: true, hasSprings: false,
        pool: ['armored', 'spitter', 'shambler', 'runner']
    },
    {
        id: 5, act: 'BABAK II', bgStyle: 'plague_marsh', bgmPattern: 4,
        name: 'Rawa Wabah Hijau',
        subtitle: 'STAGE 5 • KABUT BERACUN',
        desc: 'Hindari ledakan Zombie Peledak (Bloater) dan manfaatkan Tebas Pogo melawan Hantu Kuburan!',
        storyTitle: 'KUBAH TULANG DI DEPAN MATA',
        storyNote: 'Di jantung rawa berdiri Kubah Tulang Belulang, markas Panglima Tengkorak Vaelor.',
        segments: 4, movingPlats: true, hasSprings: true,
        pool: ['bloater', 'spitter', 'wraith', 'runner']
    },
    {
        id: 6, act: 'BABAK II', bgStyle: 'ossuary', bgmPattern: 2,
        name: 'Kubah Tulang Belulang',
        subtitle: 'STAGE 6 • BOSS BABAK II',
        desc: 'Hadapi Panglima Tengkorak Vaelor & pasukan pengawal tulangnya!',
        storyTitle: 'GERBANG BULAN DARAH TERBUKA',
        storyNote: 'Zirah besi Vaelor hancur berkeping-keping. Di langit utara, Bulan Darah terbit di atas Jembatan Merah.',
        segments: 2, movingPlats: true, hasSprings: true,
        pool: ['armored', 'bloater', 'spitter'],
        boss: {
            id: 'vaelor',
            name: 'PANGLIMA TENGKORAK VAELOR',
            title: 'Komandan Legiun Tulang',
            hp: 820, dmg: 26, speed: 3.2, phases: 2,
            accent: '#f59e0b', cloak: '#7f1d1d', weapon: 'greatsword',
            summonType: 'armored'
        }
    },

    // --- BABAK III: BENTENG BULAN DARAH (Stage 7–8) ---
    {
        id: 7, act: 'BABAK III', bgStyle: 'blood_bridge', bgmPattern: 5,
        name: 'Jembatan Bulan Darah',
        subtitle: 'STAGE 7 • BENTENG MERAH',
        desc: 'Lompati jurang dengan Batu Pegas Suci dan bungkam Dukun Nekromanser sebelum memanggil zombie baru!',
        storyTitle: 'BABAK III • MENARA NEKROMANSI',
        storyNote: 'Di ujung jembatan menjulang Menara Nekromansi tempat Adipati Wabah Malgrim merapal mantra kematian.',
        segments: 5, movingPlats: true, hasSprings: true,
        pool: ['necromancer', 'bloater', 'runner', 'armored']
    },
    {
        id: 8, act: 'BABAK III', bgStyle: 'necrotower', bgmPattern: 6,
        name: 'Menara Nekromansi',
        subtitle: 'STAGE 8 • BOSS 3 FASE',
        desc: 'Tangkis bola roh Adipati Wabah Malgrim dan hentikan ritual wabah 3 fasenya!',
        storyTitle: 'SEGEL WABAH PERTAMA PECAH',
        storyNote: 'Malgrim musnah dalam cahaya suci, namun peta kuno mengungkap sumber wabah sejati: Nekropolis Raja Lich di utara!',
        segments: 2, movingPlats: true, hasSprings: true,
        pool: ['necromancer', 'wraith', 'armored'],
        boss: {
            id: 'malgrim',
            name: 'ADIPATI WABAH MALGRIM',
            title: 'Tuan Ritual Nekromansi',
            hp: 1120, dmg: 29, speed: 3.3, phases: 3,
            accent: '#2dd4bf', cloak: '#115e59', weapon: 'staff',
            summonType: 'runner'
        }
    },

    // --- BABAK IV: HUTAN TERKUTUK & TAMBANG ROH (Stage 9–14) ---
    {
        id: 9, act: 'BABAK IV', bgStyle: 'cursed_woods', bgmPattern: 7,
        name: 'Hutan Gantung',
        subtitle: 'STAGE 9 • LENTERA ARWAH',
        desc: 'Susuri pepohonan mati yang dihuni Hantu Kuburan dan Zombie Pelari ganas.',
        storyTitle: 'BABAK IV • PERJALANAN KE UTARA',
        storyNote: 'Di balik kabut hutan terkutuk berdiri Biara Sunyi yang dahulu menjadi benteng Ordo Cahaya.',
        segments: 4, movingPlats: false, hasSprings: true,
        pool: ['runner', 'wraith', 'spitter', 'shambler']
    },
    {
        id: 10, act: 'BABAK IV', bgStyle: 'cathedral', bgmPattern: 7,
        name: 'Biara Sunyi',
        subtitle: 'STAGE 10 • KACA PATRI RETAK',
        desc: 'Bersihkan aula biara suci dari Kesatria Tengkorak dan Dukun Nekromanser.',
        storyTitle: 'RELIK BIARA TERJAGA',
        storyNote: 'Lonceng Biara kembali berdentang suci. Jalan rahasia menuju Tambang Belerang terbuka.',
        segments: 4, movingPlats: true, hasSprings: false,
        pool: ['armored', 'necromancer', 'wraith', 'spitter']
    },
    {
        id: 11, act: 'BABAK IV', bgStyle: 'sulfur_mine', bgmPattern: 8,
        name: 'Tambang Belerang',
        subtitle: 'STAGE 11 • TEROWONGAN BARA',
        desc: 'Waspadai Zombie Peledak di rel tambang sempit dan kumpulkan emas dari Peti Relik!',
        storyTitle: 'GEMURUH DARI LUBANG JAGAL',
        storyNote: 'Tanah bergetar hebat—Raksasa Busuk Zarkoth mengamuk di dasar tambang belerang!',
        segments: 5, movingPlats: true, hasSprings: true,
        pool: ['bloater', 'armored', 'runner', 'spitter']
    },
    {
        id: 12, act: 'BABAK IV', bgStyle: 'sulfur_mine', bgmPattern: 6,
        name: 'Lubang Jagal Zarkoth',
        subtitle: 'STAGE 12 • BOSS BABAK IV',
        desc: 'Tumbangkan Raksasa Busuk Zarkoth dengan lompatan taktis dan Perisai Tangkis Sempurna!',
        storyTitle: 'RAKSASA TAMBANG TUMBANG',
        storyNote: 'Zarkoth lenyap dalam api pemurnian. Angin dingin menusuk tulang menyambut di Tebing Angin Mati.',
        segments: 2, movingPlats: true, hasSprings: true,
        pool: ['bloater', 'armored', 'runner'],
        boss: {
            id: 'zarkoth',
            name: 'RAKSASA BUSUK ZARKOTH',
            title: 'Abominasi Tambang Belerang',
            hp: 1420, dmg: 32, speed: 3.0, phases: 3,
            accent: '#facc15', cloak: '#713f12', weapon: 'hammer',
            summonType: 'bloater'
        }
    },
    {
        id: 13, act: 'BABAK IV', bgStyle: 'storm_spire', bgmPattern: 8,
        name: 'Tebing Angin Mati',
        subtitle: 'STAGE 13 • JURANG BADAI',
        desc: 'Kuasai pijakan udara dan pogo tebasan melawan kawanan Hantu Kuburan!',
        storyTitle: 'MENUJU DATARAN BEKU',
        storyNote: 'Salju pertama jatuh di helm baja Sir Aldric. Gerbang Es Makam telah terlihat di kejauhan.',
        segments: 5, movingPlats: true, hasSprings: true,
        pool: ['wraith', 'spitter', 'runner', 'necromancer']
    },
    {
        id: 14, act: 'BABAK IV', bgStyle: 'frozen_crypt', bgmPattern: 9,
        name: 'Gerbang Es Makam',
        subtitle: 'STAGE 14 • PERBATASAN SALJU',
        desc: 'Terobos garis pertahanan pasukan mayat beku di gerbang utara!',
        storyTitle: 'BABAK V • WILAYAH MAKAM BEKU',
        storyNote: 'Di balik gerbang es membentang Danau Es Arwah tempat ribuan prajurit kuno terperangkap kutukan.',
        segments: 4, movingPlats: true, hasSprings: false,
        pool: ['armored', 'runner', 'spitter', 'wraith']
    },

    // --- BABAK V: MAKAM BEKU & BENTENG BESI (Stage 15–20) ---
    {
        id: 15, act: 'BABAK V', bgStyle: 'frozen_crypt', bgmPattern: 9,
        name: 'Danau Es Arwah',
        subtitle: 'STAGE 15 • KRISTAL BEKU',
        desc: 'Lompati pilar es di atas jurang dan tangkis rentetan mantra Nekromanser!',
        storyTitle: 'BADAI SALJU MEMUNCAK',
        storyNote: 'Jejak zirah es memimpin menuju Lembah Salju Merah yang dijaga ketat.',
        segments: 5, movingPlats: true, hasSprings: true,
        pool: ['necromancer', 'wraith', 'armored', 'spitter']
    },
    {
        id: 16, act: 'BABAK V', bgStyle: 'frozen_crypt', bgmPattern: 9,
        name: 'Lembah Salju Merah',
        subtitle: 'STAGE 16 • PENYERGAPAN SALJU',
        desc: 'Tahan serbuan cepat Zombie Pelari & Peledak sebelum mencapai Benteng Beku Drakmor.',
        storyTitle: 'BENTENG BEKU DRAKMOR',
        storyNote: 'Kesatria Es Drakmor—mantan paladin yang jatuh ke kegelapan—menunggu duel terhormat di puncak benteng.',
        segments: 5, movingPlats: true, hasSprings: true,
        pool: ['runner', 'bloater', 'armored', 'necromancer']
    },
    {
        id: 17, act: 'BABAK V', bgStyle: 'frozen_crypt', bgmPattern: 6,
        name: 'Benteng Beku Drakmor',
        subtitle: 'STAGE 17 • BOSS BABAK V-A',
        desc: 'Bebaskan jiwa Kesatria Es Drakmor dalam duel pedang & tombak es 3 fase!',
        storyTitle: 'KEHORMATAN PALADIN DIPULIHKAN',
        storyNote: 'Sebelum sirna, Drakmor membisikkan lokasi Pabrik Alkimia Wabah yang memproduksi pasukan tak berujung.',
        segments: 2, movingPlats: true, hasSprings: true,
        pool: ['armored', 'wraith', 'necromancer'],
        boss: {
            id: 'drakmor',
            name: 'KESATRIA ES DRAKMOR',
            title: 'Paladin Jatuh Utara',
            hp: 1750, dmg: 34, speed: 3.6, phases: 3,
            accent: '#38bdf8', cloak: '#0c4a6e', weapon: 'greatsword',
            summonType: 'wraith'
        }
    },
    {
        id: 18, act: 'BABAK V', bgStyle: 'alchemy_foundry', bgmPattern: 10,
        name: 'Pabrik Alkimia Wabah',
        subtitle: 'STAGE 18 • TUNGKU BERACUN',
        desc: 'Hancurkan penjaga tungku wabah dan waspadai ledakan beruntun Zombie Bloater!',
        storyTitle: 'TUNGKU WABAH DIHANCURKAN',
        storyNote: 'Asap hijau membubung tinggi saat tungku alkimia runtuh. Di atasnya membentang Jembatan Rantai Besi.',
        segments: 5, movingPlats: true, hasSprings: true,
        pool: ['bloater', 'spitter', 'necromancer', 'armored']
    },
    {
        id: 19, act: 'BABAK V', bgStyle: 'alchemy_foundry', bgmPattern: 10,
        name: 'Jembatan Rantai Besi',
        subtitle: 'STAGE 19 • BENTENG PERANG',
        desc: 'Lintasi jembatan rantai bergerak di atas jurang bara menuju Benteng Korgath!',
        storyTitle: 'GERBANG BENTENG KORGATH',
        storyNote: 'Meriam tulang berdentum. Jenderal Mayat Korgath memimpin barisan terkuat pasukan zombie!',
        segments: 5, movingPlats: true, hasSprings: true,
        pool: ['armored', 'bloater', 'wraith', 'runner']
    },
    {
        id: 20, act: 'BABAK V', bgStyle: 'alchemy_foundry', bgmPattern: 12,
        name: 'Benteng Perang Korgath',
        subtitle: 'STAGE 20 • BOSS 3 FASE',
        desc: 'Tundukkan Jenderal Mayat Korgath dan buka jalan menuju Langit Badai Nekropolis!',
        storyTitle: 'BABAK VI • MENUJU NEKROPOLIS',
        storyNote: 'Benteng besi runtuh! Petir menyambar Menara Petir Hitam yang menjadi gerbang terakhir menuju Raja Lich.',
        segments: 2, movingPlats: true, hasSprings: true,
        pool: ['armored', 'bloater', 'necromancer'],
        boss: {
            id: 'korgath',
            name: 'JENDERAL MAYAT KORGATH',
            title: 'Panglima Pengepungan Besi',
            hp: 2100, dmg: 36, speed: 3.3, phases: 3,
            accent: '#f97316', cloak: '#7c2d12', weapon: 'hammer',
            summonType: 'armored'
        }
    },

    // --- BABAK VI: LANGIT BADAI & TAHTA RAJA LICH (Stage 21–30) ---
    {
        id: 21, act: 'BABAK VI', bgStyle: 'storm_spire', bgmPattern: 11,
        name: 'Menara Petir Hitam',
        subtitle: 'STAGE 21 • BADAI NEKROPOLIS',
        desc: 'Tembus hujan badai dan kawanan Hantu Kuburan di puncak menara!',
        storyTitle: 'DI ATAS AWAN BADAI',
        storyNote: 'Dari menara petir, Kawah Abu Neraka membara terang di kaki gunung kematian.',
        segments: 5, movingPlats: true, hasSprings: true,
        pool: ['wraith', 'necromancer', 'runner', 'armored']
    },
    {
        id: 22, act: 'BABAK VI', bgStyle: 'village', bgmPattern: 11,
        name: 'Kawah Abu Neraka',
        subtitle: 'STAGE 22 • BARA KUTUKAN',
        desc: 'Lompati celah bara api dan tumpas legiun Peledak & Kesatria Tengkorak!',
        storyTitle: 'KUIL GERHANA TERLIHAT',
        storyNote: 'Matahari menghitam di balik gerhana abadi. Kuil Gerhana Hitam berdiri angkuh di puncak tebing.',
        segments: 5, movingPlats: true, hasSprings: true,
        pool: ['bloater', 'armored', 'spitter', 'runner']
    },
    {
        id: 23, act: 'BABAK VI', bgStyle: 'eclipse_temple', bgmPattern: 11,
        name: 'Kuil Gerhana Hitam',
        subtitle: 'STAGE 23 • ALTAR DARAH',
        desc: 'Bersihkan pelataran kuil gerhana sebelum berhadapan dengan Pangeran Vampir Vexar!',
        storyTitle: 'TAKHTA BAYANGAN VEXAR',
        storyNote: 'Kelopak mawar hitam berhamburan—Pangeran Vampir Vexar turun dari kubah gerhana!',
        segments: 5, movingPlats: true, hasSprings: true,
        pool: ['necromancer', 'wraith', 'armored', 'runner']
    },
    {
        id: 24, act: 'BABAK VI', bgStyle: 'eclipse_temple', bgmPattern: 12,
        name: 'Takhta Bayangan Vexar',
        subtitle: 'STAGE 24 • BOSS 3 FASE',
        desc: 'Kalahkan Pangeran Vampir Vexar yang menyerang cepat dari kegelapan!',
        storyTitle: 'GERHANA MULAI RETAK',
        storyNote: 'Cahaya emas menembus awan hitam saat Vexar lenyap. Jembatan Awan Kematian terbentang menuju istana langit.',
        segments: 2, movingPlats: true, hasSprings: true,
        pool: ['wraith', 'necromancer', 'runner'],
        boss: {
            id: 'vexar',
            name: 'PANGERAN VAMPIR VEXAR',
            title: 'Penguasa Darah Gerhana',
            hp: 2480, dmg: 38, speed: 4.0, phases: 3,
            accent: '#ef4444', cloak: '#7f1d1d', weapon: 'cleaver',
            summonType: 'wraith'
        }
    },
    {
        id: 25, act: 'BABAK VI', bgStyle: 'storm_spire', bgmPattern: 11,
        name: 'Jembatan Awan Kematian',
        subtitle: 'STAGE 25 • LINTASAN LANGIT',
        desc: 'Jaga keseimbangan di atas platform melayang dan gunakan Tombak Fajar!',
        storyTitle: 'BENTENG LANGIT RUNTUH',
        storyNote: 'Pilar marmer kuno melayang di udara—saksi bisu perang besar seribu tahun lalu.',
        segments: 5, movingPlats: true, hasSprings: true,
        pool: ['wraith', 'spitter', 'armored', 'necromancer']
    },
    {
        id: 26, act: 'BABAK VI', bgStyle: 'ossuary', bgmPattern: 10,
        name: 'Benteng Langit Runtuh',
        subtitle: 'STAGE 26 • GARDA TULANG',
        desc: 'Tembus barisan elit Kesatria Tengkorak dan Dukun Nekromanser penjaga koridor.',
        storyTitle: 'KORIDOR WAKTU MATI',
        storyNote: 'Jam pasir emas raksasa berhenti berputar. Hanya tinggal dua penjaga sebelum Tahta Raja Lich.',
        segments: 5, movingPlats: true, hasSprings: true,
        pool: ['armored', 'necromancer', 'bloater', 'wraith']
    },
    {
        id: 27, act: 'BABAK VI', bgStyle: 'necrotower', bgmPattern: 11,
        name: 'Koridor Waktu Mati',
        subtitle: 'STAGE 27 • LORONG ABADI',
        desc: 'Gunakan seluruh Relik Pusaka & combo suci untuk melibas barisan mayat elit!',
        storyTitle: 'TAHTA PENJAGA ARWAH',
        storyNote: 'Penjaga Jiwa Morvath mengangkat sabit rohnya di ujung koridor abadi.',
        segments: 5, movingPlats: true, hasSprings: true,
        pool: ['necromancer', 'armored', 'runner', 'bloater']
    },
    {
        id: 28, act: 'BABAK VI', bgStyle: 'necrotower', bgmPattern: 12,
        name: 'Tahta Penjaga Arwah',
        subtitle: 'STAGE 28 • BOSS 3 FASE',
        desc: 'Tumbangkan Penjaga Jiwa Morvath untuk membuka Gerbang Nekropolis Agung!',
        storyTitle: 'GERBANG NEKROPOLIS TERBUKA',
        storyNote: 'Sabit Morvath hancur. Di depan mata terbentang tangga megah menuju tahta Raja Lich Agung Azrath.',
        segments: 2, movingPlats: true, hasSprings: true,
        pool: ['necromancer', 'wraith', 'armored'],
        boss: {
            id: 'morvath',
            name: 'PENJAGA JIWA MORVATH',
            title: 'Penuai Koridor Abadi',
            hp: 2850, dmg: 40, speed: 3.9, phases: 3,
            accent: '#34d399', cloak: '#064e3b', weapon: 'staff',
            summonType: 'necromancer'
        }
    },
    {
        id: 29, act: 'BABAK VI', bgStyle: 'lich_throne', bgmPattern: 12,
        name: 'Gerbang Nekropolis Agung',
        subtitle: 'STAGE 29 • UJIAN TERAKHIR',
        desc: 'Terobos garda kehormatan Raja Lich dan kumpulkan Semangat Suci untuk duel puncak!',
        storyTitle: 'MENJELANG FAJAR TERAKHIR',
        storyNote: 'Pintu obsidian terbuka lebar. Raja Lich Agung Azrath bangkit dari tahtanya—nasib seluruh kerajaan ditentukan sekarang!',
        segments: 5, movingPlats: true, hasSprings: true,
        pool: ['armored', 'necromancer', 'bloater', 'wraith', 'runner']
    },
    {
        id: 30, act: 'BABAK VI', bgStyle: 'lich_throne', bgmPattern: 13,
        name: 'Tahta Raja Lich — Fajar Terakhir',
        subtitle: 'STAGE 30 • TRUE FINAL BOSS',
        desc: 'Kalahkan Raja Lich Agung Azrath dalam pertempuran 3 fase dan kembalikan Fajar Kerajaan Cahaya!',
        storyTitle: 'FAJAR KERAJAAN CAHAYA',
        storyNote: 'Mahkota kutukan hancur berkeping-keping. Matahari fajar kembali menyinari negeri yang merdeka dari wabah!',
        segments: 2, movingPlats: true, hasSprings: true,
        pool: ['armored', 'necromancer', 'wraith'],
        boss: {
            id: 'azrath',
            name: 'RAJA LICH AGUNG AZRATH',
            title: 'Maharaja Kematian Abadi',
            hp: 3600, dmg: 44, speed: 4.1, phases: 3,
            accent: '#f6cc68', cloak: '#1e293b', weapon: 'lich_scepter',
            summonType: 'armored',
            isFinalBoss: true
        }
    }
];

const STAGES = STAGE_CONFIGS.map(buildCampaignStage);
const BOSS_RUSH_STAGES = [2, 5, 7, 11, 16, 19, 23, 27, 29]; // 9 Stage Penguasa Mayat Hidup

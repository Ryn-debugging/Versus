/* ==========================================================================
   DATA MEDAN PERANG, 10 MALAM PENGEPUNGAN, 5 BOSS EPIK, & 12 KARTU BERKAH
   ========================================================================== */

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;
const WORLD_WIDTH = 1920;
const GROUND_Y = 604;
const GATE_X = 212;

// 2 Platform Taktis di Halaman Benteng (Menara Kayu & Jembatan Batu) untuk Earthshaker Slam
const ARENA_PLATFORMS = [
    { x: 350, y: 458, w: 300, h: 20, style: 'wood' },
    { x: 960, y: 458, w: 310, h: 20, style: 'stone' }
];

// 12 Kartu Berkah Roguelike yang saling bersinergi!
const BLESSINGS = [
    {
        id: 'flame_blade',
        tag: 'PEDANG',
        name: 'Pedang Api Suci',
        desc: 'Tebasan membakar zombie. Zombie yang tumbang saat terbakar meledak melukai gerombolan di sekitar!'
    },
    {
        id: 'thunder_hammer',
        tag: 'PALU',
        name: 'Palu Halilintar',
        desc: 'Setiap benturan Palu Boomerang menyambar musuh dengan Petir Emas dari langit!'
    },
    {
        id: 'twin_hammer',
        tag: 'PALU',
        name: 'Palu Boomerang Kembar',
        desc: 'Melempar 2 Palu Suci sekaligus dengan jangkauan lebih jauh & cooldown lebih singkat.'
    },
    {
        id: 'royal_archers',
        tag: 'BENTENG',
        name: 'Pemanah Api Menara',
        desc: 'Tambah +2 Pemanah Elit di atas benteng yang menghujani zombie dengan panah api!'
    },
    {
        id: 'trebuchet',
        tag: 'BENTENG',
        name: 'Ketapel Api Raksasa',
        desc: 'Benteng melontarkan Batu Bara Api raksasa secara berkala yang meledak hebat di tengah gerombolan!'
    },
    {
        id: 'vanguard_squad',
        tag: 'PASUKAN',
        name: 'Barisan Pengawal Baja',
        desc: 'Kerahkan +2 Prajurit Pengawal berpedang yang berpatroli dan menebas zombie di depan gerbang!'
    },
    {
        id: 'thorn_shield',
        tag: 'PERISAI',
        name: 'Perisai Duri Pembalas',
        desc: 'Menahan serangan dengan Perisai memantulkan 130% damage & men-stun zombie penyerang!'
    },
    {
        id: 'vampiric_edge',
        tag: 'PEMULIHAN',
        name: 'Cawan Cahaya Suci',
        desc: 'Setiap zombie tumbang memulihkan +4% HP Sir Aldric dan memperbaiki +12 HP Gerbang Benteng.'
    },
    {
        id: 'earthshaker',
        tag: 'SLAM',
        name: 'Gelombang Gempa Fajar',
        desc: 'Hantaman Tanah (Lompat+Tebas) & Combo ke-3 memicu gelombang api menjalar di sepanjang jalan batu!'
    },
    {
        id: 'oil_barrels',
        tag: 'JEBAKAN',
        name: 'Gudang Tong Minyak',
        desc: 'Pasang +2 Tong Minyak Peledak tiap malam dengan radius & damage ledakan +55%!'
    },
    {
        id: 'golden_horn',
        tag: 'ULTI',
        name: 'Kavaleri Fajar Ganda',
        desc: 'Serbuan Kavaleri memanggil barisan kuda 2x lipat & langsung memulihkan +25% HP Gerbang!'
    },
    {
        id: 'crusader_haste',
        tag: 'KETANGKASAN',
        name: 'Semangat Perang Salib',
        desc: 'Kecepatan gerak & ayunan pedang +20%, serta pengisian Terompet Kavaleri +35% lebih cepat!'
    }
];

// 10 Malam Kampanye Pertahanan Benteng (dengan transisi atmosfer Senja -> Malam Badai -> Bulan Darah -> Gerhana Emas!)
const NIGHTS = [
    {
        night: 1,
        name: 'Kabut Pemakaman',
        eyebrow: 'MALAM 1 • SENJA PERTAMA',
        desc: 'Mayat hidup mulai merangkak keluar dari tanah! Gunakan Perisai [K] untuk menangkis & Palu Boomerang [L]!',
        skyTop: '#161b2e', skyMid: '#372c3e', skyBot: '#6b4238',
        moonColor: '#f6d89c', moonType: 'full', weather: 'mist', bgm: 0,
        totalEnemies: 14, spawnInterval: 95, maxAlive: 6, barrels: 2,
        pool: ['walker', 'walker', 'ghoul']
    },
    {
        night: 2,
        name: 'Serbuan Pembawa Wabah',
        eyebrow: 'MALAM 2 • LONCENG BAHAYA',
        desc: 'Waspadai Pembawa Tong Wabah & Pemanah Tengkorak! Pantulkan panah mereka dengan Parry Perisai!',
        skyTop: '#101626', skyMid: '#242538', skyBot: '#473335',
        moonColor: '#e8d7b0', moonType: 'full', weather: 'ember', bgm: 1,
        totalEnemies: 19, spawnInterval: 84, maxAlive: 7, barrels: 2,
        pool: ['walker', 'ghoul', 'crossbow', 'keg_carrier']
    },
    {
        night: 3,
        name: 'Gerbang Berdarah',
        eyebrow: 'MALAM 3 • BOSS PENGEPUNGAN I',
        desc: 'Algojo Pendobrak Morghul mengamuk menuju gerbang dengan gada raksasa! Hentikan dia!',
        skyTop: '#0d1322', skyMid: '#1c2538', skyBot: '#312b38',
        moonColor: '#facc15', moonType: 'full', weather: 'storm', bgm: 4,
        totalEnemies: 15, spawnInterval: 92, maxAlive: 6, barrels: 3,
        pool: ['walker', 'ghoul', 'crossbow', 'keg_carrier'],
        boss: {
            id: 'morghul',
            name: 'ALGOJO PENDOBRAK MORGHUL',
            hp: 920, dmg: 24, gateDmg: 36, speed: 2.0, phases: 2,
            accent: '#84cc16', armor: '#3f3f46', weapon: 'ram_cleaver'
        }
    },
    {
        night: 4,
        name: 'Barisan Baja Mati',
        eyebrow: 'MALAM 4 • LEGIUN BESI KARAT',
        desc: 'Kesatria Busuk berperisai maju! Pecahkan perisai mereka dengan Slam (Lompat+Tebas) atau Palu Suci!',
        skyTop: '#1a0e0e', skyMid: '#3b1c17', skyBot: '#612919',
        moonColor: '#fb923c', moonType: 'amber', weather: 'ember', bgm: 1,
        totalEnemies: 23, spawnInterval: 78, maxAlive: 8, barrels: 3,
        pool: ['walker', 'rot_knight', 'crossbow', 'ghoul', 'keg_carrier']
    },
    {
        night: 5,
        name: 'Langit Petir Terkutuk',
        eyebrow: 'MALAM 5 • BOSS PENGEPUNGAN II',
        desc: 'Panglima Tengkorak Vaelor memimpin barisan tengkorak di tengah badai petir!',
        skyTop: '#08101c', skyMid: '#15243b', skyBot: '#293b52',
        moonColor: '#bae6fd', moonType: 'full', weather: 'storm', bgm: 4,
        totalEnemies: 18, spawnInterval: 84, maxAlive: 7, barrels: 3,
        pool: ['rot_knight', 'crossbow', 'ghoul', 'walker'],
        boss: {
            id: 'vaelor',
            name: 'PANGLIMA TENGKORAK VAELOR',
            hp: 1380, dmg: 28, gateDmg: 42, speed: 2.5, phases: 2,
            accent: '#f59e0b', armor: '#27272a', weapon: 'greatsword'
        }
    },
    {
        night: 6,
        name: 'Kabut Nekromansi',
        eyebrow: 'MALAM 6 • MANTRA KUBURAN',
        desc: 'Pendeta Nekromanser memanggil cakar kubur dari bawah kakimu! Bungkam mereka cepat!',
        skyTop: '#07130d', skyMid: '#122b1d', skyBot: '#224528',
        moonColor: '#a3e635', moonType: 'sickly', weather: 'spore', bgm: 2,
        totalEnemies: 26, spawnInterval: 74, maxAlive: 8, barrels: 3,
        pool: ['necromancer', 'keg_carrier', 'rot_knight', 'ghoul', 'crossbow']
    },
    {
        night: 7,
        name: 'Badai Salju Makam',
        eyebrow: 'MALAM 7 • BOSS PENGEPUNGAN III',
        desc: 'Kesatria Es Drakmor—mantan paladin kerajaan—menyerbu benteng di tengah badai salju!',
        skyTop: '#07111e', skyMid: '#122b44', skyBot: '#274d6b',
        moonColor: '#e0f2fe', moonType: 'ice', weather: 'snow', bgm: 4,
        totalEnemies: 20, spawnInterval: 80, maxAlive: 7, barrels: 3,
        pool: ['rot_knight', 'necromancer', 'crossbow', 'ghoul'],
        boss: {
            id: 'drakmor',
            name: 'KESATRIA ES DRAKMOR',
            hp: 1850, dmg: 31, gateDmg: 46, speed: 2.9, phases: 3,
            accent: '#38bdf8', armor: '#1e3a5f', weapon: 'greatsword'
        }
    },
    {
        night: 8,
        name: 'Bulan Darah Membara',
        eyebrow: 'MALAM 8 • PENGEPUNGAN TOTAL',
        desc: 'Bulan Darah menyala merah! Seluruh jenis mayat hidup menyerbu serentak—kerahkan Kavaleri Fajar!',
        skyTop: '#1c0609', skyMid: '#471018', skyBot: '#7a1f24',
        moonColor: '#ef4444', moonType: 'blood', weather: 'ember', bgm: 3,
        totalEnemies: 32, spawnInterval: 64, maxAlive: 10, barrels: 4,
        pool: ['ghoul', 'rot_knight', 'keg_carrier', 'crossbow', 'necromancer']
    },
    {
        night: 9,
        name: 'Panglima Gerhana Darah',
        eyebrow: 'MALAM 9 • BOSS PENGEPUNGAN IV',
        desc: 'Adipati Vampir Vexar melesat cepat di bawah gerhana darah! Siapkan Tangkis Balasmu!',
        skyTop: '#14060b', skyMid: '#30101b', skyBot: '#541b25',
        moonColor: '#f87171', moonType: 'eclipse', weather: 'ember', bgm: 4,
        totalEnemies: 22, spawnInterval: 72, maxAlive: 8, barrels: 4,
        pool: ['ghoul', 'necromancer', 'rot_knight', 'keg_carrier'],
        boss: {
            id: 'vexar',
            name: 'ADIPATI DARAH VEXAR',
            hp: 2350, dmg: 34, gateDmg: 50, speed: 3.4, phases: 3,
            accent: '#ef4444', armor: '#450a0a', weapon: 'ram_cleaver'
        }
    },
    {
        night: 10,
        name: 'Fajar Terakhir Kerajaan',
        eyebrow: 'MALAM 10 • TRUE FINAL BOSS',
        desc: 'Raja Lich Agung Azrath turun langsung menghancurkan Benteng! Tumbangkan dia untuk membawa Fajar!',
        skyTop: '#080b10', skyMid: '#1c2120', skyBot: '#3b3324',
        moonColor: '#f8d274', moonType: 'eclipse_gold', weather: 'astral', bgm: 5,
        totalEnemies: 24, spawnInterval: 70, maxAlive: 8, barrels: 4,
        pool: ['rot_knight', 'necromancer', 'crossbow', 'keg_carrier', 'ghoul'],
        boss: {
            id: 'azrath',
            name: 'RAJA LICH AGUNG AZRATH',
            hp: 3200, dmg: 38, gateDmg: 58, speed: 3.1, phases: 3,
            accent: '#f8d274', armor: '#1c1917', weapon: 'lich_scepter',
            isFinalBoss: true
        }
    }
];

function getNightConfig(nightNum) {
    if (nightNum <= NIGHTS.length) return NIGHTS[nightNum - 1];
    // Endless Blood Moon Mode (Malam 11+)
    const extra = nightNum - NIGHTS.length;
    const base = NIGHTS[(nightNum - 1) % NIGHTS.length];
    const isBossNight = nightNum % 2 === 1;
    const bossPool = [NIGHTS[2].boss, NIGHTS[4].boss, NIGHTS[6].boss, NIGHTS[8].boss, NIGHTS[9].boss];
    const tplBoss = bossPool[extra % bossPool.length];
    return {
        night: nightNum,
        name: `Bulan Darah ke-${nightNum}`,
        eyebrow: `MALAM ABADI ${nightNum} • SURVIVAL`,
        desc: isBossNight
            ? 'Penguasa Mayat Hidup bangkit kembali lebih kuat di bawah Bulan Darah!'
            : 'Gerombolan tanpa akhir menyerbu Benteng Kerajaan!',
        skyTop: base.skyTop, skyMid: base.skyMid, skyBot: base.skyBot,
        moonColor: '#ef4444', moonType: isBossNight ? 'eclipse_gold' : 'blood',
        weather: base.weather, bgm: isBossNight ? 5 : 3,
        totalEnemies: 26 + extra * 5,
        spawnInterval: Math.max(38, 66 - extra * 3),
        maxAlive: Math.min(13, 8 + Math.floor(extra / 2)),
        barrels: 4,
        pool: ['ghoul', 'rot_knight', 'keg_carrier', 'crossbow', 'necromancer'],
        boss: isBossNight ? Object.assign({}, tplBoss, {
            hp: Math.round(2800 + extra * 520),
            dmg: Math.round(36 + extra * 3),
            gateDmg: Math.round(52 + extra * 5)
        }) : null
    };
}

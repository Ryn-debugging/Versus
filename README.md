# ⚔️ Kesatria Cahaya vs Zombie

**Kesatria Cahaya vs Zombie** adalah game **2D Action Platformer** berbasis **HTML5 Canvas** yang 100% *self-contained* & offline (tanpa ketergantungan CDN/internet), dengan dukungan penuh **Keyboard (PC/Laptop)** dan **Layar Sentuh Multi-Touch (HP/Tablet)**.

---

## 🎮 Cara Bermain

Buka langsung file [`index.html`](index.html) di browser modern apa pun (Chrome, Edge, Firefox, Safari, maupun WebView Android) — tidak perlu koneksi internet atau instalasi server.

### Kontrol Permainan

| Aksi | Keyboard (PC) | Layar Sentuh (HP/Tablet) |
|---|---|---|
| **Gerak Kiri / Kanan** | `A` / `D` atau `←` / `→` | D-Pad `◀` / `▶` (geser jari mulus) |
| **Lompat / Double Jump** | `W` / `↑` | Tombol `LOMPAT` + indikator *2 Pip* |
| **Tebas Pedang (3-Hit Combo & Pogo)** | `J` / `Z` / `Spasi` | Tombol `TEBAS` |
| **Serbuan Perisai & Tangkis Sempurna** | `K` / `X` / `Shift` | Tombol `PERISAI` |
| **Lempar Tombak Suci (x1 / x2 / x3)** | `L` / `C` | Tombol `TOMBAK` |
| **Penghakiman Fajar (ULTI)** | `Q` / `E` / `F` | Tombol `ULTI` saat Semangat 100% |
| **Pandai Besi / Tempaan & Relik** | `B` atau tombol `TEMPA` | Sentuh tombol `TEMPA` (HUD Atas) |
| **Jeda / Mute Audio** | `P` / `Esc` & `M` | Tombol di HUD Kanan Atas |

---

## ✨ Fitur Utama

- **Mekanik Tempur Kesatria Sejati:**
  - **Kombo 3 Tebasan Pedang Suci:** Ayunan horizontal, tebasan balik, dan *Overhead Holy Cleave* (Combo ke-3) yang memicu gelombang kejut emas.
  - **Serbuan Perisai & Tangkis Sempurna (*Shield Bash & Perfect Parry*):** Meluncur cepat ke depan menabrak & men-stun zombie (memecahkan perisai Kesatria Tengkorak!). Menangkis serangan atau proyektil pada 12 frame awal memicu **TANGKIS SEMPURNA** (+5% HP, +22% Semangat, potong cooldown 50%, & memicu Petir Suci!).
  - **Evolusi Tombak Suci (*Holy Javelin*):** Pedang Lv.1–3 = 1 Tombak; Lv.4–6 = **2 Tombak Kembar**; Lv.7+ = **3 Trident Fajar** yang membakar zombie dengan *Holy Burn*!
  - **Tebas Pogo Udara (*Aerial Smite Bounce*):** Menebas zombie atau proyektil saat turun di udara memantulkan Sir Aldric ke atas dan memulihkan 1 lompatan udara.
  - **Penghakiman Fajar (*ULTI*):** Pilar cahaya langit 360° yang menyucikan proyektil musuh & menghanguskan seluruh mayat hidup di sekitar.
- **4 Relik Pusaka Kesatria (Aktif Otomatis di Pandai Besi):**
  1. **Lentera Jiwa (Lv.1+):** Radius magnet emas diperluas (`270px`) + bonus emas saat combo aktif.
  2. **Segel Petir Suci (Lv.4+):** Menangkis proyektil menyambar zombie terdekat dengan **Halilintar Emas Zig-Zag** (`60% ATK`).
  3. **Cawan Darah Suci (Lv.8+):** Menumbangkan zombie memulihkan `+4% Max HP` secara instan.
  4. **Mahkota Matahari (Lv.14+):** Regenerasi Semangat pasif + **ULTI** memulihkan `+18% Max HP` dan menembakkan **2 Gelombang Cahaya Matahari** ke kiri & kanan layar!
- **30 Stage Campaign (6 Babak) + 15 Bioma Gothic + 9 Boss Mayat Hidup:**
  - 7 tipe musuh unik (*Zombie Pejalan, Pelari, Peludah Asam, Kesatria Tengkorak, Zombie Peledak/Bloater, Dukun Nekromanser, & Hantu Kuburan*).
  - 9 Boss multi-fase hingga **True Final Boss: Raja Lich Agung Azrath** (Stage 30).
  - **Mode Boss Rush (9 Penguasa Beruntun)** dengan perlengkapan awal *Pemburu Boss* dan bonus `+90 Emas` antar-boss.
- **Radar Progres Stage 2D, Audio Sintetis 14 Pola BGM, & Animasi CG Ending:**
  - Radar 2D *real-time* di bawah layar (posisi Kesatria, Api Unggun Checkpoint, Peti Relik, Zombie/Boss, dan Gerbang Suci).
  - 14 pola musik gothic/medieval sintetis + 22 efek suara 100% offline via Web Audio API.
  - Animasi 2D **CG Ending: Fajar Kerajaan Cahaya** + fitur *Putar CG Ending*, *Pilih Stage Terbuka Berhalaman*, dan *Lanjut Stage Terakhir* (`localStorage`).

---

## 🛠️ Struktur & Pengembangan

```text
Versus/
├── index.html          # Versi final single-file 100% self-contained & offline
├── src/
│   ├── template.html   # Struktur HTML & ikon SVG inline
│   ├── styles.css      # Design system Vanilla CSS + responsif mobile 800x360
│   └── js/
│       ├── audio.js    # Mesin audio sintetis Web Audio (14 BGM + 22 SFX)
│       ├── stages.js   # 30 Stage, 15 Bioma, & 9 Boss Mayat Hidup
│       ├── player.js   # Sir Aldric (Kesatria Cahaya) & mekanik tempur
│       ├── enemies.js  # 7 tipe Zombie & AI Boss Multi-Fase
│       ├── renderer.js # Renderer 2D parallax, cuaca, radar, & CG Ending
│       └── main.js     # Fixed-timestep loop, Pandai Besi, Save, & Touch/Keyboard
└── scripts/
    ├── build.mjs       # Bundler zero-dependency ke index.html
    ├── test-logic.mjs  # Validator sintaks, jangkauan lompatan, & 30 stage
    └── test-browser.mjs# Verifikasi E2E & visual Headless Chromium
```

### Build & Verifikasi Lokal

```bash
node scripts/build.mjs
node scripts/test-logic.mjs
node scripts/test-browser.mjs
```

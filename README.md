# ⚔️ Kesatria Cahaya vs Zombie

**Kesatria Cahaya vs Zombie** adalah game **2D Action Platformer** berbasis **HTML5 Canvas** yang 100% *self-contained* & offline, sekaligus dibungkus menjadi aplikasi **Android APK native (Signed Release APK)** dengan mode layar penuh (*Immersive Landscape*), kontrol layar sentuh multi-touch, dan efek audio sintetis tanpa ketergantungan internet.

---

## 📱 Download APK Android

Unduh file APK versi terbaru (**v1.0.0 - Signed Release APK**) melalui tautan berikut:

👉 **[Download KesatriaVsZombie.apk (v1.0.0)](https://github.com/Ryn-debugging/Versus/releases/latest/download/KesatriaVsZombie.apk)**

atau lihat semua rilis di halaman **[GitHub Releases](https://github.com/Ryn-debugging/Versus/releases/latest)** dan build otomatis di tab **Actions**.

### 📲 Cara Install di HP Android
1. Unduh file **`KesatriaVsZombie.apk`** melalui browser.
2. Buka **Pengelola File / File Manager** → folder **Download**, lalu ketuk **`KesatriaVsZombie.apk`**.
3. Jika diminta izin keamanan, aktifkan **"Izinkan dari sumber ini"** (*Install from Unknown Sources*).
4. Jika muncul peringatan Google Play Protect, ketuk **"Detail selengkapnya"** → **"Tetap instal"**.
5. Buka **Kesatria vs Zombie** dan mainkan **100% offline**!

> Atau langsung buka [`index.html`](index.html) di browser PC/HP mana pun tanpa server!

---

## 🎮 Kontrol Permainan

| Aksi | Keyboard (PC) | Layar Sentuh (Android) |
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
  - Kompatibel dengan **Android 5.0 (Lollipop) hingga Android 15** (`minSdk 21`, signed v1+v2+v3).

---

## 🚀 Build APK Sendiri (Lokal)

1. Pastikan telah terinstall **Node.js 20+**, **JDK 17**, dan **Android SDK (Platform 34, Build-Tools 34.0.0)**.
2. Clone repository:
   ```bash
   git clone https://github.com/Ryn-debugging/Versus.git
   cd Versus
   ```
3. Build & validasi bundle HTML5 + sinkronkan aset WebView:
   ```bash
   node scripts/build.mjs
   node scripts/test-logic.mjs
   ```
4. Jalankan Gradle wrapper untuk membangun Signed Release APK:
   ```bash
   ./gradlew assembleRelease
   ```
5. File APK akan berada di:
   ```
   app/build/outputs/apk/release/app-release.apk
   ```

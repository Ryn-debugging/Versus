# ⚔️ Kesatria Benteng: Perang Zombie (v2.0.0)

**Kesatria Benteng: Perang Zombie** adalah game **2D Castle Siege & Horde Action RPG** berbasis **HTML5 Canvas** (100% *self-contained* & offline) yang dibungkus menjadi **Signed Release APK Android** (`minSdk 21`, Android 5.0–15, Fullscreen Immersive Landscape).

Berbeda total dari game platformer biasa — di sini kamu memimpin pertahanan **Gerbang Benteng Kerajaan** dari kepungan mayat hidup yang merangkak keluar dari tanah kuburan, dibantu **Pemanah Menara**, **Prajurit Pengawal**, **Ketapel Api**, **Tong Minyak Peledak**, serta sistem **Draft Kartu Berkah Roguelike** setiap malam!

---

## 📱 Download APK Android (v2.0.0)

👉 **[Download KesatriaVsZombie.apk (v2.0.0)](https://github.com/Ryn-debugging/Versus/releases/latest/download/KesatriaVsZombie.apk)**

atau lihat semua rilis di **[GitHub Releases](https://github.com/Ryn-debugging/Versus/releases/latest)**.

### 📲 Cara Install di HP Android
1. Unduh **`KesatriaVsZombie.apk`** melalui browser.
2. Buka **File Manager** → folder **Download**, lalu ketuk **`KesatriaVsZombie.apk`**.
3. Aktifkan **"Izinkan dari sumber ini"** (*Install from Unknown Sources*) jika diminta.
4. Jika muncul peringatan Play Protect, ketuk **"Detail selengkapnya"** → **"Tetap instal"**.
5. Mainkan **100% offline** — atau buka langsung [`index.html`](index.html) di browser PC/HP!

---

## 🎮 Kontrol Permainan

| Aksi | Keyboard (PC) | Layar Sentuh (Android) |
|---|---|---|
| **Gerak Kiri / Kanan** | `A` / `D` atau `←` / `→` | D-Pad `◀` / `▶` (geser jari mulus) |
| **Lompat / Naik Menara** | `W` / `↑` | Tombol `LOMPAT` |
| **Tebas Pedang Besar / Plunge Slam** | `J` / `Z` / `Spasi` *(di udara = Hantaman Gempa!)* | Tombol `TEBAS` |
| **Tahan Perisai & Tangkis Balas (Parry)** | **Tahan** `K` / `X` / `Shift` | **Tahan** tombol `PERISAI` |
| **Lempar Palu Boomerang Suci** | `L` / `C` | Tombol `PALU` |
| **Serbuan Kavaleri Fajar (ULTI)** | `Q` / `E` / `F` saat 100% | Tombol `KAVALERI` saat menyala emas |
| **Jeda / Mute Audio** | `P` / `Esc` & `M` | Tombol di HUD Kanan Atas |

---

## ✨ Fitur Utama (v2.0.0 — Castle Siege Overhaul)

- **Pertahanan Benteng Kerajaan 2.5D:**
  - Pertahankan **Gerbang Benteng** di sisi kiri halaman sambil bertempur di jalan batu bertingkat (*Menara Kayu* & *Jembatan Batu*) lengkap dengan **Obor Api Additive**, **Tong Minyak Peledak** yang memicu reaksi berantai, dan mayat hidup yang **bangkit langsung dari gundukan kubur**!
  - **Pasukan Sekutu Aktif:** Rekrut hingga **6 Pemanah Kerajaan** di atas tembok benteng (menembakkan panah api melengkung), **5 Prajurit Pengawal Pedang** yang bertarung di sisi Sir Aldric, dan **Ketapel Api Raksasa (Trebuchet)**!
- **Mekanik Tempur Kesatria Sejati:**
  - **Tahan Perisai (*Hold-to-Guard*) & Tangkis Balas (*Perfect Parry*):** Tahan `PERISAI` untuk menahan 82% serangan depan. Mengangkat perisai tepat saat serangan/panah datang memicu **TANGKIS BALAS** — membekukan waktu, **memantulkan panah tengkorak balik ke gerombolan**, men-stun musuh, dan mengubah tebasan berikutnya menjadi **Eksekusi Crit 2.2×**!
  - **Hantaman Gempa (*Earthshaker Slam*):** Tekan `TEBAS` saat melayang di udara untuk menghunjam lurus ke jalan batu dan memecahkan perisai musuh dalam ledakan AOE!
  - **Palu Boomerang Suci:** Dilempar berputar menembus barisan zombie lalu meluncur kembali ke tangan Sir Aldric sambil menghantam ulang seluruh musuh di jalurnya!
  - **Serbuan Kavaleri Fajar (*ULTI*):** Tiup terompet perang untuk memanggil barisan **Kuda Perang Spektral Emas** menerjang keluar dari Gerbang melibas seluruh medan tempur sekaligus memulihkan Sir Aldric & Gerbang!
- **Dewan Perang Roguelike (12 Kartu Berkah + Perkuat Benteng):**
  - Setiap malam bertahan, pilih **1 dari 3 Kartu Berkah Gratis** (*Pedang Api Suci, Palu Halilintar, Palu Kembar, Pemanah Api Menara, Ketapel Api Raksasa, Barisan Pengawal Baja, Perisai Duri Pembalas, Cawan Cahaya Suci, Gelombang Gempa Fajar, Gudang Tong Minyak, Kavaleri Fajar Ganda, Semangat Perang Salib*) + belanjakan kas emas untuk menempa senjata & memperbaiki gerbang!
- **2 Mode Permainan Penuh:**
  1. **Pertahanan Kerajaan (10 Malam + 5 Boss Pengepungan Epik + Animasi CG Fajar)** hingga True Final Boss **Raja Lich Agung Azrath**.
  2. **Malam Darah Abadi (Endless Horde Survival)** dengan skala gelombang tanpa batas & rekor tersimpan otomatis.

---

## 🚀 Build Lokal

```bash
node scripts/build.mjs
node scripts/test-logic.mjs
./gradlew assembleRelease
```

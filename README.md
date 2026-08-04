# ⚡ All Tools KYY — v6.2

All-in-One Tools Portal: **136 tools gratis** dalam satu web — downloader sosmed,
AI studio, games, tools developer, sampai command palette ala Raycast (Ctrl+K).
Tema ungu gelap, tanpa login, tanpa ribet.

> 👑 Developer: **Rifkyy sensei**
> 🧬 Scraper downloader di-port dari bot WhatsApp + teknik scraping hasil ngulik
> repo GitHub (InnerTube YouTube, pemburu `client_id` SoundCloud, CoinGecko, dll).

---

## 🚀 Deploy

Repo ini bisa jalan di **dua platform** — pilih salah satu (atau dua-duanya).

### 🟣 Railway (recommended)

1. Push folder ini ke repo GitHub.
2. Buka [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Pilih repo-nya → Railway otomatis deteksi Node.js, jalanin `npm install`,
   lalu start `node server.js` (lihat `railway.json`). Beres, gak perlu setting apa-apa.
4. Settings → **Networking** → Generate Domain buat dapet URL publik.

> Server Node (`server.js`) men-serve `public/` + meneruskan `/api/*` ke handler
> API yang sama persis dengan versi Netlify. Jadi cukup satu source of truth.

### ▲ Netlify (alternatif)

1. Push ke GitHub → di Netlify pilih **Add new site → Import from Git**.
2. Build settings kebaca otomatis dari `netlify.toml` (`publish = public`,
   `functions = netlify/functions`) → **Deploy**.
3. ⚠️ **Jangan drag-and-drop folder** ke Netlify — Functions gak ke-build,
   semua `/api/*` jadi 404. Wajib lewat Git import atau `netlify deploy --prod`.

---

## 💻 Jalanin lokal

```bash
npm install

# cara 1: server Node biasa (sama persis kek di Railway)
node server.js          # -> http://localhost:3000

# cara 2: mode Netlify (butuh netlify-cli)
npx netlify dev         # -> http://localhost:8888
```

Tes semua endpoint API tanpa deploy:

```bash
node test/run-tests.js
```

---

## ✨ Yang Baru di v6.1 — PAKET SULTAN

### 📿 Religi (baru!)
- 📖 **Al-Quran Digital** — 114 surat: teks Arab, latin, terjemahan Indo, audio murottal per surat, lompat ayat, prev/next surat. Sources: equran.id.
- 🤲 **Doa Harian** — 108 doa (arab + latin + artinya), bisa dicari. Source: api.myquran.com.
- 📿 **Asmaul Husna** — 99 nama Allah + arti Indonesia, klik kartu buat nyalin bacaan. Source: aladhan.

### 🎬 Scraper baru
- 🐦 **X / Twitter Downloader** — video multi-varian & foto dari tweet (fxtwitter utama, vxtwitter cadangan otomatis).
- 📚 **Baca Manga** — cari manga + baca chapter langsung di web (MangaDex; 🇬🇧 EN & 🇮🇩 ID kalo tersedia).
- 🎶 **Deezer Music** — cari lagu + preview 30 detik + Chart Global Top 15.
- 📸 **Screenshot Web** — fotoin website apa aja (thum.io).
- 🔎 **WHOIS Domain** — umur domain, registrar, kedaluwarsa, nameserver (.com/.net/.id via RDAP).

### 🎨 Fun & Kreatif (baru!)
- ✍️ **Fancy Text** — 20+ gaya unicode (bold, script, fraktur, vaporwave, l337, terbalik…) 100% client-side.
- 📅 **Weton Jawa** — hari + pasaran + neptu + watak, plus cek kecocokan dua tanggal. Patokan 1 Jan 1900 = Senin Pahing.
- 💘 **Love Calculator** — hash stabil (pasangan nama sama = hasil sama selamanya 🤫).
- 😂 **Meme Maker** — upload gambar + teks atas/bawah, canvas client-side.
- 🗜️ **Kompres Foto** — slider kualitas & lebar, hemat sampai 90%.
- 🎭 **Truth or Dare** — 60 kartu jujur & tantangan.
- 🎨 **Ganti Tema Warna** — 6 palet (unggu/pink/biru/cyan/merah/hijau), ke-simpen di HP user.

🛰 11 Endpoint API baru:
`quran/list`, `quran/surat`, `doa/harian`, `asmaulhusna`, `downloader/twitter`, `manga/search`, `manga/chapters`, `manga/pages`, `deezer/chart`, `tools/webshot`, `tools/whois`

---

## ✨ Yang Baru di v6

### 🎨 Desain (beda total dari v5)
- Boot intro baru: medallion logo + ring berputar + progress wipe.
- Navbar kaca mengambang (floating pill) + orbit ring di logo.
- Hero dua kolom — judul glitch + medallion berputar + kartu stat melayang + video reel.
- Kartu tool angular (clip-path pojok miring) + glow ngikutin kursor + 3D tilt.
- Font baru: **Space Grotesk** (body) + Orbitron (heading).
- Dock navigasi bawah buat mobile.
- Light theme ikut di-remap ke lavender terang.

### ⌨️ Command Palette (Ctrl+K / ⌘K)
Cari & buka semua tool dari mana aja: navigasi ↑↓, Enter buka, ESC tutup.
Bisa juga dipanggil dari tombol navbar, dock mobile, atau `/` buat fokus search.

### 🧰 21 Tools Baru (total 121)
| Tool | Sumber / Teknik |
|---|---|
| 🎬 Cari YouTube | YouTube **InnerTube** tanpa API key + tombol Convert langsung ke downloader |
| 🎧 SoundCloud | Panen `client_id` real-time dari bundle JS sndcdn (teknik ala yt-dlp), bisa diputar |
| 🟢 Spotify Card | oEmbed resmi Spotify + embed player preview |
| 🌍 Translate | Endpoint publik Google Translate — 20+ bahasa, auto deteksi |
| 💱 Kurs Live | open.er-api.com — 12 mata uang utama realtime |
| 🪙 Crypto Live | CoinGecko — top 12 market cap dalam Rupiah + %24h/7d |
| 📚 Cari Buku | Open Library API |
| 🎭 Identitas Palsu | randomuser.me |
| 🐾 Gacha Neko+ | nekos.best (12 kategori) |
| 🎨 Lab Warna | HEX↔RGB↔HSL murni JS + shades |
| 📦 JSON Toolkit | Pretty / minify / validasi / escape / download |
| 🔎 Regex Tester | Live match + highlight grup |
| ⏱️ Stopwatch & Timer | Lap + countdown beep |
| 📒 Notepad | Auto-save ke localStorage |
| 🛡️ Password Check | Skor entropy + saran |
| ⌨️ Tes Ngetik WPM | Akurasi + WPM realtime |
| 🎮 2048 / 🐹 Pukul Tikus / 🃏 Memory Match | Game arcade baru |
| 🌈 Gradient Studio | Racik gradasi CSS, tinggal copy |
| 👤 Avatar Maker | DiceBear 8 gaya dari seed teks |

### 🛰 10 Endpoint API Baru
```
GET/POST /api/search/youtube?query=...
GET/POST /api/soundcloud/search?query=...
GET/POST /api/soundcloud/stream?url=...
GET/POST /api/spotify/info?url=...
GET/POST /api/translate?text=...&to=en
GET/POST /api/kurs?base=USD
GET      /api/crypto
GET/POST /api/search/books?query=...
GET      /api/fakeidentity
GET/POST /api/nekos?category=neko
```

---

## 📁 Struktur

```
├── server.js              # Server Node buat Railway/VPS (adapter ke handler)
├── railway.json           # Konfig deploy Railway
├── netlify.toml           # Konfig deploy Netlify
├── netlify/functions/
│   └── api.js             # SATU handler buat semua route /api/*
├── public/                # Frontend (HTML/CSS/JS murni, tanpa build step)
│   ├── index.html
│   ├── css/style.css      # tema dasar v5
│   ├── css/void.css       # reskin v6 (di-load setelah style.css)
│   ├── js/app.js          # logic 100 tools lama
│   ├── js/void.js         # 21 tools baru + command palette + dock
│   ├── sw.js              # service worker (PWA)
│   └── manifest.webmanifest
└── test/run-tests.js      # test harness endpoint (jalan lokal, tanpa deploy)
```

---

## ⚖️ Catatan

- Tools downloader ditujukan buat konten milik sendiri / yang bebas diunduh.
  Jangan reupload karya orang sembarangan.
- Beberapa scraper bergantung ke layanan pihak ketiga — kalo ada yang ngambek
  (timeout/berubah format), wajar, medsos emang rewel. Tinggal tunggu update.

© 2026 All Tools KYY · Rifkyy sensei 💜

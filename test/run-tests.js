/**
 * Test harness lokal — memanggil handler Netlify Function secara langsung
 * tanpa perlu deploy. Jalankan: node test/run-tests.js
 */
const { handler } = require('../netlify/functions/api.js');

let passed = 0, failed = 0;

async function call(name, event, validate) {
  try {
    const res = await handler(event, {});
    const body = JSON.parse(res.body || '{}');
    const err = validate ? validate(res.statusCode, body) : (body.status ? null : body.error);
    if (err) {
      failed++;
      console.log(`❌ ${name}  [HTTP ${res.statusCode}]  -> ${err}`);
      console.log('   body:', JSON.stringify(body).slice(0, 300));
    } else {
      passed++;
      const preview = JSON.stringify(body).slice(0, 160);
      console.log(`✅ ${name}  [HTTP ${res.statusCode}]  -> ${preview}…`);
    }
    return body;
  } catch (e) {
    failed++;
    console.log(`❌ ${name}  EXCEPTION: ${e.message}`);
    return null;
  }
}

const post = (path, body) => ({
  httpMethod: 'POST',
  path,
  body: JSON.stringify(body),
  headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36 KYY-Test' },
});
const get = (path) => {
  const qsp = {};
  const m = path.match(/\?(.*)$/);
  if (m) new URLSearchParams(m[1]).forEach((v, k) => { qsp[k] = v; });
  return {
    httpMethod: 'GET',
    path,
    queryStringParameters: qsp,
    headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) Chrome/116.0 Mobile Safari/537.36', 'x-nf-client-connection-ip': '103.147.8.1' },
  };
};

(async () => {
  console.log('\n⚡ ALL TOOLS KYY — API TEST SUITE\n' + '='.repeat(60));

  // 1. Health
  await call('GET /api/health', get('/api/health'), (s, b) =>
    b.status && b.service ? null : 'health invalid');

  // 2. Info
  await call('GET /api/info', get('/api/info'), (s, b) =>
    b.status && b.device && b.browser ? null : 'info invalid');

  // 3. Password + validasi keunggulan
  await call('POST /api/tools/password', post('/api/tools/password', { length: 32, symbols: true }), (s, b) => {
    if (!b.status) return b.error;
    if (b.password.length !== 32) return 'panjang salah';
    if (b.entropy < 100) return 'entropi terlalu kecil: ' + b.entropy;
    return null;
  });

  // 4. Morse encode + decode round-trip
  const m = await call('POST /api/tools/morse (encode)', post('/api/tools/morse', { text: 'KYY', mode: 'encode' }), (s, b) =>
    b.status && b.result.includes('-.-') ? null : 'hasil morse salah');
  if (m?.result) {
    await call('POST /api/tools/morse (decode)', post('/api/tools/morse', { text: m.result, mode: 'decode' }), (s, b) =>
      b.status && b.result === 'KYY' ? null : `roundtrip gagal: "${b.result}"`);
  }

  // 5. Base64 round-trip
  const b64 = await call('POST /api/tools/base64 (encode)', post('/api/tools/base64', { text: 'Rifkyy sensei ⚡', mode: 'encode' }));
  if (b64?.result) {
    await call('POST /api/tools/base64 (decode)', post('/api/tools/base64', { text: b64.result, mode: 'decode' }), (s, b) =>
      b.status && b.result === 'Rifkyy sensei ⚡' ? null : 'roundtrip gagal');
  }

  // 6. Calculator (termasuk keamanan & error)
  await call('POST /api/tools/calc (valid)', post('/api/tools/calc', { expression: '18 + 2 * (10 - 4) / 3' }), (s, b) =>
    b.status && b.result === 22 ? null : `hasil salah: ${b.result}`);
  await call('POST /api/tools/calc (blokir karakter jahat)', post('/api/tools/calc', { expression: 'process.exit(1)' }), (s, b) =>
    !b.status ? null : 'HARUS DITOLAK tapi diterima!');
  await call('POST /api/tools/calc (bagi nol)', post('/api/tools/calc', { expression: '10/0' }), (s, b) =>
    !b.status ? null : 'HARUS DITOLAK tapi diterima!');

  // 7. QR Code
  await call('POST /api/tools/qrcode', post('/api/tools/qrcode', { text: 'https://all-tools-kyy.netlify.app', size: 256 }), (s, b) =>
    b.status && b.dataUrl.startsWith('data:image/png;base64,') ? null : 'dataUrl invalid');

  // 7.5 Paket data kuis v5.2 (offline, bukan API)
  {
    const ok2 = (name, cond, why) => cond
      ? (passed++, console.log(`✅ ${name}`))
      : (failed++, console.log(`❌ ${name} -> ${why}`));
    const qd = require('../public/js/quizdata.js');
    const need = ['kalimat', 'lirik', 'hewan', 'sambungkata', 'bendera', 'animepic', 'logo'];
    ok2('quizdata.js: 7 kategori baru siap', need.every((k) => qd[k]?.length), 'ada kategori kosong');
    ok2('quizdata.js: semua soal gambar punya URL', [...qd.bendera, ...qd.animepic, ...qd.logo].every((q) => /^https:\/\//.test(q.i)), 'ada img invalid');
    const f = require('../public/js/f100data.js');
    ok2(`f100data.js: ${f.length} soal survei siap`, Array.isArray(f) && f.length >= 1500, 'cuma ' + f.length);
    ok2('f100data.js: semua soal jawabannya >= 3', f.every((q) => Array.isArray(q.a) && q.a.length >= 3), 'ada soal jawaban < 3');
  }

  // 8. Validasi downloader (URL salah harus ditolak rapi)
  await call('POST /api/downloader/tiktok (URL invalid)', post('/api/downloader/tiktok', { url: 'bukan url' }), (s, b) =>
    !b.status ? null : 'HARUS DITOLAK tapi diterima!');
  await call('POST /api/downloader/tiktok (platform salah)', post('/api/downloader/tiktok', { url: 'https://www.youtube.com/watch?v=x' }), (s, b) =>
    !b.status ? null : 'HARUS DITOLAK tapi diterima!');

  // 9. Downloader nyata (butuh internet — tikwm) + template meme
  if (process.argv.includes('--live')) {
    await call('POST /api/downloader/tiktok (LIVE)', post('/api/downloader/tiktok', {
      url: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
    }), (s, b) => (b.status && b.media?.length ? null : b.error || 'media kosong'));
    await call('GET /api/memes (LIVE)', get('/api/memes'), (s, b) =>
      b.status && b.memes?.length > 50 ? null : b.error || 'template kosong');
    await call('POST /api/stalk/tiktok (LIVE)', post('/api/stalk/tiktok', { username: 'tiktok' }), (s, b) =>
      b.status && b.stats && b.user?.username === 'tiktok' ? null : b.error || 'data stalk kosong');
    await call('POST /api/tools/ipgeo (LIVE)', post('/api/tools/ipgeo', { ip: '8.8.8.8' }), (s, b) =>
      b.status && b.country ? null : b.error || 'geo kosong');
    await call('POST /api/tools/ipgeo (IP privat)', post('/api/tools/ipgeo', { ip: '192.168.1.1' }), (s, b) =>
      !b.status ? null : 'IP privat HARUS DITOLAK');
    await call('POST /api/tools/ustadz (LIVE)', post('/api/tools/ustadz', { text: 'kenapa aku ganteng' }), (s, b) =>
      b.status && b.image?.startsWith('https://') ? null : b.error || 'gambar kosong');
    await call('POST /api/sholat/cari (LIVE)', post('/api/sholat/cari', { kota: 'pati' }), (s, b) =>
      b.status && b.cities?.length ? null : b.error || 'kota kosong');
    await call('POST /api/sholat/jadwal (LIVE)', post('/api/sholat/jadwal', { kota: 'jakarta' }), (s, b) =>
      b.status && b.jadwal?.subuh ? null : b.error || 'jadwal kosong');
    await call('POST /api/stalk/github (LIVE)', post('/api/stalk/github', { username: 'torvalds' }), (s, b) =>
      b.status && b.login === 'torvalds' ? null : b.error || 'profil kosong');

    // --- BATCH 2.0: brat, qc, upload, stalk pin, primbon ---
    await call('GET /api/tools/brat?type=cewek (LIVE)', get('/api/tools/brat?type=cewek&text=halo%20kamu'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.image) return 'image kosong';
      if (!b.image.startsWith('iVBOR') && !b.image.startsWith('/9j')) return 'bukan base64 gambar';
      return null;
    });
    await call('POST /api/tools/qc (LIVE)', post('/api/tools/qc', { name: 'Kyy', text: 'halo ges balik lagi sama gw', color: 'dark' }), (s, b) => {
      if (!b.status && /530|502|ngambek/.test(String(b.error||''))) { console.log('   ⚠️ provider QC pihak ketiga lagi down (skip)'); return null; }
      if (!b.image) return 'image kosong';
      if (!b.image.startsWith('iVBOR') && !b.image.startsWith('/9j')) return 'bukan base64 gambar';
      return null;
    });
    await call('POST /api/tools/upload (LIVE)', post('/api/tools/upload', {
      b64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      mime: 'image/png', name: 'pixel',
    }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.url || !b.url.startsWith('https://')) return 'url invalid: ' + b.url;
      return null;
    });
    await call('GET /api/stalk/pinterest (LIVE)', get('/api/stalk/pinterest?username=dims'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.user || !b.user.username) return 'user kosong';
      return null;
    });
    await call('GET /api/primbon?type=artinama (LIVE)', get('/api/primbon?type=artinama&nama=rifky'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result || !b.result.arti) return 'arti kosong';
      return null;
    });
    await call('GET /api/primbon?type=cocok (LIVE)', get('/api/primbon?type=cocok&nama1=rifky&nama2=ayu'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result) return 'result kosong';
      return null;
    });
    await call('GET /api/primbon?type=zodiak (LIVE)', get('/api/primbon?type=zodiak&zodiak=leo'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result) return 'result kosong';
      return null;
    });
    await call('QC warna aneh -> fallback dark (skip kalo provider down)', post('/api/tools/qc', { name: 'Kyy', text: 'tes', color: 'hijaulumut' }), (s, b) => {
      if (!b.status && /530|502|ngambek/.test(String(b.error||''))) { console.log('   ⚠️ provider QC down (skip)'); return null; }
      return b.status ? null : 'harusnya fallback ke dark, bukan error';
      (0 ? b.status : 0); });

    await call('Brat teks kosong -> error ramah', get('/api/tools/brat?type=cewek&text='), (s, b) =>
      !b.status && b.error ? null : 'harusnya error');

    // --- BATCH 3.0: search & stalk game ---
    await call('GET /api/search/lyrics (LIVE)', get('/api/search/lyrics?q=mata%20ke%20hati'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result || !b.result.lyric || b.result.lyric.length < 100) return 'lirik kosong/pendek';
      return null;
    });
    await call('GET /api/search/pinterest (LIVE)', get('/api/search/pinterest?q=aesthetic%20anime'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result || !b.result.images?.length) return 'gambar kosong';
      return null;
    });
    await call('GET /api/stalk/ff (LIVE)', get('/api/stalk/ff?uid=195090825'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.user || !b.user.name) return 'user FF kosong';
      return null;
    });
    await call('GET /api/stalk/roblox (LIVE)', get('/api/stalk/roblox?username=builderman'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.user || String(b.user.username).toLowerCase() !== 'builderman') return 'user roblox salah';
      return null;
    });
    await call('FF UID ngawur -> error ramah', get('/api/stalk/ff?uid=12'), (s, b) =>
      !b.status && b.error ? null : 'UID pendek harusnya ditolak');

    // --- BATCH 4.0: AI ZONE ---
    await call('POST /api/ai/image (LIVE)', post('/api/ai/image', { prompt: 'kucing astronot lucu di luar angkasa, detail, neon', ratio: '1:1' }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result || !b.result.url) return 'url kosong';
      return null;
    });
    await call('AI image prompt jorok -> ditolak', post('/api/ai/image', { prompt: 'hentai girl', ratio: '1:1' }), (s, b) =>
      !b.status ? null : 'prompt jorok HARUS DITOLAK');
    await call('POST /api/ai/chat (LIVE)', post('/api/ai/chat', { text: 'halo simi' }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.reply || b.reply.length < 2) return 'balasan kosong';
      return null;
    });
    await call('POST /api/ai/math (aritmatika lokal)', post('/api/ai/math', { text: '2*12+3' }), (s, b) => {
      if (!b.status) return b.error;
      if (!String(b.answer || '').includes('27')) return 'jawaban lokal salah: ' + b.answer;
      if (b.mode !== 'local') return 'harus mode local';
      return null;
    });
    await call('GET /api/tools/libur (LIVE)', get('/api/tools/libur'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result || !Array.isArray(b.result.nasional)) return 'data libur kosong';
      return null;
    });
    await call('GET /api/random/ppcouple (LIVE)', get('/api/random/ppcouple'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result?.cowo?.url || !b.result?.cewe?.url) return 'couple kosong';
      return null;
    });
    await call('GET /api/random/anime (LIVE)', get('/api/random/anime'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.image || !b.mime) return 'image kosong';
      return null;
    });

    // --- BATCH 5.0: removebg ---
    const tinyJpg = require('fs').existsSync('/tmp/test-bg.png')
      ? require('fs').readFileSync('/tmp/test-bg.png').toString('base64')
      : null;
    if (tinyJpg) await call('POST /api/tools/removebg (LIVE)', post('/api/tools/removebg', { b64: tinyJpg }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.image || !b.image.startsWith('iVBOR')) return 'png hasil removebg invalid';
      return null;
    });
    await call('RemoveBG kosong -> error ramah', post('/api/tools/removebg', { b64: '' }), (s, b) =>
      !b.status && b.error ? null : 'harusnya error');

    // --- BATCH 6.0: cuaca ---
    await call('GET /api/tools/cuaca (LIVE)', get('/api/tools/cuaca?kota=Pati'), (s, b) => {
      if (!b.status) return b.error;
      if (typeof b.result?.suhu !== 'number') return 'suhu kosong';
      if (!b.result.icon) return 'icon kosong';
      return null;
    });
    await call('Cuaca kota kosong -> error ramah', get('/api/tools/cuaca?kota='), (s, b) =>
      !b.status && b.error ? null : 'harusnya error');

    // --- BATCH 7.0 (v3): game gratisan ---
    await call('GET /api/games/free (LIVE)', get('/api/games/free'), (s, b) => {
      if (!b.status) return b.error;
      const g = b.result?.[0];
      if (!Array.isArray(b.result) || !b.result.length) return 'list game kosong';
      if (!g.title || !g.thumb || !g.url) return 'field game tidak lengkap';
      return null;
    });
    await call('POST /api/search/stikerpack (LIVE)', post('/api/search/stikerpack', { q: 'cat' }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result?.length || !b.result[0].images?.length) return 'pack stiker kosong';
      if (!/^https:\/\//.test(b.result[0].images[0].url)) return 'url stiker invalid';
      return null;
    });

    // --- v5.2 SYLPHA BATCH: gempa, emojimix, berita, shortlink ---
    await call('GET /api/info/gempa (LIVE)', get('/api/info/gempa'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result?.terbaru?.Magnitude) return 'gempa terbaru kosong';
      if (!Array.isArray(b.result.terkini) || !b.result.terkini.length) return 'list terkini kosong';
      return null;
    });
    await call('POST /api/fun/emojimix (LIVE)', post('/api/fun/emojimix', { a: '🔥', b: '😭' }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result?.img?.startsWith('data:image/png;base64,')) return 'mix gagal format';
      return null;
    });
    await call('emojimix tanpa emoji -> ditolak', post('/api/fun/emojimix', { a: '', b: '' }), (s, b) =>
      !b.status && b.error ? null : 'emoji kosong harusnya ditolak');
    for (const src of ['cnn', 'antara', 'tempo']) {
      await call(`POST /api/info/berita src=${src} (LIVE)`, post('/api/info/berita', { src }), (s, b) => {
        if (!b.status) return b.error;
        if (!b.result?.items?.length) return 'berita kosong';
        if (!b.result.items[0].title || !b.result.items[0].link) return 'field berita kurang';
        return null;
      });
    }
    await call('POST /api/tools/shorten (LIVE)', post('/api/tools/shorten', { url: 'https://alltoolskyy.netlify.app/' }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result?.tinyurl && !b.result?.cleanuri) return 'dua provider mati semua';
      return null;
    });
    await call('shorten link ngawur -> ditolak', post('/api/tools/shorten', { url: 'bukanlink' }), (s, b) =>
      !b.status && b.error ? null : 'link ngawur harusnya ditolak');
    // --- v4.2: MediaFire + Sfile ---
    await call('POST /api/downloader/mediafire (LIVE)', post('/api/downloader/mediafire', {
      url: 'https://www.mediafire.com/file/12sinbzx9ix58od/space_wallpapers.7z/file',
    }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.media?.[0]?.url?.startsWith('https://download')) return 'direct link invalid';
      if (!b.thumbnail?.startsWith('https://')) return 'thumbnail kosong';
      return null;
    });
    await call('POST /api/search/sfile (LIVE)', post('/api/search/sfile', { q: 'config ff' }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result?.length) return 'hasil kosong';
      const f = b.result[0];
      if (!f.title || !f.url || !f.size) return 'field tidak lengkap';
      return null;
    });
    await call('POST /api/downloader/sfile (LIVE)', post('/api/downloader/sfile', {
      url: 'https://sfile.co/ltziT3C46gH',
    }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.media?.[0]?.url?.includes('.sfile.')) return 'direct link invalid';
      return null;
    });
  } else {
    console.log('ℹ️  Lewati test LIVE downloader (jalankan dengan --live untuk mengaktifkan)');
  }

  // 10. Route 404
  await call('GET /api/ngawur (harus 404)', get('/api/ngawur'), (s, b) =>
    s === 404 && !b.status ? null : 'harusnya 404');

  // 11. ☠ VOID V6 — endpoint baru
  await call('POST /api/translate', post('/api/translate', { q: 'good night', to: 'id' }), (s, b) =>
    b.status && b.result?.text?.length ? null : (b.error || 'translate kosong'));

  await call('GET /api/kurs?base=USD', get('/api/kurs?base=USD'), (s, b) =>
    b.status && b.result?.rates?.IDR ? null : (b.error || 'kurs invalid'));

  await call('GET /api/crypto', get('/api/crypto'), (s, b) =>
    b.status && Array.isArray(b.result) && b.result[0]?.price ? null : (b.error || 'crypto kosong'));

  await call('GET /api/search/books', get('/api/search/books?q=laskar'), (s, b) =>
    b.status && b.result?.length ? null : (b.error || 'buku kosong'));

  await call('GET /api/fakeidentity', get('/api/fakeidentity'), (s, b) =>
    b.status && b.result?.name && b.result?.email ? null : (b.error || 'fakeid invalid'));

  await call('GET /api/nekos', get('/api/nekos?cat=waifu'), (s, b) =>
    b.status && b.result?.url?.startsWith('http') ? null : (b.error || 'nekos gagal'));

  await call('GET /api/search/youtube (LIVE)', get('/api/search/youtube?q=lofi'), (s, b) =>
    b.status && b.result?.length && b.result[0].id?.length === 11 ? null : (b.error || 'yt kosong'));

  await call('GET /api/soundcloud/search (LIVE)', get('/api/soundcloud/search?q=lofi'), (s, b) =>
    b.status && Array.isArray(b.result) && b.result[0]?.id ? null : (b.error || 'sc kosong'));

  await call('GET /api/spotify/info', get('/api/spotify/info?url=' + encodeURIComponent('https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b')), (s, b) =>
    b.status && b.result?.title ? null : (b.error || 'spotify kosong'));

  // === v6.1 PAKET SULTAN ===
  await call('GET /api/quran/list', get('/api/quran/list'), (s, b) =>
    b.status && b.result?.length === 114 && b.result[0].latin === 'Al-Fatihah' ? null : (b.error || 'quran list invalid'));

  await call('GET /api/quran/surat?nomor=1', get('/api/quran/surat?nomor=1'), (s, b) =>
    b.status && b.result?.ayat?.length === 7 && b.result.ayat[0].arab ? null : (b.error || 'surat 1 invalid'));

  await call('GET /api/doa/harian', get('/api/doa/harian'), (s, b) =>
    b.status && b.result?.length > 20 && b.result[0].judul ? null : (b.error || 'doa kosong'));

  await call('GET /api/asmaulhusna', get('/api/asmaulhusna'), (s, b) =>
    b.status && b.result?.length === 99 && b.result[0].arab ? null : (b.error || 'asma invalid'));

  await call('GET /api/downloader/twitter (jack/20)', get('/api/downloader/twitter?url=' + encodeURIComponent('https://x.com/jack/status/20')), (s, b) =>
    b.status && b.result?.user === 'jack' ? null : (b.error || 'twitter gagal'));

  await call('GET /api/manga/search (LIVE)', get('/api/manga/search?query=solo%20leveling'), (s, b) =>
    b.status && b.result?.length && b.result[0].id && b.result[0].cover ? null : (b.error || 'manga kosong'));

  await call('GET /api/manga/chapters', get('/api/manga/chapters?id=24657ac0-5152-4008-ac2b-b5b794160551'), (s, b) =>
    b.status && Array.isArray(b.result) && b.result.length && b.result[0].id ? null : (b.error || 'chapters kosong'));

  await call('GET /api/deezer/chart', get('/api/deezer/chart'), (s, b) =>
    b.status && b.result?.length && b.result[0].preview?.startsWith('http') ? null : (b.error || 'chart kosong'));

  await call('GET /api/tools/whois (google.com)', get('/api/tools/whois?domain=google.com'), (s, b) =>
    b.status && b.result?.registrar && b.result.dibuat ? null : (b.error || 'whois gagal'));

  await call('GET /api/tools/webshot (example.com)', get('/api/tools/webshot?url=example.com'), (s, b) =>
    b.status && b.result?.image?.startsWith('data:image') ? null : (b.error || 'webshot gagal'));

  console.log('='.repeat(60));
  console.log(`HASIL: ${passed} lolos, ${failed} gagal\n`);
  process.exit(failed ? 1 : 0);
})();

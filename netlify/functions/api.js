/**
 * ============================================================================
 * ⚡ ALL TOOLS KYY — API Backend
 * Developer : Rifkyy sensei
 * ----------------------------------------------------------------------------
 * Semua route /api/* ditangani di sini.
 * Handler ini dipakai bareng oleh:
 *   - Netlify Functions (file ini langsung jadi serverless function)
 *   - server.js (adapter Node HTTP biasa -> Railway / VPS / shared hosting)
 *
 * Scraper downloader di-PORT dari bot WhatsApp "NEW OURIN EDIT GWE":
 *   - src/scraper/aio.js      -> pola detectPlatform() + router + fallback
 *   - src/scraper/tiktok.js   -> TikTok (tikwm.com API + musicaldown + yuulabs)
 *   - src/scraper/ig.js       -> Instagram (fastdl.app HMAC signature)
 *   - src/scraper/ytdl.js     -> YouTube (ymcdn convert flow)
 *   - src/scraper/fbdown.js   -> pola wrapper API publik sederhana
 * ============================================================================
 */

const axios = require('axios');
const crypto = require('crypto');
const QRCode = require('qrcode');
const cheerio = require('cheerio');

/* ============================== KONFIGURASI =============================== */

const UA_ANDROID =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36';
const UA_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const AXIOS_OPTS = { timeout: 25000, maxRedirects: 5 };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

/* ================================ HELPERS ================================= */

const ok = (payload, statusCode = 200) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify({ status: true, ...payload }),
});

const fail = (message, statusCode = 400) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify({ status: false, error: message }),
});

function parseBody(event) {
  try {
    if (!event.body) return {};
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readParams(event) {
  const out = {};
  const m = (event.rawUrl || event.path || '').match(/\?(.*)$/);
  if (m) { try { new URLSearchParams(m[1]).forEach((v, k) => { out[k] = v; }); } catch { /* abaikan */ } }
  Object.assign(out, event.queryStringParameters || {});
  return out;
}

function isValidHttpUrl(str) {
  if (!str || typeof str !== 'string' || str.length > 2000) return false;
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function getClientIp(event) {
  const h = event.headers || {};
  const pick = (k) => h[k] || h[k.toLowerCase()];
  return (
    pick('x-nf-client-connection-ip') ||
    (pick('x-forwarded-for') || '').split(',')[0].trim() ||
    pick('client-ip') ||
    '127.0.0.1'
  );
}

/* ------------------------- Rate limiter sederhana ------------------------- */
const rateBuckets = new Map();
function rateLimit(key, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const b = rateBuckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > b.reset) {
    b.count = 0;
    b.reset = now + windowMs;
  }
  b.count += 1;
  rateBuckets.set(key, b);
  if (rateBuckets.size > 2000) rateBuckets.clear();
  return b.count <= limit;
}

/* ==================== PLATFORM DETECT (PORT dari aio.js) ================== */

const PLATFORM_DETECT = [
  { key: 'instagram', patterns: ['instagram.com', 'instagr.am'] },
  { key: 'youtube', patterns: ['youtube.com', 'youtu.be'] },
  { key: 'tiktok', patterns: ['tiktok.com', 'vt.tiktok.com', 'vm.tiktok.com'] },
  { key: 'facebook', patterns: ['facebook.com', 'fb.watch', 'fb.com'] },
  { key: 'pinterest', patterns: ['pinterest.com', 'pin.it'] },
  { key: 'twitter', patterns: ['twitter.com', 'x.com'] },
  { key: 'threads', patterns: ['threads.net'] },
  { key: 'reddit', patterns: ['reddit.com'] },
  { key: 'terabox', patterns: ['terabox.com', '1024terabox', 'teraboxapp', 'freeterabox', 'terabox.fun', 'mirrobox', 'nephobox', 'momerybox', 'tibibox'] },
  { key: 'mediafire', patterns: ['mediafire.com'] },
  { key: 'sfile', patterns: ['sfile.mobi', 'sfile.co'] },
];

function detectPlatform(url) {
  const lower = (url || '').toLowerCase();
  for (const p of PLATFORM_DETECT) {
    if (p.patterns.some((pat) => lower.includes(pat))) return p.key;
  }
  return null;
}

/* ==================== TIKTOK (PORT dari tiktok.js/aio.js) =================
 * Sumber utama : tikwm.com/api  (no watermark + HD + MP3)  <- dari aio.js
 * Fallback 1   : musicaldown.com (scraping form + cheerio) <- dari tiktok.js
 * Fallback 2   : yuulabs API    (wrapper API publik)       <- dari tiktok.js
 * ========================================================================== */

// tikwm kadang mengembalikan path relatif "/video/..." -> jadikan absolut
const asTikwmUrl = (u) =>
  !u ? null : u.startsWith('http') ? u : 'https://www.tikwm.com' + (u.startsWith('/') ? u : '/' + u);

async function tiktokFromTikwm(url) {
  const { data } = await axios.post(
    'https://www.tikwm.com/api/',
    {},
    {
      ...AXIOS_OPTS,
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Origin: 'https://www.tikwm.com',
        Referer: 'https://www.tikwm.com/',
        'User-Agent': UA_ANDROID,
        'X-Requested-With': 'XMLHttpRequest',
      },
      params: { url, count: 12, cursor: 0, web: 1, hd: 1 },
    }
  );

  const res = data?.data;
  if (!res) throw new Error('tikwm tidak mengembalikan data');

  const media = [];
  if (res.duration === 0 && Array.isArray(res.images) && res.images.length) {
    res.images.forEach((v) => media.push({ type: 'image', url: asTikwmUrl(v) }));
  } else {
    if (res.hdplay) media.push({ type: 'video', quality: 'HD', url: asTikwmUrl(res.hdplay) });
    if (res.play) media.push({ type: 'video', quality: 'NoWM', url: asTikwmUrl(res.play) });
    if (res.wmplay) media.push({ type: 'video', quality: 'WM', url: asTikwmUrl(res.wmplay) });
  }
  if (res.music) media.push({ type: 'audio', quality: 'MP3', url: asTikwmUrl(res.music) });
  if (!media.length) throw new Error('tikwm: tidak ada media');

  return {
    platform: 'tiktok',
    source: 'tikwm',
    title: res.title || 'TikTok Video',
    author: res.author?.nickname || res.author?.unique_id || null,
    duration: res.duration || 0,
    thumbnail: asTikwmUrl(res.cover),
    stats: {
      plays: res.play_count || 0,
      likes: res.digg_count || 0,
      comments: res.comment_count || 0,
      shares: res.share_count || 0,
    },
    media,
  };
}

async function tiktokFromMusicaldown(url) {
  const client = axios.create(AXIOS_OPTS);
  const { data: html, headers } = await client.get('https://musicaldown.com/en', {
    headers: { 'user-agent': UA_ANDROID },
  });
  const $ = cheerio.load(html);

  const payload = {};
  $('#submit-form input').each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).attr('value');
    if (name) payload[name] = value || '';
  });
  const urlField = Object.keys(payload).find((k) => !payload[k]);
  if (urlField) payload[urlField] = url;

  const cookieHeader = Array.isArray(headers['set-cookie'])
    ? headers['set-cookie'].map((c) => c.split(';')[0]).join('; ')
    : '';

  const { data } = await client.post(
    'https://musicaldown.com/download',
    new URLSearchParams(payload).toString(),
    {
      headers: {
        'user-agent': UA_ANDROID,
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        cookie: cookieHeader,
        origin: 'https://musicaldown.com',
        referer: 'https://musicaldown.com/',
      },
    }
  );

  const $$ = cheerio.load(data);
  const media = [];
  $$('a.download').each((_, el) => {
    const e = $$(el);
    const href = e.attr('href');
    if (!href) return;
    let type = String(e.data('event') || '').replace('_download_click', '');
    const isAudio = /mp3|music|audio/i.test(type + ' ' + e.text());
    media.push({
      type: isAudio ? 'audio' : 'video',
      quality: type || e.text().trim(),
      label: e.text().trim(),
      url: href,
    });
  });
  if (!media.length) throw new Error('musicaldown: tidak ada media');

  const style = $$('.video-header').attr('style') || '';
  const cover = style.match(/url\((.*?)\)/)?.[1] || null;

  return {
    platform: 'tiktok',
    source: 'musicaldown',
    title: $$('.video-desc').text().trim() || 'TikTok Video',
    author: $$('.video-author b').text().trim() || null,
    duration: 0,
    thumbnail: cover,
    stats: null,
    media,
  };
}

async function tiktokFromYuulabs(url) {
  const { data } = await axios.get(
    `https://api.yuulabs.web.id/api/downloader/tiktok?url=${encodeURIComponent(url)}`,
    { ...AXIOS_OPTS, headers: { 'user-agent': UA_ANDROID } }
  );
  if (!data?.status || !data?.result) throw new Error('yuulabs: response invalid');
  const r = data.result;
  const media = [];
  if (r.hdVideo) media.push({ type: 'video', quality: 'HD', url: r.hdVideo });
  if (r.videoUrl) media.push({ type: 'video', quality: 'NoWM', url: r.videoUrl });
  if (r.audioUrl) media.push({ type: 'audio', quality: 'MP3', url: r.audioUrl });
  if (!media.length) throw new Error('yuulabs: tidak ada media');
  return {
    platform: 'tiktok',
    source: 'yuulabs',
    title: r.description || 'TikTok Video',
    author: r.author || null,
    duration: 0,
    thumbnail: null,
    stats: null,
    media,
  };
}

async function handleTiktok(url) {
  const errors = [];
  for (const fn of [tiktokFromTikwm, tiktokFromMusicaldown, tiktokFromYuulabs]) {
    try {
      return await fn(url);
    } catch (e) {
      errors.push(e.message);
    }
  }
  throw new Error('Semua sumber TikTok gagal: ' + errors.join(' | '));
}

/* ==================== INSTAGRAM (PORT dari ig.js) =========================
 * fastdl.app dengan signature HMAC-SHA256 (reverse-engineer API privat).
 * Alur: ambil cookie -> ambil server time (/msec) -> ts = msec*1000 - 450
 *       -> sign = HMAC_SHA256(cleanUrl + ts, secretKeyHex) -> POST /api/convert
 * Fallback : savefbs.com (pola fallback dari aio.js)
 * ========================================================================== */

const FASTDL = {
  secretKeyHex:
    '34ac9a1aa6aaa7d69a7075611898f16a85d496b1d8f1c7aaa5640a2d93d7af80',
  appVersionTS: '1770240123231',
  userAgent:
    'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.7559.109 Mobile Safari/537.36',
};

async function instagramFromFastdl(igUrl) {
  const isStory = igUrl.includes('/stories/');
  let cleanUrl = igUrl.split('?')[0];
  if (!cleanUrl.endsWith('/')) cleanUrl += '/';

  const homeRes = await axios.get('https://fastdl.app/id', {
    ...AXIOS_OPTS,
    headers: { 'User-Agent': FASTDL.userAgent },
  });
  const cookieStr = (homeRes.headers['set-cookie'] || [])
    .map((c) => c.split(';')[0])
    .join('; ');

  const msecRes = await axios.get('https://fastdl.app/msec', {
    ...AXIOS_OPTS,
    headers: { 'User-Agent': FASTDL.userAgent, Cookie: cookieStr },
  });
  const serverTime = Math.floor(Number(msecRes.data.msec) * 1000);
  const ts = serverTime - 450;

  const signatureSource = isStory
    ? JSON.stringify({ url: cleanUrl }) + ts
    : cleanUrl + ts;
  const signature = crypto
    .createHmac('sha256', Buffer.from(FASTDL.secretKeyHex, 'hex'))
    .update(signatureSource)
    .digest('hex');

  let response;
  if (isStory) {
    response = await axios.post(
      'https://api-wh.fastdl.app/api/v1/instagram/story',
      { url: cleanUrl, ts, _ts: FASTDL.appVersionTS, _tsc: 0, _sv: 2, _s: signature },
      {
        ...AXIOS_OPTS,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': FASTDL.userAgent,
          Origin: 'https://fastdl.app',
          Referer: 'https://fastdl.app/id/story-saver',
          Cookie: cookieStr,
        },
      }
    );
  } else {
    const params = new URLSearchParams();
    params.append('sf_url', cleanUrl);
    params.append('ts', String(ts));
    params.append('_ts', FASTDL.appVersionTS);
    params.append('_tsc', '0');
    params.append('_sv', '2');
    params.append('_s', signature);
    response = await axios.post(
      'https://api-wh.fastdl.app/api/convert',
      params.toString(),
      {
        ...AXIOS_OPTS,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': FASTDL.userAgent,
          Origin: 'https://fastdl.app',
          Referer: 'https://fastdl.app/id',
          Cookie: cookieStr,
        },
      }
    );
  }

  const data = response.data;
  const media = [];

  if (isStory && Array.isArray(data?.result) && data.result[0]) {
    const r = data.result[0];
    if (r.video_versions?.length)
      media.push({ type: 'video', url: r.video_versions[0].url_wrapped || r.video_versions[0].url });
    else if (r.image_versions2?.candidates?.length)
      media.push({
        type: 'image',
        url: r.image_versions2.candidates[0].url_wrapped || r.image_versions2.candidates[0].url,
      });
    if (!media.length) throw new Error('fastdl(story): tidak ada media');
    return {
      platform: 'instagram',
      source: 'fastdl',
      title: `Story @${r.user?.username || 'instagram'}`,
      author: r.user?.username || null,
      thumbnail: r.user?.profile_pic_url || null,
      media,
    };
  }

  const items = Array.isArray(data) ? data : data ? [data] : [];
  for (const item of items) {
    if (item?.url?.length) {
      media.push({ type: item.url[0].type === 'image' ? 'image' : 'video', url: item.url[0].url });
    } else if (item?.hd || item?.sd) {
      media.push({ type: 'video', quality: item.hd ? 'HD' : 'SD', url: item.hd || item.sd });
    }
  }
  if (!media.length) throw new Error('fastdl: tidak ada media');

  const first = items[0] || {};
  const meta = first.meta || {};
  return {
    platform: 'instagram',
    source: 'fastdl',
    title: meta.title || 'Instagram Media',
    author: meta.username || null,
    thumbnail: first.thumb || null,
    stats: { likes: meta.like_count || 0, comments: meta.comment_count || 0 },
    media,
  };
}

/* --------- Fallback universal: savefbs.com (PORT pola aio.js) ------------
 * Versi struktur 2026: /html kini langsung mengembalikan link unduhan
 * <a href="https://dl.tiktokio.com/download?token=...">Download (720p)</a>
 * (Parser lama dua-langkah format/token sudah usang -> disesuaikan.)
 * ========================================================================== */

const SAVEFBS_HEADERS = {
  accept: '*/*',
  'content-type': 'application/json',
  referer: 'https://savefbs.com/all-in-one-video-downloader/',
  'user-agent':
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
};

async function downloadFromSavefbs(url, preferAudio = false) {
  const { data } = await axios.post(
    'https://savefbs.com/api/v1/aio/html',
    { vid: url, prefix: 'savefbs.com', ex: '', format: '' },
    { ...AXIOS_OPTS, headers: SAVEFBS_HEADERS }
  );
  const html = typeof data === 'string' ? data : JSON.stringify(data);
  const $ = cheerio.load(html);

  const title = $('h3.text-sm').first().text().trim() || $('h3').first().text().trim();

  // Kumpulkan semua link unduhan langsung (dedupe per URL)
  const media = [];
  const seen = new Set();
  $('a[href*="download?token="]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || seen.has(href)) return;
    seen.add(href);
    const label = $(el).text().trim();
    const isAudio = /mp3|audio/i.test(label) || /sf=\.mp3/.test(href);
    const quality =
      label.replace(/^download/i, '').replace(/[()]/g, '').trim() ||
      (isAudio ? 'MP3' : 'original');
    media.push({ type: isAudio ? 'audio' : 'video', quality, url: href });
  });
  if (!media.length) throw new Error('savefbs: tidak ada link unduhan');

  // Urutkan: default video dulu, audio terakhir (kecuali preferAudio)
  const rank = (m) => (m.type === 'audio' ? (preferAudio ? 0 : 1) : preferAudio ? 1 : 0);
  media.sort((a, b) => rank(a) - rank(b));

  return {
    platform: detectPlatform(url) || 'savefbs',
    source: 'savefbs',
    title: title || 'Downloaded Media',
    author: null,
    thumbnail: null,
    media,
  };
}

/* -------- Sumber IG tambahan (wrapper API publik, pola fbdown.js) -------- */

function sniffMediaType(u) {
  try {
    const m = String(u).match(/token=([^&]+)/);
    if (m) {
      const decoded = Buffer.from(decodeURIComponent(m[1]), 'base64').toString('utf8');
      if (/\.mp4|\.mov|video/i.test(decoded)) return 'video';
      if (/\.jpe?g|\.png|\.webp|\.heic/i.test(decoded)) return 'image';
    }
  } catch {}
  if (/\.jpe?g|\.png|\.webp/i.test(String(u))) return 'image';
  return 'video';
}

async function instagramFromYuulabs(igUrl) {
  const { data } = await axios.get(
    `https://api.yuulabs.web.id/api/downloader/instagram?url=${encodeURIComponent(igUrl)}`,
    { ...AXIOS_OPTS, headers: { 'user-agent': UA_ANDROID } }
  );
  const r = data?.result;
  if (!r?.status || !Array.isArray(r.medias) || !r.medias.length)
    throw new Error('yuulabs: tidak ada media');
  return {
    platform: 'instagram',
    source: 'yuulabs',
    title: (r.title || 'Instagram Media').split('\n')[0].slice(0, 120),
    author: r.owner || null,
    thumbnail: r.thumbnail || null,
    media: r.medias.map((u) => ({ type: sniffMediaType(u), url: u })),
  };
}

async function instagramFromAzbry(igUrl) {
  const { data } = await axios.get(
    `https://api.azbry.com/api/download/instagram?url=${encodeURIComponent(igUrl)}`,
    { ...AXIOS_OPTS, headers: { 'user-agent': UA_ANDROID } }
  );
  if (!data?.status) throw new Error(data?.message || 'azbry: status false');
  const urls = data.videos || data.images || (data.url ? [data.url] : []);
  if (!urls.length) throw new Error('azbry: tidak ada media');
  return {
    platform: 'instagram',
    source: 'azbry',
    title: data.title || 'Instagram Media',
    author: null,
    thumbnail: data.thumb || null,
    media: urls.map((u) => ({ type: data.type === 'video' ? 'video' : sniffMediaType(u), url: u })),
  };
}

async function handleInstagram(url) {
  const errors = [];
  const sources = [
    instagramFromYuulabs,
    instagramFromAzbry,
    () => instagramFromFastdl(url),
    () => downloadFromSavefbs(url),
  ];
  for (const fn of sources) {
    try {
      const out = await fn(url);
      if (out?.media?.length) return out;
    } catch (e) {
      errors.push(e.message);
    }
  }
  throw new Error('Semua sumber Instagram gagal: ' + errors.join(' | '));
}

/* ==================== YOUTUBE (PORT dari ytdl.js) =========================
 * Alur ymcdn: /api/v1/init -> convertURL -> poll progressURL -> downloadURL
 * Metadata   : YouTube oEmbed (title/author/thumbnail)
 * Fallback   : savefbs.com
 * ========================================================================== */

const YT_ID_REGEX =
  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/;

function extractVideoId(url) {
  return String(url || '').match(YT_ID_REGEX)?.[1] || null;
}

async function ytMetadata(url, videoId) {
  try {
    const { data } = await axios.get('https://www.youtube.com/oembed', {
      ...AXIOS_OPTS,
      params: { url: `https://www.youtube.com/watch?v=${videoId}`, format: 'json' },
    });
    return {
      title: data.title || 'YouTube Video',
      author: data.author_name || null,
      thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return {
      title: 'YouTube Video',
      author: null,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}

async function ytConvertYmcdn(videoId, format) {
  const client = axios.create({
    timeout: 55000,
    headers: { 'User-Agent': UA_ANDROID, Referer: 'https://id.ytmp3.mobi/' },
  });

  const { data: init } = await client.get('https://d.ymcdn.org/api/v1/init', {
    params: { p: 'y', 23: '1llum1n471', _: Math.random() },
  });
  if (!init?.convertURL) throw new Error('ymcdn: init gagal');

  const { data: convert } = await client.get(init.convertURL, {
    params: { v: videoId, f: format, _: Math.random() },
  });
  if (!convert?.progressURL || !convert?.downloadURL)
    throw new Error('ymcdn: konversi gagal');

  let progress = 0;
  let title = convert.title || '';
  let attempts = 0;
  const maxAttempts = 15;
  while (progress < 3 && attempts < maxAttempts) {
    const { data } = await client.get(convert.progressURL);
    if ((data?.error || 0) > 0) throw new Error(`ymcdn: error server ${data.error}`);
    progress = Number(data?.progress || 0);
    title = data?.title || title;
    if (progress < 3) {
      attempts += 1;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return { title, download: convert.downloadURL, format };
}

async function handleYoutube(url) {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error('URL YouTube tidak valid / ID tidak ditemukan');

  const meta = await ytMetadata(url, videoId);

  // Coba mp4 & mp3 paralel (pola aio.js handleYoutube, tapi fail-safe)
  const [mp4, mp3] = await Promise.allSettled([
    ytConvertYmcdn(videoId, 'mp4'),
    ytConvertYmcdn(videoId, 'mp3'),
  ]);

  const media = [];
  if (mp4.status === 'fulfilled' && mp4.value?.download)
    media.push({ type: 'video', quality: 'MP4', url: mp4.value.download });
  if (mp3.status === 'fulfilled' && mp3.value?.download)
    media.push({ type: 'audio', quality: 'MP3', url: mp3.value.download });

  // Fallback sumber cadangan (pola aio.js) bila ymcdn gagal total
  if (!media.length) {
    try {
      const v = await downloadFromSavefbs(url, false);
      media.push(...v.media);
      try {
        const a = await downloadFromSavefbs(url, true);
        if (a.media[0]?.type === 'audio') media.push(...a.media);
      } catch {}
    } catch (e) {
      throw new Error('Semua sumber YouTube gagal: ' + e.message);
    }
  }

  return {
    platform: 'youtube',
    source: media.length ? 'ymcdn/savefbs' : 'ymcdn',
    title: (mp4.status === 'fulfilled' && mp4.value?.title) || meta.title,
    author: meta.author,
    thumbnail: meta.thumbnail,
    videoId,
    media,
  };
}

/* ==================== AIO ROUTER (PORT pola aio.js) ======================= */

async function handleAio(url) {
  const platform = detectPlatform(url);
  if (!platform) throw new Error('Platform tidak dikenali / belum didukung');

  const handlers = {
    tiktok: () => handleTiktok(url),
    instagram: () => handleInstagram(url),
    youtube: () => handleYoutube(url),
  };

  if (handlers[platform]) return handlers[platform]();
  if (platform === 'pinterest') return pinterestPinScrape(url);
  if (platform === 'terabox') return teraboxFiles(url);
  if (platform === 'mediafire') return mediafireResolve(url);
  if (platform === 'sfile') return sfileResolve(url);

  // platform lain (facebook/twitter/threads/reddit/pinterest) -> savefbs
  try {
    return await downloadFromSavefbs(url);
  } catch (e) {
    throw new Error(`Gagal memproses ${platform}: ${e.message}`);
  }
}

/* ============================ TOOLS: MORSE ================================ */

const MORSE_MAP = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
  H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
  O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-',
  V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-',
  5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', "'": '.----.',
  '"': '.-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '/': '-..-.', '=': '-...-', '+': '.-.-.', '-': '-....-',
  _: '..--.-', '@': '.--.-.', $: '...-..-',
};
const MORSE_REVERSE = Object.fromEntries(
  Object.entries(MORSE_MAP).map(([k, v]) => [v, k])
);

function morseEncode(text) {
  return String(text)
    .toUpperCase()
    .split(' ')
    .map((word) =>
      word
        .split('')
        .map((ch) => MORSE_MAP[ch] || '')
        .filter(Boolean)
        .join(' ')
    )
    .join(' / ');
}

function morseDecode(code) {
  return String(code)
    .split(/\s+\/\s+/)
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .map((c) => MORSE_REVERSE[c] || '')
        .join('')
    )
    .join(' ');
}

/* ========================= TOOLS: PASSWORD ================================ */

function securePick(chars, length) {
  const bytes = crypto.randomBytes(length * 4);
  const out = [];
  const max = 256 - (256 % chars.length); // anti modulo bias
  let i = 0;
  while (out.length < length) {
    if (i >= bytes.length) return out.join('');
    const b = bytes[i++];
    if (b < max) out.push(chars[b % chars.length]);
  }
  return out.join('');
}

function generatePassword({ length, upper, lower, numbers, symbols }) {
  let charset = '';
  if (lower) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (upper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (numbers) charset += '0123456789';
  if (symbols) charset += '!@#$%^&*()-_=+[]{};:,.<>?';
  if (!charset) throw new Error('Pilih minimal 1 jenis karakter');

  // Pastikan tiap kategori terpilih hadir minimal 1x
  let password = securePick(charset, length);

  const entropy = length * Math.log2(charset.length);
  let strength, score;
  if (entropy < 40) { strength = 'Sangat Lemah'; score = 1; }
  else if (entropy < 60) { strength = 'Lemah'; score = 2; }
  else if (entropy < 80) { strength = 'Sedang'; score = 3; }
  else if (entropy < 110) { strength = 'Kuat'; score = 4; }
  else { strength = 'Sangat Kuat 💪'; score = 5; }

  return { password, entropy: Math.round(entropy), strength, score, charsetSize: charset.length };
}

/* ========================= TOOLS: CALCULATOR ==============================
 * Evaluasi ekspresi AMAN — whitelist karakter + recursive descent parser.
 * Operator: + - * / % (modulo), kurung (), unary minus, desimal.
 * ========================================================================== */

function safeEvaluate(expr) {
  if (typeof expr !== 'string' || !expr.trim()) throw new Error('Ekspresi kosong');
  if (expr.length > 200) throw new Error('Ekspresi terlalu panjang (maks 200 karakter)');
  if (!/^[0-9+\-*/%().\s]*$/.test(expr))
    throw new Error('Karakter tidak diizinkan. Gunakan: 0-9 + - * / % ( ) .');

  const tokens = expr.match(/\d+\.?\d*|\.\d+|[+\-*/%()]/g) || [];
  if (!tokens.length) throw new Error('Ekspresi tidak valid');
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpr() {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }
  function parseTerm() {
    let left = parseFactor();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = next();
      const right = parseFactor();
      if ((op === '/' || op === '%') && right === 0)
        throw new Error('Pembagian dengan nol tidak mungkin 🙅');
      left = op === '*' ? left * right : op === '/' ? left / right : left % right;
    }
    return left;
  }
  function parseFactor() {
    const t = peek();
    if (t === '-') { next(); return -parseFactor(); }
    if (t === '+') { next(); return parseFactor(); }
    if (t === '(') {
      next();
      const val = parseExpr();
      if (next() !== ')') throw new Error('Kurung tidak seimbang');
      return val;
    }
    const num = parseFloat(next());
    if (Number.isNaN(num)) throw new Error('Angka tidak valid');
    return num;
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error('Ekspresi tidak valid (sisa token)');
  if (!Number.isFinite(result)) throw new Error('Hasil di luar jangkauan');
  return Math.round(result * 1e12) / 1e12;
}

/* ========================== TOOLS: INFO VISITOR =========================== */

const memesCache = { data: null, exp: 0 }; // cache template imgflip

const geoCache = new Map(); // ip -> { data, exp }

// Normalizer tiap provider geo (pola multi-sumber + fallback seperti aio.js)
const GEO_SOURCES = [
  {
    name: 'ipapi.co',
    url: (ip) => `https://ipapi.co/${ip}/json/`,
    parse: (d) =>
      d?.country_name
        ? { country: d.country_name, countryCode: d.country_code || '--', city: d.city || '-', region: d.region || '-', timezone: d.timezone || '-', isp: d.org || '-' }
        : null,
  },
  {
    name: 'ipwho.is',
    url: (ip) => `https://ipwho.is/${ip}`,
    parse: (d) =>
      d?.success
        ? { country: d.country, countryCode: d.country_code || '--', city: d.city || '-', region: d.region || '-', timezone: d.timezone?.id || '-', isp: d.connection?.isp || '-' }
        : null,
  },
  {
    name: 'ip-api.com',
    url: (ip) => `http://ip-api.com/json/${ip}`,
    parse: (d) =>
      d?.status === 'success'
        ? { country: d.country, countryCode: d.countryCode || '--', city: d.city || '-', region: d.regionName || '-', timezone: d.timezone || '-', isp: d.isp || '-' }
        : null,
  },
];

async function geoFromIpapi(ip) {
  if (['127.0.0.1', '::1', 'localhost'].includes(ip)) {
    return { country: 'Lokal', countryCode: 'LO', city: 'Localhost', ip };
  }
  const cached = geoCache.get(ip);
  if (cached && cached.exp > Date.now()) return cached.data;

  for (const src of GEO_SOURCES) {
    try {
      const { data } = await axios.get(src.url(encodeURIComponent(ip)), {
        timeout: 8000,
        headers: { 'User-Agent': UA_DESKTOP },
      });
      const parsed = src.parse(data);
      if (parsed) {
        const geo = { ip, geoSource: src.name, ...parsed };
        geoCache.set(ip, { data: geo, exp: Date.now() + 3600_000 });
        if (geoCache.size > 500) geoCache.clear();
        return geo;
      }
    } catch {
      /* lanjut ke sumber berikutnya */
    }
  }
  return { ip, country: 'Tidak terdeteksi', countryCode: '--', city: '-', region: '-', timezone: '-', isp: '-' };
}

function parseUserAgent(ua = '') {
  ua = String(ua);
  let device = 'Desktop';
  if (/iPad|tablet/i.test(ua)) device = 'Tablet';
  else if (/Mobi|Android|iPhone/i.test(ua)) device = 'Mobile';

  let browser = 'Lainnya';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  let os = 'Lainnya';
  if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return { device, browser, os, ua };
}

/* ================== MAKER/STALK ENGINE (batch 2.0) ======================== */

const makerCache = new Map();
function cacheGet(k) {
  const v = makerCache.get(k);
  if (v && v.exp > Date.now()) return v.data;
  makerCache.delete(k);
  return null;
}
function cacheSet(k, data, ttlMs) {
  if (makerCache.size > 300) makerCache.delete(makerCache.keys().next().value);
  makerCache.set(k, { data, exp: Date.now() + ttlMs });
}

/* ----------------------- V3.0: GAME GRATISAN (FreeToGame) ------------------ */
async function freeGamesList() {
  const cached = cacheGet('freegames');
  if (cached) return cached;
  const { data } = await axios.get('https://www.freetogame.com/api/games', {
    timeout: 16000,
    headers: { 'User-Agent': UA_MOBILE() },
  });
  if (!Array.isArray(data)) throw new Error('API FreeToGame tidak mengembalikan daftar');
  const list = data.slice(0, 36).map((g) => ({
    id: g.id,
    title: g.title,
    thumb: g.thumbnail,
    genre: g.genre,
    platform: g.platform,
    desc: g.short_description,
    url: g.game_url,
    date: g.release_date,
    publisher: g.publisher,
  }));
  cacheSet('freegames', list, 10 * 60 * 1000); // cache 10 menit
  return list;
}

/* ==================== V4.1: DOWNLOADER & SEARCH TAMBAHAN =================== */

// 📌 Pinterest pin -> foto HD (originals) / video mp4 (scrape HTML pin sendiri)
async function pinterestPinScrape(url) {
  const { data: html } = await axios.get(url, {
    timeout: 22000,
    headers: { 'User-Agent': UA_MOBILE(), 'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8' },
  });
  const raw = String(html);
  const unesc = (s) => s.replace(/\\u002F/gi, '/').replace(/\\\//g, '/').replace(/&amp;/g, '&');
  const media = [];
  const vids = [...new Set((raw.match(/https?:\\?\/\\?\/v\d?\.pinimg\.com\/videos\/[^"'\s\\]+/g) || []).map(unesc))]
    .filter((u) => /\.mp4($|\?)/i.test(u));
  vids.slice(0, 3).forEach((u, i) => media.push({ type: 'video', url: u, quality: ['720p', 'HD', 'SD'][i] || 'HD' }));
  const origs = (raw.match(/https?:\\?\/\\?\/i\.pinimg\.com\/originals\/[a-z0-9\/._-]+/gi) || []).map(unesc);
  const larges = (raw.match(/https?:\\?\/\\?\/i\.pinimg\.com\/(?:1200x|736x|564x)\/[a-z0-9\/._-]+/gi) || []).map(unesc);
  const imgs = [...new Set(origs.length ? origs : larges)];
  imgs.slice(0, 4).forEach((u) => media.push({ type: 'image', url: u, quality: 'original HD' }));
  if (!media.length) throw new Error('Media di pin ini ga ketemu — pin-nya publik kan? 📌');
  const title = (raw.match(/<meta[^>]+property="og:title"[^>]+content="([^"]{2,140})"/i) || [])[1]
    || (raw.match(/"name"\s*:\s*"([^"]{3,120})"/) || [])[1] || 'Pinterest Pin';
  return { title: title.replace(/&quot;/g, '"'), source: 'pinterest', platform: 'pinterest', thumbnail: imgs[0], media };
}

// 📦 Terabox -> direct download links (worker publik gratis)
async function teraboxFiles(url) {
  if (!/terabox|1024tera|freeterabox|mirrobox|nephobox|tibibox/i.test(url)) {
    throw new Error('Itu bukan link Terabox 📦 (format: terabox.com/s/xxx)');
  }
  const apiUrl = 'https://terabox-worker.robinkumarshakya103.workers.dev/api?url=' + encodeURIComponent(url);
  const { data } = await axios.get(apiUrl, { timeout: 32000, headers: { 'User-Agent': UA_MOBILE() } });
  if (!data?.success || !Array.isArray(data.files) || !data.files.length) {
    throw new Error('File Terabox ga ketemu — cek link share-nya ya');
  }
  const media = data.files.slice(0, 8).map((f) => {
    const n = f.file_name || 'file';
    const type = /\.(mp4|mkv|mov|webm)$/i.test(n) ? 'video'
      : /\.(mp3|m4a|wav|flac|ogg)$/i.test(n) ? 'audio'
      : /\.(jpe?g|png|gif|webp)$/i.test(n) ? 'image' : 'file';
    return { type, url: f.download_url, quality: f.size || '-', label: n };
  });
  return { title: data.files[0]?.file_name || 'Terabox File', source: 'terabox', platform: 'terabox', media };
}

// 🎵 Music Search (Deezer — preview 30 detik bisa diputar langsung)
async function deezerSearch(q) {
  const { data } = await axios.get('https://api.deezer.com/search', {
    params: { q, limit: 24 }, timeout: 16000, headers: { 'User-Agent': UA_MOBILE() },
  });
  return (data?.data || []).map((t) => ({
    id: t.id, title: t.title, artist: t.artist?.name, album: t.album?.title,
    cover: t.album?.cover_big || t.album?.cover_medium, preview: t.preview,
    link: t.link, duration: t.duration,
  }));
}

// 🎬 TikTok Search (tikwm feed/search — hasilnya sekalian bisa diunduh)
async function tiktokSearchList(q) {
  const { data } = await axios.get('https://www.tikwm.com/api/feed/search', {
    params: { keywords: q, count: 18, hd: 1 }, timeout: 25000, headers: { 'User-Agent': UA_MOBILE() },
  });
  if (data?.code !== 0 || !Array.isArray(data.data?.videos)) throw new Error(data?.msg || 'Pencarian TikTok gagal');
  return data.data.videos.map((v) => ({
    id: v.video_id, title: v.title, cover: v.cover, play: v.hdplay || v.play, wmplay: v.play,
    author: v.author?.nickname, uid: v.author?.unique_id,
    digg: v.digg_count, views: v.play_count, duration: v.duration,
  }));
}

// 📱 APK Search (API suggestion apkpure — judul, icon, skor, install)
async function apkSearchList(q) {
  const { data } = await axios.get('https://apkpure.com/api/v1/search_suggestion_new', {
    params: { hl: 'id', key: q }, timeout: 16000, headers: { 'User-Agent': UA_MOBILE() },
  });
  if (!Array.isArray(data)) throw new Error('APK-nya ga ketemu 📱');
  return data.slice(0, 18).map((a) => ({
    title: a.title, pkg: a.packageName, icon: a.icon, installs: a.installTotal,
    score: a.score, url: a.fullUrl || ('https://apkpure.com' + (a.url || '')),
  }));
}

// 🔥 MediaFire -> direct link + thumbnail (port src/scraper/mediafire.js bot WAnya)
async function mediafireResolve(url) {
  if (!/mediafire\.com\//i.test(url)) throw new Error('Itu bukan link MediaFire 🔥');
  const { data: html } = await axios.get(url, {
    timeout: 25000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  const $ = cheerio.load(String(html));
  const title = ($('meta[property="og:title"]').attr('content') || $('title').text() || '').trim();
  const thumb = ($('meta[property="og:image"]').attr('content') || '').trim() || null;
  const link = $('#downloadButton').attr('href') || $('a[aria-label="Download file"]').attr('href') || '';
  if (!/^https?:\/\//.test(link)) throw new Error('Link download-nya ga ketemu — file udah dihapus atau di-lock 😅');
  const btnText = $('#downloadButton').text().replace(/\s+/g, ' ').trim();
  const size = (btnText.match(/\(([^)]+)\)/) || [])[1] || '';
  const name = title || decodeURIComponent((link.split('/').pop() || 'file').split('?')[0]);
  return {
    title: name, source: 'mediafire', platform: 'mediafire',
    thumbnail: thumb, author: size ? `Ukuran: ${size}` : undefined,
    stats: size || undefined,
    media: [{ type: 'file', url: link, quality: size || 'original', label: name }],
  };
}

/* 📂 Sfile Search + DL (port sfiledl.js — file sharing ala Indo, gurun pencarian config/apk)
 * Flow: search.php?q -> list; resolve: page -> og:url -> gate (data-dw-url) -> regex link final di <script> */
function cookieMerge(jar, res) {
  (res.headers?.['set-cookie'] || []).forEach((c) => {
    const [pair] = String(c).split(';');
    const k = pair.split('=')[0].trim();
    jar[k] = pair.trim();
  });
  return Object.values(jar).join('; ');
}
async function sfileGet(url, jar, referer) {
  const res = await axios.get(url, {
    timeout: 25000,
    maxRedirects: 5,
    validateStatus: (s) => s < 500,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      ...(jar ? { Cookie: Object.values(jar).join('; ') } : {}),
      ...(referer ? { Referer: referer } : {}),
    },
  });
  cookieMerge(jar, res);
  return String(res.data || '');
}

async function sfileSearch(q) {
  const html = await sfileGet('https://sfile.mobi/search.php?q=' + encodeURIComponent(q), {}, null);
  const $ = cheerio.load(html);
  const out = [];
  $('a.search-result-link').each((_, el) => {
    if (out.length >= 24) return;
    const a = $(el);
    const url = a.attr('href') || a.attr('data-file-url') || '';
    if (!/sfile\.(co|mobi)\/[A-Za-z0-9]+/.test(url)) return;
    const block = a.parent();
    const info = block.find('p').first().text().replace(/\s+/g, ' ').trim();
    const size = (info.match(/([\d.,]+\s?(?:KB|MB|GB|TB))/i) || [])[1] || '';
    const date = info.split('•')[1]?.trim() || '';
    const icon = block.closest('div').parent().find('img').first().attr('src')
      || a.parents('div').first().find('img').first().attr('src') || null;
    out.push({ title: a.text().replace(/\s+/g, ' ').trim(), url, size, date, icon });
  });
  if (!out.length) throw new Error('File-nya ga ketemu di Sfile 😿 coba kata kunci lain');
  return out;
}

async function sfileResolve(url) {
  if (!/sfile\.(co|mobi)\//i.test(url)) throw new Error('Itu bukan link Sfile 📂');
  const jar = {};
  const html1 = await sfileGet(url, jar, null);
  const $1 = cheerio.load(html1);
  const ogUrl = $1('meta[property="og:url"]').attr('content') || url;
  const html2 = ogUrl === url ? html1 : await sfileGet(ogUrl, jar, url);
  const $2 = cheerio.load(html2);
  const title = $2('h1').first().text().replace(/\s+/g, ' ').trim()
    || ($2('meta[property="og:title"]').attr('content') || 'File Sfile');
  const info = $2('meta[property="og:description"]').attr('content') || '';
  const size = (info.match(/size\s+([\d.,]+\s?(?:KB|MB|GB|TB))/i) || html2.match(/([\d.,]+\s?(?:KB|MB|GB|TB))/i) || [])[1] || '';
  const author = (info.match(/uploaded by\s+([^\s]+)/i) || [])[1] || '';
  const date = (info.match(/on\s+(\d+\s+[A-Za-z]+\s+\d{4})/i) || [])[1] || '';
  let gate = ($2('#download').attr('data-dw-url') || $2('#download').attr('href') || '').replace(/&amp;/g, '&');
  if (!gate || gate === '#') {
    // beberapa halaman langsung nampilin tombol setelah kunjungan kedua (cookie + referer)
    const html3 = await sfileGet(ogUrl, jar, ogUrl);
    const $3 = cheerio.load(html3);
    gate = ($3('#download').attr('data-dw-url') || $3('#download').attr('href') || '').replace(/&amp;/g, '&');
  }
  if (!gate || gate === '#') throw new Error('Tombol download-nya ga muncul 😿 file-nya mungkin udah dihapus');
  if (gate.startsWith('/')) gate = 'https://sfile.co' + gate;
  const html4 = await sfileGet(gate, jar, ogUrl);
  const final = html4.match(/https?:[\\/]+download\d+\.sfile\.(?:co|mobi)[^"'\s<]+/i);
  if (!final) throw new Error('Link aslinya ke-hide sama gerbang countdown 😤 coba ulang');
  const dl = final[0].replace(/\\\//g, '/').replace(/[\\/]+$/, '');
  return {
    title, source: 'sfile', platform: 'sfile',
    author: author ? `@${author}` : undefined,
    stats: [size, date].filter(Boolean).join(' • ') || undefined,
    media: [{ type: 'file', url: dl, quality: size || 'original', label: (() => { const base = dl.split('?')[0].split('/').pop() || ''; const ext = base.includes('.') ? base.slice(base.lastIndexOf('.')) : ''; return /\.[a-z0-9]{2,4}$/i.test(title) ? title : title + ext; })() }],
  };
}

// 📧 Temp Mail (mail.tm — email sekali pakai beneran, gratis & keyless)
async function tempmailCreate() {
  const d = (await axios.get('https://api.mail.tm/domains', { timeout: 12000 })).data;
  const dom = d?.['hydra:member']?.[0]?.domain;
  if (!dom) throw new Error('Domain temp mail lagi sibuk, coba lagi');
  const rnd = Array.from({ length: 10 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
  const address = `kyy${rnd}@${dom}`;
  const password = `KyY!${rnd}`;
  const post = (u, b) => axios.post(u, b, { timeout: 16000, headers: { 'User-Agent': UA_MOBILE() } }).then((r) => r.data);
  await post('https://api.mail.tm/accounts', { address, password });
  const tok = await post('https://api.mail.tm/token', { address, password });
  if (!tok?.token) throw new Error('Gagal bikin token temp mail');
  return { address, token: tok.token, password };
}
const tmCfg = (token) => ({ headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA_MOBILE() }, timeout: 15000 });
async function tempmailInbox(token) {
  const { data } = await axios.get('https://api.mail.tm/messages?page=1', tmCfg(token));
  return (data?.['hydra:member'] || []).map((m) => ({
    id: m.id, from: m.from?.address, name: m.from?.name || '',
    subject: m.subject || '(tanpa subjek)', intro: (m.intro || '').slice(0, 90),
    date: m.createdAt, seen: m.seen,
  }));
}
async function tempmailReadMsg(token, id) {
  const { data } = await axios.get(`https://api.mail.tm/messages/${id}`, tmCfg(token));
  let text = (data.text || '').trim();
  if (!text && Array.isArray(data.html) && data.html.length) {
    text = data.html.join('\n')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/[ \t]{2,}/g, ' ').slice(0, 4000).trim();
  }
  return { subject: data.subject || '(tanpa subjek)', from: data.from?.address, date: data.createdAt, text };
}

// 🧸 Stiker Pack Telegram (port alya fitur/stickerpack.js -> getstickerpack API)
async function stickerPackSearch(q) {
  const { data } = await axios.post(
    'https://getstickerpack.com/api/v1/stickerdb/search',
    { query: q, page: 1 },
    { timeout: 16000, headers: { 'Content-Type': 'application/json', 'User-Agent': UA_MOBILE() } }
  );
  const list = Array.isArray(data?.data) ? data.data : [];
  if (!list.length) throw new Error('Stikernya ga ketemu 🧸 coba kata kunci lain');
  const abs = (u) => (u ? 'https://getstickerpack.com/' + String(u).replace(/^\/|storage\/*/g, 'storage/') : null);
  return list.slice(0, 14).map((v) => ({
    title: v.title || 'Sticker Pack',
    slug: v.slug,
    tray: abs(v.tray_icon || v.tray_icon_large || v.cover_image),
    downloads: v.download_counter || 0,
    bg: v.background_color || '#25D366',
    images: (v.images || []).slice(0, 48).map((im) => ({
      url: abs(im.url),
      animated: !!im.is_animated,
    })),
  }));
}

// Multipart file upload tingkat rendah biar tidak tergantung FormData
function buildMultipartFile(boundary, filename, mime, buf) {
  const pre = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`
  );
  const post = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([pre, buf, post]);
}

async function getB64Image(url, opts = {}) {
  const { data } = await axios.get(url, {
    ...AXIOS_OPTS,
    timeout: opts.timeout || 30000,
    responseType: 'arraybuffer',
    headers: { 'User-Agent': UA_MOBILE(), ...(opts.headers || {}) },
  });
  const mime = data.length && data[0] === 0x89 ? 'image/png' : data.length && data[0] === 0xff ? 'image/jpeg' : 'image/png';
  return { image: Buffer.from(data).toString('base64'), mime, bytes: data.length || data.byteLength };
}
function UA_MOBILE() {
  return 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36';
}

// Brat cewek (port plugins/sticker/bratcewek.js -> api.deline.web.id)
async function bratCewekImage(text) {
  const url = `https://api.deline.web.id/maker/cewekbrat?text=${encodeURIComponent(text)}`;
  return getB64Image(url, { timeout: 40000 });
}

// QC chat bubble (port plugins/sticker/qc.js -> brat.siputzx.my.id/quoted)
const QC_COLORS = {
  pink: '#f68ac9', blue: '#6cace4', red: '#f44336', green: '#4caf50',
  yellow: '#ffeb3b', purple: '#9c27b0', darkblue: '#0d47a1', lightblue: '#03a9f4',
  ash: '#9e9e9e', orange: '#ff9800', black: '#000000', white: '#ffffff',
  teal: '#008080', lightpink: '#FFC0CB', chocolate: '#A52A2A', salmon: '#FFA07A',
  magenta: '#FF00FF', tan: '#D2B48C', wheat: '#F5DEB3', deeppink: '#FF1493',
  dark: '#1b1429',
};
const QC_HOST_ALLOWED = ['c.termai.cc', 'telegra.ph', 'files.catbox.moe', 'catbox.moe', 'litter.catbox.moe', 'litterbox.catbox.moe'];
const QC_DEFAULT_AVATAR = 'https://files.catbox.moe/nwvkbt.png';

async function quoteStickerImage({ name, text, colorKey, photoUrl }) {
  const photo = photoUrl || QC_DEFAULT_AVATAR;
  const payload = {
    messages: [{
      from: { id: Math.floor(Math.random() * 90) + 10, first_name: name, last_name: '', name: '', photo: { url: photo } },
      text,
      entities: [],
      avatar: true,
      media: { url: '' },
      mediaType: '',
      replyMessage: { name: '', text: '', entities: [], chatId: Math.floor(Math.random() * 90) + 10 },
    }],
    backgroundColor: QC_COLORS[colorKey] || QC_COLORS.dark,
    width: 512, height: 512, scale: 2,
    type: 'quote', format: 'png', emojiStyle: 'apple',
  };
  const { data } = await axios.post('https://brat.siputzx.my.id/quoted', payload, {
    ...AXIOS_OPTS,
    timeout: 45000,
    responseType: 'arraybuffer',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA_MOBILE() },
  });
  const buf = Buffer.from(data);
  if (!buf.length || (buf[0] !== 0x89 && buf[0] !== 0xff)) {
    const head = buf.slice(0, 140).toString('utf8');
    throw new Error('Server quote lagi ngambek, coba lagi bentar ya');
  }
  return { image: buf.toString('base64'), mime: buf[0] === 0x89 ? 'image/png' : 'image/jpeg', bytes: buf.length };
}

// Upload foto -> link (port plugins/sticker/smeme.js bagian uploader + fallback catbox)
async function uploadImageCdn(filename, mime, buf) {
  const boundary = () => '----KyyBoundary' + crypto.randomBytes(8).toString('hex');
  const tryTermai = async () => {
    const b = boundary();
    const { data } = await axios.post(
      'https://c.termai.cc/api/upload?key=AIzaBj7z2z3xBjsk',
      buildMultipartFile(b, filename, mime, buf),
      { ...AXIOS_OPTS, timeout: 40000, headers: { 'Content-Type': `multipart/form-data; boundary=${b}`, 'User-Agent': UA_MOBILE() }, maxBodyLength: Infinity }
    );
    if (data?.status && data?.path) return { url: data.path, provider: 'termai' };
    throw new Error('termai gagal');
  };
  const tryCatbox = async () => {
    const b = boundary();
    const pre = Buffer.from(
      `--${b}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n` +
      `--${b}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`
    );
    const postBuf = Buffer.from(`\r\n--${b}--\r\n`);
    const { data } = await axios.post(
      'https://catbox.moe/user/api.php',
      Buffer.concat([pre, buf, postBuf]),
      { ...AXIOS_OPTS, timeout: 60000, headers: { 'Content-Type': `multipart/form-data; boundary=${b}` }, maxBodyLength: Infinity }
    );
    const url = String(data || '').trim();
    if (/^https:\/\//.test(url)) return { url, provider: 'catbox' };
    throw new Error('catbox ' + url.slice(0, 40));
  };
  const tryLitter = async () => {
    const b = boundary();
    const pre = Buffer.from(
      `--${b}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n` +
      `--${b}\r\nContent-Disposition: form-data; name="time"\r\n\r\n24h\r\n` +
      `--${b}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`
    );
    const postBuf = Buffer.from(`\r\n--${b}--\r\n`);
    const { data } = await axios.post(
      'https://litterbox.catbox.moe/resources/internals/api.php',
      Buffer.concat([pre, buf, postBuf]),
      { ...AXIOS_OPTS, timeout: 60000, headers: { 'Content-Type': `multipart/form-data; boundary=${b}` }, maxBodyLength: Infinity }
    );
    const url = String(data || '').trim();
    if (/^https:\/\//.test(url)) return { url, provider: 'litterbox', expires: '24 jam' };
    throw new Error('litterbox ' + url.slice(0, 40));
  };
  const tryTelegraph = async () => {
    const b = boundary();
    const { data } = await axios.post(
      'https://telegra.ph/upload',
      buildMultipartFile(b, filename, mime, buf),
      { ...AXIOS_OPTS, timeout: 40000, headers: { 'Content-Type': `multipart/form-data; boundary=${b}`, 'User-Agent': UA_MOBILE() }, maxBodyLength: Infinity }
    );
    const arr = Array.isArray(data) ? data : null;
    if (arr && arr[0]?.src) return { url: 'https://telegra.ph' + arr[0].src, provider: 'telegraph' };
    throw new Error('telegraph gagal');
  };
  for (const fn of [tryTermai, tryCatbox, tryLitter, tryTelegraph]) {
    try { return await fn(); } catch { /* fallback lanjut */ }
  }
  throw new Error('Semua uploader lagi ribet hari ini 😭 coba beberapa menit lagi');
}

// Stalk Pinterest (port plugins/stalker/pintereststalk.js -> api.nexray.eu.cc)
async function pinterestProfile(username) {
  const ck = `pin:${username.toLowerCase()}`;
  const hit = cacheGet(ck);
  if (hit) return { ...hit, cached: true };
  const { data } = await axios.get(
    `https://api.nexray.eu.cc/stalker/pinterest?username=${encodeURIComponent(username)}`,
    { ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' } }
  );
  const r = data?.result;
  if (!data?.status || !r) throw new Error('Akun Pinterest tidak ditemukan 🤔');
  const user = {
    username: r.username, name: r.full_name || '-', bio: r.bio && r.bio !== '-' ? r.bio : '',
    avatar: r.image?.original || r.image?.large || '', url: r.profile_url || ('https://pinterest.com/' + r.username),
    website: r.website && r.website !== '-' ? r.website : '',
    stats: {
      pins: r.stats?.pins ?? 0,
      followers: r.stats?.followers ?? 0,
      following: r.stats?.following ?? 0,
      boards: r.stats?.boards ?? 0,
    },
  };
  cacheSet(ck, user, 10 * 60_000);
  return user;
}

// Primbon (port plugins/primbon/*.js -> api.siputzx.my.id)
async function primbonFetch(type, params) {
  let path = '';
  if (type === 'artinama') path = `/api/primbon/artinama?nama=${encodeURIComponent(params.nama || '')}`;
  else if (type === 'cocok') path = `/api/primbon/kecocokan_nama_pasangan?nama1=${encodeURIComponent(params.nama1 || '')}&nama2=${encodeURIComponent(params.nama2 || '')}`;
  else if (type === 'zodiak') path = `/api/primbon/zodiak?zodiak=${encodeURIComponent(params.zodiak || '')}`;
  else throw new Error('Tipe primbon tidak dikenal');
  const ck = `prim:${type}:${(params.nama || '')}${(params.nama1 || '')}${(params.nama2 || '')}${(params.zodiak || '')}`.toLowerCase();
  const hit = cacheGet(ck);
  if (hit) return { ...hit, cached: true };
  const { data } = await axios.get('https://api.siputzx.my.id' + path, {
    ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' },
  });
  if (!data?.status || !data?.data) throw new Error('Datanya lagi kosong, coba input lain');
  cacheSet(ck, data.data, 6 * 3600_000);
  return data.data;
}

/* ========================== SEARCH ENGINE (batch 3.0) ===================== */

// Lirik lagu (port plugins/search/lyrics.js -> api.nexray.eu.cc)
async function lyricsSearch(query) {
  const ck = 'lyric:' + query.toLowerCase();
  const hit = cacheGet(ck);
  if (hit) return { ...hit, cached: true };
  const { data } = await axios.get(
    `https://api.nexray.eu.cc/search/lyrics?q=${encodeURIComponent(query)}`,
    { ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' } }
  );
  const r = data?.result;
  if (!data?.status || !r) throw new Error('Liriknya ga ketemu, coba judul lain 🎵');
  const L = r.lyrics;
  const rawLyric = L && typeof L === 'object'
    ? (L.plain_lyrics || L.lyrics || L.plainLyrics || String(L.synced_lyrics || '').replace(/\[\d+[:.]\d+\S*\]\s*/g, '').trim())
    : String(L || '');
  const lyric = String(rawLyric).replace(/\[\d+[:.]\d+\S*\]\s*/g, '').trim();
  if (!lyric) throw new Error('Lagu ketemu tapi liriknya kosong 😢');
  const out = {
    title: r.title || r.name || L?.track_name || query,
    artist: r.artist || L?.artist_name || '-',
    album: L?.album_name && L.album_name !== '-' ? L.album_name : '',
    thumbnail: typeof r.thumbnail === 'string' ? r.thumbnail : (r.thumbnail?.url || ''),
    lyric: lyric.slice(0, 9000),
  };
  cacheSet(ck, out, 6 * 3600_000);
  return out;
}

// Cari gambar Pinterest (port plugins/search/pin.js -> api.siputzx.my.id)
async function pinterestSearch(query) {
  const ck = 'pinsearch:' + query.toLowerCase();
  const hit = cacheGet(ck);
  if (hit) return { ...hit, cached: true };
  const { data } = await axios.get(
    `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`,
    { ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' } }
  );
  const list = Array.isArray(data?.data) ? data.data : [];
  const images = list
    .filter((x) => x && x.image_url)
    .slice(0, 18)
    .map((x) => ({
      img: x.image_url,
      pin: x.pin || '',
      title: (x.grid_title || '').slice(0, 80),
      video: x.video_url || null,
    }));
  if (!images.length) throw new Error('Hasilnya kosong, coba kata kunci lain 📌');
  cacheSet(ck, { query, count: images.length, images }, 6 * 3600_000);
  return cacheGet(ck);
}

// Stalk Free Fire (port plugins/stalker/ffstalk.js -> api.nexray.eu.cc)
async function ffProfile(uid) {
  const ck = 'ff:' + uid;
  const hit = cacheGet(ck);
  if (hit) return { ...hit, cached: true };
  const { data } = await axios.get(
    `https://api.nexray.eu.cc/stalker/freefire?uid=${encodeURIComponent(uid)}`,
    { ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' } }
  );
  const r = data?.result;
  if (!data?.status || !r || !r.name) throw new Error('UID tidak ditemukan 🔥 (cek lagi ya)');
  const out = {
    uid: r.uid || uid,
    name: r.name,
    level: r.level ?? '-',
    region: r.region || '-',
    likes: r.likes ?? 0,
    createdAt: r.created_at || '',
    lastLogin: r.last_login || '',
    banner: typeof r.banner_image === 'string' && r.banner_image.startsWith('http') ? r.banner_image : '',
    guild: r.guild?.name || r_guildFrom(r) || '',
  };
  cacheSet(ck, out, 10 * 60_000);
  return out;
}
function r_guildFrom() { return ''; }

/* ============================ AI ENGINE (batch 4.0) ======================= */

// Text-to-image AI (port src/scraper/seaart.js fluxImage -> yuulabs flux)
async function aiFluxImage(prompt, ratio) {
  // Mesin utama: Pollinations FLUX — gratis, keyless, lari cepat (~1-3 detik)
  // Fallback: yuulabs flux-img (kadang lelet -> timeout, makanya dipindah belakang)
  const RATIO_MAP = { '1:1': [768, 768], '9:16': [720, 1280], '16:9': [1280, 720], '3:4': [864, 1152], '4:3': [1152, 864] };
  const [w, h] = RATIO_MAP[ratio] || RATIO_MAP['1:1'];
  const seed = Math.floor(Math.random() * 1e9);
  const pUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&model=flux&seed=${seed}`;
  try {
    const b64 = await getB64Image(pUrl, { timeout: 26000 });
    if (b64?.image) return { url: pUrl, prompt, ratio, engine: 'flux ⚡', ...b64 };
  } catch (e) { /* lanjut fallback */ }
  const { data } = await axios.post(
    'https://api.yuulabs.web.id/api/ai/flux-img',
    { message: prompt, ratio },
    { headers: { 'Content-Type': 'application/json', 'User-Agent': UA_MOBILE() }, timeout: 25000, maxRedirects: 5 }
  );
  if (!data?.status || !data?.result?.url)
    throw new Error('AI lagi kebanyakan order, coba bentar lagi ya 🎨');
  const url = data.result.url;
  const out = { url, prompt: data.result.prompt || prompt, ratio: data.result.ratio || ratio, engine: 'flux (cadangan)' };
  try {
    const b64 = await getB64Image(url, { timeout: 18000 });
    Object.assign(out, b64);
  } catch { /* frontend pakai url langsung */ }
  return out;
}

// Simi chat (port plugins/ai/simi.js -> nexray)
async function aiSimiChat(text) {
  const { data } = await axios.get(
    `https://api.nexray.eu.cc/ai/simisimi?text=${encodeURIComponent(text)}`,
    { ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' } }
  );
  if (!data?.status || !data?.result) throw new Error('Simi lagi ngambek, coba bilang yang lain 🤖');
  return String(data.result);
}

// Math AI (port plugins/ai/matematika.js -> nexray mathgpt)
async function aiMathSolve(text) {
  const { data } = await axios.get(
    `https://api.nexray.eu.cc/ai/mathgpt?text=${encodeURIComponent(text)}`,
    { ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' } }
  );
  if (!data?.status || !data?.result) throw new Error('Soalnya bikin AI pusing, yang jelas ya 🧮');
  return String(data.result);
}

// Hari libur / hari besar (port plugins: nexray information/hari-libur)
async function holidaysInfo() {
  const hit = cacheGet('libur:v1');
  if (hit) return { ...hit, cached: true };
  const { data } = await axios.get('https://api.nexray.eu.cc/information/hari-libur', {
    ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' },
  });
  const r = data?.result;
  if (!data?.status || !r) throw new Error('Data hari libur belum kebuka 📅');
  const fmt = ({ date, event, daysUntil }) => ({ date, event, daysUntil });
  const out = {
    hariIni: (r.hari_ini?.events || []).map(fmt),
    nasional: (r.mendatang?.event_nasional || []).slice(0, 10).map(fmt),
  };
  cacheSet('libur:v1', out, 6 * 3600_000);
  return out;
}

// PP couple (port plugins -> deline random/ppcouple)
async function ppCoupleRandom() {
  const { data } = await axios.get('https://api.deline.web.id/random/ppcouple', {
    ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' },
  });
  if (!data?.result?.cowo || !data?.result?.cewe) throw new Error('Couple-nya lagi berantem 💔 coba lagi');
  const [cowo, cewe] = await Promise.all([
    getB64Image(data.result.cowo, { timeout: 15000 }).catch(() => null),
    getB64Image(data.result.cewe, { timeout: 15000 }).catch(() => null),
  ]);
  return {
    cowo: cowo ? { ...cowo, url: data.result.cowo } : { url: data.result.cowo },
    cewe: cewe ? { ...cewe, url: data.result.cewe } : { url: data.result.cewe },
  };
}

// Cuaca (wttr.in, keyless)
const WTH_ICONS = [
  [/^113$/, '☀️'], [/^116$/, '⛅'], [/^(119|122)$/, '☁️'], [/^14[36]$/, '🌫️'],
  [/^(17[69]|2[3567]\d|3[0-8]\d|39[29])$/, '🌧️'], [/^(20\d|386)$/, '⛈️'],
  [/^(17[12]|18\d|19\d|22[0-9]|23[0-9]|35\d|36[02-9]|37\d|39)$/, '❄️'],
  [/^389$/, '⚡'],
];
function wthIcon(code) {
  for (const [re, e] of WTH_ICONS) if (re.test(String(code))) return e;
  return '🌡️';
}
async function weatherInfo(kota) {
  const ck = 'wth:' + kota.toLowerCase();
  const hit = cacheGet(ck);
  if (hit) return { ...hit, cached: true };
  const query = /,|\s+(jawa|sumatra|kalimantan|sulawesi|papua|bali)/i.test(kota) ? kota : kota + ', Indonesia';
  const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(query)}?format=j1`, {
    ...AXIOS_OPTS, headers: { 'User-Agent': 'curl/8.0 KYY/1.0', Accept: 'application/json' },
  });
  const c = data?.current_condition?.[0];
  if (!c?.temp_C) throw new Error('Kotanya ga ketemu ☁️ coba nama kota lain/jelas ya');
  const w0 = data.weather?.[0] || {};
  const w1 = data.weather?.[1] || {};
  const dayDesc = (w, key) => (w.hourly?.[4] || w.hourly?.[0] || {})[key];
  const avg = (w) => Math.round(((w.hourly || []).reduce((a, h) => a + (h.tempC ? +h.tempC : 0), 0)) / Math.max(1, (w.hourly || []).length));
  const out = {
    kota,
    suhu: +c.temp_C,
    feels: +c.FeelsLikeC,
    desc: c.weatherDesc?.[0]?.value || '-',
    icon: wthIcon(c.weatherCode),
    humidity: +c.humidity || 0,
    wind: +c.windspeedKmph || 0,
    minC: w0.mintempC ? Math.round(+w0.mintempC) : null,
    maxC: w0.maxtempC ? Math.round(+w0.maxtempC) : null,
  };
  if (w1.date) {
    const hc = w1.hourly?.[4] || w1.hourly?.[2] || {};
    out.besok = {
      desc: hc.weatherDesc?.[0]?.value || '-',
      icon: wthIcon(hc.weatherCode),
      minC: w1.mintempC ? Math.round(+w1.mintempC) : avg(w1),
      maxC: w1.maxtempC ? Math.round(+w1.maxtempC) : avg(w1),
    };
  }
  cacheSet(ck, out, 10 * 60_000);
  return out;
}

// Stalk Roblox (port plugins/stalker/robloxstalk.js -> API resmi keyless)
async function robloxProfile(username) {
  const ck = 'rbx:' + username.toLowerCase();
  const hit = cacheGet(ck);
  if (hit) return { ...hit, cached: true };
  const H = { 'Content-Type': 'application/json', 'User-Agent': UA_MOBILE() };
  const { data: found } = await axios.post(
    'https://users.roblox.com/v1/usernames/users',
    { usernames: [username], excludeBannedUsers: false },
    { ...AXIOS_OPTS, headers: H }
  );
  const u = found?.data?.[0];
  if (!u?.id) throw new Error('User Roblox tidak ditemukan 🤖');
  const id = u.id;
  const [info, avatar, followers, following, friends] = await Promise.allSettled([
    axios.get(`https://users.roblox.com/v1/users/${id}`, { ...AXIOS_OPTS, headers: H }),
    axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=420x420&format=Png`, { ...AXIOS_OPTS, headers: H }),
    axios.get(`https://friends.roblox.com/v1/users/${id}/followers/count`, { ...AXIOS_OPTS, headers: H }),
    axios.get(`https://friends.roblox.com/v1/users/${id}/followings/count`, { ...AXIOS_OPTS, headers: H }),
    axios.get(`https://friends.roblox.com/v1/users/${id}/friends/count`, { ...AXIOS_OPTS, headers: H }),
  ]);
  const inf = info.status === 'fulfilled' ? info.value.data || {} : {};
  const av = avatar.status === 'fulfilled' ? avatar.value.data?.data?.[0]?.imageUrl || '' : '';
  const out = {
    id,
    username: u.name || username,
    displayName: inf.displayName || u.displayName || u.name || username,
    bio: (inf.description || '').slice(0, 500),
    created: inf.created || '',
    avatar: av,
    banned: inf.isBanned ?? u.isBanned ?? false,
    verified: inf.hasVerifiedBadge ?? false,
    stats: {
      followers: followers.status === 'fulfilled' ? followers.value.data?.count ?? 0 : 0,
      following: following.status === 'fulfilled' ? following.value.data?.count ?? 0 : 0,
      friends: friends.status === 'fulfilled' ? friends.value.data?.count ?? 0 : 0,
    },
    url: `https://www.roblox.com/users/${id}/profile`,
  };
  cacheSet(ck, out, 10 * 60_000);
  return out;
}

/* ================================ ROUTER ================================== */

function routeOf(event) {
  let p = (event.path || '').split('?')[0];
  p = p.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');
  if (!p.startsWith('/')) p = '/' + p;
  return p.replace(/\/+$/, '') || '/';
}

/* =========================== v6.1 — PAKET SULTAN ==========================
   Endpoint baru: Al-Quran (equran.id), Doa harian (myquran), Asmaul Husna
   (aladhan), X/Twitter DL (fxtwitter + vxtwitter), Manga reader (MangaDex),
   Deezer, Screenshot web (thum.io), WHOIS domain (RDAP).                   */

const UA_CUSTOM = 'AllToolsKYY/6.1 (kyy-tools; contact: rifkyy-sensei)';

// Ambil dari cache, kalo gak ada jalanin fn() terus simpen (ttl dalam ms)
async function cached(key, ttlMs, fn) {
  const hit = cacheGet(key);
  if (hit) return hit;
  const v = await fn();
  cacheSet(key, v, ttlMs);
  return v;
}

async function quranSurahList() {
  return cached('quran:list', 24 * 3600e3, async () => {
    const { data } = await axios.get('https://equran.id/api/v2/surat', { ...AXIOS_OPTS, headers: { 'User-Agent': UA_CUSTOM } });
    const arr = (data?.data || []).map((s) => ({
      nomor: s.nomor, arab: s.nama, latin: s.namaLatin, arti: s.arti,
      jumlahAyat: s.jumlahAyat, tempat: s.tempatTurun,
    }));
    if (!arr.length) throw new Error('API Quran lagi kosong');
    return arr;
  });
}

async function quranSurahDetail(nomor) {
  return cached(`quran:surah:${nomor}`, 24 * 3600e3, async () => {
    const { data } = await axios.get(`https://equran.id/api/v2/surat/${nomor}`, { ...AXIOS_OPTS, timeout: 30000, headers: { 'User-Agent': UA_CUSTOM } });
    const d = data?.data;
    if (!d) throw new Error('Surat tidak ketemu');
    return {
      nomor: d.nomor, arab: d.nama, latin: d.namaLatin, arti: d.arti,
      jumlahAyat: d.jumlahAyat, tempat: d.tempatTurun,
      deskripsi: String(d.deskripsi || '').replace(/<[^>]+>/g, ''),
      audioFull: d.audioFull || null,
      next: d.suratSelanjutnya ? { nomor: d.suratSelanjutnya.nomor, latin: d.suratSelanjutnya.namaLatin } : null,
      prev: d.suratSebelumnya ? { nomor: d.suratSebelumnya.nomor, latin: d.suratSebelumnya.namaLatin } : null,
      ayat: (d.ayat || []).map((a) => ({
        nomor: a.nomorAyat, arab: a.teksArab, latin: a.teksLatin,
        idn: a.teksIndonesia, audio: a.audio?.['05'] || Object.values(a.audio || {})[0] || null,
      })),
    };
  });
}

async function doaHarian() {
  return cached('doa:list', 24 * 3600e3, async () => {
    const { data } = await axios.get('https://api.myquran.com/v2/doa/all', { ...AXIOS_OPTS, headers: { 'User-Agent': UA_CUSTOM } });
    const arr = (data?.data || []).map((d) => ({
      id: d.id, judul: d.judul, arab: d.doa || d.ayat || '', latin: d.latin || '', artinya: d.artinya || d.terjemah || '',
    })).filter((d) => d.judul);
    if (!arr.length) throw new Error('API doa lagi kosong');
    return arr;
  });
}

async function asmaulHusna() {
  return cached('asma:list', 7 * 24 * 3600e3, async () => {
    const { data } = await axios.get('https://api.aladhan.com/v1/asmaAlHusna', { ...AXIOS_OPTS, headers: { 'User-Agent': UA_CUSTOM } });
    const arr = (data?.data || []).map((a) => ({
      nomor: a.number, arab: a.name, latin: a.transliteration, arti: a.en?.meaning || '',
    }));
    if (!arr.length) throw new Error('API Asmaul Husna lagi kosong');
    return arr;
  });
}

async function twitterDownload(url) {
  const m = String(url).match(/(?:twitter|x)\.com\/([A-Za-z0-9_]+)\/status(?:es)?\/(\d+)/);
  if (!m) throw new Error('Link tweet-nya ga valid. Contoh: https://x.com/user/status/12345');
  const [, user, id] = m;
  // Percobaan 1: fxtwitter
  try {
    const { data: d } = await axios.get(`https://api.fxtwitter.com/${user}/status/${id}`, { ...AXIOS_OPTS, headers: { 'User-Agent': UA_CUSTOM } });
    if (d?.code === 200 && d.tweet) {
      const t = d.tweet;
      const photos = (t.media?.photos || []).map((p) => p.url).filter(Boolean);
      const videos = (t.media?.videos || []).map((v) => ({ url: v.url, bitrate: v.bitrate || 0, thumb: v.thumbnail_url || null })).filter((v) => v.url);
      return { by: 'fxtwitter', user: t.author?.screen_name || user, name: t.author?.name || '', text: t.text || '', likes: t.likes ?? null, date: t.created_at || '', photos, videos };
    }
    throw new Error('fxtwitter lagi ngambek');
  } catch (e1) {
    // Percobaan 2: vxtwitter
    const { data: v } = await axios.get(`https://api.vxtwitter.com/${user}/status/${id}`, { ...AXIOS_OPTS, headers: { 'User-Agent': UA_CUSTOM } });
    if (v && (v.tweetID || v.user_screen_name)) {
      const media = v.mediaURLs || [];
      const videos = (v.media_extended || []).filter((x) => /video/i.test(x.type || '')).map((x) => ({ url: x.url, bitrate: x.bitrate || 0, thumb: x.thumbnail_url || null }));
      const photoExt = (v.media_extended || []).filter((x) => /image|photo/i.test(x.type || '')).map((x) => x.url);
      const photos = photoExt.length ? photoExt : media.filter((u) => !/\.mp4|video/.test(u));
      if (!photos.length && !videos.length) throw new Error('Tweet ini ga punya media (foto/video) 😢');
      return { by: 'vxtwitter', user: v.user_screen_name || user, name: v.user_name || '', text: v.text || '', likes: v.likes ?? null, date: v.date || '', photos, videos };
    }
    throw new Error('Tweet ga ketemu atau akunnya di-private 🔒');
  }
}

async function mangaSearch(query) {
  return cached(`manga:q:${query.toLowerCase()}`, 30 * 60e3, async () => {
    const { data } = await axios.get('https://api.mangadex.org/manga', {
      ...AXIOS_OPTS, headers: { 'User-Agent': UA_CUSTOM },
      params: { title: query, limit: 12, 'order[followedCount]': 'desc', 'contentRating[]': ['safe', 'suggestive'], 'includes[]': 'cover_art' },
    });
    return (data?.data || []).map((m) => {
      const cover = (m.relationships || []).find((r) => r.type === 'cover_art');
      const title = m.attributes?.title?.en || Object.values(m.attributes?.title || {})[0] || 'Tanpa Judul';
      return {
        id: m.id, title,
        year: m.attributes?.year || null, status: m.attributes?.status || '',
        cover: cover ? `https://uploads.mangadex.org/covers/${m.id}/${cover.attributes.fileName}.256.jpg` : null,
      };
    });
  });
}

async function mangaChapters(id) {
  return cached(`manga:ch:${id}`, 30 * 60e3, async () => {
    const { data } = await axios.get(`https://api.mangadex.org/manga/${id}/feed`, {
      ...AXIOS_OPTS, headers: { 'User-Agent': UA_CUSTOM },
      params: { limit: 40, 'translatedLanguage[]': ['en', 'id'], 'order[chapter]': 'desc', 'includes[]': 'scanlation_group' },
    });
    return (data?.data || [])
      .filter((c) => c.attributes && !c.attributes.externalUrl)
      .map((c) => ({
        id: c.id, chapter: c.attributes.chapter, volume: c.attributes.volume,
        title: c.attributes.title || '', lang: c.attributes.translatedLanguage, pages: c.attributes.pages || null,
      }));
  });
}

async function mangaPages(chapterId) {
  const { data } = await axios.get(`https://api.mangadex.org/at-home/server/${chapterId}`, { ...AXIOS_OPTS, timeout: 15000, headers: { 'User-Agent': UA_CUSTOM } });
  if (!data?.chapter) throw new Error('Chapter ga bisa dibuka 😢');
  const base = data.baseUrl, hash = data.chapter.hash, files = data.chapter.data || [];
  return { base, hash, urls: files.map((f) => `${base}/data/${hash}/${f}`) };
}

async function deezerChart() {
  const { data } = await axios.get('https://api.deezer.com/chart/0/tracks', { ...AXIOS_OPTS, params: { limit: 15 } });
  return (data?.data || []).map((t) => ({
    id: t.id, title: t.title, artist: t.artist?.name, album: t.album?.title,
    cover: t.album?.cover_medium, preview: t.preview, duration: t.duration, link: t.link,
  }));
}

async function webScreenshot(url) {
  let u = String(url).trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  const shot = `https://image.thum.io/get/width/900/crop/700/noanimate/${u}`;
  const { data, headers } = await axios.get(shot, { ...AXIOS_OPTS, timeout: 45000, responseType: 'arraybuffer', headers: { 'User-Agent': UA_DESKTOP } });
  const mime = headers['content-type'] || 'image/png';
  return { image: `data:${mime};base64,${Buffer.from(data).toString('base64')}`, source: u };
}

async function whoisDomain(domain) {
  const d = String(domain).toLowerCase().replace(/^https?:\/\//, '').split('/')[0].trim();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) throw new Error('Domain-nya ga valid. Contoh: google.com');
  const tld = d.split('.').pop();
  let rdapUrl = tld === 'com' || tld === 'net'
    ? `https://rdap.verisign.com/${tld}/v1/domain/${d}`
    : (tld === 'id' ? `https://rdap.nic.id/domain/${d}` : `https://www.sidn.nl/whois?domain=${d}`);
  if (!/^(com|net|id)$/.test(tld)) throw new Error(`TLD .${tld} belum didukung — coba .com / .net / .id`);
  const { data } = await axios.get(rdapUrl, { ...AXIOS_OPTS, headers: { 'User-Agent': UA_CUSTOM } });
  const events = (data.events || []).reduce((acc, e) => { acc[e.eventAction] = e.eventDate; return acc; }, {});
  let registrar = '';
  const ent = (data.entities || []).find((e) => (e.roles || []).includes('registrar'));
  if (ent?.vcardArray?.[1]) {
    const fn = ent.vcardArray[1].find((v) => v[0] === 'fn');
    registrar = fn ? fn[3] : '';
  }
  const ns = (data.nameservers || []).map((n) => n.ldhName).filter(Boolean).slice(0, 6);
  if (!data.ldhName && !ns.length) throw new Error('Domain tidak ketemu di registry');
  return {
    domain: data.ldhName || d.toUpperCase(), registrar: registrar || 'Tidak diketahui',
    dibuat: events.registration || null, kedaluwarsa: events.expiration || null,
    diupdate: events['last changed'] || events.lastChanged || null,
    status: (data.status || []).slice(0, 6), ns, dnssec: data.secureDNS?.delegationSigned ? 'Aktif' : 'Tidak aktif',
  };
}


/* =================== v5.2 — port dari bot WA Sylpha_AI ===================
   Sumber: plugins/game (data soal), lib/notifgempa.js (BMKG),
   plugins/ephoto/emojimix.js (emoji kitchen — diganti mesin hidup,
   Tenor API aslinya udah dimatiin Google), search-cnn (diganti RSS langsung),
   shortlink2 (diganti tinyurl/cleanuri tanpa key).                        */

async function bmkgGempa() {
  const [a, b] = await Promise.allSettled([
    axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { ...AXIOS_OPTS, timeout: 12000 }),
    axios.get('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json', { ...AXIOS_OPTS, timeout: 12000 }),
  ]);
  const terbaru = a.status === 'fulfilled' ? (a.value?.data?.Infogempa?.gempa || null) : null;
  const terkini = b.status === 'fulfilled' ? (b.value?.data?.Infogempa?.gempa || []).slice(0, 12) : [];
  if (!terbaru && !terkini.length) throw new Error('BMKG lagi susah dihubungi, coba bentar lagi ya 🙏');
  return {
    terbaru,
    shakemap: terbaru?.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${terbaru.Shakemap}` : null,
    terkini,
  };
}

async function emojiMix(e1, e2) {
  const combos = [[e1, e2], [e2, e1]];
  for (const [a, b] of combos) {
    try {
      const url = `https://emojik.vercel.app/s/${encodeURIComponent(a)}_${encodeURIComponent(b)}?size=280`;
      const r = await axios.get(url, { timeout: 15000, responseType: 'arraybuffer', headers: { 'User-Agent': UA_DESKTOP } });
      if (r.data && r.data.length > 500) {
        return { img: `data:image/png;base64,${Buffer.from(r.data).toString('base64')}`, pasangan: `${a} + ${b}` };
      }
    } catch { /* kombinasi ini ga ada, coba kebalikannya */ }
  }
  throw new Error('Kombinasi itu ga ada di dapur emojinya 🍳 coba pasangan lain');
}

const BERITA_SRC = {
  cnn:    { label: 'CNN Nasional',  url: 'https://www.cnnindonesia.com/nasional/rss' },
  cnntek: { label: 'CNN Teknologi', url: 'https://www.cnnindonesia.com/teknologi/rss' },
  antara: { label: 'Antara News',   url: 'https://www.antaranews.com/rss/terkini.xml' },
  tempo:  { label: 'Tempo',         url: 'https://rss.tempo.co/nasional' },
};

async function beritaFetch(srcKey) {
  const conf = BERITA_SRC[srcKey];
  if (!conf) throw new Error('Sumber beritanya ga dikenal 📰');
  let data;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      data = (await axios.get(conf.url, { ...AXIOS_OPTS, timeout: 15000, headers: { 'User-Agent': UA_DESKTOP } })).data;
      break;
    } catch (e) {
      if (attempt === 1) throw e;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  const $ = cheerio.load(data, { xmlMode: true });
  const items = [];
  $('item').slice(0, 12).each((_, el) => {
    const it = $(el);
    const title = it.find('title').first().text().trim();
    const link = it.find('link').first().text().trim();
    const date = it.find('pubDate').first().text().trim();
    let img = it.find('enclosure').attr('url')
      || it.find('media\\:content').attr('url')
      || it.find('img').first().text().trim()
      || null;
    let descRaw = it.find('description').first().text();
    if (!img) {
      const m = descRaw.match(/<img[^>]+src=["']([^"']+)/i);
      if (m) img = m[1].replace(/&amp;/g, '&');
    }
    const desc = cheerio.load(`<div>${descRaw}</div>`)('div').first().text().replace(/\s+/g, ' ').trim().slice(0, 220);
    if (title && link) items.push({ title, link, date, img, desc });
  });
  if (!items.length) throw new Error('Beritanya kosong, sumbernya lagi ngambek 🙏');
  return { sumber: conf.label, items };
}

async function shortLink(url) {
  if (!/^https?:\/\/\S+\.\S+/i.test(url) || url.length > 900) throw new Error('Linknya ga valid cuy 🔗');
  const out = {};
  await Promise.all([
    axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { timeout: 12000, headers: { 'User-Agent': UA_DESKTOP } })
      .then((r) => { const s = String(r.data || '').trim(); if (s.startsWith('http')) out.tinyurl = s; })
      .catch(() => {}),
    axios.post('https://cleanuri.com/api/v1/shorten', `url=${encodeURIComponent(url)}`, { timeout: 12000, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA_DESKTOP } })
      .then((r) => { if (r.data?.result_url) out.cleanuri = r.data.result_url; })
      .catch(() => {}),
  ]);
  if (!out.tinyurl && !out.cleanuri) throw new Error('Mesin pemendeknya lagi capek 😭 coba bentar lagi');
  return out;
}

/* ============================================================================
 * ✨ V6 ENDPOINTS — scraper baru hasil riset dari GitHub (yt-search style,
 * soundcloud client_id hunter, deezer, coingecko, mymemory, openlibrary, dll)
 * ========================================================================== */

/* ---------- YouTube Search: InnerTube (teknik yt-search tanpa API key) ----- */
async function ytSearchList(query) {
  const key = `ytsearch:${query}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
  const ctx = {
    client: { hl: 'id', gl: 'ID', clientName: 'WEB', clientVersion: '2.20250210.04.00' },
  };

  const out = [];
  try {
    const r = await axios.post(
      `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}`,
      { context: ctx, query },
      {
        ...AXIOS_OPTS, timeout: 15000,
        headers: { 'User-Agent': UA_DESKTOP, 'Content-Type': 'application/json' },
      }
    );
    const sections = r.data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents || [];
    for (const sec of sections) {
      for (const item of sec?.itemSectionRenderer?.contents || []) {
        const v = item.videoRenderer;
        if (!v?.videoId) continue;
        const runs = v.lengthText?.simpleText || '';
        out.push({
          id: v.videoId,
          title: (v.title?.runs || []).map((x) => x.text).join('') || 'Tanpa Judul',
          channel: (v.ownerText?.runs || [])[0]?.text || '',
          views: (v.viewCountText?.simpleText || '').replace(/[^0-9.,\s\w]/g, '').trim(),
          duration: runs,
          published: v.publishedTimeText?.simpleText || '',
          thumb: v.thumbnail?.thumbnails?.at(-1)?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
        });
        if (out.length >= 15) break;
      }
      if (out.length >= 15) break;
    }
  } catch { /* fallback di bawah */ }

  // Fallback: scrape halaman search langsung (regex ytInitialData)
  if (!out.length) {
    const r = await axios.get('https://www.youtube.com/results?search_query=' + encodeURIComponent(query), {
      ...AXIOS_OPTS, timeout: 15000,
      headers: { 'User-Agent': UA_DESKTOP, 'Accept-Language': 'id-ID,id;q=0.9' },
    });
    const m = String(r.data).match(/ytInitialData\s*=\s*({.+?});<\/script>/s);
    if (m) {
      const data = JSON.parse(m[1]);
      const blob = JSON.stringify(data);
      const seen = new Set();
      const re = /"videoRenderer":\{"videoId":"(\S{11})","thumbnail".*?"title":\{"runs":\[\{"text":"(.*?)"\}/g;
      let mm;
      while ((mm = re.exec(blob)) && out.length < 15) {
        const [, id, title] = mm;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          id, title: title.replace(/\\u0026/g, '&'), channel: '', views: '', duration: '',
          published: '', thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${id}`,
        });
      }
    }
  }
  if (!out.length) throw new Error('Hasil YouTube kosong, coba keyword lain');
  cacheSet(key, out, 1000 * 60 * 10);
  return out;
}

/* ---------- SoundCloud Search: berburu client_id dari bundle JS (github) --- */
let _scClientId = null;
async function soundcloudClientId() {
  if (_scClientId) return _scClientId;
  const r = await axios.get('https://soundcloud.com/discover', {
    ...AXIOS_OPTS, headers: { 'User-Agent': UA_DESKTOP },
  });
  const scripts = [...String(r.data).matchAll(/https:\/\/a-v2\.sndcdn\.com\/assets\/[a-zA-Z0-9.-]+\.js/g)]
    .map((x) => x[0]);
  // client_id biasanya ada di salah satu bundle terakhir
  for (const url of scripts.slice(-6).reverse()) {
    try {
      const js = await axios.get(url, { ...AXIOS_OPTS, timeout: 10000, headers: { 'User-Agent': UA_DESKTOP } });
      const m = String(js.data).match(/client_id\s*[:=]\s*"([a-zA-Z0-9]{32})"/);
      if (m) { _scClientId = m[1]; return _scClientId; }
    } catch { /* lanjut bundle berikutnya */ }
  }
  throw new Error('Client ID SoundCloud ga ketemu 😵');
}

async function soundcloudSearch(query) {
  const key = `scsearch:${query}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const cid = await soundcloudClientId();
  const r = await axios.get('https://api-v2.soundcloud.com/search/tracks', {
    ...AXIOS_OPTS, timeout: 15000,
    params: { q: query, client_id: cid, limit: 15, offset: 0 },
    headers: { 'User-Agent': UA_DESKTOP },
  });
  const list = (r.data?.collection || []).map((t) => ({
    id: t.id,
    title: t.title || 'Tanpa Judul',
    artist: t.user?.username || '',
    art: (t.artwork_url || '').replace('-large', '-t500x500') || r.data?.collection?.[0]?.artwork_url || '',
    duration: Math.round((t.duration || 0) / 1000),
    plays: t.playback_count || 0,
    likes: t.likes_count || 0,
    url: t.permalink_url || '',
    stream: t.media?.transcodings?.find((x) => x.format?.protocol === 'progressive')
      ? `/api/soundcloud/stream?id=${t.id}` : '',
  }));
  if (!list.length) throw new Error('Lagu SoundCloud ga ketemu, ganti keyword');
  cacheSet(key, list, 1000 * 60 * 10);
  return list;
}

async function soundcloudStreamUrl(trackId) {
  const cid = await soundcloudClientId();
  const r = await axios.get(`https://api-v2.soundcloud.com/tracks/${trackId}`, {
    ...AXIOS_OPTS, params: { client_id: cid }, headers: { 'User-Agent': UA_DESKTOP },
  });
  const trs = r.data?.media?.transcodings || [];
  // utamakan progressive mp3 (bisa di-<audio> langsung), fallback hls
  const pick = trs.find((x) => x.format?.protocol === 'progressive') || trs[0];
  if (!pick?.url) return null;
  const meta = await axios.get(pick.url, {
    ...AXIOS_OPTS, params: { client_id: cid }, headers: { 'User-Agent': UA_DESKTOP },
  });
  return meta.data?.url || null;
}

/* ---------- Translate: Google GT (gtx endpoint, gratis tanpa key) ---------- */
async function translateText(q, to = 'id') {
  const r = await axios.get('https://translate.googleapis.com/translate_a/single', {
    ...AXIOS_OPTS, timeout: 12000,
    params: { client: 'gtx', sl: 'auto', tl: to, dt: 't', q },
    headers: { 'User-Agent': UA_DESKTOP },
  });
  const segs = r.data?.[0] || [];
  const text = segs.map((s) => s[0]).join('');
  const from = r.data?.[2] || 'auto';
  if (!text) throw new Error('Hasil terjemahan kosong');
  return { text, from };
}

/* ---------- Kurs Mata Uang: open.er-api (gratis tanpa key) ----------------- */
async function kursRates(base = 'USD') {
  const key = `kurs:${base}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const r = await axios.get(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`, {
    ...AXIOS_OPTS, timeout: 12000,
  });
  if (r.data?.result !== 'success') throw new Error('Gagal ambil kurs');
  const out = {
    base: r.data.base_code,
    updated: r.data.time_last_update_utc,
    rates: Object.fromEntries(
      Object.entries(r.data.rates || {}).filter(([k]) =>
        ['IDR', 'USD', 'EUR', 'JPY', 'SGD', 'MYR', 'AUD', 'GBP', 'SAR', 'CNY', 'KRW', 'THB'].includes(k))
    ),
  };
  cacheSet(key, out, 1000 * 30);
  return out;
}

/* ---------- Harga Crypto: CoinGecko gratis --------------------------------- */
async function cryptoPrices() {
  const key = 'crypto:top';
  const hit = cacheGet(key);
  if (hit) return hit;
  const r = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
    ...AXIOS_OPTS, timeout: 15000,
    params: {
      vs_currency: 'idr', order: 'market_cap_desc', per_page: 12, page: 1,
      sparkline: 'false', price_change_percentage: '24h,7d', locale: 'id',
    },
    headers: { 'User-Agent': UA_DESKTOP },
  });
  const list = (r.data || []).map((c) => ({
    id: c.id, sym: (c.symbol || '').toUpperCase(), name: c.name, img: c.image,
    price: c.current_price, chg24: c.price_change_percentage_24h,
    chg7: c.price_change_percentage_7d_in_currency, mcap: c.market_cap, rank: c.market_cap_rank,
  }));
  if (!list.length) throw new Error('Data crypto kosong');
  cacheSet(key, list, 1000 * 60 * 30);
  return list;
}

/* ---------- Cari Buku: Open Library (gratis tanpa key) --------------------- */
async function bookSearch(q) {
  const key = `books:${q}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const r = await axios.get('https://openlibrary.org/search.json', {
    ...AXIOS_OPTS, timeout: 15000,
    params: { q, limit: 12, fields: 'key,title,author_name,first_publish_year,cover_i,ratings_average,number_of_pages_median,publisher,subject' },
    headers: { 'User-Agent': UA_DESKTOP },
  });
  const list = (r.data?.docs || []).map((b) => ({
    title: b.title || 'Tanpa Judul',
    author: (b.author_name || []).slice(0, 2).join(', ') || '—',
    year: b.first_publish_year || '',
    cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : '',
    rating: b.ratings_average ? b.ratings_average.toFixed(1) : '',
    pages: b.number_of_pages_median || '',
    pub: (b.publisher || [])[0] || '',
    url: `https://openlibrary.org${b.key}`,
  }));
  if (!list.length) throw new Error('Buku ga ketemu di perpustakaan dunia 📚');
  cacheSet(key, list, 1000 * 60 * 30);
  return list;
}

/* ---------- Spotify Track Info: oembed resmi (tanpa key) ------------------- */
async function spotifyTrackInfo(url) {
  if (!/open\.spotify\.com\/(track|album|playlist|episode|show)\//.test(url))
    throw new Error('Link Spotify-nya ga valid (harus track/album/playlist)');
  const r = await axios.get('https://open.spotify.com/oembed', {
    ...AXIOS_OPTS, timeout: 12000,
    params: { url }, headers: { 'User-Agent': UA_DESKTOP },
  });
  const d = r.data || {};
  return {
    title: d.title || '', type: d.type || 'track',
    thumb: d.thumbnail_url || '', provider: d.provider_name || 'Spotify',
    iframe: `https://open.spotify.com/embed/${d.type || 'track'}/${url.split('/').pop().split('?')[0]}?theme=0`,
  };
}

/* ---------- Profil palsu: randomuser.me (gratis) ---------------------------- */
async function fakeIdentity(seed) {
  const r = await axios.get('https://randomuser.me/api/', {
    ...AXIOS_OPTS, timeout: 12000,
    params: seed ? { seed } : {},
  });
  const u = r.data?.results?.[0];
  if (!u) throw new Error('Gagal bikin identitas');
  return {
    name: `${u.name.first} ${u.name.last}`,
    gender: u.gender === 'male' ? 'Laki-laki' : 'Perempuan',
    dob: (u.dob?.date || '').slice(0, 10),
    age: u.dob?.age || '',
    phone: u.phone, cell: u.cell, email: u.email,
    username: u.login?.username || '', password: u.login?.password || '',
    address: [u.location?.street?.name + ' No.' + u.location?.street?.number, u.location?.city, u.location?.state, u.location?.country, u.location?.postcode].filter(Boolean).join(', '),
    picture: u.picture?.large || '',
    seed: r.data?.info?.seed || seed || '',
  };
}

/* ---------- Gacha foto: nekos.best (gratis, stabil, SFW categories) -------- */
async function nekosBest(category = 'waifu') {
  const ALLOW = ['waifu', 'husbando', 'kitsune', 'neko', 'hug', 'wave', 'pat', 'kiss', 'cuddle', 'dance', 'baka', 'smug', 'happy', 'wave', 'poke', 'sleep'];
  const cat = ALLOW.includes(category) ? category : 'waifu';
  // nekos.best wajib UA format "NamaProyek/versi" — browser UA langsung diblok
  const r = await axios.get(`https://nekos.best/api/v2/${cat}`, {
    ...AXIOS_OPTS, timeout: 12000,
    headers: { 'User-Agent': 'AllToolsKYY/6.0 (kyy-tools; contact: rifkyy-sensei)' },
  });
  const res = r.data?.results?.[0];
  if (!res?.url) throw new Error('Gacha gagal, coba lagi');
  return { url: res.url, anime: res.anime_name || '', artist: res.artist_name || '', cat };
}

/* ============================================================================
 * ROUTER / HANDLER
 * ========================================================================== */

exports.handler = async (event) => {
  const route = routeOf(event);
  const method = (event.httpMethod || 'GET').toUpperCase();
  const startedAt = Date.now();

  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };

  try {
    switch (route) {
      /* ------------------------------ HEALTH ------------------------------ */
      case '/health': {
        return ok({
          service: '⚡ All Tools KYY API',
          developer: 'Rifkyy sensei',
          version: '4.1.0',
          time: new Date().toISOString(),
          node: process.version,
        });
      }

      /* --------------------------- INFO VISITOR --------------------------- */
      case '/info': {
        const ip = getClientIp(event);
        const ua = (event.headers || {})['user-agent'] || '';
        const geo = await geoFromIpapi(ip);
        const parsed = parseUserAgent(ua);
        return ok({ ...geo, ...parsed });
      }

      /* ---------------------- TEMPLATE MEME (imgflip) --------------------- */
      case '/memes': {
        if (memesCache.data && memesCache.exp > Date.now())
          return ok({ count: memesCache.data.length, memes: memesCache.data, cached: true });
        const { data } = await axios.get('https://api.imgflip.com/get_memes', {
          ...AXIOS_OPTS,
          headers: { 'User-Agent': UA_DESKTOP },
        });
        const memes = (data?.data?.memes || []).map((m) => ({
          id: m.id, name: m.name, url: m.url,
          width: m.width, height: m.height, boxCount: m.box_count,
        }));
        if (!memes.length) return fail('Gagal memuat template meme', 502);
        memesCache.data = memes;
        memesCache.exp = Date.now() + 6 * 3600_000; // cache 6 jam
        return ok({ count: memes.length, memes, cached: false });
      }

      /* --------------------- STALK TIKTOK (tikwm user info) --------------- */
      case '/stalk/tiktok': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const user = String(body.username || '').trim().replace(/^@+/, '');
        if (!/^[A-Za-z0-9._]{2,24}$/.test(user)) return fail('Username TikTok tidak valid');
        const { data } = await axios.get('https://www.tikwm.com/api/user/info', {
          ...AXIOS_OPTS,
          params: { unique_id: user },
          headers: {
            Accept: 'application/json, text/javascript, */*; q=0.01',
            Origin: 'https://www.tikwm.com',
            Referer: 'https://www.tikwm.com/',
            'User-Agent': UA_ANDROID,
            'X-Requested-With': 'XMLHttpRequest',
          },
        });
        const d = data?.data;
        if (!d?.user?.uniqueId) throw new Error(data?.msg || 'User tidak ditemukan atau akunnya private');
        return ok({
          platform: 'tiktok',
          user: {
            username: d.user.uniqueId,
            nickname: d.user.nickname || d.user.uniqueId,
            avatar: d.user.avatarLarger || d.user.avatarMedium || d.user.avatarThumb || null,
            bio: d.user.signature || '',
            verified: Boolean(d.user.verified || d.user.customVerify),
            region: d.user.region || null,
          },
          stats: {
            followers: d.stats?.followerCount || 0,
            following: d.stats?.followingCount || 0,
            likes: d.stats?.heartCount || d.stats?.heart || 0,
            videos: d.stats?.videoCount || 0,
            digg: d.stats?.diggCount || 0,
          },
        });
      }

      /* -------------------------- CEK IP (GEO LOOKUP) --------------------- */
      case '/tools/ipgeo': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const ip = String(body.ip || '').trim();
        const isV4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
        if (!isV4 && !/^[0-9a-fA-F:]{3,45}$/.test(ip)) return fail('Format IP tidak valid');
        if (isV4 && ip.split('.').some((n) => +n > 255)) return fail('IP tidak valid (oktet > 255)');
        if (/^(10\.|127\.|192\.168\.|0\.)/.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip))
          return fail('Itu IP privat/lokal jaringan sendiri, ga bisa dilacak 🏠');
        const geo = await geoFromIpapi(ip);
        return ok(geo);
      }

      /* ------------- TANYA USTADZ (PORT dari plugins/canvas/pakustad.js) -- */
      case '/tools/ustadz': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const text = String(body.text || '').trim();
        if (!text) return fail('Pertanyaannya mana? 🤔');
        if (text.length > 120) return fail('Maksimal 120 karakter');
        const { data } = await axios.get('https://api.cuki.biz.id/api/canvas/ustadz', {
          ...AXIOS_OPTS,
          params: { apikey: 'cuki-x', text },
          headers: { 'User-Agent': UA_DESKTOP },
        });
        const img = data?.results?.url;
        if (!img) throw new Error('Server ustadz lagi ngambek, coba lagi nanti');
        return ok({ image: img.replace(/^http:/, 'https:'), text });
      }

      /* --------------- JADWAL SHOLAT (PORT dari plugins/religi) ----------- */
      case '/sholat/cari': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const kota = String(body.kota || '').trim();
        if (!/^[a-zA-Z\s.'-]{2,40}$/.test(kota)) return fail('Nama kota tidak valid');
        const { data } = await axios.get(
          `https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(kota.toLowerCase())}`,
          { ...AXIOS_OPTS, headers: { 'User-Agent': UA_DESKTOP } }
        );
        const list = (data?.data || []).map((k) => ({ id: k.id, lokasi: k.lokasi }));
        if (!list.length) return fail(`Kota "${kota}" ga ketemu, coba nama lain`);
        return ok({ count: list.length, cities: list });
      }

      case '/sholat/jadwal': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        let kotaId = String(body.kotaId || '').trim();
        if (!kotaId) {
          const kota = String(body.kota || 'jakarta').trim();
          const { data } = await axios.get(
            `https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(kota.toLowerCase())}`,
            { ...AXIOS_OPTS, headers: { 'User-Agent': UA_DESKTOP } }
          );
          kotaId = data?.data?.[0]?.id || '1301';
        }
        if (!/^\d+$/.test(kotaId)) return fail('ID kota tidak valid');
        // tanggal hari ini (zona Asia/Jakarta)
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
        }).formatToParts(new Date());
        const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
        const { data } = await axios.get(
          `https://api.myquran.com/v2/sholat/jadwal/${kotaId}/${p.year}/${p.month}/${p.day}`,
          { ...AXIOS_OPTS, headers: { 'User-Agent': UA_DESKTOP } }
        );
        const d = data?.data;
        if (!d?.jadwal) throw new Error('Jadwal tidak ditemukan');
        return ok({
          lokasi: d.lokasi, daerah: d.daerah,
          tanggal: d.jadwal.tanggal,
          jadwal: {
            imsak: d.jadwal.imsak, subuh: d.jadwal.subuh, terbit: d.jadwal.terbit,
            dhuha: d.jadwal.dhuha, dzuhur: d.jadwal.dzuhur, ashar: d.jadwal.ashar,
            maghrib: d.jadwal.maghrib, isya: d.jadwal.isya,
          },
        });
      }

      /* ------------ GITHUB STALK (PORT dari plugins/stalker/githubstalk) -- */
      case '/stalk/github': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const user = String(body.username || '').trim();
        if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(user)) return fail('Username GitHub tidak valid');
        const cached = geoCache.get(`gh:${user.toLowerCase()}`);
        if (cached && cached.exp > Date.now()) return ok(cached.data);
        try {
          const { data } = await axios.get(`https://api.github.com/users/${encodeURIComponent(user)}`, {
            ...AXIOS_OPTS,
            headers: { 'User-Agent': UA_DESKTOP, Accept: 'application/vnd.github+json' },
          });
          const out = {
            login: data.login, name: data.name || data.login,
            avatar: data.avatar_url, bio: data.bio || '',
            company: data.company || null, location: data.location || null,
            blog: data.blog || null,
            repos: data.public_repos || 0, gists: data.public_gists || 0,
            followers: data.followers || 0, following: data.following || 0,
            joined: data.created_at, url: data.html_url,
          };
          geoCache.set(`gh:${user.toLowerCase()}`, { data: out, exp: Date.now() + 600_000 });
          return ok(out);
        } catch (e) {
          if (e.response?.status === 404) return fail(`User "${user}" ga ketemu di GitHub`);
          if (e.response?.status === 403) return fail('Kena rate limit GitHub, coba sejam lagi 🙏', 429);
          throw e;
        }
      }

      /* ------------------------------ TOOLS ------------------------------- */
      case '/tools/qrcode': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const text = String(body.text || '').trim();
        if (!text) return fail('Teks QR tidak boleh kosong');
        if (text.length > 2000) return fail('Teks terlalu panjang (maks 2000)');
        const size = Math.min(Math.max(parseInt(body.size) || 512, 128), 1024);
        const dark = /^#[0-9a-fA-F]{6}$/.test(body.colorDark || '') ? body.colorDark : '#0b0e1d';
        const light = /^#[0-9a-fA-F]{6}$/.test(body.colorLight || '') ? body.colorLight : '#ffffff';
        const dataUrl = await QRCode.toDataURL(text, {
          width: size,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark, light },
        });
        return ok({ dataUrl, text, size });
      }

      case '/tools/password': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const length = Math.min(Math.max(parseInt(body.length) || 16, 4), 64);
        const result = generatePassword({
          length,
          upper: body.upper !== false,
          lower: body.lower !== false,
          numbers: body.numbers !== false,
          symbols: body.symbols !== false,
        });
        return ok(result);
      }

      case '/tools/morse': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const text = String(body.text || '').trim();
        if (!text) return fail('Teks tidak boleh kosong');
        if (text.length > 500) return fail('Teks terlalu panjang (maks 500)');
        const mode = body.mode === 'decode' ? 'decode' : 'encode';
        const result = mode === 'encode' ? morseEncode(text) : morseDecode(text);
        if (!result) return fail('Tidak ada karakter yang bisa dikonversi');
        return ok({ mode, input: text, result });
      }

      case '/tools/base64': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const text = String(body.text || '');
        if (!text) return fail('Teks tidak boleh kosong');
        if (text.length > 10000) return fail('Teks terlalu panjang (maks 10000)');
        const mode = body.mode === 'decode' ? 'decode' : 'encode';
        try {
          const result =
            mode === 'encode'
              ? Buffer.from(text, 'utf8').toString('base64')
              : Buffer.from(String(text).replace(/\s/g, ''), 'base64').toString('utf8');
          return ok({ mode, input: text, result });
        } catch {
          return fail('Gagal decode — input bukan Base64 yang valid');
        }
      }

      case '/tools/calc': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        try {
          const result = safeEvaluate(String(body.expression || ''));
          return ok({ expression: body.expression, result });
        } catch (e) {
          return fail(e.message);
        }
      }

      /* --------------------------- DOWNLOADER ----------------------------- */
      case '/downloader/tiktok':
      case '/downloader/instagram':
      case '/downloader/youtube':
      case '/downloader/aio': {
        if (method !== 'POST') return fail('Gunakan method POST', 405);
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 15)) return fail('Terlalu banyak request, coba lagi dalam 1 menit ⏳', 429);

        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const url = String(body.url || '').trim();
        if (!isValidHttpUrl(url)) return fail('URL tidak valid. Harus diawali http:// atau https://');

        const requiredPlatform = route.replace('/downloader/', '');
        const detected = detectPlatform(url);

        if (requiredPlatform !== 'aio' && detected !== requiredPlatform) {
          const nice = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube' }[requiredPlatform];
          return fail(`URL sepertinya bukan link ${nice} 🤔 (terdeteksi: ${detected || 'tidak dikenal'})`);
        }

        let result;
        if (requiredPlatform === 'tiktok') result = await handleTiktok(url);
        else if (requiredPlatform === 'instagram') result = await handleInstagram(url);
        else if (requiredPlatform === 'youtube') result = await handleYoutube(url);
        else result = await handleAio(url);

        return ok({ ...result, tookMs: Date.now() - startedAt });
      }

      /* ----------------- BRAT API (brat cewek dkk, port bot WA) ------------ */
      case '/tools/brat': {
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 15)) return fail('Terlalu banyak request, coba lagi dalam 1 menit ⏳', 429);
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const text = String(q.text || '').trim().slice(0, 120);
        if (!text) return fail('Teks brat tidak boleh kosong 🌿');
        const type = String(q.type || 'cewek');
        if (type !== 'cewek') return fail('Tipe brat tidak dikenal');
        const r = await bratCewekImage(text);
        return ok({ ...r, tookMs: Date.now() - startedAt });
      }

      /* ---------------- QC QUOTE CHAT (port plugins/sticker/qc.js) -------- */
      case '/tools/qc': {
        if (method !== 'POST') return fail('Gunakan method POST', 405);
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 15)) return fail('Terlalu banyak request, coba lagi dalam 1 menit ⏳', 429);
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const name = String(body.name || 'User').trim().slice(0, 40) || 'User';
        const text = String(body.text || '').trim();
        if (!text) return fail('Teks quote tidak boleh kosong 💬');
        if (text.length > 90) return fail('Teks kepanjangan, maks 90 karakter ya');
        const colorKey = QC_COLORS[body.color] ? String(body.color) : 'dark';
        let photoUrl = null;
        if (body.photoUrl) {
          const p = String(body.photoUrl).slice(0, 300);
          if (!isValidHttpUrl(p) || !p.startsWith('https://')) return fail('URL foto harus https');
          const host = new URL(p).hostname;
          if (!QC_HOST_ALLOWED.includes(host)) return fail('Host foto tidak diizinkan (pakai uploader di sini aja 😉)');
          photoUrl = p;
        }
        const r = await quoteStickerImage({ name, text, colorKey, photoUrl });
        return ok({ ...r, tookMs: Date.now() - startedAt });
      }

      /* ------------ UPLOAD FOTO -> LINK (port bagian upload smeme.js) ------ */
      case '/tools/upload': {
        if (method !== 'POST') return fail('Gunakan method POST', 405);
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 15)) return fail('Terlalu banyak request, coba lagi dalam 1 menit ⏳', 429);
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const b64 = String(body.b64 || '');
        const mime = /^image\/(png|jpe?g|gif|webp)$/i.test(String(body.mime || '')) ? body.mime : 'image/png';
        if (!b64 || b64.length < 30) return fail('Data gambar kosong 🖼️');
        if (b64.length > 12_000_000 * 1.4) return fail('Foto terlalu besar, maks ~12MB ya');
        const buf = Buffer.from(b64.replace(/^data:[^,]+,/, ''), 'base64');
        const isPng = buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47;
        const isJpg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8;
        const isGif = buf.length > 6 && buf.toString('ascii', 0, 4) === 'GIF8';
        const isWebp = buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
        if (!(isPng || isJpg || isGif || isWebp)) return fail('Bukan gambar yang valid 🤔');
        const ext = mime.split('/')[1].replace('jpeg', 'jpg');
        const name = (String(body.name || 'foto').split('.')[0].replace(/[^\w-]+/g, '').slice(0, 24) || 'foto') + '.' + ext;
        const r = await uploadImageCdn(name, mime, buf);
        return ok({ ...r, size: buf.length, url: r.url, tookMs: Date.now() - startedAt });
      }

      /* ---------- STALK PINTEREST (port plugins/stalker/pintereststalk) ---- */
      case '/stalk/pinterest': {
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const user = String(q.username || '').trim().replace(/^@+/, '');
        if (!/^[A-Za-z0-9._-]{2,30}$/.test(user)) return fail('Username Pinterest tidak valid');
        const r = await pinterestProfile(user);
        return ok({ user: r, tookMs: Date.now() - startedAt });
      }

      /* -------------- PRIMBON (port plugins/primbon/*.js) ------------------ */
      case '/primbon': {
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const type = String(q.type || '');
        if (type === 'artinama') {
          const nama = String(q.nama || '').trim().slice(0, 40);
          if (!/^[A-Za-z' .,-]{2,40}$/.test(nama)) return fail('Namanya aneh, huruf aja ya 🔮');
          return ok({ result: await primbonFetch('artinama', { nama }), tookMs: Date.now() - startedAt });
        }
        if (type === 'cocok') {
          const nama1 = String(q.nama1 || '').trim().slice(0, 40);
          const nama2 = String(q.nama2 || '').trim().slice(0, 40);
          if (!/^[A-Za-z' .,-]{2,40}$/.test(nama1) || !/^[A-Za-z' .,-]{2,40}$/.test(nama2))
            return fail('Isi dua nama yang bener ya 💞');
          return ok({ result: await primbonFetch('cocok', { nama1, nama2 }), tookMs: Date.now() - startedAt });
        }
        if (type === 'zodiak') {
          const z = String(q.zodiak || '').trim().toLowerCase();
          const LIST = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagitarius','sagittarius','capricorn','aquarius','pisces'];
          if (!LIST.includes(z)) return fail('Zodiak tidak dikenal, tulis yang bener (mis. leo) ♈');
          const rs = await primbonFetch('zodiak', { zodiak: z === 'sagittarius' ? 'sagitarius' : z });
          return ok({ result: rs, zodiak: z, tookMs: Date.now() - startedAt });
        }
        return fail('Tipe primbon tidak dikenal');
      }

      /* ------------ REMOVE BG (port src/scraper/removebackground.js) ------- */
      case '/tools/removebg': {
        if (method !== 'POST') return fail('Gunakan method POST', 405);
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 12)) return fail('Santai dulu 1 menit ya ✂️', 429);
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const buf = Buffer.from(String(body.b64 || '').replace(/^data:[^,]+,/, ''), 'base64');
        if (buf.length < 500) return fail('Gambar kosong/invalid ✂️');
        if (buf.length > 9 * 1024 * 1024) return fail('Foto kebesaran, kecilin dulu maks ~9MB');
        const boundary = '----KyyBg' + crypto.randomBytes(8).toString('hex');
        const payload = Buffer.concat([
          Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="foto.png"\r\nContent-Type: image/png\r\n\r\n`),
          buf,
          Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="format"\r\n\r\npng\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nv1\r\n--${boundary}--\r\n`),
        ]);
        const { data, headers: hres } = await axios.post(
          'https://api2.pixelcut.app/image/matte/v1',
          payload,
          {
            timeout: 50000, maxRedirects: 5, responseType: 'arraybuffer', maxBodyLength: Infinity,
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'x-locale': 'en', 'x-client-version': 'web:pixa.com:4a5b0af2',
              'origin': 'https://www.pixa.com', 'referer': 'https://www.pixa.com/',
            },
          }
        );
        const out = Buffer.from(data);
        if (out.length < 400) {
          let txt = '';
          try { txt = JSON.parse(out.toString('utf8'))?.message || ''; } catch { txt = out.toString('utf8').slice(0, 120); }
          return fail('Server removebg lagi penuh 😭 ' + (txt || 'coba lagi bentar'), 502);
        }
        return ok({ image: out.toString('base64'), mime: 'image/png', bytes: out.length, tookMs: Date.now() - startedAt });
      }

      /* -------------- SEARCH (batch 3.0: lirik & pinterest) ---------------- */
      case '/search/lyrics': {
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const query = String(q.q || '').trim().slice(0, 120);
        if (!query) return fail('Judul lagunya mana? 🎵');
        return ok({ result: await lyricsSearch(query), tookMs: Date.now() - startedAt });
      }

      case '/search/pinterest': {
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const query = String(q.q || '').trim().slice(0, 80);
        if (!query) return fail('Kata kuncinya kosong 📌');
        return ok({ result: await pinterestSearch(query), tookMs: Date.now() - startedAt });
      }

      /* -------------- STALK GAME (batch 3.0: FF & Roblox) ------------------ */
      case '/stalk/ff': {
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const uid = String(q.uid || '').trim();
        if (!/^\d{6,15}$/.test(uid)) return fail('UID Free Fire harus angka 6–15 digit 🔥');
        return ok({ user: await ffProfile(uid), tookMs: Date.now() - startedAt });
      }

      case '/stalk/roblox': {
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const user = String(q.username || '').trim();
        if (!/^[A-Za-z0-9_]{3,20}$/.test(user)) return fail('Username Roblox tidak valid (huruf/angka/underscore)');
        return ok({ user: await robloxProfile(user), tookMs: Date.now() - startedAt });
      }

      /* ================= AI ZONE (batch 4.0) ================= */
      case '/ai/image': {
        if (method !== 'POST') return fail('Gunakan method POST', 405);
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 10)) return fail('Kebanyakan bikin gambar, dingin dulu 1 menit 🎨', 429);
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const prompt = String(body.prompt || '').trim().slice(0, 500);
        if (prompt.length < 4) return fail('Prompt terlalu pendek 🎨');
        if (/\b(ngentot|porn|nude|nsfw|sex|hentai)\b/i.test(prompt)) return fail('Prompt-nya ga sopan 🔒');
        const RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];
        const ratio = RATIOS.includes(body.ratio) ? body.ratio : '1:1';
        return ok({ result: await aiFluxImage(prompt, ratio), tookMs: Date.now() - startedAt });
      }

      case '/ai/chat': {
        if (method !== 'POST') return fail('Gunakan method POST', 405);
        const ip = getClientIp(event);
        if (!rateLimit(`ai:${ip}`, 25)) return fail('Siminya pegal dengerin kamu, istirahat dulu 1 menit 😹', 429);
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const text = String(body.text || '').trim().slice(0, 500);
        if (!text) return fail('Ngomongin apa? 🤖');
        return ok({ reply: await aiSimiChat(text), tookMs: Date.now() - startedAt });
      }

      case '/ai/math': {
        if (method !== 'POST') return fail('Gunakan method POST', 405);
        const ip = getClientIp(event);
        if (!rateLimit(`ai:${ip}`, 25)) return fail('AI-nya butuh istirahat 1 menit 🧮', 429);
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const text = String(body.text || '').trim().slice(0, 800);
        if (!text) return fail('Soalnya mana? 🧮');
        // Smart fallback: kalo soal aritmatika murni, hitung lokal langsung (instan, ga perlu AI)
        if (/^[\d\s+\-*/%(),.]+$/.test(text) && /\d\s*[+\-*/]\s*\d/.test(text)) {
          try {
            const expr = text.replace(/,/g, '.');
            const result = safeEvaluate(expr);
            const steps = `Jawabannya instan nih (dihitung pake engine lokal ⚡):\n\n**${expr} = ${result}**\n\nKalo mau penjelasan AI yang lebih verbal, tulis soalnya pake kalimat ya, contoh: "berapa keliling lingkaran jari-jari 7?"`;
            return ok({ answer: steps, mode: 'local', tookMs: Date.now() - startedAt });
          } catch { /* lanjut ke AI */ }
        }
        try {
          return ok({ answer: await aiMathSolve(text), mode: 'ai', tookMs: Date.now() - startedAt });
        } catch (e) {
          return fail('AI-nya lagi rehat bentar 😴 coba soal aritmatika murni (mis. 12*7+3) atau ulang beberapa menit lagi', 503);
        }
      }

      case '/tools/libur': {
        return ok({ result: await holidaysInfo(), tookMs: Date.now() - startedAt });
      }

      case '/tools/cuaca': {
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const kota = String(q.kota || '').trim().slice(0, 80);
        if (!kota) return fail('Kotanya mana dong ☁️');
        return ok({ result: await weatherInfo(kota), tookMs: Date.now() - startedAt });
      }

      case '/random/ppcouple': {
        const ip = getClientIp(event);
        if (!rateLimit(`gen:${ip}`, 20)) return fail('Santai dulu woy 💑', 429);
        return ok({ result: await ppCoupleRandom(), tookMs: Date.now() - startedAt });
      }

      case '/random/anime': {
        const ip = getClientIp(event);
        if (!rateLimit(`gen:${ip}`, 20)) return fail('Santai dulu woy ✨', 429);
        const r = await getB64Image('https://api.nexray.eu.cc/random/anime?type=waifu', { timeout: 30000 });
        return ok({ ...r, tookMs: Date.now() - startedAt });
      }

      /* ------------------- V4.1: DOWNLOADER & SEARCH BARU ------------------ */
      case '/downloader/pinterest': {
        const body = method === 'POST' ? (parseBody(event) || {}) : readParams(event);
        if (!String(body?.url || '').trim()) return fail('URL pin-nya mana? 📌');
        const url = String(body.url).trim();
        if (!/pinterest\.|pin\.it/i.test(url)) return fail('Itu bukan link Pinterest 📌');
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 15)) return fail('Santai dulu ⏳', 429);
        return ok({ ...(await pinterestPinScrape(url)), tookMs: Date.now() - startedAt });
      }
      case '/downloader/terabox': {
        const body = method === 'POST' ? (parseBody(event) || {}) : readParams(event);
        if (!String(body?.url || '').trim()) return fail('URL terabox-nya mana? 📦');
        const url = String(body.url).trim();
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 15)) return fail('Santai dulu ⏳', 429);
        return ok({ ...(await teraboxFiles(url)), tookMs: Date.now() - startedAt });
      }
      case '/search/music': {
        const q = method === 'POST' ? (parseBody(event) || {}) : readParams(event);
        const query = String(q.q || '').trim().slice(0, 100);
        if (!query) return fail('Judul lagunya mana? 🎵');
        const ip = getClientIp(event);
        if (!rateLimit(`srch:${ip}`, 25)) return fail('Spam mulu 😤', 429);
        return ok({ result: await deezerSearch(query), tookMs: Date.now() - startedAt });
      }
      case '/search/tiktok': {
        const q = method === 'POST' ? (parseBody(event) || {}) : readParams(event);
        const query = String(q.q || '').trim().slice(0, 100);
        if (!query) return fail('Mau cari video apa? 🎬');
        const ip = getClientIp(event);
        if (!rateLimit(`srch:${ip}`, 25)) return fail('Spam mulu 😤', 429);
        return ok({ result: await tiktokSearchList(query), tookMs: Date.now() - startedAt });
      }
      case '/search/apk': {
        const q = method === 'POST' ? (parseBody(event) || {}) : readParams(event);
        const query = String(q.q || '').trim().slice(0, 80);
        if (!query) return fail('Nama aplikasinya mana? 📱');
        const ip = getClientIp(event);
        if (!rateLimit(`srch:${ip}`, 25)) return fail('Spam mulu 😤', 429);
        return ok({ result: await apkSearchList(query), tookMs: Date.now() - startedAt });
      }
      case '/downloader/mediafire': {
        const body = method === 'POST' ? (parseBody(event) || {}) : readParams(event);
        if (!String(body?.url || '').trim()) return fail('URL MediaFire-nya mana? 🔥');
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 15)) return fail('Santai dulu ⏳', 429);
        return ok({ ...(await mediafireResolve(String(body.url).trim())), tookMs: Date.now() - startedAt });
      }
      case '/downloader/sfile': {
        const body = method === 'POST' ? (parseBody(event) || {}) : readParams(event);
        if (!String(body?.url || '').trim()) return fail('URL Sfile-nya mana? 📂');
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 12)) return fail('Santai dulu ⏳', 429);
        return ok({ ...(await sfileResolve(String(body.url).trim())), tookMs: Date.now() - startedAt });
      }
      case '/search/sfile': {
        const q = method === 'POST' ? (parseBody(event) || {}) : readParams(event);
        const query = String(q.q || '').trim().slice(0, 80);
        if (!query) return fail('Mau cari file apa? 📂');
        const ip = getClientIp(event);
        if (!rateLimit(`srch:${ip}`, 20)) return fail('Spam mulu 😤', 429);
        return ok({ result: await sfileSearch(query), tookMs: Date.now() - startedAt });
      }
      case '/search/stikerpack': {
        const q = method === 'POST' ? (parseBody(event) || {}) : readParams(event);
        const query = String(q.q || '').trim().slice(0, 60);
        if (!query) return fail('Mau cari stiker apa? 🧸');
        const ip = getClientIp(event);
        if (!rateLimit(`srch:${ip}`, 20)) return fail('Spam mulu 😤', 429);
        return ok({ result: await stickerPackSearch(query), tookMs: Date.now() - startedAt });
      }
      /* ------------------------------ TEMP MAIL ---------------------------- */
      case '/tempmail/new': {
        const ip = getClientIp(event);
        if (!rateLimit(`gen:${ip}`, 10)) return fail('Kebanyakan bikin email 😅', 429);
        return ok({ result: await tempmailCreate(), tookMs: Date.now() - startedAt });
      }
      case '/tempmail/inbox': {
        const q = method === 'POST' ? (parseBody(event) || {}) : readParams(event);
        const token = String(q.token || '').trim();
        if (token.length < 20) return fail('Token temp mail ga valid 📧');
        return ok({ result: await tempmailInbox(token), tookMs: Date.now() - startedAt });
      }
      case '/tempmail/read': {
        const q = method === 'POST' ? (parseBody(event) || {}) : readParams(event);
        const token = String(q.token || '').trim();
        const id = String(q.id || '').trim();
        if (token.length < 20 || !id) return fail('Data temp mail kurang 📧');
        return ok({ result: await tempmailReadMsg(token, id), tookMs: Date.now() - startedAt });
      }


      /* ------------------------ v5.2 SYLPHA BATCH ------------------------- */
      case '/info/gempa': {
        const ip = getClientIp(event);
        if (!rateLimit(`gem:${ip}`, 15)) return fail('Sabar, bumi lagi bergetar 🌍', 429);
        return ok({ result: await bmkgGempa(), tookMs: Date.now() - startedAt });
      }
      case '/fun/emojimix': {
        const q = method === 'POST' ? (parseBody(event) || {}) : readParams(event);
        const e1 = String(q.a || '').trim();
        const e2 = String(q.b || '').trim();
        if (!e1 || !e2) return fail('Isi 2 emojinya dulu 😀');
        if ([...e1].length + [...e2].length > 14) return fail('Emoji doang ya, jangan kalimat 😅');
        const ip = getClientIp(event);
        if (!rateLimit(`mix:${ip}`, 12)) return fail('Dapurnya lagi penuh 😤', 429);
        return ok({ result: await emojiMix(e1, e2), tookMs: Date.now() - startedAt });
      }
      case '/info/berita': {
        const q = method === 'POST' ? (parseBody(event) || {}) : readParams(event);
        const k = String(q.src || 'cnn').trim();
        if (!BERITA_SRC[k]) return fail('Sumber berita ga dikenal 📰');
        const ip = getClientIp(event);
        if (!rateLimit(`news:${ip}`, 20)) return fail('Keseringan baca, bentar 😅', 429);
        return ok({ result: await beritaFetch(k), tookMs: Date.now() - startedAt });
      }
      case '/tools/shorten': {
        const q = method === 'POST' ? (parseBody(event) || {}) : readParams(event);
        const url = String(q.url || '').trim();
        const ip = getClientIp(event);
        if (!rateLimit(`cut:${ip}`, 10)) return fail('Santai woy ngapa banyak2 ✂️', 429);
        return ok({ result: await shortLink(url), tookMs: Date.now() - startedAt });
      }
      /* ------------------------- GAME GRATISAN (v3) ----------------------- */
      case '/games/free': {
        const ip = getClientIp(event);
        if (!rateLimit(`gen:${ip}`, 20)) return fail('Santai dulu woy 🎁', 429);
        return ok({ result: await freeGamesList(), tookMs: Date.now() - startedAt });
      }

      /* ========================= ✨ V6 ROUTES ✨ ========================== */

      case '/search/youtube': {
        const ip = getClientIp(event);
        if (!rateLimit(`ytsearch:${ip}`, 20)) return fail('Santai woy, YouTube-nya juga butuh napas 🎬', 429);
        const qy = ((method === 'POST' ? parseBody(event)?.q : null) || readParams(event).q || '').toString().trim().slice(0, 80);
        if (!qy) return fail('Kasih kata kunci dulu ya');
        return ok({ result: await ytSearchList(qy), tookMs: Date.now() - startedAt });
      }

      case '/soundcloud/search': {
        const ip = getClientIp(event);
        if (!rateLimit(`scsearch:${ip}`, 20)) return fail('Santai woy 🎧', 429);
        const q = ((method === 'POST' ? parseBody(event)?.q : null) || readParams(event).q || '').toString().trim().slice(0, 80);
        if (!q) return fail('Kasih kata kunci dulu ya');
        return ok({ result: await soundcloudSearch(q), tookMs: Date.now() - startedAt });
      }

      case '/soundcloud/stream': {
        const ip = getClientIp(event);
        if (!rateLimit(`scstream:${ip}`, 30)) return fail('Santai woy 🎧', 429);
        const id = ((method === 'POST' ? parseBody(event)?.id : null) || readParams(event).id || '').toString().trim();
        if (!/^\d+$/.test(id)) return fail('ID track ga valid');
        const url = await soundcloudStreamUrl(id);
        if (!url) return fail('Stream mp3-nya ga tersedia buat track ini');
        return ok({ result: { url }, tookMs: Date.now() - startedAt });
      }

      case '/spotify/info': {
        const ip = getClientIp(event);
        if (!rateLimit(`spotify:${ip}`, 20)) return fail('Santai woy 🟢', 429);
        const url = ((method === 'POST' ? parseBody(event)?.url : null) || readParams(event).url || '').toString().trim();
        return ok({ result: await spotifyTrackInfo(url), tookMs: Date.now() - startedAt });
      }

      case '/translate': {
        const ip = getClientIp(event);
        if (!rateLimit(`tr:${ip}`, 25)) return fail('Santai woy 🌍', 429);
        const q = ((method === 'POST' ? parseBody(event)?.q : null) || readParams(event).q || '').toString().trim().slice(0, 1500);
        const to = ((method === 'POST' ? parseBody(event)?.to : null) || readParams(event).to || 'id').toString().trim().slice(0, 5);
        if (!q) return fail('Kasih teks yang mau diterjemahin');
        return ok({ result: await translateText(q, to), tookMs: Date.now() - startedAt });
      }

      case '/kurs': {
        const ip = getClientIp(event);
        if (!rateLimit(`kurs:${ip}`, 30)) return fail('Santai woy 💱', 429);
        const base = (readParams(event).base || 'USD').toString().trim().toUpperCase().slice(0, 3) || 'USD';
        return ok({ result: await kursRates(base), tookMs: Date.now() - startedAt });
      }

      case '/crypto': {
        const ip = getClientIp(event);
        if (!rateLimit(`crypto:${ip}`, 15)) return fail('Santai woy 🪙', 429);
        return ok({ result: await cryptoPrices(), tookMs: Date.now() - startedAt });
      }

      case '/search/books': {
        const ip = getClientIp(event);
        if (!rateLimit(`books:${ip}`, 20)) return fail('Santai woy 📚', 429);
        const q = ((method === 'POST' ? parseBody(event)?.q : null) || readParams(event).q || '').toString().trim().slice(0, 100);
        if (!q) return fail('Kasih judul/penulis buku dulu');
        return ok({ result: await bookSearch(q), tookMs: Date.now() - startedAt });
      }

      case '/fakeidentity': {
        const ip = getClientIp(event);
        if (!rateLimit(`fakeid:${ip}`, 20)) return fail('Santai woy 🎭', 429);
        const seed = (readParams(event).seed || '').toString().trim().slice(0, 30) || undefined;
        return ok({ result: await fakeIdentity(seed), tookMs: Date.now() - startedAt });
      }

      case '/nekos': {
        const ip = getClientIp(event);
        if (!rateLimit(`nekos:${ip}`, 30)) return fail('Santai woy 🐱', 429);
        const cat = ((method === 'POST' ? parseBody(event)?.cat : null) || readParams(event).cat || 'waifu').toString().trim().toLowerCase();
        return ok({ result: await nekosBest(cat), tookMs: Date.now() - startedAt });
      }

      /* ------------------- V6.1 PAKET SULTAN ------------------ */
      case '/quran/list': {
        const ip = getClientIp(event);
        if (!rateLimit(`quran:${ip}`, 30)) return fail('Santai woy 📖', 429);
        return ok({ result: await quranSurahList(), tookMs: Date.now() - startedAt });
      }
      case '/quran/surat': {
        const nomor = parseInt(((method === 'POST' ? parseBody(event)?.nomor : null) || readParams(event).nomor || '0'), 10);
        if (!nomor || nomor < 1 || nomor > 114) return fail('Nomor surat 1-114 ya 📖');
        const ip = getClientIp(event);
        if (!rateLimit(`quran:${ip}`, 30)) return fail('Santai woy 📖', 429);
        return ok({ result: await quranSurahDetail(nomor), tookMs: Date.now() - startedAt });
      }
      case '/doa/harian': {
        const ip = getClientIp(event);
        if (!rateLimit(`doa:${ip}`, 30)) return fail('Santai woy 🤲', 429);
        return ok({ result: await doaHarian(), tookMs: Date.now() - startedAt });
      }
      case '/asmaulhusna': {
        const ip = getClientIp(event);
        if (!rateLimit(`asma:${ip}`, 30)) return fail('Santai woy 📿', 429);
        return ok({ result: await asmaulHusna(), tookMs: Date.now() - startedAt });
      }
      case '/downloader/twitter': {
        const url = String(((method === 'POST' ? parseBody(event)?.url : null) || readParams(event).url || '')).trim();
        if (!url) return fail('Link tweet-nya mana? 🐦');
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 15)) return fail('Santai dulu ⏳', 429);
        return ok({ result: await twitterDownload(url), tookMs: Date.now() - startedAt });
      }
      case '/manga/search': {
        const query = String(((method === 'POST' ? parseBody(event)?.query : null) || readParams(event).query || '')).trim().slice(0, 60);
        if (query.length < 2) return fail('Judul manganya mana? 📚');
        const ip = getClientIp(event);
        if (!rateLimit(`manga:${ip}`, 20)) return fail('Santai woy 📚', 429);
        return ok({ result: await mangaSearch(query), tookMs: Date.now() - startedAt });
      }
      case '/manga/chapters': {
        const id = String(((method === 'POST' ? parseBody(event)?.id : null) || readParams(event).id || '')).trim();
        if (!id) return fail('ID manganya mana? 📚');
        const ip = getClientIp(event);
        if (!rateLimit(`manga:${ip}`, 20)) return fail('Santai woy 📚', 429);
        return ok({ result: await mangaChapters(id), tookMs: Date.now() - startedAt });
      }
      case '/manga/pages': {
        const id = String(((method === 'POST' ? parseBody(event)?.id : null) || readParams(event).id || '')).trim();
        if (!id) return fail('ID chapternya mana? 📚');
        const ip = getClientIp(event);
        if (!rateLimit(`manga:${ip}`, 25)) return fail('Santai woy 📚', 429);
        return ok({ result: await mangaPages(id), tookMs: Date.now() - startedAt });
      }
      case '/deezer/chart': {
        const ip = getClientIp(event);
        if (!rateLimit(`deezer:${ip}`, 20)) return fail('Santai woy 🎶', 429);
        return ok({ result: await deezerChart(), tookMs: Date.now() - startedAt });
      }
      case '/tools/webshot': {
        const url = String(((method === 'POST' ? parseBody(event)?.url : null) || readParams(event).url || '')).trim().slice(0, 200);
        if (!url) return fail('URL web-nya mana? 📸');
        const ip = getClientIp(event);
        if (!rateLimit(`webshot:${ip}`, 8)) return fail('Santai, mesin fotonya butuh napas 📸', 429);
        return ok({ result: await webScreenshot(url), tookMs: Date.now() - startedAt });
      }
      case '/tools/whois': {
        const domain = String(((method === 'POST' ? parseBody(event)?.domain : null) || readParams(event).domain || '')).trim().slice(0, 100);
        if (!domain) return fail('Domain-nya mana? 🔎');
        const ip = getClientIp(event);
        if (!rateLimit(`whois:${ip}`, 15)) return fail('Santai woy 🔎', 429);
        return ok({ result: await whoisDomain(domain), tookMs: Date.now() - startedAt });
      }

      default:
        return fail(`Route tidak ditemukan: ${route}`, 404);
    }
  } catch (err) {
    console.error(`[API ERROR] ${method} ${route}:`, err.message);
    return fail(err.message || 'Terjadi kesalahan server', 502);
  }
};

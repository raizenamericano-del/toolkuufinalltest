/* ============================================================================
   ⚡ ALL TOOLS KYY — v6 ADD-ONS
   Di-load SETELAH app.js -> ikut pakai helper global ($, $$, api, toast,
   copyText, esc, errBox, downloadDataUrl, openTool, renderGrid, TOOLS,
   TOOL_UI). Isi: 21 tools baru + Command Palette (Ctrl+K) + dock mobile.
   ========================================================================== */

// anti dobel-load
if (window.__KYY_V6__) { console.warn('void.js ke-load dua kali, di-skip'); }
else {
window.__KYY_V6__ = true;

/* ============================ REGISTER TOOLS =============================== */

TOOLS.push(
  { id: 'ytsearch',    cat: 'tools', icon: '🎬', title: 'Cari YouTube',    desc: 'Cari video YT + langsung convert', badge: 'BARU',  bc: 'pink' },
  { id: 'scsearch',    cat: 'tools', icon: '🎧', title: 'SoundCloud',      desc: 'Cari lagu + putar preview MP3',     badge: 'BARU',  bc: 'purple' },
  { id: 'spotifyinfo', cat: 'tools', icon: '🟢', title: 'Spotify Card',    desc: 'Kartu info + embed player Spotify', badge: 'BARU',  bc: '' },
  { id: 'translate',   cat: 'tools', icon: '🌍', title: 'Translate',       desc: 'Terjemahin instan 20+ bahasa',      badge: 'BARU',  bc: 'pink' },
  { id: 'kurs',        cat: 'tools', icon: '💱', title: 'Kurs Live',       desc: 'Nilai tukar dunia vs realtime',     badge: 'BARU',  bc: 'purple' },
  { id: 'crypto',      cat: 'tools', icon: '🪙', title: 'Crypto Live',     desc: 'Harga crypto top-12 dalam rupiah',  badge: 'BARU',  bc: '' },
  { id: 'booksearch',  cat: 'tools', icon: '📚', title: 'Cari Buku',       desc: 'Perpustakaan dunia, gratis dicari', badge: 'BARU',  bc: 'purple' },
  { id: 'colorlab',    cat: 'tools', icon: '🎨', title: 'Lab Warna',       desc: 'HEX → RGB → HSL + shades',          badge: 'BARU',  bc: 'purple' },
  { id: 'jsontool',    cat: 'tools', icon: '📦', title: 'JSON Toolkit',    desc: 'Format, minify & validasi JSON',    badge: 'BARU',  bc: '' },
  { id: 'regextest',   cat: 'tools', icon: '🔎', title: 'Regex Tester',    desc: 'Uji regex + highlight match',       badge: 'BARU',  bc: 'pink' },
  { id: 'stopwatch',   cat: 'tools', icon: '⏱️', title: 'Stopwatch & Timer', desc: 'Stopwatch lap + timer countdown', badge: 'BARU',  bc: 'purple' },
  { id: 'notepad',     cat: 'tools', icon: '📒', title: 'Notepad',    desc: 'Catatan auto-save di browser',      badge: 'BARU',  bc: '' },
  { id: 'pwcheck',     cat: 'tools', icon: '🛡️', title: 'Password Check',  desc: 'Ukur kekuatan password-mu',         badge: 'BARU',  bc: 'pink' },
  { id: 'wpmtest',     cat: 'fun',   icon: '⌨️', title: 'Tes Ngetik WPM',  desc: 'Seberapa petir jari-jarimu',        badge: 'BARU',  bc: 'purple' },
  { id: 'g2048',       cat: 'fun',   icon: '🔢', title: '2048',       desc: 'Gabung-gabungin angka sampe 2048',  badge: 'BARU',  bc: '' },
  { id: 'whackamole',  cat: 'fun',   icon: '🐹', title: 'Pukul Tikus',     desc: 'Refleks 30 detik, jangan kasian',  badge: 'BARU',  bc: 'pink' },
  { id: 'memmatch',    cat: 'fun',   icon: '🃏', title: 'Memory Match',    desc: 'Cocokin kartu emoji kembar',        badge: 'BARU',  bc: 'purple' },
  { id: 'fakeid',      cat: 'fun',   icon: '🎭', title: 'Identitas Palsu', desc: 'Gacha nama & identitas lukanya',   badge: 'BARU',  bc: '' },
  { id: 'nekogacha',   cat: 'fun',   icon: '🐾', title: 'Gacha Neko+',     desc: 'Slot gambar anime 12 kategori',    badge: 'BARU',  bc: 'pink' },
  { id: 'gradstudio',  cat: 'maker', icon: '🌈', title: 'Gradient Studio', desc: 'Racik gradasi CSS siap copy',      badge: 'BARU',  bc: 'purple' },
  { id: 'avatarmaker', cat: 'maker', icon: '👤', title: 'Avatar Maker',    desc: 'Seed → avatar unik 8 gaya',        badge: 'BARU',  bc: '' },
);

// sync stat strip & hero inline
(() => {
  const st = $('#statTools');
  if (st) { st.dataset.count = TOOLS.length; st.textContent = TOOLS.length + '+'; }
  const inline = $('#statToolsInline');
  if (inline) inline.textContent = TOOLS.length + '+';
})();

/* ============================ UTIL KECIL ============================== */

const vField = (label, inner) =>
  `<div class="field" style="margin-bottom:12px"><label>${label}</label>${inner}</div>`;
const vInputRow = (id, ph, btnId = null, btnTxt = '⚡ Proses') => `
  <div class="input-row" style="display:flex;gap:8px">
    <input class="input" id="${id}" placeholder="${esc(ph)}" spellcheck="false" style="flex:1"/>
    ${btnId ? `<button class="btn btn-primary btn-sm" id="${btnId}">${btnTxt}</button>` : ''}
  </div>`;
const vHint = (t) => `<p style="font-size:.76rem;color:var(--muted);margin:8px 0 12px">${t}</p>`;
const fmtID = (n, digits = 0) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(Number(n) || 0);
const ms2s = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

// beep buat timer (WebAudio, tanpa file)
function beep(freq = 880, dur = 0.18, type = 'square', vol = 0.12) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    beep._ctx ??= new AC();
    const ctx = beep._ctx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch { /* audio ditolak browser, skip */ }
}

// service downloader youtube: bentuk convert flow pake tool 'youtube' bawaan
function jumpToYoutubeDl(url) {
  openTool('youtube');
  setTimeout(() => {
    const inp = $('#dlUrl');
    if (inp) inp.value = url;
    const go = $('#dlGo');
    if (go) go.click();
  }, 60);
}

/* ============================ TOOL_UI TAMBAHAN V6 ############################# */

Object.assign(TOOL_UI, {

  /* ------------------------------ CARI YOUTUBE --------------------------- */
  ytsearch: {
    html: `
      ${vField('🔍 Keyword video', vInputRow('ysQ', 'mis. ipank full album', 'ysGo'))}
      ${vHint('Hasil terbaik ditampilin, klik ⬇️ Convert buat langsung lanjut ke downloader YouTube.')}
      <div id="ysRes"></div>`,
    mount() {
      const run = async () => {
        const q = $('#ysQ').value.trim();
        if (!q) return toast('Ketik keyword dulu ya 🎬', 'error');
        const box = $('#ysRes');
        box.innerHTML = LOADER_HTML;
        try {
          const { result: list, _ms } = await api('/search/youtube', { q });
          box.innerHTML = `<p style="font-size:.75rem;color:var(--muted);margin:10px 0">${list.length} hasil · ${_ms}ms</p>` + list.map((v, i) => `
            <div class="result-box" style="display:flex;gap:10px;margin-bottom:10px;align-items:center">
              <img src="${v.thumb}" loading="lazy" style="width:86px;height:56px;object-fit:cover;border-radius:8px;flex:0 0 auto"/>
              <div style="flex:1;min-width:0">
                <b style="font-size:.8rem;display:block;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${esc(v.title)}</b>
                <span style="font-size:.68rem;color:var(--muted)">${esc(v.channel)} ${v.duration ? '· ⏱ ' + v.duration : ''} ${v.views ? '· 👁 ' + esc(v.views) : ''}</span>
                <div style="display:flex;gap:6px;margin-top:6px">
                  <button class="btn btn-primary btn-sm" data-yconv="${i}" style="font-size:.66rem;padding:6px 10px">⬇️ Convert</button>
                  <button class="btn btn-ghost btn-sm" data-ycopy="${i}" style="font-size:.66rem;padding:6px 10px">🔗 Salin</button>
                  <a class="btn btn-ghost btn-sm" href="${v.url}" target="_blank" rel="noopener" style="font-size:.66rem;padding:6px 10px">▶️ Putar</a>
                </div>
              </div>
            </div>`).join('');
          box.querySelectorAll('[data-yconv]').forEach((b) => b.addEventListener('click', () => jumpToYoutubeDl(list[+b.dataset.yconv].url)));
          box.querySelectorAll('[data-ycopy]').forEach((b) => b.addEventListener('click', () => copyText(list[+b.dataset.ycopy].url)));
        } catch (e) { box.innerHTML = errBox(e.message); }
      };
      $('#ysGo').addEventListener('click', run);
      $('#ysQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
    },
  },

  /* ----------------------------- SOUNDCLOUD ------------------------------ */
  scsearch: {
    html: `
      ${vField('🎧 Cari lagu SoundCloud', vInputRow('scQ', 'mis. dj angkot duro', 'scGo'))}
      ${vHint('Client ID SoundCloud-nya dipanen real-time dari bundle JS mereka (teknik dari GitHub). Tekan ▶️ buat preview stream.')}
      <audio id="scAudio" controls style="width:100%;display:none;margin:10px 0"></audio>
      <div id="scRes"></div>`,
    mount() {
      let currentBtn = null;
      const audio = $('#scAudio');
      const run = async () => {
        const q = $('#scQ').value.trim();
        if (!q) return toast('Ketik judul/artist dulu 🎧', 'error');
        const box = $('#scRes');
        box.innerHTML = LOADER_HTML;
        try {
          const { result: list } = await api('/soundcloud/search', { q });
          if (!list.length) { box.innerHTML = errBox('Ga ketemu, coba keyword lain'); return; }
          box.innerHTML = list.map((t, i) => `
            <div class="result-box" style="display:flex;gap:10px;margin-bottom:10px;align-items:center">
              ${t.art ? `<img src="${t.art}" loading="lazy" style="width:52px;height:52px;object-fit:cover;border-radius:10px;flex:0 0 auto"/>` : '<span style="font-size:1.6rem;flex:0 0 auto">🎧</span>'}
              <div style="flex:1;min-width:0">
                <b style="font-size:.8rem;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</b>
                <span style="font-size:.68rem;color:var(--muted)">👤 ${esc(t.artist)} · ▶ ${fmtID(t.plays)} · ⏱ ${ms2s(t.duration)}</span>
                <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
                  <button class="btn btn-primary btn-sm" data-scplay="${i}" style="font-size:.66rem;padding:6px 10px">▶️ Preview</button>
                  <button class="btn btn-ghost btn-sm" data-sccopy="${i}" style="font-size:.66rem;padding:6px 10px">🔗 Salin</button>
                  ${t.url ? `<a class="btn btn-ghost btn-sm" href="${t.url}" target="_blank" rel="noopener" style="font-size:.66rem;padding:6px 10px">🌐 Buka</a>` : ''}
                </div>
              </div>
            </div>`).join('');
          box.querySelectorAll('[data-scplay]').forEach((b) => b.addEventListener('click', async () => {
            const t = list[+b.dataset.scplay];
            if (currentBtn === b && !audio.paused) { audio.pause(); b.textContent = '▶️ Preview'; return; }
            if (currentBtn) currentBtn.textContent = '▶️ Preview';
            b.textContent = '⏳ Loading…';
            try {
              const { result } = await api('/soundcloud/stream', { id: t.id });
              audio.src = result.url;
              audio.style.display = 'block';
              await audio.play().catch(() => {});
              b.textContent = '⏸ Stop';
              currentBtn = b;
            } catch (e) { b.textContent = '▶️ Preview'; toast(e.message, 'error'); }
          }));
          box.querySelectorAll('[data-sccopy]').forEach((b) => b.addEventListener('click', () => copyText(list[+b.dataset.sccopy].url)));
        } catch (e) { box.innerHTML = errBox(e.message); }
      };
      $('#scGo').addEventListener('click', run);
      $('#scQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
    },
  },

  /* ----------------------------- SPOTIFY CARD ---------------------------- */
  spotifyinfo: {
    html: `
      ${vField('🟢 Link track / album / playlist', vInputRow('spUrl', 'https://open.spotify.com/track/xxxx', 'spGo'))}
      ${vHint('Ketemu kartu info resmi + embed player (30 detik preview). Login Spotify ga dibutuhin buat preview.')}
      <div id="spRes"></div>`,
    mount() {
      const run = async () => {
        const url = $('#spUrl').value.trim();
        if (!url) return toast('Tempelin link Spotify dulu 🟢', 'error');
        const box = $('#spRes');
        box.innerHTML = LOADER_HTML;
        try {
          const { result } = await api('/spotify/info', { url });
          box.innerHTML = `
            <div class="result-box" style="text-align:center;margin-top:12px">
              ${result.thumb ? `<img src="${result.thumb}" style="width:150px;height:150px;object-fit:cover;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.5)"/>` : ''}
              <h4 style="margin:10px 0 4px">${esc(result.title || 'Spotify')}</h4>
              <div style="display:flex;gap:8px;justify-content:center;margin:10px 0">
                <button class="btn btn-ghost btn-sm" id="spCopy">🔗 Salin judul</button>
                <a class="btn btn-primary btn-sm" href="${esc(url)}" target="_blank" rel="noopener">🟢 Buka di Spotify</a>
              </div>
              <iframe src="${result.iframe}" style="width:100%;height:152px;border:none;border-radius:12px;overflow:hidden" loading="lazy" allow="encrypted-media; autoplay"></iframe>
            </div>`;
          $('#spCopy').addEventListener('click', () => copyText(result.title || url));
        } catch (e) { box.innerHTML = errBox(e.message); }
      };
      $('#spGo').addEventListener('click', run);
      $('#spUrl').addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
    },
  },

  /* ------------------------------ TRANSLATE ------------------------------ */
  translate: {
    html: `
      ${vField('📝 Teks', `<textarea class="input" id="trIn" rows="4" placeholder="Ketik/ tempel teks di sini (bisa bahasa apa aja, auto deteksi)…"></textarea>`)}
      ${vField('🌍 Ke bahasa', `
        <select class="input" id="trTo">
          <option value="id" selected>Bahasa Indonesia</option>
          <option value="en">English</option>
          <option value="jv">Jawa</option>
          <option value="su">Sunda</option>
          <option value="ja">Jepang</option>
          <option value="ko">Korea</option>
          <option value="ar">Arab</option>
          <option value="zh-CN">Mandarin</option>
          <option value="th">Thailand</option>
          <option value="vi">Vietnam</option>
          <option value="de">Jerman</option>
          <option value="fr">Prancis</option>
          <option value="es">Spanyol</option>
          <option value="pt">Portugis</option>
          <option value="ru">Rusia</option>
          <option value="it">Italia</option>
          <option value="hi">Hindi</option>
          <option value="ms">Melayu</option>
          <option value="tl">Tagalog</option>
        </select>`)}
      <button class="btn btn-primary" id="trGo" style="width:100%">⚡ Terjemahkan</button>
      <div id="trRes"></div>`,
    mount() {
      $('#trGo').addEventListener('click', async () => {
        const q = $('#trIn').value.trim();
        if (!q) return toast('Teksnya kosong 🌍', 'error');
        const box = $('#trRes');
        box.innerHTML = LOADER_HTML;
        try {
          const { result } = await api('/translate', { q, to: $('#trTo').value });
          box.innerHTML = `
            <div class="result-box" style="margin-top:14px">
              <span style="font-size:.68rem;color:var(--muted)">Terdeteksi: ${esc(result.from)}</span>
              <p style="margin:8px 0;font-size:.95rem;line-height:1.7">${esc(result.text)}</p>
              <button class="btn btn-ghost btn-sm" id="trCopy">📋 Salin hasil</button>
            </div>`;
          $('#trCopy').addEventListener('click', () => copyText(result.text));
        } catch (e) { box.innerHTML = errBox(e.message); }
      });
    },
  },

  /* ------------------------------- KURS ---------------------------------- */
  kurs: {
    html: `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <div style="flex:1;min-width:120px">
          <label style="font-size:.76rem;color:var(--muted)">💰 Nominal</label>
          <input class="input" id="kAmt" type="number" value="1" min="0" style="width:100%"/>
        </div>
        <div style="flex:1;min-width:120px">
          <label style="font-size:.76rem;color:var(--muted)">🏦 Dari</label>
          <select class="input" id="kBase" style="width:100%">
            <option value="USD" selected>USD — Dolar AS</option>
            <option value="IDR">IDR — Rupiah</option>
            <option value="EUR">EUR — Euro</option>
            <option value="JPY">JPY — Yen</option>
            <option value="SGD">SGD — Dolar Singapura</option>
            <option value="MYR">MYR — Ringgit</option>
            <option value="GBP">GBP — Poundsterling</option>
            <option value="AUD">AUD — Dolar Australia</option>
            <option value="CNY">CNY — Yuan</option>
            <option value="SAR">SAR — Riyal</option>
          </select>
        </div>
        <button class="btn btn-primary btn-sm" id="kGo" style="align-self:flex-end">🔄 Konversi</button>
      </div>
      ${vHint('Kurs bersumber dari data pasar terbuka, update harian. Buat patokan, bukan buat judi valas ya 💸')}
      <div id="kRes"></div>`,
    mount() {
      const NAMES = { IDR: 'Rupiah', USD: 'Dolar AS', EUR: 'Euro', JPY: 'Yen Jepang', SGD: 'Dolar SG', MYR: 'Ringgit', AUD: 'Dolar AU', GBP: 'Pound', SAR: 'Riyal', CNY: 'Yuan', KRW: 'Won', THB: 'Baht' };
      const FLAG = { IDR: '🇮🇩', USD: '🇺🇸', EUR: '🇪🇺', JPY: '🇯🇵', SGD: '🇸🇬', MYR: '🇲🇾', AUD: '🇦🇺', GBP: '🇬🇧', SAR: '🇸🇦', CNY: '🇨🇳', KRW: '🇰🇷', THB: '🇹🇭' };
      const run = async () => {
        const base = $('#kBase').value;
        const amt = parseFloat($('#kAmt').value) || 1;
        const box = $('#kRes');
        box.innerHTML = LOADER_HTML;
        try {
          const { result } = await api('/kurs?base=' + base);
          box.innerHTML = `<p style="font-size:.7rem;color:var(--muted);margin:10px 0">${esc(result.updated)}</p>` +
            Object.entries(result.rates).filter(([k]) => k !== base).map(([k, v]) => `
              <div class="result-box" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:10px 14px">
                <span style="font-size:.86rem">${FLAG[k] || '🏳️'} <b>${k}</b> <small style="color:var(--muted)">${NAMES[k] || ''}</small></span>
                <b style="font-family:'JetBrains Mono',monospace;font-size:.86rem;color:var(--violet-lite)">${fmtID(amt * v, k === 'IDR' || k === 'JPY' || k === 'KRW' ? 0 : 4)}</b>
              </div>`).join('');
        } catch (e) { box.innerHTML = errBox(e.message); }
      };
      $('#kGo').addEventListener('click', run);
      run();
    },
  },

  /* ------------------------------ CRYPTO --------------------------------- */
  crypto: {
    html: `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span style="font-size:.78rem;color:var(--muted)">Top 12 by market cap · harga dalam Rupiah</span>
        <button class="btn btn-ghost btn-sm" id="crRefresh">🔄 Refresh</button>
      </div>
      <div id="crRes"></div>`,
    mount() {
      const load = async () => {
        const box = $('#crRes');
        box.innerHTML = LOADER_HTML;
        try {
          const { result: list } = await api('/crypto');
          box.innerHTML = list.map((c) => {
            const up24 = Number(c.chg24) >= 0, up7 = Number(c.chg7) >= 0;
            return `
              <div class="result-box" style="display:flex;gap:10px;align-items:center;margin-bottom:8px;padding:10px 12px">
                <span style="font-family:'JetBrains Mono',monospace;font-size:.62rem;color:var(--muted);width:18px">${c.rank}</span>
                <img src="${c.img}" style="width:30px;height:30px;border-radius:50%" loading="lazy"/>
                <div style="flex:1;min-width:0">
                  <b style="font-size:.84rem">${esc(c.sym)}</b> <small style="color:var(--muted)">${esc(c.name)}</small><br/>
                  <b style="font-family:'JetBrains Mono',monospace;font-size:.8rem">Rp ${fmtID(c.price)}</b>
                </div>
                <div style="text-align:right;font-family:'JetBrains Mono',monospace;font-size:.7rem">
                  <div style="color:${up24 ? 'var(--green)' : 'var(--red)'}">${up24 ? '▲' : '▼'} ${Math.abs(c.chg24 || 0).toFixed(2)}% /24h</div>
                  <div style="color:${up7 ? 'var(--green)' : 'var(--red)'}">${up7 ? '▲' : '▼'} ${Math.abs(c.chg7 || 0).toFixed(2)}% /7d</div>
                </div>
              </div>`;
          }).join('');
        } catch (e) { box.innerHTML = errBox(e.message); }
      };
      $('#crRefresh').addEventListener('click', load);
      load();
    },
  },

  /* ----------------------------- CARI BUKU ------------------------------- */
  booksearch: {
    html: `
      ${vField('📖 Judul / penulis', vInputRow('bkQ', 'mis. laskar pelangi', 'bkGo'))}
      <div id="bkRes"></div>`,
    mount() {
      const run = async () => {
        const q = $('#bkQ').value.trim();
        if (!q) return toast('Ketik judul buku dulu 📚', 'error');
        const box = $('#bkRes');
        box.innerHTML = LOADER_HTML;
        try {
          const { result: list } = await api('/search/books', { q });
          box.innerHTML = list.map((b) => `
            <div class="result-box" style="display:flex;gap:12px;margin-bottom:10px">
              ${b.cover
                ? `<img src="${b.cover}" loading="lazy" style="width:54px;height:80px;object-fit:cover;border-radius:8px;flex:0 0 auto"/>`
                : '<span style="font-size:2rem;flex:0 0 auto">📕</span>'}
              <div style="flex:1;min-width:0">
                <b style="font-size:.84rem">${esc(b.title)}</b>
                <span style="display:block;font-size:.7rem;color:var(--muted)">✍️ ${esc(b.author)} ${b.year ? '· ' + b.year : ''} ${b.pages ? '· ' + b.pages + ' hlm' : ''} ${b.rating ? '· ⭐ ' + b.rating : ''}</span>
                <a class="btn btn-ghost btn-sm" href="${b.url}" target="_blank" rel="noopener" style="font-size:.66rem;margin-top:6px;padding:5px 10px">📖 Detail Open Library</a>
              </div>
            </div>`).join('');
        } catch (e) { box.innerHTML = errBox(e.message); }
      };
      $('#bkGo').addEventListener('click', run);
      $('#bkQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
    },
  },

  /* ------------------------------ LAB WARNA ------------------------------ */
  colorlab: {
    html: `
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
        <input type="color" id="clPick" value="#8b5cf6" style="width:64px;height:64px;border:none;border-radius:14px;cursor:pointer;background:none;padding:0"/>
        <div style="flex:1;min-width:200px">
          <input class="input" id="clHex" value="#8b5cf6" spellcheck="false" style="font-family:'JetBrains Mono',monospace;width:100%"/>
        </div>
        <button class="btn btn-ghost btn-sm" id="clRnd">🎲 Random</button>
      </div>
      <div id="clOut"></div>
      <p style="font-size:.74rem;color:var(--muted);margin-top:12px">🎚 Variasi shades:</p>
      <div id="clShades" style="display:flex;gap:6px;flex-wrap:wrap"></div>`,
    mount() {
      const pick = $('#clPick'), hex = $('#clHex');
      const hexToRgb = (h) => {
        const m = h.replace('#', '');
        if (!/^[0-9a-f]{6}$/i.test(m)) return null;
        return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
      };
      const rgbToHsl = (r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
        let h = 0, s = 0, l = (mx + mn) / 2;
        if (d) {
          s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
          h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
          h *= 60;
        }
        return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
      };
      const shade = ([r, g, b], f) => '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c * f))).toString(16).padStart(2, '0')).join('');
      const render = () => {
        const rgb = hexToRgb(hex.value);
        if (!rgb) { $('#clOut').innerHTML = errBox('Format HEX salah — contoh: #8b5cf6'); return; }
        const [h, s, l] = rgbToHsl(...rgb);
        $('#clOut').innerHTML = `
          <div class="result-box" style="display:grid;gap:8px">
            ${[['HEX', `#${hex.value.replace('#', '').toUpperCase()}`], ['RGB', `rgb(${rgb.join(', ')})`], ['HSL', `hsl(${h}, ${s}%, ${l}%)`], ['CSS var', `--warna: #${hex.value.replace('#', '')};`]]
              .map(([k, v]) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                <b style="font-size:.74rem;color:var(--muted);flex:0 0 auto">${k}</b>
                <code style="font-family:'JetBrains Mono',monospace;font-size:.8rem;word-break:break-all">${esc(v)}</code>
                <button class="btn btn-ghost btn-sm" data-ccl="${esc(v)}" style="font-size:.64rem;padding:4px 9px;flex:0 0 auto">📋</button>
              </div>`).join('')}
          </div>`;
        $('#clShades').innerHTML = [0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.7].map((f) => {
          const c = shade(rgb, f);
          return `<button data-ccl="${c}" title="${c}" style="width:40px;height:40px;border-radius:10px;border:1px solid var(--border);background:${c};cursor:pointer"></button>`;
        }).join('');
        $$('#clOut [data-ccl], #clShades [data-ccl]').forEach((b) => b.addEventListener('click', () => copyText(b.dataset.ccl)));
      };
      pick.addEventListener('input', () => { hex.value = pick.value; render(); });
      hex.addEventListener('input', () => { if (hexToRgb(hex.value)) pick.value = '#' + hex.value.replace('#', '').toLowerCase(); render(); });
      $('#clRnd').addEventListener('click', () => {
        const c = '#' + [...Array(3)].map(() => ((Math.random() * 255) | 0).toString(16).padStart(2, '0')).join('');
        hex.value = c; pick.value = c; render();
      });
      render();
    },
  },

  /* --------------------------- JSON TOOLKIT ------------------------------ */
  jsontool: {
    html: `
      ${vField('📦 Tempel JSON-nya di sini', `<textarea class="input" id="jtIn" rows="8" spellcheck="false" style="font-family:'JetBrains Mono',monospace;font-size:.78rem" placeholder='{"nama":"kyy","keren":true,"tools":[121,"gratis"]}'></textarea>`)}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
        <button class="btn btn-primary btn-sm" data-jt="pretty">✨ Pretty 2sp</button>
        <button class="btn btn-ghost btn-sm" data-jt="minify">🗜 Minify</button>
        <button class="btn btn-ghost btn-sm" data-jt="escape">🔒 Escape string</button>
        <button class="btn btn-ghost btn-sm" data-jt="unescape">🔓 Unescape</button>
        <button class="btn btn-ghost btn-sm" data-jt="copy">📋 Copy</button>
        <button class="btn btn-ghost btn-sm" data-jt="download">⬇️ Download .json</button>
      </div>
      <div id="jtRes" style="font-size:.76rem"></div>`,
    mount() {
      const ta = $('#jtIn'), res = $('#jtRes');
      const parse = () => { try { return { ok: JSON.parse(ta.value) }; } catch (e) { return { err: e.message }; } };
      const stats = (obj) => {
        let keys = 0, depth = 0;
        const walk = (o, d) => {
          depth = Math.max(depth, d);
          if (o && typeof o === 'object') Object.values(o).forEach((v) => { keys++; walk(v, d + 1); });
        };
        walk(obj, 0);
        return `✅ JSON VALID · ${keys} key · kedalaman ${depth} · ${ta.value.length} karakter`;
      };
      $$('.btn[data-jt]').forEach((b) => b.addEventListener('click', () => {
        const act = b.dataset.jt;
        if (act === 'copy') return copyText(ta.value);
        if (act === 'escape') { ta.value = JSON.stringify(ta.value).slice(1, -1); res.innerHTML = ''; return; }
        if (act === 'unescape') { try { ta.value = JSON.parse(`"${ta.value.replace(/"/g, '\\"')}"`); res.innerHTML = ''; } catch (e) { res.innerHTML = `<span style="color:var(--red)">❌ ${esc(e.message)}</span>`; } return; }
        if (act === 'download') {
          const { ok, err } = parse();
          if (err) { res.innerHTML = `<span style="color:var(--red)">❌ ${esc(err)}</span>`; return; }
          downloadDataUrl('data:application/json;charset=utf-8,' + encodeURIComponent(ta.value), 'kyy-data.json');
          return toast('File JSON ke-download 📦');
        }
        const { ok, err } = parse();
        if (err) { res.innerHTML = `<span style="color:var(--red)">❌ ${esc(err)}</span>`; return; }
        ta.value = act === 'minify' ? JSON.stringify(ok) : JSON.stringify(ok, null, 2);
        res.innerHTML = `<span style="color:var(--green)">${stats(ok)}</span>`;
      }));
    },
  },

  /* ----------------------------- REGEX TESTER ---------------------------- */
  regextest: {
    html: `
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <input class="input" id="rxPat" placeholder="\\b\\w+@\\w+\\.\\w+\\b" spellcheck="false" style="flex:1;font-family:'JetBrains Mono',monospace"/>
        <input class="input" id="rxFlag" placeholder="gi" spellcheck="false" style="width:70px;text-align:center;font-family:'JetBrains Mono',monospace" value="g"/>
      </div>
      ${vField('📄 Teks uji', `<textarea class="input" id="rxTxt" rows="5" spellcheck="false" placeholder="Tulis teks di sini lalu pola regex-nya disorot…">Email kyy@mail.id dan admin@skyx.dev itu palsu. Nomor: 0812-3456-7890. Tanggal: 14-02-2026.</textarea>`)}
      <div id="rxRes"></div>`,
    mount() {
      const pat = $('#rxPat'), flag = $('#rxFlag'), txt = $('#rxTxt'), res = $('#rxRes');
      const run = () => {
        const p = pat.value;
        if (!p) { res.innerHTML = ''; return; }
        let re;
        try { re = new RegExp(p, flag.value || 'g'); }
        catch (e) { res.innerHTML = errBox('Regex error: ' + e.message); return; }
        const matches = [...txt.value.matchAll(re.global ? re : new RegExp(re.source, re.flags + 'g'))];
        res.innerHTML = `
          <div class="result-box">
            <b style="color:${matches.length ? 'var(--green)' : 'var(--gold)'}">🎯 ${matches.length} match</b>
            ${matches.slice(0, 25).map((m, i) => `
              <div style="font-family:'JetBrains Mono',monospace;font-size:.74rem;padding:5px 0;border-bottom:1px dashed var(--border)">
                <span style="color:var(--muted)">#${i + 1} [${m.index}${m.index + m[0].length - 1 !== m.index ? '-' + (m.index + m[0].length - 1) : ''}]</span>
                <b style="background:rgba(139,92,246,.28);border-radius:4px;padding:1px 5px">${esc(m[0])}</b>
                ${m.length > 1 ? `<small style="color:var(--muted)">${m.slice(1).map((g, gi) => ` $${gi + 1}="${esc(g)}"`).join('')}</small>` : ''}
              </div>`).join('') || '<p style="font-size:.76rem;color:var(--muted);margin-top:8px">Ga ada yang match — coba pola lain.</p>'}
          </div>`;
      };
      [pat, flag, txt].forEach((el) => el.addEventListener('input', run));
    },
  },

  /* --------------------------- STOPWATCH & TIMER ------------------------- */
  stopwatch: {
    html: `
      <div class="ac-tabs" style="display:flex;gap:8px;margin-bottom:14px">
        <button class="active btn btn-primary btn-sm" data-sw="stop" style="flex:1">⏱ Stopwatch</button>
        <button class="btn btn-ghost btn-sm" data-sw="timer" style="flex:1">⏰ Timer</button>
      </div>
      <div id="swStage"></div>`,
    mount() {
      const stage = $('#swStage');
      const fmt = (ms) => {
        const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, ds = Math.floor(ms / 100) % 10;
        return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ds}`;
      };
      let iv = null;
      const stopMode = () => {
        clearInterval(iv);
        stage.innerHTML = `
          <div style="text-align:center">
            <div id="swTime" style="font-family:'JetBrains Mono',monospace;font-size:2.3rem;font-weight:700;letter-spacing:2px;text-shadow:0 0 24px rgba(139,92,246,.55)">00:00.0</div>
            <div style="display:flex;gap:8px;justify-content:center;margin:16px 0;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" id="swStart">▶️ Start</button>
              <button class="btn btn-ghost btn-sm" id="swLap" disabled>🏁 Lap</button>
              <button class="btn btn-ghost btn-sm" id="swReset">🔄 Reset</button>
            </div>
            <div id="swLaps" style="max-height:170px;overflow:auto"></div>
          </div>`;
        let t0 = 0, acc = 0, running = false, laps = [];
        const el = $('#swTime');
        const tick = () => { el.textContent = fmt(acc + (running ? performance.now() - t0 : 0)); };
        $('#swStart').addEventListener('click', () => {
          if (running) { acc += performance.now() - t0; running = false; $('#swStart').textContent = '▶️ Lanjut'; }
          else { t0 = performance.now(); running = true; $('#swStart').textContent = '⏸ Pause'; }
          $('#swLap').disabled = !running;
          beep(660, 0.08);
        });
        $('#swLap').addEventListener('click', () => {
          if (!running) return;
          const now = acc + performance.now() - t0;
          laps.push(now - (laps[laps.length - 1] || 0));
          $('#swLaps').innerHTML = laps.map((t, i) =>
            `<div class="result-box" style="display:flex;justify-content:space-between;padding:7px 12px;margin-bottom:6px;font-size:.76rem"><span>Lap ${i + 1}</span><b>${fmt(t)}</b><span style="color:var(--muted)">${fmt(laps.slice(0, i + 1).reduce((a, x) => a + x, 0))}</span></div>`).join('');
          beep(880, 0.06);
        });
        $('#swReset').addEventListener('click', () => { acc = 0; t0 = performance.now(); laps = []; tick(); $('#swLaps').innerHTML = ''; beep(440, 0.08); });
        if (iv) clearInterval(iv);
        iv = setInterval(tick, 100);
      };
      const timerMode = () => {
        clearInterval(iv);
        stage.innerHTML = `
          <div style="text-align:center">
            <div style="display:flex;gap:8px;justify-content:center;margin-bottom:14px;flex-wrap:wrap">
              ${[1, 3, 5, 10, 15, 25].map((m) => `<button class="btn btn-ghost btn-sm" data-tm="${m}">${m} mnt</button>`).join('')}
            </div>
            <div id="tmLeft" style="font-family:'JetBrains Mono',monospace;font-size:2.3rem;font-weight:700;text-shadow:0 0 24px rgba(217,70,239,.5)">--:--</div>
            <div style="display:flex;gap:8px;justify-content:center;margin:16px 0">
              <button class="btn btn-ghost btn-sm" id="tmStop">⏹ Stop</button>
            </div>
          </div>`;
        let tiv = null;
        $$('#swStage [data-tm]').forEach((b) => b.addEventListener('click', () => {
          clearInterval(iv); clearInterval(tiv);
          let left = (+b.dataset.tm) * 60;
          const el = $('#tmLeft');
          const upd = () => {
            el.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
            if (left <= 0) {
              clearInterval(tiv);
              el.textContent = "WAKTUNYA! 🔔"; el.style.color = 'var(--red)';
              beep(880, .2); beep(880, .2, 'square', .18); setTimeout(() => beep(1175, .3), 250);
              toast('⏰ Timer selesai — waktunya beraksi! 🔔');
            }
            left--;
          };
          el.style.color = '';
          upd();
          iv = setInterval(upd, 1000); tiv = iv;
        }));
        $('#tmStop').addEventListener('click', () => { clearInterval(iv); $('#tmLeft').textContent = '--:--'; });
      };
      $$('.btn[data-sw]').forEach((b) => b.addEventListener('click', () => {
        $$('.btn[data-sw]').forEach((x) => { x.classList.remove('btn-primary'); x.classList.add('btn-ghost'); });
        b.classList.remove('btn-ghost'); b.classList.add('btn-primary');
        b.dataset.sw === 'stop' ? stopMode() : timerMode();
      }));
      stopMode();
    },
  },

  /* ------------------------------ NOTEPAD -------------------------------- */
  notepad: {
    html: `
      <div style="display:flex;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-size:.74rem;color:var(--muted)">💾 Auto-save ke browser — ga hilang walau di-refresh</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" id="npDl">⬇️ .txt</button>
          <button class="btn btn-ghost btn-sm" id="npClear">🗑 Bersihin</button>
        </div>
      </div>
      <textarea class="input" id="npTxt" rows="12" spellcheck="false" placeholder="Tulis apa aja di sini… ide bot, lirik lagu, daftar belanja 😼" style="font-size:.86rem;line-height:1.7"></textarea>
      <p id="npStats" style="font-size:.72rem;color:var(--muted);margin-top:8px;font-family:'JetBrains Mono',monospace"></p>`,
    mount() {
      const KEY = 'kyy_notepad_v6';
      const ta = $('#npTxt');
      ta.value = localStorage.getItem(KEY) || '';
      const upd = () => {
        const words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
        $('#npStats').textContent = `${words} kata · ${ta.value.length} karakter · tersimpan ${new Date().toLocaleTimeString('id-ID')}`;
      };
      ta.addEventListener('input', () => { localStorage.setItem(KEY, ta.value); upd(); });
      $('#npDl').addEventListener('click', () => downloadDataUrl('data:text/plain;charset=utf-8,' + encodeURIComponent(ta.value), 'catatan-kyy.txt'));
      $('#npClear').addEventListener('click', () => { if (confirm('Yakin hapus semua catatan?')) { ta.value = ''; localStorage.removeItem(KEY); upd(); toast('Catatan bersih 🗑'); } });
      upd();
    },
  },

  /* --------------------------- PASSWORD CHECKER -------------------------- */
  pwcheck: {
    html: `
      ${vField('🔑 Ketik password-nya (aman, diproses lokal — ga dikirim ke mana-mana)', `<input class="input" id="pwIn" type="text" placeholder="coba password andalanmu…" autocomplete="off" spellcheck="false"/>`)}
      <div style="height:10px;border-radius:99px;background:rgba(139,92,246,.15);overflow:hidden;margin:10px 0">
        <div id="pwBar" style="height:100%;width:0%;background:var(--grad);transition:width .3s;border-radius:99px"></div>
      </div>
      <div id="pwRes"></div>`,
    mount() {
      const crackTime = (entropy) => {
        const secs = Math.pow(2, entropy - 1) / 1e10; // 10 milyar tebakan/detik
        if (secs < 1) return 'instan 💀';
        if (secs < 60) return `${secs.toFixed(0)} detik`;
        if (secs < 3600) return `${(secs / 60).toFixed(1)} menit`;
        if (secs < 86400) return `${(secs / 3600).toFixed(1)} jam`;
        if (secs < 31557600) return `${(secs / 86400).toFixed(1)} hari`;
        if (secs < 31557600 * 1000) return `${(secs / 31557600).toFixed(1)} tahun`;
        return `${(secs / 31557600 / 1000).toFixed(1)} ribu tahun 🔥`;
      };
      $('#pwIn').addEventListener('input', (e) => {
        const p = e.target.value;
        if (!p) { $('#pwBar').style.width = '0%'; $('#pwRes').innerHTML = ''; return; }
        const RE = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/];
        const sets = RE.filter((r) => r.test(p)).length;
        const pool = [26, 26, 10, 33].filter((_, j) => RE[j].test(p)).reduce((a, b) => a + b, 0) || 4;
        const entropy = p.length * Math.log2(pool);
        const score = Math.min(100, Math.round(entropy * 1.4));
        $('#pwBar').style.width = score + '%';
        $('#pwBar').style.background = score < 30 ? 'var(--red)' : score < 55 ? 'var(--gold)' : score < 80 ? 'var(--purple)' : 'var(--green)';
        const label = score < 30 ? 'LEMAH 🥲' : score < 55 ? 'LUMANYA 🤔' : score < 80 ? 'KUAT 💪' : 'PARAH KUATNYA 🔥';
        $('#pwRes').innerHTML = `
          <div class="result-box" style="font-size:.8rem">
            <p><b style="color:${score < 30 ? 'var(--red)' : score < 55 ? 'var(--gold)' : score < 80 ? 'var(--purple)' : 'var(--green)'}">${label}</b> · ${score}/100 poin</p>
            <table style="width:100%;font-size:.76rem;margin-top:8px;border-collapse:collapse">
              <tr><td style="padding:4px 0;color:var(--muted)">Panjang</td><td>${p.length} karakter ${p.length >= 12 ? '✅' : '⚠️ (disaranin 12+)'}</td></tr>
              <tr><td style="padding:4px 0;color:var(--muted)">Variasi set</td><td>${sets}/4 (huruf kecil, BESAR, angka, simbol)</td></tr>
              <tr><td style="padding:4px 0;color:var(--muted)">Entropi</td><td>≈ ${entropy.toFixed(1)} bit</td></tr>
              <tr><td style="padding:4px 0;color:var(--muted)">Brute force</td><td>di-hack dalam <b>${crackTime(entropy)}</b></td></tr>
            </table>
          </div>`;
      });
    },
  },

  /* ------------------------------ WPM TEST ------------------------------- */
  wpmtest: {
    html: `
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button class="btn btn-primary btn-sm" data-wsec="30">30 detik</button>
        <button class="btn btn-ghost btn-sm" data-wsec="60">60 detik</button>
      </div>
      <div id="wStage"></div>`,
    mount() {
      const POOL = 'aku kamu dia kita mereka ini itu yang dan atau tapi karena sebab maka bila ketika dari pada kepada dengan tanpa dalam luar atas bawah depan belakang samping kanan kiri ada tiada pergi datang tidur bangun makan minum baca tulis dengar lihat rasa kata cinta benci senang sedih benar salah cepat lambat jauh dekat besar kecil panjang pendek baru lama baik buruk cantik jelek mahal murah ramai sepi gelap terang panas dingin basah kering pahit manis asin asam pedas gurih lemak segar busuk keras lunak kasar halus'.split(' ');
      let dur = 30;
      const stage = $('#wStage');
      const render = () => {
        const words = [];
        for (let i = 0; i < 60; i++) words.push(POOL[(Math.random() * POOL.length) | 0]);
        const text = words.join(' ');
        stage.innerHTML = `
          <div class="result-box" style="font-family:'JetBrains Mono',monospace;font-size:.92rem;line-height:1.9;user-select:none;max-height:130px;overflow:hidden;margin-bottom:12px" id="wText"></div>
          <input class="input" id="wIn" placeholder="Ketik cepat & tepat mulai sekarang… ⚡" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:100%"/>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-family:'JetBrains Mono',monospace;font-size:.8rem">
            <span>⏱ <b id="wTime">${dur}</b>s</span>
            <span>⚡ <b id="wWpm">0</b> WPM</span>
            <span>🎯 <b id="wAcc">100</b>%</span>
          </div>`;
        const tEl = $('#wText');
        tEl.innerHTML = text.split('').map((c) => `<span>${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
        const spans = [...tEl.children];
        const inp = $('#wIn');
        let started = false, tleft = dur, tiv = null, done = false;
        const upd = () => {
          const v = inp.value;
          let correct = 0, wrong = 0;
          spans.forEach((sp, i) => {
            sp.style.color = ''; sp.style.background = '';
            if (i < v.length) {
              if (v[i] === sp.textContent || (sp.innerHTML === '&nbsp;' && v[i] === ' ')) { sp.style.color = 'var(--violet-lite)'; correct++; }
              else { sp.style.background = 'rgba(248,113,113,.35)'; wrong++; }
            } else if (i === v.length) sp.style.background = 'rgba(139,92,246,.4)';
          });
          const mins = (dur - tleft) / 60 || 1 / 60;
          $('#wWpm').textContent = Math.round((correct / 5) / mins);
          const total = correct + wrong || 1;
          $('#wAcc').textContent = Math.round((correct / total) * 100);
        };
        const finish = () => {
          if (done) return;
          done = true; clearInterval(tiv); inp.disabled = true;
          const wpm = +$('#wWpm').textContent;
          const best = Math.max(wpm, +localStorage.getItem('kyy_wpm_best') || 0);
          localStorage.setItem('kyy_wpm_best', best);
          stage.insertAdjacentHTML('afterbegin', `
            <div class="result-box" style="text-align:center;margin-bottom:12px;border-color:rgba(52,211,153,.4)">
              <div style="font-size:2rem">${wpm >= 60 ? '🏆' : wpm >= 40 ? '🔥' : '🐣'}</div>
              <b style="font-family:'Orbitron',sans-serif;font-size:1.6rem">${wpm} WPM</b>
              <p style="font-size:.76rem;color:var(--muted)">akurasi ${$('#wAcc').textContent}% · terbaikmu ${best} WPM</p>
              <button class="btn btn-ghost btn-sm" id="wAgain">🔄 Main lagi</button>
            </div>`);
          $('#wAgain').addEventListener('click', render);
        };
        inp.addEventListener('input', () => {
          if (!started) {
            started = true;
            tiv = setInterval(() => {
              tleft--; $('#wTime').textContent = tleft;
              if (tleft <= 0) finish();
            }, 1000);
          }
          upd();
        });
        setTimeout(() => inp.focus(), 80);
      };
      $$('.btn[data-wsec]').forEach((b) => b.addEventListener('click', () => {
        dur = +b.dataset.wsec;
        $$('.btn[data-wsec]').forEach((x) => { x.classList.remove('btn-primary'); x.classList.add('btn-ghost'); });
        b.classList.remove('btn-ghost'); b.classList.add('btn-primary');
        render();
      }));
      render();
    },
  },

  /* ------------------------------ GAME 2048 ------------------------------ */
  g2048: {
    html: `<div id="g2Stage"></div>`,
    mount() {
      const stage = $('#g2Stage');
      const N = 4;
      let grid, score, best = +localStorage.getItem('kyy_2048_best') || 0;
      const palette = (v) => {
        if (!v) return ['rgba(139,92,246,.08)', 'transparent'];
        const hues = { 2: 250, 4: 268, 8: 287, 16: 300, 32: 320, 64: 340, 128: 240, 256: 220, 512: 200, 1024: 185, 2048: 46 };
        const h = hues[v] || 46;
        return [`hsl(${h}, 72%, ${v > 64 ? 52 : 34}%)`, '#fff'];
      };
      const spawn = () => {
        const empt = [];
        grid.forEach((r, y) => r.forEach((v, x) => { if (!v) empt.push([y, x]); }));
        if (!empt.length) return;
        const [y, x] = empt[(Math.random() * empt.length) | 0];
        grid[y][x] = Math.random() < 0.9 ? 2 : 4;
      };
      const slide = (row) => {
        const arr = row.filter((v) => v);
        for (let i = 0; i < arr.length - 1; i++) {
          if (arr[i] === arr[i + 1]) { arr[i] *= 2; score += arr[i]; arr.splice(i + 1, 1); }
        }
        while (arr.length < N) arr.push(0);
        return arr;
      };
      const move = (dir) => { // 0 atas 1 kanan 2 bawah 3 kiri
        const rot = (g) => g.map((_, y) => g.map((r) => r[y]));
        let g = grid.map((r) => [...r]);
        if (dir === 0) g = rot(g);
        if (dir === 1) g.forEach((r) => r.reverse());
        if (dir === 2) { g = rot(g); g.forEach((r) => r.reverse()); }
        const before = JSON.stringify(g);
        g = g.map(slide);
        if (dir === 0) g = rot(g);
        if (dir === 1) g.forEach((r) => r.reverse());
        if (dir === 2) { g.forEach((r) => r.reverse()); g = rot(g); }
        if (JSON.stringify(g) === before) return false;
        grid = g; spawn(); render(); return true;
      };
      const isOver = () => {
        if (grid.flat().includes(0)) return false;
        for (let y = 0; y < N; y++)
          for (let x = 0; x < N; x++) {
            if (grid[y][x + 1] === grid[y][x]) return false;
            if (grid[y + 1] && grid[y + 1][x] === grid[y][x]) return false;
          }
        return true;
      };
      const render = () => {
        if (score > best) { best = score; localStorage.setItem('kyy_2048_best', best); }
        const over = isOver();
        stage.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-family:'JetBrains Mono',monospace;font-size:.78rem">
            <span>SKOR <b style="color:var(--violet-lite)">${score}</b></span>
            <span>TERBAIK <b style="color:var(--gold)">${best}</b></span>
            <button class="btn btn-ghost btn-sm" id="g2New">🔄 Baru</button>
          </div>
          <div id="g2Board" style="display:grid;grid-template-columns:repeat(${N},1fr);gap:7px;background:rgba(13,7,34,.7);padding:9px;border-radius:14px;touch-action:none;max-width:360px;margin:0 auto;box-shadow:inset 0 0 30px rgba(89,28,135,.3)">
            ${grid.flat().map((v) => {
              const [bg, fg] = palette(v);
              return `<div style="aspect-ratio:1;display:grid;place-items:center;border-radius:9px;background:${bg};color:${fg};font-family:'Orbitron',sans-serif;font-weight:${v > 99 ? 700 : 900};font-size:${v > 999 ? '.86rem' : '1.05rem'};${v ? 'box-shadow:0 0 14px rgba(139,92,246,.25)' : ''}">${v || ''}</div>`;
            }).join('')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,auto);gap:6px;justify-content:center;margin-top:14px">
            <span></span><button class="btn btn-ghost btn-sm" data-g2="0">⬆️</button><span></span>
            <button class="btn btn-ghost btn-sm" data-g2="3">⬅️ Kiri</button>
            <button class="btn btn-ghost btn-sm" data-g2="2">⬇️</button>
            <button class="btn btn-ghost btn-sm" data-g2="1">Kanan ➡️</button>
          </div>
          <p style="font-size:.7rem;color:var(--muted);text-align:center;margin-top:10px">Arrow key / swipe / tombol di atas 🎮</p>
          ${over ? '<div class="result-box" style="text-align:center;margin-top:10px;border-color:rgba(248,113,113,.4)"><b style="color:var(--red)">GAME OVER 💀 — tile-nya mentok!</b></div>' : ''}
          ${grid.flat().includes(2048) ? '<div class="result-box" style="text-align:center;margin-top:10px;border-color:rgba(52,211,153,.45)"><b style="color:var(--green)">🏆 2048 TERCAPAI! GG! Kamu sah jadi master 2048!</b></div>' : ''}`;
        $('#g2New').addEventListener('click', () => { grid = Array.from({ length: N }, () => Array(N).fill(0)); score = 0; spawn(); spawn(); render(); });
        $$('#g2Stage [data-g2]').forEach((b) => b.addEventListener('click', () => move(+b.dataset.g2)));
        const board = $('#g2Board');
        let tx = 0, ty = 0;
        board.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
        board.addEventListener('touchend', (e) => {
          const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
          Math.abs(dx) > Math.abs(dy) ? move(dx > 0 ? 1 : 3) : move(dy > 0 ? 2 : 0);
        }, { passive: true });
      };
      if (!window.__g2KeyBound) {
        window.__g2KeyBound = true;
        document.addEventListener('keydown', (e) => {
          if (!$('#g2Board') || $('#modalBackdrop').hidden) return;
          const map = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
          if (map[e.key] !== undefined) {
            e.preventDefault();
            window.__g2move?.(map[e.key]);
          }
        });
      }
      window.__g2move = move; // selalu nunjuk instance game yang sedang kebuka
      grid = Array.from({ length: N }, () => Array(N).fill(0)); score = 0; spawn(); spawn(); render();
    },
  },

  /* ---------------------------- PUKUL TIKUS ------------------------------ */
  whackamole: {
    html: `<div id="wmStage"></div>`,
    mount() {
      const stage = $('#wmStage');
      const start = () => {
        stage.innerHTML = `
          <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:.8rem;margin-bottom:12px">
            <span>⏱ <b id="wmTime">30</b>s</span><span>🎯 SKOR <b id="wmScore">0</b></span><span>🏅 <b id="wmBest">${+localStorage.getItem('kyy_wam_best') || 0}</b></span>
          </div>
          <div id="wmGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:330px;margin:0 auto"></div>`;
        const grid = $('#wmGrid');
        let score = 0, t = 30, alive = true;
        grid.innerHTML = [...Array(9)].map((_, i) => `
          <div class="wm-hole" data-i="${i}" style="aspect-ratio:1;border-radius:14px;background:rgba(13,7,34,.8);border:1px solid var(--border);display:grid;place-items:center;font-size:1.9rem;cursor:pointer;user-select:none;transition:transform .07s"></div>`).join('');
        const holes = [...grid.children];
        let cur = -1;
        const pop = () => {
          if (!alive) return;
          holes.forEach((h) => { h.textContent = ''; h.style.transform = ''; });
          cur = (Math.random() * 9) | 0;
          holes[cur].textContent = Math.random() < 0.12 ? '💣' : '🐹';
          holes[cur].style.transform = 'scale(1.04)';
          setTimeout(() => { if (holes[cur]) { holes[cur].textContent = ''; holes[cur].style.transform = ''; } }, Math.max(380, 720 - (30 - t) * 9));
        };
        grid.addEventListener('click', (e) => {
          const h = e.target.closest('.wm-hole');
          if (!h || !alive) return;
          if (holes.indexOf(h) === cur && h.textContent) {
            if (h.textContent === '💣') { score = Math.max(0, score - 2); beep(196, .22, 'sawtooth', .16); toast('Kena BOM! -2 💥', 'error'); }
            else { score++; beep(987, .07); }
            $('#wmScore').textContent = score;
            h.textContent = '';
            cur = -1;
          }
        });
        const poop = setInterval(pop, Math.max(450, 850 - 0));
        const clock = setInterval(() => {
          t--; $('#wmTime').textContent = t;
          if (t <= 0) {
            clearInterval(clock); clearInterval(poop); alive = false;
            const best = Math.max(score, +localStorage.getItem('kyy_wam_best') || 0);
            localStorage.setItem('kyy_wam_best', best);
            $('#wmBest').textContent = best;
            toast(`Waktunya abis! Skor kamu ${score} 🐹`);
            stage.insertAdjacentHTML('afterbegin', `
              <div class="result-box" style="text-align:center;margin-bottom:12px">
                <b style="font-size:1.2rem">${score >= 25 ? '🏆 LEGENDA' : score >= 15 ? '🔥 KENCENG' : '🐢 Lagi latihan ya'}</b>
                <p style="font-size:.78rem;color:var(--muted)">skor ${score} · terbaik ${best}</p>
                <button class="btn btn-primary btn-sm" id="wmAgain">🔄 Gas lagi</button>
              </div>`);
            $('#wmAgain').addEventListener('click', start);
          }
        }, 1000);
        pop();
      };
      start();
    },
  },

  /* ----------------------------- MEMORY MATCH ---------------------------- */
  memmatch: {
    html: `<div id="mmStage"></div>`,
    mount() {
      const stage = $('#mmStage');
      const start = () => {
        const EMJ = ['🦊', '🐼', '🐙', '🦄', '🐝', '🦖', '🐳', '🦧'];
        const cards = [...EMJ, ...EMJ].map((e, i) => ({ e, id: i })).sort(() => Math.random() - .5);
        let open = [], done = 0, moves = 0, lock = false;
        stage.innerHTML = `
          <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:.78rem;margin-bottom:12px">
            <span>🎴 Gerakan <b id="mmMoves">0</b></span><span>✅ Pasangan <b id="mmDone">0</b>/8</span>
            <span>🏅 <b id="mmBest">${localStorage.getItem('kyy_mm_best') || '—'}</b></span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-width:340px;margin:0 auto" id="mmGrid"></div>`;
        const grid = $('#mmGrid');
        grid.innerHTML = cards.map((c, i) => `
          <button class="mm-card" data-i="${i}" style="aspect-ratio:1;border-radius:11px;border:1px solid var(--border);background:rgba(24,13,55,.85);font-size:1.55rem;cursor:pointer;color:transparent;transition:.25s">☠</button>`).join('');
        const els = [...grid.children];
        grid.addEventListener('click', (e) => {
          const b = e.target.closest('.mm-card');
          if (!b || lock || b.dataset.open === '1' || b.dataset.done === '1') return;
          const c = cards[+b.dataset.i];
          b.textContent = c.e; b.style.color = ''; b.dataset.open = '1';
          b.style.background = 'rgba(139,92,246,.3)';
          open.push(b);
          if (open.length === 2) {
            moves++; $('#mmMoves').textContent = moves;
            const [a, b2] = open;
            if (cards[+a.dataset.i].e === cards[+b2.dataset.i].e) {
              a.dataset.done = b2.dataset.done = '1';
              a.style.background = b2.style.background = 'rgba(52,211,153,.25)';
              a.style.borderColor = b2.style.borderColor = 'rgba(52,211,153,.5)';
              done++; $('#mmDone').textContent = done;
              beep(987, .08);
              open = [];
              if (done === 8) {
                const bestOld = +localStorage.getItem('kyy_mm_best') || 999;
                const best = Math.min(moves, bestOld);
                localStorage.setItem('kyy_mm_best', best);
                $('#mmBest').textContent = best;
                toast(`Beres dalam ${moves} gerakan! 🎉`);
                stage.insertAdjacentHTML('afterbegin', `
                  <div class="result-box" style="text-align:center;margin-bottom:12px;border-color:rgba(52,211,153,.4)">
                    <b style="color:var(--green)">🎉 SEMUA KETEMU!</b>
                    <p style="font-size:.78rem;color:var(--muted)">${moves} gerakan · terbaik ${best}</p>
                    <button class="btn btn-primary btn-sm" id="mmAgain">🔄 Ulang</button>
                  </div>`);
                $('#mmAgain').addEventListener('click', start);
              }
            } else {
              lock = true;
              beep(392, .12);
              setTimeout(() => {
                open.forEach((x) => { x.textContent = '☠'; x.style.color = 'transparent'; x.style.background = ''; delete x.dataset.open; });
                open = []; lock = false;
              }, 640);
            }
          }
        });
      };
      start();
    },
  },

  /* --------------------------- IDENTITAS PALSU --------------------------- */
  fakeid: {
    html: `
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="fiGen">🎲 Gacha identitas</button>
        <button class="btn btn-ghost btn-sm" id="fiCopy" disabled>📋 Salin semua</button>
      </div>
      ${vHint('100% fiktif dari generator — jangan dipake buat hal melanggar hukum ya ⚖️ (buat mockup/testing doang).')}
      <div id="fiRes"></div>`,
    mount() {
      let cur = null;
      const gen = async () => {
        const box = $('#fiRes');
        box.innerHTML = LOADER_HTML;
        $('#fiCopy').disabled = true;
        try {
          const { result } = await api('/fakeidentity');
          cur = result;
          box.innerHTML = `
            <div class="result-box" style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
              <img src="${result.picture}" style="width:96px;height:96px;border-radius:16px;object-fit:cover;border:1px solid var(--border);box-shadow:0 8px 24px rgba(0,0,0,.4)"/>
              <div style="flex:1;min-width:200px;font-size:.8rem;display:grid;gap:5px">
                <b style="font-size:1.05rem">${esc(result.name)}</b>
                <span>⚧ ${result.gender} · 🎂 ${esc(result.dob)} (${result.age} th)</span>
                <span>📍 ${esc(result.address)}</span>
                <span>📞 ${esc(result.phone)} · 📱 ${esc(result.cell)}</span>
                <span style="font-family:'JetBrains Mono',monospace;font-size:.72rem">📧 ${esc(result.email)}</span>
                <span style="font-family:'JetBrains Mono',monospace;font-size:.72rem">👤 ${esc(result.username)} · 🔑 <code>${esc(result.password)}</code></span>
              </div>
            </div>`;
          $('#fiCopy').disabled = false;
        } catch (e) { box.innerHTML = errBox(e.message); }
      };
      $('#fiGen').addEventListener('click', gen);
      $('#fiCopy').addEventListener('click', () => {
        if (!cur) return;
        copyText(`Nama: ${cur.name}\nGender: ${cur.gender}\nLahir: ${cur.dob} (${cur.age}th)\nAlamat: ${cur.address}\nHP: ${cur.phone} / ${cur.cell}\nEmail: ${cur.email}\nUser: ${cur.username}\nPass: ${cur.password}`);
      });
      gen();
    },
  },

  /* ----------------------------- GACHA NEKO ------------------------------ */
  nekogacha: {
    html: `
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <select class="input" id="nkCat" style="flex:1;min-width:150px">
          <option value="waifu">💃 Waifu</option>
          <option value="neko">🐱 Neko</option>
          <option value="kitsune">🦊 Kitsune</option>
          <option value="husbando">🤵 Husbando</option>
          <option value="hug">🫂 Hug gif</option>
          <option value="cuddle">🥰 Cuddle gif</option>
          <option value="kiss">💋 Kiss gif</option>
          <option value="pat">🥺 Pat gif</option>
          <option value="dance">🪩 Dance gif</option>
          <option value="baka">😤 Baka gif</option>
          <option value="happy">😄 Happy gif</option>
          <option value="sleep">😴 Sleep gif</option>
        </select>
        <button class="btn btn-primary btn-sm" id="nkGo">🎰 Gacha</button>
      </div>
      <div id="nkRes" style="text-align:center"></div>`,
    mount() {
      const gacha = async () => {
        const box = $('#nkRes');
        box.innerHTML = LOADER_HTML;
        try {
          const { result } = await api('/nekos', { cat: $('#nkCat').value });
          box.innerHTML = `
            <img src="${result.url}" style="max-width:100%;max-height:340px;border-radius:16px;border:1px solid var(--border);box-shadow:0 14px 40px rgba(0,0,0,.5)" loading="lazy"/>
            <p style="font-size:.74rem;color:var(--muted);margin:10px 0">${result.anime ? 'dari anime ' + esc(result.anime) + ' · ' : ''}${result.artist ? 'art by ' + esc(result.artist) : ''}</p>
            <div style="display:flex;gap:8px;justify-content:center">
              <a class="btn btn-ghost btn-sm" href="${result.url}" target="_blank" rel="noopener">🔗 Buka gambar</a>
              <button class="btn btn-ghost btn-sm" id="nkCopy">📋 Salin URL</button>
            </div>`;
          $('#nkCopy').addEventListener('click', () => copyText(result.url));
        } catch (e) { box.innerHTML = errBox(e.message); }
      };
      $('#nkGo').addEventListener('click', gacha);
      gacha();
    },
  },

  /* --------------------------- GRADIENT STUDIO --------------------------- */
  gradstudio: {
    html: `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:14px">
        <div><label style="font-size:.72rem;color:var(--muted)">🎨 Warna 1</label><input type="color" id="grC1" value="#6d28d9" style="width:100%;height:44px;border:none;border-radius:10px;cursor:pointer;background:none;padding:0"/></div>
        <div><label style="font-size:.72rem;color:var(--muted)">🎨 Warna 2</label><input type="color" id="grC2" value="#d946ef" style="width:100%;height:44px;border:none;border-radius:10px;cursor:pointer;background:none;padding:0"/></div>
        <div><label style="font-size:.72rem;color:var(--muted)">📐 Sudut: <b id="grAngV">135°</b></label><input type="range" id="grAng" min="0" max="360" value="135" style="width:100%"/></div>
      </div>
      <div id="grPrev" style="height:120px;border-radius:14px;border:1px solid var(--border);margin-bottom:12px;box-shadow:0 10px 30px rgba(0,0,0,.35)"></div>
      <div class="result-box" style="font-family:'JetBrains Mono',monospace;font-size:.76rem;word-break:break-all" id="grCss"></div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="grCopy">📋 Copy CSS</button>
        <button class="btn btn-ghost btn-sm" id="grRnd">🎲 Racik random</button>
        <button class="btn btn-ghost btn-sm" id="grSwap">↔️ Tukar warna</button>
      </div>`,
    mount() {
      const c1 = $('#grC1'), c2 = $('#grC2'), ang = $('#grAng');
      const upd = () => {
        const css = `linear-gradient(${ang.value}deg, ${c1.value}, ${c2.value})`;
        $('#grPrev').style.background = css;
        $('#grAngV').textContent = ang.value + '°';
        $('#grCss').innerHTML = `background: ${css};`;
      };
      [c1, c2, ang].forEach((el) => el.addEventListener('input', upd));
      $('#grCopy').addEventListener('click', () => copyText(`background: linear-gradient(${ang.value}deg, ${c1.value}, ${c2.value});`));
      $('#grSwap').addEventListener('click', () => { const t = c1.value; c1.value = c2.value; c2.value = t; upd(); });
      $('#grRnd').addEventListener('click', () => {
        const rand = () => '#' + [...Array(3)].map(() => ((Math.random() * 255) | 0).toString(16).padStart(2, '0')).join('');
        c1.value = rand(); c2.value = rand();
        ang.value = (Math.random() * 360) | 0;
        upd();
      });
      upd();
    },
  },

  /* ----------------------------- AVATAR MAKER ---------------------------- */
  avatarmaker: {
    html: `
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <select class="input" id="avStyle" style="flex:1;min-width:140px">
          <option value="avataaars">🧑 Klasik</option>
          <option value="bottts" selected>🤖 Robot</option>
          <option value="pixel-art">👾 Pixel</option>
          <option value="adventurer">🧝 Petualang</option>
          <option value="big-smile">😁 Senyum</option>
          <option value="croodles">🐶 Doodle</option>
          <option value="fun-emoji">😜 Emoji</option>
          <option value="thumbs">👍 Thumbs</option>
        </select>
        <input class="input" id="avSeed" placeholder="seed (nama bebas)" style="flex:1;min-width:110px" value="kyy"/>
        <button class="btn btn-ghost btn-sm" id="avRnd">🎲</button>
      </div>
      <div style="text-align:center">
        <img id="avImg" style="width:180px;height:180px;border-radius:20px;border:1px solid var(--border);background:rgba(13,7,34,.6);box-shadow:0 14px 40px rgba(0,0,0,.45)"/>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:14px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" id="avDl">⬇️ Download SVG</button>
          <button class="btn btn-ghost btn-sm" id="avCopy">🔗 Salin URL</button>
        </div>
      </div>`,
    mount() {
      const style = $('#avStyle'), seed = $('#avSeed'), img = $('#avImg');
      const url = () => `https://api.dicebear.com/9.x/${style.value}/svg?seed=${encodeURIComponent(seed.value || 'kyy')}&size=512`;
      const upd = () => { img.src = url(); };
      style.addEventListener('change', upd);
      seed.addEventListener('input', upd);
      $('#avRnd').addEventListener('click', () => { seed.value = Math.random().toString(36).slice(2, 9); upd(); });
      $('#avDl').addEventListener('click', async () => {
        try {
          const svg = await (await fetch(url())).text();
          downloadDataUrl('data:image/svg+xml;utf8,' + encodeURIComponent(svg), `avatar-${seed.value || 'kyy'}.svg`);
          toast('Avatar ke-download 👤');
        } catch { toast('Gagal download, coba lagi', 'error'); }
      });
      $('#avCopy').addEventListener('click', () => copyText(url()));
      upd();
    },
  },

});

/* ===================== SYNC COUNTER (jalan ulang biar akurat) ============= */
// app.js ikut animateCounters() sampe 100 — baru setelah timer itu selesai
// (~1.4s) kita sambung naik ke jumlah asli, biar ga "tulisan dobel race".
setTimeout(() => {
  const st = $('#statTools');
  if (!st) return;
  st.dataset.count = TOOLS.length;
  let cur = parseInt(st.textContent) || 100;
  const target = TOOLS.length;
  if (cur >= target) { st.textContent = target + '+'; return; }
  const iv = setInterval(() => {
    cur++;
    st.textContent = cur + '+';
    if (cur >= target) clearInterval(iv);
  }, 26);
}, 1400);

// render ulang grid dengan tools baru
renderGrid();

/* ============================ COMMAND PALETTE ============================= */
(() => {
  const wrap = document.createElement('div');
  wrap.id = 'palette';
  wrap.hidden = true;
  wrap.innerHTML = `
    <div class="cp-backdrop" id="cpBackdrop"></div>
    <div class="cp-modal" role="dialog" aria-modal="true" aria-label="Command Palette">
      <div class="cp-search">
        <span style="font-size:1.05rem">⌘</span>
        <input id="cpInput" placeholder="Mau pake senjata apa? ketik ajah…" autocomplete="off" spellcheck="false"/>
        <kbd>ESC</kbd>
      </div>
      <div class="cp-hint">
        <span>↑↓ navigasi</span><span>↵ buka</span><span>⭐ fav</span>
      </div>
      <div class="cp-list" id="cpList"></div>
      <div class="cp-foot">
        <span>☠ <b>${TOOLS.length}</b> senjata siap tempur</span>
        <span>⌘K / Ctrl+K buat manggil</span>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const inp = $('#cpInput'), list = $('#cpList');
  let q = '', idx = 0;

  const ACTIONS = [
    { id: '__theme',  icon: '🌗', title: 'Ganti Tema',      desc: 'Toggle dark / light mode', cat: 'aksi' },
    { id: '__random', icon: '🎲', title: 'Tool Random',     desc: 'Nasib pilih untukmu',       cat: 'aksi' },
    { id: '__radar',  icon: '📡', title: 'Radar Pengunjung', desc: 'Lompat ke deteksi pengunjung', cat: 'aksi' },
    { id: '__dev',    icon: '👑', title: 'Profil Developer', desc: 'Yang bikin web ini',   cat: 'aksi' },
  ];

  const CAT_ICON = { downloader: '⬇️', maker: '🎨', tools: '🛠️', fun: '🎲', aksi: '⚡' };

  const filtered = () => {
    const s = q.trim().toLowerCase();
    const all = [...ACTIONS, ...TOOLS];
    if (!s) return all.slice(0, 60);
    return all.filter((t) => (t.title + ' ' + t.desc + ' ' + t.cat).toLowerCase().includes(s));
  };

  const render = () => {
    const items = filtered();
    idx = Math.min(idx, Math.max(0, items.length - 1));
    list.innerHTML = items.length ? items.map((t, i) => `
      <button class="cp-item${i === idx ? ' active' : ''}" data-i="${i}">
        <span class="cp-ico">${t.icon}</span>
        <span class="cp-main"><b>${esc(t.title)}</b><small>${esc(t.desc)}</small></span>
        <span class="cp-cat">${CAT_ICON[t.cat] || '⚡'} ${t.cat}</span>
        ${favSet.has(t.id) ? '<span class="cp-star">★</span>' : ''}
      </button>`).join('')
      : `<div class="cp-empty">🫠 ga ketemu… coba keyword lain</div>`;
    const act = list.querySelector('.cp-item.active');
    if (act && typeof act.scrollIntoView === 'function') act.scrollIntoView({ block: 'nearest' });
  };

  const openP = () => {
    wrap.hidden = false;
    document.body.style.overflow = 'hidden';
    q = ''; inp.value = ''; idx = 0;
    render();
    setTimeout(() => inp.focus(), 30);
  };
  const closeP = () => {
    wrap.hidden = true;
    document.body.style.overflow = '';
  };

  const exec = (item) => {
    closeP();
    if (!item) return;
    if (item.id === '__theme') { $('#themeBtn')?.click(); return; }
    if (item.id === '__random') {
      const t = TOOLS[(Math.random() * TOOLS.length) | 0];
      pushRecent(t.id); openTool(t.id);
      toast(`Nasib memilihmu: ${t.icon} ${t.title} 🎲`);
      return;
    }
    if (item.id === '__radar') { document.querySelector('#info')?.scrollIntoView({ behavior: 'smooth' }); return; }
    if (item.id === '__dev') { document.querySelector('#dev')?.scrollIntoView({ behavior: 'smooth' }); return; }
    pushRecent(item.id);
    openTool(item.id);
  };

  inp.addEventListener('input', () => { q = inp.value; idx = 0; render(); });
  inp.addEventListener('keydown', (e) => {
    const items = filtered();
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = (idx + 1) % items.length; render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = (idx - 1 + items.length) % items.length; render(); }
    else if (e.key === 'Enter') { e.preventDefault(); exec(items[idx]); }
  });
  list.addEventListener('click', (e) => {
    const it = e.target.closest('.cp-item');
    if (!it) return;
    const items = filtered();
    exec(items[+it.dataset.i]);
  });
  $('#cpBackdrop').addEventListener('click', closeP);

  document.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      wrap.hidden ? openP() : closeP();
      return;
    }
    if (e.key === 'Escape' && !wrap.hidden) { closeP(); return; }
    // "/" fokus ke search tools kalau modal ga kebuka
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = (document.activeElement || {}).tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT' && $('#modalBackdrop').hidden && wrap.hidden) {
        e.preventDefault();
        document.querySelector('#searchInput')?.focus();
      }
    }
  });

  $('#paletteBtn')?.addEventListener('click', openP);
  $('#dockPalette')?.addEventListener('click', openP);
})();

/* ============================ DOCK MOBILE WIRING ========================== */
(() => {
  $('#dockRandom')?.addEventListener('click', () => $('#randomToolBtn')?.click());
  $('#dockTop')?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ==================== TOOLS PAKET SULTAN (v6.1 — 15 fitur) ================= */

TOOLS.push(
  { id: 'alquran',     cat: 'tools', icon: '📖', title: 'Al-Quran Digital', desc: 'Baca 114 surat + terjemah + murottal', badge: 'HOT', bc: 'purple' },
  { id: 'doaharian',   cat: 'tools', icon: '🤲', title: 'Doa Harian',       desc: '100+ doa sehari-hari lengkap',     badge: 'HOT', bc: '' },
  { id: 'asmaulhusna', cat: 'tools', icon: '📿', title: 'Asmaul Husna',     desc: '99 nama Allah + artinya',          badge: 'HOT', bc: 'purple' },
  { id: 'twitterdl',   cat: 'downloader', icon: '🐦', title: 'X / Twitter', desc: 'Download video & foto dari X',   badge: 'HOT', bc: 'pink' },
  { id: 'mangareader', cat: 'fun',   icon: '📚', title: 'Baca Manga',       desc: 'Cari & baca chapter langsung',     badge: 'HOT', bc: 'purple' },
  { id: 'deezersearch', cat: 'tools', icon: '🎶', title: 'Deezer Music',    desc: 'Cari lagu + preview 30 detik',     badge: 'BARU', bc: '' },
  { id: 'webshot',     cat: 'tools', icon: '📸', title: 'Screenshot Web',   desc: 'Fotoin website apa aja',           badge: 'BARU', bc: 'pink' },
  { id: 'whoislookup', cat: 'tools', icon: '🔎', title: 'WHOIS Domain',     desc: 'Cek umur & info domain',           badge: 'BARU', bc: 'purple' },
  { id: 'fancytext',   cat: 'maker', icon: '✍️', title: 'Fancy Text',       desc: 'Teks gaya 20+ font unicode',       badge: 'HOT', bc: 'pink' },
  { id: 'weton',       cat: 'fun',   icon: '📅', title: 'Weton Jawa',       desc: 'Neptu, pasaran & watak lahir',     badge: 'HOT', bc: '' },
  { id: 'lovecalc',    cat: 'fun',   icon: '💘', title: 'Love Calculator',  desc: 'Cek kecocokan kalian berdua',      badge: 'BARU', bc: 'pink' },
  { id: 'mememaker',   cat: 'maker', icon: '😂', title: 'Meme Maker',       desc: 'Gambar + teks = meme jadi',        badge: 'BARU', bc: 'purple' },
  { id: 'kompresfoto', cat: 'tools', icon: '🗜️', title: 'Kompres Foto',     desc: 'Kecilin size gambar instan',       badge: 'BARU', bc: '' },
  { id: 'truthordare', cat: 'fun',   icon: '🎭', title: 'Truth or Dare',    desc: 'Jujur atau tantangan, berani?',    badge: 'BARU', bc: 'pink' },
  { id: 'themechanger', cat: 'tools', icon: '🎨', title: 'Ganti Tema Warna', desc: '6 palet warna sesuka hati',       badge: 'HOT', bc: 'purple' },
);


// sinkron angka counter setelah push kedua
(() => {
  const st = $('#statTools');
  if (st) { st.dataset.count = TOOLS.length; st.textContent = TOOLS.length + '+'; }
  const inline = $('#statToolsInline');
  if (inline) inline.textContent = TOOLS.length + '+';
})();

/* ============================ TEMA WARNA (customizer) ===================== */

const THEMES = [
  { name: '💜 Ungu Klasik', p: '#8b5cf6', m: '#d946ef', l: '#c4b5fd', d: '#6d28d9' },
  { name: '🩷 Pink Neon',   p: '#f472b6', m: '#e879f9', l: '#fbcfe8', d: '#be185d' },
  { name: '💙 Biru Laut',   p: '#60a5fa', m: '#818cf8', l: '#bfdbfe', d: '#1d4ed8' },
  { name: '🩵 Cyan Es',     p: '#22d3ee', m: '#2dd4bf', l: '#a5f3fc', d: '#0e7490' },
  { name: '❤️ Merah Bara',  p: '#f87171', m: '#fb923c', l: '#fecaca', d: '#b91c1c' },
  { name: '💚 Hijau Rimba', p: '#4ade80', m: '#2dd4bf', l: '#bbf7d0', d: '#15803d' },
];

function applyThemePreset(t, save = true) {
  const r = document.documentElement.style;
  r.setProperty('--purple', t.p);
  r.setProperty('--magenta', t.m);
  r.setProperty('--violet-lite', t.l);
  r.setProperty('--violet-deep', t.d);
  r.setProperty('--grad', `linear-gradient(135deg, ${t.p}, ${t.m})`);
  r.setProperty('--grad-flash', `linear-gradient(45deg, ${t.p}, ${t.l}, ${t.m}, ${t.p})`);
  r.setProperty('--glow', `color-mix(in srgb, ${t.p} 45%, transparent)`);
  if (save) { try { localStorage.setItem('kyy_theme_v6', JSON.stringify(t)); } catch { } }
}
// pasang tema simpanan pas load (sebelum intro selesai, jadi ga kedip)
(function initTheme() {
  try {
    const t = JSON.parse(localStorage.getItem('kyy_theme_v6') || 'null');
    if (t && t.p) applyThemePreset(t, false);
  } catch { }
})();

/* ============================ DATA STATIS BARU ============================ */

// Weton Jawa — patokan: 1 Jan 1900 = Senin Pahing (cek: 17 Agustus 1945 = Jumat Legi ✓)
const HARI_W = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const NEPTU_H = [5, 4, 3, 7, 8, 6, 9]; // sesuai urutan HARI_W
const PASARAN = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];
const NEPTU_P = [5, 9, 7, 4, 8]; // sesuai urutan PASARAN
const WATAK_NEPTU = {
  7: '🧘 Pendikan — tenang, kalem, suka menenangkan diri',
  8: '🌍 Bumi — sabar, pekerja keras, bisa diandelin',
  9: '🔥 Api — berwibawa & tegas, tapi gampang tersulut emosi',
  10: '💧 Air — mudah bergaul, adaptif, disukai banyak orang',
  11: '🌬️ Angin — cerdas & kreatif, tapi gampang bosen',
  12: '🌳 Kayu — tekun & konsisten, agak keras kepala',
  13: '⚙️ Besi — pendirian kuat, setia sama orang tersayang',
  14: '🏔️ Tanah — jujur, apa adanya, anti drama',
  15: '🌙 Bulan — sensitif & perasa, intuisinya tajam',
  16: '☀️ Surya — percaya diri, lahir buat jadi pemimpin',
  17: '⭐ Lintang — pembawa hoki, gampang disayang orang',
  18: '🌌 Langit — idealis, visioner, mimpi selangit',
};
function wetonOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return null;
  const anchor = new Date('1900-01-01T00:00:00'); // Senin Pahing
  const diff = Math.round((d - anchor) / 86400000);
  const dayIdx = (((1 + diff) % 7) + 7) % 7; // 0=Minggu (anchor Senin = idx 1)
  const pasIdx = (((1 + diff) % 5) + 5) % 5; // 0=Legi (anchor Pahing = idx 1)
  return { hari: HARI_W[dayIdx], pasaran: PASARAN[pasIdx], neptu: NEPTU_H[dayIdx] + NEPTU_P[pasIdx] };
}

// hash stabil buat love calculator (nama sama = hasil sama)
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}

// fancy text unicode
const U = (cp) => String.fromCodePoint(cp);
function cmap(upper, lower, digit = 0, ex = {}) {
  const m = {};
  for (let i = 0; i < 26; i++) { m[String.fromCharCode(65 + i)] = U(upper + i); m[String.fromCharCode(97 + i)] = U(lower + i); }
  if (digit) for (let i = 0; i < 10; i++) m[String(i)] = U(digit + i);
  return Object.assign(m, ex);
}
const FANCY = [
  ['𝐁𝐨𝐥𝐝 Serif', cmap(0x1D400, 0x1D41A, 0x1D7CE)],
  ['𝐼𝑡𝑎𝑙𝑖𝑐 Serif', cmap(0x1D434, 0x1D44E, 0, { h: 'ℎ' })],
  ['𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄', cmap(0x1D468, 0x1D482)],
  ['𝒮𝒸𝓇𝒾𝓅𝓉', cmap(0x1D49C, 0x1D4B6, 0, { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' })],
  ['𝓑𝓸𝓵𝓭 𝓢𝓬𝓻𝓲𝓹𝓽', cmap(0x1D4D0, 0x1D4EA)],
  ['𝔉𝔯𝔞𝔨𝔱𝔲𝔯', cmap(0x1D504, 0x1D51E, 0, { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' })],
  ['𝕭𝖔𝖑𝖉 𝕱𝖗𝖆𝖐𝖙𝖚𝖗', cmap(0x1D56C, 0x1D586)],
  ['𝔻𝕠𝕦𝕓𝕝𝕖', cmap(0x1D538, 0x1D552, 0x1D7D8, { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' })],
  ['𝖲𝖺𝗇𝗌', cmap(0x1D5A0, 0x1D5BA)],
  ['𝗦𝗮𝗻𝘀 𝗕𝗼𝗹𝗱', cmap(0x1D5D4, 0x1D5EE, 0x1D7EC)],
  ['𝘚𝘢𝘯𝘴 𝘐𝘵𝘢𝘭𝘪𝘤', cmap(0x1D608, 0x1D622)],
  ['𝙎𝙖𝙣𝙨 𝘽𝙤𝙡𝙙 𝙄𝙩𝙖𝙡𝙞𝙘', cmap(0x1D63C, 0x1D656)],
  ['𝙼𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎', cmap(0x1D670, 0x1D68A, 0x1D7F6)],
  ['Ⓒⓘⓡⓒⓛⓔⓓ', cmap(0x24B6, 0x24D0, 0, { '0': '⓪', '1': '①', '2': '②', '3': '③', '4': '④', '5': '⑤', '6': '⑥', '7': '⑦', '8': '⑧', '9': '⑨' })],
  ['Ｗｉｄｅ（ｆｕｌｌ）', (() => { const m = cmap(0xFF21, 0xFF41, 0xFF10); m[' '] = '　'; return m; })()],
];
const SMALL = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ';
const SUPR = 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖᑫʳˢᵗᵘᵛʷˣʸᶻ';
const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const FLIP = (() => {
  const a = 'abcdefghijklmnopqrstuvwxyz', b = 'ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz';
  const m = {}; for (let i = 0; i < 26; i++) { m[a[i]] = b[i]; m[a[i].toUpperCase()] = b[i].toUpperCase ? b[i] : b[i]; }
  m['?'] = '¿'; m['!'] = '¡'; m['.'] = '˙'; m[','] = "'"; m['('] = ')'; m[')'] = '(';
  const d = '0123456789', r = '0ІᄅƐㄣϛ9ㄥ86'; for (let i = 0; i < 10; i++) m[d[i]] = r[i];
  return m;
})();
function fancyApply(s, m) { return [...s].map((c) => m[c] || c).join(''); }
const FANCY_EXTRA = [
  ['ꜱᴍᴀʟʟ ᴄᴀᴘꜱ', (s) => [...s.toLowerCase()].map((c) => (c >= 'a' && c <= 'z' ? SMALL[c.charCodeAt(0) - 97] : c)).join('')],
  ['ˢᵘᵖᵉʳˢᵏʳⁱᵖ', (s) => [...s.toLowerCase()].map((c) => (c >= 'a' && c <= 'z' ? SUPR[c.charCodeAt(0) - 97] : c >= '0' && c <= '9' ? SUPD[+c] : c)).join('')],
  ['uʍop ǝpᴉsdn', (s) => fancyApply([...s].reverse().join(''), FLIP)],
  ['S̶t̶r̶i̶k̶e̶', (s) => [...s].map((c) => c === ' ' ? ' ' : c + '\u0336').join('')],
  ['U̲n̲d̲e̲r̲l̲i̲n̲e̲', (s) => [...s].map((c) => c === ' ' ? ' ' : c + '\u0332').join('')],
  ['S̷l̷a̷s̷h̷', (s) => [...s].map((c) => c === ' ' ? ' ' : c + '\u0337').join('')],
  ['Ｖａｐｏｒｗａｖｅ', (s) => [...s.toUpperCase()].join(' ')],
  ['L337 SP34K', (s) => fancyApply(s, { a: '4', A: '4', e: '3', E: '3', i: '1', I: '1', o: '0', O: '0', s: '5', S: '5', t: '7', T: '7', g: '9', G: '9', b: '8', B: '8' })],
];

// arti Asmaul Husna (Bahasa Indonesia), urutan sesuai API aladhan
const ASMA_ID = 'Maha Pengasih|Maha Penyayang|Maha Merajai|Maha Suci|Maha Memberi Keselamatan|Maha Pemberi Keamanan|Maha Menjaga & Mengawasi|Maha Perkasa|Maha Memiliki Kehendak Mutlak|Maha Memiliki Kebesaran|Maha Pencipta|Maha Mengadakan|Maha Membentuk Rupa|Maha Pengampun|Maha Gagah Perkasa|Maha Pemberi Karunia|Maha Pemberi Rezeki|Maha Pembuka Rahmat|Maha Mengetahui|Maha Menyempitkan|Maha Melapangkan|Maha Merendahkan|Maha Meninggikan|Maha Memuliakan|Maha Menghinakan|Maha Mendengar|Maha Melihat|Maha Menetapkan Hukum|Maha Adil|Maha Lembut|Maha Tahu Segala Rahasia|Maha Penyantun|Maha Agung|Maha Pengampun Dosa|Maha Pembalas Budi|Maha Tinggi|Maha Besar|Maha Menjaga|Maha Pemberi Kecukupan|Maha Menghitung|Maha Mulia|Maha Pemurah|Maha Mengawasi|Maha Mengabulkan Doa|Maha Luas|Maha Bijaksana|Maha Mencintai|Maha Mulia|Maha Membangkitkan|Maha Menyaksikan|Maha Benar|Maha Memelihara|Maha Kuat|Maha Kokoh|Maha Melindungi|Maha Terpuji|Maha Menghitung Segala|Maha Memulai|Maha Mengembalikan|Maha Menghidupkan|Maha Mematikan|Maha Hidup Kekal|Maha Berdiri Sendiri|Maha Menemukan|Maha Mulia|Maha Esa|Maha Tunggal|Maha Tempat Bergantung|Maha Berkuasa|Maha Maha Berkuasa|Maha Mendahulukan|Maha Mengakhirkan|Maha Awal|Maha Akhir|Maha Zhahir|Maha Batin|Maha Memerintah|Maha Tinggi Derajat|Maha Baik|Maha Menerima Taubat|Maha Menghukum|Maha Pemaaf|Maha Lemah Lembut|Pemilik Kerajaan|Pemilik Keagungan & Kemuliaan|Maha Adil|Maha Mengumpulkan|Maha Kaya|Maha Pemberi Kekayaan|Maha Mencegah|Pemberi Mudharat|Pemberi Manfaat|Maha Cahaya|Maha Pemberi Petunjuk|Maha Pencipta Tiada Tara|Maha Kekal|Maha Pewaris|Maha Bijaksana|Maha Penyabar'.split('|');

// truth or dare pools
const TRUTHS = [
  'Siapa orang terakhir yang kamu stalk di medsos?', 'Hal paling malu yang pernah kamu lakuin di tempat umum?',
  'Pernah bohong ke orang tua soal apa terakhir kali?', 'Apa chat paling awkward yang masih ke-simpen di HP kamu?',
  'Kalau bisa balik ke satu momen di masa lalu, momen apa? Kenapa?', 'Siapa crush pertamamu? Masih kontakan?',
  'Apa hal paling norak yang diam-diam kamu suka?', 'Pernah ketahuan bohong gara-gara apa?',
  'Apa ketakutan paling random yang kamu punya?', 'Kebiasaan aneh kamu pas sendirian di kamar apa?',
  'Pernah pura-pura sakit buat bolos apa acara apa?', 'Barang apa yang sebenernya udah rusak tapi sayang dibuang?',
  'Apa search history paling aneh yang pernah kamu ketik?', 'Kalau hidupmu jadi film, judulnya apa?',
  'Pernah ngupil di depan umum terus ketahuan?', 'Apa kebohongan yang paling sering kamu bilang?',
  'Siapa di circle kamu yang paling susah ditebak?', 'Apa hal kekanak-kanakan yang masih kamu lakuin sampe sekarang?',
  'Pernah kirim chat ke orang yang salah? Ceritain!', 'Apa hal paling berani yang pernah kamu lakuin?',
  'Kalau dapet 1 milyar sekarang, hal pertama yang kamu beli apa?', 'Apa gombalan paling cringe yang pernah kamu pake?',
  'Apa lagu yang kamu dengerin diam-diam tapi malu ngaku?', 'Pernah suka sama pacar temen? JUJUR!',
  'Apa hal yang pengen kamu bilang ke gebetan tapi ga berani?', 'Kalau harus ganti nama, kamu mau nama apa?',
  'Apa mimpi paling aneh yang masih kamu inget?', 'Siapa orang yang paling sering kamu chat tiap hari?',
  'Apa hal paling ga nyangka yang orang-orang ga tau tentang kamu?', 'Pernah ngiler pas tidur ketauan orang?',
];
const DARES = [
  'Tiruin gaya selebgram jualan live selama 30 detik!', 'Nyanyi bagian reff lagu random, harus yakin!',
  'Chat "aku kangen" ke kontak urutan ke-3 di HP kamu, screenshot reaksinya.', 'Jalan model catwalk muter satu ruangan!',
  'Bicara pake logat kartun selama 3 menit.', 'Pake kaus kaki beda warna sebelah sampe sesi main selesai.',
  'Tiruin suara binatang yang dipilih sama temenmu sampai ketebak.', 'Joget tanpa musik selama 20 detik, full senyum.',
  'Update status "aku ganteng/cantik banget ya Allah makasih" sekarang juga.', 'Bilang "love you" ke gelas/botol minum paling dekat, romantis!',
  'Selfie muka paling jelek yang bisa kamu bikin, kirim ke grup.', 'Bicara ngeledek diri sendiri pake bahasa Inggris broken 30 detik.',
  'Tahan ketawa sambil temenmu boleh gangguin selama 30 detik.', 'Berdiri satu kaki sambil cerita tentang masa kecil 1 menit.',
  'Tunjukin foto paling lama di galeri HP kamu ke semua orang.', 'Tiruin gaya salah satu pemain sampe ketebak siapa.',
  'Makan/minum sesuatu tanpa pake tangan.', 'Push-up 5 kali atau squat 10 kali, pilih!',
  'Ketik dan kirim pesan pake hidung (jangan hapus typo-nya).', 'Ceritain kejadian paling ngeselin hari ini pake suara robot.',
  'Goyang bahu kayak emoji pengsan 💃 tanpa berhenti 15 detik.', 'Bilang "aku adalah raja/ratu gudang" dengan pose paling dramatis.',
  'Balik kaos kamu terus pake sampe giliranmu lagi.', 'Tebak lagu yang dihum temenmu, 3 kali kesempatan.',
  'Bikin pantun 4 baris tentang cinta dalam 1 menit.', 'Tiruin tawa 5 tipe: vampir, raksasa, bayi, bebek, kakek.',
  'Minum satu teguk tiap kali ada yang bilang "eh" selama 1 menit.', 'Bertingkah jadi kucing menggemaskan selama 30 detik.',
  'Baca chat terakhir kamu keras-keras pake suara pembawa berita.', 'Pilih satu orang, puji dia 3 hal dengan tulus!',
  'Tahan pose "pikir keras" sambil telunjuk di jidat selama satu putaran penuh.',
];

console.log(`%c⚡ paket sultan loaded — ${TOOLS.length} tools total`, 'color:#8b5cf6;font-weight:bold');

/* ==================== TOOL_UI PAKET SULTAN ==================== */

Object.assign(TOOL_UI, {

  alquran: {
    html: `
      <div id="qrRoot">${LOADER_HTML}</div>`,
    mount() {
      const root = $('#qrRoot');
      const listCtl = {
        data: null,
        show(list, q = '') {
          const items = list.filter((s) => !q || s.latin.toLowerCase().includes(q) || s.arti.toLowerCase().includes(q) || String(s.nomor) === q);
          root.innerHTML = `
            ${vField('🔍 Cari surat', `<input class="input" id="qrCari" placeholder="mis. Al-Kahfi / cinta / 18" value="${esc(q)}"/>`)}
            <div style="max-height:55vh;overflow-y:auto;display:flex;flex-direction:column;gap:8px">
              ${items.map((s) => `
                <div class="result-box" data-surah="${s.nomor}" style="display:flex;align-items:center;gap:10px;cursor:pointer;margin:0">
                  <b style="min-width:34px;height:34px;border-radius:10px;background:var(--grad);display:grid;place-items:center;flex:0 0 auto">${s.nomor}</b>
                  <div style="flex:1;min-width:0">
                    <b>${esc(s.latin)}</b> <span style="font-size:.72rem;color:var(--muted)">(${esc(s.arti)})</span><br>
                    <span style="font-size:.7rem;color:var(--muted)">${s.jumlahAyat} ayat · ${esc(s.tempat)}</span>
                  </div>
                  <span style="font-size:1.25rem;font-family:serif;flex:0 0 auto">${esc(s.arab)}</span>
                </div>`).join('') || '<div class="result-box">Ga ketemu 😢</div>'}
            </div>`;
          $('#qrCari').addEventListener('input', (e) => { const v = e.target.value; clearTimeout(listCtl._t); listCtl._t = setTimeout(() => listCtl.show(listCtl.data, v), 200); });
          root.querySelectorAll('[data-surah]').forEach((el) => el.addEventListener('click', () => surahCtl.load(+el.dataset.surah)));
        },
      };
      const surahCtl = {
        data: null,
        async load(n) {
          root.innerHTML = LOADER_HTML;
          try {
            const { result: d } = await api('/quran/surat', { nomor: n });
            this.data = d;
            this.show(d);
          } catch (e) { root.innerHTML = errBox(e.message) + '<button class="btn btn-ghost btn-sm btn-block" id="qrBack1">← Daftar surat</button>'; $('#qrBack1').addEventListener('click', () => listCtl.show(listCtl.data)); }
        },
        show(d, q = '') {
          const audios = d.audioFull ? (d.audioFull['05'] || Object.values(d.audioFull)[0]) : null;
          const ayats = d.ayat.filter((a) => !q || String(a.nomor) === q || a.idn.toLowerCase().includes(q.toLowerCase()));
          root.innerHTML = `
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
              <button class="btn btn-ghost btn-sm" id="qrBack">← Semua surat</button>
              <div style="flex:1"></div>
              ${d.prev ? `<button class="btn btn-ghost btn-sm" id="qrPrev">← ${esc(d.prev.latin)}</button>` : ''}
              ${d.next ? `<button class="btn btn-ghost btn-sm" id="qrNext">${esc(d.next.latin)} →</button>` : ''}
            </div>
            <div class="result-box" style="text-align:center;margin-bottom:10px">
              <div style="font-size:1.9rem;font-family:serif">${esc(d.arab)}</div>
              <b>${esc(d.latin)}</b> (${esc(d.arti)})<br>
              <span style="font-size:.74rem;color:var(--muted)">${d.jumlahAyat} ayat · turun di ${esc(d.tempat)}</span>
              ${audios ? `<audio controls preload="none" src="${audios}" style="width:100%;margin-top:10px"></audio>` : ''}
            </div>
            ${vField('🔍 Lompat / cari ayat', `<input class="input" id="qrAyat" placeholder="nomor ayat atau kata terjemahan…" value="${esc(q)}"/>`)}
            ${d.nomor !== 1 && d.nomor !== 9 ? `<div style="text-align:center;font-size:1.5rem;font-family:serif;margin:6px 0 12px">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</div>` : ''}
            <div style="display:flex;flex-direction:column;gap:12px;max-height:52vh;overflow-y:auto">
              ${ayats.map((a) => `
                <div style="padding:12px 14px;border:1px solid var(--border);border-radius:14px;background:rgba(255,255,255,.02)">
                  <div style="display:flex;justify-content:space-between;gap:10px">
                    <span style="font-size:.68rem;color:var(--purple);font-weight:800">${d.nomor}:${a.nomor}</span>
                  </div>
                  <div style="text-align:right;font-size:1.45rem;line-height:2.1;font-family:serif;margin:6px 0 8px">${esc(a.arab)}</div>
                  <div style="font-size:.78rem;color:var(--muted);font-style:italic;margin-bottom:6px">${esc(a.latin || '')}</div>
                  <div style="font-size:.84rem">${esc(a.idn)}</div>
                </div>`).join('') || '<div class="result-box">Ayatnya ga ketemu 😢</div>'}
            </div>`;
          $('#qrBack').addEventListener('click', () => listCtl.show(listCtl.data));
          $('#qrPrev')?.addEventListener('click', () => this.load(d.prev.nomor));
          $('#qrNext')?.addEventListener('click', () => this.load(d.next.nomor));
          $('#qrAyat').addEventListener('input', (e) => { clearTimeout(this._t); this._t = setTimeout(() => this.show(this.data, e.target.value.trim()), 250); });
        },
      };
      (async () => {
        try {
          const { result } = await api('/quran/list');
          listCtl.data = result;
          listCtl.show(result);
        } catch (e) { root.innerHTML = errBox(e.message); }
      })();
    },
  },

  doaharian: {
    html: `<div id="doaRoot">${LOADER_HTML}</div>`,
    mount() {
      const root = $('#doaRoot');
      api('/doa/harian').then(({ result: list }) => {
        const render = (q = '') => {
          const items = list.filter((d) => !q || d.judul.toLowerCase().includes(q) || (d.artinya || '').toLowerCase().includes(q));
          root.innerHTML = `
            ${vField('🔍 Cari doa', `<input class="input" id="doaCari" placeholder="mis. makan, tidur, masuk masjid…" value="${esc(q)}"/>`)}
            ${vHint(`${items.length} doa ketemu · sumber: myquran.com`)}
            <div style="display:flex;flex-direction:column;gap:12px;max-height:55vh;overflow-y:auto">
              ${items.map((d) => `
                <div style="padding:12px 14px;border:1px solid var(--border);border-radius:14px;background:rgba(255,255,255,.02)">
                  <b style="color:var(--violet-lite)">${esc(d.judul)}</b>
                  <div style="text-align:right;font-size:1.35rem;line-height:2;font-family:serif;margin:8px 0">${esc(d.arab)}</div>
                  ${d.latin ? `<div style="font-size:.76rem;color:var(--muted);font-style:italic;margin-bottom:6px">${esc(d.latin)}</div>` : ''}
                  ${d.artinya ? `<div style="font-size:.82rem">“${esc(d.artinya)}”</div>` : ''}
                </div>`).join('') || '<div class="result-box">Ga ketemu 😢</div>'}
            </div>`;
          $('#doaCari').addEventListener('input', (e) => { clearTimeout(render._t); render._t = setTimeout(() => render(e.target.value.trim()), 220); });
        };
        render();
      }).catch((e) => { root.innerHTML = errBox(e.message); });
    },
  },

  asmaulhusna: {
    html: `<div id="asmaRoot">${LOADER_HTML}</div>`,
    mount() {
      const root = $('#asmaRoot');
      api('/asmaulhusna').then(({ result: list }) => {
        root.innerHTML = `
          ${vHint(`${list.length} nama · ketuk kartu buat salin bacaannya`)}
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;max-height:56vh;overflow-y:auto">
            ${list.map((a, i) => `
              <div class="result-box" data-asma="${i}" style="text-align:center;cursor:pointer;margin:0;padding:12px 8px">
                <div style="font-size:1.3rem;font-family:serif">${esc(a.arab)}</div>
                <b style="font-size:.8rem;display:block;margin:4px 0 2px;color:var(--violet-lite)">${a.nomor}. ${esc(a.latin)}</b>
                <span style="font-size:.68rem;color:var(--muted)">${esc(ASMA_ID[a.nomor - 1] || a.arti)}</span>
              </div>`).join('')}
          </div>`;
        root.querySelectorAll('[data-asma]').forEach((el) => el.addEventListener('click', () => {
          const a = list[+el.dataset.asma];
          copyText(a.latin);
        }));
      }).catch((e) => { root.innerHTML = errBox(e.message); });
    },
  },

  twitterdl: {
    html: `
      ${vField('🐦 Link tweet / X', vInputRow('twUrl', 'https://x.com/user/status/123456…', 'twGo', '⚡ Ambil'))}
      ${vHint('Bisa buat tweet video, foto, ataupun tweet biasa. Server cadangan dipake otomatis kalo yang utama ngambek.')}
      <div id="twRes"></div>`,
    mount() {
      const run = async () => {
        const url = $('#twUrl').value.trim();
        if (!url) return toast('Tempel link tweet dulu ya 🐦', 'error');
        const box = $('#twRes');
        box.innerHTML = LOADER_HTML;
        try {
          const { result: d, _ms } = await api('/downloader/twitter', { url });
          box.innerHTML = `
            <p style="font-size:.72rem;color:var(--muted);margin:10px 0">via ${d.by} · ${_ms}ms</p>
            <div class="result-box" style="margin-bottom:10px">
              <b>🐦 @${esc(d.user)}</b> ${d.name ? esc(d.name) : ''}<br>
              <span style="font-size:.8rem">${esc(d.text || '(tanpa teks)')}</span><br>
              <span style="font-size:.7rem;color:var(--muted)">${d.date ? esc(d.date) : ''} ${d.likes != null ? ' · ❤️ ' + fmtID(d.likes) : ''}</span>
            </div>
            ${d.videos.length ? `<b style="font-size:.78rem">🎬 Video:</b>` + d.videos.map((v, i) => `
              <div class="result-box" style="display:flex;gap:10px;align-items:center;margin-top:8px">
                ${v.thumb ? `<img src="${v.thumb}" style="width:80px;height:60px;object-fit:cover;border-radius:8px;flex:0 0 auto" loading="lazy"/>` : '<span style="font-size:1.6rem">🎬</span>'}
                <div style="flex:1;min-width:0">
                  <b style="font-size:.74rem">Varian ${i + 1}${v.bitrate ? ' — ' + Math.round(v.bitrate / 1000) + ' kbps' : ''}</b>
                  <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
                    <a class="btn btn-primary btn-sm" href="${v.url}" target="_blank" rel="noopener" style="font-size:.66rem;padding:6px 10px">⬇️ Download</a>
                    <button class="btn btn-ghost btn-sm" data-twcopy="${v.url}" style="font-size:.66rem;padding:6px 10px">🔗 Salin</button>
                  </div>
                </div>
              </div>`).join('') : ''}
            ${d.photos.length ? `<b style="font-size:.78rem;display:block;margin-top:10px">🖼 Foto (${d.photos.length}):</b>` + d.photos.map((p, i) => `
              <div class="result-box" style="margin-top:8px">
                <img src="${p}" loading="lazy" style="width:100%;border-radius:10px"/>
                <div style="display:flex;gap:6px;margin-top:8px">
                  <button class="btn btn-primary btn-sm" data-twphoto="${i}" style="font-size:.66rem;padding:6px 10px">💾 Simpan foto</button>
                  <button class="btn btn-ghost btn-sm" data-twcopy="${p}" style="font-size:.66rem;padding:6px 10px">🔗 Salin</button>
                </div>
              </div>`).join('') : ''}
            ${!d.videos.length && !d.photos.length ? '<div class="result-box">Tweet ini ga ada media fotonya/videonya — cuma teks. Tetep ke-save kok info-nya ✍️</div>' : ''}`;
          box.querySelectorAll('[data-twcopy]').forEach((b) => b.addEventListener('click', () => copyText(b.dataset.twcopy)));
          box.querySelectorAll('[data-twphoto]').forEach((b) => b.addEventListener('click', async () => {
            const p = d.photos[+b.dataset.twphoto];
            b.textContent = '⏳';
            try {
              const r = await fetch(p);
              const blob = await r.blob();
              const reader = new FileReader();
              reader.onloadend = () => { downloadDataUrl(reader.result, `x-${d.user}-${+b.dataset.twphoto + 1}.jpg`); b.textContent = '💾 Simpan foto'; };
              reader.readAsDataURL(blob);
            } catch { b.textContent = '💾 Simpan foto'; window.open(p, '_blank'); }
          }));
        } catch (e) { box.innerHTML = errBox(e.message); }
      };
      $('#twGo').addEventListener('click', run);
      $('#twUrl').addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
    },
  },

  mangareader: {
    html: `<div id="mgRoot">
      ${vField('🔍 Judul manga', vInputRow('mgQ', 'mis. solo leveling, one piece…', 'mgGo'))}
      ${vHint('Sumber: MangaDex — pilih English 🇬🇧 atau Indonesia 🇮🇩 sesuai yang tersedia.')}
      <div id="mgRes"></div>
    </div>`,
    mount() {
      let coverMap = {};
      const doSearch = async (q) => {
        if (!q) return toast('Ketik judul dulu 📚', 'error');
        $('#mgRes').innerHTML = LOADER_HTML;
        try {
          const { result: list } = await api('/manga/search', { query: q });
          $('#mgRes').innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px">` + (list.map((m, i) => `
            <div data-mg="${i}" style="cursor:pointer">
              ${m.cover ? `<img src="${m.cover}" loading="lazy" style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:10px;border:1px solid var(--border)"/>` : '<div style="aspect-ratio:3/4;border-radius:10px;background:var(--glass-bg);display:grid;place-items:center">📚</div>'}
              <b style="font-size:.7rem;display:block;margin-top:4px;line-height:1.3">${esc(m.title)}</b>
              <span style="font-size:.64rem;color:var(--muted)">${m.year || '?'} · ${esc(m.status || '?')}</span>
            </div>`).join('') || '<div class="result-box">Ga ketemu 😢</div>') + '</div>';
          coverMap = {};
          list.forEach((m, i) => { coverMap[i] = m; });
          $('#mgRes').querySelectorAll('[data-mg]').forEach((el) => el.addEventListener('click', () => openChapters(list[+el.dataset.mg])));
        } catch (e) { $('#mgRes').innerHTML = errBox(e.message); }
      };
      const openChapters = async (m) => {
        const res = $('#mgRes');
        res.innerHTML = LOADER_HTML;
        try {
          const { result: chaps } = await api('/manga/chapters', { id: m.id });
          const seen = new Set();
          const clean = chaps.filter((c) => { const k = c.lang + ':' + c.chapter; if (seen.has(k)) return false; seen.add(k); return true; });
          res.innerHTML = `
            <div class="result-box" style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
              ${m.cover ? `<img src="${m.cover}" style="width:52px;border-radius:8px;flex:0 0 auto"/>` : ''}
              <div style="flex:1;min-width:0"><b>${esc(m.title)}</b><br><span style="font-size:.7rem;color:var(--muted)">${clean.length} chapter tersedia</span></div>
              <button class="btn btn-ghost btn-sm" id="mgBack">← Kembali</button>
            </div>
            <div style="max-height:50vh;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
              ${clean.map((c, i) => `
                <div class="result-box" data-ch="${i}" style="margin:0;cursor:pointer;display:flex;gap:8px;align-items:center;padding:10px 12px">
                  <span flex:0 0 auto>${c.lang === 'id' ? '🇮🇩' : '🇬🇧'}</span>
                  <b style="font-size:.8rem;flex:1">Chapter ${c.chapter ?? '?'}${c.volume ? ' · Vol ' + c.volume : ''}${c.title ? ' — ' + esc(c.title) : ''}</b>
                  ${c.pages ? `<span style="font-size:.66rem;color:var(--muted)">${c.pages} hlm</span>` : ''}
                </div>`).join('') || '<div class="result-box">Chapter belum ada yang bisa dibaca 😢</div>'}
            </div>`;
          $('#mgBack').addEventListener('click', () => $('#mgGo').click());
          res.querySelectorAll('[data-ch]').forEach((el) => el.addEventListener('click', () => readChapter(m, clean, +el.dataset.ch)));
        } catch (e) { res.innerHTML = errBox(e.message); }
      };
      const readChapter = async (m, chaps, idx, fromNext = 0) => {
        const c = chaps[idx];
        const res = $('#mgRes');
        res.innerHTML = LOADER_HTML;
        try {
          const { result: pg } = await api('/manga/pages', { id: c.id });
          const imgs = pg.urls.map((u, i) => `<img src="${u}" loading="lazy" style="width:100%;display:block;border-radius:6px;margin-bottom:6px" alt="halaman ${i + 1}"/>`).join('');
          res.innerHTML = `
            <div class="result-box" style="margin-bottom:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              <button class="btn btn-ghost btn-sm" id="mgChBack">← Daftar chapter</button>
              <div style="flex:1"></div>
              ${idx + 1 < chaps.length ? `<button class="btn btn-ghost btn-sm" id="mgChPrev">‹ Ch ${chaps[idx + 1].chapter}</button>` : ''}
              ${idx - 1 >= 0 ? `<button class="btn btn-primary btn-sm" id="mgChNext">Ch ${chaps[idx - 1].chapter} ›</button>` : ''}
            </div>
            <b style="display:block;margin-bottom:8px">${c.lang === 'id' ? '🇮🇩' : '🇬🇧'} ${esc(m.title)} — Chapter ${c.chapter ?? '?'}</b>
            ${imgs}
            <div style="display:flex;gap:6px;margin-top:6px">
              ${idx + 1 < chaps.length ? `<button class="btn btn-ghost btn-sm" id="mgChPrev2" style="flex:1">‹ Chapter sebelumnya</button>` : ''}
              ${idx - 1 >= 0 ? `<button class="btn btn-primary btn-sm" id="mgChNext2" style="flex:1">Chapter berikutnya ›</button>` : ''}
            </div>`;
          $('#mgChBack').addEventListener('click', () => openChapters(m));
          const nav = (j) => { if (j >= 0 && j < chaps.length) readChapter(m, chaps, j); };
          $('#mgChPrev')?.addEventListener('click', () => nav(idx + 1));
          $('#mgChNext')?.addEventListener('click', () => nav(idx - 1));
          $('#mgChPrev2')?.addEventListener('click', () => nav(idx + 1));
          $('#mgChNext2')?.addEventListener('click', () => nav(idx - 1));
          res.scrollIntoView({ block: 'start' });
        } catch (e) { res.innerHTML = errBox(e.message) + `<button class="btn btn-ghost btn-sm" id="mgChErrBack">← Daftar chapter</button>`; $('#mgChErrBack')?.addEventListener('click', () => openChapters(m)); }
      };
      $('#mgGo').addEventListener('click', () => doSearch($('#mgQ').value.trim()));
      $('#mgQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(e.target.value.trim()); });
      // auto buka pencarian populer biar ga kosong melompong
      doSearch('solo leveling');
    },
  },

  deezersearch: {
    html: `
      ${vField('🔍 Judul / penyanyi', vInputRow('dzQ', 'mis. tulus monokrom', 'dzGo', '⚡ Cari 🔥'))}
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <button class="btn btn-ghost btn-sm" id="dzChart">🔥 Chart Global Top 15</button>
      </div>
      <div id="dzRes"></div>`,
    mount() {
      const render = (list) => {
        $('#dzRes').innerHTML = list.map((t) => `
          <div class="result-box" style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
            ${t.cover ? `<img src="${t.cover}" style="width:56px;height:56px;border-radius:10px;flex:0 0 auto" loading="lazy"/>` : ''}
            <div style="flex:1;min-width:0">
              <b style="font-size:.82rem;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</b>
              <span style="font-size:.7rem;color:var(--muted)">${esc(t.artist || '?')} · ${esc(t.album || '?')} · ${t.duration ? ms2s(t.duration) : ''}</span>
              ${t.preview ? `<audio controls preload="none" src="${t.preview}" style="width:100%;margin-top:6px;height:28px"></audio>` : '<span style="font-size:.66rem;color:var(--muted)">(ga ada preview 😢)</span>'}
            </div>
            <a href="${t.link}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="flex:0 0 auto;font-size:.64rem">Deezer ↗</a>
          </div>`).join('') || '<div class="result-box">Ga ketemu 😢</div>';
      };
      $('#dzGo').addEventListener('click', async () => {
        const q = $('#dzQ').value.trim();
        if (!q) return toast('Ketik judul dulu 🎶', 'error');
        $('#dzRes').innerHTML = LOADER_HTML;
        try { const { result } = await api('/search/music', { q }); render(result); }
        catch (e) { $('#dzRes').innerHTML = errBox(e.message); }
      });
      $('#dzQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#dzGo').click(); });
      $('#dzChart').addEventListener('click', async () => {
        $('#dzRes').innerHTML = LOADER_HTML;
        try { const { result } = await api('/deezer/chart'); render(result); }
        catch (e) { $('#dzRes').innerHTML = errBox(e.message); }
      });
    },
  },

  webshot: {
    html: `
      ${vField('📸 URL website', vInputRow('wsUrl', 'mis. detik.com atau https://…', 'wsGo', '📸 Jepret'))}
      ${vHint('Mesin fotonya butuh jalan-jalan dulu — bisa sampai 30-60 detik, sabar ya!')}
      <div id="wsRes"></div>`,
    mount() {
      $('#wsGo').addEventListener('click', async () => {
        const url = $('#wsUrl').value.trim();
        if (!url) return toast('Isi URL dulu ya 📸', 'error');
        $('#wsRes').innerHTML = `<div class="result-box" style="text-align:center">${LOADER_HTML}<p style="font-size:.74rem;color:var(--muted);margin-top:6px">lagi motret web-nya… jangan ditutup dulu 📸</p></div>`;
        try {
          const { result: d, _ms } = await api('/tools/webshot', { url });
          $('#wsRes').innerHTML = `
            <p style="font-size:.72rem;color:var(--muted);margin:8px 0">${esc(d.source)} · ${_ms}ms</p>
            <img src="${d.image}" style="width:100%;border-radius:12px;border:1px solid var(--border)"/>
            <div style="display:flex;gap:6px;margin-top:8px">
              <button class="btn btn-primary btn-sm" id="wsDl">💾 Download gambar</button>
              <a class="btn btn-ghost btn-sm" href="${d.source}" target="_blank" rel="noopener">Buka web ↗</a>
            </div>`;
          $('#wsDl').addEventListener('click', () => downloadDataUrl(d.image, 'webshot.png'));
        } catch (e) { $('#wsRes').innerHTML = errBox(e.message); }
      });
    },
  },

  whoislookup: {
    html: `
      ${vField('🔎 Domain', vInputRow('whQ', 'mis. google.com / detik.com', 'whGo', '⚡ Cek'))}
      ${vHint('Didukung: .com .net .id — info dari RDAP resmi registry.')}
      <div id="whRes"></div>`,
    mount() {
      const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
      $('#whGo').addEventListener('click', async () => {
        const q = $('#whQ').value.trim();
        if (!q) return toast('Isi domain dulu 🔎', 'error');
        $('#whRes').innerHTML = LOADER_HTML;
        try {
          const { result: d, _ms } = await api('/tools/whois', { domain: q });
          const umur = d.dibuat ? Math.floor((Date.now() - new Date(d.dibuat)) / 86400000 / 365.25) : null;
          $('#whRes').innerHTML = `
            <div class="result-box" style="margin-top:8px">
              <b style="font-size:1.05rem">🌐 ${esc(d.domain)}</b>
              ${umur != null ? `<span class="badge" style="margin-left:8px;background:rgba(52,211,153,.18);color:var(--green)">${umur} tahun umurnya</span>` : ''}
            </div>
            <div class="result-box">
              <table style="width:100%;font-size:.8rem;border-collapse:collapse">
                <tr><td style="padding:6px 0;color:var(--muted)">Registrar</td><td><b>${esc(d.registrar)}</b></td></tr>
                <tr><td style="padding:6px 0;color:var(--muted)">Terdaftar</td><td>${fmt(d.dibuat)}</td></tr>
                <tr><td style="padding:6px 0;color:var(--muted)">Kedaluwarsa</td><td>${fmt(d.kedaluwarsa)}</td></tr>
                <tr><td style="padding:6px 0;color:var(--muted)">Update terakhir</td><td>${fmt(d.diupdate)}</td></tr>
                <tr><td style="padding:6px 0;color:var(--muted)">DNSSEC</td><td>${esc(d.dnssec)}</td></tr>
              </table>
            </div>
            ${d.ns.length ? `<div class="result-box"><b style="font-size:.78rem">Nameserver:</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${d.ns.map((n) => `<code style="font-size:.7rem;background:rgba(139,92,246,.14);padding:4px 8px;border-radius:8px">${esc(n)}</code>`).join('')}</div></div>` : ''}
            ${d.status.length ? `<div class="result-box"><b style="font-size:.78rem">Status:</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${d.status.map((s) => `<code style="font-size:.64rem;background:rgba(255,255,255,.05);padding:3px 7px;border-radius:7px">${esc(s)}</code>`).join('')}</div></div>` : ''}
            <p style="font-size:.68rem;color:var(--muted)">${_ms}ms · RDAP registry</p>`;
        } catch (e) { $('#whRes').innerHTML = errBox(e.message); }
      });
      $('#whQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#whGo').click(); });
    },
  },

  fancytext: {
    html: `
      ${vField('✍️ Teks kamu', `<textarea class="input" id="fxIn" rows="3" placeholder="ketik sesuatu yang keren…" spellcheck="false" maxlength="120">KYY Sensei 123</textarea>`)}
      ${vHint('Semua gaya di-generate murni di browser — copy, tempel di bio/status/nickname game.')}
      <div id="fxRes" style="max-height:52vh;overflow-y:auto"></div>`,
    mount() {
      const render = () => {
        const t = $('#fxIn').value || 'KYY';
        const all = [
          ...FANCY.map(([n, m]) => [n, fancyApply(t, m)]),
          ...FANCY_EXTRA.map(([n, fn]) => [n, fn(t)]),
        ];
        $('#fxRes').innerHTML = all.map(([n, out], i) => `
          <div class="result-box" data-fx="${i}" style="margin:0 0 8px;display:flex;gap:10px;align-items:center;cursor:pointer;padding:10px 12px">
            <div style="flex:1;min-width:0">
              <span style="font-size:.62rem;color:var(--muted);display:block">${esc(n)}</span>
              <b style="font-size:.95rem;word-break:break-all">${esc(out)}</b>
            </div>
            <button class="btn btn-ghost btn-sm" style="flex:0 0 auto;font-size:.62rem">📋</button>
          </div>`).join('');
        $('#fxRes').querySelectorAll('[data-fx]').forEach((el) => el.addEventListener('click', () => copyText(el.querySelector('b').textContent)));
      };
      $('#fxIn').addEventListener('input', render);
      render();
    },
  },

  weton: {
    html: `
      ${vField('📅 Tanggal lahir kamu', `<input class="input" type="date" id="wtA"/>`)}
      ${vField('💞 Tanggal lahir dia (opsional, buat cek cocok)', `<input class="input" type="date" id="wtB"/>`)}
      <button class="btn btn-primary btn-sm btn-block" id="wtGo">⚡ Hitung Weton</button>
      ${vHint('Diitung dari patokan 1 Jan 1900 = Senin Pahing. Buat seru-seruan ya, jangan dijadiin satu-satunya litmus relationship 😄')}
      <div id="wtRes"></div>`,
    mount() {
      const card = (label, w) => `
        <div class="result-box" style="margin-top:10px">
          <b>${label}</b>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            <code style="background:rgba(139,92,246,.14);padding:6px 10px;border-radius:9px;font-size:.8rem">${esc(w.hari)}</code>
            <code style="background:rgba(217,70,239,.14);padding:6px 10px;border-radius:9px;font-size:.8rem">${esc(w.pasaran)}</code>
            <code style="background:rgba(52,211,153,.14);padding:6px 10px;border-radius:9px;font-size:.8rem">Neptu ${w.neptu}</code>
          </div>
          <p style="margin:10px 0 0;font-size:.8rem">${esc(WATAK_NEPTU[w.neptu] || '—')}</p>
        </div>`;
      $('#wtGo').addEventListener('click', () => {
        const a = $('#wtA').value, b = $('#wtB').value;
        if (!a) return toast('Isi tanggal lahir dulu 📅', 'error');
        const wa = wetonOf(a);
        if (!wa) return toast('Tanggalnya aneh 😅', 'error');
        let html = card('🧒 Weton kamu', wa);
        if (b) {
          const wb = wetonOf(b);
          if (wb) {
            html += card('💞 Weton dia', wb);
            const diff = Math.abs(wa.neptu - wb.neptu);
            const verdict = diff === 0 ? '💞 SERASI BANGET! Neptu sama = sehati sejalan, kayaknya emang ditakdirin bareng.'
              : diff <= 3 ? '✨ COCOK! Selisihnya kecil, tinggal saling ngerti satu sama lain.'
                : diff <= 6 ? '🤝 LUMAYAN. Butuh kompromi dikit, tapi perbedaan justru bikin lengkap kan?'
                  : '💪 Neptu-nya jauh beda — banyak ujiannya, tapi cinta sejati kan diperjuangkan 😤';
            html += `<div class="result-box" style="margin-top:10px;text-align:center"><b style="color:var(--violet-lite)">${verdict}</b><br><span style="font-size:.72rem;color:var(--muted)">selisih neptu: ${diff} (menurut hitungan primbon, buat fun doang ya!)</span></div>`;
          }
        }
        $('#wtRes').innerHTML = html;
      });
    },
  },

  lovecalc: {
    html: `
      <div class="input-row" style="display:flex;gap:8px;margin-bottom:12px">
        <input class="input" id="lvA" placeholder="Nama kamu" spellcheck="false" style="flex:1"/>
        <span style="align-self:center;font-size:1.1rem">💘</span>
        <input class="input" id="lvB" placeholder="Nama dia" spellcheck="false" style="flex:1"/>
      </div>
      <button class="btn btn-primary btn-sm btn-block" id="lvGo">💘 Hitung Kecocokan</button>
      ${vHint('100% buat seru-seruan — algoritma: rahasia hati + kalkulus asmara 🤫')}
      <div id="lvRes"></div>`,
    mount() {
      const QUIP = [
        [0, '💔 Potensi ada… dari temen dulu aja kali ya 😅'],
        [20, '🌱 Bibit-bibit juga nih, rajin-rajin pdkt!'],
        [40, '🤞 Lima-lima. Usaha lebih penting dari angka 💪'],
        [60, '🔥 Uwuwuwu ada percikannya, gaskeun!'],
        [80, '💕 Fix banyak yang bilang kalian cocok!'],
        [95, '💍 Jodoh tulen! Buruan ajak ke KUA~ (canda guys)'],
      ];
      $('#lvGo').addEventListener('click', () => {
        const a = $('#lvA').value.trim(), b = $('#lvB').value.trim();
        if (!a || !b) return toast('Isi dua-duanya dulu dong 😘', 'error');
        const key = a.toLowerCase().replace(/\s+/g, '') + '💘' + b.toLowerCase().replace(/\s+/g, '');
        const pct = 20 + (fnv1a(key) % 81); // 20-100 biar ga ada yang sakit hati banget
        const q = QUIP.filter(([min]) => pct >= min).pop()[1];
        $('#lvRes').innerHTML = `
          <div class="result-box" style="text-align:center;margin-top:14px">
            <div style="font-family:'Orbitron',sans-serif;font-size:2.6rem;font-weight:900;background:var(--grad-flash);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent">${pct}%</div>
            <b>${esc(a)} <span style="color:var(--magenta)">💘</span> ${esc(b)}</b>
            <p style="margin-top:8px;font-size:.84rem">${q}</p>
            <span style="font-size:.64rem;color:var(--muted)">hasil sama selamanya buat pasangan nama yang sama 🤫</span>
          </div>`;
        beep(880, .15, 'sine', .1); setTimeout(() => beep(1150, .2, 'sine', .1), 180);
      });
    },
  },

  mememaker: {
    html: `
      ${vField('🖼 Pilih gambar', `<input class="input" type="file" id="mmFile" accept="image/*"/>`)}
      <div class="input-row" style="display:flex;gap:8px;margin-bottom:10px">
        <input class="input" id="mmTop" placeholder="TEKS ATAS" spellcheck="false" style="flex:1"/>
        <input class="input" id="mmBot" placeholder="TEKS BAWAH" spellcheck="false" style="flex:1"/>
      </div>
      <div style="text-align:center"><canvas id="mmCv" style="max-width:100%;border-radius:12px;border:1px solid var(--border)"></canvas></div>
      <div style="display:flex;gap:6px;margin-top:10px">
        <button class="btn btn-primary btn-sm btn-block" id="mmDl" disabled>💾 Download Meme</button>
      </div>`,
    mount() {
      const cv = $('#mmCv'), ctx = cv.getContext('2d');
      let img = null;
      const draw = () => {
        if (!img) return;
        const w = Math.min(img.width, 900);
        const h = Math.round(img.height * w / img.width);
        cv.width = w; cv.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const fs = Math.max(22, Math.round(w * 0.085));
        ctx.font = `900 ${fs}px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center'; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'black'; ctx.lineWidth = Math.max(3, fs / 9);
        ctx.fillStyle = 'white';
        const top = ($('#mmTop').value || '').toUpperCase(), bot = ($('#mmBot').value || '').toUpperCase();
        if (top) { ctx.strokeText(top, w / 2, fs + 10); ctx.fillText(top, w / 2, fs + 10); }
        if (bot) { ctx.strokeText(bot, w / 2, h - 14); ctx.fillText(bot, w / 2, h - 14); }
        $('#mmDl').disabled = false;
      };
      $('#mmFile').addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (!f) return;
        img = new Image();
        img.onload = () => { draw(); toast('Gas edit teksnya 😂'); };
        img.src = URL.createObjectURL(f);
      });
      $('#mmTop').addEventListener('input', draw);
      $('#mmBot').addEventListener('input', draw);
      $('#mmDl').addEventListener('click', () => downloadDataUrl(cv.toDataURL('image/png'), 'meme-kyy.png'));
    },
  },

  kompresfoto: {
    html: `
      ${vField('🖼 Pilih foto', `<input class="input" type="file" id="kpFile" accept="image/*"/>`)}
      ${vField('🎚 Kualitas <b id="kpQV">75</b>%', `<input type="range" id="kpQ" min="30" max="95" value="75" style="width:100%"/>`)}
      ${vField('📏 Lebar maksimal <b id="kpWV">1080</b>px', `<select class="input" id="kpW"><option value="640">640 px (chat/status)</option><option value="1080" selected>1080 px (IG/Twitter)</option><option value="1920">1920 px (wallpaper)</option></select>`)}
      <div id="kpOut"></div>`,
    mount() {
      $('#kpQ').addEventListener('input', (e) => { $('#kpQV').textContent = e.target.value; });
      $('#kpW').addEventListener('input', (e) => { $('#kpWV').textContent = e.target.value; });
      let st = { file: null };
      $('#kpFile').addEventListener('change', (e) => {
        st.file = e.target.files[0];
        if (!st.file) return;
        $('#kpOut').innerHTML = `<p style="font-size:.74rem;margin:8px 0">Asli: <b>${(st.file.size / 1024).toFixed(0)} KB</b> — pencet tombol di bawah buat ngompres 👇</p>
          <button class="btn btn-primary btn-sm btn-block" id="kpGo">🗜️ Kompres Sekarang</button>
          <div id="kpRes"></div>`;
        $('#kpGo').addEventListener('click', () => {
          const img = new Image();
          img.onload = () => {
            const maxW = parseInt($('#kpW').value, 10);
            const scale = Math.min(1, maxW / img.width);
            const cv = document.createElement('canvas');
            cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
            cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
            const q = parseInt($('#kpQ').value, 10) / 100;
            cv.toBlob((blob) => {
              if (!blob) return toast('Gagal kompres 😢', 'error');
              const saved = Math.max(0, 100 - Math.round(blob.size / st.orig * 100));
              const url = URL.createObjectURL(blob);
              $('#kpRes').innerHTML = `
                <div class="result-box" style="margin-top:10px">
                  ✨ Hasil: <b>${(blob.size / 1024).toFixed(0)} KB</b> · hemat <b style="color:var(--green)">${saved}%</b>
                  <img src="${url}" style="width:100%;border-radius:10px;margin-top:8px" loading="lazy"/>
                  <a class="btn btn-primary btn-sm btn-block" href="${url}" download="foto-hemat.jpg" style="margin-top:8px;text-align:center">💾 Download</a>
                </div>`;
            }, 'image/jpeg', q);
          };
          img.src = URL.createObjectURL(st.file);
          st.orig = st.file.size;
        });
      });
    },
  },

  truthordare: {
    html: `
      <div style="display:flex;gap:10px;margin-bottom:12px">
        <button class="btn btn-ghost btn-sm" style="flex:1" id="tdTruth">😇 TRUTH</button>
        <button class="btn btn-primary btn-sm" style="flex:1" id="tdDare">😈 DARE</button>
        <button class="btn btn-ghost btn-sm" style="flex:1" id="tdRand">🎲 Acak</button>
      </div>
      <div id="tdRes" style="text-align:center;padding:20px 10px">
        <span style="font-size:2.4rem">🎭</span>
        <p style="font-size:.85rem;color:var(--muted);margin-top:8px">Pilih jujur atau tantangan… kalo berani 😏</p>
      </div>`,
    mount() {
      const pick = (pool, label, icon) => {
        const t = pool[Math.floor(Math.random() * pool.length)];
        $('#tdRes').innerHTML = `
          <span style="font-size:2.2rem">${icon}</span>
          <b style="display:block;margin:10px 0 4px;color:var(--violet-lite);letter-spacing:.14em;font-size:.72rem">${label}</b>
          <p style="font-size:1.02rem;font-weight:600;line-height:1.5">${esc(t)}</p>
          <button class="btn btn-ghost btn-sm" id="tdAgain" style="margin-top:12px">🔄 Lagi!</button>`;
        $('#tdAgain').addEventListener('click', () => pick(pool, label, icon));
        beep(600, .08, 'sine', .07); setTimeout(() => beep(900, .1, 'sine', .07), 90);
      };
      $('#tdTruth').addEventListener('click', () => pick(TRUTHS, '😇 JUJUR', '😇'));
      $('#tdDare').addEventListener('click', () => pick(DARES, '😈 TANTANGAN', '😈'));
      $('#tdRand').addEventListener('click', () => Math.random() < .5 ? pick(TRUTHS, '😇 JUJUR', '😇') : pick(DARES, '😈 TANTANGAN', '😈'));
    },
  },

  themechanger: {
    html: `
      ${vHint('Klik palet favoritmu — seluruh web langsung ganti warna & ke-simpen di HP ini.')}
      <div id="thRoot" style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px"></div>
      <button class="btn btn-ghost btn-sm btn-block" id="thReset">↺ Balik ke 💜 Ungu Klasik (default)</button>`,
    mount() {
      const cur = (() => { try { return JSON.parse(localStorage.getItem('kyy_theme_v6') || 'null'); } catch { return null; } })();
      $('#thRoot').innerHTML = THEMES.map((t, i) => `
        <div class="result-box" data-th="${i}" style="margin:0;cursor:pointer;display:flex;gap:12px;align-items:center;padding:12px 14px;${cur && cur.p === t.p ? 'border-color:var(--purple);box-shadow:0 0 0 1px var(--purple) inset' : ''}">
          <span style="width:40px;height:40px;border-radius:12px;flex:0 0 auto;background:linear-gradient(135deg,${t.p},${t.m});border:2px solid ${t.l}"></span>
          <b style="font-size:.9rem;flex:1">${esc(t.name)}</b>
          ${cur && cur.p === t.p ? '<span class="badge" style="background:var(--grad);color:#fff">AKTIF</span>' : ''}
        </div>`).join('');
      $('#thRoot').querySelectorAll('[data-th]').forEach((el) => el.addEventListener('click', () => {
        applyThemePreset(THEMES[+el.dataset.th]);
        closeModal();
        toast('Tema diganti! ' + THEMES[+el.dataset.th].name);
      }));
      $('#thReset').addEventListener('click', () => {
        applyThemePreset(THEMES[0]);
        closeModal();
        toast('Balik ke ungu klasik 💜');
      });
    },
  },

});

} // end __KYY_V6__
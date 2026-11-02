// Molduras do mural. Nome, textos, cores e artes vêm de config.js (window.PAINEL).
// Cada moldura tem uma "janela" (hole) onde a câmera aparece e uma função que desenha o SVG por cima.
// A moldura é montada num canvas em 3 camadas: SVG de base, artes (imagens) e SVG de cima.
// Só as fontes vão dentro do SVG; as artes são desenhadas direto no canvas (bem mais leve no celular).
(function () {
  const W = 1080, H = 1620;
  const C = window.PAINEL || { nome: 'Mural de Fotos', moldura: {}, cores: { destaque: '#FF2E93', destaqueClaro: '#C8A2FF', destaqueEscuro: '#7B2CBF', texto: '#1E1B2E' } };
  const K = C.cores;
  const PINK = K.destaque, LILAC = K.destaqueClaro, PURPLE = K.destaqueEscuro, INK = '#0A0612';
  const STAR = C.aniversariante || C.nome;
  const AGE = C.idade ? String(C.idade) : '';
  const TAG = ((C.moldura && C.moldura.linha1) || 'POP STAR PARTY').toUpperCase();
  const ART = C.artes || {};
  const DISP = `'PS Anton', Impact, 'Haettenschweiler', 'Arial Narrow Bold', 'Arial Black', sans-serif`;
  const NEON = `'PS Monoton', 'PS Anton', Impact, sans-serif`;
  const SANS = `'Helvetica Neue', Helvetica, Arial, sans-serif`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

  // ---------- Carregamento de fontes e artes ----------
  const IMG = {}; let FONTS = '';
  const loadImg = (url) => new Promise((res) => { if (!url) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
  function toDataURL(blob) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); }); }
  async function fetchData(url) { const r = await fetch(url); if (!r.ok) throw new Error(url); return toDataURL(await r.blob()); }
  async function loadFont(family, local, google) {
    let src = null;
    try { src = await fetchData(local); } catch {}
    if (!src) {
      try {
        const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${google}&display=swap`)).text();
        const block = css.split('@font-face').find((b) => /U\+0000-00FF/.test(b)) || css;
        const m = block.match(/url\((https:[^)]+\.woff2)\)/);
        if (m) src = await fetchData(m[1]);
      } catch {}
    }
    if (src) FONTS += `@font-face{font-family:'${family}';src:url(${src}) format('woff2');}`;
  }
  const ready = Promise.all([
    loadFont('PS Anton', '/fonts/anton.woff2', 'Anton'),
    loadFont('PS Monoton', '/fonts/monoton.woff2', 'Monoton'),
    loadImg(ART.faixaGrupo).then((im) => { IMG.faixa = im; }),
    loadImg(ART.aniversariante).then((im) => { IMG.sarah = im; }),
  ]).catch(() => {});

  // ---------- Utilitários ----------
  function rr(x, y, w, h, r) {
    return `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
  }
  const holePath = (h, r) => rr(h.x, h.y, h.w, h.h, r);
  const paper = (fill, hp) => `<path fill-rule="evenodd" fill="${fill}" d="M0 0 H${W} V${H} H0 Z ${hp}"/>`;
  function shortName(name, max = 18) { const n = (name || '').trim(); return n.length > max ? n.slice(0, max - 1) + '…' : n; }
  const guest = (name) => esc(shortName(name).toUpperCase() || 'CONVIDADO VIP');
  const fit = (text, width, maxSize, ratio = 0.5) => Math.min(maxSize, Math.floor(width / Math.max(1, String(text).length * ratio)));
  // Título grande com largura travada: mesma diagramação com ou sem a fonte carregada
  function big(text, x, y, size, maxW, attrs = '', anchor = 'start') {
    const t = String(text), natural = t.length * size * 0.47, w = Math.min(maxW, natural);
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${DISP}" font-size="${size}" textLength="${w.toFixed(0)}" lengthAdjust="spacingAndGlyphs" ${attrs}>${esc(t)}</text>`;
  }
  const spark = (x, y, s, fill, op = 1) => `<path d="M ${x} ${y - s} C ${x + s * .12} ${y - s * .12} ${x + s * .12} ${y - s * .12} ${x + s} ${y} C ${x + s * .12} ${y + s * .12} ${x + s * .12} ${y + s * .12} ${x} ${y + s} C ${x - s * .12} ${y + s * .12} ${x - s * .12} ${y + s * .12} ${x - s} ${y} C ${x - s * .12} ${y - s * .12} ${x - s * .12} ${y - s * .12} ${x} ${y - s} Z" fill="${fill}" opacity="${op}"/>`;
  function barcode(x, y, w, h, color, seed = 7) {
    let s = seed, out = '', cx = x;
    while (cx < x + w - 4) { s = (s * 16807) % 2147483647; const bw = 2 + (s % 6); out += `<rect x="${cx}" y="${y}" width="${bw}" height="${h}" fill="${color}"/>`; cx += bw + 2 + (s % 4); }
    return out;
  }
  const svg = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><style>${FONTS}</style>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity=".35"/></filter>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    ${defs}</defs>${body}</svg>`;
  // Fita adesiva / etiqueta inclinada
  const tape = (cx, cy, w, h, rot, fill, text, tc = '#fff', size = 34) => `<g transform="translate(${cx} ${cy}) rotate(${rot})" filter="url(#soft)">
    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${fill}"/>
    ${text ? `<text x="0" y="${size * .36}" text-anchor="middle" font-family="${DISP}" font-size="${size}" letter-spacing="3" fill="${tc}">${text}</text>` : ''}</g>`;

  const FRAMES = [
    // ---------------------------------------------------------------- POP STARS
    {
      id: 'popstars', nome: 'Pop Stars',
      hole: { x: 0, y: 0, w: W, h: 1120 },
      // grupo inteiro (sem cortar ninguém), esfumado no topo e nas laterais
      layers: [{ key: 'faixa', x: 0, y: 1040, w: W, h: 580, fit: 'contain', align: 'bottom', fadeTop: 110 }],
      draw() {
        const hp = rr(0, 0, W, 1120, 0);
        return svg(`
          <radialGradient id="stP" cx=".5" cy=".7" r=".75"><stop offset="0" stop-color="#5B2C9E"/><stop offset=".6" stop-color="#2A1050"/><stop offset="1" stop-color="${INK}"/></radialGradient>
          <linearGradient id="topP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}" stop-opacity=".85"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></linearGradient>
          <linearGradient id="beamL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PINK}" stop-opacity=".55"/><stop offset="1" stop-color="${PINK}" stop-opacity="0"/></linearGradient>
          <linearGradient id="beamR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LILAC}" stop-opacity=".5"/><stop offset="1" stop-color="${LILAC}" stop-opacity="0"/></linearGradient>`, `
          ${paper('url(#stP)', hp)}

          <linearGradient id="seamP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1050" stop-opacity="0"/><stop offset="1" stop-color="#2A1050" stop-opacity="1"/></linearGradient>
          <rect x="0" y="960" width="${W}" height="162" fill="url(#seamP)"/>
`);
      },
      top(name, date) {
        const g = shortName(name).toUpperCase() || 'CONVIDADO VIP';
        const tw = Math.min(900, g.length * 46 * 0.5 + 120);
        return svg(`
          <linearGradient id="botP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}" stop-opacity="0"/><stop offset="1" stop-color="${INK}" stop-opacity=".9"/></linearGradient>`, `
          <g transform="translate(${W / 2} 1010) rotate(-3)" filter="url(#soft)">
            <rect x="${-tw / 2}" y="-38" width="${tw}" height="76" fill="${PINK}"/>
            ${big(g, 0, 22, 46, tw - 70, 'fill="#FFFFFF"', 'middle')}
          </g>
          <rect x="0" y="1530" width="${W}" height="90" fill="url(#botP)"/>
          <text x="${W / 2}" y="1596" text-anchor="middle" font-family="${SANS}" font-weight="800" font-size="20" letter-spacing="10" fill="#FFFFFF">NA FESTA COM AS POP STARS${date ? ` · ${esc(date)}` : ''}</text>`);
      },
    },
    // ---------------------------------------------------------------- COM A SARAH
    {
      id: 'comsarah', nome: `Com a ${STAR}`,
      hole: { x: 56, y: 56, w: 968, h: 1010 },
      layers: [{ key: 'sarah', x: 86, y: 1012, w: 356, h: 400, align: 'top', rot: -6, cx: 264, cy: 1250 }],
      draw() {
        const h = this.hole, hp = holePath(h, 22);
        return svg(`
          <linearGradient id="bgC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6FB"/><stop offset="1" stop-color="#F1E6FF"/></linearGradient>
          <pattern id="dotsC" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="2" fill="${PINK}" opacity=".25"/></pattern>`, `
          ${paper('url(#bgC)', hp)}
          <rect x="${W - 330}" y="${H - 150}" width="330" height="150" fill="url(#dotsC)"/>
          <path d="${hp}" fill="none" stroke="${INK}" stroke-width="4"/>
          <g transform="rotate(-6 264 1250)" filter="url(#soft)">
            <rect x="64" y="990" width="400" height="520" fill="#FFFFFF"/>
            <text x="264" y="1474" text-anchor="middle" font-family="${DISP}" font-size="42" letter-spacing="2" fill="${INK}">A ANIVERSARIANTE</text>
          </g>`);
      },
      top(name, date) {
        return svg('', `
          ${tape(254, 990, 170, 46, -12, LILAC, '', '#fff')}
          <text x="${W - 56}" y="1132" text-anchor="end" font-family="${SANS}" font-weight="800" font-size="24" letter-spacing="9" fill="${PURPLE}">EU + A</text>
          ${big(STAR.toUpperCase(), W - 52, 1318, fit(STAR, 500, 168, 0.47), 500, `fill="${PINK}"`, 'end')}
          <rect x="${W - 476}" y="1350" width="420" height="6" fill="${INK}"/>
          ${big(shortName(name).toUpperCase() || 'CONVIDADO VIP', W - 56, 1428, fit(guest(name), 460, 58, 0.47), 460, `fill="${INK}"`, 'end')}
          <text x="${W - 56}" y="1480" text-anchor="end" font-family="${SANS}" font-weight="700" font-size="19" letter-spacing="5" fill="${PURPLE}">${esc(TAG)} · ${esc(AGE)} ANOS</text>`);
      },
    },
    // ---------------------------------------------------------------- NEON
    {
      id: 'neon', nome: 'Neon',
      hole: { x: 90, y: 330, w: 900, h: 1000 },
      draw(name, date) {
        const h = this.hole, hp = holePath(h, 36);
        const neon = (c, w = 5) => `stroke="${c}" stroke-width="${w}" fill="none" filter="url(#glow)"`;
        const size = fit(STAR, 640, 200, 0.47), sw = Math.min(640, STAR.length * size * 0.47 + 30);
        return svg(`
          <linearGradient id="bm1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PINK}" stop-opacity=".5"/><stop offset="1" stop-color="${PINK}" stop-opacity="0"/></linearGradient>
          <linearGradient id="bm2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LILAC}" stop-opacity=".45"/><stop offset="1" stop-color="${LILAC}" stop-opacity="0"/></linearGradient>
          <clipPath id="outN"><path clip-rule="evenodd" d="M0 0 H${W} V${H} H0 Z ${hp}"/></clipPath>`, `
          ${paper(INK, hp)}
          <g clip-path="url(#outN)"><polygon points="760,0 820,0 1240,1620 900,1620" fill="url(#bm1)"/><polygon points="260,0 320,0 160,1620 -180,1620" fill="url(#bm2)"/></g>
          <text x="66" y="250" font-family="${DISP}" font-size="${size}" textLength="${sw}" lengthAdjust="spacingAndGlyphs" ${neon(PINK, 4)}>${esc(STAR.toUpperCase())}</text>
          <text x="66" y="250" font-family="${DISP}" font-size="${size}" textLength="${sw}" lengthAdjust="spacingAndGlyphs" fill="none" stroke="#FFFFFF" stroke-width="1.4">${esc(STAR.toUpperCase())}</text>
          ${AGE ? `<text x="${W - 70}" y="262" text-anchor="end" font-family="${NEON}" font-size="170" fill="#FFFFFF" filter="url(#glow)">${esc(AGE)}</text>` : ''}
          <text x="70" y="300" font-family="${SANS}" font-weight="800" font-size="24" letter-spacing="14" fill="${LILAC}">${esc(TAG)}</text>
          <path d="${hp}" ${neon(PINK, 7)}/>
          <path d="${rr(h.x - 18, h.y - 18, h.w + 36, h.h + 36, 52)}" ${neon(LILAC, 3)} stroke-dasharray="2 14" stroke-linecap="round"/>
          ${big(shortName(name).toUpperCase() || 'CONVIDADO VIP', W / 2, 1450, fit(guest(name), 900, 84, 0.47), 900, 'fill="#FFFFFF" filter="url(#glow)"', 'middle')}
          <text x="${W / 2}" y="1508" text-anchor="middle" font-family="${SANS}" font-weight="800" font-size="22" letter-spacing="12" fill="${PINK}">ESTEVE AQUI${date ? ` · ${esc(date)}` : ''}</text>`);
      },
    },
    // ---------------------------------------------------------------- BACKSTAGE
    {
      id: 'backstage', nome: 'Backstage',
      hole: { x: 214, y: 150, w: 790, h: 1010 },
      draw(name, date) {
        const h = this.hole, hp = holePath(h, 14);
        const card = rr(40, 40, 1000, 1540, 44);
        return svg(`
          <linearGradient id="bgB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PURPLE}"/><stop offset="1" stop-color="${INK}"/></linearGradient>
          <clipPath id="stripB"><path d="${card}"/></clipPath>`, `
          <path fill-rule="evenodd" d="${rr(48, 56, 1000, 1540, 44)} ${hp}" fill="#000000" opacity=".35"/>
          <path fill-rule="evenodd" fill="#FFFFFF" d="${card} ${hp}"/>
          <path fill-rule="evenodd" fill="url(#bgB)" d="M0 0 H${W} V${H} H0 Z ${card}"/>
          <g clip-path="url(#stripB)"><rect x="40" y="40" width="148" height="1540" fill="${PINK}"/></g>
          <rect x="${W / 2 - 70}" y="70" width="140" height="26" rx="13" fill="${INK}" opacity=".85"/>
          <text transform="translate(146 1520) rotate(-90)" font-family="${DISP}" font-size="96" textLength="1440" lengthAdjust="spacingAndGlyphs" fill="#FFFFFF">BACKSTAGE ✦ ALL ACCESS</text>
          <path d="${hp}" fill="none" stroke="${INK}" stroke-width="3"/>
          <text x="${h.x}" y="1222" font-family="${SANS}" font-weight="800" font-size="20" letter-spacing="8" fill="#8B84A6">CONVIDADO(A) VIP</text>
          ${big(shortName(name).toUpperCase() || 'CONVIDADO VIP', h.x - 4, 1310, fit(guest(name), 540, 92, 0.47), 540, `fill="${INK}"`)}
          ${big(`${STAR.toUpperCase()} ${AGE} TOUR`, h.x, 1392, 58, 520, `fill="${PINK}"`)}
          <text x="${h.x}" y="1436" font-family="${SANS}" font-weight="700" font-size="20" letter-spacing="6" fill="#8B84A6">${esc(TAG)}${date ? ` · ${esc(date)}` : ''}</text>
          <g>${barcode(h.x, 1470, 360, 70, INK)}</g>
          <text x="${h.x + h.w}" y="1430" text-anchor="end" font-family="${DISP}" font-size="230" fill="none" stroke="${LILAC}" stroke-width="5">${esc(AGE)}</text>`);
      },
    },
    // ---------------------------------------------------------------- CAPA
    {
      id: 'capa', nome: 'Capa de revista',
      hole: { x: 0, y: 0, w: W, h: H },
      draw(name, date) {
        const mast = fit(STAR, 980, 330, 0.44);
        const st = 'paint-order="stroke" stroke="#00000055" stroke-width="5" stroke-linejoin="round"';
        return svg(`
          <linearGradient id="topS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
          <linearGradient id="botS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".78"/></linearGradient>`, `
          <rect x="0" y="0" width="${W}" height="420" fill="url(#topS)"/>
          <rect x="0" y="1120" width="${W}" height="500" fill="url(#botS)"/>
          <text x="52" y="66" font-family="${SANS}" font-weight="800" font-size="22" letter-spacing="8" fill="#FFFFFF">EDIÇÃO Nº ${esc(AGE || '1')}  ·  ${esc(TAG)}</text>
          ${big(STAR.toUpperCase(), W / 2, 66 + mast * 0.86, mast, 976, `fill="${PINK}"`, 'middle')}
          <g transform="translate(56 ${120 + mast * 0.86})">
            <rect x="0" y="0" width="224" height="46" fill="#FFFFFF"/><text x="112" y="34" text-anchor="middle" font-family="${DISP}" font-size="32" letter-spacing="3" fill="${PINK}">EXCLUSIVO</text>
            <text x="0" y="118" font-family="${DISP}" font-size="64" fill="#FFFFFF" ${st}>A FESTA</text>
            <text x="0" y="186" font-family="${DISP}" font-size="64" fill="#FFFFFF" ${st}>DO ANO</text>
          </g>
          <g transform="translate(${W - 56} ${300 + mast * 0.6})" text-anchor="end">
            <text x="0" y="0" font-family="${DISP}" font-size="${AGE ? 150 : 0}" fill="${LILAC}" ${st}>${esc(AGE)}</text>
            <text x="0" y="52" font-family="${DISP}" font-size="44" fill="#FFFFFF" ${st}>ANOS DE</text>
            <text x="0" y="100" font-family="${DISP}" font-size="44" fill="#FFFFFF" ${st}>PURO BRILHO</text>
          </g>
          <text x="56" y="1388" font-family="${DISP}" font-size="40" letter-spacing="4" fill="${PINK}">NOVA ESTRELA</text>
          ${big(shortName(name).toUpperCase() || 'CONVIDADO VIP', 52, 1490, fit(guest(name), 760, 116, 0.47), 770, 'fill="#FFFFFF"')}
          <text x="56" y="1548" font-family="${SANS}" font-weight="700" font-size="22" letter-spacing="6" fill="#FFFFFFcc">${esc(C.nome.toUpperCase())}${date ? ` · ${esc(date)}` : ''}</text>
          <g transform="translate(860 1424)"><rect width="164" height="132" fill="#FFFFFF"/>${barcode(14, 14, 136, 78, '#111', 3)}<text x="82" y="118" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="16" fill="#111">R$ ${esc(AGE || '1')},00</text></g>`);
      },
    },
  ];

  const byId = (id) => FRAMES.find((f) => f.id === id) || FRAMES[0];
  const loadSvg = (str) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('svg')); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str); });
  async function svgImage(str) {
    try { return await loadSvg(str); } catch {}
    const noFilter = str.replace(/ filter="url\(#[^)]+\)"/g, '');
    try { return await loadSvg(noFilter); } catch {}
    return loadSvg(noFilter.replace(/<style>[\s\S]*?<\/style>/, ''));
  }

  // Desenha uma arte (cobrindo o retângulo), com topo esfumado e rotação opcionais
  function drawLayer(ctx, L) {
    const oc = document.createElement('canvas'); oc.width = L.w; oc.height = L.h;
    const o = oc.getContext('2d'), im = IMG[L.key];
    if (im) {
      const sc = (L.fit === 'contain' ? Math.min : Math.max)(L.w / im.naturalWidth, L.h / im.naturalHeight), dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
      o.drawImage(im, (L.w - dw) / 2, L.align === 'top' ? 0 : L.align === 'bottom' ? L.h - dh : (L.h - dh) / 2, dw, dh);
    } else { o.fillStyle = PURPLE; o.fillRect(0, 0, L.w, L.h); }
    if (L.fadeTop) {
      o.globalCompositeOperation = 'destination-in';
      const g = o.createLinearGradient(0, 0, 0, L.h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(Math.min(1, L.fadeTop / L.h), 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      o.fillStyle = g; o.fillRect(0, 0, L.w, L.h);
    }
    if (L.fadeSides) {
      o.globalCompositeOperation = 'destination-in';
      const f = Math.min(0.49, L.fadeSides / L.w);
      const g = o.createLinearGradient(0, 0, L.w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(f, 'rgba(0,0,0,1)'); g.addColorStop(1 - f, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = g; o.fillRect(0, 0, L.w, L.h);
    }
    ctx.save();
    if (L.rot) { ctx.translate(L.cx, L.cy); ctx.rotate((L.rot * Math.PI) / 180); ctx.translate(-L.cx, -L.cy); }
    ctx.drawImage(oc, L.x, L.y);
    ctx.restore();
  }
  function placeholder(ctx, h) {
    const cx = h.x + h.w / 2, cy = h.y + h.h * 0.55, s = Math.min(h.w, h.h) / 900;
    ctx.fillStyle = '#3A2E52'; ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.fillStyle = '#6B5A8E';
    ctx.beginPath(); ctx.arc(cx, cy - 120 * s, 150 * s, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 300 * s, h.y + h.h); ctx.quadraticCurveTo(cx - 300 * s, cy + 80 * s, cx, cy + 80 * s); ctx.quadraticCurveTo(cx + 300 * s, cy + 80 * s, cx + 300 * s, h.y + h.h); ctx.fill();
  }
  // Monta a moldura num canvas (scale < 1 para miniaturas)
  async function render(id, name, date, scale = 1, withPlaceholder = false) {
    await ready;
    const f = byId(id), c = document.createElement('canvas');
    c.width = Math.round(W * scale); c.height = Math.round(H * scale);
    const ctx = c.getContext('2d'); ctx.scale(scale, scale);
    if (withPlaceholder) placeholder(ctx, f.hole);
    ctx.drawImage(await svgImage(f.draw(name, date)), 0, 0, W, H);
    (f.layers || []).forEach((L) => drawLayer(ctx, L));
    if (f.top) ctx.drawImage(await svgImage(f.top(name, date)), 0, 0, W, H);
    return c;
  }
  const frameImage = (id, name, date) => render(id, name, date, 1);
  const thumb = async (id, name) => (await render(id, name, '', 0.34, true)).toDataURL('image/jpeg', 0.86);

  // Globo espelhado (decoração)
  function discoSVG() {
    const cx = 100, cy = 140, r = 92, rows = 9; let tiles = '';
    for (let i = 0; i < rows; i++) {
      const lat = -Math.PI / 2 + (Math.PI * (i + 0.5)) / rows, y = cy + r * Math.sin(lat), rw = r * Math.cos(lat);
      const th = (Math.PI * r) / rows, cols = Math.max(4, Math.round((2 * rw) / th));
      for (let j = 0; j < cols; j++) {
        const x = cx - rw + (2 * rw * (j + 0.5)) / cols, w = ((2 * rw) / cols) * 0.86, lit = (i * 7 + j * 3) % 5;
        tiles += `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - th * .43).toFixed(1)}" width="${w.toFixed(1)}" height="${(th * .86).toFixed(1)}" rx="1.5" fill="${['#FFFFFF', '#FFB8E2', '#C8A2FF', '#8F84A8', '#5B5072'][lit]}"/>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240"><line x1="100" y1="0" x2="100" y2="48" stroke="#ffffff88" stroke-width="3"/><defs><clipPath id="dbc"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><radialGradient id="dbg" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="#2A2140"/><g clip-path="url(#dbc)">${tiles}</g><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#dbg)"/></svg>`;
  }
  // Ícone do mural
  function logoSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="${PINK}"/><text x="50" y="66" text-anchor="middle" font-family="${DISP}" font-size="46" fill="#fff">${esc(AGE || '★')}</text></svg>`;
  }

  window.PainelFrame = { W, H, FRAMES, byId, render, frameImage, thumb, logoSVG, discoSVG, ready };
})();

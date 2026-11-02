// Molduras do mural. Nome, textos, cores e artes vêm de config.js (window.PAINEL).
// Cada moldura tem uma "janela" (hole) onde a câmera aparece e uma função que desenha o SVG por cima.
// Fontes e imagens são embutidas no SVG (data URL) para a moldura funcionar dentro da foto final.
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

  // ---------- Carregamento de fontes e artes (embutidas no SVG) ----------
  const DATA = {}; let FONTS = '';
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
    ...Object.entries({ faixa: ART.faixaGrupo, sarah: ART.aniversariante }).map(([k, u]) => u ? fetchData(u).then((d) => { DATA[k] = d; }).catch(() => {}) : null),
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
  const img = (key, x, y, w, h, clip, align = 'xMidYMid slice') => DATA[key]
    ? `<image href="${DATA[key]}" xlink:href="${DATA[key]}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${align}" ${clip ? `clip-path="url(#${clip})"` : ''}/>`
    : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PURPLE}" ${clip ? `clip-path="url(#${clip})"` : ''}/>`;
  // Fita adesiva / etiqueta inclinada
  const tape = (cx, cy, w, h, rot, fill, text, tc = '#fff', size = 34) => `<g transform="translate(${cx} ${cy}) rotate(${rot})" filter="url(#soft)">
    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${fill}"/>
    ${text ? `<text x="0" y="${size * .36}" text-anchor="middle" font-family="${DISP}" font-size="${size}" letter-spacing="3" fill="${tc}">${text}</text>` : ''}</g>`;

  const FRAMES = [
    // ---------------------------------------------------------------- POP STARS
    {
      id: 'popstars', nome: 'Pop Stars',
      hole: { x: 60, y: 300, w: 960, h: 790 },
      draw(name, date) {
        const h = this.hole, hp = holePath(h, 26);
        const ay = 1112, ah = 478;
        return svg(`
          <radialGradient id="g1" cx=".15" cy=".05" r=".7"><stop offset="0" stop-color="${PURPLE}" stop-opacity=".9"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></radialGradient>
          <radialGradient id="g2" cx=".95" cy="1" r=".6"><stop offset="0" stop-color="${PINK}" stop-opacity=".55"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></radialGradient>
          <clipPath id="artC"><path d="${rr(60, ay, 960, ah, 26)}"/></clipPath>
          <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="${INK}" stop-opacity="0"/><stop offset="1" stop-color="${INK}" stop-opacity=".92"/></linearGradient>`, `
          <rect width="${W}" height="${H}" fill="${INK}"/><rect width="${W}" height="${H}" fill="url(#g1)"/><rect width="${W}" height="${H}" fill="url(#g2)"/>
          <path fill-rule="evenodd" fill="${INK}" opacity="0" d="M0 0 H${W} V${H} H0 Z ${hp}"/>
          <g>
            ${big(STAR.toUpperCase(), 56, 232, fit(STAR, 640, 236, 0.47), 680, 'fill="#FFFFFF"')}
            <g transform="translate(882 136) rotate(6)"><rect x="-96" y="-96" width="192" height="192" rx="20" fill="${PINK}"/>
              <text x="0" y="42" text-anchor="middle" font-family="${DISP}" font-size="132" fill="#FFFFFF">${esc(AGE)}</text>
              <text x="0" y="78" text-anchor="middle" font-family="${SANS}" font-weight="800" font-size="22" letter-spacing="8" fill="#FFFFFF">ANOS</text></g>
            <text x="60" y="278" font-family="${SANS}" font-weight="800" font-size="24" letter-spacing="9" fill="${LILAC}">${esc(TAG)}${date ? `  ·  ${esc(date)}` : ''}</text>
          </g>
          <path d="${hp}" fill="none" stroke="#FFFFFF" stroke-width="5"/>
          <g clip-path="url(#artC)">${img('faixa', 60, ay, 960, ah)}<rect x="60" y="${ay}" width="960" height="${ah}" fill="url(#shade)"/></g>
          <path d="${rr(60, ay, 960, ah, 26)}" fill="none" stroke="#FFFFFF" stroke-width="5"/>
          <text x="96" y="${ay + ah - 92}" font-family="${SANS}" font-weight="800" font-size="22" letter-spacing="8" fill="${LILAC}">NA FESTA COM AS POP STARS</text>
          ${big(shortName(name).toUpperCase() || 'CONVIDADO VIP', 94, ay + ah - 30, fit(guest(name), 820, 72, 0.47), 860, 'fill="#FFFFFF"')}
          ${tape(890, 1094, 250, 58, -5, PINK, 'BACKSTAGE ✦', '#fff', 30)}
          ${spark(1000, 66, 18, '#FFFFFF', .9)}${spark(1030, 250, 10, LILAC)}`);
      },
    },
    // ---------------------------------------------------------------- COM A SARAH
    {
      id: 'comsarah', nome: `Com a ${STAR}`,
      hole: { x: 56, y: 56, w: 968, h: 1030 },
      draw(name, date) {
        const h = this.hole, hp = holePath(h, 22);
        const px = 64, py = 1010, pw = 400, ph = 520;
        return svg(`
          <linearGradient id="bgC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6FB"/><stop offset="1" stop-color="#F1E6FF"/></linearGradient>
          <clipPath id="polC"><rect x="${px + 22}" y="${py + 22}" width="${pw - 44}" height="${ph - 120}"/></clipPath>
          <pattern id="dotsC" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="2" fill="${PINK}" opacity=".25"/></pattern>`, `
          ${paper('url(#bgC)', hp)}
          <rect x="${W - 360}" y="${H - 300}" width="360" height="300" fill="url(#dotsC)"/>
          <path d="${hp}" fill="none" stroke="${INK}" stroke-width="4"/>
          <g transform="rotate(-6 ${px + pw / 2} ${py + ph / 2})" filter="url(#soft)">
            <rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="#FFFFFF"/>
            <g clip-path="url(#polC)">${img('sarah', px + 22, py + 22, pw - 44, ph - 120, null, 'xMidYMin slice')}</g>
            <text x="${px + pw / 2}" y="${py + ph - 38}" text-anchor="middle" font-family="${DISP}" font-size="44" letter-spacing="2" fill="${INK}">A ANIVERSARIANTE</text>
          </g>
          ${tape(px + pw / 2 - 10, py - 4, 170, 46, -12, LILAC, '', '#fff')}
          <text x="${W - 56}" y="1176" text-anchor="end" font-family="${SANS}" font-weight="800" font-size="24" letter-spacing="9" fill="${PURPLE}">EU + A</text>
          ${big(STAR.toUpperCase(), W - 50, 1340, fit(STAR, 520, 190, 0.47), 520, `fill="${PINK}"`, 'end')}
          <rect x="${W - 476}" y="1376" width="420" height="6" fill="${INK}"/>
          ${big(shortName(name).toUpperCase() || 'CONVIDADO VIP', W - 56, 1452, fit(guest(name), 470, 60, 0.47), 470, `fill="${INK}"`, 'end')}
          <text x="${W - 56}" y="1506" text-anchor="end" font-family="${SANS}" font-weight="700" font-size="20" letter-spacing="6" fill="${PURPLE}">${esc(TAG)} · ${esc(AGE)} ANOS${date ? ` · ${esc(date)}` : ''}</text>
          ${spark(W - 90, 1220, 22, PINK)}${spark(W - 140, 1250, 11, LILAC)}`);
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
          <rect width="${W}" height="${H}" fill="url(#bgB)"/>
          <path fill-rule="evenodd" fill="#FFFFFF" d="${card} ${hp}" filter="url(#soft)"/>
          <path fill-rule="evenodd" fill="url(#bgB)" d="M0 0 H${W} V${H} H0 Z ${card}"/>
          <g clip-path="url(#stripB)"><rect x="40" y="40" width="148" height="1540" fill="${PINK}"/></g>
          <rect x="${W / 2 - 70}" y="70" width="140" height="26" rx="13" fill="${INK}" opacity=".85"/>
          <text transform="translate(146 1520) rotate(-90)" font-family="${DISP}" font-size="96" textLength="1440" lengthAdjust="spacingAndGlyphs" fill="#FFFFFF">BACKSTAGE ✦ ALL ACCESS</text>
          <path d="${hp}" fill="none" stroke="${INK}" stroke-width="3"/>
          <text x="${h.x}" y="1222" font-family="${SANS}" font-weight="800" font-size="20" letter-spacing="8" fill="#8B84A6">CONVIDADO(A) VIP</text>
          ${big(shortName(name).toUpperCase() || 'CONVIDADO VIP', h.x - 4, 1310, fit(guest(name), 600, 92, 0.47), 600, `fill="${INK}"`)}
          ${big(`${STAR.toUpperCase()} ${AGE} TOUR`, h.x, 1392, 58, 520, `fill="${PINK}"`)}
          <text x="${h.x}" y="1436" font-family="${SANS}" font-weight="700" font-size="20" letter-spacing="6" fill="#8B84A6">${esc(TAG)}${date ? ` · ${esc(date)}` : ''}</text>
          <g>${barcode(h.x, 1470, 360, 70, INK)}</g>
          <text x="${h.x + h.w}" y="1540" text-anchor="end" font-family="${DISP}" font-size="300" fill="none" stroke="${LILAC}" stroke-width="5">${esc(AGE)}</text>`);
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
  const frameSVG = (id, name, date) => byId(id).draw(name, date);
  function frameImage(id, name, date) {
    return ready.then(() => new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(frameSVG(id, name, date));
    }));
  }
  // Miniatura para o seletor (janela preenchida com uma silhueta genérica)
  function thumbURL(id, name) {
    const f = byId(id), h = f.hole;
    const cx = h.x + h.w / 2, cy = h.y + h.h * 0.55, s = Math.min(h.w, h.h) / 900;
    const person = `<rect x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" fill="#3A2E52"/>
      <circle cx="${cx}" cy="${cy - 120 * s}" r="${150 * s}" fill="#6B5A8E"/>
      <path d="M ${cx - 300 * s} ${h.y + h.h} Q ${cx - 300 * s} ${cy + 80 * s} ${cx} ${cy + 80 * s} Q ${cx + 300 * s} ${cy + 80 * s} ${cx + 300 * s} ${h.y + h.h} Z" fill="#6B5A8E"/>`;
    const s2 = f.draw(name || '', '');
    const i = s2.indexOf('</defs>') + 7;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s2.slice(0, i) + person + s2.slice(i));
  }

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

  window.PainelFrame = { W, H, FRAMES, byId, frameSVG, frameImage, thumbURL, logoSVG, discoSVG, ready };
})();

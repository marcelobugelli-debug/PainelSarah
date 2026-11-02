// Molduras do mural (tema "pop star"). Nome, textos e cores vêm de config.js (window.PAINEL).
// Cada moldura tem uma "janela" (hole) onde a câmera aparece e uma função que desenha o SVG por cima.
// Todos os desenhos são originais, feitos aqui mesmo em SVG.
(function () {
  const W = 1080, H = 1620;
  const C = window.PAINEL || { nome: 'Mural de Fotos', moldura: {}, cores: { destaque: '#FF3FA4', destaqueClaro: '#FF8AD0', destaqueEscuro: '#7B2CBF', texto: '#1E1B2E' } };
  const K = C.cores;
  const STAR = C.aniversariante || C.nome;
  const AGE = C.idade ? String(C.idade) : '';
  const SANS = `'Helvetica Neue',Helvetica,Arial,sans-serif`;
  const HAND = `'Segoe Print','Bradley Hand','Marker Felt','Comic Sans MS',cursive`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

  function roundRect(h, r) {
    return `M ${h.x + r} ${h.y} H ${h.x + h.w - r} Q ${h.x + h.w} ${h.y} ${h.x + h.w} ${h.y + r} V ${h.y + h.h - r} Q ${h.x + h.w} ${h.y + h.h} ${h.x + h.w - r} ${h.y + h.h} H ${h.x + r} Q ${h.x} ${h.y + h.h} ${h.x} ${h.y + h.h - r} V ${h.y + r} Q ${h.x} ${h.y} ${h.x + r} ${h.y} Z`;
  }
  const paper = (fill, holePath) => `<path fill-rule="evenodd" fill="${fill}" d="M0 0 H${W} V${H} H0 Z ${holePath}"/>`;
  function shortName(name, max = 20) { const n = (name || '').trim(); return n.length > max ? n.slice(0, max - 1) + '…' : n; }
  function label(name) { const n = shortName(name, 22); return n ? `${esc(n)} esteve aqui!` : 'Eu estive aqui!'; }
  function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const outside = (h, x, y, pad = 20) => !(x > h.x - pad && x < h.x + h.w + pad && y > h.y - pad && y < h.y + h.h + pad);

  // ---------- Desenhos ----------
  const star = (cx, cy, r, fill, rot = 0, extra = '') => {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2 + rot, rr = i % 2 ? r * 0.45 : r;
      d += `${i ? 'L' : 'M'} ${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)} `;
    }
    return `<path d="${d}Z" fill="${fill}" ${extra}/>`;
  };
  // Brilho de 4 pontas
  const sparkle = (x, y, s, fill, op = 1) => `<path d="M ${x} ${y - s} C ${x + s * 0.12} ${y - s * 0.12} ${x + s * 0.12} ${y - s * 0.12} ${x + s} ${y} C ${x + s * 0.12} ${y + s * 0.12} ${x + s * 0.12} ${y + s * 0.12} ${x} ${y + s} C ${x - s * 0.12} ${y + s * 0.12} ${x - s * 0.12} ${y + s * 0.12} ${x - s} ${y} C ${x - s * 0.12} ${y - s * 0.12} ${x - s * 0.12} ${y - s * 0.12} ${x} ${y - s} Z" fill="${fill}" opacity="${op}"/>`;
  const heart = (x, y, s, fill, rot = 0) => `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s / 50})" d="M0 40 C -60 0 -40 -45 0 -18 C 40 -45 60 0 0 40 Z" fill="${fill}"/>`;
  const note = (x, y, s, fill, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s / 60})" fill="${fill}"><ellipse cx="-14" cy="34" rx="18" ry="13" transform="rotate(-20 -14 34)"/><rect x="0" y="-40" width="6" height="74"/><path d="M6 -40 C 26 -30 34 -14 26 2 C 30 -14 20 -22 6 -24 Z"/></g>`;
  // Microfone de mão
  function mic(x, y, s, rot) {
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s / 100})">
      <defs><radialGradient id="micBall${x}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#C9C6D6"/><stop offset="1" stop-color="#6F6A86"/></radialGradient>
      <linearGradient id="micBody${x}" x1="0" x2="1"><stop offset="0" stop-color="#2A2440"/><stop offset=".5" stop-color="#4A4166"/><stop offset="1" stop-color="#1A1528"/></linearGradient></defs>
      <path d="M -26 40 L 26 40 L 14 200 Q 0 212 -14 200 Z" fill="url(#micBody${x})"/>
      <rect x="-30" y="34" width="60" height="16" rx="6" fill="#FFD27A"/>
      <circle cx="0" cy="0" r="46" fill="url(#micBall${x})"/>
      <g stroke="#8E89A3" stroke-width="2" opacity=".6"><path d="M -40 -20 H 40 M -45 0 H 45 M -40 20 H 40 M -20 -40 V 40 M 0 -46 V 46 M 20 -40 V 40"/></g>
      <circle cx="-16" cy="-18" r="9" fill="#fff" opacity=".7"/>
    </g>`;
  }
  // Lightstick com coração brilhante
  function lightstick(x, y, s, rot, color) {
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s / 100})">
      <circle cx="0" cy="-10" r="70" fill="${color}" opacity=".22"/>
      <circle cx="0" cy="-10" r="48" fill="${color}" opacity=".3"/>
      <rect x="-12" y="40" width="24" height="150" rx="10" fill="#FFFFFF"/>
      <rect x="-12" y="150" width="24" height="40" rx="8" fill="${K.destaqueEscuro}"/>
      <rect x="-22" y="34" width="44" height="14" rx="6" fill="#E9E4F5"/>
      <path d="M0 36 C -70 -6 -46 -62 0 -32 C 46 -62 70 -6 0 36 Z" fill="${color}" stroke="#FFFFFF" stroke-width="6"/>
      <path d="M -22 -26 C -30 -36 -20 -44 -12 -38" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>
    </g>`;
  }
  const defsBase = `<filter id="sh" x="-10%" y="-40%" width="120%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity=".3"/></filter>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="pinkText" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${K.destaqueClaro}"/><stop offset=".5" stop-color="${K.destaque}"/><stop offset="1" stop-color="#FFD27A"/></linearGradient>`;
  const svg = (body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defsBase}${defs}</defs>${body}</svg>`;
  function pill(text, y, bg, fg, w0) {
    const w = w0 || Math.min(900, Math.max(360, Math.round(text.length * 23 + 110)));
    return `<g filter="url(#sh)"><rect x="${(W - w) / 2}" y="${y}" width="${w}" height="76" rx="38" fill="${bg}"/></g>
      <text x="${W / 2}" y="${y + 50}" text-anchor="middle" font-family="${SANS}" font-weight="800" font-size="38" fill="${fg}">${text}</text>`;
  }
  const ageBadge = (x, y, r) => AGE ? `${star(x, y, r, '#FFD27A', 0, 'filter="url(#sh)"')}<text x="${x}" y="${y + r * 0.22}" text-anchor="middle" font-family="${SANS}" font-weight="900" font-size="${r * 0.62}" fill="${K.destaqueEscuro}">${esc(AGE)}</text>` : '';

  const FRAMES = [
    {
      id: 'palco', nome: 'Palco',
      hole: { x: 80, y: 280, w: 920, h: 1080 },
      draw(name, date) {
        const h = this.hole, hp = roundRect(h, 36), r = rng(11);
        let dots = '';
        for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * H; if (outside(h, x, y)) dots += r() < 0.35 ? sparkle(x, y, 8 + r() * 14, r() < 0.5 ? '#FFFFFF' : '#FFD27A', 0.9) : `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.5 + r() * 2.5).toFixed(1)}" fill="#fff" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`; }
        return svg(`${paper('url(#stageBg)', hp)}
          <clipPath id="outHole"><path clip-rule="evenodd" d="M0 0 H${W} V${H} H0 Z ${hp}"/></clipPath>
          <g clip-path="url(#outHole)">
            <polygon points="60,0 220,0 520,1620 -260,1620" fill="url(#beamPink)"/>
            <polygon points="860,0 1020,0 1340,1620 560,1620" fill="url(#beamViolet)"/>
          </g>
          ${dots}
          <rect x="0" y="1470" width="${W}" height="150" fill="url(#floor)"/>
          <text x="${W / 2}" y="190" text-anchor="middle" font-family="${SANS}" font-weight="900" font-size="150" letter-spacing="10" fill="url(#pinkText)" filter="url(#glow)">${esc(STAR.toUpperCase())}</text>
          <text x="${W / 2}" y="250" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="34" letter-spacing="12" fill="#FFFFFF" opacity=".85">${esc((C.moldura && C.moldura.linha1) || 'POP STAR PARTY')}</text>
          ${ageBadge(960, 120, 80)}
          <path d="${hp}" fill="none" stroke="url(#pinkText)" stroke-width="10" filter="url(#glow)"/>
          ${mic(150, 1310, 120, -24)}
          ${lightstick(940, 1330, 110, 18, K.destaque)}
          ${pill(label(name), 1400, K.destaque, '#FFFFFF')}
          ${date ? `<text x="${W / 2}" y="1530" text-anchor="middle" font-family="${SANS}" font-size="26" fill="#FFFFFFaa">${esc(date)}</text>` : ''}`,
        `<radialGradient id="stageBg" cx=".5" cy="0" r="1.3"><stop offset="0" stop-color="${K.destaqueEscuro}"/><stop offset=".6" stop-color="#1A0B2E"/><stop offset="1" stop-color="#0B0414"/></radialGradient>
         <linearGradient id="beamPink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.destaqueClaro}" stop-opacity=".55"/><stop offset="1" stop-color="${K.destaqueClaro}" stop-opacity="0"/></linearGradient>
         <linearGradient id="beamViolet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B892FF" stop-opacity=".5"/><stop offset="1" stop-color="#B892FF" stop-opacity="0"/></linearGradient>
         <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.destaque}" stop-opacity="0"/><stop offset="1" stop-color="${K.destaque}" stop-opacity=".45"/></linearGradient>`);
      },
    },
    {
      id: 'holografico', nome: 'Holográfico',
      hole: { x: 90, y: 270, w: 900, h: 1110 },
      draw(name, date) {
        const h = this.hole, hp = roundRect(h, 60), r = rng(5);
        let deco = '';
        for (let i = 0; i < 46; i++) {
          const x = r() * W, y = r() * H; if (!outside(h, x, y, 30)) continue;
          const k = r();
          deco += k < 0.4 ? sparkle(x, y, 10 + r() * 20, '#FFFFFF', 0.95) : k < 0.65 ? heart(x, y, 18 + r() * 18, r() < 0.5 ? K.destaque : '#FFFFFF', (r() - 0.5) * 50) : k < 0.85 ? note(x, y, 30 + r() * 24, r() < 0.5 ? K.destaqueEscuro : '#FFFFFF', (r() - 0.5) * 40) : star(x, y, 10 + r() * 12, '#FFD27A', r() * 2);
        }
        return svg(`${paper('url(#holo)', hp)}
          <path d="M0 0 H${W} V${H} H0 Z ${hp}" fill-rule="evenodd" fill="url(#sheen)"/>
          ${deco}
          <path d="${hp}" fill="none" stroke="#FFFFFF" stroke-width="16"/>
          <text x="${W / 2}" y="${AGE ? 150 : 175}" text-anchor="middle" font-family="${SANS}" font-weight="900" font-size="96" fill="#FFFFFF" filter="url(#sh)">${esc(C.nome)}</text>
          ${AGE ? `<text x="${W / 2}" y="225" text-anchor="middle" font-family="${SANS}" font-weight="800" font-size="44" fill="${K.destaqueEscuro}">✦ ${esc(AGE)} anos ✦</text>` : ''}
          ${pill(label(name), 1430, '#FFFFFF', K.destaque)}
          ${date ? `<text x="${W / 2}" y="1570" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="28" fill="${K.destaqueEscuro}">${esc(date)}</text>` : ''}`,
        `<linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB3E1"/><stop offset=".3" stop-color="#D7B8FF"/><stop offset=".55" stop-color="#A8E6FF"/><stop offset=".8" stop-color="#FFD6C2"/><stop offset="1" stop-color="#FF9FD6"/></linearGradient>
         <linearGradient id="sheen" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".35"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
      },
    },
    {
      id: 'ingresso', nome: 'Ingresso VIP',
      hole: { x: 70, y: 150, w: 940, h: 1040 },
      draw(name, date) {
        const h = this.hole, hp = roundRect(h, 24);
        const n = shortName(name, 18);
        let bars = '', x = 700; const rr = rng(3);
        while (x < 990) { const w = 3 + Math.floor(rr() * 9); bars += `<rect x="${x}" y="1420" width="${w}" height="120" fill="${K.texto}"/>`; x += w + 4 + Math.floor(rr() * 6); }
        return svg(`${paper('#FFFFFF', hp)}
          <rect x="0" y="0" width="${W}" height="120" fill="url(#ticketTop)"/>
          <text x="70" y="80" font-family="${SANS}" font-weight="900" font-size="54" letter-spacing="6" fill="#FFFFFF">ACESSO VIP</text>
          ${star(990, 60, 34, '#FFD27A')}${sparkle(920, 50, 14, '#fff')}
          <path d="${hp}" fill="none" stroke="${K.destaque}" stroke-width="6"/>
          <circle cx="0" cy="1240" r="40" fill="${K.destaqueClaro}" opacity=".35"/><circle cx="${W}" cy="1240" r="40" fill="${K.destaqueClaro}" opacity=".35"/>
          <line x1="60" y1="1240" x2="${W - 60}" y2="1240" stroke="${K.destaqueClaro}" stroke-width="5" stroke-dasharray="18 14"/>
          <text x="70" y="1320" font-family="${SANS}" font-weight="900" font-size="64" fill="${K.destaque}">${esc(STAR.toUpperCase())}${AGE ? ' ' + esc(AGE) : ''} TOUR</text>
          <text x="70" y="1380" font-family="${SANS}" font-weight="700" font-size="30" fill="#8B84A6">${esc(C.nome)}${date ? ' · ' + esc(date) : ''}</text>
          <text x="70" y="1450" font-family="${SANS}" font-weight="700" font-size="26" letter-spacing="4" fill="#8B84A6">CONVIDADO(A)</text>
          <text x="70" y="1505" font-family="${SANS}" font-weight="900" font-size="48" fill="${K.texto}">${n ? esc(n) : 'Estrela da festa'}</text>
          <text x="70" y="1570" font-family="${SANS}" font-weight="800" font-size="28" fill="${K.destaqueEscuro}">FILA: VIP   ·   LUGAR: ${esc(AGE || '1')}   ·   BACKSTAGE ✓</text>
          ${bars}
          ${mic(1000, 1300, 60, 20)}`,
        `<linearGradient id="ticketTop" x1="0" x2="1"><stop offset="0" stop-color="${K.destaque}"/><stop offset="1" stop-color="${K.destaqueEscuro}"/></linearGradient>`);
      },
    },
    {
      id: 'revista', nome: 'Capa de revista',
      hole: { x: 0, y: 0, w: W, h: H },
      draw(name, date) {
        const n = shortName(name, 18);
        const big = `font-family="${SANS}" font-weight="900"`;
        const stroke = 'paint-order="stroke" stroke="#00000066" stroke-width="6" stroke-linejoin="round"';
        return svg(`
          <rect x="0" y="0" width="${W}" height="330" fill="url(#topShade)"/>
          <rect x="0" y="1180" width="${W}" height="440" fill="url(#botShade)"/>
          <text x="${W / 2}" y="250" text-anchor="middle" ${big} font-size="${Math.min(260, Math.round(1800 / Math.max(4, STAR.length)))}" letter-spacing="4" fill="${K.destaque}" paint-order="stroke" stroke="#FFFFFF" stroke-width="10" stroke-linejoin="round">${esc(STAR.toUpperCase())}</text>
          <text x="60" y="70" ${big} font-size="30" letter-spacing="6" fill="#FFFFFF" ${stroke}>EDIÇÃO ESPECIAL${AGE ? ' · ' + esc(AGE) + ' ANOS' : ''}</text>
          <g transform="translate(60 380)">
            <rect x="0" y="0" width="300" height="56" rx="10" fill="#FFD27A"/>
            <text x="150" y="38" text-anchor="middle" ${big} font-size="30" fill="${K.texto}">EXCLUSIVO!</text>
            <text x="0" y="110" ${big} font-size="46" fill="#FFFFFF" ${stroke}>A festa</text>
            <text x="0" y="162" ${big} font-size="46" fill="#FFFFFF" ${stroke}>do ano ✨</text>
          </g>
          <g transform="translate(${W - 60} 560)" text-anchor="end">
            <text x="0" y="0" ${big} font-size="40" fill="#FFFFFF" ${stroke}>Os looks</text>
            <text x="0" y="48" ${big} font-size="40" fill="#FFFFFF" ${stroke}>mais pop</text>
            <text x="0" y="96" ${big} font-size="40" fill="${K.destaqueClaro}" ${stroke}>da noite</text>
          </g>
          <text x="60" y="1400" ${big} font-size="38" fill="#FFD27A" ${stroke}>NOVA ESTRELA:</text>
          <text x="60" y="1480" ${big} font-size="${n.length > 12 ? 64 : 84}" fill="#FFFFFF" ${stroke}>${n ? esc(n) : 'Você!'}</text>
          <text x="60" y="1545" font-family="${SANS}" font-weight="700" font-size="30" fill="#FFFFFF" ${stroke}>${esc(C.nome)}${date ? ' · ' + esc(date) : ''}</text>
          <g transform="translate(860 1440)"><rect x="0" y="0" width="170" height="120" fill="#FFFFFF"/>${Array.from({ length: 22 }, (_, i) => `<rect x="${12 + i * 7}" y="12" width="${i % 3 ? 3 : 5}" height="76" fill="#111"/>`).join('')}<text x="85" y="110" text-anchor="middle" font-family="${SANS}" font-size="16" fill="#111">R$ 11,00</text></g>
          ${sparkle(980, 400, 22, '#FFFFFF')}${sparkle(940, 460, 12, '#FFD27A')}${star(1000, 1340, 30, '#FFD27A')}`,
        `<linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
         <linearGradient id="botShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></linearGradient>`);
      },
    },
  ];

  const byId = (id) => FRAMES.find((f) => f.id === id) || FRAMES[0];
  const frameSVG = (id, name, date) => byId(id).draw(name, date);
  function frameImage(id, name, date) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(frameSVG(id, name, date));
    });
  }
  // Miniatura para o seletor (janela preenchida com uma "pessoa" genérica)
  function thumbURL(id, name) {
    const f = byId(id), h = f.hole;
    const cx = h.x + h.w / 2, cy = h.y + h.h * 0.55, s = Math.min(h.w, h.h) / 900;
    const person = `<rect x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" fill="#C9C3DD"/>
      <circle cx="${cx}" cy="${cy - 120 * s}" r="${150 * s}" fill="#A79FC4"/>
      <path d="M ${cx - 300 * s} ${h.y + h.h} Q ${cx - 300 * s} ${cy + 80 * s} ${cx} ${cy + 80 * s} Q ${cx + 300 * s} ${cy + 80 * s} ${cx + 300 * s} ${h.y + h.h} Z" fill="#A79FC4"/>`;
    const s2 = f.draw(name || 'Seu nome', '');
    const i = s2.indexOf('</defs>') + 7;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s2.slice(0, i) + person + s2.slice(i));
  }

  // Ícone do mural (microfone)
  function logoSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="${K.destaque}"/>
      <g transform="translate(50 50) rotate(-20)"><circle cx="0" cy="-14" r="15" fill="#fff"/><path d="M -9 1 L 9 1 L 5 30 Q 0 34 -5 30 Z" fill="#fff"/><rect x="-10" y="-1" width="20" height="5" rx="2" fill="#FFD27A"/></g>
      <path d="M 74 22 l 3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="#FFD27A"/></svg>`;
  }

  window.PainelFrame = { W, H, FRAMES, byId, frameSVG, frameImage, thumbURL, logoSVG };
})();

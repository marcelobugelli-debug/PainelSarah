// Molduras do mural. Nome, textos e cores vêm de config.js (window.PAINEL).
// Cada moldura tem uma "janela" (hole) onde a câmera aparece e uma função que desenha o SVG por cima.
(function () {
  const W = 1080, H = 1620;
  const C = window.PAINEL || { nome: 'Mural de Fotos', moldura: {}, cores: { destaque: '#6C5CE7', destaqueClaro: '#8E7CF0', destaqueEscuro: '#4B3BC4', texto: '#1E1B2E' } };
  const K = C.cores;
  const SANS = `'Helvetica Neue',Helvetica,Arial,sans-serif`;
  const HAND = `'Segoe Print','Bradley Hand','Marker Felt','Comic Sans MS',cursive`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

  function roundRect(h, r) {
    return `M ${h.x + r} ${h.y} H ${h.x + h.w - r} Q ${h.x + h.w} ${h.y} ${h.x + h.w} ${h.y + r} V ${h.y + h.h - r} Q ${h.x + h.w} ${h.y + h.h} ${h.x + h.w - r} ${h.y + h.h} H ${h.x + r} Q ${h.x} ${h.y + h.h} ${h.x} ${h.y + h.h - r} V ${h.y + r} Q ${h.x} ${h.y} ${h.x + r} ${h.y} Z`;
  }
  // Fundo de cor com a janela vazada
  const paper = (fill, holePath) => `<path fill-rule="evenodd" fill="${fill}" d="M0 0 H${W} V${H} H0 Z ${holePath}"/>`;
  function label(name) {
    const n = (name || '').trim();
    const shown = n.length > 22 ? n.slice(0, 21) + '…' : n;
    return shown ? `${esc(shown)} esteve aqui!` : 'Eu estive aqui!';
  }
  const lines = () => { const m = C.moldura || {}; return [m.linha1, m.linha2].filter(Boolean).map(esc); };
  // Gerador pseudoaleatório fixo (a decoração fica igual em todas as fotos)
  function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const star = (cx, cy, r, fill, rot = 0) => {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2 + rot, rr = i % 2 ? r * 0.45 : r;
      d += `${i ? 'L' : 'M'} ${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)} `;
    }
    return `<path d="${d}Z" fill="${fill}"/>`;
  };
  const shadow = `<filter id="sh" x="-10%" y="-40%" width="120%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity=".25"/></filter>`;
  function pill(text, y, bg, fg) {
    const w = Math.min(900, Math.max(360, Math.round(text.length * 23 + 110)));
    return `<g filter="url(#sh)"><rect x="${(W - w) / 2}" y="${y}" width="${w}" height="76" rx="38" fill="${bg}"/></g>
      <text x="${W / 2}" y="${y + 50}" text-anchor="middle" font-family="${SANS}" font-weight="800" font-size="38" fill="${fg}">${text}</text>`;
  }
  const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${shadow}</defs>${body}</svg>`;

  const FRAMES = [
    {
      id: 'classica', nome: 'Clássica',
      hole: { x: 60, y: 260, w: 960, h: 1180 },
      draw(name, date) {
        const h = this.hole, hp = roundRect(h, 40), ls = lines();
        return svg(`${paper('#FFFFFF', hp)}
          <rect width="${W}" height="14" fill="${K.destaque}"/>
          <text x="${W / 2}" y="${ls.length ? 128 : 160}" text-anchor="middle" font-family="${SANS}" font-weight="800" font-size="84" fill="${K.texto}">${esc(C.nome)}</text>
          ${ls.map((l, i) => `<text x="${W / 2}" y="${188 + i * 40}" text-anchor="middle" font-family="${SANS}" font-size="34" fill="#6E6A85">${l}</text>`).join('')}
          <path d="${hp}" fill="none" stroke="${K.destaque}" stroke-width="6"/>
          ${pill(label(name), 1474, K.destaque, '#FFFFFF')}
          ${date ? `<text x="${W / 2}" y="1596" text-anchor="middle" font-family="${SANS}" font-size="26" fill="#9A97AE">${esc(date)}</text>` : ''}`);
      },
    },
    {
      id: 'polaroid', nome: 'Polaroid',
      hole: { x: 70, y: 70, w: 940, h: 1210 },
      draw(name, date) {
        const h = this.hole, hp = roundRect(h, 6);
        return svg(`${paper('#FBFAF7', hp)}
          <path d="${hp}" fill="none" stroke="#E4E1DA" stroke-width="3"/>
          <rect x="390" y="28" width="300" height="80" rx="6" fill="${K.destaqueClaro}" opacity=".55" transform="rotate(-4 540 68)"/>
          <text x="${W / 2}" y="1400" text-anchor="middle" font-family="${HAND}" font-weight="700" font-size="66" fill="${K.texto}">${label(name)}</text>
          <text x="${W / 2}" y="1480" text-anchor="middle" font-family="${HAND}" font-size="40" fill="${K.destaqueEscuro}">${esc(C.nome)}${date ? ' · ' + esc(date) : ''}</text>
          ${star(150, 1440, 28, K.destaque, 0.2)}${star(930, 1430, 22, K.destaqueClaro, 0.5)}`);
      },
    },
    {
      id: 'confete', nome: 'Confete',
      hole: { x: 90, y: 250, w: 900, h: 1150 },
      draw(name, date) {
        const h = this.hole, hp = roundRect(h, 34), r = rng(7);
        const cols = [K.destaqueClaro, '#FFD27A', '#FF8FB1', '#7EE0C3', '#FFFFFF'];
        let bits = '';
        for (let i = 0; i < 90; i++) {
          const x = r() * W, y = r() * H;
          const inside = x > h.x - 10 && x < h.x + h.w + 10 && y > h.y - 10 && y < h.y + h.h + 10;
          if (inside) continue;
          const c = cols[Math.floor(r() * cols.length)], s = 10 + r() * 18, a = Math.round(r() * 180);
          bits += r() < 0.5 ? `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(s / 2).toFixed(1)}" fill="${c}"/>`
            : `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${(s * 1.6).toFixed(0)}" height="${(s * 0.7).toFixed(0)}" rx="3" fill="${c}" transform="rotate(${a} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
        }
        return svg(`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${K.destaqueClaro}"/><stop offset="1" stop-color="${K.destaqueEscuro}"/></linearGradient></defs>
          ${paper('url(#g)', hp)}${bits}
          <path d="${hp}" fill="none" stroke="#FFFFFF" stroke-width="14"/>
          <text x="${W / 2}" y="170" text-anchor="middle" font-family="${SANS}" font-weight="900" font-size="88" fill="#FFFFFF">${esc(C.nome)}</text>
          ${pill(label(name), 1450, '#FFFFFF', K.destaqueEscuro)}
          ${date ? `<text x="${W / 2}" y="1585" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="28" fill="#FFFFFFcc">${esc(date)}</text>` : ''}`);
      },
    },
    {
      id: 'estrelas', nome: 'Noite de estrelas',
      hole: { x: 80, y: 250, w: 920, h: 1160 },
      draw(name, date) {
        const h = this.hole, hp = roundRect(h, 30), r = rng(42);
        let sky = '';
        for (let i = 0; i < 70; i++) {
          const x = r() * W, y = r() * H;
          if (x > h.x - 20 && x < h.x + h.w + 20 && y > h.y - 20 && y < h.y + h.h + 20) continue;
          sky += r() < 0.3 ? star(x, y, 8 + r() * 16, r() < 0.5 ? '#FFD27A' : '#FFFFFF', r() * 2) : `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.5 + r() * 2.5).toFixed(1)}" fill="#FFFFFF" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
        }
        return svg(`<defs><radialGradient id="n" cx=".5" cy="0" r="1.2"><stop offset="0" stop-color="${K.destaqueEscuro}"/><stop offset="1" stop-color="#0E0C1A"/></radialGradient></defs>
          ${paper('url(#n)', hp)}${sky}
          <path d="${hp}" fill="none" stroke="#FFD27A" stroke-width="8"/>
          <text x="${W / 2}" y="168" text-anchor="middle" font-family="${SANS}" font-weight="900" font-size="84" fill="#FFFFFF">${esc(C.nome)}</text>
          ${star(150, 140, 34, '#FFD27A', 0.3)}${star(930, 140, 34, '#FFD27A', 0.7)}
          ${pill(label(name), 1455, '#FFD27A', '#1E1B2E')}
          ${date ? `<text x="${W / 2}" y="1590" text-anchor="middle" font-family="${SANS}" font-size="28" fill="#FFFFFFaa">${esc(date)}</text>` : ''}`);
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
  // Miniatura para o seletor (janela preenchida de cinza)
  function thumbURL(id, name) {
    const f = byId(id), h = f.hole;
    const s = f.draw(name || 'Seu nome', '').replace('<defs>', `<rect x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" fill="#B9B5D0"/><defs>`);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }

  function logoSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="${K.destaque}"/><g fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"><path d="M24 38h11l5-8h20l5 8h11v32H24z"/><circle cx="50" cy="53" r="10"/></g></svg>`;
  }

  window.PainelFrame = { W, H, FRAMES, byId, frameSVG, frameImage, thumbURL, logoSVG };
})();

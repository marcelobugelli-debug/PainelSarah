// Moldura neutra do mural. Nome, textos e cores vêm de config.js (window.PAINEL).
// Usada no celular (prévia + foto final) e no ícone das páginas.
(function () {
  const W = 1080, H = 1620;
  const C = window.PAINEL || { nome: 'Mural de Fotos', moldura: {}, cores: { destaque: '#6C5CE7', destaqueEscuro: '#4B3BC4', texto: '#1E1B2E' } };

  // Janela da foto (onde a câmera aparece)
  const HOLE = { x: 60, y: 260, w: 960, h: 1180 };
  const R = 40;
  const HOLE_PATH = `M ${HOLE.x + R} ${HOLE.y} H ${HOLE.x + HOLE.w - R} Q ${HOLE.x + HOLE.w} ${HOLE.y} ${HOLE.x + HOLE.w} ${HOLE.y + R} V ${HOLE.y + HOLE.h - R} Q ${HOLE.x + HOLE.w} ${HOLE.y + HOLE.h} ${HOLE.x + HOLE.w - R} ${HOLE.y + HOLE.h} H ${HOLE.x + R} Q ${HOLE.x} ${HOLE.y + HOLE.h} ${HOLE.x} ${HOLE.y + HOLE.h - R} V ${HOLE.y + R} Q ${HOLE.x} ${HOLE.y} ${HOLE.x + R} ${HOLE.y} Z`;

  const SANS = `'Helvetica Neue',Helvetica,Arial,sans-serif`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

  // Ícone genérico (câmera) usado como logo nas páginas
  function logoSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="${C.cores.destaque}"/><g fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"><path d="M24 38h11l5-8h20l5 8h11v32H24z"/><circle cx="50" cy="53" r="10"/></g></svg>`;
  }

  function frameSVG(name, date) {
    const n = (name || '').trim();
    const shown = n.length > 22 ? n.slice(0, 21) + '…' : n;
    const label = shown ? `${esc(shown)} esteve aqui!` : 'Eu estive aqui!';
    const pillW = Math.min(900, Math.max(360, Math.round(label.length * 23 + 110)));
    const m = C.moldura || {};
    const lines = [m.linha1, m.linha2].filter(Boolean).map(esc);
    const titleY = lines.length ? 128 : 160;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="pillsh" x="-10%" y="-40%" width="120%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity=".25"/></filter>
  </defs>
  <!-- Fundo com a janela da foto vazada -->
  <path fill-rule="evenodd" fill="#FFFFFF" d="M0 0 H${W} V${H} H0 Z ${HOLE_PATH}"/>
  <rect x="0" y="0" width="${W}" height="14" fill="${C.cores.destaque}"/>

  <!-- Cabeçalho -->
  <text x="${W / 2}" y="${titleY}" text-anchor="middle" font-family="${SANS}" font-weight="800" font-size="84" fill="${C.cores.texto}">${esc(C.nome)}</text>
  ${lines.map((l, i) => `<text x="${W / 2}" y="${188 + i * 40}" text-anchor="middle" font-family="${SANS}" font-size="34" fill="#6E6A85">${l}</text>`).join('')}

  <!-- Contorno da foto -->
  <path d="${HOLE_PATH}" fill="none" stroke="${C.cores.destaque}" stroke-width="6"/>

  <!-- Nome do participante -->
  <g filter="url(#pillsh)"><rect x="${(W - pillW) / 2}" y="1474" width="${pillW}" height="76" rx="38" fill="${C.cores.destaque}"/></g>
  <text x="${W / 2}" y="1524" text-anchor="middle" font-family="${SANS}" font-weight="800" font-size="38" fill="#FFFFFF">${label}</text>
  ${date ? `<text x="${W / 2}" y="1596" text-anchor="middle" font-family="${SANS}" font-size="26" fill="#9A97AE">${esc(date)}</text>` : ''}
</svg>`;
  }

  function frameImage(name, date) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(frameSVG(name, date));
    });
  }

  window.PainelFrame = { W, H, HOLE, HOLE_PATH, logoSVG, robotSVG: logoSVG, frameSVG, frameImage };
})();

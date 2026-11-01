// Moldura Orquestra AI — inspirada no cartaz do IA Product Summit Itaú 2026.
// Usada no celular (prévia + foto final) e nos ícones das páginas.
(function () {
  const W = 1080, H = 1620;

  // Janela da foto: formato curvo como no cartaz (sobe da esquerda para a direita)
  const HOLE_PATH = 'M 56 905 C 56 820 150 772 330 740 C 560 700 780 664 930 650 C 990 645 1024 680 1024 740 L 1024 1480 Q 1024 1540 964 1540 L 116 1540 Q 56 1540 56 1480 Z';
  // Retângulo que contém a janela (onde a câmera é desenhada)
  const HOLE = { x: 56, y: 645, w: 968, h: 895 };

  const NAVY = '#0B2244', ORANGE = '#EC7000', GRAY = '#5B6170';
  const SANS = `'Helvetica Neue',Helvetica,Arial,sans-serif`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

  // Robô prateado com fone laranja (coordenadas locais ~420x470)
  function robotDefs(p) {
    return `
      <linearGradient id="${p}silver" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#D9DCE1"/><stop offset="1" stop-color="#8E949D"/>
      </linearGradient>
      <linearGradient id="${p}visor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2A2F38"/><stop offset="1" stop-color="#05070A"/>
      </linearGradient>
      <linearGradient id="${p}cup" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FFA04A"/><stop offset="1" stop-color="#D95800"/>
      </linearGradient>
      <radialGradient id="${p}eye" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#E6FCFF"/><stop offset=".55" stop-color="#7FE3FF"/><stop offset="1" stop-color="#2FB7E8"/>
      </radialGradient>
      <filter id="${p}glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
      <filter id="${p}drop" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#3A2A1A" flood-opacity=".28"/></filter>`;
  }
  function robotGroup(p) {
    return `
    <g filter="url(#${p}drop)">
      <ellipse cx="205" cy="400" rx="150" ry="80" fill="url(#${p}silver)"/>
      <path d="M 90 420 Q 205 470 320 420" fill="none" stroke="#FFFFFF" stroke-opacity=".6" stroke-width="4"/>
      <line x1="225" y1="40" x2="225" y2="92" stroke="#8E949D" stroke-width="8" stroke-linecap="round"/>
      <circle cx="225" cy="36" r="10" fill="#8E949D"/>
      <path d="M 203 22 A 26 26 0 0 0 203 50 M 247 22 A 26 26 0 0 1 247 50 M 190 10 A 42 42 0 0 0 190 62 M 260 10 A 42 42 0 0 1 260 62" fill="none" stroke="#8E949D" stroke-width="5" stroke-linecap="round"/>
      <path d="M 34 220 C 30 -12 390 -12 386 220" fill="none" stroke="#7D838C" stroke-width="16" stroke-linecap="round"/>
      <rect x="48" y="86" width="324" height="256" rx="124" fill="url(#${p}silver)"/>
      <rect x="84" y="128" width="252" height="170" rx="78" fill="url(#${p}visor)"/>
      <path d="M 110 150 Q 170 132 250 140" fill="none" stroke="#FFFFFF" stroke-opacity=".18" stroke-width="10" stroke-linecap="round"/>
      <g filter="url(#${p}glow)" opacity=".85" fill="#5FD8FF">
        <ellipse cx="170" cy="208" rx="30" ry="34"/><ellipse cx="262" cy="208" rx="30" ry="34"/>
      </g>
      <ellipse cx="170" cy="208" rx="26" ry="30" fill="url(#${p}eye)"/>
      <ellipse cx="262" cy="208" rx="26" ry="30" fill="url(#${p}eye)"/>
      <path d="M 168 258 Q 200 278 232 260" fill="none" stroke="#7FE3FF" stroke-width="7" stroke-linecap="round"/>
      <rect x="14" y="160" width="64" height="128" rx="30" fill="url(#${p}cup)"/>
      <rect x="40" y="178" width="30" height="92" rx="14" fill="#C24E00" opacity=".55"/>
      <rect x="342" y="160" width="64" height="128" rx="30" fill="url(#${p}cup)"/>
      <rect x="350" y="178" width="30" height="92" rx="14" fill="#C24E00" opacity=".55"/>
    </g>`;
  }

  function robotSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 490"><defs>${robotDefs('i')}</defs>${robotGroup('i')}</svg>`;
  }

  // Linhas de circuito decorativas
  function circuit(points, color, op) {
    const d = 'M ' + points.map((p) => p.join(' ')).join(' L ');
    const end = points[points.length - 1];
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" opacity="${op}"/><circle cx="${end[0]}" cy="${end[1]}" r="7" fill="#FFFFFF" stroke="${color}" stroke-width="2.5" opacity="${op}"/>`;
  }
  function hatch(x, y, n, len, color, op) {
    let s = '';
    for (let i = 0; i < n; i++) s += `<line x1="${x + i * 10}" y1="${y}" x2="${x + i * 10 + len}" y2="${y + len}" stroke="${color}" stroke-width="1.6"/>`;
    return `<g opacity="${op}">${s}</g>`;
  }

  function frameSVG(name) {
    const n = (name || '').trim();
    const shown = n.length > 22 ? n.slice(0, 21) + '…' : n;
    const label = shown ? `${esc(shown)} esteve aqui!` : 'Eu estive aqui!';
    const pillW = Math.min(900, Math.max(360, Math.round(label.length * 23 + 110)));

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${robotDefs('f')}
    <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F1F2F5"/>
    </linearGradient>
    <radialGradient id="swoosh" cx="0" cy=".55" r=".9">
      <stop offset="0" stop-color="#FF8A2A" stop-opacity=".95"/><stop offset=".5" stop-color="#FFB27A" stop-opacity=".5"/><stop offset="1" stop-color="#FFE3CC" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".62" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
    <mask id="swooshMask" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#fadeDown)"/></mask>
    <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#F2B98A"/></pattern>
    <filter id="pillsh" x="-10%" y="-40%" width="120%" height="180%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#B34800" flood-opacity=".35"/></filter>
  </defs>

  <!-- Fundo branco com a janela da foto vazada -->
  <path fill-rule="evenodd" fill="url(#paper)" d="M0 0 H${W} V${H} H0 Z ${HOLE_PATH}"/>

  <!-- Detalhes de fundo -->
  <path d="M 0 225 C 210 250 360 520 440 800 C 300 830 120 850 0 860 Z" fill="url(#swoosh)" mask="url(#swooshMask)"/>
  <path d="M 700 0 C 665 120 600 205 470 250" fill="none" stroke="#F5A15A" stroke-width="3" opacity=".8"/>
  <rect x="840" y="0" width="240" height="190" fill="url(#dots)" opacity=".55"/>
  ${hatch(965, 470, 9, 120, NAVY, 0.35)}
  ${circuit([[1080, 576], [940, 576], [905, 545], [800, 545]], '#B9BEC7', 0.9)}
  ${circuit([[1080, 618], [1010, 618], [985, 594], [930, 594]], '#E9A06A', 0.9)}
  ${circuit([[1050, 500], [1010, 530], [880, 530]], '#B9BEC7', 0.7)}

  <!-- Cabeçalho do evento -->
  <rect x="38" y="42" width="146" height="146" rx="30" fill="${ORANGE}"/>
  <text x="111" y="132" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="50" fill="#FFFFFF">Itaú</text>
  <g font-family="${SANS}" font-weight="800" font-size="50" fill="${NAVY}">
    <text x="214" y="86">IA Product</text>
    <text x="214" y="136">Summit</text>
    <text x="214" y="186"><tspan fill="${ORANGE}">Itaú</tspan><tspan fill="#6B6F78" font-weight="400"> 2026</tspan></text>
  </g>
  <g transform="translate(536 108)" fill="none" stroke="${ORANGE}" stroke-width="4" stroke-linejoin="round">
    <rect x="0" y="6" width="54" height="50" rx="8"/><line x1="0" y1="20" x2="54" y2="20"/><line x1="14" y1="0" x2="14" y2="12"/><line x1="40" y1="0" x2="40" y2="12"/>
    <g fill="${ORANGE}" stroke="none"><circle cx="13" cy="31" r="3"/><circle cx="27" cy="31" r="3"/><circle cx="41" cy="31" r="3"/><circle cx="13" cy="44" r="3"/><circle cx="27" cy="44" r="3"/><circle cx="41" cy="44" r="3"/></g>
  </g>
  <text x="606" y="140" font-family="${SANS}" font-weight="800" font-size="34" fill="${NAVY}">03/nov</text>
  <text x="606" y="172" font-family="${SANS}" font-size="23" fill="${GRAY}">das 09h às 12h</text>
  <path d="M 815 110 C 795 110 783 125 783 141 C 783 163 815 190 815 190 C 815 190 847 163 847 141 C 847 125 835 110 815 110 Z" fill="none" stroke="${ORANGE}" stroke-width="4"/>
  <circle cx="815" cy="141" r="10" fill="none" stroke="${ORANGE}" stroke-width="4"/>
  <g font-family="${SANS}" font-size="21" fill="${GRAY}">
    <text x="862" y="124">Feira de</text><text x="862" y="150">exposição de casos</text><text x="862" y="176">CEIC - Itaú</text>
  </g>

  <!-- Título -->
  <text x="352" y="358" font-family="${SANS}" font-weight="800" font-size="132" letter-spacing="-3" textLength="690" lengthAdjust="spacingAndGlyphs" fill="${NAVY}">Orquestra<tspan fill="${ORANGE}">AI</tspan></text>
  <g font-family="${SANS}" font-size="33" fill="${GRAY}">
    <text x="560" y="438">O insight certo, no dia certo</text>
    <text x="560" y="480">para impulsionar resultados.</text>
  </g>
  <rect x="560" y="512" width="120" height="4" rx="2" fill="${ORANGE}"/>

  <!-- Contorno da foto -->
  <path d="${HOLE_PATH}" fill="none" stroke="#FFFFFF" stroke-width="10"/>
  <path d="${HOLE_PATH}" fill="none" stroke="#E2E4E9" stroke-width="2"/>
  <path d="M 30 1000 C 40 820 200 720 520 660" fill="none" stroke="#C9CDD4" stroke-width="2" stroke-dasharray="6 8"/>

  <!-- Pontinhos e circuitos inferiores -->
  <g>${[NAVY, NAVY, ORANGE, '#B8BCC4', '#F2A46A', ORANGE].map((c, i) => `<circle cx="28" cy="${1090 + i * 22}" r="6" fill="${c}"/>`).join('')}</g>
  ${circuit([[0, 1585], [170, 1585], [230, 1560], [330, 1560]], '#E9A06A', 0.9)}
  ${circuit([[300, 1620], [360, 1576], [520, 1576]], '#B9BEC7', 0.9)}
  ${circuit([[680, 1620], [720, 1590], [880, 1590]], '#E9A06A', 0.8)}

  <!-- Robô espiando pela esquerda -->
  <g transform="translate(-92 300) rotate(-6 210 240) scale(1.02)">${robotGroup('f')}</g>

  <!-- Nome do participante -->
  <g filter="url(#pillsh)">
    <rect x="${(W - pillW) / 2}" y="1508" width="${pillW}" height="72" rx="36" fill="${ORANGE}"/>
  </g>
  <text x="${W / 2}" y="1556" text-anchor="middle" font-family="${SANS}" font-weight="800" font-size="36" fill="#FFFFFF">${label}</text>
</svg>`;
  }

  function frameImage(name) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(frameSVG(name));
    });
  }

  window.OrqFrame = { W, H, HOLE, HOLE_PATH, robotSVG, frameSVG, frameImage };
})();

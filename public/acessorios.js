// Acessórios divertidos colocados no rosto (funciona com várias pessoas na foto).
// O reconhecimento de rosto roda no próprio celular e só é carregado se alguém escolher um acessório.
(function () {
  const VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blazeface_short_range/float16/1/blazeface_short_range.tflite';

  const LISTA = [
    { id: 'nenhum', emoji: '🚫', nome: 'Nenhum' },
    { id: 'oculos', emoji: '😎', nome: 'Óculos' },
    { id: 'coracao', emoji: '😍', nome: 'Coração' },
    { id: 'coroa', emoji: '👑', nome: 'Coroa' },
    { id: 'gatinho', emoji: '🐱', nome: 'Gatinho' },
    { id: 'chapeu', emoji: '🥳', nome: 'Festa' },
    { id: 'bigode', emoji: '🥸', nome: 'Bigode' },
    { id: 'misturar', emoji: '🎲', nome: 'Misturar' },
  ];
  const SORTEAVEIS = ['oculos', 'coracao', 'coroa', 'gatinho', 'chapeu', 'bigode'];

  let detector = null, loading = null;
  async function carregar() {
    if (detector) return detector;
    if (!loading) {
      loading = (async () => {
        const { FaceDetector, FilesetResolver } = await import(`${VISION}/vision_bundle.mjs`);
        const files = await FilesetResolver.forVisionTasks(`${VISION}/wasm`);
        const opts = (delegate) => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', minDetectionConfidence: 0.5 });
        try { detector = await FaceDetector.createFromOptions(files, opts('GPU')); }
        catch { detector = await FaceDetector.createFromOptions(files, opts('CPU')); }
        return detector;
      })().catch((e) => { loading = null; throw e; });
    }
    return loading;
  }

  // Detecta rostos numa fonte (vídeo, imagem ou canvas). Retorna pontos em pixels da fonte.
  let lastTs = 0;
  function detectar(source, sw, sh) {
    if (!detector) return [];
    lastTs = Math.max(lastTs + 1, Math.round(performance.now()));
    let res;
    try { res = detector.detectForVideo(source, lastTs); } catch { return []; }
    return (res.detections || []).map((d) => {
      const k = d.keypoints || [];
      const pt = (i) => (k[i] ? { x: k[i].x * sw, y: k[i].y * sh } : null);
      return { eyes: [pt(0), pt(1)], nose: pt(2), mouth: pt(3), box: d.boundingBox };
    }).filter((f) => f.eyes[0] && f.eyes[1]).sort((a, b) => a.box.originX - b.box.originX);
  }

  // Suaviza o tremido entre um quadro e outro
  let smooth = [];
  function suavizar(faces) {
    const a = 0.45;
    smooth = faces.map((f, i) => {
      const o = smooth[i];
      if (!o) return f;
      const mix = (p, q) => (p && q ? { x: q.x + (p.x - q.x) * a, y: q.y + (p.y - q.y) * a } : p);
      return { ...f, eyes: [mix(f.eyes[0], o.eyes[0]), mix(f.eyes[1], o.eyes[1])], nose: mix(f.nose, o.nose), mouth: mix(f.mouth, o.mouth) };
    });
    return smooth;
  }

  // ---- Desenhos (unidade: distância entre os olhos = 100; olhos em x = -50 e +50) ----
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function heart(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.9);
    ctx.bezierCurveTo(cx - s * 1.4, cy + s * 0.1, cx - s * 0.9, cy - s * 1.1, cx, cy - s * 0.4);
    ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.1, cx + s * 1.4, cy + s * 0.1, cx, cy + s * 0.9);
    ctx.closePath();
  }
  const DESENHOS = {
    oculos(ctx) {
      ctx.lineWidth = 7; ctx.strokeStyle = '#111';
      for (const sx of [-1, 1]) {
        const g = ctx.createLinearGradient(sx * 50 - 45, -30, sx * 50 + 45, 30);
        g.addColorStop(0, '#2b2b35'); g.addColorStop(0.5, '#0b0b10'); g.addColorStop(1, '#3a3a48');
        ctx.fillStyle = g; rr(ctx, sx * 50 - 46, -28, 92, 60, 22); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(ctx, sx * 50 - 30, -20, 22, 10, 5); ctx.fill();
      }
      ctx.beginPath(); ctx.moveTo(-6, -8); ctx.quadraticCurveTo(0, -16, 6, -8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-96, -10); ctx.lineTo(-120, -14); ctx.moveTo(96, -10); ctx.lineTo(120, -14); ctx.stroke();
    },
    coracao(ctx) {
      for (const sx of [-1, 1]) {
        heart(ctx, sx * 50, 2, 36); ctx.fillStyle = '#FF3D7F'; ctx.fill();
        ctx.lineWidth = 6; ctx.strokeStyle = '#C2185B'; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(sx * 50 - 14, -12, 9, 6, -0.5, 0, 7); ctx.fill();
      }
      ctx.lineWidth = 6; ctx.strokeStyle = '#C2185B';
      ctx.beginPath(); ctx.moveTo(-14, -6); ctx.quadraticCurveTo(0, -14, 14, -6); ctx.stroke();
    },
    coroa(ctx) {
      const y = -125;
      const g = ctx.createLinearGradient(0, y - 70, 0, y + 30);
      g.addColorStop(0, '#FFE680'); g.addColorStop(1, '#E0A100');
      ctx.fillStyle = g; ctx.strokeStyle = '#B07A00'; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-95, y + 30); ctx.lineTo(-105, y - 45); ctx.lineTo(-55, y - 5); ctx.lineTo(0, y - 70);
      ctx.lineTo(55, y - 5); ctx.lineTo(105, y - 45); ctx.lineTo(95, y + 30); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const [x, c] of [[-105, '#FF3D7F'], [0, '#3DA9FF'], [105, '#FF3D7F']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, (x ? y - 45 : y - 70), 11, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#7EE0C3'; ctx.beginPath(); ctx.arc(0, y + 8, 12, 0, 7); ctx.fill();
    },
    gatinho(ctx) {
      for (const sx of [-1, 1]) {
        ctx.fillStyle = '#3A3A44'; ctx.beginPath(); ctx.moveTo(sx * 40, -120); ctx.lineTo(sx * 110, -210); ctx.lineTo(sx * 125, -95); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FF9EC4'; ctx.beginPath(); ctx.moveTo(sx * 60, -118); ctx.lineTo(sx * 106, -180); ctx.lineTo(sx * 112, -108); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 4;
        for (const dy of [-6, 8]) { ctx.beginPath(); ctx.moveTo(sx * 30, 62 + dy); ctx.lineTo(sx * 105, 52 + dy * 2); ctx.stroke(); }
      }
      ctx.fillStyle = '#FF6FA5'; heart(ctx, 0, 52, 13); ctx.fill();
    },
    chapeu(ctx) {
      ctx.save(); ctx.translate(0, -135); ctx.rotate(-0.18);
      ctx.beginPath(); ctx.moveTo(-62, 20); ctx.lineTo(0, -150); ctx.lineTo(62, 20); ctx.closePath();
      ctx.fillStyle = '#6C5CE7'; ctx.fill(); ctx.save(); ctx.clip();
      ctx.fillStyle = '#FFD27A';
      for (let i = -4; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-80, i * 34); ctx.lineTo(80, i * 34 - 40); ctx.lineTo(80, i * 34 - 26); ctx.lineTo(-80, i * 34 + 14); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#FF3D7F'; ctx.beginPath(); ctx.arc(0, -150, 18, 0, 7); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; rr(ctx, -70, 12, 140, 18, 9); ctx.fill();
      ctx.restore();
    },
    bigode(ctx) {
      ctx.fillStyle = '#3B2414'; ctx.beginPath();
      ctx.moveTo(0, 70);
      ctx.bezierCurveTo(-30, 52, -70, 58, -92, 80); ctx.bezierCurveTo(-80, 74, -66, 92, -40, 92);
      ctx.bezierCurveTo(-20, 92, -8, 84, 0, 80);
      ctx.bezierCurveTo(8, 84, 20, 92, 40, 92); ctx.bezierCurveTo(66, 92, 80, 74, 92, 80);
      ctx.bezierCurveTo(70, 58, 30, 52, 0, 70); ctx.fill();
    },
  };

  // Desenha o acessório em cada rosto. map(p) converte pixel da fonte -> coordenada do canvas.
  function desenhar(ctx, faces, tipo, map) {
    if (!tipo || tipo === 'nenhum') return;
    faces.forEach((f, i) => {
      const kind = tipo === 'misturar' ? SORTEAVEIS[(i * 7 + 3) % SORTEAVEIS.length] : tipo;
      const draw = DESENHOS[kind]; if (!draw) return;
      let [a, b] = f.eyes.map(map);
      if (a.x > b.x) [a, b] = [b, a];
      const d = Math.hypot(b.x - a.x, b.y - a.y); if (d < 4) return;
      ctx.save();
      ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
      ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
      ctx.scale(d / 100, d / 100);
      draw(ctx);
      ctx.restore();
    });
  }

  window.Acessorios = { LISTA, carregar, detectar, suavizar, desenhar, pronto: () => !!detector };
})();

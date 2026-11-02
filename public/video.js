// Gravação de vídeos curtos no celular, com a moldura padrão gravada dentro do vídeo.
// A câmera é desenhada num canvas (com a moldura por cima) e o canvas + áudio do microfone são gravados.
// Assim o vídeo já sai pronto do celular e o servidor não precisa converter nada.
(function () {
  const P = window.PAINEL || {};
  const CFG = Object.assign({ maxSegundos: 15, maxMB: 15, texto: 'Sarah faz 11 anos' }, P.video || {});
  const K = (P.cores || { destaque: '#FF2E93', destaqueClaro: '#C8A2FF', destaqueEscuro: '#7B2CBF' });

  // Qualidade: 720x1280 na maioria dos celulares; 540x960 nos mais fracos. ~4–6 MB / ~3–4 MB em 15 s.
  const fraco = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
  const TIER = fraco ? { w: 540, h: 960, vbps: 1500000 } : { w: 720, h: 1280, vbps: 2300000 };
  const ABPS = 96000;

  function tipoSuportado() {
    if (!window.MediaRecorder) return '';
    // H.264 primeiro (iPhone e Android novos; leve para codificar), depois VP8, depois genéricos
    const opcoes = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4;codecs=avc1',
      'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp8', 'video/mp4', 'video/webm'];
    return opcoes.find((t) => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) || '';
  }
  const suportado = () => !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
    window.MediaRecorder && HTMLCanvasElement.prototype.captureStream && tipoSuportado());

  // Moldura padrão e discreta (desenhada uma vez)
  let moldura = null;
  function desenharMoldura(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), u = w / 720;
    // brilho leve no rodapé para o texto ficar legível
    const g = x.createLinearGradient(0, h - 230 * u, 0, h);
    g.addColorStop(0, 'rgba(10,6,18,0)'); g.addColorStop(1, 'rgba(10,6,18,.78)');
    x.fillStyle = g; x.fillRect(0, h - 230 * u, w, 230 * u);
    // borda fina em degradê
    const b = x.createLinearGradient(0, 0, w, h);
    b.addColorStop(0, K.destaque); b.addColorStop(1, K.destaqueEscuro || K.destaque);
    x.strokeStyle = b; x.lineWidth = 10 * u; x.strokeRect(5 * u, 5 * u, w - 10 * u, h - 10 * u);
    // texto
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.font = `${Math.round(46 * u)}px Anton, Impact, 'Arial Narrow', sans-serif`;
    x.fillStyle = '#FFFFFF';
    if ('letterSpacing' in x) x.letterSpacing = `${Math.round(4 * u)}px`;
    x.fillText(String(CFG.texto).toUpperCase(), w / 2, h - 58 * u);
    x.fillStyle = K.destaque; x.fillRect(w / 2 - 40 * u, h - 40 * u, 80 * u, 5 * u);
    return c;
  }

  // ---------------------------------------------------------------- Gravador
  function criar(canvasEl) {
    let stream = null, rec = null, chunks = [], raf = 0, vfc = 0, facing = 'user', video = null;
    let timer = 0, t0 = 0, poster = null, onTick = null, onFim = null, comAudio = true;
    const ctx = canvasEl.getContext('2d');
    canvasEl.width = TIER.w; canvasEl.height = TIER.h;

    async function abrir(lado) {
      fechar();
      facing = lado || facing;
      const vid = { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } };
      try { stream = await navigator.mediaDevices.getUserMedia({ video: vid, audio: { echoCancellation: true, noiseSuppression: true } }); comAudio = true; }
      catch (e) {
        if (e && (e.name === 'NotAllowedError' || e.name === 'NotFoundError')) {
          // sem microfone: grava só a imagem
          stream = await navigator.mediaDevices.getUserMedia({ video: vid, audio: false }); comAudio = false;
        } else throw e;
      }
      video = document.createElement('video');
      video.muted = true; video.playsInline = true; video.setAttribute('playsinline', ''); video.srcObject = stream;
      await video.play().catch(() => {});
      if (!moldura || moldura.width !== TIER.w) moldura = desenharMoldura(TIER.w, TIER.h);
      desenhar();
      return { comAudio };
    }

    function quadro() {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (vw && vh) {
        const s = Math.max(TIER.w / vw, TIER.h / vh), dw = vw * s, dh = vh * s;
        ctx.save();
        if (facing === 'user') { ctx.translate(TIER.w, 0); ctx.scale(-1, 1); }
        ctx.drawImage(video, (TIER.w - dw) / 2, (TIER.h - dh) / 2, dw, dh);
        ctx.restore();
      } else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, TIER.w, TIER.h); }
      ctx.drawImage(moldura, 0, 0);
    }
    function desenhar() {
      cancelAnimationFrame(raf);
      if (video && video.cancelVideoFrameCallback && vfc) video.cancelVideoFrameCallback(vfc);
      if (video && video.requestVideoFrameCallback) {
        const loop = () => { if (!video) return; quadro(); vfc = video.requestVideoFrameCallback(loop); };
        vfc = video.requestVideoFrameCallback(loop);
        quadro();
      } else {
        const loop = () => { if (!video) return; quadro(); raf = requestAnimationFrame(loop); };
        raf = requestAnimationFrame(loop);
      }
    }

    function gravar(tick, fim) {
      onTick = tick; onFim = fim; chunks = []; poster = null;
      const tipo = tipoSuportado();
      const canal = canvasEl.captureStream(30);
      const mix = new MediaStream([...canal.getVideoTracks(), ...(comAudio ? stream.getAudioTracks() : [])]);
      const opts = { mimeType: tipo, videoBitsPerSecond: TIER.vbps };
      if (comAudio) opts.audioBitsPerSecond = ABPS;
      try { rec = new MediaRecorder(mix, opts); } catch { rec = new MediaRecorder(mix, { mimeType: tipo }); }
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        canal.getTracks().forEach((t) => t.stop());
        clearInterval(timer);
        const dur = Math.min(CFG.maxSegundos, (performance.now() - t0) / 1000);
        const blob = new Blob(chunks, { type: (rec.mimeType || tipo).split(';')[0] });
        chunks = [];
        if (onFim) onFim({ blob, dur, poster, tipo: blob.type });
      };
      rec.start(1000);
      t0 = performance.now();
      // capa: um quadro logo no começo
      setTimeout(() => { poster = capa(); }, 600);
      const passo = () => {
        const s = (performance.now() - t0) / 1000;
        if (onTick) onTick(Math.max(0, CFG.maxSegundos - s), s);
        if (s >= CFG.maxSegundos) parar();
      };
      timer = setInterval(passo, 100);
      passo();
    }
    function parar() { clearInterval(timer); if (rec && rec.state !== 'inactive') rec.stop(); }
    function capa() {
      const c = document.createElement('canvas'), w = 360, h = Math.round((360 * TIER.h) / TIER.w);
      c.width = w; c.height = h; c.getContext('2d').drawImage(canvasEl, 0, 0, w, h);
      return c.toDataURL('image/jpeg', 0.8);
    }
    function fechar() {
      if (rec && rec.state !== 'inactive') { onFim = null; try { rec.stop(); } catch {} }
      clearInterval(timer); cancelAnimationFrame(raf);
      if (video && video.cancelVideoFrameCallback && vfc) video.cancelVideoFrameCallback(vfc);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null; if (video) { video.srcObject = null; video = null; }
    }
    return { abrir, gravar, parar, fechar, capa, lado: () => facing, gravando: () => !!(rec && rec.state === 'recording') };
  }

  // ---------------------------------------------------------------- Envio (capa + vídeo, com progresso)
  function enviar({ blob, poster, dur, nome }, progresso) {
    return new Promise(async (resolve, reject) => {
      try {
        const capaUrl = poster || '';
        const r = await fetch('/api/videos/poster', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: capaUrl }) });
        if (!r.ok) throw new Error('capa');
        const { id } = await r.json();
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/videos?id=${encodeURIComponent(id)}&name=${encodeURIComponent(nome || '')}&dur=${dur.toFixed(1)}`);
        xhr.setRequestHeader('Content-Type', blob.type || 'video/webm');
        xhr.upload.onprogress = (e) => { if (e.lengthComputable && progresso) progresso(e.loaded / e.total); };
        xhr.onload = () => (xhr.status === 201 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error((() => { try { return JSON.parse(xhr.responseText).error; } catch { return 'Falha ao enviar'; } })())));
        xhr.onerror = () => reject(new Error('Sem conexão'));
        xhr.send(blob);
      } catch (e) { reject(e); }
    });
  }

  window.Video = { suportado, criar, enviar, CFG, TIER, limiteBytes: CFG.maxMB * 1024 * 1024 };
})();

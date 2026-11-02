// Realidade aumentada: recorta a pessoa da câmera (tira o fundo) ao vivo, no próprio celular.
// Só é carregado quando alguém escolhe uma moldura de realidade aumentada.
(function () {
  const VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
  let seg = null, loading = null, ts = 0, invert = null;
  const small = document.createElement('canvas');
  const maskC = document.createElement('canvas');

  function carregar() {
    if (seg) return Promise.resolve(seg);
    if (!loading) {
      loading = (async () => {
        const { ImageSegmenter, FilesetResolver } = await import(`${VISION}/vision_bundle.mjs`);
        const files = await FilesetResolver.forVisionTasks(`${VISION}/wasm`);
        seg = await ImageSegmenter.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' },
          runningMode: 'VIDEO', outputConfidenceMasks: true, outputCategoryMask: false,
        });
        return seg;
      })().catch((e) => { loading = null; throw e; });
    }
    return loading;
  }

  // Devolve um canvas com a máscara da pessoa (alfa) do tamanho reduzido da fonte, ou null.
  function mascara(src, sw, sh) {
    if (!seg || !sw || !sh) return null;
    const w = 256, h = Math.max(16, Math.round((256 * sh) / sw));
    if (small.width !== w || small.height !== h) { small.width = w; small.height = h; }
    small.getContext('2d').drawImage(src, 0, 0, w, h);
    ts = Math.max(ts + 1, Math.round(performance.now()));
    let res;
    try { res = seg.segmentForVideo(small, ts); } catch (e) { console.warn('segmentação', e); return null; }
    const masks = res.confidenceMasks || [];
    if (!masks.length) return null;
    const m = masks[masks.length - 1], mw = m.width, mh = m.height, f = m.getAsFloat32Array();
    // Descobre uma vez se a máscara marca a pessoa ou o fundo (centro x cantos)
    if (invert === null) {
      let c = 0, k = 0;
      for (let y = Math.floor(mh * 0.35); y < mh * 0.65; y++) for (let x = Math.floor(mw * 0.4); x < mw * 0.6; x++) c += f[y * mw + x];
      for (let y = 0; y < mh * 0.12; y++) for (let x = 0; x < mw * 0.12; x++) { k += f[y * mw + x] + f[y * mw + (mw - 1 - x)]; }
      const cc = c / Math.max(1, Math.floor(mh * 0.3) * Math.floor(mw * 0.2)), kk = k / Math.max(1, 2 * Math.floor(mh * 0.12) * Math.floor(mw * 0.12));
      if (Math.abs(cc - kk) > 0.3) invert = kk > cc;
    }
    if (maskC.width !== mw || maskC.height !== mh) { maskC.width = mw; maskC.height = mh; }
    const mctx = maskC.getContext('2d'), img = mctx.createImageData(mw, mh), d = img.data;
    for (let i = 0; i < f.length; i++) {
      let v = invert ? 1 - f[i] : f[i];
      v = v < 0.3 ? 0 : v > 0.7 ? 1 : (v - 0.3) / 0.4;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; d[i * 4 + 3] = Math.round(v * 255);
    }
    mctx.putImageData(img, 0, 0);
    masks.forEach((x) => x.close && x.close());
    return maskC;
  }

  window.AR = { carregar, mascara, pronto: () => !!seg };
})();

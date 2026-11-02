// =====================================================================
//  CONFIGURAÇÃO DO MURAL — troque aqui o nome, os textos e as cores.
//  Tudo o que aparece no telão, no celular, na moldura e na moderação
//  vem deste arquivo. Não precisa mexer nos outros arquivos para trocar o tema.
// =====================================================================
window.PAINEL = {
  // Nome principal (telão, celular, moldura, título das abas)
  nome: 'Festa da Sarah',

  // Aniversariante e idade (aparecem em destaque nas molduras)
  aniversariante: 'Sarah',
  idade: 11,

  // Frase curta abaixo do nome no telão
  subtitulo: 'Sarah faz 11 anos! 🎤✨',

  // Texto da tela inicial do celular
  chamada: 'Tire uma selfie de pop star e apareça no telão da festa!',

  // Mensagem que aparece no telão quando chega uma foto nova
  agradecimento: 'Obrigado por vir celebrar com a Sarah! 💖',

  // Texto da tela final do celular, depois de enviar
  enviado: 'Sua foto já está no telão da festa. Agora é só curtir! 💖',

  // Texto pequeno das molduras. Deixe '' para usar o padrão.
  moldura: {
    linha1: 'POP STAR PARTY',
    linha2: '',
  },

  // Cores: destaque (botões, QR Code, moldura) e fundos
  cores: {
    destaque: '#FF3FA4',
    destaqueClaro: '#FF8AD0',
    destaqueEscuro: '#7B2CBF',
    fundoTelao: '#14061F',
    texto: '#1E1B2E',
  },

  // Nome do arquivo quando o convidado salva a foto
  arquivoFoto: 'festa-da-sarah',

  // Figurinhas que o convidado pode colocar na foto
  figurinhas: ['🎤', '🎧', '💖', '✨', '⭐', '🎀', '💜', '🩷', '🎶', '💫', '👑', '😎', '🔥', '🦄', '🌈', '🎂', '🥳', '🐱'],

  // Vitrine no telão: depois de quantos segundos sem foto nova começa a passar as antigas,
  // e quanto tempo cada uma fica. Use 0 em carrosselEsperaSegundos para desligar.
  carrosselEsperaSegundos: 20,
  carrosselTrocaSegundos: 7,

  // Música da comemoração. Deixe '' para usar a fanfarra gerada pelo próprio telão,
  // ou coloque um arquivo em public/ (ex.: '/musica.mp3').
  somComemoracao: '',
};

// ---- Aplica a configuração nas páginas (não precisa editar abaixo) ----
(function () {
  const C = window.PAINEL;
  const root = document.documentElement.style;
  root.setProperty('--accent', C.cores.destaque);
  root.setProperty('--accent-2', C.cores.destaqueClaro);
  root.setProperty('--accent-deep', C.cores.destaqueEscuro);
  root.setProperty('--bg', C.cores.fundoTelao);
  root.setProperty('--ink', C.cores.texto);
  // Tons claros derivados da cor de destaque (fundos, bordas)
  [['--tint-0', 6], ['--tint-1', 14], ['--tint-2', 24], ['--tint-3', 40]].forEach(([v, pct]) =>
    root.setProperty(v, `color-mix(in srgb, ${C.cores.destaque} ${pct}%, #fff)`));

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-cfg]').forEach((el) => {
      const v = el.dataset.cfg.split('.').reduce((o, k) => (o || {})[k], C);
      if (v != null) el.textContent = v;
    });
    const page = document.title.split('·').pop().trim();
    document.title = `${C.nome} · ${page}`;
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = C.cores.destaque;
  });
})();

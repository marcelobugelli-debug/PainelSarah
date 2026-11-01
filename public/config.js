// =====================================================================
//  CONFIGURAÇÃO DO MURAL — troque aqui o nome, os textos e as cores.
//  Tudo o que aparece no telão, no celular, na moldura e na moderação
//  vem deste arquivo. Não precisa mexer nos outros arquivos para trocar o tema.
// =====================================================================
window.PAINEL = {
  // Nome principal (telão, celular, moldura, título das abas)
  nome: 'Mural de Fotos',

  // Frase curta abaixo do nome no telão
  subtitulo: 'Fotos ao vivo de quem está aqui',

  // Texto da tela inicial do celular
  chamada: 'Faça uma selfie com a moldura e veja ela aparecer no telão na hora.',

  // Mensagem que aparece no telão quando chega uma foto nova
  agradecimento: 'Obrigado por participar! 💜',

  // Texto da tela final do celular, depois de enviar
  enviado: 'Sua foto já está no mural. Obrigado por participar!',

  // Linhas de texto da moldura (abaixo do nome). Deixe '' para esconder.
  moldura: {
    linha1: '',
    linha2: '',
  },

  // Cores: destaque (botões, QR Code, moldura) e fundos
  cores: {
    destaque: '#6C5CE7',
    destaqueClaro: '#8E7CF0',
    destaqueEscuro: '#4B3BC4',
    fundoTelao: '#0E0C1A',
    texto: '#1E1B2E',
  },

  // Nome do arquivo quando o convidado salva a foto
  arquivoFoto: 'minha-foto',
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

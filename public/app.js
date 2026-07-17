(function () {
  "use strict";

  // ============================================================
  // 0. Autenticação — garante que só entra quem tem sessão válida
  // ============================================================
  var currentUser = null;

  fetch("/api/me")
    .then(function (r) {
      if (!r.ok) throw new Error("não autenticado");
      return r.json();
    })
    .then(function (data) {
      currentUser = data;
      document.getElementById("userLabel").textContent =
        "Olá, " + (data.nome || data.email);
      renderFichaLista(data.fichas || []);
      inicializarCategoria();
    })
    .catch(function () {
      window.location.href = "index.html";
    });

  document.getElementById("logoutBtn").addEventListener("click", function () {
    fetch("/api/logout", { method: "POST" }).then(function () {
      // Limpa o carrinho e a categoria guardados localmente — evita que a
      // próxima pessoa a usar este navegador/computador veja dados de outra cliente.
      try {
        window.localStorage.removeItem("j8_carrinho_v1");
        window.localStorage.removeItem(CATEGORIA_STORAGE_KEY);
      } catch (e) {}
      window.location.href = "index.html";
    });
  });

  // ============================================================
  // 0.5 Categorias — universo escolhido depois do login
  // ============================================================
  // Todas as categorias partilham a MESMA conta e o MESMO carrinho — a
  // categoria é só um filtro de apresentação/entrada, não uma conta separada.
  // "Maquilhagem" e "Skincare" ainda não têm conteúdo próprio nesta versão
  // (ver README "O que foi deliberadamente deixado de fora"); ficam marcadas
  // como "em breve" mas já preparam a estrutura para quando existirem.
  var CATEGORIA_STORAGE_KEY = "j8_categoria_v1";

  var CATEGORIAS = [
    { key: "cabelo_fem", label: "Cabelo Feminino", emoji: "💇‍♀️", cls: "cc-fem", genero: "feminino" },
    { key: "cabelo_masc", label: "Cabelo Masculino", emoji: "💇‍♂️", cls: "cc-masc", genero: "masculino" },
    { key: "maquilhagem", label: "Maquilhagem", emoji: "💄", cls: "cc-make", emBreve: true },
    { key: "skincare", label: "Skincare", emoji: "✨", cls: "cc-skin", emBreve: true }
  ];

  var categoriaAtual = null;

  function carregarCategoriaSalva() {
    try { return window.localStorage.getItem(CATEGORIA_STORAGE_KEY); }
    catch (e) { return null; }
  }
  function salvarCategoriaEscolhida(key) {
    try { window.localStorage.setItem(CATEGORIA_STORAGE_KEY, key); } catch (e) {}
  }
  function categoriaPorKey(key) {
    for (var i = 0; i < CATEGORIAS.length; i++) if (CATEGORIAS[i].key === key) return CATEGORIAS[i];
    return null;
  }

  function inicializarCategoria() {
    renderSeletorCategoriaInicial();
    renderBarraCategorias();
    var salva = carregarCategoriaSalva();
    if (salva && categoriaPorKey(salva)) {
      aplicarCategoria(salva);
    } else {
      document.getElementById("painelCategoria").style.display = "block";
      document.getElementById("appMain").style.display = "none";
    }
  }

  function renderSeletorCategoriaInicial() {
    var html = "";
    CATEGORIAS.forEach(function (c) {
      html +=
        '<div class="category-card ' + c.cls + '" data-cat="' + c.key + '">' +
        '<span class="cc-emoji">' + c.emoji + '</span>' +
        '<span class="cc-label">' + c.label + '</span>' +
        (c.emBreve ? '<span class="cc-soon">Em breve</span>' : "") +
        "</div>";
    });
    document.getElementById("categoriaGrid").innerHTML = html;
    document.querySelectorAll("#categoriaGrid .category-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var key = card.getAttribute("data-cat");
        salvarCategoriaEscolhida(key);
        aplicarCategoria(key);
      });
    });
  }

  function renderBarraCategorias() {
    var html = "";
    CATEGORIAS.forEach(function (c) {
      var ativa = c.key === categoriaAtual;
      html +=
        '<div class="category-pill ' + (ativa ? "active" : "") + '" data-cat="' + c.key + '">' +
        c.emoji + " " + c.label +
        (c.emBreve ? '<span class="cp-soon">Em breve</span>' : "") +
        "</div>";
    });
    document.getElementById("categoriaBar").innerHTML = html;
    document.querySelectorAll("#categoriaBar .category-pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        var key = pill.getAttribute("data-cat");
        salvarCategoriaEscolhida(key);
        aplicarCategoria(key);
      });
    });
  }

  function aplicarCategoria(key) {
    var cat = categoriaPorKey(key);
    if (!cat) return;
    categoriaAtual = key;

    document.getElementById("painelCategoria").style.display = "none";
    document.getElementById("appMain").style.display = "block";
    renderBarraCategorias();

    var emBreve = document.getElementById("painelEmBreve");
    var avaliacaoTab = document.querySelector('#mainTabs .tab[data-tab="avaliacao"]');

    if (cat.emBreve) {
      emBreve.style.display = "block";
      document.getElementById("painelAvaliacao").style.display = "none";
      document.getElementById("painelFicha").style.display = "none";
      document.getElementById("painelAgenda").style.display = "none";
      if (avaliacaoTab) avaliacaoTab.style.display = "none";
    } else {
      emBreve.style.display = "none";
      if (avaliacaoTab) {
        avaliacaoTab.style.display = "";
        document.querySelectorAll("#mainTabs .tab").forEach(function (t) { t.classList.remove("active"); });
        avaliacaoTab.classList.add("active");
      }
      document.getElementById("painelAvaliacao").style.display = "block";
      document.getElementById("painelFicha").style.display = "none";
      document.getElementById("painelAgenda").style.display = "none";
      // Pré-seleciona o género no quiz conforme a categoria escolhida —
      // continua editável, é só um ponto de partida coerente com a escolha.
      if (cat.genero) {
        selecoes.genero = cat.genero;
        var grupo = document.querySelector('.options[data-group="genero"]');
        if (grupo) {
          grupo.querySelectorAll(".opt").forEach(function (o) {
            o.classList.toggle("selected", o.getAttribute("data-value") === cat.genero);
          });
        }
      }
    }
    renderGamificacao();
  }

  var voltarCabeloBtn = document.getElementById("voltarCabeloBtn");
  if (voltarCabeloBtn) {
    voltarCabeloBtn.addEventListener("click", function () {
      salvarCategoriaEscolhida("cabelo_fem");
      aplicarCategoria("cabelo_fem");
    });
  }

  // ============================================================
  // 1. Moeda
  // ============================================================
  var currency = "EUR";
  var FX = { EUR: 1, BRL: 5.6 };

  function fmt(valEUR) {
    var v = valEUR * FX[currency];
    var symbol = currency === "EUR" ? "€" : "R$";
    return symbol + v.toFixed(0);
  }

  document.querySelectorAll("#currencyToggle button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#currencyToggle button").forEach(function (b) {
        b.classList.remove("active");
        b.style.background = "transparent";
        b.style.color = "var(--ink-soft)";
      });
      btn.classList.add("active");
      btn.style.background = "var(--violet)";
      btn.style.color = "#fff";
      currency = btn.getAttribute("data-cur");
      document.getElementById("budgetVal").textContent = fmt(budgetEUR());
      if (document.getElementById("resultado").style.display === "block") {
        renderMenuProtocolo();
        atualizarTotalCarrinho();
      }
    });
  });

  // ============================================================
  // 1.1 WhatsApp — número do negócio e desconto de boas-vindas
  // ============================================================
  // Número em formato internacional só com dígitos (sem +, espaços ou traços),
  // exigido pelo formato do link wa.me. Assumido indicativo de Portugal (+351)
  // a partir do número fornecido — confirmar/alterar aqui se for outro país.
  var WHATSAPP_NUMBER = "351917969355";

  // Desconto de boas-vindas para primeiro pedido feito via link de WhatsApp —
  // valor sugerido (10%), fácil de ajustar aqui numa linha só.
  var DESCONTO_WHATSAPP = { codigo: "BEMVINDAJ8", percentagem: 10 };

  function aplicarDesconto(totalEUR) {
    var valor = totalEUR * (DESCONTO_WHATSAPP.percentagem / 100);
    return { valorEUR: valor, totalComDescontoEUR: totalEUR - valor };
  }

  function linkWhatsApp(mensagem) {
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(mensagem);
  }

  // ============================================================
  // 2. Abas principais (Nova avaliação / Minha ficha)
  // ============================================================
  document.querySelectorAll("#mainTabs .tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll("#mainTabs .tab").forEach(function (t) {
        t.classList.remove("active");
      });
      tab.classList.add("active");
      var which = tab.getAttribute("data-tab");
      document.getElementById("painelAvaliacao").style.display =
        which === "avaliacao" ? "block" : "none";
      document.getElementById("painelFicha").style.display =
        which === "ficha" ? "block" : "none";
      document.getElementById("painelAgenda").style.display =
        which === "agenda" ? "block" : "none";
      if (which === "ficha" && currentUser) {
        fetch("/api/ficha")
          .then(function (r) { return r.json(); })
          .then(function (d) { renderFichaLista(d.fichas || []); });
      }
      if (which === "agenda" && currentUser) {
        carregarProfissionais();
        carregarMinhasMarcacoes();
        carregarPedidos();
      }
    });
  });

  // ============================================================
  // 3. Catálogo (mesma lógica do protótipo anterior)
  // ============================================================
  // rating/reviews são dados ILUSTRATIVOS para demonstrar o padrão visual
  // (prova social ao estilo Amazon/Sephora) — substituir por dados reais
  // assim que existirem avaliações de clientes verdadeiras.
  // Marca única usada nesta fase do protótipo (pedido explícito: "só uma
  // marca, tipo coreana" para simplificar antes de negociar um fornecedor
  // real). Fictícia — substituir por dados reais assim que houver parceria.
  var BRAND = { nome: "HANA LAB", emoji: "🌿", tagline: "Ritual capilar K-beauty inspirado em scalp skinification" };

  var CATALOGO = {
    fase1: { nome: "Fase 1 — Esfoliante de couro cabeludo", essential: 18, clinical: 30, rating: 4.7, reviews: 312, badge: "Mais vendido" },
    fase2: { nome: "Fase 2 — Base (shampoo + condicionador)", essential: 32, clinical: 50, rating: 4.5, reviews: 208, badge: null },
    fase3: { nome: "Fase 3 — Reconstrução / tratamento", essential: 35, clinical: 55, rating: 4.8, reviews: 176, badge: null },
    fase4: { nome: "Fase 4 — Finalização / selagem", essential: 22, clinical: 38, rating: 4.6, reviews: 145, badge: null },
    fase5: { nome: "Fase 5 — Booster de manutenção", essential: 25, clinical: 42, rating: 4.9, reviews: 89, badge: "Novo" }
  };

  var SERVICOS = {
    diagnostico: { nome: "Consulta de diagnóstico (visagismo + colorimetria)", preco: 40, rating: 4.9, reviews: 64 },
    corte: { nome: "Corte visagista em salão parceiro", preco: 45, rating: 4.8, reviews: 231 },
    coloracao: { nome: "Coloração de manutenção (tom compatível com o subtom)", preco: 90, rating: 4.7, reviews: 158 }
  };

  function renderStars(rating) {
    var cheias = Math.round(rating);
    var html = '<span class="stars">';
    for (var i = 1; i <= 5; i++) html += i <= cheias ? "★" : "☆";
    html += '</span>';
    return html;
  }

  var PRIORIDADE_POR_OBJETIVO = {
    frizz: ["fase1", "fase2", "fase4", "fase3", "fase5"],
    quebra: ["fase1", "fase2", "fase3", "fase4", "fase5"],
    couro: ["fase1", "fase5", "fase2", "fase4", "fase3"],
    cor: ["fase2", "fase4", "fase1", "fase5", "fase3"],
    corte: ["fase1", "fase2", "fase4", "fase5", "fase3"]
  };

  var UPGRADE_PRIORITARIO = {
    frizz: "fase4", quebra: "fase3", couro: "fase1", cor: "fase2", corte: "fase1"
  };

  var VISAGISMO = {
    oval: { corte_f: "repicados suaves e franjas laterais", corte_m: "praticamente qualquer corte funciona — é o formato mais versátil", evitar: "poucas restrições reais" },
    redondo: { corte_f: "comprimento abaixo do queixo, camadas e franja lateral, para alongar o rosto", corte_m: "topo com mais volume e laterais mais curtas (fade), para alongar visualmente", evitar: "cortes arredondados e curtos, que reforçam a largura" },
    quadrado: { corte_f: "franjas diagonais e cortes arredondados, para suavizar os ângulos", corte_m: "barba com linhas suaves (não retas) e topo com movimento", evitar: "cortes muito retos e simétricos, que acentuam os ângulos" },
    triangular: { corte_f: "camadas no topo e volume lateral, para equilibrar a base mais larga", corte_m: "barba mais cheia no queixo/mandíbula compensa a testa mais estreita", evitar: "cortes colados na lateral inferior, que reforçam a base larga" },
    coracao: { corte_f: "franjas leves e camadas ao redor do queixo, para equilibrar a testa larga", corte_m: "barba cheia, mais volume no queixo, testa com corte mais próximo", evitar: "muito volume no topo, que alarga ainda mais a testa" },
    retangular: { corte_f: "camadas com movimento nas laterais, evitando muito comprimento liso", corte_m: "topo curto a médio, laterais com mais presença, para quebrar o alongamento", evitar: "cortes muito lisos e longos sem camada, que alongam ainda mais" }
  };

  var CORES_INFO = {
    loiro_esverdeado: { temperatura: "frio" }, cream_soda: { temperatura: "neutro" },
    luzes_cidra: { temperatura: "quente" }, loiro_champanhe: { temperatura: "frio" },
    mocha_mousse: { temperatura: "quente" }, vermelho_cobre: { temperatura: "quente" },
    preto_intenso: { temperatura: "neutro" }
  };
  var ALTERNATIVA_POR_SUBTOM = {
    quente: "luzes de cidra, mocha mousse ou vermelho cobre",
    frio: "loiro champanhe ou loiro esverdeado",
    neutro: "praticamente qualquer uma das opções da lista, incluindo preto intenso"
  };
  var NOME_COR = {
    loiro_esverdeado: "loiro esverdeado (lemon platinum)", cream_soda: "cream soda",
    luzes_cidra: "luzes de cidra", loiro_champanhe: "loiro champanhe",
    mocha_mousse: "mocha mousse", vermelho_cobre: "vermelho cobre", preto_intenso: "preto intenso"
  };

  // Ficha técnica por produto — conteúdo ilustrativo baseado nas tendências
  // já pesquisadas (J8_BUSINESS_PLAN.md, Seção 7). Substituir por dados reais
  // do fornecedor/INCI definitivo antes de uso comercial.
  var FICHA_TECNICA = {
    fase1: {
      descricao: "Esfoliante de couro cabeludo com ação de limpeza profunda — remove resíduo e oleosidade acumulada antes do início do protocolo (lógica de scalp skinification).",
      modoUso: [
        "Aplicar no couro cabeludo seco ou levemente húmido.",
        "Massajar em movimentos circulares durante 2–3 minutos.",
        "Deixar atuar 3 minutos.",
        "Enxaguar bem antes do shampoo. Uso recomendado: 1x/semana durante a Fase 1."
      ],
      ingredientes: ["Ácido salicílico (baixa concentração)", "Niacinamida", "Mentol"],
      beneficios: ["Remove acúmulo de produto e oleosidade", "Prepara o couro cabeludo para melhor absorção nas fases seguintes"],
      evitarSe: ["Couro cabeludo com feridas ou irritação ativa", "Mesma semana de alisamento térmico"],
      rendimento: "Frasco de 100 ml, ~5 ml por uso, 1x/semana → rende aproximadamente 20 semanas (~4,5 meses) até a próxima compra."
    },
    fase2: {
      descricao: "Shampoo + condicionador de baixo poder residual — hidratação de base sem pesar o fio, antes de qualquer reconstrução.",
      modoUso: [
        "Shampoo: massajar no couro cabeludo, 2–3x por semana.",
        "Condicionador: aplicar do comprimento às pontas, deixar atuar 2–3 minutos.",
        "Enxaguar bem."
      ],
      ingredientes: ["Ceramidas vegetais", "Aminoácidos biomiméticos", "Complexo hidratante"],
      beneficios: ["Hidrata sem criar acúmulo", "Prepara a fibra para a reconstrução da Fase 3"],
      evitarSe: ["Sem enxague completo do produto da Fase 1"],
      rendimento: "Kit shampoo (250 ml) + condicionador (200 ml), ~10 ml por uso, 3x/semana → rende aproximadamente 8 semanas (~2 meses) até a próxima compra."
    },
    fase3: {
      descricao: "Máscara concentrada com ativos de reconstrução, indicada para dano estrutural e quebra.",
      modoUso: [
        "Aplicar do meio às pontas, após a lavagem.",
        "Deixar atuar 10–15 minutos (seguir indicação da embalagem).",
        "Enxaguar bem. Frequência: normalmente 1x por ciclo de 6 semanas — não repetir sem necessidade."
      ],
      ingredientes: ["Peptídeos reconstrutores", "Complexo proteico", "Ácido hialurônico"],
      beneficios: ["Repõe massa capilar", "Reduz sensação de quebra ao toque"],
      evitarSe: ["Fio já rígido ao toque (sinal de excesso de proteína — ver princípio de honestidade)", "Uso repetido antes de novo ciclo"],
      rendimento: "Bisnaga de 200 ml, ~20 ml por uso, 1x por ciclo de 6 semanas → rende aproximadamente 10 ciclos (~14 meses) até a próxima compra."
    },
    fase4: {
      descricao: "Leave-in/óleo selador — brilho, proteção e redução de frizz, sempre após a hidratação de base.",
      modoUso: [
        "Aplicar em cabelo limpo e já hidratado (nunca antes da Fase 2).",
        "Poucas gotas do meio às pontas.",
        "Não enxaguar."
      ],
      ingredientes: ["Óleos vegetais leves", "Vitaminas antioxidantes"],
      beneficios: ["Sela a cutícula", "Reduz frizz visível"],
      evitarSe: ["Fibra ainda desidratada — risco de selar o ressecamento para dentro"],
      rendimento: "Frasco de 100 ml, ~2 ml por uso, uso diário → rende aproximadamente 7 semanas (~1,5 mês) até a próxima compra."
    },
    fase5: {
      descricao: "Ampola concentrada de manutenção — mantém o resultado do ciclo sem repetir o protocolo inteiro.",
      modoUso: [
        "Aplicar a cada 2–4 semanas, no couro cabeludo ou comprimento conforme objetivo.",
        "Sem enxague."
      ],
      ingredientes: ["Peptídeos", "Ativos bio-fermentados (ex.: kombucha, ginseng)"],
      beneficios: ["Sustenta o ganho da Fase 3 sem novo ciclo completo"],
      evitarSe: ["Antes de completar a Fase 3 pela primeira vez"],
      rendimento: "Caixa com 4 ampolas, 1 ampola a cada 2–4 semanas → rende aproximadamente 2 a 4 meses até a próxima compra."
    }
  };

  function renderFichaTecnica(faseKey) {
    var ft = FICHA_TECNICA[faseKey];
    var html = '<div class="ficha-tecnica">';
    html += '<span class="brand-pill">' + BRAND.emoji + ' ' + BRAND.nome + '</span>';
    html += '<div class="media-placeholder">📷 Imagem ' + BRAND.nome + ' — substituir por foto real do fornecedor</div>';
    html += '<div class="media-placeholder video">▶ Vídeo demonstrativo de modo de uso — substituir por conteúdo real</div>';
    html += '<p class="ft-desc">' + ft.descricao + '</p>';
    html += '<strong class="ft-label">Como usar</strong><ol class="ft-list">';
    ft.modoUso.forEach(function (p) { html += "<li>" + p + "</li>"; });
    html += '</ol>';
    html += '<div class="banner ok" style="margin:8px 0;">📦 Plano de consumo: ' + ft.rendimento + '</div>';
    html += '<strong class="ft-label">Principais ingredientes</strong><div class="ft-tags">';
    ft.ingredientes.forEach(function (i) { html += '<span class="ft-tag">' + i + '</span>'; });
    html += '</div>';
    html += '<strong class="ft-label">Benefícios</strong><ul class="ft-list">';
    ft.beneficios.forEach(function (b) { html += "<li>" + b + "</li>"; });
    html += '</ul>';
    html += '<strong class="ft-label ft-warn">Não usar se</strong><ul class="ft-list ft-warn-list">';
    ft.evitarSe.forEach(function (e) { html += "<li>" + e + "</li>"; });
    html += '</ul>';
    html += '</div>';
    return html;
  }

  function rotuloObjetivo(o) {
    return {
      frizz: "frizz e ausência de definição da fibra",
      quebra: "dano estrutural e quebra",
      couro: "alteração do couro cabeludo",
      cor: "alteração de coloração",
      corte: "redesenho de corte"
    }[o] || o;
  }

  // ============================================================
  // 4. Seleção de chips (objetivo / gênero / subtom)
  // ============================================================
  var selecoes = { objetivo: null, genero: null, subtom: null };

  document.querySelectorAll(".options").forEach(function (group) {
    var key = group.getAttribute("data-group");
    group.querySelectorAll(".opt").forEach(function (opt) {
      opt.addEventListener("click", function () {
        group.querySelectorAll(".opt").forEach(function (o) { o.classList.remove("selected"); });
        opt.classList.add("selected");
        selecoes[key] = opt.getAttribute("data-value");
      });
    });
  });

  // ============================================================
  // 5. Estado do carrinho livre (sem gate de orçamento)
  // ============================================================
  // carrinho.fases[faseKey] = { incluido: bool, tier: 'essential'|'clinical' }
  // carrinho.servicos[servicoKey] = bool
  //
  // Persistência: guardado no localStorage do navegador, para o carrinho
  // sobreviver a recarregar a página, trocar de separador (Nova avaliação /
  // Minha ficha / Agenda) ou fechar e reabrir o browser — só é limpo se a
  // cliente sair (logout) ou limpar os dados do navegador.
  var CARRINHO_STORAGE_KEY = "j8_carrinho_v1";

  function carregarCarrinhoSalvo() {
    try {
      var raw = window.localStorage.getItem(CARRINHO_STORAGE_KEY);
      if (!raw) return { fases: {}, servicos: {} };
      var dados = JSON.parse(raw);
      return {
        fases: (dados && dados.fases) || {},
        servicos: (dados && dados.servicos) || {}
      };
    } catch (e) {
      return { fases: {}, servicos: {} };
    }
  }

  function salvarCarrinho() {
    try {
      window.localStorage.setItem(CARRINHO_STORAGE_KEY, JSON.stringify(carrinho));
    } catch (e) {
      // Se o localStorage não estiver disponível (ex: modo privado em alguns
      // navegadores), a app continua a funcionar, só sem persistência.
    }
  }

  var carrinho = carregarCarrinhoSalvo();
  var quizCompleto = false;

  function renderMenuProtocolo() {
    var objetivo = selecoes.objetivo || "frizz";
    var ordem = PRIORIDADE_POR_OBJETIVO[objetivo] || PRIORIDADE_POR_OBJETIVO.frizz;

    // ---------- grelha de produtos (estilo loja: badge, estrelas, imagem, bullets, CTA) ----------
    var html = '<div class="product-grid">';
    ordem.forEach(function (faseKey, idx) {
      if (!(faseKey in carrinho.fases)) {
        carrinho.fases[faseKey] = { incluido: idx < 4, tier: "essential" };
      }
      var item = carrinho.fases[faseKey];
      var cat = CATALOGO[faseKey];
      var ft = FICHA_TECNICA[faseKey];
      var precoAtual = cat[item.tier];
      var badge = cat.badge;
      if (!badge && faseKey === UPGRADE_PRIORITARIO[objetivo]) badge = "Recomendado para o seu objetivo";

      html +=
        '<div class="product-card ' + (item.incluido ? "in-cart" : "") + '" data-fase="' + faseKey + '">' +
        (badge ? '<div class="badge-ribbon">' + badge + '</div>' : '') +
        '<label class="pc-add">' +
        '<input type="checkbox" class="fase-check" data-fase="' + faseKey + '" ' + (item.incluido ? "checked" : "") + '>' +
        '<span class="pc-add-mark">✓</span>' +
        '</label>' +
        '<div class="media-placeholder pc-img">📷</div>' +
        '<span class="brand-pill">' + BRAND.emoji + ' ' + BRAND.nome + '</span>' +
        '<h3 class="pc-title">' + cat.nome + '</h3>' +
        '<div class="pc-rating">' + renderStars(cat.rating) + ' <span class="rating-num">' + cat.rating.toFixed(1) + '</span> <span class="rating-count">(' + cat.reviews + ' avaliações)</span></div>' +
        '<ul class="pc-bullets">' +
        ft.beneficios.slice(0, 2).map(function (b) { return "<li>" + b + "</li>"; }).join("") +
        '</ul>' +
        '<div class="pc-tier-row">' +
        '<span class="opt tier-opt ' + (item.tier === "essential" ? "selected" : "") + '" data-fase="' + faseKey + '" data-tier="essential">Essential ' + fmt(cat.essential) + '</span>' +
        '<span class="opt tier-opt ' + (item.tier === "clinical" ? "selected" : "") + '" data-fase="' + faseKey + '" data-tier="clinical">Clinical ' + fmt(cat.clinical) + '</span>' +
        '</div>' +
        '<div class="pc-price-row"><span class="pc-price">' + fmt(precoAtual) + '</span>' +
        (item.tier === "essential" ? '<span class="pc-upgrade">upgrade Clinical +' + fmt(cat.clinical - cat.essential) + '</span>' : '') +
        '</div>' +
        '<span class="ft-toggle" data-fase-ft="' + faseKey + '">Ver descrição completa &amp; ficha técnica ▾</span>' +
        '<div class="ft-container" id="ft-' + faseKey + '" style="display:none;">' + renderFichaTecnica(faseKey) + '</div>' +
        '</div>';
    });
    html += '</div>';

    // ---------- módulo "frequentemente escolhidas juntas" ----------
    var top3 = ordem.slice(0, 3);
    var precoCombo = top3.reduce(function (s, k) { return s + CATALOGO[k][carrinho.fases[k] ? carrinho.fases[k].tier : "essential"]; }, 0);
    html +=
      '<div class="bundle-module">' +
      '<h3 class="bundle-title">🛒 Frequentemente escolhidas juntas para esta queixa</h3>' +
      '<div class="bundle-items">' +
      top3.map(function (k) { return '<span class="bundle-chip">' + CATALOGO[k].nome.replace(/^Fase \d — /, "") + '</span>'; }).join('<span class="bundle-plus">+</span>') +
      '</div>' +
      '<div class="bundle-footer"><span>Total do combo: <strong>' + fmt(precoCombo) + '</strong></span>' +
      '<button type="button" class="cta secondary" id="addBundleBtn" style="width:auto;padding:8px 16px;font-size:13px;">Adicionar as 3 ao carrinho</button></div>' +
      '</div>';

    html += '<h3 style="font-size:13.5px;margin:22px 0 8px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.03em;">Serviços em salão parceiro</h3>';
    html += '<div class="product-grid">';

    var servicosDefault = {
      diagnostico: true,
      corte: objetivo === "corte",
      coloracao: objetivo === "cor"
    };
    Object.keys(SERVICOS).forEach(function (key) {
      if (!(key in carrinho.servicos)) carrinho.servicos[key] = servicosDefault[key];
      var marcado = carrinho.servicos[key];
      var s = SERVICOS[key];
      html +=
        '<div class="product-card ' + (marcado ? "in-cart" : "") + '" data-servico="' + key + '">' +
        '<label class="pc-add">' +
        '<input type="checkbox" class="servico-check" data-servico="' + key + '" ' + (marcado ? "checked" : "") + '>' +
        '<span class="pc-add-mark">✓</span>' +
        '</label>' +
        '<div class="media-placeholder pc-img">💇</div>' +
        '<h3 class="pc-title">' + s.nome + '</h3>' +
        '<div class="pc-rating">' + renderStars(s.rating) + ' <span class="rating-num">' + s.rating.toFixed(1) + '</span> <span class="rating-count">(' + s.reviews + ' avaliações)</span></div>' +
        '<div class="pc-price-row"><span class="pc-price">' + fmt(s.preco) + '</span></div>' +
        '</div>';
    });
    html += '</div>';

    document.getElementById("menuProtocolo").innerHTML = html;

    var bundleBtn = document.getElementById("addBundleBtn");
    if (bundleBtn) {
      bundleBtn.addEventListener("click", function () {
        top3.forEach(function (k) { carrinho.fases[k].incluido = true; });
        renderMenuProtocolo();
      });
    }

    // listeners
    document.querySelectorAll(".fase-check").forEach(function (cb) {
      cb.addEventListener("change", function () {
        carrinho.fases[cb.getAttribute("data-fase")].incluido = cb.checked;
        atualizarTotalCarrinho();
      });
    });
    document.querySelectorAll(".tier-opt").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var fase = chip.getAttribute("data-fase");
        var tier = chip.getAttribute("data-tier");
        carrinho.fases[fase].tier = tier;
        renderMenuProtocolo();
        atualizarTotalCarrinho();
      });
    });
    document.querySelectorAll(".servico-check").forEach(function (cb) {
      cb.addEventListener("change", function () {
        carrinho.servicos[cb.getAttribute("data-servico")] = cb.checked;
        atualizarTotalCarrinho();
      });
    });
    document.querySelectorAll(".ft-toggle").forEach(function (link) {
      link.addEventListener("click", function () {
        var key = link.getAttribute("data-fase-ft");
        var box = document.getElementById("ft-" + key);
        var abrindo = box.style.display === "none";
        box.style.display = abrindo ? "block" : "none";
        link.textContent = abrindo ? "Ocultar ficha técnica ▴" : "Ver ficha técnica ▾";
      });
    });

    atualizarTotalCarrinho();
  }

  function totalCarrinho() {
    var total = 0;
    Object.keys(carrinho.fases).forEach(function (k) {
      var f = carrinho.fases[k];
      if (f.incluido) total += CATALOGO[k][f.tier];
    });
    Object.keys(carrinho.servicos).forEach(function (k) {
      if (carrinho.servicos[k]) total += SERVICOS[k].preco;
    });
    return total;
  }

  function atualizarTotalCarrinho() {
    salvarCarrinho();
    renderGamificacao();
    document.getElementById("carrinhoTotalBox").innerHTML =
      "<strong>Total das possibilidades selecionadas: " + fmt(totalCarrinho()) +
      "</strong> — sem limite de orçamento aplicado. Ajuste livremente o que faz sentido oferecer.";

    var totalEUR = totalCarrinho();
    var btn = document.getElementById("enviarCarrinhoWhatsappBtn");
    if (btn) {
      if (totalEUR <= 0) {
        btn.style.display = "none";
      } else {
        btn.style.display = "inline-block";
        var desc = aplicarDesconto(totalEUR);
        var linhas = [];
        linhas.push("Olá! Vim da avaliação J8 e quero fechar este pedido:");
        linhas.push("");
        Object.keys(carrinho.fases).forEach(function (k) {
          var f = carrinho.fases[k];
          if (f.incluido) {
            linhas.push("• " + CATALOGO[k].nome + " (" + (f.tier === "clinical" ? "Clinical" : "Essential") + ") — " + fmt(CATALOGO[k][f.tier]));
          }
        });
        Object.keys(carrinho.servicos).forEach(function (k) {
          if (carrinho.servicos[k]) linhas.push("• " + SERVICOS[k].nome + " — " + fmt(SERVICOS[k].preco));
        });
        linhas.push("");
        linhas.push("Subtotal: " + fmt(totalEUR));
        linhas.push("Desconto de boas-vindas (código " + DESCONTO_WHATSAPP.codigo + ", -" + DESCONTO_WHATSAPP.percentagem + "%): -" + fmt(desc.valorEUR));
        linhas.push("Total: " + fmt(desc.totalComDescontoEUR));
        btn.href = linkWhatsApp(linhas.join("\n"));
      }
    }
  }

  // ============================================================
  // 5.5 Gamificação — pontos, barra de progresso e conquistas
  // ============================================================
  // Puramente cosmético/motivacional (não altera preços nem promete
  // descontos além do desconto de boas-vindas do WhatsApp já existente).
  var CONQUISTAS = [
    { id: "diag", emoji: "🌟", label: "Diagnóstico feito", check: function () { return quizCompleto; } },
    { id: "inicio", emoji: "🔥", label: "Protocolo em construção", check: function () { return contarFasesNoCarrinho() >= 1; } },
    { id: "combo", emoji: "💎", label: "Combo iniciado", check: function () { return contarFasesNoCarrinho() >= 3; } },
    { id: "completo", emoji: "👑", label: "Protocolo completo", check: function () { return contarFasesNoCarrinho() >= Object.keys(CATALOGO).length; } }
  ];

  function contarFasesNoCarrinho() {
    return Object.keys(carrinho.fases).filter(function (k) { return carrinho.fases[k].incluido; }).length;
  }

  function renderGamificacao() {
    var bar = document.getElementById("gamifyBar");
    if (!bar) return;
    var totalFases = Object.keys(CATALOGO).length;
    var fasesFeitas = contarFasesNoCarrinho();
    var percent = Math.min(100, Math.round((fasesFeitas / totalFases) * 100));
    var pontos = Math.round(totalCarrinho()) + (quizCompleto ? 20 : 0);

    var html = '<div class="gamify-top">' +
      '<div class="gamify-points">✨ <span class="gp-num">' + pontos + '</span> pontos J8</div>' +
      '<div class="gamify-hint">' + fasesFeitas + '/' + totalFases + ' fases do protocolo escolhidas</div>' +
      '</div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + percent + '%;"></div></div>' +
      '<div class="badge-row">';
    CONQUISTAS.forEach(function (c) {
      var desbloqueada = c.check();
      html += '<span class="badge-chip' + (desbloqueada ? "" : " locked") + '">' + c.emoji + " " + c.label + "</span>";
    });
    html += "</div>";
    bar.innerHTML = html;
  }

  // ============================================================
  // 6. Harmonia (visagismo + colorimetria)
  // ============================================================
  function renderHarmonia() {
    var genero = selecoes.genero || "feminino";
    var subtom = selecoes.subtom || "neutro";
    var formato = document.getElementById("formatoRosto").value;
    var corDesejada = document.getElementById("corDesejada").value;

    var vis = VISAGISMO[formato];
    var corteTxt = genero === "masculino" ? vis.corte_m : vis.corte_f;
    document.getElementById("harmoniaCorte").innerHTML =
      '<div class="banner harmonia-bom"><strong>Corte / ' + (genero === "masculino" ? "barba" : "franja") +
      ':</strong> para rosto ' + formato + ', costuma harmonizar melhor: ' + corteTxt +
      '. Evitar, se possível: ' + vis.evitar + '.</div>';

    var htmlCor;
    if (corDesejada) {
      var temp = CORES_INFO[corDesejada].temperatura;
      var nomeCor = NOME_COR[corDesejada];
      var combina = temp === subtom || temp === "neutro" || subtom === "neutro";
      if (combina) {
        htmlCor = '<div class="banner harmonia-bom"><strong>Cor em avaliação (' + nomeCor +
          '):</strong> harmoniza bem com o subtom informado. Sem necessidade de ajuste técnico.</div>';
      } else {
        htmlCor = '<div class="banner harmonia-nao"><strong>Cor em avaliação (' + nomeCor +
          '):</strong> com subtom ' + subtom + ', tende a competir com o tom de pele — não é contraindicação absoluta, ' +
          'é a decisão final da cliente, mas a alternativa que costuma harmonizar mais é: ' +
          ALTERNATIVA_POR_SUBTOM[subtom] + '.</div>';
      }
    } else {
      htmlCor = '<div class="banner harmonia-ajuste">Nenhuma direção de coloração definida — com base no subtom (' +
        subtom + '), as opções que tendem a harmonizar mais são: ' + ALTERNATIVA_POR_SUBTOM[subtom] + '.</div>';
    }
    document.getElementById("harmoniaCor").innerHTML = htmlCor;
  }

  // ============================================================
  // 7. Submissão do formulário de avaliação
  // ============================================================
  document.getElementById("quizForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!selecoes.objetivo) selecoes.objetivo = "frizz";
    if (!selecoes.genero) selecoes.genero = "feminino";
    if (!selecoes.subtom) selecoes.subtom = "neutro";

    carrinho = { fases: {}, servicos: {} }; // reinicia a cada nova avaliação
    quizCompleto = true;
    renderHarmonia();
    renderMenuProtocolo();

    document.getElementById("resultado").style.display = "block";
    document.getElementById("blocoOrcamento").style.display = "none";
    document.getElementById("orcamentoResultado").style.display = "none";
    document.getElementById("salvarFichaMsg").innerHTML = "";
    document.getElementById("resultado").scrollIntoView({ behavior: "smooth", block: "start" });
    renderGamificacao();
  });

  // ============================================================
  // 8. Guardar avaliação na ficha (backend)
  // ============================================================
  document.getElementById("salvarFichaBtn").addEventListener("click", function () {
    var itensSelecionados = [];
    Object.keys(carrinho.fases).forEach(function (k) {
      var f = carrinho.fases[k];
      if (f.incluido) {
        itensSelecionados.push({ nome: CATALOGO[k].nome, tier: f.tier, precoEUR: CATALOGO[k][f.tier] });
      }
    });
    Object.keys(carrinho.servicos).forEach(function (k) {
      if (carrinho.servicos[k]) {
        itensSelecionados.push({ nome: SERVICOS[k].nome, tier: "servico", precoEUR: SERVICOS[k].preco });
      }
    });

    var payload = {
      diagnostico: {
        objetivo: selecoes.objetivo,
        genero: selecoes.genero,
        subtom: selecoes.subtom,
        formatoRosto: document.getElementById("formatoRosto").value,
        corDesejada: document.getElementById("corDesejada").value || null
      },
      orcamento: {
        tipo: "carrinho_livre",
        itens: itensSelecionados,
        totalEUR: totalCarrinho()
      }
    };

    fetch("/api/ficha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        var msgBox = document.getElementById("salvarFichaMsg");
        if (!res.ok) {
          msgBox.innerHTML = '<div class="banner erro">' + (res.d.error || "Erro ao guardar.") + '</div>';
          return;
        }
        msgBox.innerHTML = '<div class="banner ok">Avaliação guardada na ficha da cliente.</div>';
      });
  });

  // ============================================================
  // 9. Orçamento fechado por limite de gasto (opcional, ao final)
  // ============================================================
  document.getElementById("ativarOrcamentoBtn").addEventListener("click", function () {
    var bloco = document.getElementById("blocoOrcamento");
    bloco.style.display = bloco.style.display === "none" ? "block" : "none";
  });

  var slider = document.getElementById("budgetSlider");
  var budgetValEl = document.getElementById("budgetVal");
  function budgetEUR() { return parseFloat(slider.value); }
  slider.addEventListener("input", function () {
    budgetValEl.textContent = fmt(budgetEUR());
  });
  budgetValEl.textContent = fmt(budgetEUR());

  document.getElementById("gerarOrcamentoBtn").addEventListener("click", function () {
    var objetivo = selecoes.objetivo || "frizz";
    var budget = budgetEUR();
    var ordem = PRIORIDADE_POR_OBJETIVO[objetivo] || PRIORIDADE_POR_OBJETIVO.frizz;
    var upgradeAlvo = UPGRADE_PRIORITARIO[objetivo] || "fase1";

    var itens = ordem.map(function (faseKey, idx) {
      return {
        key: faseKey, nome: CATALOGO[faseKey].nome, tier: "essential",
        preco: CATALOGO[faseKey].essential, obrigatoria: idx < 4
      };
    });

    var servicos = [];
    if (objetivo === "cor" || objetivo === "corte") {
      servicos.push({ nome: SERVICOS.diagnostico.nome, preco: SERVICOS.diagnostico.preco });
      if (objetivo === "corte") servicos.push({ nome: SERVICOS.corte.nome, preco: SERVICOS.corte.preco });
      if (objetivo === "cor") servicos.push({ nome: SERVICOS.coloracao.nome, preco: SERVICOS.coloracao.preco });
    }

    var itensFinais = itens.filter(function (i) { return i.obrigatoria; });
    function somaAtual() {
      var s = 0;
      itensFinais.forEach(function (i) { s += i.preco; });
      servicos.forEach(function (s2) { s += s2.preco; });
      return s;
    }
    var restante = budget - somaAtual();

    var upgradeFeito = false;
    var alvo = itensFinais.filter(function (i) { return i.key === upgradeAlvo; })[0];
    if (alvo && restante > 0) {
      var diff = CATALOGO[alvo.key].clinical - CATALOGO[alvo.key].essential;
      if (diff <= restante) {
        alvo.tier = "clinical"; alvo.preco = CATALOGO[alvo.key].clinical;
        restante -= diff; upgradeFeito = true;
      }
    }

    var faseExtra = itens.filter(function (i) { return !i.obrigatoria; })[0];
    var faseExtraAdicionada = false;
    if (faseExtra && faseExtra.preco <= restante) {
      itensFinais.push(faseExtra); restante -= faseExtra.preco; faseExtraAdicionada = true;
    }

    var boosterExtra = null;
    if (restante >= CATALOGO.fase5.essential) {
      boosterExtra = { nome: "Reserva — 2ª aplicação de Fase 5 (manutenção programada)", preco: CATALOGO.fase5.essential };
      restante -= boosterExtra.preco;
    }

    var totalGasto = budget - restante;

    var body = "";
    itensFinais.forEach(function (i) {
      var tagClass = i.tier === "clinical" ? "clinical" : "essential";
      var tagTxt = i.tier === "clinical" ? "Clinical" : "Essential";
      body += "<tr><td>" + i.nome + "<span class='tag " + tagClass + "'>" + tagTxt + "</span></td><td>Protocolo</td><td class='preco'>" + fmt(i.preco) + "</td></tr>";
    });
    servicos.forEach(function (s) {
      body += "<tr><td>" + s.nome + "<span class='tag servico'>Serviço</span></td><td>Salão parceiro</td><td class='preco'>" + fmt(s.preco) + "</td></tr>";
    });
    if (boosterExtra) {
      body += "<tr><td>" + boosterExtra.nome + "<span class='tag essential'>Essential</span></td><td>Manutenção</td><td class='preco'>" + fmt(boosterExtra.preco) + "</td></tr>";
    }
    body += "<tr class='subtotal'><td colspan='2'>Total dentro do limite informado</td><td class='preco'>" + fmt(totalGasto) + "</td></tr>";
    document.getElementById("orcamentoBody").innerHTML = body;

    document.getElementById("saldoBanner").innerHTML = restante > 1
      ? '<div class="banner ok">Saldo não alocado: <strong>' + fmt(restante) + '</strong>. Mostrado com transparência em vez de forçado.</div>'
      : '<div class="banner harmonia-ajuste">Limite praticamente todo direcionado ao que resolve a queixa principal.</div>';

    var linhas = [];
    linhas.push("ORÇAMENTO J8 — baseado na avaliação e no limite de " + fmt(budget));
    linhas.push("");
    linhas.push("✅ Essencial para a queixa (" + rotuloObjetivo(objetivo) + "): " + fmt(somaAtual()));
    itensFinais.filter(function (i) { return i.obrigatoria; }).forEach(function (i) {
      linhas.push("   → " + i.nome + (i.tier === "clinical" ? " (linha Clinical)" : ""));
    });
    servicos.forEach(function (s) { linhas.push("   → " + s.nome); });
    if (upgradeFeito) { linhas.push(""); linhas.push("⬆️ Sobrou orçamento — a fase mais relevante subiu para a linha Clinical."); }
    if (faseExtraAdicionada) { linhas.push(""); linhas.push("➕ Também coube: " + faseExtra.nome); }
    if (boosterExtra) { linhas.push(""); linhas.push("➕ Já cabe (recomendado, não obrigatório): " + boosterExtra.nome); }
    linhas.push("");
    linhas.push(restante > 1
      ? "💬 Sobrou " + fmt(restante) + " do limite — disponível para o próximo ciclo."
      : "💬 Limite praticamente todo direcionado à queixa principal.");

    var descOrc = aplicarDesconto(totalGasto);
    linhas.push("");
    linhas.push("Desconto de boas-vindas (código " + DESCONTO_WHATSAPP.codigo + ", -" + DESCONTO_WHATSAPP.percentagem + "%): -" + fmt(descOrc.valorEUR));
    linhas.push("Total com desconto: " + fmt(descOrc.totalComDescontoEUR));
    linhas.push("");
    linhas.push("Quero confirmar este pedido.");
    document.getElementById("whatsappPreview").textContent = linhas.join("\n");

    var linkBtn = document.getElementById("whatsappLinkBtn");
    if (linkBtn) linkBtn.href = linkWhatsApp(linhas.join("\n"));

    document.getElementById("orcamentoResultado").style.display = "block";

    // guarda também como parte da ficha, se o utilizador salvar depois
    window.__ultimoOrcamentoFechado = {
      tipo: "limite_fechado", budgetEUR: budget, totalEUR: totalGasto,
      itens: itensFinais.map(function (i) { return { nome: i.nome, tier: i.tier, precoEUR: i.preco }; }).concat(
        servicos.map(function (s) { return { nome: s.nome, tier: "servico", precoEUR: s.preco }; })
      )
    };
  });

  // ============================================================
  // 10. Ficha — histórico
  // ============================================================
  function renderFichaLista(fichas) {
    var box = document.getElementById("fichaLista");
    if (!fichas.length) {
      box.innerHTML = '<p class="sub">Ainda não há avaliações guardadas.</p>';
      return;
    }
    var html = "";
    fichas.forEach(function (f) {
      var data = new Date(f.criadoEm).toLocaleString("pt-PT");
      var d = f.diagnostico || {};
      html +=
        '<div class="ficha-item">' +
        '<div>' +
        '<strong>' + rotuloObjetivo(d.objetivo) + '</strong>' +
        '<div class="meta">' + data + ' · rosto ' + d.formatoRosto + ' · subtom ' + d.subtom + '</div>' +
        '</div>' +
        '<div class="total">' + fmt((f.orcamento && f.orcamento.totalEUR) || 0) + '</div>' +
        '<button class="cta danger" data-id="' + f.id + '" style="width:auto;padding:6px 12px;font-size:12px;">Remover</button>' +
        '</div>';
    });
    box.innerHTML = html;

    box.querySelectorAll("button[data-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        fetch("/api/ficha/" + btn.getAttribute("data-id"), { method: "DELETE" })
          .then(function () { return fetch("/api/ficha"); })
          .then(function (r) { return r.json(); })
          .then(function (d) { renderFichaLista(d.fichas || []); });
      });
    });
  }

  // ============================================================
  // 11. Agenda — profissionais parceiros e marcação de horário
  // ============================================================
  var profissionalSelecionado = null;

  function carregarProfissionais() {
    fetch("/api/profissionais")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var box = document.getElementById("listaProfissionais");
        var html = "";
        d.profissionais.forEach(function (p) {
          html += '<div class="prof-card" data-prof="' + p.id + '">' +
            '<h3>' + p.nome + '</h3><p>' + p.especialidade + '</p></div>';
        });
        box.innerHTML = html;
        box.querySelectorAll(".prof-card").forEach(function (card) {
          card.addEventListener("click", function () {
            box.querySelectorAll(".prof-card").forEach(function (c) { c.classList.remove("selected"); });
            card.classList.add("selected");
            profissionalSelecionado = card.getAttribute("data-prof");
            carregarSlots(profissionalSelecionado);
          });
        });
      });
  }

  function carregarSlots(profissionalId) {
    fetch("/api/agenda/horarios?profissionalId=" + encodeURIComponent(profissionalId))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        document.getElementById("slotsBox").style.display = "block";
        var grid = document.getElementById("slotGrid");
        var html = "";
        (d.horarios || []).slice(0, 24).forEach(function (iso) {
          var dt = new Date(iso);
          var label = dt.toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "2-digit" }) +
            " " + dt.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
          html += '<div class="slot-btn" data-horario="' + iso + '">' + label + '</div>';
        });
        grid.innerHTML = html || '<p class="sub">Sem horários disponíveis de momento.</p>';
        grid.querySelectorAll(".slot-btn").forEach(function (btn) {
          btn.addEventListener("click", function () {
            marcarHorario(profissionalId, btn.getAttribute("data-horario"));
          });
        });
      });
  }

  function marcarHorario(profissionalId, horarioISO) {
    var servico = document.getElementById("servicoMarcacao").value;
    fetch("/api/agenda/marcar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profissionalId: profissionalId, horarioISO: horarioISO, servico: servico })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        var msg = document.getElementById("marcarMsg");
        if (!res.ok) {
          msg.innerHTML = '<div class="banner erro">' + (res.d.error || "Erro ao marcar.") + '</div>';
          return;
        }
        msg.innerHTML = '<div class="banner ok">Marcação confirmada — ' + new Date(horarioISO).toLocaleString("pt-PT") + '.</div>';
        carregarSlots(profissionalId);
        carregarMinhasMarcacoes();
      });
  }

  function carregarMinhasMarcacoes() {
    fetch("/api/agenda/minhas")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var box = document.getElementById("minhasMarcacoes");
        var lista = d.marcacoes || [];
        if (!lista.length) {
          box.innerHTML = '<p class="sub">Sem marcações ainda.</p>';
          return;
        }
        var html = "";
        lista
          .sort(function (a, b) { return new Date(a.horarioISO) - new Date(b.horarioISO); })
          .forEach(function (m) {
            html += '<div class="ficha-item">' +
              '<div><strong>' + m.servico + '</strong><div class="meta">' + m.profissionalNome + ' · ' +
              new Date(m.horarioISO).toLocaleString("pt-PT") + '</div></div>' +
              '<button class="cta danger" data-cancel="' + m.id + '" style="width:auto;padding:6px 12px;font-size:12px;">Cancelar</button>' +
              '</div>';
          });
        box.innerHTML = html;
        box.querySelectorAll("button[data-cancel]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            fetch("/api/agenda/" + btn.getAttribute("data-cancel"), { method: "DELETE" })
              .then(function () { carregarMinhasMarcacoes(); if (profissionalSelecionado) carregarSlots(profissionalSelecionado); });
          });
        });
      });
  }

  // ============================================================
  // 12. Pedidos de produtos (revenda)
  // ============================================================
  document.getElementById("finalizarPedidoBtn").addEventListener("click", function () {
    var itens = [];
    Object.keys(carrinho.fases || {}).forEach(function (k) {
      var f = carrinho.fases[k];
      if (f.incluido) itens.push({ nome: CATALOGO[k].nome, tier: f.tier, precoEUR: CATALOGO[k][f.tier] });
    });

    var msg = document.getElementById("pedidoMsg");
    if (!itens.length) {
      msg.innerHTML = '<div class="banner erro">Nenhum item de produto selecionado — faça uma avaliação primeiro (aba "Nova avaliação") e marque as fases desejadas.</div>';
      return;
    }

    var totalEUR = itens.reduce(function (s, i) { return s + i.precoEUR; }, 0);
    fetch("/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itens: itens, totalEUR: totalEUR })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) {
          msg.innerHTML = '<div class="banner erro">' + (res.d.error || "Erro ao criar pedido.") + '</div>';
          return;
        }
        msg.innerHTML = '<div class="banner ok">Pedido registado como pendente — total ' + fmt(res.d.pedido.totalEUR) + '.</div>';
        carregarPedidos();
      });
  });

  function carregarPedidos() {
    fetch("/api/pedidos")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var box = document.getElementById("listaPedidos");
        var lista = d.pedidos || [];
        if (!lista.length) {
          box.innerHTML = '<p class="sub">Sem pedidos ainda.</p>';
          return;
        }
        var html = "";
        lista.forEach(function (p) {
          html += '<div class="ficha-item">' +
            '<div><strong>' + p.itens.length + ' item(ns) · estado: ' + p.status + '</strong>' +
            '<div class="meta">' + new Date(p.criadoEm).toLocaleString("pt-PT") + '</div></div>' +
            '<div class="total">' + fmt(p.totalEUR) + '</div>' +
            '<button class="cta danger" data-pedido="' + p.id + '" style="width:auto;padding:6px 12px;font-size:12px;">Remover</button>' +
            '</div>';
        });
        box.innerHTML = html;
        box.querySelectorAll("button[data-pedido]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            fetch("/api/pedidos/" + btn.getAttribute("data-pedido"), { method: "DELETE" })
              .then(function () { carregarPedidos(); });
          });
        });
      });
  }
})();

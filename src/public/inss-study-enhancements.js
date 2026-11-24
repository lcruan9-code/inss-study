(() => {
  const THEME_KEY = "inss-study-theme";
  const STUDY_KEY = "inss-previdenciario-progress-v1";
  const VIDEO_KEY = "inss-video-verification-v1";
  const darkByDefault = true;
  let themeButton = null;
  let studyData = null;
  let currentTab = "constitution";
  let activeSpeech = null;
  let activeTestPlayer = null;
  let activeTestTimer = null;

  function readStore(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; }
    catch (_) { return fallback; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }
  function applyTheme(isDark) {
    document.body.classList.toggle("dark-mode", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    if (themeButton) {
      themeButton.textContent = isDark ? "☀ Tema claro" : "☾ Tema escuro";
      themeButton.setAttribute("aria-pressed", String(isDark));
      themeButton.title = isDark ? "Alternar para tema claro" : "Alternar para tema escuro";
    }
    try { localStorage.setItem(THEME_KEY, isDark ? "dark" : "light"); } catch (_) {}
  }
  function setupThemeButton() {
    if (!themeButton) {
      themeButton = document.createElement("button");
      themeButton.type = "button";
      themeButton.className = "inss-theme-toggle";
      themeButton.addEventListener("click", function () {
        applyTheme(!document.body.classList.contains("dark-mode"));
      });
    }
    const topbar = document.querySelector(".topbar");
    if (topbar && themeButton.parentElement !== topbar) {
      themeButton.classList.remove("is-floating");
      topbar.appendChild(themeButton);
    } else if (!topbar && themeButton.parentElement !== document.body) {
      themeButton.classList.add("is-floating");
      document.body.appendChild(themeButton);
    }
  }
  function makeButton(text, title, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("click", action);
    return button;
  }
  function setupVideoControls() {
    document.querySelectorAll(".video-frame:not([data-inss-controls])").forEach(function (frame) {
      const modal = frame.closest(".lesson-modal");
      if (!modal) return;
      frame.dataset.inssControls = "1";
      const tools = document.createElement("div");
      tools.className = "video-tools";
      tools.setAttribute("role", "group");
      tools.setAttribute("aria-label", "Controles de tamanho do vídeo");
      const expand = makeButton("↗ Ampliar vídeo", "Ampliar a janela do vídeo", function () {
        const expanded = modal.classList.toggle("video-expanded");
        expand.textContent = expanded ? "↙ Reduzir vídeo" : "↗ Ampliar vídeo";
      });
      const theater = makeButton("▣ Modo teatro", "Expandir o player e priorizar a visualização", function () {
        const active = modal.classList.toggle("theater-mode");
        theater.textContent = active ? "▣ Sair do teatro" : "▣ Modo teatro";
      });
      const fullscreen = makeButton("⛶ Tela cheia", "Abrir o vídeo em tela cheia", async function () {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else if (frame.requestFullscreen) await frame.requestFullscreen();
        } catch (_) {
          fullscreen.textContent = "Tela cheia indisponível";
        }
      });
      tools.append(expand, theater, fullscreen);
      frame.insertAdjacentElement("afterend", tools);
    });
  }

  function getStudyState() {
    return readStore(STUDY_KEY, { read: {}, attempts: {}, review: {} });
  }
  function saveStudyState(state) {
    writeStore(STUDY_KEY, state);
  }
  function openStudyHub() {
    if (document.getElementById("inss-study-hub")) return;
    fetch("/previdenciario-content.json", { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("Não foi possível carregar o conteúdo.");
        return response.json();
      })
      .then(function (data) {
        studyData = data;
        currentTab = "constitution";
        const overlay = document.createElement("div");
        overlay.id = "inss-study-hub";
        overlay.className = "inss-study-overlay";
        overlay.innerHTML =
          '<section class="inss-study-shell" role="dialog" aria-modal="true" aria-label="Estudo guiado de Direito Previdenciário">' +
            '<header class="inss-study-header"><div><small>INSS STUDY · TRILHA COMPLEMENTAR</small><h1>Direito Previdenciário</h1><p>Lei seca orientada, explicações, questões oficiais e revisão</p></div>' +
            '<button type="button" class="inss-study-close" data-close aria-label="Fechar">×</button></header>' +
            '<div class="inss-study-meta"><span>Conteúdo revisado em ' + escapeHtml(data.updatedAt) + '</span><span>Atualização jurídica não substitui a leitura da fonte oficial</span></div>' +
            '<div class="inss-study-tabs" role="tablist">' +
              '<button type="button" data-tab="constitution">Constituição</button>' +
              '<button type="button" data-tab="explanations">Explicações</button>' +
              '<button type="button" data-tab="questions">Questões oficiais</button>' +
              '<button type="button" data-tab="review">Revisão</button>' +
            '</div>' +
            '<div class="inss-study-tools"><span id="inss-study-progress"></span><div><button type="button" data-tts-pause>⏸ Pausar leitura</button><button type="button" data-tts-stop>■ Parar áudio</button></div></div>' +
            '<main class="inss-study-content"></main>' +
            '<footer class="inss-study-footer"><span>Progresso deste módulo salvo neste navegador.</span><span>Fontes oficiais no fim de cada conteúdo.</span></footer>' +
          '</section>';
        document.body.appendChild(overlay);
        overlay.addEventListener("click", handleHubClick);
        renderHub();
      })
      .catch(function (error) {
        alert((error && error.message) || "Erro ao abrir o estudo guiado.");
      });
  }
  function renderHub() {
    const root = document.querySelector("#inss-study-hub .inss-study-content");
    if (!root || !studyData) return;
    const state = getStudyState();
    const readCount = Object.keys(state.read || {}).filter(function (id) { return state.read[id]; }).length;
    const attemptCount = Object.keys(state.attempts || {}).length;
    const progress = document.getElementById("inss-study-progress");
    if (progress) progress.textContent = readCount + " leituras marcadas · " + attemptCount + " questões respondidas";
    document.querySelectorAll("#inss-study-hub [data-tab]").forEach(function (button) {
      button.classList.toggle("active", button.dataset.tab === currentTab);
      button.setAttribute("aria-selected", String(button.dataset.tab === currentTab));
    });
    if (currentTab === "constitution") root.innerHTML = renderConstitution(state);
    else if (currentTab === "explanations") root.innerHTML = renderExplanations();
    else if (currentTab === "questions") root.innerHTML = renderQuestions(state);
    else root.innerHTML = renderReview(state);
  }
  function renderConstitution(state) {
    let html = '<div class="inss-study-intro"><span class="inss-study-tag">LEITURA ORIENTADA</span><h2>Constituição Federal — Seguridade Social</h2>' +
      '<p>Comece pelos dispositivos centrais do edital. O texto abaixo é apresentado como lei seca para leitura e áudio; use o link do Planalto para conferir a consolidação integral e eventuais alterações posteriores.</p>' +
      '<a href="' + escapeHtml(studyData.sources[0].url) + '" target="_blank" rel="noopener noreferrer">Abrir Constituição compilada no Planalto ↗</a></div>';
    studyData.constitution.forEach(function (article) {
      const isRead = !!(state.read && state.read[article.id]);
      html += '<article class="inss-study-card inss-law-card"><div class="inss-study-card-head"><div><span class="inss-study-tag">' + escapeHtml(article.reference) + '</span><h3>' + escapeHtml(article.title) + '</h3></div><span class="inss-study-status ' + (isRead ? "done" : "") + '">' + (isRead ? "Leitura marcada" : "Pendente") + '</span></div>' +
        '<p class="inss-law-guide">' + escapeHtml(article.guide) + '</p><div class="inss-law-focus"><b>Observe durante a leitura</b><ul>' + article.focus.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("") + '</ul></div>' +
        '<details class="inss-law-details"><summary>Exibir texto integral deste artigo</summary><pre>' + escapeHtml(article.fullText) + '</pre></details>' +
        '<div class="inss-study-actions"><button type="button" data-read-article="' + escapeHtml(article.id) + '">▶ Ler artigo em voz alta</button><button type="button" data-mark-read="' + escapeHtml(article.id) + '">' + (isRead ? "Desmarcar leitura" : "Marcar como lido") + '</button><a href="' + escapeHtml(article.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Conferir texto oficial ↗</a></div></article>';
    });
    html += '<div class="inss-study-note"><b>Escopo desta primeira etapa:</b> arts. 194, 195 e 201. A leitura orientada será ampliada com os demais dispositivos constitucionais pertinentes à medida que os módulos do edital forem validados.</div>';
    return html;
  }
  function renderExplanations() {
    let html = '<div class="inss-study-intro"><span class="inss-study-tag">MATERIAL DIDÁTICO</span><h2>Explicações escritas</h2><p>As explicações abaixo são sínteses didáticas. A referência legal é indicada em cada módulo; em caso de divergência, prevalece o texto normativo consolidado.</p></div>';
    studyData.modules.forEach(function (module) {
      html += '<article class="inss-study-card"><span class="inss-study-tag">' + escapeHtml(module.syllabus) + '</span><h3>' + escapeHtml(module.title) + '</h3><p class="inss-study-objective">' + escapeHtml(module.objective) + '</p>';
      module.explanation.forEach(function (section) {
        html += '<section class="inss-study-explanation"><h4>' + escapeHtml(section.heading) + '</h4><p>' + escapeHtml(section.body) + '</p></section>';
      });
      html += '<div class="inss-study-lawrefs"><b>Leitura normativa:</b> ' + module.law.map(escapeHtml).join(" · ") + '</div><div class="inss-study-tasks"><b>Roteiro de estudo</b><ol>' + module.tasks.map(function (task) { return "<li>" + escapeHtml(task) + "</li>"; }).join("") + '</ol></div></article>';
    });
    html += '<div class="inss-study-card"><h3>Fontes utilizadas</h3><ul class="inss-source-list">' + studyData.sources.map(function (source) {
      return '<li><a href="' + escapeHtml(source.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(source.label) + '</a><small>' + escapeHtml(source.kind) + '</small></li>';
    }).join("") + '</ul></div>';
    return html;
  }
  function renderQuestions(state) {
    let html = '<div class="inss-study-intro"><span class="inss-study-tag">CEBRASPE · INSS 2022</span><h2>Questões oficiais aplicadas</h2><p>Os enunciados estão resumidos por paráfrase para orientar o estudo. Abra o caderno oficial para consultar a redação integral. O gabarito exibido é o definitivo; itens anulados não são tratados como certo ou errado.</p>' +
      '<a href="' + escapeHtml(studyData.sources[5].url) + '" target="_blank" rel="noopener noreferrer">Abrir caderno oficial ↗</a> · <a href="' + escapeHtml(studyData.sources[6].url) + '" target="_blank" rel="noopener noreferrer">Abrir gabarito definitivo ↗</a></div>';
    studyData.questions.forEach(function (question) {
      const attempt = state.attempts && state.attempts[question.id];
      const status = question.annulled ? "Anulada" : (attempt ? "Respondida" : "Não respondida");
      html += '<article class="inss-study-card inss-question-card"><div class="inss-question-head"><span class="inss-study-tag">ITEM ' + escapeHtml(question.item) + ' · PROVA OFICIAL</span><span class="inss-study-status ' + (question.annulled ? "annulled" : "") + '">' + status + '</span></div><p>' + escapeHtml(question.summary) + '</p>';
      if (question.annulled) {
        html += '<div class="inss-question-result annulled"><b>Item anulado — fora da pontuação</b><p>' + escapeHtml(question.explanation) + '</p></div>';
      } else if (attempt) {
        html += '<div class="inss-question-result ' + (attempt === question.answer ? "correct" : "wrong") + '"><b>Sua resposta: ' + attempt + ' · Gabarito: ' + question.answer + '</b><p>' + escapeHtml(question.explanation) + '</p></div>';
      } else {
        html += '<div class="inss-answer-actions"><button type="button" data-question-id="' + escapeHtml(question.id) + '" data-answer="C">Certo</button><button type="button" data-question-id="' + escapeHtml(question.id) + '" data-answer="E">Errado</button></div>';
      }
      html += '<div class="inss-study-lawrefs"><b>Base:</b> ' + escapeHtml(question.legal) + '</div><div class="inss-question-links"><a href="' + escapeHtml(question.examUrl) + '" target="_blank" rel="noopener noreferrer">Ver item no caderno original ↗</a><a href="' + escapeHtml(question.keyUrl) + '" target="_blank" rel="noopener noreferrer">Gabarito definitivo ↗</a></div></article>';
    });
    return html;
  }
  function renderReview(state) {
    const today = Date.now();
    const due = studyData.reviewCards.filter(function (card) {
      const item = state.review && state.review[card.id];
      return !item || !item.dueAt || new Date(item.dueAt).getTime() <= today;
    });
    let html = '<div class="inss-study-intro"><span class="inss-study-tag">REVISÃO ATIVA</span><h2>Cartões de revisão</h2><p>Responda mentalmente antes de revelar. “Rever amanhã” agenda o cartão para 1 dia; “Acertei” agenda para 3 dias. O agendamento fica salvo neste navegador.</p><b>' + due.length + ' cartão(ões) para revisar agora</b></div>';
    if (!due.length) html += '<div class="inss-study-card"><h3>Revisão em dia</h3><p>Não há cartões vencidos agora. Volte quando chegar a próxima revisão.</p></div>';
    due.forEach(function (card) {
      const revealed = !!(state.review && state.review[card.id] && state.review[card.id].revealed);
      html += '<article class="inss-study-card inss-review-card"><span class="inss-study-tag">CARTÃO DE REVISÃO</span><h3>' + escapeHtml(card.front) + '</h3>';
      if (revealed) {
        html += '<div class="inss-review-answer">' + escapeHtml(card.back) + '</div><div class="inss-study-actions"><button type="button" data-review-action="again" data-review-id="' + escapeHtml(card.id) + '">Rever amanhã</button><button type="button" data-review-action="easy" data-review-id="' + escapeHtml(card.id) + '">Acertei · 3 dias</button></div>';
      } else {
        html += '<button type="button" data-review-reveal="' + escapeHtml(card.id) + '">Revelar resposta</button>';
      }
      html += '</article>';
    });
    return html;
  }
  function handleHubClick(event) {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.hasAttribute("data-close")) {
      stopSpeech();
      const hub = document.getElementById("inss-study-hub");
      if (hub) hub.remove();
      return;
    }
    if (target.dataset.tab) {
      currentTab = target.dataset.tab;
      stopSpeech();
      renderHub();
      return;
    }
    if (target.hasAttribute("data-tts-pause")) {
      if (!window.speechSynthesis) return;
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) window.speechSynthesis.pause();
      else if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      return;
    }
    if (target.hasAttribute("data-tts-stop")) { stopSpeech(); return; }
    if (target.dataset.readArticle) {
      const article = studyData.constitution.find(function (item) { return item.id === target.dataset.readArticle; });
      if (article) speakText(article.fullText, article.title);
      return;
    }
    if (target.dataset.markRead) {
      const state = getStudyState();
      state.read = state.read || {};
      state.read[target.dataset.markRead] = !state.read[target.dataset.markRead];
      saveStudyState(state);
      renderHub();
      return;
    }
    if (target.dataset.questionId && target.dataset.answer) {
      const state = getStudyState();
      state.attempts = state.attempts || {};
      state.attempts[target.dataset.questionId] = target.dataset.answer;
      saveStudyState(state);
      renderHub();
      return;
    }
    if (target.dataset.reviewReveal) {
      const state = getStudyState();
      state.review = state.review || {};
      state.review[target.dataset.reviewReveal] = Object.assign({}, state.review[target.dataset.reviewReveal], { revealed: true });
      saveStudyState(state);
      renderHub();
      return;
    }
    if (target.dataset.reviewAction && target.dataset.reviewId) {
      const state = getStudyState();
      state.review = state.review || {};
      const days = target.dataset.reviewAction === "easy" ? 3 : 1;
      const dueAt = new Date(Date.now() + days * 86400000).toISOString();
      state.review[target.dataset.reviewId] = { revealed: false, dueAt: dueAt, lastReviewedAt: new Date().toISOString() };
      saveStudyState(state);
      renderHub();
    }
  }
  function speakText(text, title) {
    stopSpeech();
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      alert("A leitura em voz alta não está disponível neste navegador. Abra a lei no Planalto ou use o leitor de tela do dispositivo.");
      return;
    }
    activeSpeech = new SpeechSynthesisUtterance((title ? title + ". " : "") + text);
    activeSpeech.lang = "pt-BR";
    activeSpeech.rate = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(function (item) { return item.lang && item.lang.toLowerCase().startsWith("pt-br"); }) ||
      voices.find(function (item) { return item.lang && item.lang.toLowerCase().startsWith("pt"); });
    if (voice) activeSpeech.voice = voice;
    window.speechSynthesis.speak(activeSpeech);
  }
  function stopSpeech() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    activeSpeech = null;
  }

  function parseYoutubeId(url) {
    if (!url) return null;
    try {
      const parsed = new URL(url, window.location.href);
      if (parsed.hostname.includes("youtu.be")) return parsed.pathname.split("/").filter(Boolean)[0] || null;
      if (parsed.hostname.includes("youtube.com")) {
        if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || null;
      }
    } catch (_) {}
    return null;
  }
  function getVideoRecords() { return readStore(VIDEO_KEY, {}); }
  function setupVideoValidation() {
    document.querySelectorAll(".lesson-modal:not([data-inss-video-validation])").forEach(function (modal) {
      const links = modal.querySelector(".lesson-links");
      if (!links) return;
      const candidate = Array.from(links.querySelectorAll("a")).find(function (anchor) {
        return /Abrir vídeo sugerido|Abrir link candidato/i.test(anchor.textContent);
      });
      if (!candidate) return;
      const videoId = parseYoutubeId(candidate.href);
      if (!videoId) return;
      modal.dataset.inssVideoValidation = "1";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "inss-video-verify-button";
      button.textContent = "▶ Testar reprodução (10 s)";
      button.addEventListener("click", function () { startVideoTest(videoId, candidate.href); });
      links.appendChild(button);
      const status = document.createElement("div");
      status.className = "inss-video-local-status";
      status.dataset.videoId = videoId;
      links.insertAdjacentElement("afterend", status);
      updateVideoStatus(videoId, status);
    });
  }
  function updateVideoStatus(videoId, node) {
    if (!node) node = document.querySelector('.inss-video-local-status[data-video-id="' + videoId + '"]');
    if (!node) return;
    const record = getVideoRecords()[videoId];
    if (record && record.status === "REPRODUÇÃO CONFIRMADA") {
      node.textContent = "Reprodução confirmada neste navegador em " + new Date(record.verifiedAt).toLocaleString("pt-BR") + ". O cadastro central da aula ainda não foi alterado.";
      node.classList.add("verified");
    } else if (record && record.status === "FALHA NA INCORPORAÇÃO") {
      node.textContent = "Falha na incorporação no último teste. O link permanece pendente de validação.";
      node.classList.remove("verified");
    } else {
      node.textContent = "Status: PENDENTE — abrir o link ou carregar o player não valida a reprodução.";
      node.classList.remove("verified");
    }
  }
  function ensureYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      const oldCallback = window.onYouTubeIframeAPIReady;
      let settled = false;
      const finish = function () {
        if (settled) return;
        settled = true;
        if (typeof oldCallback === "function") {
          try { oldCallback(); } catch (_) {}
        }
        resolve();
      };
      window.onYouTubeIframeAPIReady = finish;
      let script = document.getElementById("youtube-iframe-api");
      if (!script) {
        script = document.createElement("script");
        script.id = "youtube-iframe-api";
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
      window.setTimeout(function () {
        if (!settled) {
          settled = true;
          reject(new Error("A API de reprodução do YouTube não respondeu."));
        }
      }, 20000);
    });
  }
  function startVideoTest(videoId, url) {
    closeVideoTest();
    const modal = document.createElement("div");
    modal.id = "inss-video-test";
    modal.className = "inss-video-test-overlay";
    modal.innerHTML = '<section class="inss-video-test-shell"><header><div><small>VERIFICAÇÃO DE LINK</small><h2>Teste real de reprodução</h2></div><button type="button" data-test-close aria-label="Fechar">×</button></header>' +
      '<p>Para validar, o YouTube precisa informar que o vídeo está reproduzindo e o contador precisa registrar pelo menos 10 segundos efetivos. Se a incorporação falhar, o link não será validado.</p>' +
      '<div id="inss-video-test-player"></div><div class="inss-video-test-status">Aguardando o player…</div><div class="inss-video-test-count">0 / 10 segundos reproduzidos</div>' +
      '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">Abrir vídeo original no YouTube ↗</a></section>';
    document.body.appendChild(modal);
    modal.addEventListener("click", function (event) {
      if (event.target.hasAttribute("data-test-close") || event.target === modal) closeVideoTest();
    });
    ensureYouTubeApi().then(function () {
      if (!document.getElementById("inss-video-test-player")) return;
      activeTestPlayer = new window.YT.Player("inss-video-test-player", {
        width: "100%",
        height: "100%",
        videoId: videoId,
        playerVars: { autoplay: 0, controls: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: function () {
            const status = modal.querySelector(".inss-video-test-status");
            if (status) status.textContent = "Player carregado. Pressione play e mantenha a reprodução por 10 segundos.";
          },
          onStateChange: function (event) {
            if (event.data === 1 && !activeTestTimer) {
              const status = modal.querySelector(".inss-video-test-status");
              if (status) status.textContent = "Reproduzindo… contando apenas o tempo efetivo de reprodução.";
              activeTestTimer = window.setInterval(function () {
                if (!activeTestPlayer || typeof activeTestPlayer.getPlayerState !== "function") return;
                if (activeTestPlayer.getPlayerState() === 1) {
                  const count = Number(modal.dataset.playedSeconds || 0) + 1;
                  modal.dataset.playedSeconds = String(count);
                  const counter = modal.querySelector(".inss-video-test-count");
                  if (counter) counter.textContent = count + " / 10 segundos reproduzidos";
                  if (count >= 10) {
                    const records = getVideoRecords();
                    records[videoId] = { status: "REPRODUÇÃO CONFIRMADA", verifiedAt: new Date().toISOString(), playedSeconds: count, url: url };
                    writeStore(VIDEO_KEY, records);
                    if (status) status.textContent = "REPRODUÇÃO CONFIRMADA neste navegador. O cadastro central ainda não foi alterado.";
                    window.clearInterval(activeTestTimer);
                    activeTestTimer = null;
                    document.querySelectorAll('.inss-video-local-status[data-video-id="' + videoId + '"]').forEach(function (node) { updateVideoStatus(videoId, node); });
                  }
                }
              }, 1000);
            } else if (event.data !== 1 && activeTestTimer) {
              window.clearInterval(activeTestTimer);
              activeTestTimer = null;
              const status = modal.querySelector(".inss-video-test-status");
              if (status && Number(modal.dataset.playedSeconds || 0) < 10) status.textContent = "Reprodução pausada ou encerrada antes de 10 segundos. Ainda não validado.";
            }
          },
          onError: function (event) {
            const records = getVideoRecords();
            records[videoId] = { status: "FALHA NA INCORPORAÇÃO", errorCode: event.data, testedAt: new Date().toISOString(), url: url };
            writeStore(VIDEO_KEY, records);
            const status = modal.querySelector(".inss-video-test-status");
            if (status) status.textContent = "Falha de incorporação do YouTube (código " + event.data + "). O link permanece pendente.";
            document.querySelectorAll('.inss-video-local-status[data-video-id="' + videoId + '"]').forEach(function (node) { updateVideoStatus(videoId, node); });
          }
        }
      });
    }).catch(function (error) {
      const status = modal.querySelector(".inss-video-test-status");
      if (status) status.textContent = error.message + " O link permanece pendente.";
    });
  }
  function closeVideoTest() {
    if (activeTestTimer) window.clearInterval(activeTestTimer);
    activeTestTimer = null;
    if (activeTestPlayer && typeof activeTestPlayer.destroy === "function") {
      try { activeTestPlayer.destroy(); } catch (_) {}
    }
    activeTestPlayer = null;
    const modal = document.getElementById("inss-video-test");
    if (modal) modal.remove();
  }
  function setupStudyButton() {
    const nav = document.querySelector(".side-nav");
    if (!nav || document.getElementById("inss-previdenciario-nav")) return;
    const button = document.createElement("button");
    button.id = "inss-previdenciario-nav";
    button.type = "button";
    button.className = "inss-study-nav";
    button.innerHTML = '<span aria-hidden="true">⚖</span><b>Estudo guiado</b>';
    button.title = "Abrir trilha de Direito Previdenciário";
    button.addEventListener("click", openStudyHub);
    nav.appendChild(button);
  }

  function init() {
    let storedTheme = null;
    try { storedTheme = localStorage.getItem(THEME_KEY); } catch (_) {}
    applyTheme(storedTheme ? storedTheme === "dark" : darkByDefault);
    setupThemeButton();
    setupVideoControls();
    setupStudyButton();
    setupVideoValidation();
    const observer = new MutationObserver(function () {
      setupThemeButton();
      setupVideoControls();
      setupStudyButton();
      setupVideoValidation();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
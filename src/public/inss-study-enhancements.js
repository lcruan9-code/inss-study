(() => {
  const THEME_KEY = "inss-study-theme";
  const darkByDefault = true;
  let themeButton = null;

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
      themeButton.addEventListener("click", () => applyTheme(!document.body.classList.contains("dark-mode")));
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
    document.querySelectorAll(".video-frame:not([data-inss-controls])").forEach((frame) => {
      const modal = frame.closest(".lesson-modal");
      if (!modal) return;
      frame.dataset.inssControls = "1";

      const tools = document.createElement("div");
      tools.className = "video-tools";
      tools.setAttribute("role", "group");
      tools.setAttribute("aria-label", "Controles de tamanho do vídeo");

      const expand = makeButton("↗ Ampliar vídeo", "Ampliar a janela do vídeo", () => {
        const expanded = modal.classList.toggle("video-expanded");
        expand.textContent = expanded ? "↙ Reduzir vídeo" : "↗ Ampliar vídeo";
      });
      const theater = makeButton("▣ Modo teatro", "Expandir o player e priorizar a visualização", () => {
        const active = modal.classList.toggle("theater-mode");
        theater.textContent = active ? "▣ Sair do teatro" : "▣ Modo teatro";
      });
      const fullscreen = makeButton("⛶ Tela cheia", "Abrir o vídeo em tela cheia", async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else if (frame.requestFullscreen) await frame.requestFullscreen();
        } catch (_) {
          fullscreen.textContent = "Tela cheia indisponível";
          window.setTimeout(() => { fullscreen.textContent = "⛶ Tela cheia"; }, 2200);
        }
      });
      tools.append(expand, theater, fullscreen);
      frame.insertAdjacentElement("afterend", tools);
    });
  }

  function init() {
    let storedTheme = null;
    try { storedTheme = localStorage.getItem(THEME_KEY); } catch (_) {}
    applyTheme(storedTheme ? storedTheme === "dark" : darkByDefault);
    setupThemeButton();
    setupVideoControls();

    const observer = new MutationObserver(() => {
      setupThemeButton();
      setupVideoControls();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
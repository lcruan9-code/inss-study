(() => {
  "use strict";

  const DOCK_ID = "inss-mini-player-dock";
  let currentFrame = null;
  let placeholder = null;
  let pipWindow = null;

  function makeButton(label, title, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("click", handler);
    return button;
  }

  function ensureStyles() {
    if (document.getElementById("inss-mini-player-styles")) return;
    const style = document.createElement("style");
    style.id = "inss-mini-player-styles";
    style.textContent = `
      #${DOCK_ID}{position:fixed;right:18px;bottom:18px;z-index:2147483000;width:min(340px,calc(100vw - 28px));padding:8px;background:#101827;border:1px solid #34465b;border-radius:12px;box-shadow:0 12px 38px #0008;color:#eef4fa;font:12px system-ui,sans-serif}
      #${DOCK_ID} .inss-mini-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}
      #${DOCK_ID} .inss-mini-title{font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${DOCK_ID} .inss-mini-actions{display:flex;gap:5px;flex-shrink:0}
      #${DOCK_ID} button,.inss-mini-launch{border:1px solid #40566d;border-radius:7px;background:#1d344b;color:#f3f7fb;padding:6px 9px;font:600 11px system-ui,sans-serif;cursor:pointer}
      #${DOCK_ID} .video-frame{width:100%!important;height:auto!important;aspect-ratio:16/9!important;max-height:none!important;margin:0!important}
      #${DOCK_ID} .video-frame iframe,#${DOCK_ID} .video-frame>div{display:block;width:100%!important;height:100%!important}
      .video-tools .inss-mini-launch{background:#24566c;color:#fff;border-color:#24566c}
      @media(max-width:600px){#${DOCK_ID}{right:8px;bottom:8px;width:min(300px,calc(100vw - 16px))}}
    `;
    document.head.appendChild(style);
  }

  function getDock() {
    let dock = document.getElementById(DOCK_ID);
    if (dock) return dock;
    dock = document.createElement("aside");
    dock.id = DOCK_ID;
    dock.hidden = true;
    dock.setAttribute("aria-label", "Mini player");
    dock.innerHTML = '<div class="inss-mini-head"><span class="inss-mini-title">INSS Study</span><div class="inss-mini-actions"></div></div><div class="inss-mini-video"></div>';
    document.body.appendChild(dock);
    const actions = dock.querySelector(".inss-mini-actions");
    actions.append(
      makeButton("Abrir em janela", "Abrir o vídeo em uma janela Picture-in-Picture", openDocumentPip),
      makeButton("Voltar", "Retornar o vídeo ao conteúdo da aula", restoreFrame),
      makeButton("×", "Fechar mini player", closeDock)
    );
    return dock;
  }

  function rememberFrame(frame) {
    if (!frame || currentFrame === frame) return false;
    if (currentFrame) restoreFrame();
    placeholder = document.createComment("INSS mini player placeholder");
    frame.parentNode.insertBefore(placeholder, frame);
    currentFrame = frame;
    const iframe = frame.querySelector("iframe");
    if (iframe) iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen; picture-in-picture");
    return true;
  }

  function addPipStyles(doc) {
    const style = doc.createElement("style");
    style.textContent = `
      *{box-sizing:border-box}
      html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0b1220;color:#f4f7fb;font:13px system-ui,sans-serif}
      .pip-shell{height:100%;display:flex;flex-direction:column;padding:8px;gap:7px}
      .pip-head{height:28px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex:0 0 auto}
      .pip-title{font-weight:650;letter-spacing:.01em}
      .pip-actions{display:flex;gap:6px}
      button{border:1px solid #40566d;border-radius:7px;background:#1d344b;color:#f3f7fb;padding:5px 9px;font:600 11px system-ui,sans-serif;cursor:pointer}
      .pip-video{min-height:0;flex:1;display:flex;align-items:center;justify-content:center}
      .video-frame{width:100%!important;height:100%!important;max-height:none!important;aspect-ratio:16/9!important;margin:0!important}
      .video-frame iframe,.video-frame>div{display:block;width:100%!important;height:100%!important}
    `;
    doc.head.appendChild(style);
  }

  async function openDocumentPip() {
    if (!currentFrame) return;
    if (!("documentPictureInPicture" in window) || !window.documentPictureInPicture.requestWindow) {
      alert("Seu navegador não oferece janela Picture-in-Picture para páginas. O vídeo continuará no mini player dentro da página; use Chrome ou Edge atualizados para manter uma janela sobre outras abas.");
      return;
    }
    try {
      pipWindow = await window.documentPictureInPicture.requestWindow({ width: 480, height: 300 });
      const doc = pipWindow.document;
      doc.title = "INSS Study · Mini player";
      addPipStyles(doc);

      const shell = doc.createElement("main");
      shell.className = "pip-shell";
      shell.innerHTML = '<header class="pip-head"><span class="pip-title">INSS Study · Aula</span><div class="pip-actions"></div></header><section class="pip-video"></section>';
      doc.body.appendChild(shell);
      const actions = shell.querySelector(".pip-actions");
      actions.append(
        makeButton("Voltar à aula", "Devolver o vídeo à página do INSS Study", () => {
          restoreFrame();
          if (pipWindow && !pipWindow.closed) pipWindow.close();
        }),
        makeButton("×", "Fechar mini player", () => pipWindow.close())
      );
      shell.querySelector(".pip-video").appendChild(currentFrame);
      pipWindow.addEventListener("pagehide", handlePipClosed, { once: true });
      const dock = document.getElementById(DOCK_ID);
      if (dock) dock.hidden = true;
    } catch (error) {
      pipWindow = null;
      alert("Não foi possível abrir a janela flutuante. Verifique se o navegador permite Picture-in-Picture para esta página.");
    }
  }

  function handlePipClosed() {
    pipWindow = null;
    restoreFrame();
  }

  async function launchMiniPlayer(frame) {
    if (!rememberFrame(frame)) return;
    ensureStyles();
    getDock();
    // Document Picture-in-Picture keeps the player in a separate always-on-top window
    // while the user changes tabs. Browsers without this API retain the in-page dock.
    if ("documentPictureInPicture" in window && window.documentPictureInPicture.requestWindow) {
      await openDocumentPip();
    } else {
      const dock = document.getElementById(DOCK_ID);
      dock.querySelector(".inss-mini-title").textContent = "INSS Study · Mini player";
      dock.hidden = false;
    }
  }

  function restoreFrame() {
    if (!currentFrame) return;
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(currentFrame, placeholder.nextSibling);
      placeholder.remove();
    } else {
      currentFrame.remove();
    }
    currentFrame = null;
    placeholder = null;
    const dock = document.getElementById(DOCK_ID);
    if (dock) dock.hidden = true;
  }

  function closeDock() {
    if (pipWindow && !pipWindow.closed) {
      const win = pipWindow;
      pipWindow = null;
      win.close();
    }
    restoreFrame();
  }

  function setup() {
    ensureStyles();
    document.querySelectorAll(".video-frame").forEach((frame) => {
      if (frame.dataset.inssMiniPlayer === "1") return;
      const modal = frame.closest(".lesson-modal");
      if (!modal) return;
      frame.dataset.inssMiniPlayer = "1";
      let tools = frame.parentElement.querySelector(":scope > .video-tools");
      if (!tools) {
        tools = document.createElement("div");
        tools.className = "video-tools";
        frame.insertAdjacentElement("afterend", tools);
      }
      const button = makeButton("▣ Mini player", "Abrir o vídeo em uma janela flutuante sobre outras abas", () => launchMiniPlayer(frame));
      button.className = "inss-mini-launch";
      tools.appendChild(button);
      const iframe = frame.querySelector("iframe");
      if (iframe) iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen; picture-in-picture");
    });
  }

  function init() {
    setup();
    const observer = new MutationObserver(setup);
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
(() => {
  "use strict";
  const DOCK_ID = "inss-mini-player-dock";
  let currentFrame = null;
  let placeholder = null;

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
      #${DOCK_ID}{position:fixed;right:18px;bottom:18px;z-index:2147483000;width:min(380px,calc(100vw - 28px));padding:10px;background:#101d2c;border:1px solid #456078;border-radius:13px;box-shadow:0 14px 50px #0009;color:#eef6fb;font:12px Arial,sans-serif}
      #${DOCK_ID} .inss-mini-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
      #${DOCK_ID} .inss-mini-title{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${DOCK_ID} .inss-mini-actions{display:flex;gap:5px;flex-shrink:0}
      #${DOCK_ID} button,.inss-mini-launch{border:1px solid #54718a;border-radius:7px;background:#203b53;color:#e8f7ff;padding:7px 9px;font:700 11px Arial,sans-serif;cursor:pointer}
      #${DOCK_ID} .video-frame{width:100%!important;max-height:none!important;aspect-ratio:16/9!important;height:auto!important;margin:0!important}
      #${DOCK_ID} .video-frame iframe,#${DOCK_ID} .video-frame>div{width:100%!important;height:100%!important}
      .video-tools .inss-mini-launch{background:#1e657d;color:#fff;border-color:#1e657d}
      @media(max-width:600px){#${DOCK_ID}{right:8px;bottom:8px;width:min(320px,calc(100vw - 16px))}}
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
    dock.innerHTML = '<div class="inss-mini-head"><span class="inss-mini-title">INSS Study · Mini player</span><div class="inss-mini-actions"></div></div><div class="inss-mini-video"></div>';
    document.body.appendChild(dock);
    const actions = dock.querySelector(".inss-mini-actions");
    actions.append(
      makeButton("PiP", "Ativar Picture-in-Picture do navegador, quando disponível", activateNativePip),
      makeButton("Voltar", "Retornar o vídeo ao modal original", restoreFrame),
      makeButton("×", "Fechar mini player e interromper a exibição", closeDock)
    );
    return dock;
  }

  async function activateNativePip() {
    const dock = getDock();
    const video = dock.querySelector("video");
    if (video && document.pictureInPictureEnabled && typeof video.requestPictureInPicture === "function") {
      try { await video.requestPictureInPicture(); return; } catch (_) {}
    }
    const iframe = dock.querySelector("iframe");
    if (iframe) {
      iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen; picture-in-picture");
      alert("Este vídeo está incorporado pelo YouTube e o navegador não permite que o site externo force o Picture-in-Picture. Use o controle de Picture-in-Picture do próprio player do YouTube (se exibido) ou o recurso PiP do navegador. O mini player do INSS Study continuará disponível enquanto você navega dentro desta página.");
      return;
    }
    alert("Picture-in-Picture não está disponível para este player.");
  }

  function launchMiniPlayer(frame) {
    if (!frame || currentFrame === frame) return;
    if (currentFrame) restoreFrame();
    ensureStyles();
    const dock = getDock();
    placeholder = document.createComment("INSS mini player placeholder");
    frame.parentNode.insertBefore(placeholder, frame);
    currentFrame = frame;
    const iframe = frame.querySelector("iframe");
    if (iframe) iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen; picture-in-picture");
    dock.querySelector(".inss-mini-video").appendChild(frame);
    dock.hidden = false;
  }

  function restoreFrame() {
    if (!currentFrame) return;
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(currentFrame, placeholder.nextSibling);
      placeholder.remove();
    } else {
      const dock = document.getElementById(DOCK_ID);
      if (dock) dock.hidden = true;
      currentFrame = null;
      placeholder = null;
      return;
    }
    currentFrame = null;
    placeholder = null;
    const dock = document.getElementById(DOCK_ID);
    if (dock) dock.hidden = true;
  }

  function closeDock() {
    const dock = document.getElementById(DOCK_ID);
    if (currentFrame) {
      const iframe = currentFrame.querySelector("iframe");
      if (iframe) {
        const src = iframe.getAttribute("src");
        iframe.setAttribute("src", "about:blank");
        if (src) iframe.setAttribute("src", src);
      }
      currentFrame.remove();
    }
    if (placeholder) placeholder.remove();
    currentFrame = null;
    placeholder = null;
    if (dock) dock.hidden = true;
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
      const button = makeButton("▣ Mini player", "Manter o vídeo em uma janela flutuante dentro do INSS Study", () => launchMiniPlayer(frame));
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
// =====================================================================
//  PIXEL EMPIRE - MAIN
//  ---------------------------------------------------------------------
//  Starts everything, then runs the "game loop": about 60 times a
//  second it moves time forward and draws the office again.
// =====================================================================

function startPixelEmpire() {
  // Remember if music or sounds were turned off last time.
  try {
    const prefs = JSON.parse(localStorage.getItem("pixelEmpire.sound") || "null");
    if (prefs) { Sound.musicOn = prefs.music; Sound.soundsOn = prefs.sounds; }
  } catch (e) { /* ignore */ }

  Office.init(document.getElementById("office"));
  Office.fit();
  window.addEventListener("resize", () => Office.fit());
  // When the top bar or the guide changes size (like a new tip popping
  // up on a phone), make the office fit again.
  if (window.ResizeObserver) {
    const watcher = new ResizeObserver(() => Office.fit());
    watcher.observe(document.getElementById("hud-top"));
    watcher.observe(document.getElementById("topcenter"));
    document.querySelectorAll(".hud-box").forEach(box => watcher.observe(box));
  }
  UI.init();
  UI.showTitle();

  // Auto-save every few seconds, and when the window closes or hides.
  setInterval(() => UI.save(), CONFIG.autoSaveSeconds * 1000);
  window.addEventListener("beforeunload", () => UI.save());
  document.addEventListener("visibilitychange", () => { if (document.hidden) UI.save(); });

  let last = performance.now();
  function frame(now) {
    const drawDt = Math.min(0.1, (now - last) / 1000);
    last = now;

    if (state) {
      const gameDt = (Date.now() - state.lastTick) / 1000;
      if (gameDt > 10) {
        // The tab was asleep for a while: catch up like we were away.
        const away = catchUp(state);
        if (away && away.seconds >= 60) { UI.cards.push({ type: "away", data: away }); UI.showNextCard(); }
      } else if (gameDt > 0) {
        tick(state, gameDt, true);
        state.lastTick = Date.now();
      }
      UI.afterTick();
      UI.updateHud();
    }

    Office.draw(UI.viewState(), drawDt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Wait for the pixel font, so the neon signs look right from the start.
if (document.fonts && document.fonts.load) {
  Promise.race([
    document.fonts.load("8px 'Press Start 2P'"),
    new Promise(resolve => setTimeout(resolve, 1500)),
  ]).then(startPixelEmpire, startPixelEmpire);
} else {
  startPixelEmpire();
}

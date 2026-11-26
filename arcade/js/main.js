// =====================================================================
//  PIXEL EMPIRE ARCADE - MAIN
//  ---------------------------------------------------------------------
//  Starts everything, then runs the "game loop": about 60 times a
//  second it moves time forward and draws the arcade again.
// =====================================================================

function startArcade() {
  try {
    const prefs = JSON.parse(localStorage.getItem("pixelEmpireArcade.sound") || "null");
    if (prefs) { Sound.musicOn = prefs.music; Sound.soundsOn = prefs.sounds; }
  } catch (e) { /* ignore */ }

  UI.init();
  UI.showTitle();

  // Auto-save every few seconds, and when the window closes or hides.
  setInterval(() => UI.save(), CONFIG.autoSaveSeconds * 1000);
  window.addEventListener("beforeunload", () => UI.save());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) UI.save();
    else if (state) {
      // Back from another tab: count the time away.
      const away = catchUp(state);
      if (away && away.seconds >= CONFIG.welcomeBackAfterSeconds) UI.showAway(away);
    }
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    UI.frame(dt);
    if (state) state.savedAt = Date.now();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Wait for the pixel font, so the neon signs look right from the start.
if (document.fonts && document.fonts.load) {
  Promise.race([
    document.fonts.load("8px 'Press Start 2P'"),
    new Promise(resolve => setTimeout(resolve, 1500)),
  ]).then(startArcade, startArcade);
} else {
  startArcade();
}

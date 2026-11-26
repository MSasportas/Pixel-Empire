// =====================================================================
//  PIXEL EMPIRE ARCADE - JUICE
//  ---------------------------------------------------------------------
//  The little things that make it feel alive: coins that fly up to your
//  money, a money number that rolls up, a big celebration when the Front
//  Counter levels up, and controller rumble. It also lets the controller
//  jump from button to button in menus (a bright outline shows which).
// =====================================================================

// Shake the controller (and buzz the phone) for big moments.
function rumble(ms, strength) {
  try {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.vibrationActuator && p.vibrationActuator.playEffect)
      p.vibrationActuator.playEffect("dual-rumble", { duration: ms, strongMagnitude: strength || 0.6, weakMagnitude: strength || 0.6 });
  } catch (e) { /* no rumble */ }
  if (Input.device === "touch" && navigator.vibrate) navigator.vibrate(Math.min(200, ms / 2));
}

Object.assign(UI, {
  flying: 0,

  // A coin flies from the arcade up to the money box.
  flyCoin(wx, wy) {
    if (this.flying >= 10 || document.hidden) return;
    const sx = (wx - this.view.x) * this.scale, sy = (wy - this.view.y) * this.scale;
    if (sx < -20 || sy < -20 || sx > innerWidth + 20 || sy > innerHeight + 20) return;
    const target = $("hud-money").getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "fly-coin";
    el.innerHTML = icon("coin", 18);
    el.style.transform = "translate(" + (sx - 9) + "px," + (sy - 9) + "px)";
    document.body.appendChild(el);
    this.flying++;
    const done = () => {
      if (!el.parentNode) return;
      el.remove(); this.flying--;
      const m = $("hud-money"); m.classList.remove("bump"); void m.offsetWidth; m.classList.add("bump");
    };
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transform = "translate(" + (target.left + 4) + "px," + (target.top + target.height / 2 - 9) + "px) scale(0.7)";
    }));
    el.addEventListener("transitionend", done);
    setTimeout(done, 1200);
  },

  // The Front Counter levelled up: flash, confetti, fanfare, rumble.
  levelUp(level, names) {
    const f = $("flash");
    f.classList.remove("hidden", "go"); void f.offsetWidth; f.classList.add("go");
    setTimeout(() => f.classList.add("hidden"), 700);
    const r = counterRect(), p = state.player;
    for (let i = 0; i < 4; i++) setTimeout(() => {
      Art.burst(r.x + r.w / 2 + (Math.random() - 0.5) * 30, r.y - Math.random() * 20);
      Art.burst(p.x + (Math.random() - 0.5) * 40, p.y - 20 - Math.random() * 20);
    }, i * 180);
    Sound.play("level"); setTimeout(() => Sound.play("level"), 250);
    rumble(500, 0.8);
    this.banner("LEVEL " + level + "!", names.length ? "New: " + names.join(", ") : "+" + CONFIG.stars.counter + " stars");
    this.toast("+" + CONFIG.stars.counter, 0, "star");
  },

  // ----- Controller in menus: jump from button to button ----------------
  focusables() {
    const card = $("card"), root = !card.classList.contains("hidden") ? card : $("panel");
    return [...root.querySelectorAll("button, [data-act], input")].filter(el => {
      if (el.disabled || el.closest(".hidden")) return false;
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && !(el.tagName !== "BUTTON" && el.querySelector("button"));
    });
  },
  setFocus(el) {
    if (this.padFocus) this.padFocus.classList.remove("pad-focus");
    this.padFocus = el;
    if (!el) return;
    el.classList.add("pad-focus");
    this.padFocusKey = el.outerHTML.slice(0, 200);
    el.scrollIntoView({ block: "nearest" });
  },
  focusMove(dx, dy) {
    const list = this.focusables();
    if (!list.length) return;
    const cur = this.padFocus && document.body.contains(this.padFocus) ? this.padFocus : null;
    if (!cur) { this.setFocus(list[0]); return; }
    const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bestScore = 1e9;
    for (const el of list) {
      if (el === cur) continue;
      const b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const along = (bx - ax) * dx + (by - ay) * dy, side = Math.abs((bx - ax) * dy) + Math.abs((by - ay) * dx);
      if (along <= 4) continue;
      const score = along + side * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) { this.setFocus(best); Sound.play("click"); }
    else if (dy) { const body = document.querySelector("#panel .panel-body"); if (body) body.scrollTop += dy * 80; }
  },
  focusPress() {
    const el = this.padFocus;
    if (el && document.body.contains(el) && !el.disabled) {
      if (el.tagName === "INPUT") el.focus(); else el.click();
    } else this.focusMove(0, 1);
  },
  // After a pop-up is drawn again, put the outline back on the same button.
  keepFocus() {
    if (!this.overlayOpen() || Minigames.active || Input.device !== "gamepad") { if (this.padFocus) this.setFocus(null); return; }
    if (this.padFocus && document.body.contains(this.padFocus)) return;
    const list = this.focusables();
    const same = list.find(el => el.outerHTML.slice(0, 200) === this.padFocusKey);
    this.setFocus(same || list.find(el => el.classList.contains("glow")) || list.find(el => el.dataset.act !== "close") || list[0] || null);
  },
});

// Hook into every frame: roll the money number, keep the controller
// outline, and show controller button hints only when one is in use.
(function () {
  const baseFrame = UI.frame;
  UI.frame = function (dt) {
    if (state) {
      if (this.shownMoney === undefined || state.money < this.shownMoney || this.moneyState !== state) { this.shownMoney = state.money; this.moneyState = state; }
      else {
        const diff = state.money - this.shownMoney;
        this.shownMoney = diff < 1 ? state.money : this.shownMoney + Math.max(1, diff * Math.min(1, dt * 5));
      }
    }
    baseFrame.call(this, dt);
    document.body.classList.toggle("pad", Input.device === "gamepad");
    this.keepFocus();
  };
  const baseInit = UI.init;
  UI.init = function () {
    document.querySelectorAll(".hi[data-icon]").forEach(el => { el.innerHTML = icon(el.dataset.icon, 22); });
    return baseInit.call(this);
  };
})();

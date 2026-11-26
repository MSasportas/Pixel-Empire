// =====================================================================
//  PIXEL EMPIRE ARCADE - SCREENS AND BUTTONS
//  ---------------------------------------------------------------------
//  The title screen, the boxes in the corners, and every pop-up:
//  adding a game, a machine's upgrades, buying rooms, the fuse box.
//  It also moves your character and the camera.
// =====================================================================

let state = null;   // the arcade you're playing right now
let slot = null;    // which save slot it lives in (0, 1 or 2)

function $(id) { return document.getElementById(id); }
function fmt(n) { return Math.floor(n).toLocaleString("en-US"); }
function money(n) { return "$" + fmt(n); }
// Short numbers: 950, 1.9k, 23.4k, 2.3M, 1.5B
function shortNumber(n) {
  n = Math.max(0, n);
  if (n < 999.5) return String(Math.round(n));
  const units = [[1e9, "B"], [1e6, "M"], [1e3, "k"]];
  for (const [size, letter] of units) if (n >= size * 0.9995) {
    const v = n / size;
    return (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + letter;
  }
  return String(Math.round(n));
}
function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function fmtDate(day) {
  let d = Math.floor(day || 0);
  const year = Math.floor(d / 365) + 1;
  d = d % 365;
  let m = 0;
  while (d >= MONTH_DAYS[m]) { d -= MONTH_DAYS[m]; m++; }
  return MONTHS[m] + " " + (d + 1) + ", Year " + year;
}
function fmtClock(seconds) {
  seconds = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds / 60) % 60, s = seconds % 60;
  if (h > 0) return h + "h " + String(m).padStart(2, "0") + "m";
  if (m > 0) return m + "m " + String(s).padStart(2, "0") + "s";
  return s + "s";
}
function fmtAway(seconds) {
  const d = Math.floor(seconds / 86400), h = Math.floor(seconds / 3600) % 24, m = Math.floor(seconds / 60) % 60;
  if (d > 0) return d + (d === 1 ? " day" : " days") + (h ? " " + h + (h === 1 ? " hour" : " hours") : "");
  if (h > 0) return h + (h === 1 ? " hour" : " hours") + (m ? " " + m + " min" : "");
  return Math.max(1, m) + " min";
}
function bar(fraction, color) {
  const pct = Math.max(0, Math.min(100, fraction * 100));
  return '<div class="bar"><div class="bar-fill" style="width:' + pct + '%;' + (color ? "background:" + color : "") + '"></div></div>';
}
// A buy button that shows the price, and turns off when you can't afford it.
// When you can't afford it yet, the button fills up like a bar as money comes in.
function fillStyle(cost) { return ' data-cost="' + cost + '" style="--fill:' + (state ? Math.min(100, state.money / cost * 100).toFixed(1) : 0) + '%"'; }
function costButton(act, attrs, cost, label) {
  const cant = state && state.money < cost;
  return '<button class="btn' + (cant ? " cant" : "") + '" data-act="' + act + '" ' + attrs + fillStyle(cost) + (cant ? " disabled" : "") + ">" + (label ? label + " " : "") + money(cost) + "</button>";
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
// What an upgrade changes, like "$10 → $15 a play".
function upgradeEffect(m, u) {
  const lvl = m.up[u.id], d = machineDef(m);
  const now = u.values[lvl], next = u.values[lvl + 1];
  let a, b;
  if (u.id === "speed") { a = Math.round(d.play * now * 10) / 10 + "s"; b = next && Math.round(d.play * next * 10) / 10 + "s"; return '<span class="effect">' + icon("clock", 14) + " " + a + (next ? " → <b>" + b + "</b>" : "") + "</span>"; }
  if (u.id === "price") { a = money(Math.round(d.price * now)); b = next && money(Math.round(d.price * next)); return '<span class="effect">' + icon("coin", 14) + " " + a + (next ? " → <b>" + b + "</b>" : "") + "</span>"; }
  return "";
}
// The upgrade rows for one machine type (used in the Shop and in a machine's pop-up).
function typeUpgradeRows(type) {
  const stub = typeStub(state, type);
  let html = "";
  for (const u of CONFIG.upgrades) {
    const cost = upgradeCost(stub, u.id), lvl = stub.up[u.id];
    const dots = "●".repeat(lvl) + "○".repeat(u.cost.length - lvl);
    const job = jobFor(state, "type", type, u.id), block = cost === null ? "" : upgradeBlock(state, type, u.id);
    let right;
    if (cost === null) right = '<span class="owned">MAX</span>';
    else if (job) right = '<span class="owned job-left" data-job="' + job.id + '">' + fmtClock(job.left) + "</span>";
    else right = jobButton("upgrade", 'data-type="' + type + '" data-id="' + u.id + '"', cost, CONFIG.typeJobSeconds[lvl], block);
    html += '<div class="item up-row"><div class="item-main"><b>' + (u.id === "price" ? icon("coin", 16) : icon("bolt", 16)) + " " + u.name + '</b> <span class="dots">' + dots + "</span><br>" + upgradeEffect(stub, u) + "</div>" + right + "</div>";
  }
  return html;
}
// A button that gives a Mechanic a job: "$1,500 · 10 min", or why you can't yet.
function jobButton(act, attrs, cost, seconds, block) {
  if (block && block !== "") return '<span class="muted small-note block-note">' + (/Mechanics/.test(block) ? icon("wrench", 14) + " Busy" : icon("lock", 14) + " " + block.replace("Needs Counter level ", "Level ").replace("Being upgraded", "Upgrading")) + "</span>";
  const cant = state.money < cost;
  return '<button class="btn' + (cant ? " cant" : "") + '" data-act="' + act + '" ' + attrs + fillStyle(cost) + (cant ? " disabled" : "") + ">" + icon("up", 14) + " " + money(cost) + ' <span class="job-time">· ' + fmtDuration(seconds) + "</span></button>";
}
function fmtDuration(sec) {
  if (sec < 60) return Math.round(sec) + " s";
  if (sec < 3600) { const m = Math.floor(sec / 60), s = Math.round(sec % 60); return m + " min" + (s ? " " + s + " s" : ""); }
  const h = sec / 3600;
  return (Number.isInteger(h) ? h : h.toFixed(1)) + " h";
}
function plural(name) { return /s$/.test(name) ? name : name + "s"; }
function playersText(d) { return d.players === 1 ? "1 player" : d.players + " players"; }
function squaresText(d) { return d.w * d.h === 1 ? "1 square" : d.w * d.h + " squares"; }

const UI = {
  canvas: null, ctx: null,
  view: { x: 0, y: 0, w: 320, h: 200 },
  scale: 3,
  target: null,           // the thing you're standing next to
  walkGoal: null,         // phone: where you're walking to by yourself
  time: 0,
  removeArmed: null,
  toastTimer: null,

  init() {
    this.canvas = $("arcade");
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.labelCanvas = $("labels");
    try { this.zoom = parseInt(localStorage.getItem("pixelEmpireArcade.zoom") || "0", 10) || 0; } catch (e) { /* ignore */ }
    this.lctx = this.labelCanvas.getContext("2d");
    this.fit();
    window.addEventListener("resize", () => this.fit());
    Input.init(this.canvas, {
      onAction: () => this.useTarget(),
      onBack: () => this.back(),
      onMenu: () => { if (state && !Minigames.active) { if ($("panel").classList.contains("hidden")) this.openMenu(); else this.closePanel(); } },
      onTap: (cx, cy) => this.tap(cx, cy),
      onMech: () => { if (state) this.openMechanics(); },
      onFame: () => { if (state) this.openFame(); },
      onShop: () => { if (state) this.openShop(); },
      onZoom: d => this.zoomBy(d),
      onPan: (dx, dy) => { this.fling = null; this.panBy(dx, dy); },
      onFling: (vx, vy) => { this.fling = { x: vx, y: vy }; },
    });
    $("zoom-in").addEventListener("click", () => this.zoomBy(1));
    $("zoom-out").addEventListener("click", () => this.zoomBy(-1));
    $("zoom-me").addEventListener("click", () => { this.free = null; this.fling = null; });
    // All buttons in pop-ups use data-act="..." (one listener for all).
    document.addEventListener("click", e => {
      const b = e.target.closest ? e.target.closest("[data-act]") : null;
      if (!b || b.disabled) return;
      Sound.start();
      this.act(b.dataset.act, b.dataset, b);
    });
    $("prompt").addEventListener("click", () => this.useTarget());
    // Tap the dark area around a pop-up to close it
    $("panel").addEventListener("click", e => { if (e.target === $("panel")) this.closePanel(); });
    $("card").addEventListener("click", e => { if (e.target === $("card")) $("card").classList.add("hidden"); });
    // A tiny buzz when you press a button (phones that support it)
    document.addEventListener("pointerdown", e => {
      const b = e.target.closest ? e.target.closest("button") : null;
      if (b && !b.disabled && e.pointerType === "touch" && navigator.vibrate) navigator.vibrate(8);
    });
    // Makes :active (the pressed look) work right away on iPhones
    document.addEventListener("touchstart", () => {}, { passive: true });
    this.canvas.addEventListener("contextmenu", e => e.preventDefault());
  },

  // Makes the picture fill the window, with big crisp pixels.
  zoom: 0,               // how far you zoomed in (+) or out (-)
  free: null,            // where the camera stays after you drag it (null = it follows you)

  fit() {
    // Phones get bigger pixels: the camera follows you, so it's fine
    // if the whole arcade doesn't fit on the screen at once.
    const phone = Math.min(innerWidth, innerHeight) < 600;
    let normal = Math.max(phone ? 3 : 2, Math.floor(Math.min(innerWidth / 260, innerHeight / 170)));
    // On a computer, start zoomed out far enough to see every room you own and the street.
    if (!phone && state) {
      const cols = Math.min(3, state.rooms), wTiles = 1 + 11 * cols, hTiles = state.rooms > 3 ? MAP_H : MAP_H - roomOrigin(0).y + 1;
      normal = Math.max(2, Math.min(normal, Math.floor(Math.min(innerWidth / (wTiles * T), (innerHeight - 70) / (hTiles * T)))));
    }
    this.normalScale = normal;
    this.scale = Math.max(1, Math.min(10, normal + this.zoom));
    // Sharp labels, but at most 2x (3x phones would draw 2x more for no visible gain)
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.phone = phone;
    document.body.classList.toggle("phone", phone);
    this.labelCanvas.width = Math.round(innerWidth * this.dpr);
    this.labelCanvas.height = Math.round(innerHeight * this.dpr);
    this.labelCanvas.style.width = innerWidth + "px";
    this.labelCanvas.style.height = innerHeight + "px";
    this.view.w = Math.ceil(innerWidth / this.scale);
    this.view.h = Math.ceil(innerHeight / this.scale);
    this.canvas.width = this.view.w;
    this.canvas.height = this.view.h;
    this.canvas.style.width = this.view.w * this.scale + "px";
    this.canvas.style.height = this.view.h * this.scale + "px";
    this.ctx.imageSmoothingEnabled = false;
  },

  // Sparkles and a word over a machine (after an upgrade or a new machine).
  celebrate(m, word) {
    const r = machineRect(m);
    Art.burst(r.x + r.w / 2, r.y + r.h / 2);
    Art.floats.push({ x: r.x + r.w / 2, y: r.y - 6, amount: 0, word: word, age: 0 });
  },

  // Zoom in (+1) or out (-1). Pixels stay whole numbers so the art stays sharp.
  zoomBy(d) {
    if (!state || this.overlayOpen()) return;
    const next = Math.max(1, Math.min(10, this.scale + d));
    if (next === this.scale) return;
    this.zoom = next - this.normalScale;
    try { localStorage.setItem("pixelEmpireArcade.zoom", String(this.zoom)); } catch (e) { /* ignore */ }
    this.fit();
    this.snapCamera = true;
  },

  // Look around without walking (drag on a phone, right stick on a controller).
  panBy(dx, dy) {
    if (!state || this.overlayOpen()) return;
    // Dragging lets go of you: the camera stays where you leave it,
    // even while you walk somewhere by tapping. The ◎ button brings it back.
    if (!this.free) this.free = { x: this.view.x + this.view.w / 2, y: this.view.y + this.view.h / 2 };
    this.free.x -= dx / this.scale;
    this.free.y -= dy / this.scale;
    this.panned = true;
  },

  overlayOpen() {
    return !$("panel").classList.contains("hidden") || !$("card").classList.contains("hidden") ||
      !$("minigame").classList.contains("hidden") || !$("title").classList.contains("hidden") || !$("create").classList.contains("hidden");
  },

  // ----- Title screen and save slots ----------------------------------

  showTitle() {
    state = null; slot = null;
    $("hud").classList.add("hidden");
    $("create").classList.add("hidden");
    $("title").classList.remove("hidden");
    let html = "";
    for (let i = 0; i < 3; i++) {
      const s = loadGame(i);
      if (s) {
        html += '<div class="slot"><div class="slot-name">' + esc(s.name) + '</div>' +
          '<div class="slot-info">' + money(s.money) + " · " + s.machines.length + (s.machines.length === 1 ? " machine" : " machines") + "<br>" + fmtDate(s.day) + "</div>" +
          '<div class="slot-buttons"><button class="btn" data-act="play" data-slot="' + i + '">Play</button> ' +
          '<button class="btn ghost small" data-act="delete" data-slot="' + i + '">Delete</button></div></div>';
      } else {
        html += '<div class="slot empty"><div class="slot-name">Empty slot</div><div class="slot-info">Start a brand new arcade</div>' +
          '<div class="slot-buttons"><button class="btn" data-act="new" data-slot="' + i + '">New arcade</button></div></div>';
      }
    }
    $("slots").innerHTML = html;
    this.drawScene(0);
  },

  showCreate(i) {
    this.createSlot = i;
    this.createLook = randomLook();
    $("title").classList.add("hidden");
    $("create").classList.remove("hidden");
    $("create-body").innerHTML =
      '<label for="arcade-name">Your arcade\'s name</label>' +
      '<div class="row"><input id="arcade-name" maxlength="28" value="' + esc(randomArcadeName()) + '"> <button class="btn ghost" data-act="random-name">🎲 Random</button></div>' +
      '<label>You</label><div class="row"><canvas id="look-preview" width="24" height="28" class="preview"></canvas> <button class="btn ghost" data-act="new-look">🎲 New look</button></div>' +
      '<div class="row" style="margin-top:18px"><button class="btn big glow" data-act="create">Open the arcade!</button> <button class="btn ghost" data-act="title">Back</button></div>';
    this.drawLook();
  },

  drawLook() {
    const c = $("look-preview"); if (!c) return;
    const g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    drawPerson(g, 12, 26, this.createLook, { phase: 0 });
  },

  startGame(s, i) {
    state = s; slot = i;
    $("title").classList.add("hidden");
    $("create").classList.add("hidden");
    $("hud").classList.remove("hidden");
    this.closePanel();
    this.walkGoal = null; this.free = null;
    this.fit(); this.snapCamera = true;
    const away = catchUp(state);
    if (away && away.seconds >= CONFIG.welcomeBackAfterSeconds) this.showAway(away);
    this.mechs = []; this.robot = null;
    if (state.coinBox > 0) this.free = { x: (COUNTER.x + 1) * T, y: COUNTER.y * T };
    if (state.outage) this.banner("POWER OUTAGE!", "Go to the fuse box");
    if (state.machines.length <= 1 && state.playSeconds < 5) this.toast("Tap a glowing square!", 6000, "play");
    this.save();
  },

  save() { if (state && slot !== null) saveGame(state, slot); },

  // ----- Buttons --------------------------------------------------------

  act(name, data, button) {
    if (name === "play") { const s = loadGame(+data.slot); if (s) this.startGame(s, +data.slot); }
    if (name === "new") this.showCreate(+data.slot);
    if (name === "delete") {
      if (button.dataset.armed) { deleteSave(+data.slot); this.showTitle(); }
      else { button.dataset.armed = "1"; button.textContent = "Tap again to delete"; }
    }
    if (name === "title") this.showTitle();
    if (name === "random-name") $("arcade-name").value = randomArcadeName();
    if (name === "new-look") { this.createLook = randomLook(); this.drawLook(); }
    if (name === "create") {
      const s = newArcadeState(($("arcade-name").value || "").trim().slice(0, 28) || randomArcadeName(), this.createLook);
      this.startGame(s, this.createSlot);
    }
    if (name === "close") this.closePanel();
    if (name === "card-close") $("card").classList.add("hidden");
    if (name === "away-collect") { $("card").classList.add("hidden"); if (state) this.collect(0); }
    if (name === "menu") this.openMenu();
    if (name === "quit") { this.save(); this.closePanel(); this.goodbye(); }
    if (name === "goodbye-ok") { $("card").classList.add("hidden"); this.showTitle(); }
    if (name === "music") { Sound.setMusic(!Sound.musicOn); this.saveSound(); this.openMenu(); }
    if (name === "sounds") { Sound.setSounds(!Sound.soundsOn); this.saveSound(); this.openMenu(); }

    if (!state) return;
    const spot = this.panelSpot;
    const m = this.panelMachine ? state.machines.find(x => x.id === this.panelMachine) : null;
    if (name === "unlock") {
      if (unlockNext(state)) {
        Sound.play("buy");
        this.toast(CONFIG.machines[state.unlocked - 1].name + " unlocked!", 0, "check");
        if (spot) this.openSpot(spot); else this.closePanel();
      }
    }
    if (name === "place" && spot) {
      const placed = placeMachine(state, data.type, spot.room, spot.row, spot.col);
      if (placed) {
        Sound.play("buy");
        this.unstickPlayer();
        this.closePanel();
        this.toast("Building " + esc(placed.name) + "!", 0, "wrench");
        this.celebrate(placed, "NEW!");
      }
    }
    if (name === "swap" && m) {
      const placed = swapMachine(state, m, data.type);
      if (placed) { Sound.play("buy"); this.unstickPlayer(); this.closePanel(); this.toast("Building " + esc(placed.name) + "!", 0, "wrench"); }
    }
    if (name === "shop") this.openShop();
    if (name === "shop-unlock") { if (unlockNext(state)) { Sound.play("buy"); this.toast(CONFIG.machines[state.unlocked - 1].name + " unlocked!", 0, "check"); this.openShop(); } }
    if (name === "upgrade" && data.type) {
      const job = buyUpgrade(state, typeStub(state, data.type), data.id);
      if (job) {
        Sound.play("buy"); this.jobStarted(job);
        if (this.panelKind === "shop") this.openShop(); else if (m) this.openMachine(m);
      }
    }
    if (name === "sign") { const job = buySign(state); if (job) { Sound.play("buy"); this.jobStarted(job); this.openShop(); } }
    if (name === "rename" && m) { renameMachine(m, $("machine-name").value); Sound.play("click"); this.openMachine(m); }
    if (name === "random-machine-name" && m) { $("machine-name").value = randomGameName(); }
    if (name === "remove" && m) {
      if (this.removeArmed === m.id) { removeMachine(state, m); this.closePanel(); this.toast("Machine removed", 0, "check"); }
      else { this.removeArmed = m.id; button.textContent = "Tap again to remove it"; }
    }
    if (name === "speed-up" && m) {
      this.closePanel();
      Minigames.start("code", machineDef(m).color, score => {
        speedUpBuild(state, m, score);
        addStars(state, CONFIG.stars.speedUp); this.starsToast(CONFIG.stars.speedUp);
        if (score >= 1) this.toast("PERFECT! Ready!", 0, "star");
      });
    }
    if (name === "fix" && m) {
      this.closePanel();
      Minigames.start("bugs", "#7cff6b", score => {
        // Every run fixes it. A better run gives more stars.
        fixBug(state, m);
        const st = score >= 1 ? CONFIG.stars.bugPerfect : score >= CONFIG.bugFixScore ? CONFIG.stars.bug : 5;
        addStars(state, st); this.toast("Fixed! +" + st, 0, "star");
      });
    }
    this.systemAct(name, data, button);
    if (name === "buy-room") {
      if (buyRoom(state)) { Sound.play("level"); this.closePanel(); this.fit(); this.banner("NEW ROOM!", "Room " + state.rooms + " is open"); }
    }
    if (name === "maze") {
      this.closePanel();
      Minigames.start("maze", "#ffd23f", score => {
        // Every run fixes it. Finishing the maze gives more stars.
        const st = score >= 1 ? CONFIG.stars.power : 10;
        fixOutage(state); addStars(state, st); Sound.play("level"); this.toast("Power on! +" + st, 0, "bolt"); $("banner").classList.add("hidden");
      });
    }
  },

  saveSound() { try { localStorage.setItem("pixelEmpireArcade.sound", JSON.stringify({ music: Sound.musicOn, sounds: Sound.soundsOn })); } catch (e) { /* ignore */ } },

  back() {
    if (Minigames.active) return;
    if (!$("card").classList.contains("hidden")) { $("card").classList.add("hidden"); return; }
    if (!$("panel").classList.contains("hidden")) { this.closePanel(); return; }
  },

  // ----- Pop-ups ----------------------------------------------------

  openPanel(title, body, color) {
    // Re-drawing the same pop-up (after buying something) keeps your place in it.
    const oldBody = $("panel").querySelector(".panel-body"), oldTitle = $("panel").querySelector(".panel-head h2");
    const same = !!(oldBody && oldTitle && oldTitle.innerHTML === title && !$("panel").classList.contains("hidden"));
    const keep = same ? oldBody.scrollTop : 0;
    $("panel").innerHTML = '<div class="panel panel-main"' + (color ? ' style="border-color:' + color + '"' : "") + '>' +
      '<div class="panel-head"><h2>' + title + '</h2><span class="panel-money" id="panel-money">' + money(state ? state.money : 0) + '</span><button class="btn ghost small" data-act="close">✕</button></div>' +
      '<div class="panel-body">' + body + "</div></div>";
    $("panel").classList.remove("hidden");
    // The same pop-up drawn again: no slide-up, and stay where you were.
    if (same) { $("panel").querySelector(".panel-body").scrollTop = keep; $("panel").querySelector(".panel-main").style.animation = "none"; }
    Input.cursor = { x: innerWidth / 2, y: innerHeight / 2 };
  },
  closePanel() {
    $("panel").classList.add("hidden");
    $("panel").innerHTML = "";
    this.panelSpot = null; this.panelMachine = null; this.panelKind = null; this.removeArmed = null;
  },

  // "Add a game": pick which unlocked machine goes in this spot.
  openSpot(spot) {
    this.panelKind = "spot"; this.panelSpot = spot; this.panelMachine = null;
    let html = "";
    for (let i = 0; i < state.unlocked; i++) {
      const d = CONFIG.machines[i];
      const why = cantPlace(state, d.id, spot.room, spot.row, spot.col);
      html += '<div class="item' + (why ? " dim" : "") + '"><div class="mini-machine" style="--c:' + d.color + '"></div><div class="item-main"><b class="m-name">' + d.name + '</b><br>' +
        '<span class="muted">' + icon("people", 14) + " " + d.players + " · " + icon("coin", 14) + " " + money(d.price) + " · " + icon("clock", 14) + " " + fmtClock(d.build) + "</span></div>" +
        (why ? '<span class="muted small-note">' + why + "</span>" : costButton("place", 'data-type="' + d.id + '"', placeCost(d.id), "")) + "</div>";
    }
    const next = CONFIG.machines[state.unlocked];
    if (next) {
      html += '<div class="item locked"><div class="mini-machine" style="--c:' + next.color + '"></div><div class="item-main"><b class="m-name">' + next.name + '</b><br>' +
        '<span class="muted">' + icon("people", 14) + " " + next.players + " · " + icon("coin", 14) + " " + money(next.price) + "</span></div>" +
        '<button class="btn ghost small" data-act="counter">' + icon("lock", 14) + " Level " + counterLevelFor(state, c => c.unlocks > state.unlocked) + "</button></div>";
    }
    this.openPanel("Add a game", html);
  },

  openMachine(m) {
    this.panelKind = "machine"; this.panelMachine = m.id; this.panelSpot = null; this.removeArmed = null;
    const d = machineDef(m);
    let html = "";
    if (m.status === "building") {
      html += '<div class="status-box">' + icon("wrench", 16) + ' <span id="build-left">' + fmtClock(m.buildLeft) + "</span>" + bar(1 - m.buildLeft / d.build, d.color) +
        '<div class="row"><button class="btn glow" data-act="speed-up">' + icon("bolt", 16) + " Faster!</button></div></div>";
    } else if (m.status === "bug") {
      html += '<div class="status-box bug">' + icon("bug", 22) + ' <b class="pink">Bug!</b>' +
        '<div class="row"><button class="btn glow" data-act="fix">' + icon("bug", 16) + " Squash it!</button></div></div>";
    } else if (state.outage) {
      html += '<div class="status-box">' + icon("bolt", 18) + ' <b class="pink">Power out!</b></div>';
    }
    html += '<h3>' + icon("up", 16) + " " + plural(d.name) + "</h3>" + typeUpgradeRows(m.type);
    html += '<div class="stats"><div>' + icon("coin", 16) + ' <b>' + money(playPrice(m)) + '</b></div><div>' + icon("play", 16) + ' <b>' + fmt(m.plays) +
      '</b></div><div>' + icon("gift", 16) + ' <b>' + money(m.earned) + '</b></div><div>' + icon("people", 16) + ' <b>' + m.queue.length + "/" + lineSlots(m) + "</b></div></div>";
    html += '<h3>Name</h3><div class="row"><input id="machine-name" maxlength="24" value="' + esc(m.name) + '"> ' +
      '<button class="btn ghost small" data-act="random-machine-name">🎲</button> <button class="btn small" data-act="rename">Rename</button></div>';
    html += '<div class="row" style="margin-top:14px"><button class="btn ghost small" data-act="remove">Remove</button></div>';
    this.openPanel(esc(m.name), html, d.color);
  },

  // The shop: unlock machines and buy rooms from anywhere.
  openShop() {
    this.panelKind = "shop"; this.panelSpot = null; this.panelMachine = null;
    const cap = capacity(state), full = state.customers.length >= cap;
    // Earnings and the crowd, as pictures and numbers
    let html = '<div class="shop-top"><span>' + icon("coin", 18) + ' <b class="green">+' + money(state.rate * 60) + '</b>/min</span>' +
      '<span class="crowd' + (full ? " full" : "") + '">' + icon("people", 18) + ' <span class="meter crowd-bar"><span style="width:' + Math.min(100, state.customers.length / cap * 100).toFixed(1) + '%"></span></span> <b>' + (full ? "FULL" : state.customers.length + "/" + cap) + "</b></span></div>";
    // Upgrades for each machine type you have
    const types = CONFIG.machines.slice(0, state.unlocked).filter(d => state.machines.some(x => x.type === d.id));
    if (types.length) {
      html += "<h3>" + icon("up", 16) + " Upgrades</h3>";
      for (const d of types.slice().reverse()) html += '<div class="up-group"><div class="up-head"><div class="mini-machine" style="--c:' + d.color + '"></div><b class="m-name">' + plural(d.name) + "</b></div>" + typeUpgradeRows(d.id) + "</div>";
    }
    html += this.counterShopItem();
    html += "<h3>" + icon("bulb", 16) + " Arcade</h3>";
    const sc = signCost(state), sl = state.sign || 0;
    html += '<div class="item"><div class="item-main"><b class="m-name">' + icon("bulb", 16) + " " + CONFIG.sign.name + '</b> <span class="dots">' + "●".repeat(sl) + "○".repeat(CONFIG.sign.cost.length - sl) + "</span>" +
      (sc === null ? "" : '<br><span class="effect">' + icon("people", 14) + " +" + CONFIG.sign.extra[sl] + " → <b>+" + CONFIG.sign.extra[sl + 1] + "</b></span>") + "</div>" +
      (sc === null ? '<span class="owned">MAX</span>' : jobFor(state, "sign") ? '<span class="owned job-left" data-job="' + jobFor(state, "sign").id + '">' + fmtClock(jobFor(state, "sign").left) + "</span>" : jobButton("sign", "", sc, CONFIG.signJobSeconds[sl], signBlock(state))) + "</div>";
    const cost = nextRoomCost(state);
    if (cost !== null) html += '<div class="item"><div class="item-main"><b class="m-name">' + icon("door", 16) + " Room " + (state.rooms + 1) + '</b><br><span class="effect">+16 ' + icon("play", 14) + "</span></div>" +
      (roomBlock(state) ? '<span class="muted small-note block-note">' + icon("lock", 14) + " Level " + counterLevelFor(state, c => c.maxRooms > state.rooms) + "</span>" : costButton("buy-room", "", cost, "")) + "</div>";
    html += "<h3>" + icon("play", 16) + " Machines</h3>";
    CONFIG.machines.forEach((d, i) => {
      const info = '<span class="muted">' + icon("people", 14) + " " + d.players + " · " + icon("coin", 14) + " " + money(d.price) + "</span>";
      const right = i < state.unlocked ? '<span class="owned">' + icon("check", 16) + "</span>" : '<span class="muted small-note block-note">' + icon("lock", 14) + " Level " + counterLevelFor(state, c => c.unlocks > i) + "</span>";
      html += '<div class="item' + (i > state.unlocked ? " dim" : "") + '"><div class="mini-machine" style="--c:' + d.color + '"></div><div class="item-main"><b class="m-name">' + d.name + "</b><br>" + info + "</div>" + right + "</div>";
    });
    this.openPanel("Shop", html);
  },

  openRoom() {
    this.panelKind = "room";
    const cost = nextRoomCost(state);
    if (roomBlock(state)) { this.openPanel("A new room", "<p>Room " + (state.rooms + 1) + " has space for 16 more machines.</p><p class=\"pink\">🔒 " + roomBlock(state) + '. Upgrade your Front Counter first.</p><div class="row"><button class="btn" data-act="counter">Go to the Front Counter</button></div>'); return; }
    const can = state.money >= cost;
    this.openPanel("A new room", '<p>Room ' + (state.rooms + 1) + ' has space for 16 more machines. Every machine you put in lets more customers come in.</p>' +
      '<div class="row"><button class="btn big' + (can ? " glow" : " cant") + '" data-act="buy-room"' + (can ? "" : " disabled") + ">Buy it for " + money(cost) + "</button></div>" +
      (can ? "" : '<p class="muted">You need ' + money(cost - state.money) + " more.</p>"));
  },

  openFuse() {
    this.panelKind = "fuse";
    if (state.outage) this.openPanel("Fuse box", "<p>The power is out! Every machine has stopped. Lead the electricity back to the light to fix it.</p>" +
      '<div class="row"><button class="btn big glow" data-act="maze">⚡ Fix the power!</button></div>', "#ffd23f");
    else this.openPanel("Fuse box", "<p>All good. The power is on!</p>", "#ffd23f");
  },

  openMenu() {
    this.panelKind = "menu";
    this.openPanel("Menu",
      '<p><b class="yellow">' + esc(state.name) + "</b> · " + icon("coin", 16) + " " + money(state.totalEarned) + "</p>" +
      '<div class="row"><button class="btn ghost" data-act="music">Music: ' + (Sound.musicOn ? "ON" : "OFF") + '</button> <button class="btn ghost" data-act="sounds">Sounds: ' + (Sound.soundsOn ? "ON" : "OFF") + "</button></div>" +
      '<h3 class="menu-end">Game</h3><div class="row"><button class="btn" data-act="quit">Save and quit</button> <a class="btn ghost" href="../">Studio game</a></div>');
  },

  showAway(r) {
    let html = '<div class="panel card-box"><h2>Welcome back!</h2><p class="muted">' + icon("clock", 16) + " " + fmtAway(r.seconds) + "</p>";
    html += '<div class="away-coins">' + icon("coin", 44) + '<b class="yellow">' + money(state.coinBox) + "</b></div>";
    if (r.jobs && r.jobs.length) html += '<p>' + icon("check", 16) + " " + r.jobs.map(j => esc(jobName(j))).join(", ") + "</p>";
    if (r.bugs) html += '<p>' + icon("bug", 16) + " Bug!</p>";
    if (r.outage) html += '<p class="pink">' + icon("bolt", 16) + " Power out!</p>";
    html += '<div class="row"><button class="btn big glow" data-act="away-collect">' + icon("coin", 20) + " Collect!</button></div></div>";
    $("card").innerHTML = html;
    $("card").classList.remove("hidden");
  },

  // One short line at the bottom, with an icon.
  toast(text, ms, iconName) {
    const t = $("toast");
    t.innerHTML = (iconName ? icon(iconName, 22) + " " : "") + "<span>" + text + "</span>";
    t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop");
    t.classList.remove("hidden");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.add("hidden"), ms || 2500);
  },

  banner(big, small) {
    const b = $("banner");
    b.innerHTML = '<div class="banner-name">' + big + '</div><div class="banner-small">' + small + "</div>";
    b.classList.remove("hidden", "pop"); void b.offsetWidth; b.classList.add("pop");
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.add("hidden"), 3500);
  },

  // ----- Things you can use in the arcade --------------------------------

  interactables() {
    const list = [];
    for (const m of state.machines) list.push({ kind: "machine", m: m, stand: machineStand(m), rect: machineRect(m) });
    for (let room = 0; room < state.rooms; room++) {
      const taken = takenSpots(state, room), o = roomOrigin(room);
      for (let row = 0; row < 2; row++) for (let col = 0; col < SLOTS_PER_ROW; col++) {
        if (taken.has(row + "," + col)) continue;
        const x = o.x + 1 + col, y = o.y + SLOT_ROWS[row];
        list.push({ kind: "spot", room: room, row: row, col: col, stand: { x: x, y: y + 1 }, rect: { x: x * T, y: y * T, w: T, h: T } });
      }
    }
    if (state.rooms < 6) for (let j = 0; j < state.rooms; j++) if (roomsTouch(j, state.rooms))
      for (const d of doorsBetween(j, state.rooms)) list.push({ kind: "room", stand: { x: d.sx, y: d.sy }, rect: { x: d.x * T, y: d.y * T, w: T, h: T }, point: true });
    list.push({ kind: "fuse", stand: { x: FUSE.x, y: FUSE.y - 1 }, rect: { x: FUSE.x * T, y: FUSE.y * T, w: T, h: T }, point: true });
    list.push({ kind: "counter", stand: { x: COUNTER.x + 1, y: COUNTER.y - 1 }, rect: counterRect() });
    return list;
  },

  // The closest thing to you, if you're right next to it.
  findTarget() {
    const p = state.player;
    let best = null, bestD = 11;
    for (const it of this.interactables()) {
      let tx = (it.stand.x + 0.5) * T, ty = (it.stand.y + 0.5) * T;
      if (!it.point) tx = Math.max(it.rect.x + 3, Math.min(it.rect.x + it.rect.w - 3, p.x));
      const d = Math.hypot(p.x - tx, (p.y - ty) * 1.3);
      if (d < bestD) { bestD = d; best = it; }
    }
    return best;
  },

  useTarget() {
    if (!state || this.overlayOpen()) return;
    const t = this.target;
    if (!t) return;
    Sound.start(); Sound.play("click");
    if (t.kind === "spot") this.openSpot({ room: t.room, row: t.row, col: t.col });
    if (t.kind === "machine") this.openMachine(t.m);
    if (t.kind === "room") this.openRoom();
    if (t.kind === "fuse") this.openFuse();
    if (t.kind === "counter") this.openCounter();
  },

  // Tap (or click) the arcade: walk there. Tap a machine or spot: walk
  // up to it and open it.
  tap(cx, cy) {
    if (!state || this.overlayOpen()) return;
    Sound.start();
    const wx = cx / this.scale + this.view.x, wy = cy / this.scale + this.view.y;
    let goal = null;
    // Generous tap areas: the machine, the part sticking up, and its line.
    let bestD = 1e9;
    for (const it of this.interactables()) {
      const r = it.rect;
      const top = r.y - (it.kind === "machine" ? 10 + machineLift(it.m) : 2), bottom = r.y + r.h + (it.kind === "fuse" || it.kind === "room" ? 4 : 10);
      if (wx >= r.x - 2 && wx < r.x + r.w + 2 && wy >= top && wy < bottom) {
        const d = Math.hypot(wx - (r.x + r.w / 2), wy - (r.y + r.h / 2));
        if (d < bestD) { bestD = d; goal = it; }
      }
    }
    let tile = goal ? goal.stand : { x: Math.floor(wx / T), y: Math.floor(wy / T) };
    if (!goal && !walkable(state, tile.x, tile.y)) tile = nearestWalkable(state, tile.x, tile.y);
    if (!tile) return;
    const p = state.player;
    const path = findPath(state, Math.floor(p.x / T), Math.floor((p.y - 2) / T), tile.x, tile.y);
    if (!path) return;
    const points = path.slice(1).map(q => ({ x: (q.x + 0.5) * T, y: (q.y + 0.5) * T + 3 }));
    if (goal && goal.kind !== "spot" && !goal.point) points.push({ x: Math.max(goal.rect.x + 4, Math.min(goal.rect.x + goal.rect.w - 4, wx)), y: (goal.stand.y + 0.5) * T + 3 });
    else if (!goal && walkable(state, Math.floor(wx / T), Math.floor(wy / T))) points.push({ x: wx, y: wy });
    this.walkGoal = { points: points, target: goal };
    this.fling = null;
    this.tapMark = { x: wx, y: wy, age: 0 };
  },

  // Keeps you from getting stuck inside a machine you just placed.
  unstickPlayer() {
    const p = state.player;
    if (!walkable(state, Math.floor(p.x / T), Math.floor((p.y - 2) / T))) {
      const s = nearestWalkable(state, Math.floor(p.x / T), Math.floor((p.y - 2) / T));
      if (s) { p.x = (s.x + 0.5) * T; p.y = (s.y + 0.5) * T + 3; }
    }
  },

  // ----- Every frame ------------------------------------------------

  canStand(x, y) {
    const pts = [[x - 4, y - 4], [x + 4, y - 4], [x - 4, y], [x + 4, y]];
    return pts.every(([a, b]) => walkable(state, Math.floor(a / T), Math.floor(b / T)));
  },

  movePlayer(dt) {
    const p = state.player;
    p.phase += dt;
    const v = this.overlayOpen() ? { x: 0, y: 0 } : Input.moveVector();
    const speed = 72;
    let moved = false;
    if (v.x || v.y) {
      this.walkGoal = null;
      this.free = null; this.fling = null;
      const nx = p.x + v.x * speed * dt, ny = p.y + v.y * speed * dt;
      if (this.canStand(nx, p.y)) { p.x = nx; moved = true; }
      if (this.canStand(p.x, ny)) { p.y = ny; moved = true; }
      if (Math.abs(v.x) > Math.abs(v.y)) p.dir = v.x > 0 ? "right" : "left"; else p.dir = v.y > 0 ? "down" : "up";
    } else if (this.walkGoal && !this.overlayOpen()) {
      const g = this.walkGoal;
      const next = g.points[0];
      if (next) {
        const dx = next.x - p.x, dy = next.y - p.y, len = Math.hypot(dx, dy), step = speed * dt;
        if (len <= step) { p.x = next.x; p.y = next.y; g.points.shift(); }
        else { p.x += dx / len * step; p.y += dy / len * step; }
        if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? "right" : "left"; else p.dir = dy > 0 ? "down" : "up";
        moved = true;
      }
      if (!g.points.length) {
        this.walkGoal = null;
        if (g.target) { p.dir = "up"; this.target = g.target.kind === "fuse" || g.target.kind === "room" ? g.target : this.findTarget() || g.target; this.useTarget(); }
      }
    }
    p.walking = moved;
  },

  frame(dt) {
    this.time += dt;
    // After a quick swipe, the camera keeps gliding and slows down
    if (this.fling) {
      this.panBy(-this.fling.x * dt * this.scale, -this.fling.y * dt * this.scale);
      const k = Math.exp(-5 * dt);
      this.fling.x *= k; this.fling.y *= k;
      if (Math.hypot(this.fling.x, this.fling.y) < 30) this.fling = null;
    }
    Input.poll(dt);
    if (state) {
      tick(state, dt);
      for (const ev of state.events) {
        if (ev.type === "coin") { Art.floats.push({ x: ev.x, y: ev.y, amount: ev.amount, age: 0 }); this.flyCoin(ev.x, ev.y); }
        if (ev.type === "built") { this.toast(esc(ev.machine.name) + " ready!", 0, "check"); Sound.play("step"); }
        if (ev.type === "bug") { this.toast("A machine caught a bug!", 0, "bug"); Sound.play("nope"); }
        if (ev.type === "outage") { this.banner("POWER OUTAGE!", "Go to the fuse box"); Sound.play("nope"); }
        if (ev.type === "job") this.jobDone(ev.job);
      }
      state.events.length = 0;
      this.movePlayer(dt);
      this.updateMechanics(dt);
      this.target = this.findTarget();
      this.updateHud();
      this.refreshPanel(dt);
    }
    Art.update(dt);
    this.drawScene(dt);
  },

  drawScene(dt) {
    const s = state || this.demo();
    const p = s.player;
    const worldW = MAP_W * T, worldH = MAP_H * T;
    // Leave room for the boxes at the top and the button at the bottom,
    // so they never hide machines.
    const box = state ? document.querySelector(".hud-box.tl").getBoundingClientRect() : null;
    const padTop = box ? (box.bottom + 6) / this.scale : 0, padBottom = state ? (this.phone ? 96 : 60) / this.scale : 0;
    // Don't look above the rooms you own (the top wall stays below the top bar)
    const ownedTop = state && state.rooms <= 3 ? (roomOrigin(0).y - 1) * T : 0;
    const minY = ownedTop - padTop, maxY = worldH + padBottom - this.view.h;
    const free = state ? this.free : null;
    let tx = p.x - this.view.w / 2, ty = p.y - 10 - this.view.h / 2;
    if (free) { tx = free.x - this.view.w / 2; ty = free.y - this.view.h / 2; }
    tx = this.view.w >= worldW ? (worldW - this.view.w) / 2 : Math.max(0, Math.min(worldW - this.view.w, tx));
    ty = maxY <= minY ? (minY + maxY) / 2 : Math.max(minY, Math.min(maxY, ty));
    // Don't let the drag go further than the edge of the arcade
    if (free) { free.x = tx + this.view.w / 2; free.y = ty + this.view.h / 2; }
    const lookingAway = !!free;
    $("zoom-me").classList.toggle("hidden", !lookingAway);
    if (this.panned) { this.view.x = tx; this.view.y = ty; this.panned = false; }
    else if (this.snapCamera || !state) { this.view.x = tx; this.view.y = ty; this.snapCamera = false; }
    else { const k = Math.min(1, dt * 6); this.view.x += (tx - this.view.x) * k; this.view.y += (ty - this.view.y) * k; }
    this.view.tapMark = this.tapMark;
    if (this.tapMark) this.tapMark.age += dt;
    Art.draw(this.ctx, s, this.view, state ? this.target : null, this.time);
    this.drawLabels();
  },

  // Clear text and icons, drawn at full screen sharpness on top of the
  // pixel art (the "hybrid" look: pixel characters, easy-to-read labels).
  drawLabels() {
    const g = this.lctx, k = this.dpr, sc = this.scale;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.labelCanvas.width, this.labelCanvas.height);
    g.setTransform(k, 0, 0, k, 0, 0);
    g.textAlign = "center"; g.textBaseline = "middle";
    const sx = x => (x - this.view.x) * sc, sy = y => (y - this.view.y) * sc;
    const z = Math.max(0.8, sc / 4);          // labels grow a little with the zoom
    const pill = (x, y, text, color, font) => {
      g.font = font;
      const w = g.measureText(text).width + 14 * z, h = 22 * z;
      g.fillStyle = "rgba(11,6,24,0.88)";
      roundRect(g, x - w / 2, y - h / 2, w, h, 6 * z); g.fill();
      g.strokeStyle = color; g.lineWidth = 2; g.stroke();
      g.fillStyle = "#ffffff"; g.fillText(text, x, y + 1);
    };
    const list = Art.labels.slice().sort((a, b) => (a.top ? 1 : 0) - (b.top ? 1 : 0));
    for (const l of list) {
      const x = sx(l.x), y = sy(l.y);
      if (x < -100 || y < -60 || x > innerWidth + 100 || y > innerHeight + 60) continue;
      if (l.kind === "bubble") {
        const r = 13 * z;
        g.fillStyle = "#ffffff";
        g.beginPath(); g.arc(x, y - r, r, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.moveTo(x - 4 * z, y - 2 * z); g.lineTo(x + 4 * z, y - 2 * z); g.lineTo(x, y + 5 * z); g.fill();
        if (l.img && typeof iconImage === "function") { const im = iconImage(l.img), s2 = 16 * z; if (im.complete) { g.imageSmoothingEnabled = false; g.drawImage(im, x - s2 / 2, y - r - s2 / 2, s2, s2); } }
        else { g.font = Math.round(15 * z) + "px sans-serif"; g.fillText(l.text, x, y - r + 1); }
      } else if (l.kind === "float") {
        g.globalAlpha = l.alpha;
        g.font = "900 " + Math.round((l.text.startsWith("+") ? 15 : 18) * z * (0.6 + 0.4 * (l.pop || 1))) + "px Nunito, sans-serif";
        g.lineWidth = 4; g.strokeStyle = "#0b0618"; g.strokeText(l.text, x, y);
        g.fillStyle = "#ffd23f"; g.fillText(l.text, x, y);
        g.globalAlpha = 1;
      } else if (l.kind === "pill") {
        pill(x, y, l.text, l.color, "800 " + Math.round(13 * z) + "px Nunito, sans-serif");
      } else if (l.kind === "sign") {
        g.font = "900 " + Math.round(20 * z) + "px Nunito, sans-serif";
        const st = l.style || { color: "#ff8fcb", glow: "#ff3ea5" };
        g.shadowColor = st.glow; g.shadowBlur = 12;
        g.fillStyle = st.color; g.fillText(l.text.toUpperCase(), x, y);
        g.shadowBlur = 0;
      } else if (l.kind === "sale") {
        g.font = "900 " + Math.round(22 * z) + "px Nunito, sans-serif";
        g.shadowColor = "#ffd23f"; g.shadowBlur = 10;
        g.fillStyle = "#ffd23f"; g.fillText("ROOM FOR SALE", x, y - 14 * z); g.fillText(l.text, x, y + 14 * z);
        g.shadowBlur = 0;
      } else if (l.kind === "icon") {
        g.font = Math.round((l.size || 14) * z) + "px sans-serif";
        g.fillText(l.text, x, y);
      }
    }
  },

  // A pretend arcade behind the title screen.
  demo() {
    if (!this.demoState) {
      const s = newArcadeState("Pixel Empire Arcade");
      s.unlocked = 6;
      [["claw", 0, 0, 1], ["shooter", 0, 0, 3], ["pinball", 0, 0, 5], ["hockey", 0, 1, 1], ["whack", 0, 1, 4], ["punch", 0, 1, 6]].forEach(([t, r, row, col]) => {
        const m = placeMachine(s, t, r, row, col, true); if (m) m.status = "ok";
      });
      s.outageIn = 1e9; s.bugIn = 1e9;
      s.player.x = 5.5 * T; s.player.y = 14 * T;
      this.demoState = s;
    }
    tick(this.demoState, 1 / 60);
    this.demoState.events.length = 0;
    return this.demoState;
  },

  updateHud() {
    $("hud-money").textContent = money(this.shownMoney === undefined ? state.money : this.shownMoney);
    const full = state.customers.length >= capacity(state);
    $("hud-crowd").style.width = Math.min(100, state.customers.length / capacity(state) * 100).toFixed(1) + "%";
    $("hud-full").classList.toggle("hidden", !full);
    document.querySelector(".h-cust").classList.toggle("full", full);
    // One-time hints (learning by playing: they pop up only when useful)
    state.hints = state.hints || {};
    if (full && !state.hints.full && state.playSeconds > 20) {
      state.hints.full = true;
      this.toast("Full! Add machines", 5000, "people");
    }
    if (!state.hints.upgrade && state.machines.some(m => m.status === "ok" && canAffordUpgrade(state, m))) {
      state.hints.upgrade = true;
      this.toast("Upgrades ready!", 5000, "up");
    }
    if (!state.hints.counter && nextCounter(state) && state.money >= nextCounter(state).cost) {
      state.hints.counter = true;
      this.toast("Upgrade the Front Counter!", 5000, "counter");
    }
    const shopGlow = full && ((nextRoomCost(state) !== null && state.money >= nextRoomCost(state) && !roomBlock(state)) || (signCost(state) !== null && state.money >= signCost(state) && !signBlock(state)));
    this.updateSystemsHud(shopGlow);
    // The money box bumps when money comes in
    if (state.money > (this.lastMoney || 0) + 0.5 && this.time - (this.lastBump || 0) > 0.35) {
      const el = $("hud-money"); el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
      this.lastBump = this.time;
    }
    this.lastMoney = state.money;
    const pr = $("prompt");
    const t = this.target;
    if (!t || this.overlayOpen()) { pr.classList.add("hidden"); return; }
    let text = "";
    if (t.kind === "spot") text = "Add a game";
    if (t.kind === "machine") text = t.m.status === "ok" && canAffordUpgrade(state, t.m) ? "⬆ Upgrade " + esc(t.m.name) : esc(t.m.name) + (t.m.status === "building" ? " · Build it faster" : t.m.status === "bug" ? " · Fix the bug!" : "");
    if (t.kind === "room") text = "Buy a new room · " + money(nextRoomCost(state));
    if (t.kind === "fuse") text = state.outage ? "Fix the power!" : "Fuse box";
    if (t.kind === "counter") text = state.coinBox > 0 ? "🪙 Collect " + money(state.coinBox) : "Front Counter · level " + state.counter;
    const key = Input.device === "gamepad" ? '<span class="key pad">A</span>' : Input.device === "touch" ? '<span class="key">TAP</span>' : '<span class="key">SPACE</span>';
    const html = key + " " + text;
    if (pr.innerHTML !== html) pr.innerHTML = html;
    pr.classList.remove("hidden");
  },

  // Keeps an open pop-up up to date (like a build timer counting down).
  refreshPanel(dt) {
    this.panelTimer = (this.panelTimer || 0) + dt;
    if (this.panelTimer < 0.5) return;
    this.panelTimer = 0;
    if (this.panelKind === "machine") {
      const m = state.machines.find(x => x.id === this.panelMachine);
      if (!m) return;
      const el = $("build-left");
      if (m.status === "building" && el) el.textContent = fmtClock(m.buildLeft);
      if ((m.status !== "building" && el) || (m.status === "bug" && !document.querySelector(".status-box.bug"))) {
        if (document.activeElement && document.activeElement.id === "machine-name") return;
        this.openMachine(m);
      }
    }
    if ($("panel-money") && state) $("panel-money").textContent = money(state.money);
    // Buttons that turn on once you have enough money
    document.querySelectorAll("#panel .job-left").forEach(el => { const j = state.jobs.find(x => x.id === el.dataset.job); if (j) el.textContent = fmtClock(j.left); });
    if (this.panelKind === "counter" || this.panelKind === "mechanics") { this[this.panelKind === "counter" ? "openCounter" : "openMechanics"](); return; }
    document.querySelectorAll("#panel [data-act=upgrade], #panel [data-act=sign], #panel [data-act=counter-up], #panel [data-act=buy-room], #panel [data-act=place], #panel [data-act=swap]").forEach(b => {
      const m = b.textContent.match(/\$([\d,]+)/);
      if (!m) return;
      const can = state.money >= +m[1].replace(/,/g, "");
      b.disabled = !can; b.classList.toggle("cant", !can);
      if (b.dataset.cost) b.style.setProperty("--fill", Math.min(100, state.money / +b.dataset.cost * 100).toFixed(1) + "%");
    });
  },
};

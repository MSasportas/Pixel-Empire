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
    this.ctx = this.canvas.getContext("2d");
    this.fit();
    window.addEventListener("resize", () => this.fit());
    Input.init(this.canvas, {
      onAction: () => this.useTarget(),
      onBack: () => this.back(),
      onMenu: () => { if (state && !Minigames.active) { if ($("panel").classList.contains("hidden")) this.openMenu(); else this.closePanel(); } },
      onTap: (cx, cy) => this.tap(cx, cy),
    });
    // All buttons in pop-ups use data-act="..." (one listener for all).
    document.addEventListener("click", e => {
      const b = e.target.closest ? e.target.closest("[data-act]") : null;
      if (!b || b.disabled) return;
      Sound.start();
      this.act(b.dataset.act, b.dataset, b);
    });
    $("prompt").addEventListener("click", () => this.useTarget());
  },

  // Makes the picture fill the window, with big crisp pixels.
  fit() {
    this.scale = Math.max(2, Math.floor(Math.min(innerWidth / 260, innerHeight / 170)));
    this.view.w = Math.ceil(innerWidth / this.scale);
    this.view.h = Math.ceil(innerHeight / this.scale);
    this.canvas.width = this.view.w;
    this.canvas.height = this.view.h;
    this.canvas.style.width = this.view.w * this.scale + "px";
    this.canvas.style.height = this.view.h * this.scale + "px";
    this.ctx.imageSmoothingEnabled = false;
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
    this.walkGoal = null;
    this.snapCamera = true;
    const away = catchUp(state);
    if (away && away.seconds >= CONFIG.welcomeBackAfterSeconds) this.showAway(away);
    if (state.outage) this.banner("POWER OUTAGE!", "Walk to the fuse box by the front door");
    if (state.machines.length === 0 && state.unlocked === 0) this.toast("Walk up to a glowing square and press Space, A, or tap it to add a game!", 8000);
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
    if (name === "menu") this.openMenu();
    if (name === "quit") { this.save(); this.closePanel(); this.showTitle(); }
    if (name === "music") { Sound.setMusic(!Sound.musicOn); this.saveSound(); this.openMenu(); }
    if (name === "sounds") { Sound.setSounds(!Sound.soundsOn); this.saveSound(); this.openMenu(); }

    if (!state) return;
    const spot = this.panelSpot;
    const m = this.panelMachine ? state.machines.find(x => x.id === this.panelMachine) : null;
    if (name === "unlock") {
      if (unlockNext(state)) {
        Sound.play("buy");
        this.toast("You unlocked the " + CONFIG.machines[state.unlocked - 1].name + "!");
        if (spot) this.openSpot(spot); else this.closePanel();
      }
    }
    if (name === "place" && spot) {
      const placed = placeMachine(state, data.type, spot.room, spot.row, spot.col);
      if (placed) {
        Sound.play("buy");
        this.unstickPlayer();
        this.closePanel();
        this.toast("Building " + esc(placed.name) + "! Walk up to it to build it faster.");
      }
    }
    if (name === "upgrade" && m) { if (buyUpgrade(state, m, data.id)) { Sound.play("buy"); this.openMachine(m); } }
    if (name === "rename" && m) { renameMachine(m, $("machine-name").value); Sound.play("click"); this.openMachine(m); }
    if (name === "random-machine-name" && m) { $("machine-name").value = randomGameName(); }
    if (name === "remove" && m) {
      if (this.removeArmed === m.id) { removeMachine(state, m); this.closePanel(); this.toast(esc(m.name) + " was taken away."); }
      else { this.removeArmed = m.id; button.textContent = "Tap again to remove it"; }
    }
    if (name === "speed-up" && m) {
      this.closePanel();
      Minigames.start("code", machineDef(m).color, score => {
        speedUpBuild(state, m, score);
        if (score >= 1) this.toast("PERFECT! " + esc(m.name) + " is ready!");
      });
    }
    if (name === "fix" && m) {
      this.closePanel();
      Minigames.start("bugs", "#7cff6b", score => {
        if (score >= CONFIG.bugFixScore) { fixBug(state, m); Sound.play("step"); this.toast(esc(m.name) + " is fixed!"); }
      });
    }
    if (name === "buy-room") {
      if (buyRoom(state)) { Sound.play("level"); this.closePanel(); this.banner("NEW ROOM!", "Room " + state.rooms + " is open"); }
    }
    if (name === "maze") {
      this.closePanel();
      Minigames.start("maze", "#ffd23f", score => {
        if (score >= 1) { fixOutage(state); Sound.play("level"); this.toast("The power is back on!"); $("banner").classList.add("hidden"); }
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
    $("panel").innerHTML = '<div class="panel panel-main"' + (color ? ' style="border-color:' + color + '"' : "") + '>' +
      '<div class="panel-head"><h2>' + title + '</h2><button class="btn ghost small" data-act="close">✕</button></div>' +
      '<div class="panel-body">' + body + "</div></div>";
    $("panel").classList.remove("hidden");
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
        '<span class="muted">' + playersText(d) + " · " + squaresText(d) + " · " + money(d.price) + " a play · builds in " + fmtClock(d.build) + "</span></div>" +
        (why ? '<span class="muted small-note">' + why + "</span>" : '<button class="btn" data-act="place" data-type="' + d.id + '">Place it</button>') + "</div>";
    }
    const next = CONFIG.machines[state.unlocked];
    if (next) {
      html += '<div class="item locked"><div class="mini-machine" style="--c:' + next.color + '"></div><div class="item-main"><b class="m-name">🔒 ' + next.name + '</b><br>' +
        '<span class="muted">' + playersText(next) + " · " + squaresText(next) + " · " + money(next.price) + " a play</span></div>" +
        '<button class="btn' + (state.money < next.unlock ? " cant" : "") + '" data-act="unlock"' + (state.money < next.unlock ? " disabled" : "") + ">Unlock " + money(next.unlock) + "</button></div>";
      const left = CONFIG.machines.length - state.unlocked - 1;
      if (left > 0) html += '<p class="muted center">' + left + " more machines to unlock after that</p>";
    }
    this.openPanel("Add a game", html);
  },

  openMachine(m) {
    this.panelKind = "machine"; this.panelMachine = m.id; this.panelSpot = null; this.removeArmed = null;
    const d = machineDef(m);
    let html = '<div class="row"><input id="machine-name" maxlength="24" value="' + esc(m.name) + '"> ' +
      '<button class="btn ghost small" data-act="random-machine-name">🎲</button> <button class="btn small" data-act="rename">Rename</button></div>' +
      '<p class="muted">' + d.name + " · " + playersText(d) + "</p>";
    if (m.status === "building") {
      html += '<div class="status-box"><b class="cyan">Building...</b> ready in <span id="build-left">' + fmtClock(m.buildLeft) + "</span>" + bar(1 - m.buildLeft / d.build, d.color) +
        '<div class="row"><button class="btn glow" data-act="speed-up">⚡ Build it faster (typing game)</button></div></div>';
    } else if (m.status === "bug") {
      html += '<div class="status-box bug"><b class="pink">🐞 It caught a bug!</b> It plays at half speed until you fix it.' +
        '<div class="row"><button class="btn glow" data-act="fix">Fix it! (squash game)</button></div></div>';
    } else {
      html += '<div class="status-box"><b class="green">Working!</b> ' + (state.outage ? "(but the power is out)" : "") + "</div>";
    }
    html += '<div class="stats"><div><span class="muted">Price</span> <b>' + money(playPrice(m)) + '</b></div><div><span class="muted">Plays</span> <b>' + fmt(m.plays) +
      '</b></div><div><span class="muted">Earned</span> <b>' + money(m.earned) + '</b></div><div><span class="muted">Line</span> <b>' + m.queue.length + "/" + lineSlots(m) + "</b></div></div>";
    html += "<h3>Upgrades</h3>";
    for (const u of CONFIG.upgrades) {
      const cost = upgradeCost(m, u.id), lvl = m.up[u.id];
      const dots = "●".repeat(lvl) + "○".repeat(u.cost.length - lvl);
      html += '<div class="item"><div class="item-main"><b>' + u.name + '</b> <span class="dots">' + dots + '</span><br><span class="muted">' + u.about + "</span></div>" +
        (cost === null ? '<span class="owned">MAX</span>' : '<button class="btn' + (state.money < cost ? " cant" : "") + '" data-act="upgrade" data-id="' + u.id + '"' + (state.money < cost ? " disabled" : "") + ">" + money(cost) + "</button>") + "</div>";
    }
    html += '<div class="row" style="margin-top:14px"><button class="btn ghost small" data-act="remove">Remove machine</button></div>';
    this.openPanel(esc(m.name), html, d.color);
  },

  openRoom() {
    this.panelKind = "room";
    const cost = nextRoomCost(state);
    const can = state.money >= cost;
    this.openPanel("A new room", '<p>Room ' + (state.rooms + 1) + ' has space for 16 more machines, and ' + CONFIG.customersPerRoom + ' more customers can come in at once.</p>' +
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
      '<p><b class="yellow">' + esc(state.name) + "</b><br>" + fmtDate(state.day) + " · " + money(state.totalEarned) + " earned so far</p>" +
      '<div class="row"><button class="btn ghost" data-act="music">Music: ' + (Sound.musicOn ? "ON" : "OFF") + '</button> <button class="btn ghost" data-act="sounds">Sounds: ' + (Sound.soundsOn ? "ON" : "OFF") + "</button></div>" +
      "<h3>Controls</h3><p class=\"muted\">Keyboard: arrow keys or WASD to walk, Space to use.<br>Controller: stick to walk, A to use, B to go back.<br>Phone: tap where you want to go.</p>" +
      '<div class="row"><button class="btn" data-act="quit">Save and go to the title</button> <a class="btn ghost" href="../">Play the studio game</a></div>' +
      '<p class="muted small-note">This is the arcade test version. It has its own saves and never touches your studio game saves.</p>');
  },

  showAway(r) {
    let html = '<div class="panel card-box"><h2>Welcome back!</h2><p>You were away for ' + fmtAway(r.seconds) + ".</p>" +
      '<div class="away-grid"><span>Customers paid</span><b>' + money(r.money) + "</b>";
    if (r.built) html += "<span>Machines built</span><b>" + r.built + "</b>";
    if (r.bugs) html += "<span>Machines with bugs</span><b>" + r.bugs + " 🐞</b>";
    html += "</div>";
    if (r.outage) html += '<p class="pink">The power went out while you were away! Machines are running at half speed. Fix it at the fuse box.</p>';
    else if (r.bugs) html += '<p class="muted">Bugged machines run at half speed until you fix them.</p>';
    html += '<div class="row"><button class="btn big" data-act="card-close">Let\'s go!</button></div></div>';
    $("card").innerHTML = html;
    $("card").classList.remove("hidden");
  },

  toast(text, ms) {
    const t = $("toast");
    t.innerHTML = text;
    t.classList.remove("hidden");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.add("hidden"), ms || 3500);
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
  },

  // Tap (or click) the arcade: walk there. Tap a machine or spot: walk
  // up to it and open it.
  tap(cx, cy) {
    if (!state || this.overlayOpen()) return;
    Sound.start();
    const wx = cx / this.scale + this.view.x, wy = cy / this.scale + this.view.y;
    let goal = null;
    for (const it of this.interactables()) {
      const r = it.rect;
      if (wx >= r.x - 1 && wx < r.x + r.w + 1 && wy >= r.y - 1 && wy < r.y + r.h + 1) { goal = it; break; }
    }
    const tile = goal ? goal.stand : { x: Math.floor(wx / T), y: Math.floor(wy / T) };
    const p = state.player;
    const path = findPath(state, Math.floor(p.x / T), Math.floor((p.y - 2) / T), tile.x, tile.y);
    if (!path) return;
    const points = path.slice(1).map(q => ({ x: (q.x + 0.5) * T, y: (q.y + 0.5) * T + 3 }));
    if (goal && goal.kind !== "spot" && !goal.point) points.push({ x: Math.max(goal.rect.x + 4, Math.min(goal.rect.x + goal.rect.w - 4, wx)), y: (goal.stand.y + 0.5) * T + 3 });
    else if (!goal) points.push({ x: wx, y: wy });
    this.walkGoal = { points: points, target: goal };
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
    Input.poll(dt);
    if (state) {
      tick(state, dt);
      for (const ev of state.events) {
        if (ev.type === "coin") { Art.floats.push({ x: ev.x, y: ev.y, amount: ev.amount, age: 0 }); }
        if (ev.type === "built") { this.toast(esc(ev.machine.name) + " is ready to play!"); Sound.play("step"); }
        if (ev.type === "bug") { this.toast("🐞 " + esc(ev.machine.name) + " caught a bug! Walk over and fix it."); Sound.play("nope"); }
        if (ev.type === "outage") { this.banner("POWER OUTAGE!", "Walk to the fuse box by the front door"); Sound.play("nope"); }
      }
      state.events.length = 0;
      this.movePlayer(dt);
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
    let tx = p.x - this.view.w / 2, ty = p.y - 10 - this.view.h / 2;
    tx = this.view.w >= worldW ? (worldW - this.view.w) / 2 : Math.max(0, Math.min(worldW - this.view.w, tx));
    ty = this.view.h >= worldH ? (worldH - this.view.h) / 2 : Math.max(0, Math.min(worldH - this.view.h, ty));
    if (this.snapCamera || !state) { this.view.x = tx; this.view.y = ty; this.snapCamera = false; }
    else { const k = Math.min(1, dt * 6); this.view.x += (tx - this.view.x) * k; this.view.y += (ty - this.view.y) * k; }
    Art.draw(this.ctx, s, this.view, state ? this.target : null, this.time);
  },

  // A pretend arcade behind the title screen.
  demo() {
    if (!this.demoState) {
      const s = newArcadeState("Pixel Empire Arcade");
      s.unlocked = 6;
      [["claw", 0, 0, 1], ["shooter", 0, 0, 3], ["pinball", 0, 0, 5], ["hockey", 0, 1, 1], ["whack", 0, 1, 4], ["punch", 0, 1, 6]].forEach(([t, r, row, col]) => {
        const m = placeMachine(s, t, r, row, col); if (m) { m.status = "ok"; m.bugIn = 1e9; }
      });
      s.outageIn = 1e9;
      s.player.x = 5.5 * T; s.player.y = 14 * T;
      this.demoState = s;
    }
    tick(this.demoState, 1 / 60);
    this.demoState.events.length = 0;
    return this.demoState;
  },

  updateHud() {
    $("hud-money").textContent = money(state.money);
    $("hud-customers").textContent = state.customers.length + " / " + capacity(state);
    $("hud-time").textContent = fmtDate(state.day);
    const pr = $("prompt");
    const t = this.target;
    if (!t || this.overlayOpen()) { pr.classList.add("hidden"); return; }
    let text = "";
    if (t.kind === "spot") text = "Add a game";
    if (t.kind === "machine") text = esc(t.m.name) + (t.m.status === "building" ? " · Build it faster" : t.m.status === "bug" ? " · Fix the bug!" : "");
    if (t.kind === "room") text = "Buy a new room · " + money(nextRoomCost(state));
    if (t.kind === "fuse") text = state.outage ? "Fix the power!" : "Fuse box";
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
    // Buttons that turn on once you have enough money
    document.querySelectorAll("#panel [data-act=unlock], #panel [data-act=upgrade], #panel [data-act=buy-room]").forEach(b => {
      const m = b.textContent.match(/\$([\d,]+)/);
      if (!m) return;
      const can = state.money >= +m[1].replace(/,/g, "");
      b.disabled = !can; b.classList.toggle("cant", !can);
    });
  },
};

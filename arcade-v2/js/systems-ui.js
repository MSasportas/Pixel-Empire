// =====================================================================
//  PIXEL EMPIRE ARCADE - SCREENS FOR THE BIG SYSTEMS
//  ---------------------------------------------------------------------
//  The Front Counter pop-up (and its coin box), the Mechanics pop-up,
//  the Fame Road, the little boxes at the top for them, and the
//  Mechanics who walk to whatever they're upgrading.
//  It adds more jobs to UI (from ui.js).
// =====================================================================

// Looks that can't be on at the same time (turning one on turns the others off).
const LOOK_GROUPS = [["floorCheck", "floorStars", "floorLava"], ["signCyan", "signRainbow"], ["cap", "crown"]];
const LOOK_NAMES = {};
CONFIG.road.forEach(r => { if (r.kind === "look") LOOK_NAMES[r.look] = r.name; });

function lookGroup(key) { return LOOK_GROUPS.find(g => g.includes(key)) || [key]; }
function turnLookOn(state, key) { for (const k of lookGroup(key)) if (k in state.looks) state.looks[k] = false; state.looks[key] = true; }

// Where a Mechanic stands (in squares) for a job, or when they have nothing to do.
function mechanicSpot(state, job, i) {
  if (job && job.kind === "type") {
    const m = state.machines.find(x => x.type === job.type && x.status !== "building") || state.machines.find(x => x.type === job.type);
    if (m) return machineStand(m);
  }
  if (job && job.kind === "sign") return { x: DOOR_X[1] + 1 + i, y: SIDEWALK_Y };
  if (job && job.kind === "counter") return { x: COUNTER.x + (i % 2), y: COUNTER.y - 1 };
  const idle = [{ x: COUNTER.x - 1, y: COUNTER.y }, { x: COUNTER.x + COUNTER.w, y: COUNTER.y }, { x: COUNTER.x - 1, y: COUNTER.y - 1 }, { x: COUNTER.x + COUNTER.w, y: COUNTER.y - 1 }];
  return idle[i % idle.length];
}

function rewardIcon(r) { return { coins: "coin", look: "gift", box: "coin", mechanic: "wrench", builds: "bolt", job: "clock" }[r.kind] || "gift"; }
function rewardText(r) {
  if (r.kind === "coins") return icon("coin", 18) + " <b>" + (state ? money(coinReward(state, r.minutes)) : r.minutes + " min") + "</b>";
  return icon(rewardIcon(r), 18) + " " + esc(r.name.replace(/ \(.*\)$/, ""));
}

// A job's progress: a bar, the time left, and the speed-up buttons.
function jobBox(job) {
  const part = Math.max(0, Math.min(1, 1 - job.left / job.total));
  let html = '<div class="status-box job-box"><b>' + esc(jobName(job)) + "</b>" +
    '<div class="bar"><div class="bar-fill" data-jobbar="' + job.id + '" style="width:' + (part * 100).toFixed(1) + '%"></div></div>' +
    icon("clock", 16) + ' <b class="job-left" data-job="' + job.id + '">' + fmtClock(job.left) + "</b>" +
    '<div class="row">';
  if (!job.spedUp) html += '<button class="btn glow small" data-act="speed-job" data-job="' + job.id + '">' + icon("bolt", 16) + " Faster!</button> ";
  if (state.instantJobs > 0) html += '<button class="btn ghost small" data-act="instant-job" data-job="' + job.id + '">' + icon("clock", 16) + " Now! ×" + state.instantJobs + "</button>";
  return html + "</div></div>";
}

Object.assign(UI, {
  mechs: [],
  robot: null,

  // ----- Mechanics walking around ---------------------------------------
  updateMechanics(dt) {
    if (!state) return;
    while (this.mechs.length < state.mechanics) {
      const i = this.mechs.length, s = mechanicSpot(state, null, i);
      this.mechs.push({ i: i, x: (s.x + 0.5) * T, y: (s.y + 0.5) * T + 3, walking: false, job: null, jobId: null, arrived: false, points: [], goal: null });
    }
    // Give each job to a Mechanic (a Mechanic keeps their job until it's done).
    const ids = new Set(state.jobs.map(j => j.id));
    for (const m of this.mechs) if (m.jobId && !ids.has(m.jobId)) { m.jobId = null; m.job = null; }
    for (const job of state.jobs) {
      if (this.mechs.some(m => m.jobId === job.id)) continue;
      const free = this.mechs.find(m => !m.jobId);
      if (free) { free.jobId = job.id; }
    }
    for (const m of this.mechs) {
      m.job = m.jobId ? state.jobs.find(j => j.id === m.jobId) || null : null;
      const spot = mechanicSpot(state, m.job, m.i);
      const key = spot.x + "," + spot.y + "," + state.map.version;
      if (m.goal !== key) {
        m.goal = key; m.arrived = false;
        const path = findPath(state, Math.floor(m.x / T), Math.floor((m.y - 2) / T), spot.x, spot.y);
        m.points = path ? path.slice(1).map(q => ({ x: (q.x + 0.5) * T, y: (q.y + 0.5) * T + 3 })) : [{ x: (spot.x + 0.5) * T, y: (spot.y + 0.5) * T + 3 }];
        if (!path) { m.x = m.points[0].x; m.y = m.points[0].y; m.points = []; }
      }
      m.walking = m.points.length > 0;
      if (m.walking) {
        let step = 40 * dt;
        while (step > 0 && m.points.length) {
          const p = m.points[0], d = Math.hypot(p.x - m.x, p.y - m.y);
          if (d <= step) { m.x = p.x; m.y = p.y; m.points.shift(); step -= d; }
          else { m.x += (p.x - m.x) / d * step; m.y += (p.y - m.y) / d * step; step = 0; }
        }
      } else m.arrived = true;
    }
    this.updateRobot(dt);
  },

  // The robot mascot wanders around room 1 and waves at you.
  updateRobot(dt) {
    if (!lookOn(state, "robot")) { this.robot = null; return; }
    const o = roomOrigin(0);
    if (!this.robot) this.robot = { x: (o.x + 8.5) * T, y: (o.y + 7.5) * T + 3, walking: false, wave: false, points: [], wait: 2 };
    const r = this.robot, p = state.player;
    r.wave = Math.hypot(p.x - r.x, p.y - r.y) < 28;
    if (r.wave) { r.walking = false; return; }
    if (!r.points.length) {
      r.walking = false; r.wait -= dt;
      if (r.wait <= 0) {
        r.wait = 2 + Math.random() * 4;
        const tx = o.x + Math.floor(Math.random() * ROOM_W), ty = o.y + [3, 7][Math.floor(Math.random() * 2)];
        const path = walkable(state, tx, ty) && findPath(state, Math.floor(r.x / T), Math.floor((r.y - 2) / T), tx, ty);
        if (path) r.points = path.slice(1).map(q => ({ x: (q.x + 0.5) * T, y: (q.y + 0.5) * T + 3 }));
      }
      return;
    }
    r.walking = true;
    const q = r.points[0], d = Math.hypot(q.x - r.x, q.y - r.y), step = 22 * dt;
    if (d <= step) { r.x = q.x; r.y = q.y; r.points.shift(); }
    else { r.x += (q.x - r.x) / d * step; r.y += (q.y - r.y) / d * step; }
  },

  // ----- Jobs starting and finishing --------------------------------------
  jobStarted(job) {
    let text = "🔧 A Mechanic is on it: <b>" + esc(jobName(job)) + "</b> (" + fmtDuration(job.total) + ")";
    this.toast(esc(jobName(job)) + " · " + fmtDuration(job.total), 0, "wrench");
  },

  jobDone(job) {
    Sound.play("level");
    if (job.kind === "type") {
      for (const m of state.machines) if (m.type === job.type && m.status !== "building") this.celebrate(m, "UPGRADED!");
      this.toast("Upgraded!", 0, "up");
    }
    if (job.kind === "sign") {
      Art.burst(DOOR_X[1] * T, (SIDEWALK_Y + 1) * T);
      this.toast("Brighter sign! More customers", 0, "bulb");
    }
    if (job.kind === "counter") {
      const r = counterRect();
      Art.burst(r.x + r.w / 2, r.y); Art.burst(r.x + r.w / 2, r.y - 6);
      const names = (job.newTypes || []).map(id => byId(CONFIG.machines, id).name);
      this.levelUp(state.counter, names);
    }
    this.refreshOpen();
  },

  // Redraws the pop-up that's open (after something changed).
  refreshOpen() {
    const k = this.panelKind;
    if (k === "shop") this.openShop();
    else if (k === "counter") this.openCounter();
    else if (k === "mechanics") this.openMechanics();
    else if (k === "fame") this.openFame();
  },

  starsToast(n) {
    this.toast("+" + n + (rewardWaiting(state) ? " · Reward ready!" : ""), 0, "star");
  },

  // ----- Buttons for the big systems ----------------------------------
  systemAct(name, data) {
    if (!state) return;
    if (name === "counter") this.openCounter();
    if (name === "mechanics") this.openMechanics();
    if (name === "fame") this.openFame();
    if (name === "counter-up") {
      const job = buyCounter(state);
      if (job) { Sound.play("buy"); this.jobStarted(job); this.openCounter(); }
    }
    if (name === "collect") this.collect(0);
    if (name === "coin-rush") {
      this.closePanel();
      Minigames.start("coins", "#ffd23f", score => {
        const extra = CONFIG.coinRush.bonus * score;
        addStars(state, CONFIG.stars.coinRush);
        this.collect(extra);
        this.starsToast(CONFIG.stars.coinRush);
      });
    }
    const job = data && data.job ? state.jobs.find(j => j.id === data.job) : null;
    if (name === "speed-job" && job && !job.spedUp) {
      const back = this.panelKind;
      this.closePanel();
      Minigames.start("code", "#ff7a3d", score => {
        const left = job.left;
        speedUpJob(state, job, score);
        this.toast(job.left < 1 ? "Done! +" + CONFIG.stars.speedUp : fmtClock(left) + " → " + fmtClock(job.left), 0, "bolt");
        if (back === "counter") this.openCounter(); else if (back === "mechanics") this.openMechanics();
      });
    }
    if (name === "instant-job" && job) { if (useInstantJob(state, job)) { Sound.play("buy"); this.refreshOpen(); } }
    if (name === "claim") {
      const r = claimStep(state);
      if (r) {
        Sound.play("level");
        if (r.kind === "coins") this.toast("+" + money(r.amount), 0, "coin");
        if (r.kind === "look") { turnLookOn(state, r.look); this.toast(esc(r.name.replace(/ \(.*\)$/, "")) + "!", 0, "gift"); this.robot = null; }
        if (r.kind === "box") this.toast("Bigger coin box!", 0, "coin");
        if (r.kind === "mechanic") this.banner("NEW MECHANIC!", "3 jobs at once");
        if (r.kind === "builds") this.toast(r.count + " instant builds!", 0, "bolt");
        if (r.kind === "job") this.toast("Finish-now ticket!", 0, "clock");
        this.save();
        this.openFame();
      }
    }
    if (name === "look-toggle" && data.look in state.looks) {
      if (state.looks[data.look]) state.looks[data.look] = false; else turnLookOn(state, data.look);
      Sound.play("click"); this.robot = null; this.openMenu();
    }
  },

  collect(extra) {
    if (!(state.coinBox > 0)) return;
    const amount = collectBox(state, extra);
    const r = counterRect();
    Sound.play("level");
    Art.burst(r.x + r.w - 8, r.y - 6);
    Art.floats.push({ x: r.x + r.w - 8, y: r.y - 10, amount: amount, age: 0 });
    this.toast("+" + money(amount) + (extra > 0 ? " (+" + Math.round(extra * 100) + "%)" : ""), 0, "coin");
    if (this.panelKind === "counter") this.openCounter();
    this.free = null;
    this.save();
  },

  // Draws a pop-up, but if only the timers changed it just updates them
  // (so buttons don't jump while you're pressing them).
  systemPanel(kind, title, html, color) {
    // Leave out the bits that change all the time (timers, bars, money needed).
    const sig = html.replace(/(data-job="[^"]*">)[^<]*/g, "$1").replace(/(data-need="[^"]*">)[^<]*/g, "$1").replace(/width:[\d.]+%/g, "").replace(/--fill:[\d.]+%/g, "");
    if (this.panelKind === kind && this.panelSig === sig && !$("panel").classList.contains("hidden")) {
      document.querySelectorAll("#panel [data-need]").forEach(el => { el.textContent = money(Math.max(0, +el.dataset.need - state.money)); });
      document.querySelectorAll("#panel [data-cost]").forEach(el => el.style.setProperty("--fill", Math.min(100, state.money / +el.dataset.cost * 100).toFixed(1) + "%"));
      document.querySelectorAll("#panel [data-jobbar]").forEach(el => {
        const j = state.jobs.find(x => x.id === el.dataset.jobbar);
        if (j) el.style.width = (Math.max(0, Math.min(1, 1 - j.left / j.total)) * 100).toFixed(1) + "%";
      });
      return;
    }
    this.panelKind = kind; this.panelSpot = null; this.panelMachine = null;
    this.openPanel(title, html, color);
    this.panelKind = kind; this.panelSig = sig;
  },

  // ----- The Front Counter ------------------------------------------------
  counterShopItem() {
    const next = nextCounter(state), job = jobFor(state, "counter");
    let right = '<button class="btn small" data-act="counter">Open</button>';
    if (job) right = '<span class="owned job-left" data-job="' + job.id + '">' + fmtClock(job.left) + "</span>";
    const news = next ? CONFIG.machines.slice(state.unlocked, next.unlocks) : [];
    const nextText = !next ? icon("crown", 14) + " Legend!" : news.length ? icon("lock", 14) + " " + news.map(d => d.name).join(", ") : icon("up", 14) + " Bigger arcade";
    return "<h3>" + icon("counter", 16) + " Front Counter</h3>" + '<div class="item counter-item"><div class="item-main"><b class="m-name">Level ' + state.counter + "/" + CONFIG.counter.length + '</b><br><span class="muted">' + nextText + "</span></div>" + right + "</div>";
  },

  openCounter() {
    const lv = state.counter, now = counterInfo(state), next = nextCounter(state), job = jobFor(state, "counter");
    let html = "";
    // The coin box comes first
    if (state.coinBox > 0) {
      html += '<div class="status-box coin-box"><div class="away-coins">' + icon("coin", 36) + '<b class="yellow">' + money(state.coinBox) + "</b></div>" +
        '<div class="row"><button class="btn big glow" data-act="collect">' + icon("coin", 20) + " Collect</button>";
      if (state.boxAway >= CONFIG.coinRush.afterSeconds) html += ' <button class="btn big ghost" data-act="coin-rush">' + icon("play", 20) + " Coin rush +" + Math.round(CONFIG.coinRush.bonus * 100) + "%</button>";
      html += "</div></div>";
    }
    html += '<div class="counter-level"><div class="lights">' + CONFIG.counter.map((c, i) => '<span class="light' + (i < lv ? " on" : "") + '"></span>').join("") + "</div>" +
      "<b>Level " + lv + "</b></div>";
    // What you have now, as three icons with numbers
    const chips = (c, prev) => '<div class="chips">' +
      '<span class="chip' + (prev && c.maxRooms > prev.maxRooms ? " new" : "") + '">' + icon("door", 18) + " " + c.maxRooms + "</span>" +
      '<span class="chip' + (prev && c.maxUpgrade > prev.maxUpgrade ? " new" : "") + '">' + icon("up", 18) + " " + c.maxUpgrade + "</span>" +
      '<span class="chip' + (prev && c.maxSign > prev.maxSign ? " new" : "") + '">' + icon("bulb", 18) + " " + c.maxSign + "</span></div>";
    html += chips(now);
    if (!next) {
      html += '<div class="status-box legend">' + icon("crown", 32) + '<br><b class="yellow">ARCADE LEGEND!</b></div>';
    } else {
      const newMachines = CONFIG.machines.slice(Math.max(state.unlocked, now.unlocks), next.unlocks);
      html += "<h3>" + icon("up", 16) + " Level " + (lv + 1) + "</h3>";
      for (const d of newMachines) html += '<div class="item"><div class="mini-machine" style="--c:' + d.color + '"></div><div class="item-main"><b class="m-name">' + d.name + '</b><br><span class="muted">' + icon("coin", 14) + " " + money(d.price) + "</span></div><span class=\"owned\">NEW!</span></div>";
      html += chips(next, now);
      html += '<p class="effect">' + icon("star", 16) + " +" + CONFIG.stars.counter + "</p>";
      if (job) html += jobBox(job);
      else {
        const block = counterBlock(state), cant = !!block || state.money < next.cost;
        html += '<div class="row">' + (block ? '<button class="btn small ghost" data-act="mechanics">' + icon("wrench", 16) + " Busy</button>" :
          '<button class="btn big' + (cant ? " cant" : " glow") + '" data-act="counter-up"' + fillStyle(next.cost) + (cant ? " disabled" : "") + ">" + icon("up", 18) + " " + money(next.cost) + ' <span class="job-time">· ' + fmtDuration(next.seconds) + "</span></button>") + "</div>";
      }
    }
    this.systemPanel("counter", "Front Counter", html, "#ffd23f");
  },

  // ----- The Mechanics -----------------------------------------------------
  openMechanics() {
    let html = "";
    for (let i = 0; i < state.mechanics; i++) {
      const job = state.jobs[i];
      html += "<h3>" + icon("wrench", 16) + " Mechanic " + (i + 1) + "</h3>";
      if (job) html += jobBox(job);
      else html += '<div class="status-box"><b class="green">Free!</b><div class="row"><button class="btn small" data-act="shop">' + icon("up", 16) + ' Upgrades</button> <button class="btn small ghost" data-act="counter">' + icon("counter", 16) + " Counter</button></div></div>";
    }
    if (state.instantBuilds > 0) html += '<p class="effect">' + icon("bolt", 16) + " " + state.instantBuilds + " instant builds</p>";
    this.systemPanel("mechanics", "Mechanics", html, "#ff7a3d");
  },

  // ----- The Fame Road -----------------------------------------------------
  openFame() {
    const first = this.panelKind !== "fame";
    const reached = stepsReached(state), road = CONFIG.road;
    const nextStep = Math.min(road.length, reached + 1);
    const from = starsForStep(reached), to = starsForStep(nextStep);
    const part = reached >= road.length ? 1 : (state.stars - from) / (to - from);
    let html = '<div class="fame-top">' + icon("star", 22) + ' <b class="yellow">' + fmt(state.stars) + "</b>" +
      '<div class="bar goal"><div class="bar-fill" style="width:' + (part * 100).toFixed(1) + '%"></div></div></div>';
    html += '<div class="chips star-ways">' +
      '<span class="chip">' + icon("counter", 16) + " +" + CONFIG.stars.counter + "</span>" +
      '<span class="chip">' + icon("bolt", 16) + " +" + CONFIG.stars.power + "</span>" +
      '<span class="chip">' + icon("play", 16) + " +" + CONFIG.stars.newType + "</span>" +
      '<span class="chip">' + icon("bug", 16) + " +" + CONFIG.stars.bug + "</span>" +
      '<span class="chip">' + icon("coin", 16) + " +" + CONFIG.stars.coinRush + "</span>" +
      '<span class="chip">' + icon("wrench", 16) + " +" + CONFIG.stars.speedUp + "</span>" +
      '<span class="chip">' + icon("people", 16) + " +1</span></div>";
    html += '<div class="road">';
    road.forEach((r, i) => {
      const k = i + 1, claimed = i < state.roadClaimed, ready = !claimed && k <= reached, isNext = i === state.roadClaimed;
      let right;
      if (claimed) right = '<span class="owned">' + icon("check", 18) + "</span>";
      else if (ready && isNext) right = '<button class="btn small glow" data-act="claim">' + icon("gift", 16) + " Claim!</button>";
      else if (ready) right = '<span class="muted small-note">' + icon("gift", 16) + "</span>";
      else right = '<span class="muted small-note">' + icon("star", 14) + " " + fmt(starsForStep(k)) + "</span>";
      html += '<div class="item road-step' + (claimed ? " done" : "") + (isNext ? " road-now" : "") + (r.kind === "mechanic" || k === road.length ? " big-step" : "") + '">' +
        '<span class="step-num">' + k + '</span><div class="item-main">' + rewardText(r) + "</div>" + right + "</div>";
    });
    html += "</div>";
    this.systemPanel("fame", "Fame Road", html, "#ffd23f");
    const now = document.querySelector("#panel .road-now");
    const body = document.querySelector("#panel .panel-body");
    if (first && now && body) body.scrollTop = Math.max(0, now.offsetTop - body.offsetTop - body.clientHeight / 2 + 30);
  },

  // ----- The boxes at the top ---------------------------------------------
  updateSystemsHud(shopGlow) {
    const reached = stepsReached(state), road = CONFIG.road;
    const nextStep = Math.min(road.length, reached + 1);
    const from = starsForStep(reached), to = starsForStep(nextStep);
    const part = reached >= road.length ? 1 : (state.stars - from) / (to - from);
    const waiting = rewardWaiting(state);
    $("hud-fame-bar").style.width = (part * 100).toFixed(1) + "%";
    const free = freeMechanics(state);
    // The Mechanics button shows the job that finishes first as a bar.
    const soon = state.jobs.slice().sort((x, y) => x.left - y.left)[0];
    $("mech-bar").parentNode.classList.toggle("hidden", !soon);
    if (soon) $("mech-bar").style.width = (Math.max(0, Math.min(1, 1 - soon.left / soon.total)) * 100).toFixed(1) + "%";
    // A red dot shows the one most useful thing to do next (no extra words).
    const idleUseful = free > 0 && state.machines.some(m => m.status === "ok" && CONFIG.upgrades.some(u => { const c = upgradeCost(m, u.id); return c !== null && state.money >= c && !upgradeBlock(state, m.type, u.id); }));
    const counterUseful = free > 0 && nextCounter(state) && state.money >= nextCounter(state).cost && !counterBlock(state);
    let dot = null;
    if (waiting) dot = "fame";
    else if (counterUseful || idleUseful) dot = "mech";
    else if (shopGlow) dot = "shop";
    document.querySelector(".h-fame").classList.toggle("has-dot", dot === "fame");
    $("btn-mech").classList.toggle("has-dot", dot === "mech");
    $("btn-shop").classList.toggle("has-dot", dot === "shop");
    $("btn-shop").classList.remove("glow");
  },

  // ----- Leaving ------------------------------------------------------------
  goodbye() {
    let html = '<div class="panel card-box"><h2>See you soon!</h2>';
    if (state && state.jobs.length) for (const j of state.jobs) html += '<p>' + icon("wrench", 16) + " " + esc(jobName(j)) + " · " + fmtClock(j.left) + "</p>";
    html += '<p class="green">' + icon("coin", 18) + " " + icon("clock", 18) + " 7 days</p>";
    html += '<div class="row"><button class="btn big" data-act="goodbye-ok">OK</button></div></div>';
    $("card").innerHTML = html;
    $("card").classList.remove("hidden");
  },
});

// Tap a Mechanic in the arcade to see what they're doing.
(function () {
  const baseTap = UI.tap;
  UI.tap = function (cx, cy) {
    if (state && !this.overlayOpen()) {
      const wx = cx / this.scale + this.view.x, wy = cy / this.scale + this.view.y;
      const hit = this.mechs.find(m => Math.abs(wx - m.x) < 8 && wy > m.y - 24 && wy < m.y + 3);
      if (hit) { Sound.start(); this.openMechanics(); return; }
    }
    return baseTap.call(this, cx, cy);
  };
  // The Menu also lets you turn your Fame Road looks on and off.
  const baseMenu = UI.openMenu;
  UI.openMenu = function () {
    baseMenu.call(this);
    const keys = Object.keys(state.looks || {});
    if (!keys.length) return;
    let html = "<h3>" + icon("gift", 16) + " My looks</h3><div class=\"row\">";
    for (const k of keys) html += '<button class="btn small' + (state.looks[k] ? "" : " ghost") + '" data-act="look-toggle" data-look="' + k + '">' + (state.looks[k] ? "✓ " : "") + esc((LOOK_NAMES[k] || k).replace(/ \(.*\)$/, "")) + "</button> ";
    html += "</div>";
    const h3 = document.querySelector("#panel .panel-body h3.menu-end");
    if (h3) h3.insertAdjacentHTML("beforebegin", html);
  };
  const baseClose = UI.closePanel;
  UI.closePanel = function () { this.panelSig = null; return baseClose.call(this); };
})();

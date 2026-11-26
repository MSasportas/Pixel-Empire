// =====================================================================
//  PIXEL EMPIRE - SCREENS, HUD AND PANELS
//  ---------------------------------------------------------------------
//  Everything you click that isn't the office itself: the title
//  screen, character creation, the corner boxes (HUD), and the
//  pop-up panels like the Store.
//
//  Buttons have a "data-act" attribute. When you click one, UI.act()
//  looks at its name and does the right thing.
// =====================================================================

let state = null;   // the game you're playing right now
let slot = null;    // which save slot it lives in (0, 1 or 2)

// ----- Small helpers ------------------------------------------------

function $(id) { return document.getElementById(id); }

// Turns 1234567.8 into "1,234,568". Always whole numbers.
function fmt(n) {
  return Math.round(n || 0).toLocaleString("en-US");
}
function money(n) { return "$" + fmt(n); }

// A rate (given per second) shown per MINUTE as a whole number, like
// "720/min". If it's less than 1 a minute, it's shown per hour: "3/hr".
function perTime(n) {
  n = (n || 0) * 60;
  if (n <= 0 || n >= 0.5) return fmt(n) + "/min";
  return fmt(Math.max(1, n * 60)) + "/hr";
}

// How much bigger "after" is than "before", as a whole percent ("+12%").
function pct(before, after) {
  if (!(before > 0)) return 0;
  const p = (after / before - 1) * 100;
  return p > 0 ? Math.max(1, Math.round(p)) : 0;
}

// "+12% players and fans" for the Store.
function pctLine(a, b) {
  const pp = pct(a.players, b.players), pf = pct(a.fans, b.fans);
  if (pp === pf) return '<span class="gain cyan">+' + pp + "% players and fans</span>";
  const parts = [];
  if (pp) parts.push('<span class="gain cyan">+' + pp + "% players</span>");
  if (pf) parts.push('<span class="gain yellow">+' + pf + "% fans</span>");
  return parts.join(" ");
}

// Stars like ★★★½, drawn with CSS so half stars look right.
function starsHtml(stars) {
  let html = '<span class="stars" title="' + stars + ' stars">';
  for (let i = 1; i <= 5; i++) {
    const cls = stars >= i ? "on" : stars >= i - 0.5 ? "half" : "off";
    html += '<span class="' + cls + '">★</span>';
  }
  return html + "</span>";
}

// ----- The calendar -----
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Turns a game day number into a date, like "March 14, Year 1".
function fmtDate(day) {
  let d = Math.floor(day || 0);
  const year = Math.floor(d / 365) + 1;
  d = d % 365;
  let m = 0;
  while (d >= MONTH_DAYS[m]) { d -= MONTH_DAYS[m]; m++; }
  return MONTHS[m] + " " + (d + 1) + ", Year " + year;
}

// Turns a number of game days into "12 days", "1 month 4 days" or
// "2 years 3 months". A month is 30 days and a year is 12 months.
function fmtDays(days) {
  days = Math.max(0, days || 0);
  if (days < 1) {
    const hours = Math.round(days * 24);
    return hours <= 1 ? "less than an hour" : hours + " hours";
  }
  const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");
  let d = Math.floor(days);
  const years = Math.floor(d / 360); d -= years * 360;
  const months = Math.floor(d / 30); d -= months * 30;
  if (years > 0) return plural(years, "year") + (months ? " " + plural(months, "month") : "");
  if (months > 0) return plural(months, "month") + (d ? " " + plural(d, "day") : "");
  return plural(d, "day");
}

// Real seconds while playing, turned into game days.
function secondsToDays(seconds) {
  return seconds / CONFIG.secondsPerDay;
}

// A clock-style time, like "1h 05m" or "4m 30s".
function fmtClock(seconds) {
  seconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds / 60) % 60, s = seconds % 60;
  if (h > 0) return h + "h " + String(m).padStart(2, "0") + "m";
  if (m > 0) return m + "m " + String(s).padStart(2, "0") + "s";
  return s + "s";
}

// Money per minute.
function moneyRate(n) {
  return "$" + perTime(n);
}

// Money, players and fans per minute, in their colors.
function ratesHtml(r) {
  return '<span class="pink">' + moneyRate(r.money) + '</span> · <span class="cyan">' + perTime(r.players).replace("/", " players/") + '</span> · <span class="yellow">' + perTime(r.fans).replace("/", " fans/") + "</span>";
}

// Real time, like "45 sec", "6 min" or "2 hr 10 min".
function fmtTime(seconds) {
  seconds = Math.max(0, Math.round(seconds));
  if (seconds < 60) return seconds + " sec";
  const min = Math.round(seconds / 60);
  if (min < 60) return min + " min";
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 48) return h + " hr" + (m ? " " + m + " min" : "");
  return Math.round(seconds / 86400) + " days";
}

// What a released game is doing right now, per second.
function gameRates(g) {
  const p = playersPerSecondNow(g);
  return { players: p, money: p * g.moneyPerPlayer, fans: p * g.fanRate };
}

function allRates() {
  const r = { players: 0, money: 0, fans: 0 };
  for (const g of state.released) { const x = gameRates(g); r.players += x.players; r.money += x.money; r.fans += x.fans; }
  return r;
}

// A "NEW" tag for things you just unlocked.
function newTag(on) {
  return on ? ' <span class="new-tag">NEW</span>' : "";
}

// Makes text safe to show (so a game called "<b>" doesn't break the page).
function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function bar(fraction, color) {
  const pct = Math.max(0, Math.min(100, fraction * 100));
  return '<div class="bar"><div class="bar-fill" style="width:' + pct + '%;' + (color ? "background:" + color : "") + '"></div></div>';
}

function costButton(act, data, cost, label) {
  const can = state.money >= cost;
  return '<button class="btn small' + (can ? "" : " cant") + '" data-act="' + act + '" ' + data + '>' + label + " " + money(cost) + "</button>";
}

const STEP_ABOUT = {
  concept: "Come up with the idea.",
  preprod: "Plan it and make a tiny test version, called a prototype.",
  production: "Build it: code, art and sound.",
  testing: "Find and fix bugs.",
  launch: "Release it to the world!",
};

// =====================================================================

const UI = {
  panel: null,          // which panel is open, e.g. { name: "store", tab: "skills" }
  form: null,           // the "Make a game" form while it's open
  cards: [],            // pop-up cards waiting to be shown
  renaming: null,       // the hire being renamed
  panelStack: [],       // panels waiting underneath (like Make a game under the Store)
  lastHint: null,       // the last thing you pointed at or tapped
  newMail: {},          // mail that was new when you opened the Mailbox
  look: null,           // the character being designed
  rates: { money: 0, players: 0, fans: 0 },
  demo: null,

  init() {
    document.addEventListener("click", e => {
      Sound.start();
      const hintEl = e.target.closest("[data-hint]");
      if (hintEl) { this.lastHint = hintEl.dataset.hint; if ($("hint")) $("hint").innerHTML = this.lastHint; }
      const el = e.target.closest("[data-act]");
      // Any tap closes the phone's More menu (except the More button itself).
      if (!e.target.closest("#btn-more")) this.showNav(false);
      if (el && !el.disabled) { this.act(el.dataset.act, el.dataset, el); }
    });
    // Hover a genre, price or feature to see what it does.
    document.addEventListener("mouseover", e => {
      const el = e.target.closest("[data-hint]");
      const box = $("hint");
      if (el && box) { box.innerHTML = el.dataset.hint; this.lastHint = el.dataset.hint; }
    });
    document.addEventListener("keydown", e => {
      if (e.target.id === "rename-input" && e.key === "Enter") this.finishRename();
      if (e.key === "Escape") this.showNav(false);
      if (e.key === "Escape" && this.panel && $("minigame").classList.contains("hidden")) this.closePanel();
    });
    document.addEventListener("focusout", e => {
      if (e.target.id === "rename-input") this.finishRename();
    });
    setInterval(() => this.refreshPanel(), 500);
  },

  // ----- Title screen -----------------------------------------------

  showTitle() {
    state = null; slot = null;
    this.closePanel();
    $("hud").classList.add("hidden");
    $("create").classList.add("hidden");
    $("title").classList.remove("hidden");
    Office.fit();
    let html = "";
    for (let i = 0; i < CONFIG.saveSlots; i++) {
      const s = loadGame(i) && upgradeSave(loadGame(i));
      if (s) {
        const lv = levelInfo(s);
        html += '<div class="slot"><div class="slot-name">' + esc(s.studioName) + '</div>' +
          '<div class="slot-info">' + lv.current.name + " · " + fmt(s.fans) + " fans</div>" +
          '<div class="slot-buttons"><button class="btn" data-act="continue" data-slot="' + i + '">Continue</button>' +
          '<button class="btn small ghost" data-act="delete-slot" data-slot="' + i + '">Delete</button></div></div>';
      } else {
        html += '<div class="slot empty"><div class="slot-name">Empty slot ' + (i + 1) + '</div>' +
          '<div class="slot-buttons"><button class="btn" data-act="new-studio" data-slot="' + i + '">New studio</button>' +
          '<button class="btn small ghost" data-act="import-slot" data-slot="' + i + '">Import save</button></div></div>';
      }
    }
    $("slots").innerHTML = html;
  },

  // The office you see behind the title: your last studio, or a demo.
  viewState() {
    if (state) return state;
    if (!this.demo) {
      let best = null;
      for (let i = 0; i < CONFIG.saveSlots; i++) {
        const s = loadGame(i);
        if (s && (!best || s.lastTick > best.lastTick)) best = s;
      }
      if (best) best = upgradeSave(best);
      if (!best) {
        best = newGameState("Demo", 0, null);
        best.fans = 300000;
        for (const st of CONFIG.steps) {
          best.desks[st.id] = 2;
          for (let k = 0; k < 2; k++) best.hires.push({ id: st.id + k, name: "", section: st.id, look: randomLook() });
        }
      }
      best.projects = [];
      best.you.projectId = null;
      this.demo = best;
    }
    return this.demo;
  },

  // ----- Character creation -----------------------------------------

  showCreate(slotNumber, legacy) {
    this.createSlot = slotNumber;
    this.createLegacy = legacy || 0;
    this.look = randomLook();
    $("title").classList.add("hidden");
    $("create").classList.remove("hidden");
    this.renderCreate();
  },

  renderCreate() {
    const swatches = (part) => CONFIG.look[part].map(c =>
      '<button class="swatch' + (this.look[part] === c ? " on" : "") + '" style="background:' + c + '" data-act="look" data-part="' + part + '" data-value="' + c + '"></button>').join("");
    const styles = ["Short", "Spiky", "Long"].map((n, i) =>
      '<button class="btn small' + (this.look.hairStyle === i ? "" : " ghost") + '" data-act="look-style" data-value="' + i + '">' + n + "</button>").join(" ");
    const keepName = $("me-name") ? $("me-name").value : "";
    const keepStudio = $("studio-name") ? $("studio-name").value : "";
    $("create-body").innerHTML =
      '<div class="create-grid">' +
      '<canvas id="preview" class="preview"></canvas>' +
      '<div>' +
      '<label>Hair</label><div class="swatches">' + swatches("hair") + '</div>' +
      '<div class="swatches">' + styles + '</div>' +
      '<label>Skin</label><div class="swatches">' + swatches("skin") + '</div>' +
      '<label>Shirt</label><div class="swatches">' + swatches("shirt") + '</div>' +
      '<label>Your name</label><input id="me-name" maxlength="20" placeholder="Type your name" value="' + esc(keepName) + '">' +
      '<label>Studio name</label><input id="studio-name" maxlength="24" placeholder="Like Mega Pixel Games" value="' + esc(keepStudio) + '">' +
      (this.createLegacy ? '<p class="note">Your experience makes this studio ' + Math.round(this.createLegacy * CONFIG.legacySpeedBonus * 100) + '% faster.</p>' : "") +
      '<div class="row"><button class="btn big" data-act="create-start">Open my studio!</button>' +
      '<button class="btn ghost" data-act="random-look">Random look</button>' +
      '<button class="btn ghost" data-act="to-title">Back</button></div>' +
      '</div></div>';
    drawPreview($("preview"), this.look);
  },

  // ----- Starting and saving ----------------------------------------

  enterGame(newState, slotNumber, isNew) {
    state = upgradeSave(newState);
    slot = slotNumber;
    this.demo = null;
    $("title").classList.add("hidden");
    $("create").classList.add("hidden");
    $("hud").classList.remove("hidden");
    Office.fit();
    Office.people = {};
    Office.onSectionClick = id => this.openPanel({ name: "section", step: id });
    if (isNew) {
      addMail(state, "Your mom", "So proud of you for opening " + state.studioName + "! Make something amazing.");
    } else {
      const away = catchUp(state);
      if (away && away.seconds >= 60) this.cards.push({ type: "away", data: away });
    }
    this.lastLevel = studioLevel(state);
    this.lastReleased = state.released.length;
    saveGame(state, slot);
    this.showNextCard();
  },

  save() {
    if (state && slot !== null) saveGame(state, slot);
  },

  // ----- The HUD (corner boxes) -------------------------------------

  updateHud() {
    if (!state) return;
    const r = allRates();
    const lv = levelInfo(state);
    $("hud-money").textContent = money(state.money);
    $("hud-money-rate").textContent = "+" + moneyRate(r.money);
    $("hud-players").textContent = fmt(state.playersTotal);
    $("hud-players-rate").textContent = "+" + perTime(r.players);
    $("hud-fans").textContent = fmt(state.fans);
    $("hud-time").textContent = fmtDate(state.day);
    // A star on Games when a sequel is ready, and NEW on the Store.
    const sequelReady = state.released.some(g => { const i = sequelInfo(state, g); return i.ready && !i.made; });
    const gamesHtml = "Games (" + state.released.length + ")" + (sequelReady ? ' <span class="badge star sym">★</span>' : "");
    if ($("btn-games").innerHTML !== gamesHtml) $("btn-games").innerHTML = gamesHtml;
    $("store-badge").classList.toggle("hidden", newUnlocks(state, "store").length === 0);
    $("hud-fans-rate").textContent = "+" + perTime(r.fans);
    $("hud-level").textContent = lv.current.name;
    if (lv.next) {
      const frac = (state.fans - lv.current.fans) / (lv.next.fans - lv.current.fans);
      $("hud-level-bar").style.width = Math.min(100, frac * 100) + "%";
      $("hud-level-next").textContent = "Next: " + lv.next.name + " at " + fmt(lv.next.fans);
    } else {
      $("hud-level-bar").style.width = "100%";
      $("hud-level-next").textContent = "You made it!";
    }
    $("hud-goal-bar").style.width = Math.min(100, state.fans / CONFIG.winFans * 100) + "%";
    const unread = state.mail.filter(m => !m.read).length;
    $("mail-badge").textContent = unread;
    $("mail-badge").classList.toggle("hidden", unread === 0);
    // On phones those buttons hide in the More menu, so More gets a dot.
    const somethingNew = unread > 0 || sequelReady || !$("store-badge").classList.contains("hidden");
    $("more-dot").classList.toggle("hidden", !somethingNew);
    $("btn-make").classList.toggle("glow", state.projects.length === 0);
    this.updateGuide();
    // Convention invite
    const toast = $("toast");
    if (state.event) {
      const left = fmtTime(Math.max(0, state.event.expiresAt - state.playSeconds));
      const html = '<b>Invite: ' + esc(state.event.name) + '!</b> Show off a game for new players. (' + left + ' left) ' +
        '<button class="btn small" data-act="open" data-name="event">Pick a game</button> <button class="btn small ghost" data-act="decline-event">No thanks</button>';
      if (toast.dataset.html !== html) { toast.innerHTML = html; toast.dataset.html = html; }
      toast.classList.remove("hidden");
    } else if (toast.dataset.html !== "msg") {
      toast.classList.add("hidden");
      toast.dataset.html = "";
    }
  },

  // Opens or closes the More menu on phones (it slides up from the
  // bottom). On big screens the More button is hidden, so this does nothing.
  showNav(open) {
    if ($("hud-nav").classList.contains("open") === open) return;
    $("hud-nav").classList.toggle("open", open);
    $("nav-scrim").classList.toggle("on", open);
    $("btn-more").setAttribute("aria-expanded", open ? "true" : "false");
  },

  // ----- The guided first game ---------------------------------------
  // A short "do this, then this" list for your very first game.
  // You learn by doing it, and it goes away when you're done.

  guideSteps: [
    { text: "Click <b>Make a game</b>, pick what kind of game you want (or keep the picks), and start it.",
      done: s => s.projects.length > 0 || s.released.length > 0 },
    { text: "Click the <b>Concept</b> section with the yellow <b>!</b> and start the concept.",
      done: s => s.released.length > 0 || s.projects.some(p => p.step > 0 || p.worker) },
    { text: "Every step has its own section. Click the next <b>!</b> to keep going. Press <b>⚡ Speed up!</b> for a mini-game: play it perfectly and the step is done at once!",
      done: s => s.released.length > 0 || s.projects.some(p => p.step >= 3) },
    { text: "<b>Testing</b> finds bugs. Test your game, or skip it and see what fans say.",
      done: s => s.released.length > 0 || s.projects.some(p => p.step >= 4) },
    { text: "Click <b>Launch</b> and release your game to the world!",
      done: s => s.released.length > 0 },
    { text: "Your game is selling! Open the <b>Store</b> to spend your money.",
      done: s => s.guide > 5 },
    { text: "Open your <b>Mail</b> to see what fans think. Then make your next game!",
      done: s => s.guide > 6 },
  ],

  updateGuide() {
    if (state.guide === undefined) state.guide = state.released.length ? 99 : 0;
    while (state.guide < this.guideSteps.length && this.guideSteps[state.guide].done(state)) state.guide++;
    const box = $("guide");
    if (state.guide >= this.guideSteps.length) { box.classList.add("hidden"); return; }
    const html = '<span class="guide-count">First game ' + (state.guide + 1) + "/" + this.guideSteps.length + "</span> " +
      this.guideSteps[state.guide].text + ' <button class="link" data-act="skip-guide">Hide</button>';
    if (box.dataset.html !== html) { box.innerHTML = html; box.dataset.html = html; }
    box.classList.remove("hidden");
  },

  // Called by main.js after every game tick, to notice big moments.
  afterTick() {
    if (!state) return;
    if (state.released.length > this.lastReleased) {
      const g = state.released[0];
      this.showLaunch(g);
    }
    this.lastReleased = state.released.length;
    const lv = studioLevel(state);
    if (lv > this.lastLevel) {
      this.cards.push({ type: "level", data: lv });
      Sound.play("level");
      this.showNextCard();
    }
    this.lastLevel = lv;
    if (state.justWon) {
      state.justWon = false;
      this.cards.push({ type: "win" });
      this.showNextCard();
    }
  },

  // The big launch moment: banner, confetti and the team cheering.
  showLaunch(g) {
    const firstMinute = playersInSeconds(g, 0, 60);
    $("banner").innerHTML = '<div class="banner-small">Launched!</div><div class="banner-name">' + esc(g.name) + '</div>' +
      '<div class="banner-small">First minute: ' + fmt(firstMinute) + ' players · ' + money(firstMinute * g.moneyPerPlayer) + '</div>';
    $("banner").classList.remove("hidden", "pop");
    void $("banner").offsetWidth; // restarts the animation
    $("banner").classList.add("pop");
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => $("banner").classList.add("hidden"), 3500);
    Office.celebrate();
    Sound.play("launch");
  },

  // ----- Cards (small pop-ups) --------------------------------------

  showNextCard() {
    if (!$("card").classList.contains("hidden") || this.cards.length === 0) return;
    const c = this.cards.shift();
    let html = "";
    if (c.type === "away") {
      const a = c.data;
      html = '<h2>While you were away</h2><p>You were gone for ' + fmtTime(a.seconds) + '. In the game, ' + fmtDays(a.days || 0) + ' went by. It\'s now ' + fmtDate(state.day) + '. Your games kept selling!</p>' +
        '<div class="away-grid"><div>Money</div><b>+' + money(a.money) + '</b><div>Players</div><b>+' + fmt(a.players) + '</b><div>Fans</div><b>+' + fmt(a.fans) + '</b>' +
        (a.bonus ? '<div>Welcome back bonus</div><b>+' + money(a.bonus) + '</b>' : "") + '</div>';
    } else if (c.type === "level") {
      const l = CONFIG.levels[c.data - 1];
      const before = CONFIG.levels[c.data - 2];
      const kinds = { genre: "New genre", price: "New price", size: "New game size", engine: "New engine in the Store", feature: "New feature in the Store", desks: "Office" };
      let list = unlocksAt(c.data).map(u => "<li><b>" + kinds[u.kind] + ":</b> " + esc(u.name) + "</li>").join("");
      if (before && l.games > before.games) list += "<li><b>Bigger studio:</b> make " + l.games + " games at the same time</li>";
      html = '<h2>Level up!</h2><p>' + esc(state.studioName) + ' is now a <b>' + l.name + '</b>!</p>' +
        (list ? '<p>You unlocked:</p><ul class="unlocks">' + list + "</ul>" : "") +
        (newUnlocks(state, "store").length ? '<p class="muted">Look for <span class="new-tag">NEW</span> in the Store.</p>' : "");
    } else if (c.type === "event") {
      const r = c.data;
      html = '<h2>' + esc(r.event) + '!</h2><p>Everyone loved playing <b>' + esc(r.game) + '</b>. It\'s selling like it just came out!</p>' +
        '<div class="away-grid"><div>Players now</div><b>' + perTime(r.rateAfter) + '</b><div>Before the show</div><b class="muted">' + perTime(r.rateBefore) + '</b></div>' +
        '<p>Over the next game year, that adds about:</p><div class="away-grid"><div>Players</div><b>+' + fmt(r.players) + '</b><div>Money</div><b>+' + money(r.money) + '</b><div>Fans</div><b>+' + fmt(r.fans) + '</b></div>';
    } else if (c.type === "win") {
      html = '<h2>AAA Studio!</h2><p>' + esc(state.studioName) + ' reached ' + fmt(CONFIG.winFans) + ' fans. You made it from one desk to a AAA studio!</p>' +
        '<p>You can keep playing, or found a new studio that works ' + Math.round((state.legacy + 1) * CONFIG.legacySpeedBonus * 100) + '% faster.</p>' +
        '<div class="row"><button class="btn" data-act="close-card">Keep playing</button><button class="btn ghost" data-act="new-legacy">Found a new studio</button></div>';
    }
    if (c.type !== "win") html += '<div class="row"><button class="btn" data-act="close-card">Awesome!</button></div>';
    $("card").innerHTML = '<div class="panel card-box">' + html + '</div>';
    $("card").classList.remove("hidden");
  },

  // ----- Panels -----------------------------------------------------

  openPanel(p) {
    if (!state) return;
    // The Store opened from "Make a game" sits on top of it, so your game
    // isn't lost. Closing the Store takes you back.
    if (this.panel && this.panel.name === "make" && p.name === "store") {
      this.form.name = $("game-name") ? $("game-name").value : this.form.name;
      this.panelStack.push(this.panel);
    } else {
      this.panelStack = [];
    }
    this.panel = p;
    if (p.name === "make" && !this.form) this.newForm();
    if (p.name === "make") this.captureNew("make");
    if (p.name === "store") this.captureNew(this.storeWhere(p.tab || "skills"));
    if (p.name === "store" && state.guide === 5) state.guide = 6;
    if (p.name === "mail") {
      if (state.guide === 6) state.guide = 7;
      this.newMail = {};
      state.mail.forEach(m => { if (!m.read) this.newMail[m.id] = true; m.read = true; });
    }
    this.renderPanel();
    $("panel").classList.remove("hidden");
  },

  // Remembers what's new in a place, so NEW tags stay while you look,
  // then marks those things as seen.
  captureNew(where) {
    if (!where) return;
    this.shownNew = this.shownNew || {};
    for (const u of newUnlocks(state, where)) this.shownNew[u.key] = true;
    markSeen(state, where);
  },

  storeWhere(tab) {
    return { engines: "engines", features: "features", desks: "desks" }[tab] || null;
  },

  isShownNew(kind, id) {
    return !!(this.shownNew && this.shownNew[kind + ":" + id]);
  },

  closePanel() {
    this.renaming = null;
    if (this.panelStack.length) {
      this.panel = this.panelStack.pop();
      this.renderPanel();
      return;
    }
    this.panel = null;
    this.shownNew = {};
    $("panel").classList.add("hidden");
    $("panel").innerHTML = "";
  },

  // Live panels redraw every half second (unless you're typing).
  refreshPanel() {
    if (!this.panel || !state) return;
    if (["make", "menu", "import"].includes(this.panel.name)) return;
    const active = document.activeElement;
    if (active && active.tagName === "INPUT" && $("panel").contains(active)) return;
    this.renderPanel();
  },

  renderPanel() {
    const p = this.panel;
    const body = this["panel_" + p.name](p);
    const scroll = $("panel-body") ? $("panel-body").scrollTop : 0;
    $("panel").innerHTML = '<div class="panel panel-main">' +
      '<div class="panel-head"><h2>' + body.title + '</h2><button class="btn small ghost" data-act="close">X</button></div>' +
      '<div class="panel-body" id="panel-body">' + body.html + '</div></div>';
    $("panel-body").scrollTop = scroll;
    if ($("hint") && this.lastHint) $("hint").innerHTML = this.lastHint;
    if (this.renaming && $("rename-input")) $("rename-input").focus();
  },

  // ----- Make a game ------------------------------------------------

  newForm(sequelOf) {
    this.lastHint = null;
    this.form = {
      name: randomGameName(),
      genre: null,
      price: "p5",
      features: state.features.slice(),
      size: "small",
      sequelOf: null,
    };
    // Ready to go: pick good choices so one click starts the game.
    // Price and size are the same as your last game. The genre is your
    // best one that's different from last time (fans like something new).
    const last = state.released[0] || state.projects[state.projects.length - 1];
    if (last) {
      if (isUnlocked(state, byId(CONFIG.prices, last.price))) this.form.price = last.price;
      if (isUnlocked(state, byId(CONFIG.sizes, last.size || "small"))) this.form.size = last.size || "small";
    }
    const genres = CONFIG.genres.filter(g => isUnlocked(state, g) && g.id !== state.lastGenre);
    genres.sort((a, b) => genreStars(state, b.id) * b.pop - genreStars(state, a.id) * a.pop);
    if (genres.length) this.form.genre = genres[0].id;
    const original = sequelOf && state.released.find(g => g.id === sequelOf);
    if (original) {
      const sizes = CONFIG.sizes.filter(z => isUnlocked(state, z));
      Object.assign(this.form, {
        name: sequelName(original.name),
        genre: original.genre,
        price: isUnlocked(state, byId(CONFIG.prices, original.price)) ? original.price : "p5",
        size: sizes.some(z => z.id === original.size) ? original.size : "small",
        sequelOf: original.id,
      });
    }
  },

  // How long a game of this size takes to make, in real time, if one
  // person works on every step (no mini-games).
  buildSeconds(sizeId) {
    const z = byId(CONFIG.sizes, sizeId);
    return CONFIG.devTimeSeconds * z.time / speedMultiplier(state);
  },

  panel_make() {
    const f = this.form;
    const full = state.projects.length >= maxProjects(state);
    const original = f.sequelOf && state.released.find(g => g.id === f.sequelOf);
    const seq = original ? sequelInfo(state, original) : null;
    let html = "";
    if (original) {
      html += '<div class="sequel-box">★ <b>Sequel to ' + esc(original.name) + '</b>. ' + esc(original.name) + ' won ' + fmt(original.fans) +
        ' fans, so the sequel starts with <b class="cyan">+' + Math.round(seq.bonus * 100) + '% players</b> at launch.' +
        ' <button class="link" data-act="form-unsequel">Make a new game instead</button></div>';
    }
    html += '<label>Game name</label><div class="row"><input id="game-name" maxlength="28" value="' + esc(f.name) + '">' +
      (original ? "" : '<button class="btn small ghost" data-act="form-random-name">Random</button>') + '</div>';
    // Quick start: everything is already picked, so you can start right away.
    if (f.genre && !full) {
      const g = byId(CONFIG.genres, f.genre);
      html += '<div class="quick-start"><button class="btn big" data-act="form-start">' + (original ? "Start the sequel!" : "Start making it!") + '</button>' +
        '<span class="muted">' + g.name + " " + starsHtml(genreStars(state, f.genre)) + " · " + byId(CONFIG.sizes, f.size).label + " · " + byId(CONFIG.prices, f.price).label +
        (f.features.length ? " · " + f.features.length + (f.features.length === 1 ? " feature" : " features") : "") + '<br>Or change anything below first.</span></div>';
    }

    html += '<label>Genre <span class="muted label-note">Stars show how good your game would be, from your skills</span></label><div class="choices">';
    for (const g of CONFIG.genres) {
      if (original && g.id !== f.genre) continue;
      const skill = byId(CONFIG.skills, g.skill);
      if (isUnlocked(state, g)) {
        const stars = genreStars(state, g.id);
        const hint = "<b>" + g.name + ":</b> " + g.about + " Your " + stars + "-star game. It gets better as your <b>" + skill.name + "</b> skill grows.";
        html += '<button class="choice' + (f.genre === g.id ? " on" : "") + '" data-act="form-genre" data-id="' + g.id + '" data-hint="' + esc(hint) + '">' +
          g.name + newTag(this.isShownNew("genre", g.id)) + "<br>" + starsHtml(stars) + "</button>";
      } else {
        html += '<button class="choice locked" disabled data-hint="' + esc("Unlocks at " + CONFIG.levels[g.level - 1].name + ".") + '">🔒 ' + g.name + "</button>";
      }
    }
    html += "</div>";

    html += '<label>Price</label><div class="choices">';
    for (const pr of CONFIG.prices) {
      if (isUnlocked(state, pr)) {
        html += '<button class="choice' + (f.price === pr.id ? " on" : "") + '" data-act="form-price" data-id="' + pr.id + '" data-hint="' + esc(pr.hint) + '">' + pr.label + newTag(this.isShownNew("price", pr.id)) + "</button>";
      } else {
        html += '<button class="choice locked" disabled data-hint="' + esc("Unlocks at " + CONFIG.levels[pr.level - 1].name + ".") + '">🔒 ' + pr.label + "</button>";
      }
    }
    html += "</div>";

    html += '<label>Size <span class="muted label-note">Real time to make it with one person</span></label><div class="choices">';
    for (const z of CONFIG.sizes) {
      const time = fmtTime(this.buildSeconds(z.id));
      const label = z.label + newTag(this.isShownNew("size", z.id)) + ' <span class="tag muted">' + time + "</span>";
      if (isUnlocked(state, z)) {
        html += '<button class="choice' + (f.size === z.id ? " on" : "") + '" data-act="form-size" data-id="' + z.id + '" data-hint="' + esc(z.hint + " About " + time + " for one person. Hires and mini-games make it faster.") + '">' + label + "</button>";
      } else {
        html += '<button class="choice locked" disabled data-hint="' + esc(z.hint + " Unlocks at " + CONFIG.levels[z.level - 1].name + ".") + '">🔒 ' + z.label + "</button>";
      }
    }
    html += "</div>";

    html += '<label>Features</label><div class="choices">';
    for (const ft of CONFIG.features) {
      const owned = state.features.includes(ft.id);
      if (owned) {
        const on = f.features.includes(ft.id);
        html += '<button class="choice check' + (on ? " on" : "") + '" data-act="form-feature" data-id="' + ft.id + '" data-hint="' + esc(ft.hint) + '">' + (on ? "☑ " : "☐ ") + ft.name + "</button>";
      } else if (isUnlocked(state, ft)) {
        html += '<button class="choice locked" data-act="open" data-name="store" data-tab="features" data-hint="' + esc(ft.hint + " Buy it in the Store.") + '">🛒 ' + ft.name + "</button>";
      } else {
        html += '<button class="choice locked" disabled data-hint="' + esc(ft.hint + " Unlocks at " + CONFIG.levels[ft.level - 1].name + ".") + '">🔒 ' + ft.name + "</button>";
      }
    }
    html += "</div>";

    html += '<div class="hint" id="hint">Point at a genre, price or feature to learn about it.</div>';
    html += this.estimate();
    if (full) {
      html += '<p class="note">You are already making ' + state.projects.length + (state.projects.length === 1 ? " game" : " games") + '. Finish one first, or level up your studio to make more at once.</p>';
    }
    html += '<div class="row"><button class="btn big" data-act="form-start"' + (full || !f.genre ? " disabled" : "") + '>' + (f.genre ? (original ? "Start the sequel!" : "Start making it!") : "Pick a genre first") + "</button></div>";
    return { title: original ? "Make a sequel" : "Make a game", html: html };
  },

  // What the game you're setting up will earn.
  estimate() {
    const f = this.form;
    if (!f.genre) return '<div class="estimate muted">Pick a genre to see what this game will earn.</div>';
    const original = f.sequelOf && state.released.find(g => g.id === f.sequelOf);
    const game = { genre: f.genre, price: f.price, size: f.size, features: f.features,
      sequelOf: original ? original.id : null, sequelBonus: original ? sequelInfo(state, original).bonus : 0 };
    const n = previewLaunch(state, game);
    const fake = { peak: n.players, fadeDays: n.fadeDays, lifeDays: n.lifeDays };
    const firstHour = playersInSeconds(fake, 0, 3600);
    const opening = playersInSeconds(fake, 0, CONFIG.openingDays * CONFIG.secondsPerDay);
    const repeats = !original && state.lastGenre === f.genre;
    return '<div class="estimate"><div><b>This game</b> ' + starsHtml(n.stars) + "</div>" +
      "<div>At launch: " + ratesHtml(n) + "</div>" +
      '<div>Opening weekend: <span class="cyan">' + fmt(opening) + ' players</span></div>' +
      '<div>First hour out: <span class="cyan">' + fmt(firstHour) + ' players</span> · <span class="pink">' + money(firstHour * n.moneyPerPlayer) + '</span> · <span class="yellow">' + fmt(firstHour * n.fanRate) + " fans</span></div>" +
      '<div class="muted">Sells for about ' + fmtDays(n.lifeDays) + ", then it's obsolete. More stars and bigger games sell for longer.</div>" +
      (repeats ? '<div class="muted">Your last game was ' + byId(CONFIG.genres, f.genre).name + " too. Fans want something new, so this one gets fewer players. (Sequels don't have this problem.)</div>" : "") +
      "</div>";
  },

  // ----- A section of the office ------------------------------------

  panel_section(p) {
    const step = byId(CONFIG.steps, p.step);
    const stepIndex = CONFIG.steps.indexOf(step);
    let html = '<p class="about">' + STEP_ABOUT[step.id] + (step.minigame ? ' <span class="muted">Every game here can be sped up once with a mini-game, even when someone else is working on it. The step waits while you play.</span>' : "") + '</p>';
    const here = state.projects.filter(x => x.step === stepIndex);
    if (here.length === 0) html += '<p class="muted">No games here right now.</p>';
    for (const g of here) {
      const genre = byId(CONFIG.genres, g.genre);
      html += '<div class="item"><div class="item-main"><b>' + esc(g.name) + '</b> <span class="muted">' + genre.name + "</span>";
      const sizeLabel = byId(CONFIG.sizes, g.size || "small").label;
      html += ' <span class="muted">· ' + sizeLabel + "</span>";
      if (g.worker) {
        const nameOf = id => id === "you" ? "You" : esc((state.hires.find(h => h.id === id) || {}).name || "Someone");
        const people = [g.worker].concat(g.helpers || []).map(nameOf);
        const done = g.progress / stepDuration(state, g);
        html += '<div class="muted">' + people.join(", ") + " · " + fmtTime(stepTimeLeft(state, g)) + " left</div>" + bar(done, step.color);
        html += "</div>";
        if (canSpeedUp(state, g)) {
          html += '<button class="btn small glow" data-act="minigame" data-id="' + g.id + '"><span class="sym">⚡</span> Speed up!</button>';
        } else if (g.boostUsed && step.minigame) {
          html += '<span class="muted small">Sped up</span>';
        }
      } else {
        html += '<div class="muted">Waiting</div></div>';
        if (state.you.projectId) html += '<button class="btn small cant" disabled>You are busy</button>';
        else html += '<button class="btn small" data-act="start-step" data-id="' + g.id + '">' + step.verb + "</button>";
        if (step.id === "testing") html += '<button class="btn small ghost" data-act="skip-testing" data-id="' + g.id + '">Skip testing</button>';
      }
      html += "</div>";
    }

    // Desks and hires
    const allowed = desksAllowed(state);
    const hires = hiresIn(state, step.id);
    html += '<h3>Team in ' + step.name + '</h3>';
    if (studioLevel(state) < 2) {
      html += '<p class="muted">You can hire people when you become an Indie Studio (' + fmt(CONFIG.levels[1].fans) + ' fans).</p>';
    } else {
      html += '<p class="muted">Desks: ' + state.desks[step.id] + " of " + allowed + " allowed right now.</p>";
      for (const h of hires) html += this.personRow(h);
      html += '<div class="row">';
      if (state.desks[step.id] < allowed) html += costButton("buy-desk", 'data-id="' + step.id + '"', deskCost(state, step.id), "Buy a desk");
      if (hires.length < state.desks[step.id]) html += costButton("hire", 'data-id="' + step.id + '"', hireCost(state), "Hire a " + step.job);
      else if (state.desks[step.id] === hires.length) html += '<span class="muted">Every desk has someone. Buy a desk to hire more.</span>';
      html += "</div>";
    }
    return { title: '<span style="color:' + step.color + ";text-shadow:0 0 8px " + step.color + '">' + step.name + "</span>", html: html };
  },

  personRow(h) {
    const nameHtml = this.renaming === h.id
      ? '<input id="rename-input" data-id="' + h.id + '" maxlength="20" value="' + esc(h.name) + '">'
      : "<b>" + esc(h.name) + "</b>";
    return '<div class="item"><div class="item-main">' + nameHtml + ' <span class="muted">' + h.job + "</span></div>" +
      (this.renaming === h.id ? "" : '<button class="btn small ghost" data-act="rename" data-id="' + h.id + '">Rename</button>') + "</div>";
  },

  // ----- Store ------------------------------------------------------

  panel_store(p) {
    const tab = p.tab || "skills";
    const tabs = [["skills", "Skills"], ["engines", "Engines"], ["features", "Features"], ["desks", "Desks"], ["supplies", "Office"]];
    let html = '<div class="tabs">' + tabs.map(t => {
      const where = this.storeWhere(t[0]);
      const dot = where && tab !== t[0] && newUnlocks(state, where).length ? ' <span class="new-dot"></span>' : "";
      return '<button class="tab' + (tab === t[0] ? " on" : "") + '" data-act="store-tab" data-tab="' + t[0] + '">' + t[1] + dot + "</button>";
    }).join("") + "</div>";

    const usual = usualGame(state);
    const usualName = usual.name ? esc(usual.name) : "a $5 Action game";
    if (tab === "skills") {
      html += '<p class="muted">You get better with every game you make. Training makes you better faster. Each skill matters most for its own genres, and a little for every game. Numbers show how much more a new game would get at launch.</p>';
      for (const s of CONFIG.skills) {
        const sk = state.skills[s.id];
        const extra = s.id === "engines" ? " (+" + bestEngine(state).power + " from " + bestEngine(state).name + ")" : "";
        // Show the gain for this skill's own genre, like a game you'd make.
        const genres = CONFIG.genres.filter(g => g.skill === s.id && isUnlocked(state, g));
        const genre = genres[0];
        const game = Object.assign({}, usual, genre ? { genre: genre.id } : {});
        const before = previewLaunch(state, game);
        sk.level += 1; const after = previewLaunch(state, game); sk.level -= 1;
        const forWhat = genre ? genres.map(g => g.name).join(", ") + " games" : "every game";
        const starText = after.stars > before.stars ? " " + starsHtml(before.stars) + " → " + starsHtml(after.stars) : "";
        // Practice: you also level up by making games. This shows how close you are.
        const practice = Math.floor(sk.xp / xpNeeded(sk.level) * 100);
        html += '<div class="item"><div class="item-main"><b style="color:' + s.color + '">' + s.name + '</b> <span class="skill-level" style="color:' + s.color + '">Level ' + sk.level + "</span>" + extra +
          '<div class="muted small">Practice from making games: ' + practice + "% of the way to level " + (sk.level + 1) + "</div>" +
          '<div class="gains">Level ' + (sk.level + 1) + ", " + forWhat + ": " + pctLine(before, after) + starText + "</div></div>" +
          costButton("train", 'data-id="' + s.id + '"', trainCost(state, s.id), "Train") + "</div>";
      }
    }
    if (tab === "engines") {
      for (const e of CONFIG.engines) {
        let right;
        if (state.engines.includes(e.id)) right = '<span class="owned">Learned</span>';
        else if (!isUnlocked(state, e)) right = '<span class="muted">🔒 ' + CONFIG.levels[e.level - 1].name + "</span>";
        else right = costButton("learn", 'data-id="' + e.id + '"', e.cost, "Learn");
        let gainHtml = "";
        if (!state.engines.includes(e.id) && e.power > bestEngine(state).power) {
          const a = previewLaunch(state, usual);
          state.engines.push(e.id); const b = previewLaunch(state, usual); state.engines.pop();
          gainHtml = '<div class="gains">Every game: ' + pctLine(a, b) + "</div>";
        }
        html += '<div class="item"><div class="item-main"><b>' + e.name + "</b>" + newTag(this.isShownNew("engine", e.id)) + " <span class=\"muted\">+" + e.power + " Engines</span><div>Good for: " + e.good + "</div>" + gainHtml + "</div>" + right + "</div>";
      }
    }
    if (tab === "features") {
      html += '<p class="muted">Numbers show how much more a game gets when you tick the feature.</p>';
      for (const f of CONFIG.features) {
        let right;
        if (state.features.includes(f.id)) right = '<span class="owned">Owned</span>';
        else if (!isUnlocked(state, f)) right = '<span class="muted">🔒 ' + CONFIG.levels[f.level - 1].name + "</span>";
        else right = costButton("buy-feature", 'data-id="' + f.id + '"', f.cost, "Buy");
        const without = Object.assign({}, usual, { features: usual.features.filter(x => x !== f.id) });
        const withIt = Object.assign({}, without, { features: without.features.concat([f.id]) });
        const a = previewLaunch(state, without), b = previewLaunch(state, withIt);
        const what = f.fade > 1 ? '<div class="gains">Sales fade ' + f.fade + " times slower</div>" : '<div class="gains">' + pctLine(a, b) + "</div>";
        html += '<div class="item"><div class="item-main"><b>' + f.name + "</b>" + newTag(this.isShownNew("feature", f.id)) + "<div>" + f.hint + "</div>" + what + "</div>" + right + "</div>";
      }
    }
    if (tab === "desks") {
      if (studioLevel(state) < 2) html += '<p class="muted">Desks for hires unlock when you become an Indie Studio (' + fmt(CONFIG.levels[1].fans) + ' fans).</p>';
      else {
        html += '<p class="muted">Each hire needs a desk. Your studio level decides how many desks each section can have (' + desksAllowed(state) + " now)." +
          newTag(this.isShownNew("desks", String(desksAllowed(state)))) + " Hires work on their own and help each other finish big games faster.</p>";
        for (const st of CONFIG.steps) {
          const right = state.desks[st.id] < desksAllowed(state)
            ? costButton("buy-desk", 'data-id="' + st.id + '"', deskCost(state, st.id), "Buy")
            : '<span class="muted">Full for now</span>';
          html += '<div class="item"><div class="item-main"><b>' + st.name + "</b> " + state.desks[st.id] + " of " + desksAllowed(state) + " desks</div>" + right + "</div>";
        }
      }
    }
    if (tab === "supplies") {
      html += '<p class="muted">Better stuff makes everyone in the office work faster. Office speed now: <b>+' + Math.round((speedMultiplier(state) - 1) * 100) + "%</b></p>";
      for (const s of CONFIG.supplies) {
        const lv = state.supplies[s.id];
        const cost = supplyCost(state, s.id);
        const right = cost === undefined ? '<span class="owned">Best one!</span>'
          : costButton("supply", 'data-id="' + s.id + '"', cost, "Upgrade");
        let next = "";
        if (cost !== undefined) {
          const now = CONFIG.devTimeSeconds / speedMultiplier(state);
          const after = CONFIG.devTimeSeconds / (speedMultiplier(state) + s.speed * (1 + CONFIG.legacySpeedBonus * state.legacy));
          next = ' → <span class="muted">' + s.levels[lv + 1] + '</span><div class="gains"><span class="gain cyan">Small games ' + fmtTime(now - after) + " faster</span></div>";
        }
        html += '<div class="item"><div class="item-main"><b>' + s.name + "</b>: " + s.levels[lv] + next + "</div>" + right + "</div>";
      }
    }
    return { title: "Store · " + money(state.money), html: html };
  },

  // ----- Games, team, mail, trophies --------------------------------

  panel_games() {
    let html = "";
    if (state.projects.length) {
      html += "<h3>Being made (" + state.projects.length + " of " + maxProjects(state) + ")</h3>";
      for (const p of state.projects) {
        const size = byId(CONFIG.sizes, p.size || "small").label;
        const step = CONFIG.steps[p.step];
        const status = p.worker ? fmtTime(stepTimeLeft(state, p)) + " left on this step, " + workersOn(p) + (workersOn(p) === 1 ? " person" : " people") : "waiting for someone";
        html += '<div class="item"><div class="item-main"><b>' + esc(p.name) + '</b> <span class="muted">' + size + ' · </span><span style="color:' + step.color + '">' + step.name + '</span><div class="muted">' + status + "</div></div></div>";
      }
    }
    html += "<h3>Released (" + state.released.length + ") · " + ratesHtml(allRates()) + "</h3>";
    if (!state.released.length) html += '<p class="muted">No games out yet.</p>';
    else html += '<p class="muted small">Only hits get sequels. When a game has been out for ' + fmtDays(CONFIG.hitCheckDays) + ', fans decide: if it won a lot more fans than your last ' + CONFIG.hitCompareGames + ' games, it\'s a HIT and you can make a sequel. Bigger hits give sequels a bigger launch.</p>';
    for (const g of state.released.slice(0, 40)) {
      const genre = byId(CONFIG.genres, g.genre), price = byId(CONFIG.prices, g.price);
      const size = byId(CONFIG.sizes, g.size || "small").label;
      const stage = salesStage(g);
      const stageText = '<span class="stage stage-' + stage.name.toLowerCase() + '">' + stage.name + "</span>" +
        (stage.next ? ' <span class="muted">' + stage.next + " in " + fmtDays(stage.daysToNext) + "</span>" : ' <span class="muted">nobody buys it any more</span>');
      const seq = sequelInfo(state, g);
      let right = "";
      if (seq.made) right = '<span class="muted small">Sequel made</span>';
      else if (!seq.judged) right = '<span class="muted small">Hit check in<br>' + fmtDays(seq.daysLeft) + "</span>";
      else if (!seq.hit) right = '<span class="muted small">Not a hit</span>';
      else right = '<button class="btn small glow" data-act="sequel" data-id="' + g.id + '"><span class="sym">★</span> Create sequel<br>+' + Math.round(seq.bonus * 100) + "% players</button>";
      html += '<div class="item"><div class="item-main"><b>' + esc(g.name) + "</b> " + (g.hit ? '<span class="hit-tag">HIT</span> ' : "") + (g.stars ? starsHtml(g.stars) : "") + (g.bugs ? " 🐞" : "") + ' <span class="muted">' + genre.name + " · " + size + " · " + price.label + "</span>" +
        "<div>Now: " + ratesHtml(gameRates(g)) + "</div>" +
        '<div>So far: <span class="cyan">' + fmt(g.players) + ' players</span> · <span class="pink">' + money(g.money || 0) + '</span> · <span class="yellow">' + fmt(g.fans || 0) + " fans</span>" +
        (g.opening ? ' <span class="muted">· Opening weekend ' + fmt(g.opening) + "</span>" : "") + "</div>" +
        '<div class="muted">Out for ' + fmtDays(g.days !== undefined ? g.days : g.age) + " · Launched " + fmtDate(g.launchDay || 0) + " · " + stageText + "</div></div>" + right + "</div>";
    }
    return { title: "Your games (" + state.released.length + ")", html: html };
  },

  panel_team() {
    let html = '<div class="item"><div class="item-main"><b>' + esc(state.me.name) + '</b> <span class="muted">Studio lead (you!)</span></div></div>';
    for (const st of CONFIG.steps) for (const h of hiresIn(state, st.id)) html += this.personRow(h);
    if (!state.hires.length) html += '<p class="muted">No hires yet. Click a section of the office to hire people there.</p>';
    return { title: "Your team", html: html };
  },

  panel_mail() {
    let html = "";
    if (!state.mail.length) html = '<p class="muted">No mail yet.</p>';
    else html += '<div class="row"><button class="btn small ghost" data-act="delete-read-mail">Delete old mail</button></div>';
    for (const m of state.mail) {
      const isNew = this.newMail[m.id];
      html += '<div class="mail' + (isNew ? " new" : " old") + '"><div class="item-main">' + (isNew ? '<span class="new-tag">NEW</span> ' : "") + "<b>" + esc(m.from) + "</b><div>" + esc(m.text) + "</div></div>" +
        '<button class="btn small ghost" data-act="delete-mail" data-id="' + m.id + '">X</button></div>';
    }
    return { title: "Mailbox", html: html };
  },

  panel_trophies() {
    // Records: your best single game so far.
    const r = state.records || {};
    const rec = (label, key, show) => r[key] && r[key].value > 0
      ? '<div class="item"><div class="item-main">' + label + ' <b>' + show(r[key].value) + '</b> <span class="muted">' + esc(r[key].game) + "</span></div></div>" : "";
    let records = rec("Biggest opening weekend:", "opening", v => fmt(v) + " players") +
      rec("Most players in one game:", "players", v => fmt(v)) +
      rec("Most money from one game:", "money", v => money(v));
    let html = records ? "<h3>Records</h3>" + records : "";
    const row = (t, extra) => {
      const got = state.trophies[t.id];
      return '<div class="item' + (got ? "" : " dim") + '"><div class="item-main">' + (got ? "🏆 " : "🔒 ") + "<b>" + t.name + "</b>" + (extra && !got ? '<div class="muted small">' + extra + "</div>" : "") + '</div><span class="muted">' + money(t.reward) + "</span></div>";
    };
    html += "<h3>Game milestones</h3>";
    for (const t of CONFIG.trophies.filter(t => t.stat)) {
      const best = bestGameStat(state, t.stat);
      const show = t.stat === "money" ? money(best) : t.stat === "stars" ? best + (best === 1 ? " star" : " stars") : t.stat === "years" ? fmtDays(best * 360) : fmt(best);
      html += row(t, best > 0 ? "Your best so far: " + show : "");
    }
    html += "<h3>Studio</h3>";
    for (const t of CONFIG.trophies.filter(t => !t.stat)) html += row(t);
    return { title: "Trophies", html: html };
  },

  panel_event() {
    if (!state.event) return { title: "Convention", html: '<p class="muted">The invite has ended.</p>' };
    const games = state.released.slice().sort((a, b) => b.players - a.players).slice(0, 8);
    let html = "<p>Which game do you want to show at " + esc(state.event.name) + "?</p>";
    for (const g of games) {
      html += '<div class="item"><div class="item-main"><b>' + esc(g.name) + '</b> <span class="muted">' + fmt(g.players) + ' players</span></div><button class="btn small" data-act="show-game" data-id="' + g.id + '">Show it</button></div>';
    }
    return { title: esc(state.event.name), html: html };
  },

  // ----- Menu: save, export, import, sound --------------------------

  panel_menu() {
    const html =
      '<div class="row"><button class="btn" data-act="save-now">Save now</button>' +
      '<button class="btn ghost" data-act="toggle-music">Music: ' + (Sound.musicOn ? "On" : "Off") + "</button>" +
      '<button class="btn ghost" data-act="toggle-sounds">Sounds: ' + (Sound.soundsOn ? "On" : "Off") + "</button></div>" +
      '<p class="muted">The game saves by itself every few seconds. Clearing your browser data deletes saves, so download a backup now and then.</p>' +
      '<div class="row"><button class="btn ghost" data-act="export">Download a backup</button>' +
      '<button class="btn ghost" data-act="open" data-name="import">Load a backup</button></div>' +
      '<div class="row"><button class="btn ghost" data-act="to-title">Back to title screen</button></div>' +
      '<p class="muted small">Pixel Empire · made with plain HTML and JavaScript · music made by code</p>';
    return { title: "Menu", html: html };
  },

  panel_import(p) {
    const html = '<p>Pick a backup file you downloaded before, or paste the backup text.</p>' +
      '<input type="file" id="import-file" accept=".txt,text/plain">' +
      '<textarea id="import-text" rows="4" placeholder="Or paste backup text here"></textarea>' +
      '<p class="muted">This replaces the studio in save slot ' + ((p.slot !== undefined ? p.slot : slot) + 1) + '.</p>' +
      '<div class="row"><button class="btn" data-act="do-import">Load it</button></div><p id="import-msg" class="note"></p>';
    return { title: "Load a backup", html: html };
  },

  // =====================================================================
  //  ACTIONS: what each button does
  // =====================================================================

  act(name, data) {
    const ok = () => Sound.play("buy");
    const no = () => Sound.play("nope");
    const s = state;

    switch (name) {
      // Title and creation
      case "continue": {
        const loaded = loadGame(Number(data.slot));
        if (loaded) this.enterGame(loaded, Number(data.slot), false);
        break;
      }
      case "new-studio": this.showCreate(Number(data.slot), 0); break;
      case "delete-slot": {
        const btn = document.querySelector('[data-act="delete-slot"][data-slot="' + data.slot + '"]');
        if (btn.dataset.sure) { deleteSave(Number(data.slot)); this.demo = null; this.showTitle(); }
        else { btn.dataset.sure = "1"; btn.textContent = "Really delete?"; }
        break;
      }
      case "import-slot":
        // Opens the import panel without a game running.
        this.panel = { name: "import", slot: Number(data.slot) };
        state = state || null;
        $("panel").innerHTML = '<div class="panel panel-main"><div class="panel-head"><h2>Load a backup</h2><button class="btn small ghost" data-act="close">X</button></div><div class="panel-body" id="panel-body">' + this.panel_import(this.panel).html + "</div></div>";
        $("panel").classList.remove("hidden");
        break;
      case "look": this.look[data.part] = data.value; Sound.play("click"); this.renderCreate(); break;
      case "look-style": this.look.hairStyle = Number(data.value); Sound.play("click"); this.renderCreate(); break;
      case "random-look": this.look = randomLook(); Sound.play("click"); this.renderCreate(); break;
      case "create-start": {
        const me = Object.assign({ name: ($("me-name").value.trim() || "Me").slice(0, 20) }, this.look);
        const studio = ($("studio-name").value.trim() || me.name + "'s Studio").slice(0, 24);
        this.enterGame(newGameState(studio, this.createLegacy, me), this.createSlot, true);
        Sound.play("level");
        break;
      }
      case "to-title": this.save(); this.demo = null; this.showTitle(); break;

      // Panels
      case "open": this.openPanel({ name: data.name, tab: data.tab }); Sound.play("click"); break;
      case "close": this.closePanel(); break;
      case "nav-more": this.showNav(!$("hud-nav").classList.contains("open")); Sound.play("click"); break;
      case "nav-close": break;   // the tap already closed the More menu
      case "store-tab": this.panel.tab = data.tab; this.captureNew(this.storeWhere(data.tab)); Sound.play("click"); this.renderPanel(); break;
      case "sequel": {
        if (state.projects.length >= maxProjects(state)) { no(); this.toast("You're making as many games as you can. Finish one first!"); break; }
        this.newForm(data.id);
        this.openPanel({ name: "make" });
        Sound.play("click");
        break;
      }
      case "form-unsequel": this.newForm(); this.renderPanel(); break;
      case "close-card":
        $("card").classList.add("hidden");
        this.showNextCard();
        break;

      // Making a game
      case "form-random-name": this.form.name = randomGameName(); this.renderPanel(); break;
      case "form-genre": this.form.name = $("game-name").value; this.form.genre = data.id; Sound.play("click"); this.renderPanel(); break;
      case "form-price": this.form.name = $("game-name").value; this.form.price = data.id; Sound.play("click"); this.renderPanel(); break;
      case "form-size": this.form.name = $("game-name").value; this.form.size = data.id; Sound.play("click"); this.renderPanel(); break;
      case "form-feature": {
        this.form.name = $("game-name").value;
        const list = this.form.features;
        const i = list.indexOf(data.id);
        if (i >= 0) list.splice(i, 1); else list.push(data.id);
        Sound.play("click");
        this.renderPanel();
        break;
      }
      case "form-start": {
        const nameValue = $("game-name").value.trim() || randomGameName();
        if (startNewGame(s, { name: nameValue.slice(0, 28), genre: this.form.genre, price: this.form.price, features: this.form.features, size: this.form.size, sequelOf: this.form.sequelOf })) {
          Sound.play("step");
          this.form = null;
          this.panelStack = [];
          this.closePanel();
        } else no();
        break;
      }

      // Office sections
      case "start-step": youStartStep(s, data.id) ? Sound.play("step") : no(); this.renderPanel(); break;
      case "skip-testing": skipTesting(s, data.id); Sound.play("click"); this.renderPanel(); break;
      case "minigame": {
        const p = s.projects.find(x => x.id === data.id);
        if (!p || !canSpeedUp(s, p)) break;
        p.boostUsed = true;
        p.playing = true;                  // the step waits for you while you play
        const stepNow = p.step;
        const stepDone = () => !state || !state.projects.includes(p) || p.step !== stepNow || !p.worker;
        Minigames.start(CONFIG.steps[stepNow].minigame, p,
          stepDone,
          score => {                       // score: 0 to 1
            p.playing = false;
            if (!stepDone()) applyMinigame(state, p.id, score);
            if (this.panel) this.renderPanel();
          });
        break;
      }
      case "buy-desk": buyDesk(s, data.id) ? ok() : no(); this.renderPanel(); break;
      case "hire": hire(s, data.id) ? ok() : no(); this.renderPanel(); break;
      case "rename": this.renaming = data.id; this.renderPanel(); break;

      // Store
      case "train": trainSkill(s, data.id) ? ok() : no(); this.renderPanel(); break;
      case "learn": learnEngine(s, data.id) ? ok() : no(); this.renderPanel(); break;
      case "buy-feature":
        if (buyFeature(s, data.id)) {
          ok();
          if (this.form && !this.form.features.includes(data.id)) this.form.features.push(data.id);
        } else no();
        this.renderPanel();
        break;
      case "delete-mail": deleteMail(s, data.id); this.renderPanel(); break;
      case "delete-read-mail": deleteReadMail(s); this.newMail = {}; this.renderPanel(); break;
      case "skip-guide": s.guide = 99; break;
      case "supply": upgradeSupply(s, data.id) ? ok() : no(); this.renderPanel(); break;

      // Conventions
      case "show-game": {
        const result = acceptEvent(s, data.id);
        if (result) {
          Office.celebrate(); Sound.play("launch"); this.closePanel();
          this.cards.push({ type: "event", data: result });
          this.showNextCard();
        }
        break;
      }
      case "decline-event": declineEvent(s); break;
      case "new-legacy": {
        const legacy = s.legacy + 1;
        $("card").classList.add("hidden");
        this.save();
        this.showCreate(slot, legacy);
        state = null;
        break;
      }

      // Menu
      case "save-now": this.save(); ok(); break;
      case "toggle-music": Sound.setMusic(!Sound.musicOn); this.storeSoundPrefs(); this.renderPanel(); break;
      case "toggle-sounds": Sound.setSounds(!Sound.soundsOn); this.storeSoundPrefs(); this.renderPanel(); break;
      case "export": this.downloadBackup(); break;
      case "do-import": this.doImport(); break;
    }
  },

  // A short message at the top of the screen.
  toast(text) {
    const el = $("toast");
    el.innerHTML = esc(text);
    el.dataset.html = "msg";
    el.classList.remove("hidden");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { if (el.dataset.html === "msg") { el.classList.add("hidden"); el.dataset.html = ""; } }, 3000);
  },

  finishRename() {
    const input = $("rename-input");
    if (input && state) renameHire(state, input.dataset.id, input.value);
    this.renaming = null;
    if (this.panel) this.renderPanel();
  },

  storeSoundPrefs() {
    try { localStorage.setItem("pixelEmpire.sound", JSON.stringify({ music: Sound.musicOn, sounds: Sound.soundsOn })); } catch (e) { /* ignore */ }
  },

  downloadBackup() {
    this.save();
    const text = exportSave(state);
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pixel-empire-" + state.studioName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    Sound.play("buy");
  },

  doImport() {
    const targetSlot = this.panel.slot !== undefined ? this.panel.slot : slot;
    const finish = text => {
      const loaded = importSave(text);
      if (!loaded) { $("import-msg").textContent = "That doesn't look like a Pixel Empire backup."; Sound.play("nope"); return; }
      saveGame(loaded, targetSlot);
      this.closePanel();
      this.enterGame(loadGame(targetSlot), targetSlot, false);
    };
    const file = $("import-file").files[0];
    if (file) { const r = new FileReader(); r.onload = () => finish(r.result); r.readAsText(file); }
    else finish($("import-text").value);
  },
};

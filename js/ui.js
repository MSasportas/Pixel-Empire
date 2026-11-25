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

// Turns 1234567 into "1.23M", and 12345 into "12,345".
function fmt(n) {
  if (n > 0 && n < 10 && n % 1 !== 0) return n.toFixed(1);
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  return n.toLocaleString("en-US");
}
function money(n) { return "$" + fmt(n); }

function fmtTime(seconds) {
  if (seconds < 90) return Math.round(seconds) + " seconds";
  if (seconds < 5400) return Math.round(seconds / 60) + " minutes";
  if (seconds < 172800) return Math.round(seconds / 3600) + " hours";
  return Math.round(seconds / 86400) + " days";
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
  look: null,           // the character being designed
  rates: { money: 0, players: 0, fans: 0 },
  demo: null,

  init() {
    document.addEventListener("click", e => {
      Sound.start();
      const el = e.target.closest("[data-act]");
      if (el && !el.disabled) { this.act(el.dataset.act, el.dataset, el); }
    });
    // Hover a genre, price or feature to see what it does.
    document.addEventListener("mouseover", e => {
      const el = e.target.closest("[data-hint]");
      const box = $("hint");
      if (el && box) box.innerHTML = el.dataset.hint;
    });
    document.addEventListener("keydown", e => {
      if (e.target.id === "rename-input" && e.key === "Enter") this.finishRename();
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
      const s = loadGame(i);
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
      if (!best) {
        best = newGameState("Demo", 0, null);
        best.fans = 20000;
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
    state = newState;
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
    let moneyRate = 0, playerRate = 0, fanRate = 0;
    for (const g of state.released) {
      const p = playersPerSecondNow(g);
      playerRate += p; moneyRate += p * g.moneyPerPlayer; fanRate += p * g.fanRate;
    }
    const lv = levelInfo(state);
    $("hud-money").textContent = money(state.money);
    $("hud-money-rate").textContent = "+" + money(moneyRate) + "/s";
    $("hud-players").textContent = fmt(state.playersTotal);
    $("hud-players-rate").textContent = "+" + fmt(playerRate) + "/s";
    $("hud-fans").textContent = fmt(state.fans);
    $("hud-fans-rate").textContent = "+" + fmt(fanRate) + "/s";
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
    $("btn-make").classList.toggle("glow", state.projects.length === 0);
    // Convention invite
    const toast = $("toast");
    if (state.event) {
      const left = Math.max(0, Math.ceil((state.event.expiresAt - state.playSeconds) / 60));
      const html = '<b>Invite: ' + esc(state.event.name) + '!</b> Show off a game for new players. (' + left + ' min left) ' +
        '<button class="btn small" data-act="open" data-name="event">Pick a game</button> <button class="btn small ghost" data-act="decline-event">No thanks</button>';
      if (toast.dataset.html !== html) { toast.innerHTML = html; toast.dataset.html = html; }
      toast.classList.remove("hidden");
    } else {
      toast.classList.add("hidden");
      toast.dataset.html = "";
    }
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
    const firstMinute = playersBetween(g, 0, 60);
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
      html = '<h2>While you were away</h2><p>You were gone for ' + fmtTime(a.seconds) + '. Your games kept selling!</p>' +
        '<div class="away-grid"><div>Money</div><b>+' + money(a.money) + '</b><div>Players</div><b>+' + fmt(a.players) + '</b><div>Fans</div><b>+' + fmt(a.fans) + '</b>' +
        (a.bonus ? '<div>Welcome back bonus</div><b>+' + money(a.bonus) + '</b>' : "") + '</div>';
    } else if (c.type === "level") {
      const l = CONFIG.levels[c.data - 1];
      html = '<h2>Level up!</h2><p>' + esc(state.studioName) + ' is now a <b>' + l.name + '</b>.</p><p>New: ' + l.unlocks + '</p>';
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
    this.panel = p;
    if (p.name === "make") this.newForm();
    if (p.name === "mail") state.mail.forEach(m => { m.read = true; });
    this.renderPanel();
    $("panel").classList.remove("hidden");
  },

  closePanel() {
    this.panel = null;
    this.renaming = null;
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
    if (this.renaming && $("rename-input")) $("rename-input").focus();
  },

  // ----- Make a game ------------------------------------------------

  newForm() {
    this.form = {
      name: pickRandom(CONFIG.gameNameIdeas),
      genre: null,
      price: "p5",
      features: state.features.slice(),
    };
  },

  panel_make() {
    const f = this.form;
    const full = state.projects.length >= maxProjects(state);
    let html = '<label>Game name</label><div class="row"><input id="game-name" maxlength="28" value="' + esc(f.name) + '">' +
      '<button class="btn small ghost" data-act="form-random-name">Random</button></div>';

    html += '<label>Genre</label><div class="choices">';
    for (const g of CONFIG.genres) {
      const skill = byId(CONFIG.skills, g.skill);
      if (isUnlocked(state, g)) {
        const hint = "<b>" + g.name + ":</b> " + g.about + " Uses your <b>" + skill.name + "</b> skill.";
        html += '<button class="choice' + (f.genre === g.id ? " on" : "") + '" data-act="form-genre" data-id="' + g.id + '" data-hint="' + esc(hint) + '">' +
          g.name + '<span class="tag" style="color:' + skill.color + '">' + skill.name + "</span></button>";
      } else {
        html += '<button class="choice locked" disabled data-hint="' + esc("Unlocks at " + CONFIG.levels[g.level - 1].name + ".") + '">🔒 ' + g.name + "</button>";
      }
    }
    html += "</div>";

    html += '<label>Price</label><div class="choices">';
    for (const pr of CONFIG.prices) {
      if (isUnlocked(state, pr)) {
        html += '<button class="choice' + (f.price === pr.id ? " on" : "") + '" data-act="form-price" data-id="' + pr.id + '" data-hint="' + esc(pr.hint) + '">' + pr.label + "</button>";
      } else {
        html += '<button class="choice locked" disabled data-hint="' + esc("Unlocks at " + CONFIG.levels[pr.level - 1].name + ".") + '">🔒 ' + pr.label + "</button>";
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
    if (full) {
      html += '<p class="note">You are already making ' + state.projects.length + (state.projects.length === 1 ? " game" : " games") + '. Hire people to make more games at the same time.</p>';
    }
    html += '<div class="row"><button class="btn big" data-act="form-start"' + (full || !f.genre ? " disabled" : "") + '>' + (f.genre ? "Start making it!" : "Pick a genre first") + "</button></div>";
    return { title: "Make a game", html: html };
  },

  // ----- A section of the office ------------------------------------

  panel_section(p) {
    const step = byId(CONFIG.steps, p.step);
    const stepIndex = CONFIG.steps.indexOf(step);
    let html = '<p class="about">' + STEP_ABOUT[step.id] + '</p>';
    const here = state.projects.filter(x => x.step === stepIndex);
    if (here.length === 0) html += '<p class="muted">No games here right now.</p>';
    for (const g of here) {
      const genre = byId(CONFIG.genres, g.genre);
      html += '<div class="item"><div class="item-main"><b>' + esc(g.name) + '</b> <span class="muted">' + genre.name + "</span>";
      if (g.worker) {
        const who = g.worker === "you" ? "You" : esc((state.hires.find(h => h.id === g.worker) || {}).name || "Someone");
        const done = g.progress / stepDuration(state, g.step);
        const left = Math.max(0, stepDuration(state, g.step) - g.progress);
        html += '<div class="muted">' + who + " " + (g.worker === "you" ? "are" : "is") + " working on it · " + Math.ceil(left) + "s left</div>" + bar(done);
        html += "</div>";
        if (g.worker === "you" && step.minigame && !g.boostUsed) {
          html += '<button class="btn small" data-act="minigame" data-id="' + g.id + '">Speed up!</button>';
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
    return { title: step.name, html: html };
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
    let html = '<div class="tabs">' + tabs.map(t =>
      '<button class="tab' + (tab === t[0] ? " on" : "") + '" data-act="store-tab" data-tab="' + t[0] + '">' + t[1] + "</button>").join("") + "</div>";

    if (tab === "skills") {
      html += '<p class="muted">You get better with every game you make. Training makes you better faster.</p>';
      for (const s of CONFIG.skills) {
        const sk = state.skills[s.id];
        const extra = s.id === "engines" ? " (+" + bestEngine(state).power + " from " + bestEngine(state).name + ")" : "";
        html += '<div class="item"><div class="item-main"><b style="color:' + s.color + '">' + s.name + "</b> level " + sk.level + extra +
          bar(sk.xp / xpNeeded(sk.level), s.color) + "</div>" + costButton("train", 'data-id="' + s.id + '"', trainCost(state, s.id), "Train") + "</div>";
      }
    }
    if (tab === "engines") {
      for (const e of CONFIG.engines) {
        let right;
        if (state.engines.includes(e.id)) right = '<span class="owned">Learned</span>';
        else if (!isUnlocked(state, e)) right = '<span class="muted">🔒 ' + CONFIG.levels[e.level - 1].name + "</span>";
        else right = costButton("learn", 'data-id="' + e.id + '"', e.cost, "Learn");
        html += '<div class="item"><div class="item-main"><b>' + e.name + "</b> <span class=\"muted\">+" + e.power + " Engines</span><div>Good for: " + e.good + '</div><div class="muted">Fun fact: ' + e.fact + "</div></div>" + right + "</div>";
      }
    }
    if (tab === "features") {
      for (const f of CONFIG.features) {
        let right;
        if (state.features.includes(f.id)) right = '<span class="owned">Owned</span>';
        else if (!isUnlocked(state, f)) right = '<span class="muted">🔒 ' + CONFIG.levels[f.level - 1].name + "</span>";
        else right = costButton("buy-feature", 'data-id="' + f.id + '"', f.cost, "Buy");
        html += '<div class="item"><div class="item-main"><b>' + f.name + "</b><div>" + f.hint + "</div></div>" + right + "</div>";
      }
    }
    if (tab === "desks") {
      if (studioLevel(state) < 2) html += '<p class="muted">Desks for hires unlock when you become an Indie Studio (' + fmt(CONFIG.levels[1].fans) + ' fans).</p>';
      else {
        html += '<p class="muted">Each hire needs a desk. Your studio level decides how many desks each section can have (' + desksAllowed(state) + " now).</p>";
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
        const next = cost === undefined ? "" : ' → <span class="muted">' + s.levels[lv + 1] + " (+" + Math.round(s.speed * 100) + "% speed)</span>";
        html += '<div class="item"><div class="item-main"><b>' + s.name + "</b>: " + s.levels[lv] + next + "</div>" + right + "</div>";
      }
    }
    return { title: "Store · " + money(state.money), html: html };
  },

  // ----- Games, team, mail, trophies --------------------------------

  panel_games() {
    let html = "";
    if (state.projects.length) {
      html += "<h3>Being made</h3>";
      for (const p of state.projects) {
        html += '<div class="item"><div class="item-main"><b>' + esc(p.name) + '</b> <span class="muted">' + CONFIG.steps[p.step].name + (p.worker ? "" : " (waiting)") + "</span></div></div>";
      }
    }
    html += "<h3>Released</h3>";
    if (!state.released.length) html += '<p class="muted">No games out yet.</p>';
    for (const g of state.released.slice(0, 40)) {
      const genre = byId(CONFIG.genres, g.genre), price = byId(CONFIG.prices, g.price);
      html += '<div class="item"><div class="item-main"><b>' + esc(g.name) + "</b> " + (g.bugs ? "🐞" : "") + ' <span class="muted">' + genre.name + " · " + price.label + "</span>" +
        '<div class="muted">' + fmt(g.players) + " players · +" + fmt(playersPerSecondNow(g)) + "/s now</div></div></div>";
    }
    return { title: "Your games", html: html };
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
    for (const m of state.mail) html += '<div class="mail"><b>' + esc(m.from) + "</b><div>" + esc(m.text) + "</div></div>";
    return { title: "Mailbox", html: html };
  },

  panel_trophies() {
    let html = "";
    for (const t of CONFIG.trophies) {
      const got = state.trophies[t.id];
      html += '<div class="item' + (got ? "" : " dim") + '"><div class="item-main">' + (got ? "🏆 " : "🔒 ") + "<b>" + t.name + '</b></div><span class="muted">' + money(t.reward) + "</span></div>";
    }
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
      case "store-tab": this.panel.tab = data.tab; Sound.play("click"); this.renderPanel(); break;
      case "close-card":
        $("card").classList.add("hidden");
        this.showNextCard();
        break;

      // Making a game
      case "form-random-name": this.form.name = pickRandom(CONFIG.gameNameIdeas); this.renderPanel(); break;
      case "form-genre": this.form.name = $("game-name").value; this.form.genre = data.id; Sound.play("click"); this.renderPanel(); break;
      case "form-price": this.form.name = $("game-name").value; this.form.price = data.id; Sound.play("click"); this.renderPanel(); break;
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
        const nameValue = $("game-name").value.trim() || pickRandom(CONFIG.gameNameIdeas);
        if (startNewGame(s, { name: nameValue.slice(0, 28), genre: this.form.genre, price: this.form.price, features: this.form.features })) {
          Sound.play("step");
          this.closePanel();
        } else no();
        break;
      }

      // Office sections
      case "start-step": youStartStep(s, data.id) ? Sound.play("step") : no(); this.renderPanel(); break;
      case "skip-testing": skipTesting(s, data.id); Sound.play("click"); this.renderPanel(); break;
      case "minigame": {
        const p = s.projects.find(x => x.id === data.id);
        if (!p) break;
        p.boostUsed = true;
        const stepNow = p.step;
        Minigames.start(CONFIG.steps[stepNow].minigame,
          () => applyMinigame(state, p.id, 1),                                    // each hit
          () => !state || !state.projects.includes(p) || p.step !== stepNow || !p.worker, // step done?
          () => this.renderPanel());
        break;
      }
      case "buy-desk": buyDesk(s, data.id) ? ok() : no(); this.renderPanel(); break;
      case "hire": hire(s, data.id) ? ok() : no(); this.renderPanel(); break;
      case "rename": this.renaming = data.id; this.renderPanel(); break;

      // Store
      case "train": trainSkill(s, data.id) ? ok() : no(); this.renderPanel(); break;
      case "learn": learnEngine(s, data.id) ? ok() : no(); this.renderPanel(); break;
      case "buy-feature": if (buyFeature(s, data.id)) { ok(); } else no(); this.renderPanel(); break;
      case "supply": upgradeSupply(s, data.id) ? ok() : no(); this.renderPanel(); break;

      // Conventions
      case "show-game": if (acceptEvent(s, data.id)) { Office.celebrate(); Sound.play("launch"); this.closePanel(); } break;
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

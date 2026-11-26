// =====================================================================
//  PIXEL EMPIRE - THE OFFICE
//  ---------------------------------------------------------------------
//  Draws the office with pixel art: the floor, the neon signs, desks
//  and all the little people. Everything is drawn with tiny rectangles
//  ("pixels") on a small canvas, then the browser makes it bigger.
// =====================================================================

// The office is drawn at this small size, then scaled up to fit.
// On wide screens the sections get wider, so the office fills the
// screen (see Office.fit). They're never narrower than 96 pixels.
const BASE_SECTION_W = 96;
const MAX_SECTION_W = 150;
let SECTION_W = BASE_SECTION_W;
let WORLD_W = SECTION_W * 5;
const WORLD_H = 270;
const WALL_H = 26;

// On tall phone screens the office is shown as two floors (see Office.show).
// (These use the narrow 96-pixel sections.)
const FOLD_W = BASE_SECTION_W * 3;                      // top floor: 3 sections wide
const FOLD_GAP = 6;                                     // dark gap between the floors
const FOLD_H = WORLD_H * 2 + FOLD_GAP;
const FOLD_X2 = (FOLD_W - BASE_SECTION_W * 2) / 2;      // bottom floor sits in the middle

// Where a desk goes in a wider section: it keeps its place, spread out
// to match. (x and w are for a 96-pixel section.)
function spreadX(x, w) {
  return Math.round((x + w / 2) * SECTION_W / BASE_SECTION_W - w / 2);
}

// Neon colors for the "night shift" look.
const NEON = {
  pink: "#ff3ea5",
  cyan: "#2ee6ff",
  floor: "#1a0f2e",
  floor2: "#1e1236",
  wall: "#0f0820",
  dark: "#0b0618",
  desk: "#45306b",
  deskEdge: "#2d1f4a",
};

// Where things sit inside each section (x is from the section's left edge).
const STATION = { x: 30, y: 52, w: 36, h: 14 };    // your big desk
const DESK_SPOTS = [                                 // hire desks
  { x: 8, y: 112 }, { x: 60, y: 112 },
  { x: 8, y: 166 }, { x: 60, y: 166 },
  { x: 34, y: 220 },
];
const DESK_W = 28, DESK_H = 10;

// ----- Drawing a little person --------------------------------------

// Draws a big-headed person. (x, y) is where their feet touch the floor.
function drawPerson(ctx, x, y, look, opts) {
  opts = opts || {};
  x = Math.round(x); y = Math.round(y);
  const step = opts.walking ? Math.floor(opts.phase * 6) % 2 : 0;
  const jump = opts.cheer ? Math.round(Math.abs(Math.sin(opts.phase * 8)) * 4) : 0;
  y -= jump;
  const px = (dx, dy, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x + dx, y + dy, w, h); };

  // Shadow on the floor
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x - 4, y + jump, 8, 2);

  // Feet (they take turns when walking)
  px(-4, -2 - step, 3, 2, NEON.dark);
  px(1, -2 - (1 - step) * (opts.walking ? 1 : 0), 3, 2, NEON.dark);

  // Body (shirt) with an outline
  px(-4, -8, 8, 6, NEON.dark);
  px(-3, -7, 6, 5, look.shirt);

  // Arms: up when cheering, down otherwise
  if (opts.cheer) {
    px(-5, -12, 2, 5, look.skin); px(3, -12, 2, 5, look.skin);
  } else if (opts.typing) {
    const t = Math.floor(opts.phase * 10) % 2;
    px(-5, -6 - t, 2, 2, look.skin); px(3, -6 - (1 - t), 2, 2, look.skin);
  } else {
    px(-5, -7, 2, 4, look.skin); px(3, -7, 2, 4, look.skin);
  }

  // Big head with an outline
  px(-6, -19, 12, 12, NEON.dark);
  px(-5, -18, 10, 10, look.skin);
  // Eyes (blink now and then)
  const blink = (Math.floor(opts.phase * 2 + (opts.seed || 0)) % 7) === 0;
  if (!blink) { px(-3, -13, 2, 2, NEON.dark); px(1, -13, 2, 2, NEON.dark); }
  else { px(-3, -12, 2, 1, NEON.dark); px(1, -12, 2, 1, NEON.dark); }
  // Rosy cheeks
  px(-4, -11, 1, 1, "rgba(255,90,140,0.6)"); px(3, -11, 1, 1, "rgba(255,90,140,0.6)");

  // Hair: three styles
  const hs = look.hairStyle || 0;
  px(-6, -20, 12, 4, look.hair);          // top
  if (hs === 0) {                          // short
    px(-6, -16, 2, 2, look.hair); px(4, -16, 2, 2, look.hair);
  } else if (hs === 1) {                   // spiky
    px(-5, -22, 2, 2, look.hair); px(-1, -23, 2, 3, look.hair); px(3, -22, 2, 2, look.hair);
  } else {                                 // long
    px(-6, -16, 2, 8, look.hair); px(4, -16, 2, 8, look.hair);
  }
}

// ----- Furniture ----------------------------------------------------

function drawDesk(ctx, x, y, w, h, screenOn, time) {
  ctx.fillStyle = NEON.dark;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 4);
  ctx.fillStyle = NEON.desk;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = NEON.deskEdge;
  ctx.fillRect(x, y + h, w, 2);
  // Monitor on the desk
  const mx = x + Math.floor(w / 2) - 6;
  ctx.fillStyle = NEON.dark;
  ctx.fillRect(mx, y - 6, 12, 8);
  const flicker = screenOn ? (Math.floor(time * 6) % 5 === 0 ? 0.7 : 1) : 0.25;
  ctx.globalAlpha = flicker;
  ctx.fillStyle = screenOn ? NEON.cyan : "#3a2c5c";
  ctx.fillRect(mx + 1, y - 5, 10, 5);
  ctx.globalAlpha = 1;
  // Keyboard
  ctx.fillStyle = "#7a6aa8";
  ctx.fillRect(mx + 1, y + 3, 10, 2);
}

function drawEmptyDeskSpot(ctx, x, y) {
  ctx.strokeStyle = "rgba(46,230,255,0.35)";
  ctx.setLineDash([2, 2]);
  ctx.strokeRect(x + 0.5, y + 0.5, DESK_W - 1, DESK_H - 1);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(46,230,255,0.5)";
  ctx.fillRect(x + DESK_W / 2 - 2, y + DESK_H / 2, 5, 1);
  ctx.fillRect(x + DESK_W / 2, y + DESK_H / 2 - 2, 1, 5);
}

// A small yellow lightning bolt: "you can speed this up!"
function drawBolt(ctx, x, y, time) {
  const on = Math.floor(time * 3) % 2 === 0;
  ctx.fillStyle = NEON.dark;
  ctx.fillRect(x - 1, y - 1, 7, 11);
  ctx.fillStyle = on ? "#ffd23f" : "#fff3a0";
  ctx.fillRect(x + 2, y, 3, 1);
  ctx.fillRect(x + 1, y + 1, 3, 1);
  ctx.fillRect(x + 1, y + 2, 2, 1);
  ctx.fillRect(x, y + 3, 5, 1);
  ctx.fillRect(x + 2, y + 4, 2, 1);
  ctx.fillRect(x + 2, y + 5, 2, 1);
  ctx.fillRect(x + 1, y + 6, 2, 1);
  ctx.fillRect(x + 1, y + 7, 1, 1);
}

function drawPlant(ctx, x, y) {
  ctx.fillStyle = NEON.dark; ctx.fillRect(x - 4, y - 6, 8, 7);
  ctx.fillStyle = "#6b3fa0"; ctx.fillRect(x - 3, y - 5, 6, 5);
  ctx.fillStyle = "#2bd99b";
  ctx.fillRect(x - 5, y - 12, 4, 6); ctx.fillRect(x + 1, y - 13, 4, 7); ctx.fillRect(x - 2, y - 15, 4, 8);
}

function drawNeonSign(ctx, cx, text, color, time, highlight) {
  ctx.font = "8px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = Math.ceil(ctx.measureText(text).width) + 8;
  const x = Math.round(cx - w / 2);
  const glow = 6 + Math.sin(time * 2 + cx) * 2 + (highlight ? 6 : 0);
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, 5.5, w, 14);
  ctx.fillStyle = color;
  ctx.fillText(text, Math.round(cx) + 1, 13);
  ctx.restore();
}

// =====================================================================
//  THE OFFICE SCENE
// =====================================================================

const Office = {
  canvas: null,
  ctx: null,
  people: {},        // moving characters, by id ("you" or a hire id)
  confetti: [],
  cheerUntil: 0,
  hoverSection: -1,
  time: 0,
  onSectionClick: null,

  // The office is drawn on a hidden "world" canvas first. Then show()
  // copies it onto the real canvas you see. On a tall phone screen the
  // office is folded into two floors: Concept, Pre-prod and Production
  // on top, Testing and Launch below. That makes it much bigger!
  world: null,
  folded: false,

  init(canvas) {
    this.canvas = canvas;
    this.world = document.createElement("canvas");
    this.world.width = WORLD_W;
    this.world.height = WORLD_H;
    this.ctx = this.world.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.setFolded(false);
    canvas.addEventListener("mousemove", e => {
      this.hoverSection = this.sectionAt(this.toWorld(e));
      canvas.style.cursor = this.hoverSection >= 0 && this.onSectionClick ? "pointer" : "default";
    });
    canvas.addEventListener("mouseleave", () => { this.hoverSection = -1; });
    canvas.addEventListener("click", e => {
      const i = this.sectionAt(this.toWorld(e));
      if (i >= 0 && this.onSectionClick) this.onSectionClick(CONFIG.steps[i].id);
    });
  },

  // Which section (0 to 4) a spot in the office is in, or -1 for none.
  // The wall at the top doesn't count, only the floor.
  sectionAt(p) {
    const i = Math.floor(p.x / SECTION_W);
    return p.y > WALL_H - 8 && i >= 0 && i < 5 ? i : -1;
  },

  // Folded = two floors (for tall screens). Not folded = one long room.
  // The top floor has 3 sections, the bottom floor has 2 in the middle.
  // Changes how wide each section is, and moves everyone to match.
  setSectionWidth(w) {
    if (w === SECTION_W) return;
    const k = w / SECTION_W;
    SECTION_W = w;
    WORLD_W = w * 5;
    this.world.width = WORLD_W;
    this.ctx.imageSmoothingEnabled = false;
    for (const id in this.people) {
      const p = this.people[id];
      p.x *= k; p.target.x *= k;
    }
    this.setFolded(this.folded);
  },

  setFolded(folded) {
    this.folded = folded;
    this.canvas.width = folded ? FOLD_W : WORLD_W;
    this.canvas.height = folded ? FOLD_H : WORLD_H;
    this.screen = this.canvas.getContext("2d");
    this.screen.imageSmoothingEnabled = false;
  },

  // Copies the drawn office onto the canvas you see.
  show() {
    const g = this.screen;
    if (!this.folded) { g.drawImage(this.world, 0, 0); return; }
    g.fillStyle = NEON.dark;
    g.fillRect(0, 0, FOLD_W, FOLD_H);
    // Top floor: the first 3 sections
    g.drawImage(this.world, 0, 0, FOLD_W, WORLD_H, 0, 0, FOLD_W, WORLD_H);
    // Bottom floor: the last 2 sections, in the middle
    g.drawImage(this.world, FOLD_W, 0, WORLD_W - FOLD_W, WORLD_H, FOLD_X2, WORLD_H + FOLD_GAP, WORLD_W - FOLD_W, WORLD_H);
  },

  // Turns a mouse or finger position on screen into a position in the office.
  toWorld(e) {
    const r = this.canvas.getBoundingClientRect();
    // First: where on the canvas, in canvas pixels
    const x = (e.clientX - r.left) / r.width * this.canvas.width;
    const y = (e.clientY - r.top) / r.height * this.canvas.height;
    if (!this.folded || y < WORLD_H) return { x: x, y: y };
    // On the bottom floor: move it back to where it is in the long room.
    const fx = x - FOLD_X2;
    if (fx < 0 || fx >= WORLD_W - FOLD_W) return { x: -1, y: -1 };
    return { x: fx + FOLD_W, y: y - WORLD_H - FOLD_GAP };
  },

  // Makes everything fit the screen:
  //  1. Picks the layout. Phones get a slim bar at the top and buttons
  //     at the bottom (body class "phone"). Tall phones also get "tall".
  //  2. Makes the office as big as it can be in the space that's left,
  //     so the HUD never covers it.
  fit() {
    const W = window.innerWidth, H = window.innerHeight;
    const tall = H > W;
    const phone = tall ? W <= 820 : H <= 500;
    document.body.classList.toggle("phone", phone);
    document.body.classList.toggle("tall", phone && tall);

    const hudOn = !document.getElementById("hud").classList.contains("hidden");
    const rect = id => document.getElementById(id).getBoundingClientRect();
    const tc = document.getElementById("topcenter");
    let top = 0, bottom = H;
    if (hudOn && phone) {
      // Phone: the office goes between the top bar and the buttons.
      // We measure the "Make a game" button, because it stays put even
      // when the More menu is open.
      const bar = rect("hud-top"), make = rect("btn-make");
      top = bar.bottom;
      if (tall) bottom = make.top - 8;
      else top = Math.max(top, make.bottom + 6);
      // The guide and messages sit under the top bar, pushing the office
      // down a little so they never cover it.
      tc.style.top = top + "px";
      if (!tc.classList.contains("hidden") && tc.offsetHeight) top += tc.offsetHeight + 6;
    } else if (hudOn) {
      // Big screen: the office goes between the corner boxes.
      const box = sel => document.querySelector(sel).getBoundingClientRect();
      top = Math.max(box(".hud-box.tl").bottom, box(".hud-box.tr").bottom) + 2;
      bottom = Math.min(box(".hud-box.bl").top, box(".hud-box.br").top) - 2;
      tc.style.top = "";
    }
    const wrap = document.getElementById("office-wrap");
    wrap.style.top = top + "px";
    wrap.style.bottom = (H - bottom) + "px";

    // The room left for the office. (On sideways iPhones, style.css adds
    // padding so the office stays clear of the notch and the home bar.)
    const pad = getComputedStyle(wrap);
    const roomW = W - 8 - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight);
    const roomH = bottom - top - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom);
    // One long room, or two floors? Pick whichever is bigger on screen.
    const longScale = Math.min(roomW / (BASE_SECTION_W * 5), roomH / WORLD_H);
    const foldScale = Math.min(roomW / FOLD_W, roomH / FOLD_H);
    const fold = foldScale > longScale * 1.2;
    // One long room: make the sections wider to fill a wide screen.
    let sw = BASE_SECTION_W;
    if (!fold) sw = Math.max(BASE_SECTION_W, Math.min(MAX_SECTION_W, Math.floor(roomW / roomH * WORLD_H / 5)));
    this.setSectionWidth(sw);
    if (fold !== this.folded) this.setFolded(fold);
    const s = fold ? foldScale : Math.min(roomW / WORLD_W, roomH / WORLD_H);
    this.canvas.style.width = Math.floor(this.canvas.width * s) + "px";
    this.canvas.style.height = Math.floor(this.canvas.height * s) + "px";
  },

  sectionX(stepId) {
    return CONFIG.steps.findIndex(s => s.id === stepId) * SECTION_W;
  },

  // Where someone stands to work at the big station of a section.
  stationSpot(stepId) {
    return { x: this.sectionX(stepId) + spreadX(STATION.x, STATION.w) + STATION.w / 2, y: STATION.y + 6 };
  },

  deskSpot(stepId, index) {
    const d = DESK_SPOTS[index];
    return { x: this.sectionX(stepId) + spreadX(d.x, DESK_W) + DESK_W / 2, y: d.y + 6 };
  },

  randomSpotIn(stepId) {
    const x0 = stepId ? this.sectionX(stepId) : 0;
    const w = stepId ? SECTION_W : WORLD_W;
    return { x: x0 + 10 + Math.random() * (w - 20), y: 80 + Math.random() * (WORLD_H - 95) };
  },

  // Keeps a moving character for each person, and decides where they go.
  updatePeople(state, dt) {
    const alive = { you: true };
    // You
    let you = this.people.you || (this.people.you = this.makeWalker(this.randomSpotIn(null), 45));
    you.look = state.me;
    const myProject = state.projects.find(p => p.id === state.you.projectId);
    if (myProject) {
      you.target = this.stationSpot(CONFIG.steps[myProject.step].id);
      you.working = true;
    } else {
      you.working = false;
      if (you.restUntil < this.time && this.atTarget(you)) {
        you.target = this.randomSpotIn(null); you.restUntil = this.time + 2 + Math.random() * 4;
      }
    }
    // Hires
    for (const step of CONFIG.steps) {
      hiresIn(state, step.id).forEach((h, i) => {
        alive[h.id] = true;
        let w = this.people[h.id];
        if (!w) w = this.people[h.id] = this.makeWalker(this.deskSpot(step.id, i), 35);
        w.look = h.look;
        w.working = hireIsBusy(state, h.id);
        if (w.working) w.target = this.deskSpot(step.id, i);
        else if (w.restUntil < this.time && this.atTarget(w)) {
          w.target = Math.random() < 0.4 ? this.deskSpot(step.id, i) : this.randomSpotIn(step.id);
          w.restUntil = this.time + 3 + Math.random() * 5;
        }
      });
    }
    for (const id in this.people) if (!alive[id]) delete this.people[id];
    // Move everyone toward their target
    for (const id in this.people) {
      const w = this.people[id];
      const dx = w.target.x - w.x, dy = w.target.y - w.y;
      const dist = Math.hypot(dx, dy);
      w.walking = dist > 0.5;
      if (w.walking) {
        const move = Math.min(dist, w.speed * dt);
        w.x += dx / dist * move; w.y += dy / dist * move;
        w.phase += dt;
      }
    }
  },

  makeWalker(spot, speed) {
    return { x: spot.x, y: spot.y, target: { x: spot.x, y: spot.y }, speed: speed, phase: Math.random() * 10, restUntil: 0, seed: Math.floor(Math.random() * 7) };
  },

  atTarget(w) {
    return Math.hypot(w.target.x - w.x, w.target.y - w.y) < 0.5;
  },

  celebrate() {
    this.cheerUntil = this.time + 3;
    for (let i = 0; i < 140; i++) {
      this.confetti.push({
        x: Math.random() * WORLD_W, y: -Math.random() * 60,
        vx: (Math.random() - 0.5) * 30, vy: 30 + Math.random() * 50,
        color: [NEON.pink, NEON.cyan, "#ffd23f", "#9b6bff"][i % 4], life: 4,
      });
    }
  },

  // ----- Draw one frame ---------------------------------------------
  draw(state, dt) {
    this.time += dt;
    const ctx = this.ctx;
    const t = this.time;
    this.updatePeople(state, dt);

    // Floor with a soft checker pattern
    ctx.fillStyle = NEON.floor;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.fillStyle = NEON.floor2;
    for (let y = WALL_H; y < WORLD_H; y += 16) {
      for (let x = ((y / 16) % 2) * 16; x < WORLD_W; x += 32) ctx.fillRect(x, y, 16, 16);
    }
    // Wall and its neon strip
    ctx.fillStyle = NEON.wall;
    ctx.fillRect(0, 0, WORLD_W, WALL_H);
    ctx.fillStyle = NEON.pink;
    ctx.globalAlpha = 0.8 + Math.sin(t * 3) * 0.1;
    ctx.fillRect(0, WALL_H - 2, WORLD_W, 2);
    ctx.globalAlpha = 1;

    const lvl = studioLevel(state);
    const allowed = CONFIG.levels[lvl - 1].desks;

    CONFIG.steps.forEach((step, i) => {
      const x0 = i * SECTION_W;
      const hover = this.hoverSection === i;
      // Each section has its own neon color, with a soft glow on its floor.
      const color = step.color;
      ctx.fillStyle = color;
      ctx.globalAlpha = hover ? 0.1 : 0.035;
      ctx.fillRect(x0, WALL_H, SECTION_W, WORLD_H - WALL_H);
      ctx.globalAlpha = 1;
      if (i > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        for (let y = WALL_H + 4; y < WORLD_H; y += 8) ctx.fillRect(x0, y, 1, 4);
      }
      const label = step.id === "preprod" ? "PRE-PROD" : step.name.toUpperCase();
      drawNeonSign(ctx, x0 + SECTION_W / 2, label, color, t, hover);
    });

    // Plants and the coffee machine
    drawPlant(ctx, 8, WORLD_H - 6);
    drawPlant(ctx, WORLD_W - 8, WORLD_H - 6);
    if (state.supplies.coffee > 0) {
      ctx.fillStyle = NEON.dark; ctx.fillRect(WORLD_W - 16, WALL_H + 2, 12, 14);
      ctx.fillStyle = "#c9c2e0"; ctx.fillRect(WORLD_W - 15, WALL_H + 3, 10, 12);
      ctx.fillStyle = NEON.pink; ctx.fillRect(WORLD_W - 13, WALL_H + 5, 6, 2);
    }

    // Collect everything that needs drawing, sorted by height on screen,
    // so things lower down are drawn in front.
    const drawList = [];
    CONFIG.steps.forEach(step => {
      const x0 = this.sectionX(step.id);
      const busy = state.projects.some(p => CONFIG.steps[p.step].id === step.id && p.worker === "you");
      drawList.push({ y: STATION.y + 1, fn: () => drawDesk(ctx, x0 + spreadX(STATION.x, STATION.w), STATION.y, STATION.w, STATION.h, busy, t) });
      for (let d = 0; d < allowed; d++) {
        const spot = DESK_SPOTS[d];
        if (d < state.desks[step.id]) {
          const hire = hiresIn(state, step.id)[d];
          const on = hire && hireIsBusy(state, hire.id);
          drawList.push({ y: spot.y + 1, fn: () => drawDesk(ctx, x0 + spreadX(spot.x, DESK_W), spot.y, DESK_W, DESK_H, on, t + d) });
        } else {
          drawList.push({ y: spot.y - 100, fn: () => drawEmptyDeskSpot(ctx, x0 + spreadX(spot.x, DESK_W), spot.y) });
        }
      }
    });
    const cheering = this.time < this.cheerUntil;
    for (const id in this.people) {
      const w = this.people[id];
      if (!w.look) continue;
      drawList.push({ y: w.y, fn: () => {
        drawPerson(ctx, w.x, w.y, w.look, { walking: w.walking, phase: w.phase + (cheering ? t : 0), cheer: cheering, typing: w.working && !w.walking, seed: w.seed });
        if (id === "you") {
          // A small arrow over your own head so you can find yourself
          ctx.fillStyle = NEON.pink;
          const bob = Math.round(Math.sin(t * 4));
          ctx.fillRect(Math.round(w.x) - 2, Math.round(w.y) - 28 + bob, 5, 2);
          ctx.fillRect(Math.round(w.x) - 1, Math.round(w.y) - 26 + bob, 3, 1);
        }
      } });
    }
    drawList.sort((a, b) => a.y - b.y);
    for (const item of drawList) item.fn();

    // Progress bars above people who are working, in the section's color.
    // A lightning bolt next to the main worker means you can still speed
    // that step up with a mini-game.
    for (const p of state.projects) {
      if (!p.worker) continue;
      const color = CONFIG.steps[p.step].color;
      const done = Math.min(1, p.progress / stepDuration(state, p));
      for (const id of [p.worker].concat(p.helpers || [])) {
        const w = this.people[id];
        if (!w) continue;
        const bx = Math.round(w.x) - 9, by = Math.round(w.y) - 33;
        ctx.fillStyle = NEON.dark; ctx.fillRect(bx - 1, by - 1, 20, 5);
        ctx.fillStyle = "#3a2c5c"; ctx.fillRect(bx, by, 18, 3);
        ctx.fillStyle = color;
        ctx.globalAlpha = id === p.worker ? 1 : 0.6;
        ctx.fillRect(bx, by, Math.round(18 * done), 3);
        ctx.globalAlpha = 1;
        if (id === p.worker && canSpeedUp(state, p)) drawBolt(ctx, bx + 21, by - 4 + Math.round(Math.sin(t * 5)), t);
      }
    }

    // A bouncing "!" where a game is waiting for you
    if (!state.you.projectId) {
      const waitingSteps = {};
      for (const p of state.projects) if (!p.worker) waitingSteps[CONFIG.steps[p.step].id] = true;
      for (const stepId in waitingSteps) {
        const s = this.stationSpot(stepId);
        const bob = Math.round(Math.sin(t * 6) * 2);
        ctx.fillStyle = NEON.dark; ctx.fillRect(s.x - 5, STATION.y - 22 + bob, 11, 13);
        ctx.fillStyle = "#ffd23f"; ctx.fillRect(s.x - 4, STATION.y - 21 + bob, 9, 11);
        ctx.fillStyle = NEON.dark; ctx.fillRect(s.x - 1, STATION.y - 19 + bob, 3, 5); ctx.fillRect(s.x - 1, STATION.y - 13 + bob, 3, 2);
      }
    }

    // Confetti
    this.confetti = this.confetti.filter(c => (c.life -= dt) > 0 && c.y < WORLD_H + 5);
    for (const c of this.confetti) {
      c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= 0.99;
      ctx.fillStyle = c.color;
      ctx.fillRect(Math.round(c.x), Math.round(c.y), 2, 2);
    }

    this.show();
  },
};

// Draws a big preview of a character (used on the character screen).
function drawPreview(canvas, look) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  canvas.width = 32; canvas.height = 32;
  ctx.fillStyle = NEON.floor; ctx.fillRect(0, 0, 32, 32);
  drawPerson(ctx, 16, 28, look, { phase: performance.now() / 1000 });
}

// =====================================================================
//  PIXEL EMPIRE - THE OFFICE
//  ---------------------------------------------------------------------
//  Draws the office with "hi-bit" pixel art: the floor, the neon signs,
//  desks and all the little people. Everything is drawn with tiny
//  rectangles ("pixels") on a small canvas, then the browser makes it
//  bigger. Hi-bit means each office pixel is split into 2 x 2 smaller
//  pixels, so there's room for more detail, shading and glowing lights.
// =====================================================================

// The office is laid out on this small grid, then scaled up to fit.
const WORLD_W = 480;
const WORLD_H = 270;
const SECTION_W = WORLD_W / 5;  // each of the 5 sections is 96 pixels wide
const WALL_H = 26;
const RES = 2;                  // hi-bit: every office pixel is 2 x 2 real pixels

// On tall phone screens the office is shown as two floors (see Office.show).
const FOLD_W = SECTION_W * 3;                 // top floor: 3 sections wide
const FOLD_GAP = 6;                           // dark gap between the floors
const FOLD_H = WORLD_H * 2 + FOLD_GAP;
const FOLD_X2 = (FOLD_W - SECTION_W * 2) / 2; // bottom floor sits in the middle

// Neon colors for the "night shift" look.
const NEON = {
  pink: "#ff3ea5",
  cyan: "#2ee6ff",
  yellow: "#ffd23f",
  green: "#7cff6b",
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

// ----- Color helpers ------------------------------------------------

// A lighter (amt above 0) or darker (amt below 0) version of a color.
const shadeCache = {};
function shade(hex, amt) {
  const key = hex + amt;
  if (shadeCache[key]) return shadeCache[key];
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  return (shadeCache[key] = "rgb(" + f(n >> 16) + "," + f((n >> 8) & 255) + "," + f(n & 255) + ")");
}

// A color with see-through-ness, like "rgba(255,62,165,0.5)".
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}

// Lights (screens, signs, the coffee machine) add a soft glow. While
// drawing, each light is put on this list. At the end they all shine
// at once (see Office.draw).
let GLOWS = [];
function addGlow(x, y, r, color, a) { GLOWS.push({ x: x, y: y, r: r, color: color, a: a }); }

// ----- Drawing a little person --------------------------------------

// Draws a big-headed person. (x, y) is where their feet touch the floor.
// The person is drawn on the fine hi-bit grid (half an office pixel).
function drawPerson(ctx, x, y, look, opts) {
  opts = opts || {};
  x = Math.round(x * 2) / 2; y = Math.round(y * 2) / 2;
  const ph = opts.phase || 0;
  const clock = opts.time === undefined ? ph : opts.time;   // for blinking and typing
  const O = NEON.dark;                       // outline color
  // Walking takes 4 steps: left foot up, both down, right foot up, both down.
  const frame = opts.walking ? Math.floor(ph * 8) % 4 : 0;
  const footL = frame === 0 ? 2 : 0, footR = frame === 2 ? 2 : 0;
  const up = opts.walking && frame % 2 === 0 ? 1 : 0;
  const swing = frame === 0 ? 1 : frame === 2 ? -1 : 0;
  const jump = opts.cheer ? Math.round(Math.abs(Math.sin(ph * 8)) * 8) : 0;
  const dir = opts.dir || 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.5, 0.5);
  const p = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(dx, dy, w, h); };

  // Shadow on the floor (smaller while jumping)
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  const sw = jump > 4 ? 6 : 9;
  ctx.fillRect(-sw, -1, sw * 2, 3);
  ctx.fillRect(-sw + 2, -2, sw * 2 - 4, 5);

  ctx.translate(0, -jump);

  // Legs and shoes (they take turns when walking)
  const pants = "#2a1f4a", shoe = "#3b2d63";
  p(-7, -9, 6, 6 - footL, O); p(1, -9, 6, 6 - footR, O);
  p(-6, -8, 4, 5 - footL, pants); p(2, -8, 4, 5 - footR, pants);
  p(-8, -4 - footL, 7, 4, O); p(1, -4 - footR, 7, 4, O);
  p(-7, -3 - footL, 5, 2, shoe); p(2, -3 - footR, 5, 2, shoe);
  p(-7, -3 - footL, 2, 1, "#6e5aa8"); p(2, -3 - footR, 2, 1, "#6e5aa8");

  ctx.translate(0, -up);

  // Arms behind the body (idle and walking)
  const shirt = look.shirt, skin = look.skin;
  const arm = (ax, dy) => {
    p(ax - 1, -18 + dy, 4, 10, O);
    p(ax, -17 + dy, 2, 5, shade(shirt, -0.2));
    p(ax, -12 + dy, 2, 3, skin);
  };
  if (opts.cheer) {
    p(-14, -31, 4, 14, O); p(10, -31, 4, 14, O);
    p(-13, -30, 2, 4, skin); p(11, -30, 2, 4, skin);
    p(-13, -26, 2, 8, shade(shirt, -0.2)); p(11, -26, 2, 8, shade(shirt, -0.2));
  } else if (!opts.typing) {
    arm(-11, swing); arm(9, -swing);
  }

  // Body: a shirt with light on the left and shadow on the right
  p(-9, -19, 18, 11, O);
  p(-8, -18, 16, 9, shirt);
  p(-8, -18, 3, 8, shade(shirt, 0.3));
  p(5, -18, 3, 9, shade(shirt, -0.25));
  p(-8, -10, 16, 1, shade(shirt, -0.35));
  p(-2, -18, 4, 2, skin); p(-1, -16, 2, 1, skin);  // the collar

  // Typing: hands out in front, tapping away
  if (opts.typing && !opts.cheer) {
    const t = Math.floor(clock * 8 + (opts.seed || 0)) % 2;
    p(-10, -14 - t, 6, 5, O); p(4, -14 - (1 - t), 6, 5, O);
    p(-9, -13 - t, 4, 3, skin); p(5, -13 - (1 - t), 4, 3, skin);
  }

  // Big round head
  p(-11, -41, 22, 25, O);
  p(-12, -40, 24, 23, O);
  p(-10, -40, 20, 23, skin);
  p(-11, -39, 22, 21, skin);
  p(-10, -18, 20, 1, shade(skin, -0.12));     // chin shadow
  p(9, -36, 2, 15, shade(skin, -0.1));        // right side shadow
  p(-9, -30, 2, 3, shade(skin, 0.25));        // shine on the cheek

  // Eyes: they look where you're walking, and blink now and then
  const blink = (Math.floor(clock * 6 + (opts.seed || 0) * 3) % 21) === 0;
  const look2 = dir > 0 ? 1 : 0;
  if (!blink) {
    p(-7, -31, 4, 5, "#ffffff"); p(3, -31, 4, 5, "#ffffff");
    p(-7 + look2, -30, 3, 4, "#1b1030"); p(3 + look2, -30, 3, 4, "#1b1030");
    p(-7 + look2, -30, 1, 1, "#ffffff"); p(3 + look2, -30, 1, 1, "#ffffff");
  } else {
    p(-7, -28, 4, 1, O); p(3, -28, 4, 1, O);
  }
  // Rosy cheeks and a mouth (a big smile when cheering)
  p(-10, -25, 3, 2, "rgba(255,90,140,0.55)"); p(7, -25, 3, 2, "rgba(255,90,140,0.55)");
  if (opts.cheer) { p(-3, -25, 6, 3, O); p(-2, -24, 4, 1, "#ff5a8c"); }
  else p(-1, -24, 3, 1, shade(skin, -0.5));

  // Hair: three styles. Outlines first, then the hair on top.
  const hair = look.hair;
  const hs = look.hairStyle || 0;
  const parts = [[-10, -42, 20, 2], [-12, -40, 24, 7], [-12, -33, 7, 2], [-5, -33, 3, 1], [4, -33, 8, 2]];
  if (hs === 0) parts.push([-12, -31, 2, 5], [10, -31, 2, 5]);                    // short
  else if (hs === 1) parts.push([-9, -46, 4, 4], [-2, -48, 4, 6], [5, -46, 4, 4]); // spiky
  else parts.push([-13, -33, 4, 15], [9, -33, 4, 15]);                            // long
  for (const r of parts) p(r[0] - 1, r[1] - 1, r[2] + 2, r[3] + 2, O);
  for (const r of parts) p(r[0], r[1], r[2], r[3], hair);
  p(-8, -40, 7, 1, shade(hair, 0.4));          // shiny hair
  p(-9, -39, 2, 2, shade(hair, 0.4));
  p(6, -38, 5, 4, shade(hair, -0.25));

  ctx.restore();
}

// ----- Furniture ----------------------------------------------------

// Pretend code on a screen. Each desk gets its own lines, which scroll.
const CODE_COLORS = [NEON.cyan, NEON.pink, NEON.yellow, NEON.green, "#9b6bff"];
function codeLine(seed, i) {
  const n = Math.abs(Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1;
  return { indent: Math.floor(n * 3), len: 3 + Math.floor(n * 97) % 6, color: CODE_COLORS[Math.floor(n * 1000) % 5] };
}

function drawDesk(ctx, x, y, w, h, screenOn, time, seed) {
  const big = w > 30;
  // Shadow, legs and outline
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x - 1, y + h + 1.5, w + 2, 2.5);
  ctx.fillStyle = NEON.dark;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 3.5);
  ctx.fillRect(x + 1, y + h + 2, 2.5, 2); ctx.fillRect(x + w - 3.5, y + h + 2, 2.5, 2);
  // Desk top with a shiny edge, and the front of the desk
  ctx.fillStyle = NEON.desk; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#5d4590"; ctx.fillRect(x, y, w, 0.5); ctx.fillRect(x, y, 0.5, h);
  ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fillRect(x + 2, y + h / 2, w - 4, 0.5);
  ctx.fillStyle = NEON.deskEdge; ctx.fillRect(x, y + h, w, 1.5);
  ctx.fillStyle = "#3a2960"; ctx.fillRect(x, y + h, w, 0.5);

  // The monitor, seen from the back: whoever works here sits behind
  // the desk, looking at the screen. When it's on, colored light from
  // the code on the screen spills around its edges and onto their face.
  const mx = x + Math.floor(w / 2) - 7;
  ctx.fillStyle = NEON.dark; ctx.fillRect(mx - 0.5, y - 6.5, 15, 9.5);
  ctx.fillStyle = "#2a1f45"; ctx.fillRect(mx, y - 6, 14, 8.5);
  ctx.fillStyle = "#4a3a78"; ctx.fillRect(mx, y - 6, 14, 0.5); ctx.fillRect(mx, y - 6, 0.5, 8.5);
  ctx.fillStyle = "#1f1636"; ctx.fillRect(mx + 12.5, y - 5.5, 1.5, 8);
  ctx.fillRect(mx + 3, y - 4, 8, 0.5); ctx.fillRect(mx + 3, y - 3, 8, 0.5);   // air vents
  ctx.fillStyle = "#5d4590"; ctx.fillRect(mx + 6.5, y - 1, 1, 1);               // logo
  ctx.fillStyle = "#9b8cc8"; ctx.fillRect(mx + 15.5, y + 1, 1.5, 2);           // mouse
  if (screenOn) {
    const glowColor = codeLine(seed || 0, Math.floor(time * 2.5)).color;
    ctx.fillStyle = glowColor;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(mx - 0.5, y - 7, 15, 0.5);
    ctx.fillRect(mx - 1, y - 6.5, 0.5, 6); ctx.fillRect(mx + 14.5, y - 6.5, 0.5, 6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = NEON.green; ctx.fillRect(mx + 11.5, y + 1, 0.5, 0.5);      // power light
    addGlow(mx + 7, y - 9, 14, NEON.cyan, 0.16);
    addGlow(mx + 7, y - 9, 10, glowColor, 0.14);
  }

  // The big desk also has a coffee mug and a sticky note
  if (big) {
    ctx.fillStyle = NEON.dark; ctx.fillRect(x + w - 6.5, y + 2.5, 4.5, 4.5);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x + w - 6, y + 3, 3, 3.5);
    ctx.fillStyle = NEON.pink; ctx.fillRect(x + w - 6, y + 4.5, 3, 0.5);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x + w - 3, y + 3.5, 0.5, 2);
    ctx.fillStyle = NEON.yellow; ctx.fillRect(x + 2.5, y + 3, 4, 4);
    ctx.fillStyle = "#c9a21f"; ctx.fillRect(x + 3, y + 4, 3, 0.5); ctx.fillRect(x + 3, y + 5.5, 2, 0.5);
  }
}

function drawEmptyDeskSpot(ctx, x, y) {
  ctx.strokeStyle = "rgba(46,230,255,0.4)";
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 1.5]);
  ctx.strokeRect(x + 0.25, y + 0.25, DESK_W - 0.5, DESK_H - 0.5);
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  ctx.fillStyle = "rgba(46,230,255,0.55)";
  ctx.fillRect(x + DESK_W / 2 - 2.5, y + DESK_H / 2 - 0.5, 5, 1);
  ctx.fillRect(x + DESK_W / 2 - 0.5, y + DESK_H / 2 - 2.5, 1, 5);
}

// A small yellow lightning bolt: "you can speed this up!"
function drawBolt(ctx, x, y, time) {
  const on = Math.floor(time * 3) % 2 === 0;
  ctx.fillStyle = NEON.dark;
  ctx.fillRect(x - 1, y - 1, 7, 11);
  const rows = [[2, 0, 3], [1, 1, 3], [1, 2, 2], [0, 3, 5], [2, 4, 2], [2, 5, 2], [1, 6, 2], [1, 7, 1]];
  ctx.fillStyle = on ? NEON.yellow : "#fff3a0";
  for (const r of rows) ctx.fillRect(x + r[0], y + r[1], r[2], 1);
  ctx.fillStyle = "#fff8d0";
  ctx.fillRect(x + 2.5, y + 0.5, 1, 0.5); ctx.fillRect(x + 1.5, y + 1.5, 1, 1); ctx.fillRect(x + 0.5, y + 3.5, 1, 0.5);
  addGlow(x + 2.5, y + 4, 9, NEON.yellow, on ? 0.35 : 0.2);
}

function drawPlant(ctx, x, y, time) {
  const s = Math.round(Math.sin(time * 1.4 + x) * 1) / 2;   // leaves sway a little
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x - 5.5, y - 0.5, 11, 2);
  // Pot with a rim, light on the left and shadow on the right
  ctx.fillStyle = NEON.dark; ctx.fillRect(x - 4.5, y - 7, 9, 7.5); ctx.fillRect(x - 5.5, y - 8.5, 11, 2.5);
  ctx.fillStyle = "#6b3fa0"; ctx.fillRect(x - 4, y - 6.5, 8, 6.5);
  ctx.fillStyle = "#8d5cc9"; ctx.fillRect(x - 3.5, y - 6, 1.5, 5.5); ctx.fillRect(x - 5, y - 8, 10, 1.5);
  ctx.fillStyle = "#4e2b78"; ctx.fillRect(x + 2, y - 6, 1.5, 5.5);
  // Leaves: dark at the back, bright at the front
  const leaves = [
    ["#167d5c", [[-6.5, -13, 3.5, 5], [3, -14, 3.5, 6], [-2, -18, 4, 10], [-4.5, -16, 2.5, 4], [2, -17, 2.5, 4]]],
    ["#2bd99b", [[-6, -12.5, 2.5, 4], [3.5, -13.5, 2.5, 5], [-1.5, -17.5, 3, 8.5], [-4, -15.5, 1.5, 3], [2, -16.5, 1.5, 3]]],
    ["#9dffd8", [[-5.5, -12, 1, 1.5], [4, -13, 1, 2], [-1, -17, 1, 3], [0.5, -14, 0.5, 2]]],
  ];
  for (const [color, rects] of leaves) {
    ctx.fillStyle = color;
    for (const r of rects) ctx.fillRect(x + r[0] + (r[1] < -14 ? s : 0), y + r[1], r[2], r[3]);
  }
}

function drawCoffeeMachine(ctx, X, Y, time) {
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(X - 1, Y + 16, 15, 2);
  ctx.fillStyle = NEON.dark; ctx.fillRect(X - 0.5, Y - 0.5, 14, 17);
  ctx.fillStyle = "#c9c2e0"; ctx.fillRect(X, Y, 13, 16);
  ctx.fillStyle = "#ece8f8"; ctx.fillRect(X, Y, 13, 1); ctx.fillRect(X, Y, 1, 16);
  ctx.fillStyle = "#9c93bd"; ctx.fillRect(X + 10.5, Y + 1, 2.5, 15);
  // Little pink screen
  ctx.fillStyle = NEON.dark; ctx.fillRect(X + 2, Y + 2, 7, 3);
  ctx.fillStyle = NEON.pink; ctx.globalAlpha = 0.75 + Math.sin(time * 3) * 0.25;
  ctx.fillRect(X + 2.5, Y + 2.5, 6, 2); ctx.globalAlpha = 1;
  addGlow(X + 5.5, Y + 3.5, 10, NEON.pink, 0.3);
  // Where the coffee comes out, and a cup
  ctx.fillStyle = "#2a1f45"; ctx.fillRect(X + 2.5, Y + 7, 7, 7);
  ctx.fillStyle = "#6c6390"; ctx.fillRect(X + 5, Y + 7, 2, 1.5);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(X + 4, Y + 10.5, 4, 3.5); ctx.fillRect(X + 8, Y + 11, 1, 2);
  ctx.fillStyle = NEON.pink; ctx.fillRect(X + 4, Y + 11.5, 4, 0.5);
  // Steam curling up from the cup
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 3; i++) {
    const k = (time * 0.7 + i / 3) % 1;
    ctx.globalAlpha = (1 - k) * 0.5;
    ctx.fillRect(Math.round((X + 6 + Math.sin((time + i) * 3)) * 2) / 2, Math.round((Y + 10 - k * 9) * 2) / 2, 0.5, 0.5);
  }
  ctx.globalAlpha = 1;
}

// A glowing neon sign: a colored tube with a bright white-hot middle.
function drawNeonSign(ctx, cx, text, color, time, highlight) {
  ctx.font = "8px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = Math.ceil(ctx.measureText(text).width) + 8;
  const x = Math.round(cx - w / 2);
  const glow = (6 + Math.sin(time * 2 + cx) * 2 + (highlight ? 6 : 0)) * RES;
  ctx.fillStyle = "rgba(11,6,24,0.8)";
  ctx.fillRect(x, 5.5, w + 1, 14);
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.strokeStyle = color;
  ctx.strokeRect(x + 0.5, 5.5, w, 14);
  ctx.fillStyle = color;
  ctx.fillText(text, Math.round(cx) + 1, 13);
  ctx.restore();
  // The bright middle of the tubes
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = shade(color, 0.6);
  ctx.strokeRect(x + 0.5, 5.5, w, 14);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = shade(color, 0.65);
  ctx.fillText(text, Math.round(cx) + 1, 13);
  ctx.globalAlpha = 1;
  addGlow(cx, 13, w * 0.7, color, highlight ? 0.3 : 0.16);
  addGlow(cx, WALL_H + 4, 36, color, highlight ? 0.14 : 0.07);
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
    this.world.width = WORLD_W * RES;
    this.world.height = WORLD_H * RES;
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
  setFolded(folded) {
    this.folded = folded;
    this.canvas.width = (folded ? FOLD_W : WORLD_W) * RES;
    this.canvas.height = (folded ? FOLD_H : WORLD_H) * RES;
    this.screen = this.canvas.getContext("2d");
    this.screen.imageSmoothingEnabled = false;
  },

  // Copies the drawn office onto the canvas you see.
  show() {
    const g = this.screen;
    if (!this.folded) { g.drawImage(this.world, 0, 0); return; }
    const R = RES;
    g.fillStyle = NEON.dark;
    g.fillRect(0, 0, FOLD_W * R, FOLD_H * R);
    // Top floor: the first 3 sections
    g.drawImage(this.world, 0, 0, FOLD_W * R, WORLD_H * R, 0, 0, FOLD_W * R, WORLD_H * R);
    // Bottom floor: the last 2 sections, in the middle
    const w2 = (WORLD_W - FOLD_W) * R;
    g.drawImage(this.world, FOLD_W * R, 0, w2, WORLD_H * R, FOLD_X2 * R, (WORLD_H + FOLD_GAP) * R, w2, WORLD_H * R);
  },

  // Turns a mouse or finger position on screen into a position in the office.
  toWorld(e) {
    const r = this.canvas.getBoundingClientRect();
    // First: where on the canvas, in office pixels
    const x = (e.clientX - r.left) / r.width * (this.folded ? FOLD_W : WORLD_W);
    const y = (e.clientY - r.top) / r.height * (this.folded ? FOLD_H : WORLD_H);
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
    const longScale = Math.min(roomW / WORLD_W, roomH / WORLD_H);
    const foldScale = Math.min(roomW / FOLD_W, roomH / FOLD_H);
    const fold = foldScale > longScale * 1.2;
    if (fold !== this.folded) this.setFolded(fold);
    const s = fold ? foldScale : longScale;
    this.canvas.style.width = Math.floor((fold ? FOLD_W : WORLD_W) * s) + "px";
    this.canvas.style.height = Math.floor((fold ? FOLD_H : WORLD_H) * s) + "px";
  },

  sectionX(stepId) {
    return CONFIG.steps.findIndex(s => s.id === stepId) * SECTION_W;
  },

  // Where someone stands to work at the big station of a section.
  stationSpot(stepId) {
    return { x: this.sectionX(stepId) + STATION.x + STATION.w / 2, y: STATION.y + 2 };
  },

  deskSpot(stepId, index) {
    const d = DESK_SPOTS[index];
    return { x: this.sectionX(stepId) + d.x + DESK_W / 2, y: d.y + 2 };
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
        if (Math.abs(dx) > 0.5) w.dir = dx > 0 ? 1 : -1;
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
        color: [NEON.pink, NEON.cyan, "#ffd23f", "#9b6bff"][i % 4], life: 4, spin: Math.random() * 6,
      });
    }
  },

  // ----- Draw one frame ---------------------------------------------
  draw(state, dt) {
    this.time += dt;
    const ctx = this.ctx;
    const t = this.time;
    this.updatePeople(state, dt);

    // Everything below is laid out in office pixels. This makes each
    // office pixel 2 x 2 real pixels, so 0.5 is one tiny hi-bit pixel.
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    GLOWS = [];

    // Floor tiles in a soft checker pattern, each with a shiny top-left
    // edge and a shadowy bottom-right edge
    ctx.fillStyle = NEON.floor;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.fillStyle = NEON.floor2;
    for (let y = WALL_H; y < WORLD_H; y += 16) {
      for (let x = ((y / 16) % 2) * 16; x < WORLD_W; x += 32) ctx.fillRect(x, y, 16, 16);
    }
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    for (let y = WALL_H; y < WORLD_H; y += 16) ctx.fillRect(0, y, WORLD_W, 0.5);
    for (let x = 0; x < WORLD_W; x += 16) ctx.fillRect(x, WALL_H, 0.5, WORLD_H - WALL_H);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    for (let y = WALL_H + 15.5; y < WORLD_H; y += 16) ctx.fillRect(0, y, WORLD_W, 0.5);
    for (let x = 15.5; x < WORLD_W; x += 16) ctx.fillRect(x, WALL_H, 0.5, WORLD_H - WALL_H);

    // The wall, a little lighter at the bottom, with panels
    const wallGrad = ctx.createLinearGradient(0, 0, 0, WALL_H);
    wallGrad.addColorStop(0, "#090414");
    wallGrad.addColorStop(1, "#171030");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, WORLD_W, WALL_H);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    for (let x = 12; x < WORLD_W; x += 24) ctx.fillRect(x, 2, 0.5, WALL_H - 5);
    // The neon strip along the bottom of the wall
    ctx.fillStyle = NEON.pink;
    ctx.globalAlpha = 0.85 + Math.sin(t * 3) * 0.1;
    ctx.fillRect(0, WALL_H - 2, WORLD_W, 2);
    ctx.fillStyle = "#ffc2e2";
    ctx.fillRect(0, WALL_H - 1.5, WORLD_W, 0.5);
    ctx.globalAlpha = 1;
    // Its pink light spilling onto the floor
    const spill = ctx.createLinearGradient(0, WALL_H, 0, WALL_H + 12);
    spill.addColorStop(0, "rgba(255,62,165,0.16)");
    spill.addColorStop(1, "rgba(255,62,165,0)");
    ctx.fillStyle = spill;
    ctx.fillRect(0, WALL_H, WORLD_W, 12);

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
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        for (let y = WALL_H + 4; y < WORLD_H; y += 8) ctx.fillRect(x0 - 0.25, y, 0.5, 4);
      }
      const label = step.id === "preprod" ? "PRE-PROD" : step.name.toUpperCase();
      drawNeonSign(ctx, x0 + SECTION_W / 2, label, color, t, hover);
    });

    // Plants and the coffee machine
    drawPlant(ctx, 8, WORLD_H - 6, t);
    drawPlant(ctx, WORLD_W - 8, WORLD_H - 6, t);
    if (state.supplies.coffee > 0) drawCoffeeMachine(ctx, WORLD_W - 17, WALL_H + 2, t);

    // Collect everything that needs drawing, sorted by height on screen,
    // so things lower down are drawn in front.
    const drawList = [];
    CONFIG.steps.forEach(step => {
      const x0 = this.sectionX(step.id);
      const busy = state.projects.some(p => CONFIG.steps[p.step].id === step.id && p.worker === "you");
      drawList.push({ y: STATION.y + 3, fn: () => drawDesk(ctx, x0 + STATION.x, STATION.y, STATION.w, STATION.h, busy, t, x0 + 7) });
      for (let d = 0; d < allowed; d++) {
        const spot = DESK_SPOTS[d];
        if (d < state.desks[step.id]) {
          const hire = hiresIn(state, step.id)[d];
          const on = hire && hireIsBusy(state, hire.id);
          drawList.push({ y: spot.y + 3, fn: () => drawDesk(ctx, x0 + spot.x, spot.y, DESK_W, DESK_H, on, t + d * 0.37, x0 + d * 13) });
        } else {
          drawList.push({ y: spot.y - 100, fn: () => drawEmptyDeskSpot(ctx, x0 + spot.x, spot.y) });
        }
      }
    });
    const cheering = this.time < this.cheerUntil;
    for (const id in this.people) {
      const w = this.people[id];
      if (!w.look) continue;
      drawList.push({ y: w.y, fn: () => {
        drawPerson(ctx, w.x, w.y, w.look, { walking: w.walking, phase: w.phase + (cheering ? t : 0), cheer: cheering, typing: w.working && !w.walking, seed: w.seed, dir: w.dir, time: t });
        if (id === "you") {
          // A small glowing arrow over your own head so you can find yourself
          const ax = Math.round(w.x * 2) / 2, ay = Math.round(w.y) - 29 + Math.round(Math.sin(t * 4));
          ctx.fillStyle = NEON.dark; ctx.fillRect(ax - 3.5, ay - 0.5, 7, 2.5); ctx.fillRect(ax - 2, ay + 2, 4, 1.5); ctx.fillRect(ax - 1, ay + 3.5, 2, 1);
          ctx.fillStyle = NEON.pink; ctx.fillRect(ax - 3, ay, 6, 1.5); ctx.fillRect(ax - 1.5, ay + 1.5, 3, 1.5); ctx.fillRect(ax - 0.5, ay + 3, 1, 1);
          ctx.fillStyle = "#ffc2e2"; ctx.fillRect(ax - 2.5, ay, 3, 0.5);
          addGlow(ax, ay + 1.5, 8, NEON.pink, 0.3);
        }
      } });
    }
    drawList.sort((a, b) => a.y - b.y);
    for (const item of drawList) item.fn();

    this.drawLights(ctx);

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
        ctx.fillStyle = NEON.dark; ctx.fillRect(bx - 0.5, by - 1, 19, 5); ctx.fillRect(bx - 1, by - 0.5, 20, 4);
        ctx.fillStyle = "#3a2c5c"; ctx.fillRect(bx, by, 18, 3);
        ctx.fillStyle = "#2a1f45"; ctx.fillRect(bx, by, 18, 0.5);
        const fill = Math.round(36 * done) / 2;
        ctx.globalAlpha = id === p.worker ? 1 : 0.6;
        ctx.fillStyle = color; ctx.fillRect(bx, by, fill, 3);
        ctx.fillStyle = shade(color, 0.5); ctx.fillRect(bx, by, fill, 0.5);
        ctx.fillStyle = shade(color, -0.3); ctx.fillRect(bx, by + 2.5, fill, 0.5);
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
        const my = STATION.y - 22 + bob;
        ctx.fillStyle = NEON.dark; ctx.fillRect(s.x - 5, my + 0.5, 11, 12); ctx.fillRect(s.x - 4.5, my, 10, 13);
        ctx.fillStyle = "#ffd23f"; ctx.fillRect(s.x - 4, my + 1, 9, 11);
        ctx.fillStyle = "#fff3a0"; ctx.fillRect(s.x - 4, my + 1, 9, 1); ctx.fillRect(s.x - 4, my + 1, 1, 10);
        ctx.fillStyle = "#c9a21f"; ctx.fillRect(s.x - 4, my + 11, 9, 1);
        ctx.fillStyle = NEON.dark; ctx.fillRect(s.x - 1, my + 3, 3, 5); ctx.fillRect(s.x - 1, my + 9, 3, 2);
        addGlow(s.x + 0.5, my + 6.5, 14, NEON.yellow, 0.3);
      }
    }

    this.drawLights(ctx);   // the glow of the bolts and "!" signs

    // Confetti
    this.confetti = this.confetti.filter(c => (c.life -= dt) > 0 && c.y < WORLD_H + 5);
    for (const c of this.confetti) {
      c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= 0.99;
      ctx.fillStyle = c.color;
      const flat = Math.floor(c.spin + this.time * 6) % 3;   // confetti spins as it falls
      ctx.fillRect(Math.round(c.x * 2) / 2, Math.round(c.y * 2) / 2, flat === 0 ? 0.5 : 2, flat === 2 ? 0.5 : 2);
    }

    // A soft shadow along the bottom of the room
    const low = ctx.createLinearGradient(0, WORLD_H - 40, 0, WORLD_H);
    low.addColorStop(0, "rgba(0,0,0,0)");
    low.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = low;
    ctx.fillRect(0, WORLD_H - 40, WORLD_W, 40);

    this.show();
  },

  // Every light on the list shines at once, adding a soft colored glow.
  drawLights(ctx) {
    ctx.globalCompositeOperation = "lighter";
    for (const g of GLOWS) {
      const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
      grad.addColorStop(0, rgba(g.color, g.a));
      grad.addColorStop(1, rgba(g.color, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    GLOWS = [];
  },
};

// Draws a big preview of a character (used on the character screen).
function drawPreview(canvas, look) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  canvas.width = 32 * RES; canvas.height = 32 * RES;
  ctx.setTransform(RES, 0, 0, RES, 0, 0);
  ctx.fillStyle = NEON.floor; ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = NEON.floor2; ctx.fillRect(0, 0, 16, 16); ctx.fillRect(16, 16, 16, 16);
  drawPerson(ctx, 16, 28, look, { phase: performance.now() / 1000 });
}

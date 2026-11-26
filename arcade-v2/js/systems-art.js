// =====================================================================
//  PIXEL EMPIRE ARCADE - ART FOR THE BIG SYSTEMS
//  ---------------------------------------------------------------------
//  The Front Counter, the coin box on top of it, the Mechanics, the
//  robot mascot, and the looks you win on the Fame Road (floors, sign
//  colors, hats). Like the rest of the art, it's all tiny rectangles.
// =====================================================================

// Is a look you won switched on?
function lookOn(state, key) { return !!(state && state.looks && state.looks[key] === true); }

// The floor's two colors (the Fame Road can give you new floors).
const FLOORS = {
  floorCheck: ["#24123f", "#0f1d3a"],
  floorStars: ["#090616", "#0d0a20"],
  floorLava: ["#2a0f2a", "#341230"],
};
function floorColor(state, x, y) {
  for (const k in FLOORS) if (lookOn(state, k)) return FLOORS[k][(x + y) % 2];
  return (x + y) % 2 ? NEON.floor : NEON.floor2;
}
// Extra sparkle for the fancy floors.
function floorExtra(ctx, state, x, y, time) {
  if (lookOn(state, "floorStars")) {
    const h = ((x * 92821) ^ (y * 68917)) >>> 0;
    if (h % 3 === 0) px(ctx, x * T + (h % 13) + 1, y * T + ((h >> 4) % 13) + 1, 1, 1, Math.floor(time * 2 + h) % 4 ? "#ffffff" : NEON.cyan);
  } else if (lookOn(state, "floorLava")) {
    const k = Math.sin(time * 0.8 + x * 0.7 + y * 0.5);
    if (k > 0.6) px(ctx, x * T + 5, y * T + 5, 6, 6, "rgba(255,62,165,0.18)");
  }
}

// The sign out front: its color changes with Fame Road looks.
function signStyle(state, time) {
  if (lookOn(state, "signRainbow")) {
    const c = ["#ff3ea5", "#ffd23f", "#7cff6b", "#2ee6ff", "#b18cff"][Math.floor(time * 2) % 5];
    return { color: c, glow: c };
  }
  if (lookOn(state, "signCyan")) return { color: "#9ff4ff", glow: "#2ee6ff" };
  return { color: "#ff8fcb", glow: "#ff3ea5" };
}

// Hats and glasses you won (drawn on top of you).
function drawHat(ctx, x, y, state, back) {
  x = Math.round(x); y = Math.round(y);
  if (lookOn(state, "crown")) {
    px(ctx, x - 5, y - 24, 10, 3, NEON.yellow);
    px(ctx, x - 5, y - 26, 2, 2, NEON.yellow); px(ctx, x - 1, y - 27, 2, 3, NEON.yellow); px(ctx, x + 3, y - 26, 2, 2, NEON.yellow);
    px(ctx, x - 1, y - 23, 2, 1, NEON.pink);
  } else if (lookOn(state, "cap")) {
    px(ctx, x - 6, y - 22, 12, 4, NEON.cyan);
    px(ctx, x - 6, y - 22, 12, 1, "#9ff4ff");
    if (!back) px(ctx, x - 1, y - 19, 9, 2, NEON.pink);
  }
  if (lookOn(state, "shades") && !back) {
    px(ctx, x - 5, y - 14, 4, 3, NEON.dark); px(ctx, x + 1, y - 14, 4, 3, NEON.dark); px(ctx, x - 1, y - 14, 2, 1, NEON.dark);
    px(ctx, x - 4, y - 14, 1, 1, NEON.yellow); px(ctx, x + 2, y - 14, 1, 1, NEON.yellow);
  }
}

// ----- The Front Counter ---------------------------------------------

function counterLook(level) {
  if (level >= 10) return { top: "#ffe680", side: "#c99a1a", edge: "#fff3a0" };   // gold
  if (level >= 7) return { top: "#d6dcf0", side: "#7d879c", edge: "#ffffff" };    // chrome
  if (level >= 4) return { top: "#b07a4a", side: "#7a4a2a", edge: "#d9a06b" };    // wood
  return { top: "#6a4f9a", side: "#45306b", edge: "#9b7ad0" };                     // starter
}
function counterRect() { return { x: COUNTER.x * T, y: COUNTER.y * T, w: COUNTER.w * T, h: T }; }

function drawCounter(ctx, state, time) {
  const r = counterRect(), c = counterLook(state.counter || 1);
  px(ctx, r.x, r.y + 2, r.w, r.h - 2, NEON.dark);
  px(ctx, r.x + 1, r.y + 3, r.w - 2, 4, c.top);
  px(ctx, r.x + 1, r.y + 3, r.w - 2, 1, c.edge);
  px(ctx, r.x + 1, r.y + 7, r.w - 2, r.h - 8, c.side);
  px(ctx, r.x + 4, r.y + 10, 6, 3, NEON.dark); px(ctx, r.x + 5, r.y + 11, 4, 1, NEON.pink);   // a little screen
  // Level number lights
  const lv = state.counter || 1;
  for (let i = 0; i < 10; i++) px(ctx, r.x + 14 + (i % 5) * 3, r.y + 9 + Math.floor(i / 5) * 3, 2, 2, i < lv ? NEON.yellow : "#2a1f45");
  if (lv >= 10) {
    ctx.strokeStyle = "rgba(255,210,63," + (0.4 + Math.sin(time * 2) * 0.25) + ")";
    ctx.strokeRect(r.x - 0.5, r.y + 1.5, r.w + 1, r.h - 1);
  }
  // The coin box on top
  const bx = r.x + r.w - 12, by = r.y - 3;
  px(ctx, bx - 1, by - 1, 10, 7, NEON.dark);
  px(ctx, bx, by, 8, 5, "#7a4a2a");
  px(ctx, bx, by, 8, 1, "#a06a3a");
  if (state.coinBox > 0) {
    const hours = (state.boxAway || 0) / 3600;
    const coins = hours < 1 ? 2 : hours < 24 ? 5 : 9;
    const spots = [[1, -2], [4, -2], [2, -4], [6, -1], [5, -4], [0, -5], [3, -6], [7, -4], [4, -8]];
    for (let i = 0; i < coins; i++) px(ctx, bx + spots[i][0], by + spots[i][1], 2, 2, (Math.floor(time * 3) + i) % 5 ? NEON.yellow : "#fff3a0");
    if (coins >= 9 && Math.floor(time * 4) % 3 === 0) { px(ctx, bx - 2, by - 7, 1, 1, "#ffffff"); px(ctx, bx + 9, by - 3, 1, 1, "#ffffff"); }
  }
}

// ----- Mechanics --------------------------------------------------------

const MECH_LOOKS = [
  { hair: "#2b1d14", skin: "#d9a06b", shirt: "#ff7a3d", hairStyle: 0 },
  { hair: "#e8c15a", skin: "#ffe0c4", shirt: "#ff7a3d", hairStyle: 2 },
  { hair: "#8a5cff", skin: "#8d5a34", shirt: "#ff7a3d", hairStyle: 1 },
];
function drawMechanic(ctx, mech, state, time) {
  const look = Object.assign({}, MECH_LOOKS[mech.i % 3]);
  if (lookOn(state, "overalls")) look.shirt = mech.i % 2 ? NEON.cyan : NEON.pink;
  const working = mech.job && mech.arrived;
  drawPerson(ctx, mech.x, mech.y, look, { walking: mech.walking, phase: time + mech.i, seed: mech.i, playing: working, back: working });
  const x = Math.round(mech.x), y = Math.round(mech.y);
  // A yellow hard hat
  px(ctx, x - 6, y - 21, 12, 3, NEON.yellow); px(ctx, x - 7, y - 18, 14, 1, "#c99a1a");
  // The toolbox
  if (!working) { px(ctx, x + 4, y - 6, 5, 4, NEON.dark); px(ctx, x + 5, y - 5, 3, 2, "#d43a3a"); }
  else if (Math.floor(time * 6 + mech.i) % 2) px(ctx, x + 5, y - 12, 2, 4, NEON.metal);   // hammering
  // How far the job is: a little bar over their head (no numbers)
  if (working && mech.job.total > 0) {
    const part = Math.max(0, Math.min(1, 1 - mech.job.left / mech.job.total));
    px(ctx, x - 8, y - 27, 16, 4, NEON.dark);
    px(ctx, x - 7, y - 26, Math.max(1, Math.round(14 * part)), 2, "#ff7a3d");
  }
}

// ----- The robot mascot (a Fame Road reward) ----------------------------

function drawRobot(ctx, r, time) {
  const x = Math.round(r.x), y = Math.round(r.y), step = r.walking ? Math.floor(time * 6) % 2 : 0;
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x - 4, y, 8, 2);
  px(ctx, x - 3, y - 2 - step, 2, 2, NEON.metal); px(ctx, x + 1, y - 2 - (1 - step), 2, 2, NEON.metal);
  px(ctx, x - 5, y - 10, 10, 8, NEON.dark); px(ctx, x - 4, y - 9, 8, 6, "#c9d2e3");
  px(ctx, x - 2, y - 7, 4, 2, NEON.cyan);
  px(ctx, x - 4, y - 16, 8, 6, NEON.dark); px(ctx, x - 3, y - 15, 6, 4, "#c9d2e3");
  px(ctx, x - 2, y - 14, 1, 1, Math.floor(time * 2) % 5 ? NEON.pink : "#c9d2e3"); px(ctx, x + 1, y - 14, 1, 1, NEON.pink);
  px(ctx, x, y - 19, 1, 3, NEON.metal); px(ctx, x - 1, y - 20, 3, 1, Math.floor(time * 3) % 2 ? NEON.yellow : NEON.pink);
  if (r.wave) { const a = Math.floor(time * 8) % 2; px(ctx, x + 5, y - 13 - a, 2, 4, "#c9d2e3"); }
  else px(ctx, x + 5, y - 9, 2, 4, "#c9d2e3");
  px(ctx, x - 7, y - 9, 2, 4, "#c9d2e3");
}

// Everything above, added to the list of things the scene draws (sorted
// top to bottom, so people stand in front of or behind things correctly).
const SystemsArt = {
  things(ctx, state, time, labels) {
    const list = [];
    const r = counterRect();
    list.push({ y: r.y + r.h - 1, draw: () => drawCounter(ctx, state, time) });
    if (state.coinBox > 0 && state !== (typeof UI !== "undefined" && UI.demoState)) {
      // A coin bubble; the amount shows only when you're close.
      const p = state.player, near = Math.hypot(p.x - (r.x + r.w / 2), p.y - r.y) < 3.5 * T;
      if (near) labels.push({ kind: "pill", x: r.x + r.w - 8, y: r.y - 14, text: "$" + (typeof shortNumber === "function" ? shortNumber(state.coinBox) : Math.floor(state.coinBox)), color: "#ffd23f", top: true });
      else labels.push({ kind: "bubble", x: r.x + r.w - 8, y: r.y - 9 + Math.sin(time * 3) * 1.5, text: "", img: "coin", top: true });
    }
    const mechs = (typeof UI !== "undefined" && UI.mechs && state !== UI.demoState) ? UI.mechs : [];
    for (const m of mechs) {
      list.push({ y: m.y, draw: () => drawMechanic(ctx, m, state, time) });
    }
    if (lookOn(state, "robot") && typeof UI !== "undefined" && UI.robot && state !== UI.demoState) {
      const rb = UI.robot;
      list.push({ y: rb.y, draw: () => drawRobot(ctx, rb, time) });
    }
    return list;
  },
};

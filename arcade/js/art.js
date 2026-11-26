// =====================================================================
//  PIXEL EMPIRE ARCADE - PIXEL ART
//  ---------------------------------------------------------------------
//  Draws the arcade from the sky: the floor, walls, machines and all
//  the little people. Same neon 16-bit look as the studio game. Every
//  picture is made of tiny rectangles, so there are no image files.
// =====================================================================

const NEON = {
  pink: "#ff3ea5", cyan: "#2ee6ff", yellow: "#ffd23f", green: "#7cff6b", orange: "#ff7a3d", purple: "#b18cff",
  floor: "#1a0f2e", floor2: "#1e1236", wall: "#0f0820", wallTop: "#2a1a4a", dark: "#0b0618",
  body: "#45306b", bodyEdge: "#2d1f4a", metal: "#7a6aa8", glass: "rgba(46,230,255,0.25)",
};

function px(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

// ----- People (the same big-headed people as the studio game) ------

// (x, y) is where their feet touch the floor. opts.back = seen from behind.
function drawPerson(ctx, x, y, look, opts) {
  opts = opts || {};
  x = Math.round(x); y = Math.round(y);
  const step = opts.walking ? Math.floor(opts.phase * 6) % 2 : 0;
  const jump = opts.cheer ? Math.round(Math.abs(Math.sin(opts.phase * 8)) * 3) : 0;
  y -= jump;
  const p = (dx, dy, w, h, color) => px(ctx, x + dx, y + dy, w, h, color);

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x - 4, y + jump, 8, 2);
  p(-4, -2 - step, 3, 2, NEON.dark);
  p(1, -2 - (1 - step) * (opts.walking ? 1 : 0), 3, 2, NEON.dark);
  p(-4, -8, 8, 6, NEON.dark);
  p(-3, -7, 6, 5, look.shirt);
  if (opts.playing) {
    const t = Math.floor(opts.phase * 8) % 2;
    p(-5, -8 - t, 2, 3, look.skin); p(3, -8 - (1 - t), 2, 3, look.skin);
  } else if (opts.cheer) {
    p(-5, -12, 2, 5, look.skin); p(3, -12, 2, 5, look.skin);
  } else {
    p(-5, -7, 2, 4, look.skin); p(3, -7, 2, 4, look.skin);
  }
  p(-6, -19, 12, 12, NEON.dark);
  p(-5, -18, 10, 10, look.skin);
  const hs = look.hairStyle || 0;
  if (opts.back) {
    // Seen from behind: mostly hair
    p(-5, -18, 10, 8, look.hair);
    if (hs === 2) p(-5, -10, 10, 3, look.hair);
  } else {
    const blink = (Math.floor(opts.phase * 2 + (opts.seed || 0)) % 7) === 0;
    if (!blink) { p(-3, -13, 2, 2, NEON.dark); p(1, -13, 2, 2, NEON.dark); }
    else { p(-3, -12, 2, 1, NEON.dark); p(1, -12, 2, 1, NEON.dark); }
    p(-4, -11, 1, 1, "rgba(255,90,140,0.6)"); p(3, -11, 1, 1, "rgba(255,90,140,0.6)");
  }
  p(-6, -20, 12, 4, look.hair);
  if (hs === 0) { p(-6, -16, 2, 2, look.hair); p(4, -16, 2, 2, look.hair); }
  else if (hs === 1) { p(-5, -22, 2, 2, look.hair); p(-1, -23, 2, 3, look.hair); p(3, -22, 2, 2, look.hair); }
  else { p(-6, -16, 2, 8, look.hair); p(4, -16, 2, 8, look.hair); }
}

// A small speech bubble over someone's head.
function drawBubble(ctx, x, y, kind, time) {
  x = Math.round(x); y = Math.round(y);
  const bob = Math.round(Math.sin(time * 4) * 1);
  y += bob;
  px(ctx, x - 6, y - 10, 13, 10, NEON.dark);
  px(ctx, x - 5, y - 9, 11, 8, "#ffffff");
  px(ctx, x - 1, y - 1, 3, 2, "#ffffff");
  px(ctx, x, y + 1, 1, 1, "#ffffff");
  if (kind === "heart") {
    const c = NEON.pink;
    px(ctx, x - 3, y - 7, 2, 2, c); px(ctx, x + 1, y - 7, 2, 2, c);
    px(ctx, x - 3, y - 6, 6, 2, c); px(ctx, x - 2, y - 4, 4, 1, c); px(ctx, x - 1, y - 3, 2, 1, c);
  } else if (kind === "full") {
    px(ctx, x - 3, y - 6, 2, 2, NEON.metal); px(ctx, x, y - 6, 2, 2, NEON.metal); px(ctx, x + 3, y - 6, 2, 2, NEON.metal);
  } else {
    // A wish: a tiny picture of the machine they want
    const d = CONFIG.machines.find(m => m.id === kind);
    if (d) {
      px(ctx, x - 3, y - 8, 7, 6, d.color);
      px(ctx, x - 2, y - 7, 5, 3, NEON.dark);
      px(ctx, x - 1, y - 6, 3, 1, d.color);
    }
  }
}

// ----- Machines ------------------------------------------------------
// Each machine is drawn inside its box (x, y, w, h), front facing down.
// "on" is false when it's still being built or the power is out.

function screenColor(on, bug, time, color) {
  if (!on) return "#2a2145";
  if (bug) return Math.floor(time * 8) % 2 ? "#ff3b3b" : "#5a1020";
  return color;
}

const MachineArt = {
  cabinet(ctx, x, y, w, color, on, bug, time) {
    // A classic upright arcade cabinet: it sticks up above its square
    y -= 6;
    px(ctx, x - 1, y, w + 2, 22, NEON.dark);
    px(ctx, x, y + 1, w, 20, NEON.body);
    px(ctx, x, y + 1, w, 4, on ? color : "#3a2c5c");           // marquee (the lit-up sign)
    px(ctx, x + 1, y + 2, w - 2, 1, on ? "#ffffff" : "#4a3c6c");
    px(ctx, x + 2, y + 7, w - 4, 7, screenColor(on, bug, time, NEON.dark));
    if (on && !bug) {
      const f = Math.floor(time * 3) % 3;
      px(ctx, x + 3 + f, y + 8, 2, 1, color);
      px(ctx, x + w - 5 - f, y + 11, 2, 1, NEON.yellow);
      px(ctx, x + 5, y + 12, 2, 1, NEON.green);
    }
    px(ctx, x, y + 15, w, 3, NEON.metal);                      // controls
    px(ctx, x + 3, y + 15, 1, 2, NEON.dark); px(ctx, x + 2, y + 15, 3, 1, NEON.dark);
    px(ctx, x + w - 4, y + 16, 1, 1, NEON.pink); px(ctx, x + w - 3, y + 15, 1, 1, NEON.cyan);
    px(ctx, x + 1, y + 18, w - 2, 3, NEON.bodyEdge);
  },

  claw(ctx, r, d, on, bug, t) {
    const x = r.x + 2, y = r.y - 6;
    px(ctx, x - 1, y, 14, 22, NEON.dark);
    px(ctx, x, y + 1, 12, 20, d.color);
    px(ctx, x + 1, y + 2, 10, 2, on ? "#ffffff" : "#4a3c6c");
    px(ctx, x + 1, y + 5, 10, 10, screenColor(on, bug, t, "#1d3b5c"));
    // prizes
    [[2, 12, NEON.yellow], [4, 11, NEON.green], [6, 12, NEON.cyan], [8, 11, NEON.orange], [3, 10, NEON.purple]].forEach(([dx, dy, c]) => px(ctx, x + dx, y + dy, 2, 2, c));
    // the claw moves
    const cx = x + 2 + Math.round((Math.sin(t * (on ? 1.5 : 0)) + 1) * 3);
    px(ctx, cx, y + 5, 1, 3, NEON.metal); px(ctx, cx - 1, y + 8, 3, 1, NEON.metal); px(ctx, cx - 1, y + 9, 1, 1, NEON.metal); px(ctx, cx + 1, y + 9, 1, 1, NEON.metal);
    px(ctx, x + 1, y + 16, 10, 4, NEON.bodyEdge);
    px(ctx, x + 2, y + 17, 3, 2, NEON.dark);
    px(ctx, x + 8, y + 17, 1, 1, NEON.yellow);
  },
  shooter(ctx, r, d, on, bug, t) { this.cabinet(ctx, r.x + 2, r.y, 12, d.color, on, bug, t); },
  pinball(ctx, r, d, on, bug, t) {
    const x = r.x + 2, y = r.y;
    px(ctx, x - 1, y - 6, 14, 22, NEON.dark);
    px(ctx, x, y - 5, 12, 20, NEON.body);
    px(ctx, x + 1, y - 4, 10, 6, on ? d.color : "#3a2c5c");
    px(ctx, x + 2, y - 3, 8, 4, on ? (bug ? screenColor(on, bug, t) : "#14245a") : "#2a2145");
    px(ctx, x + 1, y + 4, 10, 9, screenColor(on, bug, t, "#14245a"));
    if (on) {
      [[3, 6], [7, 6], [5, 8]].forEach(([dx, dy], i) => px(ctx, x + dx, y + dy, 2, 2, Math.floor(t * 4 + i) % 3 ? NEON.pink : NEON.yellow));
      px(ctx, x + 2 + Math.round((Math.sin(t * 3) + 1) * 3.5), y + 5 + Math.round((Math.cos(t * 2.3) + 1) * 3), 1, 1, "#ffffff");
    }
    px(ctx, x + 2, y + 12, 3, 1, NEON.metal); px(ctx, x + 7, y + 12, 3, 1, NEON.metal);
  },
  whack(ctx, r, d, on, bug, t) {
    const x = r.x + 1, y = r.y + 2;
    px(ctx, x - 1, y, 16, 13, NEON.dark);
    px(ctx, x, y + 1, 14, 11, d.color);
    px(ctx, x + 1, y + 2, 12, 7, NEON.bodyEdge);
    [2, 6, 10].forEach((dx, i) => {
      px(ctx, x + dx, y + 4, 3, 2, NEON.dark);
      if (on && Math.floor(t * 2 + i * 1.7) % 3 === 0) { px(ctx, x + dx, y + 3, 3, 2, "#a0522d"); px(ctx, x + dx + 1, y + 3, 1, 1, NEON.dark); }
    });
    px(ctx, x + 2, y + 10, 10, 1, screenColor(on, bug, t, NEON.yellow));
  },
  punch(ctx, r, d, on, bug, t) {
    const x = r.x + 8, y = r.y;
    px(ctx, x - 6, y + 11, 12, 4, NEON.dark);
    px(ctx, x - 5, y + 12, 10, 2, NEON.body);
    px(ctx, x - 1, y - 6, 3, 18, NEON.metal);
    px(ctx, x - 6, y - 7, 12, 6, NEON.dark);                       // score sign
    px(ctx, x - 5, y - 6, 10, 4, screenColor(on, bug, t, d.color));
    if (on && !bug) px(ctx, x - 3, y - 5, 6, 2, NEON.dark);
    const swing = on ? Math.round(Math.sin(t * 5) * 1.5) : 0;
    px(ctx, x - 3 + swing, y + 1, 6, 8, NEON.dark);
    px(ctx, x - 2 + swing, y + 2, 4, 6, "#d43a3a");
    px(ctx, x - 1 + swing, y + 2, 1, 5, "#ff6b6b");
  },
  hockey(ctx, r, d, on, bug, t) {
    const x = r.x + 1, y = r.y + 2, w = r.w - 2;
    px(ctx, x - 1, y - 1, w + 2, 14, NEON.dark);
    px(ctx, x, y, w, 12, "#d8f6ff");
    px(ctx, x + 1, y + 1, w - 2, 10, screenColor(on, bug, t, "#bfefff"));
    px(ctx, x + w / 2, y + 1, 1, 10, d.color);
    px(ctx, x, y + 4, 1, 4, NEON.pink); px(ctx, x + w - 1, y + 4, 1, 4, NEON.pink);
    if (on) px(ctx, x + 3 + Math.round((Math.sin(t * 2.5) + 1) * (w - 8) / 2), y + 5 + Math.round(Math.sin(t * 4) * 2), 2, 2, NEON.dark);
  },
  hoops(ctx, r, d, on, bug, t) {
    for (let i = 0; i < 2; i++) {
      const x = r.x + i * 16 + 1, y = r.y;
      px(ctx, x, y, 14, 16, NEON.dark);
      px(ctx, x + 1, y + 1, 12, 14, NEON.body);
      px(ctx, x + 2, y - 7, 10, 9, NEON.dark);
      px(ctx, x + 3, y - 6, 8, 7, "#ffffff");
      px(ctx, x + 5, y - 4, 4, 3, d.color);
      px(ctx, x + 5, y + 6, 4, 1, d.color);
      px(ctx, x + 2, y + 9, 10, 5, NEON.bodyEdge);
      if (on) px(ctx, x + 5 + (i ? 1 : 0), y + 4 + Math.round(Math.abs(Math.sin(t * 3 + i)) * 7), 2, 2, NEON.orange);
      px(ctx, x + 2, y + 14, 10, 1, screenColor(on, bug, t, d.color));
    }
  },
  fighter(ctx, r, d, on, bug, t) {
    this.cabinet(ctx, r.x + 2, r.y, 12, d.color, on, bug, t);
    this.cabinet(ctx, r.x + 18, r.y, 12, NEON.pink, on, bug, t);
  },
  dance(ctx, r, d, on, bug, t) {
    px(ctx, r.x + 2, r.y, r.w - 4, 5, NEON.dark);
    px(ctx, r.x + 4, r.y + 1, r.w - 8, 3, screenColor(on, bug, t, d.color));
    for (let i = 0; i < 2; i++) {
      const x = r.x + i * 16 + 2, y = r.y + 5;
      px(ctx, x, y, 12, 11, NEON.dark);
      px(ctx, x + 1, y + 1, 10, 9, NEON.body);
      const beat = Math.floor(t * 3) % 4;
      [[4, 1], [1, 4], [7, 4], [4, 7]].forEach(([dx, dy], k) => px(ctx, x + dx, y + dy, 3, 2, on && k === (beat + i) % 4 ? NEON.yellow : NEON.cyan));
    }
  },
  skee(ctx, r, d, on, bug, t) {
    for (let i = 0; i < 4; i++) {
      const x = r.x + i * 16 + 2, y = r.y;
      px(ctx, x, y, 12, 16, NEON.dark);
      px(ctx, x + 1, y + 1, 10, 14, "#7a4a2a");
      px(ctx, x + 2, y + 1, 8, 5, NEON.bodyEdge);
      px(ctx, x + 4, y + 2, 4, 3, d.color); px(ctx, x + 5, y + 3, 2, 1, NEON.dark);
      px(ctx, x + 2, y + 7, 8, 7, "#a06a3a");
      if (on) px(ctx, x + 5, y + 13 - Math.round(((t * 1.2 + i * 0.3) % 1) * 7), 2, 2, "#ffffff");
      px(ctx, x + 2, y + 14, 8, 1, screenColor(on, bug, t, NEON.yellow));
    }
  },
  racing(ctx, r, d, on, bug, t) {
    for (let i = 0; i < 4; i++) {
      const x = r.x + i * 16 + 1, y = r.y;
      px(ctx, x, y - 5, 14, 12, NEON.dark);
      px(ctx, x + 1, y - 4, 12, 10, screenColor(on, bug, t, "#203060"));
      if (on && !bug) { px(ctx, x + 5, y - 3, 4, 9, "#555577"); px(ctx, x + 6, y - 3 + Math.floor(t * 6) % 8, 2, 1, "#ffffff"); px(ctx, x + 1, y - 4, 12, 2, "#3a2c8c"); }
      px(ctx, x + 3, y + 9, 8, 6, NEON.dark);
      px(ctx, x + 4, y + 10, 6, 4, d.color);
      px(ctx, x + 5, y + 8, 4, 1, NEON.metal);
    }
  },
  vr(ctx, r, d, on, bug, t) {
    for (let i = 0; i < 4; i++) {
      const x = r.x + (i % 2) * 16, y = r.y + Math.floor(i / 2) * 16;
      px(ctx, x + 1, y + 2, 14, 12, NEON.dark);
      px(ctx, x + 2, y + 3, 12, 10, NEON.body);
      const glow = on ? (bug ? screenColor(on, bug, t) : (Math.floor(t * 2 + i) % 2 ? d.color : NEON.cyan)) : "#3a2c5c";
      px(ctx, x + 3, y + 4, 10, 1, glow); px(ctx, x + 3, y + 11, 10, 1, glow);
      px(ctx, x + 3, y + 4, 1, 8, glow); px(ctx, x + 12, y + 4, 1, 8, glow);
      px(ctx, x + 6, y + 7, 4, 2, NEON.dark);
    }
  },
};

// A small red bug that crawls on a machine that caught a bug.
function drawBug(ctx, x, y, time) {
  x = Math.round(x + Math.sin(time * 3) * 3); y = Math.round(y);
  px(ctx, x - 3, y - 2, 7, 5, NEON.dark);
  px(ctx, x - 2, y - 1, 5, 3, "#ff3b3b");
  px(ctx, x, y - 1, 1, 3, NEON.dark);
  px(ctx, x - 1, y - 3, 3, 1, NEON.dark);
  if (Math.floor(time * 8) % 2) { px(ctx, x - 4, y, 1, 1, NEON.dark); px(ctx, x + 4, y, 1, 1, NEON.dark); }
}

// A small yellow lightning bolt (from the studio game): "you can speed this up!"
function drawBolt(ctx, x, y, time) {
  const on = Math.floor(time * 3) % 2 === 0;
  px(ctx, x - 1, y - 1, 7, 11, NEON.dark);
  ctx.fillStyle = on ? NEON.yellow : "#fff3a0";
  [[2, 0, 3], [1, 1, 3], [1, 2, 2], [0, 3, 5], [2, 4, 2], [2, 5, 2], [1, 6, 2], [1, 7, 1]].forEach(([dx, dy, w]) => ctx.fillRect(x + dx, y + dy, w, 1));
}

function drawMachine(ctx, state, m, time) {
  const r = machineRect(m), d = machineDef(m);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(r.x + 1, r.y + r.h - 2, r.w - 2, 3);
  if (m.status === "building") {
    // Being built: an outline, some boxes and a progress bar
    ctx.strokeStyle = d.color;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
    ctx.setLineDash([]);
    px(ctx, r.x + 4, r.y + r.h - 8, 6, 5, "#7a4a2a"); px(ctx, r.x + 5, r.y + r.h - 7, 4, 1, "#a06a3a");
    const done = 1 - m.buildLeft / d.build;
    px(ctx, r.x + 2, r.y + 2, r.w - 4, 3, NEON.dark);
    px(ctx, r.x + 2, r.y + 2, Math.max(1, Math.round((r.w - 4) * done)), 3, NEON.cyan);
    drawBolt(ctx, r.x + r.w - 7, r.y + 6, time);
    return;
  }
  const on = !state.outage;
  MachineArt[d.id](ctx, r, d, on, m.status === "bug", time + r.x * 0.01);
  if (m.status === "bug") drawBug(ctx, r.x + r.w / 2, r.y - 4, time + r.x);
}

// Faint dashed square for an empty machine spot.
function drawEmptySpot(ctx, x, y, bright) {
  ctx.strokeStyle = bright ? "rgba(46,230,255,0.9)" : "rgba(46,230,255,0.28)";
  ctx.setLineDash([2, 2]);
  ctx.strokeRect(x + 2.5, y + 2.5, T - 5, T - 5);
  ctx.setLineDash([]);
  ctx.fillStyle = bright ? "rgba(46,230,255,0.9)" : "rgba(46,230,255,0.4)";
  ctx.fillRect(x + 6, y + 8, 5, 1);
  ctx.fillRect(x + 8, y + 6, 1, 5);
}

// =====================================================================
//  THE WHOLE SCENE
// =====================================================================

const Art = {
  floats: [],    // "+$10" numbers that float up

  // Sprinkles of color on the arcade carpet (always the same pattern).
  carpet(ctx, x, y) {
    const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
    const colors = ["rgba(255,62,165,0.35)", "rgba(46,230,255,0.3)", "rgba(255,210,63,0.3)"];
    for (let i = 0; i < 3; i++) {
      const k = (h >> (i * 7)) & 127;
      px(ctx, x * T + (k % 14) + 1, y * T + ((k >> 3) % 14) + 1, 1, 1, colors[(h >> (i * 3 + 20)) % 3]);
    }
  },

  draw(ctx, state, view, target, time) {
    const map = state.map;
    ctx.fillStyle = NEON.dark;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.save();
    ctx.translate(-Math.round(view.x), -Math.round(view.y));

    const x0 = Math.max(0, Math.floor(view.x / T)), x1 = Math.min(MAP_W - 1, Math.floor((view.x + view.w) / T));
    const y0 = Math.max(0, Math.floor(view.y / T)), y1 = Math.min(MAP_H - 1, Math.floor((view.y + view.h) / T));

    // Floor, walls, sidewalk
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const tile = map.tiles[y][x];
      if (tile === 1) {
        px(ctx, x * T, y * T, T, T, (x + y) % 2 ? NEON.floor : NEON.floor2);
        this.carpet(ctx, x, y);
      } else if (tile === 2) {
        px(ctx, x * T, y * T, T, T, "#161226");
        if (y === SIDEWALK_Y + 1 && x % 2 === 0) px(ctx, x * T + 2, y * T + 10, 10, 1, "#3a3358");
      } else {
        const below = y + 1 < MAP_H ? map.tiles[y + 1][x] : 0;
        const room = roomAt(x, y);
        if (room >= 0) {
          // An empty lot you can buy later
          px(ctx, x * T, y * T, T, T, "#0d0819");
          if ((x + y) % 2) px(ctx, x * T + 7, y * T + 7, 2, 2, "#160f2a");
        } else if (below === 1) {
          // A wall seen from the front, with a neon stripe
          px(ctx, x * T, y * T, T, T, NEON.wall);
          px(ctx, x * T, y * T, T, 4, NEON.wallTop);
          px(ctx, x * T, y * T + T - 3, T, 1, (Math.floor(x / 11) % 2) ? NEON.cyan : NEON.pink);
        } else {
          px(ctx, x * T, y * T, T, T, NEON.wallTop);
          px(ctx, x * T + 1, y * T + 1, T - 2, T - 2, NEON.wall);
        }
      }
    }

    // The next room you can buy: a "FOR SALE" sign and doors with a $ on them
    if (state.rooms < 6) {
      const next = state.rooms, o = roomOrigin(next);
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.save();
      ctx.shadowColor = NEON.yellow; ctx.shadowBlur = 6 + Math.sin(time * 2) * 2;
      ctx.fillStyle = NEON.yellow;
      ctx.fillText("FOR SALE", (o.x + ROOM_W / 2) * T, (o.y + ROOM_H / 2) * T - 6);
      ctx.fillText("$" + fmt(nextRoomCost(state)), (o.x + ROOM_W / 2) * T, (o.y + ROOM_H / 2) * T + 8);
      ctx.restore();
      for (let j = 0; j < next; j++) if (roomsTouch(next, j)) for (const dd of doorsBetween(j, next)) {
        px(ctx, dd.x * T + 2, dd.y * T + 2, T - 4, T - 4, NEON.dark);
        px(ctx, dd.x * T + 3, dd.y * T + 3, T - 6, T - 6, "#5a3a1a");
        ctx.fillStyle = NEON.yellow; ctx.font = "8px 'Press Start 2P', monospace";
        ctx.fillText("$", dd.x * T + 8, dd.y * T + 9);
      }
    }

    // Front door mat and the arcade's neon sign on the street
    DOOR_X.forEach(x => px(ctx, x * T + 1, (SIDEWALK_Y - 1) * T + 4, T - 2, T - 6, "#3d1840"));
    ctx.save();
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = NEON.pink; ctx.shadowBlur = 6 + Math.sin(time * 2) * 2;
    ctx.fillStyle = NEON.pink;
    ctx.fillText(state.name.toUpperCase(), (DOOR_X[1]) * T, (SIDEWALK_Y + 1.6) * T);
    ctx.restore();

    // The fuse box
    const fx = FUSE.x * T, fy = FUSE.y * T;
    const fuseAlarm = state.outage && Math.floor(time * 3) % 2;
    px(ctx, fx + 3, fy + 2, 10, 11, NEON.dark);
    px(ctx, fx + 4, fy + 3, 8, 9, fuseAlarm ? "#ff3b3b" : "#55507a");
    drawBolt(ctx, fx + 6, fy + 4, state.outage ? time : 0);

    // Empty machine spots
    for (let room = 0; room < state.rooms; room++) {
      const taken = takenSpots(state, room), o = roomOrigin(room);
      for (let row = 0; row < 2; row++) for (let col = 0; col < SLOTS_PER_ROW; col++) {
        if (taken.has(row + "," + col)) continue;
        const bright = target && target.kind === "spot" && target.room === room && target.row === row && target.col === col;
        drawEmptySpot(ctx, (o.x + 1 + col) * T, (o.y + SLOT_ROWS[row]) * T, bright);
      }
    }

    // Machines and people, drawn from back to front
    const things = [];
    for (const m of state.machines) { const r = machineRect(m); things.push({ y: r.y + r.h - 1, draw: () => drawMachine(ctx, state, m, time) }); }
    for (const c of state.customers) things.push({ y: c.y, draw: () => {
      drawPerson(ctx, c.x, c.y, c.look, { walking: c.walking, phase: c.phase, seed: c.phase, back: c.mode === "line" || c.mode === "play" || (c.walking && c.dir === "up"), playing: c.mode === "play" && !state.outage, cheer: c.bubble === "heart" });
      const bubble = c.bubble || (!c.gotWish && (c.mode === "walk" || c.mode === "wander") && c.walking ? c.wish : null);
      if (bubble) drawBubble(ctx, c.x, c.y - 22, bubble, time + c.phase);
    } });
    const p = state.player;
    things.push({ y: p.y, draw: () => {
      // A glowing ring under you, so you can find yourself
      const glow = 0.5 + Math.sin(time * 4) * 0.3;
      ctx.fillStyle = "rgba(255,210,63," + glow + ")";
      ctx.fillRect(Math.round(p.x) - 6, Math.round(p.y) - 1, 12, 1);
      ctx.fillRect(Math.round(p.x) - 5, Math.round(p.y) + 1, 10, 1);
      ctx.fillRect(Math.round(p.x) - 7, Math.round(p.y), 1, 1);
      ctx.fillRect(Math.round(p.x) + 6, Math.round(p.y), 1, 1);
      drawPerson(ctx, p.x, p.y, state.look, { walking: p.walking, phase: p.phase, back: p.dir === "up" });
      // A little arrow over your head
      const ay = Math.round(p.y - 28 + Math.sin(time * 5) * 1.5);
      px(ctx, p.x - 2, ay, 5, 1, NEON.yellow); px(ctx, p.x - 1, ay + 1, 3, 1, NEON.yellow); px(ctx, p.x, ay + 2, 1, 1, NEON.yellow);
    } });
    things.sort((a, b) => a.y - b.y);
    things.forEach(t => t.draw());

    // The thing you're about to use glows
    if (target && target.rect && target.kind !== "spot") {
      const r = target.rect;
      ctx.strokeStyle = "rgba(46,230,255," + (0.6 + Math.sin(time * 6) * 0.3) + ")";
      ctx.strokeRect(r.x - 0.5, r.y - 0.5, r.w + 1, r.h + 1);
    }

    // "+$10" numbers
    ctx.font = "10px VT323, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const f of this.floats) {
      ctx.globalAlpha = Math.max(0, 1 - f.age / 1.2);
      ctx.fillStyle = NEON.dark;
      ctx.fillText("+$" + fmt(f.amount), Math.round(f.x) + 1, Math.round(f.y - f.age * 12) + 1);
      ctx.fillStyle = NEON.yellow;
      ctx.fillText("+$" + fmt(f.amount), Math.round(f.x), Math.round(f.y - f.age * 12));
    }
    ctx.globalAlpha = 1;

    // Power outage: everything goes dark except the fuse box
    if (state.outage) {
      ctx.fillStyle = "rgba(0,0,8,0.6)";
      ctx.fillRect(view.x, view.y, view.w, view.h);
      if (fuseAlarm) {
        ctx.save(); ctx.shadowColor = "#ff3b3b"; ctx.shadowBlur = 12;
        px(ctx, fx + 4, fy + 3, 8, 9, "#ff3b3b"); ctx.restore();
      }
      drawBolt(ctx, fx + 6, fy + 4, time);
    }
    ctx.restore();
  },

  update(dt) {
    for (const f of this.floats) f.age += dt;
    this.floats = this.floats.filter(f => f.age < 1.2);
  },
};

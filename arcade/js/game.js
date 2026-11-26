// =====================================================================
//  PIXEL EMPIRE ARCADE - GAME RULES
//  ---------------------------------------------------------------------
//  The "brain" of the arcade: the floor plan, machines, customers,
//  money, bugs, power outages and saving. It does NOT draw anything
//  (that is art.js) or show buttons (that is ui.js).
//
//  Everything that gets saved is in one object called "state".
//  Customers are not saved: when you come back, new ones walk in.
// =====================================================================

// ----- Small helpers ------------------------------------------------

function byId(list, id) { return list.find(item => item.id === id); }
function pickRandom(list) { return list[Math.floor(Math.random() * list.length)]; }
function randBetween(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(randBetween(a, b + 1)); }

// Big prices get rounded to 2 nice digits, like 1,234 -> 1,200.
function niceNumber(n) {
  if (n < 100) return Math.round(n);
  const p = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / p) * p;
}

// The random name generator from the studio game: "Turbo Llama" etc.
function randomGameName() {
  const n = pickRandom(CONFIG.gameNouns);
  let n2 = pickRandom(CONFIG.gameNouns);
  while (n2 === n) n2 = pickRandom(CONFIG.gameNouns);
  return pickRandom(CONFIG.gameNamePatterns)
    .replace("{a}", pickRandom(CONFIG.gameAdjectives)).replace("{n2}", n2).replace("{n}", n);
}
function randomArcadeName() {
  return pickRandom(CONFIG.gameAdjectives) + " " + pickRandom(CONFIG.gameNouns) + " Arcade";
}
function randomLook() {
  return {
    hair: pickRandom(CONFIG.look.hair),
    skin: pickRandom(CONFIG.look.skin),
    shirt: pickRandom(CONFIG.look.shirt),
    hairStyle: Math.floor(Math.random() * 3),
  };
}

// =====================================================================
//  THE FLOOR PLAN
//  ---------------------------------------------------------------------
//  The arcade is a grid of squares ("tiles"), each 16 pixels.
//  There are 6 rooms: 3 on the bottom row (room 1 has the front door)
//  and 3 on the top row. Each room is 10 squares wide and 8 tall:
//
//    row 0   machines (against the top wall)
//    row 1-2 their lines
//    row 3   walkway
//    row 4   machines
//    row 5-6 their lines
//    row 7   walkway
//
//  The left and right columns are walkways too.
// =====================================================================

const T = 16;                      // pixels per square
const ROOM_W = 10, ROOM_H = 8;     // squares inside one room
const MAP_W = 34, MAP_H = 22;      // squares in the whole map
const SIDEWALK_Y = 19;             // the street outside starts here
const DOOR_X = [5, 6];             // the front door (in room 1's bottom wall)
const FUSE = { x: 9, y: 18 };      // the fuse box, on the wall by the door
const SLOT_ROWS = [0, 4];          // rows where machines go
const SLOTS_PER_ROW = 8;           // columns 1 to 8

function roomPos(i) { return i < 3 ? { c: i, r: 1 } : { c: i - 3, r: 0 }; }
function roomOrigin(i) { const p = roomPos(i); return { x: 1 + p.c * 11, y: 1 + p.r * 9 }; }
function roomsTouch(a, b) {
  const p = roomPos(a), q = roomPos(b);
  return (p.r === q.r && Math.abs(p.c - q.c) === 1) || (p.c === q.c && p.r !== q.r);
}
// The door squares between two rooms that touch, and the square to stand
// on (inside room "from") to use the door.
function doorsBetween(from, to) {
  const a = roomPos(from), b = roomPos(to), o = roomOrigin(from);
  if (a.r === b.r) {
    const x = b.c > a.c ? o.x + ROOM_W : o.x - 1;
    const sx = b.c > a.c ? o.x + ROOM_W - 1 : o.x;
    return [3, 7].map(dy => ({ x: x, y: o.y + dy, sx: sx, sy: o.y + dy }));
  }
  const y = b.r < a.r ? o.y - 1 : o.y + ROOM_H;
  const sy = b.r < a.r ? o.y : o.y + ROOM_H - 1;
  return [0, ROOM_W - 1].map(dx => ({ x: o.x + dx, y: y, sx: o.x + dx, sy: sy }));
}

// Which room a square is in (-1 = none).
function roomAt(tx, ty) {
  for (let i = 0; i < 6; i++) {
    const o = roomOrigin(i);
    if (tx >= o.x && tx < o.x + ROOM_W && ty >= o.y && ty < o.y + ROOM_H) return i;
  }
  return -1;
}

// Builds the map: 0 = wall or empty lot, 1 = floor, 2 = sidewalk.
// "blocked" marks squares you can't walk through (machine spots).
function buildMap(state) {
  const tiles = [], blocked = [];
  for (let y = 0; y < MAP_H; y++) { tiles.push(new Array(MAP_W).fill(0)); blocked.push(new Array(MAP_W).fill(false)); }
  for (let i = 0; i < state.rooms; i++) {
    const o = roomOrigin(i);
    for (let y = 0; y < ROOM_H; y++) for (let x = 0; x < ROOM_W; x++) tiles[o.y + y][o.x + x] = 1;
    for (const row of SLOT_ROWS) for (let c = 1; c <= SLOTS_PER_ROW; c++) blocked[o.y + row][o.x + c] = true;
    for (let j = 0; j < i; j++) if (roomsTouch(i, j)) doorsBetween(i, j).forEach(d => { tiles[d.y][d.x] = 1; });
  }
  DOOR_X.forEach(x => { tiles[SIDEWALK_Y - 1][x] = 1; });
  for (let y = SIDEWALK_Y; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) tiles[y][x] = 2;
  // Big machines (VR pods) also cover the square below their spot.
  for (const m of state.machines) for (const c of machineCells(m)) blocked[c.y][c.x] = true;
  state.map = { tiles: tiles, blocked: blocked, version: (state.map ? state.map.version : 0) + 1 };
}

function walkable(state, x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  return state.map.tiles[y][x] > 0 && !state.map.blocked[y][x];
}

// Finds a path of squares from (sx, sy) to (tx, ty), or null.
// It spreads out from the start one square at a time ("breadth-first").
function findPath(state, sx, sy, tx, ty) {
  const start = nearestWalkable(state, sx, sy);
  if (!start || !walkable(state, tx, ty)) return null;
  const key = (x, y) => y * MAP_W + x;
  const came = new Map();
  came.set(key(start.x, start.y), -1);
  const queue = [start];
  while (queue.length) {
    const p = queue.shift();
    if (p.x === tx && p.y === ty) {
      const path = [];
      let k = key(p.x, p.y);
      while (k !== -1) { path.unshift({ x: k % MAP_W, y: Math.floor(k / MAP_W) }); k = came.get(k); }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = p.x + dx, ny = p.y + dy;
      if (!walkable(state, nx, ny) || came.has(key(nx, ny))) continue;
      came.set(key(nx, ny), key(p.x, p.y));
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

function nearestWalkable(state, x, y) {
  if (walkable(state, x, y)) return { x: x, y: y };
  for (let r = 1; r < 4; r++)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++)
      if (walkable(state, x + dx, y + dy)) return { x: x + dx, y: y + dy };
  return null;
}

// =====================================================================
//  MACHINES
// =====================================================================

function machineDef(m) { return byId(CONFIG.machines, m.type); }

// Top-left square of a machine on the map.
function machineTile(m) {
  const o = roomOrigin(m.room);
  return { x: o.x + 1 + m.col, y: o.y + SLOT_ROWS[m.row] };
}
// Every square a machine covers.
function machineCells(m) {
  const d = machineDef(m), t = machineTile(m), cells = [];
  for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) cells.push({ x: t.x + x, y: t.y + y });
  return cells;
}
// The machine's box in pixels.
function machineRect(m) {
  const d = machineDef(m), t = machineTile(m);
  return { x: t.x * T, y: t.y * T, w: d.w * T, h: d.h * T };
}
// Where you stand to use a machine (the square in front of it).
function machineStand(m) {
  const d = machineDef(m), t = machineTile(m);
  return { x: t.x + Math.floor((d.w - 1) / 2), y: t.y + d.h };
}

function upgradeValue(m, id) { return byId(CONFIG.upgrades, id).values[m.up[id]]; }
function playPrice(m) { return Math.round(machineDef(m).price * upgradeValue(m, "price")); }
function playSeconds(m) { return machineDef(m).play * upgradeValue(m, "speed"); }
function lineSlots(m) { return upgradeValue(m, "line"); }
function upgradeCost(m, id) {
  const u = byId(CONFIG.upgrades, id), lvl = m.up[id];
  if (lvl >= u.cost.length) return null;            // all done
  return Math.max(50, niceNumber(machineDef(m).unlock * u.cost[lvl]));
}
function newBugTime(m) {
  return randBetween(CONFIG.bugMinutes[0], CONFIG.bugMinutes[1]) * 60 * CONFIG.bugUpgrade[m.up.bugs];
}
// Is it on and taking customers? (Bugged machines still work, at half speed.)
function machineOpen(state, m) { return m.status !== "building"; }
function machineRunning(state, m) { return m.status !== "building" && !state.outage; }

// Which machine spots in a room are free. Returns a set of "row,col".
function takenSpots(state, room) {
  const taken = new Set();
  for (const m of state.machines) {
    if (m.room !== room) continue;
    const d = machineDef(m);
    for (let i = 0; i < d.w; i++) taken.add(m.row + "," + (m.col + i));
    // A VR pod in the top row also covers... (only its own row counts as a spot)
  }
  return taken;
}

// Can machine type "type" go at room/row/col? Returns "" if yes, or why not.
function cantPlace(state, type, room, row, col) {
  const d = byId(CONFIG.machines, type);
  if (col + d.w > SLOTS_PER_ROW) return "Needs " + d.w + " squares in a row";
  const taken = takenSpots(state, room);
  for (let i = 0; i < d.w; i++) if (taken.has(row + "," + (col + i))) return "Needs " + d.w + " free squares in a row";
  if (d.h > 1) {
    // The square below must be free of anything else big.
    const o = roomOrigin(room);
    for (const m of state.machines) for (const c of machineCells(m))
      for (let i = 0; i < d.w; i++) if (c.x === o.x + 1 + col + i && c.y === o.y + SLOT_ROWS[row] + 1) return "Not enough room";
  }
  return "";
}

let nextIdCounter = 1;
function makeId() { return Date.now().toString(36) + "-" + (nextIdCounter++); }

function placeMachine(state, type, room, row, col) {
  if (state.unlocked <= CONFIG.machines.findIndex(d => d.id === type)) return null;
  if (cantPlace(state, type, room, row, col)) return null;
  const d = byId(CONFIG.machines, type);
  const m = {
    id: makeId(), type: type, name: randomGameName(), room: room, row: row, col: col,
    status: "building", buildLeft: d.build, up: { speed: 0, bugs: 0, price: 0, line: 0 },
    bugIn: 0, plays: 0, earned: 0, queue: [], playing: [],
  };
  state.machines.push(m);
  buildMap(state);
  return m;
}

function unlockNext(state) {
  const d = CONFIG.machines[state.unlocked];
  if (!d || state.money < d.unlock) return false;
  state.money -= d.unlock;
  state.unlocked++;
  return true;
}

function buyUpgrade(state, m, id) {
  const cost = upgradeCost(m, id);
  if (cost === null || state.money < cost) return false;
  state.money -= cost;
  m.up[id]++;
  if (id === "bugs" && m.status === "ok") m.bugIn = Math.max(m.bugIn, newBugTime(m) * 0.5);
  return true;
}

function removeMachine(state, m) {
  state.machines = state.machines.filter(x => x !== m);
  for (const c of state.customers) if (c.machine === m.id) { c.machine = null; chooseMachine(state, c); }
  buildMap(state);
}

function renameMachine(m, name) {
  name = String(name || "").trim().slice(0, 24);
  if (name) m.name = name;
}

// Speeding up a build with the typing game: score 1 = done right away.
function speedUpBuild(state, m, score) {
  if (m.status !== "building") return;
  m.buildLeft *= (1 - Math.max(0, Math.min(1, score)));
  if (m.buildLeft < 0.5) m.buildLeft = 0.01;
}

function fixBug(state, m) {
  m.status = "ok";
  m.bugIn = newBugTime(m);
}

function fixOutage(state) {
  state.outage = false;
  state.outageIn = randBetween(CONFIG.outageMinutes[0], CONFIG.outageMinutes[1]) * 60;
}

// ----- Rooms ----------------------------------------------------------

function nextRoomCost(state) { return state.rooms < 6 ? CONFIG.roomCosts[state.rooms] : null; }
function buyRoom(state) {
  const cost = nextRoomCost(state);
  if (cost === null || state.money < cost) return false;
  state.money -= cost;
  state.rooms++;
  buildMap(state);
  return true;
}
function capacity(state) { return CONFIG.customersPerRoom * state.rooms; }

// =====================================================================
//  A NEW ARCADE
// =====================================================================

function newArcadeState(name, look) {
  const state = {
    v: 1,
    name: name || randomArcadeName(),
    look: look || randomLook(),
    money: CONFIG.startMoney,
    rooms: 1,
    unlocked: 0,              // how many machine types are unlocked
    machines: [],
    day: 0,
    rep: 0.6,                 // how happy customers have been (0 to 1)
    rate: 0,                  // money per second lately (for away earnings)
    outage: false,
    outageIn: randBetween(CONFIG.outageMinutes[0], CONFIG.outageMinutes[1]) * 60,
    totalEarned: 0,
    playSeconds: 0,
    savedAt: Date.now(),
  };
  prepareState(state);
  return state;
}

// Things that are not saved, set up fresh.
function prepareState(state) {
  state.customers = [];
  state.events = [];
  state.spawnIn = 1;
  state.rateBucket = 0;
  state.rateTimer = 0;
  state.player = state.player || { x: 5.5 * T, y: 16.5 * T, dir: "up", walking: false, phase: 0 };
  for (const m of state.machines) { m.queue = []; m.playing = []; }
  buildMap(state);
}

// =====================================================================
//  CUSTOMERS
//  ---------------------------------------------------------------------
//  Like guests in a theme park: they walk in, play lots of machines in
//  a random order, and leave when they run out of coins or energy.
//  Each one has one wish ("I want air hockey!") shown in a bubble.
// =====================================================================

function spawnCustomer(state) {
  const placedTypes = [...new Set(state.machines.map(m => m.type))];
  let wish;
  if (placedTypes.length && Math.random() < CONFIG.wishChance) wish = pickRandom(placedTypes);
  else wish = CONFIG.machines[Math.min(CONFIG.machines.length - 1, Math.floor(Math.random() * (state.unlocked + 1)))].id;
  const c = {
    id: makeId(),
    x: (pickRandom(DOOR_X) + 0.5) * T, y: (MAP_H - 0.3) * T,
    look: randomLook(),
    tokens: randInt(CONFIG.tokens[0], CONFIG.tokens[1]),
    energy: 100,
    tired: randBetween(CONFIG.energyPerPlay[0], CONFIG.energyPerPlay[1]),
    wish: wish, gotWish: false,
    mode: "walk", path: [], machine: null, last: null,
    bubble: null, bubbleT: 0, wait: 0, tries: 0, phase: Math.random() * 10,
  };
  state.customers.push(c);
  chooseMachine(state, c);
}

function say(c, bubble, seconds) { c.bubble = bubble; c.bubbleT = seconds; }

function chooseMachine(state, c) {
  c.machine = null;
  const open = state.machines.filter(m => machineOpen(state, m) && m.queue.length < lineSlots(m));
  let pick = null;
  if (!c.gotWish) {
    const wished = open.filter(m => m.type === c.wish);
    if (wished.length) pick = pickRandom(wished);
  }
  if (!pick && open.length) {
    const others = open.filter(m => m.id !== c.last);
    pick = pickRandom(others.length ? others : open);
  }
  if (!pick) {
    // Every line is full: just walk around a bit and try again.
    c.tries++;
    if (state.machines.some(m => machineOpen(state, m))) say(c, "full", 2);
    if (c.tries > 4) { leave(state, c); return; }
    c.mode = "wander";
    const room = Math.floor(Math.random() * state.rooms), o = roomOrigin(room);
    const spots = [];
    for (let x = 0; x < ROOM_W; x++) { spots.push({ x: o.x + x, y: o.y + 3 }); spots.push({ x: o.x + x, y: o.y + 7 }); }
    const s = pickRandom(spots);
    setPath(state, c, s.x, s.y);
    return;
  }
  c.tries = 0;
  c.machine = pick.id;
  pick.queue.push(c.id);
  c.mode = "walk";
  const stand = machineStand(pick);
  setPath(state, c, stand.x, stand.y);
}

function setPath(state, c, tx, ty) {
  const path = findPath(state, Math.floor(c.x / T), Math.floor(c.y / T), tx, ty);
  c.path = path ? path.slice(1).map(p => ({ x: (p.x + 0.5) * T, y: (p.y + 0.5) * T })) : [];
  c.mapVersion = state.map.version;
  c.goal = { x: tx, y: ty };
}

function leave(state, c) {
  if (c.machine) {
    const m = state.machines.find(x => x.id === c.machine);
    if (m) m.queue = m.queue.filter(id => id !== c.id);
  }
  c.machine = null;
  c.mode = "leave";
  // A visit counts as happy if they got their wish.
  state.rep = state.rep * 0.96 + (c.gotWish ? 1 : 0.55) * 0.04;
  setPath(state, c, DOOR_X[0], SIDEWALK_Y);
  c.path.push({ x: c.x < (DOOR_X[1]) * T ? (DOOR_X[0] + 0.5) * T : (DOOR_X[1] + 0.5) * T, y: (MAP_H + 1) * T });
}

// Where the k-th person in a machine's line stands, in pixels.
function linePos(state, m, k) {
  const r = machineRect(m);
  const o = roomOrigin(m.room);
  const start = r.y + r.h + 14;
  const bottom = (o.y + ROOM_H) * T - 4;
  const gap = Math.min(6, (bottom - start) / Math.max(1, lineSlots(m)));
  return { x: r.x + r.w / 2, y: start + k * gap };
}
function playPos(m, k) {
  const r = machineRect(m), d = machineDef(m);
  return { x: r.x + (k + 0.5) * r.w / d.players, y: r.y + r.h + 6 };
}

// Moves toward (tx, ty). Returns true when it gets there.
function stepToward(c, tx, ty, dist) {
  const dx = tx - c.x, dy = ty - c.y, len = Math.hypot(dx, dy);
  c.walking = len > 0.5;
  if (len <= dist) { c.x = tx; c.y = ty; return true; }
  c.x += dx / len * dist; c.y += dy / len * dist;
  if (Math.abs(dx) > Math.abs(dy)) c.dir = dx > 0 ? "right" : "left"; else c.dir = dy > 0 ? "down" : "up";
  return false;
}

function updateCustomer(state, c, dt) {
  c.phase += dt;
  if (c.bubbleT > 0) { c.bubbleT -= dt; if (c.bubbleT <= 0) c.bubble = null; }
  if (c.mapVersion !== state.map.version && c.goal && (c.mode === "walk" || c.mode === "wander")) setPath(state, c, c.goal.x, c.goal.y);
  const dist = CONFIG.walkSpeed * dt;
  const m = c.machine ? state.machines.find(x => x.id === c.machine) : null;

  if (c.mode === "walk" || c.mode === "wander" || c.mode === "leave") {
    if (c.path.length) {
      if (stepToward(c, c.path[0].x, c.path[0].y, dist)) c.path.shift();
      return;
    }
    if (c.mode === "leave") { c.gone = true; return; }
    if (c.mode === "wander") {
      c.walking = false;
      c.wait += dt;
      if (c.wait > 2) { c.wait = 0; chooseMachine(state, c); }
      return;
    }
    if (!m) { chooseMachine(state, c); return; }
    c.mode = "line";
  }
  if (c.mode === "line") {
    if (!m) { chooseMachine(state, c); return; }
    const k = m.queue.indexOf(c.id);
    const p = linePos(state, m, Math.max(0, k));
    stepToward(c, p.x, p.y, dist);
    c.dir = "up";
    return;
  }
  if (c.mode === "play") {
    c.walking = false;
    c.dir = "up";
  }
}

// A machine takes the next person in line, and pays out when a play ends.
function updateMachine(state, m, dt) {
  if (m.status === "building") {
    m.buildLeft -= dt;
    if (m.buildLeft <= 0) {
      m.status = "ok";
      m.bugIn = newBugTime(m);
      state.events.push({ type: "built", machine: m });
    }
    return;
  }
  if (state.outage) return;
  if (m.status === "ok") {
    m.bugIn -= dt;
    if (m.bugIn <= 0) { m.status = "bug"; state.events.push({ type: "bug", machine: m }); }
  }
  const d = machineDef(m);
  // Bugged machines run at half speed.
  const speed = m.status === "bug" ? 0.5 : 1;
  for (const p of m.playing) p.left -= dt * speed;
  // Plays that just ended
  for (const p of m.playing.filter(p => p.left <= 0)) {
    const c = state.customers.find(x => x.id === p.cid);
    const price = playPrice(m);
    state.money += price; state.totalEarned += price; state.rateBucket += price;
    m.plays++; m.earned += price;
    state.events.push({ type: "coin", x: playPos(m, p.slot).x, y: machineRect(m).y, amount: price });
    if (c) {
      c.tokens--;
      c.energy -= c.tired;
      c.last = m.id;
      if (c.wish === m.type && !c.gotWish) { c.gotWish = true; say(c, "heart", 2.5); }
      if (c.tokens <= 0 || c.energy <= 0) leave(state, c);
      else { c.mode = "walk"; chooseMachine(state, c); }
    }
  }
  m.playing = m.playing.filter(p => p.left > 0);
  // Let the next people in line play
  for (let slot = 0; slot < d.players; slot++) {
    if (m.playing.some(p => p.slot === slot)) continue;
    const nextId = m.queue[0];
    if (!nextId) break;
    const c = state.customers.find(x => x.id === nextId);
    if (!c) { m.queue.shift(); continue; }
    if (c.mode !== "line") break;
    const lp = linePos(state, m, 0);
    if (Math.hypot(c.x - lp.x, c.y - lp.y) > 3) break;
    m.queue.shift();
    c.mode = "play";
    const pp = playPos(m, slot);
    c.x = pp.x; c.y = pp.y;
    m.playing.push({ cid: c.id, slot: slot, left: playSeconds(m) });
  }
}

// =====================================================================
//  TIME PASSING
// =====================================================================

function tick(state, dt) {
  state.day += dt / CONFIG.secondsPerDay;
  state.playSeconds += dt;
  for (const m of state.machines) updateMachine(state, m, dt);

  // Power outage (rare)
  if (!state.outage && state.machines.some(m => m.status !== "building")) {
    state.outageIn -= dt;
    if (state.outageIn <= 0) { state.outage = true; state.events.push({ type: "outage" }); }
  }

  // New customers
  const ready = state.machines.filter(m => m.status !== "building").length;
  if (ready > 0 && !state.outage) {
    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      const repBoost = 0.6 + 0.8 * state.rep;          // happy visits bring more people
      const every = Math.max(CONFIG.fastestArrive, CONFIG.arriveEverySeconds / (1 + CONFIG.arrivePerMachine * ready) / repBoost);
      state.spawnIn = every * randBetween(0.6, 1.4);
      if (state.customers.length < capacity(state)) spawnCustomer(state);
    }
  }
  for (const c of state.customers) updateCustomer(state, c, dt);
  state.customers = state.customers.filter(c => !c.gone);

  // Money per second lately (a slow average, used while you're away)
  state.rateTimer += dt;
  if (state.rateTimer >= 10) {
    const now = state.rateBucket / state.rateTimer;
    state.rate = state.rate ? state.rate * 0.9 + now * 0.1 : now;
    state.rateBucket = 0; state.rateTimer = 0;
  }
}

// While you were away. Returns what happened, for the welcome-back card.
function catchUp(state) {
  const seconds = Math.min(CONFIG.maxAwaySeconds, Math.max(0, (Date.now() - state.savedAt) / 1000));
  state.savedAt = Date.now();
  if (seconds < 5) return null;
  const report = { seconds: seconds, money: 0, bugs: 0, built: 0, outage: false };
  // Machines being built finish.
  for (const m of state.machines) if (m.status === "building") {
    m.buildLeft -= seconds;
    if (m.buildLeft <= 0) { m.status = "ok"; m.bugIn = newBugTime(m) + m.buildLeft; m.buildLeft = 0; report.built++; }
  }
  // Earnings, in 100 small pieces of time. Bugged machines and a power
  // outage both halve the money (so a week away never earns zero).
  const pieces = 100, piece = seconds / pieces;
  const baseRate = state.rate * CONFIG.awayShare;
  let outageAt = state.outage ? 0 : state.outageIn;
  const built = state.machines.filter(m => m.status !== "building");
  for (let i = 0; i < pieces; i++) {
    const t = (i + 0.5) * piece;
    let share = 1;
    if (built.length) {
      const bugged = built.filter(m => m.status === "bug" || m.bugIn < t).length;
      share = 1 - 0.5 * bugged / built.length;
    }
    if (t > outageAt) share *= 0.5;
    report.money += baseRate * piece * share;
  }
  report.money = Math.floor(report.money);
  for (const m of built) {
    if (m.status === "ok") { m.bugIn -= seconds; if (m.bugIn <= 0) { m.status = "bug"; report.bugs++; } }
  }
  if (!state.outage && built.length) {
    state.outageIn -= seconds;
    if (state.outageIn <= 0) { state.outage = true; report.outage = true; }
  }
  state.money += report.money;
  state.totalEarned += report.money;
  state.day += seconds / CONFIG.awaySecondsPerDay;
  return report;
}

// =====================================================================
//  SAVING (its own save slots, separate from the studio game)
// =====================================================================

const SAVE_KEY = "pixelEmpireArcade.slot.";

function saveData(state) {
  const keep = {};
  for (const k of ["v", "name", "look", "money", "rooms", "unlocked", "day", "rep", "rate", "outage", "outageIn", "totalEarned", "playSeconds"]) keep[k] = state[k];
  keep.savedAt = Date.now();
  keep.machines = state.machines.map(m => ({
    id: m.id, type: m.type, name: m.name, room: m.room, row: m.row, col: m.col,
    status: m.status, buildLeft: m.buildLeft, up: m.up, bugIn: m.bugIn, plays: m.plays, earned: m.earned,
  }));
  keep.player = { x: state.player.x, y: state.player.y, dir: state.player.dir };
  return keep;
}
function saveGame(state, slot) {
  try { localStorage.setItem(SAVE_KEY + slot, JSON.stringify(saveData(state))); } catch (e) { /* storage full or blocked */ }
}
function loadGame(slot) {
  try {
    const text = localStorage.getItem(SAVE_KEY + slot);
    if (!text) return null;
    const state = JSON.parse(text);
    state.player = Object.assign({ walking: false, phase: 0 }, state.player);
    prepareState(state);
    return state;
  } catch (e) { return null; }
}
function deleteSave(slot) { try { localStorage.removeItem(SAVE_KEY + slot); } catch (e) { /* ignore */ } }

if (typeof module !== "undefined") module.exports = {
  newArcadeState, tick, catchUp, placeMachine, unlockNext, buyUpgrade, buyRoom, nextRoomCost, cantPlace,
  machineDef, upgradeCost, fixBug, fixOutage, speedUpBuild, capacity, SLOTS_PER_ROW,
};

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
const COUNTER = { x: 2, y: 17, w: 2 };  // the Front Counter, in room 1 by the front door

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
  for (let i = 0; i < COUNTER.w; i++) blocked[COUNTER.y][COUNTER.x + i] = true;
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
function lineSlots(m) { return CONFIG.lineSlots; }
function upgradeCost(m, id) {
  const u = byId(CONFIG.upgrades, id), lvl = m.up[id];
  if (lvl >= u.cost.length) return null;            // all done
  return Math.max(50, niceNumber(machineDef(m).unlock * u.cost[lvl]));
}
// Upgrades belong to a machine type, so every machine of that type shares them.
function typeUpgrades(state, type) {
  if (!state.typeUp) state.typeUp = {};
  if (!state.typeUp[type]) state.typeUp[type] = { price: 0, speed: 0 };
  return state.typeUp[type];
}
// A stand-in "machine" for a type, so the upgrade helpers work in the Shop.
function typeStub(state, type) { return { type: type, up: typeUpgrades(state, type) }; }
function newBugTime() { return randBetween(CONFIG.bugMinutes[0], CONFIG.bugMinutes[1]) * 60; }
// Is it on and taking customers? (Bugged machines still work, at half speed.)
function machineOpen(state, m) { return m.status !== "building"; }
function machineRunning(state, m) { return m.status !== "building" && !state.outage; }

// Which machine spots in a room are free. Returns a set of "row,col".
function takenSpots(state, room, ignore) {
  const taken = new Set();
  for (const m of state.machines) {
    if (m.room !== room || m === ignore) continue;
    const d = machineDef(m);
    for (let i = 0; i < d.w; i++) taken.add(m.row + "," + (m.col + i));
    // A VR pod in the top row also covers... (only its own row counts as a spot)
  }
  return taken;
}

// Can machine type "type" go at room/row/col? Returns "" if yes, or why not.
function cantPlace(state, type, room, row, col, ignore) {
  const d = byId(CONFIG.machines, type);
  if (col + d.w > SLOTS_PER_ROW) return "Needs " + d.w + " squares in a row";
  const taken = takenSpots(state, room, ignore);
  for (let i = 0; i < d.w; i++) if (taken.has(row + "," + (col + i))) return "Needs " + d.w + " free squares in a row";
  if (d.h > 1) {
    // The square below must be free of anything else big.
    const o = roomOrigin(room);
    for (const m of state.machines) if (m !== ignore) for (const c of machineCells(m))
      for (let i = 0; i < d.w; i++) if (c.x === o.x + 1 + col + i && c.y === o.y + SLOT_ROWS[row] + 1) return "Not enough room";
  }
  return "";
}

let nextIdCounter = 1;
function makeId() { return Date.now().toString(36) + "-" + (nextIdCounter++); }

// What it costs to put a machine on the floor (after it's unlocked).
function placeCost(type) {
  const d = byId(CONFIG.machines, type);
  return niceNumber(d.unlock * CONFIG.placeShare);
}

function placeMachine(state, type, room, row, col, free) {
  if (state.unlocked <= CONFIG.machines.findIndex(d => d.id === type)) return null;
  if (cantPlace(state, type, room, row, col)) return null;
  const d = byId(CONFIG.machines, type);
  if (!free) {
    if (state.money < placeCost(type)) return null;
    state.money -= placeCost(type);
  }
  if (!free && state.typesPlaced && !state.typesPlaced.includes(type)) { state.typesPlaced.push(type); addStars(state, CONFIG.stars.newType); }
  const m = {
    id: makeId(), type: type, name: randomGameName(), room: room, row: row, col: col,
    status: "building", buildLeft: d.build, up: typeUpgrades(state, type),
    plays: 0, earned: 0, queue: [], playing: [],
  };
  if (!free && state.instantBuilds > 0) { state.instantBuilds--; m.buildLeft = 0.01; }
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

// Why an upgrade can't start right now ("" = it can).
function upgradeBlock(state, type, id) {
  const lvl = typeUpgrades(state, type)[id];
  if (jobFor(state, "type", type, id)) return "Being upgraded";
  if (lvl >= counterInfo(state).maxUpgrade) return "Needs Counter level " + counterLevelFor(state, c => c.maxUpgrade > lvl);
  if (freeMechanics(state) <= 0) return mechanicsBusyText(state);
  return "";
}
// Buying an upgrade gives a Mechanic a job. The upgrade works when the job is done.
function buyUpgrade(state, m, id) {
  const cost = upgradeCost(m, id);
  if (cost === null || state.money < cost || upgradeBlock(state, m.type, id)) return null;
  state.money -= cost;
  const lvl = m.up[id];
  return startJob(state, { kind: "type", type: m.type, up: id, seconds: CONFIG.typeJobSeconds[lvl] });
}

// The Bright sign (an upgrade for the whole arcade)
function signCost(state) { const c = CONFIG.sign.cost[state.sign || 0]; return c === undefined ? null : c; }
function signBlock(state) {
  if (jobFor(state, "sign")) return "Being upgraded";
  if ((state.sign || 0) >= counterInfo(state).maxSign) return "Needs Counter level " + counterLevelFor(state, c => c.maxSign > (state.sign || 0));
  if (freeMechanics(state) <= 0) return mechanicsBusyText(state);
  return "";
}
function buySign(state) {
  const cost = signCost(state);
  if (cost === null || state.money < cost || signBlock(state)) return null;
  state.money -= cost;
  return startJob(state, { kind: "sign", seconds: CONFIG.signJobSeconds[state.sign || 0] });
}

// =====================================================================
//  THE FRONT COUNTER (the arcade's level)
// =====================================================================

function counterInfo(state) { return CONFIG.counter[(state.counter || 1) - 1]; }
function nextCounter(state) { return CONFIG.counter[state.counter || 1] || null; }
// The lowest counter level where test(level) is true.
function counterLevelFor(state, test) { const i = CONFIG.counter.findIndex(test); return i < 0 ? CONFIG.counter.length : i + 1; }
function counterBlock(state) {
  if (!nextCounter(state)) return "Top level!";
  if (jobFor(state, "counter")) return "Being upgraded";
  if (freeMechanics(state) <= 0) return mechanicsBusyText(state);
  return "";
}
function buyCounter(state) {
  const next = nextCounter(state);
  if (!next || state.money < next.cost || counterBlock(state)) return null;
  state.money -= next.cost;
  return startJob(state, { kind: "counter", seconds: next.seconds });
}

// =====================================================================
//  MECHANICS AND THEIR JOBS
//  A job counts down in real time, even while the game is closed.
// =====================================================================

function freeMechanics(state) { return state.mechanics - state.jobs.length; }
function jobFor(state, kind, type, up) { return state.jobs.find(j => j.kind === kind && (!type || j.type === type) && (!up || j.up === up)); }
function mechanicsBusyText(state) { return (state.mechanics === 2 ? "Both" : "All") + " Mechanics are busy"; }
function startJob(state, job) {
  job.id = makeId(); job.total = job.seconds; job.left = job.seconds; job.spedUp = false; delete job.seconds;
  state.jobs.push(job);
  return job;
}
function jobName(job) {
  if (job.kind === "counter") return "Front Counter";
  if (job.kind === "sign") return CONFIG.sign.name;
  return byId(CONFIG.machines, job.type).name + ": " + byId(CONFIG.upgrades, job.up).name;
}
function finishJob(state, job) {
  state.jobs = state.jobs.filter(j => j !== job);
  if (job.kind === "type") typeUpgrades(state, job.type)[job.up]++;
  if (job.kind === "sign") state.sign = (state.sign || 0) + 1;
  if (job.kind === "counter") {
    const before = state.unlocked;
    state.counter++;
    state.unlocked = Math.max(state.unlocked, counterInfo(state).unlocks);
    addStars(state, CONFIG.stars.counter);
    job.newTypes = CONFIG.machines.slice(before, state.unlocked).map(d => d.id);
  }
  state.events.push({ type: "job", job: job });
}
function runJobs(state, seconds) {
  const done = [];
  for (const job of state.jobs.slice()) { job.left -= seconds; if (job.left <= 0) { finishJob(state, job); done.push(job); } }
  return done;
}
// The code game makes a job faster (once per job).
function speedUpJob(state, job, score) {
  if (job.spedUp) return;
  job.spedUp = true;
  addStars(state, CONFIG.stars.speedUp);
  if (score >= 1 && job.left < CONFIG.instantUnder) job.left = 0.01;
  else job.left *= 1 - CONFIG.speedUpCut * Math.max(0, Math.min(1, score));
}
// A Fame Road reward: finish a job right now.
function useInstantJob(state, job) {
  if (!state.instantJobs) return false;
  state.instantJobs--;
  job.left = 0.01;
  return true;
}

// =====================================================================
//  THE COIN BOX (money from time away waits here until you tap it)
// =====================================================================

function boxShare(state) { return CONFIG.boxShares[(state.boxLevel || 1) - 1]; }
function collectBox(state, bonus) {
  const amount = Math.floor(state.coinBox * (1 + (bonus || 0)));
  state.money += amount; state.totalEarned += amount;
  state.coinBox = 0; state.boxAway = 0;
  return amount;
}

// =====================================================================
//  FAME STARS AND THE FAME ROAD
// =====================================================================

function addStars(state, n) { if (state.stars !== undefined) state.stars += n; }
// Stars needed to reach step k (counting all the steps before it).
function starsForStep(k) { let total = 0; for (let i = 1; i <= k; i++) total += 15 + 5 * i; return total; }
function stepsReached(state) { let k = 0; while (k < CONFIG.road.length && state.stars >= starsForStep(k + 1)) k++; return k; }
function rewardWaiting(state) { return state.roadClaimed < stepsReached(state); }
function coinReward(state, minutes) { return niceNumber(Math.max(2, state.rate) * 60 * minutes); }
// Claims the next reward. Returns it (with .amount for coins).
function claimStep(state) {
  if (!rewardWaiting(state)) return null;
  const r = Object.assign({}, CONFIG.road[state.roadClaimed]);
  state.roadClaimed++;
  if (r.kind === "coins") { r.amount = coinReward(state, r.minutes); state.money += r.amount; }
  if (r.kind === "look") { state.looks[r.look] = true; }
  if (r.kind === "box") state.boxLevel = Math.max(state.boxLevel, r.level);
  if (r.kind === "mechanic") state.mechanics++;
  if (r.kind === "builds") state.instantBuilds += r.count;
  if (r.kind === "job") state.instantJobs++;
  return r;
}

function removeMachine(state, m) {
  state.machines = state.machines.filter(x => x !== m);
  for (const c of state.customers) if (c.machine === m.id) { c.machine = null; chooseMachine(state, c); }
  buildMap(state);
}

// Swap a machine for a different one in the same spot.
function swapMachine(state, m, type) {
  if (cantPlace(state, type, m.room, m.row, m.col, m)) return null;
  if (state.money < placeCost(type)) return null;
  removeMachine(state, m);
  return placeMachine(state, type, m.room, m.row, m.col);
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
  state.bugIn = newBugTime();
}

function fixOutage(state) {
  state.outage = false;
  state.outageIn = randBetween(CONFIG.outageMinutes[0], CONFIG.outageMinutes[1]) * 60;
}

// ----- Rooms ----------------------------------------------------------

function nextRoomCost(state) { return state.rooms < 6 ? CONFIG.roomCosts[state.rooms] : null; }
function roomBlock(state) {
  if (state.rooms >= counterInfo(state).maxRooms) return "Needs Counter level " + counterLevelFor(state, c => c.maxRooms > state.rooms);
  return "";
}
function buyRoom(state) {
  const cost = nextRoomCost(state);
  if (cost === null || state.money < cost || roomBlock(state)) return false;
  state.money -= cost;
  state.rooms++;
  buildMap(state);
  return true;
}
// How many people fit in the arcade: every working machine makes room for more.
function seats(state) { return state.machines.filter(m => m.status !== "building").reduce((n, m) => n + machineDef(m).players, 0); }
function capacity(state) { return CONFIG.baseCustomers + CONFIG.customersPerSeat * seats(state) + CONFIG.sign.extra[state.sign || 0]; }

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
    unlocked: CONFIG.counter[0].unlocks,   // how many machine types are unlocked
    counter: 1,               // the Front Counter's level
    mechanics: CONFIG.mechanics,
    jobs: [],
    coinBox: 0, boxAway: 0, boxLevel: 1,
    stars: 0, roadClaimed: 0, looks: {}, typesPlaced: ["claw"], instantBuilds: 0, instantJobs: 0,
    happy: 0, happyHour: 0, happyHourStars: 0,
    machines: [],
    day: 0,
    rep: 0.6,                 // how happy customers have been (0 to 1)
    rate: 0,                  // money per second lately (for away earnings)
    outage: false,
    outageIn: randBetween(CONFIG.outageMinutes[0], CONFIG.outageMinutes[1]) * 60,
    bugIn: newBugTime(),
    typeUp: {},
    sign: 0,
    totalEarned: 0,
    playSeconds: 0,
    savedAt: Date.now(),
  };
  prepareState(state);
  // You start with one claw machine, already working.
  const first = placeMachine(state, "claw", 0, 0, 3, true);
  first.status = "ok"; first.buildLeft = 0;
  state.spawnIn = 0.5;
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
  // Older saves kept upgrades on each machine: give each type the best one it had.
  if (!state.typeUp) {
    state.typeUp = {};
    for (const m of state.machines) if (m.up) {
      const t = typeUpgrades(state, m.type);
      t.price = Math.max(t.price, m.up.price || 0); t.speed = Math.max(t.speed, m.up.speed || 0);
    }
  }
  if (state.bugIn === undefined) state.bugIn = newBugTime();
  // Older saves: no Front Counter yet. Pick the level that has every machine they unlocked.
  if (!state.counter) {
    state.counter = counterLevelFor(state, c => c.unlocks >= state.unlocked);
    state.stars = 50 * (state.counter - 1);
  }
  state.unlocked = Math.max(state.unlocked, counterInfo(state).unlocks);
  const defaults = { mechanics: CONFIG.mechanics, jobs: [], coinBox: 0, boxAway: 0, boxLevel: 1, stars: 0, roadClaimed: 0, looks: {},
    instantBuilds: 0, instantJobs: 0, happy: 0, happyHour: 0, happyHourStars: 0 };
  for (const k in defaults) if (state[k] === undefined) state[k] = defaults[k];
  if (!state.typesPlaced) state.typesPlaced = [...new Set(state.machines.map(m => m.type))];
  state.sign = state.sign || 0;
  // Only one bug at a time
  let bugged = false;
  for (const m of state.machines) { if (m.status === "bug") { if (bugged) m.status = "ok"; bugged = true; } }
  for (const m of state.machines) { m.queue = []; m.playing = []; m.up = typeUpgrades(state, m.type); delete m.bugIn; }
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

// Happy customers (who got their wish) earn a Fame star now and then.
function happyStar(state) {
  if (state.stars === undefined) return;
  if (state.playSeconds - state.happyHour > 3600) { state.happyHour = state.playSeconds; state.happyHourStars = 0; }
  if (++state.happy >= CONFIG.stars.happyEvery && state.happyHourStars < CONFIG.stars.happyPerHour) {
    state.happy = 0; state.happyHourStars++; addStars(state, 1);
  }
}

function say(c, bubble, seconds) { c.bubble = bubble; c.bubbleT = seconds; }

function chooseMachine(state, c) {
  c.machine = null;
  const open = state.machines.filter(m => machineOpen(state, m) && m.queue.length < lineSlots(m));
  // How busy a machine is: people waiting or playing, per player seat.
  const busy = m => (m.queue.length + m.playing.length) / machineDef(m).players + Math.random() * 0.01;
  const leastBusy = list => list.reduce((a, b) => (busy(b) < busy(a) ? b : a));
  let pick = null;
  if (!c.gotWish) {
    // Always go for the machine they want first, the least busy one.
    const wished = open.filter(m => m.type === c.wish);
    if (wished.length) pick = leastBusy(wished);
  }
  if (!pick && open.length) {
    const others = open.filter(m => m.id !== c.last);
    const list = others.length ? others : open;
    // A random machine, but they like ones with a free seat.
    const free = list.filter(m => busy(m) < 1);
    pick = pickRandom(free.length ? free : list);
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
      state.events.push({ type: "built", machine: m });
    }
    return;
  }
  if (state.outage) return;
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
      if (c.wish === m.type && !c.gotWish) { c.gotWish = true; say(c, "heart", 2.5); happyStar(state); }
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
  runJobs(state, dt);
  for (const m of state.machines) updateMachine(state, m, dt);

  // Bugs: one machine at a time, every few minutes
  if (!state.outage && !state.machines.some(m => m.status === "bug")) {
    const ok = state.machines.filter(m => m.status === "ok");
    if (ok.length) {
      state.bugIn -= dt;
      if (state.bugIn <= 0) {
        const m = pickRandom(ok);
        m.status = "bug"; state.events.push({ type: "bug", machine: m });
        state.bugIn = newBugTime();
      }
    }
  }

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
  // (frozen during a power outage, so closing the game then doesn't ruin time away)
  if (state.outage) { state.rateBucket = 0; state.rateTimer = 0; }
  else state.rateTimer += dt;
  if (state.rateTimer >= 5) {
    const now = state.rateBucket / state.rateTimer;
    state.rate = state.rate ? state.rate * 0.8 + now * 0.2 : now;
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
    if (m.buildLeft <= 0) { m.status = "ok"; m.buildLeft = 0; report.built++; }
  }
  // Mechanic jobs keep going while you're away.
  report.jobs = runJobs(state, seconds);
  // Steady earnings the whole time you're away, into the coin box.
  report.money = Math.floor(state.rate * boxShare(state) * seconds);
  state.boxAway += seconds;
  const built = state.machines.filter(m => m.status !== "building");
  // At most one bug waits for you.
  if (!state.machines.some(m => m.status === "bug") && built.length && seconds > state.bugIn) {
    const ok = built.filter(m => m.status === "ok");
    if (ok.length) { pickRandom(ok).status = "bug"; report.bugs = 1; state.bugIn = newBugTime(); }
  } else if (built.length) state.bugIn = Math.max(1, state.bugIn - seconds);
  if (!state.outage && built.length) {
    state.outageIn -= seconds;
    if (state.outageIn <= 0) { state.outage = true; report.outage = true; }
  }
  state.coinBox += report.money;
  report.box = state.coinBox;
  state.day += seconds / CONFIG.awaySecondsPerDay;
  return report;
}

// =====================================================================
//  SAVING (its own save slots, separate from the studio game)
// =====================================================================

const SAVE_KEY = "pixelEmpireArcade.slot.";

function saveData(state) {
  const keep = {};
  for (const k of ["v", "name", "look", "money", "rooms", "unlocked", "day", "rep", "rate", "outage", "outageIn", "bugIn", "typeUp", "sign", "totalEarned", "playSeconds", "hints",
    "counter", "mechanics", "jobs", "coinBox", "boxAway", "boxLevel", "stars", "roadClaimed", "looks", "typesPlaced", "instantBuilds", "instantJobs",
    "happy", "happyHour", "happyHourStars"]) keep[k] = state[k];
  keep.savedAt = Date.now();
  keep.machines = state.machines.map(m => ({
    id: m.id, type: m.type, name: m.name, room: m.room, row: m.row, col: m.col,
    status: m.status, buildLeft: m.buildLeft, plays: m.plays, earned: m.earned,
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
  newArcadeState, tick, catchUp, placeMachine, placeCost, swapMachine, unlockNext, buyUpgrade, buyRoom, nextRoomCost, cantPlace,
  machineDef, upgradeCost, typeStub, buyCounter, counterInfo, nextCounter, claimStep, stepsReached, collectBox, speedUpJob, freeMechanics, typeUpgrades, signCost, buySign, fixBug, fixOutage, speedUpBuild, capacity, SLOTS_PER_ROW,
};

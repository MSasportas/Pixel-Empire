// A robot plays the arcade super fast to check the numbers.
// Run it with:  node arcade/tools/robot-test.js
// It prints when each machine and room gets unlocked.
global.location = { search: "" };
global.CONFIG = require("../js/config.js");
const fs = require("fs");
eval(fs.readFileSync(__dirname + "/../js/game.js", "utf8").replace(/if \(typeof module[\s\S]*$/, ""));

const s = newArcadeState("Robo Arcade");
const log = [];
const t0 = Date.now();
let time = 0;
const stamp = () => (time / 60).toFixed(0).padStart(4) + " min";
const free = [];
function bestFor(room, row, col) {
  for (let i = s.unlocked - 1; i >= 0; i--) if (!cantPlace(s, CONFIG.machines[i].id, room, row, col)) return CONFIG.machines[i].id;
  return null;
}
let fixWait = {};
const HOURS = +(process.argv[2] || 5);
const dt = 0.25;
for (time = 0; time < HOURS * 3600; time += dt) {
  tick(s, dt);
  s.events.length = 0;
  if (Math.floor(time / dt) % 20 !== 0) continue;   // the robot thinks every 5 s
  // Unlock the next machine
  if (s.unlocked < 12 && s.money >= CONFIG.machines[s.unlocked].unlock) { unlockNext(s); log.push(stamp() + "  unlock " + CONFIG.machines[s.unlocked - 1].name); }
  // Rooms
  const rc = nextRoomCost(s);
  if (rc !== null && s.money >= rc * 1.5) { buyRoom(s); log.push(stamp() + "  buy room " + s.rooms); }
  // Fill empty spots with the best machine
  for (let room = 0; room < s.rooms; room++) for (let row = 0; row < 2; row++) for (let col = 0; col < 8; col++) {
    const type = bestFor(room, row, col);
    if (type) placeMachine(s, type, room, row, col);
  }
  const best = CONFIG.machines[s.unlocked - 1];
  // Swap a whole row of old machines for the best one now and then
  const idx = m => CONFIG.machines.findIndex(d => d.id === m.type);
  const weak = s.machines.find(m => m.status !== "building" && idx(m) < s.unlocked - 1);
  if (weak && best && s.money > placeCost(best.id) * 10) {
    const row = s.machines.filter(m => m.room === weak.room && m.row === weak.row);
    if (row.every(m => m.status !== "building")) row.forEach(m => removeMachine(s, m));
  }
  // Upgrades: cheapest first, only if it costs less than 1/4 of our money
  let cheapest = null;
  for (const type of new Set(s.machines.map(m => m.type))) for (const u of CONFIG.upgrades) { const m = typeStub(s, type); const c = upgradeCost(m, u.id); if (c !== null && (!cheapest || c < cheapest.c)) cheapest = { m, u: u.id, c }; }
  if (cheapest && cheapest.c < s.money / 4) buyUpgrade(s, cheapest.m, cheapest.u);
  if (signCost(s) !== null && signCost(s) < s.money / 4) { buySign(s); log.push(stamp() + "  bright sign level " + s.sign); }
  // Fix bugs and outages after about a minute
  for (const m of s.machines) if (m.status === "bug") { fixWait[m.id] = (fixWait[m.id] || 0) + 5; if (fixWait[m.id] > 60) { fixBug(s, m); fixWait[m.id] = 0; } }
  if (s.outage) { fixWait.o = (fixWait.o || 0) + 5; if (fixWait.o > 60) { fixOutage(s); fixWait.o = 0; log.push(stamp() + "  fixed a power outage"); } }
  if (Math.floor(time) % 1800 === 0 && time % 1 === 0) log.push(stamp() + "  money $" + Math.floor(s.money).toLocaleString() + ", rate $" + Math.round(s.rate * 60).toLocaleString() + "/min, " + s.machines.length + " machines, " + s.customers.length + " / " + capacity(s) + " customers");
}
console.log(log.join("\n"));
// A week away
const week = JSON.parse(JSON.stringify(saveData(s)));
week.savedAt = Date.now() - 7 * 24 * 3600 * 1000;
prepareState(week);
const r = catchUp(week);
console.log("A week away earns $" + r.money.toLocaleString() + " (" + (r.money / (s.rate * 60)).toFixed(0) + " minutes of playing). Bugs: " + r.bugs + ", outage: " + r.outage);
console.log("(took " + (Date.now() - t0) + " ms)");

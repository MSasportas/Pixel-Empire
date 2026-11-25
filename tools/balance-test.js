// =====================================================================
//  BALANCE TEST - a robot plays Pixel Empire really fast.
//  Run it with:   node tools/balance-test.js
//  It prints how long (in play time) each studio level takes, so you
//  can check if the numbers in js/config.js feel right.
// =====================================================================
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Load config.js and game.js the same way the browser does.
const ctx = { console, Math, Date, JSON };
vm.createContext(ctx);
for (const f of ["config.js", "game.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8"), ctx);
}
vm.runInContext("this.CONFIG = CONFIG;", ctx);
const G = ctx;
const CONFIG = ctx.CONFIG;
// Optional: try different numbers without editing config.js, e.g.
//   node tools/balance-test.js 3 '{"basePeak":0.2}'
if (process.argv[3]) Object.assign(CONFIG, JSON.parse(process.argv[3]));

// The robot plays like a person: it waits before clicking a waiting step
// (CLICK_DELAY seconds), thinks before starting a new game (THINK seconds)
// and goes shopping once a minute.
const CLICK_DELAY = Number(process.argv[2] || 20);
const THINK = 30;
let think = 0;
const state = G.newGameState("Robot Studio", 0, null);
let wait = 0;
let lastLevel = 1;
const report = [];

function bestGenre() {
  const options = CONFIG.genres.filter(g => G.isUnlocked(state, g) && g.id !== state.lastGenre);
  options.sort((a, b) => G.skillValue(state, b.skill) * b.pop - G.skillValue(state, a.skill) * a.pop);
  return options[0].id;
}
function bestPrice() {
  const unlocked = CONFIG.prices.filter(p => G.isUnlocked(state, p));
  return unlocked[Math.min(2, unlocked.length - 1)].id; // usually $5
}
function shop() {
  // Buy the cheapest useful thing, a few times.
  for (let i = 0; i < 5; i++) {
    const options = [];
    for (const e of CONFIG.engines) if (!state.engines.includes(e.id) && G.isUnlocked(state, e)) options.push([e.cost, () => G.learnEngine(state, e.id)]);
    for (const f of CONFIG.features) if (!state.features.includes(f.id) && G.isUnlocked(state, f)) options.push([f.cost, () => G.buyFeature(state, f.id)]);
    for (const s of CONFIG.skills) options.push([G.trainCost(state, s.id) * 1.5, () => G.trainSkill(state, s.id)]);
    for (const s of CONFIG.supplies) { const c = G.supplyCost(state, s.id); if (c !== undefined) options.push([c, () => G.upgradeSupply(state, s.id)]); }
    if (G.studioLevel(state) >= 2) for (const st of CONFIG.steps) {
      if (state.desks[st.id] < G.desksAllowed(state)) options.push([G.deskCost(state, st.id) + G.hireCost(state), () => G.buyDesk(state, st.id) && G.hire(state, st.id)]);
    }
    options.sort((a, b) => a[0] - b[0]);
    if (!options.length || options[0][0] > state.money) return;
    options[0][1]();
  }
}

const dt = 1;
let t = 0;
// Optional third number: stop after this many hours (to test a week away mid-game).
const STOP_HOURS = Number(process.argv[4] || 20);
for (; t < STOP_HOURS * 3600; t += dt) {
  think -= dt;
  if (state.projects.length < G.maxProjects(state) && think <= 0) {
    const sizes = CONFIG.sizes.filter(z => G.isUnlocked(state, z));
    G.startNewGame(state, { name: "Game " + t, genre: bestGenre(), price: bestPrice(), features: state.features, size: sizes[sizes.length - 1].id });
    think = THINK;
  }
  wait -= dt;
  if (!state.you.projectId && wait <= 0) {
    const p = state.projects.find(x => !x.worker);
    if (p) { G.youStartStep(state, p.id); wait = CLICK_DELAY; }
  }
  G.tick(state, dt, true);
  if (t % 60 === 0) shop();
  const lv = G.studioLevel(state);
  if (lv > lastLevel) {
    report.push("Level " + lv + " (" + CONFIG.levels[lv - 1].name + ") at " + (t / 3600).toFixed(2) + " h, money $" + Math.round(state.money) + ", games " + state.released.length + ", hires " + state.hires.length);
    lastLevel = lv;
  }
  if (state.won) break;
}
console.log(report.join("\n"));
console.log("Stopped at " + (t / 3600).toFixed(2) + " h with " + Math.round(state.fans) + " fans");
console.log("Skills: " + Object.keys(state.skills).map(k => k + " " + state.skills[k].level).join(", "));

// Week away test: leave the game for 7 days and see what you come back to.
const moneyBefore = state.money;
state.lastTick = Date.now() - 7 * 24 * 3600 * 1000;
const away = G.catchUp(state);
console.log("Before leaving: $" + Math.round(moneyBefore) + ". After a week away: +$" + Math.round(away.money) + " (bonus $" + away.bonus + "), +" + Math.round(away.fans) + " fans");

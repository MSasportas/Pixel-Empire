// =====================================================================
//  BALANCE TEST - a robot plays Pixel Empire really fast.
//  Run it with:   node tools/balance-test.js
//  It prints how long (in play time) each studio level takes, so you
//  can check if the numbers in js/config.js feel right.
//
//  Options (all optional):
//    node tools/balance-test.js <player> <overrides> <stopHours>
//    player:    "good" (plays every mini-game, makes the biggest games,
//               makes sequels) or "casual" (no mini-games, medium games)
//    overrides: JSON to try other numbers, like '{"basePeak":10}'
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
const PLAYER = process.argv[2] || "good";
if (process.argv[3]) Object.assign(CONFIG, JSON.parse(process.argv[3]));
const STOP_HOURS = Number(process.argv[4] || 30);
const GOOD = PLAYER === "good";

// How a person plays:
const CLICK_DELAY = GOOD ? 10 : 30;  // seconds before clicking a waiting step
const THINK = GOOD ? 20 : 45;        // seconds to set up a new game
const SHOP_EVERY = GOOD ? 60 : 180;  // how often they go shopping
const MG_SECONDS = { ideas: 30, code: 30, blocks: 20, bugs: 30, hype: 15 };
const MG_SCORE = 0.8;                // average mini-game score (a few mistakes)

const state = G.newGameState("Robot Studio", 0, null);
let wait = 0, think = 0, busyUntil = 0;
let lastLevel = 1;
const report = [];

function bestGenre() {
  const options = CONFIG.genres.filter(g => G.isUnlocked(state, g) && g.id !== state.lastGenre);
  if (!GOOD) return options[Math.floor(Math.random() * options.length)].id;
  options.sort((a, b) => G.genreStars(state, b.id) * b.pop - G.genreStars(state, a.id) * a.pop);
  return options[0].id;
}
function bestPrice() {
  const unlocked = CONFIG.prices.filter(p => G.isUnlocked(state, p));
  return unlocked[Math.min(2, unlocked.length - 1)].id; // usually $5
}
function bestSize() {
  const sizes = CONFIG.sizes.filter(z => G.isUnlocked(state, z));
  if (GOOD) return sizes[sizes.length - 1].id;
  return sizes[sizes.length - 1].id;
}
function shop() {
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

let t = 0, minigames = 0, sequels = 0;
const trophyAt = {};
for (; t < STOP_HOURS * 3600; t += 1) {
  for (const id in trophyAt) if (typeof trophyAt[id] === "object") trophyAt[id] = (t / 3600).toFixed(2) + " h";
  const free = t >= busyUntil;
  think -= 1;
  if (free && state.projects.length < G.maxProjects(state) && think <= 0) {
    // A good player makes a sequel when a game did well.
    let made = false;
    if (GOOD) {
      const best = state.released.map(g => [g, G.sequelInfo(state, g)]).filter(x => x[1].ready && !x[1].made && x[1].bonus >= 0.5)
        .sort((a, b) => b[1].bonus - a[1].bonus)[0];
      if (best) {
        made = G.startNewGame(state, { name: best[1].name, sequelOf: best[0].id, price: best[0].price, features: state.features, size: bestSize() });
        if (made) sequels++;
      }
    }
    if (!made) G.startNewGame(state, { name: "Game " + t, genre: bestGenre(), price: bestPrice(), features: state.features, size: bestSize() });
    think = THINK;
  }
  wait -= 1;
  if (free && !state.you.projectId && wait <= 0) {
    const p = state.projects.find(x => !x.worker);
    if (p) { G.youStartStep(state, p.id); wait = CLICK_DELAY; }
  }
  // A good player plays a mini-game on any step that can be sped up.
  if (GOOD && t >= busyUntil) {
    const p = state.projects.find(x => G.canSpeedUp(state, x));
    if (p) {
      const type = CONFIG.steps[p.step].minigame;
      p.boostUsed = true;
      busyUntil = t + MG_SECONDS[type];
      p.pendingScore = MG_SCORE;
      p.pendingAt = busyUntil;
      p.pendingStep = p.step;
      p.playing = true;  // the step waits while you play
      minigames++;
    }
  }
  for (const p of state.projects.slice()) {
    if (p.pendingAt === t) {
      p.playing = false;
      if (p.step === p.pendingStep && p.worker) G.applyMinigame(state, p.id, p.pendingScore);
      p.pendingAt = null;
    }
  }
  G.tick(state, 1, true);
  if (t % SHOP_EVERY === 0) shop();
  const lv = G.studioLevel(state);
  if (lv > lastLevel) {
    report.push("Level " + lv + " (" + CONFIG.levels[lv - 1].name + ") at " + (t / 3600).toFixed(2) + " h, games " + state.released.length +
      ", fans " + Math.round(state.fans).toLocaleString() + ", players " + Math.round(state.playersTotal).toLocaleString() + ", money $" + Math.round(state.money).toLocaleString() + ", hires " + state.hires.length);
    lastLevel = lv;
  }
  for (const t of CONFIG.trophies) if (state.trophies[t.id] && !trophyAt[t.id]) trophyAt[t.id] = t;
  if (state.won) break;
}
console.log("Player: " + PLAYER);
console.log(report.join("\n"));
console.log("Hits: " + state.released.filter(g => g.hit).length + " of " + state.released.filter(g => g.judged).length + " checked games");
console.log("Stopped at " + (t / 3600).toFixed(2) + " h with " + Math.round(state.fans).toLocaleString() + " fans, " + state.released.length + " games, " + sequels + " sequels, " + minigames + " mini-games");
console.log("Skills: " + Object.keys(state.skills).map(k => k + " " + state.skills[k].level).join(", "));
const g0 = state.released[0];
if (g0) console.log("Last game: " + g0.stars + " stars, launch " + Math.round(g0.peak).toLocaleString() + " players/s");

console.log("Trophies: " + CONFIG.trophies.map(x => x.id + " " + (trophyAt[x.id] || "-")).join(", "));
// The best game for each star rating: does quality matter?
const byStars = {};
for (const g of state.released) {
  const k = g.stars;
  if (!byStars[k] || g.players > byStars[k].players) byStars[k] = g;
}
for (const k of Object.keys(byStars).sort()) {
  const g = byStars[k];
  console.log("Best " + k + "-star game: " + Math.round(g.players).toLocaleString() + " players, opening weekend " + Math.round(g.opening || 0).toLocaleString() + ", " + g.size + (g.age >= g.lifeDays ? ", obsolete" : ""));
}

// Week away test: leave the game for 7 days and see what you come back to.
const moneyBefore = state.money, fansBefore = state.fans;
state.lastTick = Date.now() - 7 * 24 * 3600 * 1000;
const away = G.catchUp(state);
console.log("Before leaving: $" + Math.round(moneyBefore).toLocaleString() + ", " + Math.round(fansBefore).toLocaleString() + " fans. After a week away: +$" + Math.round(away.money).toLocaleString() + ", +" + Math.round(away.fans).toLocaleString() + " fans");

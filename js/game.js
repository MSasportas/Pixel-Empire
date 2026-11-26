// =====================================================================
//  PIXEL EMPIRE - GAME RULES
//  ---------------------------------------------------------------------
//  This file is the "brain" of the game. It knows the rules: how games
//  get made, how players and fans grow, what things cost. It does NOT
//  draw anything on the screen (that is ui.js).
//
//  Everything about one playthrough is stored in one object called
//  "state". Saving the game just means storing that object.
// =====================================================================

// ----- Small helpers ------------------------------------------------

// Find an item in a list by its id, e.g. byId(CONFIG.genres, "action")
function byId(list, id) {
  return list.find(item => item.id === id);
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// ----- Random names -------------------------------------------------

// A new game name, like "Turbo Llama" or "Penguins vs. Robots".
function randomGameName() {
  const n = pickRandom(CONFIG.gameNouns);
  let n2 = pickRandom(CONFIG.gameNouns);
  while (n2 === n) n2 = pickRandom(CONFIG.gameNouns);
  return pickRandom(CONFIG.gameNamePatterns)
    .replace("{a}", pickRandom(CONFIG.gameAdjectives)).replace("{n2}", n2).replace("{n}", n);
}

function randomHireName() {
  return pickRandom(CONFIG.hireFirstNames) + " " + pickRandom(CONFIG.hireLastNames);
}

// A fan's username, like "TurboQueen42".
function randomFanName() {
  return pickRandom(CONFIG.fanFirst) + pickRandom(CONFIG.fanSecond) + (Math.random() < 0.6 ? Math.floor(Math.random() * 99 + 1) : "");
}

function randomEventName() {
  return pickRandom(CONFIG.eventFirst) + " " + pickRandom(CONFIG.eventSecond);
}

let nextIdCounter = 1;
function makeId() {
  return Date.now().toString(36) + "-" + (nextIdCounter++);
}

// ----- A brand new studio -------------------------------------------

// A random look for a character: { hair, skin, shirt, hairStyle }
function randomLook() {
  return {
    hair: pickRandom(CONFIG.look.hair),
    skin: pickRandom(CONFIG.look.skin),
    shirt: pickRandom(CONFIG.look.shirt),
    hairStyle: Math.floor(Math.random() * 3),
  };
}

// "me" is the character you designed: { name, hair, skin, shirt, hairStyle }
function newGameState(studioName, legacy, me) {
  const skills = {};
  for (const s of CONFIG.skills) skills[s.id] = { level: 1, xp: 0 };

  const supplies = {};
  for (const s of CONFIG.supplies) supplies[s.id] = 0; // 0 = the first (basic) level

  const desks = {};
  for (const step of CONFIG.steps) desks[step.id] = 0;

  const now = Date.now();
  return {
    version: 3,
    scaled: true,
    studioName: studioName || "My Studio",
    createdAt: now,
    lastTick: now,
    playSeconds: 0,       // time actually spent with the game open
    day: 0,               // game days since January 1, Year 1
    money: CONFIG.startMoney,
    fans: 0,
    playersTotal: 0,
    skills: skills,
    engines: ["scratch"], // engines you have learned
    features: [],         // features you have bought
    supplies: supplies,
    desks: desks,
    hires: [],            // { id, name, section, color }
    projects: [],         // games being made right now
    released: [],         // games already out in the world
    me: me || Object.assign({ name: "You" }, randomLook()),
    you: { section: "concept", projectId: null },
    lastGenre: null,
    genreStreak: 0,
    genresTried: {},
    mail: [],
    trophies: {},
    event: null,          // a convention invite, if there is one
    nextEventAt: 0,       // playSeconds when the next invite can arrive
    legacy: legacy || 0,  // how many studios you founded after winning
    guide: 0,             // which step of the first-game guide you're on
    seen: {},             // unlocked things you have already looked at
    won: false,
  };
}

// Older saves are missing some newer parts. This adds them.
function upgradeSave(state) {
  if (!state.scaled) {
    // Saves from before the big rebalance used numbers 25 times smaller.
    state.scaled = true;
    if (state.version === 1) {
      state.money *= 25; state.fans *= 25; state.playersTotal *= 25;
      for (const g of state.released) {
        g.peak *= 25; g.players *= 25;
        g.fadeSeconds = 2000 * (g.fadeSeconds / 600);
      }
    }
  }
  for (const p of state.projects) p.playing = false;   // a mini-game can't still be running
  for (const g of state.released) if (g.sequelHot !== undefined) delete g.sequelHot;
  if (!state.seen) {
    state.seen = {};
    for (const u of unlockedItems(state)) state.seen[u.key] = true;
  }
  for (const g of state.released) {
    if (g.fans === undefined) g.fans = g.players * g.fanRate;
    if (g.money === undefined) g.money = g.players * g.moneyPerPlayer;
  }
  if (state.version < 3) {
    // Version 3: games age in game days (not seconds) and become
    // obsolete one day. Old games keep their place in their life.
    for (const g of state.released) {
      const life = (g.fadeSeconds || 2000) / 2000 * starLife(g.stars || 1);
      g.fadeDays = CONFIG.fadeDays * life;
      g.lifeDays = CONFIG.lifeDays * life;
      g.age = (g.age || 0) / 12;
      delete g.fadeSeconds;
      if (g.opening === undefined) g.opening = 0;
    }
  }
  if (!state.records) state.records = {};
  state.version = 3;
  return state;
}

// ----- Studio level -------------------------------------------------

// Returns 1 for the first level, 6 for AAA.
function studioLevel(state) {
  let level = 1;
  CONFIG.levels.forEach((l, i) => { if (state.fans >= l.fans) level = i + 1; });
  return level;
}

function levelInfo(state) {
  const lv = studioLevel(state);
  return { number: lv, current: CONFIG.levels[lv - 1], next: CONFIG.levels[lv] || null };
}

// ----- Skills -------------------------------------------------------

// Your Engines skill gets a big boost from the best engine you know.
function skillValue(state, skillId) {
  let value = state.skills[skillId].level;
  if (skillId === "engines") value += bestEngine(state).power;
  return value;
}

function bestEngine(state) {
  let best = CONFIG.engines[0];
  for (const e of CONFIG.engines) {
    if (state.engines.includes(e.id) && e.power >= best.power) best = e;
  }
  return best;
}

function trainCost(state, skillId) {
  const level = state.skills[skillId].level;
  return Math.round(CONFIG.trainBaseCost * Math.pow(CONFIG.trainCostGrowth, level - 1));
}

function xpNeeded(level) {
  return CONFIG.xpBase * level;
}

function addXp(state, skillId, amount) {
  const sk = state.skills[skillId];
  sk.xp += amount;
  while (sk.xp >= xpNeeded(sk.level)) {
    sk.xp -= xpNeeded(sk.level);
    sk.level += 1;
  }
}

// ----- Speed --------------------------------------------------------

// 1 = normal speed. 1.5 = 50% faster.
function speedMultiplier(state) {
  let speed = 1;
  for (const s of CONFIG.supplies) speed += s.speed * state.supplies[s.id];
  speed *= 1 + CONFIG.legacySpeedBonus * state.legacy;
  return speed;
}

// How long the current step of a game takes for one person.
// Bigger games take longer.
function stepDuration(state, project) {
  const size = byId(CONFIG.sizes, project.size || "small");
  return CONFIG.devTimeSeconds * size.time * CONFIG.steps[project.step].share / speedMultiplier(state);
}

// How many people are working on a game right now.
function workersOn(project) {
  return (project.worker ? 1 : 0) + (project.helpers ? project.helpers.length : 0);
}

// Seconds left on the current step, with everyone who is working on it.
function stepTimeLeft(state, project) {
  const left = Math.max(0, stepDuration(state, project) - project.progress);
  return left / Math.max(1, workersOn(project));
}

// Is this hire busy (working on or helping with a game)?
function hireIsBusy(state, hireId) {
  return state.projects.some(p => p.worker === hireId || (p.helpers && p.helpers.includes(hireId)));
}

// ----- How good will a game be? -------------------------------------

// "Power" mixes your best skill for this genre with all your skills.
function gamePower(state, genreId) {
  const genre = byId(CONFIG.genres, genreId);
  let total = 0;
  for (const s of CONFIG.skills) total += skillValue(state, s.id);
  const average = total / CONFIG.skills.length;
  return 0.6 * skillValue(state, genre.skill) + 0.4 * average;
}

// Stars: 1 to 5, in half steps. Every star needs double the power.
function starsFor(power) {
  const p = CONFIG.starPowers;
  let stars = 1;
  for (let i = 1; i < p.length; i++) {
    if (power >= p[i]) stars = i + 1;
    else { if (power >= Math.sqrt(p[i - 1] * p[i])) stars = i + 0.5; break; }
  }
  return stars;
}

function genreStars(state, genreId) {
  return starsFor(gamePower(state, genreId));
}

function fanBoost(state) {
  return 1 + Math.pow(state.fans, CONFIG.fanBoostCurve) / CONFIG.fanBoostDivisor;
}

function repeatMultiplier(state, genreId, isSequel) {
  if (isSequel) return 1; // fans want sequels to games they liked
  const repeats = state.lastGenre === genreId ? state.genreStreak : 0;
  return Math.pow(CONFIG.repeatGenrePenalty, repeats);
}

// ----- Sequels ------------------------------------------------------

// What a sequel to this released game would get.
// Only hits can have a sequel (see judgeHit).
function sequelInfo(state, game) {
  const days = game.days || 0;
  const inProgress = state.projects.some(p => p.sequelOf === game.id);
  return {
    judged: !!game.judged,              // has the hit check happened?
    hit: !!game.hit,
    made: !!game.sequelId || inProgress,
    ready: !!game.hit,
    daysLeft: Math.max(0, CONFIG.hitCheckDays - days),
    bonus: game.sequelBonus || 0,       // 0.5 = +50% players at launch
    name: sequelName(game.name),
  };
}

// After a game year, a game is checked: did it win a lot more fans in
// its first year than your last few games did? Then it's a hit!
function judgeHit(state, game) {
  game.judged = true;
  game.fansAtYear = game.fans || 0;
  const history = state.hitHistory || (state.hitHistory = []);
  const recent = history.slice(-CONFIG.hitCompareGames);
  const average = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const ratio = average > 0 ? game.fansAtYear / average : 2;
  history.push(game.fansAtYear);
  if (history.length > 20) history.shift();
  game.hitRatio = ratio;
  game.hit = ratio >= CONFIG.hitRatio && game.fansAtYear > 0;
  if (game.hit) {
    giveTrophy(state, "first_hit", game.name);
    game.sequelBonus = Math.max(CONFIG.sequelMinBonus, Math.min(CONFIG.sequelMaxBonus, ratio - CONFIG.hitRatio + CONFIG.sequelMinBonus));
    if (!game.sequelId) {
      addMail(state, randomFanName(), game.name + " is a HIT! It won " + Math.round(ratio * 10) / 10 + " times as many fans as your recent games. When is " +
        sequelName(game.name) + " coming out?! (Open Games and click Create sequel.)");
    }
  }
}

// "Space Noodle" -> "Space Noodle 2", "Space Noodle 2" -> "Space Noodle 3"
function sequelName(name) {
  const m = name.match(/^(.*?)\s+(\d+)$/);
  if (m) return m[1] + " " + (Number(m[2]) + 1);
  return name + " 2";
}

// Works out the numbers for a game at the moment it launches.
function launchNumbers(state, project) {
  const genre = byId(CONFIG.genres, project.genre);
  const price = byId(CONFIG.prices, project.price);
  const size = byId(CONFIG.sizes, project.size || "small");
  let featReach = 1, featFans = 1, fade = size.fade;
  for (const fid of project.features) {
    const f = byId(CONFIG.features, fid);
    featReach *= f.reach; featFans *= f.fans; fade *= f.fade;
  }
  const power = gamePower(state, project.genre);
  const sequelBoost = 1 + (project.sequelBonus || 0);
  const peak = CONFIG.basePeak * Math.pow(power, CONFIG.powerCurve)
    * genre.pop * price.reach * featReach * size.reach
    * repeatMultiplier(state, project.genre, !!project.sequelOf) * fanBoost(state) * sequelBoost;
  let fanRate = CONFIG.baseFanRate * price.fans * genre.loyal * featFans;
  if (project.bugs) fanRate *= CONFIG.bugFanPenalty;
  const stars = starsFor(power);
  const life = fade * starLife(stars);
  return {
    peak: peak,                         // players per second at launch
    fanRate: Math.min(fanRate, 0.9),    // share of players who become fans
    moneyPerPlayer: price.money,
    fadeDays: CONFIG.fadeDays * life,   // how fast sales fade (game days)
    lifeDays: CONFIG.lifeDays * life,   // when it becomes obsolete (game days)
    power: power,
    stars: stars,
  };
}

// How much longer than usual a game with this many stars keeps selling.
// (Half stars are halfway between.)
function starLife(stars) {
  const t = CONFIG.starLife;
  const i = Math.max(0, Math.min(t.length - 1, stars - 1));
  const lo = Math.floor(i), hi = Math.min(t.length - 1, lo + 1);
  return t[lo] + (t[hi] - t[lo]) * (i - lo);
}

// A game's sales, as a share of its launch-day sales, when it is
// "days" game days old. It fades over time, winds down near the end of
// its life, and is 0 once it's obsolete.
function salesShare(game, days) {
  const life = game.lifeDays;
  if (days >= life) return 0;
  let share = 1 / Math.pow(1 + days / game.fadeDays, CONFIG.fadePower);
  const windStart = life * CONFIG.windDown;
  if (days > windStart) share *= 1 - (days - windStart) / (life - windStart);
  return share;
}

// The average sales share between age a and age b (in game days).
function averageShare(game, a, b) {
  if (b - a < 1e-9) return salesShare(game, a);
  const n = Math.min(200, Math.max(1, Math.ceil((b - a) / 2)));
  const step = (b - a) / n;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += salesShare(game, a + (i + 0.5) * step);
  return sum / n;
}

// How many players a game gets in "seconds" of real play time, starting
// when it's "fromDay" days old. (While playing, a day is secondsPerDay.)
function playersInSeconds(game, fromDay, seconds) {
  return game.peak * seconds * averageShare(game, fromDay, fromDay + seconds / CONFIG.secondsPerDay);
}

function playersPerSecondAt(game, days) {
  return game.peak * salesShare(game, days);
}

function playersPerSecondNow(game) {
  return playersPerSecondAt(game, game.age);
}

// Sales stages: Hot, Steady, Fading, Old, then Obsolete. Returns the
// stage now and how many game days until the next one.
function salesStage(game) {
  if (game.age >= game.lifeDays) return { name: "Obsolete", next: null, daysToNext: null };
  const share = salesShare(game, game.age);
  const stages = CONFIG.salesStages;
  let i = stages.findIndex(st => share >= st.above);
  if (i < 0) i = stages.length - 1;
  const next = stages[i + 1];
  let day;
  if (next) {
    // Step forward until sales drop below this stage.
    day = game.age;
    while (day < game.lifeDays && salesShare(game, day) >= stages[i].above) day += 1;
  } else {
    day = game.lifeDays;
  }
  return { name: stages[i].name, next: next ? next.name : "Obsolete", daysToNext: Math.max(0, day - game.age) };
}

// ----- "What if" numbers for the Store ------------------------------

// The kind of game you usually make: like your last one, or a simple
// $5 Action game if you haven't made one yet.
function usualGame(state) {
  const last = state.released[0];
  if (last) return { genre: last.genre, price: last.price, size: last.size || "small", features: last.features.slice(), name: last.name };
  return { genre: "action", price: "p5", size: "small", features: state.features.slice(), name: null };
}

// Players and fans per second right after launch for a game like this.
function previewLaunch(state, game) {
  const n = launchNumbers(state, { genre: game.genre, price: game.price, size: game.size, features: game.features, bugs: false,
    sequelOf: game.sequelOf, sequelBonus: game.sequelBonus });
  return { players: n.peak, fans: n.peak * n.fanRate, money: n.peak * n.moneyPerPlayer, stars: n.stars, fadeDays: n.fadeDays, lifeDays: n.lifeDays, fanRate: n.fanRate, moneyPerPlayer: n.moneyPerPlayer };
}

// How much a change (like training a skill) would help a game like this.
// "change" changes the state, "undo" puts it back.
function previewChange(state, game, change, undo) {
  const before = previewLaunch(state, game);
  change();
  const after = previewLaunch(state, game);
  undo();
  return { players: after.players - before.players, fans: after.fans - before.fans, money: after.money - before.money };
}

// ----- What is unlocked? --------------------------------------------

function isUnlocked(state, item) {
  return studioLevel(state) >= item.level;
}

// Everything that unlocks with studio levels. "where" says where you find it.
function allUnlockables() {
  const list = [];
  const add = (kind, where, items) => items.forEach(it => list.push({ key: kind + ":" + it.id, kind: kind, where: where, id: it.id, name: it.name || it.label, level: it.level }));
  add("genre", "make", CONFIG.genres);
  add("price", "make", CONFIG.prices);
  add("size", "make", CONFIG.sizes);
  add("engine", "engines", CONFIG.engines);
  add("feature", "features", CONFIG.features);
  CONFIG.levels.forEach((l, i) => {
    if (l.desks > 0) list.push({ key: "desks:" + l.desks, kind: "desks", where: "desks", id: String(l.desks), level: i + 1,
      name: l.desks === 1 ? "Hiring! 1 desk in each section" : l.desks + " desks in each section" });
  });
  return list;
}

// What a studio level unlocks (for the level-up card).
function unlocksAt(level) {
  return allUnlockables().filter(u => u.level === level);
}

function unlockedItems(state) {
  const lv = studioLevel(state);
  return allUnlockables().filter(u => u.level <= lv);
}

// Unlocked things you haven't looked at yet. "where" can be "make",
// "engines", "features", "desks", or "store" for all three Store tabs.
function newUnlocks(state, where) {
  const seen = state.seen || {};
  return unlockedItems(state).filter(u => !seen[u.key] && u.level > 1 &&
    (!where || u.where === where || (where === "store" && u.where !== "make")));
}

function isNewUnlock(state, kind, id) {
  const key = kind + ":" + id;
  return newUnlocks(state).some(u => u.key === key);
}

function markSeen(state, where) {
  if (!state.seen) state.seen = {};
  for (const u of newUnlocks(state, where)) state.seen[u.key] = true;
}

function maxProjects(state) {
  return levelInfo(state).current.games;
}

function desksAllowed(state) {
  return levelInfo(state).current.desks;
}

function deskCost(state, sectionId) {
  return Math.round(CONFIG.deskBaseCost * Math.pow(CONFIG.deskCostGrowth, state.desks[sectionId]));
}

function hireCost(state) {
  return Math.round(CONFIG.hireBaseCost * Math.pow(CONFIG.hireCostGrowth, state.hires.length));
}

function hiresIn(state, sectionId) {
  return state.hires.filter(h => h.section === sectionId);
}

function supplyCost(state, supplyId) {
  const s = byId(CONFIG.supplies, supplyId);
  return s.costs[state.supplies[supplyId]]; // undefined when maxed out
}

// =====================================================================
//  ACTIONS - things the player does. Each returns true if it worked.
// =====================================================================

function spend(state, amount) {
  if (state.money < amount) return false;
  state.money -= amount;
  return true;
}

function startNewGame(state, details) {
  if (state.projects.length >= maxProjects(state)) return false;
  if (details.sequelOf) {
    const original = state.released.find(g => g.id === details.sequelOf);
    if (!original) return false;
    const info = sequelInfo(state, original);
    if (info.made || !info.ready) return false;
    details = Object.assign({}, details, { genre: original.genre, sequelBonus: info.bonus });
  }
  state.projects.push({
    id: makeId(),
    name: details.name,
    genre: details.genre,
    price: details.price,
    features: details.features.slice(),
    size: details.size || "small",
    sequelOf: details.sequelOf || null,   // the game this is a sequel to
    sequelBonus: details.sequelBonus || 0,
    helpers: [],          // hires helping on this step
    step: 0,
    progress: 0,          // seconds of work done on this step
    worker: null,         // "you", a hire id, or null (waiting)
    bugs: false,
    boost: 0,             // extra progress from mini-games
  });
  return true;
}

// You walk to a section and start working on a waiting game there.
function youStartStep(state, projectId) {
  if (state.you.projectId) return false;
  const p = state.projects.find(x => x.id === projectId);
  if (!p || p.worker) return false;
  p.worker = "you";
  state.you.projectId = p.id;
  state.you.section = CONFIG.steps[p.step].id;
  return true;
}

function skipTesting(state, projectId) {
  const p = state.projects.find(x => x.id === projectId);
  if (!p || CONFIG.steps[p.step].id !== "testing" || p.worker) return false;
  p.helpers = [];
  p.bugs = true;
  p.step += 1;
  p.progress = 0;
  return true;
}

function trainSkill(state, skillId) {
  if (!spend(state, trainCost(state, skillId))) return false;
  state.skills[skillId].level += 1;
  return true;
}

function learnEngine(state, engineId) {
  const e = byId(CONFIG.engines, engineId);
  if (state.engines.includes(e.id) || !isUnlocked(state, e)) return false;
  if (!spend(state, e.cost)) return false;
  state.engines.push(e.id);
  addMail(state, "Engine school", "You learned " + e.name + "! It's good for: " + e.good);
  return true;
}

function buyFeature(state, featureId) {
  const f = byId(CONFIG.features, featureId);
  if (state.features.includes(f.id) || !isUnlocked(state, f)) return false;
  if (!spend(state, f.cost)) return false;
  state.features.push(f.id);
  return true;
}

function buyDesk(state, sectionId) {
  if (state.desks[sectionId] >= desksAllowed(state)) return false;
  if (!spend(state, deskCost(state, sectionId))) return false;
  state.desks[sectionId] += 1;
  return true;
}

function hire(state, sectionId) {
  if (studioLevel(state) < 2) return false;
  if (hiresIn(state, sectionId).length >= state.desks[sectionId]) return false; // no free desk
  if (!spend(state, hireCost(state))) return false;
  const step = byId(CONFIG.steps, sectionId);
  const person = {
    id: makeId(),
    name: randomHireName(),
    section: sectionId,
    job: step.job,
    look: randomLook(),
  };
  state.hires.push(person);
  addMail(state, person.name, "Hi boss! I'm your new " + person.job + ". I'll work in " + step.name + ".");
  giveTrophy(state, "first_hire");
  checkFullOffice(state);
  return true;
}

function renameHire(state, hireId, newName) {
  const h = state.hires.find(x => x.id === hireId);
  const name = (newName || "").trim().slice(0, 20);
  if (!h || !name) return false;
  h.name = name;
  return true;
}

function upgradeSupply(state, supplyId) {
  const cost = supplyCost(state, supplyId);
  if (cost === undefined) return false;
  if (!spend(state, cost)) return false;
  state.supplies[supplyId] += 1;
  return true;
}

// Can you play a mini-game to speed up this game's step right now?
// Yes if someone is working on it and nobody played one on this step yet.
function canSpeedUp(state, project) {
  const step = CONFIG.steps[project.step];
  return !!(project.worker && step.minigame && !project.boostUsed);
}

// A mini-game's score (0 to 1) finishes that much of the work left.
// A perfect score (1) finishes the whole step.
function applyMinigame(state, projectId, score) {
  const p = state.projects.find(x => x.id === projectId);
  if (!p) return;
  const left = Math.max(0, stepDuration(state, p) - p.progress);
  p.progress += left * Math.max(0, Math.min(1, score));
  if (p.progress >= stepDuration(state, p) - 0.001) finishStep(state, p);
}

function acceptEvent(state, gameId) {
  if (!state.event) return false;
  const game = state.released.find(g => g.id === gameId);
  if (!game) return false;
  // The game feels brand new again: a burst of new players.
  // Work out what that adds over the next game year, to tell you.
  const year = CONFIG.hitCheckDays * CONFIG.secondsPerDay;
  const before = { rate: playersPerSecondNow(game), year: playersInSeconds(game, game.age, year) };
  const oldAge = game.age;
  game.age = 0;
  const after = { rate: playersPerSecondNow(game), year: playersInSeconds(game, 0, year) };
  const extra = Math.max(0, after.year - before.year);
  const result = {
    event: state.event.name, game: game.name,
    rateBefore: before.rate, rateAfter: after.rate,
    players: extra, money: extra * game.moneyPerPlayer, fans: extra * game.fanRate, wasAge: oldAge,
  };
  addMail(state, state.event.name, "Everyone loved playing " + game.name + " at " + state.event.name + "! It's selling like it just came out: " +
    Math.round(after.rate * 60).toLocaleString("en-US") + " players a minute instead of " + Math.round(before.rate * 60).toLocaleString("en-US") +
    ". Over the next year that's about " + Math.round(extra).toLocaleString("en-US") + " extra players, $" + Math.round(result.money).toLocaleString("en-US") +
    " and " + Math.round(result.fans).toLocaleString("en-US") + " fans.");
  state.event = null;
  giveTrophy(state, "first_con");
  return result;
}

function declineEvent(state) {
  state.event = null;
}

// =====================================================================
//  MAIL AND TROPHIES
// =====================================================================

function addMail(state, from, text) {
  state.mail.unshift({ id: makeId(), from: from, text: text, read: false });
  if (state.mail.length > 60) state.mail.length = 60;
}

function deleteMail(state, mailId) {
  state.mail = state.mail.filter(m => m.id !== mailId);
}

function deleteReadMail(state) {
  state.mail = state.mail.filter(m => !m.read);
}

function giveTrophy(state, trophyId, gameName) {
  if (state.trophies[trophyId]) return;
  const t = byId(CONFIG.trophies, trophyId);
  state.trophies[trophyId] = true;
  state.money += t.reward;
  addMail(state, "Trophy room", "Trophy won: " + t.name + (gameName ? " (" + gameName + ")" : "") + "! Reward: $" + t.reward.toLocaleString());
}

// Records and trophies for a single game: opening weekend, players,
// money, stars and how long it keeps selling.
function gameStat(g, stat) {
  if (stat === "opening") return g.opening || 0;
  if (stat === "players") return g.players || 0;
  if (stat === "money") return g.money || 0;
  if (stat === "stars") return g.stars || 0;
  if (stat === "years") return g.age < g.lifeDays ? (g.age || 0) / 360 : 0;
  return 0;
}

function checkGameTrophies(state, g) {
  if (!state.records) state.records = {};
  for (const stat of ["opening", "players", "money"]) {
    const v = gameStat(g, stat);
    const r = state.records[stat];
    if (!r || v > r.value) state.records[stat] = { value: v, game: g.name };
  }
  for (const t of CONFIG.trophies) {
    if (t.stat && !state.trophies[t.id] && gameStat(g, t.stat) >= t.goal) giveTrophy(state, t.id, g.name);
  }
}

// Your best number so far for a game trophy, to show how close you are.
function bestGameStat(state, stat) {
  let best = 0;
  for (const g of state.released) best = Math.max(best, gameStat(g, stat));
  return best;
}

function checkFullOffice(state) {
  const max = CONFIG.levels[CONFIG.levels.length - 1].desks;
  const full = CONFIG.steps.every(s => hiresIn(state, s.id).length >= max);
  if (full) giveTrophy(state, "full_office");
}


// Fan mail gives hints about what went well or badly.
function fanMailFor(state, project, numbers, repeats) {
  const genre = byId(CONFIG.genres, project.genre);
  const from = randomFanName();
  if (project.bugs) {
    addMail(state, from, pickRandom([
      "Did they even test " + project.name + " before launch? I fell through the floor!",
      project.name + " crashed three times. So many bugs!",
    ]));
  } else if (repeats >= 1) {
    addMail(state, from, "Another " + genre.name.toLowerCase() + " game? I want something new!");
  } else if (skillValue(state, genre.skill) < gamePower(state, project.genre) * 0.8) {
    const skill = byId(CONFIG.skills, genre.skill);
    addMail(state, from, "I liked " + project.name + ", but the " + skill.name.toLowerCase() + " felt a bit basic.");
  } else if (project.price === "free") {
    addMail(state, from, project.name + " is free? Awesome, all my friends are trying it!");
  } else {
    addMail(state, from, pickRandom([
      "I can't stop playing " + project.name + "!",
      project.name + " is my new favorite game. Make more!",
      "Loved " + project.name + ". When is the next one coming?",
    ]));
  }
}

// =====================================================================
//  TICK - moves time forward by "seconds".
//  "online" is false when we are catching up on time spent away.
// =====================================================================

function tick(state, seconds, online) {
  const share = online ? 1 : CONFIG.awayShare;
  // Games get older by game days: quickly while you play, slowly while away.
  const days = seconds / (online ? CONFIG.secondsPerDay : CONFIG.awaySecondsPerDay);
  if (online) {
    state.playSeconds += seconds;
    passDays(state, seconds / CONFIG.secondsPerDay);
  }

  // 1. Free hires pick up waiting work in their own section. If nothing
  //    is waiting, they help on the game with the most work left there.
  for (const h of state.hires) {
    if (hireIsBusy(state, h.id)) continue;
    const here = state.projects.filter(p => CONFIG.steps[p.step].id === h.section);
    const waiting = here.find(p => !p.worker);
    if (waiting) { waiting.worker = h.id; continue; }
    let best = null;
    for (const p of here) {
      if (!p.helpers) p.helpers = [];
      if (!best || stepTimeLeft(state, p) > stepTimeLeft(state, best)) best = p;
    }
    if (best && stepTimeLeft(state, best) > 5) best.helpers.push(h.id);
  }

  // 2. Work on games in progress. Every person working adds speed.
  for (const p of state.projects.slice()) {
    if (!p.worker || p.playing) continue;   // the step waits while you play its mini-game
    p.progress += seconds * workersOn(p);
    if (p.progress >= stepDuration(state, p)) finishStep(state, p);
  }

  // 3. Released games bring in players, fans and money.
  let newPlayers = 0, newFans = 0, newMoney = 0;
  for (const g of state.released) {
    if (g.age >= g.lifeDays) { g.age += days; continue; }   // obsolete: nobody buys it now
    const players = g.peak * seconds * averageShare(g, g.age, g.age + days);
    // Opening weekend: the players a game gets in its first 3 game days
    // (only counted while you're playing, like a real launch).
    if (online && g.age < CONFIG.openingDays) g.opening = (g.opening || 0) + players;
    g.age += days;
    g.players += players * share;
    g.fans = (g.fans || 0) + players * g.fanRate * share;
    g.money = (g.money || 0) + players * g.moneyPerPlayer * share;
    newPlayers += players * share;
    newFans += players * g.fanRate * share;
    newMoney += players * g.moneyPerPlayer * share;
    checkGameTrophies(state, g);
  }
  state.playersTotal += newPlayers;
  state.fans += newFans;
  state.money += newMoney;

  // 4. Trophies for fans, and winning.
  for (const t of CONFIG.trophies) {
    if (t.fans && state.fans >= t.fans) giveTrophy(state, t.id);
  }
  if (!state.won && state.fans >= CONFIG.winFans) {
    state.won = true;
    state.justWon = true;
    addMail(state, "Pixel Empire News", state.studioName + " is now a AAA studio! What a legendary launch!");
  }

  // 5. Convention invites (only while playing).
  if (online) updateEvent(state);

  return { players: newPlayers, fans: newFans, money: newMoney };
}

// Moves the calendar forward, and makes every released game older.
function passDays(state, days) {
  state.day = (state.day || 0) + days;
  // Oldest games first, so each game is compared with the ones before it.
  for (let i = state.released.length - 1; i >= 0; i--) {
    const g = state.released[i];
    g.days = (g.days || 0) + days;
    if (!g.judged && g.days >= CONFIG.hitCheckDays) judgeHit(state, g);
  }
}

function finishStep(state, p) {
  if (p.worker === "you") state.you.projectId = null;
  p.worker = null;
  p.helpers = [];
  p.progress = 0;
  p.boost = 0;
  p.boostUsed = false;
  const stepId = CONFIG.steps[p.step].id;
  if (stepId === "launch") {
    releaseGame(state, p);
  } else {
    p.step += 1;
  }
}

function releaseGame(state, p) {
  const repeats = state.lastGenre === p.genre ? state.genreStreak : 0;
  const numbers = launchNumbers(state, p);
  state.released.unshift({
    id: p.id, name: p.name, genre: p.genre, price: p.price, features: p.features, size: p.size || "small",
    bugs: p.bugs, peak: numbers.peak, fanRate: numbers.fanRate,
    moneyPerPlayer: numbers.moneyPerPlayer, fadeDays: numbers.fadeDays, lifeDays: numbers.lifeDays,
    age: 0, players: 0, fans: 0, money: 0, launchedAt: state.playSeconds, days: 0, launchDay: state.day || 0,
    stars: numbers.stars, sequelOf: p.sequelOf || null, sequelId: null,
  });
  if (p.sequelOf) {
    const original = state.released.find(g => g.id === p.sequelOf);
    if (original) original.sequelId = p.id;
    giveTrophy(state, "first_sequel");
  }
  state.projects = state.projects.filter(x => x.id !== p.id);

  // Variety: count repeats of the same genre in a row.
  if (state.lastGenre === p.genre) state.genreStreak += 1;
  else { state.lastGenre = p.genre; state.genreStreak = 1; }
  state.genresTried[p.genre] = true;

  // Skill points.
  const mainSkill = byId(CONFIG.genres, p.genre).skill;
  for (const s of CONFIG.skills) {
    addXp(state, s.id, s.id === mainSkill ? CONFIG.xpMainSkill : CONFIG.xpOtherSkill);
  }

  fanMailFor(state, p, numbers, repeats);
  giveTrophy(state, "first_game");
  checkGameTrophies(state, state.released[0]);
  if (CONFIG.genres.every(g => state.genresTried[g.id])) giveTrophy(state, "all_genres");
}

function updateEvent(state) {
  if (studioLevel(state) < CONFIG.eventFirstLevel || state.released.length === 0) return;
  if (state.event && state.playSeconds > state.event.expiresAt) {
    state.event = null;
  }
  if (!state.event && state.nextEventAt === 0) {
    state.nextEventAt = state.playSeconds + CONFIG.eventEverySeconds;
  }
  if (!state.event && state.playSeconds >= state.nextEventAt) {
    const name = randomEventName();
    state.event = { name: name, expiresAt: state.playSeconds + CONFIG.eventExpireSeconds };
    state.nextEventAt = state.playSeconds + CONFIG.eventEverySeconds * (0.75 + Math.random() * 0.5);
    addMail(state, name, "You're invited to " + name + "! Pick one of your games to show off for a burst of new players.");
  }
}

// =====================================================================
//  COMING BACK AFTER TIME AWAY
// =====================================================================

// The cheapest thing you could buy right now.
function cheapestUpgrade(state) {
  const costs = [];
  for (const s of CONFIG.skills) costs.push(trainCost(state, s.id));
  for (const s of CONFIG.supplies) { const c = supplyCost(state, s.id); if (c !== undefined) costs.push(c); }
  return Math.min.apply(null, costs);
}

// Catches up on time spent away. Returns a summary for the
// "While you were away" card, or null if you were barely gone.
function catchUp(state) {
  const now = Date.now();
  let away = (now - state.lastTick) / 1000;
  state.lastTick = now;
  if (away < 10) return null;
  away = Math.min(away, CONFIG.maxAwaySeconds);

  const before = { money: state.money, fans: state.fans, players: state.playersTotal };
  // Move time forward in chunks so hires keep working while you're away.
  const chunk = 30;
  let left = away;
  while (left > 0) {
    const s = Math.min(chunk, left);
    tick(state, s, false);
    left -= s;
  }

  // The calendar moves on more slowly while you're away.
  const daysAway = away / CONFIG.awaySecondsPerDay;
  passDays(state, daysAway);

  // Hard rule: after a long time away, you can always afford one upgrade.
  let bonus = 0;
  if (away >= CONFIG.welcomeBackAfterSeconds) {
    bonus = CONFIG.welcomeBackMinBonus;
    const need = cheapestUpgrade(state) - (state.money + bonus);
    if (need > 0) bonus += Math.ceil(need);
    state.money += bonus;
  }

  return {
    seconds: away,
    days: daysAway,
    money: state.money - before.money - bonus,
    fans: state.fans - before.fans,
    players: state.playersTotal - before.players,
    bonus: bonus,
  };
}

// =====================================================================
//  SAVE SLOTS (stored in the browser with localStorage)
// =====================================================================

const SAVE_KEY = "pixelEmpire.slot.";

function saveGame(state, slot) {
  try {
    state.lastTick = Date.now();
    localStorage.setItem(SAVE_KEY + slot, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

function loadGame(slot) {
  try {
    const text = localStorage.getItem(SAVE_KEY + slot);
    return text ? JSON.parse(text) : null;
  } catch (e) {
    return null;
  }
}

function deleteSave(slot) {
  try { localStorage.removeItem(SAVE_KEY + slot); } catch (e) { /* ignore */ }
}

// Turns a save into text you can copy, and back again.
function exportSave(state) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

function importSave(text) {
  try {
    const state = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
    if (!state || !state.skills || state.money === undefined) return null;
    return state;
  } catch (e) {
    return null;
  }
}

// Lets the balance test (tools/balance-test.js) use this file in Node.
if (typeof module !== "undefined") {
  module.exports = { randomGameName, judgeHit, newGameState, upgradeSave, sequelInfo, canSpeedUp, applyMinigame, genreStars, previewLaunch, gamePower, launchNumbers, tick, startNewGame, youStartStep, skipTesting, trainSkill,
    learnEngine, buyFeature, buyDesk, hire, upgradeSupply, studioLevel, trainCost, deskCost,
    hireCost, supplyCost, desksAllowed, hiresIn, isUnlocked, maxProjects, skillValue, catchUp,
    byId, levelInfo, acceptEvent };
}

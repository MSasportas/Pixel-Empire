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
    version: 1,
    studioName: studioName || "My Studio",
    createdAt: now,
    lastTick: now,
    playSeconds: 0,       // time actually spent with the game open
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
    won: false,
  };
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

function fanBoost(state) {
  return 1 + Math.pow(state.fans, CONFIG.fanBoostCurve) / CONFIG.fanBoostDivisor;
}

function repeatMultiplier(state, genreId) {
  const repeats = state.lastGenre === genreId ? state.genreStreak : 0;
  return Math.pow(CONFIG.repeatGenrePenalty, repeats);
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
  const peak = CONFIG.basePeak * Math.pow(power, CONFIG.powerCurve)
    * genre.pop * price.reach * featReach * size.reach
    * repeatMultiplier(state, project.genre) * fanBoost(state);
  let fanRate = CONFIG.baseFanRate * price.fans * genre.loyal * featFans;
  if (project.bugs) fanRate *= CONFIG.bugFanPenalty;
  return {
    peak: peak,                         // players per second at launch
    fanRate: Math.min(fanRate, 0.9),    // share of players who become fans
    moneyPerPlayer: price.money,
    fadeSeconds: CONFIG.fadeSeconds * fade,
    power: power,
  };
}

// How many players a released game gets between age a and age b
// (in seconds). Sales fade: rate = peak / (1 + age / fade) ^ fadePower.
// (This is the area under the "players per second" curve.)
function playersBetween(game, a, b) {
  const f = game.fadeSeconds, q = 1 - CONFIG.fadePower;
  return game.peak * f / q * (Math.pow(1 + b / f, q) - Math.pow(1 + a / f, q));
}

function playersPerSecondNow(game) {
  return game.peak / Math.pow(1 + game.age / game.fadeSeconds, CONFIG.fadePower);
}

// Sales stages: Hot, Steady, Fading, Old. Returns the stage now and
// how many seconds until the next one (null if it's already Old).
function salesStage(game) {
  const share = playersPerSecondNow(game) / game.peak;
  const stages = CONFIG.salesStages;
  let i = stages.findIndex(st => share >= st.above);
  if (i < 0) i = stages.length - 1;
  const next = stages[i + 1];
  let secondsToNext = null;
  if (next) {
    // The age when sales drop to the next stage's share of the peak.
    const ageAtNext = game.fadeSeconds * (Math.pow(stages[i].above, -1 / CONFIG.fadePower) - 1);
    secondsToNext = Math.max(0, ageAtNext - game.age);
  }
  return { name: stages[i].name, next: next ? next.name : null, secondsToNext: secondsToNext };
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
  const n = launchNumbers(state, { genre: game.genre, price: game.price, size: game.size, features: game.features, bugs: false });
  return { players: n.peak, fans: n.peak * n.fanRate, money: n.peak * n.moneyPerPlayer };
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

function maxProjects(state) {
  return 1 + state.hires.length;
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
  state.projects.push({
    id: makeId(),
    name: details.name,
    genre: details.genre,
    price: details.price,
    features: details.features.slice(),
    size: details.size || "small",
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
  addMail(state, "Engine school", "You learned " + e.name + "! " + e.fact);
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
    name: pickRandom(CONFIG.hireFirstNames) + " " + pickRandom(CONFIG.hireLastNames),
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

// Each mini-game hit finishes a bit more of the step (up to a limit).
function applyMinigame(state, projectId, hits) {
  const p = state.projects.find(x => x.id === projectId);
  if (!p) return;
  const maxBoost = CONFIG.minigameMaxSpeed * stepDuration(state, p);
  const extra = Math.min(hits * CONFIG.minigameSpeedPerHit * stepDuration(state, p), maxBoost - p.boost);
  if (extra <= 0) return;
  p.boost += extra;
  p.progress += extra;
}

function acceptEvent(state, gameId) {
  if (!state.event) return false;
  const game = state.released.find(g => g.id === gameId);
  if (!game) return false;
  // The game feels brand new again: a burst of new players.
  game.age = 0;
  addMail(state, state.event.name, "Everyone loved playing " + game.name + " at " + state.event.name + "! New players are pouring in.");
  state.event = null;
  giveTrophy(state, "first_con");
  return true;
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

function giveTrophy(state, trophyId) {
  if (state.trophies[trophyId]) return;
  const t = byId(CONFIG.trophies, trophyId);
  state.trophies[trophyId] = true;
  state.money += t.reward;
  addMail(state, "Trophy room", "Trophy won: " + t.name + "! Reward: $" + t.reward.toLocaleString());
}

function checkFullOffice(state) {
  const max = CONFIG.levels[CONFIG.levels.length - 1].desks;
  const full = CONFIG.steps.every(s => hiresIn(state, s.id).length >= max);
  if (full) giveTrophy(state, "full_office");
}

const FAN_NAMES = ["GamerKid99", "PixelPal", "LlamaFan", "SpeedyRunner", "RetroRita", "BossBattler", "CoinCollector", "NoobMaster", "JumpQueen", "Sir Clicks-a-lot"];

// Fan mail gives hints about what went well or badly.
function fanMailFor(state, project, numbers, repeats) {
  const genre = byId(CONFIG.genres, project.genre);
  const from = pickRandom(FAN_NAMES);
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
  if (online) state.playSeconds += seconds;

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
    if (!p.worker) continue;
    p.progress += seconds * workersOn(p);
    if (p.progress >= stepDuration(state, p)) finishStep(state, p);
  }

  // 3. Released games bring in players, fans and money.
  let newPlayers = 0, newFans = 0, newMoney = 0;
  for (const g of state.released) {
    const players = playersBetween(g, g.age, g.age + seconds);
    g.age += seconds;
    g.players += players * share;
    newPlayers += players * share;
    newFans += players * g.fanRate * share;
    newMoney += players * g.moneyPerPlayer * share;
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
    moneyPerPlayer: numbers.moneyPerPlayer, fadeSeconds: numbers.fadeSeconds,
    age: 0, players: 0, launchedAt: state.playSeconds,
  });
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
  if (!p.bugs) giveTrophy(state, "no_bugs");
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
    const name = pickRandom(CONFIG.eventNames);
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
  module.exports = { newGameState, tick, startNewGame, youStartStep, skipTesting, trainSkill,
    learnEngine, buyFeature, buyDesk, hire, upgradeSupply, studioLevel, trainCost, deskCost,
    hireCost, supplyCost, desksAllowed, hiresIn, isUnlocked, maxProjects, skillValue, catchUp,
    byId, levelInfo, acceptEvent };
}

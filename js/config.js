// =====================================================================
//  PIXEL EMPIRE - CONFIG
//  ---------------------------------------------------------------------
//  This is the "settings" file. Almost every number in the game lives
//  here, so you can change how the game feels without touching the
//  rest of the code.
//
//  Try it! Change a number, save the file, and reload the page.
//  For example: make CONFIG.devTimeSeconds smaller and games get made
//  faster.
// =====================================================================

const CONFIG = {

  // ----- Starting the game ------------------------------------------
  startMoney: 10000,

  // How many fans you need to win (become a AAA studio).
  winFans: 25000000,

  // ----- Making a game ----------------------------------------------
  // How long one game takes to make, in seconds, before any speed-ups.
  devTimeSeconds: 360,

  // The five real steps. "share" is how much of the time each step takes.
  steps: [
  // "color" is the section's neon color in the office.
    { id: "concept",    name: "Concept",        share: 0.05, verb: "Start concept",        job: "Game Designer",  minigame: "ideas",  color: "#ffd23f" },
    { id: "preprod",    name: "Pre-production", share: 0.15, verb: "Start pre-production", job: "Game Designer",  minigame: "code",   color: "#ff7a3d" },
    { id: "production", name: "Production",     share: 0.60, verb: "Start production",     job: "Programmer",     minigame: "blocks", color: "#2ee6ff" },
    { id: "testing",    name: "Testing",        share: 0.15, verb: "Start testing",        job: "QA Tester",      minigame: "bugs",   color: "#7cff6b" },
    { id: "launch",     name: "Launch",         share: 0.05, verb: "Launch it!",           job: "Producer",       minigame: null,     color: "#ff3ea5" },
  ],

  // Game sizes. Bigger games take longer to make ("time" times longer),
  // but reach more players and keep selling for longer ("fade").
  // Hires in a section help on big games, so a full team makes them faster.
  sizes: [
    { id: "small",  label: "Small",  level: 1, time: 1,  reach: 1,  fade: 1,
      hint: "Small: quick to make. A good way to try a new idea." },
    { id: "medium", label: "Medium", level: 1, time: 3,  reach: 2.6, fade: 1.2,
      hint: "Medium: takes 3 times as long, but reaches more players and sells for longer." },
    { id: "big",    label: "Big",    level: 3, time: 10, reach: 7, fade: 1.4,
      hint: "Big: takes 10 times as long as small. Hires in each section help to finish it faster." },
    { id: "huge",   label: "Huge",   level: 4, time: 30, reach: 17, fade: 1.8,
      hint: "Huge: a giant game, 30 times as long as small. You need a full team. It reaches lots of players and sells for a long time." },
  ],

  // Mini-games: you can play one on every step of every game (once per
  // step), even when a hire is doing the work.
  // A perfect game (no mistakes, everything done) finishes the whole step.
  // Each mistake takes away "minigameMistake" (0.2 = 20%).
  minigameMistake: 0.2,

  // ----- Studio levels ----------------------------------------------
  // "desks" = how many hire desks each section can have at this level.
  // Hires help finish games faster.
  levels: [
  // "games" = how many games you can make at the same time.
    { name: "Solo Developer",   fans: 0,        desks: 0, games: 1 },
    { name: "Indie Studio",     fans: 15000,    desks: 1, games: 2 },
    { name: "Small Studio",     fans: 250000,   desks: 2, games: 2 },
    { name: "Growing Studio",   fans: 2500000,  desks: 3, games: 3 },
    { name: "Big Studio",       fans: 10000000, desks: 4, games: 3 },
    { name: "AAA Studio",       fans: 25000000, desks: 5, games: 4 },
  ],

  // ----- Skills -----------------------------------------------------
  skills: [
    { id: "programming", name: "Programming", color: "#4f8cff" },
    { id: "design",      name: "Design",      color: "#ff9f43" },
    { id: "art",         name: "Art",         color: "#ee5ea0" },
    { id: "sound",       name: "Sound",       color: "#2ecc9a" },
    { id: "engines",     name: "Engines",     color: "#a06cff" },
  ],
  // Money cost to train a skill from level L to L+1 = base * growth^(L-1)
  trainBaseCost: 25000,
  trainCostGrowth: 2.4,
  // Skill points (XP) from releasing a game.
  xpMainSkill: 60,   // the genre's main skill
  xpOtherSkill: 15,  // every other skill
  // XP needed to go from level L to L+1 = xpBase * L
  xpBase: 250,

  // ----- Genres -----------------------------------------------------
  // pop = how many players it reaches. loyal = how many become fans.
  genres: [
    { id: "action",    name: "Action",           skill: "programming", level: 1, pop: 1.2, loyal: 0.9, about: "Fast moves and quick reactions." },
    { id: "adventure", name: "Adventure",        skill: "art",         level: 1, pop: 1.0, loyal: 1.0, about: "Explore a world and follow a story." },
    { id: "strategy",  name: "Strategy",         skill: "design",      level: 1, pop: 0.8, loyal: 1.3, about: "Plan and think ahead to win." },
    { id: "platformer",name: "Platformer",       skill: "art",         level: 2, pop: 1.1, loyal: 1.0, about: "Run and jump between platforms." },
    { id: "music",     name: "Music and rhythm", skill: "sound",       level: 3, pop: 0.7, loyal: 1.5, about: "Tap along to the beat." },
    { id: "sports",    name: "Sports",           skill: "programming", level: 4, pop: 1.3, loyal: 0.9, about: "Real sports, including racing." },
    { id: "shooter",   name: "Shooter",          skill: "engines",     level: 5, pop: 1.5, loyal: 0.8, about: "Aim and shoot." },
  ],
  // Making the same genre again: each repeat multiplies players by this.
  repeatGenrePenalty: 0.7,

  // ----- Prices -----------------------------------------------------
  // reach = players, fans = share who become fans, money = $ per player
  prices: [
    { id: "free", label: "Free", level: 1, reach: 2.5,  fans: 0.35, money: 0.1,
      hint: "Free: lots of people will try it, but fewer will become fans. You earn a little from ads." },
    { id: "p1",   label: "$1",   level: 1, reach: 1.6,  fans: 0.7,  money: 1,
      hint: "$1: many people will buy it, and quite a few become fans." },
    { id: "p5",   label: "$5",   level: 1, reach: 1.0,  fans: 1.0,  money: 5,
      hint: "$5: a fair price. Fewer players than $1, but more money and more fans per player." },
    { id: "p20",  label: "$20",  level: 3, reach: 0.6,  fans: 1.4,  money: 20,
      hint: "$20: fewer players, but the ones who buy it really care. Lots of money per player." },
    { id: "p60",  label: "$60",  level: 4, reach: 0.35, fans: 1.8,  money: 60,
      hint: "$60: a big, full-price game. Not many buy it, but they become loyal fans and you earn a lot." },
  ],

  // ----- Features ---------------------------------------------------
  // Bought once in the Store, then you can tick them on any game.
  features: [
    { id: "save",        name: "Save system",          level: 1, cost: 62500,
      reach: 1.0,  fans: 1.15, fade: 1, hint: "Players can save their progress. A few more players become fans." },
    { id: "coop",        name: "Local co-op",          level: 2, cost: 625000,
      reach: 1.05, fans: 1.3,  fade: 1, hint: "Two friends play on one computer. More players become fans." },
    { id: "leaderboard", name: "Online leaderboards",  level: 3, cost: 5000000,
      reach: 1.25, fans: 1.05, fade: 1, hint: "Players compare scores and share the game a bit." },
    { id: "multiplayer", name: "Online multiplayer",   level: 4, cost: 37500000,
      reach: 1.4,  fans: 1.6,  fade: 1, hint: "The biggest boost! Fans bring their friends fast." },
    { id: "updates",     name: "Updates after launch", level: 4, cost: 75000000,
      reach: 1.0,  fans: 1.1,  fade: 2, hint: "You keep fixing and adding things, so sales fade more slowly." },
    { id: "cross",       name: "Cross-platform",       level: 5, cost: 375000000,
      reach: 1.6,  fans: 1.0,  fade: 1, hint: "The game runs on computers, consoles and phones. Reaches more players." },
  ],

  // ----- Engines ----------------------------------------------------
  // power is added to your Engines skill once you learn the engine.
  engines: [
    { id: "scratch",   name: "Scratch",       level: 1, cost: 0,       power: 0,  good: "Learning to code by snapping blocks together." },
    { id: "gamemaker", name: "GameMaker",     level: 2, cost: 500000,    power: 3,  good: "Fast 2D games." },
    { id: "godot",     name: "Godot",         level: 3, cost: 5000000,   power: 7,  good: "Free 2D and simple 3D games." },
    { id: "unity",     name: "Unity",         level: 4, cost: 50000000,  power: 12, good: "3D and mobile games." },
    { id: "unreal",    name: "Unreal Engine", level: 5, cost: 375000000, power: 20, good: "Huge, realistic 3D worlds." },
  ],

  // ----- How many players a game gets -------------------------------
  // players per second right after launch =
  //   basePeak * power^powerCurve * genre * price * features * repeat * fanBoost
  basePeak: 10,
  powerCurve: 1.1,
  // fanBoost = 1 + (fans ^ fanBoostCurve) / fanBoostDivisor
  fanBoostCurve: 0.5,
  fanBoostDivisor: 15000,
  // Share of players who become fans (before price, genre, features).
  baseFanRate: 0.12,

  // ----- Stars ------------------------------------------------------
  // How good a game is, from 1 to 5 stars. It comes from "power" (your
  // skills). Every extra star needs double the power, and a game with
  // one more star gets about twice as many players.
  //   1 star = power 1, 2 stars = 2, 3 stars = 4, 4 stars = 8, 5 stars = 16
  starPowers: [1, 2, 4, 8, 16],

  // ----- Sequels ----------------------------------------------------
  // A released game can get a sequel (like "Space Noodle 2") once it has
  // been out for "sequelAfterDays" game days. The sequel launches with
  // extra players: more if the first game won lots of your fans.
  sequelAfterDays: 30,
  sequelMaxBonus: 1.5,       // up to +150% players at launch
  sequelFullShare: 0.25,     // the first game made 25% of your fans = full bonus
  // Skipping testing: this share of fans compared to a tested game.
  bugFanPenalty: 0.5,
  // Sales fade: players per second =
  //   peak * (oldShare + (1 - oldShare) / (1 + age / fadeSeconds) ^ fadePower)
  // A bigger fadeSeconds means games keep selling for longer.
  // Old games never stop: they keep "oldShare" of their launch sales.
  fadeSeconds: 1500,
  fadePower: 1.2,
  oldShare: 0.02,
  // Names for how well a game is selling compared to launch day.
  // "above" is the share of launch-day sales.
  salesStages: [
    { name: "Hot",    above: 0.6 },
    { name: "Steady", above: 0.3 },
    { name: "Fading", above: 0.12 },
    { name: "Old",    above: 0 },
  ],

  // ----- Desks, hires and office supplies ---------------------------
  deskBaseCost: 100000,
  deskCostGrowth: 2.5,    // each extra desk in the same section costs more
  hireBaseCost: 150000,
  hireCostGrowth: 2.3,   // each hire costs more than the last

  // Each upgrade level makes everyone work faster by "speed" (0.1 = 10%).
  supplies: [
    { id: "chair",      name: "Chair",          levels: ["Wooden stool", "Office chair", "Gaming chair"],          costs: [75000, 1000000],   speed: 0.06 },
    { id: "keyboard",   name: "Keyboard",       levels: ["Basic", "Mechanical", "Pro"],                            costs: [125000, 1750000],   speed: 0.06 },
    { id: "mouse",      name: "Mouse",          levels: ["Basic", "Gaming", "Wireless pro"],                       costs: [112500, 1500000],   speed: 0.06 },
    { id: "monitor",    name: "Monitor",        levels: ["Small", "Widescreen", "Dual screens"],                   costs: [375000, 6250000], speed: 0.10 },
    { id: "computer",   name: "Computer",       levels: ["Old laptop", "Desktop", "Powerhouse PC"],                costs: [750000, 15000000], speed: 0.20 },
    { id: "headphones", name: "Headphones",     levels: ["Cheap earbuds", "Studio headphones"],                    costs: [300000],        speed: 0.08 },
    { id: "coffee",     name: "Coffee machine", levels: ["No coffee machine", "Coffee machine"],                   costs: [200000],         speed: 0.08 },
  ],

  // ----- The calendar -----------------------------------------------
  // The game starts on January 1, Year 1. While you play, one game day
  // passes every "secondsPerDay" real seconds.
  // 24 seconds = 1 day, so 1 hour of play is 150 days (5 months).
  secondsPerDay: 24,
  // While you're away, the calendar moves slower: one game day for every
  // "awaySecondsPerDay" real seconds (3600 = 1 hour), so a week away is
  // about half a year in the game instead of 27 years.
  awaySecondsPerDay: 3600,

  // ----- Away from the game -----------------------------------------
  maxAwaySeconds: 7 * 24 * 3600,   // earnings count for up to 7 days
  awayShare: 0.12,                 // while away, games earn 12% as much
  welcomeBackAfterSeconds: 3600,   // show the bonus after 1 hour away
  welcomeBackMinBonus: 25000,

  // ----- Game conventions (events) ----------------------------------
  eventFirstLevel: 2,              // invites start at this studio level
  eventEverySeconds: 12 * 60,      // about how often an invite arrives
  eventExpireSeconds: 5 * 60,      // how long you have to say yes
  eventNames: ["Pixel Expo", "GameFest", "Indie Showcase", "Big Play Con", "Level Up Live", "Joystick Jam"],

  // ----- Trophies ---------------------------------------------------
  trophies: [
    { id: "first_game",   name: "First game released",    reward: 25000 },
    { id: "fans_2500",    name: "2,500 fans",             reward: 50000,     fans: 2500 },
    { id: "first_sequel", name: "First sequel",           reward: 250000 },
    { id: "first_hire",   name: "First hire",             reward: 250000 },
    { id: "fans_100k",    name: "100,000 fans",           reward: 1000000,   fans: 100000 },
    { id: "all_genres",   name: "Every genre tried once", reward: 12000000 },
    { id: "first_con",    name: "First convention",       reward: 750000 },
    { id: "fans_1m",      name: "1,000,000 fans",         reward: 10000000,  fans: 1000000 },
    { id: "full_office",  name: "Full office",            reward: 50000000 },
    { id: "fans_5m",      name: "5,000,000 fans",         reward: 60000000,  fans: 5000000 },
    { id: "fans_20m",     name: "20,000,000 fans",        reward: 200000000, fans: 20000000 },
  ],

  // ----- Starting over ----------------------------------------------
  // Each new studio you found after winning works this much faster.
  legacySpeedBonus: 0.10,

  // ----- Saving -----------------------------------------------------
  saveSlots: 3,
  autoSaveSeconds: 5,

  // ----- Colors for characters -------------------------------------
  look: {
    hair:  ["#2b1d14", "#5a3825", "#a0522d", "#e8c15a", "#f2f2f2", "#ff4fa3", "#3ee8ff", "#8a5cff"],
    skin:  ["#ffe0c4", "#f2c29b", "#d9a06b", "#b97a4a", "#8d5a34", "#5e3a22"],
    shirt: ["#ff3ea5", "#2ee6ff", "#ffd23f", "#7cff6b", "#9b6bff", "#ff7a3d", "#ffffff", "#3a3a5a"],
  },

  // ----- Made-up names ----------------------------------------------
  hireFirstNames: ["Ada", "Bo", "Cleo", "Dev", "Eli", "Fin", "Gus", "Hana", "Ivo", "Jun", "Kai", "Lia", "Milo", "Nia", "Oz", "Pip", "Quin", "Rae", "Sol", "Tess", "Uma", "Vic", "Wren", "Xan", "Yuki", "Zed"],
  hireLastNames: ["Pixelton", "Byteworth", "Codewell", "Sprite", "Looper", "Glitchman", "Framesby", "Debuggins", "Polygon", "Joystick", "Keyes", "Render"],
  gameNameIdeas: ["Turbo Llama", "Castle of Clouds", "Space Noodle", "Robo Rumble", "Ninja Pancake", "Dragon Garden", "Pixel Quest", "Moon Racers", "Laser Penguins", "Jungle Jump", "Mega Bounce", "Star Farmer"],
};

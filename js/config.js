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
  startMoney: 500,

  // How many fans you need to win (become a AAA studio).
  winFans: 1000000,

  // ----- Making a game ----------------------------------------------
  // How long one game takes to make, in seconds, before any speed-ups.
  devTimeSeconds: 150,

  // The five real steps. "share" is how much of the time each step takes.
  steps: [
    { id: "concept",    name: "Concept",        share: 0.05, verb: "Start concept",        job: "Game Designer",  minigame: "ideas" },
    { id: "preprod",    name: "Pre-production", share: 0.15, verb: "Start pre-production", job: "Game Designer",  minigame: "typing" },
    { id: "production", name: "Production",     share: 0.60, verb: "Start production",     job: "Programmer",     minigame: "blocks" },
    { id: "testing",    name: "Testing",        share: 0.15, verb: "Start testing",        job: "QA Tester",      minigame: "bugs" },
    { id: "launch",     name: "Launch",         share: 0.05, verb: "Launch it!",           job: "Producer",       minigame: null },
  ],

  // Mini-games last this many seconds. Each hit makes the step faster.
  minigameSeconds: 15,
  minigameSpeedPerHit: 0.04,   // each hit finishes 4% of the step
  minigameMaxSpeed: 0.6,       // but never more than 60% of the step

  // ----- Studio levels ----------------------------------------------
  // "desks" = how many hire desks each section can have at this level.
  levels: [
    { name: "Solo Developer",   fans: 0,       desks: 0, unlocks: "Action, Adventure, Strategy. Scratch. Save system." },
    { name: "Indie Studio",     fans: 1000,    desks: 1, unlocks: "Platformer. GameMaker. Local co-op. Your first hires!" },
    { name: "Small Studio",     fans: 10000,   desks: 2, unlocks: "Music and rhythm. Godot. Online leaderboards. $20 games." },
    { name: "Growing Studio",   fans: 100000,  desks: 3, unlocks: "Sports. Unity. Online multiplayer. Updates after launch. $60 games." },
    { name: "Big Studio",       fans: 500000,  desks: 4, unlocks: "Shooter. Unreal Engine. Cross-platform." },
    { name: "AAA Studio",       fans: 1000000, desks: 5, unlocks: "You win!" },
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
  trainBaseCost: 400,
  trainCostGrowth: 2.3,
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
    { id: "save",        name: "Save system",          level: 1, cost: 2500,
      reach: 1.0,  fans: 1.15, fade: 1, hint: "Players can save their progress. A few more players become fans." },
    { id: "coop",        name: "Local co-op",          level: 2, cost: 25000,
      reach: 1.05, fans: 1.3,  fade: 1, hint: "Two friends play on one computer. More players become fans." },
    { id: "leaderboard", name: "Online leaderboards",  level: 3, cost: 200000,
      reach: 1.25, fans: 1.05, fade: 1, hint: "Players compare scores and share the game a bit." },
    { id: "multiplayer", name: "Online multiplayer",   level: 4, cost: 1500000,
      reach: 1.4,  fans: 1.6,  fade: 1, hint: "The biggest boost! Fans bring their friends fast." },
    { id: "updates",     name: "Updates after launch", level: 4, cost: 3000000,
      reach: 1.0,  fans: 1.1,  fade: 2, hint: "You keep fixing and adding things, so sales fade more slowly." },
    { id: "cross",       name: "Cross-platform",       level: 5, cost: 15000000,
      reach: 1.6,  fans: 1.0,  fade: 1, hint: "The game runs on computers, consoles and phones. Reaches more players." },
  ],

  // ----- Engines ----------------------------------------------------
  // power is added to your Engines skill once you learn the engine.
  engines: [
    { id: "scratch",   name: "Scratch",       level: 1, cost: 0,       power: 0,  good: "Learning to code by snapping blocks together.", fact: "Made at MIT so kids could learn to code." },
    { id: "gamemaker", name: "GameMaker",     level: 2, cost: 20000,    power: 3,  good: "Fast 2D games.",               fact: "Undertale was made with GameMaker." },
    { id: "godot",     name: "Godot",         level: 3, cost: 200000,   power: 7,  good: "Free 2D and simple 3D games.", fact: "It is free and open source, so anyone can help improve it." },
    { id: "unity",     name: "Unity",         level: 4, cost: 2000000,  power: 12, good: "3D and mobile games.",         fact: "Among Us and Hollow Knight were made with Unity." },
    { id: "unreal",    name: "Unreal Engine", level: 5, cost: 15000000, power: 20, good: "Huge, realistic 3D worlds.",   fact: "Made by Epic Games, the studio behind Fortnite." },
  ],

  // ----- How many players a game gets -------------------------------
  // players per second right after launch =
  //   basePeak * power^powerCurve * genre * price * features * repeat * fanBoost
  basePeak: 0.8,
  powerCurve: 1.1,
  // fanBoost = 1 + (fans ^ fanBoostCurve) / fanBoostDivisor
  fanBoostCurve: 0.5,
  fanBoostDivisor: 700,
  // Share of players who become fans (before price, genre, features).
  baseFanRate: 0.03,
  // Skipping testing: this share of fans compared to a tested game.
  bugFanPenalty: 0.5,
  // Sales fade: players per second = peak / (1 + age / fadeSeconds) ^ fadePower
  // A bigger fadeSeconds means games keep selling for longer.
  fadeSeconds: 600,
  fadePower: 1.5,

  // ----- Desks, hires and office supplies ---------------------------
  deskBaseCost: 4000,
  deskCostGrowth: 2.5,    // each extra desk in the same section costs more
  hireBaseCost: 6000,
  hireCostGrowth: 2,   // each hire costs more than the last

  // Each upgrade level makes everyone work faster by "speed" (0.1 = 10%).
  supplies: [
    { id: "chair",      name: "Chair",          levels: ["Wooden stool", "Office chair", "Gaming chair"],          costs: [3000, 40000],   speed: 0.06 },
    { id: "keyboard",   name: "Keyboard",       levels: ["Basic", "Mechanical", "Pro"],                            costs: [5000, 70000],   speed: 0.06 },
    { id: "mouse",      name: "Mouse",          levels: ["Basic", "Gaming", "Wireless pro"],                       costs: [4500, 60000],   speed: 0.06 },
    { id: "monitor",    name: "Monitor",        levels: ["Small", "Widescreen", "Dual screens"],                   costs: [15000, 250000], speed: 0.10 },
    { id: "computer",   name: "Computer",       levels: ["Old laptop", "Desktop", "Powerhouse PC"],                costs: [30000, 600000], speed: 0.20 },
    { id: "headphones", name: "Headphones",     levels: ["Cheap earbuds", "Studio headphones"],                    costs: [12000],        speed: 0.08 },
    { id: "coffee",     name: "Coffee machine", levels: ["No coffee machine", "Coffee machine"],                   costs: [8000],         speed: 0.08 },
  ],

  // ----- Away from the game -----------------------------------------
  maxAwaySeconds: 7 * 24 * 3600,   // earnings count for up to 7 days
  awayShare: 0.5,                  // while away, games earn half as much
  welcomeBackAfterSeconds: 3600,   // show the bonus after 1 hour away
  welcomeBackMinBonus: 1000,

  // ----- Game conventions (events) ----------------------------------
  eventFirstLevel: 2,              // invites start at this studio level
  eventEverySeconds: 12 * 60,      // about how often an invite arrives
  eventExpireSeconds: 5 * 60,      // how long you have to say yes
  eventNames: ["Pixel Expo", "GameFest", "Indie Showcase", "Big Play Con", "Level Up Live", "Joystick Jam"],

  // ----- Trophies ---------------------------------------------------
  trophies: [
    { id: "first_game",  name: "First game released",   reward: 1000 },
    { id: "fans_100",    name: "100 fans",              reward: 2000,    fans: 100 },
    { id: "first_hire",  name: "First hire",            reward: 10000 },
    { id: "no_bugs",     name: "A game with no bugs at launch", reward: 3000 },
    { id: "fans_5000",   name: "5,000 fans",            reward: 50000,   fans: 5000 },
    { id: "all_genres",  name: "Every genre tried once", reward: 500000 },
    { id: "first_con",   name: "First convention",      reward: 30000 },
    { id: "fans_50000",  name: "50,000 fans",           reward: 400000,  fans: 50000 },
    { id: "full_office", name: "Full office",           reward: 2000000 },
    { id: "fans_250000", name: "250,000 fans",          reward: 2500000, fans: 250000 },
    { id: "fans_750000", name: "750,000 fans",          reward: 8000000, fans: 750000 },
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

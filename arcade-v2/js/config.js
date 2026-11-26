// =====================================================================
//  PIXEL EMPIRE ARCADE - ALL THE NUMBERS
//  ---------------------------------------------------------------------
//  This is the arcade test version. Change a number here, save, and
//  reload the page to try it. (The studio game has its own numbers in
//  ../js/config.js. This file does not touch them.)
// =====================================================================

const CONFIG = {
  startMoney: 100,             // you start with one claw machine, already working
  placeShare: 0.1,             // placing a machine costs this much of its unlock price
  autoSaveSeconds: 5,

  // ----- The calendar (same speed as the studio game) ---------------
  secondsPerDay: 3,            // 3 real seconds = 1 game day
  awaySecondsPerDay: 3600,     // while away: 1 game day per real hour

  // ----- Away from the arcade ---------------------------------------
  maxAwaySeconds: 7 * 24 * 3600,   // earnings count for up to 7 days
  // (how much time away pays is set by the coin box: see boxShares below)
  welcomeBackAfterSeconds: 60,

  // ----- Customers ----------------------------------------------------
  baseCustomers: 10,           // people who fit in the arcade with no machines...
  customersPerSeat: 1,         // ...plus this many for every seat on a working machine
  arriveEverySeconds: 9,       // with no machines, a new customer this often...
  arrivePerMachine: 0.3,       // ...and each machine makes them come more often
  fastestArrive: 0.4,
  tokens: [4, 9],              // coins each customer brings (1 coin = 1 play)
  energyPerPlay: [10, 18],     // energy (out of 100) each play uses
  walkSpeed: 30,               // pixels per second
  wishChance: 0.75,            // how often a wish is a machine you already have
  lineSlots: 3,                // people who can wait in each line

  // ----- Bugs and power outages (real minutes of play) ---------------
  bugMinutes: [5, 10],         // one machine in the arcade catches a bug about this often
                               // (only one bug at a time, and only one waits for you after time away)
  bugFixScore: 0.5,            // squash game score needed to fix it (0.5 = half)
  outageMinutes: [120, 180],   // power outages are rare
  mazeSeconds: 45,

  // ----- Rooms ---------------------------------------------------------
  // Room 1 is free (you start with it). Buy the others in order.
  roomCosts: [0, 8000, 60000, 400000, 3000000, 20000000],

  // ----- The 12 machines, in unlock order ----------------------------
  // players: people playing at once.  w, h: squares it takes on the floor.
  // unlock: one-time cost.  price: money per play.  play: seconds a play lasts.
  // build: seconds to build and install one.
  machines: [
    { id: "claw",     name: "Claw machine",       players: 1, w: 1, h: 1, unlock: 500,       price: 10,   play: 6,  build: 15,  color: "#ff3ea5" },
    { id: "shooter",  name: "Retro shooter",      players: 1, w: 1, h: 1, unlock: 1200,      price: 17,   play: 9,  build: 30,  color: "#2ee6ff" },
    { id: "pinball",  name: "Pinball",            players: 1, w: 1, h: 1, unlock: 4000,     price: 29,  play: 10, build: 45,  color: "#ffd23f" },
    { id: "whack",    name: "Whack-a-mole",       players: 1, w: 1, h: 1, unlock: 12000,     price: 49,  play: 8,  build: 60,  color: "#7cff6b" },
    { id: "punch",    name: "Punching bag",       players: 1, w: 1, h: 1, unlock: 35000,    price: 83,  play: 6,  build: 75,  color: "#ff7a3d" },
    { id: "hockey",   name: "Air hockey",         players: 2, w: 2, h: 1, unlock: 90000,    price: 140,  play: 12, build: 100, color: "#2ee6ff" },
    { id: "hoops",    name: "Basketball hoops",   players: 2, w: 2, h: 1, unlock: 230000,    price: 240,  play: 12, build: 120, color: "#ff7a3d" },
    { id: "fighter",  name: "Fighting game",      players: 2, w: 2, h: 1, unlock: 600000,   price: 410,  play: 14, build: 150, color: "#b18cff" },
    { id: "dance",    name: "Dance pads",         players: 2, w: 2, h: 1, unlock: 1500000,   price: 700, play: 14, build: 180, color: "#ff3ea5" },
    { id: "skee",     name: "Skee-ball",          players: 4, w: 4, h: 1, unlock: 4000000,  price: 1200, play: 14, build: 220, color: "#ffd23f" },
    { id: "racing",   name: "Racing seats",       players: 4, w: 4, h: 1, unlock: 10000000,  price: 2000, play: 16, build: 260, color: "#ff6b6b" },
    { id: "vr",       name: "VR pods",            players: 4, w: 2, h: 2, unlock: 25000000, price: 3400, play: 18, build: 300, color: "#b18cff" },
  ],

  // ----- Upgrades, bought in the Shop for a whole machine type -------
  // ("All claw machines: Higher price"). New machines of that type get them too.
  // cost: times that machine's unlock price, one number per level.
  upgrades: [
    { id: "price", name: "Higher price", about: "Each play costs more.",                            cost: [1.5, 4, 9, 22], values: [1, 1.25, 1.55, 1.9, 2.3] },
    { id: "speed", name: "Faster play",  about: "Each play is shorter, so more people get a turn.", cost: [1.2, 3, 7, 18], values: [1, 0.85, 0.72, 0.62, 0.55] },
  ],
  // An upgrade for the whole arcade: more people come in at once.
  sign: { name: "Bright sign", about: "A bigger, brighter sign out front. More customers come in at once.",
    cost: [3000, 40000, 500000, 6000000], extra: [0, 6, 14, 24, 36] },

  // ----- The Front Counter: the arcade's level --------------------------
  // Upgrading it unlocks new machine types. Rooms, type upgrades and the
  // Bright sign can only go as high as the counter allows.
  // unlocks: how many machine types (from the list above) you have at that level.
  counter: [
    { cost: 0,        seconds: 0,     unlocks: 2,  maxRooms: 1, maxUpgrade: 1, maxSign: 0 },
    { cost: 15000,    seconds: 15,    unlocks: 4,  maxRooms: 2, maxUpgrade: 1, maxSign: 1 },
    { cost: 50000,    seconds: 30,    unlocks: 5,  maxRooms: 2, maxUpgrade: 2, maxSign: 1 },
    { cost: 120000,   seconds: 45,    unlocks: 7,  maxRooms: 3, maxUpgrade: 2, maxSign: 2 },
    { cost: 500000,   seconds: 60,    unlocks: 8,  maxRooms: 4, maxUpgrade: 3, maxSign: 2 },
    { cost: 1500000,  seconds: 90,    unlocks: 9,  maxRooms: 4, maxUpgrade: 3, maxSign: 3 },
    { cost: 4000000,  seconds: 120,   unlocks: 10, maxRooms: 5, maxUpgrade: 4, maxSign: 3 },
    { cost: 10000000, seconds: 150,   unlocks: 11, maxRooms: 5, maxUpgrade: 4, maxSign: 4 },
    { cost: 25000000, seconds: 180,   unlocks: 12, maxRooms: 6, maxUpgrade: 4, maxSign: 4 },
    { cost: 75000000, seconds: 240,   unlocks: 12, maxRooms: 6, maxUpgrade: 4, maxSign: 4 },
  ],

  // ----- Mechanics: they do upgrade jobs (short: seconds to a few minutes) ---
  mechanics: 2,                          // you start with 2 (a 3rd comes from the Fame Road)
  typeJobSeconds: [15, 30, 60, 120],       // type upgrade level 1, 2, 3, 4
  signJobSeconds: [20, 45, 90, 180],       // Bright sign level 1, 2, 3, 4
  speedUpCut: 0.5,                       // the code game cuts up to half the time left
  instantUnder: Infinity,                // a perfect run finishes any job right away

  // ----- The coin box: money from time away waits here ------------------
  boxShares: [0.012, 0.015, 0.018, 0.021, 0.024],   // box level 1 to 5
  coinRush: { afterSeconds: 3600, bonus: 0.25, seconds: 15 },

  // ----- Fame stars and the Fame Road -------------------------------------
  stars: { counter: 50, power: 30, newType: 20, bug: 10, bugPerfect: 15, coinRush: 10, speedUp: 5,
           happyEvery: 20, happyPerHour: 30 },
  // Step k needs 15 + 5k stars. kind: coins (minutes of money), look, box, mechanic, builds, job.
  road: [
    { kind: "coins", minutes: 10 },
    { kind: "look", look: "cap", name: "Neon cap (for you)" },
    { kind: "coins", minutes: 15 },
    { kind: "look", look: "floorCheck", name: "Neon checkerboard floor" },
    { kind: "box", level: 2, name: "Coin box level 2" },
    { kind: "coins", minutes: 20 },
    { kind: "look", look: "signCyan", name: "Cyan sign" },
    { kind: "builds", count: 3, name: "Instant build ×3" },
    { kind: "coins", minutes: 30 },
    { kind: "look", look: "overalls", name: "Racing overalls (Mechanics)" },
    { kind: "coins", minutes: 30 },
    { kind: "mechanic", name: "A 3rd Mechanic" },
    { kind: "look", look: "floorStars", name: "Starfield floor" },
    { kind: "box", level: 3, name: "Coin box level 3" },
    { kind: "coins", minutes: 45 },
    { kind: "look", look: "goldClaw", name: "Gold trim on every claw machine" },
    { kind: "builds", count: 5, name: "Instant build ×5" },
    { kind: "coins", minutes: 45 },
    { kind: "look", look: "signRainbow", name: "Rainbow sign" },
    { kind: "coins", minutes: 60 },
    { kind: "look", look: "shades", name: "Star sunglasses (for you)" },
    { kind: "box", level: 4, name: "Coin box level 4" },
    { kind: "coins", minutes: 60 },
    { kind: "look", look: "floorLava", name: "Lava lamp floor" },
    { kind: "look", look: "robot", name: "Robot mascot" },
    { kind: "coins", minutes: 90 },
    { kind: "job", name: "Finish one Mechanic job now" },
    { kind: "coins", minutes: 90 },
    { kind: "look", look: "crown", name: "Crown (for you)" },
    { kind: "box", level: 5, name: "Coin box level 5 and \"Fame Legend\" on your sign" },
  ],

  // Random customer looks and the made-up names (same lists as the studio game).
  look: {
    hair:  ["#2b1d14", "#5a3825", "#a0522d", "#e8c15a", "#f2f2f2", "#ff4fa3", "#3ee8ff", "#8a5cff"],
    skin:  ["#ffe0c4", "#f2c29b", "#d9a06b", "#b97a4a", "#8d5a34", "#5e3a22"],
    shirt: ["#ff3ea5", "#2ee6ff", "#ffd23f", "#7cff6b", "#9b6bff", "#ff7a3d", "#ffffff", "#3a3a5a"],
  },

  // ----- Made-up names ----------------------------------------------
  // Names are mixed from these lists, so there are thousands of them.
  hireFirstNames: ["Ada", "Bo", "Cleo", "Dev", "Eli", "Fin", "Gus", "Hana", "Ivo", "Jun", "Kai", "Lia", "Milo", "Nia", "Oz", "Pip",
    "Quin", "Rae", "Sol", "Tess", "Uma", "Vic", "Wren", "Xan", "Yuki", "Zed", "Ari", "Bea", "Cal", "Dot", "Ezra", "Faye", "Gio",
    "Hal", "Iris", "Jax", "Kit", "Luz", "Max", "Nova", "Otis", "Pia", "Ray", "Sky", "Theo", "Ula", "Vera", "Wes", "Yara", "Zoe",
    "Abe", "Bex", "Cy", "Dina", "Emi", "Flo", "Gemma", "Hugo", "Ines", "Joy", "Kofi", "Lars", "Mina", "Ned", "Olu", "Priya",
    "Remy", "Sami", "Tao", "Umar", "Val", "Wyatt", "Ximena", "Yosef", "Zara", "Ash", "Benji", "Coco", "Dax", "Edie", "Ferris",
    "Gale", "Harper", "Indy", "Juno", "Kenji", "Lulu", "Mabel", "Nico", "Opal", "Pax", "Rio", "Suki", "Tuck", "Vito", "Willa"],
  hireLastNames: ["Pixelton", "Byteworth", "Codewell", "Sprite", "Looper", "Glitchman", "Framesby", "Debuggins", "Polygon",
    "Joystick", "Keyes", "Render", "Bitsworth", "Clickman", "Voxel", "Shader", "Patchwell", "Saveson", "Levelton", "Spawnly",
    "Hitbox", "Tilesby", "Arcadia", "Cartridge", "Combo", "Dpad", "Respawn", "Quickload", "Bossman", "Powerup", "Checkpoint",
    "Scrolls", "Buttons", "Gamewell", "Loadsworth", "Mapley", "Questor", "Scorely", "Turbo", "Highscore", "Rumble", "Glimmer",
    "Starling", "Moonbeam", "Sparks", "Rocketson", "Comet", "Nebula", "Lasers", "Zapp", "Fizzwick", "Boop", "Wobble", "Jumpwell",
    "Dashley", "Sprinter", "Bounce", "Puzzler", "Riddle", "Inkwell", "Sketchy", "Doodle", "Brushly", "Melody", "Beatbox", "Tempo"],
  // Game names: an adjective and a thing, like "Turbo Llama", or a pattern like "Llama Quest".
  gameAdjectives: ["Turbo", "Space", "Robo", "Ninja", "Dragon", "Pixel", "Moon", "Laser", "Jungle", "Mega", "Star", "Super",
    "Tiny", "Giant", "Sneaky", "Cosmic", "Crystal", "Shadow", "Thunder", "Rocket", "Bouncy", "Frozen", "Fire", "Neon", "Retro",
    "Wild", "Lucky", "Haunted", "Sky", "Ocean", "Desert", "Candy", "Banana", "Electric", "Galactic", "Secret", "Lost", "Brave",
    "Silly", "Speedy", "Wobbly", "Glitchy", "Hyper", "Ultra", "Rainbow", "Midnight", "Steam", "Pirate", "Volcano", "Magic",
    "Atomic", "Fuzzy", "Golden", "Iron", "Mystic", "Noisy", "Quantum", "Rusty", "Sparkly", "Stormy", "Toxic", "Velvet", "Zombie"],
  gameNouns: ["Llama", "Noodle", "Rumble", "Pancake", "Garden", "Quest", "Racers", "Penguins", "Jump", "Bounce", "Farmer",
    "Castle", "Knights", "Robots", "Dragons", "Hamsters", "Goblins", "Wizards", "Pirates", "Tacos", "Donuts", "Ducks", "Frogs",
    "Ninjas", "Monsters", "Kingdom", "Island", "Planet", "Galaxy", "Dungeon", "Arena", "Legends", "Heroes", "Raiders", "Run",
    "Dash", "Blast", "Battle", "Escape", "Adventure", "Tactics", "Empire", "Tycoon", "Party", "Mayhem", "Saga", "Odyssey",
    "Builders", "Hunters", "Rangers", "Squad", "Patrol", "Express", "Derby", "League", "Cup", "Beats", "Groove", "Puzzle",
    "Blocks", "Golems", "Slimes", "Yetis", "Unicorns", "Cats", "Corgis", "Owls", "Sharks", "Bees", "Turtles", "Meteor"],
  gameNamePatterns: ["{a} {n}", "{a} {n}", "{a} {n}", "{n} Quest", "{n} of the {a} Moon", "Super {a} {n}", "{a} {n} Deluxe",
    "The {a} {n}", "{n} Island", "{n} vs. {n2}", "{a} {n} Party", "Return of the {n}", "{n} Tycoon", "{a} {n} Racing"],
  fanFirst: ["Gamer", "Pixel", "Llama", "Speedy", "Retro", "Boss", "Coin", "Noob", "Jump", "Turbo", "Ninja", "Star", "Dragon",
    "Mega", "Lucky", "Super", "Cosmic", "Epic", "Happy", "Sneaky", "Combo", "Quest", "Robo", "Moon", "Taco", "Banana"],
  fanSecond: ["Kid", "Pal", "Fan", "Runner", "Rita", "Battler", "Collector", "Master", "Queen", "King", "Hero", "Wizard", "Ace",
    "Champ", "Buddy", "Legend", "Hunter", "Jumper", "Dude", "Star", "Fox", "Cat", "Pro", "Boss"],
};

// Add ?test to the address to make bugs and power outages happen fast.
CONFIG.testMode = typeof location !== "undefined" && /[?&]test\b/.test(location.search);
if (CONFIG.testMode) { CONFIG.bugMinutes = [1, 2]; CONFIG.outageMinutes = [3, 4]; CONFIG.coinRush.afterSeconds = 60; }

if (typeof module !== "undefined") module.exports = CONFIG;

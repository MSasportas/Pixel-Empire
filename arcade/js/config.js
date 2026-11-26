// =====================================================================
//  PIXEL EMPIRE ARCADE - ALL THE NUMBERS
//  ---------------------------------------------------------------------
//  This is the arcade test version. Change a number here, save, and
//  reload the page to try it. (The studio game has its own numbers in
//  ../js/config.js. This file does not touch them.)
// =====================================================================

const CONFIG = {
  startMoney: 550,             // just enough to unlock the claw machine and place one
  placeShare: 0.1,             // placing a machine costs this much of its unlock price
  autoSaveSeconds: 5,

  // ----- The calendar (same speed as the studio game) ---------------
  secondsPerDay: 3,            // 3 real seconds = 1 game day
  awaySecondsPerDay: 3600,     // while away: 1 game day per real hour

  // ----- Away from the arcade ---------------------------------------
  maxAwaySeconds: 7 * 24 * 3600,   // earnings count for up to 7 days
  awayShare: 0.03,                 // while away, customers come much less often
  welcomeBackAfterSeconds: 60,

  // ----- Customers ----------------------------------------------------
  customersPerRoom: 20,        // how many people fit in the arcade per room
  arriveEverySeconds: 9,       // with no machines, a new customer this often...
  arrivePerMachine: 0.3,       // ...and each machine makes them come more often
  fastestArrive: 0.4,
  tokens: [4, 9],              // coins each customer brings (1 coin = 1 play)
  energyPerPlay: [10, 18],     // energy (out of 100) each play uses
  walkSpeed: 30,               // pixels per second
  wishChance: 0.75,            // how often a wish is a machine you already have
  lineSlots: 3,                // people who can wait in each line at the start

  // ----- Bugs and power outages (real minutes of play) ---------------
  bugMinutes: [30, 45],        // each machine catches a bug about this often
  bugUpgrade: [1, 2, 4],       // "Fewer bugs" upgrade: bugs come 2x, then 4x less often
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

  // ----- Machine upgrades (each has 2 levels) -------------------------
  // cost: times the machine's unlock price.
  upgrades: [
    { id: "speed", name: "Faster play",      about: "Each play is shorter, so more people get a turn.", cost: [0.5, 1.5], values: [1, 0.75, 0.55] },
    { id: "bugs",  name: "Fewer bugs",       about: "Bugs come less often.",                            cost: [0.4, 1.2], values: [1, 2, 4] },
    { id: "price", name: "Higher price",     about: "Each play costs more.",                            cost: [0.6, 1.8], values: [1, 1.5, 2.25] },
    { id: "line",  name: "More line slots",  about: "More people can wait in line.",                    cost: [0.3, 0.9], values: [3, 4, 5] },
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
if (CONFIG.testMode) { CONFIG.bugMinutes = [1, 2]; CONFIG.outageMinutes = [3, 4]; }

if (typeof module !== "undefined") module.exports = CONFIG;

// =====================================================================
//  PIXEL EMPIRE ARCADE - PIXEL ICONS
//  ---------------------------------------------------------------------
//  Our own little pixel icons (instead of emoji), so the buttons look
//  the same on every phone and computer. Each icon is a 10x10 picture:
//  every letter is one pixel, and "." is see-through.
//    icon("coin")        gives the HTML for a coin icon
//    icon("coin", 28)    the same, 28 pixels big
// =====================================================================

const ICON_COLORS = {
  y: "#ffd23f", Y: "#fff3a0", o: "#c99a1a", p: "#ff3ea5", P: "#ff8fcb", c: "#2ee6ff", C: "#9ff4ff",
  g: "#7cff6b", G: "#2f9e2a", w: "#ffffff", k: "#0b0618", r: "#ff2d4a", R: "#a3122a", m: "#c9d2e3",
  M: "#7d879c", b: "#b07a4a", B: "#7a4a2a", v: "#b18cff", V: "#6a4f9a", n: "#ff7a3d",
};

const ICON_PIXELS = {
  coin: [
    "...kkkk...", ".kkyyyykk.", ".kyYyyyyk.", "kyYyyoyyok", "kyyyyoyyok",
    "kyyyyoyyok", "kyyyyoyyok", ".kyyyyyok.", ".kkooookk.", "...kkkk...",
  ],
  star: [
    "....kk....", "...kyyk...", "kkkkyykkkk", "kyyYyyyyyk", ".kyyyyyyk.",
    "..kyyyyk..", "..kyyyyk..", ".kyykkyyk.", ".kyk..kyk.", ".kk....kk.",
  ],
  wrench: [
    ".....kk.k.", "....kmmkmk", "....kmmmmk", "...kmmmmk.", "..kmmmkk..",
    ".kmmmk....", "kmmmk.....", "kmMk......", ".kk.......", "..........",
  ],
  cart: [
    "kk........", "kckkkkkkkk", ".kcccccck.", ".kcCcCcck.", ".kccccck..",
    "..kcccck..", "..kkkkkk..", "..k....k..", ".kwk..kwk.", "..k....k..",
  ],
  menu: [
    "..........", "kkkkkkkkkk", "kcccccccck", "kkkkkkkkkk", "kkkkkkkkkk",
    "kcccccccck", "kkkkkkkkkk", "kkkkkkkkkk", "kcccccccck", "kkkkkkkkkk",
  ],
  people: [
    "..kk...kk.", ".kbbk.kPPk", ".kbbk.kPPk", "..kk...kk.", ".kcck.kppk",
    "kcccckppppk".slice(0, 10), "kcccckppppk".slice(0, 10), "kcccckppppk".slice(0, 10), ".kkkk.kkkk", "..........",
  ],
  bolt: [
    ".....kkk..", "....kyyk..", "...kyyk...", "..kyyk....", ".kyyyyykk.",
    ".kkkyyyyk.", "...kyyk...", "..kyyk....", ".kyyk.....", ".kkk......",
  ],
  bug: [
    "..k....k..", "...k..k...", "..kkkkkk..", ".kRrrrrRk.", "kkrrwrrrkk",
    ".krrrrwrk.", "kkrwrrrrkk", ".krrrrrrk.", "..kkkkkk..", ".k..kk..k.",
  ],
  up: [
    "....kk....", "...kggk...", "..kggggk..", ".kggggggk.", "kkkggggkkk",
    "...kggk...", "...kggk...", "...kggk...", "...kGGk...", "...kkkk...",
  ],
  lock: [
    "...kkkk...", "..kmMMmk..", "..kk..kk..", "..kk..kk..", ".kkkkkkkk.",
    ".kyyyyyyk.", ".kyykkyyk.", ".kyykkyyk.", ".kooooook.", ".kkkkkkkk.",
  ],
  door: [
    "..kkkkkk..", "..kvvvvk..", "..kvVVvk..", "..kvVVvk..", "..kvvvvk..",
    "..kvvvyk..", "..kvvvvk..", "..kvVVvk..", "..kvvvvk..", "kkkkkkkkkk",
  ],
  bulb: [
    "...kkkk...", "..kyYYyk..", ".kyYYyyyk.", ".kyYyyyyk.", ".kyyyyyyk.",
    "..kyyyyk..", "...kmmk...", "...kMMk...", "...kmmk...", "....kk....",
  ],
  check: [
    "..........", ".........k", "........kg", ".......kgk", "k.....kgk.",
    "gk...kgk..", "kgk.kgk...", ".kgkgk....", "..kgk.....", "...k......",
  ],
  clock: [
    "..kkkkkk..", ".kwwwwwwk.", "kwwwkwwwwk", "kwwwkwwwwk", "kwwwkwwwwk",
    "kwwwkkkwwk", "kwwwwwwwwk", "kwwwwwwwwk", ".kwwwwwwk.", "..kkkkkk..",
  ],
  gift: [
    "..kk..kk..", ".kppkkppk.", "..kkppkk..", "kkkkpkkkkk", "kcccpcccck",
    "kkkkpkkkkk", ".kccpccck.", ".kccpccck.", ".kccpccck.", ".kkkkkkkk.",
  ],
  crown: [
    "..........", "k...k...k.", "ky.kyk.ky.", "kyykyykyyk", "kyyyyyyyyk",
    "kyypyycyyk", "kyyyyyyyyk", "kooooooook", "kkkkkkkkkk", "..........",
  ],
  play: [
    "..kk......", "..kgk.....", "..kggk....", "..kgggk...", "..kggggk..",
    "..kggggk..", "..kgggk...", "..kggk....", "..kgk.....", "..kk......",
  ],
  counter: [
    "......kkk.", "......kyk.", "......kyk.", "kkkkkkkkkk", "kVVVVVVVVk",
    "kvvvvvvvvk", "kvkkvvyyvk", "kvkpvvvvvk", "kvvvvvvvvk", "kkkkkkkkkk",
  ],
};

// One SVG for each icon, made once.
const ICON_SVG = {};
for (const name in ICON_PIXELS) {
  let rects = "";
  ICON_PIXELS[name].forEach((row, y) => {
    for (let x = 0; x < 10; x++) {
      const col = ICON_COLORS[row[x]];
      if (col) rects += '<rect x="' + x + '" y="' + y + '" width="1.02" height="1.02" fill="' + col + '"/>';
    }
  });
  ICON_SVG[name] = rects;
}

function icon(name, size) {
  const s = size || 18;
  return '<svg class="px-icon" width="' + s + '" height="' + s + '" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">' + (ICON_SVG[name] || "") + "</svg>";
}

// Draws an icon on a canvas (for labels over the arcade).
const ICON_IMAGES = {};
function iconImage(name) {
  if (!ICON_IMAGES[name]) {
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 10 10" shape-rendering="crispEdges">' + (ICON_SVG[name] || "") + "</svg>");
    ICON_IMAGES[name] = img;
  }
  return ICON_IMAGES[name];
}

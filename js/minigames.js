// =====================================================================
//  PIXEL EMPIRE - MINI-GAMES
//  ---------------------------------------------------------------------
//  Short games that speed up a step. Each one has a job to finish
//  before the time runs out, like "match 10 code blocks".
//
//  Your score: finish the whole job with no mistakes and the step is
//  100% done! Every mistake takes some away. Run out of time and you
//  only get the part you finished.
// =====================================================================

const Minigames = {
  // What each mini-game is called, what you do, how big the job is
  // ("jobs"), how many seconds you get, and how much a mistake costs.
  info: {
    ideas:  { title: "Idea storm!",            jobs: 3,  seconds: 25, mistake: 0.2,
              how: "Pick every idea that fits the game. Then the next game comes." },
    code:   { title: "Write the code!",        jobs: 2,  seconds: 45, mistake: 0.1,
              how: "Type the line of code exactly as it is. Spaces and symbols count!" },
    blocks: { title: "Match the code blocks!", jobs: 10, seconds: 25, mistake: 0.2,
              how: "Click the block with the same code as the one at the top." },
    bugs:   { title: "Squash the bugs!",       jobs: 12, seconds: 30, mistake: 0.2,
              how: "Tap every bug before it reaches the bottom. Don't let one get away!" },
  },

  // Bigger games have bigger mini-games.
  sizeFactor: { small: 1, medium: 1, big: 1.5, huge: 2 },

  // ----- Word lists -------------------------------------------------

  // Idea storm: each theme and the ideas that fit it.
  themes: {
    "Space":   ["rocket", "alien", "planet", "astronaut", "comet", "moon base", "star map", "space suit"],
    "Pirate":  ["ship", "treasure", "parrot", "cannon", "island", "anchor", "eye patch", "plank"],
    "Jungle":  ["vines", "monkey", "temple", "waterfall", "jaguar", "ruins", "tiger", "banana"],
    "Ocean":   ["shark", "submarine", "coral", "octopus", "whale", "pearl", "jellyfish", "diver"],
    "Castle":  ["knight", "dragon", "tower", "king", "moat", "catapult", "wizard", "princess"],
    "Robot":   ["gears", "circuit", "battery", "antenna", "bolts", "android", "laser eyes", "factory"],
    "Racing":  ["race car", "track", "nitro", "pit stop", "tires", "finish line", "helmet", "checkered flag"],
    "Sports":  ["ball", "goal", "whistle", "stadium", "referee", "jersey", "scoreboard", "team captain"],
    "Spooky":  ["ghost", "haunted house", "bat", "pumpkin", "skeleton", "cobweb", "witch", "zombie"],
    "Farm":    ["tractor", "barn", "cow", "corn", "chickens", "scarecrow", "hay", "sheep"],
    "Dino":    ["T-rex", "fossil", "volcano", "egg nest", "raptor", "swamp", "meteor", "dino bones"],
    "Candy":   ["lollipop", "gumdrop", "cupcake", "chocolate river", "sprinkles", "candy cane", "cookie", "jelly bean"],
  },

  // Write the code: real lines of code, like in JavaScript.
  codeLines: [
    "let score = 0;",
    "let lives = 3;",
    "let speed = 5;",
    "let name = \"Hero\";",
    "let isBoss = true;",
    "let gravity = 1;",
    "score = score + 10;",
    "coins = coins + 1;",
    "timer = timer - 1;",
    "level = level + 1;",
    "lives--;",
    "coins++;",
    "player.jump();",
    "music.play();",
    "door.open = true;",
    "enemy.speed = 2;",
    "hero.x = hero.x + speed;",
    "ball.y = ball.y + gravity;",
    "if (coins > 9) lives++;",
    "if (lives < 1) restart();",
    "if (health == 0) gameOver();",
    "if (score > best) best = score;",
    "if (key == \"space\") shoot();",
    "if (touching(lava)) lives--;",
    "if (timer == 0) endLevel();",
    "while (alive) run();",
    "while (timer > 0) tick();",
    "for (let i = 0; i < 3; i++) spawn();",
    "for (let i = 0; i < 5; i++) addTree();",
    "function jump() { y = y - 5; }",
    "function win() { show(\"You win!\"); }",
    "function reset() { score = 0; }",
    "return score;",
    "return true;",
    "let colors = [\"red\", \"blue\"];",
    "let boss = new Dragon();",
    "sound.volume = 10;",
    "player.hasKey = false;",
    "if (hasKey) door.open = true;",
    "else showMessage(\"Locked!\");",
    "let maxSpeed = speed * 2;",
    "console.log(\"Level done!\");",
  ],

  // Match the code blocks: lots of code words. Four random ones each round.
  codeWords: [
    "if", "else", "for", "while", "let", "const", "var", "function", "return", "true", "false", "null",
    "class", "new", "this", "break", "continue", "switch", "case", "try", "catch", "import", "export", "async",
    "await", "typeof", "undefined", "print()", "jump()", "run()", "shoot()", "spawn()", "draw()", "update()",
    "start()", "stop()", "reset()", "save()", "load()", "random()", "push()", "pop()", "collide()", "destroy()",
    "rotate()", "move()", "play()", "pause()", "score++", "lives--", "coins++", "level++", "x + 1", "y - 1",
    "x += 2", "y -= 2", "==", "!=", ">=", "<=", "&&", "||", "=>", "{ }", "( )", "[ ]", ";", "//",
    "speed", "gravity", "player", "enemy", "health", "coins", "level", "timer", "array", "loop", "string",
    "number", "boolean", "object", "list", "key", "value", "sprite", "pixel", "tile", "sound", "music", "input",
    "click", "width", "height", "color", "angle", "scale", "length", "index", "count", "score", "lives",
    "hero", "boss", "door", "map", "camera", "frame", "event", "button", "screen", "math", "Math.floor",
    "Math.max", "console.log", "alert()", "onClick", "keydown", "setTimeout", "addEventListener", "getElementById",
    "\"hello\"", "'A'", "0", "1", "42", "100", "i++", "i < 10", "let i = 0", "x * 2", "y / 2", "% 2",
    "if (win)", "while (alive)", "return score", "new Game()", "player.x", "enemy.y", "items[0]", "list.length",
    "true && false", "!done", "score > 99", "lives == 0", "isJumping", "onGround", "hitBox", "spawnPoint",
  ],

  // ----- Running a mini-game ----------------------------------------

  // project: the game being sped up. isStepDone: did the step finish on
  // its own? onDone(score): called at the end with a score from 0 to 1.
  start(type, project, isStepDone, onDone) {
    const overlay = document.getElementById("minigame");
    const info = this.info[type];
    const factor = this.sizeFactor[project.size || "small"] || 1;
    const game = {
      total: Math.round(info.jobs * factor),
      done: 0, mistakes: 0,
      timeLeft: Math.round(info.seconds * factor),
      over: false, items: [],
    };
    const step = CONFIG.steps[project.step];
    overlay.innerHTML =
      '<div class="mg-box panel" style="border-color:' + step.color + '">' +
      '<div class="mg-top"><h2 style="color:' + step.color + ";text-shadow:0 0 8px " + step.color + '">' + info.title + '</h2>' +
      '<div class="mg-stats">Done: <b id="mg-done">0/' + game.total + '</b> &nbsp; Mistakes: <b id="mg-miss">0</b> &nbsp; Time: <b id="mg-time">' + game.timeLeft + '</b></div></div>' +
      '<p class="mg-how">' + info.how + '</p>' +
      '<div class="mg-arena" id="mg-arena"></div>' +
      '</div>';
    overlay.classList.remove("hidden");
    game.arena = document.getElementById("mg-arena");

    const show = () => {
      document.getElementById("mg-done").textContent = game.done + "/" + game.total;
      document.getElementById("mg-miss").textContent = game.mistakes;
    };
    // Something done right
    game.hit = () => {
      if (game.over) return;
      game.done++;
      show();
      Sound.play("hit");
      if (game.isComplete()) finish("all");
    };
    // A mistake
    game.miss = () => {
      if (game.over) return;
      game.mistakes++;
      show();
      Sound.play("nope");
      const box = overlay.querySelector(".mg-box");
      box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
      if (game.isComplete()) finish("all");
    };
    // The job is finished (some games change these two).
    game.isComplete = () => game.done >= game.total;
    game.part = () => Math.min(1, game.done / game.total);

    const finish = why => {
      if (game.over) return;
      game.over = true;
      const part = game.part();
      const score = Math.max(0, part * (1 - info.mistake * game.mistakes));
      let msg;
      if (why === "step") msg = "The step finished by itself!";
      else if (score >= 1) msg = "<b>PERFECT!</b><br>No mistakes. The step is 100% done!";
      else {
        const parts = [];
        if (game.mistakes) parts.push(game.mistakes + (game.mistakes === 1 ? " mistake" : " mistakes"));
        if (part < 1) parts.push("finished " + Math.round(part * 100) + "% of the job");
        msg = (why === "time" ? "Time's up! " : "Done! ") + parts.join(", ") + ".<br>That finished <b>" + Math.round(score * 100) + "%</b> of the work left.";
      }
      game.arena.innerHTML = '<div class="mg-done"><div>' + msg + "</div></div>";
      if (score >= 1 && why !== "step") Sound.play("level");
      setTimeout(() => {
        overlay.classList.add("hidden");
        overlay.innerHTML = "";
        onDone(why === "step" ? 0 : score);
      }, 1800);
    };

    this["setup_" + type](game);

    let last = performance.now();
    const loop = now => {
      if (game.over) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      game.timeLeft -= dt;
      document.getElementById("mg-time").textContent = Math.max(0, Math.ceil(game.timeLeft));
      if (game.update) game.update(dt);
      if (game.over) return;
      if (isStepDone()) { finish("step"); return; }
      if (game.timeLeft <= 0) { finish("time"); return; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  // Bright random colors for the code blocks.
  blockColors: ["#ff3ea5", "#2ee6ff", "#ffd23f", "#7cff6b", "#ff7a3d", "#b18cff", "#ff6b6b", "#5ef2c2"],

  // ----- Concept: Idea storm ----------------------------------------
  setup_ideas(game) {
    const names = this.shuffle(Object.keys(this.themes));
    let round = 0;
    const next = () => {
      if (game.over) return;
      const theme = names[round % names.length];
      round++;
      const good = this.shuffle(this.themes[theme]).slice(0, 3);
      const others = [];
      for (const t of names) if (t !== theme) others.push.apply(others, this.themes[t]);
      const bad = this.shuffle(others).slice(0, 3);
      const cards = this.shuffle(good.map(w => [w, true]).concat(bad.map(w => [w, false])));
      game.arena.innerHTML = '<div class="mg-theme">Make a <b>' + theme.toUpperCase() + '</b> game!</div><div class="mg-cards" id="mg-cards"></div>';
      const box = document.getElementById("mg-cards");
      let found = 0;
      for (const [word, fits] of cards) {
        const b = document.createElement("button");
        b.className = "mg-card";
        b.textContent = word;
        b.addEventListener("pointerdown", () => {
          if (game.over || b.disabled) return;
          b.disabled = true;
          if (fits) {
            b.classList.add("right");
            Sound.play("click");
            found++;
            if (found === good.length) { game.hit(); setTimeout(next, 250); }
          } else {
            b.classList.add("wrong");
            game.miss();
          }
        });
        box.appendChild(b);
      }
    };
    next();
  },

  // ----- Pre-production: Write the code -----------------------------
  setup_code(game) {
    game.arena.innerHTML = '<div class="mg-code" id="mg-code"></div><input id="mg-input" class="mg-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">';
    const codeEl = document.getElementById("mg-code");
    const input = document.getElementById("mg-input");
    const lines = this.shuffle(this.codeLines);
    let line = "", n = 0;
    const draw = () => {
      const typed = input.value.length;
      codeEl.innerHTML = '<span class="typed">' + esc(line.slice(0, typed)) + '</span><span class="cursor">' + esc(line.charAt(typed) || " ") + "</span>" + esc(line.slice(typed + 1));
    };
    const next = () => { line = lines[n++ % lines.length]; input.value = ""; draw(); };
    input.addEventListener("input", () => {
      if (game.over) return;
      const value = input.value;
      // Every wrong key is a mistake, and it doesn't get typed.
      if (!line.startsWith(value)) {
        let ok = 0;
        while (ok < value.length && value[ok] === line[ok]) ok++;
        input.value = line.slice(0, ok);
        input.classList.remove("wrong"); void input.offsetWidth; input.classList.add("wrong");
        game.miss();
      }
      draw();
      if (input.value === line) { game.hit(); if (!game.over) next(); }
    });
    next();
    setTimeout(() => input.focus(), 50);
  },

  // ----- Production: Match the code blocks --------------------------
  setup_blocks(game) {
    game.arena.innerHTML = '<div class="mg-target" id="mg-target"></div><div class="mg-choices" id="mg-choices"></div>';
    const round = () => {
      if (game.over) return;
      const words = this.shuffle(this.codeWords).slice(0, 4);
      const colors = this.shuffle(this.blockColors);
      const target = words[Math.floor(Math.random() * 4)];
      document.getElementById("mg-target").innerHTML = '<span class="mg-block" style="background:' + colors[4] + '">' + esc(target) + "</span>";
      const box = document.getElementById("mg-choices");
      box.innerHTML = "";
      words.forEach((w, i) => {
        const b = document.createElement("button");
        b.className = "mg-block";
        b.style.background = colors[i];
        b.textContent = w;
        b.addEventListener("pointerdown", () => {
          if (game.over || b.disabled) return;
          if (w === target) { game.hit(); round(); }
          else { b.disabled = true; b.classList.add("wrong"); game.miss(); }
        });
        box.appendChild(b);
      });
    };
    round();
  },

  // ----- Testing: Squash the bugs ----------------------------------
  // A bug that gets away is a mistake. The job is done when every bug
  // is squashed or gone.
  setup_bugs(game) {
    let spawned = 0, spawn = 0.3;
    const every = game.timeLeft * 0.6 / game.total;  // all bugs come out in the first 60% of the time
    game.isComplete = () => game.done + game.mistakes >= game.total;
    game.part = () => Math.min(1, (game.done + game.mistakes) / game.total);
    game.update = dt => {
      spawn -= dt;
      const w = game.arena.clientWidth, h = game.arena.clientHeight;
      if (spawn <= 0 && spawned < game.total) {
        spawn = every;
        spawned++;
        const el = document.createElement("div");
        el.className = "mg-thing";
        el.textContent = "🐞";
        const item = { el: el, x: 20 + Math.random() * (w - 60), y: -30, v: h / (3.2 + Math.random() * 1.5), t: Math.random() * 6 };
        el.addEventListener("pointerdown", () => {
          if (item.dead || game.over) return;
          item.dead = true; el.remove(); game.hit();
        });
        game.arena.appendChild(el);
        game.items.push(item);
      }
      for (const it of game.items) {
        if (it.dead) continue;
        it.y += it.v * dt; it.t += dt;
        const x = it.x + Math.sin(it.t * 4) * 20;
        it.el.style.transform = "translate(" + x + "px," + it.y + "px)";
        if (it.y > h) { it.el.remove(); it.dead = true; game.miss(); }
      }
      game.items = game.items.filter(i => !i.dead);
    };
  },
};

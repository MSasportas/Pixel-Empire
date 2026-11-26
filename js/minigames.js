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
    ideas:  { title: "Remember the plan!",     jobs: 3,  seconds: 60, mistake: 0.2,
              how: "Watch the idea lights, then press them in the same order. Each round gets one longer." },
    code:   { title: "Write the code!",        jobs: 3,  seconds: 60, mistake: 0.1,
              how: "Type the code exactly as it is. Spaces and symbols count!" },
    blocks: { title: "Match the code blocks!", jobs: 10, seconds: 25, mistake: 0.2,
              how: "Click the block with the same code as the one at the top." },
    bugs:   { title: "Squash the bugs!",       jobs: 0,  seconds: 30, mistake: 0.1,
              how: "Tap every bug before it reaches the bottom. They come faster and faster!" },
    hype:   { title: "Build the hype!",        jobs: 6,  seconds: 25, mistake: 0.2,
              how: "Tap (or press Space) when the marker is inside the glowing zone. Every hit makes it faster!" },
  },

  // Bigger games have bigger mini-games.
  sizeFactor: { small: 1, medium: 1, big: 1.5, huge: 2 },

  // ----- Word lists -------------------------------------------------

  // Remember the plan: the four parts of a game idea.
  pads: [
    { word: "HERO",  color: "#ff3ea5" },
    { word: "WORLD", color: "#2ee6ff" },
    { word: "ENEMY", color: "#ff7a3d" },
    { word: "GOAL",  color: "#7cff6b" },
  ],

  // Write the code: real code. Short and easy at first, longer as your
  // studio grows (easy = Solo and Indie, medium = Small and Growing,
  // hard = Big and AAA).
  codeLines: {
    easy: [
      "jump()", "run()", "fly()", "swim()", "dig()", "spin()", "shoot()", "play()", "win()", "go()",
      "score++", "coins++", "lives--", "x = 5", "y = 10", "hp = 9", "speed = 2", "lives = 3", "gems = 0",
      "jump(2)", "move(5)", "say(\"hi\")", "turn(90)", "wait(1)", "beep()", "zoom()", "hide()", "show()",
    ],
    medium: [
      "score = 0", "lives = 3", "let x = 5", "let hp = 10", "timer--", "player.jump()", "music.play()",
      "hero.run()", "door.open()", "enemy.stop()", "coins = coins + 1", "speed = speed + 1",
      "if (win) party()", "if (hp == 0) end()", "let name = \"Max\"", "ball.x = 50", "hero.x++",
      "repeat(3) jump()", "say(\"Level 2\")", "let gems = 10", "boss.hp = 99", "if (coins > 9) win()",
    ],
    hard: [
      "let score = 0;", "score = score + 10;", "player.jump();", "door.open = true;", "enemy.speed = 2;",
      "hero.x = hero.x + speed;", "ball.y = ball.y + gravity;", "if (coins > 9) lives++;",
      "if (lives < 1) restart();", "if (health == 0) gameOver();", "if (score > best) best = score;",
      "if (key == \"space\") shoot();", "while (alive) run();", "while (timer > 0) tick();",
      "for (let i = 0; i < 3; i++) spawn();", "function jump() { y = y - 5; }",
      "function reset() { score = 0; }", "let boss = new Dragon();", "if (hasKey) door.open = true;",
      "let colors = [\"red\", \"blue\"];", "console.log(\"Level done!\");", "let maxSpeed = speed * 2;",
    ],
  },

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
      '<div class="mg-stats"><b id="mg-done"></b> &nbsp; Mistakes: <b id="mg-miss">0</b> &nbsp; Time: <b id="mg-time">' + game.timeLeft + '</b></div></div>' +
      '<p class="mg-how">' + info.how + '</p>' +
      '<div class="mg-arena" id="mg-arena"></div>' +
      '</div>';
    overlay.classList.remove("hidden");
    game.arena = document.getElementById("mg-arena");

    const show = () => {
      document.getElementById("mg-done").textContent = game.countText ? game.countText() : "Done: " + game.done + "/" + game.total;
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
    show();

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

  // ----- Concept: Remember the plan -------------------------------
  // Like the memory game "Simon": watch the lights, then copy them.
  setup_ideas(game) {
    game.arena.innerHTML = '<div class="mg-theme" id="mg-say">Watch!</div><div class="mg-pads" id="mg-pads"></div>';
    const box = document.getElementById("mg-pads");
    const say = document.getElementById("mg-say");
    const buttons = this.pads.map((pad, i) => {
      const b = document.createElement("button");
      b.className = "mg-pad";
      b.style.setProperty("--pad", pad.color);
      b.textContent = pad.word;
      box.appendChild(b);
      return b;
    });
    let order = [], pos = 0, watching = true;
    const flash = (i, ms) => {
      buttons[i].classList.add("lit");
      Sound.play("click");
      setTimeout(() => buttons[i].classList.remove("lit"), ms);
    };
    const show = () => {
      watching = true; pos = 0;
      say.innerHTML = "Watch!";
      order.forEach((i, k) => setTimeout(() => { if (!game.over) flash(i, 380); }, 600 + k * 600));
      setTimeout(() => { if (!game.over) { watching = false; say.innerHTML = "Your turn!"; } }, 600 + order.length * 600);
    };
    const newRound = () => {
      order = [];
      const length = 3 + game.done;               // 3, then 4, then 5...
      for (let k = 0; k < length; k++) order.push(Math.floor(Math.random() * 4));
      show();
    };
    buttons.forEach((b, i) => b.addEventListener("pointerdown", () => {
      if (game.over || watching) return;
      flash(i, 200);
      if (i === order[pos]) {
        pos++;
        if (pos === order.length) { watching = true; game.hit(); if (!game.over) setTimeout(newRound, 500); }
      } else {
        game.miss();
        if (!game.over) { say.innerHTML = "Oops! Watch again."; setTimeout(show, 700); watching = true; }
      }
    }));
    newRound();
  },

  // ----- Pre-production: Write the code -----------------------------
  setup_code(game) {
    game.arena.innerHTML = '<div class="mg-code" id="mg-code"></div><input id="mg-input" class="mg-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">';
    const codeEl = document.getElementById("mg-code");
    const input = document.getElementById("mg-input");
    const level = typeof studioLevel === "function" && state ? studioLevel(state) : 1;
    const tier = level <= 2 ? "easy" : level <= 4 ? "medium" : "hard";
    const lines = this.shuffle(this.codeLines[tier]);
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

  // ----- Launch: Build the hype -----------------------------------
  // A marker slides back and forth along the hype meter. Tap when it's
  // inside the glowing zone to post your next bit of marketing. Each hit
  // makes the marker faster and the zone smaller. Tapping outside the
  // zone is a mistake.
  hypeThings: ["Trailer posted!", "Streamers are playing it!", "Posters up!", "News story!", "Fans are sharing it!",
    "Demo is out!", "Ads everywhere!", "Big review!", "Countdown started!", "Everyone's talking!", "Gameplay video!", "Pre-orders open!"],

  setup_hype(game) {
    game.arena.innerHTML =
      '<div class="mg-theme" id="mg-say">Tap in the zone!</div>' +
      '<div class="mg-meter" id="mg-meter"><div class="mg-zone" id="mg-zone"></div><div class="mg-marker" id="mg-marker"></div></div>' +
      '<div class="mg-hype-bar"><div id="mg-hype-fill"></div></div><div class="muted mg-hype-label">HYPE</div>';
    const say = document.getElementById("mg-say");
    const zoneEl = document.getElementById("mg-zone");
    const marker = document.getElementById("mg-marker");
    const fill = document.getElementById("mg-hype-fill");
    const things = this.shuffle(this.hypeThings);
    let pos = 0, dir = 1, speed = 0.55;           // speed: meter widths per second
    let zone = { at: 0.6, width: 0.24 };
    let wait = 0;                                  // a short pause after each tap
    const placeZone = () => {
      // Somewhere new, not right where the marker is now.
      let at;
      do { at = Math.random() * (1 - zone.width); } while (Math.abs(at + zone.width / 2 - pos) < 0.3);
      zone.at = at;
      zoneEl.style.left = (zone.at * 100) + "%";
      zoneEl.style.width = (zone.width * 100) + "%";
    };
    placeZone();
    const tap = () => {
      if (game.over || wait > 0) return;
      wait = 0.25;
      if (pos >= zone.at && pos <= zone.at + zone.width) {
        say.textContent = things[game.done % things.length];
        say.className = "mg-theme good";
        speed *= 1.15;
        zone.width = Math.max(0.12, zone.width * 0.9);
        game.hit();
        fill.style.width = Math.min(100, game.done / game.total * 100) + "%";
        if (!game.over) placeZone();
      } else {
        say.textContent = pos < zone.at ? "Too early!" : "Too late!";
        say.className = "mg-theme bad";
        game.miss();
      }
    };
    game.arena.addEventListener("pointerdown", tap);
    const key = e => {
      if (game.over) { window.removeEventListener("keydown", key); return; }
      if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); tap(); }
    };
    window.addEventListener("keydown", key);
    game.update = dt => {
      if (game.over) { window.removeEventListener("keydown", key); return; }
      wait -= dt;
      pos += dir * speed * dt;
      if (pos > 1) { pos = 2 - pos; dir = -1; }
      if (pos < 0) { pos = -pos; dir = 1; }
      marker.style.left = (pos * 100) + "%";
      zoneEl.classList.toggle("in", pos >= zone.at && pos <= zone.at + zone.width);
    };
  },

  // ----- Testing: Squash the bugs ----------------------------------
  // Bugs keep coming for the whole time, faster and faster. Every bug
  // that gets away is a mistake. Let none through for a perfect score!
  setup_bugs(game) {
    const length = game.timeLeft;
    let spawn = 0.5;
    game.total = 1;
    game.isComplete = () => false;             // it only ends when time runs out
    game.part = () => 1;
    game.countText = () => "Squashed: " + game.done;
    game.update = dt => {
      const t = Math.min(1, 1 - game.timeLeft / length);   // 0 at the start, 1 at the end
      spawn -= dt;
      const w = game.arena.clientWidth, h = game.arena.clientHeight;
      if (spawn <= 0 && game.timeLeft > 1.5) {
        spawn = 1.3 - 1.0 * t;                    // a new bug every 1.3 s at first, every 0.3 s at the end
        const el = document.createElement("div");
        el.className = "mg-thing";
        el.textContent = "🐞";
        const fall = 3.6 - 1.8 * t + Math.random() * 0.6;   // seconds to reach the bottom
        const item = { el: el, x: 20 + Math.random() * (w - 60), y: -30, v: h / fall, t: Math.random() * 6 };
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

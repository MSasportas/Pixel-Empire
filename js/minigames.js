// =====================================================================
//  PIXEL EMPIRE - MINI-GAMES
//  ---------------------------------------------------------------------
//  Short 15-second games that make a step go faster. They only change
//  speed, never how good the game is. Each one counts "hits".
// =====================================================================

const Minigames = {
  // What each mini-game is called and what you do.
  info: {
    ideas:  { title: "Catch the ideas!",      how: "Click the falling light bulbs before they hit the floor." },
    typing: { title: "Type the plan!",        how: "Type each word of the game plan, then press Enter." },
    blocks: { title: "Match the code blocks!", how: "Click the block that matches the one at the top." },
    bugs:   { title: "Tap the bugs!",         how: "Squash the bugs by clicking them." },
  },

  planWords: ["player", "jump", "level", "score", "enemy", "coins", "boss", "music", "story", "map", "power", "health", "speed", "world", "shield", "goal", "timer", "hero", "door", "key"],

  // onHit runs on every hit. isStepDone says if the step already finished.
  start(type, onHit, isStepDone, onDone) {
    const overlay = document.getElementById("minigame");
    const info = this.info[type];
    overlay.innerHTML =
      '<div class="mg-box panel">' +
      '<div class="mg-top"><h2>' + info.title + '</h2><div class="mg-stats">Hits: <b id="mg-hits">0</b> &nbsp; Time: <b id="mg-time">' + CONFIG.minigameSeconds + '</b></div></div>' +
      '<p class="mg-how">' + info.how + '</p>' +
      '<div class="mg-arena" id="mg-arena"></div>' +
      '</div>';
    overlay.classList.remove("hidden");
    const arena = document.getElementById("mg-arena");
    const game = { hits: 0, timeLeft: CONFIG.minigameSeconds, arena: arena, items: [], over: false };
    const hit = () => {
      game.hits++;
      document.getElementById("mg-hits").textContent = game.hits;
      Sound.play("hit");
      onHit();
    };
    this["setup_" + type](game, hit);

    let last = performance.now();
    const loop = now => {
      if (game.over) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      game.timeLeft -= dt;
      document.getElementById("mg-time").textContent = Math.max(0, Math.ceil(game.timeLeft));
      if (game.update) game.update(dt);
      const stepDone = isStepDone();
      if (game.timeLeft <= 0 || stepDone) {
        game.over = true;
        arena.innerHTML = '<div class="mg-done">' + (stepDone ? "Step finished!" : "Time!") + ' You got ' + game.hits + ' hits.<br>That made this step ' +
          Math.round(Math.min(game.hits * CONFIG.minigameSpeedPerHit, CONFIG.minigameMaxSpeed) * 100) + '% faster.</div>';
        setTimeout(() => { overlay.classList.add("hidden"); overlay.innerHTML = ""; onDone(); }, 1600);
        return;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  // Falling things you click: used by "ideas" and "bugs".
  fallingGame(game, hit, emoji, speedMin, speedMax, everySeconds, wiggle) {
    let spawn = 0;
    game.update = dt => {
      spawn -= dt;
      const w = game.arena.clientWidth, h = game.arena.clientHeight;
      if (spawn <= 0) {
        spawn = everySeconds;
        const el = document.createElement("div");
        el.className = "mg-thing";
        el.textContent = emoji;
        const item = { el: el, x: 20 + Math.random() * (w - 60), y: -30, v: speedMin + Math.random() * (speedMax - speedMin), t: Math.random() * 6 };
        el.addEventListener("pointerdown", () => { hit(); el.remove(); item.dead = true; });
        game.arena.appendChild(el);
        game.items.push(item);
      }
      for (const it of game.items) {
        if (it.dead) continue;
        it.y += it.v * dt; it.t += dt;
        const x = it.x + (wiggle ? Math.sin(it.t * 4) * 20 : 0);
        it.el.style.transform = "translate(" + x + "px," + it.y + "px)";
        if (it.y > h) { it.el.remove(); it.dead = true; }
      }
      game.items = game.items.filter(i => !i.dead);
    };
  },

  setup_ideas(game, hit) {
    this.fallingGame(game, hit, "💡", 90, 160, 0.6, false);
  },

  setup_bugs(game, hit) {
    this.fallingGame(game, hit, "🐞", 60, 130, 0.45, true);
  },

  setup_typing(game, hit) {
    game.arena.innerHTML = '<div class="mg-word" id="mg-word"></div><input id="mg-input" class="mg-input" autocomplete="off" spellcheck="false">';
    const wordEl = document.getElementById("mg-word");
    const input = document.getElementById("mg-input");
    let word = "";
    const next = () => { word = this.planWords[Math.floor(Math.random() * this.planWords.length)]; wordEl.textContent = word; input.value = ""; };
    input.addEventListener("input", () => {
      const typed = input.value.trim().toLowerCase();
      input.classList.toggle("wrong", !word.startsWith(typed));
      if (typed === word) { hit(); next(); }
    });
    next();
    setTimeout(() => input.focus(), 50);
  },

  setup_blocks(game, hit) {
    const colors = ["#ff3ea5", "#2ee6ff", "#ffd23f", "#7cff6b"];
    const words = ["if", "loop", "jump()", "score++"];
    game.arena.innerHTML = '<div class="mg-target" id="mg-target"></div><div class="mg-choices" id="mg-choices"></div>';
    const round = () => {
      const target = Math.floor(Math.random() * 4);
      const tEl = document.getElementById("mg-target");
      tEl.innerHTML = '<span class="mg-block" style="background:' + colors[target] + '">' + words[target] + '</span>';
      const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      const box = document.getElementById("mg-choices");
      box.innerHTML = "";
      for (const i of order) {
        const b = document.createElement("button");
        b.className = "mg-block";
        b.style.background = colors[i];
        b.textContent = words[i];
        b.addEventListener("click", () => {
          if (game.over) return;
          if (i === target) { hit(); round(); } else { Sound.play("nope"); b.classList.add("shake"); }
        });
        box.appendChild(b);
      }
    };
    round();
  },
};

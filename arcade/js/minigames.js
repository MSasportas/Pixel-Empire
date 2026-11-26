// =====================================================================
//  PIXEL EMPIRE ARCADE - MINI-GAMES
//  ---------------------------------------------------------------------
//  They pop up in their own window in front of the arcade.
//    Write the code!   tap the code blocks in order: speeds up building a
//                      machine or a Mechanic's job (from the studio game)
//    Squash the bugs!  fixes a machine that caught a bug (from the studio game)
//    Fix the power!    a maze: lead the electricity to the light
//    Coin rush!        catch falling coins for a bonus on the coin box
// =====================================================================

const Minigames = {
  info: {
    code:  { title: "Write the code!",  jobs: 3, seconds: 30, mistake: 0.1,
             how: "Tap the code blocks in the right order to build each line. Every line you finish makes it faster!" },
    bugs:  { title: "Squash the bugs!", jobs: 0, seconds: 20, mistake: 0.1,
             how: "Tap every bug before it reaches the bottom. Let 5 or fewer get away to fix the machine!" },
    maze:  { title: "Fix the power!",   jobs: 1, seconds: 45, mistake: 0,
             how: "Lead the electricity from the plug to the light bulb. Use the arrow keys, the D-pad, or tap the squares next to the wire." },
    coins: { title: "Coin rush!",       jobs: 0, seconds: 15, mistake: 0, noMistakes: true,
             how: "Tap the coins before they fall! Every coin you catch adds to your bonus." },
  },

  // Small, simple lines of code for kids (the easy ones from the studio game).
  codeLines: [

      "jump()", "run()", "fly()", "swim()", "dig()", "spin()", "shoot()", "play()", "win()", "go()",
      "score++", "coins++", "lives--", "x = 5", "y = 10", "hp = 9", "speed = 2", "lives = 3", "gems = 0",
      "jump(2)", "move(5)", "say(\"hi\")", "turn(90)", "wait(1)", "beep()", "zoom()", "hide()", "show()",
    ],

  // type: "code", "bugs" or "maze". color: the window's color.
  // onDone(score): called at the end with a score from 0 to 1.
  start(type, color, onDone) {
    const overlay = document.getElementById("minigame");
    const info = this.info[type];
    const game = { total: info.jobs, done: 0, mistakes: 0, timeLeft: info.seconds, over: false, items: [] };
    overlay.innerHTML =
      '<div class="mg-box panel" style="border-color:' + color + '">' +
      '<div class="mg-top"><h2 style="color:' + color + ";text-shadow:0 0 8px " + color + '">' + info.title + '</h2>' +
      '<div class="mg-stats"><b id="mg-done"></b> <span' + (info.noMistakes ? ' class="hidden"' : "") + '>&nbsp; Mistakes: <b id="mg-miss">0</b></span> &nbsp; Time: <b id="mg-time">' + game.timeLeft + '</b></div></div>' +
      '<p class="mg-how">' + info.how + '</p>' +
      '<div class="mg-arena" id="mg-arena"></div>' +
      '</div>';
    overlay.classList.remove("hidden");
    this.active = game;
    game.arena = document.getElementById("mg-arena");

    const show = () => {
      document.getElementById("mg-done").textContent = game.countText ? game.countText() : "Done: " + game.done + "/" + game.total;
      document.getElementById("mg-miss").textContent = game.mistakes;
    };
    game.hit = () => {
      if (game.over) return;
      game.done++; show(); Sound.play("hit");
      if (game.isComplete()) finish("all");
    };
    game.miss = () => {
      if (game.over) return;
      game.mistakes++; show(); Sound.play("nope");
      const box = overlay.querySelector(".mg-box");
      box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
    };
    game.isComplete = () => game.done >= game.total;
    game.part = () => Math.min(1, game.done / game.total);

    const finish = why => {
      if (game.over) return;
      game.over = true;
      this.active = null;
      const part = game.part();
      const score = Math.max(0, part * (1 - info.mistake * game.mistakes));
      const msg = game.resultText ? game.resultText(score, why) :
        score >= 1 ? "<b>PERFECT!</b>" :
        (why === "time" ? "Time's up! " : "Done! ") + "That's <b>" + Math.round(score * 100) + "%</b>.";
      game.arena.innerHTML = '<div class="mg-done"><div>' + msg + "</div></div>";
      if (score >= 1) Sound.play("level");
      setTimeout(() => {
        overlay.classList.add("hidden");
        overlay.innerHTML = "";
        onDone(score);
      }, 1800);
    };
    game.finish = finish;

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

  // ----- Speeding things up: Write the code ------------------------------
  // Each line of code is cut into blocks. Tap them in the right order.
  setup_code(game) {
    game.arena.innerHTML = '<div class="mg-code" id="mg-code"></div><div class="mg-chips" id="mg-chips"></div>';
    const codeEl = document.getElementById("mg-code"), chipsEl = document.getElementById("mg-chips");
    const lines = this.shuffle(this.codeLines);
    let parts = [], placed = 0, n = 0;
    game.nextBlock = () => parts[placed];
    const draw = () => {
      codeEl.innerHTML = parts.map((p, i) => i < placed ? '<span class="typed">' + esc(p) + "</span>" : '<span class="slot-left">' + "&nbsp;".repeat(p.length) + "</span>").join("");
    };
    const next = () => {
      parts = lines[n++ % lines.length].match(/[A-Za-z_]+|\d+|"[^"]*"|\+\+|--|[()=]/g);
      placed = 0;
      chipsEl.innerHTML = "";
      for (const p of this.shuffle(parts)) {
        const chip = document.createElement("button");
        chip.className = "mg-chip"; chip.textContent = p;
        chip.addEventListener("click", () => {
          if (game.over || chip.classList.contains("used")) return;
          if (p === parts[placed]) {
            chip.classList.add("used"); placed++; Sound.play("click"); draw();
            if (placed >= parts.length) { game.hit(); if (!game.over) setTimeout(next, 250); }
          } else {
            chip.classList.remove("wrong"); void chip.offsetWidth; chip.classList.add("wrong");
            game.miss();
          }
        });
        chipsEl.appendChild(chip);
      }
      draw();
    };
    next();
  },

  // ----- Coin rush: catch the falling coins -------------------------------
  setup_coins(game) {
    let spawn = 0.2, made = 0;
    game.total = 1;
    game.isComplete = () => false;
    game.part = () => made ? game.done / made : 0;
    game.countText = () => "Coins: " + game.done;
    game.update = dt => {
      spawn -= dt;
      const w = game.arena.clientWidth, h = game.arena.clientHeight;
      if (spawn <= 0 && game.timeLeft > 1) {
        spawn = 0.45 + Math.random() * 0.3;
        made++;
        const el = document.createElement("div");
        el.className = "mg-thing"; el.textContent = "🪙";
        const item = { el: el, x: 20 + Math.random() * (w - 60), y: -30, v: h / (2.2 + Math.random() * 0.8), t: Math.random() * 6 };
        el.addEventListener("pointerdown", () => { if (item.dead || game.over) return; item.dead = true; el.remove(); game.hit(); });
        game.arena.appendChild(el);
        game.items.push(item);
      }
      for (const it of game.items) {
        if (it.dead) continue;
        it.y += it.v * dt; it.t += dt;
        it.el.style.transform = "translate(" + (it.x + Math.sin(it.t * 3) * 12) + "px," + it.y + "px)";
        if (it.y > h) { it.el.remove(); it.dead = true; }
      }
      game.items = game.items.filter(i => !i.dead);
    };
    game.resultText = score => "You caught <b>" + game.done + "</b> coins!<br>Bonus: <b>+" + Math.round(score * CONFIG.coinRush.bonus * 100) + "%</b>";
  },

  // ----- Fixing a machine: Squash the bugs ----------------------------------
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
    game.resultText = score => score >= CONFIG.bugFixScore
      ? (game.mistakes === 0 ? "<b>PERFECT!</b><br>" : "") + "The machine is fixed!"
      : game.mistakes + " bugs got away.<br>Almost! Try again.";
  },

  // ----- Power outage: Fix the power! (a maze) ----------------------
  // Grow the wire one square at a time from the plug to the bulb, around
  // the broken squares. Going back over the wire takes it back.
  setup_maze(game) {
    const W = 9, H = 6;
    game.countText = () => "Wire: " + (path ? path.length : 0);
    // Make a maze that has a way through.
    let blocked, start, end;
    for (let tries = 0; tries < 200; tries++) {
      start = { x: 0, y: Math.floor(Math.random() * H) };
      end = { x: W - 1, y: Math.floor(Math.random() * H) };
      blocked = [];
      for (let y = 0; y < H; y++) { blocked.push([]); for (let x = 0; x < W; x++) blocked[y].push(Math.random() < 0.32); }
      blocked[start.y][start.x] = false; blocked[end.y][end.x] = false;
      if (this.mazeLength(blocked, start, end, W, H) >= 10) break;
    }
    let path = [start];
    game.arena.innerHTML = '<div class="maze" id="maze" style="grid-template-columns:repeat(' + W + ',1fr)"></div>';
    const box = document.getElementById("maze");
    const cells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const el = document.createElement("div");
      el.className = "maze-cell" + (blocked[y][x] ? " rock" : "");
      el.dataset.x = x; el.dataset.y = y;
      if (x === start.x && y === start.y) el.textContent = "🔌";
      if (x === end.x && y === end.y) el.textContent = "💡";
      box.appendChild(el);
      cells.push(el);
    }
    const draw = () => {
      cells.forEach(el => el.classList.remove("wire", "head"));
      path.forEach((p, i) => { const el = cells[p.y * W + p.x]; el.classList.add("wire"); if (i === path.length - 1) el.classList.add("head"); });
    };
    const goTo = (x, y) => {
      if (game.over) return;
      const head = path[path.length - 1];
      const on = path.findIndex(p => p.x === x && p.y === y);
      if (on >= 0) { path = path.slice(0, on + 1); draw(); return; }      // take the wire back
      if (Math.abs(head.x - x) + Math.abs(head.y - y) !== 1) return;     // not next to the wire
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      if (blocked[y][x]) { game.miss(); return; }
      path.push({ x: x, y: y });
      Sound.play("click");
      draw();
      if (x === end.x && y === end.y) { cells[y * W + x].classList.add("lit"); game.hit(); }
    };
    let dragging = false;
    box.addEventListener("pointerdown", e => {
      const el = e.target.closest(".maze-cell"); if (!el) return;
      dragging = true; goTo(+el.dataset.x, +el.dataset.y);
    });
    box.addEventListener("pointermove", e => {
      if (!dragging) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el && el.closest && el.closest(".maze-cell");
      if (cell) { const head = path[path.length - 1]; if (+cell.dataset.x !== head.x || +cell.dataset.y !== head.y) goTo(+cell.dataset.x, +cell.dataset.y); }
    });
    window.addEventListener("pointerup", () => { dragging = false; });
    const key = e => {
      if (game.over) { window.removeEventListener("keydown", key); return; }
      const dirs = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
      const dir = dirs[e.key]; if (!dir) return;
      e.preventDefault();
      const head = path[path.length - 1];
      const nx = head.x + dir[0], ny = head.y + dir[1];
      // Moving back onto the wire takes the last square back
      const prev = path[path.length - 2];
      if (prev && prev.x === nx && prev.y === ny) { path.pop(); draw(); return; }
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
      goTo(nx, ny);
    };
    window.addEventListener("keydown", key);
    game.resultText = score => score >= 1 ? "<b>The lights are back on!</b>" : "Time's up!<br>Try again.";
    draw();
  },

  // How long the shortest way through is (or 0 if there's none).
  mazeLength(blocked, start, end, W, H) {
    const seen = new Set([start.x + "," + start.y]);
    let edge = [start], steps = 0;
    while (edge.length) {
      const next = [];
      for (const p of edge) {
        if (p.x === end.x && p.y === end.y) return steps + 1;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const x = p.x + dx, y = p.y + dy;
          if (x < 0 || y < 0 || x >= W || y >= H || blocked[y][x] || seen.has(x + "," + y)) continue;
          seen.add(x + "," + y); next.push({ x: x, y: y });
        }
      }
      edge = next; steps++;
    }
    return 0;
  },
};

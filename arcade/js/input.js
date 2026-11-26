// =====================================================================
//  PIXEL EMPIRE ARCADE - CONTROLS
//  ---------------------------------------------------------------------
//  Three ways to play:
//    Keyboard:   arrow keys or WASD to walk, Space (or E) to use things
//    Controller: left stick or D-pad to walk, A to use, B to go back,
//                Start for the menu. (Works with an Xbox controller.)
//    Phone:      tap a spot and you walk there by yourself
//
//  In menus and mini-games, the controller's stick moves a pointer and
//  A taps whatever is under it.
// =====================================================================

const Input = {
  keys: {},
  device: (typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches) ? "touch" : "keyboard",   // "keyboard", "gamepad", "mouse" or "touch"
  padWas: [],             // which controller buttons were down last time
  padMove: { x: 0, y: 0 },
  cursor: { x: 0, y: 0 },
  cursorEl: null,
  repeat: 0,
  handlers: {},

  init(canvas, handlers) {
    this.handlers = handlers;
    this.cursor = { x: innerWidth / 2, y: innerHeight / 2 };
    this.cursorEl = document.getElementById("pad-cursor");

    window.addEventListener("keydown", e => {
      if (!e.isTrusted && e.fromPad) return;
      this.device = "keyboard";
      const typing = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
      if (typing) { if (e.key === "Escape") e.target.blur(); return; }
      this.keys[e.key.toLowerCase()] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase()) && !UI.overlayOpen()) e.preventDefault();
      if ((e.key === " " || e.key === "Enter" || e.key.toLowerCase() === "e") && !e.repeat) {
        if (!UI.overlayOpen()) { e.preventDefault(); handlers.onAction(); }
      }
      if (e.key === "Escape") handlers.onBack();
      if ((e.key === "+" || e.key === "=") && !UI.overlayOpen()) handlers.onZoom(1);
      if ((e.key === "-" || e.key === "_") && !UI.overlayOpen()) handlers.onZoom(-1);
    });
    window.addEventListener("keyup", e => { this.keys[e.key.toLowerCase()] = false; });
    window.addEventListener("blur", () => { this.keys = {}; });

    // Touch and mouse on the arcade:
    //   a quick tap = walk there,  drag = look around,  pinch = zoom
    this.pointers = new Map();
    const pinchDist = () => { const [a, b] = [...this.pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    canvas.addEventListener("pointerdown", e => {
      this.device = e.pointerType === "touch" ? "touch" : "mouse";
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
      if (this.pointers.size === 1) this.gesture = { moved: false, pinched: false };
      if (this.pointers.size === 2) { this.gesture.pinched = true; this.pinchStart = pinchDist(); }
    });
    canvas.addEventListener("pointermove", e => {
      const pt = this.pointers.get(e.pointerId);
      if (!pt) return;
      const dx = e.clientX - pt.x, dy = e.clientY - pt.y;
      pt.x = e.clientX; pt.y = e.clientY;
      if (this.pointers.size >= 2) {
        // Pinch: fingers apart = zoom in, together = zoom out
        const d = pinchDist();
        if (d / this.pinchStart > 1.3) { handlers.onZoom(1); this.pinchStart = d; }
        else if (d / this.pinchStart < 0.77) { handlers.onZoom(-1); this.pinchStart = d; }
        return;
      }
      if (!this.gesture.moved && Math.hypot(e.clientX - pt.sx, e.clientY - pt.sy) > 10) this.gesture.moved = true;
      if (this.gesture.moved && !this.gesture.pinched) handlers.onPan(dx, dy);
    });
    const lift = (e, cancel) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      if (!cancel && this.pointers.size === 0 && this.gesture && !this.gesture.moved && !this.gesture.pinched) handlers.onTap(e.clientX, e.clientY);
    };
    canvas.addEventListener("pointerup", e => lift(e, false));
    canvas.addEventListener("pointercancel", e => lift(e, true));
    // Mouse wheel zooms
    let wheel = 0;
    canvas.addEventListener("wheel", e => {
      e.preventDefault();
      wheel += e.deltaY;
      if (Math.abs(wheel) >= 60) { handlers.onZoom(wheel < 0 ? 1 : -1); wheel = 0; }
    }, { passive: false });
    window.addEventListener("pointermove", e => { if (e.pointerType === "mouse" && this.device === "gamepad" && Math.abs(e.movementX) + Math.abs(e.movementY) > 4) this.device = "mouse"; });
    window.addEventListener("gamepadconnected", () => { UI.toast("Controller connected! Use the stick to walk and A to play."); });
  },

  // Which way to walk, from the keyboard and the controller together.
  moveVector() {
    const k = this.keys;
    let x = (k.arrowright || k.d ? 1 : 0) - (k.arrowleft || k.a ? 1 : 0);
    let y = (k.arrowdown || k.s ? 1 : 0) - (k.arrowup || k.w ? 1 : 0);
    x += this.padMove.x; y += this.padMove.y;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x: x, y: y };
  },

  // Called every frame. Reads the controller (the Gamepad API).
  poll(dt) {
    this.padMove = { x: 0, y: 0 };
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (const p of pads) if (p && p.connected) { pad = p; break; }
    if (!pad) { this.showCursor(false); return; }
    const down = i => pad.buttons[i] && pad.buttons[i].pressed;
    const pressed = i => down(i) && !this.padWas[i];
    let ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    if (Math.hypot(ax, ay) < 0.25) { ax = 0; ay = 0; }
    const dx = (down(15) ? 1 : 0) - (down(14) ? 1 : 0), dy = (down(13) ? 1 : 0) - (down(12) ? 1 : 0);
    const used = ax || ay || dx || dy || pad.buttons.some(b => b.pressed);
    if (used) this.device = "gamepad";

    if (UI.overlayOpen()) {
      // In menus: the stick moves a pointer, A taps, B goes back.
      if (this.device === "gamepad") this.showCursor(true);
      const speed = 700 * dt;
      this.cursor.x = Math.max(0, Math.min(innerWidth - 1, this.cursor.x + ax * speed));
      this.cursor.y = Math.max(0, Math.min(innerHeight - 1, this.cursor.y + ay * speed));
      // The D-pad acts like arrow keys (for the maze), one press at a time.
      for (const [i, key] of [[12, "ArrowUp"], [13, "ArrowDown"], [14, "ArrowLeft"], [15, "ArrowRight"]]) {
        if (pressed(i)) { const ev = new KeyboardEvent("keydown", { key: key, bubbles: true }); ev.fromPad = true; window.dispatchEvent(ev); }
      }
      if (!Minigames.active) { this.cursor.x += dx * speed * 0.8; this.cursor.y += dy * speed * 0.8; }
      this.placeCursor();
      if (pressed(0)) this.tapAtCursor();
      if (pressed(1)) this.handlers.onBack();
    } else {
      this.showCursor(false);
      this.padMove = { x: ax || dx, y: ay || dy };
      // Bumpers zoom (LB out, RB in). The right stick looks around.
      if (pressed(4)) this.handlers.onZoom(-1);
      if (pressed(5)) this.handlers.onZoom(1);
      let rx = pad.axes[2] || 0, ry = pad.axes[3] || 0;
      if (Math.hypot(rx, ry) > 0.25) this.handlers.onPan(-rx * 500 * dt, -ry * 500 * dt);
      if (pressed(0)) this.handlers.onAction();
      if (pressed(1)) this.handlers.onBack();
    }
    if (pressed(9)) this.handlers.onMenu();
    this.padWas = pad.buttons.map(b => b.pressed);
  },

  showCursor(on) { if (this.cursorEl) this.cursorEl.classList.toggle("hidden", !on); },

  placeCursor() {
    this.cursorEl.style.transform = "translate(" + this.cursor.x + "px," + this.cursor.y + "px)";
    const el = document.elementFromPoint(this.cursor.x, this.cursor.y);
    const button = el && el.closest ? el.closest("button, .maze-cell, .mg-thing, input") : null;
    if (button !== this.hover) {
      if (this.hover) this.hover.classList.remove("pad-hover");
      if (button) button.classList.add("pad-hover");
      this.hover = button;
    }
  },

  // Taps whatever is under the controller's pointer.
  tapAtCursor() {
    const el = document.elementFromPoint(this.cursor.x, this.cursor.y);
    if (!el) return;
    const opts = { bubbles: true, cancelable: true, clientX: this.cursor.x, clientY: this.cursor.y, pointerType: "mouse" };
    el.dispatchEvent(new PointerEvent("pointerdown", opts));
    el.dispatchEvent(new PointerEvent("pointerup", opts));
    if (el.tagName === "INPUT") el.focus();
    else el.dispatchEvent(new MouseEvent("click", opts));
  },
};

# Pixel Empire Arcade (test version)

A separate test version of Pixel Empire where you run a neon arcade
instead of a game studio. It lives in this `arcade/` folder and does not
change anything in the studio game. It has its own save slots
(`pixelEmpireArcade.slot.*`), so studio game saves are never touched.

- **Online:** https://msasportas.github.io/Pixel-Empire/arcade/
- **Controls:** arrow keys or WASD and Space; an Xbox controller (stick,
  A, B, Start); or on a phone, tap where you want to walk.
- **Try bugs and power outages fast:** add `?test` to the address.

| File | What it's for |
|------|---------------|
| `js/config.js` | **All the numbers**: machines, prices, rooms, how often bugs happen. |
| `js/game.js` | The rules: floor plan, customers, machines, money, saving. |
| `js/art.js` | Draws the arcade, machines and people with pixel art. |
| `js/input.js` | Keyboard, controller and touch. |
| `js/minigames.js` | Write the code, Squash the bugs, and the power maze. |
| `js/ui.js` | Title screen, the corner boxes and all the pop-ups. |
| `js/music.js` | Same music and sounds as the studio game. |
| `tools/robot-test.js` | A robot plays super fast: `node arcade/tools/robot-test.js` |

# Pixel Empire

An idle tycoon game where you run a video game studio. You start as a solo
developer with one desk, make games, grow your skills, win fans, and fill a
neon office with staff until you become a AAA studio.

Made with plain HTML, CSS and JavaScript. No game engine, no paid tools, and
no downloaded art or music: the pixel art and the synthwave music are both
made by the code itself.

## How to play it

- **Online:** once GitHub Pages is turned on, the game is at
  https://msasportas.github.io/pixel-empire/
- **On your computer:** download the code and double-click `index.html`.

## What each file does

| File | What it's for |
|------|---------------|
| `index.html` | The page itself. It loads everything else. |
| `css/style.css` | Colors, fonts and the neon look of buttons and boxes. |
| `js/config.js` | **All the numbers**: prices, speeds, how many fans each level needs. Change things here first! |
| `js/game.js` | The rules: making games, players, fans, money, saving. |
| `js/office.js` | Draws the office and the little people with pixel art. |
| `js/music.js` | The synthwave music and sound effects. |
| `js/minigames.js` | The 15-second speed-up games. |
| `js/ui.js` | The title screen, the HUD boxes and all the pop-up panels. |
| `js/main.js` | Starts the game and keeps it running. |
| `tools/balance-test.js` | A robot plays the game super fast to check the numbers. |

## Changing the numbers

Open `js/config.js`, change a number, save, and reload the page. For
example, make `devTimeSeconds` smaller and games get made faster.

To see how a change affects the whole game, run the robot test (you need
[Node.js](https://nodejs.org), which is free):

```
node tools/balance-test.js
```

It prints how many hours of play each studio level takes.

## Saves

The game saves in your browser every few seconds. Clearing your browser data
deletes the saves, so use **Menu → Download a backup** now and then.

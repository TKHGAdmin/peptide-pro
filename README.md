# Arcade — Greenheart & Cup Manager

A pocket-sized game collection built as a single iPhone-installable PWA.
A hub screen on launch lets you pick which game to play.

## Play it now

Open in **Safari** on iPhone:

**https://raw.githack.com/TKHGAdmin/peptide-pro/main/index.html**

Then **Share → Add to Home Screen** to launch fullscreen.

## The games

### 🛡️ Greenheart — A Hero's Tale
Top-down action / farming / building in the spirit of classic Zelda. Seven
biomes (meadow, forest, mountain, snowfield, desert, swamp, ruins), day/night
cycle, weather, freeform building (workbench, forge, garden, bed, lanterns,
doors, fences), cooking at campfires, and a Stalfos boss in the northeast
ruins that drops a permanent Heart Container.

### ⚽ Cup Manager — World Tournament
Tactical football management. Pick one of 32 nations (2022 World Cup field),
guide them through the group stage and the knockout bracket. Every chance in
every match is resolved with a literal d20 roll plus a player's stat modifier
versus a defender DC, with D&D-flavored narration. Each player has a D&D
class (Striker = Barbarian, Keeper = Cleric, etc.). Pick a formation
(4-3-3, 4-4-2, 4-2-3-1, 3-5-2) and a style (High Press, Balanced, Counter,
Park the Bus). Injuries take players out for one or two rounds. Penalty
shootouts decide drawn knockout games. Win the final to lift the trophy.

> Player rosters are seeded procedurally with region-appropriate names plus a
> sprinkle of well-known stars per top team. The simulation feels real; the
> exact bench depth isn't licensed FIFA data.

## Files

| File | Purpose |
|---|---|
| `index.html`            | Markup, hub + game containers |
| `style.css`             | All styles (shared + per-game) |
| `hub.js`                | Game selector controller |
| `game.js`               | Greenheart engine |
| `soccer.js`             | Cup Manager engine |
| `manifest.webmanifest`  | PWA install metadata |
| `sw.js`                 | Service worker (offline cache) |
| `icon-*.png`            | Home-screen icons |
| `.github/workflows/`    | GitHub Pages auto-deploy |

## Notes

- Single-page PWA. Everything is offline-cached via the service worker.
- No external dependencies; all art (Greenheart) and data (Cup Manager) is
  generated programmatically.
- Save state per game is stored in `localStorage`.

# Deepvein — a top-down survival game for iPhone

A Core Keeper–inspired mining/survival mini-game built as an installable Progressive Web App so it runs fullscreen on iPhone (no App Store needed). Procedural caves, ore tiers, slimes, crafting, hunger, lighting, and offline play.

## Run locally

It's a static site — any local web server works:

```bash
# from this repo root
python3 -m http.server 8080
# then visit http://localhost:8080 on the same network from your iPhone
```

## Install on iPhone (home-screen / fullscreen)

1. Open the URL in **Safari** on your iPhone.
2. Tap the **Share** icon → **Add to Home Screen**.
3. Launch from the home-screen icon — it runs fullscreen with no Safari chrome, just like a native app.

The service worker caches assets, so once installed you can play offline.

## Controls

- **Left thumb (joystick)** — move.
- **⚔ button** — hold to mine the wall in front of you or attack the slime in front of you. Your current tools auto-select (best pickaxe for walls, best sword for slimes).
- **✱ button** — use the item in the active hotbar slot (eat bread, place a campfire).
- **Hotbar (top center)** — tap a slot to make it the active item.
- **▦** — Inventory (tap any item to equip it).
- **✦** — Crafting menu.
- **☰** — Menu (save / new world / return to title).

Keyboard fallback for desktop: WASD/Arrows to move, Space to attack, E to use, 1–8 to select hotbar.

## Survival loop

- **Mine** dirt → stone → copper → iron → crystal (each requires a strong enough pickaxe).
- **Craft** Copper Pickaxe → Iron Pickaxe → Iron Sword at the crafting menu.
- **Eat** bread (craftable from mushrooms scattered on cave floors) to keep your hunger up. When hunger hits zero, you start losing HP.
- **Slimes** spawn around you and bite on contact. Fight them off or run.
- **Crystals** and **campfires** light up the dark. Campfires are placeable (Stone × 5, Crystal × 1).
- **Dying** sends you back to the spawn room — your inventory is preserved.

## File layout

| File | Purpose |
|---|---|
| `index.html` | Markup + iPhone meta tags + PWA wiring |
| `style.css` | Mobile-first HUD, joystick, modal styles |
| `game.js` | Game engine: world gen, render, input, combat, save |
| `manifest.webmanifest` | PWA install metadata |
| `sw.js` | Service worker (offline cache) |
| `icon-*.png`, `apple-touch-icon.png` | Home-screen icons |

## Tech notes

- Pure HTML5 Canvas 2D — no game-engine dependency.
- Procedural caves use a cellular-automaton smoothing pass plus ore-blob seeding.
- Save game persisted to `localStorage` (tile map base64-packed).
- Touch controls use Pointer Events for unified mouse/touch handling.
- iPhone safe-area insets are honored so the HUD doesn't hide behind the notch / home indicator.

## Future ideas

- Bosses (one per biome).
- More biomes past the crystal layer (e.g., a glowing fungal forest, a frozen vein).
- Larger crafting tree (smelting requires a furnace; smelted bars unlock armor).
- Day/night sound design.
- Native iOS port via Capacitor if you want App-Store distribution.

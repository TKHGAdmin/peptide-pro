# Greenheart — A Hero's Tale

A top-down action / farming / building game in the spirit of the classic Zelda
top-down adventures, built as an iPhone-installable PWA. Procedural overworld,
4-directional sword combat, freeform building, crops, crafting tiers, dungeon
ruins, save game, offline mode.

## Play it now

The same URL serves the latest commit on `main` via jsDelivr CDN — open this in
**Safari on iPhone**:

**https://cdn.jsdelivr.net/gh/TKHGAdmin/peptide-pro@main/index.html**

Then **Share → Add to Home Screen** to launch fullscreen.

## Controls

- **Joystick (left thumb)** — move (your hero faces the direction you push).
- **Sword (right thumb, big button)** — swing in the direction you're facing.
  Auto-targets enemies in melee, otherwise interacts with the tile in front:
  cut tall grass, slash bushes, chop trees (axe), mine rocks (pickaxe), pick
  flowers, break placed walls.
- **✱ Use** — eat food, plant a seed on a garden plot, place the structure
  in the active hotbar slot in front of you, read a signpost in front of
  you, or sleep when standing on a bed.
- **Hotbar (top center)** — tap a slot to make it active.
- **▦ Inventory** — tap an item to equip it.
- **✦ Crafting** — recipes gated by which station you're standing near
  (workbench / forge).
- **☰ Menu** — save / return to title / wipe save.

Keyboard fallback (for desktop testing): WASD/Arrows to move, Space to attack,
E to use, 1–8 to select hotbar.

## Loop

1. Cut **tall grass** with your sword → rupees, hearts, seeds.
2. Slash **bushes** → wood. Chop **trees** with an axe → more wood.
3. Mine **rocks** with a pickaxe → stone, chance of iron ore.
4. Craft **planks** (wood→plank ×2), then **Workbench**, then place it.
5. Standing near the workbench unlocks pickaxes, axes, garden plots, beds,
   stone walls, the forge, bread, and red potions.
6. Place a **Garden Plot**, equip a **Seed**, use ✱ on the plot → wait for it
   to grow → walk over the ripe plant to harvest carrots.
7. Place a **Bed** anywhere on grass — sleeping restores all health, and you
   respawn there if you faint.
8. Place a **Forge** (Workbench-tier recipe) → smelt **Iron Ore + Wood → Iron
   Ingot** → craft **Steel Sword**, **Iron Pickaxe**, **Iron Axe**.
9. Visit the **stone ruins in the NE corner** for iron ore (Ruin Walls drop
   iron when broken with a pickaxe). The ruins are guarded by tougher
   spawns.

## Enemies

| | | |
|---|---|---|
| **Slime** | bouncy green | melee on contact |
| **Octorok** | red, four-legged | walks at you AND lobs rocks from range |
| **Keese** | purple bat | fast & erratic, swooping |

Defeat any of them for rupees and a chance at a heart drop (instantly heals).

## Building

Anything you build snaps to the tile grid in front of your hero. A
**yellow ghost outline** previews where it will land; **red** means you
can't place there (e.g., facing water or an existing structure).

Placeable structures:
- **Wood Wall / Wood Floor** — basic, no station needed.
- **Stone Wall / Stone Floor** — tougher; requires Workbench to craft.
- **Workbench** — unlocks better recipes nearby.
- **Forge** — unlocks iron smelting and steel-tier weapons.
- **Garden Plot** — seed it to grow crops.
- **Bed** — sleep to heal, sets your respawn point.
- **Campfire** — light source.
- **Signpost** — prompts you for text; readable by anyone who walks up to it.

You can break your own placements (slash a wood wall, pickaxe a stone wall),
and you'll get a partial-material refund.

## Files

| File | Purpose |
|---|---|
| `index.html` | Markup + iPhone meta + PWA wiring |
| `style.css`  | Mobile-first HUD, hearts row, joystick |
| `game.js`    | Engine: world gen, render, input, combat, build, farming, save |
| `manifest.webmanifest` | PWA install metadata |
| `sw.js`      | Service worker (offline cache) |
| `icon-*.png` | Home-screen icons |
| `.github/workflows/pages.yml` | GitHub Pages auto-deploy |

## Tech

- Pure HTML5 Canvas 2D — no engine, no sprite sheets. All tiles, characters,
  and enemies are drawn from primitives.
- Procedural overworld via low-frequency value noise + biome carving.
- Save game persisted to `localStorage` (tile map base64-packed).
- Touch controls via Pointer Events; iPhone safe-area insets honored.

## Future ideas

- Bow + arrows, bombs, hookshot.
- Day / night cycle.
- Dungeon biomes with multi-room layouts and bosses.
- Companion NPCs, quest signposts, trading.
- Native iOS via Capacitor for App-Store distribution.

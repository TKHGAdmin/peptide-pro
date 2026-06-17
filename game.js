// Greenheart — a top-down Zelda-style action/building/farming game.
// PWA, iPhone-first touch UI, single-file engine, no asset dependencies
// (all art is drawn programmatically into a 2D canvas).
(function () {
'use strict';

// -------------------------------------------------------------------------
// Canvas + DPR
// -------------------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
let dpr = 1, viewW = 0, viewH = 0;
function resize() {
  dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  viewW = window.innerWidth; viewH = window.innerHeight;
  canvas.width  = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
  canvas.style.width = viewW + 'px';
  canvas.style.height = viewH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

// -------------------------------------------------------------------------
// World constants
// -------------------------------------------------------------------------
const TILE = 32;
const WORLD_W = 160, WORLD_H = 160;
const SAVE_KEY = 'greenheart.save.v1';
const ATTACK_COOLDOWN = 280;
const ENEMY_HIT_IFRAMES = 800;
const GROW_TIME = 90000;  // ms for a crop to mature
const NIGHT_ENEMY_MULT = 1.0; // (room for day/night later)

// Tiles ------------------------------------------------------------------
const T = {
  GRASS: 0,
  TALL_GRASS: 1,
  BUSH: 2,
  TREE: 3,
  ROCK: 4,
  ROCK_IRON: 5,
  WATER: 6,
  SAND: 7,
  FLOWER_R: 8,
  FLOWER_Y: 9,
  FLOWER_B: 10,
  DIRT_PATH: 11,
  // placed structures
  WOOD_FLOOR: 12,
  WOOD_WALL:  13,
  STONE_FLOOR:14,
  STONE_WALL: 15,
  WORKBENCH:  16,
  FORGE:      17,
  GARDEN_DRY: 18,
  GARDEN_PLANTED: 19,
  GARDEN_RIPE: 20,
  BED: 21,
  CAMPFIRE: 22,
  SIGNPOST: 23,
  RUIN_WALL: 24, // stone-ruin biome
  RUIN_FLOOR: 25,
};
const TDEF = {
  [T.GRASS]:        { walk: true,  cap: false },
  [T.TALL_GRASS]:   { walk: true,  cap: false, cut: { drops: { rupee: 0.30, heart_drop: 0.08, seed: 0.05 }, becomes: T.GRASS } },
  [T.BUSH]:         { walk: false, cap: true,  hp: 1, tool: 'any', drop: { wood: 1, rupee: 0.30, seed: 0.15 }, becomes: T.GRASS },
  [T.TREE]:         { walk: false, cap: true,  hp: 5, tool: 'axe', drop: { wood: 3, seed: 0.5 }, becomes: T.GRASS },
  [T.ROCK]:         { walk: false, cap: true,  hp: 4, tool: 'pickaxe', drop: { stone: 2, iron_ore: 0.10 }, becomes: T.DIRT_PATH },
  [T.ROCK_IRON]:    { walk: false, cap: true,  hp: 6, tool: 'pickaxe', drop: { stone: 1, iron_ore: 2 }, becomes: T.DIRT_PATH },
  [T.WATER]:        { walk: false, cap: false },
  [T.SAND]:         { walk: true,  cap: false },
  [T.FLOWER_R]:     { walk: true,  cap: false, pickup: { herb: 1 }, becomes: T.GRASS, color: '#e35a5a' },
  [T.FLOWER_Y]:     { walk: true,  cap: false, pickup: { herb: 1 }, becomes: T.GRASS, color: '#f4d24a' },
  [T.FLOWER_B]:     { walk: true,  cap: false, pickup: { herb: 1 }, becomes: T.GRASS, color: '#6aa6e0' },
  [T.DIRT_PATH]:    { walk: true,  cap: false },
  // placed
  [T.WOOD_FLOOR]:   { walk: true,  cap: false, placed: true, refund: { plank: 1 } },
  [T.WOOD_WALL]:    { walk: false, cap: true,  hp: 4, tool: 'any', placed: true, becomes: T.GRASS, refund: { plank: 2 } },
  [T.STONE_FLOOR]:  { walk: true,  cap: false, placed: true, refund: { stone: 1 } },
  [T.STONE_WALL]:   { walk: false, cap: true,  hp: 8, tool: 'pickaxe', placed: true, becomes: T.GRASS, refund: { stone: 2 } },
  [T.WORKBENCH]:    { walk: false, cap: true,  hp: 3, tool: 'any', placed: true, station: 'workbench', becomes: T.GRASS, refund: { plank: 2, stone: 1 } },
  [T.FORGE]:        { walk: false, cap: true,  hp: 4, tool: 'pickaxe', placed: true, station: 'forge', becomes: T.GRASS, light: 3, refund: { stone: 4 } },
  [T.GARDEN_DRY]:   { walk: true,  cap: false, placed: true, refund: { stone: 1 } },
  [T.GARDEN_PLANTED]: { walk: true, cap: false, placed: true },
  [T.GARDEN_RIPE]:  { walk: true,  cap: false, placed: true, harvest: { carrot: 1 }, becomes: T.GARDEN_DRY },
  [T.BED]:          { walk: true,  cap: false, placed: true, interact: 'sleep', refund: { plank: 3 } },
  [T.CAMPFIRE]:     { walk: false, cap: true,  hp: 2, tool: 'any', placed: true, light: 4, interact: 'fire', becomes: T.GRASS, refund: { stone: 2, wood: 1 } },
  [T.SIGNPOST]:     { walk: false, cap: true,  hp: 1, tool: 'any', placed: true, becomes: T.GRASS, refund: { plank: 1 } },
  [T.RUIN_WALL]:    { walk: false, cap: true,  hp: 10, tool: 'pickaxe', becomes: T.RUIN_FLOOR, drop: { stone: 2, iron_ore: 0.20 } },
  [T.RUIN_FLOOR]:   { walk: true,  cap: false },
};

// Items -----------------------------------------------------------------
const ITEMS = {
  // Tools
  sword_wood:   { name: 'Wooden Sword',  icon: '🗡️', tool: 'sword',   tier: 1, power: 2 },
  sword_steel:  { name: 'Steel Sword',   icon: '⚔️', tool: 'sword',   tier: 2, power: 4 },
  sword_master: { name: 'Master Sword',  icon: '🗡️', tool: 'sword',   tier: 3, power: 7 },
  axe_wood:     { name: 'Wooden Axe',    icon: '🪓', tool: 'axe',     tier: 1, power: 2 },
  axe_iron:     { name: 'Iron Axe',      icon: '🪓', tool: 'axe',     tier: 2, power: 4 },
  pickaxe_wood: { name: 'Wooden Pickaxe',icon: '⛏️', tool: 'pickaxe', tier: 1, power: 2 },
  pickaxe_iron: { name: 'Iron Pickaxe',  icon: '⛏️', tool: 'pickaxe', tier: 2, power: 4 },
  hammer:       { name: 'Hammer',        icon: '🔨', tool: 'hammer',  tier: 1, power: 1 },

  // Consumables
  bread:        { name: 'Bread',         icon: '🥖', heal: 20, use: 'eat', stack: 99 },
  potion_red:   { name: 'Red Potion',    icon: '🧪', heal: 50, use: 'eat', stack: 99 },
  carrot:       { name: 'Carrot',        icon: '🥕', heal: 10, use: 'eat', stack: 99 },
  fish:         { name: 'Fish',          icon: '🐟', heal: 15, use: 'eat', stack: 99 },
  heart_drop:   { name: 'Heart',         icon: '❤️', heal: 20, instant: true, stack: 99 },

  // Resources
  rupee:        { name: 'Rupee',         icon: '💎', stack: 999 },
  wood:         { name: 'Wood',          icon: '🪵', stack: 99 },
  plank:        { name: 'Plank',         icon: '🟫', stack: 99 },
  stone:        { name: 'Stone',         icon: '🪨', stack: 99 },
  iron_ore:     { name: 'Iron Ore',      icon: '🟤', stack: 99 },
  iron_ingot:   { name: 'Iron Ingot',    icon: '⬜', stack: 99 },
  seed:         { name: 'Seed',          icon: '🌰', stack: 99, use: 'plant' },
  herb:         { name: 'Herb',          icon: '🌿', stack: 99 },
  mushroom:     { name: 'Mushroom',      icon: '🍄', stack: 99 },

  // Placeables (each places its tile)
  wood_floor_item: { name: 'Wood Floor', icon: '🟫', stack: 99, place: T.WOOD_FLOOR },
  wood_wall_item:  { name: 'Wood Wall',  icon: '🟫', stack: 99, place: T.WOOD_WALL },
  stone_floor_item:{ name: 'Stone Floor',icon: '⬛', stack: 99, place: T.STONE_FLOOR },
  stone_wall_item: { name: 'Stone Wall', icon: '⬛', stack: 99, place: T.STONE_WALL },
  workbench_item:  { name: 'Workbench',  icon: '🧰', stack: 99, place: T.WORKBENCH },
  forge_item:      { name: 'Forge',      icon: '🏭', stack: 99, place: T.FORGE },
  garden_plot:     { name: 'Garden Plot',icon: '🟫', stack: 99, place: T.GARDEN_DRY },
  bed_item:        { name: 'Bed',        icon: '🛏️', stack: 99, place: T.BED },
  campfire_item:   { name: 'Campfire',   icon: '🔥', stack: 99, place: T.CAMPFIRE },
  signpost_item:   { name: 'Signpost',   icon: '🪧', stack: 99, place: T.SIGNPOST },
};

// Recipes ---------------------------------------------------------------
// `station: null` works anywhere; otherwise must be near a tile of that station.
const RECIPES = [
  // Basic (no station)
  { id: 'plank',           needs: { wood: 1 },         count: 2,  station: null },
  { id: 'campfire_item',   needs: { stone: 3, wood: 1 }, station: null },
  { id: 'wood_wall_item',  needs: { plank: 4 },        station: null },
  { id: 'wood_floor_item', needs: { plank: 2 },        station: null, count: 2 },
  { id: 'signpost_item',   needs: { plank: 2 },        station: null },

  // Workbench unlocks
  { id: 'workbench_item',  needs: { plank: 4, stone: 2 }, station: null },
  { id: 'pickaxe_wood',    needs: { plank: 2, stone: 3 }, station: 'workbench' },
  { id: 'axe_wood',        needs: { plank: 2, wood: 1 },  station: 'workbench' },
  { id: 'hammer',          needs: { plank: 2, stone: 2 }, station: 'workbench' },
  { id: 'garden_plot',     needs: { stone: 2, wood: 1 }, station: 'workbench' },
  { id: 'bed_item',        needs: { plank: 6, herb: 3 }, station: 'workbench' },
  { id: 'stone_wall_item', needs: { stone: 4 },         station: 'workbench' },
  { id: 'stone_floor_item',needs: { stone: 2 },         station: 'workbench', count: 2 },
  { id: 'forge_item',      needs: { stone: 10, wood: 2 },station: 'workbench' },
  { id: 'bread',           needs: { carrot: 2, mushroom: 1 }, station: 'workbench' },
  { id: 'potion_red',      needs: { herb: 3, mushroom: 1 },   station: 'workbench' },

  // Forge unlocks
  { id: 'iron_ingot',      needs: { iron_ore: 2, wood: 1 }, station: 'forge' },
  { id: 'sword_steel',     needs: { iron_ingot: 3, plank: 1 }, station: 'forge' },
  { id: 'axe_iron',        needs: { iron_ingot: 3, plank: 1 }, station: 'forge' },
  { id: 'pickaxe_iron',    needs: { iron_ingot: 3, plank: 1 }, station: 'forge' },
];

// -------------------------------------------------------------------------
// RNG
// -------------------------------------------------------------------------
function mulberry(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -------------------------------------------------------------------------
// World generation
// -------------------------------------------------------------------------
function genWorld(seed) {
  const W = WORLD_W, H = WORLD_H;
  const map = new Uint8Array(W * H);
  const rand = mulberry(seed);

  // value-noise like field, used to carve biomes
  const noise = new Float32Array(W * H);
  // simple low-frequency noise via random points + bilinear-ish smoothing
  const NF = 16;
  const pts = [];
  for (let y = 0; y <= H / NF; y++) {
    const row = [];
    for (let x = 0; x <= W / NF; x++) row.push(rand());
    pts.push(row);
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const gx = x / NF, gy = y / NF;
      const x0 = Math.floor(gx), y0 = Math.floor(gy);
      const fx = gx - x0, fy = gy - y0;
      const a = pts[y0][x0],     b = pts[y0][x0 + 1];
      const c = pts[y0 + 1][x0], d = pts[y0 + 1][x0 + 1];
      const ab = a * (1 - fx) + b * fx;
      const cd = c * (1 - fx) + d * fx;
      noise[y * W + x] = ab * (1 - fy) + cd * fy;
    }
  }

  // Base = grass
  for (let i = 0; i < W * H; i++) map[i] = T.GRASS;

  // Water lakes (high noise -> water)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = noise[y * W + x];
      if (n > 0.76) map[y * W + x] = T.WATER;
    }
  }
  // Sand ring around water
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (map[y * W + x] !== T.GRASS) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (map[(y + dy) * W + (x + dx)] === T.WATER) {
          map[y * W + x] = T.SAND; dy = 2; break;
        }
      }
    }
  }

  // Stone ruins in NE corner (a small dungeon-like patch)
  const ruinCX = (W * 0.78) | 0, ruinCY = (H * 0.22) | 0;
  for (let y = ruinCY - 10; y <= ruinCY + 10; y++) {
    for (let x = ruinCX - 12; x <= ruinCX + 12; x++) {
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
      const dx = x - ruinCX, dy = y - ruinCY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 11) continue;
      if (map[y * W + x] === T.WATER) continue;
      if (d > 9 && rand() > 0.45) continue;
      // outer ring of ruin walls, inside is ruin floor with rock_iron clumps
      if (d > 8.5) map[y * W + x] = T.RUIN_WALL;
      else map[y * W + x] = T.RUIN_FLOOR;
    }
  }
  // iron ore clumps inside ruins
  for (let i = 0; i < 18; i++) {
    const x = ruinCX + Math.floor((rand() - 0.5) * 16);
    const y = ruinCY + Math.floor((rand() - 0.5) * 16);
    if (map[y * W + x] === T.RUIN_FLOOR) map[y * W + x] = T.ROCK_IRON;
  }

  // Trees: cluster in low-noise zones
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (map[y * W + x] !== T.GRASS) continue;
      const n = noise[y * W + x];
      if (n < 0.22 && rand() < 0.32) map[y * W + x] = T.TREE;
      else if (n < 0.3 && rand() < 0.10) map[y * W + x] = T.BUSH;
    }
  }

  // Tall grass patches
  for (let i = 0; i < 1200; i++) {
    const cx = (rand() * W) | 0, cy = (rand() * H) | 0;
    const r = 2 + (rand() * 4) | 0;
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
      if (map[y * W + x] !== T.GRASS) continue;
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r * r) continue;
      if (rand() < 0.7) map[y * W + x] = T.TALL_GRASS;
    }
  }

  // Flowers
  for (let i = 0; i < 400; i++) {
    const x = (rand() * W) | 0, y = (rand() * H) | 0;
    if (map[y * W + x] === T.GRASS) {
      const r = rand();
      map[y * W + x] = r < 0.4 ? T.FLOWER_Y : r < 0.7 ? T.FLOWER_R : T.FLOWER_B;
    }
  }

  // Rocks scattered (mostly in northern/western edges to encourage exploration)
  for (let i = 0; i < 240; i++) {
    const x = (rand() * W) | 0, y = (rand() * H) | 0;
    if (map[y * W + x] === T.GRASS || map[y * W + x] === T.TALL_GRASS) {
      map[y * W + x] = (rand() < 0.05) ? T.ROCK_IRON : T.ROCK;
    }
  }

  // World edge: ring of impassable rocks
  for (let x = 0; x < W; x++) {
    map[x] = T.ROCK; map[(H - 1) * W + x] = T.ROCK;
  }
  for (let y = 0; y < H; y++) {
    map[y * W] = T.ROCK; map[y * W + W - 1] = T.ROCK;
  }

  // Spawn clearing in the center
  const spawn = { x: (W / 2) | 0, y: (H / 2) | 0 };
  for (let y = spawn.y - 4; y <= spawn.y + 4; y++) {
    for (let x = spawn.x - 4; x <= spawn.x + 4; x++) {
      if (map[y * W + x] === T.WATER) continue;
      map[y * W + x] = T.GRASS;
    }
  }
  // Welcome signpost
  map[spawn.y * W + spawn.x + 2] = T.SIGNPOST;

  return { map: Array.from(map), spawn };
}

// -------------------------------------------------------------------------
// State
// -------------------------------------------------------------------------
let state = null;
let damageMap = new Map();   // "tx,ty" -> remaining hp
let growthMap = new Map();   // "tx,ty" -> grow timer (ms remaining)
let signs = new Map();       // "tx,ty" -> text
let stationsNear = { workbench: false, forge: false };

function newGame() {
  const seed = (Math.random() * 0x7fffffff) | 0;
  const w = genWorld(seed);
  state = {
    seed,
    map: w.map,
    spawn: w.spawn,
    player: {
      x: (w.spawn.x + 0.5) * TILE,
      y: (w.spawn.y + 0.5) * TILE,
      hp: 50, maxHp: 50,
      rupees: 0,
      facing: { x: 0, y: 1 },
      facingKey: 'down',
      iframes: 0,
      swing: 0,    // ms remaining of swing anim
      buildMode: false,
      respawn: null, // { x, y } if bed placed
    },
    inv: {
      slots: [
        { id: 'sword_wood', n: 1 },
        { id: 'axe_wood',   n: 1 },
        { id: 'pickaxe_wood',n: 1 },
        null, null, null, null, null,
      ],
      store: { rupee: 0 },
      hotbar: 0,
    },
    enemies: [],
    projectiles: [],
    drops: [],     // floating loot pickups
    nextEnemy: 4000,
    growthEntries: {}, // tx,ty -> ms left
    signEntries: { [w.spawn.x + 2 + ',' + w.spawn.y]: 'Welcome,\nHero.' },
    time: 0,
  };
  damageMap = new Map();
  growthMap = new Map();
  signs = new Map(Object.entries(state.signEntries));
  spawnInitialEnemies();
  save();
}

function spawnInitialEnemies() {
  let n = 0, tries = 0;
  while (n < 10 && tries < 400) {
    tries++;
    const tx = (Math.random() * WORLD_W) | 0;
    const ty = (Math.random() * WORLD_H) | 0;
    const t = state.map[ty * WORLD_W + tx];
    if (!TDEF[t].walk) continue;
    const dx = tx - state.spawn.x, dy = ty - state.spawn.y;
    if (dx * dx + dy * dy < 144) continue;
    const r = Math.random();
    const kind = r < 0.55 ? 'slime' : r < 0.85 ? 'octorok' : 'keese';
    pushEnemy(kind, (tx + 0.5) * TILE, (ty + 0.5) * TILE);
    n++;
  }
}

function pushEnemy(kind, x, y) {
  const defs = {
    slime:   { hp: 8,  maxHp: 8,  speed: 1.0, damage: 6,  loot: { rupee: 1, heart_drop: 0.25 } },
    octorok: { hp: 12, maxHp: 12, speed: 1.1, damage: 8,  loot: { rupee: 2, heart_drop: 0.20 }, ranged: true },
    keese:   { hp: 5,  maxHp: 5,  speed: 1.8, damage: 5,  loot: { rupee: 1, heart_drop: 0.10 } },
  };
  const d = defs[kind];
  state.enemies.push({
    kind, x, y, hp: d.hp, maxHp: d.maxHp,
    speed: d.speed, damage: d.damage, loot: d.loot, ranged: !!d.ranged,
    vx: 0, vy: 0, think: 0, shootCd: 1200 + Math.random() * 1500,
    hitFlash: 0,
  });
}

// -------------------------------------------------------------------------
// Save / load
// -------------------------------------------------------------------------
function save() {
  try {
    const compact = {
      v: 1,
      seed: state.seed,
      map: btoa(String.fromCharCode.apply(null, state.map)),
      spawn: state.spawn,
      player: state.player,
      inv: state.inv,
      enemies: state.enemies,
      growth: Object.fromEntries(growthMap),
      signs: Object.fromEntries(signs),
      time: state.time,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(compact));
  } catch (e) { /* quota */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
    const s = JSON.parse(raw);
    if (s.v !== 1) return false;
    const bin = atob(s.map);
    const map = new Array(bin.length);
    for (let i = 0; i < bin.length; i++) map[i] = bin.charCodeAt(i);
    state = {
      seed: s.seed, map, spawn: s.spawn, player: s.player, inv: s.inv,
      enemies: s.enemies, projectiles: [], drops: [],
      nextEnemy: 4000, time: s.time,
      signEntries: s.signs || {},
    };
    damageMap = new Map();
    growthMap = new Map(Object.entries(s.growth || {}).map(([k, v]) => [k, +v]));
    signs = new Map(Object.entries(s.signs || {}));
    return true;
  } catch (e) { return false; }
}
function wipe() { localStorage.removeItem(SAVE_KEY); }

// -------------------------------------------------------------------------
// Inventory helpers
// -------------------------------------------------------------------------
function invAdd(id, n) {
  if (!ITEMS[id]) return;
  n = n || 1;
  const def = ITEMS[id];
  if (def.stack && def.stack > 1) {
    state.inv.store[id] = (state.inv.store[id] || 0) + n;
  } else {
    for (let i = 0; i < state.inv.slots.length; i++) {
      if (!state.inv.slots[i]) { state.inv.slots[i] = { id, n: 1 }; return; }
    }
    // No empty slot: drop into store anyway
    state.inv.store[id] = (state.inv.store[id] || 0) + n;
  }
}
function invCount(id) {
  let n = state.inv.store[id] || 0;
  for (const s of state.inv.slots) if (s && s.id === id) n += s.n;
  return n;
}
function invConsume(id, n) {
  let need = n;
  if (state.inv.store[id]) {
    const take = Math.min(state.inv.store[id], need);
    state.inv.store[id] -= take; need -= take;
    if (state.inv.store[id] <= 0) delete state.inv.store[id];
  }
  for (let i = 0; i < state.inv.slots.length && need > 0; i++) {
    const s = state.inv.slots[i];
    if (s && s.id === id) {
      const take = Math.min(s.n, need);
      s.n -= take; need -= take;
      if (s.n <= 0) state.inv.slots[i] = null;
    }
  }
}
function bestTool(kind) {
  let best = null;
  for (const s of state.inv.slots) {
    if (!s) continue;
    const d = ITEMS[s.id];
    if (d && d.tool === kind) {
      if (!best || d.power > ITEMS[best].power) best = s.id;
    }
  }
  return best;
}
function equippedSlot() { return state.inv.slots[state.inv.hotbar] || null; }

// Apply a drop table: numeric value n with int part = always, fractional = chance.
function applyDrop(table, dropAt) {
  const out = {};
  for (const k in table) {
    let v = table[k];
    let count = Math.floor(v);
    const chance = v - count;
    if (chance > 0 && Math.random() < chance) count++;
    if (count > 0) {
      // Hearts heal directly instead of going into inventory.
      if (k === 'heart_drop') {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + ITEMS.heart_drop.heal);
      } else if (k === 'rupee') {
        state.player.rupees = Math.min(999, state.player.rupees + count);
      } else {
        invAdd(k, count);
      }
      out[k] = count;
    }
  }
  // floating "+N item" indicator
  if (dropAt) {
    const parts = [];
    for (const k in out) {
      if (k === 'heart_drop') parts.push('+♥');
      else if (k === 'rupee') parts.push('+' + out[k] + '💎');
      else parts.push('+' + out[k] + (ITEMS[k] ? ITEMS[k].icon : ''));
    }
    if (parts.length) {
      state.drops.push({ x: dropAt.x, y: dropAt.y, t: 900, text: parts.join(' ') });
    }
  }
}

// -------------------------------------------------------------------------
// Tile helpers
// -------------------------------------------------------------------------
function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return T.ROCK;
  return state.map[ty * WORLD_W + tx];
}
function setTile(tx, ty, v) { state.map[ty * WORLD_W + tx] = v; }
function isWalkTile(t) { return TDEF[t] && TDEF[t].walk; }
function tileInFront(p) {
  const fx = p.x + p.facing.x * TILE * 0.85;
  const fy = p.y + p.facing.y * TILE * 0.85;
  return { tx: Math.floor(fx / TILE), ty: Math.floor(fy / TILE), x: fx, y: fy };
}
function wallHit(x, y, r) {
  const minTX = Math.floor((x - r) / TILE), maxTX = Math.floor((x + r) / TILE);
  const minTY = Math.floor((y - r) / TILE), maxTY = Math.floor((y + r) / TILE);
  for (let ty = minTY; ty <= maxTY; ty++)
    for (let tx = minTX; tx <= maxTX; tx++)
      if (!isWalkTile(tileAt(tx, ty))) return true;
  return false;
}
function tryMove(ent, dx, dy, r) {
  const nx = ent.x + dx;
  if (!wallHit(nx, ent.y, r)) ent.x = nx;
  const ny = ent.y + dy;
  if (!wallHit(ent.x, ny, r)) ent.y = ny;
}

// Check stations near player (within 2-tile radius)
function recomputeStations() {
  const p = state.player;
  const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
  stationsNear = { workbench: false, forge: false };
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const t = tileAt(ptx + dx, pty + dy);
    const def = TDEF[t]; if (!def) continue;
    if (def.station === 'workbench') stationsNear.workbench = true;
    if (def.station === 'forge')     stationsNear.forge = true;
  }
}

// -------------------------------------------------------------------------
// Input — joystick + buttons + keyboard fallback
// -------------------------------------------------------------------------
const joyContainer = document.getElementById('joy');
const joyBase = document.getElementById('joyBase');
const joyStick = document.getElementById('joyStick');
const btnA = document.getElementById('btnA');
const btnB = document.getElementById('btnB');
let joyPointer = null, joyRadius = 50, joyCenter = { x: 0, y: 0 };
let inputVec = { x: 0, y: 0 };
let attackHeld = false;

function setJoyCenter() {
  const r = joyBase.getBoundingClientRect();
  joyRadius = r.width / 2 - 12;
  joyCenter.x = r.left + r.width / 2;
  joyCenter.y = r.top + r.height / 2;
}
window.addEventListener('resize', setJoyCenter);
setTimeout(setJoyCenter, 0);

joyContainer.addEventListener('pointerdown', e => {
  if (joyPointer !== null) return;
  joyPointer = e.pointerId;
  setJoyCenter();
  joyContainer.setPointerCapture(e.pointerId);
  joyMove(e);
  e.preventDefault();
});
function joyMove(e) {
  if (e.pointerId !== joyPointer) return;
  const dx = e.clientX - joyCenter.x, dy = e.clientY - joyCenter.y;
  const d = Math.hypot(dx, dy);
  const cd = Math.min(d, joyRadius);
  const ux = d ? dx / d : 0, uy = d ? dy / d : 0;
  let vx = (cd / joyRadius) * ux;
  let vy = (cd / joyRadius) * uy;
  if (Math.hypot(vx, vy) < 0.18) { vx = 0; vy = 0; }
  inputVec.x = vx; inputVec.y = vy;
  joyStick.style.transform = `translate(${ux * cd}px, ${uy * cd}px)`;
}
joyContainer.addEventListener('pointermove', joyMove);
function joyEnd(e) {
  if (e.pointerId !== joyPointer) return;
  joyPointer = null;
  inputVec.x = 0; inputVec.y = 0;
  joyStick.style.transform = '';
}
joyContainer.addEventListener('pointerup', joyEnd);
joyContainer.addEventListener('pointercancel', joyEnd);

btnA.addEventListener('pointerdown', e => { attackHeld = true; btnA.setPointerCapture(e.pointerId); e.preventDefault(); });
btnA.addEventListener('pointerup',   () => { attackHeld = false; });
btnA.addEventListener('pointercancel', () => { attackHeld = false; });
btnB.addEventListener('pointerdown', e => { useEquipped(); e.preventDefault(); });

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') attackHeld = true;
  if (e.key.toLowerCase() === 'e') useEquipped();
  if (e.key >= '1' && e.key <= '8') { state.inv.hotbar = parseInt(e.key, 10) - 1; renderHotbar(); }
});
window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
  if (e.key === ' ') attackHeld = false;
});
function readInput() {
  let vx = inputVec.x, vy = inputVec.y;
  if (vx === 0 && vy === 0) {
    let kx = 0, ky = 0;
    if (keys['a'] || keys['arrowleft'])  kx -= 1;
    if (keys['d'] || keys['arrowright']) kx += 1;
    if (keys['w'] || keys['arrowup'])    ky -= 1;
    if (keys['s'] || keys['arrowdown'])  ky += 1;
    const l = Math.hypot(kx, ky); if (l > 0) { kx /= l; ky /= l; }
    vx = kx; vy = ky;
  }
  return { x: vx, y: vy };
}
function dirKey(fx, fy) {
  if (Math.abs(fx) > Math.abs(fy)) return fx > 0 ? 'right' : 'left';
  return fy > 0 ? 'down' : 'up';
}

// -------------------------------------------------------------------------
// HUD
// -------------------------------------------------------------------------
const heartsEl = document.getElementById('hearts');
const rupeesEl = document.getElementById('rupees');
const hotbarEl = document.getElementById('hotbar');
const stationBadgeEl = document.getElementById('stationBadge');
const toastEl = document.getElementById('toast');
let toastTimer = 0;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  toastTimer = 1600;
}
function renderHearts() {
  if (!state) return;
  const p = state.player;
  heartsEl.innerHTML = '';
  const hpPerHeart = p.maxHp / 5;
  for (let i = 0; i < 5; i++) {
    const filled = Math.max(0, Math.min(1, (p.hp - i * hpPerHeart) / hpPerHeart));
    const el = document.createElement('div');
    el.className = 'heart';
    el.innerHTML = `<span class="full" style="clip-path:inset(0 ${100 - filled * 100}% 0 0)"></span>`;
    heartsEl.appendChild(el);
  }
  rupeesEl.textContent = '💎 ' + p.rupees;
}
function renderHotbar() {
  if (!state) return;
  hotbarEl.innerHTML = '';
  for (let i = 0; i < state.inv.slots.length; i++) {
    const s = state.inv.slots[i];
    const el = document.createElement('div');
    el.className = 'slot' + (i === state.inv.hotbar ? ' active' : '');
    if (s) {
      el.textContent = ITEMS[s.id].icon;
      if (s.n > 1) {
        const c = document.createElement('div'); c.className = 'count'; c.textContent = s.n; el.appendChild(c);
      }
    }
    el.addEventListener('pointerdown', () => { state.inv.hotbar = i; renderHotbar(); });
    hotbarEl.appendChild(el);
  }
}
function renderStationBadge() {
  const parts = [];
  if (stationsNear.workbench) parts.push('🧰 Workbench');
  if (stationsNear.forge)     parts.push('🏭 Forge');
  stationBadgeEl.textContent = parts.join(' · ');
  stationBadgeEl.style.opacity = parts.length ? '1' : '0';
}

// -------------------------------------------------------------------------
// Modal (inventory, craft, menu, sign)
// -------------------------------------------------------------------------
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('btnBag').addEventListener('click', () => openInventory());
document.getElementById('btnCraft').addEventListener('click', () => openCraft());
document.getElementById('btnMenu').addEventListener('click', () => openMenu());
let paused = true;
function openModal() { modal.classList.remove('hidden'); paused = true; }
function closeModal() { modal.classList.add('hidden'); paused = false; lastTime = performance.now(); }

function openInventory() {
  modalTitle.textContent = 'Inventory';
  modalBody.innerHTML = '';
  const all = [];
  for (let i = 0; i < state.inv.slots.length; i++) {
    const s = state.inv.slots[i]; if (s) all.push({ id: s.id, n: s.n, idx: i, equipped: true });
  }
  for (const id in state.inv.store) {
    if (state.inv.store[id] > 0) all.push({ id, n: state.inv.store[id] });
  }
  const grid = document.createElement('div'); grid.className = 'grid';
  for (let i = 0; i < Math.max(24, all.length); i++) {
    const it = all[i];
    const slot = document.createElement('div');
    slot.className = 'invslot' + (it ? '' : ' empty');
    if (it) {
      const d = ITEMS[it.id];
      slot.textContent = d.icon;
      const c = document.createElement('div'); c.className = 'count'; c.textContent = it.n; slot.appendChild(c);
      slot.title = d.name;
      slot.addEventListener('click', () => {
        if (it.equipped) { state.inv.hotbar = it.idx; renderHotbar(); closeModal(); }
        else { equipResource(it.id); closeModal(); }
      });
    }
    grid.appendChild(slot);
  }
  modalBody.appendChild(grid);
  const help = document.createElement('p');
  help.style.cssText = 'color:var(--muted);font-size:12px;margin-top:12px';
  help.textContent = 'Tap an item to equip it to the active hotbar slot. Use the ✱ button to consume food or place a structure in front of you.';
  modalBody.appendChild(help);
  openModal();
}
function equipResource(id) {
  const have = state.inv.store[id] || 0; if (have <= 0) return;
  const idx = state.inv.hotbar;
  const cur = state.inv.slots[idx];
  if (cur) {
    const d = ITEMS[cur.id];
    if (d && (d.use || d.place !== undefined || (d.stack && d.stack > 1))) {
      state.inv.store[cur.id] = (state.inv.store[cur.id] || 0) + cur.n;
    } else {
      let placed = false;
      for (let i = 0; i < state.inv.slots.length; i++) {
        if (!state.inv.slots[i] && i !== idx) { state.inv.slots[i] = cur; placed = true; break; }
      }
      if (!placed) { showToast('Free a hotbar slot first'); return; }
    }
  }
  state.inv.slots[idx] = { id, n: have };
  delete state.inv.store[id];
  renderHotbar();
}

function openCraft() {
  modalTitle.textContent = 'Crafting';
  modalBody.innerHTML = '';
  const badge = document.createElement('div');
  badge.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px';
  const stations = [];
  if (stationsNear.workbench) stations.push('🧰 near Workbench');
  if (stationsNear.forge)     stations.push('🏭 near Forge');
  badge.textContent = stations.length ? stations.join(' · ') : 'No nearby stations — basic recipes only';
  modalBody.appendChild(badge);

  for (const r of RECIPES) {
    const def = ITEMS[r.id]; if (!def) continue;
    const reqOk = !r.station || stationsNear[r.station];
    const matOk = Object.entries(r.needs).every(([k, v]) => invCount(k) >= v);
    const row = document.createElement('div'); row.className = 'recipe';
    const ic = document.createElement('div'); ic.className = 'icon'; ic.textContent = def.icon;
    const info = document.createElement('div'); info.className = 'info';
    const name = document.createElement('div'); name.className = 'name';
    name.textContent = def.name + (r.count > 1 ? ` ×${r.count}` : '');
    if (r.station) name.textContent += ' (' + r.station + ')';
    const cost = document.createElement('div'); cost.className = 'cost';
    cost.textContent = Object.entries(r.needs).map(([k, v]) => `${ITEMS[k].icon} ${v}`).join('  ');
    info.appendChild(name); info.appendChild(cost);
    const btn = document.createElement('button'); btn.textContent = 'Craft';
    btn.disabled = !(reqOk && matOk);
    btn.addEventListener('click', () => {
      if (!(reqOk && matOk)) return;
      for (const [k, v] of Object.entries(r.needs)) invConsume(k, v);
      invAdd(r.id, r.count || 1);
      showToast(`Crafted ${def.name}`);
      openCraft(); renderHotbar(); save();
    });
    row.appendChild(ic); row.appendChild(info); row.appendChild(btn);
    modalBody.appendChild(row);
  }
  openModal();
}

function openMenu() {
  modalTitle.textContent = 'Menu';
  modalBody.innerHTML = '';
  const mk = (label, fn) => {
    const b = document.createElement('button'); b.className = 'menuitem'; b.textContent = label;
    b.addEventListener('click', fn); modalBody.appendChild(b);
  };
  mk('Resume', closeModal);
  mk('Save now', () => { save(); showToast('Saved'); });
  mk('Return to title', () => { save(); closeModal(); showTitle(); });
  mk('Reset save (new world)', () => {
    if (confirm('Wipe save and start over?')) {
      wipe(); newGame(); renderHotbar(); closeModal();
      showToast('A new realm awaits');
    }
  });
  openModal();
}

function openSign(tx, ty) {
  const text = signs.get(tx + ',' + ty);
  if (!text) return;
  modalTitle.textContent = 'Signpost';
  modalBody.innerHTML = '';
  const p = document.createElement('p');
  p.style.cssText = 'white-space:pre-line;font-size:16px;line-height:1.5;text-align:center;padding:20px 0';
  p.textContent = text;
  modalBody.appendChild(p);
  openModal();
}

// -------------------------------------------------------------------------
// Use button: eat food, place tile, plant seed, interact with bed/sign
// -------------------------------------------------------------------------
function useEquipped() {
  if (!state || paused) return;
  const p = state.player;

  // Interact: bed under feet, sign in front
  const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
  const here = tileAt(tx, ty);
  const front = tileInFront(p);
  const fTile = tileAt(front.tx, front.ty);
  if (here === T.BED) { sleep(); return; }
  if (fTile === T.SIGNPOST) { openSign(front.tx, front.ty); return; }
  if (fTile === T.BED) { state.player.x = (front.tx + 0.5) * TILE; state.player.y = (front.ty + 0.5) * TILE; sleep(); return; }

  const s = equippedSlot();
  if (!s) { showToast('Nothing equipped'); return; }
  const d = ITEMS[s.id];

  if (d.use === 'eat') {
    if (p.hp >= p.maxHp) { showToast('Already at full health'); return; }
    p.hp = Math.min(p.maxHp, p.hp + (d.heal || 10));
    consumeFromHotbar(state.inv.hotbar, 1);
    showToast('Restored ♥');
    renderHotbar(); return;
  }
  if (d.use === 'plant') {
    const front = tileInFront(p);
    const t = tileAt(front.tx, front.ty);
    if (t === T.GARDEN_DRY) {
      setTile(front.tx, front.ty, T.GARDEN_PLANTED);
      growthMap.set(front.tx + ',' + front.ty, GROW_TIME);
      consumeFromHotbar(state.inv.hotbar, 1);
      showToast('Planted a seed');
    } else { showToast('Need a garden plot'); }
    return;
  }
  if (d.place !== undefined) {
    const front = tileInFront(p);
    const t = tileAt(front.tx, front.ty);
    if (t === T.GRASS || t === T.TALL_GRASS || t === T.SAND || t === T.DIRT_PATH || t === T.WOOD_FLOOR || t === T.STONE_FLOOR || t === T.RUIN_FLOOR) {
      if (front.tx === Math.floor(p.x / TILE) && front.ty === Math.floor(p.y / TILE)) {
        showToast('Step back to place'); return;
      }
      setTile(front.tx, front.ty, d.place);
      if (d.place === T.SIGNPOST) {
        const text = prompt('Sign text:', 'Hello!');
        if (text != null) signs.set(front.tx + ',' + front.ty, text.slice(0, 80));
      }
      consumeFromHotbar(state.inv.hotbar, 1);
      showToast('Placed ' + d.name);
      renderHotbar();
      // If placing bed, record as respawn point.
      if (d.place === T.BED) p.respawn = { x: front.tx, y: front.ty };
    } else {
      showToast('Cannot place here');
    }
    return;
  }
  showToast('No use action');
}
function consumeFromHotbar(idx, n) {
  const s = state.inv.slots[idx]; if (!s) return;
  s.n -= n; if (s.n <= 0) state.inv.slots[idx] = null;
}
function sleep() {
  // fade overlay handled by render; here just restore.
  state.player.hp = state.player.maxHp;
  state.player.iframes = 1500;
  state.time += 30000;
  // Restore some growth progress on crops too
  growthMap.forEach((v, k) => growthMap.set(k, Math.max(0, v - 30000)));
  showToast('Zzz… restored ♥');
}

// -------------------------------------------------------------------------
// Attack / mine / chop logic
// -------------------------------------------------------------------------
let attackCd = 0;
function doAttack() {
  if (attackCd > 0) return;
  attackCd = ATTACK_COOLDOWN;
  const p = state.player;
  p.swing = 220;
  const front = tileInFront(p);

  // Enemy in melee?
  let hit = null, bestD = 9999;
  for (const e of state.enemies) {
    const dx = e.x - front.x, dy = e.y - front.y;
    const d = Math.hypot(dx, dy);
    if (d < TILE * 0.9 && d < bestD) { bestD = d; hit = e; }
  }
  if (hit) {
    const swordId = bestTool('sword');
    const axeId   = bestTool('axe');
    const tool = swordId ? ITEMS[swordId] : axeId ? ITEMS[axeId] : { power: 1 };
    hit.hp -= tool.power + 1;
    hit.hitFlash = 200;
    const kx = hit.x - p.x, ky = hit.y - p.y; const l = Math.hypot(kx, ky) || 1;
    hit.vx += (kx / l) * 4; hit.vy += (ky / l) * 4;
    if (hit.hp <= 0) {
      applyDrop(hit.loot, { x: hit.x, y: hit.y });
      state.enemies.splice(state.enemies.indexOf(hit), 1);
    }
    return;
  }

  // Otherwise interact with tile in front
  const tx = front.tx, ty = front.ty;
  const t = tileAt(tx, ty);
  const def = TDEF[t]; if (!def) return;
  if (t === T.TALL_GRASS) {
    setTile(tx, ty, T.GRASS);
    applyDrop({ rupee: 0.30, heart_drop: 0.08, seed: 0.05 }, { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
    return;
  }
  if (def.pickup) {
    // flower etc — sword can also grab them
    applyDrop(def.pickup, { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
    setTile(tx, ty, def.becomes || T.GRASS);
    return;
  }
  if (def.cap) {
    const requiredTool = def.tool;
    const swordId = bestTool('sword');
    const axeId   = bestTool('axe');
    const pickId  = bestTool('pickaxe');
    let toolId = null, power = 0;
    if (requiredTool === 'pickaxe' && pickId) { toolId = pickId; power = ITEMS[pickId].power; }
    else if (requiredTool === 'axe' && (axeId || swordId)) {
      toolId = axeId || swordId; power = ITEMS[toolId].power - (axeId ? 0 : 2);
    }
    else if (requiredTool === 'any') {
      toolId = axeId || swordId || pickId; power = toolId ? ITEMS[toolId].power : 1;
    }
    if (!toolId || power <= 0) {
      showToast('Need a ' + requiredTool);
      return;
    }
    const key = tx + ',' + ty;
    let hp = damageMap.has(key) ? damageMap.get(key) : def.hp;
    hp -= Math.max(1, power);
    if (hp <= 0) {
      damageMap.delete(key);
      setTile(tx, ty, def.becomes !== undefined ? def.becomes : T.GRASS);
      if (def.drop) applyDrop(def.drop, { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
      else if (def.placed && def.refund) applyDrop(def.refund, { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
      if (t === T.SIGNPOST) signs.delete(key);
    } else {
      damageMap.set(key, hp);
    }
  }
}

// -------------------------------------------------------------------------
// Enemies
// -------------------------------------------------------------------------
function updateEnemies(dt) {
  state.nextEnemy -= dt;
  if (state.nextEnemy <= 0 && state.enemies.length < 22) {
    state.nextEnemy = 3500;
    for (let tries = 0; tries < 30; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 240 + Math.random() * 260;
      const wx = state.player.x + Math.cos(ang) * dist;
      const wy = state.player.y + Math.sin(ang) * dist;
      const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
      if (!isWalkTile(tileAt(tx, ty))) continue;
      // not too close to placed structures
      let nearBuild = false;
      for (let dy = -3; dy <= 3 && !nearBuild; dy++) for (let dx = -3; dx <= 3 && !nearBuild; dx++) {
        const td = TDEF[tileAt(tx + dx, ty + dy)]; if (td && td.placed) nearBuild = true;
      }
      if (nearBuild) continue;
      const r = Math.random();
      const kind = r < 0.5 ? 'slime' : r < 0.85 ? 'octorok' : 'keese';
      pushEnemy(kind, (tx + 0.5) * TILE, (ty + 0.5) * TILE);
      break;
    }
  }
  const p = state.player;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    e.think -= dt; e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.shootCd != null) e.shootCd -= dt;
    const dx = p.x - e.x, dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (e.think <= 0) {
      e.think = 600 + Math.random() * 700;
      if (dist < 320) {
        const sp = e.speed;
        const dir = dist || 1;
        e.vx = (dx / dir) * sp;
        e.vy = (dy / dir) * sp;
      } else {
        const a = Math.random() * Math.PI * 2;
        e.vx = Math.cos(a) * e.speed * 0.4;
        e.vy = Math.sin(a) * e.speed * 0.4;
      }
    }
    // ranged octorok shoots rocks
    if (e.ranged && e.shootCd <= 0 && dist < 240) {
      e.shootCd = 2200 + Math.random() * 1500;
      const dir = dist || 1;
      state.projectiles.push({
        x: e.x, y: e.y,
        vx: (dx / dir) * 3.0,
        vy: (dy / dir) * 3.0,
        life: 1500, damage: e.damage,
        kind: 'rock',
      });
    }
    const step = dt / 16.67;
    tryMove(e, e.vx * step, e.vy * step, 10);

    // melee damage
    if (Math.hypot(e.x - p.x, e.y - p.y) < 22 && p.iframes <= 0) {
      damagePlayer(e.damage);
      const l = Math.hypot(e.x - p.x, e.y - p.y) || 1;
      p.x -= ((e.x - p.x) / l) * 6;
      p.y -= ((e.y - p.y) / l) * 6;
    }
  }
}

function updateProjectiles(dt) {
  const p = state.player;
  const step = dt / 16.67;
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const pr = state.projectiles[i];
    pr.life -= dt;
    pr.x += pr.vx * step; pr.y += pr.vy * step;
    if (pr.life <= 0) { state.projectiles.splice(i, 1); continue; }
    // hit wall?
    if (wallHit(pr.x, pr.y, 4)) { state.projectiles.splice(i, 1); continue; }
    // hit player?
    if (p.iframes <= 0 && Math.hypot(pr.x - p.x, pr.y - p.y) < 14) {
      damagePlayer(pr.damage);
      state.projectiles.splice(i, 1);
    }
  }
}

function damagePlayer(dmg) {
  const p = state.player;
  p.hp = Math.max(0, p.hp - dmg);
  p.iframes = ENEMY_HIT_IFRAMES;
  if (p.hp <= 0) respawn();
}
function respawn() {
  const p = state.player;
  showToast('You faint…');
  let rx = state.spawn.x, ry = state.spawn.y;
  if (p.respawn) {
    // verify bed still there
    if (tileAt(p.respawn.x, p.respawn.y) === T.BED) { rx = p.respawn.x; ry = p.respawn.y; }
    else p.respawn = null;
  }
  p.x = (rx + 0.5) * TILE;
  p.y = (ry + 0.5) * TILE + TILE;
  p.hp = p.maxHp;
  p.iframes = 1500;
}

// -------------------------------------------------------------------------
// Update loop
// -------------------------------------------------------------------------
let lastTime = 0;
let damageMapTick = 0;

function update(dt) {
  if (paused || !state) return;
  state.time += dt;
  attackCd = Math.max(0, attackCd - dt);
  const p = state.player;
  p.iframes = Math.max(0, p.iframes - dt);
  p.swing = Math.max(0, p.swing - dt);

  // Movement
  const inp = readInput();
  const speed = 2.6;
  if (inp.x !== 0 || inp.y !== 0) {
    p.facing.x = inp.x; p.facing.y = inp.y;
    const l = Math.hypot(p.facing.x, p.facing.y) || 1;
    p.facing.x /= l; p.facing.y /= l;
    p.facingKey = dirKey(p.facing.x, p.facing.y);
  }
  const step = dt / 16.67;
  tryMove(p, inp.x * speed * step, inp.y * speed * step, 11);

  // Walk-over interactions
  const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
  const here = tileAt(tx, ty);
  const def = TDEF[here];
  if (def && def.pickup) {
    applyDrop(def.pickup, { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
    setTile(tx, ty, def.becomes || T.GRASS);
  }
  if (here === T.GARDEN_RIPE) {
    applyDrop({ carrot: 1, seed: 1 }, { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
    setTile(tx, ty, T.GARDEN_DRY);
  }

  // Crop growth tick
  if (growthMap.size) {
    growthMap.forEach((v, k) => {
      const nv = v - dt;
      if (nv <= 0) {
        growthMap.delete(k);
        const parts = k.split(',');
        const gx = +parts[0], gy = +parts[1];
        if (tileAt(gx, gy) === T.GARDEN_PLANTED) setTile(gx, gy, T.GARDEN_RIPE);
      } else growthMap.set(k, nv);
    });
  }

  // Attack
  if (attackHeld) doAttack();

  updateEnemies(dt);
  updateProjectiles(dt);

  // Stations
  recomputeStations();

  // Drop label timers
  for (let i = state.drops.length - 1; i >= 0; i--) {
    state.drops[i].t -= dt; state.drops[i].y -= dt * 0.02;
    if (state.drops[i].t <= 0) state.drops.splice(i, 1);
  }

  // Toast fade
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toastEl.classList.remove('show');
  }
}

// -------------------------------------------------------------------------
// Rendering — drawn pixel art (no sprite sheet)
// -------------------------------------------------------------------------
function rgb(t) { return TDEF[t] && TDEF[t].color; }

function drawTile(tx, ty, sx, sy) {
  const t = state.map[ty * WORLD_W + tx];
  const key = tx + ',' + ty;

  // Base layer
  switch (t) {
    case T.GRASS: case T.TALL_GRASS: case T.BUSH: case T.TREE:
    case T.FLOWER_R: case T.FLOWER_Y: case T.FLOWER_B:
    case T.ROCK: case T.ROCK_IRON:
      drawGrass(sx, sy, tx, ty); break;
    case T.WATER:      drawWater(sx, sy, tx, ty); break;
    case T.SAND:       drawSand(sx, sy, tx, ty); break;
    case T.DIRT_PATH:  drawDirt(sx, sy, tx, ty); break;
    case T.WOOD_FLOOR: drawWoodFloor(sx, sy); break;
    case T.STONE_FLOOR: drawStoneFloor(sx, sy); break;
    case T.RUIN_FLOOR: drawRuinFloor(sx, sy); break;
    default: drawGrass(sx, sy, tx, ty);
  }
  // Overlay layer
  switch (t) {
    case T.TALL_GRASS: drawTallGrass(sx, sy, tx, ty); break;
    case T.BUSH:       drawBush(sx, sy); break;
    case T.TREE:       drawTree(sx, sy); break;
    case T.ROCK:       drawRock(sx, sy, false); break;
    case T.ROCK_IRON:  drawRock(sx, sy, true); break;
    case T.FLOWER_R:   drawFlower(sx, sy, '#e35a5a'); break;
    case T.FLOWER_Y:   drawFlower(sx, sy, '#f4d24a'); break;
    case T.FLOWER_B:   drawFlower(sx, sy, '#6aa6e0'); break;
    case T.WOOD_WALL:  drawWoodWall(sx, sy); break;
    case T.STONE_WALL: drawStoneWall(sx, sy); break;
    case T.WORKBENCH:  drawWorkbench(sx, sy); break;
    case T.FORGE:      drawForge(sx, sy); break;
    case T.GARDEN_DRY: drawGarden(sx, sy, 0); break;
    case T.GARDEN_PLANTED: drawGarden(sx, sy, 1); break;
    case T.GARDEN_RIPE:    drawGarden(sx, sy, 2); break;
    case T.BED:        drawBed(sx, sy); break;
    case T.CAMPFIRE:   drawCampfire(sx, sy); break;
    case T.SIGNPOST:   drawSign(sx, sy); break;
    case T.RUIN_WALL:  drawRuinWall(sx, sy); break;
  }

  // Damage cracks
  if (damageMap.has(key)) {
    const def = TDEF[t];
    if (def && def.hp) {
      const hpLeft = damageMap.get(key);
      const pct = 1 - hpLeft / def.hp;
      ctx.fillStyle = `rgba(0,0,0,${0.25 * pct + 0.1})`;
      ctx.fillRect(sx + 4, sy + (TILE - 4) * pct + 4, TILE - 8, 2);
      ctx.fillRect(sx + (TILE - 4) * pct + 4, sy + 4, 2, TILE - 8);
    }
  }
}

function drawGrass(sx, sy, tx, ty) {
  ctx.fillStyle = '#3a8a3a';
  ctx.fillRect(sx, sy, TILE, TILE);
  // small darker grass spots — deterministic per tile
  ctx.fillStyle = '#2e6e2e';
  const h = ((tx * 1103515245 + ty * 12345) >>> 0);
  ctx.fillRect(sx + (h & 31), sy + ((h >> 5) & 31), 3, 2);
  ctx.fillRect(sx + ((h >> 10) & 31), sy + ((h >> 15) & 31), 2, 3);
  ctx.fillStyle = '#4ea34e';
  ctx.fillRect(sx + ((h >> 20) & 31), sy + ((h >> 25) & 31), 2, 2);
}
function drawTallGrass(sx, sy, tx, ty) {
  ctx.fillStyle = '#6abf45';
  const h = ((tx * 17 + ty * 31) >>> 0);
  for (let i = 0; i < 5; i++) {
    const x = sx + 3 + ((h * (i + 1) * 13) & 23);
    const y = sy + 6 + (((h >> i) * 7) & 18);
    ctx.fillRect(x, y, 2, 6);
  }
  ctx.fillStyle = '#a8dc6a';
  for (let i = 0; i < 3; i++) {
    const x = sx + 5 + ((h * (i + 2) * 7) & 21);
    const y = sy + 4 + (((h >> (i + 3)) * 11) & 20);
    ctx.fillRect(x, y, 1, 4);
  }
}
function drawBush(sx, sy) {
  ctx.fillStyle = '#225a22';
  ctx.fillRect(sx + 4, sy + 8, TILE - 8, TILE - 12);
  ctx.fillStyle = '#3a8a3a';
  ctx.fillRect(sx + 6, sy + 6, TILE - 12, TILE - 16);
  ctx.fillRect(sx + 8, sy + 4, TILE - 16, 4);
  ctx.fillStyle = '#5ea85e';
  ctx.fillRect(sx + 8, sy + 8, 4, 2);
  ctx.fillRect(sx + 16, sy + 6, 4, 2);
}
function drawTree(sx, sy) {
  // trunk
  ctx.fillStyle = '#5a3a1c';
  ctx.fillRect(sx + 13, sy + 20, 6, 10);
  ctx.fillStyle = '#3a2412';
  ctx.fillRect(sx + 13, sy + 26, 6, 2);
  // canopy
  ctx.fillStyle = '#1e5a1e';
  ctx.fillRect(sx + 3, sy + 6, TILE - 6, 16);
  ctx.fillRect(sx + 6, sy + 3, TILE - 12, 22);
  ctx.fillStyle = '#2f7a2f';
  ctx.fillRect(sx + 5, sy + 8, TILE - 10, 10);
  ctx.fillStyle = '#4ea34e';
  ctx.fillRect(sx + 8, sy + 6, 4, 4);
  ctx.fillRect(sx + 16, sy + 10, 4, 3);
}
function drawRock(sx, sy, iron) {
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(sx + 4, sy + 8, TILE - 8, TILE - 12);
  ctx.fillStyle = '#6a6a6a';
  ctx.fillRect(sx + 6, sy + 6, TILE - 12, TILE - 14);
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(sx + 8, sy + 7, 4, 2);
  ctx.fillRect(sx + 16, sy + 12, 3, 2);
  if (iron) {
    ctx.fillStyle = '#b85c1c';
    ctx.fillRect(sx + 10, sy + 14, 3, 3);
    ctx.fillRect(sx + 18, sy + 18, 2, 2);
  }
}
function drawWater(sx, sy, tx, ty) {
  ctx.fillStyle = '#3a6db8';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#5a8fd0';
  const phase = (state.time * 0.002 + tx * 0.5 + ty * 0.7) % 1;
  ctx.fillRect(sx + 4 + phase * 20 | 0, sy + 8, 6, 1);
  ctx.fillRect(sx + 2, sy + 18 + (phase * 8 | 0), 4, 1);
  ctx.fillStyle = '#a8caee';
  ctx.fillRect(sx + 14, sy + 22, 2, 1);
}
function drawSand(sx, sy, tx, ty) {
  ctx.fillStyle = '#e0c98a';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#c9a86a';
  const h = ((tx * 17 + ty * 23) >>> 0);
  ctx.fillRect(sx + (h & 30), sy + ((h >> 5) & 30), 2, 1);
  ctx.fillRect(sx + ((h >> 10) & 30), sy + ((h >> 15) & 30), 1, 2);
}
function drawDirt(sx, sy, tx, ty) {
  ctx.fillStyle = '#8a6a3a';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#6a4a22';
  const h = ((tx * 13 + ty * 7) >>> 0);
  ctx.fillRect(sx + (h & 28), sy + ((h >> 5) & 28), 3, 2);
  ctx.fillRect(sx + ((h >> 10) & 28), sy + ((h >> 15) & 28), 2, 3);
}
function drawFlower(sx, sy, color) {
  drawGrass(sx, sy, sx, sy);
  ctx.fillStyle = '#f4e896';
  ctx.fillRect(sx + 14, sy + 14, 4, 4);
  ctx.fillStyle = color;
  ctx.fillRect(sx + 12, sy + 12, 3, 3);
  ctx.fillRect(sx + 17, sy + 12, 3, 3);
  ctx.fillRect(sx + 12, sy + 17, 3, 3);
  ctx.fillRect(sx + 17, sy + 17, 3, 3);
}
function drawWoodFloor(sx, sy) {
  ctx.fillStyle = '#b58154';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#8a5a36';
  ctx.fillRect(sx, sy + 10, TILE, 1);
  ctx.fillRect(sx, sy + 22, TILE, 1);
  ctx.fillRect(sx + 16, sy, 1, TILE);
}
function drawWoodWall(sx, sy) {
  ctx.fillStyle = '#8a5a36';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#b58154';
  ctx.fillRect(sx + 2, sy + 2, TILE - 4, 6);
  ctx.fillRect(sx + 2, sy + 12, TILE - 4, 6);
  ctx.fillRect(sx + 2, sy + 22, TILE - 4, 6);
  ctx.fillStyle = '#5a3a1c';
  ctx.fillRect(sx, sy, TILE, 1);
  ctx.fillRect(sx, sy + TILE - 1, TILE, 1);
}
function drawStoneFloor(sx, sy) {
  ctx.fillStyle = '#8a8a98';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#6a6a78';
  ctx.fillRect(sx, sy + 16, TILE, 1);
  ctx.fillRect(sx + 16, sy, 1, 16);
  ctx.fillRect(sx + 8, sy + 16, 1, 16);
}
function drawStoneWall(sx, sy) {
  ctx.fillStyle = '#5a5a68';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#9a9aa8';
  ctx.fillRect(sx + 2, sy + 2, 12, 6);
  ctx.fillRect(sx + 16, sy + 2, 14, 6);
  ctx.fillRect(sx + 2, sy + 10, 8, 6);
  ctx.fillRect(sx + 12, sy + 10, 18, 6);
  ctx.fillRect(sx + 2, sy + 18, 16, 6);
  ctx.fillRect(sx + 20, sy + 18, 10, 6);
  ctx.fillRect(sx + 2, sy + 26, 12, 4);
  ctx.fillRect(sx + 16, sy + 26, 14, 4);
}
function drawWorkbench(sx, sy) {
  ctx.fillStyle = '#6a4a22';
  ctx.fillRect(sx + 2, sy + 8, TILE - 4, TILE - 12);
  ctx.fillStyle = '#a37a44';
  ctx.fillRect(sx + 4, sy + 10, TILE - 8, 8);
  ctx.fillStyle = '#3a2412';
  ctx.fillRect(sx + 4, sy + TILE - 6, 4, 4);
  ctx.fillRect(sx + TILE - 8, sy + TILE - 6, 4, 4);
  // tools on top
  ctx.fillStyle = '#cfcfcf';
  ctx.fillRect(sx + 8, sy + 6, 8, 2);
  ctx.fillStyle = '#8a5a36';
  ctx.fillRect(sx + 16, sy + 4, 2, 6);
}
function drawForge(sx, sy) {
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(sx + 2, sy + 6, TILE - 4, TILE - 8);
  ctx.fillStyle = '#5a5a68';
  ctx.fillRect(sx + 4, sy + 8, TILE - 8, TILE - 14);
  // glowing core
  const flick = 0.7 + 0.3 * Math.sin(state.time * 0.012);
  ctx.fillStyle = `rgba(255,${110 + flick * 60 | 0},40,1)`;
  ctx.fillRect(sx + 10, sy + 14, TILE - 20, 8);
  ctx.fillStyle = '#f4d24a';
  ctx.fillRect(sx + 13, sy + 16, 6, 3);
}
function drawGarden(sx, sy, stage) {
  ctx.fillStyle = '#6a4a22';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#4a3414';
  ctx.fillRect(sx + 4, sy + 10, TILE - 8, 1);
  ctx.fillRect(sx + 4, sy + 20, TILE - 8, 1);
  if (stage === 1) {
    ctx.fillStyle = '#5ea85e';
    ctx.fillRect(sx + 10, sy + 16, 2, 4);
    ctx.fillRect(sx + 20, sy + 14, 2, 5);
  } else if (stage === 2) {
    ctx.fillStyle = '#3a8a3a';
    ctx.fillRect(sx + 8, sy + 8, 4, 14);
    ctx.fillRect(sx + 20, sy + 6, 4, 16);
    ctx.fillStyle = '#e35a5a';
    ctx.fillRect(sx + 7, sy + 6, 6, 4);
    ctx.fillRect(sx + 19, sy + 4, 6, 4);
  }
}
function drawBed(sx, sy) {
  ctx.fillStyle = '#5a3a1c';
  ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = '#a83a3a';
  ctx.fillRect(sx + 4, sy + 8, TILE - 8, TILE - 12);
  ctx.fillStyle = '#f4e0d4';
  ctx.fillRect(sx + 6, sy + 4, TILE - 12, 6);
  ctx.fillStyle = '#8a2a2a';
  ctx.fillRect(sx + 4, sy + TILE - 6, TILE - 8, 2);
}
function drawCampfire(sx, sy) {
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(sx + 4, sy + TILE - 10, TILE - 8, 6);
  ctx.fillStyle = '#5a3a1c';
  ctx.fillRect(sx + 8, sy + TILE - 14, 4, 8);
  ctx.fillRect(sx + TILE - 12, sy + TILE - 14, 4, 8);
  const flick = 0.6 + 0.4 * Math.sin(state.time * 0.014 + sx * 0.13);
  ctx.fillStyle = `rgba(255,${140 + flick * 50 | 0},50,1)`;
  ctx.beginPath();
  ctx.moveTo(sx + TILE / 2, sy + 6);
  ctx.lineTo(sx + TILE - 8, sy + TILE - 6);
  ctx.lineTo(sx + 8, sy + TILE - 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f4d24a';
  ctx.beginPath();
  ctx.moveTo(sx + TILE / 2, sy + 12);
  ctx.lineTo(sx + TILE - 12, sy + TILE - 10);
  ctx.lineTo(sx + 12, sy + TILE - 10);
  ctx.closePath();
  ctx.fill();
}
function drawSign(sx, sy) {
  ctx.fillStyle = '#5a3a1c';
  ctx.fillRect(sx + 14, sy + 16, 4, 14);
  ctx.fillStyle = '#a37a44';
  ctx.fillRect(sx + 4, sy + 6, TILE - 8, 12);
  ctx.fillStyle = '#3a2412';
  ctx.fillRect(sx + 4, sy + 6, TILE - 8, 1);
  ctx.fillRect(sx + 4, sy + 17, TILE - 8, 1);
  ctx.fillStyle = '#5a3a1c';
  ctx.fillRect(sx + 8, sy + 10, 2, 1);
  ctx.fillRect(sx + 12, sy + 10, 6, 1);
  ctx.fillRect(sx + 8, sy + 13, 12, 1);
}
function drawRuinFloor(sx, sy) {
  ctx.fillStyle = '#5a564a';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#3a3830';
  ctx.fillRect(sx, sy + 16, TILE, 1);
  ctx.fillRect(sx + 16, sy, 1, TILE);
}
function drawRuinWall(sx, sy) {
  ctx.fillStyle = '#3a3830';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#6a665a';
  ctx.fillRect(sx + 2, sy + 2, 12, 6);
  ctx.fillRect(sx + 16, sy + 4, 14, 6);
  ctx.fillRect(sx + 2, sy + 12, 8, 6);
  ctx.fillRect(sx + 12, sy + 12, 18, 6);
  ctx.fillRect(sx + 2, sy + 20, 16, 6);
  ctx.fillRect(sx + 20, sy + 22, 10, 6);
  ctx.fillStyle = '#2a8a3a';  // moss bits
  ctx.fillRect(sx + 4, sy + 28, 4, 2);
  ctx.fillRect(sx + 22, sy + 4, 3, 2);
}

// Player & enemies sprites -----------------------------------------------
function drawPlayer(sx, sy) {
  const p = state.player;
  const facing = p.facingKey;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 12, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  const blink = (p.iframes > 0 && Math.floor(p.iframes / 80) % 2 === 0);
  if (blink) return;

  // body (green tunic)
  ctx.fillStyle = '#2e7a2e';
  ctx.fillRect(sx - 6, sy - 2, 12, 12);
  // belt
  ctx.fillStyle = '#5a3a1c';
  ctx.fillRect(sx - 6, sy + 6, 12, 2);
  // head
  ctx.fillStyle = '#f0c89a';
  ctx.fillRect(sx - 5, sy - 10, 10, 8);
  // hat (green cone) - direction tip
  ctx.fillStyle = '#2e7a2e';
  if (facing === 'down')      drawHat(sx, sy - 10, 0, 1);
  else if (facing === 'up')   drawHat(sx, sy - 10, 0, -1);
  else if (facing === 'left') drawHat(sx, sy - 10, -1, 0);
  else                        drawHat(sx, sy - 10, 1, 0);
  // hair fringe
  ctx.fillStyle = '#d4a060';
  if (facing === 'down')      ctx.fillRect(sx - 4, sy - 4, 8, 2);
  else if (facing === 'up')   ctx.fillRect(sx - 4, sy - 10, 8, 2);
  // eyes
  if (facing === 'down') {
    ctx.fillStyle = '#1a1a26';
    ctx.fillRect(sx - 3, sy - 6, 2, 2);
    ctx.fillRect(sx + 1, sy - 6, 2, 2);
  } else if (facing === 'left') {
    ctx.fillStyle = '#1a1a26';
    ctx.fillRect(sx - 4, sy - 6, 2, 2);
  } else if (facing === 'right') {
    ctx.fillStyle = '#1a1a26';
    ctx.fillRect(sx + 2, sy - 6, 2, 2);
  }
  // sword in hand
  drawSword(sx, sy, p);
  // shield on opposite hand (small square)
  ctx.fillStyle = '#a04030';
  if (facing === 'down' || facing === 'up') {
    ctx.fillRect(sx + (facing === 'down' ? -10 : 6), sy + 2, 4, 6);
  } else {
    ctx.fillRect(sx - 2, sy + (facing === 'left' ? 8 : -6), 4, 4);
  }
}
function drawHat(cx, cy, fx, fy) {
  ctx.fillRect(cx - 5, cy - 2, 10, 4);
  // tip
  if (fy === 1) ctx.fillRect(cx + 2, cy + 2, 5, 4);
  else if (fy === -1) ctx.fillRect(cx - 7, cy - 4, 5, 3);
  else if (fx === 1) ctx.fillRect(cx + 5, cy - 4, 5, 3);
  else ctx.fillRect(cx - 10, cy - 4, 5, 3);
}
function drawSword(cx, cy, p) {
  const swinging = p.swing > 0;
  const arcT = swinging ? (1 - p.swing / 220) : 0;
  ctx.strokeStyle = '#e8e8f0';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  let bx, by, ex, ey;
  if (p.facingKey === 'down') { bx = cx + 6; by = cy + 4; ex = bx + 2; ey = by + 12; }
  else if (p.facingKey === 'up') { bx = cx - 6; by = cy - 4; ex = bx - 2; ey = by - 12; }
  else if (p.facingKey === 'right') { bx = cx + 8; by = cy + 2; ex = bx + 12; ey = by - 2; }
  else { bx = cx - 8; by = cy + 2; ex = bx - 12; ey = by - 2; }
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
  // hilt
  ctx.strokeStyle = '#f4d24a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(bx - 1, by); ctx.lineTo(bx + 1, by); ctx.stroke();
  // swing arc
  if (swinging) {
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * (1 - arcT)) + ')';
    ctx.lineWidth = 5;
    ctx.beginPath();
    const ang = Math.atan2(p.facing.y, p.facing.x);
    ctx.arc(cx, cy, 18, ang - 0.9 + arcT * 1.4, ang + 0.9 - arcT * 0.4);
    ctx.stroke();
  }
}
function drawSlime(sx, sy, e) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 6, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#3aa847';
  ctx.beginPath(); ctx.ellipse(sx, sy + 4, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#5ec06a';
  ctx.beginPath(); ctx.ellipse(sx, sy + 1, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(sx - 4, sy - 1, 2, 2); ctx.fillRect(sx + 2, sy - 1, 2, 2);
}
function drawOctorok(sx, sy, e) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 6, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#c83a3a';
  ctx.beginPath(); ctx.ellipse(sx, sy, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
  // legs
  ctx.fillRect(sx - 10, sy + 6, 3, 4);
  ctx.fillRect(sx + 7, sy + 6, 3, 4);
  // eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(sx - 4, sy - 3, 3, 3);
  ctx.fillRect(sx + 1, sy - 3, 3, 3);
  ctx.fillStyle = '#000';
  ctx.fillRect(sx - 3, sy - 2, 1, 1);
  ctx.fillRect(sx + 2, sy - 2, 1, 1);
  // mouth/snout
  ctx.fillStyle = '#7a1a1a';
  ctx.fillRect(sx - 2, sy + 3, 4, 2);
}
function drawKeese(sx, sy, e) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 8, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  // wings flap
  const f = Math.sin(state.time * 0.025) > 0 ? 1 : 0;
  ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#5a2a8a';
  // body
  ctx.beginPath(); ctx.ellipse(sx, sy, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  // wings
  ctx.beginPath();
  ctx.moveTo(sx - 5, sy);
  ctx.lineTo(sx - 12, sy - 6 - f * 2);
  ctx.lineTo(sx - 12, sy + 2);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx + 5, sy);
  ctx.lineTo(sx + 12, sy - 6 - f * 2);
  ctx.lineTo(sx + 12, sy + 2);
  ctx.closePath(); ctx.fill();
  // eyes
  ctx.fillStyle = '#f4d24a';
  ctx.fillRect(sx - 3, sy - 1, 2, 2);
  ctx.fillRect(sx + 1, sy - 1, 2, 2);
}

function render() {
  const w = viewW, h = viewH;
  ctx.fillStyle = '#06060a';
  ctx.fillRect(0, 0, w, h);
  if (!state) return;
  const p = state.player;
  const camX = p.x - w / 2, camY = p.y - h / 2;

  const tx0 = Math.max(0, Math.floor(camX / TILE) - 1);
  const ty0 = Math.max(0, Math.floor(camY / TILE) - 1);
  const tx1 = Math.min(WORLD_W - 1, Math.floor((camX + w) / TILE) + 1);
  const ty1 = Math.min(WORLD_H - 1, Math.floor((camY + h) / TILE) + 1);

  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      drawTile(tx, ty, tx * TILE - camX, ty * TILE - camY);
    }
  }

  // Build-mode ghost preview
  const eq = equippedSlot();
  if (eq && ITEMS[eq.id].place !== undefined) {
    const front = tileInFront(p);
    const t = tileAt(front.tx, front.ty);
    const ok = (t === T.GRASS || t === T.TALL_GRASS || t === T.SAND || t === T.DIRT_PATH || t === T.WOOD_FLOOR || t === T.STONE_FLOOR || t === T.RUIN_FLOOR);
    const sx = front.tx * TILE - camX, sy = front.ty * TILE - camY;
    ctx.globalAlpha = 0.5;
    if (ok) drawTile.call(null, front.tx, front.ty, sx, sy); // base
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = ok ? 'rgba(247,255,120,0.9)' : 'rgba(255,80,80,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
  }

  // Projectiles
  for (const pr of state.projectiles) {
    const sx = pr.x - camX, sy = pr.y - camY;
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a7a7a';
    ctx.beginPath(); ctx.arc(sx - 1, sy - 1, 2, 0, Math.PI * 2); ctx.fill();
  }

  // Enemies
  for (const e of state.enemies) {
    const sx = e.x - camX, sy = e.y - camY;
    if (sx < -32 || sy < -32 || sx > w + 32 || sy > h + 32) continue;
    if (e.kind === 'slime')   drawSlime(sx, sy, e);
    else if (e.kind === 'octorok') drawOctorok(sx, sy, e);
    else if (e.kind === 'keese')   drawKeese(sx, sy, e);
    if (e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(sx - 12, sy - 14, 24, 4);
      ctx.fillStyle = '#e04040';
      ctx.fillRect(sx - 12, sy - 14, 24 * (e.hp / e.maxHp), 4);
    }
  }

  // Player
  drawPlayer(p.x - camX, p.y - camY);

  // Drop labels
  ctx.font = '12px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  for (const d of state.drops) {
    const sx = d.x - camX, sy = d.y - camY;
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.5, d.t / 900)})`;
    const w = ctx.measureText(d.text).width + 8;
    ctx.fillRect(sx - w / 2, sy - 14, w, 14);
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, d.t / 900)})`;
    ctx.fillText(d.text, sx, sy - 3);
  }
  ctx.textAlign = 'start';

  // Dynamic light from forge/campfire
  ctx.globalCompositeOperation = 'lighter';
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = state.map[ty * WORLD_W + tx];
      if (t === T.CAMPFIRE || t === T.FORGE) {
        const sx = tx * TILE - camX + TILE / 2, sy = ty * TILE - camY + TILE / 2;
        const r = TILE * 3.5;
        const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, r);
        g.addColorStop(0, 'rgba(255,160,60,0.5)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

// -------------------------------------------------------------------------
// Main loop
// -------------------------------------------------------------------------
function tick(now) {
  const dt = Math.min(40, now - lastTime);
  lastTime = now;
  update(dt);
  render();
  if (state) { renderHearts(); renderStationBadge(); }
  requestAnimationFrame(tick);
}

// -------------------------------------------------------------------------
// Title / boot
// -------------------------------------------------------------------------
const titleScreen = document.getElementById('title');
const btnPlay = document.getElementById('btnPlay');
const btnWipe = document.getElementById('btnWipe');
function showTitle() { titleScreen.classList.remove('hidden'); paused = true; }
function hideTitle() { titleScreen.classList.add('hidden'); paused = false; lastTime = performance.now(); }
btnPlay.addEventListener('click', () => {
  if (!state) { if (!load()) newGame(); }
  renderHotbar(); hideTitle();
});
btnWipe.addEventListener('click', () => {
  if (confirm('Wipe save? You will start a new realm.')) { wipe(); state = null; showToast('Save wiped'); }
});

setInterval(() => { if (state && !paused) save(); }, 10000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { paused = true; if (state) save(); }
});

showTitle();
requestAnimationFrame(tick);
})();

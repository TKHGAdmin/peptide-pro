// Greenheart v2 — top-down action/farming/building with elevation, biomes,
// day/night, weather, auto-connecting walls, cooking, and a boss.
(function () {
'use strict';

// =========================================================================
// Canvas + DPR
// =========================================================================
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

// =========================================================================
// Constants
// =========================================================================
const TILE = 28;
const ELEV_OFFSET = 4;
const WORLD_W = 200, WORLD_H = 200;
const SAVE_KEY = 'greenheart.save.v2';
const ATTACK_COOLDOWN = 260;
const ENEMY_HIT_IFRAMES = 800;
const GROW_TIME = 75000;
const DAY_LENGTH = 360000;  // 6 minutes per full day/night cycle
const NIGHT_PHASE = [0.62, 0.92]; // fraction of cycle that is "night"

// Biomes
const B = { BEACH: 0, MEADOW: 1, FOREST: 2, DESERT: 3, MOUNTAIN: 4, SNOW: 5, SWAMP: 6, RUINS: 7 };
const BIOME_NAME = { 0:'Beach', 1:'Meadow', 2:'Forest', 3:'Desert', 4:'Mountain', 5:'Snowfield', 6:'Swamp', 7:'Ruins' };

// Tiles
const T = {
  // Ground
  GRASS: 0, MEADOW_GRASS: 0, // alias
  TALL_GRASS: 1,
  FOREST_GRASS: 2,
  SAND: 3,
  DESERT_SAND: 4,
  SNOW: 5,
  ICE: 6,
  SWAMP_GRASS: 7,
  MTN_GROUND: 8,
  DIRT_PATH: 9,
  WATER: 10,
  SWAMP_WATER: 11,
  // Walkable detail
  FLOWER_R: 12, FLOWER_Y: 13, FLOWER_B: 14,
  RUIN_FLOOR: 15,
  // Vegetation (walls/cap)
  BUSH: 16,
  TREE: 17,
  DEAD_TREE: 18,
  PINE_TREE: 19,    // forest/mountain
  SNOW_TREE: 20,    // snow biome
  CACTUS: 21,       // desert
  // Mineral (walls)
  ROCK: 22,
  ROCK_IRON: 23,
  MTN_ROCK: 24,     // tall mountain rock
  RUIN_WALL: 25,
  // Placed
  WOOD_FLOOR: 26,
  WOOD_WALL:  27,
  STONE_FLOOR:28,
  STONE_WALL: 29,
  WORKBENCH:  30,
  FORGE:      31,
  GARDEN_DRY: 32,
  GARDEN_PLANTED: 33,
  GARDEN_RIPE: 34,
  BED: 35,
  CAMPFIRE: 36,
  SIGNPOST: 37,
  LANTERN: 38,
  FENCE: 39,
  DOOR_CLOSED: 40,
  DOOR_OPEN: 41,
  BANNER: 42,
};

// Tile defs: walk, cap (cuttable/wall), hp, tool, drop, refund, placed, light, station, becomes
const TDEF = {};
// Ground tiles
TDEF[T.GRASS]        = { walk:true };
TDEF[T.TALL_GRASS]   = { walk:true, sway:true };
TDEF[T.FOREST_GRASS] = { walk:true };
TDEF[T.SAND]         = { walk:true };
TDEF[T.DESERT_SAND]  = { walk:true };
TDEF[T.SNOW]         = { walk:true, slow:true };
TDEF[T.ICE]          = { walk:true, slippery:true };
TDEF[T.SWAMP_GRASS]  = { walk:true, slow:true };
TDEF[T.MTN_GROUND]   = { walk:true };
TDEF[T.DIRT_PATH]    = { walk:true };
TDEF[T.WATER]        = { walk:false };
TDEF[T.SWAMP_WATER]  = { walk:false };
TDEF[T.FLOWER_R]     = { walk:true, pickup:{ herb:1 }, becomes:T.GRASS };
TDEF[T.FLOWER_Y]     = { walk:true, pickup:{ herb:1 }, becomes:T.GRASS };
TDEF[T.FLOWER_B]     = { walk:true, pickup:{ herb:1 }, becomes:T.GRASS };
TDEF[T.RUIN_FLOOR]   = { walk:true };
// Vegetation
TDEF[T.BUSH]      = { walk:false, cap:true, hp:1, tool:'any', drop:{ wood:1, rupee:0.30, seed:0.15 }, becomes:T.GRASS };
TDEF[T.TREE]      = { walk:false, cap:true, hp:5, tool:'axe', drop:{ wood:3, seed:0.5 }, becomes:T.GRASS };
TDEF[T.DEAD_TREE] = { walk:false, cap:true, hp:3, tool:'axe', drop:{ wood:2 }, becomes:T.SWAMP_GRASS };
TDEF[T.PINE_TREE] = { walk:false, cap:true, hp:6, tool:'axe', drop:{ wood:4, seed:0.4 }, becomes:T.GRASS };
TDEF[T.SNOW_TREE] = { walk:false, cap:true, hp:6, tool:'axe', drop:{ wood:3 }, becomes:T.SNOW };
TDEF[T.CACTUS]    = { walk:false, cap:true, hp:2, tool:'any', drop:{ wood:1, herb:1 }, becomes:T.DESERT_SAND, hurts:true };
// Mineral
TDEF[T.ROCK]      = { walk:false, cap:true, hp:4, tool:'pickaxe', drop:{ stone:2, iron_ore:0.10 }, becomes:T.DIRT_PATH };
TDEF[T.ROCK_IRON] = { walk:false, cap:true, hp:6, tool:'pickaxe', drop:{ stone:1, iron_ore:2 }, becomes:T.DIRT_PATH };
TDEF[T.MTN_ROCK]  = { walk:false, cap:true, hp:8, tool:'pickaxe', drop:{ stone:3 }, becomes:T.MTN_GROUND };
TDEF[T.RUIN_WALL] = { walk:false, cap:true, hp:10, tool:'pickaxe', drop:{ stone:2, iron_ore:0.20 }, becomes:T.RUIN_FLOOR };
// Placed
TDEF[T.WOOD_FLOOR]      = { walk:true,  placed:true, refund:{ plank:1 } };
TDEF[T.WOOD_WALL]       = { walk:false, cap:true, hp:4, tool:'any', placed:true, becomes:T.GRASS, refund:{ plank:2 }, wall:'wood' };
TDEF[T.STONE_FLOOR]     = { walk:true,  placed:true, refund:{ stone:1 } };
TDEF[T.STONE_WALL]      = { walk:false, cap:true, hp:8, tool:'pickaxe', placed:true, becomes:T.GRASS, refund:{ stone:2 }, wall:'stone' };
TDEF[T.WORKBENCH]       = { walk:false, cap:true, hp:3, tool:'any', placed:true, station:'workbench', becomes:T.GRASS, refund:{ plank:2, stone:1 } };
TDEF[T.FORGE]           = { walk:false, cap:true, hp:4, tool:'pickaxe', placed:true, station:'forge', becomes:T.GRASS, light:3, refund:{ stone:4 } };
TDEF[T.GARDEN_DRY]      = { walk:true,  placed:true, refund:{ stone:1 } };
TDEF[T.GARDEN_PLANTED]  = { walk:true,  placed:true };
TDEF[T.GARDEN_RIPE]     = { walk:true,  placed:true, harvest:{ carrot:1 }, becomes:T.GARDEN_DRY };
TDEF[T.BED]             = { walk:true,  placed:true, interact:'sleep', refund:{ plank:3 } };
TDEF[T.CAMPFIRE]        = { walk:false, cap:true, hp:2, tool:'any', placed:true, station:'campfire', light:4, becomes:T.GRASS, refund:{ stone:2, wood:1 } };
TDEF[T.SIGNPOST]        = { walk:false, cap:true, hp:1, tool:'any', placed:true, becomes:T.GRASS, refund:{ plank:1 } };
TDEF[T.LANTERN]         = { walk:false, cap:true, hp:2, tool:'any', placed:true, lightAtNight:5, becomes:T.GRASS, refund:{ iron_ingot:1, wood:1 } };
TDEF[T.FENCE]           = { walk:false, cap:true, hp:2, tool:'any', placed:true, becomes:T.GRASS, refund:{ plank:1 }, wall:'fence' };
TDEF[T.DOOR_CLOSED]     = { walk:false, cap:true, hp:3, tool:'any', placed:true, interact:'door', becomes:T.GRASS, refund:{ plank:2 } };
TDEF[T.DOOR_OPEN]       = { walk:true,  placed:true, interact:'door', refund:{ plank:2 } };
TDEF[T.BANNER]          = { walk:false, cap:true, hp:1, tool:'any', placed:true, becomes:T.GRASS, refund:{ plank:1 } };

// Items
const ITEMS = {
  // Tools
  sword_wood:   { name:'Wooden Sword',  icon:'🗡️', tool:'sword',   tier:1, power:2 },
  sword_steel:  { name:'Steel Sword',   icon:'⚔️', tool:'sword',   tier:2, power:4 },
  sword_master: { name:'Master Sword',  icon:'🗡️', tool:'sword',   tier:3, power:8 },
  axe_wood:     { name:'Wooden Axe',    icon:'🪓', tool:'axe',     tier:1, power:2 },
  axe_iron:     { name:'Iron Axe',      icon:'🪓', tool:'axe',     tier:2, power:4 },
  pickaxe_wood: { name:'Wooden Pickaxe',icon:'⛏️', tool:'pickaxe', tier:1, power:2 },
  pickaxe_iron: { name:'Iron Pickaxe',  icon:'⛏️', tool:'pickaxe', tier:2, power:4 },
  hammer:       { name:'Hammer',        icon:'🔨', tool:'hammer',  tier:1, power:1 },
  // Consumables
  bread:        { name:'Bread',         icon:'🥖', heal:20, use:'eat', stack:99 },
  potion_red:   { name:'Red Potion',    icon:'🧪', heal:60, use:'eat', stack:99 },
  potion_blue:  { name:'Blue Potion',   icon:'🧫', heal:30, speed:1.4, speedTime:20000, use:'eat', stack:99 },
  carrot:       { name:'Carrot',        icon:'🥕', heal:10, use:'eat', stack:99 },
  fish:         { name:'Fish',          icon:'🐟', heal:15, use:'eat', stack:99 },
  grilled_fish: { name:'Grilled Fish',  icon:'🍣', heal:30, use:'eat', stack:99 },
  stew:         { name:'Stew',          icon:'🍲', heal:50, use:'eat', stack:99 },
  mushroom_skewer:{name:'Mushroom Skewer',icon:'🍢',heal:25, use:'eat', stack:99 },
  hearty_dish:  { name:'Hearty Dish',   icon:'🍱', heal:100, use:'eat', stack:99 },
  heart_drop:   { name:'Heart',         icon:'❤️', heal:20, stack:99 },
  // Resources
  rupee:        { name:'Rupee',         icon:'💎', stack:9999 },
  wood:         { name:'Wood',          icon:'🪵', stack:99 },
  plank:        { name:'Plank',         icon:'🟫', stack:99 },
  stone:        { name:'Stone',         icon:'🪨', stack:99 },
  iron_ore:     { name:'Iron Ore',      icon:'🟤', stack:99 },
  iron_ingot:   { name:'Iron Ingot',    icon:'⬜', stack:99 },
  ice_shard:    { name:'Ice Shard',     icon:'❄️', stack:99 },
  seed:         { name:'Seed',          icon:'🌰', stack:99, use:'plant' },
  herb:         { name:'Herb',          icon:'🌿', stack:99 },
  mushroom:     { name:'Mushroom',      icon:'🍄', stack:99 },
  boss_heart:   { name:'Heart Container',icon:'💗', use:'upgrade_hp', stack:99 },
  // Placeables
  wood_floor_item: { name:'Wood Floor', icon:'🟫', stack:99, place:T.WOOD_FLOOR },
  wood_wall_item:  { name:'Wood Wall',  icon:'🟫', stack:99, place:T.WOOD_WALL },
  stone_floor_item:{ name:'Stone Floor',icon:'⬛', stack:99, place:T.STONE_FLOOR },
  stone_wall_item: { name:'Stone Wall', icon:'⬛', stack:99, place:T.STONE_WALL },
  workbench_item:  { name:'Workbench',  icon:'🧰', stack:99, place:T.WORKBENCH },
  forge_item:      { name:'Forge',      icon:'🏭', stack:99, place:T.FORGE },
  garden_plot:     { name:'Garden Plot',icon:'🟫', stack:99, place:T.GARDEN_DRY },
  bed_item:        { name:'Bed',        icon:'🛏️', stack:99, place:T.BED },
  campfire_item:   { name:'Campfire',   icon:'🔥', stack:99, place:T.CAMPFIRE },
  signpost_item:   { name:'Signpost',   icon:'🪧', stack:99, place:T.SIGNPOST },
  lantern_item:    { name:'Lantern',    icon:'💡', stack:99, place:T.LANTERN },
  fence_item:      { name:'Fence',      icon:'🚧', stack:99, place:T.FENCE },
  door_item:       { name:'Door',       icon:'🚪', stack:99, place:T.DOOR_CLOSED },
  banner_item:     { name:'Banner',     icon:'🚩', stack:99, place:T.BANNER },
};

// Recipes
const RECIPES = [
  // No station
  { id:'plank',           needs:{ wood:1 }, count:2, station:null },
  { id:'campfire_item',   needs:{ stone:3, wood:1 }, station:null },
  { id:'wood_wall_item',  needs:{ plank:4 }, station:null },
  { id:'wood_floor_item', needs:{ plank:2 }, count:2, station:null },
  { id:'signpost_item',   needs:{ plank:2 }, station:null },
  { id:'fence_item',      needs:{ plank:2 }, count:2, station:null },
  { id:'workbench_item',  needs:{ plank:4, stone:2 }, station:null },
  // Workbench
  { id:'pickaxe_wood',    needs:{ plank:2, stone:3 }, station:'workbench' },
  { id:'axe_wood',        needs:{ plank:2, wood:1 }, station:'workbench' },
  { id:'hammer',          needs:{ plank:2, stone:2 }, station:'workbench' },
  { id:'garden_plot',     needs:{ stone:2, wood:1 }, station:'workbench' },
  { id:'bed_item',        needs:{ plank:6, herb:3 }, station:'workbench' },
  { id:'stone_wall_item', needs:{ stone:4 }, station:'workbench' },
  { id:'stone_floor_item',needs:{ stone:2 }, count:2, station:'workbench' },
  { id:'forge_item',      needs:{ stone:10, wood:2 }, station:'workbench' },
  { id:'door_item',       needs:{ plank:4 }, station:'workbench' },
  { id:'banner_item',     needs:{ plank:1, herb:2 }, station:'workbench' },
  { id:'bread',           needs:{ carrot:2, mushroom:1 }, station:'workbench' },
  { id:'potion_red',      needs:{ herb:3, mushroom:1 }, station:'workbench' },
  { id:'potion_blue',     needs:{ herb:2, ice_shard:1 }, station:'workbench' },
  // Forge
  { id:'iron_ingot',      needs:{ iron_ore:2, wood:1 }, station:'forge' },
  { id:'sword_steel',     needs:{ iron_ingot:3, plank:1 }, station:'forge' },
  { id:'axe_iron',        needs:{ iron_ingot:3, plank:1 }, station:'forge' },
  { id:'pickaxe_iron',    needs:{ iron_ingot:3, plank:1 }, station:'forge' },
  { id:'lantern_item',    needs:{ iron_ingot:1, wood:1 }, station:'forge' },
  { id:'sword_master',    needs:{ iron_ingot:5, boss_heart:1, herb:5 }, station:'forge' },
  // Campfire cooking
  { id:'grilled_fish',    needs:{ fish:1 }, station:'campfire' },
  { id:'mushroom_skewer', needs:{ mushroom:2, wood:1 }, station:'campfire' },
  { id:'stew',            needs:{ carrot:1, mushroom:1, herb:1 }, station:'campfire' },
  { id:'hearty_dish',     needs:{ fish:1, carrot:2, mushroom:1, herb:2 }, station:'campfire' },
];

// =========================================================================
// RNG
// =========================================================================
function mulberry(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Low-frequency value noise field across world grid.
function noiseField(seed, W, H, scale) {
  const rand = mulberry(seed);
  const out = new Float32Array(W * H);
  const NF = scale;
  const cw = Math.ceil(W / NF) + 1, ch = Math.ceil(H / NF) + 1;
  const grid = new Float32Array(cw * ch);
  for (let i = 0; i < cw * ch; i++) grid[i] = rand();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const gx = x / NF, gy = y / NF;
      const x0 = Math.floor(gx), y0 = Math.floor(gy);
      const fx = gx - x0, fy = gy - y0;
      const a = grid[y0 * cw + x0],     b = grid[y0 * cw + x0 + 1];
      const c = grid[(y0 + 1) * cw + x0], d = grid[(y0 + 1) * cw + x0 + 1];
      // smoothstep
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const ab = a * (1 - sx) + b * sx;
      const cd = c * (1 - sx) + d * sx;
      out[y * W + x] = ab * (1 - sy) + cd * sy;
    }
  }
  return out;
}

// =========================================================================
// World generation
// =========================================================================
function genWorld(seed) {
  const W = WORLD_W, H = WORLD_H;
  const rand = mulberry(seed);
  const map = new Uint8Array(W * H);
  const elev = new Uint8Array(W * H); // 0 = ground, 1 = hill, 2 = peak
  const biome = new Uint8Array(W * H);

  // Three independent noise fields for layered biome assignment.
  const moisture = noiseField(seed ^ 0xa1b2, W, H, 22); // 0..1
  const temperature = noiseField(seed ^ 0x77ee, W, H, 28);
  const height = noiseField(seed ^ 0x33c1, W, H, 24);

  // Vary temperature by latitude (Y) — north is colder.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    temperature[y * W + x] = temperature[y * W + x] * 0.5 + (y / H);
  }

  // Heights -> elevation tiers
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const h = height[y * W + x];
    elev[y * W + x] = h > 0.78 ? 2 : h > 0.58 ? 1 : 0;
  }

  // Biome classification
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const m = moisture[i], t = temperature[i], h = height[i];
    let b;
    if (h > 0.78) b = (t < 0.35) ? B.SNOW : B.MOUNTAIN;
    else if (m < 0.30 && t > 0.55) b = B.DESERT;
    else if (m > 0.72) b = B.SWAMP;
    else if (m > 0.50) b = B.FOREST;
    else if (t < 0.30) b = B.SNOW;
    else b = B.MEADOW;
    biome[i] = b;
  }

  // Water lakes — placed in low-moisture inverse (wet pockets at low elevation)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (elev[i] > 0) continue;
    const m = moisture[i];
    if (m > 0.78 && biome[i] !== B.DESERT) {
      // Water (swampy or normal)
      map[i] = (biome[i] === B.SWAMP) ? T.SWAMP_WATER : T.WATER;
    }
  }
  // Beaches around water
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (map[i] !== 0) continue;
    // 0 means "not set" — leave for biome fill below
    let nearWater = false;
    for (let dy = -1; dy <= 1 && !nearWater; dy++)
      for (let dx = -1; dx <= 1 && !nearWater; dx++) {
        const t = map[(y + dy) * W + (x + dx)];
        if (t === T.WATER || t === T.SWAMP_WATER) nearWater = true;
      }
    if (nearWater) {
      map[i] = (biome[i] === B.SWAMP) ? T.SWAMP_GRASS : T.SAND;
      if (biome[i] !== B.SWAMP) biome[i] = B.BEACH;
    }
  }

  // Fill ground tile per biome
  for (let i = 0; i < W * H; i++) {
    if (map[i]) continue;
    switch (biome[i]) {
      case B.MEADOW:   map[i] = T.GRASS; break;
      case B.FOREST:   map[i] = T.FOREST_GRASS; break;
      case B.DESERT:   map[i] = T.DESERT_SAND; break;
      case B.MOUNTAIN: map[i] = T.MTN_GROUND; break;
      case B.SNOW:     map[i] = T.SNOW; break;
      case B.SWAMP:    map[i] = T.SWAMP_GRASS; break;
      case B.BEACH:    map[i] = T.SAND; break;
      default:         map[i] = T.GRASS;
    }
  }

  // Biome-specific scatter
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = y * W + x;
    const b = biome[i];
    const t = map[i];
    if (t === T.WATER || t === T.SWAMP_WATER || t === T.SAND) continue;
    const r = rand();

    if (b === B.MEADOW) {
      if (r < 0.04) map[i] = T.TREE;
      else if (r < 0.10) map[i] = T.BUSH;
      else if (r < 0.12) map[i] = T.ROCK;
      else if (r < 0.18) map[i] = T.TALL_GRASS;
      else if (r < 0.20) map[i] = [T.FLOWER_R, T.FLOWER_Y, T.FLOWER_B][Math.floor(rand() * 3)];
    } else if (b === B.FOREST) {
      if (r < 0.22) map[i] = T.TREE;
      else if (r < 0.30) map[i] = T.PINE_TREE;
      else if (r < 0.35) map[i] = T.BUSH;
      else if (r < 0.42) map[i] = T.TALL_GRASS;
      else if (r < 0.45) map[i] = T.ROCK;
      else if (r < 0.46) map[i] = T.FLOWER_B;
    } else if (b === B.DESERT) {
      if (r < 0.05) map[i] = T.CACTUS;
      else if (r < 0.08) map[i] = T.ROCK;
      else if (r < 0.10) map[i] = T.DEAD_TREE;
    } else if (b === B.MOUNTAIN) {
      if (r < 0.18) map[i] = T.ROCK;
      else if (r < 0.22) map[i] = T.ROCK_IRON;
      else if (r < 0.28) map[i] = T.MTN_ROCK;
      else if (r < 0.30) map[i] = T.PINE_TREE;
    } else if (b === B.SNOW) {
      if (r < 0.06) map[i] = T.SNOW_TREE;
      else if (r < 0.10) map[i] = T.ROCK;
      else if (r < 0.13) map[i] = T.ICE;
      else if (r < 0.16) map[i] = T.MTN_ROCK;
    } else if (b === B.SWAMP) {
      if (r < 0.10) map[i] = T.DEAD_TREE;
      else if (r < 0.14) map[i] = T.BUSH;
      else if (r < 0.18) map[i] = T.TALL_GRASS;
      else if (r < 0.20) map[i] = T.ROCK;
      else if (r < 0.22) map[i] = T.FLOWER_B;
    }
  }

  // Mountain peaks — extra rock formations on elevation 2
  for (let i = 0; i < W * H; i++) {
    if (elev[i] === 2 && (map[i] === T.MTN_GROUND || map[i] === T.SNOW)) {
      if (rand() < 0.4) map[i] = T.MTN_ROCK;
    }
  }

  // Stone-ruin dungeon in NE
  const ruinCX = (W * 0.80) | 0, ruinCY = (H * 0.20) | 0;
  for (let y = ruinCY - 11; y <= ruinCY + 11; y++) {
    for (let x = ruinCX - 13; x <= ruinCX + 13; x++) {
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue;
      const dx = x - ruinCX, dy = y - ruinCY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 12) continue;
      biome[y * W + x] = B.RUINS;
      if (d > 9.5 && rand() > 0.4) {
        map[y * W + x] = T.RUIN_WALL;
      } else {
        map[y * W + x] = T.RUIN_FLOOR;
      }
      elev[y * W + x] = 0;
    }
  }
  // entrance gap
  for (let y = ruinCY + 8; y <= ruinCY + 11; y++) {
    if (y < 0 || y >= H) continue;
    map[y * W + ruinCX] = T.RUIN_FLOOR;
  }
  // iron ore inside ruins
  for (let i = 0; i < 22; i++) {
    const x = ruinCX + Math.floor((rand() - 0.5) * 18);
    const y = ruinCY + Math.floor((rand() - 0.5) * 18);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    if (map[y * W + x] === T.RUIN_FLOOR) map[y * W + x] = T.ROCK_IRON;
  }

  // Border of impassable rock
  for (let x = 0; x < W; x++) {
    map[x] = T.MTN_ROCK; map[(H - 1) * W + x] = T.MTN_ROCK;
  }
  for (let y = 0; y < H; y++) {
    map[y * W] = T.MTN_ROCK; map[y * W + W - 1] = T.MTN_ROCK;
  }

  // Spawn — center clearing on meadow
  const spawn = { x: (W / 2) | 0, y: (H / 2) | 0 };
  // Force a walkable clearing biome
  for (let y = spawn.y - 5; y <= spawn.y + 5; y++) {
    for (let x = spawn.x - 5; x <= spawn.x + 5; x++) {
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
      const i = y * W + x;
      if (map[i] === T.WATER || map[i] === T.SWAMP_WATER) continue;
      biome[i] = B.MEADOW;
      map[i] = T.GRASS;
      elev[i] = 0;
    }
  }
  map[spawn.y * W + spawn.x + 2] = T.SIGNPOST;

  return { map: Array.from(map), elev: Array.from(elev), biome: Array.from(biome), spawn,
           ruin: { x: ruinCX, y: ruinCY } };
}

// =========================================================================
// State
// =========================================================================
let state = null;
let damageMap = new Map();
let growthMap = new Map();
let signs = new Map();
let stationsNear = { workbench: false, forge: false, campfire: false };

function newGame() {
  const seed = (Math.random() * 0x7fffffff) | 0;
  const w = genWorld(seed);
  state = {
    seed,
    map: w.map, elev: w.elev, biome: w.biome,
    spawn: w.spawn, ruin: w.ruin,
    player: {
      x: (w.spawn.x + 0.5) * TILE,
      y: (w.spawn.y + 0.5) * TILE,
      hp: 50, maxHp: 50,
      rupees: 0,
      facing: { x: 0, y: 1 },
      facingKey: 'down',
      iframes: 0, swing: 0,
      speedBuff: 0,
      respawn: null,
      walkPhase: 0,
    },
    inv: {
      slots: [
        { id:'sword_wood', n:1 },
        { id:'axe_wood', n:1 },
        { id:'pickaxe_wood', n:1 },
        null, null, null, null, null,
      ],
      store: { rupee: 0 },
      hotbar: 0,
    },
    enemies: [],
    projectiles: [],
    drops: [],
    particles: [],   // weather + sparkle effects
    nextEnemy: 3500,
    signEntries: { [w.spawn.x + 2 + ',' + w.spawn.y]: 'Welcome, hero!\n\nCut grass. Slash bushes.\nBuild a workbench.' },
    time: 0,
    dayTime: 0,         // ms into current day cycle
    bossSpawned: false,
  };
  damageMap = new Map();
  growthMap = new Map();
  signs = new Map(Object.entries(state.signEntries));
  spawnInitialEnemies();
  spawnBoss();
  save();
}

function spawnInitialEnemies() {
  let n = 0, tries = 0;
  while (n < 14 && tries < 400) {
    tries++;
    const tx = (Math.random() * WORLD_W) | 0;
    const ty = (Math.random() * WORLD_H) | 0;
    const t = state.map[ty * WORLD_W + tx];
    if (!TDEF[t] || !TDEF[t].walk) continue;
    const dx = tx - state.spawn.x, dy = ty - state.spawn.y;
    if (dx * dx + dy * dy < 144) continue;
    pushEnemy(pickEnemyForBiome(state.biome[ty * WORLD_W + tx]),
              (tx + 0.5) * TILE, (ty + 0.5) * TILE);
    n++;
  }
}
function spawnBoss() {
  // Boss inside the ruins center
  const rx = state.ruin.x, ry = state.ruin.y;
  pushEnemy('stalfos', (rx + 0.5) * TILE, (ry + 0.5) * TILE);
  state.bossSpawned = true;
}

function pickEnemyForBiome(b) {
  if (b === B.SNOW) return Math.random() < 0.7 ? 'wolf' : 'keese';
  if (b === B.SWAMP) return Math.random() < 0.6 ? 'slime' : 'keese';
  if (b === B.DESERT) return Math.random() < 0.5 ? 'octorok' : 'wolf';
  if (b === B.MOUNTAIN) return Math.random() < 0.5 ? 'octorok' : 'keese';
  if (b === B.FOREST) return Math.random() < 0.6 ? 'octorok' : 'slime';
  if (b === B.RUINS) return Math.random() < 0.5 ? 'stalfos_minion' : 'octorok';
  return Math.random() < 0.5 ? 'slime' : 'octorok';
}

function pushEnemy(kind, x, y) {
  const defs = {
    slime:    { hp:8,  maxHp:8,  speed:1.0, damage:6,  loot:{ rupee:1, heart_drop:0.25, slime_ball:0.3 } },
    octorok:  { hp:12, maxHp:12, speed:1.1, damage:8,  loot:{ rupee:2, heart_drop:0.20 }, ranged:true },
    keese:    { hp:5,  maxHp:5,  speed:1.8, damage:5,  loot:{ rupee:1, heart_drop:0.10 } },
    wolf:     { hp:14, maxHp:14, speed:1.5, damage:10, loot:{ rupee:2, heart_drop:0.25, fish:0.20 } },
    stalfos_minion: { hp:18, maxHp:18, speed:1.2, damage:10, loot:{ rupee:3, heart_drop:0.30, iron_ore:0.3 } },
    stalfos:  { hp:80, maxHp:80, speed:1.4, damage:18, loot:{ boss_heart:1, rupee:50, iron_ingot:5, heart_drop:1 }, boss:true, ranged:true },
  };
  const d = defs[kind] || defs.slime;
  state.enemies.push({
    kind, x, y, hp:d.hp, maxHp:d.maxHp,
    speed:d.speed, damage:d.damage, loot:d.loot, ranged:!!d.ranged, boss:!!d.boss,
    vx:0, vy:0, think:0, shootCd:1200 + Math.random() * 1500,
    hitFlash:0,
  });
}

// =========================================================================
// Save / load
// =========================================================================
function packBytes(arr) { return btoa(String.fromCharCode.apply(null, arr)); }
function unpackBytes(s) {
  const bin = atob(s);
  const out = new Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function save() {
  if (!state) return;
  try {
    const compact = {
      v: 2, seed: state.seed,
      map: packBytes(state.map), elev: packBytes(state.elev), biome: packBytes(state.biome),
      spawn: state.spawn, ruin: state.ruin,
      player: state.player, inv: state.inv, enemies: state.enemies,
      growth: Object.fromEntries(growthMap), signs: Object.fromEntries(signs),
      time: state.time, dayTime: state.dayTime, bossSpawned: state.bossSpawned,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(compact));
  } catch (e) {}
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
    const s = JSON.parse(raw);
    if (s.v !== 2) return false;
    state = {
      seed: s.seed, map: unpackBytes(s.map), elev: unpackBytes(s.elev), biome: unpackBytes(s.biome),
      spawn: s.spawn, ruin: s.ruin, player: s.player, inv: s.inv,
      enemies: s.enemies, projectiles: [], drops: [], particles: [],
      nextEnemy: 3500, time: s.time, dayTime: s.dayTime || 0,
      bossSpawned: !!s.bossSpawned,
    };
    damageMap = new Map();
    growthMap = new Map(Object.entries(s.growth || {}).map(([k, v]) => [k, +v]));
    signs = new Map(Object.entries(s.signs || {}));
    return true;
  } catch (e) { return false; }
}
function wipe() { localStorage.removeItem(SAVE_KEY); }

// =========================================================================
// Inventory helpers
// =========================================================================
function invAdd(id, n) {
  if (!ITEMS[id]) return; n = n || 1;
  const def = ITEMS[id];
  if (def.stack && def.stack > 1) state.inv.store[id] = (state.inv.store[id] || 0) + n;
  else {
    for (let i = 0; i < state.inv.slots.length; i++) {
      if (!state.inv.slots[i]) { state.inv.slots[i] = { id, n:1 }; return; }
    }
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

function applyDrop(table, dropAt) {
  const out = {};
  for (const k in table) {
    let v = table[k];
    let count = Math.floor(v);
    const chance = v - count;
    if (chance > 0 && Math.random() < chance) count++;
    if (count > 0) {
      if (k === 'heart_drop') {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + ITEMS.heart_drop.heal);
      } else if (k === 'rupee') {
        state.player.rupees = Math.min(9999, state.player.rupees + count);
      } else {
        invAdd(k, count);
      }
      out[k] = count;
    }
  }
  if (dropAt) {
    const parts = [];
    for (const k in out) {
      if (k === 'heart_drop') parts.push('+♥');
      else if (k === 'rupee') parts.push('+' + out[k] + '💎');
      else parts.push('+' + out[k] + (ITEMS[k] ? ITEMS[k].icon : ''));
    }
    if (parts.length) state.drops.push({ x:dropAt.x, y:dropAt.y, t:900, text:parts.join(' ') });
  }
}

// =========================================================================
// Tile / collision helpers
// =========================================================================
function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return T.MTN_ROCK;
  return state.map[ty * WORLD_W + tx];
}
function setTile(tx, ty, v) { state.map[ty * WORLD_W + tx] = v; }
function elevAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return 0;
  return state.elev[ty * WORLD_W + tx];
}
function biomeAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return B.MEADOW;
  return state.biome[ty * WORLD_W + tx];
}
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
function recomputeStations() {
  const p = state.player;
  const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
  stationsNear = { workbench:false, forge:false, campfire:false };
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const t = tileAt(ptx + dx, pty + dy);
    const def = TDEF[t]; if (!def) continue;
    if (def.station === 'workbench') stationsNear.workbench = true;
    if (def.station === 'forge') stationsNear.forge = true;
    if (def.station === 'campfire') stationsNear.campfire = true;
  }
}

// =========================================================================
// Input
// =========================================================================
const joyContainer = document.getElementById('joy');
const joyBase = document.getElementById('joyBase');
const joyStick = document.getElementById('joyStick');
const btnA = document.getElementById('btnA');
const btnB = document.getElementById('btnB');
let joyPointer = null, joyRadius = 50, joyCenter = { x:0, y:0 };
let inputVec = { x:0, y:0 };
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
  joyMove(e); e.preventDefault();
});
function joyMove(e) {
  if (e.pointerId !== joyPointer) return;
  const dx = e.clientX - joyCenter.x, dy = e.clientY - joyCenter.y;
  const d = Math.hypot(dx, dy);
  const cd = Math.min(d, joyRadius);
  const ux = d ? dx / d : 0, uy = d ? dy / d : 0;
  let vx = (cd / joyRadius) * ux, vy = (cd / joyRadius) * uy;
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
  return { x:vx, y:vy };
}
function dirKey(fx, fy) {
  if (Math.abs(fx) > Math.abs(fy)) return fx > 0 ? 'right' : 'left';
  return fy > 0 ? 'down' : 'up';
}

// =========================================================================
// HUD
// =========================================================================
const heartsEl = document.getElementById('hearts');
const rupeesEl = document.getElementById('rupees');
const hotbarEl = document.getElementById('hotbar');
const stationBadgeEl = document.getElementById('stationBadge');
const toastEl = document.getElementById('toast');
const biomeEl = document.getElementById('biomeLabel');
const timeEl = document.getElementById('timeLabel');
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
  const hearts = Math.ceil(p.maxHp / 10); // 1 heart = 10 hp
  const hpPerHeart = p.maxHp / hearts;
  for (let i = 0; i < hearts; i++) {
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
  if (stationsNear.workbench) parts.push('🧰');
  if (stationsNear.forge) parts.push('🏭');
  if (stationsNear.campfire) parts.push('🔥');
  stationBadgeEl.textContent = parts.join(' ');
  stationBadgeEl.style.opacity = parts.length ? '1' : '0';
}
function renderBiomeBadge() {
  if (!state) return;
  const p = state.player;
  const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
  const b = biomeAt(tx, ty);
  biomeEl.textContent = BIOME_NAME[b] || '';
  // day-night label
  const t = (state.dayTime % DAY_LENGTH) / DAY_LENGTH;
  const isNight = t > NIGHT_PHASE[0] && t < NIGHT_PHASE[1];
  const dawn = t < 0.10 || (t > 0.55 && t < NIGHT_PHASE[0]) || (t > NIGHT_PHASE[1]);
  const label = isNight ? '🌙' : (dawn ? '🌅' : '☀️');
  timeEl.textContent = label;
}

// =========================================================================
// Modal
// =========================================================================
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
    const s = state.inv.slots[i]; if (s) all.push({ id:s.id, n:s.n, idx:i, equipped:true });
  }
  for (const id in state.inv.store) if (state.inv.store[id] > 0) all.push({ id, n: state.inv.store[id] });
  const grid = document.createElement('div'); grid.className = 'grid';
  for (let i = 0; i < Math.max(24, all.length); i++) {
    const it = all[i];
    const slot = document.createElement('div');
    slot.className = 'invslot' + (it ? '' : ' empty');
    if (it) {
      const d = ITEMS[it.id]; slot.textContent = d.icon;
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
  help.textContent = 'Tap an item to equip it. Use the ✱ button to consume food, plant seeds, or place a structure in front of you.';
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
  state.inv.slots[idx] = { id, n:have };
  delete state.inv.store[id];
  renderHotbar();
}

function openCraft() {
  modalTitle.textContent = 'Crafting';
  modalBody.innerHTML = '';
  const badge = document.createElement('div');
  badge.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px';
  const st = [];
  if (stationsNear.workbench) st.push('🧰 Workbench');
  if (stationsNear.forge) st.push('🏭 Forge');
  if (stationsNear.campfire) st.push('🔥 Campfire');
  badge.textContent = st.length ? 'Near ' + st.join(' · ') : 'No nearby stations — basic recipes only';
  modalBody.appendChild(badge);

  // Tab buttons by station
  const tabs = ['basic', 'workbench', 'forge', 'campfire'];
  const tabEl = document.createElement('div');
  tabEl.style.cssText = 'display:flex;gap:4px;margin-bottom:10px;';
  let active = 'basic';
  const list = document.createElement('div'); modalBody.appendChild(list);
  function renderList() {
    list.innerHTML = '';
    for (const r of RECIPES) {
      if (active === 'basic' && r.station != null) continue;
      if (active === 'workbench' && r.station !== 'workbench') continue;
      if (active === 'forge' && r.station !== 'forge') continue;
      if (active === 'campfire' && r.station !== 'campfire') continue;
      const def = ITEMS[r.id]; if (!def) continue;
      const reqOk = !r.station || stationsNear[r.station];
      const matOk = Object.entries(r.needs).every(([k, v]) => invCount(k) >= v);
      const row = document.createElement('div'); row.className = 'recipe';
      const ic = document.createElement('div'); ic.className = 'icon'; ic.textContent = def.icon;
      const info = document.createElement('div'); info.className = 'info';
      const name = document.createElement('div'); name.className = 'name';
      name.textContent = def.name + (r.count > 1 ? ` ×${r.count}` : '');
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
        renderList(); renderHotbar(); save();
      });
      row.appendChild(ic); row.appendChild(info); row.appendChild(btn);
      list.appendChild(row);
    }
  }
  for (const t of tabs) {
    const b = document.createElement('button');
    b.className = 'menuitem'; b.style.cssText = 'flex:1;padding:8px;text-align:center;font-size:12px;text-transform:capitalize;margin:0';
    b.textContent = t;
    if (t === active) b.style.background = 'var(--accent)';
    b.addEventListener('click', () => { active = t; openCraft(); });
    tabEl.appendChild(b);
  }
  modalBody.insertBefore(tabEl, list);
  renderList();
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
    if (confirm('Wipe save and start over?')) { wipe(); newGame(); renderHotbar(); closeModal(); showToast('A new realm awaits'); }
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

// =========================================================================
// Use button
// =========================================================================
function useEquipped() {
  if (!state || paused) return;
  const p = state.player;
  const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
  const here = tileAt(tx, ty);
  const front = tileInFront(p);
  const fTile = tileAt(front.tx, front.ty);
  // Tile interactions
  if (here === T.BED) { sleep(); return; }
  if (fTile === T.BED) { p.x = (front.tx + 0.5) * TILE; p.y = (front.ty + 0.5) * TILE; sleep(); return; }
  if (fTile === T.SIGNPOST) { openSign(front.tx, front.ty); return; }
  if (fTile === T.DOOR_CLOSED) { setTile(front.tx, front.ty, T.DOOR_OPEN); return; }
  if (fTile === T.DOOR_OPEN) { setTile(front.tx, front.ty, T.DOOR_CLOSED); return; }

  const s = equippedSlot();
  if (!s) { showToast('Nothing equipped'); return; }
  const d = ITEMS[s.id];

  if (d.use === 'eat') {
    if (p.hp >= p.maxHp && !d.speed) { showToast('Already at full health'); return; }
    p.hp = Math.min(p.maxHp, p.hp + (d.heal || 10));
    if (d.speed) p.speedBuff = (p.speedBuff || 0) + (d.speedTime || 15000);
    consumeFromHotbar(state.inv.hotbar, 1);
    showToast('Restored ♥');
    renderHotbar(); return;
  }
  if (d.use === 'plant') {
    const t = fTile;
    if (t === T.GARDEN_DRY) {
      setTile(front.tx, front.ty, T.GARDEN_PLANTED);
      growthMap.set(front.tx + ',' + front.ty, GROW_TIME);
      consumeFromHotbar(state.inv.hotbar, 1);
      showToast('Planted a seed');
    } else { showToast('Need a garden plot'); }
    return;
  }
  if (d.use === 'upgrade_hp') {
    p.maxHp += 20; p.hp = p.maxHp;
    consumeFromHotbar(state.inv.hotbar, 1);
    showToast('Heart Container claimed! Max HP +20');
    renderHotbar(); renderHearts(); return;
  }
  if (d.place !== undefined) {
    const t = fTile;
    const placeable = (t === T.GRASS || t === T.TALL_GRASS || t === T.FOREST_GRASS ||
                      t === T.SAND || t === T.DESERT_SAND || t === T.MTN_GROUND ||
                      t === T.SNOW || t === T.SWAMP_GRASS || t === T.DIRT_PATH ||
                      t === T.WOOD_FLOOR || t === T.STONE_FLOOR || t === T.RUIN_FLOOR);
    if (!placeable) { showToast('Cannot place here'); return; }
    if (front.tx === Math.floor(p.x / TILE) && front.ty === Math.floor(p.y / TILE)) { showToast('Step back to place'); return; }
    setTile(front.tx, front.ty, d.place);
    if (d.place === T.SIGNPOST) {
      const text = prompt('Sign text:', 'Hello!');
      if (text != null) signs.set(front.tx + ',' + front.ty, text.slice(0, 80));
    }
    consumeFromHotbar(state.inv.hotbar, 1);
    showToast('Placed ' + d.name);
    renderHotbar();
    if (d.place === T.BED) p.respawn = { x: front.tx, y: front.ty };
    return;
  }
  showToast('No use action');
}
function consumeFromHotbar(idx, n) {
  const s = state.inv.slots[idx]; if (!s) return;
  s.n -= n; if (s.n <= 0) state.inv.slots[idx] = null;
}
function sleep() {
  state.player.hp = state.player.maxHp;
  state.player.iframes = 1500;
  state.dayTime = (state.dayTime + DAY_LENGTH * 0.5) % DAY_LENGTH;
  growthMap.forEach((v, k) => growthMap.set(k, Math.max(0, v - 30000)));
  showToast('Zzz… restored');
}

// =========================================================================
// Combat
// =========================================================================
let attackCd = 0;
function doAttack() {
  if (attackCd > 0) return;
  attackCd = ATTACK_COOLDOWN;
  const p = state.player;
  p.swing = 220;
  const front = tileInFront(p);

  // Enemy in front?
  let hit = null, bestD = 9999;
  for (const e of state.enemies) {
    const dx = e.x - front.x, dy = e.y - front.y;
    const d = Math.hypot(dx, dy);
    const r = e.boss ? TILE * 1.1 : TILE * 0.9;
    if (d < r && d < bestD) { bestD = d; hit = e; }
  }
  if (hit) {
    const swordId = bestTool('sword');
    const axeId = bestTool('axe');
    const tool = swordId ? ITEMS[swordId] : axeId ? ITEMS[axeId] : { power:1 };
    hit.hp -= tool.power + 1;
    hit.hitFlash = 200;
    const kx = hit.x - p.x, ky = hit.y - p.y; const l = Math.hypot(kx, ky) || 1;
    hit.vx += (kx / l) * 4; hit.vy += (ky / l) * 4;
    if (hit.hp <= 0) {
      applyDrop(hit.loot, { x:hit.x, y:hit.y });
      if (hit.boss) showToast('Stalfos defeated! Heart Container claimed.');
      state.enemies.splice(state.enemies.indexOf(hit), 1);
    }
    return;
  }

  // Tile in front
  const tx = front.tx, ty = front.ty;
  const t = tileAt(tx, ty);
  const def = TDEF[t]; if (!def) return;
  if (def.pickup) {
    applyDrop(def.pickup, { x:tx*TILE+TILE/2, y:ty*TILE+TILE/2 });
    setTile(tx, ty, def.becomes !== undefined ? def.becomes : T.GRASS);
    return;
  }
  if (t === T.TALL_GRASS) {
    setTile(tx, ty, T.GRASS);
    applyDrop({ rupee:0.30, heart_drop:0.08, seed:0.05 }, { x:tx*TILE+TILE/2, y:ty*TILE+TILE/2 });
    return;
  }
  if (def.cap) {
    const requiredTool = def.tool;
    const swordId = bestTool('sword');
    const axeId = bestTool('axe');
    const pickId = bestTool('pickaxe');
    let toolId = null, power = 0;
    if (requiredTool === 'pickaxe' && pickId) { toolId = pickId; power = ITEMS[pickId].power; }
    else if (requiredTool === 'axe' && (axeId || swordId)) {
      toolId = axeId || swordId; power = ITEMS[toolId].power - (axeId ? 0 : 2);
    } else if (requiredTool === 'any') {
      toolId = axeId || swordId || pickId; power = toolId ? ITEMS[toolId].power : 1;
    }
    if (!toolId || power <= 0) { showToast('Need a ' + requiredTool); return; }
    const key = tx + ',' + ty;
    let hp = damageMap.has(key) ? damageMap.get(key) : def.hp;
    hp -= Math.max(1, power);
    if (hp <= 0) {
      damageMap.delete(key);
      setTile(tx, ty, def.becomes !== undefined ? def.becomes : T.GRASS);
      if (def.drop) applyDrop(def.drop, { x:tx*TILE+TILE/2, y:ty*TILE+TILE/2 });
      else if (def.placed && def.refund) applyDrop(def.refund, { x:tx*TILE+TILE/2, y:ty*TILE+TILE/2 });
      if (t === T.SIGNPOST) signs.delete(key);
    } else damageMap.set(key, hp);
  }
}

// =========================================================================
// Enemy update
// =========================================================================
function updateEnemies(dt) {
  state.nextEnemy -= dt;
  if (state.nextEnemy <= 0 && state.enemies.length < 28) {
    state.nextEnemy = 3000;
    for (let tries = 0; tries < 30; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 260 + Math.random() * 280;
      const wx = state.player.x + Math.cos(ang) * dist;
      const wy = state.player.y + Math.sin(ang) * dist;
      const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
      if (!isWalkTile(tileAt(tx, ty))) continue;
      let nearBuild = false;
      for (let dy = -3; dy <= 3 && !nearBuild; dy++) for (let dx = -3; dx <= 3 && !nearBuild; dx++) {
        const td = TDEF[tileAt(tx + dx, ty + dy)]; if (td && td.placed) nearBuild = true;
      }
      if (nearBuild) continue;
      pushEnemy(pickEnemyForBiome(biomeAt(tx, ty)), (tx + 0.5) * TILE, (ty + 0.5) * TILE);
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
      const detectRange = e.boss ? 9999 : 320;
      if (dist < detectRange) {
        const sp = e.speed; const dir = dist || 1;
        e.vx = (dx / dir) * sp; e.vy = (dy / dir) * sp;
      } else {
        const a = Math.random() * Math.PI * 2;
        e.vx = Math.cos(a) * e.speed * 0.4; e.vy = Math.sin(a) * e.speed * 0.4;
      }
    }
    if (e.ranged && e.shootCd <= 0 && dist < 280) {
      e.shootCd = e.boss ? 1200 : (2000 + Math.random() * 1500);
      const dir = dist || 1;
      if (e.boss) {
        // 3-shot spread
        for (let s = -1; s <= 1; s++) {
          const ang = Math.atan2(dy, dx) + s * 0.25;
          state.projectiles.push({
            x:e.x, y:e.y, vx:Math.cos(ang) * 3.2, vy:Math.sin(ang) * 3.2,
            life:1700, damage:e.damage, kind:'bone',
          });
        }
      } else {
        state.projectiles.push({
          x:e.x, y:e.y, vx:(dx/dir)*3.0, vy:(dy/dir)*3.0,
          life:1500, damage:e.damage, kind:'rock',
        });
      }
    }
    const step = dt / 16.67;
    tryMove(e, e.vx * step, e.vy * step, e.boss ? 14 : 10);
    if (Math.hypot(e.x - p.x, e.y - p.y) < (e.boss ? 26 : 22) && p.iframes <= 0) {
      damagePlayer(e.damage);
      const l = Math.hypot(e.x - p.x, e.y - p.y) || 1;
      p.x -= ((e.x - p.x) / l) * 6;
      p.y -= ((e.y - p.y) / l) * 6;
    }
  }
}
function updateProjectiles(dt) {
  const p = state.player; const step = dt / 16.67;
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const pr = state.projectiles[i];
    pr.life -= dt;
    pr.x += pr.vx * step; pr.y += pr.vy * step;
    if (pr.life <= 0) { state.projectiles.splice(i, 1); continue; }
    if (wallHit(pr.x, pr.y, 4)) { state.projectiles.splice(i, 1); continue; }
    if (p.iframes <= 0 && Math.hypot(pr.x - p.x, pr.y - p.y) < 14) {
      damagePlayer(pr.damage); state.projectiles.splice(i, 1);
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
    if (tileAt(p.respawn.x, p.respawn.y) === T.BED) { rx = p.respawn.x; ry = p.respawn.y; }
    else p.respawn = null;
  }
  p.x = (rx + 0.5) * TILE; p.y = (ry + 0.5) * TILE + TILE;
  p.hp = p.maxHp; p.iframes = 1500;
}

// =========================================================================
// Weather + particles
// =========================================================================
function updateWeather(dt) {
  const p = state.player;
  const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
  const b = biomeAt(tx, ty);
  const wantSnow = (b === B.SNOW);
  const wantRain = (b === B.SWAMP) || (b === B.FOREST && Math.sin(state.time * 0.0001) > 0.6);
  // spawn particles
  if (wantSnow && state.particles.length < 80) {
    for (let i = 0; i < 2; i++) {
      state.particles.push({
        x: p.x - viewW / 2 + Math.random() * viewW,
        y: p.y - viewH / 2 - 20,
        vx: -0.2 + Math.random() * 0.4, vy: 0.6 + Math.random() * 0.6,
        kind:'snow', life:4000,
      });
    }
  }
  if (wantRain && state.particles.length < 120) {
    for (let i = 0; i < 4; i++) {
      state.particles.push({
        x: p.x - viewW / 2 + Math.random() * viewW,
        y: p.y - viewH / 2 - 20,
        vx: -0.4, vy: 4.0,
        kind:'rain', life:1200,
      });
    }
  }
  const step = dt / 16.67;
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pa = state.particles[i];
    pa.x += pa.vx * step; pa.y += pa.vy * step;
    pa.life -= dt;
    if (pa.life <= 0 || pa.y > p.y + viewH) state.particles.splice(i, 1);
  }
}

// =========================================================================
// Update loop
// =========================================================================
let lastTime = 0;
function update(dt) {
  if (paused || !state) return;
  state.time += dt;
  state.dayTime = (state.dayTime + dt) % DAY_LENGTH;
  attackCd = Math.max(0, attackCd - dt);
  const p = state.player;
  p.iframes = Math.max(0, p.iframes - dt);
  p.swing = Math.max(0, p.swing - dt);
  if (p.speedBuff > 0) p.speedBuff -= dt;

  // Movement
  const inp = readInput();
  let speed = 2.6;
  const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
  const hereDef = TDEF[tileAt(ptx, pty)];
  if (hereDef && hereDef.slow) speed *= 0.65;
  if (hereDef && hereDef.slippery) speed *= 1.15;
  if (p.speedBuff > 0) speed *= 1.4;
  if (inp.x !== 0 || inp.y !== 0) {
    p.facing.x = inp.x; p.facing.y = inp.y;
    const l = Math.hypot(p.facing.x, p.facing.y) || 1;
    p.facing.x /= l; p.facing.y /= l;
    p.facingKey = dirKey(p.facing.x, p.facing.y);
    p.walkPhase = (p.walkPhase + dt * 0.012) % (Math.PI * 2);
  } else p.walkPhase = 0;
  const step = dt / 16.67;
  tryMove(p, inp.x * speed * step, inp.y * speed * step, 11);

  // Hurts
  const hereT = tileAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
  if (TDEF[hereT] && TDEF[hereT].hurts && p.iframes <= 0) damagePlayer(2);

  // Walk-over pickups
  if (TDEF[hereT] && TDEF[hereT].pickup) {
    const px = Math.floor(p.x / TILE), py = Math.floor(p.y / TILE);
    applyDrop(TDEF[hereT].pickup, { x:px*TILE+TILE/2, y:py*TILE+TILE/2 });
    setTile(px, py, TDEF[hereT].becomes || T.GRASS);
  }
  if (hereT === T.GARDEN_RIPE) {
    const px = Math.floor(p.x / TILE), py = Math.floor(p.y / TILE);
    applyDrop({ carrot:1, seed:1 }, { x:px*TILE+TILE/2, y:py*TILE+TILE/2 });
    setTile(px, py, T.GARDEN_DRY);
  }

  // Crop growth
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

  if (attackHeld) doAttack();
  updateEnemies(dt);
  updateProjectiles(dt);
  updateWeather(dt);
  recomputeStations();

  for (let i = state.drops.length - 1; i >= 0; i--) {
    state.drops[i].t -= dt; state.drops[i].y -= dt * 0.02;
    if (state.drops[i].t <= 0) state.drops.splice(i, 1);
  }

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toastEl.classList.remove('show');
  }
}

// =========================================================================
// Rendering
// =========================================================================
function tileColor(t, b) {
  // Ground colors per biome
  switch (t) {
    case T.GRASS:
      if (b === B.FOREST) return ['#286a26','#1a5018','#3a8a38'];
      return ['#3a8a3a','#2e6e2e','#4ea34e'];
    case T.FOREST_GRASS: return ['#246a22','#194e17','#368a34'];
    case T.TALL_GRASS:   return ['#357f35','#266a26','#52a352'];
    case T.SAND:         return ['#e6cf90','#caaa68','#f0dca0'];
    case T.DESERT_SAND:  return ['#dba85a','#b88a44','#e8be6e'];
    case T.SNOW:         return ['#f0f4fa','#cdd6e0','#ffffff'];
    case T.ICE:          return ['#b3e2ee','#90c5d4','#dff4fa'];
    case T.SWAMP_GRASS:  return ['#3a5028','#283820','#4f6634'];
    case T.MTN_GROUND:   return ['#7a6f5e','#574e3f','#9a8c75'];
    case T.DIRT_PATH:    return ['#8a6a3a','#6a4a22','#a48254'];
    case T.WATER:        return ['#3a6db8','#2c5798','#5a8fd0'];
    case T.SWAMP_WATER:  return ['#2c4032','#1c2820','#3f5a45'];
    case T.RUIN_FLOOR:   return ['#5a564a','#3a3830','#7a7468'];
  }
  return ['#3a8a3a','#2e6e2e','#4ea34e'];
}

function elevYOffset(tx, ty) {
  return -state.elev[ty * WORLD_W + tx] * ELEV_OFFSET;
}

function drawGround(tx, ty, sx, sy) {
  const i = ty * WORLD_W + tx;
  const t = state.map[i], b = state.biome[i];
  const [c, dark, light] = tileColor(t, b);
  ctx.fillStyle = c;
  ctx.fillRect(sx, sy, TILE, TILE);
  // hash-based texture
  const h = ((tx * 1103515245 + ty * 12345) >>> 0);
  ctx.fillStyle = dark;
  ctx.fillRect(sx + (h & 23), sy + ((h >> 5) & 23), 2, 2);
  ctx.fillRect(sx + ((h >> 10) & 21), sy + ((h >> 15) & 21), 2, 1);
  ctx.fillStyle = light;
  ctx.fillRect(sx + ((h >> 20) & 19), sy + ((h >> 25) & 19), 1, 1);
  if (t === T.WATER || t === T.SWAMP_WATER) {
    // wave highlight
    const phase = (state.time * 0.002 + tx * 0.3 + ty * 0.6) % 1;
    ctx.fillStyle = light;
    ctx.fillRect(sx + 3 + (phase * 18 | 0), sy + 7, 6, 1);
    ctx.fillRect(sx + 2, sy + 18 + (phase * 8 | 0), 4, 1);
  }
}
// Cliff face drawn at south edge when tile is higher than southern neighbor.
function drawCliffShadow(tx, ty, sx, sy) {
  const e = state.elev[ty * WORLD_W + tx];
  if (e === 0) return;
  const sN = (ty + 1 < WORLD_H) ? state.elev[(ty + 1) * WORLD_W + tx] : e;
  if (sN < e) {
    const h = (e - sN) * ELEV_OFFSET + 2;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(sx, sy + TILE, TILE, h);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(sx, sy + TILE + h, TILE, 2);
  }
}

function drawTallGrass(sx, sy, tx, ty) {
  const sway = Math.sin(state.time * 0.003 + tx * 0.5) * 1.5;
  ctx.fillStyle = '#6abf45';
  const h = ((tx * 17 + ty * 31) >>> 0);
  for (let i = 0; i < 5; i++) {
    const x = sx + 3 + ((h * (i + 1) * 13) & 19);
    const y = sy + 7 + (((h >> i) * 7) & 14);
    ctx.fillRect(x + sway * (i % 2 ? 1 : -1), y, 2, 6);
  }
  ctx.fillStyle = '#a8dc6a';
  for (let i = 0; i < 3; i++) {
    const x = sx + 5 + ((h * (i + 2) * 7) & 17);
    const y = sy + 4 + (((h >> (i + 3)) * 11) & 16);
    ctx.fillRect(x + sway * 0.5, y, 1, 4);
  }
}
function drawBush(sx, sy) {
  ctx.fillStyle = '#1f4f1f';
  ctx.fillRect(sx + 4, sy + 7, TILE - 8, TILE - 10);
  ctx.fillStyle = '#357f35';
  ctx.fillRect(sx + 6, sy + 5, TILE - 12, TILE - 14);
  ctx.fillRect(sx + 8, sy + 3, TILE - 16, 4);
  ctx.fillStyle = '#5ea85e';
  ctx.fillRect(sx + 8, sy + 7, 4, 2);
  ctx.fillRect(sx + 14, sy + 5, 3, 2);
  ctx.fillStyle = '#88c878';
  ctx.fillRect(sx + 10, sy + 9, 2, 1);
}
function drawTree(sx, sy, kind) {
  // trunk
  ctx.fillStyle = '#523417';
  ctx.fillRect(sx + 11, sy + 18, 6, 8);
  ctx.fillStyle = '#36210d';
  ctx.fillRect(sx + 11, sy + 24, 6, 2);
  if (kind === 'pine') {
    ctx.fillStyle = '#0e3a14';
    ctx.fillRect(sx + 5, sy + 14, TILE - 10, 6);
    ctx.fillRect(sx + 3, sy + 8, TILE - 6, 8);
    ctx.fillStyle = '#1f5a26';
    ctx.fillRect(sx + 4, sy + 10, TILE - 8, 4);
    ctx.beginPath();
    ctx.moveTo(sx + TILE / 2, sy + 1);
    ctx.lineTo(sx + TILE - 5, sy + 10);
    ctx.lineTo(sx + 5, sy + 10);
    ctx.closePath();
    ctx.fillStyle = '#1f5a26';
    ctx.fill();
  } else if (kind === 'snow') {
    ctx.fillStyle = '#0e3a14';
    ctx.fillRect(sx + 3, sy + 10, TILE - 6, 10);
    ctx.fillStyle = '#1f5a26';
    ctx.fillRect(sx + 4, sy + 12, TILE - 8, 4);
    ctx.fillStyle = '#f4f8ff';
    ctx.fillRect(sx + 3, sy + 10, TILE - 6, 3);
    ctx.fillRect(sx + 6, sy + 16, TILE - 12, 2);
  } else if (kind === 'dead') {
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(sx + 9, sy + 6, 2, 12);
    ctx.fillRect(sx + 13, sy + 4, 2, 16);
    ctx.fillRect(sx + 17, sy + 8, 2, 10);
    ctx.fillRect(sx + 11, sy + 6, 6, 2);
  } else {
    ctx.fillStyle = '#103a13';
    ctx.fillRect(sx + 3, sy + 5, TILE - 6, 14);
    ctx.fillRect(sx + 5, sy + 3, TILE - 10, 18);
    ctx.fillStyle = '#1f5a26';
    ctx.fillRect(sx + 4, sy + 7, TILE - 8, 10);
    ctx.fillStyle = '#3a8a3a';
    ctx.fillRect(sx + 8, sy + 6, 4, 4);
    ctx.fillRect(sx + 14, sy + 10, 4, 3);
  }
}
function drawCactus(sx, sy) {
  ctx.fillStyle = '#2a6a2a';
  ctx.fillRect(sx + 11, sy + 5, 6, 22);
  ctx.fillRect(sx + 5, sy + 12, 6, 8);
  ctx.fillRect(sx + 17, sy + 10, 5, 8);
  ctx.fillStyle = '#4ea34e';
  ctx.fillRect(sx + 12, sy + 6, 2, 19);
  ctx.fillStyle = '#f4d24a';
  ctx.fillRect(sx + 13, sy + 4, 2, 2);
}
function drawRock(sx, sy, iron, mountain) {
  ctx.fillStyle = mountain ? '#454238' : '#3a3a3a';
  ctx.fillRect(sx + 3, sy + 6, TILE - 6, TILE - 10);
  ctx.fillStyle = mountain ? '#6f6a58' : '#6a6a6a';
  ctx.fillRect(sx + 5, sy + 4, TILE - 10, TILE - 12);
  ctx.fillStyle = mountain ? '#a39c84' : '#9a9a9a';
  ctx.fillRect(sx + 7, sy + 5, 3, 2);
  ctx.fillRect(sx + 14, sy + 10, 3, 2);
  if (iron) {
    ctx.fillStyle = '#b85c1c';
    ctx.fillRect(sx + 9, sy + 12, 3, 3);
    ctx.fillRect(sx + 16, sy + 16, 2, 2);
  }
}
function drawFlower(sx, sy, color) {
  ctx.fillStyle = '#f4e896';
  ctx.fillRect(sx + 13, sy + 13, 3, 3);
  ctx.fillStyle = color;
  ctx.fillRect(sx + 11, sy + 11, 3, 3);
  ctx.fillRect(sx + 15, sy + 11, 3, 3);
  ctx.fillRect(sx + 11, sy + 15, 3, 3);
  ctx.fillRect(sx + 15, sy + 15, 3, 3);
}
function drawWoodFloor(sx, sy) {
  ctx.fillStyle = '#b58154';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#8a5a36';
  ctx.fillRect(sx, sy + 9, TILE, 1);
  ctx.fillRect(sx, sy + 19, TILE, 1);
  ctx.fillRect(sx + 14, sy, 1, TILE);
}
function drawStoneFloor(sx, sy) {
  ctx.fillStyle = '#8a8a98';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#6a6a78';
  ctx.fillRect(sx, sy + 14, TILE, 1);
  ctx.fillRect(sx + 14, sy, 1, 14);
  ctx.fillRect(sx + 7, sy + 14, 1, TILE - 14);
}
function drawRuinFloor(sx, sy) {
  ctx.fillStyle = '#5a564a';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#3a3830';
  ctx.fillRect(sx, sy + 14, TILE, 1);
  ctx.fillRect(sx + 14, sy, 1, TILE);
}
// Wall auto-connect — checks 4 neighbors to decide which sides to outline.
function drawConnectedWall(sx, sy, tx, ty, kind) {
  const same = (t) => {
    const def = TDEF[t]; return def && def.wall === kind;
  };
  const N = same(tileAt(tx, ty - 1));
  const E = same(tileAt(tx + 1, ty));
  const S = same(tileAt(tx, ty + 1));
  const W = same(tileAt(tx - 1, ty));
  let face, edge, hi;
  if (kind === 'stone') { face = '#7a7a88'; edge = '#3a3a48'; hi = '#9a9aaa'; }
  else if (kind === 'wood') { face = '#a16b40'; edge = '#5a3a1c'; hi = '#c89066'; }
  else { face = '#8a6a3a'; edge = '#5a4220'; hi = '#a87f4a'; }
  ctx.fillStyle = edge;
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = face;
  ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
  // open edges = no connection -> brighter highlight
  ctx.fillStyle = hi;
  if (!N) ctx.fillRect(sx + 3, sy + 2, TILE - 6, 1);
  if (!W) ctx.fillRect(sx + 2, sy + 3, 1, TILE - 6);
  ctx.fillStyle = edge;
  if (!S) ctx.fillRect(sx + 3, sy + TILE - 3, TILE - 6, 1);
  if (!E) ctx.fillRect(sx + TILE - 3, sy + 3, 1, TILE - 6);
  // Slight texture pattern for stone
  if (kind === 'stone') {
    ctx.fillStyle = '#a3a3b0';
    ctx.fillRect(sx + 5, sy + 6, 6, 4);
    ctx.fillRect(sx + 14, sy + 6, 9, 4);
    ctx.fillRect(sx + 5, sy + 14, 9, 4);
    ctx.fillRect(sx + 16, sy + 14, 7, 4);
  } else if (kind === 'wood') {
    ctx.fillStyle = '#c89066';
    ctx.fillRect(sx + 4, sy + 7, TILE - 8, 3);
    ctx.fillRect(sx + 4, sy + 14, TILE - 8, 3);
    ctx.fillRect(sx + 4, sy + 20, TILE - 8, 3);
  }
}
function drawFence(sx, sy, tx, ty) {
  ctx.fillStyle = '#7a5a2a';
  ctx.fillRect(sx + 6, sy + 4, 3, TILE - 8);
  ctx.fillRect(sx + TILE - 9, sy + 4, 3, TILE - 8);
  // crossbeam
  ctx.fillRect(sx + 2, sy + 10, TILE - 4, 3);
  ctx.fillRect(sx + 2, sy + 18, TILE - 4, 3);
  ctx.fillStyle = '#a3805a';
  ctx.fillRect(sx + 6, sy + 4, 3, 1);
  ctx.fillRect(sx + TILE - 9, sy + 4, 3, 1);
}
function drawDoor(sx, sy, open) {
  ctx.fillStyle = '#5a3414';
  ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
  if (open) {
    ctx.fillStyle = '#3a2008';
    ctx.fillRect(sx + 6, sy + 4, TILE - 12, TILE - 6);
  } else {
    ctx.fillStyle = '#7a4a1c';
    ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
    ctx.fillStyle = '#3a2008';
    ctx.fillRect(sx + 4, sy + 12, TILE - 8, 1);
    ctx.fillStyle = '#f4d24a';
    ctx.fillRect(sx + TILE - 7, sy + 14, 2, 2);
  }
}
function drawBanner(sx, sy) {
  ctx.fillStyle = '#5a3414';
  ctx.fillRect(sx + 13, sy + 2, 2, TILE - 4);
  ctx.fillStyle = '#3aa848';
  ctx.fillRect(sx + 5, sy + 4, 14, 14);
  ctx.fillStyle = '#f4d24a';
  ctx.fillRect(sx + 11, sy + 9, 4, 4);
}
function drawWorkbench(sx, sy) {
  ctx.fillStyle = '#5a3a18';
  ctx.fillRect(sx + 2, sy + 7, TILE - 4, TILE - 11);
  ctx.fillStyle = '#a37a44';
  ctx.fillRect(sx + 4, sy + 9, TILE - 8, 7);
  ctx.fillStyle = '#3a2412';
  ctx.fillRect(sx + 4, sy + TILE - 5, 4, 4);
  ctx.fillRect(sx + TILE - 8, sy + TILE - 5, 4, 4);
  ctx.fillStyle = '#cfcfcf';
  ctx.fillRect(sx + 7, sy + 5, 7, 2);
  ctx.fillStyle = '#8a5a36';
  ctx.fillRect(sx + 16, sy + 3, 2, 5);
}
function drawForge(sx, sy) {
  ctx.fillStyle = '#2a2a32';
  ctx.fillRect(sx + 2, sy + 5, TILE - 4, TILE - 7);
  ctx.fillStyle = '#5a5a68';
  ctx.fillRect(sx + 4, sy + 7, TILE - 8, TILE - 12);
  const flick = 0.7 + 0.3 * Math.sin(state.time * 0.012);
  ctx.fillStyle = `rgba(255,${110 + flick * 60 | 0},40,1)`;
  ctx.fillRect(sx + 8, sy + 12, TILE - 16, 7);
  ctx.fillStyle = '#f4d24a';
  ctx.fillRect(sx + 11, sy + 14, 6, 3);
}
function drawGarden(sx, sy, stage) {
  ctx.fillStyle = '#5a3a14';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#3a2208';
  ctx.fillRect(sx + 4, sy + 9, TILE - 8, 1);
  ctx.fillRect(sx + 4, sy + 18, TILE - 8, 1);
  if (stage === 1) {
    ctx.fillStyle = '#5ea85e';
    ctx.fillRect(sx + 8, sy + 14, 2, 4);
    ctx.fillRect(sx + 17, sy + 12, 2, 5);
  } else if (stage === 2) {
    ctx.fillStyle = '#3a8a3a';
    ctx.fillRect(sx + 6, sy + 7, 3, 12);
    ctx.fillRect(sx + 17, sy + 5, 3, 14);
    ctx.fillStyle = '#e35a5a';
    ctx.fillRect(sx + 5, sy + 5, 5, 4);
    ctx.fillRect(sx + 16, sy + 3, 5, 4);
  }
}
function drawBed(sx, sy) {
  ctx.fillStyle = '#5a3a1c';
  ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = '#a83a3a';
  ctx.fillRect(sx + 4, sy + 8, TILE - 8, TILE - 12);
  ctx.fillStyle = '#f4e0d4';
  ctx.fillRect(sx + 6, sy + 4, TILE - 12, 5);
  ctx.fillStyle = '#8a2a2a';
  ctx.fillRect(sx + 4, sy + TILE - 5, TILE - 8, 2);
}
function drawCampfire(sx, sy) {
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(sx + 3, sy + TILE - 9, TILE - 6, 5);
  ctx.fillStyle = '#5a3a1c';
  ctx.fillRect(sx + 7, sy + TILE - 13, 4, 7);
  ctx.fillRect(sx + TILE - 11, sy + TILE - 13, 4, 7);
  const flick = 0.6 + 0.4 * Math.sin(state.time * 0.014 + sx * 0.13);
  ctx.fillStyle = `rgba(255,${140 + flick * 50 | 0},50,1)`;
  ctx.beginPath();
  ctx.moveTo(sx + TILE / 2, sy + 4);
  ctx.lineTo(sx + TILE - 7, sy + TILE - 6);
  ctx.lineTo(sx + 7, sy + TILE - 6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f4d24a';
  ctx.beginPath();
  ctx.moveTo(sx + TILE / 2, sy + 10);
  ctx.lineTo(sx + TILE - 11, sy + TILE - 9);
  ctx.lineTo(sx + 11, sy + TILE - 9);
  ctx.closePath(); ctx.fill();
}
function drawLantern(sx, sy, isNight) {
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(sx + 12, sy + 14, 4, TILE - 18);
  ctx.fillStyle = '#5a5a5a';
  ctx.fillRect(sx + 9, sy + 6, 10, 9);
  ctx.fillStyle = isNight ? '#fff0a0' : '#a3a392';
  ctx.fillRect(sx + 11, sy + 8, 6, 6);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(sx + 11, sy + 4, 6, 2);
}
function drawSign(sx, sy) {
  ctx.fillStyle = '#5a3a1c';
  ctx.fillRect(sx + 12, sy + 14, 4, 14);
  ctx.fillStyle = '#a37a44';
  ctx.fillRect(sx + 3, sy + 5, TILE - 6, 11);
  ctx.fillStyle = '#3a2412';
  ctx.fillRect(sx + 3, sy + 5, TILE - 6, 1);
  ctx.fillRect(sx + 3, sy + 15, TILE - 6, 1);
  ctx.fillStyle = '#5a3a1c';
  ctx.fillRect(sx + 6, sy + 8, 3, 1);
  ctx.fillRect(sx + 10, sy + 8, 6, 1);
  ctx.fillRect(sx + 6, sy + 11, 11, 1);
}
function drawRuinWall(sx, sy, tx, ty) {
  ctx.fillStyle = '#322f28';
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = '#5e5b50';
  ctx.fillRect(sx + 2, sy + 2, 10, 6);
  ctx.fillRect(sx + 14, sy + 3, 12, 6);
  ctx.fillRect(sx + 2, sy + 10, 7, 6);
  ctx.fillRect(sx + 11, sy + 10, 15, 6);
  ctx.fillRect(sx + 2, sy + 18, 13, 6);
  ctx.fillRect(sx + 17, sy + 19, 9, 6);
  ctx.fillStyle = '#2a8a3a';
  if (((tx + ty) & 3) === 0) ctx.fillRect(sx + 4, sy + 22, 4, 2);
}
function drawMtnRock(sx, sy) {
  ctx.fillStyle = '#352e22';
  ctx.fillRect(sx, sy + 2, TILE, TILE - 2);
  ctx.fillStyle = '#5a4e3a';
  ctx.fillRect(sx + 1, sy, TILE - 2, TILE - 3);
  ctx.fillStyle = '#7a6f56';
  ctx.fillRect(sx + 3, sy + 2, TILE - 6, 6);
  ctx.fillStyle = '#a39477';
  ctx.fillRect(sx + 4, sy + 3, 4, 2);
  ctx.fillRect(sx + 11, sy + 4, 5, 2);
}

// Tile draw dispatcher
function drawDecor(t, sx, sy, tx, ty, isNight) {
  switch (t) {
    case T.TALL_GRASS: drawTallGrass(sx, sy, tx, ty); break;
    case T.BUSH:       drawBush(sx, sy); break;
    case T.TREE:       drawTree(sx, sy, 'leaf'); break;
    case T.PINE_TREE:  drawTree(sx, sy, 'pine'); break;
    case T.SNOW_TREE:  drawTree(sx, sy, 'snow'); break;
    case T.DEAD_TREE:  drawTree(sx, sy, 'dead'); break;
    case T.CACTUS:     drawCactus(sx, sy); break;
    case T.ROCK:       drawRock(sx, sy, false, false); break;
    case T.ROCK_IRON:  drawRock(sx, sy, true, false); break;
    case T.MTN_ROCK:   drawMtnRock(sx, sy); break;
    case T.RUIN_WALL:  drawRuinWall(sx, sy, tx, ty); break;
    case T.FLOWER_R:   drawFlower(sx, sy, '#e35a5a'); break;
    case T.FLOWER_Y:   drawFlower(sx, sy, '#f4d24a'); break;
    case T.FLOWER_B:   drawFlower(sx, sy, '#6aa6e0'); break;
    case T.WOOD_WALL:  drawConnectedWall(sx, sy, tx, ty, 'wood'); break;
    case T.STONE_WALL: drawConnectedWall(sx, sy, tx, ty, 'stone'); break;
    case T.FENCE:      drawFence(sx, sy, tx, ty); break;
    case T.DOOR_CLOSED:drawDoor(sx, sy, false); break;
    case T.DOOR_OPEN:  drawDoor(sx, sy, true); break;
    case T.BANNER:     drawBanner(sx, sy); break;
    case T.WORKBENCH:  drawWorkbench(sx, sy); break;
    case T.FORGE:      drawForge(sx, sy); break;
    case T.GARDEN_DRY: drawGarden(sx, sy, 0); break;
    case T.GARDEN_PLANTED: drawGarden(sx, sy, 1); break;
    case T.GARDEN_RIPE:    drawGarden(sx, sy, 2); break;
    case T.BED:        drawBed(sx, sy); break;
    case T.CAMPFIRE:   drawCampfire(sx, sy); break;
    case T.SIGNPOST:   drawSign(sx, sy); break;
    case T.LANTERN:    drawLantern(sx, sy, isNight); break;
  }
}

// ----- Player / enemy sprites ----------
function drawPlayer(sx, sy) {
  const p = state.player;
  const facing = p.facingKey;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 12, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  const blink = (p.iframes > 0 && Math.floor(p.iframes / 80) % 2 === 0);
  if (blink) return;
  const walkBob = Math.sin(p.walkPhase) * 1;
  const yOff = -walkBob;
  // body
  ctx.fillStyle = '#2e7a2e';
  ctx.fillRect(sx - 6, sy - 2 + yOff, 12, 12);
  ctx.fillStyle = '#5a3a1c';
  ctx.fillRect(sx - 6, sy + 6 + yOff, 12, 2);
  // head
  ctx.fillStyle = '#f0c89a';
  ctx.fillRect(sx - 5, sy - 10 + yOff, 10, 8);
  // hat
  ctx.fillStyle = '#2e7a2e';
  if (facing === 'down')      drawHat(sx, sy - 10 + yOff, 0, 1);
  else if (facing === 'up')   drawHat(sx, sy - 10 + yOff, 0, -1);
  else if (facing === 'left') drawHat(sx, sy - 10 + yOff, -1, 0);
  else                        drawHat(sx, sy - 10 + yOff, 1, 0);
  // hair fringe
  ctx.fillStyle = '#d4a060';
  if (facing === 'down')      ctx.fillRect(sx - 4, sy - 4 + yOff, 8, 2);
  else if (facing === 'up')   ctx.fillRect(sx - 4, sy - 10 + yOff, 8, 2);
  if (facing === 'down') {
    ctx.fillStyle = '#1a1a26';
    ctx.fillRect(sx - 3, sy - 6 + yOff, 2, 2);
    ctx.fillRect(sx + 1, sy - 6 + yOff, 2, 2);
  } else if (facing === 'left') {
    ctx.fillStyle = '#1a1a26';
    ctx.fillRect(sx - 4, sy - 6 + yOff, 2, 2);
  } else if (facing === 'right') {
    ctx.fillStyle = '#1a1a26';
    ctx.fillRect(sx + 2, sy - 6 + yOff, 2, 2);
  }
  drawSword(sx, sy + yOff, p);
  // shield
  ctx.fillStyle = '#a04030';
  if (facing === 'down' || facing === 'up') {
    ctx.fillRect(sx + (facing === 'down' ? -10 : 6), sy + 2 + yOff, 4, 6);
  } else {
    ctx.fillRect(sx - 2, sy + (facing === 'left' ? 8 : -6) + yOff, 4, 4);
  }
}
function drawHat(cx, cy, fx, fy) {
  ctx.fillRect(cx - 5, cy - 2, 10, 4);
  if (fy === 1) ctx.fillRect(cx + 2, cy + 2, 5, 4);
  else if (fy === -1) ctx.fillRect(cx - 7, cy - 4, 5, 3);
  else if (fx === 1) ctx.fillRect(cx + 5, cy - 4, 5, 3);
  else ctx.fillRect(cx - 10, cy - 4, 5, 3);
}
function drawSword(cx, cy, p) {
  const swinging = p.swing > 0;
  const arcT = swinging ? (1 - p.swing / 220) : 0;
  ctx.strokeStyle = '#e8e8f0';
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  let bx, by, ex, ey;
  if (p.facingKey === 'down') { bx = cx + 6; by = cy + 4; ex = bx + 2; ey = by + 12; }
  else if (p.facingKey === 'up') { bx = cx - 6; by = cy - 4; ex = bx - 2; ey = by - 12; }
  else if (p.facingKey === 'right') { bx = cx + 8; by = cy + 2; ex = bx + 12; ey = by - 2; }
  else { bx = cx - 8; by = cy + 2; ex = bx - 12; ey = by - 2; }
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = '#f4d24a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(bx - 1, by); ctx.lineTo(bx + 1, by); ctx.stroke();
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
  ctx.fillRect(sx - 10, sy + 6, 3, 4);
  ctx.fillRect(sx + 7, sy + 6, 3, 4);
  ctx.fillStyle = '#fff';
  ctx.fillRect(sx - 4, sy - 3, 3, 3); ctx.fillRect(sx + 1, sy - 3, 3, 3);
  ctx.fillStyle = '#000';
  ctx.fillRect(sx - 3, sy - 2, 1, 1); ctx.fillRect(sx + 2, sy - 2, 1, 1);
  ctx.fillStyle = '#7a1a1a';
  ctx.fillRect(sx - 2, sy + 3, 4, 2);
}
function drawKeese(sx, sy, e) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 8, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  const f = Math.sin(state.time * 0.025) > 0 ? 1 : 0;
  ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#5a2a8a';
  ctx.beginPath(); ctx.ellipse(sx, sy, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx - 5, sy); ctx.lineTo(sx - 12, sy - 6 - f * 2); ctx.lineTo(sx - 12, sy + 2);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx + 5, sy); ctx.lineTo(sx + 12, sy - 6 - f * 2); ctx.lineTo(sx + 12, sy + 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f4d24a';
  ctx.fillRect(sx - 3, sy - 1, 2, 2); ctx.fillRect(sx + 1, sy - 1, 2, 2);
}
function drawWolf(sx, sy, e) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 7, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#3a3a3a';
  ctx.beginPath(); ctx.ellipse(sx, sy + 2, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#5a5a5a';
  ctx.beginPath(); ctx.ellipse(sx - 8, sy - 2, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
  // ears
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.moveTo(sx - 11, sy - 6); ctx.lineTo(sx - 8, sy - 9); ctx.lineTo(sx - 7, sy - 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(sx - 10, sy - 3, 2, 2);
  ctx.fillStyle = '#000';
  ctx.fillRect(sx - 9, sy - 3, 1, 1);
  // tail
  ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#3a3a3a';
  ctx.beginPath(); ctx.ellipse(sx + 12, sy + 1, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
}
function drawStalfosMinion(sx, sy, e) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 10, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#d0d0c0';
  ctx.fillRect(sx - 6, sy - 10, 12, 8);
  ctx.fillRect(sx - 5, sy - 2, 10, 10);
  ctx.fillStyle = '#000';
  ctx.fillRect(sx - 3, sy - 7, 2, 3);
  ctx.fillRect(sx + 1, sy - 7, 2, 3);
  ctx.fillRect(sx - 2, sy - 3, 4, 1);
}
function drawStalfos(sx, sy, e) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 18, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
  // body
  ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#bfbfa8';
  ctx.fillRect(sx - 12, sy - 6, 24, 18);
  // skull
  ctx.fillRect(sx - 10, sy - 22, 20, 16);
  ctx.fillStyle = '#000';
  ctx.fillRect(sx - 6, sy - 16, 4, 5);
  ctx.fillRect(sx + 2, sy - 16, 4, 5);
  ctx.fillRect(sx - 4, sy - 10, 8, 2);
  // sword
  ctx.strokeStyle = '#e8e8f0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(sx + 12, sy - 2); ctx.lineTo(sx + 22, sy - 14); ctx.stroke();
  ctx.fillStyle = '#7a4a1c';
  ctx.fillRect(sx + 10, sy - 2, 3, 6);
  // HP bar
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(sx - 30, sy - 32, 60, 6);
  ctx.fillStyle = '#e04040';
  ctx.fillRect(sx - 30, sy - 32, 60 * (e.hp / e.maxHp), 6);
  ctx.fillStyle = '#fff';
  ctx.font = '10px -apple-system,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('STALFOS', sx, sy - 36);
  ctx.textAlign = 'start';
}

function drawEnemy(sx, sy, e) {
  if (e.kind === 'slime') drawSlime(sx, sy, e);
  else if (e.kind === 'octorok') drawOctorok(sx, sy, e);
  else if (e.kind === 'keese') drawKeese(sx, sy, e);
  else if (e.kind === 'wolf') drawWolf(sx, sy, e);
  else if (e.kind === 'stalfos_minion') drawStalfosMinion(sx, sy, e);
  else if (e.kind === 'stalfos') drawStalfos(sx, sy, e);
}

// =========================================================================
// Sky color + light helpers
// =========================================================================
function dayColors() {
  const t = state.dayTime / DAY_LENGTH;
  // Interpolate between named keypoints (sunrise/day/sunset/night)
  // [time, R, G, B, ambientAlpha (0 = no overlay, 1 = pitch black)]
  const stops = [
    [0.00, 90, 130, 200, 0.45],   // pre-dawn (cool blue)
    [0.10, 240, 170, 130, 0.20],  // dawn pink
    [0.25, 255, 240, 200, 0.0],   // morning
    [0.50, 255, 240, 200, 0.0],   // midday
    [0.62, 230, 130, 80,  0.30],  // dusk
    [0.75, 60, 50, 110, 0.55],    // night
    [0.90, 30, 30, 70, 0.65],     // deep night
    [1.00, 90, 130, 200, 0.45],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      const a = stops[i], b = stops[i + 1];
      const f = (t - a[0]) / (b[0] - a[0]);
      return {
        r: a[1] + (b[1] - a[1]) * f,
        g: a[2] + (b[2] - a[2]) * f,
        b: a[3] + (b[3] - a[3]) * f,
        alpha: a[4] + (b[4] - a[4]) * f,
      };
    }
  }
  return { r:255, g:240, b:200, alpha:0 };
}
function isNight() {
  const t = state.dayTime / DAY_LENGTH;
  return t > NIGHT_PHASE[0] && t < NIGHT_PHASE[1];
}

// =========================================================================
// Render
// =========================================================================
function render() {
  const w = viewW, h = viewH;
  if (!state) {
    ctx.fillStyle = '#0d1a0d';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const p = state.player;
  const camX = p.x - w / 2, camY = p.y - h / 2;

  // Sky color background (replaces black)
  const sky = dayColors();
  ctx.fillStyle = `rgb(${sky.r * 0.3 | 0}, ${sky.g * 0.3 | 0}, ${sky.b * 0.3 | 0})`;
  ctx.fillRect(0, 0, w, h);

  const tx0 = Math.max(0, Math.floor(camX / TILE) - 1);
  const ty0 = Math.max(0, Math.floor(camY / TILE) - 1);
  const tx1 = Math.min(WORLD_W - 1, Math.floor((camX + w) / TILE) + 1);
  const ty1 = Math.min(WORLD_H - 1, Math.floor((camY + h) / TILE) + 1);

  const night = isNight();

  // Pass 1: ground tiles + cliff shadows + damage cracks
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const sx = tx * TILE - camX;
      const sy = ty * TILE - camY + elevYOffset(tx, ty);
      drawGround(tx, ty, sx, sy);
      drawCliffShadow(tx, ty, sx, sy);
    }
  }

  // Pass 2: decor (trees, walls, structures) with elevation offset
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const sx = tx * TILE - camX;
      const sy = ty * TILE - camY + elevYOffset(tx, ty);
      const t = state.map[ty * WORLD_W + tx];
      drawDecor(t, sx, sy, tx, ty, night);
      // damage cracks
      const key = tx + ',' + ty;
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
  }

  // Build-mode ghost preview
  const eq = equippedSlot();
  if (eq && ITEMS[eq.id].place !== undefined) {
    const front = tileInFront(p);
    const tt = tileAt(front.tx, front.ty);
    const ok = (tt === T.GRASS || tt === T.TALL_GRASS || tt === T.FOREST_GRASS ||
                tt === T.SAND || tt === T.DESERT_SAND || tt === T.MTN_GROUND ||
                tt === T.SNOW || tt === T.SWAMP_GRASS || tt === T.DIRT_PATH ||
                tt === T.WOOD_FLOOR || tt === T.STONE_FLOOR || tt === T.RUIN_FLOOR);
    const sx = front.tx * TILE - camX, sy = front.ty * TILE - camY + elevYOffset(front.tx, front.ty);
    ctx.strokeStyle = ok ? 'rgba(247,255,120,0.9)' : 'rgba(255,80,80,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
  }

  // Projectiles
  for (const pr of state.projectiles) {
    const sx = pr.x - camX, sy = pr.y - camY;
    ctx.fillStyle = pr.kind === 'bone' ? '#e0e0d4' : '#3a3a3a';
    ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pr.kind === 'bone' ? '#fff' : '#7a7a7a';
    ctx.beginPath(); ctx.arc(sx - 1, sy - 1, 2, 0, Math.PI * 2); ctx.fill();
  }

  // Enemies
  for (const e of state.enemies) {
    const sx = e.x - camX, sy = e.y - camY;
    if (sx < -48 || sy < -48 || sx > w + 48 || sy > h + 48) continue;
    drawEnemy(sx, sy, e);
    if (!e.boss && e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(sx - 12, sy - 14, 24, 4);
      ctx.fillStyle = '#e04040';
      ctx.fillRect(sx - 12, sy - 14, 24 * (e.hp / e.maxHp), 4);
    }
  }

  // Player
  drawPlayer(p.x - camX, p.y - camY);

  // Drops
  ctx.font = '12px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  for (const d of state.drops) {
    const sx = d.x - camX, sy = d.y - camY;
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.5, d.t / 900)})`;
    const tw = ctx.measureText(d.text).width + 8;
    ctx.fillRect(sx - tw / 2, sy - 14, tw, 14);
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, d.t / 900)})`;
    ctx.fillText(d.text, sx, sy - 3);
  }
  ctx.textAlign = 'start';

  // Day/night overlay (multiply-darken effect)
  if (sky.alpha > 0.01) {
    ctx.fillStyle = `rgba(${Math.min(60, sky.r * 0.2) | 0}, ${Math.min(60, sky.g * 0.2) | 0}, ${Math.min(90, sky.b * 0.4) | 0}, ${sky.alpha})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Lights additive
  ctx.globalCompositeOperation = 'lighter';
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = state.map[ty * WORLD_W + tx];
      const def = TDEF[t]; if (!def) continue;
      const lit = def.light || (night && def.lightAtNight);
      if (lit) {
        const sx = tx * TILE - camX + TILE / 2;
        const sy = ty * TILE - camY + TILE / 2 + elevYOffset(tx, ty);
        const r = lit * TILE * 0.7;
        const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, r);
        g.addColorStop(0, t === T.LANTERN ? 'rgba(255,220,140,0.55)' : 'rgba(255,160,60,0.55)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
    }
  }
  // Player aura at night
  if (night) {
    const sx = p.x - camX, sy = p.y - camY;
    const r = TILE * 2.5;
    const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, r);
    g.addColorStop(0, 'rgba(180,220,255,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  // Weather particles
  for (const pa of state.particles) {
    const sx = pa.x - camX, sy = pa.y - camY;
    if (pa.kind === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(sx, sy, 2, 2);
    } else if (pa.kind === 'rain') {
      ctx.strokeStyle = 'rgba(180,210,240,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 2, sy + 8); ctx.stroke();
    }
  }
}

// =========================================================================
// Main loop
// =========================================================================
function tick(now) {
  const dt = Math.min(40, now - lastTime);
  lastTime = now;
  update(dt);
  render();
  if (state) { renderHearts(); renderStationBadge(); renderBiomeBadge(); }
  requestAnimationFrame(tick);
}

// =========================================================================
// Title / boot
// =========================================================================
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

// Deepvein — top-down mining survival, mobile-first PWA.
(function () {
'use strict';

// ---------- Canvas & DPR ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
let viewW = 0, viewH = 0;

function resize() {
  dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width  = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
  canvas.style.width = viewW + 'px';
  canvas.style.height = viewH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

// ---------- Constants ----------
const TILE = 28;
const WORLD_W = 160, WORLD_H = 160;
const SAVE_KEY = 'deepvein.save.v2';
const ATTACK_COOLDOWN = 320; // ms
const SLIME_DMG_COOLDOWN = 700;
const HUNGER_INTERVAL = 22000; // ms per hunger tick
const STARVE_INTERVAL = 3500;
const SLIME_CAP = 24;
const SLIME_SPAWN_INTERVAL = 2400;

const T_FLOOR = 0, T_DIRT = 1, T_STONE = 2, T_COPPER = 3, T_IRON = 4, T_CRYSTAL = 5, T_MOSS = 6, T_CAMPFIRE = 7;

const TILE_DEF = {
  [T_FLOOR]:    { wall: false, color: '#2a2438' },
  [T_MOSS]:     { wall: false, color: '#2a3a2a' },
  [T_CAMPFIRE]: { wall: false, color: '#2a2438', light: 4.5, placed: true },
  [T_DIRT]:     { wall: true, hp: 2,  tier: 1, color: '#6b4a2b', edge: '#3d2a18', drop: 'dirt' },
  [T_STONE]:    { wall: true, hp: 4,  tier: 1, color: '#5a5a6a', edge: '#34343f', drop: 'stone' },
  [T_COPPER]:   { wall: true, hp: 6,  tier: 2, color: '#b87333', edge: '#5a3416', drop: 'copper' },
  [T_IRON]:     { wall: true, hp: 9,  tier: 2, color: '#c0c8d0', edge: '#666b75', drop: 'iron' },
  [T_CRYSTAL]:  { wall: true, hp: 12, tier: 3, color: '#80e0ff', edge: '#2e6b85', drop: 'crystal', light: 3 },
};

const ITEMS = {
  pickaxe_wood:   { name: 'Wood Pickaxe',   icon: '⛏️', tool: 'pickaxe', tier: 1, power: 1, stack: 1 },
  pickaxe_copper: { name: 'Copper Pickaxe', icon: '⛏️', tool: 'pickaxe', tier: 2, power: 2, stack: 1 },
  pickaxe_iron:   { name: 'Iron Pickaxe',   icon: '⛏️', tool: 'pickaxe', tier: 3, power: 3, stack: 1 },
  sword_wood:     { name: 'Wood Sword',     icon: '🗡️', tool: 'sword',   tier: 1, power: 1, stack: 1 },
  sword_iron:     { name: 'Iron Sword',     icon: '🗡️', tool: 'sword',   tier: 3, power: 3, stack: 1 },
  bread:          { name: 'Bread',          icon: '🥖', food: 22, heal: 16, stack: 99, use: 'eat' },
  campfire:       { name: 'Campfire',       icon: '🔥', stack: 99, place: T_CAMPFIRE },
  dirt:           { name: 'Earth',          icon: '🟫', stack: 99 },
  stone:          { name: 'Stone',          icon: '🪨', stack: 99 },
  copper:         { name: 'Copper',         icon: '🟧', stack: 99 },
  iron:           { name: 'Iron',           icon: '⬜', stack: 99 },
  crystal:        { name: 'Crystal',        icon: '💎', stack: 99 },
  slime:          { name: 'Slime Gel',      icon: '🟢', stack: 99 },
  mushroom:       { name: 'Mushroom',       icon: '🍄', stack: 99 },
};

const RECIPES = [
  { id: 'pickaxe_copper', needs: { copper: 5, stone: 2 } },
  { id: 'pickaxe_iron',   needs: { iron: 5, copper: 2 } },
  { id: 'sword_iron',     needs: { iron: 4, slime: 1 } },
  { id: 'bread',          needs: { mushroom: 3 }, count: 2 },
  { id: 'campfire',       needs: { stone: 5, crystal: 1 } },
];

// ---------- RNG (mulberry32) ----------
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- World generation ----------
function genWorld(seed) {
  const rand = rng(seed);
  const W = WORLD_W, H = WORLD_H;
  const map = new Uint8Array(W * H);

  // Pass 1: initial fill — stone with sparse dirt veins.
  for (let i = 0; i < W * H; i++) map[i] = (rand() < 0.46) ? T_STONE : T_FLOOR;

  // Cellular automaton smoothing (4 passes)
  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 1 : (map[y * W + x] !== T_FLOOR ? 1 : 0);
  for (let pass = 0; pass < 4; pass++) {
    const copy = map.slice();
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (dx || dy) n += get(x + dx, y + dy);
        }
        copy[y * W + x] = (n >= 5) ? T_STONE : T_FLOOR;
      }
    }
    map.set(copy);
  }

  // Frame the world with stone
  for (let x = 0; x < W; x++) { map[x] = T_STONE; map[(H - 1) * W + x] = T_STONE; }
  for (let y = 0; y < H; y++) { map[y * W] = T_STONE; map[y * W + W - 1] = T_STONE; }

  // Dirt halo around floor-wall borders so early mining is easier
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (map[y * W + x] !== T_STONE) continue;
      let nearFloor = false;
      for (let dy = -1; dy <= 1 && !nearFloor; dy++)
        for (let dx = -1; dx <= 1 && !nearFloor; dx++)
          if (map[(y + dy) * W + (x + dx)] === T_FLOOR) nearFloor = true;
      if (nearFloor && rand() < 0.55) map[y * W + x] = T_DIRT;
    }
  }

  // Ore blobs
  function blob(cx, cy, tile, size) {
    for (let i = 0; i < size; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * Math.sqrt(size) * 1.2;
      const x = Math.round(cx + Math.cos(a) * r);
      const y = Math.round(cy + Math.sin(a) * r);
      if (x <= 1 || y <= 1 || x >= W - 2 || y >= H - 2) continue;
      const t = map[y * W + x];
      if (t === T_STONE || t === T_DIRT) map[y * W + x] = tile;
    }
  }
  const cx0 = (W / 2) | 0, cy0 = (H / 2) | 0;
  const dist2 = (x, y) => (x - cx0) * (x - cx0) + (y - cy0) * (y - cy0);
  for (let i = 0; i < 90; i++) {
    const x = (rand() * W) | 0, y = (rand() * H) | 0;
    const d = Math.sqrt(dist2(x, y));
    if (d < 8) continue;
    const roll = rand();
    if (d < 30) blob(x, y, T_COPPER, 6 + (rand() * 6) | 0);
    else if (d < 55) {
      if (roll < 0.5) blob(x, y, T_COPPER, 4 + (rand() * 6) | 0);
      else blob(x, y, T_IRON, 5 + (rand() * 6) | 0);
    } else {
      if (roll < 0.2) blob(x, y, T_CRYSTAL, 3 + (rand() * 4) | 0);
      else if (roll < 0.6) blob(x, y, T_IRON, 5 + (rand() * 8) | 0);
      else blob(x, y, T_COPPER, 4 + (rand() * 5) | 0);
    }
  }

  // Carve spawn room
  const room = 5;
  for (let y = cy0 - room; y <= cy0 + room; y++)
    for (let x = cx0 - room; x <= cx0 + room; x++)
      map[y * W + x] = (Math.abs(x - cx0) === room || Math.abs(y - cy0) === room) ? T_MOSS : T_FLOOR;
  // A welcoming patch of moss in the center
  for (let y = cy0 - 1; y <= cy0 + 1; y++)
    for (let x = cx0 - 1; x <= cx0 + 1; x++)
      map[y * W + x] = T_MOSS;

  // Mushrooms scattered on floor tiles
  const mushrooms = [];
  for (let i = 0; i < 220; i++) {
    const x = (rand() * W) | 0, y = (rand() * H) | 0;
    if (map[y * W + x] === T_FLOOR || map[y * W + x] === T_MOSS) {
      if (Math.sqrt(dist2(x, y)) > 4) mushrooms.push([x, y]);
    }
  }

  return { map, mushrooms, spawn: { x: cx0, y: cy0 } };
}

// ---------- State ----------
let state = null;
let damageMap = new Map(); // key "x,y" -> remaining hp (transient damage state)
let mushroomSet = new Set();

function newGame() {
  const seed = (Math.random() * 0x7fffffff) | 0;
  const w = genWorld(seed);
  mushroomSet = new Set(w.mushrooms.map(([x, y]) => x + ',' + y));
  state = {
    seed,
    map: Array.from(w.map),
    spawn: w.spawn,
    mushrooms: w.mushrooms.slice(),
    player: {
      x: (w.spawn.x + 0.5) * TILE,
      y: (w.spawn.y + 0.5) * TILE,
      hp: 100, maxHp: 100,
      hunger: 100, maxHunger: 100,
      facing: { x: 0, y: 1 },
      iframes: 0,
    },
    inv: {
      slots: [
        { id: 'pickaxe_wood', n: 1 },
        { id: 'sword_wood', n: 1 },
        null, null, null, null, null, null,
      ],
      store: {}, // resources: id -> count
      hotbar: 0,
    },
    slimes: [],
    time: 0,
    nextHunger: HUNGER_INTERVAL,
    nextStarve: STARVE_INTERVAL,
    nextSlime: SLIME_SPAWN_INTERVAL,
    placedLights: [], // {x,y}
  };
  // Spawn a handful of slimes outside the spawn room
  spawnInitialSlimes(8);
  save();
}

function spawnInitialSlimes(n) {
  let tries = 0;
  while (state.slimes.length < n && tries < 400) {
    tries++;
    const tx = (Math.random() * WORLD_W) | 0;
    const ty = (Math.random() * WORLD_H) | 0;
    const t = state.map[ty * WORLD_W + tx];
    if (t !== T_FLOOR && t !== T_MOSS) continue;
    const dx = tx - state.spawn.x, dy = ty - state.spawn.y;
    if (dx * dx + dy * dy < 144) continue;
    state.slimes.push({
      x: (tx + 0.5) * TILE,
      y: (ty + 0.5) * TILE,
      hp: 6, maxHp: 6,
      vx: 0, vy: 0,
      think: 0,
      hitCd: 0,
    });
  }
}

// ---------- Save / load ----------
function save() {
  try {
    const compact = {
      v: 2,
      seed: state.seed,
      map: btoa(String.fromCharCode.apply(null, state.map)),
      spawn: state.spawn,
      mushrooms: state.mushrooms,
      player: state.player,
      inv: state.inv,
      slimes: state.slimes,
      time: state.time,
      nextHunger: state.nextHunger,
      nextStarve: state.nextStarve,
      placedLights: state.placedLights,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(compact));
  } catch (e) { /* quota or private mode */ }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (s.v !== 2) return false;
    const bin = atob(s.map);
    const map = new Array(bin.length);
    for (let i = 0; i < bin.length; i++) map[i] = bin.charCodeAt(i);
    state = {
      seed: s.seed, map, spawn: s.spawn, mushrooms: s.mushrooms,
      player: s.player, inv: s.inv, slimes: s.slimes,
      time: s.time, nextHunger: s.nextHunger, nextStarve: s.nextStarve,
      nextSlime: SLIME_SPAWN_INTERVAL, placedLights: s.placedLights || [],
    };
    mushroomSet = new Set(state.mushrooms.map(p => p[0] + ',' + p[1]));
    damageMap = new Map();
    return true;
  } catch (e) { return false; }
}

function wipe() {
  localStorage.removeItem(SAVE_KEY);
}

// ---------- Inventory helpers ----------
function invAdd(id, n) {
  n = n || 1;
  const def = ITEMS[id]; if (!def) return;
  if (def.stack > 1 || def.food || def.place) {
    // stackable into store
    state.inv.store[id] = (state.inv.store[id] || 0) + n;
  } else {
    // place into first empty slot
    for (let i = 0; i < state.inv.slots.length; i++) {
      if (!state.inv.slots[i]) { state.inv.slots[i] = { id, n: 1 }; return; }
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
  return n - need;
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
function equippedSlot() {
  return state.inv.slots[state.inv.hotbar] || null;
}

// ---------- Tiles / collision ----------
function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return T_STONE;
  return state.map[ty * WORLD_W + tx];
}
function setTile(tx, ty, v) { state.map[ty * WORLD_W + tx] = v; }
function isWallTile(t) { return TILE_DEF[t] && TILE_DEF[t].wall; }

function tryMove(ent, dx, dy, r) {
  // Slide collision with wall tiles. r = entity radius.
  // X
  const nx = ent.x + dx;
  if (!wallHit(nx, ent.y, r)) ent.x = nx;
  const ny = ent.y + dy;
  if (!wallHit(ent.x, ny, r)) ent.y = ny;
}
function wallHit(x, y, r) {
  const minTX = Math.floor((x - r) / TILE);
  const maxTX = Math.floor((x + r) / TILE);
  const minTY = Math.floor((y - r) / TILE);
  const maxTY = Math.floor((y + r) / TILE);
  for (let ty = minTY; ty <= maxTY; ty++) {
    for (let tx = minTX; tx <= maxTX; tx++) {
      if (isWallTile(tileAt(tx, ty))) return true;
    }
  }
  return false;
}

// ---------- Input ----------
const joyBase = document.getElementById('joyBase');
const joyStick = document.getElementById('joyStick');
const joyContainer = document.getElementById('joy');
const btnA = document.getElementById('btnA');
const btnB = document.getElementById('btnB');
let joyRadius = 50;
let joyCenter = { x: 0, y: 0 };
let joyPointer = null;
let attackPointer = null;
let usePointer = null;
let inputVec = { x: 0, y: 0 };
let attackHeld = false;
let useHeld = false;

function setJoyCenter() {
  const r = joyBase.getBoundingClientRect();
  joyRadius = r.width / 2 - 12;
  joyCenter.x = r.left + r.width / 2;
  joyCenter.y = r.top + r.height / 2;
}
window.addEventListener('resize', setJoyCenter);
setTimeout(setJoyCenter, 0);

function onJoyDown(e) {
  if (joyPointer !== null) return;
  joyPointer = e.pointerId;
  setJoyCenter();
  joyContainer.setPointerCapture(e.pointerId);
  updateJoy(e);
  e.preventDefault();
}
function updateJoy(e) {
  if (e.pointerId !== joyPointer) return;
  const dx = e.clientX - joyCenter.x;
  const dy = e.clientY - joyCenter.y;
  const d = Math.hypot(dx, dy);
  const max = joyRadius;
  const cd = Math.min(d, max);
  const ux = d ? dx / d : 0, uy = d ? dy / d : 0;
  inputVec.x = (cd / max) * ux;
  inputVec.y = (cd / max) * uy;
  const dead = 0.18;
  if (Math.hypot(inputVec.x, inputVec.y) < dead) { inputVec.x = 0; inputVec.y = 0; }
  joyStick.style.transform = `translate(${ux * cd}px, ${uy * cd}px)`;
}
function endJoy(e) {
  if (e.pointerId !== joyPointer) return;
  joyPointer = null;
  inputVec.x = 0; inputVec.y = 0;
  joyStick.style.transform = '';
}
joyContainer.addEventListener('pointerdown', onJoyDown);
joyContainer.addEventListener('pointermove', updateJoy);
joyContainer.addEventListener('pointerup', endJoy);
joyContainer.addEventListener('pointercancel', endJoy);

btnA.addEventListener('pointerdown', e => { attackHeld = true; attackPointer = e.pointerId; btnA.setPointerCapture(e.pointerId); e.preventDefault(); });
btnA.addEventListener('pointerup',   e => { attackHeld = false; attackPointer = null; });
btnA.addEventListener('pointercancel', () => { attackHeld = false; attackPointer = null; });
btnB.addEventListener('pointerdown', e => { useHeld = true; usePointer = e.pointerId; btnB.setPointerCapture(e.pointerId); useEquipped(); e.preventDefault(); });
btnB.addEventListener('pointerup',   () => { useHeld = false; usePointer = null; });
btnB.addEventListener('pointercancel', () => { useHeld = false; usePointer = null; });

// Keyboard fallback for desktop testing
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') attackHeld = true;
  if (e.key.toLowerCase() === 'e') useEquipped();
  if (e.key >= '1' && e.key <= '8') state.inv.hotbar = parseInt(e.key, 10) - 1;
});
window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
  if (e.key === ' ') attackHeld = false;
});

function readInput() {
  // Joystick takes priority on touch; otherwise WASD/arrows.
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

// ---------- HUD ----------
const hpFill = document.getElementById('hpFill');
const huFill = document.getElementById('huFill');
const hpLabel = document.getElementById('hpLabel');
const huLabel = document.getElementById('huLabel');
const hotbarEl = document.getElementById('hotbar');
const toastEl = document.getElementById('toast');

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  toastTimer = 1600;
}
let toastTimer = 0;

function renderHotbar() {
  hotbarEl.innerHTML = '';
  for (let i = 0; i < state.inv.slots.length; i++) {
    const s = state.inv.slots[i];
    const el = document.createElement('div');
    el.className = 'slot' + (i === state.inv.hotbar ? ' active' : '');
    el.dataset.idx = i;
    if (s) {
      const d = ITEMS[s.id];
      el.textContent = d.icon;
      if (s.n > 1) {
        const c = document.createElement('div');
        c.className = 'count'; c.textContent = s.n; el.appendChild(c);
      }
    } else {
      el.textContent = '';
    }
    el.addEventListener('pointerdown', () => { state.inv.hotbar = i; renderHotbar(); });
    hotbarEl.appendChild(el);
  }
}

function renderStats() {
  const p = state.player;
  hpFill.style.transform = `scaleX(${Math.max(0, p.hp / p.maxHp)})`;
  huFill.style.transform = `scaleX(${Math.max(0, p.hunger / p.maxHunger)})`;
  hpLabel.textContent = `HP ${Math.ceil(p.hp)}/${p.maxHp}`;
  huLabel.textContent = `Hunger ${Math.ceil(p.hunger)}`;
}

// ---------- Modal (inventory / craft / menu) ----------
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('btnBag').addEventListener('click', () => openInventory());
document.getElementById('btnCraft').addEventListener('click', () => openCraft());
document.getElementById('btnMenu').addEventListener('click', () => openMenu());

function openModal() { modal.classList.remove('hidden'); paused = true; }
function closeModal() { modal.classList.add('hidden'); paused = false; lastTime = performance.now(); }

function openInventory() {
  modalTitle.textContent = 'Inventory';
  modalBody.innerHTML = '';
  // Render equipped slots + stored resources combined into one 4xN grid.
  const all = [];
  for (let i = 0; i < state.inv.slots.length; i++) {
    const s = state.inv.slots[i];
    if (s) all.push({ id: s.id, n: s.n, idx: i, equippable: true });
  }
  for (const id in state.inv.store) {
    if (state.inv.store[id] > 0) all.push({ id, n: state.inv.store[id] });
  }
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (let i = 0; i < Math.max(16, all.length); i++) {
    const it = all[i];
    const slot = document.createElement('div');
    slot.className = 'invslot' + (it ? '' : ' empty');
    if (it) {
      const d = ITEMS[it.id];
      slot.textContent = d.icon;
      const c = document.createElement('div'); c.className = 'count'; c.textContent = it.n; slot.appendChild(c);
      slot.title = d.name;
      slot.addEventListener('click', () => {
        if (it.equippable) { state.inv.hotbar = it.idx; renderHotbar(); closeModal(); }
        else if (d.food || d.place) { equipResource(it.id); closeModal(); }
      });
    }
    grid.appendChild(slot);
  }
  modalBody.appendChild(grid);
  const help = document.createElement('p');
  help.style.cssText = 'color:var(--muted);font-size:12px;margin-top:12px';
  help.textContent = 'Tap an item to equip in the active hotbar slot. Use ✱ to consume/place equipped consumables.';
  modalBody.appendChild(help);
  openModal();
}

function equipResource(id) {
  // Move a consumable/placeable from store into the current hotbar slot.
  const have = state.inv.store[id] || 0;
  if (have <= 0) return;
  const idx = state.inv.hotbar;
  const cur = state.inv.slots[idx];
  if (cur) {
    const d = ITEMS[cur.id];
    if (d && (d.food || d.place !== undefined || d.stack > 1)) {
      state.inv.store[cur.id] = (state.inv.store[cur.id] || 0) + cur.n;
    } else {
      // Tool — relocate to first empty slot rather than dumping into store.
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
  for (const r of RECIPES) {
    const def = ITEMS[r.id];
    const row = document.createElement('div'); row.className = 'recipe';
    const ic = document.createElement('div'); ic.className = 'icon'; ic.textContent = def.icon;
    const info = document.createElement('div'); info.className = 'info';
    const name = document.createElement('div'); name.className = 'name';
    name.textContent = def.name + (r.count > 1 ? ` ×${r.count}` : '');
    const cost = document.createElement('div'); cost.className = 'cost';
    cost.textContent = Object.entries(r.needs).map(([k, v]) => `${ITEMS[k].icon} ${v}`).join('  ');
    info.appendChild(name); info.appendChild(cost);
    const btn = document.createElement('button'); btn.textContent = 'Craft';
    const can = Object.entries(r.needs).every(([k, v]) => invCount(k) >= v);
    btn.disabled = !can;
    btn.addEventListener('click', () => {
      if (!Object.entries(r.needs).every(([k, v]) => invCount(k) >= v)) return;
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
      showToast('New world generated');
    }
  });
  openModal();
}

// ---------- Use item ----------
function useEquipped() {
  const s = equippedSlot();
  if (!s) return;
  const d = ITEMS[s.id];
  if (d.food) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + d.heal);
    state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + d.food);
    consumeFromHotbar(state.inv.hotbar, 1);
    showToast('Ate ' + d.name);
    renderHotbar(); renderStats();
  } else if (d.place !== undefined) {
    // Place in front of player
    const fx = state.player.x + state.player.facing.x * TILE * 0.9;
    const fy = state.player.y + state.player.facing.y * TILE * 0.9;
    const tx = Math.floor(fx / TILE), ty = Math.floor(fy / TILE);
    const t = tileAt(tx, ty);
    if (t === T_FLOOR || t === T_MOSS) {
      setTile(tx, ty, d.place);
      state.placedLights.push({ x: tx, y: ty });
      consumeFromHotbar(state.inv.hotbar, 1);
      showToast('Placed ' + d.name);
      renderHotbar();
    } else {
      showToast('Cannot place there');
    }
  }
}
function consumeFromHotbar(idx, n) {
  const s = state.inv.slots[idx]; if (!s) return;
  s.n -= n;
  if (s.n <= 0) state.inv.slots[idx] = null;
}

// ---------- Combat / mining ----------
let attackCd = 0;
function doAttack() {
  if (attackCd > 0) return;
  attackCd = ATTACK_COOLDOWN;
  const p = state.player;
  // Reach tile in front
  const fx = p.x + p.facing.x * TILE * 0.85;
  const fy = p.y + p.facing.y * TILE * 0.85;

  // Slime in melee range first
  let hit = null, bestD = 9999;
  for (const sl of state.slimes) {
    const dx = sl.x - fx, dy = sl.y - fy;
    const d = Math.hypot(dx, dy);
    if (d < TILE * 0.8 && d < bestD) { bestD = d; hit = sl; }
  }
  if (hit) {
    const swordId = bestTool('sword');
    const power = swordId ? ITEMS[swordId].power : 1;
    hit.hp -= 2 + power * 2;
    // knockback
    const kx = hit.x - p.x, ky = hit.y - p.y; const l = Math.hypot(kx, ky) || 1;
    hit.vx += (kx / l) * 4; hit.vy += (ky / l) * 4;
    if (hit.hp <= 0) {
      invAdd('slime', 1 + ((Math.random() * 2) | 0));
      state.slimes.splice(state.slimes.indexOf(hit), 1);
    }
    return;
  }

  // Otherwise try mining the tile in facing direction
  const tx = Math.floor(fx / TILE), ty = Math.floor(fy / TILE);
  const t = tileAt(tx, ty);
  if (isWallTile(t)) {
    const def = TILE_DEF[t];
    const pickId = bestTool('pickaxe');
    const pickTier = pickId ? ITEMS[pickId].tier : 0;
    if (pickTier < def.tier) {
      showToast(`Need tier ${def.tier} pickaxe`);
      return;
    }
    const key = tx + ',' + ty;
    const power = pickId ? ITEMS[pickId].power : 1;
    let hp = damageMap.has(key) ? damageMap.get(key) : def.hp;
    hp -= power;
    if (hp <= 0) {
      damageMap.delete(key);
      setTile(tx, ty, T_FLOOR);
      invAdd(def.drop, 1);
      // small chance bonus
      if (Math.random() < 0.12) invAdd(def.drop, 1);
    } else {
      damageMap.set(key, hp);
    }
  }
}

// ---------- Slime AI ----------
function updateSlimes(dt) {
  // spawn
  state.nextSlime -= dt;
  if (state.nextSlime <= 0 && state.slimes.length < SLIME_CAP) {
    state.nextSlime = SLIME_SPAWN_INTERVAL;
    // find a floor tile off-screen but within reasonable distance
    const px = state.player.x, py = state.player.y;
    for (let tries = 0; tries < 30; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 220 + Math.random() * 260;
      const wx = px + Math.cos(ang) * dist, wy = py + Math.sin(ang) * dist;
      const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
      const t = tileAt(tx, ty);
      if (t === T_FLOOR || t === T_MOSS) {
        state.slimes.push({
          x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE,
          hp: 6, maxHp: 6, vx: 0, vy: 0, think: 0, hitCd: 0,
        });
        break;
      }
    }
  }
  const p = state.player;
  for (const sl of state.slimes) {
    sl.think -= dt;
    if (sl.think <= 0) {
      sl.think = 700 + Math.random() * 800;
      const dx = p.x - sl.x, dy = p.y - sl.y;
      const d = Math.hypot(dx, dy);
      if (d < 280) {
        sl.vx = (dx / (d || 1)) * 1.2;
        sl.vy = (dy / (d || 1)) * 1.2;
      } else {
        const a = Math.random() * Math.PI * 2;
        sl.vx = Math.cos(a) * 0.6; sl.vy = Math.sin(a) * 0.6;
      }
    }
    sl.hitCd = Math.max(0, sl.hitCd - dt);
    const step = dt / 16.67;
    tryMove(sl, sl.vx * step, sl.vy * step, 10);

    // Damage player on contact
    const ddx = sl.x - p.x, ddy = sl.y - p.y;
    if (Math.hypot(ddx, ddy) < 22 && p.iframes <= 0) {
      p.hp -= 6;
      p.iframes = SLIME_DMG_COOLDOWN;
      // knockback player
      const l = Math.hypot(ddx, ddy) || 1;
      p.x -= (ddx / l) * 8; p.y -= (ddy / l) * 8;
      if (p.hp <= 0) {
        respawn();
        return;
      }
    }
  }
}

function respawn() {
  showToast('You faint and wake at the campfire…');
  const p = state.player;
  p.x = (state.spawn.x + 0.5) * TILE;
  p.y = (state.spawn.y + 0.5) * TILE;
  p.hp = p.maxHp;
  p.hunger = Math.max(40, p.hunger);
  p.iframes = 1500;
}

// ---------- Update ----------
let lastTime = 0;
let paused = true;

function update(dt) {
  if (paused) return;
  state.time += dt;
  attackCd = Math.max(0, attackCd - dt);

  const p = state.player;
  p.iframes = Math.max(0, p.iframes - dt);

  // Movement
  const inp = readInput();
  const speed = 2.4;
  if (inp.x !== 0 || inp.y !== 0) {
    p.facing.x = inp.x;
    p.facing.y = inp.y;
    const l = Math.hypot(p.facing.x, p.facing.y) || 1;
    p.facing.x /= l; p.facing.y /= l;
  }
  const step = dt / 16.67;
  tryMove(p, inp.x * speed * step, inp.y * speed * step, 11);

  // Mushroom pickup
  const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
  const key = tx + ',' + ty;
  if (mushroomSet.has(key)) {
    mushroomSet.delete(key);
    state.mushrooms = state.mushrooms.filter(([x, y]) => !(x === tx && y === ty));
    invAdd('mushroom', 1);
    showToast('+1 Mushroom');
  }

  // Attack hold
  if (attackHeld) doAttack();

  updateSlimes(dt);

  // Hunger / starve
  state.nextHunger -= dt;
  if (state.nextHunger <= 0) {
    state.nextHunger = HUNGER_INTERVAL;
    p.hunger = Math.max(0, p.hunger - 4);
  }
  if (p.hunger <= 0) {
    state.nextStarve -= dt;
    if (state.nextStarve <= 0) {
      state.nextStarve = STARVE_INTERVAL;
      p.hp = Math.max(0, p.hp - 3);
      if (p.hp <= 0) respawn();
    }
  } else if (p.hunger > 60) {
    // slow regen if well-fed
    p.hp = Math.min(p.maxHp, p.hp + dt * 0.0015);
  }

  // Toast fade
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toastEl.classList.remove('show');
  }
}

// ---------- Rendering ----------
function render() {
  const w = viewW, h = viewH;
  // Camera follows player
  const p = state ? state.player : null;
  if (!p) { ctx.fillStyle = '#06060a'; ctx.fillRect(0, 0, w, h); return; }
  const camX = p.x - w / 2, camY = p.y - h / 2;

  // Background
  ctx.fillStyle = '#06060a';
  ctx.fillRect(0, 0, w, h);

  // Tiles in view
  const tx0 = Math.max(0, Math.floor(camX / TILE) - 1);
  const ty0 = Math.max(0, Math.floor(camY / TILE) - 1);
  const tx1 = Math.min(WORLD_W - 1, Math.floor((camX + w) / TILE) + 1);
  const ty1 = Math.min(WORLD_H - 1, Math.floor((camY + h) / TILE) + 1);

  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = state.map[ty * WORLD_W + tx];
      const def = TILE_DEF[t];
      const sx = tx * TILE - camX, sy = ty * TILE - camY;
      if (def.wall) {
        ctx.fillStyle = def.edge || '#222';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = def.color;
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        // ore sparkles
        if (t === T_COPPER || t === T_IRON || t === T_CRYSTAL) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillRect(sx + 6, sy + 6, 2, 2);
          ctx.fillRect(sx + TILE - 10, sy + TILE - 10, 2, 2);
        }
        // damage cracks
        const key = tx + ',' + ty;
        if (damageMap.has(key)) {
          const hpLeft = damageMap.get(key);
          const pct = 1 - hpLeft / def.hp;
          ctx.fillStyle = 'rgba(0,0,0,' + (0.3 * pct + 0.1) + ')';
          ctx.fillRect(sx + 5, sy + (TILE - 5) * pct + 4, TILE - 10, 2);
          ctx.fillRect(sx + (TILE - 5) * pct + 4, sy + 5, 2, TILE - 10);
        }
      } else {
        ctx.fillStyle = def.color;
        ctx.fillRect(sx, sy, TILE, TILE);
        // moss details
        if (t === T_MOSS) {
          ctx.fillStyle = 'rgba(110,170,90,0.25)';
          ctx.fillRect(sx + 4, sy + 6, 4, 2);
          ctx.fillRect(sx + 18, sy + 16, 4, 2);
        }
        if (t === T_CAMPFIRE) {
          ctx.fillStyle = '#3a2a1a';
          ctx.fillRect(sx + 6, sy + TILE - 8, TILE - 12, 4);
          const flick = 0.6 + 0.4 * Math.sin(state.time * 0.012 + tx * 1.3 + ty);
          ctx.fillStyle = `rgba(255,${140 + flick * 40 | 0},40,0.95)`;
          ctx.beginPath();
          ctx.moveTo(sx + TILE / 2, sy + 6);
          ctx.lineTo(sx + TILE - 8, sy + TILE - 6);
          ctx.lineTo(sx + 8, sy + TILE - 6);
          ctx.closePath(); ctx.fill();
        }
      }
    }
  }

  // Mushrooms
  for (const [mx, my] of state.mushrooms) {
    if (mx < tx0 || mx > tx1 || my < ty0 || my > ty1) continue;
    const sx = mx * TILE - camX + TILE / 2, sy = my * TILE - camY + TILE / 2;
    ctx.fillStyle = '#d04040';
    ctx.beginPath(); ctx.arc(sx, sy - 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4eee0';
    ctx.fillRect(sx - 2, sy + 1, 4, 3);
  }

  // Slimes
  for (const sl of state.slimes) {
    const sx = sl.x - camX, sy = sl.y - camY;
    if (sx < -20 || sy < -20 || sx > w + 20 || sy > h + 20) continue;
    ctx.fillStyle = '#3aa847';
    ctx.beginPath(); ctx.ellipse(sx, sy + 3, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5ec06a';
    ctx.beginPath(); ctx.ellipse(sx, sy, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(sx - 4, sy - 2, 2, 2);
    ctx.fillRect(sx + 2, sy - 2, 2, 2);
    // hp bar if damaged
    if (sl.hp < sl.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(sx - 12, sy - 14, 24, 4);
      ctx.fillStyle = '#e04040';
      ctx.fillRect(sx - 12, sy - 14, 24 * (sl.hp / sl.maxHp), 4);
    }
  }

  // Player
  const psx = p.x - camX, psy = p.y - camY;
  if (Math.floor(p.iframes / 100) % 2 === 0) {
    ctx.fillStyle = '#1a1a26';
    ctx.beginPath(); ctx.arc(psx, psy + 3, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7c948';
    ctx.beginPath(); ctx.arc(psx, psy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a26';
    ctx.beginPath(); ctx.arc(psx + p.facing.x * 5, psy + p.facing.y * 5 - 2, 2, 0, Math.PI * 2); ctx.fill();
    // tool hint
    const swordId = bestTool('sword');
    const pickId = bestTool('pickaxe');
    ctx.strokeStyle = swordId ? '#e8e8f0' : '#aaa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(psx + p.facing.x * 10, psy + p.facing.y * 10);
    ctx.lineTo(psx + p.facing.x * 18, psy + p.facing.y * 18);
    ctx.stroke();
  }

  // Lighting overlay: dark vignette dampened near lights (player + crystals + campfires).
  const grad = ctx.createRadialGradient(w / 2, h / 2, TILE * 1.5, w / 2, h / 2, Math.min(w, h) * 0.85);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Bright spots: crystals & campfires within view
  ctx.globalCompositeOperation = 'lighter';
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = state.map[ty * WORLD_W + tx];
      if (t === T_CRYSTAL || t === T_CAMPFIRE) {
        const sx = tx * TILE - camX + TILE / 2, sy = ty * TILE - camY + TILE / 2;
        const r = t === T_CAMPFIRE ? TILE * 4.5 : TILE * 2.4;
        const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, r);
        const col = t === T_CAMPFIRE ? 'rgba(255,160,60,0.55)' : 'rgba(120,220,255,0.45)';
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------- Loop ----------
function tick(now) {
  const dt = Math.min(40, now - lastTime);
  lastTime = now;
  update(dt);
  render();
  // hud refresh
  if (state) renderStats();
  requestAnimationFrame(tick);
}

// ---------- Title / boot ----------
const titleScreen = document.getElementById('title');
const btnPlay = document.getElementById('btnPlay');
const btnWipe = document.getElementById('btnWipe');
function showTitle() { titleScreen.classList.remove('hidden'); paused = true; }
function hideTitle() { titleScreen.classList.add('hidden'); paused = false; lastTime = performance.now(); }
btnPlay.addEventListener('click', () => {
  if (!state) {
    if (!load()) newGame();
  }
  renderHotbar(); hideTitle();
});
btnWipe.addEventListener('click', () => {
  if (confirm('Wipe save? You will start a new world.')) { wipe(); state = null; showToast('Save wiped'); }
});

// Auto-save periodically
setInterval(() => { if (state && !paused) save(); }, 8000);

// Pause on background
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { paused = true; if (state) save(); }
});

// Boot
showTitle();
requestAnimationFrame(tick);
})();

// World Cup Manager — soccer/football management with D&D dice-roll match sim.
// Standalone module: window.Soccer = { start, stop, wipe }
window.Soccer = (function () {
'use strict';

// =========================================================================
// Data
// =========================================================================
// Data comes from window.WC2026 (defined in wc2026.js).
const TEAMS   = (window.WC2026 && window.WC2026.TEAMS)   || [];
const ROSTERS = (window.WC2026 && window.WC2026.ROSTERS) || {};
const GROUP_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

const FORMATIONS = ['4-3-3','4-4-2','4-2-3-1','3-5-2'];
const STYLES = {
  press:     { name:'High Press',    events:11, atkMod:+1, defMod:-1, riskMod:+1, fatigue:1.4 },
  balanced:  { name:'Balanced',      events:9,  atkMod:0,  defMod:0,  riskMod:0,  fatigue:1.0 },
  counter:   { name:'Counter',       events:7,  atkMod:+2, defMod:0,  riskMod:-1, fatigue:0.9 },
  defensive: { name:'Park the Bus',  events:6,  atkMod:-1, defMod:+2, riskMod:-2, fatigue:0.7 },
};
const STYLE_DESC = {
  press:     'Aggressive press, more chances, more fatigue.',
  balanced:  'Even tempo. Reliable.',
  counter:   'Sit deep, strike fast. High-value chances.',
  defensive: 'Park the bus. Trade chances for safety.',
};

const CLASS_BY_POS = {
  GK:'Cleric', CB:'Paladin', RB:'Ranger', LB:'Ranger',
  CDM:'Fighter', CM:'Bard', CAM:'Sorcerer',
  RW:'Rogue', LW:'Rogue', RM:'Rogue', LM:'Rogue',
  ST:'Barbarian',
};
const CLASS_FLAVOR = {
  Cleric:'channels divine reflexes',
  Paladin:'stands like an oath',
  Ranger:'covers ground like a hunter',
  Fighter:'wins the duel by sheer attrition',
  Bard:'weaves a passing rhythm',
  Sorcerer:'wills the impossible into being',
  Rogue:'finds the seam at the back',
  Barbarian:'goes berserk in the box',
};

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
function rint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function chance(p) { return Math.random() < p; }
function hashCode(s) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i); return h | 0; }

// =========================================================================
// State + save
// =========================================================================
let state = null;
let container = null;
let onExit = null;
const SAVE_KEY = 'wcmgr.save.v2';

function save() { if (!state) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e){} }
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
    state = JSON.parse(raw); return state && state.v === 2;
  } catch (e) { return false; }
}
function wipe() { localStorage.removeItem(SAVE_KEY); state = null; }

// =========================================================================
// Roster generation
// =========================================================================
function generateRoster(teamCode, seed) {
  // Use the hand-authored 2026 roster from wc2026.js.
  const entries = ROSTERS[teamCode] || [];
  const players = [];
  let id = 0;
  for (const e of entries) {
    const [name, pos, age, rating] = e;
    players.push({
      id: id++, name, pos, age, rating,
      cls: CLASS_BY_POS[pos] || 'Bard',
      fit: 100, inj: 0, sus: 0,
      star: rating >= 85,
    });
  }
  // If somehow no roster (smaller nation we missed), fill with placeholders.
  if (players.length === 0) {
    const team = TEAMS.find(t => t.code === teamCode);
    const baseR = team ? team.rating : 75;
    const slots = ['GK','GK','GK','CB','CB','CB','CB','RB','RB','LB','LB','CDM','CDM','CM','CM','CM','CAM','CAM','RW','LW','LW','ST','ST'];
    let i = 1;
    for (const pos of slots) {
      players.push({
        id: id++, name: teamCode + ' Player ' + i++, pos, age: 26,
        rating: Math.max(65, baseR - 5),
        cls: CLASS_BY_POS[pos] || 'Bard',
        fit: 100, inj: 0, sus: 0, star: false,
      });
    }
  }
  return players;
}

// =========================================================================
// Campaign
// =========================================================================
function newCampaign(yourCode) {
  const seed = (Math.random() * 0x7fffffff) | 0;
  const rosters = {};
  for (const t of TEAMS) rosters[t.code] = generateRoster(t.code, seed);
  const groups = {};
  for (const g of GROUP_LETTERS) {
    const teams = TEAMS.filter(t => t.group === g).map(t => t.code);
    groups[g] = {
      teams,
      results: [],
      standings: teams.map(c => ({ code:c, pts:0, gf:0, ga:0, gd:0, p:0 })),
    };
  }
  state = {
    v: 2, seed,
    yourTeam: yourCode,
    rosters,
    groups,
    knockout: { r32:[], r16:[], qf:[], sf:[], final:null },
    stage: 'group_1',
    formation: '4-3-3',
    style: 'balanced',
    morale: 0,                          // -20..+20 — affects own team's atk rolls
    goalsLog: [],                       // [{player, team, minute, stage}]
    pendingPress: null,                 // press conference shown before next match
    log: ['Campaign begins. Group ' + TEAMS.find(t=>t.code===yourCode).group + ' awaits.'],
    eliminated: false,
    champion: false,
  };
  save();
}

function groupFixtures(group, teams) {
  const [a, b, c, d] = teams;
  return [
    [{home:a, away:b, group, matchday:1}, {home:c, away:d, group, matchday:1}],
    [{home:a, away:c, group, matchday:2}, {home:d, away:b, group, matchday:2}],
    [{home:d, away:a, group, matchday:3}, {home:b, away:c, group, matchday:3}],
  ];
}

function getNextOpponent() {
  if (!state) return null;
  const yt = state.yourTeam;
  const stage = state.stage;
  if (stage.startsWith('group_')) {
    const md = parseInt(stage.split('_')[1]);
    const group = TEAMS.find(t => t.code === yt).group;
    const fixtures = groupFixtures(group, state.groups[group].teams)[md - 1];
    for (const f of fixtures) if (f.home === yt || f.away === yt) return f;
  }
  if (stage === 'r32') return state.knockout.r32.find(m => m.home === yt || m.away === yt);
  if (stage === 'r16') return state.knockout.r16.find(m => m.home === yt || m.away === yt);
  if (stage === 'qf')  return state.knockout.qf.find(m => m.home === yt || m.away === yt);
  if (stage === 'sf')  return state.knockout.sf.find(m => m.home === yt || m.away === yt);
  if (stage === 'final') return state.knockout.final;
  return null;
}

// =========================================================================
// Match simulation
// =========================================================================
function selectXI(teamCode, formation) {
  const roster = state.rosters[teamCode];
  const need = formationPositions(formation);
  const available = roster.filter(p => p.inj <= 0 && p.sus <= 0).slice().sort((a, b) => b.rating - a.rating);
  const used = new Set();
  const xi = [];
  for (const slot of need) {
    let chosen = available.find(p => !used.has(p.id) && positionMatches(p.pos, slot));
    if (!chosen) chosen = available.find(p => !used.has(p.id));
    if (chosen) { used.add(chosen.id); xi.push({ ...chosen, slot }); }
  }
  return xi;
}
function formationPositions(formation) {
  switch (formation) {
    case '4-3-3':   return ['GK','CB','CB','RB','LB','CDM','CM','CM','RW','LW','ST'];
    case '4-4-2':   return ['GK','CB','CB','RB','LB','RW','CM','CM','LW','ST','ST'];
    case '4-2-3-1': return ['GK','CB','CB','RB','LB','CDM','CDM','RW','CAM','LW','ST'];
    case '3-5-2':   return ['GK','CB','CB','CB','RB','LB','CDM','CM','CM','ST','ST'];
  }
  return ['GK','CB','CB','RB','LB','CDM','CM','CM','RW','LW','ST'];
}
function positionMatches(have, slot) {
  if (have === slot) return true;
  const fam = {
    GK:['GK'], CB:['CB'], RB:['RB','LB'], LB:['LB','RB'],
    CDM:['CDM','CM'], CM:['CM','CDM','CAM'], CAM:['CAM','CM','CDM'],
    RW:['RW','LW','RM','LM','CAM'], LW:['LW','RW','LM','RM','CAM'],
    ST:['ST','CAM'],
  };
  return (fam[slot] || []).includes(have);
}

// Pre-render varied outcome narration so the same event always reads the same way.
function pickNarration(outcome, attacker, defender, gk, counterAtk, counterOutcome) {
  const a = attacker.name, d = defender.name, g = gk.name;
  const VARS = {
    crit_goal: [
      `NAT 20! 💥 ${a} unleashes the impossible — GOAL!`,
      `NAT 20! ⚡ ${a} channels divine fury — GOAL!`,
      `NAT 20! 🌟 ${a} bends the laws of physics — GOAL!`,
      `NAT 20! 🔥 ${a} chips the ${g} from 35 yards — GOAL OF THE TOURNAMENT!`,
    ],
    goal: [
      `⚽ GOAL! ${a} beats ${g} into the corner.`,
      `⚽ GOAL! ${a} rifles it past ${g}.`,
      `⚽ GOAL! ${a} side-foots it home with ice in his veins.`,
      `⚽ GOAL! ${a} curls it into the top corner — ${g} can only watch.`,
      `⚽ GOAL! ${a} smashes it through ${g}'s legs!`,
      `⚽ GOAL! ${a} heads it in from the back post!`,
      `⚽ GOAL! ${a} pokes home a rebound after ${g} can only parry.`,
    ],
    save: [
      `🧤 SAVE — ${g} parries it away at full stretch.`,
      `🧤 SAVE — ${g} reads ${a} all the way.`,
      `🧤 SAVE — ${g} pushes it onto the post and clears.`,
      `🧤 SAVE — ${g} stays huge to deny ${a}.`,
      `🧤 SAVE — point-blank reflex from ${g}.`,
    ],
    miss: [
      `↗ ${a}'s shot drifts wide of the far post.`,
      `↗ ${a} rattles the crossbar — inches!`,
      `↗ ${a} skies it over the bar.`,
      `↗ ${a} pulls it across the face of goal.`,
      `↗ ${a} drags his shot wide of the near post.`,
    ],
    lost: [
      `${d} reads the play and snuffs out the chance.`,
      `${d} dispossesses ${a} cleanly.`,
      `${d} sticks a leg out at the perfect moment.`,
      `${a} runs into a wall of ${d}.`,
      `${d} shoulders ${a} off the ball at the edge of the box.`,
    ],
    crit_fail: [
      `NAT 1! 💀 ${a} loses the ball cheaply.`,
      `NAT 1! 💀 ${a} slips at the worst moment.`,
      `NAT 1! 💀 ${a}'s heavy touch is intercepted.`,
      `NAT 1! 💀 ${a} miscontrols badly — chaos.`,
    ],
  };
  const lines = VARS[outcome] || [outcome];
  const main = pick(lines);
  if (counterOutcome === 'goal' && counterAtk) {
    return main + `  ⚡ ${counterAtk.name} converts the counter — they score!`;
  } else if (counterOutcome === 'save') {
    return main + `  Counter ends with a GK save.`;
  } else if (counterOutcome === 'wide') {
    return main + `  Counter fizzles wide of goal.`;
  }
  return main;
}

function simulateMatch(homeCode, awayCode, isYours) {
  const homeStyle = (homeCode === state.yourTeam) ? state.style : 'balanced';
  const awayStyle = (awayCode === state.yourTeam) ? state.style : 'balanced';
  const homeForm = (homeCode === state.yourTeam) ? state.formation : '4-3-3';
  const awayForm = (awayCode === state.yourTeam) ? state.formation : '4-3-3';
  const home = selectXI(homeCode, homeForm);
  const away = selectXI(awayCode, awayForm);
  if (home.length < 7 || away.length < 7) {
    return { hScore:0, aScore:0, events:[], injuries:[] };
  }

  const hStyle = STYLES[homeStyle], aStyle = STYLES[awayStyle];
  const totalEvents = Math.round((hStyle.events + aStyle.events) * 0.55);

  const events = [];
  let hScore = 0, aScore = 0, minute = 1;

  // Slight home-team rating boost for home matches (group stage neutral; KO too neutral; ignore for now)
  for (let i = 0; i < totalEvents; i++) {
    minute = Math.min(90, minute + rint(3, 11));
    // Bias attack toward the better-rated team
    const homeAttackerPool = home.filter(p => ['ST','RW','LW','CAM','CM','LM','RM'].includes(p.pos));
    const awayAttackerPool = away.filter(p => ['ST','RW','LW','CAM','CM','LM','RM'].includes(p.pos));
    const homeStrength = avg(homeAttackerPool, 'rating') + hStyle.atkMod;
    const awayStrength = avg(awayAttackerPool, 'rating') + aStyle.atkMod;
    const homeAttacking = chance(homeStrength / (homeStrength + awayStrength));
    const atkSquad = homeAttacking ? home : away;
    const defSquad = homeAttacking ? away : home;
    const atkStyle = homeAttacking ? hStyle : aStyle;
    const defStyle = homeAttacking ? aStyle : hStyle;
    const attacker = pick((homeAttacking ? homeAttackerPool : awayAttackerPool)) || pick(atkSquad);
    const defenderPool = defSquad.filter(p => ['CB','RB','LB','CDM','CM'].includes(p.pos));
    const defender = pick(defenderPool) || pick(defSquad);
    const gk = defSquad.find(p => p.pos === 'GK') || defSquad[0];

    // d20 attack. User-team attacks get a morale modifier (-3..+3).
    const isUserAttack = (homeAttacking ? homeCode : awayCode) === state.yourTeam;
    const moraleMod = isUserAttack ? Math.round((state.morale || 0) / 7) : 0;
    const r20 = rint(1, 20);
    const atkMod = Math.floor(attacker.rating / 6) + atkStyle.atkMod + moraleMod;
    const defMod = Math.floor(defender.rating / 6) + defStyle.defMod;
    const dc = 11 + defMod;
    const total = r20 + atkMod;
    const isNat20 = r20 === 20;
    const isNat1 = r20 === 1;

    // Defender / GK contests
    const gkRating = Math.floor(gk.rating / 6);
    const gkSave = rint(1, 20) + gkRating;
    const saveDC = total - 2; // GK has to roll near the shot total

    let outcome;
    if (isNat20) outcome = 'crit_goal';
    else if (isNat1) outcome = 'crit_fail';
    else if (total >= dc) {
      // shot on target — GK may save
      if (gkSave >= saveDC && !chance(0.35 + (total - dc) * 0.04)) outcome = 'save';
      else outcome = 'goal';
    }
    else if (total >= dc - 3) outcome = 'miss';
    else outcome = 'lost';

    let counterOutcome = null;
    let counterAtk = null;
    if (outcome === 'crit_fail' || (outcome === 'lost' && chance(0.18))) {
      // Quick counter — opponent gets a chance
      const cAtkPool = (homeAttacking ? awayAttackerPool : homeAttackerPool);
      counterAtk = pick(cAtkPool) || pick(homeAttacking ? away : home);
      const cRoll = rint(1, 20) + Math.floor(counterAtk.rating / 6) + 2;
      counterOutcome = cRoll >= 16 ? 'goal' : (cRoll >= 12 ? 'save' : 'wide');
      if (counterOutcome === 'goal') {
        if (homeAttacking) aScore++; else hScore++;
        state.goalsLog.push({ player: counterAtk.name, team: homeAttacking ? awayCode : homeCode, minute, stage: state.stage });
      }
    }

    if (outcome === 'goal' || outcome === 'crit_goal') {
      if (homeAttacking) hScore++; else aScore++;
      state.goalsLog.push({ player: attacker.name, team: homeAttacking ? homeCode : awayCode, minute, stage: state.stage });
    }

    events.push({
      minute, side: homeAttacking ? 'h' : 'a',
      atk: attacker.name, atkPos: attacker.pos, atkCls: attacker.cls,
      def: defender.name, defPos: defender.pos,
      gk: gk.name,
      r20, atkMod, dc, total, gkSave, outcome, counterOutcome,
      counterAtk: counterAtk ? counterAtk.name : null,
      hScore, aScore,
      // Pre-render a narration string for variety (so the same event always reads the same way).
      narration: pickNarration(outcome, attacker, defender, gk, counterAtk, counterOutcome),
    });
  }
  // Injuries on user's starters only
  const injuries = [];
  if (isYours) {
    const yourXI = (homeCode === state.yourTeam) ? home : away;
    for (const p of yourXI) {
      if (chance(0.04)) {
        const dur = rint(1, 2);
        const actual = state.rosters[state.yourTeam].find(q => q.id === p.id);
        if (actual) actual.inj = dur;
        injuries.push({ name: p.name, dur });
      }
    }
  }
  return { hScore, aScore, events, injuries };
}
function avg(arr, key) { if (!arr.length) return 75; let s = 0; for (const a of arr) s += a[key]; return s / arr.length; }

// =========================================================================
// Round play
// =========================================================================
function playMatchday() {
  const yt = state.yourTeam;
  let userMatch = null;
  const stage = state.stage;
  if (stage.startsWith('group_')) {
    const md = parseInt(stage.split('_')[1]);
    for (const g of GROUP_LETTERS) {
      const fixtures = groupFixtures(g, state.groups[g].teams)[md - 1];
      for (const f of fixtures) {
        const isYours = (f.home === yt || f.away === yt);
        const result = simulateMatch(f.home, f.away, isYours);
        f.hScore = result.hScore; f.aScore = result.aScore;
        if (isYours) { f.events = result.events; f.injuries = result.injuries || []; userMatch = f; }
        state.groups[g].results.push(f);
        updateStandings(g, f);
      }
    }
    if (md < 3) state.stage = 'group_' + (md + 1);
    else {
      buildR32();
      state.stage = 'r32';
      if (!getNextOpponent()) state.eliminated = true;
    }
  } else if (['r32','r16','qf','sf','final'].includes(stage)) {
    const matches = (stage === 'final') ? [state.knockout.final] : state.knockout[stage];
    for (const m of matches) {
      const isYours = (m.home === yt || m.away === yt);
      const result = simulateMatch(m.home, m.away, isYours);
      m.hScore = result.hScore; m.aScore = result.aScore;
      if (isYours) { m.events = result.events; m.injuries = result.injuries || []; userMatch = m; }
      if (m.hScore === m.aScore) {
        m.pens = true;
        m.penHome = rint(3, 5);
        m.penAway = rint(3, 5);
        while (m.penHome === m.penAway) { if (chance(0.5)) m.penHome++; else m.penAway++; }
      }
      m.winner = (m.hScore > m.aScore || (m.hScore === m.aScore && m.penHome > m.penAway)) ? m.home : m.away;
    }
    if (stage === 'r32') { buildR16(); state.stage = 'r16'; }
    else if (stage === 'r16') { buildQF(); state.stage = 'qf'; }
    else if (stage === 'qf') { buildSF(); state.stage = 'sf'; }
    else if (stage === 'sf') { buildFinal(); state.stage = 'final'; }
    else if (stage === 'final') {
      state.stage = 'done';
      if (state.knockout.final.winner === yt) state.champion = true;
    }
    if (state.stage !== 'done' && !getNextOpponent()) state.eliminated = true;
  }
  // Recovery between rounds
  for (const p of state.rosters[yt]) {
    if (p.inj > 0) p.inj--;
    if (p.sus > 0) p.sus--;
    p.fit = Math.min(100, p.fit + 12);
  }
  save();
  return userMatch;
}

function updateStandings(group, fix) {
  const st = state.groups[group].standings;
  const sh = st.find(s => s.code === fix.home);
  const sa = st.find(s => s.code === fix.away);
  sh.p++; sa.p++;
  sh.gf += fix.hScore; sh.ga += fix.aScore;
  sa.gf += fix.aScore; sa.ga += fix.hScore;
  sh.gd = sh.gf - sh.ga; sa.gd = sa.gf - sa.ga;
  if (fix.hScore > fix.aScore) sh.pts += 3;
  else if (fix.aScore > fix.hScore) sa.pts += 3;
  else { sh.pts++; sa.pts++; }
}

// 48-team format: 12 group winners + 12 runners-up + 8 best 3rd-placed
// teams advance to R32 (32 teams).
function buildR32() {
  const winners = [], runners = [], thirds = [];
  for (const g of GROUP_LETTERS) {
    const sorted = state.groups[g].standings.slice().sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    winners.push({ g, ...sorted[0] });
    runners.push({ g, ...sorted[1] });
    thirds.push({ g, ...sorted[2] });
  }
  // Best 8 of 12 third-placed teams advance.
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const topThirds = thirds.slice(0, 8);
  // Sort everyone into a seeded list: winners (best first), runners-up, third-placed.
  winners.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  runners.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const seeds = winners.concat(runners).concat(topThirds);
  // Pair 1v32, 2v31, ... 16v17.
  state.knockout.r32 = [];
  for (let i = 0; i < 16; i++) {
    state.knockout.r32.push({ home: seeds[i].code, away: seeds[31 - i].code, slot: i });
  }
}
function buildR16() {
  const r = state.knockout.r32;
  state.knockout.r16 = [];
  for (let i = 0; i < 8; i++) {
    state.knockout.r16.push({ home: r[i * 2].winner, away: r[i * 2 + 1].winner, slot: i });
  }
}
function buildQF() {
  const r = state.knockout.r16;
  state.knockout.qf = [
    { home: r[0].winner, away: r[1].winner },
    { home: r[2].winner, away: r[3].winner },
    { home: r[4].winner, away: r[5].winner },
    { home: r[6].winner, away: r[7].winner },
  ];
}
function buildSF() {
  const q = state.knockout.qf;
  state.knockout.sf = [
    { home: q[0].winner, away: q[1].winner },
    { home: q[2].winner, away: q[3].winner },
  ];
}
function buildFinal() {
  const s = state.knockout.sf;
  state.knockout.final = { home: s[0].winner, away: s[1].winner };
}

// =========================================================================
// DOM helpers
// =========================================================================
function el(tag, opts) {
  const e = document.createElement(tag);
  if (!opts) return e;
  for (const k in opts) {
    const v = opts[k];
    if (v == null) continue;
    if (k === 'cls') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'on') for (const ev in v) e.addEventListener(ev, v[ev]);
    else if (k === 'style') Object.assign(e.style, v);
    else if (k === 'children') for (const c of v) if (c) e.appendChild(c);
    else e[k] = v;
  }
  return e;
}

function flash(msg) {
  const t = el('div', { text:msg, cls:'soccerFlash' });
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 1400);
}

function headerBar(title, backFn) {
  const left = backFn
    ? el('button', { cls:'sBtn', text:'← Back', on:{click:backFn}})
    : el('button', { cls:'sBtn', text:'← Arcade', on:{click:()=>onExit && onExit()}});
  return el('div', { cls:'sHeader', children:[
    left,
    el('div', { cls:'sTitle', text:title }),
    el('button', { cls:'sBtn', text:'⌂', on:{click:()=>renderHome()}}),
  ]});
}

// =========================================================================
// Rendering — screens
// =========================================================================
function renderTitleScreen() {
  container.innerHTML = '';
  const p = el('div', { cls:'sPanel' });
  p.appendChild(headerBar('Cup Manager'));
  p.appendChild(el('p', { text:'Tap a country to begin your campaign.',
    style:{fontSize:'13px', color:'var(--muted)', textAlign:'center', marginBottom:'12px'}}));

  const grid = el('div', { cls:'teamGrid' });
  const byGroup = {};
  for (const t of TEAMS) (byGroup[t.group] = byGroup[t.group] || []).push(t);
  for (const g of GROUP_LETTERS) {
    grid.appendChild(el('div', { text:'Group '+g, cls:'groupLabel' }));
    for (const t of byGroup[g]) {
      const card = el('button', { cls:'teamCard', children:[
        el('div', { cls:'teamFlag', text:t.flag }),
        el('div', { cls:'teamName', text:t.name }),
        el('div', { cls:'teamRating', text:'OVR '+t.rating }),
      ]});
      card.dataset.code = t.code;
      card.addEventListener('click', () => confirmTeam(t));
      grid.appendChild(card);
    }
  }
  p.appendChild(grid);
  container.appendChild(p);
}

// Single-tap confirm modal — guaranteed visible even on tiny phones.
function confirmTeam(t) {
  const overlay = el('div', { cls:'sConfirm', children:[
    el('div', { cls:'sConfirmCard', children:[
      el('div', { style:{fontSize:'52px',textAlign:'center'}, text: t.flag }),
      el('div', { style:{fontSize:'20px',fontWeight:'800',textAlign:'center',marginTop:'4px'}, text: t.name }),
      el('div', { style:{fontSize:'13px',color:'var(--muted)',textAlign:'center'}, text: 'Group '+t.group+' · OVR '+t.rating }),
      el('p', { text:'Start the campaign as head coach of '+t.name+'?',
        style:{textAlign:'center',fontSize:'14px',margin:'16px 0 12px'}}),
      el('div', { style:{display:'flex',gap:'8px'}, children:[
        el('button', { cls:'sBtn2', text:'Cancel', style:{flex:'1',padding:'14px'},
          on:{click:()=>overlay.remove()}}),
        el('button', { cls:'sBig', text:'Start ▶', style:{flex:'2',margin:'0'},
          on:{click:()=>{ overlay.remove(); newCampaign(t.code); renderHome(); }}}),
      ]}),
    ]}),
  ]});
  container.appendChild(overlay);
}

function renderHome() {
  container.innerHTML = '';
  const p = el('div', { cls:'sPanel' });
  const me = TEAMS.find(t => t.code === state.yourTeam);
  p.appendChild(headerBar(me.flag + ' ' + me.name));

  if (state.champion) {
    p.appendChild(renderTrophyCeremony(me));
  } else if (state.eliminated) {
    p.appendChild(el('div', { cls:'sCard', children:[
      el('div', { text:'😔', style:{fontSize:'56px',textAlign:'center'}}),
      el('h2', { text:'Eliminated', style:{textAlign:'center', margin:'4px 0 8px'}}),
      el('p', { text:'Your tournament ends here. The fans appreciated the effort.', style:{textAlign:'center'}}),
    ]}));
    // Recap awards on elimination too
    p.appendChild(renderAwardsCard());
    p.appendChild(el('button', { cls:'sBig', text:'New Campaign', on:{click:()=>{wipe(); renderTitleScreen();}}}));
  } else {
    p.appendChild(stageBadge());
    p.appendChild(moraleCard());
    p.appendChild(nextMatchCard());
    // Golden Boot teaser
    const top = topScorers(1);
    if (top.length && top[0].goals > 0) {
      const t = TEAMS.find(tm => tm.code === top[0].team);
      p.appendChild(el('div', { cls:'sCard', children:[
        el('h3', { text:'🥇 Golden Boot leader', style:{margin:'0 0 4px',color:'var(--accent)',fontSize:'11px',letterSpacing:'.12em',textTransform:'uppercase'}}),
        el('div', { html:`${t.flag} <b>${top[0].player}</b> &nbsp;<span style="color:var(--accent);font-weight:700">${top[0].goals}⚽</span>`,
          style:{fontSize:'13px'}}),
      ]}));
    }
  }

  p.appendChild(actionBar());
  p.appendChild(newsLog());
  container.appendChild(p);
}

function moraleCard() {
  const m = state.morale || 0;
  let label, color;
  if (m >= 12) { label = 'High morale 🔥'; color = '#3ad07a'; }
  else if (m >= 4) { label = 'Confident 💪'; color = '#7ad07a'; }
  else if (m >= -3) { label = 'Steady 🟰'; color = 'var(--muted)'; }
  else if (m >= -11) { label = 'Tense 😬'; color = '#f4d24a'; }
  else { label = 'Crisis 🚨'; color = '#f44a4a'; }
  return el('div', { cls:'sCard', style:{padding:'8px 12px'}, children:[
    el('div', { html:`Squad mood: <span style="color:${color};font-weight:700">${label}</span> <span style="float:right;color:var(--muted);font-size:11px">morale ${m >= 0 ? '+' : ''}${m}</span>`,
      style:{fontSize:'12px'}}),
  ]});
}

function renderTrophyCeremony(me) {
  const wrap = el('div', { cls:'sCard sCrown' });
  wrap.appendChild(el('div', { text:'🏆', style:{fontSize:'72px',textAlign:'center',filter:'drop-shadow(0 4px 12px rgba(244,210,74,.6))'}}));
  wrap.appendChild(el('h2', { text:'WORLD CHAMPIONS', style:{color:'#f4d24a', textAlign:'center', margin:'4px 0 0',letterSpacing:'.12em'}}));
  wrap.appendChild(el('div', { text:me.flag + ' ' + me.name, style:{textAlign:'center',fontSize:'22px',fontWeight:'800',margin:'4px 0 12px'}}));
  wrap.appendChild(el('p', { text:'The trophy is lifted into the air. Confetti rains down. You have written your name into history.',
    style:{textAlign:'center',fontStyle:'italic',color:'var(--muted)',fontSize:'13px',margin:'0 0 12px'}}));
  wrap.appendChild(renderAwardsCard(true));
  wrap.appendChild(el('button', { cls:'sBig', text:'New Campaign', on:{click:()=>{wipe(); renderTitleScreen();}}}));
  return wrap;
}

function renderAwardsCard(asInner) {
  const wrap = el('div', asInner ? { style:{marginTop:'12px'}} : { cls:'sCard' });
  wrap.appendChild(el('h3', { text:'🏅 Tournament awards', style:{margin:'0 0 8px',color:'var(--accent)',fontSize:'12px',letterSpacing:'.12em',textTransform:'uppercase'}}));
  const top = topScorers(5);
  if (top.length) {
    wrap.appendChild(el('div', { html:'<b>Golden Boot</b>', style:{fontSize:'12px',color:'var(--muted)',marginTop:'4px'}}));
    for (let i = 0; i < top.length; i++) {
      const p = top[i];
      const t = TEAMS.find(tm => tm.code === p.team) || {};
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      wrap.appendChild(el('div', { html:
        `${medal} ${t.flag} <b>${p.player}</b> <span style="float:right;color:var(--accent);font-weight:700">${p.goals}⚽</span>`,
        style:{fontSize:'13px',padding:'3px 0'}}));
    }
  } else {
    wrap.appendChild(el('div', { text:'No goals yet.', style:{fontSize:'12px',color:'var(--muted)'}}));
  }
  // Best XI rated of your team — sort by rating, top 11
  const yt = state.yourTeam;
  const roster = state.rosters[yt].slice().sort((a, b) => b.rating - a.rating).slice(0, 11);
  wrap.appendChild(el('div', { html:'<b>Your XI MVPs</b>', style:{fontSize:'12px',color:'var(--muted)',marginTop:'10px'}}));
  for (const p of roster.slice(0, 5)) {
    wrap.appendChild(el('div', { html:`★ ${p.name} <span style="float:right;color:var(--accent);font-weight:700">${p.rating}</span>`,
      style:{fontSize:'12px',padding:'2px 0'}}));
  }
  return wrap;
}

function stageBadge() {
  const labels = {
    group_1:'Group Stage · Matchday 1',
    group_2:'Group Stage · Matchday 2',
    group_3:'Group Stage · Matchday 3',
    r32:'Round of 32',
    r16:'Round of 16',
    qf:'Quarter-finals',
    sf:'Semi-finals',
    final:'THE FINAL',
    done:'Tournament Done',
  };
  return el('div', { text:labels[state.stage] || state.stage, cls:'sStage' });
}

function nextMatchCard() {
  const yt = state.yourTeam;
  const next = getNextOpponent();
  if (!next) return el('div');
  const me = TEAMS.find(t => t.code === yt);
  const oppCode = next.home === yt ? next.away : next.home;
  const opp = TEAMS.find(t => t.code === oppCode);
  return el('div', { cls:'sCard', children:[
    el('div', { text:'Next match · ' + (next.home === yt ? 'home' : 'away'),
      style:{fontSize:'12px', color:'var(--muted)'}}),
    el('div', { cls:'matchRow', children:[
      el('div', { cls:'matchSide', html:`<div class="matchFlag">${me.flag}</div><div class="matchTeamName">${me.name}</div><div class="matchOvr">OVR ${me.rating}</div>` }),
      el('div', { cls:'vs', text:'VS' }),
      el('div', { cls:'matchSide', html:`<div class="matchFlag">${opp.flag}</div><div class="matchTeamName">${opp.name}</div><div class="matchOvr">OVR ${opp.rating}</div>` }),
    ]}),
    el('div', { text:'Formation: ' + state.formation + ' · Style: ' + STYLES[state.style].name,
      style:{fontSize:'12px', color:'var(--muted)', textAlign:'center', marginTop:'4px'}}),
    el('button', { cls:'sBig sGo', text:'⚽ Kick Off', on:{click:()=>onKickoff()}}),
  ]});
}

function actionBar() {
  return el('div', { cls:'sActions', children:[
    el('button', { cls:'sBtn2', text:'👥 Squad', on:{click:()=>renderSquad()}}),
    el('button', { cls:'sBtn2', text:'📋 Tactics', on:{click:()=>renderTactics()}}),
    el('button', { cls:'sBtn2', text:'🏆 Bracket', on:{click:()=>renderBracket()}}),
  ]});
}

function newsLog() {
  const wrap = el('div', { cls:'sNews' });
  wrap.appendChild(el('h3', { text:'News' }));
  for (let i = state.log.length - 1; i >= Math.max(0, state.log.length - 8); i--) {
    wrap.appendChild(el('div', { text:'• ' + state.log[i], cls:'newsLine' }));
  }
  return wrap;
}

function renderSquad() {
  container.innerHTML = '';
  const p = el('div', { cls:'sPanel' });
  p.appendChild(headerBar('Squad', renderHome));
  const roster = state.rosters[state.yourTeam].slice().sort((a, b) => {
    const ord = ['GK','CB','RB','LB','CDM','CM','CAM','RW','LW','ST'];
    return ord.indexOf(a.pos) - ord.indexOf(b.pos) || b.rating - a.rating;
  });
  const xi = selectXI(state.yourTeam, state.formation).map(p => p.id);
  for (const pl of roster) {
    const status = pl.inj > 0 ? `Injured (${pl.inj}r)` : pl.sus > 0 ? `Suspended (${pl.sus}r)` : 'Fit';
    const statusColor = pl.inj > 0 ? '#f44a4a' : pl.sus > 0 ? '#f4d24a' : '#3ad07a';
    const isStart = xi.includes(pl.id);
    p.appendChild(el('div', { cls:'playerRow' + (pl.star ? ' starRow':'') + (isStart ? ' xi':''), children:[
      el('div', { cls:'playerPos', text:pl.pos }),
      el('div', { cls:'playerName', children:[
        el('div', { text:pl.name + (pl.star ? ' ★' : '') }),
        el('div', { cls:'playerSub', html:
          `<span>${pl.cls} <span style="opacity:.7">${CLASS_FLAVOR[pl.cls] || ''}</span></span>`,
        }),
        el('div', { cls:'playerSub', children:[
          el('span', { text:'age '+pl.age+' · ' }),
          el('span', { text:status, style:{color:statusColor}}),
          isStart ? el('span', { text:' · in XI', style:{color:'#f4d24a'}}) : null,
        ]}),
      ]}),
      el('div', { cls:'playerRating', text: pl.rating }),
    ]}));
  }
  container.appendChild(p);
}

function renderTactics() {
  container.innerHTML = '';
  const p = el('div', { cls:'sPanel' });
  p.appendChild(headerBar('Tactics', renderHome));
  const pitch = el('div', { cls:'pitch' });
  drawFormation(pitch, state.formation);
  p.appendChild(pitch);

  p.appendChild(el('h3', { text:'Formation' }));
  const fGrid = el('div', { cls:'tacticGrid' });
  for (const f of FORMATIONS) {
    const b = el('button', { cls:'tacticBtn' + (state.formation === f ? ' active':''),
      text:f, on:{click:()=>{ state.formation = f; save(); renderTactics(); }}});
    fGrid.appendChild(b);
  }
  p.appendChild(fGrid);

  p.appendChild(el('h3', { text:'Style' }));
  const sGrid = el('div', { cls:'tacticGrid' });
  for (const s of ['press','balanced','counter','defensive']) {
    const b = el('button', { cls:'tacticBtn' + (state.style === s ? ' active':''),
      children:[
        el('div', { text:STYLES[s].name, style:{fontWeight:'700'}}),
        el('div', { text:STYLE_DESC[s], style:{fontSize:'10px', color:'var(--muted)', marginTop:'2px'}}),
      ],
      on:{click:()=>{ state.style = s; save(); renderTactics(); }}});
    sGrid.appendChild(b);
  }
  p.appendChild(sGrid);
  container.appendChild(p);
}

function drawFormation(pitch, formation) {
  pitch.innerHTML = '';
  const coords = formationCoords(formation);
  for (const [x, y, label] of coords) {
    pitch.appendChild(el('div', { cls:'pitchPlayer', text:label,
      style:{left:(x*100)+'%', top:(y*100)+'%'}}));
  }
  // halfway line + circle (purely decorative)
  pitch.appendChild(el('div', { cls:'pitchLine' }));
  pitch.appendChild(el('div', { cls:'pitchCircle' }));
}
function formationCoords(formation) {
  switch (formation) {
    case '4-3-3':   return [
      [0.50, 0.90, 'GK'],
      [0.15, 0.72, 'LB'], [0.36, 0.75, 'CB'], [0.64, 0.75, 'CB'], [0.85, 0.72, 'RB'],
      [0.30, 0.50, 'CM'], [0.50, 0.55, 'CDM'], [0.70, 0.50, 'CM'],
      [0.15, 0.25, 'LW'], [0.50, 0.20, 'ST'], [0.85, 0.25, 'RW'],
    ];
    case '4-4-2': return [
      [0.50, 0.90, 'GK'],
      [0.15, 0.72, 'LB'], [0.36, 0.75, 'CB'], [0.64, 0.75, 'CB'], [0.85, 0.72, 'RB'],
      [0.15, 0.45, 'LM'], [0.36, 0.50, 'CM'], [0.64, 0.50, 'CM'], [0.85, 0.45, 'RM'],
      [0.36, 0.20, 'ST'], [0.64, 0.20, 'ST'],
    ];
    case '4-2-3-1': return [
      [0.50, 0.90, 'GK'],
      [0.15, 0.72, 'LB'], [0.36, 0.75, 'CB'], [0.64, 0.75, 'CB'], [0.85, 0.72, 'RB'],
      [0.36, 0.55, 'CDM'], [0.64, 0.55, 'CDM'],
      [0.18, 0.32, 'LW'], [0.50, 0.32, 'CAM'], [0.82, 0.32, 'RW'],
      [0.50, 0.15, 'ST'],
    ];
    case '3-5-2': return [
      [0.50, 0.90, 'GK'],
      [0.30, 0.75, 'CB'], [0.50, 0.78, 'CB'], [0.70, 0.75, 'CB'],
      [0.10, 0.50, 'LB'], [0.32, 0.55, 'CM'], [0.50, 0.58, 'CDM'], [0.68, 0.55, 'CM'], [0.90, 0.50, 'RB'],
      [0.38, 0.20, 'ST'], [0.62, 0.20, 'ST'],
    ];
  }
  return [];
}

function renderBracket() {
  container.innerHTML = '';
  const p = el('div', { cls:'sPanel' });
  p.appendChild(headerBar('Tournament', renderHome));

  for (const g of GROUP_LETTERS) {
    const sorted = state.groups[g].standings.slice().sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    const wrap = el('div', { cls:'groupBlock' });
    wrap.appendChild(el('div', { text:'Group ' + g, cls:'groupHead' }));
    sorted.forEach((s, i) => {
      const team = TEAMS.find(t => t.code === s.code);
      const adv = i < 2 ? '↑' : '';
      wrap.appendChild(el('div', { cls:'standingRow' + (team.code === state.yourTeam ? ' you' : ''),
        html:`<span>${i+1}.</span> ${team.flag} ${team.name} <span class="standRight">${s.pts}pts · ${s.gf}-${s.ga} ${adv}</span>` }));
    });
    p.appendChild(wrap);
  }

  if (state.knockout.r32 && state.knockout.r32.length) p.appendChild(koBlock('Round of 32', state.knockout.r32));
  if (state.knockout.r16.length) p.appendChild(koBlock('Round of 16', state.knockout.r16));
  if (state.knockout.qf.length)  p.appendChild(koBlock('Quarter-finals', state.knockout.qf));
  if (state.knockout.sf.length)  p.appendChild(koBlock('Semi-finals', state.knockout.sf));
  if (state.knockout.final)      p.appendChild(koBlock('FINAL', [state.knockout.final]));

  container.appendChild(p);
}
function koBlock(label, matches) {
  const wrap = el('div', { cls:'groupBlock' });
  wrap.appendChild(el('div', { text:label, cls:'groupHead' }));
  for (const m of matches) {
    const h = TEAMS.find(t => t.code === m.home);
    const a = TEAMS.find(t => t.code === m.away);
    const score = (m.hScore != null) ? `${m.hScore}-${m.aScore}${m.pens ? ` (p ${m.penHome}-${m.penAway})` : ''}` : '—';
    const youIn = (m.home === state.yourTeam || m.away === state.yourTeam);
    wrap.appendChild(el('div', { cls:'standingRow' + (youIn ? ' you' : ''),
      html:`${h.flag} ${h.name} <span class="standRight">${score} ${a.flag} ${a.name}</span>` }));
  }
  return wrap;
}

// =========================================================================
// Match playback
// =========================================================================
let currentMatch = null;
let eventIndex = 0;
// On kickoff: 45% chance to interrupt with a press conference. Player answer
// adjusts morale, which feeds into the user team's attack rolls next match.
function onKickoff() {
  if (Math.random() < 0.45) renderPressConference();
  else renderMatchStart();
}

const PRESS_QUESTIONS = [
  {
    when: 'always',
    q: 'Reporter: "Coach, how do you assess the threat of {opp}?"',
    options: [
      { text: '"We respect them. It will be a battle.”', mood: +2, tone:'humble' },
      { text: '"They should be worried about us, not the other way around.”', mood: +4, tone:'cocky', risk:true },
      { text: '"I have not had time to study them in detail."', mood: -2, tone:'flat' },
    ],
  },
  {
    when: 'always',
    q: 'Reporter: "There are rumors of unrest in the squad. Your response?"',
    options: [
      { text: '"There is no unrest. This squad is family."', mood: +3, tone:'unifying' },
      { text: '"I will not comment on locker-room talk."', mood: 0, tone:'guarded' },
      { text: '"Some players need to step up. They know who they are."', mood: -5, tone:'harsh' },
    ],
  },
  {
    when: 'lowMorale',
    q: 'Reporter: "After the last result, do you still have the dressing room?"',
    options: [
      { text: '"Absolutely. We have each other’s backs."', mood: +5, tone:'unifying' },
      { text: '"That is for the players to answer on the pitch."', mood: 0, tone:'deflect' },
      { text: '"That question disrespects this group. I am done."', mood: +2, tone:'storm-out', risk:true },
    ],
  },
  {
    when: 'highMorale',
    q: 'Reporter: "You look unstoppable. Are you the favorites now?"',
    options: [
      { text: '"We focus on the next match. Nothing else."', mood: +1, tone:'humble' },
      { text: '"No one in this tournament can stop us."', mood: +3, tone:'cocky', risk:true },
      { text: '"Favorites are decided by results, not press conferences."', mood: +2, tone:'cool' },
    ],
  },
  {
    when: 'knockout',
    q: 'Reporter: "It is win or go home. What is the message to the players?"',
    options: [
      { text: '"Play your game. Trust the work."', mood: +3, tone:'steady' },
      { text: '"Leave nothing on the pitch. Empty the tank."', mood: +4, tone:'fired-up' },
      { text: '"This is what we have been waiting for. Embrace it."', mood: +2, tone:'philosophical' },
    ],
  },
];

function renderPressConference() {
  const next = getNextOpponent();
  const oppCode = next.home === state.yourTeam ? next.away : next.home;
  const opp = TEAMS.find(t => t.code === oppCode);
  const me = TEAMS.find(t => t.code === state.yourTeam);
  // Pick a context-appropriate question
  const lowM = (state.morale || 0) < -5;
  const highM = (state.morale || 0) > 8;
  const isKO = ['r32','r16','qf','sf','final'].includes(state.stage);
  const pool = PRESS_QUESTIONS.filter(q =>
    q.when === 'always' ||
    (q.when === 'lowMorale' && lowM) ||
    (q.when === 'highMorale' && highM) ||
    (q.when === 'knockout' && isKO)
  );
  const Q = pick(pool);

  container.innerHTML = '';
  const p = el('div', { cls:'sPanel' });
  p.appendChild(headerBar('Press Conference'));
  p.appendChild(el('div', { cls:'sCard', children:[
    el('div', { text:'🎙️', style:{fontSize:'40px',textAlign:'center'}}),
    el('div', { text:'Pre-match press · ' + me.flag + ' ' + me.name + ' vs ' + opp.flag + ' ' + opp.name,
      style:{textAlign:'center',color:'var(--muted)',fontSize:'12px',margin:'4px 0 10px'}}),
    el('p', { text: Q.q.replace('{opp}', opp.name),
      style:{fontSize:'15px',fontStyle:'italic',margin:'0 0 10px'}}),
    el('div', { style:{display:'flex',flexDirection:'column',gap:'8px'}, children:
      Q.options.map(opt => el('button', { cls:'tacticBtn', text: opt.text, style:{textAlign:'left'},
        on:{click:()=>{
          let m = opt.mood;
          // Risky answers can backfire — 30% chance to halve or invert.
          if (opt.risk) {
            const r = Math.random();
            if (r < 0.3) m = -Math.abs(m);
          }
          state.morale = Math.max(-20, Math.min(20, (state.morale || 0) + m));
          state.log.push(`Press: "${opt.text.slice(0, 40)}…" (${m >= 0 ? '+' : ''}${m} morale)`);
          // Brief acknowledgement
          flash((m >= 0 ? '+' : '') + m + ' morale');
          renderMatchStart();
        }},
      })),
    }),
  ]}));
  container.appendChild(p);
}

function renderMatchStart() {
  // Run the matchday simulation and present user's match progressively.
  const userMatch = playMatchday();
  if (!userMatch) {
    // Shouldn't happen, but recover.
    renderHome(); return;
  }
  currentMatch = userMatch;
  eventIndex = 0;
  renderMatchFrame();
}

function renderMatchFrame() {
  container.innerHTML = '';
  const p = el('div', { cls:'sPanel' });
  const h = TEAMS.find(t => t.code === currentMatch.home);
  const a = TEAMS.find(t => t.code === currentMatch.away);
  let hs = 0, as = 0, minute = 0;
  for (let i = 0; i < eventIndex; i++) {
    const e = currentMatch.events[i];
    hs = e.hScore; as = e.aScore; minute = e.minute;
  }
  if (eventIndex === 0) minute = 0;

  p.appendChild(el('div', { cls:'sMatchHead', children:[
    el('div', { cls:'matchSide', html:`<div class="matchFlag">${h.flag}</div><div class="matchTeamName">${h.name}</div>` }),
    el('div', { children:[
      el('div', { cls:'sScore', text: hs + ' - ' + as }),
      el('div', { cls:'sMin', text: minute > 0 ? minute + "'" : 'KICK OFF' }),
    ]}),
    el('div', { cls:'matchSide', html:`<div class="matchFlag">${a.flag}</div><div class="matchTeamName">${a.name}</div>` }),
  ]}));

  if (eventIndex < currentMatch.events.length) {
    const e = currentMatch.events[eventIndex];
    p.appendChild(renderEventCard(e));
    p.appendChild(el('button', { cls:'sBig', text:'Continue ▶', on:{click:()=>{ eventIndex++; renderMatchFrame(); }}}));
  } else {
    p.appendChild(renderMatchResult());
    p.appendChild(el('button', { cls:'sBig', text:'Continue to home ▶', on:{click:()=>renderHome()}}));
  }

  container.appendChild(p);
}

function renderEventCard(e) {
  const wrap = el('div', { cls:'sEvent' });
  wrap.appendChild(el('div', { text:`${e.minute}'  ${e.atk} (${e.atkPos}, ${e.atkCls})`, cls:'evHead' }));
  wrap.appendChild(el('div', { html:`${e.atk} ${CLASS_FLAVOR[e.atkCls] || 'pushes forward'}…`, cls:'evNarr' }));
  wrap.appendChild(el('div', { cls:'evRoll', html:
    `🎲 <b>d20 = ${e.r20}</b> + ${e.atkMod} → <b>${e.total}</b> &nbsp;vs DC <b>${e.dc}</b> (def: ${e.def})` }));
  const outcomeClsMap = {
    crit_goal:'evGoal', goal:'evGoal',
    save:'evSave',
    miss:'evMiss', lost:'evMiss',
    crit_fail:'evCrit',
  };
  const outcomeCls = outcomeClsMap[e.outcome] || 'evMiss';
  // Use the pre-rendered narration variant (added in v2.1 simulation).
  const text = e.narration || e.outcome;
  wrap.appendChild(el('div', { text, cls:'evOutcome '+outcomeCls }));
  return wrap;
}

function renderMatchResult() {
  const yt = state.yourTeam;
  const h = TEAMS.find(t => t.code === currentMatch.home);
  const a = TEAMS.find(t => t.code === currentMatch.away);
  const youHome = currentMatch.home === yt;
  const myScore = youHome ? currentMatch.hScore : currentMatch.aScore;
  const oppScore = youHome ? currentMatch.aScore : currentMatch.hScore;
  let label = myScore > oppScore ? 'WIN' : myScore < oppScore ? 'LOSS' : 'DRAW';
  if (currentMatch.pens) {
    const myPens = youHome ? currentMatch.penHome : currentMatch.penAway;
    const oppPens = youHome ? currentMatch.penAway : currentMatch.penHome;
    label = myPens > oppPens ? 'WIN (pens)' : 'LOSS (pens)';
  }
  const color = label.startsWith('WIN') ? '#3ad07a' : label === 'DRAW' ? '#f4d24a' : '#f44a4a';

  const wrap = el('div');

  // Big result card
  const result = el('div', { cls:'sCard' });
  result.appendChild(el('div', { text:'FULL TIME', style:{color:'var(--muted)', fontSize:'12px', letterSpacing:'.1em', textAlign:'center'}}));
  result.appendChild(el('div', { text:label, style:{color, fontSize:'32px', fontWeight:'900', textAlign:'center'}}));
  result.appendChild(el('div', { text:`${h.name} ${currentMatch.hScore} - ${currentMatch.aScore} ${a.name}`,
    style:{textAlign:'center', fontSize:'15px'}}));
  if (currentMatch.pens) result.appendChild(el('div', { text:`Penalties: ${currentMatch.penHome} - ${currentMatch.penAway}`,
    style:{textAlign:'center', fontSize:'13px', color:'var(--muted)'}}));
  wrap.appendChild(result);

  // Goal timeline from this match's events
  const goalEvents = (currentMatch.events || []).filter(e => e.outcome === 'goal' || e.outcome === 'crit_goal' || e.counterOutcome === 'goal');
  if (goalEvents.length) {
    const tl = el('div', { cls:'sCard' });
    tl.appendChild(el('h3', { text:'Goal timeline', style:{margin:'0 0 6px',color:'var(--accent)',fontSize:'12px',letterSpacing:'.12em',textTransform:'uppercase'}}));
    for (const e of goalEvents) {
      const homeScored = (e.side === 'h' && (e.outcome === 'goal' || e.outcome === 'crit_goal')) ||
                        (e.side === 'a' && e.counterOutcome === 'goal');
      const scorer = e.counterOutcome === 'goal' ? e.counterAtk : e.atk;
      const tCode = homeScored ? currentMatch.home : currentMatch.away;
      const tFlag = (TEAMS.find(t => t.code === tCode) || {}).flag || '';
      tl.appendChild(el('div', { html:
        `<span style="display:inline-block;width:32px;color:var(--accent);font-weight:700">${e.minute}'</span> ${tFlag} ${scorer}`,
        style:{fontSize:'13px',padding:'3px 0'}}));
    }
    wrap.appendChild(tl);
  }

  // Player of the Match — biggest single contributor on the user's side
  if (currentMatch.events) {
    const contrib = {};
    for (const e of currentMatch.events) {
      const userSide = (e.side === 'h' && youHome) || (e.side === 'a' && !youHome);
      if (!userSide) continue;
      if (e.outcome === 'goal' || e.outcome === 'crit_goal') {
        contrib[e.atk] = (contrib[e.atk] || 0) + (e.outcome === 'crit_goal' ? 3 : 2);
      } else if (e.outcome === 'save') {
        contrib[e.gk] = (contrib[e.gk] || 0) + 1;
      }
    }
    const sorted = Object.entries(contrib).sort((a,b)=>b[1]-a[1]);
    if (sorted.length) {
      wrap.appendChild(el('div', { cls:'sCard', children:[
        el('h3', { text:'Player of the Match', style:{margin:'0 0 4px',color:'var(--accent)',fontSize:'12px',letterSpacing:'.12em',textTransform:'uppercase'}}),
        el('div', { text:'🏅 ' + sorted[0][0], style:{fontSize:'16px',fontWeight:'700'}}),
      ]}));
    }
  }

  // Injuries
  if (currentMatch.injuries && currentMatch.injuries.length) {
    const inj = currentMatch.injuries.map(p => `${p.name} (${p.dur}r)`).join(', ');
    wrap.appendChild(el('div', { cls:'sCard', children:[
      el('h3', { text:'Injuries', style:{margin:'0 0 4px',color:'#f44a4a',fontSize:'12px',letterSpacing:'.12em',textTransform:'uppercase'}}),
      el('div', { text:inj, style:{fontSize:'13px',color:'#f4d4d4'}}),
    ]}));
  }

  // Tournament-long Golden Boot leader
  const top = topScorers(3);
  if (top.length) {
    const gb = el('div', { cls:'sCard' });
    gb.appendChild(el('h3', { text:'🥇 Golden Boot race', style:{margin:'0 0 6px',color:'var(--accent)',fontSize:'12px',letterSpacing:'.12em',textTransform:'uppercase'}}));
    for (const p of top) {
      const tt = TEAMS.find(t => t.code === p.team) || {};
      gb.appendChild(el('div', { html:
        `${tt.flag || ''} <b>${p.player}</b> <span style="float:right;color:var(--accent);font-weight:700">${p.goals}⚽</span>`,
        style:{fontSize:'13px',padding:'3px 0'}}));
    }
    wrap.appendChild(gb);
  }

  // Log it (once)
  const logLine = `${h.flag} ${currentMatch.hScore}-${currentMatch.aScore} ${a.flag}` +
    (currentMatch.pens ? ` (pen ${currentMatch.penHome}-${currentMatch.penAway})` : '') + ` — ${label}`;
  if (!state._lastLogged || state._lastLogged !== logLine) {
    state.log.push(logLine);
    state._lastLogged = logLine;
    if (currentMatch.injuries && currentMatch.injuries.length) {
      state.log.push('Injury blow: ' + currentMatch.injuries.map(p => p.name).join(', '));
    }
    // Morale shift from result
    if (label.startsWith('WIN')) state.morale = Math.min(20, (state.morale || 0) + 4);
    else if (label === 'LOSS' || label.startsWith('LOSS')) state.morale = Math.max(-20, (state.morale || 0) - 4);
    save();
  }
  return wrap;
}

function topScorers(n) {
  if (!state.goalsLog) return [];
  const map = {};
  for (const g of state.goalsLog) {
    const k = g.team + '|' + g.player;
    if (!map[k]) map[k] = { player: g.player, team: g.team, goals: 0 };
    map[k].goals++;
  }
  return Object.values(map).sort((a, b) => b.goals - a.goals).slice(0, n || 5);
}

// =========================================================================
// Public API
// =========================================================================
function start(root, exitCb) {
  container = root;
  onExit = exitCb;
  container.style.display = 'block';
  if (load()) renderHome();
  else renderTitleScreen();
}
function stop() {
  if (state) save();
  container.style.display = 'none';
}

return { start, stop, wipe };
})();

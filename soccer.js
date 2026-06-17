// World Cup Manager — soccer/football management with D&D dice-roll match sim.
// Standalone module: window.Soccer = { start, stop, wipe }
window.Soccer = (function () {
'use strict';

// =========================================================================
// Data
// =========================================================================
const TEAMS = [
  // Group A
  { code:'QAT', name:'Qatar',        flag:'🇶🇦', group:'A', region:'MEA', rating:67 },
  { code:'ECU', name:'Ecuador',      flag:'🇪🇨', group:'A', region:'LAT', rating:74 },
  { code:'SEN', name:'Senegal',      flag:'🇸🇳', group:'A', region:'AFR', rating:79 },
  { code:'NED', name:'Netherlands',  flag:'🇳🇱', group:'A', region:'WEU', rating:87 },
  // Group B
  { code:'ENG', name:'England',      flag:'🏴', group:'B', region:'WEU', rating:88 },
  { code:'IRN', name:'Iran',         flag:'🇮🇷', group:'B', region:'MEA', rating:72 },
  { code:'USA', name:'USA',          flag:'🇺🇸', group:'B', region:'NAM', rating:75 },
  { code:'WAL', name:'Wales',        flag:'🏴', group:'B', region:'WEU', rating:73 },
  // Group C
  { code:'ARG', name:'Argentina',    flag:'🇦🇷', group:'C', region:'LAT', rating:92 },
  { code:'KSA', name:'Saudi Arabia', flag:'🇸🇦', group:'C', region:'MEA', rating:67 },
  { code:'MEX', name:'Mexico',       flag:'🇲🇽', group:'C', region:'LAT', rating:78 },
  { code:'POL', name:'Poland',       flag:'🇵🇱', group:'C', region:'EEU', rating:80 },
  // Group D
  { code:'FRA', name:'France',       flag:'🇫🇷', group:'D', region:'WEU', rating:91 },
  { code:'AUS', name:'Australia',    flag:'🇦🇺', group:'D', region:'OCE', rating:71 },
  { code:'DEN', name:'Denmark',      flag:'🇩🇰', group:'D', region:'WEU', rating:82 },
  { code:'TUN', name:'Tunisia',      flag:'🇹🇳', group:'D', region:'AFR', rating:74 },
  // Group E
  { code:'ESP', name:'Spain',        flag:'🇪🇸', group:'E', region:'WEU', rating:89 },
  { code:'CRC', name:'Costa Rica',   flag:'🇨🇷', group:'E', region:'LAT', rating:70 },
  { code:'GER', name:'Germany',      flag:'🇩🇪', group:'E', region:'WEU', rating:88 },
  { code:'JPN', name:'Japan',        flag:'🇯🇵', group:'E', region:'ASI', rating:78 },
  // Group F
  { code:'BEL', name:'Belgium',      flag:'🇧🇪', group:'F', region:'WEU', rating:87 },
  { code:'CAN', name:'Canada',       flag:'🇨🇦', group:'F', region:'NAM', rating:72 },
  { code:'MAR', name:'Morocco',      flag:'🇲🇦', group:'F', region:'AFR', rating:79 },
  { code:'CRO', name:'Croatia',      flag:'🇭🇷', group:'F', region:'EEU', rating:84 },
  // Group G
  { code:'BRA', name:'Brazil',       flag:'🇧🇷', group:'G', region:'LAT', rating:93 },
  { code:'SRB', name:'Serbia',       flag:'🇷🇸', group:'G', region:'EEU', rating:78 },
  { code:'SUI', name:'Switzerland',  flag:'🇨🇭', group:'G', region:'WEU', rating:81 },
  { code:'CMR', name:'Cameroon',     flag:'🇨🇲', group:'G', region:'AFR', rating:75 },
  // Group H
  { code:'POR', name:'Portugal',     flag:'🇵🇹', group:'H', region:'WEU', rating:89 },
  { code:'GHA', name:'Ghana',        flag:'🇬🇭', group:'H', region:'AFR', rating:74 },
  { code:'URU', name:'Uruguay',      flag:'🇺🇾', group:'H', region:'LAT', rating:83 },
  { code:'KOR', name:'South Korea',  flag:'🇰🇷', group:'H', region:'ASI', rating:80 },
];

// A small set of universally-recognized stars (rosters approximate, illustrative).
const STARS = {
  ARG: [['Lionel Messi','CAM',93], ['Emiliano Martínez','GK',86], ['Julián Álvarez','ST',85], ['Rodrigo De Paul','CM',83], ['Cristian Romero','CB',85]],
  FRA: [['Kylian Mbappé','LW',93], ['Antoine Griezmann','CAM',86], ['Hugo Lloris','GK',84], ['Aurélien Tchouaméni','CDM',85], ['Theo Hernández','LB',85]],
  BRA: [['Vinícius Jr.','LW',90], ['Neymar','CAM',88], ['Casemiro','CDM',86], ['Marquinhos','CB',87], ['Alisson','GK',88]],
  ENG: [['Harry Kane','ST',89], ['Jude Bellingham','CM',88], ['Bukayo Saka','RW',86], ['Phil Foden','CAM',85], ['Declan Rice','CDM',85]],
  ESP: [['Pedri','CM',87], ['Gavi','CM',83], ['Rodri','CDM',89], ['Álvaro Morata','ST',82], ['Unai Simón','GK',83]],
  POR: [['Cristiano Ronaldo','ST',87], ['Bruno Fernandes','CAM',88], ['Bernardo Silva','CM',88], ['Rúben Dias','CB',88], ['Diogo Costa','GK',82]],
  GER: [['Joshua Kimmich','CDM',88], ['Jamal Musiala','CAM',86], ['Kai Havertz','ST',84], ['Antonio Rüdiger','CB',87], ['Manuel Neuer','GK',88]],
  BEL: [['Kevin De Bruyne','CAM',91], ['Romelu Lukaku','ST',86], ['Thibaut Courtois','GK',90], ['Eden Hazard','LW',82]],
  CRO: [['Luka Modrić','CM',88], ['Mateo Kovačić','CM',83], ['Joško Gvardiol','CB',82], ['Dominik Livaković','GK',82]],
  NED: [['Virgil van Dijk','CB',89], ['Frenkie de Jong','CM',86], ['Memphis Depay','ST',83], ['Cody Gakpo','LW',83]],
  POR: [['Cristiano Ronaldo','ST',87], ['Bruno Fernandes','CAM',88], ['Bernardo Silva','CM',88]],
  URU: [['Federico Valverde','CM',86], ['Darwin Núñez','ST',82], ['Ronald Araújo','CB',86]],
  MAR: [['Achraf Hakimi','RB',85], ['Hakim Ziyech','CAM',82], ['Yassine Bounou','GK',83]],
  DEN: [['Christian Eriksen','CAM',83], ['Pierre-Emile Højbjerg','CDM',83]],
  POL: [['Robert Lewandowski','ST',88]],
  MEX: [['Hirving Lozano','LW',82]],
  USA: [['Christian Pulisic','LW',83], ['Weston McKennie','CM',79]],
  SEN: [['Sadio Mané','LW',86], ['Kalidou Koulibaly','CB',86]],
  KOR: [['Heung-min Son','LW',88]],
  JPN: [['Wataru Endo','CDM',80], ['Takefusa Kubo','CAM',80]],
  AUS: [['Mat Ryan','GK',79]],
  ECU: [['Moisés Caicedo','CDM',82]],
  SUI: [['Granit Xhaka','CM',82], ['Yann Sommer','GK',82]],
  SRB: [['Dušan Vlahović','ST',82], ['Sergej Milinković-Savić','CM',84]],
  GHA: [['Mohammed Kudus','CAM',80]],
};

// Region-specific name pools used to fill rosters around the named stars.
const NAME_BANK = {
  WEU: { first:['Lucas','Pedro','Jean','Hans','Marco','Pep','Tom','Leon','David','Alex','Mark','Karl','Paolo','Antonio','Diego','Sven','Mads','Erik','Olivier','Ben','Andrés','Pau','Lorenzo','Stefan','Lars','Mathias','Robin','Joel'],
        last:['Müller','García','Martin','Silva','Smith','Hansen','Rossi','Becker','Larsson','Bauer','Andersen','Nilsen','Janssen','Roux','Lopez','Costa','Pereira','Schmidt','Andersson','Fischer','Vermeulen','Bakker','Visser','Lund','Sørensen','Berg','Dupont','Lefèvre'] },
  EEU: { first:['Luka','Mateusz','Petar','Marko','Stefan','Vlad','Nikola','Filip','Damir','Ivan','Goran','Lukasz','Tomasz','Aleksandar','Dušan','Andrej','Branislav','Jakub','Pavel','Boris'],
        last:['Modrić','Lewandowski','Kovačić','Tadić','Nikolić','Stojković','Krasić','Bartoszek','Marković','Jovanović','Petrović','Vukotić','Szczęsny','Krychowiak','Brozović','Perišić','Šešnić','Mitrović'] },
  LAT: { first:['Carlos','Juan','Diego','Sergio','Eduardo','Manuel','Antonio','Mateo','Joaquín','Rodrigo','Bruno','Iván','Felipe','Pablo','Cristián','Andrés','Gabriel','Marcos','Lucas','Rafael','Thiago','Matías','Esteban','Renato'],
        last:['Silva','García','Rodríguez','González','Martínez','López','Hernández','Díaz','Pereira','Torres','Vargas','Ortiz','Ramos','Castro','Núñez','Romero','Sosa','Aguirre','Quintero','Reyes','Vega','Acosta'] },
  AFR: { first:['Sadio','Yassin','Mohammed','Kalidou','Idrissa','Cheikh','Amine','Achraf','Hakim','André','Thomas','Aminu','Samuel','Sofyan','Romain','Édouard','Ibrahim','Karim','Kalifa','Vincent'],
        last:['Mané','Koulibaly','Mendy','Hakimi','Ziyech','Ayew','Boateng','Aubameyang','Onana','Tchouaméni','Diatta','Aké','Sané','Kanté','Saïd','Mohammadi','Diop','Niasse','Bensebaini','Mahrez'] },
  ASI: { first:['Hiroki','Yuto','Takumi','Daichi','Heung-min','Min-jae','Hwang','Lee','Junya','Hajime','Yuji','Wataru','Takehiro','Takefusa','Maya','Ritsu','Ko','Hyeon-woo','Jin-su'],
        last:['Tanaka','Suzuki','Watanabe','Yamamoto','Kim','Lee','Park','Choi','Jung','Kang','Shin','Hashimoto','Itō','Yoshida','Endō','Minamino','Doan','Mitoma','Asano'] },
  MEA: { first:['Ali','Hassan','Mohammed','Omar','Salem','Khalid','Yousef','Abdullah','Saud','Karim','Reza','Mehdi','Sardar','Ehsan','Mehrdad','Ahmed','Tariq','Salman','Faisal','Rashed'],
        last:['Al-Sabah','Al-Khaldi','Al-Faraj','Al-Dawsari','Hosseini','Ezatolahi','Azmoun','Rezaeian','Beiranvand','Al-Owais','Al-Burayk','Cherki','Tabarsi','Karimi','Pejman'] },
  NAM: { first:['Christian','Tyler','Brenden','Weston','Sergiño','Jonathan','Alphonso','Cyle','Stephen','Atiba','Yunus','Tajon','Junior','Steven','Brandon','Tim','Ricardo','Antonee','Walker'],
        last:['Pulisic','Adams','Aaronson','McKennie','Dest','Davies','Larin','Eustáquio','Hutchinson','Buchanan','Musah','Reyna','Robinson','Zimmerman','Acosta','Sargent','Pepi'] },
  OCE: { first:['Aaron','Mat','Awer','Mitch','Jackson','Riley','Harry','Jordan','Daniel','Connor','Cameron','Trent','Bailey','Marco','Garang'],
        last:['Mooy','Ryan','Mabil','Duke','Irvine','McGree','Souttar','Goodwin','Wright','Metcalfe','Tilio','Devlin','Karačić','Behich','Atkinson'] },
};

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
const SAVE_KEY = 'wcmgr.save.v1';

function save() { if (!state) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e){} }
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
    state = JSON.parse(raw); return state && state.v === 1;
  } catch (e) { return false; }
}
function wipe() { localStorage.removeItem(SAVE_KEY); state = null; }

// =========================================================================
// Roster generation
// =========================================================================
function generateRoster(teamCode, seed) {
  const team = TEAMS.find(t => t.code === teamCode);
  const bank = NAME_BANK[team.region] || NAME_BANK.WEU;
  const localRng = mulberry(seed ^ hashCode(teamCode));
  const lpick = (arr) => arr[Math.floor(localRng() * arr.length)];
  const lrint = (a, b) => a + Math.floor(localRng() * (b - a + 1));

  // 23-player squad slots
  const slots = ['GK','GK','GK','CB','CB','CB','CB','RB','RB','LB','LB','CDM','CDM','CM','CM','CM','CAM','CAM','RW','LW','LW','ST','ST'];
  const players = [];
  let id = 0;

  // Insert known stars
  const stars = (STARS[teamCode] || []).slice();
  for (const [name, pos, rating] of stars) {
    let i = slots.indexOf(pos);
    if (i === -1) {
      // versatile fallback
      if (pos === 'CAM') i = slots.indexOf('CM');
      else if (pos === 'LW' || pos === 'RW') i = slots.indexOf('RW');
      else if (pos === 'CDM') i = slots.indexOf('CM');
    }
    if (i === -1) continue;
    slots.splice(i, 1);
    players.push({
      id: id++, name, pos, rating, age: lrint(24, 35),
      cls: CLASS_BY_POS[pos] || 'Bard',
      fit: 100, inj: 0, sus: 0, star: true,
    });
  }
  // Fill remaining with generated
  for (const pos of slots) {
    const name = lpick(bank.first) + ' ' + lpick(bank.last);
    const variance = lrint(-8, 6);
    const r = Math.max(60, Math.min(89, team.rating + variance));
    players.push({
      id: id++, name, pos, rating: r, age: lrint(20, 33),
      cls: CLASS_BY_POS[pos] || 'Bard',
      fit: 100, inj: 0, sus: 0, star: false,
    });
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
  for (const g of ['A','B','C','D','E','F','G','H']) {
    const teams = TEAMS.filter(t => t.group === g).map(t => t.code);
    groups[g] = {
      teams,
      results: [],
      standings: teams.map(c => ({ code:c, pts:0, gf:0, ga:0, gd:0, p:0 })),
    };
  }
  state = {
    v: 1, seed,
    yourTeam: yourCode,
    rosters,
    groups,
    knockout: { r16:[], qf:[], sf:[], final:null },
    stage: 'group_1',
    formation: '4-3-3',
    style: 'balanced',
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

    // d20 attack
    const r20 = rint(1, 20);
    const atkMod = Math.floor(attacker.rating / 6) + atkStyle.atkMod;
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
    if (outcome === 'crit_fail' || (outcome === 'lost' && chance(0.18))) {
      // Quick counter — opponent gets a chance
      const cAtkPool = (homeAttacking ? awayAttackerPool : homeAttackerPool);
      const cAtk = pick(cAtkPool) || pick(homeAttacking ? away : home);
      const cRoll = rint(1, 20) + Math.floor(cAtk.rating / 6) + 2;
      counterOutcome = cRoll >= 16 ? 'goal' : (cRoll >= 12 ? 'save' : 'wide');
      if (counterOutcome === 'goal') {
        if (homeAttacking) aScore++; else hScore++;
      }
    }

    if (outcome === 'goal' || outcome === 'crit_goal') {
      if (homeAttacking) hScore++; else aScore++;
    }

    events.push({
      minute, side: homeAttacking ? 'h' : 'a',
      atk: attacker.name, atkPos: attacker.pos, atkCls: attacker.cls,
      def: defender.name, defPos: defender.pos,
      gk: gk.name,
      r20, atkMod, dc, total, gkSave, outcome, counterOutcome,
      hScore, aScore,
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
    for (const g of ['A','B','C','D','E','F','G','H']) {
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
      buildR16();
      state.stage = 'r16';
      if (!getNextOpponent()) state.eliminated = true;
    }
  } else if (['r16','qf','sf','final'].includes(stage)) {
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
    if (stage === 'r16') { buildQF(); state.stage = 'qf'; }
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

function buildR16() {
  const winners = {}, runners = {};
  for (const g of ['A','B','C','D','E','F','G','H']) {
    const sorted = state.groups[g].standings.slice().sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    winners[g] = sorted[0].code;
    runners[g] = sorted[1].code;
  }
  state.knockout.r16 = [
    { home: winners.A, away: runners.B, slot:0 },
    { home: winners.C, away: runners.D, slot:1 },
    { home: winners.E, away: runners.F, slot:2 },
    { home: winners.G, away: runners.H, slot:3 },
    { home: winners.B, away: runners.A, slot:4 },
    { home: winners.D, away: runners.C, slot:5 },
    { home: winners.F, away: runners.E, slot:6 },
    { home: winners.H, away: runners.G, slot:7 },
  ];
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
  p.appendChild(el('p', { text:'Pick a nation. The campaign begins immediately at the group stage.',
    style:{fontSize:'13px', color:'var(--muted)', textAlign:'center', marginBottom:'12px'}}));

  let selected = null;
  let selectBtn = null;
  const grid = el('div', { cls:'teamGrid' });
  const byGroup = {};
  for (const t of TEAMS) (byGroup[t.group] = byGroup[t.group] || []).push(t);
  for (const g of ['A','B','C','D','E','F','G','H']) {
    grid.appendChild(el('div', { text:'Group '+g, cls:'groupLabel' }));
    for (const t of byGroup[g]) {
      const card = el('button', { cls:'teamCard', children:[
        el('div', { cls:'teamFlag', text:t.flag }),
        el('div', { cls:'teamName', text:t.name }),
        el('div', { cls:'teamRating', text:'OVR '+t.rating }),
      ]});
      card.dataset.code = t.code;
      card.addEventListener('click', () => {
        if (selected) selected.classList.remove('selected');
        selected = card; card.classList.add('selected');
        selectBtn.disabled = false;
        selectBtn.textContent = 'Manage ' + t.name + ' ' + t.flag;
      });
      grid.appendChild(card);
    }
  }
  p.appendChild(grid);

  selectBtn = el('button', { cls:'sBig', text:'Choose a nation above', disabled:true, on:{click:()=>{
    if (!selected) return;
    newCampaign(selected.dataset.code);
    renderHome();
  }}});
  p.appendChild(selectBtn);
  container.appendChild(p);
}

function renderHome() {
  container.innerHTML = '';
  const p = el('div', { cls:'sPanel' });
  const me = TEAMS.find(t => t.code === state.yourTeam);
  p.appendChild(headerBar(me.flag + ' ' + me.name));

  if (state.champion) {
    p.appendChild(el('div', { cls:'sCard sCrown', children:[
      el('h2', { text:'🏆 WORLD CHAMPIONS 🏆', style:{color:'#f4d24a', textAlign:'center', margin:'0 0 8px'}}),
      el('p', { text: me.name + ' lifts the trophy! A legendary campaign.', style:{textAlign:'center'}}),
      el('button', { cls:'sBig', text:'New Campaign', on:{click:()=>{wipe(); renderTitleScreen();}}}),
    ]}));
  } else if (state.eliminated) {
    p.appendChild(el('div', { cls:'sCard', children:[
      el('h2', { text:'Eliminated', style:{textAlign:'center', margin:'0 0 8px'}}),
      el('p', { text:'Your tournament ends here. The fans appreciated the effort.', style:{textAlign:'center'}}),
      el('button', { cls:'sBig', text:'New Campaign', on:{click:()=>{wipe(); renderTitleScreen();}}}),
    ]}));
  } else {
    p.appendChild(stageBadge());
    p.appendChild(nextMatchCard());
  }

  p.appendChild(actionBar());
  p.appendChild(newsLog());
  container.appendChild(p);
}

function stageBadge() {
  const labels = {
    group_1:'Group Stage · Matchday 1',
    group_2:'Group Stage · Matchday 2',
    group_3:'Group Stage · Matchday 3',
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
    el('button', { cls:'sBig sGo', text:'⚽ Kick Off', on:{click:()=>renderMatchStart()}}),
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

  for (const g of ['A','B','C','D','E','F','G','H']) {
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
  let outcomeText, outcomeCls;
  if (e.outcome === 'crit_goal') {
    outcomeText = `NAT 20! 💥 ${e.atk} unleashes the impossible — GOAL!`;
    outcomeCls = 'evGoal';
  } else if (e.outcome === 'goal') {
    outcomeText = `⚽ GOAL! ${e.atk} beats ${e.gk} into the corner.`;
    outcomeCls = 'evGoal';
  } else if (e.outcome === 'save') {
    outcomeText = `🧤 SAVE — ${e.gk} parries it away (GK roll ${e.gkSave}).`;
    outcomeCls = 'evSave';
  } else if (e.outcome === 'miss') {
    outcomeText = `↗ ${e.atk}'s shot drifts wide of the post.`;
    outcomeCls = 'evMiss';
  } else if (e.outcome === 'lost') {
    outcomeText = `${e.def} reads the play and snuffs out the chance.`;
    outcomeCls = 'evMiss';
  } else if (e.outcome === 'crit_fail') {
    outcomeText = `NAT 1! 💀 ${e.atk} loses the ball cheaply.`;
    outcomeCls = 'evCrit';
  }
  wrap.appendChild(el('div', { text:outcomeText, cls:'evOutcome '+outcomeCls }));
  if (e.counterOutcome) {
    let cText;
    if (e.counterOutcome === 'goal') cText = '⚡ COUNTER GOAL! The opponent races up and scores!';
    else if (e.counterOutcome === 'save') cText = 'Counter-attack ends with a GK save.';
    else cText = 'Counter-attack fades into nothing.';
    wrap.appendChild(el('div', { text:cText, cls:'evOutcome ' + (e.counterOutcome === 'goal' ? 'evCrit' : 'evMiss') }));
  }
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

  const wrap = el('div', { cls:'sCard' });
  wrap.appendChild(el('div', { text:'FULL TIME', style:{color:'var(--muted)', fontSize:'12px', letterSpacing:'.1em', textAlign:'center'}}));
  wrap.appendChild(el('div', { text:label, style:{color, fontSize:'30px', fontWeight:'800', textAlign:'center'}}));
  wrap.appendChild(el('div', { text:`${h.name} ${currentMatch.hScore} - ${currentMatch.aScore} ${a.name}`,
    style:{textAlign:'center', fontSize:'15px'}}));
  if (currentMatch.pens) wrap.appendChild(el('div', { text:`Penalties: ${currentMatch.penHome} - ${currentMatch.penAway}`,
    style:{textAlign:'center', fontSize:'13px', color:'var(--muted)'}}));
  if (currentMatch.injuries && currentMatch.injuries.length) {
    const inj = currentMatch.injuries.map(p => `${p.name} (${p.dur}r)`).join(', ');
    wrap.appendChild(el('div', { text:'Injuries: ' + inj, style:{marginTop:'8px', color:'#f44a4a', fontSize:'13px', textAlign:'center'}}));
  }
  // Log it
  const logLine = `${h.flag} ${currentMatch.hScore}-${currentMatch.aScore} ${a.flag}` +
    (currentMatch.pens ? ` (pen ${currentMatch.penHome}-${currentMatch.penAway})` : '') + ` — ${label}`;
  if (!state._lastLogged || state._lastLogged !== logLine) {
    state.log.push(logLine);
    state._lastLogged = logLine;
    if (currentMatch.injuries && currentMatch.injuries.length) {
      state.log.push('Injury blow: ' + currentMatch.injuries.map(p => p.name).join(', '));
    }
    save();
  }
  return wrap;
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

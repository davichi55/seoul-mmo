// 서울의 수수께끼 존재 · The Mysterious Creature of Seoul — first playable (BRIEF.md decision 33).
// One Hongdae street, the station below it, the 10-card deck, the basic attack ritual, 3 monsters, one restaurant,
// the weapon shop, three classes. Solo, local, save in localStorage.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { buildWorld, STATION, STREET, ENTRANCE, SPAWNS, MAPSPOT, MAPSPOT_APT, MAPSPOT_RIVER, STREET_NPCS, DUNGEON, YD, YEOUIDO, TOWER, TW, MAPSPOT_YD, MAPSPOT_NR, MK, MARKET, toon } from "./world.js";
import { makeHero, makeNPC, makeMonster } from "./models.js";
import { loadKayKit, kayReady, makeKay } from "./kaykit.js";
import { LINES } from "./lines.js";
import { unlockMusic, setMusicMood, setMusicVolume, musicTick } from "./music.js";
import { initAudio, SFX, say, wordClip, lineClip, exClip, setVolume } from "./audio.js";

const DATA = window.SEOUL_DATA;
const WORD = Object.fromEntries(DATA.words.map(w => [w.id, w]));
const BOOKS = DATA.books || [{ id: "5a", title: "5A", en: "Korean 5A" }];
// every character studies one book (Danny 2026-10-12); S.chapters = the chapters whose words it sees (drops, quizzes, murals)
const bookChapters = () => DATA.chapters.filter(c => (c.book || "5a") === S.book);
const bookWords = () => DATA.words.filter(w => (w.book || "5a") === S.book);
const pickChapters = () => S.mode === "story" ? bookChapters().filter(c => S.chapters.includes(c.id)) : bookChapters();
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const won = n => "₩" + Math.round(n).toLocaleString("en-US");

// ---- rules (numbers from the design page, Danny's answers 2026-10-11) ------------------------------
const GAME_MIN_PER_SEC = 0.2;          // Q9 A: 1 in-game hour = 5 real minutes
const HUNGER_SECONDS = 600;            // full -> empty in 2 in-game hours = 10 real minutes
const HUNGRY_MULT = 0.75;              // Q8 A
// basic attack = 1 card (Danny 2026-10-11: 3 cards made combat feel slow); stronger skills will ask for more words
const CARDS_PER_ATTACK = 1, CHOICES = 4, BASE_ATTACK = 21, BACKFIRE = 3, BASE_CD = 1.5;
const CLASSES = {
  mudang:   { ko: "무당", en: "Shaman", hp: 100, dmg: 1.0, range: 12, heal: .02, solo: "가장 쉬움 · easiest solo",
              pass: "Each correct card heals you 2% of your health.", weapons: ["방울", "신령 방울", "천신 방울"] },
  geomgaek: { ko: "검객", en: "Swordsman", hp: 130, dmg: .9, range: 3.4, mitig: .2, unbreak: true, solo: "가장 어려움 · hardest solo",
              pass: "Takes 20% less damage. 불굴 (unbreakable): at full health one hit can never kill you, you always keep 1 HP. No healing.", weapons: ["목검", "강철 검", "환도"] },
  gungsu:   { ko: "궁수", en: "Archer", hp: 90, dmg: 1.2, range: 20, solo: "보통 · medium",
              pass: "Long range (20 m): you can finish a ritual before a monster reaches you.", weapons: ["나무 활", "각궁", "명궁의 활"] },
};
const WEAPON_MULT = [1, 1.25, 1.5], WEAPON_PRICE = [0, 30000, 80000];
// gear: weapon (per class, 3 tiers), armour, trinket. Trinkets drop from monsters (6% of kills, one kind each).
const GEAR = {
  w0: { slot: "weapon", tier: 0 }, w1: { slot: "weapon", tier: 1 }, w2: { slot: "weapon", tier: 2 },
  a0: { slot: "armor", ko: "낡은 옷", en: "worn clothes", hp: 0, price: 0 },
  a1: { slot: "armor", ko: "가죽 갑옷", en: "leather armour", hp: .10, price: 20000 },
  a2: { slot: "armor", ko: "강철 갑옷", en: "steel armour", hp: .20, price: 60000 },
  t_horn: { slot: "trinket", ko: "도깨비 뿔 목걸이", en: "goblin-horn necklace", dmg: .03, price: 6000, drop: "dokkaebi" },
  t_vine: { slot: "trinket", ko: "덩굴 반지", en: "vine ring", ls: .02, price: 7000, drop: "vine" },
  t_club: { slot: "trinket", ko: "대장의 방망이 조각", en: "chief's club shard", dmg: .05, price: 15000 },
  t_ink: { slot: "trinket", ko: "문어 먹물 부적", en: "octopus-ink charm", dmg: .03, ls: .03, price: 25000 },
  t_core: { slot: "trinket", ko: "사령관의 코어", en: "commander's core", dmg: .04, hp: .04, price: 25000 },
  t_scale: { slot: "trinket", ko: "해태 비늘 부적", en: "haetae-scale charm", hp: .05, price: 8000, drop: "haetae" },
};
const SLOTS = { weapon: "무기 · weapon", armor: "갑옷 · armour", trinket: "장신구 · trinket" };
const ELEMENTS = { fire: { ko: "불", c: "#ff8a3a" }, water: { ko: "물", c: "#4ab8ff" }, wood: { ko: "나무", c: "#7bd65a" }, metal: { ko: "쇠", c: "#d6dde4" }, earth: { ko: "흙", c: "#c99a5a" } };
const MONS = {
  dokkaebi: { ko: "꼬마 도깨비", en: "little goblin", hp: 80, speed: 4.2, range: 2.4, dmg: 5, rate: 6, weak: "fire", lvl: 1, xp: 20, aggro: 9, money: [2500, 4000] },
  haetae:   { ko: "해태 석상", en: "haetae statue", hp: 105, speed: 2.1, range: 3.0, dmg: 8, rate: 4, weak: "water", immune: "fire", lvl: 3, xp: 35, aggro: 8, money: [4000, 6000], slam: { every: 9, tele: 1.8, radius: 4.2, dmg: 22 } },
  chief:    { ko: "도깨비 대장", en: "goblin chief", hp: 1100, speed: 3.6, range: 4, dmg: 12, rate: 3, weak: "fire", lvl: 8, xp: 400, aggro: 16, money: [30000, 40000], slam: { every: 11, tele: 2.2, radius: 6.5, dmg: 30 }, boss: true, model: "dokkaebi", scale: 2 },
  alien_scout:  { ko: "외계인 정찰병", en: "alien scout", hp: 220, speed: 5.4, range: 2.6, dmg: 10, rate: 2.6, weak: "earth", lvl: 7, xp: 90, aggro: 12, money: [8000, 12000], alien: true, model: "alien" },
  alien_caster: { ko: "외계인 주술사", en: "alien caster", hp: 260, speed: 2.8, range: 16, dmg: 9, rate: 5.5, weak: "water", lvl: 8, xp: 110, aggro: 14, money: [10000, 15000], alien: true, caster: true, orb: 25, model: "alien_caster" },
  gwisin:     { ko: "시험 귀신", en: "exam ghost", hp: 300, speed: 3.4, range: 2.6, dmg: 13, rate: 2.8, weak: "fire", lvl: 12, xp: 150, aggro: 10, money: [11000, 15000], examQ: { every: 12 }, model: "examghost" },
  kkotge:     { ko: "왕꽃게", en: "king crab", hp: 380, speed: 2.2, range: 3, dmg: 16, rate: 3.4, weak: "wood", lvl: 12, xp: 150, aggro: 9, money: [11000, 15000], armor: .5, slam: { every: 9, tele: 1.4, radius: 3.6, dmg: 26 }, model: "crab" },
  jangeo:     { ko: "장어", en: "electric eel", hp: 240, speed: 3.6, range: 11, dmg: 12, rate: 3, weak: "earth", lvl: 13, xp: 140, aggro: 11, money: [10000, 14000], ranged: true, root: { chance: .3, dur: 1.2 }, shock: true, model: "eel" },
  munoh:      { ko: "문어 왕", en: "octopus king", hp: 2400, speed: 1.4, range: 6, dmg: 18, rate: 3, weak: "fire", lvl: 15, xp: 900, aggro: 24, money: [60000, 80000], boss: true, sweep: { every: 7, tele: 1.4, len: 22, w: 3.2, dmg: 30 }, ink: true, model: "octopus" },
  jangseung:  { ko: "장승", en: "village guardian post", hp: 320, speed: 2.6, range: 3.0, dmg: 14, rate: 3.6, weak: "metal", lvl: 9, xp: 120, aggro: 9, money: [9000, 13000], slam: { every: 10, tele: 1.6, radius: 4.5, dmg: 30 } },
  geuseundae: { ko: "그슨대", en: "looming shadow", hp: 260, speed: 4.6, range: 2.6, dmg: 11, rate: 2.5, weak: "fire", lvl: 10, xp: 130, aggro: 11, money: [10000, 14000], grow: { every: 5, add: .1, max: .6 } },
  commander:  { ko: "외계인 사령관", en: "alien commander", hp: 2200, speed: 3.2, range: 14, dmg: 14, rate: 3.2, weak: "water", lvl: 12, xp: 700, aggro: 18, money: [50000, 70000], boss: true, alien: true, caster: true, orb: 22, volley: 3, shield: { every: 28, dur: 14 }, model: "alien_caster", scale: 1.6 },
  vine:     { ko: "덩굴 귀신", en: "vine spirit", hp: 80, speed: 2.6, range: 13, dmg: 5, rate: 3.2, weak: "metal", lvl: 2, xp: 25, aggro: 10, money: [3000, 4500], ranged: true, root: { chance: .35, dur: 2 } },
};
const FOODS = {
  kimchi: { ko: "김치찌개", price: 9000, fill: 100, buff: "regen", line: "r_p9000", plr: "p_kimchi" },
  bibim:  { ko: "비빔밥", price: 10000, fill: 100, buff: "dmg", line: "r_p10000", plr: "p_bibim" },
  tteok:  { ko: "떡볶이", price: 5000, fill: 50, buff: "speed", line: "r_p5000", plr: "p_tteok" },
  gimbap: { ko: "김밥 (포장)", price: 4000, fill: 50, takeaway: true, line: "r_takeout", plr: "p_gimbap" },
};
const BUFFS = { regen: { ko: "김치찌개: 회복 +50%" }, dmg: { ko: "비빔밥: 공격 +5%" }, speed: { ko: "떡볶이: 속도 +10%" } };
const POSKO = { noun: "명사", verb: "동사", adjective: "형용사", adverb: "부사", other: "기타" };

// ---- cards: every copy of a word is its own card with a rarity and a modifier (decisions 17, 21, 22; Danny 2026-10-11) ----
const RARITY = [
  { ko: "일반", en: "common", c: "#c9c4b8", odds: .70, price: 3000 },
  { ko: "희귀", en: "rare", c: "#5aa8ff", odds: .22, price: 8000 },
  { ko: "영웅", en: "epic", c: "#b47aff", odds: .07, price: 20000 },
  { ko: "전설", en: "legendary", c: "#ff9a3a", odds: .01, price: 50000 },
];
const MOD_V = [.01, .02, .03, .05];          // Q2 A: damage / cooldown / lifesteal per rarity
const EL_MULT = [1.5, 1.6, 1.75, 2.0];        // element card against a monster weak to it
function rollRarity() { let r = Math.random(); for (let i = 0; i < RARITY.length; i++) if ((r -= RARITY[i].odds) < 0) return i; return 0; }
function rollMod(rar = 0) {
  const r = Math.random();
  if (r < .25) return { t: "dmg", v: MOD_V[rar] };
  if (r < .45) return { t: "cd", v: MOD_V[rar] };
  if (r < .65) return { t: "ls", v: MOD_V[rar] };
  return { t: "el", el: pick(Object.keys(ELEMENTS)) };
}
const pct = v => +(v * 100).toFixed(1) + "%";
function modText(c) {
  const m = c.mod;
  if (m.t === "dmg") return `공격력 +${pct(m.v)}`;
  if (m.t === "cd") return `재사용 −${pct(m.v)}`;
  if (m.t === "ls") return `흡혈 ${pct(m.v)}`;
  return `속성 ${ELEMENTS[m.el].ko} ×${EL_MULT[c.rar || 0]}`;
}
const newUid = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const newCard = (id, rar = 0) => ({ uid: newUid(), id, rar, mod: rollMod(rar) });

// ---- skills: every skill has its own deck of 10 cards; the card choice only uses that deck ----
const SKILLS = {
  basic: { key: "1", ko: "기본 공격", en: "basic attack", cards: 1, mult: 1, cd: 1.5, lvl: 1 },
  s2: { key: "2", cards: 2, cd: 8, lvl: 2, opt: "A" },
  s3: { key: "3", cards: 2, cd: 8, lvl: 3, opt: "B" },
  silence: { key: "5", ko: "침묵 부적", en: "silence talisman", cards: 2, mult: 0, cd: 20, lvl: 1, silence: 10, info: "2 cards · an alien can't cast for 10 s (aliens only) · uses your basic deck" },
  sleep: { key: "4", ko: "잠 부적", en: "sleep talisman", cards: 2, mult: 0, cd: 30, lvl: 1, sleep: 20, info: "2 cards · the target sleeps 20 s or until it is hit (not bosses) · uses your basic deck" },
};
// skills 2 and 3 per class (Danny 2026-10-11: both options go in; A = key 2 at Lv 2, B = key 3 at Lv 3)
const SKILL2 = {
  mudang: { A: { ko: "화염 부적", en: "fire talisman", mult: 2.2, fire: true, info: "2 cards · 2.2× damage, counts as 불 fire" },
            B: { ko: "치유 부적", en: "healing talisman", mult: 1, heal: .25, cd: 12, info: "2 cards · heals 25% health + 1× damage" } },
  geomgaek: { A: { ko: "돌진 베기", en: "charging slash", mult: 2, range: 10, info: "2 cards · dash to a target up to 10 m away, 2× damage" },
              B: { ko: "철벽", en: "iron wall", mult: 1.6, guard: { red: .5, dur: 6 }, cd: 12, info: "2 cards · 1.6× damage, then take 50% less damage for 6 s" } },
  gungsu: { A: { ko: "관통 사격", en: "piercing shot", mult: 2.4, range: 24, info: "2 cards · 2.4× damage, range 24 m" },
            B: { ko: "덫 화살", en: "snare arrow", mult: 1.6, slow: { f: .5, dur: 5 }, cd: 10, info: "2 cards · 1.6× damage, target 50% slower for 5 s" } },
};
function skillDef(k) { const x = extraDef(k); if (x) return { ...x, key: barKeyLabel(k) }; return k === "basic" ? SKILLS.basic : Object.assign({}, SKILLS[k], SKILL2[S.cls][SKILLS[k].opt]); }

// ---- save -----------------------------------------------------------------------------------------
const SAVE_KEY = "seoulmmo_v1";
const fresh = () => ({ cls: null, cards: [], skillDecks: { basic: [], s2: [], s3: [] }, origin: null, chapters: [], shop: null, items: [], equip: {}, quests: {}, book: "5a", mode: "practice", hasMap: false, hasMapApt: false, hasMapRiver: false, mats: {}, snacks: {}, fish: {}, bank: { cards: [], items: [] }, mail: [], ach: {}, killsBy: {}, ate: {}, money: 15000, weapon: 0, hp: null, hunger: 100, time: 9 * 60, buffs: {}, gimbap: 0, stats: {}, heard: {}, subs: "auto", vol: .8, intro: false, kills: 0, level: 1, xp: 0, mastered: [] });
let S = fresh();
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s || !s.cls) return false;
    S = Object.assign(fresh(), s);
    if (s.deck && !s.cards) {            // save from before card copies: the old 10 cards become common copies in the basic deck
      S.cards = s.deck.map(d => ({ uid: newUid(), id: d.id, rar: 0, mod: d.mod.t === "el" ? d.mod : { t: d.mod.t, v: MOD_V[0] } }));
      S.skillDecks = { basic: S.cards.map(c => c.uid), s2: [], s3: [] };
      S.origin = s.deck.length ? deckBonus(s.deck.map(d => d.id)) : null;
      S.chapters = [...new Set(s.deck.map(d => WORD[d.id].ch))];
      delete S.deck;
    }
    for (const k of ["basic", "s2", "s3"]) S.skillDecks[k] = S.skillDecks[k] || [];
    S.book = S.book || "5a";   // saves from before books
    S.mode = S.mode || "practice";   // saves from before modes keep their chosen chapters
    return true;
  } catch (e) { return false; }
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

// ---- settings (per laptop, not per character): key bindings, mouse sensitivity, graphics quality ----
const SET_KEY = "seoulmmo_settings";
const ACTIONS = {
  basic: "기본 공격 · basic attack", s2: "스킬 2 · skill 2", s3: "스킬 3 · skill 3", interact: "대화·줍기 · talk / pick up",
  food: "먹기 · eat (snack / gimbap)", target: "대상 바꾸기 · next target", inv: "인벤토리 · inventory", char: "캐릭터 · character",
  deck: "덱 · decks", quests: "퀘스트 · quest log", map: "지도 · map", ach: "업적 · achievements",
  chat: "채팅 · chat", wave: "손 흔들기 · wave", bow: "인사 · bow", sleep: "잠 부적 · sleep talisman", silence: "침묵 부적 · silence talisman", bike: "따릉이 타기 · bike on / off", book: "스킬 북 · skill book", friends: "친구 · friends",
  bar0: "칸 1 · slot 1", bar1: "칸 2 · slot 2", bar2: "칸 3 · slot 3", bar3: "칸 4 · slot 4", bar4: "칸 5 · slot 5", bar5: "칸 6 · slot 6", bar6: "칸 7 · slot 7", bar7: "칸 8 · slot 8", bar8: "칸 9 · slot 9", bar9: "칸 10 · slot 10",
};
const DEFAULT_KEYS = { basic: "1", s2: "2", s3: "3", interact: "e", food: "f", target: "tab", inv: "i", char: "c", deck: "k", quests: "l", map: "m", ach: "y", chat: "enter", wave: "g", bow: "b", sleep: "4", silence: "5", bike: "r", book: "p", friends: "o", bar0: "6", bar1: "7", bar2: "8", bar3: "9", bar4: "0", bar5: "q", bar6: "z", bar7: "x", bar8: "v", bar9: "t" };
const SET = { keys: { ...DEFAULT_KEYS }, sens: 1, quality: "high", music: .5 };
try { const s = JSON.parse(localStorage.getItem(SET_KEY)); if (s) { Object.assign(SET, s); SET.keys = Object.assign({ ...DEFAULT_KEYS }, s.keys || {}); } } catch (e) {}
function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch (e) {} }
const keyName = k => k === " " ? "Space" : k === "tab" ? "Tab" : k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1);
const actionFor = k => Object.keys(SET.keys).find(a => SET.keys[a] === k);
const RESERVED = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift", "escape"]);


function stat(id) { return S.stats[id] || (S.stats[id] = { s: 0, c: 0, w: 0 }); }
function mastery(id) { const s = S.stats[id]; if (!s || !s.s) return { k: "new", ko: "새 단어" }; if (s.c >= 8 && s.c / (s.c + s.w) >= .8) return { k: "mastered", ko: "마스터" }; if (s.c >= 3) return { k: "learned", ko: "배움" }; return { k: "seen", ko: "본 단어" }; }

// deck mix bonus (decision 36, Q5 A)
function deckBonus(ids) {
  const c = { noun: 0, verb: 0, adjective: 0, other: 0 };
  ids.forEach(id => { const p = WORD[id].pos; c[p === "adverb" || p === "other" ? "other" : p]++; });
  const types = Object.values(c).filter(n => n > 0).length;
  if (c.noun >= 5) return { c, hp: .01, dmg: 0, ls: 0, cd: 0, txt: "+1% 최대 체력 (명사 덱)" };
  if (c.verb >= 5) return { c, hp: 0, dmg: .01, ls: 0, cd: 0, txt: "+1% 공격력 (동사 덱)" };
  if (c.adjective >= 5) return { c, hp: 0, dmg: 0, ls: .01, cd: 0, txt: "+1% 흡혈 (형용사 덱)" };
  if (c.other >= 5) return { c, hp: 0, dmg: 0, ls: 0, cd: .01, txt: "−1% 재사용 (부사 덱)" };
  if (types >= 3) return { c, hp: .005, dmg: .005, ls: 0, cd: 0, txt: "균형: 공격 +0.5%, 체력 +0.5%" };
  return { c, hp: 0, dmg: 0, ls: 0, cd: 0, txt: "보너스 없음 · no bonus" };
}

// ---- renderer / scene ------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$("game").appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, .1, 400);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0, .45, .8); composer.addPass(bloom);
composer.addPass(new OutputPass());
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

let world;
const npcs = [], monsters = [], projectiles = [], rings = [], decor = [];
const player = { pos: new THREE.Vector3(), yaw: 0, model: null, hp: 100, maxHp: 100, zone: "station", rootedUntil: 0, lastHurt: -99, dead: false, attackAnim: 0, moving: false };
let target = null, ritual = null, dialog = null, paused = true, started = false, comeBack = [];
let clock = 0;   // real seconds since start (game time)
let night = 0;
const cam = { yaw: Math.PI, pitch: .38, dist: 9 };

// ---- input -----------------------------------------------------------------------------------------
const keys = {};
let dragging = null;
addEventListener("keydown", e => {
  if (rebinding) { e.preventDefault(); const k = e.key.toLowerCase(); if (k === "escape") { rebinding = null; drawSettings(); } else bindKey(k); return; }
  if ((e.target.tagName === "INPUT" || e.target.tagName === "SELECT") && e.key !== "Escape") return;
  initAudio(); unlockMusic();
  const k = e.key.toLowerCase(), act = actionFor(k);
  if (k === "escape") { e.preventDefault(); onEscape(); return; }
  if (act === "tab" || k === "tab") e.preventDefault();
  // the key of an open screen closes it again (toggle)
  const toggles = { char: "charView", deck: "deckView", inv: "invView", quests: "questView", map: "mapView", ach: "achView", book: "bookView", friends: "friendsView" };
  if (started && act && toggles[act] && !$(toggles[act]).hidden) { showScreen(null); paused = false; return; }
  if (order && started) { if (/^[1-9]$/.test(e.key)) orderPick(+e.key - 1); else if (k === "backspace") orderUndo(); return; }
  if (!started || paused) return;
  if (dialog) { const n = +e.key; if (n >= 1 && n <= 9) { const b = $("dOpts").children[n - 1]; if (b) b.click(); } return; }
  if (quiz) { const n = +e.key; if (n >= 1 && n <= 4) answerQuiz(n - 1); return; }
  if (ritual) { const n = +e.key; if (n >= 1 && n <= CHOICES) { e.preventDefault(); pickCard(n - 1); return; } }
  else if (act === "basic" || act === "s2" || act === "s3" || act === "sleep" || act === "silence") { startRitual(act); return; }
  else if (act && /^bar\d$/.test(act)) { useBar(+act.slice(3)); return; }
  if (act === "target") { cycleTarget(); return; }
  if (act === "interact") interact();
  if (act === "food") eatGimbap();
  if (act === "deck") openDeckView();
  if (act === "char") openCharView();
  if (act === "inv") openInventory();
  if (act === "quests") openQuestLog();
  if (act === "map") openMap();
  if (act === "ach") openAchievements();
  if (act === "book") openBook();
  if (act === "friends") openFriends();
  if (act === "chat") { e.preventDefault(); openChat(); return; }
  if (act === "wave") doEmote("wave");
  if (act === "bow") doEmote("bow");
  if (act === "bike") toggleBike();
  keys[k] = true;
});
addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
const cvs = renderer.domElement;
cvs.addEventListener("contextmenu", e => e.preventDefault());
cvs.addEventListener("mousedown", e => { initAudio(); unlockMusic(); dragging = { b: e.button, x: e.clientX, y: e.clientY, moved: 0 }; });
addEventListener("mouseup", e => {
  if (dragging && dragging.moved < 5 && dragging.b === 0 && started && !paused) clickWorld(e);
  dragging = null;
});
addEventListener("mousemove", e => {
  if (!dragging) return;
  const dx = e.movementX, dy = e.movementY; dragging.moved += Math.abs(dx) + Math.abs(dy);
  cam.yaw -= dx * .006 * SET.sens; cam.pitch = Math.min(1.25, Math.max(.05, cam.pitch + dy * .004 * SET.sens));
  if (dragging.b === 2) player.yaw = cam.yaw;
});
cvs.addEventListener("wheel", e => { cam.dist = Math.min(18, Math.max(4, cam.dist + Math.sign(e.deltaY) * .8)); }, { passive: true });

const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
function clickWorld(e) {
  mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const objs = [...monsters.filter(m => !m.dead).map(m => m.model.root), ...npcs.map(n => n.model.root)];
  const hit = ray.intersectObjects(objs, true)[0];
  if (!hit) return;
  let o = hit.object; while (o && !o.userData.ent) o = o.parent;
  if (!o) return;
  const ent = o.userData.ent;
  if (ent.isMonster) setTarget(ent);
  else if (ent.isNpc && dist2(ent.pos, player.pos) < 4.5) talkTo(ent);
  else if (ent.isNpc) toast("더 가까이 가세요 · walk closer");
}

// ---- helpers -------------------------------------------------------------------------------------
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const tmpV = new THREE.Vector3();
function toast(t) { const d = document.createElement("div"); d.textContent = t; $("toast").appendChild(d); setTimeout(() => d.remove(), 2700); while ($("toast").children.length > 3) $("toast").firstChild.remove(); }
function floater(pos, text, color = "#fff", small = false, h = 2.6) {
  tmpV.set(pos.x, (pos.y || 0) + h, pos.z).project(camera);
  if (tmpV.z > 1) return;
  const d = document.createElement("div"); d.className = "fl" + (small ? " small" : ""); d.textContent = text; d.style.color = color;
  d.style.left = (tmpV.x * .5 + .5) * innerWidth + rand(-20, 20) + "px"; d.style.top = (-tmpV.y * .5 + .5) * innerHeight + "px";
  $("floaters").appendChild(d); setTimeout(() => d.remove(), 1300);
}
let fading = false;
function fade(fn) { if (fading) return; fading = true; $("fade").classList.add("on"); setTimeout(() => { fn(); fading = false; setTimeout(() => $("fade").classList.remove("on"), 120); }, 480); }
function speak(key) { if (LINES[key] && !LINES[key].foreign) say([lineClip(key)], { interrupt: true }); }
const gameHour = () => (S.time % 1440) / 60;
const dayNum = () => Math.floor(S.time / 1440) + 1;
function nightFactor() { const h = gameHour(); if (h >= 20 || h < 5) return 1; if (h >= 18.5) return (h - 18.5) / 1.5; if (h < 6.5) return 1 - (h - 5) / 1.5; return 0; }
const buffOn = b => S.buffs[b] && S.buffs[b] > S.time;
function classDef() { return CLASSES[S.cls]; }
// origin bonus: set once from the word types of your very first 10 cards (decision 36, Danny 2026-10-11 Q1 A)
function bonus() { return S.origin || { hp: 0, dmg: 0, ls: 0, cd: 0, txt: "보너스 없음 · no bonus" }; }
const cardBy = uid => S.cards.find(c => c.uid === uid);
const deckCards = k => (S.skillDecks[k === "sleep" || k === "silence" ? "basic" : k] || []).map(cardBy).filter(Boolean);   // spells use the basic deck
const deckIds = k => deckCards(k).map(c => c.id);
const bagCards = () => { const used = new Set([...Object.values(S.skillDecks).flat(), ...S.bank.cards]); return S.cards.filter(c => !used.has(c.uid)); };
// ---- inventory: S.items = [{uid, g}], S.equip = {weapon, armor, trinket} (uids) ----
const itemBy = uid => S.items.find(i => i.uid === uid);
function gearName(g) { const d = GEAR[g]; return d.slot === "weapon" ? classDef().weapons[d.tier] : d.ko; }
function gearInfo(g) { const d = GEAR[g]; if (d.slot === "weapon") return `공격력 ×${WEAPON_MULT[d.tier]}`; return [d.hp && `체력 +${Math.round(d.hp * 100)}%`, d.dmg && `공격력 +${Math.round(d.dmg * 100)}%`, d.ls && `흡혈 ${Math.round(d.ls * 100)}%`].filter(Boolean).join(", ") || "보너스 없음"; }
const gearPrice = g => GEAR[g].slot === "weapon" ? WEAPON_PRICE[GEAR[g].tier] : GEAR[g].price;
const itemName = it => gearName(it.g) + (it.up ? ` +${it.up}` : "");
function weaponMult() { const it = itemBy(S.equip.weapon); return WEAPON_MULT[it ? GEAR[it.g].tier : 0] * (1 + .05 * (it?.up || 0)); }
function itemInfo(it) { const up = it.up || 0, d = GEAR[it.g]; if (!up) return gearInfo(it.g); if (d.slot === "weapon") return `공격력 ×${(WEAPON_MULT[d.tier] * (1 + .05 * up)).toFixed(2)}`; if (d.slot === "armor") return `체력 +${Math.round((d.hp + .03 * up) * 100)}%`; return gearInfo(it.g) + ` ×${(1 + .2 * up).toFixed(1)}`; }
function weaponTier() { const it = itemBy(S.equip.weapon); return it ? GEAR[it.g].tier : 0; }
function gearStat(k) { let v = 0; for (const slot in S.equip) { const it = itemBy(S.equip[slot]); if (!it) continue; const d = GEAR[it.g], up = it.up || 0; if (d[k]) v += d[k] * (d.slot === "trinket" ? 1 + .2 * up : 1); if (k === "hp" && d.slot === "armor") v += .03 * up; } return v; }
function addItem(g, equip = false) { const it = { uid: newUid(), g }; S.items.push(it); if (equip) S.equip[GEAR[g].slot] = it.uid; return it; }
function ensureGear() {            // new characters and saves from before the inventory
  if (!S.items) S.items = [];
  if (!S.equip) S.equip = {};
  if (!S.equip.weapon) addItem("w" + Math.min(2, S.weapon || 0), true);
  if (!S.equip.armor && !S.items.some(i => GEAR[i.g].slot === "armor")) addItem("a0", true);
}
function skillBlock(k) {          // why a skill can't be used right now (null = ready)
  const sk = skillDef(k);
  if (k === "silence" && !S.spells?.silence) return "부적 선생님이 나중에 가르쳐 줘요 · the talisman teacher teaches it later (after the tunnel)";
  if (k === "sleep" && !S.spells?.sleep) return "부적 선생님에게 배워요 · learn it from the talisman teacher (서교 아파트 정자)";
  if (S.level < sk.lvl) return `Lv ${sk.lvl}에 배워요 · learned at level ${sk.lvl}`;
  const n = deckCards(k).length;
  if (n < 10) return `카드 ${n}/10 · this skill needs 10 cards (K)`;
  return null;
}
// ---- level + XP (Danny 2026-10-11): XP from kills and from mastering a word; a level = +5% health, +4% damage ----
const MAX_LEVEL = 20, MASTER_XP = 15;
// Danny 2026-10-12: one book should take about 10 hours, a new chapter every 2 levels (8과 at Lv 15)
const xpNeed = L => Math.round(100 * Math.pow(L, 1.6) / 10) * 10;
const lvlHp = () => 1 + .05 * (S.level - 1), lvlDmg = () => 1 + .04 * (S.level - 1);
// monsters far below your level give little XP (no farming the first street), stronger ones give more
// level gap (Danny 2026-10-17): up to 2 levels above you is a fair fight ("Lv 3 vs Lv 5 should not be punished");
// every level beyond that the monster deals +25% damage to you (max x3) and takes -15% from you (min x0.2). Monsters 2+ levels below you: a small bonus (max 25%).
const lvlGap = lv => (lv || S.level) - S.level;
const gapTaken = lv => { const g = lvlGap(lv); return g > 2 ? Math.min(3, 1 + .25 * (g - 2)) : g < -1 ? Math.max(.75, 1 + .05 * (g + 1)) : 1; };
const gapDealt = lv => { const g = lvlGap(lv); return g > 2 ? Math.max(.2, 1 - .15 * (g - 2)) : g < -1 ? Math.min(1.25, 1 - .05 * (g + 1)) : 1; };
const gapClass = lv => { const g = lvlGap(lv); return g >= 5 ? "lv-red" : g >= 3 ? "lv-orange" : g >= -1 ? "lv-yellow" : g >= -4 ? "lv-green" : "lv-gray"; };
const monsterXp = m => m.def.xp * (1 + .3 * (m.lvl - m.def.lvl)) * Math.max(.2, Math.min(1.5, 1 + .2 * (m.lvl - S.level)));
function gainXp(n, at) {
  if (S.level >= MAX_LEVEL) return;
  n = Math.round(n); S.xp += n;
  floater(at || player.pos, `+${n} XP`, "#c3b2ff", true, at ? 2 : 3.2);
  while (S.level < MAX_LEVEL && S.xp >= xpNeed(S.level)) {
    S.xp -= xpNeed(S.level); S.level++; recalcMax(); player.hp = player.maxHp; learnSkills(true); syncStory(true); setTimeout(aptHint, 2500);
    toast(`레벨 업! Lv ${S.level} · health +5%, damage +4%`); SFX.pickup(); floater(player.pos, "LEVEL UP!", "#ffd23d", false, 3.4);
  }
  save();
}
function recalcMax() { const keep = player.hp / player.maxHp; player.maxHp = Math.round(classDef().hp * (1 + bonus().hp + gearStat("hp")) * lvlHp() * (player.lsUntil > clock ? 1.3 : 1) * (player.cryUntil > clock ? 1.1 : 1)); player.hp = Math.min(player.maxHp, isFinite(keep) ? keep * player.maxHp : player.maxHp); }

// ---- collision -----------------------------------------------------------------------------------
const ZONES = ["street", "dungeon", "yeouido", "tower", "market"], RZONES = { dungeon: DUNGEON, tower: TOWER, yeouido: YEOUIDO, market: MARKET };
const isDun = z => z === "dungeon" || z === "tower" || z === "market";
function collide(p, r = .45, zone = player.zone) {
  const RZ = RZONES[zone];
  if (RZ) for (const c of RZ.pillars) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-4) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; } }
  for (const c of world.colliders[zone] || []) {
    if (c.r !== undefined) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
      if (d < m && d > 1e-4) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; }
    } else if (p.x > c.x0 - r && p.x < c.x1 + r && p.z > c.z0 - r && p.z < c.z1 + r) {
      const pen = [p.x - (c.x0 - r), (c.x1 + r) - p.x, p.z - (c.z0 - r), (c.z1 + r) - p.z], i = pen.indexOf(Math.min(...pen));
      if (i === 0) p.x = c.x0 - r; else if (i === 1) p.x = c.x1 + r; else if (i === 2) p.z = c.z0 - r; else p.z = c.z1 + r;
    }
  }
  if (RZ) { clampDungeon(p, r, RZ.wrects); if (zone === "tower" && !tw.open) doorClamp(p, r); return; }
  if (zone === "street") { p.x = Math.min(STREET.maxX, Math.max(STREET.minX, p.x)); p.z = Math.min(STREET.maxZ, Math.max(STREET.minZ, p.z)); }
  else { p.x = Math.min(STATION.x + 17.3, Math.max(STATION.x - 17.3, p.x)); p.z = Math.min(STATION.z + 9.6, Math.max(STATION.z - 9.3, p.z)); }
}

// ---- monsters --------------------------------------------------------------------------------------
const spawnPoints = [];
// Overworld = 1 against 1 (Danny, 2026-10-11: 2v1 only in dungeons, where a 2nd player is recommended).
// The first ~30 m past the station exit are empty; spawn points sit ~14 m apart in a zigzag (more than any
// aggro range), and a monster never joins a fight on its own while another one is already on you.
// spawn points come from the district plan in world.js (open ground, ~25 m apart, none near the subway exit)
function makeSpawnPoints() {
  for (const sp of SPAWNS) {
    const p = { x: sp.x, z: sp.z };
    collide(p, 1.2, "street");
    spawnPoints.push({ x: p.x, z: p.z, kind: sp.kind, lvl: sp.lvl, mon: null, respawnAt: 0, nightOnly: !!sp.night, alien: !!sp.alien });
  }
}
const fighting = except => monsters.some(o => o !== except && !o.dead && o.state === "chase");
let monId = 0;
const BIG_NAMES = { dokkaebi: "큰 도깨비", vine: "가시 덩굴 귀신", haetae: "성난 해태 석상" };   // 2+ levels above normal
function spawnMonster(sp) {
  const def = MONS[sp.kind], model = makeMonster(def.model || sp.kind), lvl = sp.lvl || def.lvl, up = lvl - def.lvl, hp = Math.round(def.hp * (1 + .25 * up));
  const m = { isMonster: true, id: ++monId, kind: sp.kind, def, sp, model, lvl, mul: 1 + .15 * up, name: up >= 2 && BIG_NAMES[sp.kind] ? BIG_NAMES[sp.kind] : def.ko, pos: new THREE.Vector3(sp.x, 0, sp.z), yaw: rand(0, 6.28), hp, maxHp: hp,
    state: "idle", wander: null, wanderT: rand(1, 4), atkCd: rand(.5, 1.5), slamCd: def.slam ? def.slam.every * .6 : 0, slamT: 0, slamAnim: 0, attackAnim: 0, dead: false, deadT: 0, missed: new Set(), plate: null };
  const sc = (def.scale || (sp.kind === "dokkaebi" ? .8 : 1)) * (1 + .1 * up); model.root.scale.setScalar(sc); model.height *= sc;   // "little" goblin; big ones grow
  m.zone = sp.zone || "street"; m.baseScale = sc;
  model.root.userData.ent = m; model.root.position.copy(m.pos); scene.add(model.root);
  m.plate = document.createElement("div"); m.plate.className = "plate"; m.plate.innerHTML = `<div class="n"><span class="lv">Lv ${lvl}</span> ${m.name}</div><div class="pb"><i></i></div>`; $("plates").appendChild(m.plate);
  monsters.push(m); sp.mon = m;
}
// monsters only come back when you enter the street again (Danny 2026-10-11): a cleared street stays cleared
function populateStreet() {
  if (NET.role === "guest") { netSend({ t: "enter" }); return; }   // in co-op the host's world fills the street
  night = nightFactor();
  for (const sp of spawnPoints) if (!sp.mon && (!sp.nightOnly || night > .5) && (!sp.alien || Math.random() < .4)) spawnMonster(sp);
}
function aggroRange(m) { return m.def.aggro * (night > .5 ? 1.25 : 1); }

function despawn(m, i) { scene.remove(m.model.root); m.plate.remove(); monsters.splice(i, 1); m.sp.mon = null; m.sp.respawnAt = clock + 5; if (target === m) setTarget(null); }
function aggro(m) {
  if (isDun(m.zone) && m.state !== "chase") for (const o of monsters) if (o !== m && !o.dead && !o.caged && o.zone === m.zone && o.state !== "chase" && dist2(o.pos, m.pos) < (m.def.boss || o.def.boss ? 20 : 14)) { o.state = "chase"; o.tgtId = m.tgtId; } if (m.state !== "chase") { m.state = "chase"; SFX.groan(); } }
function faceToward(m, p, dt) { const want = Math.atan2(-(p.x - m.pos.x), -(p.z - m.pos.z)); let d = want - m.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); m.yaw += d * Math.min(1, dt * 8); }
function moveToward(m, p, sp, dt) { const dx = p.x - m.pos.x, dz = p.z - m.pos.z, d = Math.hypot(dx, dz); if (d < 1e-3) return; m.pos.x += dx / d * sp * dt; m.pos.z += dz / d * sp * dt; faceToward(m, p, dt); }
const shockMat = new THREE.MeshBasicMaterial({ color: "#fff36a", toneMapped: false });
const thornGeo = new THREE.IcosahedronGeometry(.22, 0), thornMat = toon("#6fbb48", { emissive: new THREE.Color("#2a5a10"), emissiveIntensity: .6 });
function makeRing(at, r, tele, color = "#ff3a2a") {
  const g = new THREE.RingGeometry(r * .92, r, 40), mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(g, mat); ring.rotation.x = -Math.PI / 2; ring.position.set(at.x, .05, at.z); scene.add(ring);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .25, depthWrite: false }));
  fill.rotation.x = -Math.PI / 2; fill.position.set(at.x, .04, at.z); fill.scale.setScalar(.01); scene.add(fill);
  const o = { ring, fill, t: 0, tele }; rings.push(o); return o;
}
function updateRings(dt) {
  for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; r.fill.scale.setScalar(Math.max(.01, Math.min(1, r.t / r.tele))); if (r.t >= r.tele + .15) { scene.remove(r.ring, r.fill); rings.splice(i, 1); } }
}

// ---- player damage / death ---------------------------------------------------------------------------
function hurt(amount, src, raw = false) {
  if (player.dead || player.zone === "station") return;
  if (player.riding) { setRiding(false); floater(player.pos, "넘어졌어요! · knocked off the bike", "#ffd23d", true, 3.4); }
  const cd = classDef();
  if (!raw && cd.mitig) amount *= 1 - cd.mitig;
  if (!raw && player.guardUntil > clock) amount *= 1 - .5;   // 철벽
  if (!raw && src && src.lvl) amount *= gapTaken(src.lvl);   // level gap
  amount = Math.round(amount);
  if (player.invulnUntil > clock) { floater(player.pos, "무적 · untouchable", "#ffd23d", true, 2.4); return; }
  if (player.absorb && player.absorb.v > 0) { const a = Math.min(player.absorb.v, amount); player.absorb.v -= a; amount -= a; floater(player.pos, `🛡 -${Math.round(a)}`, "#9ec8ff", true, 2.6); if (amount <= 0) return; }
  if (src && src.isMonster && !src.dead && player.reflectUntil > clock) dealDamage(src, Math.round(amount * .6));
  if (cd.unbreak && player.hp >= player.maxHp - .01 && amount >= player.hp) { player.hp = 1; floater(player.pos, "불굴! 1 HP", "#ffd23d"); }
  else player.hp -= amount;
  player.lastHurt = clock; player.model.trigger?.("hit");
  floater(player.pos, "-" + amount, "#ff7a6a", true, 2.2);
  $("vignette").classList.add("hit"); setTimeout(() => $("vignette").classList.remove("hit"), 120);
  SFX.hurt();
  if (src && src.def && src.def.root && !raw && Math.random() < src.def.root.chance) { player.rootedUntil = clock + src.def.root.dur; floater(player.pos, "덩굴에 묶임! · rooted", "#9be66a", true, 3); }
  if (player.hp <= 0 && player.cheatUntil > clock) { player.cheatUntil = 0; player.hp = player.maxHp * .3; floater(player.pos, "🕯 혼이 돌아왔어요! · the soul returns", "#ffd23d", false, 3.4); }
  if (player.hp <= 0) die();
}
function die() {
  player.diedIn = player.zone; player.dead = true; player.hp = 0; cancelRitual(); closeDialog(); setTarget(null); if (quiz) { $("quiz").hidden = true; quiz = null; }
  for (const m of monsters) if (m.state === "chase" && m.tgtId === myId()) { m.state = "return"; m.tgtId = null; }
  if (NET.role && [...remotes.values()].some(r => !r.dead && r.zone === player.zone)) { downed(); return; }
  setTimeout(() => { $("deathScreen").hidden = false; }, 900);
  setTimeout(respawnNow, 3400);
}
function respawnNow() {
  $("downed").hidden = true;
  {
    fade(() => {
      $("deathScreen").hidden = true; player.dead = false; player.hp = player.maxHp; player.rootedUntil = 0;
      if (player.diedIn === "yeouido" && (S.camp || 0) >= 5) { player.zone = "yeouido"; const b = BEDROLL(); player.pos.set(b.x + 1.5, 0, b.z + 2); const y = npcs.find(n => n.kind === "gayoung"); if (y) showLine(y, "y_wake", [{ plr: "p_yes", act: closeDialog }]); return; }
      toStation(); const g = npcs.find(n => n.kind === "guard"); if (g) showLine(g, "g_wake", [{ plr: "p_yes", act: closeDialog }]);
    });
  }
}

// ---- target -----------------------------------------------------------------------------------------
const tRing = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.3, 32), new THREE.MeshBasicMaterial({ color: "#ffd23d", transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false }));
tRing.rotation.x = -Math.PI / 2; tRing.visible = false; scene.add(tRing);
function setTarget(m) { target = m; tRing.visible = !!m; $("tframe").hidden = !m; if (m) { $("tName").textContent = m.name; const g = lvlGap(m.lvl); $("tSub").className = gapClass(m.lvl); $("tSub").textContent = `Lv ${m.lvl} · ${m.def.en}` + (g > 2 ? ` · ⚠ 너무 강해요 · too strong: it hits ×${gapTaken(m.lvl).toFixed(1)}, you hit ×${gapDealt(m.lvl).toFixed(1)}` : g < -1 ? " · 약해요 · weak" : ""); } }
function cycleTarget() {
  if (player.zone === "station") return;
  const list = monsters.filter(m => !m.dead && m.zone === player.zone && !m.caged && dist2(m.pos, player.pos) < 40).sort((a, b) => dist2(a.pos, player.pos) - dist2(b.pos, player.pos));
  if (!list.length) { setTarget(null); toast("주변에 괴물이 없어요 · no monster nearby"); return; }
  const i = list.indexOf(target); setTarget(list[(i + 1) % list.length]);
}

// ---- the ritual (decisions 1, 8, 9, 17, 35) -------------------------------------------------------------
// every skill draws its cards from its own deck; the basic attack asks 1 word, stronger skills more
const cds = { basic: 0, s2: 0, s3: 0, sleep: 0, silence: 0 }, comeBacks = { basic: [], s2: [], s3: [], sleep: [], silence: [] };
function startRitual(k = "basic") {
  if (player.dead || dialog || ritual) return;
  if (player.riding) setRiding(false);
  if (player.zone === "station") { toast("역 안은 안전해요 · no fighting in the station"); return; }
  const block = skillBlock(k); if (block) { toast(block); return; }
  const skP = skillDef(k);
  if (!skP.self && (!target || target.dead)) { cycleTarget(); if (!target) return; }
  if (clock < (cds[k] || 0)) { toast(`아직 준비 중 · not ready (${Math.ceil(cds[k] - clock)} s)`); return; }
  const sk = skillDef(k), range = (sk.range || classDef().range) + (k === "basic" && player.hawkUntil > clock ? 5 : 0);
  if (!sk.self && dist2(target.pos, player.pos) > range + .5) { toast(`너무 멀어요 · too far (${range} m)`); return; }
  const ids = deckIds(k);
  const back = [...new Set(comeBacks[k] || [])].filter(id => ids.includes(id)); comeBacks[k] = [];
  const words = back.concat(shuffle(ids.filter(id => !back.includes(id)))).slice(0, sk.cards);
  ritual = { k, sk, words, idx: 0, results: [], target: sk.self ? selfTarget() : target, lock: false };
  if (!sk.self) aggro(target);
  $("ritual").hidden = false;
  $("rSlots").innerHTML = words.map(() => '<div class="rslot"></div>').join("");
  showRitualCard();
  SFX.open();
}
function showRitualCard() {
  const r = ritual, id = r.words[r.idx], w = WORD[id];
  r.lock = false;
  $("rStep").textContent = `${classDef().ko} · ${r.sk.ko} · 카드 ${r.idx + 1} / ${r.words.length}`;
  $("rEn").textContent = w.en;
  [...$("rSlots").children].forEach((s, i) => s.classList.toggle("cur", i === r.idx));
  const cards = deckCards(r.k);
  const others = shuffle(cards.map(c => c.id).filter(x => x !== id)).slice(0, CHOICES - 1);
  r.opts = shuffle([id, ...others]);
  $("rCards").innerHTML = "";
  r.opts.forEach((oid, i) => {
    const card = cards.find(c => c.id === oid), b = document.createElement("button"); b.className = "rcard";
    b.style.borderColor = RARITY[card.rar].c;
    b.innerHTML = `<kbd>${i + 1}</kbd>${card.mod.t === "el" ? `<em style="color:${ELEMENTS[card.mod.el].c}">${ELEMENTS[card.mod.el].ko}</em>` : ""}${WORD[oid].kr}`;
    b.onclick = () => pickCard(i); $("rCards").appendChild(b);
  });
  stat(id).s++;
}
function pickCard(i) {
  const r = ritual; if (!r || r.lock) return; r.lock = true;
  const id = r.words[r.idx], chosen = r.opts[i], ok = chosen === id, btns = $("rCards").children;
  btns[i].classList.add(ok ? "ok" : "no");
  const slot = $("rSlots").children[r.idx];
  if (ok) {
    stat(id).c++; slot.className = "rslot ok"; slot.textContent = WORD[id].kr;
    if (mastery(id).k === "mastered" && !S.mastered.includes(id)) { S.mastered.push(id); toast(`마스터! ${WORD[id].kr} · +${MASTER_XP} XP`); gainXp(MASTER_XP); }
    say([wordClip(id)], { interrupt: true }); SFX.select();
    if (classDef().heal) { const h = player.maxHp * classDef().heal; player.hp = Math.min(player.maxHp, player.hp + h); floater(player.pos, "+" + Math.round(h), "#9be6a5", true, 2.2); }
  } else {
    stat(id).w++; slot.className = "rslot no"; slot.textContent = "✗";
    btns[r.opts.indexOf(id)].classList.add("ok");
    (comeBacks[r.k] = comeBacks[r.k] || []).push(id); r.target.missed.add(id);
    SFX.resist(); hurt(BACKFIRE, null, true);
    floater(player.pos, "역풍 · backfire", "#ff9c8e", true, 3);
  }
  r.results.push({ id, ok });
  setTimeout(() => {
    if (ritual !== r) return;
    r.idx++;
    if (r.idx < r.words.length) showRitualCard(); else castRitual();
  }, ok ? 260 : 850);
}
function cancelRitual() { if (!ritual) return; ritual = null; $("ritual").hidden = true; }
function castRitual() {
  const r = ritual; ritual = null; $("ritual").hidden = true;
  if (r.revive) { const ok = r.results.filter(x => x.ok).length; if (ok >= 2) { netSend({ t: "rev", to: r.revive }); toast("살렸어요! · revived"); SFX.heal(); } else toast("다시 해 보세요 · try again (2 of 3 right)"); return; }
  const sk = r.sk, deck = deckCards(r.k);
  const correct = r.results.filter(x => x.ok);
  const cards = correct.map(x => deck.find(c => c.id === x.id)).filter(Boolean);
  const sumMod = t => cards.reduce((s, c) => s + (c.mod.t === t ? c.mod.v : 0), 0);
  const b = bonus();
  cds[r.k] = clock + sk.cd * Math.max(.5, 1 - sumMod("cd") - b.cd) * (r.k === "basic" && player.hawkUntil > clock ? .5 : 1);
  if (!correct.length) { cds[r.k] = clock + Math.min(sk.cd, 3); toast("주문 실패! · the attack fizzled"); SFX.empty(); floater(player.pos, "실패", "#aaa", true, 2.8); return; }
  const t = r.target, range = (sk.range || classDef().range) + (r.k === "basic" && player.hawkUntil > clock ? 5 : 0);
  if (t.dead || dist2(t.pos, player.pos) > range + 4) { toast("빗나갔어요 · it got away"); return; }
  if (sk.silence) { if (!t.def.alien) toast("외계인에게만 통해요 · it only works on aliens"); else applySilence(t, sk.silence * correct.length / sk.cards); return; }
  if (sk.sleep) { if (t.def.boss) toast("대장은 잠들지 않아요 · bosses don't sleep"); else applySleep(t, sk.sleep * correct.length / sk.cards); return; }
  // damage of this cast against any monster (area skills hit several, each with its own weaknesses)
  const calc = (tt, mult = sk.mult) => {
    let total = 0, weak = false, imm = false;
    const per = BASE_ATTACK * mult / sk.cards * classDef().dmg * weaponMult() * lvlDmg() * companionDamageMul(tt);
    for (const c of cards) {
      let part = per;
      if (c.mod.t === "el" && c.mod.el === tt.def.weak) { part *= EL_MULT[c.rar]; weak = true; }
      if (!sk.pierce && c.mod.t === "el" && c.mod.el === tt.def.immune) { part = 0; imm = true; }
      if (sk.fire && tt.def.weak === "fire") { part *= 1.5; weak = true; }
      if (!sk.pierce && sk.fire && tt.def.immune === "fire") { part = 0; imm = true; }
      total += part;
    }
    total *= (1 + sumMod("dmg") + b.dmg + gearStat("dmg")) * (buffOn("dmg") ? 1.05 : 1) * (S.hunger <= 0 ? HUNGRY_MULT : 1) * (player.cryUntil > clock ? 1.15 : 1) * gapDealt(tt.lvl) * rand(.9, 1.1);
    return { dmg: Math.max(imm && total < 1 ? 0 : 1, Math.round(total)), weak, imm };
  };
  const { dmg, weak: weakHit, imm: immuneHit } = calc(t, sk.execute ? (t.hp / t.maxHp < .25 ? 5 : 1) : sk.mult);
  if (sk.fx && extraFx(sk, t, calc, correct.length / sk.cards)) return;
  if (sk.leap) leapBack(t, sk.leap);
  player.yaw = Math.atan2(-(t.pos.x - player.pos.x), -(t.pos.z - player.pos.z)); player.attackAnim = 1; player.model.trigger?.("attack");
  const ls = sumMod("ls") + b.ls + gearStat("ls"), share = correct.length / sk.cards;
  // skill effects that don't depend on hitting
  if (sk.heal) { const h = player.maxHp * sk.heal * share; player.hp = Math.min(player.maxHp, player.hp + h); floater(player.pos, "+" + Math.round(h), "#9be6a5", false, 2.6); SFX.heal(); }
  if (sk.guard) { player.guardUntil = clock + sk.guard.dur; floater(player.pos, "철벽!", "#9ec8ff", false, 3); }
  const land = () => {
    if (t.dead) return;
    if (sk.noHit) { addDot(t, dmg, sk.burn.dur); if (dmg > 0) floater(t.pos, "🔥 " + sk.ko, "#ff8a3a", false, t.model.height); SFX.shotGood(); return; }
    if (dealDamage(t, dmg, sk.slow ? sk.slow.dur : 0) === false) return;
    if (sk.burn) addDot(t, Math.round(dmg * sk.burn.mult / sk.mult), sk.burn.dur);
    if (sk.stun) applyCC(t, "stun", sk.stun);
    if (sk.slow) { floater(t.pos, "느려짐 · slowed", "#9ec8ff", true, t.model.height + .4); }
    const col = weakHit ? "#ffb347" : immuneHit && dmg === 0 ? "#aaa" : "#fff";
    floater(t.pos, dmg + (weakHit ? " 약점!" : "") + (immuneHit ? " (면역)" : ""), col, false, t.model.height);
    if (ls > 0) { const h = dmg * ls; player.hp = Math.min(player.maxHp, player.hp + h); }
    SFX.shotGood();
  };
  if (S.cls === "geomgaek") {
    if (sk.range) {                      // 돌진 베기: dash next to the target first
      const dx = t.pos.x - player.pos.x, dz = t.pos.z - player.pos.z, d = Math.hypot(dx, dz);
      if (d > 2.6) { player.pos.x += dx / d * (d - 2.2); player.pos.z += dz / d * (d - 2.2); collide(player.pos); }
    }
    SFX.dash(); setTimeout(land, 200);
  } else shootSpell(t, land);
}
const talismanMat = toon("#f2df7a", { emissive: new THREE.Color("#ffcc33"), emissiveIntensity: .6 });
function shootSpell(t, land) {
  const g = S.cls === "mudang" ? new THREE.BoxGeometry(.25, .4, .03) : new THREE.CylinderGeometry(.03, .03, 1.1, 5);
  const mesh = new THREE.Mesh(g, S.cls === "mudang" ? talismanMat : toon("#d9c7a0"));
  mesh.position.set(player.pos.x, 1.6, player.pos.z); scene.add(mesh);
  projectiles.push({ mesh, target: t, speed: S.cls === "mudang" ? 16 : 30, land, life: 3, spin: S.cls === "mudang" });
  SFX.shot();
}
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]; p.life -= dt;
    if (p.target) {
      const to = tmpV.set(p.target.pos.x, 1.4, p.target.pos.z), d = to.distanceTo(p.mesh.position);
      if (d < .6 || p.life <= 0) { p.land(); scene.remove(p.mesh); projectiles.splice(i, 1); continue; }
      p.mesh.position.add(to.sub(p.mesh.position).normalize().multiplyScalar(Math.min(d, p.speed * dt)));
      p.mesh.lookAt(p.target.pos.x, 1.4, p.target.pos.z); if (!p.spin) p.mesh.rotateX(Math.PI / 2); else p.mesh.rotation.z += dt * 12;
    } else {
      p.mesh.position.addScaledVector(p.vel, dt); p.mesh.rotation.x += dt * 8;
      const pp = player.pos;
      if (!player.dead && player.zone !== "station" && Math.hypot(p.mesh.position.x - pp.x, p.mesh.position.z - pp.z) < (p.r || .7) && p.mesh.position.y < 2.4) { hurt(p.dmg, p.src); scene.remove(p.mesh); projectiles.splice(i, 1); continue; }
      if (p.life <= 0) { scene.remove(p.mesh); projectiles.splice(i, 1); }
    }
  }
}
// after a won battle: an example sentence for every missed word (decision 8)
function showMissed(ids) {
  if (!ids.length) return;
  const list = $("afterList"); list.innerHTML = "";
  for (const id of ids) {
    const w = WORD[id], d = document.createElement("div"); d.className = "mw";
    d.innerHTML = `<div class="k"><b>${w.kr}</b><span>${w.en}</span><button class="say" data-w="${id}">🔊 단어</button></div>` +
      (w.ex ? `<div class="s">${w.ex[0]}</div><div class="e">${w.ex[1]}</div><div><button class="say" data-x="${id}">🔊 문장</button></div>` : "");
    list.appendChild(d);
  }
  list.querySelectorAll(".say").forEach(b => b.onclick = () => say([b.dataset.w ? wordClip(b.dataset.w) : exClip(b.dataset.x)], { interrupt: true }));
  $("after").hidden = false;
  const first = ids[0]; if (WORD[first].ex) say([wordClip(first), exClip(first)], { interrupt: true });
}
$("afterClose").onclick = () => $("after").hidden = true;

// ---- hunger, food -------------------------------------------------------------------------------------
function eat(food) {
  const fk = Object.keys(FOODS).find(k => FOODS[k] === food); if (fk) S.ate[fk] = 1;
  S.hunger = Math.min(100, S.hunger + food.fill);
  if (food.buff) S.buffs[food.buff] = S.time + 60;
  SFX.heal(); floater(player.pos, food.ko + " 냠냠", "#ffe7a8", true, 2.6);
}
function eatGimbap() {
  for (const k of Object.keys(SNACKS)) if (eatSnack(k)) return;
  if (!S.gimbap) { toast("먹을 게 없어요 · no food (gimbap at the restaurant, snacks at the 편의점)"); return; }
  if (S.hunger >= 95) { toast("배불러요 · you're full"); return; }
  S.gimbap--; eat(FOODS.gimbap); save();
}

// ---- NPCs + dialogue ----------------------------------------------------------------------------------------
const NPC_DEF = { driver: "기관사 아저씨", teacher: "부적 선생님", gyeongbi: "경비 아저씨", minsu: "민수 · 생존자", jieun: "지은", grandma: "사장님 · 할머니 식당", smith: "무기점 아저씨", stranger: "낯선 사람", guard: "역무원", trader: "카드 상인 · card trader", sitter: "생존자", sua: "수아", clerk: "편의점 알바", gayoung: "가영 · 생존자", mike: "Mike · 여행자", granny: "기억하는 할머니", gangsa: "박 선생님 · 학원 강사", cupbap: "컵밥 아줌마" };
function placeNPCs() {
  const sp = world.npcSpots;
  sp.trader = { x: STATION.x + 5, z: STATION.z - 8.6, face: 0 };
  for (const kind of ["grandma", "smith", "stranger", "guard", "trader", "driver"]) {
    const model = kayReady() && (kind === "smith" || kind === "stranger" || kind === "trader") ? makeKay(kind) : makeNPC(kind === "trader" ? "sitter" : kind === "driver" ? "guard" : kind), at = sp[kind], n = { isNpc: true, kind, model, pos: new THREE.Vector3(at.x, 0, at.z), name: NPC_DEF[kind] };
    model.root.position.copy(n.pos); model.root.rotation.y = at.face; model.root.userData.ent = n; scene.add(model.root);
    n.plate = document.createElement("div"); n.plate.className = "plate npc"; n.plate.textContent = NPC_DEF[kind]; $("plates").appendChild(n.plate);
    npcs.push(n);
  }
  for (const kind of ["minsu", "jieun", "gyeongbi", "teacher", "sua", "clerk"]) {
    const at = STREET_NPCS[kind], model = kind === "gyeongbi" ? makeNPC("guard") : kayReady() ? makeKay(kind) : makeNPC("sitter"), n = { isNpc: true, kind, zone: "street", model, pos: new THREE.Vector3(at.x, 0, at.z), name: NPC_DEF[kind] };
    model.root.position.copy(n.pos); model.root.rotation.y = at.face; model.root.userData.ent = n; scene.add(model.root);
    n.plate = document.createElement("div"); n.plate.className = "plate npc"; $("plates").appendChild(n.plate);
    npcs.push(n); colliders_street_push(n.pos);
  }
  {
    const at = YEOUIDO.npc, model = kayReady() ? makeKay("gayoung") : makeNPC("sitter"), n = { isNpc: true, kind: "gayoung", zone: "yeouido", model, pos: new THREE.Vector3(at.x, 0, at.z), name: NPC_DEF.gayoung };
    model.root.position.copy(n.pos); model.root.rotation.y = Math.PI; model.root.userData.ent = n; scene.add(model.root);
    n.plate = document.createElement("div"); n.plate.className = "plate npc"; $("plates").appendChild(n.plate);
    npcs.push(n); world.colliders.yeouido.push({ x: at.x, z: at.z, r: .6 });
  }
  for (const [kind, at, mdl] of [["gangsa", YEOUIDO.npcTeacher, () => kayReady() ? makeKay("gangsa") : makeNPC("sitter")], ["cupbap", YEOUIDO.npcCupbap, () => makeNPC("grandma")]]) {
    const model = mdl(), n = { isNpc: true, kind, zone: "yeouido", model, pos: new THREE.Vector3(at.x, 0, at.z), name: NPC_DEF[kind] };
    model.root.position.copy(n.pos); model.root.rotation.y = Math.PI; model.root.userData.ent = n; scene.add(model.root);
    n.plate = document.createElement("div"); n.plate.className = "plate npc"; $("plates").appendChild(n.plate);
    npcs.push(n); world.colliders.yeouido.push({ x: at.x, z: at.z, r: .6 });
  }
  for (const [kind, at, zone, mdl] of [["mike", MIKE_SPOTS[0], MIKE_SPOTS[0].zone, () => kayReady() ? makeKay("mike") : makeNPC("sitter")], ["granny", { x: 5, z: 121 }, "street", () => makeNPC("grandma")]]) {
    const model = mdl(), n = { isNpc: true, kind, zone, model, pos: new THREE.Vector3(at.x, 0, at.z), name: NPC_DEF[kind] };
    if (kind === "mike") { const bag = new THREE.Mesh(new THREE.BoxGeometry(.6, .8, .35), toon("#c8402f")); bag.position.set(0, 1.4, .32); bag.castShadow = true; model.root.add(bag); }
    model.root.position.copy(n.pos); model.root.rotation.y = Math.PI; model.root.userData.ent = n; scene.add(model.root);
    n.plate = document.createElement("div"); n.plate.className = "plate npc"; $("plates").appendChild(n.plate);
    npcs.push(n); if (kind === "granny") colliders_street_push(n.pos);
  }
  sp.sitters.forEach((s, i) => {
    const m = kayReady() ? makeKay(i ? "sitterB" : "sitterA") : makeNPC("sitter");
    m.root.position.set(s.x, kayReady() ? 0 : -.45, s.z); m.root.rotation.y = -Math.PI / 2; scene.add(m.root); decor.push(m);
  });
}
function colliders_street_push(p) { world.colliders.street.push({ x: p.x, z: p.z, r: .6 }); }
// 지은 only shows up once Minsu has asked you to find her, and leaves when you've found her
function syncQuestNpcs() { const j = npcs.find(n => n.kind === "jieun"); if (j) j.model.root.visible = S.quests.sister?.st === "active" && !S.quests.sister.found; const su = npcs.find(n => n.kind === "sua"); if (su) su.model.root.visible = S.companion !== "gumiho"; }
// Korean particle 와/과: 과 after a final consonant (받침)
const wa = w => { const c = w.trim().slice(-1).charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 && c % 28 ? "과" : "와"; };
function subsFor(key) { if (transNow) return true; if (LINES[key]?.hard) return false; if (S.subs === "always") return true; if (S.subs === "never") return false; return (S.heard[key] || 0) < 3; }
function showLine(npc, key, opts) {
  const L = LINES[key];
  dialog = { npc, key, opts };
  $("dialog").hidden = false;
  $("dName").textContent = npc.name;
  $("dKo").textContent = L.ko;
  $("dEn").textContent = subsFor(key) ? L.en : "";
  S.heard[key] = (S.heard[key] || 0) + 1;
  speak(key); logChat(npc.name.split(" · ")[0], L.ko);
  $("dTrans").hidden = !(S.scrolls > 0) || transNow || !!L.foreign || subsFor(key); $("dTransN").textContent = S.scrolls || 0;
  const box = $("dOpts"); box.innerHTML = "";
  opts.forEach((o, i) => {
    const b = document.createElement("button"); b.className = "dOpt";
    const ko = o.plr ? LINES[o.plr].ko : o.ko, en = o.plr ? (subsFor(o.plr) ? LINES[o.plr].en : "") : (o.en || "");
    b.innerHTML = `<kbd>${i + 1}</kbd><span class="ko">${ko}</span><span class="en">${en}</span>`;
    b.onclick = () => {
      if (o.plr) { S.heard[o.plr] = (S.heard[o.plr] || 0) + 1; say([lineClip(o.plr)], { interrupt: true }); }
      $("dOpts").innerHTML = ""; $("dKo").textContent = ko; if (!/^\(/.test(ko)) logChat("나", ko); $("dName").textContent = "나 · You"; $("dEn").textContent = "";
      setTimeout(() => { if (dialog) o.act(); }, o.plr ? 900 : 150);
    };
    box.appendChild(b);
  });
}
$("dReplay").onclick = () => dialog && speak(dialog.key);
function closeDialog() { transNow = false; dialog = null; $("dialog").hidden = true; $("menuCard").hidden = true; save(); }
function endWith(npc, key) { showLine(npc, key, [{ ko: "(대화 끝내기)", en: "leave", act: closeDialog }]); }

function talkTo(n) {
  if (player.dead) return;
  cancelRitual();
  const normal = {
    grandma: () => restaurant(n), smith: () => shop(n), trader: () => cardShop(n),
    stranger: () => (S.towerClears && S.sawPoster && !S.metHaneul) ? (S.metHaneul = true, save(), showLine(n, "x_haneul", [{ plr: "p_haneul", act: () => endWith(n, "x_haneul2") }])) : (S.sawList && !S.metList) ? (S.metList = true, save(), endWith(n, "x_list")) : (S.dunClears && !S.metAgain) ? (S.metAgain = true, save(), endWith(n, "x_return")) : showLine(n, "x_again", [{ plr: "p_yes", act: () => { closeDialog(); openDeckPicker(false); } }, { plr: "p_who", act: () => endWith(n, "x_who") }, { plr: "p_no", act: () => endWith(n, "x_bye") }]),
    guard: () => showLine(n, S.hasMap ? "g_hello" : "g_map", [{ plr: "p_yes", act: () => endWith(n, "g_sleep") }]),
    driver: () => showLine(n, S.spells?.sleep || S.dunClears ? "d_hello" : "d_hint", [{ plr: "p_enter", act: () => { closeDialog(); fade(toDungeon); } }, { plr: "p_later", act: closeDialog }]),
    teacher: () => teacherTalk(n), gayoung: () => campTalk(n), mike: () => mikeTalk(n), granny: () => grannyTalk(n), gangsa: () => teacher2Talk(n), cupbap: () => cupbapTalk(n), sua: () => suaTalk(n), clerk: () => kioskTalk(n),
    minsu: () => endWith(n, "m_hello"), jieun: () => endWith(n, "j_hello"), gyeongbi: () => endWith(n, S.hasMapApt ? "b_hello" : "b_map"),
  }[n.kind];
  if (questTalk(n, normal)) return;
  normal();
}
// 홍대 할머니 식당 (decision 5, design page dialogue)
function restaurant(n) {
  const welcome = () => showLine(n, "r_welcome", [
    { plr: "p_one", act: order },
    { plr: "p_two", act: () => showLine(n, "r_two", [{ plr: "p_one", act: order }]) },
    { plr: "p_leave", act: () => endWith(n, "r_later") }]);
  const order = () => showLine(n, "r_order", [
    ...Object.entries(FOODS).map(([k, f]) => ({ plr: f.plr, act: () => price(k) })),
    { plr: "p_menu", act: () => { showMenu(); showLine(n, "r_menu", Object.entries(FOODS).map(([k, f]) => ({ plr: f.plr, act: () => { $("menuCard").hidden = true; price(k); } }))); } },
    { plr: "p_leave", act: () => endWith(n, "r_later") }]);
  const price = k => { const f = FOODS[k]; showLine(n, f.line, [{ plr: "p_pay", act: () => pay(k) }, { plr: "p_other", act: order }]); };
  const pay = k => {
    const f = FOODS[k];
    if (S.money < f.price) { showLine(n, "r_short", [{ plr: "p_other", act: order }, { plr: "p_leave", act: () => endWith(n, "r_later") }]); return; }
    S.money -= f.price; SFX.pickup();
    if (f.takeaway) { S.gimbap++; showLine(n, "r_pack", [{ plr: "p_thanks", act: () => endWith(n, "r_bye") }]); return; }
    showLine(n, "r_enjoy", [{ ko: "(먹기 · eat)", en: "", act: () => fade(() => { eat(f); showLine(n, "r_bye", [{ plr: "p_thanks", act: closeDialog }]); }) }]);
  };
  welcome();
}
function showMenu() {
  const c = $("menuCard"); c.innerHTML = "<h3>메뉴</h3>" + Object.values(FOODS).map(f => `<div><span>${f.ko}</span><span>${f.price.toLocaleString("en-US")}원</span></div>`).join(""); c.hidden = false;
}
function shop(n) {
  const opts = [], wt = weaponTier(), owned = g => S.items.some(i => i.g === g);
  for (let t = wt + 1; t <= 2; t++) if (!owned("w" + t)) opts.push({ ko: `${classDef().weapons[t]} · ${WEAPON_PRICE[t].toLocaleString("en-US")}원`, en: `damage ×${WEAPON_MULT[t]} (now ×${WEAPON_MULT[wt]})`, act: () => buy("w" + t) });
  for (const g of ["a1", "a2"]) if (!owned(g)) opts.push({ ko: `${GEAR[g].ko} · ${GEAR[g].price.toLocaleString("en-US")}원`, en: `${GEAR[g].en}: health +${GEAR[g].hp * 100}%`, act: () => buy(g) });
  opts.push({ ko: "강화하기 · upgrade my gear", en: `materials + won, then a memory game (재료 ${matCount()}개)`, act: () => upgradeMenu(n) });
  opts.push({ plr: "p_look", act: () => endWith(n, "s_bye") });
  const buy = g => {
    say([lineClip("p_buy")], { interrupt: true });
    if (S.money < gearPrice(g)) { setTimeout(() => endWith(n, "s_short"), 700); return; }
    S.money -= gearPrice(g); addItem(g, true); recalcMax(); SFX.reload(); save();
    toast(`${gearName(g)} 착용 · equipped (I = 인벤토리)`);
    setTimeout(() => endWith(n, "s_buy"), 700);
  };
  showLine(n, "s_welcome", opts);
}
function nearestInteract() {
  if (player.dead) return null;
  const E = keyName(SET.keys.interact);
  for (const r of remotes.values()) if (r.dead && r.zone === player.zone && dist2(r.pos, player.pos) < 2.8) return { t: "revive", r, label: `${E} · ${r.nm} 살리기 · revive (word challenge)` };
  if (player.zone === "market") {
    if (dist2(player.pos, MARKET.up) < 3) return { t: "marketOut", label: `${E} · 노량진으로 나가기 · back out to 노량진` };
    if (dist2(player.pos, MARKET.end) < 4 && !monsters.some(m => m.def.boss && !m.dead && m.zone === "market")) return { t: "marketOut", label: `${E} · 출구 · exit to 노량진` };
    for (let i = 0; i < 3; i++) if (dist2(player.pos, MARKET.boards[i].spot) < 2.4) return { t: "board", i, label: `${E} · 칠판 ${i + 1} · chalkboard ${i + 1}` };
    return null;
  }
  if (player.zone === "tower") {
    if (dist2(player.pos, TOWER.up) < 3) return { t: "towerOut", label: `${E} · 여의도로 나가기 · back out to 여의도` };
    if (dist2(player.pos, TOWER.end) < 4 && !monsters.some(m => m.def.boss && !m.dead && m.zone === "tower")) return { t: "towerOut", label: `${E} · 출구 · exit to 여의도` };
    if (dist2(player.pos, TOWER.poster) < 2.6) return { t: "poster", label: `${E} · 찢어진 포스터 보기 · look at the torn poster` };
    if (!tw.open && dist2(player.pos, TOWER.panel) < 2.6) return { t: "panel", label: `${E} · 엘리베이터 패널 · elevator panel (${tw.solved}/3)` };
    return null;
  }
  if (player.zone === "yeouido") {
    if (dist2(player.pos, YEOUIDO.back) < 3) return { t: "ydBack", label: `${E} · 다리 건너 돌아가기 · climb back to 한강공원` };
    if ((S.camp || 0) >= 5 && dist2(player.pos, BEDROLL()) < 2.6) return { t: "bench", label: `${E} · 잠자리에서 자기 · sleep in a bedroll` };
    for (const rk of BIKE_RACKS) if (rk.zone === "yeouido" && dist2(player.pos, rk) < 2.8) return { t: "rack", label: S.bikeRented ? `${E} · 따릉이 반납 · return the bike` : `${E} · 따릉이 빌리기 ₩1,000 · rent a bike` };
    if (dist2(player.pos, YEOUIDO.marketDoor) < 3.4) return { t: "market", label: `${E} · 수산시장에 들어가기 · enter the fish market (dungeon, Lv 12–15)` };
    if (dist2(player.pos, YEOUIDO.towerDoor) < 3.4) return { t: "tower", label: `${E} · 63빌딩에 들어가기 · enter the 63 Building (dungeon, Lv 10–12)` };
    for (const [a, it] of Object.entries(MAP_ITEMS)) if (it.zone === "yeouido" && !S[it.flag] && dist2(player.pos, it.spot) < 2.8) return { t: "map", area: a, label: `${E} · ${it.ko} 가져가기 · take the ${it.en}` };
    for (const n of npcs) if (n.zone === "yeouido" && dist2(n.pos, player.pos) < 3.4) return { t: "npc", n, label: `${E} · ${n.name}${wa(n.name)} 이야기하기` };
    return null;
  }
  if (player.zone === "dungeon") {
    if (dist2(player.pos, DUNGEON.up) < 3) return { t: "up", label: `${E} · 역으로 돌아가기 · back up to the station` };
    if (dist2(player.pos, DUNGEON.end) < 4 && !monsters.some(m => m.def.boss && !m.dead)) return { t: "up", label: `${E} · 출구 · exit to the station` };
    for (let i = 0; i < 3; i++) if (dist2(player.pos, DUNGEON.murals[i].spot) < 2.4) return { t: "mural", i, label: `${E} · 벽화 ${i + 1} 읽기 · read mural ${i + 1}` };
    return null;
  }
  if (player.zone === "street") {
    if (dist2(player.pos, { x: ENTRANCE.x, z: ENTRANCE.z - 2.6 }) < 2.6) return { t: "down", label: `${E} · 역으로 내려가기 · go down to the station` };
    for (const rk of BIKE_RACKS) if (rk.zone === "street" && dist2(player.pos, rk) < 2.8) return { t: "rack", label: S.bikeRented ? `${E} · 따릉이 반납 · return the bike` : `${E} · 따릉이 빌리기 ₩1,000 · rent a bike` };
    if (dist2(player.pos, BRIDGE_FOOT) < 4) return { t: "bridge", label: `${E} · 부서진 다리 오르기 → 여의도 (Lv 9+)` };
    for (const [a, it] of Object.entries(MAP_ITEMS)) if (!it.zone && !S[it.flag] && dist2(player.pos, it.spot) < 2.8) return { t: "map", area: a, label: `${E} · ${it.ko} 가져가기 · take the ${it.en}` };
    for (const n of npcs) if (n.zone === "street" && n.model.root.visible && dist2(n.pos, player.pos) < 3.4) return { t: "npc", n, label: `${E} · ${n.name}${wa(n.name)} 이야기하기` };
    if (dist2(player.pos, PIER) < 3.5) return { t: "fish", label: fishing ? "🎣 기다리는 중… · waiting for a bite (don't move)" : `${E} · 낚시하기 · fish` };
    return null;
  }
  const sp = world.npcSpots;
  if (dist2(player.pos, sp.exit) < 2.6) return { t: "up", label: "E · 거리로 나가기 · up to the street" };
  if (dist2(player.pos, sp.bench) < 2.2) return { t: "bench", label: `${E} · 벤치에서 자기 · sleep on the bench` };
  if (dist2(player.pos, sp.tunnel) < 2.4) return { t: "tunnel", label: `${E} · 터널로 들어가기 · enter the tunnel (dungeon)` };
  if (dist2(player.pos, sp.mailbox) < 2.2) return { t: "mail", label: `${E} · 우체통 열기 · open the mailbox` + (unreadMail() ? ` (✉ ${unreadMail()})` : "") };
  if (dist2(player.pos, sp.lockers) < 2.4) return { t: "bank", label: `${E} · 물품보관함 열기 · open the lockers (storage)` };
  let best = null, bd = 3.4;
  for (const n of npcs) { if (n.zone) continue; const d = dist2(n.pos, player.pos); if (d < bd) { bd = d; best = n; } }
  return best ? { t: "npc", n: best, label: `E · ${best.name}${wa(best.name)} 이야기하기` } : null;
}
function interact() {
  if (dialog) return;
  const it = nearestInteract(); if (!it) return;
  if (it.t === "down") fade(toStation);
  else if (it.t === "up") fade(player.zone === "dungeon" ? toStation : toStreet);
  else if (it.t === "tunnel") talkTo(npcs.find(n => n.kind === "driver"));
  else if (it.t === "mural") muralQuiz(it.i);
  else if (it.t === "revive") startRevive(it.r);
  else if (it.t === "bench") sleepBench();
  else if (it.t === "map") takeMap(it.area);
  else if (it.t === "bank") openBank();
  else if (it.t === "mail") openMail();
  else if (it.t === "fish") startFishing();
  else if (it.t === "bridge") { if (S.level < 8) toast("위험해요! Lv 9 이상 추천 · dangerous: level 9+ recommended"); fade(toYeouido); }
  else if (it.t === "ydBack") fade(toStreetBridge);
  else if (it.t === "tower") fade(toTower);
  else if (it.t === "towerOut") fade(towerToYd);
  else if (it.t === "poster") readPoster();
  else if (it.t === "panel") orderPuzzle();
  else if (it.t === "rack") rackUse();
  else if (it.t === "market") fade(toMarket);
  else if (it.t === "marketOut") fade(marketToYd);
  else if (it.t === "board") boardQuiz(it.i);
  else talkTo(it.n);
}
function sleepBench() {
  const me = { name: "벤치 · bench" };
  const sleepTo = h => fade(() => {
    const now = S.time % 1440, target = h * 60; let add = target - now; if (add <= 0) add += 1440;
    S.time += add; S.hunger = Math.max(0, S.hunger - 30); player.hp = player.maxHp; toast(`${String(h).padStart(2, "0")}:00 · 잘 잤어요`); closeDialog();
  });
  dialog = { npc: me, key: null, opts: [] };
  $("dialog").hidden = false; $("dName").textContent = me.name; $("dKo").textContent = "언제까지 잘까요?"; $("dEn").textContent = subsFor("bench") ? "Sleep until when? (sleeping makes you hungrier)" : "";
  S.heard.bench = (S.heard.bench || 0) + 1;
  const box = $("dOpts"); box.innerHTML = "";
  [["저녁까지 (20:00)", "until evening, monsters come out", 20], ["아침까지 (07:00)", "until morning", 7], ["안 잘래요", "don't sleep", null]].forEach(([ko, en, h], i) => {
    const b = document.createElement("button"); b.className = "dOpt"; b.innerHTML = `<kbd>${i + 1}</kbd><span class="ko">${ko}</span><span class="en">${en}</span>`;
    b.onclick = () => h === null ? closeDialog() : (say([lineClip("p_sleep")], { interrupt: true }), sleepTo(h)); box.appendChild(b);
  });
}

// ---- zones ---------------------------------------------------------------------------------------------
function toStation() {
  player.zone = "station"; const s = world.npcSpots.spawn; player.pos.set(s.x, 0, s.z); player.yaw = 0; cam.yaw = 0;
  cancelRitual(); setTarget(null);
  for (const m of monsters) if (m.state === "chase") m.state = "return";
  for (const p of projectiles.filter(p => p.hostile)) scene.remove(p.mesh);
  projectiles.splice(0, projectiles.length, ...projectiles.filter(p => !p.hostile));
  save();
}
function toStreet() { populateStreet(); player.zone = "street"; player.pos.set(ENTRANCE.x + .5, 0, ENTRANCE.z + 12); player.yaw = -Math.PI / 2; cam.yaw = -Math.PI / 2; closeDialog(); }

// ---- UI: class pick, deck picker, deck view, menu --------------------------------------------------------------
function showScreen(id) { for (const s of ["title", "classPick", "deckPick", "deckView", "charView", "invView", "questView", "mapView", "achView", "bankView", "mailView", "menu", "bookView", "friendsView"]) $(s).hidden = s !== id; }
let newBook = "5a", newMode = "story";
const CHAPTER_LVL = i => 1 + 2 * i;   // story mode: 1과 at Lv 1, then one every 2 levels (8과 at Lv 15)
function syncStory(announce) {
  if (S.mode !== "story") return;
  const open = bookChapters().filter((c, i) => S.level >= CHAPTER_LVL(i)).map(c => c.id);
  const fresh = open.filter(id => !S.chapters.includes(id));
  S.chapters = open;
  if (announce) for (const id of fresh) { const c = DATA.chapters.find(x => x.id === id); toast(`📖 새 과가 열렸어요! ${c.title}${c.theme ? " " + c.theme : ""} · a new chapter opened — its words drop now`); logChat("system", `📖 ${c.title} 열림 · chapter opened`); SFX.kill(); }
}
function drawModePick() {
  const M = [["story", "이야기 모드 · Story", "1과부터 시작해서 2레벨마다 새 과가 열려요 · start with 1과, a new chapter every 2 levels"], ["practice", "연습 모드 · Practice", "공부할 과를 직접 골라요 · choose the chapters you want to practise"]];
  $("modePick").innerHTML = `<span class="fine">모드 · mode</span>` + M.map(([k, t, d]) => `<button class="chip" data-m="${k}" aria-pressed="${k === newMode}" title="${d}">${t}</button>`).join("") + `<span class="fine modeDesc">${M.find(m => m[0] === newMode)[2]}</span>`;
  $("modePick").querySelectorAll("[data-m]").forEach(x => x.onclick = () => { newMode = x.dataset.m; drawModePick(); });
}
function drawBookPick() {
  $("bookPick").innerHTML = `<span class="fine">교재 · textbook</span>` + BOOKS.map(b => `<button class="chip" data-b="${b.id}" aria-pressed="${b.id === newBook}">${b.title} · ${b.en} (${DATA.words.filter(w => (w.book || "5a") === b.id).length} words)</button>`).join("");
  $("bookPick").querySelectorAll("[data-b]").forEach(x => x.onclick = () => { newBook = x.dataset.b; drawBookPick(); });
}
function buildClassPick() {
  drawBookPick(); drawModePick();
  $("classes").innerHTML = "";
  for (const [k, c] of Object.entries(CLASSES)) {
    const b = document.createElement("button"); b.className = "cls";
    b.innerHTML = `<h3>${c.ko}<small>${c.en}</small></h3><dl><dt>체력 · HP</dt><dd>${c.hp}</dd><dt>공격 · damage</dt><dd>×${c.dmg}</dd><dt>사거리 · range</dt><dd>${c.range} m</dd><dt>무기 · weapon</dt><dd>${c.weapons[0]}</dd></dl><div class="pass">${c.pass}</div><div class="solo">솔로: ${c.solo}</div>`;
    b.onclick = () => { initAudio(); unlockMusic(); newGame(k); };
    $("classes").appendChild(b);
  }
}
let pickSel = [], pickCh = "ch1", pickSecs = null, pickIntro = false;
function openDeckPicker(intro) {
  pickIntro = intro; pickSel = deckIds("basic"); paused = true;
  if (!pickChapters().some(c => c.id === pickCh)) { pickCh = (pickChapters().find(c => S.chapters.includes(c.id)) || pickChapters()[0]).id; pickSecs = null; }
  showScreen("deckPick"); drawDeckPicker();
}
function drawDeckPicker() {
  const ch = DATA.chapters.find(c => c.id === pickCh);
  if (!pickSecs || !pickSecs.every(s => ch.sections.some(x => x.id === s))) pickSecs = ch.sections.map(s => s.id);
  $("chTabs").innerHTML = ""; $("secChips").innerHTML = "";
  for (const c of pickChapters()) { const b = document.createElement("button"); b.className = "chip"; b.setAttribute("aria-pressed", c.id === pickCh); b.textContent = `${c.title} ${c.theme}`; b.onclick = () => { pickCh = c.id; pickSecs = null; drawDeckPicker(); }; $("chTabs").appendChild(b); }
  for (const s of ch.sections) { const b = document.createElement("button"); b.className = "chip"; b.setAttribute("aria-pressed", pickSecs.includes(s.id)); b.textContent = s.title; b.onclick = () => { pickSecs = pickSecs.includes(s.id) ? pickSecs.filter(x => x !== s.id) : [...pickSecs, s.id]; drawDeckPicker(); }; $("secChips").appendChild(b); }
  const g = $("wordGrid"); g.innerHTML = "";
  DATA.words.filter(w => w.ch === pickCh && pickSecs.includes(w.sec)).forEach(w => {
    const b = document.createElement("button"); b.className = "wcard"; b.setAttribute("aria-pressed", pickSel.includes(w.id)); b.dataset.tip = tipWord(w);
    const m = mastery(w.id);
    b.innerHTML = `<i>${POSKO[w.pos]}</i><b>${w.kr}</b><span>${w.en}</span>${m.k !== "new" ? `<span class="m">● ${m.ko}</span>` : ""}`;
    b.onclick = () => { if (pickSel.includes(w.id)) pickSel = pickSel.filter(x => x !== w.id); else if (pickSel.length < 10) { pickSel.push(w.id); say([wordClip(w.id)], { interrupt: true }); } else toast("이미 10개예요 · already 10"); drawDeckPicker(); };
    g.appendChild(b);
  });
  drawTray();
}
function drawTray() {
  const t = $("traySlots"); t.innerHTML = "";
  for (let i = 0; i < 10; i++) { const id = pickSel[i], d = document.createElement("div"); d.className = "tslot" + (id ? " full" : ""); d.textContent = id ? WORD[id].kr : ""; if (id) { d.title = "빼기 · remove"; d.onclick = () => { pickSel = pickSel.filter(x => x !== id); drawDeckPicker(); }; } t.appendChild(d); }
  const b = deckBonus(pickSel);
  $("trayCount").textContent = `${pickSel.length} / 10 · 명사 ${b.c.noun} · 동사 ${b.c.verb} · 형용사 ${b.c.adjective} · 부사·기타 ${b.c.other}`;
  $("trayBonus").textContent = S.origin ? `출신 보너스 (already set) · ${S.origin.txt}` : pickSel.length === 10 ? `출신 보너스 · origin bonus: ${b.txt}` : "";
  $("deckDone").disabled = pickSel.length !== 10;
}
$("deckRandom").onclick = () => { const pool = DATA.words.filter(w => w.ch === pickCh && pickSecs.includes(w.sec) && !pickSel.includes(w.id)); pickSel = pickSel.concat(shuffle(pool).slice(0, 10 - pickSel.length).map(w => w.id)); drawDeckPicker(); };
$("deckClear").onclick = () => { pickSel = []; drawDeckPicker(); };
// the stranger's cards are gifts: they only live in the basic attack deck, and go back to him when you swap them out
$("deckDone").onclick = () => {
  const keep = deckCards("basic"), next = [];
  for (const id of pickSel) {
    let c = keep.find(x => x.id === id);
    if (!c) c = bagCards().filter(x => x.id === id).sort((a, b) => b.rar - a.rar)[0];
    if (!c) { c = newCard(id, 0); c.gift = true; S.cards.push(c); }
    next.push(c.uid);
  }
  const dropped = new Set(S.cards.filter(c => c.gift && !next.includes(c.uid)).map(c => c.uid));   // unused gifts go back to the stranger
  S.cards = S.cards.filter(c => !dropped.has(c.uid));
  S.skillDecks.basic = next;
  if (!S.origin) { S.origin = deckBonus(pickSel); if (S.mode !== "story") S.chapters = [...new Set(pickSel.map(id => WORD[id].ch))]; }
  recalcMax(); save(); showScreen(null); paused = false;
  const st = npcs.find(n => n.kind === "stranger");
  showLine(st, "x_good", [{ plr: "p_yes", act: () => { endWith(st, "x_bye"); if (pickIntro) setTimeout(() => toast("출구로 나가서 괴물을 잡으세요 · take the exit up to the street"), 1500); } }]);
};

// ---- deck screen (K): one deck per skill + your bag of loose cards ----
let dvTab = "basic", dvSel = null;
function openDeckView() {
  if (!S.cls) return;
  paused = true; showScreen("deckView"); dvSel = null; drawDeckView();
}
function cardHTML(c, extra = "") {
  const w = WORD[c.id], R = RARITY[c.rar], st = S.stats[c.id] || { c: 0, w: 0 };
  return `<div class="dvCard ${extra}" data-uid="${c.uid}" data-tip="${esc(tipCard(c))}" style="border-color:${R.c}"><span class="rar" style="color:${R.c}">${R.ko} · ${R.en}${c.gift ? " · 선물 gift" : ""}</span><b>${w.kr}</b><span class="en">${w.en}</span><span class="mod">${modText(c)}</span><span class="mst">${mastery(c.id).ko} · ${Math.min(st.c, 8)}/8</span></div>`;
}
function drawChapterPick() {
  if (S.mode === "story") {
    $("dvChapters").innerHTML = `<span class="fine">${(BOOKS.find(b => b.id === S.book) || BOOKS[0]).title} · 이야기 모드 · story mode: 2레벨마다 새 과 · a new chapter every 2 levels (most drops come from the newest one)</span>` + bookChapters().map((c, i) => { const open = S.level >= CHAPTER_LVL(i); return `<span class="chip" aria-pressed="${open}">${open ? "" : "🔒 "}${c.title}${c.theme ? " " + c.theme : ""}${open ? "" : " · Lv " + CHAPTER_LVL(i)}</span>`; }).join("");
    return;
  }
  $("dvChapters").innerHTML = `<span class="fine">${(BOOKS.find(b => b.id === S.book) || BOOKS[0]).title} · 단어가 나오는 과 · chapters your words come from (drops, the card trader, quizzes):</span>` + bookChapters().map(c => `<button class="chip" data-ch="${c.id}" aria-pressed="${S.chapters.includes(c.id)}">${c.title}${c.theme ? " " + c.theme : ""}</button>`).join("");
  $("dvChapters").querySelectorAll("[data-ch]").forEach(b => b.onclick = () => {
    const id = b.dataset.ch, on = S.chapters.includes(id);
    if (on && S.chapters.length === 1) { toast("한 과는 남겨야 해요 · keep at least one chapter"); return; }
    S.chapters = on ? S.chapters.filter(x => x !== id) : [...S.chapters, id]; S.shop = null; save(); drawChapterPick();
  });
}
function drawDeckView() {
  drawChapterPick();
  S.skillDecks[dvTab] = S.skillDecks[dvTab] || [];
  $("dvTitle").textContent = `${classDef().ko} · 덱 · Decks`;
  $("dvTabs").innerHTML = "";
  for (const k of skillKeys()) {
    const sk = skillDef(k), b = document.createElement("button"); b.className = "chip"; b.setAttribute("aria-pressed", k === dvTab);
    b.textContent = `${sk.key} · ${sk.ko}` + (S.level < sk.lvl ? ` 🔒 Lv ${sk.lvl}` : ` (${deckCards(k).length}/10)`);
    b.onclick = () => { dvTab = k; dvSel = null; drawDeckView(); }; $("dvTabs").appendChild(b);
  }
  const sk = skillDef(dvTab), block = skillBlock(dvTab);
  $("dvInfo").innerHTML = `<b>${sk.ko}</b> · ${sk.en} — ${dvTab === "basic" ? "1 card · 1× damage" : sk.info}, cooldown ${sk.cd} s` + (block ? ` · <span class="warn">${block}</span>` : " · <span class=\"okc\">준비됨 · ready</span>");
  const deck = deckCards(dvTab);
  let html = deck.map(c => cardHTML(c, c.uid === dvSel ? "sel" : "")).join("");
  for (let i = deck.length; i < 10; i++) html += `<div class="dvCard empty">빈 칸 · empty</div>`;
  $("dvGrid").innerHTML = html;
  const bag = bagCards().sort((a, b) => b.rar - a.rar || WORD[a.id].kr.localeCompare(WORD[b.id].kr));
  const inDeck = new Set(deck.map(c => c.id)), selWord = dvSel && cardBy(dvSel)?.id;
  $("dvBag").innerHTML = bag.length ? bag.map(c => cardHTML(c, inDeck.has(c.id) && c.id !== selWord ? "dim" : "")).join("") : `<p class="fine">가방이 비었어요. 괴물을 잡거나 (about half of them drop a card, aliens always) 역의 카드 상인에게 사세요. · Empty: monsters drop cards, and the card trader in the station sells them.</p>`;
  $("dvBonus").textContent = `출신 보너스 · origin bonus: ${bonus().txt} · 카드를 누르고 가방 카드를 누르면 바뀌어요 (click a deck card, then a bag card, to swap; click a selected card again to put it back in the bag). 선물 카드 (gift, from the stranger) only fit the basic attack.`;
  $("dvPick").hidden = dvTab !== "basic";
  $("dvGrid").querySelectorAll(".dvCard[data-uid]").forEach(el => el.onclick = () => deckClick(el.dataset.uid));
  $("dvBag").querySelectorAll(".dvCard[data-uid]").forEach(el => el.onclick = () => bagClick(el.dataset.uid));
}
function takeOut(uid) { S.skillDecks[dvTab] = S.skillDecks[dvTab].filter(u => u !== uid); }   // the card goes back to the bag
function deckClick(uid) {
  if (dvSel === uid) { takeOut(uid); dvSel = null; recalcMax(); save(); }
  else dvSel = uid;
  drawDeckView();
}
function bagClick(uid) {
  const c = cardBy(uid), deck = S.skillDecks[dvTab], selWord = dvSel && cardBy(dvSel)?.id;
  if (c.gift && dvTab !== "basic") { toast("선물 카드는 기본 공격에만 들어가요 · gift cards only fit the basic attack"); return; }
  if (deckIds(dvTab).includes(c.id) && c.id !== selWord) { toast("이미 이 덱에 있는 단어예요 · this word is already in this deck"); return; }
  if (dvSel) { const i = deck.indexOf(dvSel); takeOut(dvSel); S.skillDecks[dvTab].splice(i, 0, uid); dvSel = null; }
  else if (deck.length < 10) deck.push(uid);
  else { toast("바꿀 카드를 먼저 고르세요 · pick a deck card to swap first"); return; }
  say([wordClip(c.id)], { interrupt: true }); save(); drawDeckView();
}
$("dvClose").onclick = () => { showScreen(null); paused = false; };
$("dvPick").onclick = () => openDeckPicker(false);

// ---- card drops (1 in 3 kills): half a copy of a word you own, half from this monster's own word list ----
function monsterPool(kind) {
  let ch = S.chapters.length ? S.chapters : [...new Set(deckIds("basic").map(id => WORD[id].ch))];
  if (!ch.length) ch = bookChapters().map(c => c.id);
  const h = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return DATA.words.filter(w => ch.includes(w.ch)).sort((a, b) => h(kind + a.id) - h(kind + b.id)).slice(0, 15).map(w => w.id);
}
function dropChapters() {
  const ch = S.chapters.length ? S.chapters : bookChapters().map(c => c.id);
  if (S.mode !== "story" || ch.length < 2) return ch;
  const order = bookChapters().map(c => c.id).filter(id => ch.includes(id));
  return Math.random() < .7 ? order.slice(-1) : order.slice(0, -1);
}
function dropCard(m) {
  if (Math.random() >= (m.def?.alien || m.def?.boss ? 1 : .45)) return;
  const chs = dropChapters(), pool = bookWords().filter(w => chs.includes(w.ch)).map(w => w.id); if (!pool.length) return;
  const owned = new Set(S.cards.map(c => c.id)), unowned = pool.filter(id => !owned.has(id));
  const id = unowned.length && Math.random() < .8 ? pick(unowned) : pick(pool);
  if (!id || !WORD[id]) return;
  // once you own every word of these chapters, duplicates come with better rarity
  let rar = m.def?.alien ? Math.max(rollRarity(), rollRarity()) : rollRarity(); if (!unowned.length) rar = Math.max(rar, rollRarity());
  const c = newCard(id, rar), R = RARITY[c.rar];
  S.cards.push(c);
  toast(`카드 획득! [${R.ko}] ${WORD[id].kr} · ${WORD[id].en} → 가방 (K)`);
  floater(m.pos, `🂠 ${WORD[id].kr}`, R.c, false, 2.8);
  setTimeout(() => say([wordClip(id)]), 700);
}
function dropGear(m) {
  if (Math.random() >= .06) return;
  const g = Object.keys(GEAR).find(k => GEAR[k].drop === m.kind); if (!g) return;
  addItem(g); toast(`장비 획득! ${GEAR[g].ko} · ${gearInfo(g)} → 인벤토리 (I)`); floater(m.pos, "🎁 " + GEAR[g].ko, "#ffd23d", false, 3.2); SFX.pickup();
}
// ---- card trader in the station: 4 cards a day ----
function shopOffers() {
  const day = dayNum();
  if (!S.shop || S.shop.day !== day) {
    const owned = [...new Set(S.cards.map(c => c.id))], pool = DATA.words.filter(w => S.chapters.includes(w.ch)).map(w => w.id);
    const offers = [];
    for (let i = 0; i < 4; i++) { const id = i < 2 && owned.length ? pick(owned) : pick(pool.length ? pool : owned); const rar = Math.min(2, rollRarity()); offers.push({ id, rar, mod: rollMod(rar), sold: false }); }
    S.shop = { day, offers };
  }
  return S.shop.offers;
}
function cardShop(n) {
  const offers = shopOffers();
  const opts = [];
  offers.forEach((o, i) => { if (!o.sold) opts.push({ ko: `[${RARITY[o.rar].ko}] ${WORD[o.id].kr} · ${RARITY[o.rar].price.toLocaleString("en-US")}원`, en: `${WORD[o.id].en} · ${modText(o)}${S.cards.some(c => c.id === o.id) ? " · 가진 단어 (you own this word)" : ""}`, act: () => buy(i) }); });
  opts.push({ plr: "p_look", act: () => endWith(n, "t_bye") });
  const buy = i => {
    const o = offers[i], price = RARITY[o.rar].price;
    say([lineClip("p_buy")], { interrupt: true });
    if (S.money < price) { setTimeout(() => endWith(n, "t_short"), 700); return; }
    S.money -= price; o.sold = true;
    S.cards.push({ uid: newUid(), id: o.id, rar: o.rar, mod: o.mod }); SFX.pickup(); save();
    toast(`[${RARITY[o.rar].ko}] ${WORD[o.id].kr} → 가방 (K)`);
    setTimeout(() => endWith(n, "t_buy"), 700);
  };
  showLine(n, offers.every(o => o.sold) ? "t_soldout" : "t_welcome", opts);
}
// ---- inventory (I): what you wear, and your bag: gear, items, every card ----
let invTab = "gear", sellAllArm = false;
const invSort = { gear: "slot", cards: "rar" };
const SORTS = {
  gear: { slot: ["종류 · slot", (a, b) => Object.keys(SLOTS).indexOf(GEAR[a.g].slot) - Object.keys(SLOTS).indexOf(GEAR[b.g].slot) || gearPrice(b.g) - gearPrice(a.g)],
          value: ["가격 · value", (a, b) => gearPrice(b.g) - gearPrice(a.g) || (b.up || 0) - (a.up || 0)],
          name: ["이름 · name", (a, b) => itemName(a).localeCompare(itemName(b), "ko")] },
  cards: { rar: ["희귀도 · rarity", (a, b) => b.rar - a.rar || WORD[a.id].kr.localeCompare(WORD[b.id].kr, "ko")],
           name: ["가나다 · name", (a, b) => WORD[a.id].kr.localeCompare(WORD[b.id].kr, "ko") || b.rar - a.rar],
           mastery: ["맞힌 수 · most right", (a, b) => (S.stats[b.id]?.c || 0) - (S.stats[a.id]?.c || 0) || b.rar - a.rar],
           pos: ["품사 · word type", (a, b) => WORD[a.id].pos.localeCompare(WORD[b.id].pos) || WORD[a.id].kr.localeCompare(WORD[b.id].kr, "ko")],
           where: ["덱 먼저 · in decks first", (a, b) => inDeck(b.uid) - inDeck(a.uid) || b.rar - a.rar] },
};
const inDeck = uid => skillKeys().some(k => (S.skillDecks[k] || []).includes(uid));
function sortBar(tab) {
  return `<div class="ivTools"><span class="fine">정렬 · sort</span>${Object.entries(SORTS[tab]).map(([k, [label]]) => `<button class="chip" data-sort="${k}" aria-pressed="${invSort[tab] === k}">${label}</button>`).join("")}</div>`;
}
function openInventory() { if (!S.cls) return; sellAllArm = false; paused = true; showScreen("invView"); drawInventory(); }
function drawInventory() {
  const inStation = player.zone === "station";
  $("ivSlots").innerHTML = Object.keys(SLOTS).map(sl => { const it = itemBy(S.equip[sl]); return `<div class="ivSlot${it ? "" : " empty"}" data-slot="${sl}"${it ? ` data-tip="${esc(tipGear(it.g))}"` : ""}><span class="sl">${SLOTS[sl]}</span>${it ? `<b>${itemName(it)}</b><span>${itemInfo(it)}</span>` : "<span>비었음 · empty</span>"}</div>`; }).join("");
  $("ivSum").innerHTML = `체력 ${Math.ceil(player.hp)} / ${player.maxHp} · 공격력 ×${(weaponMult() * (1 + gearStat("dmg"))).toFixed(2)} · 흡혈 ${Math.round(gearStat("ls") * 100)}% · ${won(S.money)}`;
  $("ivTabs").innerHTML = "";
  for (const [k, label] of [["gear", "장비 · gear"], ["items", "소모품 · items"], ["cards", `카드 · cards (${S.cards.length})`]]) { const b = document.createElement("button"); b.className = "chip"; b.setAttribute("aria-pressed", k === invTab); b.textContent = label; b.onclick = () => { invTab = k; sellAllArm = false; drawInventory(); }; $("ivTabs").appendChild(b); }
  const box = $("ivBag");
  if (invTab === "gear") {
    const loose = S.items.filter(i => !Object.values(S.equip).includes(i.uid) && !S.bank.items.includes(i.uid)).sort(SORTS.gear[invSort.gear][1]);
    const sellable = loose.filter(i => !i.up), sellWon = sellable.reduce((a, i) => a + gearPrice(i.g) / 2, 0);
    box.innerHTML = sortBar("gear") + (sellable.length ? `<div class="ivTools"><button class="sellAll${sellAllArm ? " arm" : ""}" ${inStation ? "" : "disabled"}>${sellAllArm ? `정말요? 한 번 더 누르세요 · sure? click again (${sellable.length}개 → ${won(sellWon)})` : `모두 팔기 · sell all ${sellable.length} (${won(sellWon)})`}</button><span class="fine">강화한 장비는 빼고 · upgraded gear is kept</span></div>` : "") + (loose.length ? loose.map(i => `<div class="ivItem" data-uid="${i.uid}" data-tip="${esc(tipGear(i.g))}"><span class="sl">${SLOTS[GEAR[i.g].slot]}</span><b>${itemName(i)}</b><span>${itemInfo(i)}</span><div class="ivBtns"><button data-act="equip">착용 · equip</button><button data-act="sell" ${inStation ? "" : "disabled"}>${gearPrice(i.g) ? "팔기 " + won(gearPrice(i.g) / 2) : "버리기 · discard"}</button>${remotes.size ? '<button data-act="gift">🎁 선물</button>' : ""}</div></div>`).join("")
      : `<p class="fine">가방에 장비가 없어요. 무기점에서 사거나 괴물이 가끔 장신구를 떨어뜨려요. · No loose gear: buy at the weapon shop; monsters sometimes drop trinkets.</p>`);
    const sa = box.querySelector(".sellAll");
    if (sa) sa.onclick = () => {
      if (!sellAllArm) { sellAllArm = true; drawInventory(); return; }
      sellAllArm = false; S.items = S.items.filter(i => !sellable.includes(i)); S.money += sellWon; SFX.pickup(); save();
      toast(`${sellable.length}개 팔았어요 · sold ${sellable.length} items · +${won(sellWon)}`); drawInventory();
    };
    if (!inStation && loose.length) box.insertAdjacentHTML("beforeend", `<p class="fine">팔기는 역 안에서만 · selling only in the station</p>`);
  } else if (invTab === "items") {
    const sn = S.snacks || {}, fishes = Object.entries(S.fish || {}).filter(([, c]) => c), mats = Object.entries(S.mats || {}).filter(([, c]) => c);
    box.innerHTML = `<div class="ivItem"><span class="sl">음식 · food</span><b>김밥 ×${S.gimbap}</b><span>배부름 +50% · eat anywhere (F)</span><div class="ivBtns"><button data-act="eat" ${S.gimbap ? "" : "disabled"}>먹기 · eat</button></div></div>`
      + Object.entries(SNACKS).filter(([k]) => sn[k]).map(([k, x]) => `<div class="ivItem"><span class="sl">음식 · food</span><b>${x.ko} ×${sn[k]}</b><span>배부름 +${x.fill}% · ${x.en}</span><div class="ivBtns"><button data-act="snack" data-k="${k}">먹기 · eat</button></div></div>`).join("")
      + (fishes.length ? `<div class="ivItem"><span class="sl">물고기 · fish</span><b>${fishes.map(([k, c]) => k + " ×" + c).join(", ")}</b><span>편의점에서 팔아요 · sell at the 편의점 (${won(fishValue())})</span></div>` : "")
      + `<div class="ivItem"><span class="sl">📜 번역 두루마리 · translation scrolls</span><b>×${S.scrolls || 0}</b><span>대화 중에 📜 버튼: 그 대화 전체를 영어로 · in a conversation press 📜 to translate all of it (Mike sells them)</span></div>`
      + `<div class="ivItem"><span class="sl">🔮 다시 굴리기 돌 · reroll stones</span><b>×${S.rerollStones || 0}</b><span>63빌딩의 외계인 사령관만 떨어뜨려요. 카드 탭의 🔮: 보너스 1개, 희귀도 3개 · only the 63 commander drops them; use 🔮 on a card (bonus 1 stone, rarity 3)</span></div>`
      + `<div class="ivItem"><span class="sl">재료 · materials</span><b>${mats.length ? mats.map(([k, c]) => MATS[k].ko + " ×" + c).join(", ") : "없음 · none"}</b><span>무기점 아저씨가 장비를 강화해 줘요 · the smith uses 3 to upgrade gear</span></div>`;
  } else {
    const where = {}; for (const k of skillKeys()) for (const u of S.skillDecks[k] || []) where[u] = skillDef(k).ko;
    const list = S.cards.slice().sort(SORTS.cards[invSort.cards][1]);
    box.innerHTML = sortBar("cards") + `<p class="fine">모든 카드 · every card you own. 덱을 바꾸려면 K · to change decks press K.</p>` + list.map(c => cardHTML(c, where[c.uid] ? "" : "loose").replace("</div>", `<span class="where">${where[c.uid] ? "📌 " + where[c.uid] : S.bank.cards.includes(c.uid) ? "🔒 보관함 · storage" : "가방 · bag"}</span>${remotes.size && !where[c.uid] && !c.gift && !S.bank.cards.includes(c.uid) ? `<button class="giftBtn" data-gift="${c.uid}">🎁 선물</button>` : ""}${S.rerollStones ? `<button class="giftBtn rrBtn" data-rr="${c.uid}" title="다시 굴리기 · reroll">🔮</button>` : ""}</div>`)).join("");
    box.querySelectorAll("[data-rr]").forEach(b => b.onclick = e => { e.stopPropagation(); openReroll(b.dataset.rr); });
    box.querySelectorAll("[data-gift]").forEach(b => b.onclick = e => { e.stopPropagation(); const c = cardBy(b.dataset.gift); giftTo({ cards: [{ id: c.id, rar: c.rar, mod: c.mod }] }, () => { S.cards = S.cards.filter(x => x !== c); }); drawInventory(); });
  }
  box.querySelectorAll("[data-sort]").forEach(b => b.onclick = () => { invSort[invTab] = b.dataset.sort; drawInventory(); });
  box.querySelectorAll(".ivItem button").forEach(b => b.onclick = () => {
    const uid = b.closest(".ivItem").dataset.uid, it = uid && itemBy(uid);
    if (b.dataset.act === "eat") { if (S.hunger >= 95) toast("배불러요 · you're full"); else if (S.gimbap) { S.gimbap--; eat(FOODS.gimbap); } }
    else if (b.dataset.act === "snack") eatSnack(b.dataset.k);
    else if (b.dataset.act === "equip") { S.equip[GEAR[it.g].slot] = it.uid; recalcMax(); SFX.reload(); }
    else if (b.dataset.act === "sell") { S.items = S.items.filter(x => x !== it); S.money += gearPrice(it.g) / 2; SFX.pickup(); }
    else if (b.dataset.act === "gift") giftTo({ gear: [it.g] }, () => { S.items = S.items.filter(x => x !== it); });
    save(); drawInventory();
  });
  $("ivSlots").querySelectorAll(".ivSlot[data-slot]").forEach(el => el.onclick = () => {
    const sl = el.dataset.slot; if (sl === "weapon" || !S.equip[sl]) return;   // the weapon can only be swapped
    delete S.equip[sl]; recalcMax(); save(); drawInventory();
  });
}
$("ivClose").onclick = () => { showScreen(null); paused = false; };
$("actInv").onclick = () => openInventory();
// character screen (C): level, stats, gear, food, words
function openCharView() {
  if (!S.cls) return;
  paused = true; showScreen("charView");
  const cd = classDef(), b = bonus();
  const hit = BASE_ATTACK / CARDS_PER_ATTACK * cd.dmg * weaponMult() * lvlDmg() * (1 + b.dmg + gearStat("dmg")) * (buffOn("dmg") ? 1.05 : 1) * (S.hunger <= 0 ? HUNGRY_MULT : 1);
  $("cvTitle").textContent = `${cd.ko} · ${cd.en} · Lv ${S.level}`;
  $("cvXp").innerHTML = S.level >= MAX_LEVEL ? "최고 레벨 · max level" : `<div class="bar xp xpbig"><i style="width:${S.xp / xpNeed(S.level) * 100}%"></i><span>XP ${S.xp} / ${xpNeed(S.level)} · 다음 레벨까지 ${xpNeed(S.level) - S.xp}</span></div>`;
  const minsLeft = k => Math.max(0, Math.round((S.buffs[k] - S.time) / GAME_MIN_PER_SEC / 60));
  const food = Object.keys(BUFFS).filter(buffOn).map(k => `${BUFFS[k].ko} (${minsLeft(k)} min)`).join("<br>") || "없음 · none";
  const rows = [
    ["체력 · Health", `${Math.ceil(player.hp)} / ${player.maxHp}`],
    ["공격력 · Damage per correct card", `${Math.round(hit)}` + (S.hunger <= 0 ? " (배고픔 ×0.75)" : "")],
    ["사거리 · Range", `${cd.range} m`],
    ...Object.keys(SLOTS).map(sl => { const it = itemBy(S.equip[sl]); return [SLOTS[sl], it ? `${itemName(it)} (${itemInfo(it)})` : "없음 · none"]; }),
    ["레벨 보너스 · Level bonus", `health +${Math.round((lvlHp() - 1) * 100)}%, damage +${Math.round((lvlDmg() - 1) * 100)}%`],
    ["모드 · Mode", S.mode === "story" ? `이야기 · story (next chapter at Lv ${(bookChapters().map((c, i) => CHAPTER_LVL(i)).find(l => l > S.level)) || "—"})` : "연습 · practice (you choose the chapters, K)"],
    ["교재 · Textbook", `${(BOOKS.find(x => x.id === S.book) || BOOKS[0]).en} · ${S.chapters.map(id => DATA.chapters.find(c => c.id === id)?.title).filter(Boolean).join(", ")}`],
    ["출신 보너스 · Origin bonus", b.txt],
    [`2 · ${skillDef("s2").ko}`, skillBlock("s2") || "준비됨 · ready"],
    [`3 · ${skillDef("s3").ko}`, skillBlock("s3") || "준비됨 · ready"],
    ["스킬 · Skills (P)", `${EXTRA[S.cls].filter(x => S.level >= x.lvl).length} / ${EXTRA[S.cls].length} learned · next at Lv ${(EXTRA[S.cls].find(x => x.lvl > S.level) || { lvl: "—" }).lvl}`],
    ["음식 효과 · Food", food],
    ["배부름 · Hunger", `${Math.ceil(S.hunger)}%`],
    ["돈 · Money", won(S.money)],
    ["처치 · Monsters defeated", S.kills],
  ];
  $("cvStats").innerHTML = rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("");
  $("cvPass").textContent = cd.pass;
  const lv = heartLvl(), next = HEARTS[lv], prev = HEARTS[lv - 1] || 0;
  $("cvComp").innerHTML = !S.companion ? "" : S.companion === "gumiho"
    ? `<h3>동료 · Companion</h3><div class="cvc"><b>💗 수아 · 구미호</b><span class="hearts">${"♥".repeat(lv)}${"♡".repeat(5 - lv)}</span><div class="bar xp"><i style="width:${next ? ((S.suaHeart || 0) - prev) / (next - prev) * 100 : 100}%"></i><span>${next ? `${S.suaHeart || 0} / ${next}` : "MAX"}</span></div><span class="fine">싸울 때 16초마다 체력 ${5 + lv}% 회복, 가까이 있으면 공격 +5% · heals ${5 + lv}% every 16 s in fights, +5% damage while she's close. 같이 괴물을 이기면 ♥ +1, 퀘스트 +3, 터널 +10.</span></div>`
    : `<h3>동료 · Companion</h3><div class="cvc"><b>🐾 ${esc(petName())} · 꼬마 도깨비</b><span class="fine">근처 괴물은 8% 더 다쳐요, 15초마다 괴물 하나를 4초 동안 데려가요 · monsters near it take +8%, every 15 s it lures one away for 4 s.</span><button id="cvRename">이름 바꾸기 · rename</button></div>`;
  if ($("cvRename")) $("cvRename").onclick = () => { showScreen(null); askPetName(() => openCharView()); };
  const all = Object.keys(S.stats).filter(id => S.stats[id].s > 0), cnt = { seen: 0, learned: 0, mastered: 0 };
  all.forEach(id => { const k = mastery(id).k; if (cnt[k] !== undefined) cnt[k]++; });
  $("cvWords").innerHTML = `<div class="wc"><b>${all.length}</b><span>본 단어 · seen</span></div><div class="wc"><b>${cnt.learned + cnt.mastered}</b><span>배운 단어 · learned (3+ right)</span></div><div class="wc"><b>${cnt.mastered}</b><span>마스터 · mastered (8+ right, 80%) · +${MASTER_XP} XP each</span></div>`;
  $("cvDeck").innerHTML = deckCards("basic").map(c => { const w = WORD[c.id], st = S.stats[c.id] || { c: 0, w: 0 }, m = mastery(c.id), R = RARITY[c.rar]; return `<div class="cvw ${m.k}"><b>${w.kr}</b><span>${w.en}</span><i class="mod" style="color:${R.c}">${R.ko} · ${modText(c)}</i><i>${m.ko} · ${Math.min(st.c, 8)}/8</i></div>`; }).join("");
}
$("cvClose").onclick = () => { showScreen(null); paused = false; };
$("actChar").onclick = () => openCharView();
function onEscape() {
  if (!started) return;
  if (!$("reroll").hidden) { closeReroll(); return; }
  if (memo) { endMemory(true); return; }
  if (order) { orderClose(); return; }
  if (!$("nameBox").hidden) { $("nbOk").click(); return; }
  if (["deckView", "charView", "invView", "questView", "mapView", "achView", "bankView", "mailView", "bookView", "friendsView"].some(id => !$(id).hidden)) { showScreen(null); paused = false; return; }
  if (!$("deckPick").hidden) { if (deckCards("basic").length === 10) { showScreen(null); paused = false; } return; }
  if (ritual) { cancelRitual(); return; }
  if (dialog) { closeDialog(); return; }
  if (!$("after").hidden) { $("after").hidden = true; return; }   // the missed-words panel
  if (!$("menu").hidden) { showScreen(null); paused = false; return; }
  paused = true; showScreen("menu"); $("vol").value = S.vol; $("subs").value = S.subs; $("resetConfirm").hidden = true; drawSettings(); drawCoop();
}
$("btnResume").onclick = () => { showScreen(null); paused = false; };
$("setSens").oninput = e => { SET.sens = +e.target.value; saveSettings(); };
$("setMusic").oninput = e => { SET.music = +e.target.value; saveSettings(); setMusicVolume(SET.music); };
$("setQuality").onchange = e => { SET.quality = e.target.value; saveSettings(); applyQuality(); };
$("keysReset").onclick = () => { SET.keys = { ...DEFAULT_KEYS }; saveSettings(); drawSettings(); refreshKeyLabels(); };
$("qlClose").onclick = () => { showScreen(null); paused = false; };
$("mapClose").onclick = () => { showScreen(null); paused = false; };
$("actQuests").onclick = () => openQuestLog();
$("actMap").onclick = () => openMap();
$("actAch").onclick = () => openAchievements();
$("achClose").onclick = () => { showScreen(null); paused = false; };
$("bkClose").onclick = () => { showScreen(null); paused = false; };
$("vol").oninput = e => { S.vol = +e.target.value; setVolume(S.vol); save(); };
$("subs").onchange = e => { S.subs = e.target.value; save(); };
$("btnReset").onclick = () => $("resetConfirm").hidden = false;
$("btnResetNo").onclick = () => $("resetConfirm").hidden = true;
$("btnResetYes").onclick = () => { wipe(); location.reload(); };
$("actAttack").onclick = () => startRitual("basic");
$("actSkill2").onclick = () => startRitual("s2");
$("actSkill3").onclick = () => startRitual("s3");
$("actSkill4").onclick = () => startRitual("sleep");
$("actSkill5").onclick = () => startRitual("silence");
$("actBike").onclick = () => toggleBike();
$("actFood").onclick = () => eatGimbap();
$("actDeck").onclick = () => openDeckView();

// ---- start --------------------------------------------------------------------------------------------
function spawnPlayer() {
  if (player.model) scene.remove(player.model.root);
  ensureGear(); ensureFriendCode(); learnSkills(false); syncStory(false); if (S.level >= 4 && !S.visitedApt && S.aptHintLvl === undefined) S.visitedApt = true;   /* old saves: no nagging past Lv 4 */ syncQuestNpcs(); for (const a in mapItems) mapItems[a].visible = !S[MAP_ITEMS[a].flag];
  player.model = kayReady() ? makeKay(S.cls) : makeHero(S.cls); scene.add(player.model.root);
  player.maxHp = classDef().hp; player.hp = S.hp ?? player.maxHp; recalcMax(); spawnCompanion();
  if (S.hp == null) player.hp = player.maxHp;
}
function newGame(cls) {
  setTimeout(() => sendMail("역무원", "홍대입구역에 온 것을 환영해요. 배가 고프면 할머니 식당에 가세요. 밤에는 괴물이 많아요. 조심하세요!", "Welcome to Hongik University Station. When you're hungry, go to Grandma's restaurant. There are many monsters at night. Be careful!", { won: 3000 }), 4000);
  for (const k in cds) { cds[k] = 0; comeBacks[k] = []; }
  player.guardUntil = 0;
  wipe(); S = fresh(); S.cls = cls; S.book = newBook; S.mode = newMode; syncStory(false); spawnPlayer(); started = true;
  toStation(); const st = world.npcSpots.stranger; player.pos.set(st.x + 1, 0, st.z + 3.2); player.yaw = 0;
  showScreen(null); $("hud").hidden = false; paused = false;
  const n = npcs.find(x => x.kind === "stranger");
  showLine(n, "x_hello", [{ plr: "p_who", act: () => showLine(n, "x_who", [{ plr: "p_yes", act: deckIntro }]) }, { plr: "p_yes", act: deckIntro }]);
  function deckIntro() { showLine(n, "x_deck", [{ plr: "p_yes", act: () => { closeDialog(); openDeckPicker(true); } }]); }
}
function continueGame() {
  spawnPlayer(); started = true; toStation(); showScreen(null); $("hud").hidden = false; paused = false; autoOnline(); setTimeout(refreshFriends, 3000);
  if (!deckCards("basic").length) openDeckPicker(true);
}

// ---- HUD update --------------------------------------------------------------------------------------------
const mm = $("minimap").getContext("2d");
function drawHUD() {
  const cd = classDef();
  $("pName").textContent = `Lv ${S.level} ${cd.ko}`;
  $("xpFill").style.width = (S.level >= MAX_LEVEL ? 100 : S.xp / xpNeed(S.level) * 100) + "%"; $("xpTxt").textContent = S.level >= MAX_LEVEL ? "MAX" : `XP ${S.xp} / ${xpNeed(S.level)}`; $("pGear").textContent = cd.weapons[weaponTier()];
  $("hpFill").style.width = Math.max(0, player.hp / player.maxHp * 100) + "%"; $("hpTxt").textContent = `${Math.ceil(Math.max(0, player.hp))} / ${player.maxHp}`;
  $("hgFill").style.width = S.hunger + "%"; $("hgTxt").textContent = S.hunger <= 0 ? "배고파요! 공격 75%" : `배부름 ${Math.ceil(S.hunger)}%`;
  document.querySelector(".bar.hunger").classList.toggle("empty", S.hunger <= 0);
  $("money").textContent = won(S.money);
  $("buffs").innerHTML = Object.keys(BUFFS).filter(buffOn).map(b => `<span class="buff">${BUFFS[b].ko}</span>`).join("") + (player.rootedUntil > clock ? '<span class="buff bad">묶임</span>' : "");
  const h = Math.floor(gameHour()), m = Math.floor((S.time % 60));
  $("clock").textContent = `${night > .5 ? "🌙" : "☀"} ${dayNum()}일째 ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  { const sn = Object.values(S.snacks || {}).reduce((a, b) => a + b, 0); $("gimbapN").textContent = "김밥 " + S.gimbap + (sn ? ` +${sn}` : ""); $("actFood").classList.toggle("off", !S.gimbap && !sn); }
  $("actAttack").dataset.tip = tipSkill("basic");
  $("atkCd").style.height = (Math.max(0, cds.basic - clock) / SKILLS.basic.cd * 100) + "%";
  for (const [k, n] of [["s2", 2], ["s3", 3], ["sleep", 4], ["silence", 5]]) { const sk = skillDef(k), blk = skillBlock(k); $(`s${n}Name`).textContent = sk.ko; $(`actSkill${n}`).classList.toggle("off", !!blk); $(`actSkill${n}`).dataset.tip = tipSkill(k);
    $(`s${n}Cd`).style.height = (blk ? 0 : Math.max(0, cds[k] - clock) / sk.cd * 100) + "%"; }
  if (target) { $("tFill").style.width = Math.max(0, target.hp / target.maxHp * 100) + "%"; $("tTxt").textContent = `${Math.max(0, Math.ceil(target.hp))} / ${target.maxHp}`;
    $("tWeak").innerHTML = `약점 <b style="color:${ELEMENTS[target.def.weak].c}">${ELEMENTS[target.def.weak].ko}</b>` + (target.def.immune ? ` · 면역 <b style="color:${ELEMENTS[target.def.immune].c}">${ELEMENTS[target.def.immune].ko}</b>` : "") + ` · ${dist2(target.pos, player.pos).toFixed(0)} m`; }
  const it = nearestInteract(); $("interact").hidden = !it || !!dialog; if (it) $("interact").textContent = it.label;
  // minimap: the 60 m around you (the whole district needs the map, M)
  if (player.zone === "dungeon") drawDungeonMap(mm, 170, 170, player.pos.x, player.pos.z, 80, false);
  else if (player.zone === "tower") drawDungeonMap(mm, 170, 170, player.pos.x, player.pos.z, 80, false, TOWER, "tower");
  else if (player.zone === "market") drawDungeonMap(mm, 170, 170, player.pos.x, player.pos.z, 80, false, MARKET, "market");
  else { const c = player.zone === "street" || player.zone === "yeouido" ? player.pos : ENTRANCE; drawMap(mm, 170, 170, c.x, c.z, 60, false); }
  drawTracker(); drawParty(); drawBar();
  $("actBike").hidden = !S.bikeRented; $("actBike").classList.toggle("on", !!player.riding);
  { const n = unreadMail(); $("mailInd").hidden = !n; if (n) $("mailInd").textContent = `✉ ${n}`; }
}
function drawPlates() {
  const list = [...monsters.filter(m => !m.dead).map(m => [m, m.plate, m.model.height + .3]), ...npcs.map(n => [n, n.plate, 2.7])];
  for (const [e, el, h] of list) {
    tmpV.set(e.pos.x, h, e.pos.z);
    const far = dist2(e.pos, player.pos) > 38 || (e.isNpc ? player.zone !== (e.zone || "station") || !e.model.root.visible : player.zone !== e.zone);
    tmpV.project(camera);
    if (far || tmpV.z > 1) { el.style.display = "none"; continue; }
    el.style.display = ""; el.style.left = (tmpV.x * .5 + .5) * innerWidth + "px"; el.style.top = (-tmpV.y * .5 + .5) * innerHeight + "px";
    if (e.isNpc) { const mk = npcMarker(e), html = (mk ? `<span class="qmk${mk === "…" ? " dim" : ""}">${mk}</span>` : "") + e.name; if (el.innerHTML !== html) el.innerHTML = html; }
    if (e.isMonster) { el.className = "plate" + (e === target ? " tgt" : e.state === "chase" ? " aggro" : ""); el.querySelector("i").style.width = Math.max(0, e.hp / e.maxHp * 100) + "%"; const lv = el.querySelector(".lv"), lc = "lv " + gapClass(e.lvl); if (lv && lv.className !== lc) lv.className = lc; }
  }
}

// ---- quests (decision 25; Danny 2026-10-11: quest log + the first quests) --------------------------------
// kinds: kill X monsters · deliver food to a survivor · find a lost person and talk to her in Korean · collect cards
const QUESTS = {
  goblins: { giver: "guard", ko: "도깨비 퇴치", en: "Goblin trouble", kind: "kill", target: "dokkaebi", n: 5,
             offer: "q_g1", wait: "q_g1_wait", done: "q_g1_done", turn: "p_done", reward: { won: 8000, xp: 60 },
             desc: "꼬마 도깨비 다섯 마리를 잡고 역무원에게 돌아가세요 · defeat 5 little goblins, then return to the station worker" },
  haetae: { giver: "guard", needs: "goblins", ko: "해태를 멈춰라", en: "Stop the haetae", kind: "kill", target: "haetae", n: 2,
            offer: "q_g2", wait: "q_g2_wait", done: "q_g2_done", turn: "p_done", reward: { won: 12000, xp: 90, gear: "t_scale" },
            desc: "해태 석상 두 개를 멈추고 역무원에게 돌아가세요 · stop 2 haetae statues (fire does nothing to them)" },
  lunch: { giver: "grandma", ko: "할머니의 도시락", en: "Grandma's lunch box", kind: "deliver", to: "minsu",
           offer: "q_r1", wait: "q_r1_wait", done: "m_thanks", turn: "p_lunch", reward: { won: 5000, xp: 40 },
           desc: "버스킹 광장의 민수 씨에게 도시락을 갖다 주세요 · bring the lunch box to Minsu at the busking square" },
  sister: { giver: "minsu", needs: "lunch", ko: "잃어버린 동생", en: "The lost sister", kind: "find", to: "jieun",
            offer: "m_q", wait: "m_wait", done: "m_done", turn: "p_found", reward: { won: 10000, xp: 80, card: 1 },
            desc: "홍대 어딘가에서 지은 씨를 찾아 한국어로 말해 보세요, 그리고 민수 씨에게 · find Jieun somewhere in Hongdae, talk to her, then tell Minsu" },
  parking: { giver: "gyeongbi", ko: "주차장의 도깨비", en: "Goblins in the parking lot", kind: "kill", target: "dokkaebi", minLvl: 4, n: 6,
             offer: "b_q", wait: "b_wait", done: "b_done", turn: "p_done", reward: { won: 15000, xp: 150, card: 2 },
             desc: "서교 아파트 주차장에서 큰 도깨비 여섯 마리를 잡으세요 · defeat 6 big goblins (Lv 4+) in the apartment complex, then see the 경비 아저씨" },
  teacher: { giver: "driver", ko: "부적 선생님", en: "The talisman teacher", kind: "deliver", to: "teacher", silent: true,
             offer: "d_hint", wait: "d_hint", done: "t_hello", turn: "p_sent", reward: { won: 0, xp: 30 },
             desc: "서교 아파트의 정자에 계신 부적 선생님을 찾아가세요 · find the talisman teacher at the pavilion (정자) in 서교 아파트" },
  tunnel: { giver: "driver", needs: "teacher", ko: "터널의 주인", en: "Master of the tunnel", kind: "kill", target: "chief", n: 1,
            offer: "d_q", wait: "d_wait", done: "d_done", turn: "p_done", reward: { won: 30000, xp: 300, card: 3 },
            desc: "역의 터널 끝에 있는 도깨비 대장을 물리치세요 (같이 가면 좋아요) · defeat the goblin chief at the end of the tunnel (better with a friend)" },
  sua: { giver: "sua", ko: "수아의 김밥", en: "A gimbap for Sua", kind: "custom", reward: { won: 0, xp: 100 },
         desc: "한강공원의 수아에게 김밥을 갖다 주세요 (할머니 식당에서 포장) · bring Sua at the Han River park a gimbap (takeaway from Grandma's restaurant)" },
  jangseung: { giver: "gayoung", ko: "깨어난 장승", en: "The guardians awake", kind: "kill", target: "jangseung", n: 4,
               offer: "y_q", wait: "y_wait", done: "y_done", turn: "p_done", reward: { won: 25000, xp: 300, card: 2 },
               desc: "여의도 한강공원의 장승 네 개를 쓰러뜨리고 가영 씨에게 돌아가세요 · knock down 4 guardian posts on 여의도, then go back to 가영 at the bridge" },
  exam: { giver: "gangsa", ko: "학원의 귀신", en: "Ghosts of the academy", kind: "kill", target: "gwisin", n: 5,
          offer: "n_q", wait: "n_wait", done: "n_done", turn: "p_done", reward: { won: 30000, xp: 450, card: 3 },
          desc: "노량진 학원가의 시험 귀신 다섯 마리를 쫓아내고 박 선생님에게 · chase away 5 exam ghosts on the 노량진 cram-school street, then see 박 선생님" },
  cards: { giver: "trader", ko: "카드 수집가", en: "The card collector", kind: "cards", n: 3,
           offer: "q_t1", wait: "q_t1_wait", done: "q_t1_done", turn: "p_pay", reward: { won: 6000, xp: 60, card: 2 },
           desc: "이 단어 카드 세 장을 가방에 모아서 카드 상인에게 · collect these 3 word cards (loose, in your bag) for the card trader" },
};
const qState = id => S.quests[id];
const qAvailable = id => { const q = QUESTS[id]; return q.kind !== "custom" && !S.quests[id] && (!q.needs || S.quests[q.needs]?.st === "done"); };
const qTurnInNpc = q => q.kind === "deliver" ? q.to : q.giver;
function qProgress(id) {
  const q = QUESTS[id], st = S.quests[id]; if (!st) return "";
  if (q.kind === "kill") return `${Math.min(st.c, q.n)} / ${q.n}`;
  if (q.kind === "cards") return `${cardsHave(st).length} / ${q.n}`;
  if (q.kind === "find") return st.found ? "찾았어요 · found" : "찾는 중 · searching";
  if (id === "sua") return S.gimbap ? "김밥 있음 → 수아" : "김밥 사기 · buy a gimbap";
  return "";
}
function cardsHave(st) { const bag = bagCards(); return st.words.filter(id => bag.some(c => c.id === id)); }
function qReady(id) {
  const q = QUESTS[id], st = S.quests[id]; if (!st || st.st !== "active" || q.kind === "custom") return false;
  if (q.kind === "kill") return st.c >= q.n;
  if (q.kind === "cards") return cardsHave(st).length >= q.n;
  if (q.kind === "find") return !!st.found;
  return q.kind === "deliver";                     // ready as soon as you reach the person
}
function acceptQuest(id) {
  const q = QUESTS[id], st = { st: "active", c: 0 };
  if (q.kind === "cards") { st.words = []; for (const k of ["dokkaebi", "vine", "haetae"]) st.words.push(pick(monsterPool(k).filter(w => !st.words.includes(w)))); }   // one per monster kind, all different
  S.quests[id] = st; SFX.pickup(); toast(`퀘스트 수락 · ${q.ko} (L)`); save();
  if (q.kind === "find") { const j = npcs.find(n => n.kind === "jieun"); if (j) j.model.root.visible = true; }
}
function completeQuest(id) {
  const q = QUESTS[id], st = S.quests[id], r = q.reward;
  if (q.kind === "cards") for (const w of st.words) { const c = bagCards().filter(x => x.id === w).sort((a, b) => a.rar - b.rar)[0]; if (c) S.cards = S.cards.filter(x => x !== c); }
  st.st = "done"; addHeart(3);
  if (r.won) S.money += r.won;
  const att = {};
  if (r.gear) att.gear = [r.gear];
  if (r.card) { const pool = DATA.words.filter(w => (S.chapters.length ? S.chapters : [w.ch]).includes(w.ch)); att.cards = [{ id: pick(pool.filter(w => (w.book || "5a") === S.book)).id, rar: r.card }]; }
  if (att.gear || att.cards) setTimeout(() => sendMail(NPC_DEF[q.giver].split(" · ")[0], "도와줘서 고마워요. 작은 선물을 보내요. 역에 있는 우체통에서 받으세요.", "Thank you for helping. I'm sending a small gift. Pick it up at the post box in the station.", att), 1500);
  toast(`퀘스트 완료! ${q.ko} · +${won(r.won || 0)}`); SFX.kill();
  gainXp(r.xp); save();
}
function onKillForQuests(m) {
  for (const [id, q] of Object.entries(QUESTS)) {
    const st = S.quests[id];
    if (q.kind !== "kill" || !st || st.st !== "active" || q.target !== m.kind || st.c >= q.n || (q.minLvl && m.lvl < q.minLvl)) continue;
    st.c++; toast(`${q.ko} ${Math.min(st.c, q.n)} / ${q.n}` + (st.c >= q.n ? " · 완료! 돌아가세요 · return" : ""));
  }
}
// quest marker over an NPC: "!" = new quest, "?" gold = hand in, "…" = you're on it
function npcMarker(n) {
  if (n.kind === "sua") return suaMarker();
  for (const id in QUESTS) { const q = QUESTS[id]; if (qReady(id) && qTurnInNpc(q) === n.kind) return "?"; }
  for (const id in QUESTS) if (QUESTS[id].giver === n.kind && qAvailable(id)) return "!";
  for (const id in QUESTS) { const q = QUESTS[id], st = S.quests[id]; if (st && st.st === "active" && (qTurnInNpc(q) === n.kind || (q.kind === "find" && q.to === n.kind && !st.found))) return "…"; }
  return "";
}
// talking: hand in first, then a new quest, then a reminder, then the NPC's normal business
function questTalk(n, normal) {
  for (const id in QUESTS) {
    const q = QUESTS[id];
    if (q.kind === "find" && q.to === n.kind && S.quests[id]?.st === "active" && !S.quests[id].found) { findTalk(n, id); return true; }
    if (qReady(id) && qTurnInNpc(q) === n.kind && q.silent) { completeQuest(id); continue; }
    if (qReady(id) && qTurnInNpc(q) === n.kind) {
      showLine(n, q.done === "m_thanks" ? "m_hello" : q.wait, [{ plr: q.turn, act: () => { completeQuest(id); showLine(n, q.done, [{ plr: "p_yes", act: () => { if (id === "exam") { readList(); return; } if (!questTalk(n, normal)) closeDialog(); } }]); } }]);
      return true;
    }
  }
  for (const id in QUESTS) {
    const q = QUESTS[id];
    if (q.giver === n.kind && qAvailable(id)) {
      const words = () => q.kind === "cards" ? " " + S.quests[id].words.map(w => WORD[w].kr).join(", ") : "";
      showLine(n, q.offer, [{ plr: "p_ok", act: () => { acceptQuest(id); if (q.kind === "cards") toast(`찾을 카드 · ${words()}`); normal ? normal() : closeDialog(); } }, { plr: "p_later", act: () => normal ? normal() : closeDialog() }]);
      return true;
    }
  }
  for (const id in QUESTS) {
    const q = QUESTS[id], st = S.quests[id];
    if (st && st.st === "active" && qTurnInNpc(q) === n.kind && q.kind !== "deliver" && q.kind !== "custom") {
      showLine(n, q.wait, [{ plr: "p_yes", act: () => normal ? normal() : closeDialog() }]);
      return true;
    }
  }
  return false;
}
// 지은: the Korean test of the "find" quest — pick the sentence that makes sense
function findTalk(n, id) {
  const ask = () => showLine(n, "j_hello", shuffle([
    { plr: "p_brother", act: () => { S.quests[id].found = true; save(); showLine(n, "j_relief", [{ plr: "p_yes", act: () => { closeDialog(); fade(() => { n.model.root.visible = false; toast("지은 씨가 민수 씨에게 갔어요 · Jieun ran to Minsu"); }); } }]); } },
    { plr: "p_hungry", act: () => showLine(n, "j_what", [{ ko: "(다시 말해 보기)", en: "try again", act: ask }]) },
  ]));
  ask();
}

// ---- maps: the minimap shows the 60 m around you; the full map (M) shows each area you've found a map for ----
// 홍대 지도 at the 관광안내소 (park), 서교 아파트 지도 on the 경비실 counter at the apartment gate
const MAP_ITEMS = { hongdae: { spot: MAPSPOT, flag: "hasMap", line: "x_map", ko: "홍대 지도", en: "Hongdae map" }, apt: { spot: MAPSPOT_APT, flag: "hasMapApt", line: "x_map2", ko: "서교 아파트 지도", en: "apartment map" }, river: { spot: MAPSPOT_RIVER, flag: "hasMapRiver", line: "x_map3", ko: "한강공원 지도", en: "Han River park map" }, yeouido: { spot: MAPSPOT_YD, flag: "hasMapYd", line: "x_map4", ko: "여의도 지도", en: "Yeouido map", zone: "yeouido" }, noryangjin: { spot: MAPSPOT_NR, flag: "hasMapNr", line: "x_map5", ko: "노량진 지도", en: "Noryangjin map", zone: "yeouido" } };
const ownedAreas = () => Object.keys(MAP_ITEMS).filter(a => S[MAP_ITEMS[a].flag]);
const inAreas = (p, areas) => areas.some(a => { const b = world.map.areas[a]; return p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ; });
function drawMap(ctx, W, H, cx, cz, span, full, areas = Object.keys(MAP_ITEMS)) {
  const M = world.map, k = Math.min(W, H) / span;
  const mx = x => W / 2 + (x - cx) * k, mz = z => H / 2 + (z - cz) * k;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = "rgba(60,70,58,.85)"; ctx.fillRect(0, 0, W, H);
  for (const r of M.rects) if (areas.includes(r.area)) { ctx.fillStyle = r.c; ctx.fillRect(mx(r.x0), mz(r.z0), (r.x1 - r.x0) * k, (r.z1 - r.z0) * k); }
  if (areas.includes("hongdae")) { ctx.fillStyle = "#00a84d"; ctx.fillRect(mx(ENTRANCE.x) - 4, mz(ENTRANCE.z) - 4, 8, 8); }
  for (const a of areas) { const sp = MAP_ITEMS[a].spot; ctx.fillStyle = "#2f6db3"; ctx.fillRect(mx(sp.x) - 3, mz(sp.z) - 3, 6, 6); }
  for (const rk of BIKE_RACKS) if (!full || inAreas(rk, areas)) { ctx.fillStyle = "#3bb54a"; ctx.fillRect(mx(rk.x) - 3.5, mz(rk.z) - 3.5, 7, 7); }
  if (full) {
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.lineWidth = 3; ctx.font = `bold ${Math.round(W / 40)}px "Noto Sans KR","Malgun Gothic",sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const L of M.labels) if (areas.includes(L.area)) { ctx.save(); ctx.translate(mx(L.x), mz(L.z)); if (L.rot) ctx.rotate(L.rot); ctx.strokeText(L.t, 0, 0); ctx.fillText(L.t, 0, 0); ctx.restore(); }
  }
  ctx.font = `bold ${full ? 18 : 12}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const n of npcs) {
    const mk = npcMarker(n); if (!mk || !n.model.root.visible) continue;
    const at = n.zone ? n.pos : { x: ENTRANCE.x + 4, z: ENTRANCE.z };
    if (full && !inAreas(at, areas)) continue;
    ctx.fillStyle = mk === "…" ? "#ccc" : "#ffd23d"; ctx.strokeStyle = "#000"; ctx.lineWidth = 3; ctx.strokeText(mk, mx(at.x), mz(at.z)); ctx.fillText(mk, mx(at.x), mz(at.z));
  }
  for (const mo of monsters) if (!mo.dead && (!full || inAreas(mo.pos, areas))) { ctx.fillStyle = mo === target ? "#ffd23d" : mo.state === "chase" ? "#ff5a4a" : "#e07a6a"; ctx.beginPath(); ctx.arc(mx(mo.pos.x), mz(mo.pos.z), full ? 4 : 2.6, 0, 7); ctx.fill(); }
  const pp = player.zone === "street" || player.zone === "yeouido" ? player.pos : { x: ENTRANCE.x, z: ENTRANCE.z };
  if (full && !inAreas(pp, areas)) return;
  const px = mx(pp.x), pz = mz(pp.z), fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), s = full ? 1.6 : 1;
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.moveTo(px + fx * 7 * s, pz + fz * 7 * s); ctx.lineTo(px - fz * 4 * s - fx * 3.5 * s, pz + fx * 4 * s - fz * 3.5 * s); ctx.lineTo(px + fz * 4 * s - fx * 3.5 * s, pz - fx * 4 * s - fz * 3.5 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
}
function openMap() {
  if (!S.cls) return;
  paused = true; showScreen("mapView");
  if (player.zone === "dungeon") { $("mapNone").hidden = true; $("bigMap").hidden = false; $("mapTitle").textContent = "홍대 터널"; $("bigMap").width = 720; $("bigMap").height = 300; drawDungeonMap($("bigMap").getContext("2d"), 720, 300, DUNGEON.wrects[0].x0 + 150, 0, 316, true); return; }
  if (player.zone === "market") { $("mapNone").hidden = true; $("bigMap").hidden = false; $("mapTitle").textContent = "노량진 수산시장"; $("bigMap").width = 720; $("bigMap").height = 300; drawDungeonMap($("bigMap").getContext("2d"), 720, 300, MK.x + 128, MK.z, 270, true, MARKET, "market"); return; }
  if (player.zone === "tower") { $("mapNone").hidden = true; $("bigMap").hidden = false; $("mapTitle").textContent = "63빌딩"; $("bigMap").width = 720; $("bigMap").height = 300; drawDungeonMap($("bigMap").getContext("2d"), 720, 300, TW.x + 131, TW.z, 276, true, TOWER, "tower"); return; }
  const own = ownedAreas().filter(a => (MAP_ITEMS[a].zone || "street") === player.zone);
  $("mapNone").hidden = own.length > 0; $("bigMap").hidden = !own.length;
  $("mapTitle").textContent = own.map(a => MAP_ITEMS[a].ko.replace(" 지도", "")).join(" · ") || "지도";
  if (!own.length) return;
  const bs = own.map(a => world.map.areas[a]);
  const x0 = Math.min(...bs.map(b => b.minX)), x1 = Math.max(...bs.map(b => b.maxX)), z0 = Math.min(...bs.map(b => b.minZ)), z1 = Math.max(...bs.map(b => b.maxZ));
  const W = 720, H = Math.round(720 * Math.min(1, (z1 - z0) / (x1 - x0) + .05));
  $("bigMap").width = W; $("bigMap").height = H;
  drawMap($("bigMap").getContext("2d"), W, H, (x0 + x1) / 2, (z0 + z1) / 2, Math.max(x1 - x0, (z1 - z0) * W / H) + 12, true, own);
}
const mapItems = {};
function takeMap(area) {
  const it = MAP_ITEMS[area]; if (S[it.flag]) return;
  S[it.flag] = true; save(); SFX.pickup(); speak(it.line);
  toast(`${it.ko}를 찾았어요! · you found the ${it.en} (${keyName(SET.keys.map)})`);
  if (mapItems[area]) mapItems[area].visible = false;
}
function placeMapItem() {
  for (const [area, it] of Object.entries(MAP_ITEMS)) {
    const g = new THREE.Group(); g.position.set(it.spot.x, area === "apt" ? 1.13 : area === "river" || area === "yeouido" || area === "noryangjin" ? 1.75 : 1.25, it.spot.z + (area === "apt" ? -1.3 : area === "river" ? -1.24 : area === "yeouido" || area === "noryangjin" ? 1.24 : .35)); if (area === "river" || area === "yeouido" || area === "noryangjin") g.rotation.x = Math.PI / 2;
    g.add(new THREE.Mesh(new THREE.BoxGeometry(.7, .04, .5), toon("#f6ead2", { emissive: new THREE.Color("#ffd23d"), emissiveIntensity: .35 })));
    scene.add(g); mapItems[area] = g; g.visible = !S[it.flag];
  }
}

// ---- quest log (L) + the tracker under the minimap ----
function openQuestLog() {
  if (!S.cls) return;
  paused = true; showScreen("questView");
  const act = Object.keys(QUESTS).filter(id => S.quests[id]?.st === "active"), done = Object.keys(QUESTS).filter(id => S.quests[id]?.st === "done");
  const giverName = k => NPC_DEF[k] || k;
  $("qlActive").innerHTML = act.length ? act.map(id => { const q = QUESTS[id], st = S.quests[id];
    const extra = q.kind === "cards" ? `<div class="qwords">${st.words.map(w => `<span class="${bagCards().some(c => c.id === w) ? "have" : ""}">${WORD[w].kr} · ${WORD[w].en}</span>`).join("")}</div>` : "";
    return `<div class="qItem${qReady(id) ? " ready" : ""}"><b>${q.ko}</b><span class="en">${q.en}</span><p>${q.desc}</p>${extra}<div class="qmeta"><span>${qProgress(id)}</span><span>${qReady(id) ? "✔ " : ""}돌아갈 곳 · hand in: ${giverName(qTurnInNpc(q))}</span><span>보상 · ${won(q.reward.won || 0)} · ${q.reward.xp} XP</span></div></div>`; }).join("")
    : `<p class="fine">진행 중인 퀘스트가 없어요. 머리 위에 ! 가 있는 사람과 이야기해 보세요. · No active quests: talk to people with a ! above their head.</p>`;
  $("qlDone").innerHTML = done.length ? done.map(id => `<span class="qdone">✔ ${QUESTS[id].ko}</span>`).join("") : `<span class="fine">아직 없음 · none yet</span>`;
}
function drawTracker() {
  const act = Object.keys(QUESTS).filter(id => S.quests[id]?.st === "active");
  const html = act.map(id => `<div class="${qReady(id) ? "ready" : ""}"><b>${QUESTS[id].ko}</b> <span>${qProgress(id) || (qReady(id) ? "→ " + (NPC_DEF[qTurnInNpc(QUESTS[id])] || "") : "")}</span></div>`).join("");
  if ($("tracker").innerHTML !== html) $("tracker").innerHTML = html;
}

// ---- settings screen: keys, mouse, graphics ----
let rebinding = null;
function drawSettings() {
  $("setSens").value = SET.sens; $("setQuality").value = SET.quality; $("setMusic").value = SET.music;
  $("keyList").innerHTML = Object.keys(ACTIONS).map(a => `<div class="krow"><span>${ACTIONS[a]}</span><button data-a="${a}" class="${rebinding === a ? "wait" : ""}">${rebinding === a ? "키를 누르세요 · press a key" : keyName(SET.keys[a])}</button></div>`).join("");
  $("keyList").querySelectorAll("button").forEach(b => b.onclick = () => { rebinding = b.dataset.a; drawSettings(); });
}
function bindKey(k) {
  if (RESERVED.has(k)) { toast("이 키는 이동용이에요 · that key is used for walking"); rebinding = null; drawSettings(); return; }
  const other = actionFor(k);
  if (other && other !== rebinding) SET.keys[other] = SET.keys[rebinding];   // swap so no action loses its key
  SET.keys[rebinding] = k; rebinding = null; saveSettings(); drawSettings(); refreshKeyLabels();
}
function applyQuality() {
  const q = SET.quality;
  renderer.setPixelRatio(q === "high" ? Math.min(devicePixelRatio, 1.5) : 1);
  const shadows = q !== "low";
  if (renderer.shadowMap.enabled !== shadows) { renderer.shadowMap.enabled = shadows; scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); }); }
  const size = q === "high" ? 2048 : 1024;
  if (world && world.sun.shadow.mapSize.x !== size) { world.sun.shadow.mapSize.set(size, size); if (world.sun.shadow.map) { world.sun.shadow.map.dispose(); world.sun.shadow.map = null; } }
  resize();
}
function refreshKeyLabels() {
  const set = (id, a) => { const el = $(id)?.querySelector("kbd"); if (el) el.textContent = keyName(SET.keys[a]); };
  set("actAttack", "basic"); set("actSkill2", "s2"); set("actSkill3", "s3"); set("actSkill4", "sleep"); set("actSkill5", "silence"); set("actBike", "bike"); set("actBook", "book"); set("actFriends", "friends"); for (let i = 0; i < 10; i++) { const el = $("actB" + i); if (el) el.dataset.id = "-"; } set("actFood", "food"); set("actInv", "inv"); set("actChar", "char"); set("actDeck", "deck"); set("actQuests", "quests"); set("actMap", "map"); set("actAch", "ach");
  $("keys").innerHTML = `<span><b>WASD</b> 이동</span><span><b>drag</b> 카메라</span><span><b>${keyName(SET.keys.target)}</b> 대상</span><span><b>${keyName(SET.keys.interact)}</b> 대화</span><span><b>Enter</b> 채팅</span><span><b>${keyName(SET.keys.wave)} ${keyName(SET.keys.bow)}</b> 👋🙇</span><span><b>Esc</b> 메뉴·설정</span>`;
}

// ---- tooltips: hover anything with data-tip (cards, gear, skills, buttons) ----------------------------------
const esc = t => String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function modExplain(c) {
  const m = c.mod;
  if (m.t === "dmg") return `이 카드가 맞으면 공격력 +${pct(m.v)} · when this card is answered right, the attack does ${pct(m.v)} more damage`;
  if (m.t === "cd") return `재사용 대기 −${pct(m.v)} · the skill is ready ${pct(m.v)} sooner`;
  if (m.t === "ls") return `흡혈 ${pct(m.v)} · you heal ${pct(m.v)} of the damage`;
  return `속성 ${ELEMENTS[m.el].ko} · ×${EL_MULT[c.rar]} against monsters weak to ${m.el}` + (m.el === "fire" ? " (해태 is immune)" : "");
}
function tipCard(c) {
  const w = WORD[c.id], R = RARITY[c.rar], st = S.stats[c.id] || { c: 0, w: 0 };
  const where = skillKeys().find(k => (S.skillDecks[k] || []).includes(c.uid)), banked = S.bank.cards.includes(c.uid);
  return `<b class="tk">${w.kr}</b> <span class="tr" style="color:${R.c}">${R.ko} · ${R.en}${c.gift ? " · 선물 gift" : ""}</span><div>${w.en} · ${POSKO[w.pos]}</div>`
    + `<div class="tm">${modExplain(c)}</div>`
    + (w.ex ? `<div class="tx">${w.ex[0]}<br><span>${w.ex[1]}</span></div>` : "")
    + `<div class="ts">${mastery(c.id).ko} · 맞음 ${st.c} · 틀림 ${st.w} · ${where ? "📌 " + skillDef(where).ko : banked ? "🔒 보관함 · storage" : "가방 · bag"}</div>`;
}
function tipWord(w) { return `<b class="tk">${w.kr}</b><div>${w.en} · ${POSKO[w.pos]}</div>` + (w.ex ? `<div class="tx">${w.ex[0]}<br><span>${w.ex[1]}</span></div>` : ""); }
function tipGear(g) {
  const d = GEAR[g], from = d.drop ? `${MONS[d.drop].ko} drop` : d.slot === "weapon" ? "무기점 · weapon shop" : d.price ? "무기점 · weapon shop" : "starting gear";
  return `<b class="tk">${gearName(g)}</b> <span class="tr">${SLOTS[d.slot]}</span><div class="tm">${gearInfo(g)}</div><div class="ts">${from} · 팔면 ${won(gearPrice(g) / 2)}</div>`;
}
function tipSkill(k) {
  const sk = skillDef(k), blk = skillBlock(k), n = deckCards(k).length;
  return `<b class="tk">${sk.ko}</b> <span class="tr">${sk.en} · key ${SET.keys[k] ? keyName(SET.keys[k]) : barKeyLabel(k)}</span><div class="tm">${k === "basic" ? "1 card · 1× damage" : sk.info}</div><div class="ts">재사용 ${sk.cd} s · 덱 ${n}/10 · Lv ${sk.lvl}${blk ? " · " + blk : " · 준비됨 ready"}</div>`;
}
const tipEl = document.createElement("div"); tipEl.id = "tip"; tipEl.hidden = true; document.body.appendChild(tipEl);
let tipFor = null;
addEventListener("mouseover", e => { const t = e.target.closest?.("[data-tip]"); if (t === tipFor) return; tipFor = t; if (!t) { tipEl.hidden = true; return; } tipEl.innerHTML = t.dataset.tip; tipEl.hidden = false; });
addEventListener("mousemove", e => { if (tipEl.hidden) return; const w = tipEl.offsetWidth, h = tipEl.offsetHeight; tipEl.style.left = Math.min(innerWidth - w - 8, e.clientX + 16) + "px"; tipEl.style.top = Math.max(8, Math.min(innerHeight - h - 8, e.clientY + 16)) + "px"; });
addEventListener("mousedown", () => { tipEl.hidden = true; tipFor = null; });

// ---- achievements (Y) ------------------------------------------------------------------------------------------
const correctTotal = () => Object.values(S.stats).reduce((a, s) => a + s.c, 0);
const killsOf = k => (S.killsBy || {})[k] || 0;
const ACH = [
  { id: "word1", ko: "첫 단어", en: "First word", desc: "Answer a card right", prog: () => [correctTotal(), 1], reward: { xp: 10 } },
  { id: "word100", ko: "단어 백 개", en: "A hundred words", desc: "Answer 100 cards right", prog: () => [correctTotal(), 100], reward: { won: 5000, xp: 50 } },
  { id: "word500", ko: "단어 오백 개", en: "Five hundred words", desc: "Answer 500 cards right", prog: () => [correctTotal(), 500], reward: { won: 20000, xp: 200 } },
  { id: "master1", ko: "첫 마스터", en: "First mastery", desc: "Master a word (8 right, 80%)", prog: () => [S.mastered.length, 1], reward: { xp: 30 } },
  { id: "master10", ko: "마스터 열 개", en: "Ten masteries", desc: "Master 10 words", prog: () => [S.mastered.length, 10], reward: { won: 15000, xp: 150 } },
  { id: "gob20", ko: "도깨비 사냥꾼", en: "Goblin hunter", desc: "Defeat 20 little goblins", prog: () => [killsOf("dokkaebi"), 20], reward: { won: 5000, xp: 60 } },
  { id: "vine20", ko: "정원사", en: "Gardener", desc: "Defeat 20 vine spirits", prog: () => [killsOf("vine"), 20], reward: { won: 6000, xp: 70 } },
  { id: "haetae10", ko: "석공", en: "Stonebreaker", desc: "Stop 10 haetae statues", prog: () => [killsOf("haetae"), 10], reward: { won: 8000, xp: 90 } },
  { id: "map", ko: "길 찾기", en: "Pathfinder", desc: "Find the Hongdae map", prog: () => [S.hasMap ? 1 : 0, 1], reward: { xp: 20 } },
  { id: "map2", ko: "단지 탐험", en: "Complex explorer", desc: "Find the 서교 아파트 map", prog: () => [S.hasMapApt ? 1 : 0, 1], reward: { xp: 40 } },
  { id: "foodie", ko: "미식가", en: "Foodie", desc: "Eat every dish at 할머니 식당", prog: () => [Object.keys(FOODS).filter(f => (S.ate || {})[f]).length, Object.keys(FOODS).length], reward: { won: 5000, xp: 40 } },
  { id: "quests", ko: "홍대의 친구", en: "Friend of Hongdae", desc: "Finish every Hongdae quest", prog: () => [Object.keys(QUESTS).filter(id => S.quests[id]?.st === "done").length, Object.keys(QUESTS).length], reward: { won: 20000, xp: 200 } },
  { id: "dungeon1", ko: "터널의 영웅", en: "Hero of the tunnel", desc: "Defeat the goblin chief", prog: () => [S.dunClears ? 1 : 0, 1], reward: { won: 20000, xp: 100 } },
  { id: "map3", ko: "강바람", en: "River breeze", desc: "Find the Han River park map", prog: () => [S.hasMapRiver ? 1 : 0, 1], reward: { xp: 40 } },
  { id: "alien1", ko: "첫 접촉", en: "First contact", desc: "Defeat an alien", prog: () => [killsOf("alien_scout") + killsOf("alien_caster"), 1], reward: { won: 15000, xp: 100 } },
  { id: "fish10", ko: "강태공", en: "Angler", desc: "Catch 10 fish at the 낚시터", prog: () => [S.fishTotal || 0, 10], reward: { won: 8000, xp: 60 } },
  { id: "upgrade", ko: "대장장이의 친구", en: "Smith's friend", desc: "Upgrade gear at the smith", prog: () => [S.upgrades || 0, 1], reward: { xp: 40 } },
  { id: "companion", ko: "동반자", en: "Companion", desc: "Help 수아 at the Han River", prog: () => [S.companion ? 1 : 0, 1], reward: { xp: 60 } },
  { id: "yeouido", ko: "강을 건너다", en: "Across the river", desc: "Climb over the broken bridge to 여의도", prog: () => [S.reachedYd ? 1 : 0, 1], reward: { won: 10000, xp: 80 } },
  { id: "map4", ko: "섬의 지도", en: "Island map", desc: "Find the 여의도 map", prog: () => [S.hasMapYd ? 1 : 0, 1], reward: { xp: 40 } },
  { id: "poster", ko: "찢어진 포스터", en: "The torn poster", desc: "Look at the torn poster in the 63 Building", prog: () => [S.sawPoster ? 1 : 0, 1], reward: { xp: 50 } },
  { id: "tower1", ko: "63층의 영웅", en: "Hero of the 63rd floor", desc: "Defeat the alien commander", prog: () => [S.towerClears ? 1 : 0, 1], reward: { won: 40000, xp: 200 } },
  { id: "camp5", ko: "우리 캠프", en: "Our camp", desc: "Rebuild 가영's camp on 여의도 (5 steps)", prog: () => [S.camp || 0, 5], reward: { won: 20000, xp: 150 } },
  { id: "granny", ko: "그날 밤", en: "That night", desc: "Hear the grandmother's whole story by the 나들목", prog: () => [S.heardGranny ? 1 : 0, 1], reward: { xp: 60 } },
  { id: "map5", ko: "학원가 산책", en: "Exam street walk", desc: "Find the 노량진 map", prog: () => [S.hasMapNr ? 1 : 0, 1], reward: { xp: 50 } },
  { id: "list", ko: "명단", en: "The list", desc: "Read 박 선생님's list of the missing", prog: () => [S.sawList ? 1 : 0, 1], reward: { xp: 60 } },
  { id: "market1", ko: "문어 왕을 잡다", en: "Octopus king", desc: "Defeat the octopus king in the fish market", prog: () => [S.marketClears ? 1 : 0, 1], reward: { won: 40000, xp: 250 } },
  { id: "lvl5", ko: "생존자", en: "Survivor", desc: "Reach level 5", prog: () => [S.level, 5], reward: { won: 10000 } },
  { id: "epic", ko: "보물 사냥꾼", en: "Treasure hunter", desc: "Own an epic or legendary card", prog: () => [S.cards.some(c => c.rar >= 2) ? 1 : 0, 1], reward: { xp: 50 } },
  { id: "geared", ko: "완전 무장", en: "Fully equipped", desc: "Wear a better weapon, armour and a trinket", prog: () => [(weaponTier() >= 1) + (itemBy(S.equip.armor)?.g !== "a0" && !!S.equip.armor) + !!S.equip.trinket, 3], reward: { won: 8000 } },
];
let achT = 0;
function checkAchievements(dt) {
  if ((achT += dt) < 1) return; achT = 0;
  for (const a of ACH) {
    if (S.ach[a.id]) continue;
    const [cur, max] = a.prog(); if (cur < max) continue;
    S.ach[a.id] = Date.now();
    if (a.reward.won) sendMail("서울 생존자 모임", `축하해요! '${a.ko}' 업적을 달성했어요. 상금을 보내요.`, `Congratulations! You earned the achievement '${a.en}'. Here is your prize.`, { won: a.reward.won });
    toast(`🏆 업적 달성! ${a.ko} · ${a.en}` + (a.reward.won ? ` · +${won(a.reward.won)}` : "")); SFX.pickup();
    logChat("system", `🏆 ${a.ko} · ${a.en}`);
    if (a.reward.xp) gainXp(a.reward.xp);
    save();
  }
}
function openAchievements() {
  if (!S.cls) return;
  paused = true; showScreen("achView");
  const got = ACH.filter(a => S.ach[a.id]).length;
  $("achSum").textContent = `${got} / ${ACH.length}`;
  $("achList").innerHTML = ACH.map(a => { const [cur, max] = a.prog(), done = !!S.ach[a.id];
    return `<div class="ach${done ? " done" : ""}"><b>${done ? "🏆" : "▫"} ${a.ko}</b><span class="en">${a.en} — ${a.desc}</span><div class="bar xp"><i style="width:${Math.min(100, cur / max * 100)}%"></i><span>${Math.min(cur, max)} / ${max}</span></div><span class="rw">${[a.reward.won && won(a.reward.won), a.reward.xp && a.reward.xp + " XP"].filter(Boolean).join(" · ")}</span></div>`; }).join("");
}

// ---- storage: the 물품보관함 lockers in the station (40 places) ----------------------------------------------------
const BANK_SLOTS = 40;
function openBank() { paused = true; showScreen("bankView"); drawBank(); }
function drawBank() {
  const looseCards = bagCards(), looseGear = S.items.filter(i => !Object.values(S.equip).includes(i.uid) && !S.bank.items.includes(i.uid));
  const bankCards = S.bank.cards.map(cardBy).filter(Boolean), bankGear = S.bank.items.map(itemBy).filter(Boolean);
  const gearTile = (i, side) => `<div class="ivItem bk" data-side="${side}" data-item="${i.uid}" data-tip="${esc(tipGear(i.g))}"><span class="sl">${SLOTS[GEAR[i.g].slot]}</span><b>${gearName(i.g)}</b><span>${gearInfo(i.g)}</span></div>`;
  $("bkBag").innerHTML = (looseGear.map(i => gearTile(i, "bag")).join("") + looseCards.map(c => cardHTML(c).replace('class="dvCard', 'data-side="bag" class="bk dvCard')).join("")) || `<p class="fine">가방이 비었어요 · nothing loose in your bag</p>`;
  $("bkStore").innerHTML = (bankGear.map(i => gearTile(i, "bank")).join("") + bankCards.map(c => cardHTML(c).replace('class="dvCard', 'data-side="bank" class="bk dvCard')).join("")) || `<p class="fine">비었어요 · empty</p>`;
  $("bkCount").textContent = `${bankCards.length + bankGear.length} / ${BANK_SLOTS}`;
  document.querySelectorAll("#bankView .bk").forEach(el => el.onclick = () => {
    const side = el.dataset.side, uid = el.dataset.uid || el.dataset.item, list = el.dataset.item ? S.bank.items : S.bank.cards;
    if (side === "bag") { if (S.bank.cards.length + S.bank.items.length >= BANK_SLOTS) { toast("보관함이 꽉 찼어요 · storage is full"); return; } list.push(uid); }
    else list.splice(list.indexOf(uid), 1);
    SFX.select(); save(); drawBank();
  });
}

// ---- chat + emotes (wave / bow) -------------------------------------------------------------------------------
const chatLines = [];
function logChat(who, text) {
  chatLines.push({ who, text, t: performance.now() }); if (chatLines.length > 60) chatLines.shift();
  const d = document.createElement("div"); d.className = "cl " + (who === "system" ? "sys" : who === "나" ? "me" : "npc");
  d.innerHTML = who === "system" ? esc(text) : `<b>[${esc(who)}]</b> ${esc(text)}`;
  $("chatLog").appendChild(d); while ($("chatLog").children.length > 60) $("chatLog").firstChild.remove();
  $("chatLog").scrollTop = 1e9; $("chatLog").classList.add("fresh"); clearTimeout(logChat.t); logChat.t = setTimeout(() => $("chatLog").classList.remove("fresh"), 12000);
}
function openChat() { $("chatBox").hidden = false; $("chatInput").value = ""; $("chatInput").focus(); $("chatLog").classList.add("fresh"); }
function closeChat() { $("chatBox").hidden = true; $("chatInput").blur(); }
function sendChat(text) {
  text = text.trim(); if (!text) return;
  if (chatCommand(text)) return;
  if (/^\/(wave|손|인사하기)$/i.test(text)) return doEmote("wave");
  if (/^\/(bow|절|인사)$/i.test(text)) return doEmote("bow");
  logChat("나", text); bubble(text);
  netSend(NET.role === "host" ? { t: "chat", id: "host", nm: S.name || classDef().ko, text } : { t: "chat", nm: S.name || classDef().ko, text });
}
let bubbleEl = null, bubbleT = 0;
function bubble(text) {
  if (!bubbleEl) { bubbleEl = document.createElement("div"); bubbleEl.className = "bubble"; $("plates").appendChild(bubbleEl); }
  bubbleEl.textContent = text; bubbleEl.hidden = false; bubbleT = performance.now() + 5000;
}
function drawBubble() {
  if (!bubbleEl || bubbleEl.hidden) return;
  if (performance.now() > bubbleT) { bubbleEl.hidden = true; return; }
  tmpV.set(player.pos.x, 2.9, player.pos.z).project(camera);
  bubbleEl.style.left = (tmpV.x * .5 + .5) * innerWidth + "px"; bubbleEl.style.top = (-tmpV.y * .5 + .5) * innerHeight + "px";
}
function doEmote(name) {
  if (player.dead || ritual) return;
  player.model.emote?.(name);
  const t = name === "wave" ? ["손을 흔들어요 · you wave", "👋"] : ["고개 숙여 인사해요 · you bow", "🙇"];
  logChat("system", t[0]); bubble(t[1]);
  netSend(NET.role === "host" ? { t: "em", id: "host", e: name } : { t: "em", e: name });
}
$("chatInput").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); sendChat($("chatInput").value); closeChat(); }
  else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeChat(); }
});
$("emWave").onclick = () => { doEmote("wave"); closeChat(); };
$("emBow").onclick = () => { doEmote("bow"); closeChat(); };

// ---- mail: the 우체통 in the station (Danny 2026-10-11: rewards and gifts arrive by mail) -----------------------
// Letters are short and in easy Korean (reading practice); the English shows on hover. Attachments: ₩, gear, cards.
function sendMail(from, ko, en, attach = {}) {
  S.mail.push({ id: newUid(), from, ko, en, attach, read: false, taken: false, t: Date.now() });
  toast(`✉ 편지가 왔어요 · new mail from ${from} (우체통, station)`); SFX.open(); save();
}
const unreadMail = () => S.mail.filter(m => !m.read || (!m.taken && hasAttach(m))).length;
const hasAttach = m => !!(m.attach.won || (m.attach.gear || []).length || (m.attach.cards || []).length);
function attachText(a) {
  return [a.won && won(a.won), ...(a.gear || []).map(g => gearName(g)), ...(a.cards || []).map(c => `[${RARITY[c.rar].ko}] ${WORD[c.id].kr}`)].filter(Boolean).join(" · ");
}
let mailSel = null;
function openMail() { paused = true; showScreen("mailView"); if (!mailSel && S.mail.length) mailSel = S.mail[S.mail.length - 1].id; drawMail(); }
function drawMail() {
  const list = S.mail.slice().reverse();
  $("mlList").innerHTML = list.length ? list.map(m => `<button class="mlItem${m.id === mailSel ? " sel" : ""}${m.read ? "" : " unread"}" data-id="${m.id}"><b>${esc(m.from)}</b><span>${esc(m.ko.split(/[.!?]/)[0])}…</span>${hasAttach(m) && !m.taken ? "<i>📎</i>" : ""}</button>`).join("") : `<p class="fine">편지가 없어요 · no mail</p>`;
  $("mlList").querySelectorAll(".mlItem").forEach(b => b.onclick = () => { mailSel = b.dataset.id; drawMail(); });
  const m = S.mail.find(x => x.id === mailSel);
  if (!m) { $("mlRead").innerHTML = ""; return; }
  m.read = true;
  $("mlRead").innerHTML = `<div class="mlFrom">보낸 사람 · from <b>${esc(m.from)}</b></div><p class="mlKo" data-tip="${esc(m.en)}">${esc(m.ko)}</p><p class="mlEn">${esc(m.en)}</p>`
    + (hasAttach(m) ? `<div class="mlAtt">📎 ${attachText(m.attach)} <button id="mlTake" ${m.taken ? "disabled" : ""}>${m.taken ? "받았어요 · taken" : "받기 · take"}</button></div>` : "")
    + `<button id="mlDel" class="mlDel">지우기 · delete</button>`;
  $("mlEnToggle").checked ? $("mlRead").classList.remove("noen") : $("mlRead").classList.add("noen");
  const take = $("mlTake"); if (take) take.onclick = () => {
    const a = m.attach; if (a.won) S.money += a.won;
    for (const g of a.gear || []) addItem(g);
    for (const c of a.cards || []) S.cards.push({ uid: newUid(), id: c.id, rar: c.rar, mod: c.mod || rollMod(c.rar) });
    m.taken = true; SFX.pickup(); save(); drawMail();
  };
  $("mlDel").onclick = () => { if (hasAttach(m) && !m.taken) { toast("먼저 받으세요 · take the attachment first"); return; } S.mail = S.mail.filter(x => x !== m); mailSel = null; save(); drawMail(); };
  save();
}
$("mlEnToggle").onchange = () => drawMail();
$("mlClose").onclick = () => { showScreen(null); paused = false; };

// targets for the monsters: you, and in co-op every player on the street (the host runs the monsters)
function liveTargets(zone = "street") {
  const t = [];
  if (!player.dead && player.zone === zone && !(player.quizUntil > clock) && !((S.camp || 0) >= 3 && inCamp(player.pos))) t.push({ id: myId(), pos: player.pos });
  for (const r of remotes.values()) if (!r.dead && r.zone === zone && !(r.quizUntil > clock)) t.push({ id: r.id, pos: r.pos });
  return t;
}
function nearestTarget(m, list) { let best = null, bd = 1e9; for (const t of list) { const d = dist2(m.pos, t.pos); if (d < bd) { bd = d; best = t; } } return best ? { t: best, d: bd } : { t: null, d: 999 }; }
function updateMonsters(dt) {
  if (NET.role === "guest") { updateRemoteMonsters(dt); return; }
  const tls = Object.fromEntries(ZONES.map(z => [z, liveTargets(z)]));
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i], def = m.def, tl = tls[m.zone];
    if (m.dead) {
      m.deadT += dt; m.model.anim(dt, { dead: true });
      m.model.root.position.y = -Math.max(0, m.deadT - 1.2) * .8;
      if (m.deadT > 3) { scene.remove(m.model.root); if (m.cage) scene.remove(m.cage); m.plate.remove(); monsters.splice(i, 1); }
      continue;
    }
    if (m.caged || m.sleepUntil > clock || m.stunUntil > clock || m.flippedUntil > clock) { m.model.root.position.set(m.pos.x, 0, m.pos.z); m.model.anim(dt * .3, { flipped: m.flippedUntil > clock }); if (m.sleepUntil > clock && Math.random() < dt * .5) floater(m.pos, "z", "#9ec8ff", true, m.model.height); continue; }
    // the monster sticks to the player it is fighting while they're on the street; otherwise the nearest one
    let tg = m.tgtId && tl.find(t => t.id === m.tgtId), d;
    if (m.tauntUntil > clock && comp && comp.zone === m.zone) tg = { id: "pet", pos: comp.pos };
    if (tg) d = dist2(m.pos, tg.pos); else { const n = nearestTarget(m, tl); tg = n.t; d = n.d; }
    if (m.charging > 0) { if (m.silencedUntil > clock) m.charging = 0; else if ((m.charging -= dt) <= 0) { m.charging = 0; fireOrb(m); } }
    // day comes: night-only monsters that are not fighting slip away
    if (m.sp.nightOnly && night < .3 && m.state === "idle" && d > 25) { despawn(m, i); continue; }
    let moving = false, speed = def.speed * (m.slowUntil > clock ? .5 : 1) * (m.rootUntil > clock ? 0 : 1);
    m.atkCd -= dt; m.attackAnim = Math.max(0, m.attackAnim - dt * 2.5);
    if (m.state === "idle") {
      m.wanderT -= dt;
      if (m.wanderT <= 0) { m.wander = { x: m.sp.x + rand(-2.5, 2.5), z: m.sp.z + rand(-2.5, 2.5) }; m.wanderT = rand(3, 7); }
      if (m.wander && dist2(m.pos, m.wander) > .5) { moveToward(m, m.wander, speed * .35, dt); moving = true; }
      if (tg && d < aggroRange(m) && (isDun(m.zone) || !fighting(m))) { m.tgtId = tg.id; aggro(m); }
    } else if (m.state === "chase") {
      // someone is answering the chief's question: wait for them instead of walking home (and healing up)
      const quizHold = !tg && ((player.quizUntil > clock && player.zone === m.zone) || [...remotes.values()].some(r => r.quizUntil > clock && r.zone === m.zone));
      if (quizHold) { /* waits */ }
      else if (m.fearUntil > clock && tg) { moveToward(m, { x: m.pos.x * 2 - tg.pos.x, z: m.pos.z * 2 - tg.pos.z }, speed, dt); moving = true; }
      else if (!tg || dist2(m.pos, m.sp) > 45) { m.state = "return"; m.tgtId = null; }
      else {
        if (tg.id !== "pet") m.tgtId = tg.id;
        const R = rangeOf(m), want = def.ranged || R > 6 ? R * .8 : R * .85;
        if (d > want && !m.charging) { moveToward(m, tg.pos, speed * (night > .5 ? 1.1 : 1), dt); moving = true; }
        else faceToward(m, tg.pos, dt);
        if (d <= R && m.atkCd <= 0 && m.slamT <= 0 && !m.charging && tg.id !== "pet") monsterAttack(m, tg);
        bossQuizTick(m, dt, tl);
        if (def.shield) shieldTick(m, dt);
        if (def.examQ) examTick(m, dt, tg);
        if (def.sweep) sweepTick(m, dt, tg);
        if (def.grow) { const g0 = m.grow || 0; m.grow = Math.min(def.grow.max, g0 + dt * def.grow.add / def.grow.every); if (g0 < .2 && m.grow >= .2) floater(m.pos, "그슨대가 커져요! · it's growing", "#b8a8d8", true, m.model.height); m.model.root.scale.setScalar(m.baseScale * (1 + m.grow)); }
        if (def.slam) {
          m.slamCd -= dt;
          if (m.slamCd <= 0 && d < 9 && m.slamT <= 0) {
            m.slamT = def.slam.tele; m.slamAt = tg.pos.clone(); m.ring = makeRing(m.slamAt, def.slam.radius, def.slam.tele);
            if (tg.id === myId()) toast(`${m.name} — 피하세요! · it's jumping, dodge!`);
            netSend({ t: "sl", x: m.slamAt.x, z: m.slamAt.z, r: def.slam.radius, tele: def.slam.tele, dmg: def.slam.dmg * m.mul, lv: m.lvl });
          }
          if (m.slamT > 0) {
            m.slamT -= dt; m.slamAnim = 1 - m.slamT / def.slam.tele;
            if (m.slamT <= 0) {
              m.slamCd = def.slam.every; m.slamAnim = 0; SFX.slam();
              if (def.armor) { m.flippedUntil = clock + 3; floater(m.pos, "뒤집혔어요! 지금! · flipped — hit it now!", "#ffd23d", false, m.model.height); }
              if (!player.dead && player.zone === m.zone && dist2(player.pos, m.slamAt) < def.slam.radius) hurt(def.slam.dmg * m.mul, m);
              else if (tg.id === myId()) floater(player.pos, "피했다! · dodged", "#9be6a5", true);
            }
          }
        }
      }
    } else if (m.state === "return") {
      if (dist2(m.pos, m.sp) > 1) { moveToward(m, m.sp, speed * 1.4, dt); moving = true; }
      else { m.state = "idle"; m.hp = m.maxHp; m.missed.clear(); if (m.grow) { m.grow = 0; m.model.root.scale.setScalar(m.baseScale); } }
      if (tg && d < aggroRange(m) * .6 && dist2(m.pos, m.sp) < 30 && (isDun(m.zone) || !fighting(m))) { m.tgtId = tg.id; aggro(m); }
    }
    for (const o of monsters) if (o !== m && !o.dead) { const dx = m.pos.x - o.pos.x, dz = m.pos.z - o.pos.z, dd = Math.hypot(dx, dz); if (dd < 1.7 && dd > 1e-3) { m.pos.x += dx / dd * (1.7 - dd) * .5; m.pos.z += dz / dd * (1.7 - dd) * .5; } }
    collide(m.pos, def.boss ? 1.6 : .8, m.zone);
    m.model.root.position.set(m.pos.x, 0, m.pos.z); m.model.root.rotation.y = m.yaw;
    m.model.anim(dt, { moving, attack: m.attackAnim, slam: m.slamAnim, charge: m.charging ? 1 - m.charging / CHARGE : 0, arms: m.arms }); if (def.shield) shieldVis(m);
    m.moving = moving;
  }
}
function monsterAttack(m, tg) {
  m.atkCd = m.def.rate * rand(.9, 1.1); m.attackAnim = 1; m.atkN = (m.atkN || 0) + 1;
  if (m.def.caster && !(m.silencedUntil > clock)) { m.attackAnim = 0; m.atkN--; casterAttack(m, tg); return; }
  if (m.def.ranged) { setTimeout(() => { if (!m.dead) shootThorn(m, tg.pos); }, 250); return; }
  setTimeout(() => {
    if (m.dead || dist2(m.pos, tg.pos) > rangeOf(m) + 1) return;
    if (tg.id === myId()) { if (!player.dead && player.zone === m.zone) hurt(mdmg(m), m); }
    else netSend({ t: "hurt", to: tg.id, dmg: mdmg(m), lv: m.lvl, root: !!(m.def.root && Math.random() < m.def.root.chance) });
  }, 260);
}
function shootThorn(m, at) {
  const from = m.pos.clone(); from.y = 1.9;
  const to = at.clone(); to.y = 1.1; const vel = to.sub(from).normalize().multiplyScalar(11);
  spawnThorn(from, vel, m.def.dmg * m.mul, m);
  netSend({ t: "th", x: from.x, y: from.y, z: from.z, vx: vel.x, vy: vel.y, vz: vel.z, dmg: m.def.dmg * m.mul, sh: m.def.shock ? 1 : 0, lv: m.lvl });
}
function spawnThorn(from, vel, dmg, src) {
  const mesh = new THREE.Mesh(thornGeo, src?.def?.shock ? shockMat : thornMat); mesh.position.copy(from); scene.add(mesh);
  projectiles.push({ mesh, vel, life: 2.2, hostile: true, dmg, src: src || { def: MONS.vine } });
  SFX.orb();
}
// a monster dies: the host (or solo game) decides, every player near enough gets the rewards on their own side
function killMonster(m, by = myId()) {
  m.dead = true; m.sp.mon = null; m.sp.respawnAt = clock + (night > .5 ? 15 : 30); m.plate.remove();
  const near = [...remotes.values()].filter(r => r.zone === m.zone && dist2(r.pos, m.pos) < 40).map(r => r.id);
  netSend({ t: "kill", mid: m.id, near });
  if (by === myId() || (player.zone === m.zone && dist2(player.pos, m.pos) < 40)) rewardKill(m);
  else if (target === m) setTarget(null);
}
function rewardKill(m) {
  const money = Math.round(rand(...m.def.money) * (1 + .2 * (m.lvl - m.def.lvl)) / 100) * 100; S.money += money; S.kills++; if (comp && comp.zone === m.zone && dist2(comp.pos, m.pos) < 20) addHeart(1); S.killsBy[m.kind] = (S.killsBy[m.kind] || 0) + 1;
  floater(m.pos, "+" + won(money), "#e5b84a", false, 1.6);
  SFX.kill(); gainXp(monsterXp(m), m.pos); dropCard(m); dropGear(m); dropMat(m); dropStones(m); dropScroll(m); onKillForQuests(m);
  if (m.def.boss) (m.zone === "tower" ? towerCleared : m.zone === "market" ? marketCleared : dungeonCleared)();
  if (target === m) setTarget(null);
  showMissed([...m.missed]);
  save();
  const next = monsters.find(o => !o.dead && o.state === "chase" && dist2(o.pos, player.pos) < 20);
  if (next) setTimeout(() => { if (!target) setTarget(next); }, 400);
}
// damage from your ritual: applied here (solo / host) or sent to the host (guest)
function dealDamage(t, dmg, slow) {
  if (t.shieldUntil > clock) { floater(t.pos, "방어막 · shielded", "#c8a8ff", true, t.model.height); SFX.resist(); return false; }
  t.sleepUntil = 0;
  if (NET.role === "guest") { netSend({ t: "hit", mid: t.id, dmg, slow: slow || 0 }); t.hp = Math.max(1, t.hp - dmg); return; }
  { const am = armorMul(t); if (am < 1) { dmg = Math.round(dmg * am); floater(t.pos, "갑옷 · armour", "#c9c4b8", true, t.model.height + .6); } }
  t.hp -= dmg; if (!(t.tauntUntil > clock)) t.tgtId = myId(); aggro(t);
  if (slow) t.slowUntil = clock + slow;
  if (t.hp <= 0) killMonster(t, myId());
}

// ---- co-op over the k5a-rooms relay (same relay as Word Ammo / 같이 외우기) ----------------------------------------
// host = runs the monsters and the clock; guests send their position and their hits; everyone renders everyone.
//   host -> relay {to?, d}   relay -> host {k:"join"|"leave"|"msg", id|from, d}   guest -> relay d   relay -> guest d
const RELAY = new URLSearchParams(location.search).get("relay") || "wss://k5a-rooms.sparkheavenapp.workers.dev/room/";
const rid = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");
const NET = { role: null, ws: null, code: null, key: null, id: null, closed: true };
const remotes = new Map();        // id -> remote player {id, nm, cls, lvl, pos, tpos, yaw, moving, zone, hp, mx, dead, model, plate}
const myId = () => NET.role === "guest" ? NET.id : "host";
function netSend(d) {
  if (!NET.ws || NET.ws.readyState !== 1 || !NET.role) return;
  if (NET.role === "host") NET.ws.send(JSON.stringify(d.to && d.to !== "all" ? { to: d.to, d } : { d }));
  else NET.ws.send(JSON.stringify(d));
}
function netOpen(url) {
  NET.closed = false;
  const ws = NET.ws = new WebSocket(url);
  ws.onopen = () => { netStatus(NET.role === "host" ? `방 코드 · room code: ${NET.code}` : "연결됨 · connected"); if (NET.role === "guest") netSend({ t: "hello", ...myState() }); };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; }
    if (NET.role === "host") { if (m.k === "leave") dropRemote(m.id); else if (m.k === "msg") onNet(m.d, m.from); }
    else onNet(m, "host"); };
  ws.onclose = e => {
    if (NET.ws !== ws) return;
    if (NET.role === "host" && !NET.closed && e.code === 4009) { S.friendCode = newCode(); save(); toast(`친구 코드가 바뀌었어요 · your friend code was taken, the new one is ${S.friendCode}`); netHost(); return; }
    if (NET.role === "host" && !NET.closed && e.code !== 4009) { setTimeout(() => { if (!NET.closed) netOpen(`${RELAY}${NET.code}?role=host&key=${NET.key}`); }, 1500); return; }
    if (!NET.closed) { toast(e.code === 4004 ? "방이 없어요 · no room with that code" : "연결이 끊겼어요 · disconnected"); netLeave(); }
  };
  ws.onerror = () => {};
}
function netHost() {
  netLeave(true); ensureFriendCode(); NET.role = "host"; NET.key = S.hostKey; NET.code = S.friendCode;
  netOpen(`${RELAY}${NET.code}?role=host&key=${NET.key}`); drawCoop();
}
function netJoin(code) {
  code = (code || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4); if (code.length !== 4) { toast("코드는 네 글자예요 · the code has 4 letters"); return; }
  netLeave(true); NET.role = "guest"; NET.code = code; NET.id = rid(10);
  for (const m of monsters.slice()) { scene.remove(m.model.root); m.plate.remove(); } monsters.length = 0; setTarget(null);   // the host's monsters replace yours
  netOpen(`${RELAY}${code}?role=player&id=${NET.id}`); drawCoop();
}
function netLeave(quiet) {
  NET.closed = true; try { NET.ws && NET.ws.close(1000, "bye"); } catch (e) {} NET.ws = null;
  const wasGuest = NET.role === "guest"; NET.role = null;
  for (const id of [...remotes.keys()]) dropRemote(id);
  if (wasGuest) { for (const m of monsters.slice()) { scene.remove(m.model.root); m.plate.remove(); } monsters.length = 0; setTarget(null); for (const sp of spawnPoints) sp.mon = null; if (player.zone === "street") populateStreet(); if (player.zone === "yeouido") populateYeouido(); }
  if (!quiet) { netStatus("혼자 · solo"); drawCoop(); }
}
function netStatus(t) { NET.status = t; if (!$("menu").hidden) drawCoop(); }
const myState = () => ({ nm: S.name || classDef().ko, cls: S.cls, lvl: S.level, x: +player.pos.x.toFixed(2), z: +player.pos.z.toFixed(2), yaw: +player.yaw.toFixed(2), mv: player.moving ? 1 : 0, zone: player.zone, hp: Math.round(player.hp), mx: player.maxHp, dead: player.dead ? 1 : 0 });
function upsertRemote(id, st) {
  if (id === myId()) return;
  let r = remotes.get(id);
  if (!r) {
    const model = kayReady() ? makeKay(st.cls) : makeHero(st.cls); scene.add(model.root);
    const plate = document.createElement("div"); plate.className = "plate ally"; $("plates").appendChild(plate);
    r = { id, model, plate, pos: new THREE.Vector3(st.x, 0, st.z), tpos: new THREE.Vector3(st.x, 0, st.z), yaw: st.yaw };
    remotes.set(id, r); logChat("system", `👋 ${st.nm} 님이 왔어요 · joined`);
  }
  Object.assign(r, { nm: st.nm, cls: st.cls, lvl: st.lvl, moving: !!st.mv, zone: st.zone, hp: st.hp, mx: st.mx, dead: !!st.dead }); r.tpos.set(st.x, 0, st.z); r.tyaw = st.yaw;
  if (r.zone !== "street" && player.zone === "station") { /* both underground: positions are the station's */ }
}
function dropRemote(id) { const r = remotes.get(id); if (!r) return; scene.remove(r.model.root); r.plate.remove(); remotes.delete(id); logChat("system", `${r.nm} 님이 나갔어요 · left`); }
function onNet(d, from) {
  switch (d.t) {
    case "hello": case "st": upsertRemote(from, d); break;
    case "enter": if (NET.role === "host") populateStreet(); break;
    case "whisper": if (NET.role === "host") onWhisper(d, from); break;
    case "invite": if (NET.role === "host") showInvite(d, from); break;
    case "ping": if (NET.role === "host") netSend({ to: from, t: "pong", nm: S.name || classDef().ko, lvl: S.level, cls: S.cls, zone: player.zone, n: remotes.size + 1 }); break;
    case "enterM": if (NET.role === "host" && !someoneIn("market", from)) resetMarket(); break;
    case "board": if (NET.role === "host") applyBoard(d.i, d.ok); break;
    case "ln": if (NET.role === "guest") makeLine(d.x, d.z, d.ang, d.len, d.w, d.tele, d.dmg, d.lv); break;
    case "enterY": if (NET.role === "host") populateYeouido(); break;
    case "enterT": if (NET.role === "host" && !someoneIn("tower", from)) resetTower(); break;
    case "order": if (NET.role === "host") applyOrder(d.ok); break;
    case "enterD": if (NET.role === "host" && !someoneInDungeon(from)) resetDungeon(); break;
    case "mural": if (NET.role === "host") applyMural(d.i, d.ok); break;
    case "quiz": if (d.to === myId()) { const b = monsters.find(m => m.def.boss && !m.dead); bossQuizLocal(b); } break;
    case "silence": if (NET.role === "host") { const m = monsters.find(x => x.id === d.mid && !x.dead); if (m && m.def.alien) applySilence(m, d.dur); } break;
    case "cc": if (NET.role === "host") { const m = monsters.find(x => x.id === d.mid && !x.dead); if (m) applyCC(m, d.kind, d.dur, from); } break;
    case "ally": if (NET.role === "host" && d.to !== "host") { netSend({ ...d }); break; } if (d.to === myId()) { applyAlly(d); toast(`💚 ${d.nm}`); } break;
    case "sleep": if (NET.role === "host") { const m = monsters.find(x => x.id === d.mid && !x.dead); if (m && !m.def.boss) applySleep(m, d.dur); } break;
    case "rev": if (NET.role === "host" && d.to !== "host") { netSend({ ...d }); break; } if (d.to === myId()) revived(); break;
    case "hit": if (NET.role === "host") { const m = monsters.find(x => x.id === d.mid && !x.dead && !(x.shieldUntil > clock)); if (m) { m.sleepUntil = 0; m.hp -= Math.round(d.dmg * armorMul(m)); if (!(m.tauntUntil > clock)) m.tgtId = from; aggro(m); if (d.slow) m.slowUntil = clock + d.slow; if (m.hp <= 0) killMonster(m, from); } } break;
    case "w": if (NET.role === "guest") applySnapshot(d); break;
    case "kill": if (NET.role === "guest") { const m = monsters.find(x => x.id === d.mid); if (m && !m.dead) { m.dead = true; m.deadT = 0; m.plate.remove(); if (d.near.includes(myId())) rewardKill(m); else if (target === m) setTarget(null); } } break;
    case "hurt": if (d.to === myId() && !player.dead && player.zone !== "station") { hurt(d.dmg, { lvl: d.lv }); if (d.root) { player.rootedUntil = clock + 2; floater(player.pos, "덩굴에 묶임! · rooted", "#9be66a", true, 3); } } break;
    case "th": if (NET.role === "guest" && d.orb) { spawnOrb(new THREE.Vector3(d.x, d.y, d.z), new THREE.Vector3(d.vx, d.vy, d.vz), d.dmg, { lvl: d.lv }); break; } if (NET.role === "guest") spawnThorn(new THREE.Vector3(d.x, d.y, d.z), new THREE.Vector3(d.vx, d.vy, d.vz), d.dmg, d.sh ? { def: MONS.jangeo, lvl: d.lv } : { lvl: d.lv }); break;
    case "sl": if (NET.role === "guest") { const at = new THREE.Vector3(d.x, 0, d.z); makeRing(at, d.r, d.tele); setTimeout(() => { SFX.slam(); if (!player.dead && player.zone !== "station" && dist2(player.pos, at) < d.r) hurt(d.dmg, { lvl: d.lv }); }, d.tele * 1000); } break;
    case "chat": if (NET.role === "host") netSend({ t: "chat", id: from, nm: d.nm, text: d.text }); showRemoteChat(d.id || from, d.nm, d.text); break;
    case "em": if (NET.role === "host") netSend({ t: "em", id: from, e: d.e }); { const r = remotes.get(d.id || from); if (r) { r.model.emote?.(d.e); remoteBubble(r, d.e === "wave" ? "👋" : "🙇"); } } break;
    case "gift": if (NET.role === "host" && d.to !== "host") { netSend({ ...d, from }); break; } if (d.to === myId()) sendMail(d.nm, "선물을 보내요. 잘 쓰세요!", "I'm sending you a present. Use it well!", d.attach); break;
  }
}
function showRemoteChat(id, nm, text) { if (id === myId()) return; logChat(nm, text); const r = remotes.get(id); if (r) remoteBubble(r, text); }
function remoteBubble(r, text) {
  if (!r.bubble) { r.bubble = document.createElement("div"); r.bubble.className = "bubble"; $("plates").appendChild(r.bubble); }
  r.bubble.textContent = text; r.bubble.hidden = false; r.bubbleT = performance.now() + 5000;
}
// host -> guests: monsters + players, 8 times a second; guests -> host: their own state
let netT = 0, timeT = 0;
function netTick(dt) {
  if (!NET.role || !NET.ws || NET.ws.readyState !== 1) return;
  if ((netT += dt) < .125) return; netT = 0;
  if (NET.role === "guest") { netSend({ t: "st", ...myState() }); return; }
  if (!remotes.size) return;
  const ms = monsters.filter(m => !m.dead).map(m => [m.id, m.kind, m.lvl, +m.pos.x.toFixed(2), +m.pos.z.toFixed(2), +m.yaw.toFixed(2), Math.round(m.hp), m.maxHp, m.moving ? 1 : 0, m.atkN || 0, +(m.slamAnim || 0).toFixed(2), m.state === "chase" ? 1 : 0, ZONES.indexOf(m.zone), m.caged ? 1 : 0, m.sleepUntil > clock ? 1 : 0, m.sp.guard ?? -1, m.shieldUntil > clock ? 1 : 0, +(m.grow || 0).toFixed(2)]);
  const ps = [["host", myState()], ...[...remotes.values()].map(r => [r.id, { nm: r.nm, cls: r.cls, lvl: r.lvl, x: +r.tpos.x.toFixed(2), z: +r.tpos.z.toFixed(2), yaw: r.tyaw, mv: r.moving ? 1 : 0, zone: r.zone, hp: r.hp, mx: r.mx, dead: r.dead ? 1 : 0 }])];
  netSend({ t: "w", ms, ps, tw: [tw.solved, tw.open ? 1 : 0], mk: mk.boards, time: (timeT += .125) > 2 ? (timeT = 0, S.time) : undefined });
}
function applySnapshot(d) {
  if (d.time) S.time = d.time;
  if (d.mk) { mk.boards = d.mk; syncBoards(); }
  if (d.tw) { tw.solved = d.tw[0]; if (!!d.tw[1] !== tw.open) { tw.open = !!d.tw[1]; setDoor(); } }
  const seen = new Set();
  for (const [id, kind, lvl, x, z, yaw, hp, maxHp, mv, atkN, slam, chase, dz, caged, slp, guard, shd, grw] of d.ms) {
    seen.add(id);
    let m = monsters.find(o => o.id === id);
    if (!m) { spawnMonster({ kind, lvl, x, z, mon: null, zone: ZONES[dz] || "street", guard: guard >= 0 ? guard : undefined }); m = monsters[monsters.length - 1]; m.id = id; m.tpos = new THREE.Vector3(x, 0, z); }
    if (caged && !m.caged) cageGuard(m.sp.guard);
    m.sleepUntil = slp ? clock + 1 : 0;
    if (m.dead) continue;
    m.shieldUntil = shd ? clock + 1 : 0; if (m.def.shield) shieldVis(m); if ((grw || 0) !== (m.grow || 0)) { m.grow = grw || 0; m.model.root.scale.setScalar(m.baseScale * (1 + m.grow)); }
    m.tpos.set(x, 0, z); m.tyaw = yaw; m.hp = hp; m.maxHp = maxHp; m.moving = !!mv; m.state = chase ? "chase" : "idle"; m.slamAnim = slam;
    if ((m.atkN || 0) < atkN) { m.atkN = atkN; m.attackAnim = 1; }
  }
  for (const m of monsters) if (!seen.has(m.id) && !m.dead) { m.dead = true; m.deadT = 2.5; m.plate.remove(); if (target === m) setTarget(null); }
  for (const [id, st] of d.ps) upsertRemote(id, st);
  for (const id of [...remotes.keys()]) if (!d.ps.some(p => p[0] === id)) dropRemote(id);
}
function updateRemoteMonsters(dt) {
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    if (m.dead) { m.deadT += dt; m.model.anim(dt, { dead: true }); m.model.root.position.y = -Math.max(0, m.deadT - 1.2) * .8; if (m.deadT > 3) { scene.remove(m.model.root); m.plate.remove(); monsters.splice(i, 1); } continue; }
    if (m.tpos) { m.pos.lerp(m.tpos, Math.min(1, dt * 10)); let dy = (m.tyaw || 0) - m.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); m.yaw += dy * Math.min(1, dt * 10); }
    m.attackAnim = Math.max(0, m.attackAnim - dt * 2.5);
    m.model.root.position.set(m.pos.x, 0, m.pos.z); m.model.root.rotation.y = m.yaw;
    m.model.anim(dt, { moving: m.moving, attack: m.attackAnim, slam: m.slamAnim });
  }
}
function drawRemotes(dt) {
  for (const r of remotes.values()) {
    const vis = r.zone === player.zone; r.model.root.visible = vis;
    r.pos.lerp(r.tpos, Math.min(1, dt * 10)); let dy = (r.tyaw || 0) - (r.yaw || 0); dy = Math.atan2(Math.sin(dy), Math.cos(dy)); r.yaw = (r.yaw || 0) + dy * Math.min(1, dt * 10);
    r.model.root.position.set(r.pos.x, 0, r.pos.z); r.model.root.rotation.y = r.yaw;
    r.model.anim(dt, { moving: r.moving, dead: r.dead });
    tmpV.set(r.pos.x, 2.75, r.pos.z).project(camera);
    const show = vis && tmpV.z < 1 && dist2(r.pos, player.pos) < 60;
    r.plate.style.display = show ? "" : "none";
    if (show) { r.plate.style.left = (tmpV.x * .5 + .5) * innerWidth + "px"; r.plate.style.top = (-tmpV.y * .5 + .5) * innerHeight + "px"; const html = `<div class="n">Lv ${r.lvl} ${esc(r.nm)}</div><div class="pb ally"><i style="width:${Math.max(0, r.hp / r.mx * 100)}%"></i></div>`; if (r.plate.innerHTML !== html) r.plate.innerHTML = html; }
    if (r.bubble && !r.bubble.hidden) { if (performance.now() > r.bubbleT || !show) r.bubble.hidden = performance.now() > r.bubbleT; tmpV.set(r.pos.x, 3.1, r.pos.z).project(camera); r.bubble.style.left = (tmpV.x * .5 + .5) * innerWidth + "px"; r.bubble.style.top = (-tmpV.y * .5 + .5) * innerHeight + "px"; }
  }
}
// pause menu section "같이 하기"
function drawCoop() {
  $("coopName").value = S.name || "";
  $("coopStatus").textContent = NET.role ? (NET.status || "연결 중… · connecting") : "혼자 · solo";
  $("coopCode").textContent = NET.role === "host" && NET.code ? NET.code : "";
  $("coopPlayers").textContent = remotes.size ? "같이 · with: " + [...remotes.values()].map(r => `${r.nm} (Lv ${r.lvl} ${CLASSES[r.cls]?.ko || ""})`).join(", ") : "";
  $("coopLeave").hidden = !NET.role; $("coopHost").hidden = !!NET.role; $("coopJoinRow").hidden = !!NET.role;
}
$("coopName").onchange = e => { S.name = e.target.value.trim().slice(0, 12); save(); autoOnline(); };
$("coopHost").onclick = () => { if (!S.name) { toast("이름을 먼저 쓰세요 · type your name first"); return; } S.showOnline = true; save(); netHost(); };
$("coopJoin").onclick = () => { if (!S.name) { toast("이름을 먼저 쓰세요 · type your name first"); return; } netJoin($("coopJoinCode").value); };
$("coopLeave").onclick = () => { const wasGuest = NET.role === "guest"; netLeave(); if (wasGuest) autoOnline(); else { S.showOnline = false; save(); } };
{ const rc = new URLSearchParams(location.search).get("room"); if (rc) $("coopJoinCode").value = rc; }
// gifts from the inventory to a player in your room
function giftTo(attach, removeFn) {
  const others = [...remotes.values()]; if (!others.length) { toast("같이 하는 사람이 없어요 · nobody in your room"); return; }
  const to = others[0];   // the first player in the room (a picker comes with more players)
  removeFn(); netSend({ t: "gift", to: to.id, nm: S.name || classDef().ko, attach }); toast(`🎁 ${to.nm} 님에게 보냈어요 · sent (arrives by mail)`); SFX.pickup(); save();
}

// ---- the first dungeon: 홍대 터널 (decisions 7, 15, 23, 24) -----------------------------------------------------
// Inside the dungeon 2-against-1 is allowed (packs pull together); a 2nd player is recommended.
const dunPoints = DUNGEON.spawns.map(s => ({ ...s, zone: "dungeon", mon: null, respawnAt: 0 }));
const dun = { murals: [0, 0, 0], words: null };    // mural state: 0 untouched, 1 solved (a guard is caged), -1 failed
function inRect(p, r, m = 0) { return p.x >= r.x0 - m && p.x <= r.x1 + m && p.z >= r.z0 - m && p.z <= r.z1 + m; }
// keep a point inside the tunnel's rectangles (the union of rooms and corridors)
function clampDungeon(p, r = .45, R = DUNGEON.wrects) {
  if (R.some(q => p.x >= q.x0 + r && p.x <= q.x1 - r && p.z >= q.z0 + r && p.z <= q.z1 - r)) return;
  let best = null, bd = 1e9;
  for (const q of R) { const x = Math.min(q.x1 - r, Math.max(q.x0 + r, p.x)), z = Math.min(q.z1 - r, Math.max(q.z0 + r, p.z)), d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; best = { x, z }; } }
  if (best) { p.x = best.x; p.z = best.z; }
}
function resetDungeon() {
  for (let i = monsters.length - 1; i >= 0; i--) { const m = monsters[i]; if (m.zone !== "dungeon") continue; scene.remove(m.model.root); if (m.cage) scene.remove(m.cage); m.plate.remove(); monsters.splice(i, 1); if (target === m) setTarget(null); }
  for (const sp of dunPoints) { sp.mon = null; spawnMonster(sp); }
  dun.murals = [0, 0, 0]; dun.words = null;
}
const someoneInDungeon = exceptId => (player.zone === "dungeon" && myId() !== exceptId) || [...remotes.values()].some(r => r.zone === "dungeon" && r.id !== exceptId);
function toDungeon() {
  cancelRitual(); setTarget(null); closeDialog();
  if (NET.role === "guest") netSend({ t: "enterD" }); else if (!someoneInDungeon(myId())) resetDungeon();
  player.zone = "dungeon"; player.pos.set(DUNGEON.entry.x, 0, DUNGEON.entry.z); player.yaw = -Math.PI / 2; cam.yaw = -Math.PI / 2;
  toast("홍대 터널 · the tunnel under Hongdae — 여기서는 괴물이 무리 지어 와요 · monsters come in groups here");
}
// a cage of 부적 around a bodyguard, for every mural you solved
function cageGuard(i) {
  const m = monsters.find(o => o.zone === "dungeon" && o.sp.guard === i && !o.dead); if (!m || m.caged) return;
  m.caged = true; m.state = "idle"; m.tgtId = null;
  const g = new THREE.Group(); g.position.copy(m.pos);
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, bar = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 3.6, 5), toon("#3a3a3a")); bar.position.set(Math.cos(a) * 1.4, 1.8, Math.sin(a) * 1.4); g.add(bar);
    if (k % 2 === 0) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.3, .55), toon("#f2df7a", { side: THREE.DoubleSide, emissive: new THREE.Color("#ffcc33"), emissiveIntensity: .5 })); p.position.set(Math.cos(a) * 1.46, 1.6, Math.sin(a) * 1.46); p.lookAt(m.pos.x * 2, 1.6, m.pos.z * 2); g.add(p); } }
  for (const y of [.05, 3.6]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, .07, 6, 24), toon("#3a3a3a")); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring); }
  scene.add(g); m.cage = g;
  toast("부적 감옥! 경호원 하나가 갇혔어요 · a bodyguard is locked in a talisman cage");
}
function applyMural(i, ok) { if (dun.murals[i]) return; dun.murals[i] = ok ? 1 : -1; if (ok) cageGuard(i); }

// ---- quizzes: the murals (fill in the missing noun) and the chief's question (pick the noun for a meaning) ----
const nounPool = () => {
  const seen = bookWords().filter(w => w.pos === "noun" && S.stats[w.id]?.s > 0 && (!S.chapters.length || S.chapters.includes(w.ch)));
  const ch = bookWords().filter(w => w.pos === "noun" && (S.chapters.length ? S.chapters.includes(w.ch) : true));
  return seen.length >= 8 ? seen : ch;
};
let quiz = null;
function openQuiz(q) {   // q = { title, prompt, answer (word), opts (words), time, onDone(ok) }
  if (quiz) return;
  cancelRitual();
  quiz = { ...q, t: q.time || 0, lock: false };
  $("quiz").hidden = false; $("qzTitle").textContent = q.title; $("qzPrompt").innerHTML = q.prompt; $("qzBar").parentElement.hidden = !q.time;
  $("qzOpts").innerHTML = "";
  q.opts.forEach((w, i) => { const b = document.createElement("button"); b.className = "rcard"; b.innerHTML = `<kbd>${i + 1}</kbd>${w.kr}`; b.onclick = () => answerQuiz(i); $("qzOpts").appendChild(b); });
  SFX.open();
}
function answerQuiz(i) {
  if (!quiz || quiz.lock) return; quiz.lock = true;
  const ok = i >= 0 && quiz.opts[i] === quiz.answer, btns = $("qzOpts").children;
  if (i >= 0) btns[i].classList.add(ok ? "ok" : "no");
  btns[quiz.opts.indexOf(quiz.answer)].classList.add("ok");
  if (ok) { stat(quiz.answer.id).c++; say([wordClip(quiz.answer.id)], { interrupt: true }); SFX.select(); } else { stat(quiz.answer.id).w++; SFX.resist(); }
  const q = quiz; setTimeout(() => { $("quiz").hidden = true; quiz = null; q.onDone(ok); }, ok ? 700 : 1600);
}
function quizTick(dt) {
  if (!quiz || !quiz.time || quiz.lock) return;
  quiz.t -= dt; $("qzBar").style.width = Math.max(0, quiz.t / quiz.time * 100) + "%";
  if (quiz.t <= 0) answerQuiz(-1);
}
function muralQuiz(i) {
  if (dun.murals[i]) { toast(dun.murals[i] > 0 ? "이미 풀었어요 · already solved" : "이 벽화는 다시 풀 수 없어요 · this mural can't be tried again this run"); return; }
  if (!dun.words) {   // three nouns with an example sentence that contains them
    const cand = shuffle(bookWords().filter(w => w.pos === "noun" && w.ex && w.ex[0].includes(w.kb || w.kr) && (S.chapters.length ? S.chapters.includes(w.ch) : true)));
    dun.words = cand.slice(0, 3);
  }
  const w = dun.words[i]; if (!w) return;
  const opts = shuffle([w, ...shuffle(nounPool().filter(x => x.id !== w.id)).slice(0, 3)]);
  openQuiz({ title: `벽화 ${i + 1} · mural — 빈칸에 들어갈 단어는? · which word fills the gap?`, prompt: `<span class="qzKo">${esc(w.ex[0].replace(w.kb || w.kr, "＿＿＿"))}</span><span class="qzEn">${esc(w.ex[1])}</span>`, answer: w, opts,
    onDone: ok => { if (NET.role === "guest") netSend({ t: "mural", i, ok }); applyMural(i, ok); if (!ok) toast("벽화가 어두워졌어요 · the mural went dark (wrong)"); } });
}
function bossQuizLocal(m) {
  const pool = nounPool(), w = pick(pool);
  player.quizUntil = clock + 9;
  if (m?.def?.ink) $("ink").hidden = false;
  openQuiz({ title: `${m?.name || "대장"}의 질문! · the boss asks`, prompt: `<span class="qzKo">${esc(w.en)}</span><span class="qzEn">이 뜻의 단어는? · which word means this?</span>`, answer: w,
    opts: shuffle([w, ...shuffle(pool.filter(x => x.id !== w.id)).slice(0, 3)]), time: 8,
    onDone: ok => { player.quizUntil = 0; $("ink").hidden = true; if (ok) { toast("정답! 대장이 당황했어요 · right!"); floater(player.pos, "정답!", "#9be6a5", false, 3); } else hurt(player.maxHp * .15, null, true); } });
}
// the chief, below half health, asks someone a question every 20 s; that player can't be hit meanwhile
function bossQuizTick(m, dt, tl) {
  if (!m.def.boss || m.hp > m.maxHp * .5 || m.state !== "chase") return;
  m.quizCd = (m.quizCd ?? 3) - dt; if (m.quizCd > 0) return;
  m.quizCd = 20;
  const who = pick(tl); if (!who) return;
  if (tl.length === 1) { m.hp = Math.min(m.maxHp, m.hp + m.maxHp * .01); }   // solo: the chief heals a little while you think
  if (who.id === myId()) bossQuizLocal(m);
  else { const r = remotes.get(who.id); if (r) r.quizUntil = clock + 9; netSend({ t: "quiz", to: who.id }); }
}
function dungeonCleared() {
  S.dunClears = (S.dunClears || 0) + 1; addHeart(10);
  toast("🏆 던전 클리어! 홍대 터널 · dungeon cleared!");
  if (S.dunClears === 1) setTimeout(() => sendMail("낯선 사람", "잘했어요. 터널의 주인을 물리쳤군요. 이건 선물이에요. 역에서 다시 만나요.", "Well done. You defeated the master of the tunnel. This is a present. Let's meet again at the station.",
    { cards: [{ id: pick(DATA.words.filter(w => S.chapters.includes(w.ch))).id, rar: 2 }], gear: ["t_club"] }), 2500);
  save();
}
function drawDungeonMap(ctx, W, H, cx, cz, span, full, D = DUNGEON, zone = "dungeon") {
  const k = Math.min(W, H) / span, mx = x => W / 2 + (x - cx) * k, mz = z => H / 2 + (z - cz) * k;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = "rgba(20,18,26,.9)"; ctx.fillRect(0, 0, W, H);
  for (const r of D.wrects) { ctx.fillStyle = r.room ? "rgba(120,118,128,.95)" : "rgba(90,88,96,.95)"; ctx.fillRect(mx(r.x0), mz(r.z0), (r.x1 - r.x0) * k, (r.z1 - r.z0) * k); }
  if (full) { ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.round(W / 40)}px "Noto Sans KR",sans-serif`; ctx.textAlign = "center"; for (const r of D.wrects) if (r.name) ctx.fillText(r.name, mx((r.x0 + r.x1) / 2), mz(r.z0) - 6); }
  for (const m of D.murals || []) { ctx.fillStyle = "#e0a21c"; ctx.fillRect(mx(m.x) - 3, mz(m.wz) - 3, 6, 6); }
  for (const mo of monsters) if (!mo.dead && mo.zone === zone) { ctx.fillStyle = mo.def.boss ? "#b48cff" : mo.caged ? "#888" : mo.state === "chase" ? "#ff5a4a" : "#e07a6a"; ctx.beginPath(); ctx.arc(mx(mo.pos.x), mz(mo.pos.z), mo.def.boss ? 5 : 3, 0, 7); ctx.fill(); }
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), px = mx(player.pos.x), pz = mz(player.pos.z);
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(px + fx * 7, pz + fz * 7); ctx.lineTo(px - fz * 4 - fx * 3.5, pz + fx * 4 - fz * 3.5); ctx.lineTo(px + fz * 4 - fx * 3.5, pz - fx * 4 - fz * 3.5); ctx.closePath(); ctx.fill();
}

// ---- sleep talisman (taught by the 부적 선생님) ----
function applySleep(t, dur) {
  if (NET.role === "guest") netSend({ t: "sleep", mid: t.id, dur });
  t.sleepUntil = clock + dur; t.state = "idle"; t.tgtId = null; t.slamT = 0;
  floater(t.pos, "💤 잠들었어요 · asleep", "#9ec8ff", false, t.model.height + .3); SFX.heal();
}
function teacherTalk(n) {
  if (S.spells?.sleep) {
    if (S.spells.silence) { endWith(n, "t_after"); return; }
    if (S.dunClears && correctTotal() >= 120) showLine(n, "t_silence", [{ plr: "p_yes", act: () => { S.spells.silence = true; save(); SFX.kill(); toast(`새 주문! 침묵 부적 · new spell: silence talisman (${keyName(SET.keys.silence)})`); closeDialog(); } }]);
    else showLine(n, "t_silence_wait", [{ plr: "p_learn", act: () => { toast(`터널 ${S.dunClears ? "✔" : "✗"} · 맞힌 단어 ${correctTotal()} / 120`); closeDialog(); } }]);
    return;
  }
  const have = correctTotal();
  if (have >= 60) showLine(n, "t_teach", [{ plr: "p_yes", act: () => { S.spells = { ...(S.spells || {}), sleep: true }; save(); SFX.kill(); toast(`새 주문! 잠 부적 · new spell: sleep talisman (${keyName(SET.keys.sleep)})`); closeDialog(); } }]);
  else showLine(n, "t_hello", [{ plr: "p_learn", act: () => { toast(`맞힌 단어 ${have} / 60 · correct answers so far`); closeDialog(); } }]);
}

// ---- reviving a teammate (decision 10): a 3-card word challenge next to them ----
function startRevive(r) {
  if (player.dead || dialog || ritual) return;
  const ids = shuffle(deckIds("basic")).slice(0, 3); if (ids.length < 3) return;
  ritual = { k: "basic", sk: { ko: `살리기 · revive ${r.nm}`, cards: 3, cd: 0 }, words: ids, idx: 0, results: [], target: { missed: new Set(), dead: false, pos: r.pos, def: {} }, revive: r.id, lock: false };
  $("ritual").hidden = false; $("rSlots").innerHTML = ids.map(() => '<div class="rslot"></div>').join(""); showRitualCard(); SFX.open();
}
let downedT = null;
function downed() {
  $("downed").hidden = false; let left = 30;
  $("dnTime").textContent = left;
  clearInterval(downedT); downedT = setInterval(() => { left--; $("dnTime").textContent = left; if (left <= 0 || !player.dead) { clearInterval(downedT); if (player.dead) respawnNow(); } }, 1000);
}
function revived() { if (!player.dead) return; clearInterval(downedT); $("downed").hidden = true; player.dead = false; player.hp = player.maxHp * .4; toast("살아났어요! · a teammate revived you"); SFX.heal(); }
$("dnNow").onclick = () => { clearInterval(downedT); respawnNow(); };

// ---- aliens (decisions 3, 8, 16): rare, dangerous; the caster charges an orb you must dodge or silence ----------
function applySilence(t, dur) {
  if (NET.role === "guest") netSend({ t: "silence", mid: t.id, dur });
  t.silencedUntil = clock + dur; t.charging = 0;
  if (t.shieldUntil > clock) { t.shieldUntil = 0; floater(t.pos, "방어막이 깨졌어요! · shield broken", "#ffd23d", false, t.model.height + 1); }
  floater(t.pos, "🤐 침묵 · silenced", "#e2b8ff", false, t.model.height + .3); SFX.resist();
}
const orbGeo = new THREE.IcosahedronGeometry(.45, 1), orbMat = new THREE.MeshBasicMaterial({ color: "#d6a8ff", toneMapped: false });
const CHARGE = 1.2, UP = new THREE.Vector3(0, 1, 0);
function casterAttack(m, tg) {     // starts a 1.2 s charge; updateMonsters fires the orb at where you stood
  m.charging = CHARGE; m.chargeAt = tg.pos.clone(); m.atkCd = m.def.rate * rand(.9, 1.1);
  if (tg.id === myId()) toast("외계인이 힘을 모아요! 옆으로 피하세요 · the alien is charging — step aside!");
  SFX.charge();
}
function fireOrb(m) {
  m.attackAnim = 1; m.atkN = (m.atkN || 0) + 1;
  const from = m.pos.clone(); from.y = 2.2; const to = m.chargeAt.clone(); to.y = 1.1; const vel = to.sub(from).normalize().multiplyScalar(9);
  const n = m.def.volley || 1;
  for (let k = 0; k < n; k++) {
    const v = vel.clone().applyAxisAngle(UP, (k - (n - 1) / 2) * .3);
    spawnOrb(from, v, m.def.orb * m.mul, m);
    netSend({ t: "th", x: from.x, y: from.y, z: from.z, vx: v.x, vy: v.y, vz: v.z, dmg: m.def.orb * m.mul, orb: 1, lv: m.lvl });
  }
}
function spawnOrb(from, vel, dmg, src) {
  const mesh = new THREE.Mesh(orbGeo, orbMat); mesh.position.copy(from); scene.add(mesh);
  projectiles.push({ mesh, vel, life: 3, hostile: true, dmg, src: src || { def: MONS.alien_caster }, r: 1 });
  SFX.orb();
}
// a silenced caster can't cast: it walks up and hits you with its hands instead
const rangeOf = m => m.def.caster && m.silencedUntil > clock ? 2.6 : m.def.range;

// ---- materials (decision 13): monsters drop them, the smith uses them to upgrade gear ----
const MATS = { horn: { ko: "도깨비 뿔", en: "goblin horn" }, vine: { ko: "덩굴 줄기", en: "vine stem" }, stone: { ko: "석상 조각", en: "statue shard" }, metal: { ko: "외계 금속", en: "alien metal" }, wood: { ko: "장승 나무", en: "guardian wood" }, shell: { ko: "게 껍데기", en: "crab shell" }, shadow: { ko: "그림자 조각", en: "shadow shard" } };
const MAT_OF = { dokkaebi: "horn", vine: "vine", haetae: "stone", chief: "horn", alien_scout: "metal", alien_caster: "metal", jangseung: "wood", geuseundae: "shadow", commander: "metal", gwisin: "shadow", kkotge: "shell", jangeo: "shell", munoh: "shell" };
const matCount = () => Object.values(S.mats || {}).reduce((a, b) => a + b, 0);
function dropMat(m) {
  if (Math.random() >= (m.def.alien || m.def.boss ? 1 : .5)) return;
  const k = MAT_OF[m.kind]; if (!k) return; const n = m.def.boss ? 3 : 1;
  S.mats = S.mats || {}; S.mats[k] = (S.mats[k] || 0) + n;
  floater(m.pos, `+${n} ${MATS[k].ko}`, "#c9c4b8", true, 2.2);
}
function spendMats(n) { const spent = {}; for (const k of Object.keys(MATS)) while (n > 0 && S.mats[k] > 0) { S.mats[k]--; spent[k] = (spent[k] || 0) + 1; n--; } return spent; }

// ---- the smith's memory game: 20 stones (10 nouns + their meanings), 2 s to look, then find the pairs ----
let memo = null;
function upgradeMenu(n) {
  const opts = [];
  for (const sl of Object.keys(SLOTS)) {
    const it = itemBy(S.equip[sl]); if (!it || it.g === "a0") continue;
    const up = it.up || 0; if (up >= 5) continue;
    const cost = 3000 * (up + 1);
    opts.push({ ko: `${itemName(it)} → 강화 · ${cost.toLocaleString("en-US")}원 + 재료 3개`, en: `${SLOTS[sl]} · you have ${matCount()} materials`, act: () => {
      if (matCount() < 3) { endWith(n, "s_no_mats"); return; }
      if (S.money < cost) { endWith(n, "s_short"); return; }
      showLine(n, "s_up", [{ plr: "p_upgrade", act: () => { closeDialog(); S.money -= cost; const spent = spendMats(3); save(); startMemory(it, n, spent); } }]);
    } });
  }
  if (!opts.length) { endWith(n, "s_best"); return; }
  opts.push({ plr: "p_look", act: () => endWith(n, "s_bye") });
  showLine(n, "s_welcome", opts);
}
function startMemory(item, n, spent) {
  const words = shuffle(nounPool()).slice(0, 10);
  const stones = shuffle(words.flatMap(w => [{ w, side: "ko" }, { w, side: "en" }]));
  memo = { item, n, spent, stones, open: [], found: 0, miss: 0, lock: true, run: false, t: 90 };
  paused = true; cancelRitual(); $("memory").hidden = false; $("mmMiss").textContent = "0"; $("mmTime").textContent = "90"; $("mmInfo").textContent = "기억하세요! · memorise the stones (2 s)";
  $("mmGrid").innerHTML = stones.map((s, i) => `<button class="stone up${s.side === "en" ? " en" : ""}" data-i="${i}"><span>${esc(s.side === "ko" ? s.w.kr : s.w.en)}</span></button>`).join("");
  $("mmGrid").querySelectorAll(".stone").forEach(b => b.onclick = () => flipStone(+b.dataset.i));
  setTimeout(() => { if (!memo) return; $("mmGrid").querySelectorAll(".stone").forEach(b => b.classList.remove("up")); memo.lock = false; memo.run = true; $("mmInfo").textContent = "짝을 찾으세요 · find the pairs: a Korean word + its meaning"; }, 2000);
}
function flipStone(i) {
  if (!memo || memo.lock) return;
  const b = $("mmGrid").children[i]; if (b.classList.contains("up")) return;
  b.classList.add("up"); memo.open.push(i); SFX.select();
  if (memo.open.length < 2) return;
  const [a, c] = memo.open; memo.open = [];
  if (memo.stones[a].w === memo.stones[c].w) {
    memo.found++; $("mmGrid").children[a].classList.add("done"); $("mmGrid").children[c].classList.add("done"); say([wordClip(memo.stones[a].w.id)], { interrupt: true });
    if (memo.found === 10) { memo.lock = true; setTimeout(() => endMemory(false), 500); }
  } else {
    memo.miss++; $("mmMiss").textContent = memo.miss; memo.lock = true;
    setTimeout(() => { if (!memo) return; $("mmGrid").children[a].classList.remove("up"); $("mmGrid").children[c].classList.remove("up"); memo.lock = false; }, 700);
  }
}
function endMemory(giveUp) {
  const m = memo; if (!m) return; memo = null; $("memory").hidden = true; paused = false;
  const gain = giveUp ? 0 : m.miss <= 3 ? 2 : m.miss <= 8 ? 1 : 0;
  m.item.up = Math.min(5, (m.item.up || 0) + gain); S.upgrades = (S.upgrades || 0) + gain;
  if (!gain) { for (const k in m.spent) S.mats[k] += m.spent[k]; toast("재료는 돌려받았어요 · your materials were returned"); }
  recalcMax(); save();
  showLine(m.n, gain === 2 ? "s_up_good" : gain ? "s_up_ok" : "s_up_bad", [{ plr: "p_yes", act: closeDialog }]);
  if (gain) toast(`${itemName(m.item)} · 실수 ${m.miss}번 · ${m.miss} mistakes`);
}
function memoryTick(dt) { if (!memo || !memo.run || memo.lock && memo.found === 10) return; memo.t -= dt; $("mmTime").textContent = Math.max(0, Math.ceil(memo.t)); if (memo.t <= 0) endMemory(true); }
$("mmQuit").onclick = () => endMemory(true);

// ---- fishing at the 낚시터 (decision 32): stand still, wait for a bite, then catch it with a word ----
const PIER = { x: -20, z: 196.6 };
const FISH = [{ ko: "붕어", en: "crucian carp", p: .45, won: 800 }, { ko: "잉어", en: "carp", p: .28, won: 1500 }, { ko: "메기", en: "catfish", p: .17, won: 2500 }, { ko: "쏘가리", en: "mandarin fish", p: .08, won: 6000 }, { ko: "황금 잉어", en: "golden carp", p: .02, won: 20000 }];
let fishing = null;
function startFishing() {
  if (fishing || quiz) return;
  fishing = { t: rand(3, 8) }; toast("낚싯대를 던졌어요… 가만히 기다리세요 · line cast — stand still and wait for a bite"); SFX.dash();
}
function fishTick(dt) {
  if (!fishing) return;
  if (player.moving || player.zone !== "street" || dialog || player.dead) { fishing = null; toast("낚시 그만 · stopped fishing"); return; }
  fishing.t -= dt; if (fishing.t > 0) return;
  fishing = null; SFX.charge();
  const pool = nounPool(), w = pick(pool);
  openQuiz({ title: "물었다! 빨리 고르세요 · a bite! pick the word, fast", prompt: `<span class="qzKo">${esc(w.en)}</span><span class="qzEn">이 뜻의 단어는? · which word means this?</span>`, answer: w, opts: shuffle([w, ...shuffle(pool.filter(x => x.id !== w.id)).slice(0, 3)]), time: 5,
    onDone: ok => {
      if (!ok) { toast("놓쳤어요… · it got away"); return; }
      let r = Math.random(), f = FISH[0]; for (const x of FISH) { if ((r -= x.p) < 0) { f = x; break; } }
      S.fish = S.fish || {}; S.fish[f.ko] = (S.fish[f.ko] || 0) + 1; S.fishTotal = (S.fishTotal || 0) + 1;
      toast(`🐟 ${f.ko} · ${f.en}! (편의점에서 ${won(f.won)})`); floater(player.pos, "🐟 " + f.ko, "#9ec8ff", false, 3); SFX.pickup(); save();
    } });
}
// 편의점: cup ramyeon and triangle gimbap to go (eat with F); the clerk buys your fish
const SNACKS = { ramyeon: { ko: "컵라면", en: "cup ramyeon", price: 1500, fill: 40, plr: "p_ramyeon" }, samgak: { ko: "삼각김밥", en: "triangle gimbap", price: 1300, fill: 30, plr: "p_samgak" }, cupbap: { ko: "컵밥", en: "cup rice", price: 3000, fill: 60, plr: "p_cupbap", camp: true } };
const fishValue = () => Object.entries(S.fish || {}).reduce((a, [k, c]) => a + c * (FISH.find(f => f.ko === k)?.won || 0), 0);
function kioskTalk(n) {
  const opts = Object.entries(SNACKS).filter(([, sn]) => !sn.camp).map(([k, sn]) => ({ plr: sn.plr, act: () => {
    if (S.money < sn.price) { endWith(n, "r_short"); return; }
    S.money -= sn.price; S.snacks = S.snacks || {}; S.snacks[k] = (S.snacks[k] || 0) + 1; SFX.pickup(); save();
    toast(`${sn.ko} ${won(sn.price)} → 소모품 (${keyName(SET.keys.inv)}) · ${keyName(SET.keys.food)}로 먹기`); endWith(n, "k_thanks"); } }));
  const fv = fishValue();
  if (fv) opts.push({ plr: "p_sellfish", act: () => { S.money += fv; S.fish = {}; SFX.pickup(); save(); toast(`🐟 → +${won(fv)}`); endWith(n, "k_thanks"); } });
  opts.push({ plr: "p_leave", act: () => endWith(n, "k_thanks") });
  showLine(n, "k_hello", opts);
}

// ---- 수아 (secretly a 구미호): her answers decide your companion (decision 27; Danny: romance → 구미호, else the 도깨비 pet) ----
function suaMarker() { const st = S.sua?.step || 0; if (st === 0) return "!"; if (st === 1) return S.gimbap > 0 ? "?" : "…"; return ""; }
function suaTalk(n) {
  S.sua = S.sua || { step: 0, aff: 0 };
  const sa = S.sua;
  if (sa.step === 0) {
    const ask = () => showLine(n, "su_2", [
      { plr: "p_ok", act: () => { sa.step = 1; S.quests.sua = { st: "active" }; save(); SFX.pickup(); toast("퀘스트 수락 · 수아의 김밥 (L)"); closeDialog(); } },
      { plr: "p_later", act: closeDialog }]);
    showLine(n, "su_1", [{ plr: "p_walk", act: () => { sa.aff += 1; ask(); } }, { plr: "p_careful", act: ask }]);
  } else if (sa.step === 1) {
    if (!S.gimbap) { endWith(n, "su_wait"); return; }
    const finish = () => {
      sa.step = 2; S.quests.sua = { st: "done" };
      S.companion = sa.aff >= 4 ? "gumiho" : "pet"; save(); spawnCompanion(); gainXp(QUESTS.sua.reward.xp); SFX.kill();
      showLine(n, S.companion === "gumiho" ? "su_love" : "su_friend", [{ plr: "p_yes", act: () => { closeDialog(); if (S.companion === "gumiho") fade(() => { n.model.root.visible = false; }); else askPetName(); } }]);
      toast(S.companion === "gumiho" ? "💗 구미호 수아가 함께해요 · Sua the 구미호 is now your companion (heals you, +5% damage near her)" : "🐾 깨비가 함께해요 · Kkaebi the goblin pet joins you (enemies near it take +8%, it draws one away)");
    };
    const reveal = () => showLine(n, "su_4", [{ plr: "p_notscared", act: () => { sa.aff += 2; finish(); } }, { plr: "p_scared", act: finish }]);
    showLine(n, "su_wait", [{ plr: "p_give_gimbap", act: () => { S.gimbap--; save();
      showLine(n, "su_3", [{ plr: "p_like", act: () => { sa.aff += 2; reveal(); } }, { plr: "p_help", act: reveal }]); } }]);
  } else endWith(n, S.companion === "gumiho" ? "su_hello" : "su_hello2");
}
// 수아's hearts: +1 for a monster beaten with her close, +3 per quest, +10 per tunnel clear; 5 levels, each +1% heal and a new line
const HEARTS = [20, 50, 90, 140, 200];
const heartLvl = () => HEARTS.filter(h => (S.suaHeart || 0) >= h).length;
const petName = () => S.petName || "깨비";
function compLabel() { return S.companion === "gumiho" ? `💗 수아 ${"♥".repeat(heartLvl())}${"♡".repeat(5 - heartLvl())}` : `🐾 ${esc(petName())}`; }
function addHeart(n) {
  if (S.companion !== "gumiho") return;
  const before = heartLvl(); S.suaHeart = (S.suaHeart || 0) + n;
  const lv = heartLvl(); if (comp) comp.plate.innerHTML = compLabel();
  if (lv > before) { const key = "su_h" + lv; speak(key); logChat("수아", LINES[key].ko); toast(`💗 수아 ♥ ${lv} · "${LINES[key].ko}" · ${LINES[key].en} (회복 ${5 + lv}%)`); if (comp) floater(comp.pos, "♥", "#ff7aa8", false, comp.model.height + .2); SFX.heal(); save(); }
}
function askPetName(then) {
  paused = true; $("nameBox").hidden = false; $("nbInput").value = petName(); setTimeout(() => { $("nbInput").focus(); $("nbInput").select(); }, 50);
  const done = () => { const v = $("nbInput").value.trim().slice(0, 10); S.petName = v || "깨비"; $("nameBox").hidden = true; paused = false; save(); if (comp) comp.plate.innerHTML = compLabel(); toast(`🐾 ${S.petName}!`); then && then(); };
  $("nbOk").onclick = done; $("nbInput").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); done(); } e.stopPropagation(); };
}
// companions follow you, never fight themselves, and get out of the way (they're faster than any monster)
let comp = null;
function spawnCompanion() {
  if (comp) { scene.remove(comp.model.root); comp.plate.remove(); comp = null; }
  if (!S.companion || !player.model) return;
  let model;
  if (S.companion === "gumiho") {
    model = kayReady() ? makeKay("sua") : makeNPC("sitter");
    const tailM = toon("#f6efe6"), tipM = toon("#e8a33a");
    for (let i = 0; i < 9; i++) { const a = (i - 4) * .26; const tail = new THREE.Group(); tail.position.set(0, .85, .3); tail.rotation.set(.6 - Math.abs(a) * .2, 0, a * .8); model.root.add(tail);
      const c = new THREE.Mesh(new THREE.ConeGeometry(.2, 1.6, 7), tailM); c.position.y = .8; c.rotation.x = Math.PI; tail.add(c); const tip = new THREE.Mesh(new THREE.ConeGeometry(.13, .5, 7), tipM); tip.position.y = 1.75; tail.add(tip); }
  } else { model = makeMonster("pet"); model.root.scale.setScalar(.45); model.height *= .45; }
  scene.add(model.root);
  const plate = document.createElement("div"); plate.className = "plate npc"; plate.innerHTML = compLabel(); $("plates").appendChild(plate);
  comp = { model, plate, pos: player.pos.clone().add(new THREE.Vector3(1.5, 0, 1.5)), yaw: 0, healT: 4, tauntT: 6, fleeUntil: 0, flee: null, zone: player.zone };
}
function companionTick(dt) {
  if (!comp) return;
  if (comp.zone !== player.zone || dist2(comp.pos, player.pos) > 40) { comp.zone = player.zone; comp.pos.copy(player.pos).add(new THREE.Vector3(1.5, 0, 1.5)); }
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  const want = comp.fleeUntil > clock ? comp.flee.clone() : new THREE.Vector3(player.pos.x - fx * 1.8 + fz * 1.4, 0, player.pos.z - fz * 1.8 - fx * 1.4);
  for (const m of monsters) if (!m.dead && m.zone === player.zone && dist2(m.pos, comp.pos) < 3) { want.x += (comp.pos.x - m.pos.x) * 1.5; want.z += (comp.pos.z - m.pos.z) * 1.5; }
  const d = dist2(comp.pos, want), moving = d > .5;
  if (moving) { const sp = Math.min(d, (comp.fleeUntil > clock ? 7 : 6.5) * dt * (d > 6 ? 1.6 : 1)); comp.pos.x += (want.x - comp.pos.x) / d * sp; comp.pos.z += (want.z - comp.pos.z) / d * sp; comp.yaw = Math.atan2(-(want.x - comp.pos.x), -(want.z - comp.pos.z)); }
  collide(comp.pos, .35);
  comp.model.root.position.set(comp.pos.x, 0, comp.pos.z); comp.model.root.rotation.y = comp.yaw; comp.model.anim(dt, { moving });
  const fight = !player.dead && player.zone !== "station" && monsters.some(m => !m.dead && m.zone === player.zone && m.state === "chase" && dist2(m.pos, player.pos) < 20);
  if (!fight) return;
  if (S.companion === "gumiho" && (comp.healT -= dt) <= 0) { comp.healT = 16;   /* Danny 2026-10-17: was 8 s, too strong */ if (player.hp < player.maxHp) { const h = player.maxHp * (.05 + .01 * heartLvl()); player.hp = Math.min(player.maxHp, player.hp + h); floater(player.pos, "💗 +" + Math.round(h), "#ff9ec4", true, 2.4); } }
  if (S.companion === "pet" && NET.role !== "guest" && (comp.tauntT -= dt) <= 0) {
    comp.tauntT = 15;
    const ms = monsters.filter(m => !m.dead && !m.def.boss && m.zone === player.zone && m.state === "chase" && dist2(m.pos, player.pos) < 20);
    const m = ms.length ? pick(ms) : null;
    if (m) {
      m.tauntUntil = clock + 4; comp.fleeUntil = clock + 4;
      const ax = comp.pos.x - m.pos.x, az = comp.pos.z - m.pos.z, al = Math.hypot(ax, az) || 1;
      comp.flee = new THREE.Vector3(player.pos.x + ax / al * 14, 0, player.pos.z + az / al * 14);
      floater(m.pos, "깨비: 이리 와! · taunted", "#9ec8ff", true, m.model.height); floater(comp.pos, "메롱~", "#9ec8ff", true, 1.6);
    }
  }
}
// 구미호: +5% damage while she's close to you; 깨비: monsters near it take 8% more damage
function companionDamageMul(t) {
  if (!comp || comp.zone !== player.zone) return 1;
  if (S.companion === "gumiho" && dist2(comp.pos, player.pos) < 10) return 1.05;
  if (S.companion === "pet" && dist2(comp.pos, t.pos) < 6) return 1.08;
  return 1;
}
function drawCompanionPlate() {
  if (!comp) return;
  tmpV.set(comp.pos.x, comp.model.height + .5, comp.pos.z).project(camera);
  const show = comp.zone === player.zone && tmpV.z < 1;
  comp.plate.style.display = show ? "" : "none";
  if (show) { comp.plate.style.left = (tmpV.x * .5 + .5) * innerWidth + "px"; comp.plate.style.top = (-tmpV.y * .5 + .5) * innerHeight + "px"; }
}
// snacks from the 편의점: F eats these first (so a gimbap you bought for 수아 stays in your bag)
function eatSnack(k) {
  if (!S.snacks?.[k]) return false;
  if (S.hunger >= 95) { toast("배불러요 · you're full"); return true; }
  S.snacks[k]--; eat(SNACKS[k]); save(); return true;
}

// ---- 여의도 (Danny 2026-10-12: option A; you climb over the fallen span; the stranger's story moves on) ----
const ydPoints = YEOUIDO.spawns.map(s => ({ ...s, zone: "yeouido", mon: null, respawnAt: 0, nightOnly: !!s.night, alien: !!s.alien }));
const BRIDGE_FOOT = { x: 220, z: 196.2 };
function populateYeouido() {
  if (NET.role === "guest") { netSend({ t: "enterY" }); return; }
  night = nightFactor();
  for (const sp of ydPoints) if (!sp.mon && (!sp.nightOnly || night > .5) && (!sp.alien || Math.random() < .4)) spawnMonster(sp);
}
function toYeouido() {
  cancelRitual(); setTarget(null); closeDialog();
  populateYeouido(); player.zone = "yeouido"; player.pos.set(YEOUIDO.entry.x, 0, YEOUIDO.entry.z); player.yaw = Math.PI; cam.yaw = Math.PI;
  if (!S.reachedYd) { S.reachedYd = true; save(); }
  toast("부서진 다리 · 무너진 곳을 건너야 해요. 떨어지는 돌을 피하세요! · climb across — dodge the falling rubble!");
}
function toStreetBridge() {
  cancelRitual(); setTarget(null); closeDialog();
  populateStreet(); player.zone = "street"; player.pos.set(BRIDGE_FOOT.x, 0, BRIDGE_FOOT.z - 1); player.yaw = 0; cam.yaw = 0;
}
// rubble falls from the broken arch while you're on the bridge (faster on the fallen span); it aims a little ahead of you
const rubble = []; let rubbleT = 3;
const rockGeo = new THREE.DodecahedronGeometry(.9, 0), rockMat = toon("#8d8a84");
const onBridge = p => p.z < YD.z + 131 && Math.abs(p.x - YD.x) < 8;
function rubbleTick(dt) {
  for (let i = rubble.length - 1; i >= 0; i--) {
    const r = rubble[i]; r.t += dt; const f = Math.min(1, r.t / r.tele);
    r.mesh.position.y = .9 + 16 * (1 - f * f); r.mesh.rotation.x += dt * 4;
    if (r.t >= r.tele && !r.hit) { r.hit = true; SFX.slam(); if (player.zone === "yeouido" && !player.dead && dist2(player.pos, r.at) < 2.2) hurt(12, null); else if (dist2(player.pos, r.at) < 5) floater(player.pos, "피했다! · dodged", "#9be6a5", true); }
    if (r.t > r.tele + 1.5) { scene.remove(r.mesh); rubble.splice(i, 1); }
  }
  if (player.zone !== "yeouido" || player.dead || !onBridge(player.pos)) return;
  if ((rubbleT -= dt) > 0) return;
  const climb = player.pos.z > YD.z + 49 && player.pos.z < YD.z + 81;
  rubbleT = climb ? rand(1.3, 2) : rand(2.8, 4.2);
  const lead = player.moving ? 6 * (keys.shift ? .5 : 1) * 1.3 : 0;   // where you will be when it lands
  const at = new THREE.Vector3(player.pos.x - Math.sin(player.yaw) * lead + rand(-1.2, 1.2), 0, player.pos.z - Math.cos(player.yaw) * lead + rand(-1.2, 1.2));
  makeRing(at, 2.2, 1.3);
  const mesh = new THREE.Mesh(rockGeo, rockMat); mesh.position.set(at.x, 17, at.z); mesh.castShadow = true; scene.add(mesh);
  rubble.push({ mesh, at, t: 0, tele: 1.3 });
}

// ---- the 63빌딩 dungeon ----
const towerPoints = TOWER.spawns.map(s => ({ ...s, zone: "tower", mon: null, respawnAt: 0 }));
const tw = { open: false, solved: 0, fails: 0 };
function setDoor() { if (TOWER.doorMesh) TOWER.doorMesh.visible = !tw.open; }
function doorClamp(p, r) { const { x0, x1 } = TOWER.door; if (p.x > x0 - r && p.x < x1 + r) p.x = p.x < (x0 + x1) / 2 ? x0 - r : x1 + r; }
const someoneIn = (zone, exceptId) => (player.zone === zone && myId() !== exceptId) || [...remotes.values()].some(r => r.zone === zone && r.id !== exceptId);
function resetTower() {
  for (let i = monsters.length - 1; i >= 0; i--) { const m = monsters[i]; if (m.zone !== "tower") continue; scene.remove(m.model.root); m.plate.remove(); monsters.splice(i, 1); if (target === m) setTarget(null); }
  for (const sp of towerPoints) { sp.mon = null; spawnMonster(sp); }
  tw.open = false; tw.solved = 0; tw.fails = 0; setDoor();
}
function toTower() {
  cancelRitual(); setTarget(null); closeDialog();
  if (NET.role === "guest") netSend({ t: "enterT" }); else if (!someoneIn("tower", myId())) resetTower();
  player.zone = "tower"; player.pos.set(TOWER.entry.x, 0, TOWER.entry.z); player.yaw = -Math.PI / 2; cam.yaw = -Math.PI / 2;
  toast("63빌딩 · 꼭대기까지 올라가세요. 외계인 사령관이 옥상에 있어요 · climb to the roof, the alien commander waits there");
}
function towerToYd() {
  cancelRitual(); setTarget(null); closeDialog();
  player.zone = "yeouido"; player.pos.set(YEOUIDO.towerOut.x, 0, YEOUIDO.towerOut.z); player.yaw = 0; cam.yaw = 0;
}
// the torn poster in the aquarium: the stranger's past (decision 19)
function readPoster() {
  const me = { name: "찢어진 포스터 · torn poster" };
  showLine(me, "o_poster", [{ ko: "(닫기)", en: "close", act: closeDialog }]);
  if (!S.sawPoster) { S.sawPoster = true; save(); }
}
// the elevator panel: put a sentence's words in order (Danny: quiz room style C). 3 right = the shutter opens;
// a wrong order calls two alien guards and gives you a new sentence
let order = null;
function orderPool() {
  const ok = w => w.ex && w.ex[0].trim().split(/\s+/).length >= 3 && w.ex[0].trim().split(/\s+/).length <= 6;
  const mine = bookWords().filter(w => ok(w) && (S.chapters.length ? S.chapters.includes(w.ch) : true));
  return mine.length >= 5 ? mine : bookWords().filter(ok);
}
function orderPuzzle() {
  if (tw.open) { toast("문이 열려 있어요 · the door is already open"); return; }
  const w = pick(orderPool()), toks = w.ex[0].trim().split(/\s+/);
  let tiles = shuffle(toks.map((t, i) => ({ t, i })));
  if (tiles.every((x, k) => x.t === toks[k])) tiles = tiles.slice().reverse();
  order = { w, toks, tiles, picked: [], lock: false };
  paused = true; cancelRitual(); $("order").hidden = false; drawOrder(); SFX.open(); stat(w.id).s++;
}
function drawOrder() {
  $("orTitle").textContent = `엘리베이터 패널 · 문장 ${Math.min(3, tw.solved + 1)} / 3 — 순서대로 누르세요 · tap the words in order`;
  $("orEn").textContent = order.w.ex[1];
  $("orLine").innerHTML = order.picked.map(k => `<span>${esc(order.tiles[k].t)}</span>`).join("") || '<span class="ph">…</span>';
  $("orTiles").innerHTML = order.tiles.map((x, k) => `<button class="rcard" data-k="${k}" ${order.picked.includes(k) ? "disabled" : ""}><kbd>${k + 1}</kbd>${esc(x.t)}</button>`).join("");
  $("orTiles").querySelectorAll("button").forEach(b => b.onclick = () => orderPick(+b.dataset.k));
}
function orderPick(k) {
  if (!order || order.lock || order.picked.includes(k) || k >= order.tiles.length) return;
  order.picked.push(k); SFX.select(); drawOrder();
  if (order.picked.length === order.tiles.length) orderCheck();
}
function orderUndo() { if (!order || order.lock) return; order.picked.pop(); drawOrder(); }
function orderClose() { if (!order || order.lock) return; order = null; $("order").hidden = true; paused = false; }
function orderCheck() {
  const o = order, ok = o.picked.map(k => o.tiles[k].t).join(" ") === o.toks.join(" ");
  o.lock = true; $("orLine").classList.add(ok ? "ok" : "no");
  if (ok) { stat(o.w.id).c++; say([exClip(o.w.id)], { interrupt: true }); SFX.shotGood(); }
  else { stat(o.w.id).w++; SFX.resist(); $("orEn").innerHTML = `<b>${esc(o.toks.join(" "))}</b> · ${esc(o.w.ex[1])}`; }
  setTimeout(() => {
    $("order").hidden = true; $("orLine").classList.remove("ok", "no"); order = null; paused = false;
    if (NET.role === "guest") netSend({ t: "order", ok });
    applyOrder(ok);
  }, ok ? 1600 : 3200);
}
function applyOrder(ok) {
  if (ok) {
    tw.solved++;
    if (tw.solved >= 3 && !tw.open) { tw.open = true; setDoor(); toast("딩동! 엘리베이터 문이 열렸어요 · ding! the shutter is open — go up"); SFX.kill(); }
    else if (!tw.open) toast(`정답! 문장 ${tw.solved} / 3 · right!`);
    return;
  }
  tw.fails++; toast("틀렸어요! 경비 외계인이 와요 · wrong order — alien guards are coming!");
  if (NET.role === "guest") return;
  for (const g of TOWER.guardSpots) { spawnMonster({ kind: "alien_scout", lvl: 10, x: g.x, z: g.z, mon: null, zone: "tower" }); const m = monsters[monsters.length - 1]; m.state = "chase"; }
}
$("orUndo").onclick = orderUndo; $("orQuit").onclick = orderClose;
// observation deck: gusts of wind push you across the room unless you brace (hold Shift)
let windT = 6, windWarn = false;
function windTick(dt) {
  if (player.wind) { player.pos.z += player.wind.vz * dt; if ((player.wind.t -= dt) <= 0) player.wind = null; }
  if (player.zone !== "tower" || player.dead || !inRect(player.pos, TOWER.windRect)) { windT = 6; windWarn = false; return; }
  windT -= dt;
  if (windT < 1.4 && !windWarn) { windWarn = true; toast("바람이 불어요! Shift로 버티세요 · wind! hold Shift to brace"); floater(player.pos, "💨", "#cfe8ff", false, 3); }
  if (windT <= 0) {
    windT = rand(6, 8); windWarn = false;
    if (keys.shift) { floater(player.pos, "버텼다! · braced", "#9be6a5", true); return; }
    player.wind = { vz: (player.pos.z > TOWER.windRect.z0 + 12 ? -1 : 1) * 18, t: .5 }; hurt(6, null, true); floater(player.pos, "쾅! · blown away", "#cfe8ff", true, 3);
  }
}
// the commander: a shield every ~28 s that only the silence talisman breaks (or it fades after 14 s)
const shieldMat = new THREE.MeshBasicMaterial({ color: "#c8a8ff", transparent: true, opacity: .28, depthWrite: false, toneMapped: false });
function shieldVis(m) {
  const on = m.shieldUntil > clock;
  if (on && !m.bubble) { m.bubble = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 14), shieldMat); m.bubble.position.y = 2.3; m.model.root.add(m.bubble); }
  if (m.bubble) m.bubble.visible = on;
}
function shieldTick(m, dt) {
  m.shieldCd = (m.shieldCd ?? 10) - dt;
  if (m.shieldCd <= 0 && !(m.shieldUntil > clock)) {
    m.shieldUntil = clock + m.def.shield.dur; m.shieldCd = m.def.shield.every; SFX.charge();
    if (player.zone === m.zone) toast("방어막! 침묵 부적으로 깨세요 · a shield! break it with the silence talisman (5), or wait it out");
  }
}
function towerCleared() {
  S.towerClears = (S.towerClears || 0) + 1; addHeart(10);
  toast("🏆 63빌딩 클리어! 외계인 사령관을 물리쳤어요 · the 63 Building is cleared!");
  if (S.towerClears === 1) setTimeout(() => sendMail("낯선 사람", "63빌딩의 사령관을 물리쳤군요. 고마워요. 거기에서 무엇을 봤어요? 역에서 이야기해요.", "You defeated the commander of the 63 Building. Thank you. What did you see there? Let's talk at the station.",
    { cards: [{ id: pick(DATA.words.filter(w => S.chapters.includes(w.ch))).id, rar: 3 }], gear: ["t_core"] }), 2500);
  save();
}
const mdmg = m => m.def.dmg * m.mul * (1 + (m.grow || 0)) * (m.feebleUntil > clock ? .8 : 1);

// ---- co-op party frames: every player in your room, their health, where they are (Danny 2026-10-12) ----
const ZONE_KO = { street: "거리", station: "역", dungeon: "홍대 터널", yeouido: "여의도", tower: "63빌딩" };
function drawParty() {
  const html = [...remotes.values()].map(r => {
    const away = r.zone !== player.zone, pc = Math.max(0, Math.min(100, (r.hp || 0) / (r.mx || 1) * 100));
    return `<div class="pm${r.dead ? " dead" : ""}${away ? " away" : ""}"><div class="who"><b>${esc(r.nm || "?")}</b><span>Lv ${r.lvl || 1} ${CLASSES[r.cls]?.ko || ""}</span></div>`
      + `<div class="bar hp"><i style="width:${pc.toFixed(0)}%"></i><span>${r.dead ? "쓰러짐 · down" : `${Math.max(0, Math.round(r.hp || 0))} / ${r.mx || "?"}`}</span></div>`
      + (away ? `<small>📍 ${ZONE_KO[r.zone] || r.zone}</small>` : "") + `</div>`;
  }).join("");
  if ($("party").innerHTML !== html) $("party").innerHTML = html;
}

// ---- reroll stones (Danny: rerolls are a farmable late-game optimisation): only the 63 commander drops them ----
// 1 stone = a new bonus for the card (same rarity); 3 stones = a gamble on its rarity (up 35%, same 45%, down 20%)
let rr = null;
function openReroll(uid) { rr = cardBy(uid); if (!rr) return; $("reroll").hidden = false; drawReroll(); }
function closeReroll() { rr = null; $("reroll").hidden = true; if (!$("invView").hidden) drawInventory(); }
function drawReroll(msg) {
  const n = S.rerollStones || 0;
  $("rrCard").innerHTML = cardHTML(rr);
  $("rrStones").textContent = `🔮 ${n}`;
  $("rrMod").disabled = n < 1; $("rrRar").disabled = n < 3;
  $("rrMsg").innerHTML = msg || "";
}
$("rrMod").onclick = () => {
  if (!rr || (S.rerollStones || 0) < 1) return;
  S.rerollStones--; const old = modText(rr); rr.mod = rollMod(rr.rar); SFX.pickup(); save();
  drawReroll(`${esc(old)} → <b>${esc(modText(rr))}</b>`);
};
$("rrRar").onclick = () => {
  if (!rr || (S.rerollStones || 0) < 3) return;
  S.rerollStones -= 3; const old = rr.rar, r = Math.random();
  rr.rar = Math.max(0, Math.min(RARITY.length - 1, old + (r < .35 ? 1 : r < .8 ? 0 : -1)));
  if (rr.mod.t !== "el") rr.mod = { t: rr.mod.t, v: MOD_V[rr.rar] };
  rr.rar > old ? SFX.kill() : rr.rar < old ? SFX.resist() : SFX.select(); save();
  drawReroll(`${RARITY[old].ko} → <b style="color:${RARITY[rr.rar].c}">${RARITY[rr.rar].ko}</b>` + (rr.rar > old ? " · 올랐어요! up!" : rr.rar < old ? " · 내려갔어요… down" : " · 그대로 · same"));
};
$("rrClose").onclick = closeReroll;
function dropStones(m) {
  if (m.kind !== "commander") return;
  const n = Math.random() < .25 ? 2 : 1; S.rerollStones = (S.rerollStones || 0) + n;
  toast(`🔮 다시 굴리기 돌 ×${n} · reroll stone (I → 카드 → 🔮)`); floater(m.pos, `🔮 ×${n}`, "#c8a8ff", false, 3.4);
}

// ---- 따릉이: Seoul's green rental bikes. ₩1,000 at a rack; R gets on and off; faster, but no fighting ----
const BIKE_RACKS = [{ x: -20, z: 33.6, zone: "street" }, { x: 60, z: 155.6, zone: "street" }, { x: YD.x - 22, z: YD.z + 150, zone: "yeouido" }];
function makeBike() {
  const g = new THREE.Group(), green = toon("#3bb54a"), tire = toon("#1d1d1d"), white = toon("#f2f2ee");
  const wheels = [];
  for (const z of [-.55, .55]) { const w = new THREE.Mesh(new THREE.TorusGeometry(.36, .06, 8, 20), tire); w.rotation.y = Math.PI / 2; w.position.set(0, .4, z); g.add(w); wheels.push(w); }
  const bar = (len, x, y, z, rx) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.07, .07, len), green); b.position.set(x, y, z); b.rotation.x = rx; g.add(b); return b; };
  bar(1.05, 0, .62, 0, .12); bar(.6, 0, .55, .3, -.9); bar(.55, 0, .65, -.45, .9);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.22, .06, .3), toon("#2a2a2a")); seat.position.set(0, .92, .3); g.add(seat);
  const post = new THREE.Mesh(new THREE.BoxGeometry(.06, .4, .06), green); post.position.set(0, .75, .3); g.add(post);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(.6, .05, .05), toon("#2a2a2a")); hb.position.set(0, 1.05, -.5); g.add(hb);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(.06, .45, .06), green); stem.position.set(0, .82, -.5); g.add(stem);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(.4, .25, .3), white); basket.position.set(0, .9, -.75); g.add(basket);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.wheels = wheels; return g;
}
function placeRacks() {
  for (const rk of BIKE_RACKS) {
    const g = new THREE.Group(); g.position.set(rk.x, 0, rk.z); scene.add(g);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(.12, 2.4, .12), toon("#3a3a3a")); pole.position.set(-1.6, 1.2, 0); g.add(pole);
    const c = document.createElement("canvas"); c.width = 256; c.height = 96; const x = c.getContext("2d"); x.fillStyle = "#3bb54a"; x.fillRect(0, 0, 256, 96); x.fillStyle = "#fff"; x.font = `52px "Noto Sans KR",sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("따릉이", 128, 52);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, .45, .06), [toon("#3bb54a"), toon("#3bb54a"), toon("#3bb54a"), toon("#3bb54a"), toon("#ffffff", { map: tx }), toon("#ffffff", { map: tx })]); sign.position.set(-1.6, 2.5, 0); g.add(sign);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.6, .12, .12), toon("#9aa3a8")); rail.position.set(0, .7, 0); g.add(rail);
    for (const bx of [-.6, .6]) { const b = makeBike(); b.position.set(bx, 0, 0); b.rotation.y = Math.PI / 2; g.add(b); }
    world.colliders[rk.zone].push({ x0: rk.x - 1.8, x1: rk.x + 1.3, z0: rk.z - .5, z1: rk.z + .5 });
  }
}
let bikeMesh = null;
const canRide = () => !player.dead && (player.zone === "street" || (player.zone === "yeouido" && !onBridge(player.pos)));
function setRiding(on) {
  player.riding = on;
  if (on && !bikeMesh) { bikeMesh = makeBike(); scene.add(bikeMesh); }
  if (bikeMesh) bikeMesh.visible = on;
}
function toggleBike() {
  if (!S.bikeRented) { toast("따릉이 대여소에서 빌려요 · rent one at a green 따릉이 rack (₩1,000)"); return; }
  if (player.riding) { setRiding(false); return; }
  if (!canRide()) { toast("여기서는 탈 수 없어요 · no riding here"); return; }
  if (ritual) return;
  setRiding(true); SFX.dash();
}
function rackUse() {
  if (!S.bikeRented) {
    if (S.money < 1000) { toast("돈이 모자라요 · you need ₩1,000"); return; }
    S.money -= 1000; S.bikeRented = true; save(); setRiding(true); SFX.pickup();
    toast(`따릉이를 빌렸어요! · bike rented — ${keyName(SET.keys.bike)}: get on / off`);
  } else { S.bikeRented = false; setRiding(false); save(); toast("따릉이를 반납했어요 · bike returned"); }
}
function bikeTick(dt) {
  if (player.riding && !canRide()) setRiding(false);
  if (!player.riding || !bikeMesh) return;
  bikeMesh.position.set(player.pos.x, 0, player.pos.z); bikeMesh.rotation.y = player.yaw;
  if (player.moving) for (const w of bikeMesh.userData.wheels) w.rotation.x -= dt * 22;
}

// ---- foreign trader + translation scrolls (decision 26; Danny 2026-10-12 "2 yes") ----
// Mike, a backpacker, speaks only English and sits somewhere different every in-game day. He sells translation
// scrolls (3 a day); monsters drop one now and then (2%). A scroll shows the English of one whole conversation,
// including the "hard" lines that never get subtitles (the memory-keeper grandmother's story).
const MIKE_SPOTS = [{ x: -40, z: -32, zone: "street" }, { x: 200, z: 22, zone: "street" }, { x: 52, z: 140, zone: "street" }, { x: YD.x + 30, z: YD.z + 142, zone: "yeouido" }];
let transNow = false, mikeDay = -1;
function mikeSpot() { return MIKE_SPOTS[(dayNum() * 7 + 3) % MIKE_SPOTS.length]; }
function syncMike() {
  const n = npcs.find(x => x.kind === "mike"); if (!n || mikeDay === dayNum()) return;
  mikeDay = dayNum(); const sp = mikeSpot();
  n.zone = sp.zone; n.pos.set(sp.x, 0, sp.z); n.model.root.position.copy(n.pos);
}
function mikeStock() { if (!S.mikeShop || S.mikeShop.day !== dayNum()) S.mikeShop = { day: dayNum(), left: 3 }; return S.mikeShop; }
function mikeTalk(n) {
  const st = mikeStock(), opts = [];
  if (st.left > 0) opts.push({ ko: `(번역 두루마리 사기 · buy a translation scroll ₩3,000 — ${st.left} left today)`, en: "", act: () => {
    if (S.money < 3000) { showLine(n, "f_broke", [{ ko: "(대화 끝내기)", en: "leave", act: closeDialog }]); return; }
    S.money -= 3000; st.left--; S.scrolls = (S.scrolls || 0) + 1; SFX.pickup(); save(); toast(`📜 번역 두루마리 ×${S.scrolls}`); mikeTalk(n); } });
  if (S.dunClears && !S.mikeTold1) opts.push({ ko: "(Ask about the hooded man · 낯선 사람에 대해 묻기)", en: "", act: () => { S.mikeTold1 = true; save(); endWith(n, "f_story1"); } });
  if (S.towerClears && !S.mikeTold2) opts.push({ ko: "(Ask about the aliens · 외계인에 대해 묻기)", en: "", act: () => { S.mikeTold2 = true; save(); endWith(n, "f_story2"); } });
  opts.push({ ko: "(Bye · 대화 끝내기)", en: "", act: () => endWith(n, "f_bye") });
  showLine(n, S.metMike ? "f_shop" : "f_hello", opts); if (!S.metMike) { S.metMike = true; save(); }
}
function useScroll() {
  if (!dialog || transNow || !(S.scrolls > 0)) return;
  S.scrolls--; transNow = true; save(); SFX.select();
  const L = LINES[dialog.key]; if (L) $("dEn").textContent = L.en;
  [...$("dOpts").children].forEach((b, i) => { const o = dialog.opts[i]; if (o && o.plr) b.querySelector(".en").textContent = LINES[o.plr].en; });
  $("dTrans").hidden = true; toast(`📜 번역 중 · translated (남은 두루마리 ${S.scrolls})`);
}
$("dTrans").onclick = useScroll;
function dropScroll(m) { if (Math.random() < .02) { S.scrolls = (S.scrolls || 0) + 1; toast(`📜 번역 두루마리 획득! · a translation scroll (×${S.scrolls})`); floater(m.pos, "📜", "#f6ead2", false, 3); } }
// the memory-keeper grandmother by the 나들목: she speaks difficult Korean about the night the aliens came
function grannyTalk(n) {
  if (!S.dunClears) { endWith(n, "h_0"); return; }
  showLine(n, "h_1", [{ plr: "p_more", act: () => showLine(n, "h_2", [{ plr: "p_more", act: () => { S.heardGranny = true; save(); showLine(n, "h_3", [{ plr: "p_thanks2", act: closeDialog }]); } }]) }, { plr: "p_thanks2", act: closeDialog }]);
}

// ---- 가영's camp on 여의도: rebuild it in 5 steps with materials (decision 32; Danny 2026-10-12 "3 yes") ----
const CAMP = { x: YD.x + 18, z: YD.z + 143, r: 16 };
const CAMP_STEPS = [
  { ko: "모닥불과 쉼터", en: "fire + shelter", gives: "캠프에서 빨리 회복 · fast healing at the camp", cost: { wood: 3, vine: 2 }, won: 5000 },
  { ko: "식량 창고", en: "food store", gives: "가영 씨가 컵밥을 팔아요 · 가영 sells 컵밥", cost: { wood: 4, stone: 3 }, won: 10000 },
  { ko: "바리케이드", en: "barricades", gives: "캠프 안은 안전 · monsters lose you inside the camp", cost: { stone: 5, metal: 3 }, won: 15000 },
  { ko: "작업대", en: "workbench", gives: "여기서 장비 강화 · upgrade gear here", cost: { metal: 4, horn: 4, shadow: 2 }, won: 25000 },
  { ko: "잠자리", en: "bedrolls", gives: "여기서 자고, 쓰러지면 여기서 깨요 · sleep here, wake up here after dying on 여의도", cost: { wood: 6, shadow: 4, metal: 4 }, won: 40000 },
];
const inCamp = p => player.zone === "yeouido" && Math.hypot(p.x - CAMP.x, p.z - CAMP.z) < CAMP.r && (S.camp || 0) >= 1;
const costText = st => Object.entries(st.cost).map(([k, n]) => `${MATS[k].ko} ${(S.mats?.[k] || 0)}/${n}`).join(", ") + ` · ${won(st.won)}`;
const canPay = st => Object.entries(st.cost).every(([k, n]) => (S.mats?.[k] || 0) >= n) && S.money >= st.won;
const campParts = [];
function buildCampParts() {
  const at = (x, z) => ({ x: CAMP.x + x, z: CAMP.z + z }), mk = (geo, color, x, y, z, g) => { const m = new THREE.Mesh(geo, typeof color === "string" ? toon(color) : color); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  for (let i = 0; i < 5; i++) { const g = new THREE.Group(); scene.add(g); campParts.push(g); }
  { const g = campParts[0], c = at(1, 1);          // fire ring + log benches + a tarp
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; mk(new THREE.DodecahedronGeometry(.3, 0), "#77736c", c.x + Math.cos(a) * 1.2, .2, c.z + Math.sin(a) * 1.2, g); }
    mk(new THREE.ConeGeometry(.5, 1, 6), new THREE.MeshBasicMaterial({ color: "#ffb46a", toneMapped: false }), c.x, .6, c.z, g);
    for (const [dx, dz, r] of [[-3, 0, 0], [3, 0, 0], [0, 3, Math.PI / 2]]) { const l = mk(new THREE.CylinderGeometry(.3, .3, 2.6, 8), "#8a5a32", c.x + dx, .3, c.z + dz, g); l.rotation.set(0, r, Math.PI / 2); }
    const tarp = mk(new THREE.BoxGeometry(5, .08, 4), "#2f6db3", c.x - 6, 2.4, c.z - 3, g); tarp.rotation.z = .15;
    for (const [dx, dz] of [[-8.3, -4.8], [-3.7, -4.8], [-8.3, -1.2], [-3.7, -1.2]]) mk(new THREE.CylinderGeometry(.07, .07, 2.4, 6), "#555", c.x + dx, 1.2, c.z + dz, g); }
  { const g = campParts[1], c = at(-7, 7);         // food stall
    mk(new THREE.BoxGeometry(4, 1.1, 1.6), "#8a6a4a", c.x, .55, c.z, g); const aw = mk(new THREE.BoxGeometry(4.6, .1, 2.2), "#c8402f", c.x, 2.4, c.z - .3, g); aw.rotation.x = -.2;
    for (const dx of [-2, 2]) mk(new THREE.CylinderGeometry(.06, .06, 2.4, 6), "#555", c.x + dx, 1.2, c.z + .6, g);
    for (let k = 0; k < 4; k++) mk(new THREE.BoxGeometry(.5, .5, .5), "#b08a5a", c.x - 1.5 + k * .9, 1.35, c.z, g); }
  { const g = campParts[2];                          // barricades: sandbags + fence pieces in a ring (open towards the bridge)
    for (let k = 0; k < 22; k++) { const a = k / 22 * 6.28; if (Math.abs(Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2))) < .45) continue;
      const x = CAMP.x + Math.cos(a) * (CAMP.r - 1), z = CAMP.z + Math.sin(a) * (CAMP.r - 1);
      const b = mk(new THREE.BoxGeometry(2.6, .8, .9), k % 2 ? "#a39a7a" : "#8d8670", x, .4, z, g); b.rotation.y = -a + Math.PI / 2;
      if (k % 3 === 0) { const f = mk(new THREE.BoxGeometry(2.4, 1.6, .12), "#7a5a3a", x, 1.2, z, g); f.rotation.y = -a + Math.PI / 2; } } }
  { const g = campParts[3], c = at(6, 7);           // workbench + anvil
    mk(new THREE.BoxGeometry(3, .9, 1.4), "#7a5a3a", c.x, .45, c.z, g); mk(new THREE.BoxGeometry(.9, .5, .5), "#3a3a3a", c.x + .6, 1.15, c.z, g); mk(new THREE.BoxGeometry(.3, .25, .9), "#d0d6dc", c.x - .8, 1, c.z, g); }
  { const g = campParts[4], c = at(-6, -8);         // bedrolls + the camp flag
    for (let k = 0; k < 3; k++) mk(new THREE.BoxGeometry(1, .15, 2.2), ["#2f7f86", "#e0a21c", "#6a4fa0"][k], c.x + k * 1.4, .08, c.z, g);
    mk(new THREE.CylinderGeometry(.06, .06, 5, 6), "#555", c.x + 5, 2.5, c.z, g);
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128; const x = cv.getContext("2d"); x.fillStyle = "#3a8f4c"; x.fillRect(0, 0, 256, 128); x.fillStyle = "#fff"; x.font = `52px "Noto Sans KR",sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("가영 캠프", 128, 66);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const fl = mk(new THREE.PlaneGeometry(1.8, .9), toon("#ffffff", { map: tx, side: THREE.DoubleSide }), c.x + 5.95, 4.4, c.z, g); }
  syncCamp();
}
function syncCamp() { campParts.forEach((g, i) => g.visible = (S.camp || 0) > i); }
const BEDROLL = () => ({ x: CAMP.x - 3, z: CAMP.z - 8 }), BENCH = () => ({ x: CAMP.x + 6, z: CAMP.z + 5.6 });
function campTalk(n) {
  const lv = S.camp || 0, opts = [];
  if (lv < 5) { const st = CAMP_STEPS[lv];
    opts.push({ ko: `캠프 짓기 ${lv + 1}/5 · ${st.ko}`, en: `${st.en}: ${costText(st)} → ${st.gives}`, act: () => {
      if (!canPay(st)) { endWith(n, "y_need"); return; }
      showLine(n, "y_camp", [{ plr: "p_build", act: () => {
        for (const [k, c] of Object.entries(st.cost)) S.mats[k] -= c; S.money -= st.won; S.camp = lv + 1; syncCamp(); save(); SFX.kill();
        toast(`🏕 캠프 ${S.camp}/5 · ${st.ko} — ${st.gives}`); addHeart(2);
        showLine(n, "y_built", [{ plr: "p_yes", act: closeDialog }]); } }, { plr: "p_later", act: closeDialog }]);
    } });
  }
  if (lv >= 2) opts.push({ plr: "p_cupbap", act: () => { if (S.money < 3000) { endWith(n, "r_short"); return; } S.money -= 3000; S.snacks = S.snacks || {}; S.snacks.cupbap = (S.snacks.cupbap || 0) + 1; SFX.pickup(); save(); toast(`컵밥 ₩3,000 → 소모품 · ${keyName(SET.keys.food)}로 먹기`); endWith(n, "k_thanks"); } });
  if (lv >= 4) opts.push({ ko: "(작업대에서 강화하기 · upgrade at the workbench)", en: "", act: () => upgradeMenu(n) });
  opts.push({ ko: "(대화 끝내기)", en: "leave", act: closeDialog });
  showLine(n, S.towerClears ? "y_after" : "y_hello", opts);
}

// ---- a new skill every 2 levels from Lv 5 (Danny 2026-10-12: list OK, 2 A = every skill its own 10 cards,
//      3 C = skill book (P) + a second row of keys, 4 = 2 cards up to Lv 11, 3 cards Lv 13-17, 4 cards Lv 19) ----
const EXTRA = {
  mudang: [
    { id: "m5", lvl: 5, ko: "회복의 북", en: "drum of renewal", icon: "🥁", cards: 2, cd: 15, mult: 0, self: true, fx: "hot", v: .04, dur: 8, info: "2 cards · heals 4% health every second for 8 s (you, or the most hurt teammate)" },
    { id: "m7", lvl: 7, ko: "굿", en: "gut ritual", icon: "🎎", cards: 2, cd: 25, mult: 0, self: true, fx: "group", v: .25, r: 15, info: "2 cards · heals you and every teammate within 15 m for 25%" },
    { id: "m9", lvl: 9, ko: "귀신 쫓기", en: "exorcism", icon: "👻", cards: 2, cd: 10, mult: 2, noHit: true, fire: true, burn: { mult: 2, dur: 6 }, info: "2 cards · burns the target: 2× damage over 6 s, counts as 불" },
    { id: "m11", lvl: 11, ko: "방울 소리", en: "bell of fear", icon: "🔔", cards: 2, cd: 30, mult: 0, self: true, fx: "fear", r: 8, dur: 3, info: "2 cards · monsters within 8 m run away for 3 s (not bosses)" },
    { id: "m13", lvl: 13, ko: "수호 부적", en: "guardian charm", icon: "🛡", cards: 3, cd: 20, mult: 0, self: true, fx: "absorb", v: .25, dur: 10, info: "3 cards · a shield that soaks up 25% of max health for 10 s (you, or the most hurt teammate)" },
    { id: "m15", lvl: 15, ko: "작두 타기", en: "walking the blades", icon: "🗡", cards: 3, cd: 90, mult: 0, self: true, fx: "invuln", dur: 4, v: .2, info: "3 cards · nothing can hurt you for 4 s, and you heal 20%" },
    { id: "m17", lvl: 17, ko: "천신 강림", en: "descent of the sky god", icon: "☀", cards: 3, cd: 20, mult: 4.5, fire: true, info: "3 cards · a huge blast of holy fire: 4.5× damage, counts as 불" },
    { id: "m19", lvl: 19, ko: "혼 부르기", en: "calling the soul", icon: "🕯", cards: 4, cd: 300, mult: 0, self: true, fx: "revive", info: "4 cards · revive a downed teammate at 60%; alone: for 5 min a killing blow leaves you at 30%" },
  ],
  geomgaek: [
    { id: "g5", lvl: 5, ko: "도발", en: "taunt", icon: "😤", cards: 2, cd: 8, mult: 0, fx: "taunt", dur: 6, range: 10, info: "2 cards · the target must attack you for 6 s and does 20% less damage to you (range 10 m)" },
    { id: "g7", lvl: 7, ko: "회전 베기", en: "whirlwind", icon: "🌀", cards: 2, cd: 8, mult: 1.5, self: true, fx: "whirl", r: 4, info: "2 cards · hits every monster within 4 m for 1.5×" },
    { id: "g9", lvl: 9, ko: "칼자루 치기", en: "pommel strike", icon: "🔨", cards: 2, cd: 15, mult: .6, stun: 2, info: "2 cards · 0.6× damage and a 2 s stun; stops an alien's charge (bosses: 1 s)" },
    { id: "g11", lvl: 11, ko: "최후의 저항", en: "last stand", icon: "💪", cards: 2, cd: 60, mult: 0, self: true, fx: "laststand", dur: 12, info: "2 cards · +30% max health for 12 s" },
    { id: "g13", lvl: 13, ko: "반격 자세", en: "riposte stance", icon: "🔁", cards: 3, cd: 30, mult: 0, self: true, fx: "reflect", dur: 6, info: "3 cards · for 6 s every hit you take sends 60% back to the attacker" },
    { id: "g15", lvl: 15, ko: "처형", en: "execute", icon: "⚔", cards: 3, cd: 12, mult: 1, execute: true, info: "3 cards · 5× damage if the target is below 25% health (1× otherwise)" },
    { id: "g17", lvl: 17, ko: "전투의 함성", en: "battle cry", icon: "📣", cards: 3, cd: 60, mult: 0, self: true, fx: "cry", dur: 15, r: 15, info: "3 cards · you and teammates within 15 m: +15% damage, +10% max health for 15 s" },
    { id: "g19", lvl: 19, ko: "검무", en: "sword dance", icon: "🌪", cards: 4, cd: 90, mult: .8, self: true, fx: "storm", dur: 6, r: 5, info: "4 cards · 6 s of blades: 0.8× every second to everything within 5 m; nothing roots you" },
  ],
  gungsu: [
    { id: "a5", lvl: 5, ko: "연사", en: "multi-shot", icon: "🏹", cards: 2, cd: 8, mult: 1.3, fx: "multi", n: 2, r: 6, info: "2 cards · hits the target and up to 2 monsters near it for 1.3× each" },
    { id: "a7", lvl: 7, ko: "치유의 화살", en: "healing arrow", icon: "💚", cards: 2, cd: 12, mult: 0, self: true, fx: "healArrow", v: .25, vSelf: .15, r: 20, info: "2 cards · heals the most hurt teammate within 20 m for 25%, or yourself for 15% when alone" },
    { id: "a9", lvl: 9, ko: "후퇴 사격", en: "disengage shot", icon: "↩", cards: 2, cd: 15, mult: 1.2, leap: 8, info: "2 cards · leap 8 m back and shoot (1.2×)" },
    { id: "a11", lvl: 11, ko: "불화살", en: "fire arrow", icon: "🔥", cards: 2, cd: 10, mult: 1.2, fire: true, burn: { mult: 1.2, dur: 6 }, info: "2 cards · 1.2× now plus a 6 s burn, counts as 불" },
    { id: "a13", lvl: 13, ko: "그물 화살", en: "net arrow", icon: "🕸", cards: 3, cd: 25, mult: 0, fx: "root", dur: 5, info: "3 cards · roots the target for 5 s (bosses are only slowed)" },
    { id: "a15", lvl: 15, ko: "매의 눈", en: "hawk eye", icon: "🦅", cards: 3, cd: 60, mult: 0, self: true, fx: "hawk", dur: 10, info: "3 cards · for 10 s your basic attack is ready twice as fast and reaches 5 m further" },
    { id: "a17", lvl: 17, ko: "화살비", en: "rain of arrows", icon: "🌧", cards: 3, cd: 25, mult: .9, fx: "rain", r: 6, waves: 4, info: "3 cards · a 6 m circle around the target: 4 waves of 0.9× over 4 s" },
    { id: "a19", lvl: 19, ko: "신궁의 한 발", en: "the divine shot", icon: "✴", cards: 4, cd: 45, mult: 6, range: 30, pierce: true, info: "4 cards · 6× damage from up to 30 m; ignores immunity" },
  ],
};
const extraDef = k => (EXTRA[S.cls] || []).find(s => s.id === k);
const BASE_KEYS = ["basic", "s2", "s3"];
const skillKeys = () => [...BASE_KEYS, ...(EXTRA[S.cls] || []).map(s => s.id)];
const BAR_N = 10;
const barKeyLabel = id => { const i = (S.bar || []).indexOf(id); return i >= 0 ? keyName(SET.keys["bar" + i]) : "P"; };
// newly reached skills go on the first free slot
function learnSkills(announce) {
  if (!S.cls) return;
  if (!Array.isArray(S.bar)) S.bar = Array(BAR_N).fill(null);
  for (const s of EXTRA[S.cls]) if (S.level >= s.lvl && !S.bar.includes(s.id) && !(S.barSeen || []).includes(s.id)) {
    const i = S.bar.indexOf(null); if (i >= 0) S.bar[i] = s.id;
    S.barSeen = [...(S.barSeen || []), s.id]; S.skillDecks[s.id] = S.skillDecks[s.id] || [];
    if (announce) { toast(`새 스킬! ${s.icon} ${s.ko} · ${s.en} — 카드 10장을 넣으세요 (K) · fill its deck`); logChat("system", `📖 새 스킬 · ${s.ko}`); }
  }
}
function useBar(i) { const id = (S.bar || [])[i]; if (!id) { toast(`빈 칸 · empty slot (${keyName(SET.keys.book)} = 스킬 북)`); return; } startRitual(id); }

// ---- effects ----
const selfTarget = () => ({ pos: player.pos, missed: new Set(), dead: false, def: {}, model: { height: 2 }, self: true });
const CC_TEXT = { stun: "기절 · stunned", fear: "도망쳐요! · fleeing", root: "묶임 · rooted", taunt: "도발! · taunted" };
function applyCC(m, kind, dur, by = myId()) {
  if (!m || m.dead) return;
  if (NET.role === "guest") netSend({ t: "cc", mid: m.id, kind, dur });
  if (m.def.boss) { if (kind === "fear") { floater(m.pos, "면역 · immune", "#aaa", true, m.model.height); return; } if (kind === "root") { m.slowUntil = clock + dur; floater(m.pos, "느려짐 · slowed", "#9ec8ff", true, m.model.height); return; } if (kind === "stun") dur = Math.min(dur, 1); }
  m[kind + "Until"] = clock + dur;
  if (kind === "stun" && m.def.armor) m.flippedUntil = clock + dur + 1;
  if (kind === "stun") { m.charging = 0; m.slamT = 0; }
  if (kind === "taunt") { m.tgtId = by; m.state = "chase"; m.feebleUntil = clock + dur; }
  floater(m.pos, CC_TEXT[kind], "#ffd23d", true, m.model.height);
}
function hitT(m, dmg) { if (m.dead) return; if (dealDamage(m, dmg) !== false) floater(m.pos, String(dmg), "#fff", false, m.model.height); }
const dots = [];
function addDot(t, total, dur) { if (total <= 0) { floater(t.pos, "면역 · immune", "#aaa", true, t.model.height); return; } dots.push({ t, per: Math.max(1, Math.round(total / dur)), left: dur, next: 1 }); }
function hurtAlly(range) {
  let best = null, br = 1;
  for (const r of remotes.values()) if (!r.dead && r.zone === player.zone && dist2(r.pos, player.pos) < range) { const f = (r.hp || 0) / (r.mx || 1); if (f < br && f < .95) { br = f; best = r; } }
  return best && br < player.hp / player.maxHp ? best : null;
}
function sendAlly(id, fx, v, dur) { netSend({ t: "ally", to: id, fx, v, dur, nm: S.name || classDef().ko }); }
function applyAlly(d) {
  if (player.dead) return;
  if (d.fx === "heal") { const h = player.maxHp * d.v; player.hp = Math.min(player.maxHp, player.hp + h); floater(player.pos, "+" + Math.round(h), "#9be6a5", false, 2.6); SFX.heal(); }
  else if (d.fx === "hot") { player.hot = { v: d.v, until: clock + d.dur }; floater(player.pos, "🥁 회복 · renewal", "#9be6a5", true, 3); }
  else if (d.fx === "absorb") { player.absorb = { v: player.maxHp * d.v, until: clock + d.dur }; floater(player.pos, "🛡 보호막 · shield", "#9ec8ff", true, 3); }
  else if (d.fx === "cry") { player.cryUntil = clock + d.dur; recalcMax(); floater(player.pos, "📣 함성! · battle cry", "#ffd23d", true, 3); }
}
function leapBack(t, d) {
  const dx = player.pos.x - t.pos.x, dz = player.pos.z - t.pos.z, l = Math.hypot(dx, dz) || 1;
  player.pos.x += dx / l * d; player.pos.z += dz / l * d; collide(player.pos); SFX.dash();
}
// skills whose whole effect is special (support, area, crowd control); returns true when it handled the cast
function extraFx(sk, t, calc, share) {
  const me = player.pos, near = (p, r) => monsters.filter(m => !m.dead && m.zone === player.zone && !m.caged && dist2(m.pos, p) < r);
  const face = () => { if (!t.self) player.yaw = Math.atan2(-(t.pos.x - me.x), -(t.pos.z - me.z)); player.attackAnim = 1; player.model.trigger?.("attack"); };
  switch (sk.fx) {
    case "hot": { const a = hurtAlly(20); if (a) { sendAlly(a.id, "hot", sk.v * share, sk.dur); toast(`🥁 → ${a.nm}`); } else applyAlly({ fx: "hot", v: sk.v * share, dur: sk.dur }); SFX.heal(); return true; }
    case "group": { applyAlly({ fx: "heal", v: sk.v * share }); for (const r of remotes.values()) if (!r.dead && r.zone === player.zone && dist2(r.pos, me) < sk.r) sendAlly(r.id, "heal", sk.v * share); makeRing(me.clone(), sk.r, .5, "#7bdc86"); return true; }
    case "fear": { face(); for (const m of near(me, sk.r)) applyCC(m, "fear", sk.dur * share); makeRing(me.clone(), sk.r, .4, "#ffd23d"); SFX.resist(); return true; }
    case "absorb": { const a = hurtAlly(20); if (a) { sendAlly(a.id, "absorb", sk.v * share, sk.dur); toast(`🛡 → ${a.nm}`); } else applyAlly({ fx: "absorb", v: sk.v * share, dur: sk.dur }); SFX.heal(); return true; }
    case "invuln": { player.invulnUntil = clock + sk.dur; applyAlly({ fx: "heal", v: sk.v * share }); floater(player.pos, "작두 위에! · untouchable", "#ffd23d", false, 3.2); return true; }
    case "revive": {
      const r = [...remotes.values()].find(x => x.dead && x.zone === player.zone && dist2(x.pos, me) < 25);
      if (r) { netSend({ t: "rev", to: r.id }); toast(`🕯 ${r.nm} 님의 혼을 불렀어요 · revived`); }
      else { player.cheatUntil = clock + 300; toast("🕯 5분 동안 한 번은 쓰러지지 않아요 · for 5 minutes one killing blow won't kill you"); }
      SFX.heal(); return true;
    }
    case "taunt": { face(); applyCC(t, "taunt", sk.dur); SFX.groan(); return true; }
    case "whirl": { face(); const ms = near(me, sk.r); for (const m of ms) hitT(m, calc(m).dmg); makeRing(me.clone(), sk.r, .25, "#ffd23d"); SFX.dash(); if (!ms.length) toast("주변에 괴물이 없어요 · nothing in reach"); return true; }
    case "laststand": { player.lsUntil = clock + sk.dur; recalcMax(); floater(player.pos, "최후의 저항! · last stand", "#ffd23d", false, 3.2); SFX.heal(); return true; }
    case "reflect": { player.reflectUntil = clock + sk.dur; floater(player.pos, "반격 자세 · riposte", "#9ec8ff", false, 3.2); return true; }
    case "cry": { applyAlly({ fx: "cry", dur: sk.dur }); for (const r of remotes.values()) if (!r.dead && r.zone === player.zone && dist2(r.pos, me) < sk.r) sendAlly(r.id, "cry", 0, sk.dur); SFX.groan(); return true; }
    case "storm": { player.storm = { until: clock + sk.dur, next: 0, calc, r: sk.r }; floater(player.pos, "검무! · sword dance", "#ffd23d", false, 3.2); return true; }
    case "multi": {
      face(); const others = near(t.pos, sk.r).filter(m => m !== t).sort((a, b) => dist2(a.pos, t.pos) - dist2(b.pos, t.pos)).slice(0, sk.n);
      for (const m of [t, ...others]) { const v = calc(m).dmg; shootSpell(m, () => hitT(m, v)); }
      return true;
    }
    case "healArrow": { const a = hurtAlly(sk.r); if (a) { sendAlly(a.id, "heal", sk.v * share); toast(`💚 → ${a.nm}`); } else applyAlly({ fx: "heal", v: sk.vSelf * share }); return true; }
    case "root": { face(); shootSpell(t, () => applyCC(t, "root", sk.dur * share)); return true; }
    case "hawk": { player.hawkUntil = clock + sk.dur; floater(player.pos, "🦅 매의 눈 · hawk eye", "#ffd23d", false, 3.2); return true; }
    case "rain": { face(); const at = t.pos.clone(); makeRing(at, sk.r, .5, "#ffd23d"); rains.push({ at, waves: sk.waves, next: .6, calc, r: sk.r }); SFX.shot(); return true; }
  }
  return false;
}
const rains = [];
function skillTick(dt) {
  for (let i = dots.length - 1; i >= 0; i--) { const d = dots[i]; if (d.t.dead) { dots.splice(i, 1); continue; } if ((d.next -= dt) > 0) continue; d.next += 1; d.left--; if (dealDamage(d.t, d.per) !== false) floater(d.t.pos, `-${d.per} 🔥`, "#ff8a3a", true, d.t.model.height); if (d.left <= 0) dots.splice(i, 1); }
  for (let i = rains.length - 1; i >= 0; i--) { const r = rains[i]; if ((r.next -= dt) > 0) continue; r.next = 1; r.waves--; for (const m of monsters) if (!m.dead && m.zone === player.zone && dist2(m.pos, r.at) < r.r) hitT(m, r.calc(m).dmg); SFX.shotGood(); if (r.waves <= 0) rains.splice(i, 1); }
  if (player.storm) { const s = player.storm; if (clock > s.until || player.dead) player.storm = null; else if ((s.next -= dt) <= 0) { s.next = 1; for (const m of monsters) if (!m.dead && m.zone === player.zone && dist2(m.pos, player.pos) < s.r) hitT(m, s.calc(m).dmg); player.attackAnim = 1; SFX.dash(); } }
  if (player.hot) { if (clock > player.hot.until) player.hot = null; else player.hp = Math.min(player.maxHp, player.hp + player.maxHp * player.hot.v * dt); }
  if (player.absorb && clock > player.absorb.until) player.absorb = null;
  if ((player.lsUntil && clock > player.lsUntil) || (player.cryUntil && clock > player.cryUntil)) { if (clock > player.lsUntil) player.lsUntil = 0; if (clock > player.cryUntil) player.cryUntil = 0; recalcMax(); }
}

// ---- the skill book (P): every skill of your class; pick one, then a slot (6–0 or Q Z X V T) ----
let bookSel = null;
function openBook() { if (!S.cls) return; learnSkills(false); paused = true; showScreen("bookView"); bookSel = null; drawBook(); }
function drawBook() {
  $("bkBar").innerHTML = S.bar.map((id, i) => { const s = id && extraDef(id); return `<button class="bkSlot${s ? "" : " empty"}${bookSel ? " ready" : ""}" data-i="${i}"><kbd>${keyName(SET.keys["bar" + i])}</kbd><span>${s ? s.icon : ""}</span><small>${s ? s.ko : "빈 칸"}</small></button>`; }).join("");
  const rows = [...BASE_KEYS.map(k => ({ k, s: skillDef(k), fixed: true })), ...EXTRA[S.cls].map(s => ({ k: s.id, s }))];
  $("bkList").innerHTML = rows.map(({ k, s, fixed }) => {
    const locked = S.level < s.lvl, blk = skillBlock(k), n = deckCards(k).length;
    return `<div class="bkRow${locked ? " locked" : ""}${bookSel === k ? " sel" : ""}" data-k="${k}"${fixed ? ' data-fixed="1"' : ""}><span class="ic">${s.icon || (k === "basic" ? "⚔" : k === "s2" ? "✦" : "✧")}</span>`
      + `<div class="tx"><b>${s.ko}</b> <span class="en">${s.en}</span><p>${k === "basic" ? "1 card · 1× damage" : s.info}</p></div>`
      + `<div class="st"><span>Lv ${s.lvl}</span><span>${locked ? "🔒" : blk ? `카드 ${n}/10` : "준비됨 · ready"}</span><span>⌨ ${fixed ? keyName(SET.keys[k]) : barKeyLabel(k)}</span>${locked ? "" : `<button data-deck="${k}">덱 · deck</button>`}</div></div>`;
  }).join("");
  $("bkBar").querySelectorAll(".bkSlot").forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    if (bookSel) { const j = S.bar.indexOf(bookSel); if (j >= 0) S.bar[j] = S.bar[i]; S.bar[i] = bookSel; bookSel = null; SFX.select(); }
    else if (S.bar[i]) { S.bar[i] = null; SFX.select(); }
    save(); drawBook(); refreshKeyLabels();
  });
  $("bkList").querySelectorAll(".bkRow").forEach(r => r.onclick = e => {
    if (e.target.dataset.deck) { dvTab = e.target.dataset.deck; showScreen(null); openDeckView(); return; }
    if (r.dataset.fixed) { toast("이 스킬은 고정 키예요 · this one has a fixed key"); return; }
    if (r.classList.contains("locked")) { toast(`Lv ${extraDef(r.dataset.k).lvl}에 배워요 · learned at that level`); return; }
    bookSel = bookSel === r.dataset.k ? null : r.dataset.k; drawBook();
  });
  $("bkHint").textContent = bookSel ? "이제 칸을 누르세요 · now click a slot above" : "스킬을 누르고 칸을 누르면 그 키에 들어가요. 칸만 누르면 비워요. · click a skill, then a slot to put it on that key; click a slot alone to clear it.";
}
$("bookClose").onclick = () => { showScreen(null); paused = false; };
$("actBook").onclick = () => openBook();
function drawBar() {
  for (let i = 0; i < BAR_N; i++) {
    const el = $("actB" + i), id = (S.bar || [])[i], s = id && extraDef(id);
    if (el.dataset.id !== (id || "")) {
      el.dataset.id = id || ""; el.classList.toggle("empty", !s);
      el.innerHTML = `<kbd>${keyName(SET.keys["bar" + i])}</kbd>` + (s ? `<span>${s.icon}</span><small>${s.ko}</small><i class="cd"></i>` : "");
    }
    if (!s) { el.dataset.tip = `빈 칸 · empty slot — ${keyName(SET.keys.book)} = 스킬 북 · skill book`; continue; }
    const blk = skillBlock(id); el.classList.toggle("off", !!blk); el.dataset.tip = tipSkill(id);
    const cd = el.querySelector(".cd"); if (cd) cd.style.height = (blk ? 0 : Math.max(0, (cds[id] || 0) - clock) / s.cd * 100) + "%";
  }
}

// ---- 노량진 + the fish-market dungeon (Danny 2026-10-12: area 4 = A, Lv 12-15, quiz room = particles, story = one small clue) ----
// 시험 귀신: every 12 s in a fight it asks you a word; right = it is stunned, wrong = it heals and you get hurt
function examTick(m, dt, tg) {
  if (!m.def.examQ || !tg || tg.id !== myId() || quiz || order || dialog) return;
  m.examCd = (m.examCd ?? 6) - dt; if (m.examCd > 0) return;
  m.examCd = m.def.examQ.every;
  const pool = nounPool(), w = pick(pool);
  player.quizUntil = clock + 6;
  openQuiz({ title: "시험 귀신의 문제! · the exam ghost asks", prompt: `<span class="qzKo">${esc(w.en)}</span><span class="qzEn">이 뜻의 단어는? · which word means this?</span>`, answer: w,
    opts: shuffle([w, ...shuffle(pool.filter(x => x.id !== w.id)).slice(0, 3)]), time: 5,
    onDone: ok => { player.quizUntil = 0; if (m.dead) return;
      if (ok) { applyCC(m, "stun", 3); floater(m.pos, "정답! 멍해졌어요 · dazed", "#9be6a5", false, m.model.height); }
      else { m.hp = Math.min(m.maxHp, m.hp + m.maxHp * .15); hurt(player.maxHp * .1, null, true); floater(m.pos, "오답! · it feeds on it", "#ff9c8e", false, m.model.height); } } });
}
// 왕꽃게: armour halves damage until it is on its back (after its claw slam, or when stunned)
const armorMul = m => m.def.armor && !(m.flippedUntil > clock) ? 1 - m.def.armor : 1;
// 문어 왕: tentacle sweeps in lines, arms come off as it loses health, ink while it asks its question
const lineMat = new THREE.MeshBasicMaterial({ color: "#ff3a2a", transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false });
const lines = [];
function makeLine(x, z, ang, len, w, tele, dmg, lv) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, len), lineMat); mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = ang;
  mesh.position.set(x + Math.sin(ang) * len / 2, .06, z + Math.cos(ang) * len / 2); scene.add(mesh);
  lines.push({ mesh, x, z, ang, len, w, t: 0, tele, dmg });
}
function lineTick(dt) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i]; l.t += dt; l.mesh.material.opacity = .2 + .4 * Math.min(1, l.t / l.tele);
    if (l.t >= l.tele && !l.hit) {
      l.hit = true; SFX.slam();
      const dx = player.pos.x - l.x, dz = player.pos.z - l.z, along = dx * Math.sin(l.ang) + dz * Math.cos(l.ang), side = Math.abs(dx * Math.cos(l.ang) - dz * Math.sin(l.ang));
      if (!player.dead && isDun(player.zone) && along > 0 && along < l.len && side < l.w / 2) hurt(l.dmg, { lvl: lv }); else if (along > -2 && along < l.len + 2 && side < l.w + 3) floater(player.pos, "피했다! · dodged", "#9be6a5", true);
    }
    if (l.t > l.tele + .3) { scene.remove(l.mesh); lines.splice(i, 1); }
  }
}
function sweepTick(m, dt, tg) {
  const sw = m.def.sweep; if (!sw || !tg) return;
  const armsMax = 8 - mk.boards.filter(b => b === 1).length;
  const arms = Math.max(1, Math.min(armsMax, Math.ceil(m.hp / m.maxHp * 8)));
  if (m.arms && arms < m.arms) floater(m.pos, "다리가 잘렸어요! · an arm is cut off", "#ffd23d", false, m.model.height);
  m.arms = arms;
  m.sweepCd = (m.sweepCd ?? 4) - dt; if (m.sweepCd > 0) return;
  m.sweepCd = sw.every; m.attackAnim = 1;
  const n = Math.ceil(arms / 2), base = Math.atan2(tg.pos.x - m.pos.x, tg.pos.z - m.pos.z);
  for (let k = 0; k < n; k++) {
    const ang = base + (k - (n - 1) / 2) * .38;
    makeLine(m.pos.x, m.pos.z, ang, sw.len, sw.w, sw.tele, sw.dmg * m.mul, m.lvl);
    netSend({ t: "ln", x: m.pos.x, z: m.pos.z, ang, len: sw.len, w: sw.w, tele: sw.tele, dmg: sw.dmg * m.mul, lv: m.lvl });
  }
  if (tg.id === myId()) toast("문어 다리가 휩쓸어요! 선 밖으로 · tentacles — get out of the red lines!");
}
// the market dungeon
const mkPoints = MARKET.spawns.map(s => ({ ...s, zone: "market", mon: null, respawnAt: 0 }));
const mk = { boards: [0, 0, 0] };
function syncBoards() { (MARKET.boardMeshes || []).forEach((m, i) => { m.material.color.set(mk.boards[i] === 1 ? "#9be6a5" : mk.boards[i] === -1 ? "#555555" : "#ffffff"); }); }
function resetMarket() {
  for (let i = monsters.length - 1; i >= 0; i--) { const m = monsters[i]; if (m.zone !== "market") continue; scene.remove(m.model.root); m.plate.remove(); monsters.splice(i, 1); if (target === m) setTarget(null); }
  for (const sp of mkPoints) { sp.mon = null; spawnMonster(sp); }
  mk.boards = [0, 0, 0]; syncBoards();
}
function toMarket() {
  cancelRitual(); setTarget(null); closeDialog();
  if (NET.role === "guest") netSend({ t: "enterM" }); else if (!someoneIn("market", myId())) resetMarket();
  player.zone = "market"; player.pos.set(MARKET.entry.x, 0, MARKET.entry.z); player.yaw = -Math.PI / 2; cam.yaw = -Math.PI / 2; player.vel = null;
  toast("노량진 수산시장 · 냉동 창고에서는 난로 곁에 · in the freezer, stay by the heaters");
}
function marketToYd() { cancelRitual(); setTarget(null); closeDialog(); player.zone = "yeouido"; player.pos.set(YEOUIDO.marketOut.x, 0, YEOUIDO.marketOut.z); player.yaw = 0; cam.yaw = 0; player.vel = null; }
// the particle room: a sentence from your words with its particle missing (은/는, 이/가, 을/를, 에, 에서, 와/과, (으)로, 의)
const PGROUPS = { A: ["이", "가"], B: ["은", "는"], C: ["을", "를"], D: ["에"], D2: ["에서"], E: ["과", "와"], F: ["으로", "로"], G: ["의"] };
const AVOID = { A: ["B"], B: ["A"], C: ["B"], D: ["D2", "F"], D2: ["D"], E: [], F: ["D"], G: [] };
const hasBatchim = s => { const c = s.trim().slice(-1).charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 && c % 28 !== 0; };
const endsL = s => { const c = s.trim().slice(-1).charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 && c % 28 === 8; };
function formFor(group, noun) { const b = hasBatchim(noun); const g = PGROUPS[group]; if (g.length === 1) return g[0]; if (group === "F") return b && !endsL(noun) ? "으로" : "로"; return b ? g[0] : g[1]; }
function particleQuestion() {
  const all = Object.entries(PGROUPS).flatMap(([k, list]) => list.map(p => [k, p])).sort((a, b) => b[1].length - a[1].length);
  const cands = [];
  for (const w of bookWords()) {
    if (w.pos !== "noun" || !w.ex || (S.chapters.length && !S.chapters.includes(w.ch))) continue;
    const kb = w.kb || w.kr, i = w.ex[0].indexOf(kb); if (i < 0) continue;
    const rest = w.ex[0].slice(i + kb.length), hit = all.find(([, p]) => rest.startsWith(p) && (rest.length === p.length || /[\s.,!?]/.test(rest[p.length])));
    if (hit) cands.push({ w, kb, i, group: hit[0], p: hit[1] });
  }
  if (!cands.length) return null;
  const c = pick(cands), groups = Object.keys(PGROUPS).filter(g => g !== c.group && !AVOID[c.group].includes(g));
  const opts = shuffle([c.p, ...shuffle(groups).slice(0, 3).map(g => formFor(g, c.kb))]);
  return { ...c, opts, sentence: c.w.ex[0].slice(0, c.i + c.kb.length) + "＿" + c.w.ex[0].slice(c.i + c.kb.length + c.p.length) };
}
function boardQuiz(i) {
  if (mk.boards[i]) { toast(mk.boards[i] > 0 ? "이미 풀었어요 · already solved" : "이 칠판은 지워졌어요 · this board is wiped for this run"); return; }
  const q = particleQuestion(); if (!q) { toast("문장이 없어요 · no sentence found for your chapters"); return; }
  const ans = { id: q.w.id, kr: q.p }, opts = q.opts.map(p => p === q.p ? ans : { id: "x", kr: p });
  openQuiz({ title: `칠판 ${i + 1} · 빈칸에 맞는 조사는? · which particle fills the gap?`, prompt: `<span class="qzKo">${esc(q.sentence)}</span><span class="qzEn">${esc(q.w.ex[1])}</span>`, answer: ans, opts,
    onDone: ok => { if (NET.role === "guest") netSend({ t: "board", i, ok }); applyBoard(i, ok); } });
}
function applyBoard(i, ok) {
  if (mk.boards[i]) return; mk.boards[i] = ok ? 1 : -1; syncBoards();
  if (ok) { toast(`정답! 문어 왕의 다리 하나가 묶였어요 · right! the octopus king loses an arm (${8 - mk.boards.filter(b => b === 1).length} left)`); return; }
  toast("틀렸어요! 장어가 와요 · wrong — eels are coming!");
  if (NET.role === "guest") return;
  for (const g of MARKET.guardSpots) { spawnMonster({ kind: "jangeo", lvl: 13, x: g.x, z: g.z, mon: null, zone: "market" }); monsters[monsters.length - 1].state = "chase"; }
}
// freezer: lose health away from the heaters; ice room: you slide
let coldT = 0;
function coldTick(dt) {
  if (player.zone !== "market" || player.dead || !inRect(player.pos, MARKET.coldRect)) { coldT = 0; return; }
  const warm = MARKET.heaters.some(h => dist2(h, player.pos) < 4.5);
  if (warm) { coldT = 0; return; }
  if ((coldT += dt) >= 1) { coldT = 0; hurt(player.maxHp * .025, null, true); floater(player.pos, "추워요! · freezing", "#bfe6ff", true, 3); }
}
function moveBy(vx, vz, dt) {
  const ice = player.zone === "market" && inRect(player.pos, MARKET.iceRect);
  if (!ice) { player.vel = null; player.pos.x += vx * dt; player.pos.z += vz * dt; return; }
  const v = player.vel || (player.vel = { x: 0, z: 0 }), k = Math.min(1, dt * 1.4);
  v.x += (vx - v.x) * k; v.z += (vz - v.z) * k; player.pos.x += v.x * dt; player.pos.z += v.z * dt;
}
function marketCleared() {
  S.marketClears = (S.marketClears || 0) + 1; addHeart(10);
  toast("🏆 수산시장 클리어! 문어 왕을 물리쳤어요 · the fish market is cleared!");
  if (S.marketClears === 1) setTimeout(() => sendMail("박 선생님", "문어 왕을 물리쳤다고 들었어요. 정말 대단해요! 학생들이 이걸 꼭 드리고 싶대요.", "I heard you defeated the octopus king. Amazing! My students really wanted you to have this.",
    { cards: [{ id: pick(bookWords().filter(w => S.chapters.includes(w.ch))).id, rar: 3 }], gear: ["t_ink"], won: 30000 }), 2500);
  save();
}
// 박 선생님's list: the small clue (decision 19)
function teacher2Talk(n) {
  const opts = [];
  if (S.sawList) opts.push({ ko: "(명단 다시 보기 · read the list again)", en: "", act: readList });
  opts.push({ ko: "(대화 끝내기)", en: "leave", act: closeDialog });
  showLine(n, "n_hello", opts);
}
function readList() { showLine({ name: "실종자 명단 · list of the missing" }, "o_list", [{ ko: "(닫기)", en: "close", act: closeDialog }]); if (!S.sawList) { S.sawList = true; save(); } }
function cupbapTalk(n) {
  showLine(n, "c_hello", [{ plr: "p_cupbap", act: () => { if (S.money < 3000) { endWith(n, "r_short"); return; } S.money -= 3000; S.snacks = S.snacks || {}; S.snacks.cupbap = (S.snacks.cupbap || 0) + 1; SFX.pickup(); save(); toast(`컵밥 ₩3,000 → 소모품 · ${keyName(SET.keys.food)}로 먹기`); endWith(n, "k_thanks"); } }, { plr: "p_leave", act: () => endWith(n, "k_thanks") }]);
}

// ---- friends (Danny 2026-10-12): every character has a permanent 4-letter friend code = its own room on the
// relay. While you play (and "show me online" is on) the game keeps that room open, so friends can see you're
// online (their game knocks on your room and asks your name, level and area) and join your world with one click.
// An empty room costs nothing: the world snapshot is only sent while someone is in it.
const CODE_ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), b => CODE_ABC[b % 24]).join("");
function ensureFriendCode() { if (!S.friendCode) S.friendCode = newCode(); if (!S.hostKey) S.hostKey = rid(24); if (!Array.isArray(S.friends)) S.friends = []; if (S.showOnline === undefined) S.showOnline = true; }
function autoOnline() { if (!started) return; ensureFriendCode(); if (S.showOnline && S.name && !NET.role) netHost(); }
function probeFriend(code) {
  return new Promise(res => {
    let done = false; const ws = new WebSocket(`${RELAY}${code}?role=player&id=probe-${rid(8)}`);
    const fin = st => { if (done) return; done = true; clearTimeout(to); try { ws.close(1000, "bye"); } catch (e) {} res(st); };
    const to = setTimeout(() => fin({ online: false }), 6000);
    ws.onopen = () => ws.send(JSON.stringify({ t: "ping" }));
    ws.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch (er) { return; } if (d && d.t === "pong") fin({ online: true, ...d }); };
    ws.onclose = () => fin({ online: false }); ws.onerror = () => {};
  });
}
let frBusy = false, frFirst = true;
async function refreshFriends() {
  ensureFriendCode(); if (frBusy || !S.friends.length) return; frBusy = true;
  const res = await Promise.all(S.friends.map(f => f.code === S.friendCode ? Promise.resolve({ online: false }) : probeFriend(f.code)));
  S.friends.forEach((f, i) => {
    const st = res[i], was = f.online; f.online = st.online;
    if (st.online) { f.nm = st.nm || f.nm; f.info = { lvl: st.lvl, cls: st.cls, zone: st.zone, n: st.n }; f.seen = Date.now(); if (!was && !frFirst) { toast(`👥 ${f.nm || f.code} 님이 접속했어요 · is online (${keyName(SET.keys.friends)})`); logChat("system", `👥 ${f.nm || f.code} online`); } }
  });
  frFirst = false; frBusy = false; save(); if (!$("friendsView").hidden) drawFriends();
}
setInterval(() => { if (started && S.friends?.length) refreshFriends(); }, 60000);
function openFriends() { if (!S.cls) return; ensureFriendCode(); paused = true; showScreen("friendsView"); drawFriends(); refreshFriends(); }
function drawFriends() {
  const me = NET.role === "host" && NET.code === S.friendCode, inRoom = NET.role === "guest" ? S.friends.find(f => f.code === NET.code) : null;
  $("frMe").innerHTML = `<label>내 이름 · your name <input id="frMyName" maxlength="12" autocomplete="off" value="${esc(S.name || "")}" placeholder="이름"></label>`
    + `<div class="frCode">내 친구 코드 · my friend code <b>${S.friendCode}</b> <button id="frCopy">복사 · copy</button></div>`
    + `<label class="frToggle"><input type="checkbox" id="frOnline" ${S.showOnline ? "checked" : ""}> 친구에게 온라인으로 보이기 · show me online to friends</label>`
    + `<div class="frState">${inRoom ? `🟢 ${esc(inRoom.nm || inRoom.code)} 님의 세계에 있어요 · you're in their world` : me ? "🟢 온라인 · friends can see you and join your world" : !S.name ? "⚪ 이름을 먼저 쓰세요 · type a name to go online" : "⚪ 오프라인 · offline"}</div>`;
  $("frList").innerHTML = S.friends.length ? S.friends.map((f, i) => {
    const z = f.info ? `Lv ${f.info.lvl} ${CLASSES[f.info.cls]?.ko || ""} · ${ZONE_KO[f.info.zone] || f.info.zone}${f.info.n > 1 ? ` · ${f.info.n}명` : ""}` : "";
    return `<div class="frRow${f.online ? " on" : ""}"><span class="dot">${f.online ? "🟢" : "⚪"}</span><div class="tx"><b>${esc(f.nm || "친구")}</b> <span class="code">${f.code}</span><p>${f.online ? z : f.seen ? `마지막 접속 · last seen ${new Date(f.seen).toLocaleString()}` : "오프라인 · offline"}</p></div>`
      + `<div class="bt">${f.online && NET.code !== f.code ? `<button data-join="${i}">같이 하기 · join</button>` : ""}${f.online ? `<button data-wh="${i}" title="귓속말 · whisper">💬</button>` : ""}${f.online && NET.role && NET.code !== f.code ? `<button data-inv="${i}" title="초대 · invite to your world">📨</button>` : ""}<button data-del="${i}">삭제</button></div></div>`;
  }).join("") : `<p class="fine">친구가 없어요. 친구의 4글자 코드를 위에 쓰세요 · no friends yet: add a classmate's 4-letter code above.</p>`;
  $("frMyName").onchange = e => { S.name = e.target.value.trim().slice(0, 12); save(); autoOnline(); drawFriends(); };
  $("frOnline").onchange = e => { S.showOnline = e.target.checked; save(); if (!S.showOnline && NET.role === "host") netLeave(); else autoOnline(); drawFriends(); };
  $("frCopy").onclick = () => { try { navigator.clipboard.writeText(S.friendCode).then(() => toast("복사했어요 · copied"), () => {}); } catch (e) {} };
  $("frList").querySelectorAll("[data-join]").forEach(b => b.onclick = () => { const f = S.friends[+b.dataset.join]; if (!S.name) { toast("이름을 먼저 쓰세요 · type your name first"); return; } showScreen(null); paused = false; netJoin(f.code); toast(`👥 ${f.nm || f.code} 님의 세계로 · joining`); });
  $("frList").querySelectorAll("[data-wh]").forEach(b => b.onclick = () => { const f = S.friends[+b.dataset.wh]; showScreen(null); paused = false; openChat(); $("chatInput").value = `/w ${f.code} `; });
  $("frList").querySelectorAll("[data-inv]").forEach(b => b.onclick = () => invite(S.friends[+b.dataset.inv]));
  $("frList").querySelectorAll("[data-del]").forEach(b => b.onclick = () => { S.friends.splice(+b.dataset.del, 1); save(); drawFriends(); });
}
$("frAddBtn").onclick = () => {
  ensureFriendCode();
  const code = $("frCode").value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4), nm = $("frName").value.trim().slice(0, 12);
  if (code.length !== 4) { toast("코드는 네 글자예요 · the code has 4 letters"); return; }
  if (code === S.friendCode) { toast("내 코드예요 · that's your own code"); return; }
  if (S.friends.some(f => f.code === code)) { toast("이미 있어요 · already on your list"); return; }
  S.friends.push({ code, nm: nm || "", online: false }); $("frCode").value = ""; $("frName").value = ""; save(); drawFriends(); refreshFriends();
};
$("frRefresh").onclick = () => refreshFriends();
$("frClose").onclick = () => { showScreen(null); paused = false; };
$("actFriends").onclick = () => openFriends();

// ---- whispers + invites to online friends (Danny 2026-10-12): one short message into their room, they answer "ack" ----
function sendToFriend(code, payload) {
  return new Promise(res => {
    let done = false; const ws = new WebSocket(`${RELAY}${code}?role=player&id=m-${rid(8)}`);
    const fin = ok => { if (done) return; done = true; clearTimeout(to); try { ws.close(1000, "bye"); } catch (e) {} res(ok); };
    const to = setTimeout(() => fin(false), 5000);
    ws.onopen = () => ws.send(JSON.stringify(payload));
    ws.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch (er) { return; } if (d && d.t === "ack") fin(true); };
    ws.onclose = () => fin(false); ws.onerror = () => {};
  });
}
let lastWhisper = null;
const findFriend = q => { q = (q || "").trim().toLowerCase(); return (S.friends || []).find(f => f.code.toLowerCase() === q || (f.nm || "").toLowerCase() === q); };
async function whisper(f, text) {
  text = String(text).trim().slice(0, 200); if (!text) return;
  logChat(`→ ${f.nm || f.code}`, text);
  const ok = await sendToFriend(f.code, { t: "whisper", nm: S.name || classDef().ko, code: S.friendCode, text });
  if (!ok) logChat("system", `${f.nm || f.code} 님은 지금 오프라인이에요 · offline, the message didn't arrive`);
}
async function invite(f) {
  if (!NET.role) { toast("먼저 온라인이 되어야 해요 · go online first (name + show me online)"); return; }
  const ok = await sendToFriend(f.code, { t: "invite", nm: S.name || classDef().ko, code: NET.code });
  toast(ok ? `📨 ${f.nm || f.code} 님에게 초대를 보냈어요 · invite sent` : `${f.nm || f.code} 님은 오프라인이에요 · offline`);
}
function onWhisper(d, from) {
  if (String(from).startsWith("m-")) netSend({ to: from, t: "ack" });
  lastWhisper = { code: d.code, nm: d.nm };
  logChat(`💬 ${d.nm}`, d.text); toast(`💬 ${d.nm}: ${d.text}`); SFX.select();
}
function showInvite(d, from) {
  if (String(from).startsWith("m-")) netSend({ to: from, t: "ack" });
  const box = $("inviteBox"); box.hidden = false;
  box.innerHTML = `<b>📨 ${esc(d.nm)}</b> 님이 같이 하자고 해요 · invites you to their world<div class="ib"><button id="invYes">같이 하기 · join</button><button id="invNo">나중에 · later</button></div>`;
  $("invYes").onclick = () => { box.hidden = true; if (NET.code !== d.code) { netJoin(d.code); toast(`👥 ${d.nm} 님의 세계로 · joining`); } };
  $("invNo").onclick = () => { box.hidden = true; };
  clearTimeout(showInvite.t); showInvite.t = setTimeout(() => { box.hidden = true; }, 30000);
  SFX.pickup(); logChat("system", `📨 ${d.nm} invites you · ${keyName(SET.keys.friends)}`);
}
// chat commands: /w CODE-or-name text, /r text (reply to the last whisper)
function chatCommand(text) {
  let m = text.match(/^\/(w|귓|whisper)\s+(\S+)\s+([\s\S]+)$/i);
  if (m) { const f = findFriend(m[2]); if (!f) logChat("system", "친구 목록에 없어요 · not on your friends list (O)"); else whisper(f, m[3]); return true; }
  m = text.match(/^\/(r|답)\s+([\s\S]+)$/i);
  if (m) { if (!lastWhisper) logChat("system", "답할 귓속말이 없어요 · nobody to reply to"); else whisper(findFriend(lastWhisper.code) || lastWhisper, m[2]); return true; }
  return false;
}

// ---- main loop ------------------------------------------------------------------------------------------
let last = performance.now(), saveT = 0;
// ---- area guidance (Danny 2026-10-17) -------------------------------------------------------------------
const AREA_LV = { hongdae: 1, apt: 4, river: 6, yeouido: 9, tower: 10, noryangjin: 12, market: 15 };
const AREA_KO = { hongdae: "홍대 거리", apt: "서교 아파트", river: "한강공원", yeouido: "여의도", tower: "63빌딩", noryangjin: "노량진", market: "수산시장" };
const AREA_GO = ["hongdae", "apt", "river", "yeouido", "noryangjin"];   // where 민수 sends you instead (overworld only)
function areaOf() {
  const p = player.pos, z = player.zone;
  if (z === "street") return p.z >= 108 ? "river" : p.x > 108 ? "apt" : "hongdae";
  if (z === "yeouido") return p.z > YD.z + 330 ? "noryangjin" : "yeouido";
  return z === "tower" || z === "market" ? z : null;
}
let areaT = 0, areaNow = null;
const areaWarned = {};   // area -> the level you were warned at (warn again after a level-up)
function phoneText(keys, ko, en) {
  say(keys.map(lineClip), { interrupt: true }); SFX.coin?.();
  toast(`📱 민수: ${ko} · ${en}`); logChat("📱 민수", `${ko} (${en})`);
}
function areaWatch(dt) {
  if ((areaT -= dt) > 0 || player.dead) return; areaT = .5;
  const a = areaOf(); if (a === "apt" && !S.visitedApt) { S.visitedApt = true; save(); }
  if (a === areaNow) return; areaNow = a;
  if (!a || S.level + 2 >= AREA_LV[a] || areaWarned[a] === S.level) return;
  areaWarned[a] = S.level;
  const go = [...AREA_GO].reverse().find(x => AREA_LV[x] <= S.level + 2) || "hongdae";
  phoneText(["g_danger", "g_go_" + go], `${LINES.g_danger.ko} ${LINES["g_go_" + go].ko}`,`${AREA_KO[a]} is still dangerous for you (Lv ${AREA_LV[a]}+). Try ${AREA_KO[go]} first.`);
}
function aptHint() {
  if (S.visitedApt || S.level < 3 || S.aptHintLvl === S.level || NET.role === "guest" && player.zone !== "street") return;
  S.aptHintLvl = S.level; save();
  phoneText(["g_apt_hint"], "서교 아파트에 가 봤어요? 동쪽 문으로 나가면 돼요.", "Have you been to the 서교 apartments? Go out through the east gate.");
}

function step(dt) {
  if (paused || !started) return;
  clock += dt;
  S.time += dt * GAME_MIN_PER_SEC;
  night = nightFactor();
  S.hunger = Math.max(0, S.hunger - dt * 100 / HUNGER_SECONDS);
  checkAchievements(dt); netTick(dt); quizTick(dt); areaWatch(dt);
  if (S.hunger <= 0 && !step.warned) { toast("배고파요! 식당에 가세요 · you're hungry: attacks do 75%"); step.warned = true; } if (S.hunger > 0) step.warned = false;
  // movement (camera-relative WASD, the character turns to where it walks)
  let mx = 0, mz = 0;
  if (!player.dead && !dialog) {
    const f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0), r = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    mx = fx * f + rx * r; mz = fz * f + rz * r;
  }
  const len = Math.hypot(mx, mz);
  player.moving = len > 0 && (player.rootedUntil <= clock || !!player.storm);
  if (player.moving) {
    const sp = 6 * (buffOn("speed") ? 1.1 : 1) * (keys.shift ? .5 : 1) * (player.riding ? 1.9 : 1);
    moveBy(mx / len * sp, mz / len * sp, dt);
    if (!(dragging && dragging.b === 2)) { const want = Math.atan2(-mx, -mz); let d = want - player.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); player.yaw += d * Math.min(1, dt * 12); }
  } else moveBy(0, 0, dt);
  windTick(dt);
  collide(player.pos);
  if (player.zone === "street" && player.pos.distanceTo(tmpV.set(ENTRANCE.x, 0, ENTRANCE.z - 1)) < 1.3) fade(toStation);   // walked into the stairs
  // regen: out of combat, faster with 김치찌개, much faster in the station
  const inFight = monsters.some(m => m.state === "chase" && !m.dead);
  if (!player.dead && player.hp < player.maxHp && (player.zone === "station" || (!inFight && clock - player.lastHurt > 5))) {
    const rate = player.zone === "station" || inCamp(player.pos) ? .05 : .015 * (buffOn("regen") ? 1.5 : 1);
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * rate * dt);
  }
  player.attackAnim = Math.max(0, player.attackAnim - dt * 3);
  updateMonsters(dt); updateProjectiles(dt); updateRings(dt); fishTick(dt); companionTick(dt); rubbleTick(dt); syncMike(); skillTick(dt); coldTick(dt); lineTick(dt);
  if (target && target.dead) setTarget(null);
  saveT += dt; if (saveT > 10) { saveT = 0; S.hp = player.hp; save(); }
}
// distance along (dx, dz) from (x, z) before the first tall box (2D slab test), capped at max
function camClear(x, z, dx, dz, max) {
  let best = max;
  for (const b of world.camBlocks) {
    const x0 = b.x0 - .4, x1 = b.x1 + .4, z0 = b.z0 - .4, z1 = b.z1 + .4;
    let t0 = 0, t1 = best;
    if (Math.abs(dx) < 1e-6) { if (x < x0 || x > x1) continue; } else { let a = (x0 - x) / dx, c = (x1 - x) / dx; if (a > c) [a, c] = [c, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, c); }
    if (Math.abs(dz) < 1e-6) { if (z < z0 || z > z1) continue; } else { let a = (z0 - z) / dz, c = (z1 - z) / dz; if (a > c) [a, c] = [c, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, c); }
    if (t0 <= t1 && t0 < best) best = t0;
  }
  return best;
}
// music mood: station = calm, street = calm by day / uneasy at night, fights = action (stays 4 s after the last chase)
let lastFight = -99;
function musicMood() {
  if (!started) return "day";
  if (player.zone === "station") return "station";
  if (isDun(player.zone)) { if (monsters.some(m => (m.def.boss || m.def.alien) && !m.dead && m.zone === player.zone && m.state === "chase")) return "alien"; if (monsters.some(m => !m.dead && m.zone === player.zone && m.state === "chase" && dist2(m.pos, player.pos) < 35)) lastFight = clock; return clock - lastFight < 4 ? "fight" : "night"; }
  if (monsters.some(m => !m.dead && m.def.alien && m.zone === player.zone && dist2(m.pos, player.pos) < (m.state === "chase" ? 45 : 30))) return "alien";
  if (monsters.some(m => !m.dead && m.state === "chase" && dist2(m.pos, player.pos) < 35)) lastFight = clock;
  return clock - lastFight < 4 ? "fight" : night > .5 ? "night" : "day";
}
function render(dt) {
  setMusicMood(musicMood()); musicTick(dt); memoryTick(dt);
  if (started) {
    const p = player.pos, m = player.model.root;
    m.position.set(p.x, player.riding ? .35 : 0, p.z); m.rotation.y = player.yaw; bikeTick(dt);
    player.model.anim(dt, { moving: player.moving && !paused && !player.riding, speed: 1, walk: !!keys.shift, attack: player.attackAnim, dead: player.dead, casting: !!ritual });
    for (const d of decor) d.anim(dt, {});
    if (target) tRing.position.set(target.pos.x, .06, target.pos.z);
    for (const n of npcs) { n.model.anim(dt, {}); if (dist2(n.pos, p) < 6) { const want = Math.atan2(-(p.x - n.pos.x), -(p.z - n.pos.z)); n.model.root.rotation.y += (want - n.model.root.rotation.y) * Math.min(1, dt * 3); } }
    // WoW-style orbit camera
    // pull the camera in when a building stands between it and you
    let cd = cam.dist;
    const dx = Math.sin(cam.yaw) * Math.cos(cam.pitch), dz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
    const RZc = player.zone === "dungeon" ? DUNGEON : player.zone === "tower" ? TOWER : player.zone === "market" ? MARKET : null;
    if (player.zone === "street" || player.zone === "yeouido") cd = Math.max(1.6, Math.min(cd, camClear(p.x, p.z, dx, dz, cam.dist) - .6));
    if (RZc) cd = Math.min(cd, 7);
    camera.position.set(p.x + dx * cd, 1.8 + Math.sin(cam.pitch) * cd, p.z + dz * cd);
    if (RZc) { const cp2 = { x: camera.position.x, z: camera.position.z }; clampDungeon(cp2, .4, RZc.wrects); camera.position.x = cp2.x; camera.position.z = cp2.z; const room = RZc.wrects.find(q => inRect(cp2, q)); if (!(room && room.roof)) camera.position.y = Math.min(camera.position.y, room && room.room ? 7.2 : room ? 4.4 : 5.3); }
    else if (player.zone === "street") { camera.position.x = Math.min(STREET.maxX + 1, Math.max(STREET.minX - 1, camera.position.x)); camera.position.z = Math.min(STREET.maxZ + 1, Math.max(STREET.minZ - 1, camera.position.z)); }
    else if (player.zone === "station") { camera.position.x = Math.min(STATION.x + 17, Math.max(STATION.x - 17, camera.position.x)); camera.position.z = Math.min(STATION.z + 9.4, Math.max(STATION.z - 9.4, camera.position.z)); camera.position.y = Math.min(4.6, camera.position.y); }
    camera.lookAt(p.x, 1.6, p.z);
    if (player.zone === "street") world.occlude(camera.position, p);
    // pillars between the camera and you turn see-through
    for (const o of world.npcSpots.occluders) {
      const ox = o.position.x + STATION.x, oz = o.position.z + STATION.z, ax = camera.position.x, az = camera.position.z, bx = p.x - ax, bz = p.z - az;
      const t = Math.max(0, Math.min(1, ((ox - ax) * bx + (oz - az) * bz) / (bx * bx + bz * bz || 1))), d = Math.hypot(ax + bx * t - ox, az + bz * t - oz);
      const op = player.zone === "station" && d < 1.1 ? .18 : 1; o.material.opacity = op; o.children.forEach(ch => ch.visible = op === 1);
    }
    const n = player.zone === "station" ? 0 : isDun(player.zone) ? 1 : night;
    world.setNight(n); world.update(performance.now(), p);
    if (player.zone === "dungeon") { world.sun.intensity = .12; world.hemi.intensity = .45; }
    else if (player.zone === "tower") { world.sun.intensity = .4; world.hemi.intensity = 1; }
    else if (player.zone === "market") { world.sun.intensity = .2; world.hemi.intensity = .65; }
    bloom.strength = .6 * n; bloom.enabled = n > .02;
    scene.fog.near = player.zone === "station" ? 30 : scene.fog.near;
    drawHUD(); drawPlates(); drawBubble(); drawRemotes(dt); drawCompanionPlate();
  } else {
    const t = performance.now() * .00005;
    camera.position.set(Math.sin(t) * 9, 6, 6 + Math.cos(t) * 6); camera.lookAt(0, 3, -12);
    world.setNight(nightFactor()); world.update(performance.now(), { x: 0, z: 0 });
  }
  composer.render();
}
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  step(dt); render(dt);
  requestAnimationFrame(loop);
}

// ---- boot ---------------------------------------------------------------------------------------------
async function boot() {
  try { await Promise.race([Promise.all([document.fonts.load('64px "Black Han Sans"'), document.fonts.load('700 20px "Noto Sans KR"', '가나다')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  world = buildWorld(scene);
  await loadKayKit();
  placeNPCs(); placeMapItem(); placeRacks(); buildCampParts(); applyQuality(); refreshKeyLabels(); setMusicVolume(SET.music); makeSpawnPoints();
  buildClassPick();
  const has = load();
  setVolume(S.vol);
  $("btnContinue").hidden = !has;
  $("btnContinue").onclick = () => { initAudio(); continueGame(); };
  $("btnNew").onclick = () => showScreen("classPick");
  showScreen("title");
  requestAnimationFrame(loop);
}
boot();

// test hooks (used by Claude to check the build in the browser pane)
window.__seoul = {
  get S() { return S; }, get world() { return world; }, player, monsters, renderer, scene, camera, cam, get target() { return target; }, get ritual() { return ritual; },
  setHour(h) { S.time = Math.floor(S.time / 1440) * 1440 + h * 60; },
  give(n) { S.money += n; },
  step(sec) { for (let t = 0; t < sec; t += 1 / 30) step(1 / 30); render(1 / 30); },
  answer(right = true) { if (!ritual) return; const id = ritual.words[ritual.idx]; const i = ritual.opts.indexOf(id); pickCard(right ? i : (i + 1) % CHOICES); },
  attack: (k = "basic") => startRitual(k),
  setBook(b) { S.book = b; S.chapters = []; }, bookChapters: () => bookChapters(), bookWords: () => bookWords(), setNewBook(b) { newBook = b; },
  gap: lv => ({ g: lvlGap(lv), taken: gapTaken(lv), dealt: gapDealt(lv), cls: gapClass(lv) }), areaOf: () => areaOf(), aptHint: () => aptHint(),
  syncStory: () => syncStory(true), xpNeed: L => xpNeed(L), setMode(m) { S.mode = m; syncStory(false); }, setNewMode(m) { newMode = m; },
  giveDeck(ids, k = "basic") { const cs = ids.map(id => newCard(id, 0)); S.cards.push(...cs); S.skillDecks[k] = cs.map(c => c.uid); if (!S.origin) { S.origin = deckBonus(ids); S.chapters = [...new Set(ids.map(id => WORD[id].ch))]; } recalcMax(); },
  drop: m => dropCard(m || { kind: "dokkaebi", pos: player.pos }),
  gear: (kind = "dokkaebi") => { const g = Object.keys(GEAR).find(k => GEAR[k].drop === kind); addItem(g); }, tab: () => cycleTarget(), toStreet: () => toStreet(), toStation: () => toStation(),
  tp(x, z) { player.pos.set(x, 0, z); },
  spawn(kind, lvl, x, z, zone = "street") { spawnMonster({ kind, lvl, x, z, mon: null, zone }); return monsters[monsters.length - 1]; },
  toYeouido: () => toYeouido(), toTower: () => toTower(), towerToYd: () => towerToYd(), toStreetBridge: () => toStreetBridge(), get tw() { return tw; }, get order() { return order; }, orderPick: k => orderPick(k), get rubble() { return rubble; }, rackUse: () => rackUse(), openFriends: () => openFriends(), sendChat: t => sendChat(t), invite: i => invite(S.friends[i]), refreshFriends: () => refreshFriends(), probeFriend: c => probeFriend(c), get NET() { return NET; }, toMarket: () => toMarket(), marketToYd: () => marketToYd(), get mk() { return mk; }, boardQuiz: i => boardQuiz(i), particleQuestion: () => particleQuestion(), MARKET, get lines() { return lines; }, openBook: () => openBook(), learnSkills: () => learnSkills(true), useBar: i => useBar(i), EXTRA, get cds() { return cds; }, campTalk: () => campTalk(npcs.find(n => n.kind === "gayoung")), syncMike: () => { mikeDay = -1; syncMike(); }, CAMP, toggleBike: () => toggleBike(), openReroll: uid => openReroll(uid), upsertRemote: (id, st) => upsertRemote(id, st), remotes, interact: () => interact(), YEOUIDO, TOWER,
  get memo() { return memo; }, heart: n => addHeart(n), get comp() { return comp; }, get fishing() { return fishing; }, flip: i => flipStone(i), upgrade: () => upgradeMenu(npcs.find(n => n.kind === "smith")),
  talk: kind => talkTo(npcs.find(n => n.kind === kind)), get dialog() { return dialog; }, opt(i) { $("dOpts").children[i]?.click(); }, get quiz() { return quiz; }, quizAnswer(right = true) { if (quiz) answerQuiz(right ? quiz.opts.indexOf(quiz.answer) : (quiz.opts.indexOf(quiz.answer) + 1) % quiz.opts.length); },
};

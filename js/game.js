// 서울의 수수께끼 존재 · The Mysterious Creature of Seoul — first playable (BRIEF.md decision 33).
// One Hongdae street, the station below it, the 10-card deck, the basic attack ritual, 3 monsters, one restaurant,
// the weapon shop, three classes. Solo, local, save in localStorage.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { buildWorld, STATION, STREET, ENTRANCE, SPAWNS, MAPSPOT, MAPSPOT_APT, MAPSPOT_RIVER, STREET_NPCS, DUNGEON, YD, YEOUIDO, TOWER, TW, MAPSPOT_YD, MAPSPOT_NR, MK, MARKET, MAPSPOT_YS, MU, MUSEUM, MAPSPOT_YN, MAPSPOT_SC, MAPSPOT_DI, MAPSPOT_SG, MAPSPOT_SY, MAPSPOT_SA, MAPSPOT_IT, toon } from "./world.js?v=mvf4yr3m";
import { makeHero, makeNPC, makeMonster } from "./models.js?v=mvf4yr3m";
import { loadKayKit, kayReady, makeKay as makeKay0 } from "./kaykit.js?v=mvf4yr3m";
import { loadPeople, peopleReady, makeLook, makeMan, LOOKS, MEN } from "./people.js?v=mvf4yr3m";
import { loadZoo, zooReady, makeAnimal, ANIMALS } from "./zoo.js?v=mvf4yr3m";
// Danny 2026-10-19 (new models): every KayKit role that has a Quaternius man in people.js becomes him; the rest (people sitting down) stay KayKit
const makeKay = (role, h) => (peopleReady() && (LOOKS[role] ? makeLook(role, 0) : MEN[role] ? makeMan(role) : null)) || makeKay0(role, h);
const classModel = (cls, look) => makeLook(cls, look || 0) || (kayReady() ? makeKay0(cls === "zoo" ? "gungsu" : cls) : makeHero(cls === "zoo" ? "gungsu" : cls));
import { loadWomen, womenReady, makeWoman } from "./women.js?v=mvf4yr3m";
import * as FX from "./fx.js?v=mvf4yr3m";
import { LINES } from "./lines.js?v=mvf4yr3m";
import { unlockMusic, setMusicMood, setMusicVolume, musicTick } from "./music.js?v=mvf4yr3m";
import { initAudio, SFX, say, wordClip, lineClip, exClip, setVolume, snd } from "./audio.js?v=mvf4yr3m";

const DATA = window.SEOUL_DATA;
const WORD = Object.fromEntries(DATA.words.map(w => [w.id, w]));
const BOOKS = DATA.books || [{ id: "5a", title: "5A", en: "Korean 5A" }];
// every character studies one book (Danny 2026-10-12); S.chapters = the chapters whose words it sees (drops, quizzes, murals)
const bookChapters = () => DATA.chapters.filter(c => (c.book || "5a") === S.book);
// ★ 시험 단어 (Danny 2026-10-19): with S.prio on, only the words starred on his sheet / in his notes (the exam words) are in play
const inPlay = w => !S.prio || !!w.star;
const playWords = () => DATA.words.filter(inPlay);
const bookWords = () => DATA.words.filter(w => (w.book || "5a") === S.book && inPlay(w));
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
  zoo:      { ko: "사육사", en: "Zookeeper", hp: 110, dmg: 1.0, range: 15, solo: "가장 쉬움 · easiest", rec: true,
              pass: "Animals fight for you. Call them before a fight.", weapons: ["호루라기", "은 호루라기", "황금 호루라기"] },
  mudang:   { ko: "무당", en: "Shaman", hp: 100, dmg: 1.0, range: 15, heal: .03, solo: "쉬움 · easy",
              pass: "Every correct answer heals you a little.", weapons: ["방울", "신령 방울", "천신 방울"] },
  geomgaek: { ko: "검객", en: "Swordsman", hp: 130, dmg: 1.3, range: 3.4, mitig: .2, unbreak: true, cleave: { r: 3, mult: .5 }, solo: "가장 어려움 · hardest solo",
              pass: "Tough. Each hit also hurts the monsters next to your target.", weapons: ["목검", "강철 검", "환도"] },
  gungsu:   { ko: "궁수", en: "Archer", hp: 90, dmg: 1.2, range: 20, solo: "보통 · medium",
              pass: "Shoots from far away.", weapons: ["나무 활", "각궁", "명궁의 활"] },
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
  muinseok:   { ko: "무인석", en: "tomb guardian statue", hp: 520, speed: 2, range: 3.2, dmg: 20, rate: 3.8, weak: "water", lvl: 15, xp: 190, aggro: 8, money: [14000, 18000], slam: { every: 9, tele: 1.6, radius: 4.6, dmg: 34 }, model: "muinseok" },
  cheongja:   { ko: "청자 도깨비", en: "celadon vase goblin", hp: 320, speed: 3.8, range: 2.6, dmg: 17, rate: 2.6, weak: "metal", lvl: 15, xp: 170, aggro: 10, money: [13000, 17000], burst: { radius: 4.2, tele: 1.1, dmg: 30 }, model: "celadon" },
  gapot:      { ko: "빈 갑옷", en: "empty armour", hp: 480, speed: 3.2, range: 3.2, dmg: 22, rate: 3, weak: "fire", lvl: 16, xp: 200, aggro: 10, money: [14000, 19000], model: "armour" },
  dogul:      { ko: "외계인 도굴꾼", en: "alien looter", hp: 400, speed: 5.2, range: 2.6, dmg: 19, rate: 2.4, weak: "earth", lvl: 16, xp: 220, aggro: 13, money: [15000, 20000], alien: true, model: "alien" },
  janggun:    { ko: "깨어난 장군", en: "the awakened general", hp: 2800, speed: 1.8, range: 4, dmg: 24, rate: 3, weak: "water", lvl: 18, xp: 1300, aggro: 24, money: [80000, 100000], boss: true, plates: true, volley: { every: 8, n: 3, tele: 1.3, len: 24, w: 2.4, dmg: 32 }, wall: { every: 26, dur: 5 }, model: "general", scale: 1.5 },
  jangseung:  { ko: "장승", en: "village guardian post", hp: 320, speed: 2.6, range: 3.0, dmg: 14, rate: 3.6, weak: "metal", lvl: 9, xp: 120, aggro: 9, money: [9000, 13000], slam: { every: 10, tele: 1.6, radius: 4.5, dmg: 30 } },
  geuseundae: { ko: "그슨대", en: "looming shadow", hp: 260, speed: 4.6, range: 2.6, dmg: 11, rate: 2.5, weak: "fire", lvl: 10, xp: 130, aggro: 11, money: [10000, 14000], grow: { every: 5, add: .1, max: .6 } },
  commander:  { ko: "외계인 사령관", en: "alien commander", hp: 2200, speed: 3.2, range: 14, dmg: 14, rate: 3.2, weak: "water", lvl: 12, xp: 700, aggro: 18, money: [50000, 70000], boss: true, alien: true, caster: true, orb: 22, volley: 3, shield: { every: 28, dur: 14 }, model: "alien_caster", scale: 1.6 },
  kkachi:     { ko: "까치 요괴", en: "magpie spirit", hp: 70, speed: 5.2, range: 2.4, dmg: 5, rate: 2.4, weak: "metal", lvl: 2, xp: 24, aggro: 11, money: [2800, 4200], model: "magpie" },
  chaekgwi:   { ko: "책 귀신", en: "haunted textbook", hp: 140, speed: 2.8, range: 12, dmg: 7, rate: 3, weak: "fire", lvl: 4, xp: 45, aggro: 11, money: [5000, 7000], ranged: true, model: "book" },
  jeongi:     { ko: "전기 도깨비", en: "spark goblin", hp: 200, speed: 4.4, range: 11, dmg: 9, rate: 2.8, weak: "earth", lvl: 6, xp: 80, aggro: 11, money: [7000, 10000], ranged: true, shock: true, model: "spark" },
  mulgwi:     { ko: "물귀신", en: "water ghost", hp: 300, speed: 3, range: 2.8, dmg: 13, rate: 3.2, weak: "earth", immune: "water", lvl: 9, xp: 120, aggro: 9, money: [9000, 13000], root: { chance: .3, dur: 1.5, ko: "물귀신이 발목을 잡았어요! · it grabbed your ankle" }, slam: { every: 10, tele: 1.6, radius: 4.2, dmg: 26 }, model: "watergh" },
  dokkaebibul: { ko: "도깨비불", en: "will-o'-wisp", hp: 260, speed: 4.6, range: 2.4, dmg: 14, rate: 2.6, weak: "water", immune: "fire", lvl: 12, xp: 150, aggro: 12, money: [11000, 15000], burst: { radius: 4, tele: 1, dmg: 28, col: ["#3ad8c8", "#9ff8e8", "#ffffff"] }, model: "wisp" },
  neon:       { ko: "네온 도깨비", en: "neon goblin", hp: 420, speed: 3.4, range: 15, dmg: 16, rate: 3, weak: "wood", lvl: 15, xp: 190, aggro: 12, money: [14000, 18000], caster: true, orb: 32, model: "neongob" },
  vine:     { ko: "덩굴 귀신", en: "vine spirit", hp: 80, speed: 2.6, range: 13, dmg: 5, rate: 3.2, weak: "metal", lvl: 2, xp: 25, aggro: 10, money: [3000, 4500], ranged: true, root: { chance: .35, dur: 2 } },
};
const FOODS = {
  kimchi: { ko: "김치찌개", price: 9000, fill: 100, buff: "regen", line: "r_p9000", plr: "p_kimchi" },
  bibim:  { ko: "비빔밥", price: 10000, fill: 100, buff: "dmg", line: "r_p10000", plr: "p_bibim" },
  tteok:  { ko: "떡볶이", price: 5000, fill: 50, buff: "speed", line: "r_p5000", plr: "p_tteok" },
  gimbap: { ko: "김밥 (포장)", price: 4000, fill: 50, takeaway: true, line: "r_takeout", plr: "p_gimbap" },
};
const BUFFS = { regen: { ko: "김치찌개: 회복 +50%" }, dmg: { ko: "비빔밥: 공격 +5%" }, speed: { ko: "떡볶이: 속도 +10%" }, power: { ko: "삼계탕: 공격 +15%" }, vigor: { ko: "홍삼: 체력 +20%" } };
const BUFF_FOODS = { samgye: { ko: "삼계탕", en: "ginseng chicken soup", price: 50000, fill: 100, buff: "power", dur: 120, plr: "p_samgye" }, hongsam: { ko: "홍삼", en: "red ginseng drink", price: 40000, fill: 20, buff: "vigor", dur: 120, plr: "p_hongsam" } };
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
  mudang: { A: { ko: "화염 부적", en: "fire talisman", mult: 2.8, fire: true, info: "2 cards · 2.8× damage, counts as 불 fire" },
            B: { ko: "치유 부적", en: "healing talisman", mult: 2, heal: .25, cd: 12, info: "2 cards · heals 25% health + 2× damage" } },
  geomgaek: { A: { ko: "돌진 베기", en: "charging slash", mult: 2, range: 10, info: "2 cards · dash to a target up to 10 m away, 2× damage" },
              B: { ko: "철벽", en: "iron wall", mult: 1.6, guard: { red: .5, dur: 6 }, cd: 12, info: "2 cards · 1.6× damage, then take 50% less damage for 6 s" } },
  zoo: { A: { ko: "먹이 주기", en: "feeding", mult: 0, self: true, feed: { heal: .5, hits: 2 }, cd: 12, info: "2 cards · every animal of yours heals 50%; each animal gets 2 more attacks the first time it is fed" },
         B: { ko: "시바견 부르기", en: "call a Shiba Inu", mult: 0, self: true, summon: "shiba", cd: 4, info: "2 cards · a Shiba Inu: 5 bites of 0.45×, 25% of your health" } },
  gungsu: { A: { ko: "관통 사격", en: "piercing shot", mult: 2.4, range: 24, info: "2 cards · 2.4× damage, range 24 m" },
            B: { ko: "덫 화살", en: "snare arrow", mult: 1.6, slow: { f: .5, dur: 5 }, cd: 10, info: "2 cards · 1.6× damage, target 50% slower for 5 s" } },
};
const ZOO_BASIC = { ...SKILLS.basic, ko: "양 부르기", en: "call a sheep", cd: 2, self: true, summon: "sheep", info: "1 card · a sheep: 5 attacks of 0.3× every 2 s, 20% of your health" };
function skillDef(k) { const x = extraDef(k); if (x) return { ...x, key: barKeyLabel(k) }; if (k === "basic" && S.cls === "zoo") return ZOO_BASIC; return k === "basic" ? SKILLS.basic : Object.assign({}, SKILLS[k], SKILL2[S.cls][SKILLS[k].opt]); }

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
    fixGoneWords();
    if (!S.deck20) { S.deck20 = true; deck20Topup(); }
    if (S.skillDecks.basic.length > basicSize()) { const d = deckCards("basic"); S.skillDecks.basic = d.slice().sort((a, b) => b.rar - a.rar || !!a.gift - !!b.gift || d.indexOf(a) - d.indexOf(b)).slice(0, basicSize()).map(c => c.uid); }
    dropGifts();
    return true;
  } catch (e) { return false; }
}
// 2026-10-18: seven headings of the 5B review notes had slipped into the word list as cards (b044 b045 b324–b328, e.g. "인용의 출처 밝히기");
// a card of one becomes a real word of the same chapter (one you don't have yet if possible, same rarity) and every other trace goes
const GONE_WORDS = { b012: "5b-1", b282: "5b-4", b157: "5b-2", b300: "5b-4", b376: "5b-5", b459: "5b-6", b044: "5b-1", b045: "5b-1", b324: "5b-4", b325: "5b-4", b326: "5b-4", b327: "5b-4", b328: "5b-4" };
function fixGoneWords() {
  const swap = id => { const own = new Set(S.cards.map(c => c.id)), pool = DATA.words.filter(w => w.ch === GONE_WORDS[id]); return (shuffle(pool.filter(w => !own.has(w.id)))[0] || pick(pool)).id; };
  for (const c of S.cards || []) if (GONE_WORDS[c.id]) c.id = swap(c.id);
  for (const m of S.mail || []) for (const c of m.attach?.cards || []) if (GONE_WORDS[c.id]) c.id = swap(c.id);
  for (const st of Object.values(S.quests || {})) if (st?.words) st.words = st.words.map(id => GONE_WORDS[id] ? swap(id) : id);
  for (const id in GONE_WORDS) if (S.stats) delete S.stats[id];
  for (const k of ["owned", "mastered", "battleDeck"]) if (Array.isArray(S[k])) S[k] = S[k].filter(id => !GONE_WORDS[id]);
  if (S.dailyShop?.words) S.dailyShop.words = S.dailyShop.words.filter(id => !GONE_WORDS[id]);
}
function save() { if (S.cards) { const o = new Set(S.owned || []); let add = false; for (const c of S.cards) if (!o.has(c.id)) { o.add(c.id); add = true; } if (add) S.owned = [...o]; } try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
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
const SET = { keys: { ...DEFAULT_KEYS }, sens: 1, quality: "high", music: .35, musicV: 2 };   /* Danny 2026-10-18: the default music was too loud (.5 → .35) */
try { const s = JSON.parse(localStorage.getItem(SET_KEY)); if (s) { Object.assign(SET, s); SET.keys = Object.assign({ ...DEFAULT_KEYS }, s.keys || {}); if (!s.musicV) { if (s.music === .5 || s.music == null) SET.music = .35; SET.musicV = 2; } } } catch (e) {}
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
  const types = Object.values(c).filter(n => n > 0).length, h = Math.max(5, ids.length / 2);
  if (c.noun >= h) return { c, hp: .01, dmg: 0, ls: 0, cd: 0, txt: "+1% 최대 체력 (명사 덱)" };
  if (c.verb >= h) return { c, hp: 0, dmg: .01, ls: 0, cd: 0, txt: "+1% 공격력 (동사 덱)" };
  if (c.adjective >= h) return { c, hp: 0, dmg: 0, ls: .01, cd: 0, txt: "+1% 흡혈 (형용사 덱)" };
  if (c.other >= h) return { c, hp: 0, dmg: 0, ls: 0, cd: .01, txt: "−1% 재사용 (부사 덱)" };
  if (types >= 3) return { c, hp: .005, dmg: .005, ls: 0, cd: 0, txt: "균형: 공격 +0.5%, 체력 +0.5%" };
  return { c, hp: 0, dmg: 0, ls: 0, cd: 0, txt: "보너스 없음 · no bonus" };
}

// ---- renderer / scene ------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$("game").appendChild(renderer.domElement);
const scene = new THREE.Scene();
FX.initFx(scene); FX.setSound(snd);
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
  if (started && !$("rewardView").hidden && (k === "enter" || k === " " || k === "1")) { e.preventDefault(); closeReward(); return; }   /* the reward window: Enter / Space / 1 = OK */
  if (started && quiz) { const n = +e.key; if (n >= 1 && n <= 4) { e.preventDefault(); answerQuiz(n - 1); } return; }
  if (started && dialog) { const n = +e.key; if (n >= 1 && n <= 9) { const b = $("dOpts").children[n - 1]; if (b) b.click(); } return; }
  if (!started || paused) return;
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
const SKILL_DECK = 20;   // cards a skill deck needs (Danny 2026-10-18: 20)
// the basic attack (and the spells on its deck) grows with the level, so new words keep coming in (Danny 2026-10-19: Lv 1-4: 10,
// 5-9: 15, 10-14: 20, 15+: 25); when it grows, the stranger fills the new slots with words of your newest chapter (growBasic)
const basicSize = () => { const L = (S && S.level) || 1; return L < 5 ? 10 : L < 10 ? 15 : L < 15 ? 20 : 25; };
const deckSize = k => k === "basic" || k === "sleep" || k === "silence" ? basicSize() : SKILL_DECK;
const dropGifts = () => { const keep = new Set([...(S.skillDecks.basic || []), ...(S.bank?.cards || [])]); S.cards = S.cards.filter(c => !c.gift || keep.has(c.uid)); };   // gifts outside the basic deck go back to the stranger
const deckCards = k => (S.skillDecks[k === "sleep" || k === "silence" ? "basic" : k] || []).map(cardBy).filter(Boolean);   // spells use the basic deck
const deckIds = k => deckCards(k).map(c => c.id);
const bagCards = () => { const used = new Set([...Object.values(S.skillDecks).flat(), ...S.bank.cards]); return S.cards.filter(c => !used.has(c.uid)); };
// ---- inventory: S.items = [{uid, g}], S.equip = {weapon, armor, trinket} (uids) ----
const itemBy = uid => S.items.find(i => i.uid === uid);
function gearName(g) { const d = GEAR[g]; return d.slot === "weapon" ? (d.names ? d.names[S.cls] || Object.values(d.names)[0] : classDef().weapons[d.tier]) : d.ko; }
function gearInfo(g) { const st = GEAR[g].set && SETS[GEAR[g].set]; return gearInfo0(g) + (st ? ` · ${st.ko} (둘 다: ${bonusTxt(st.bonus)})` : ""); }
// Danny 2026-10-18: every stat also says in English what it does
const pc = v => Math.round(v * 100);
const STAT_TXT = {
  mul: v => `공격력 ×${v} · damage ×${v} on all your attacks`,
  dmg: v => `공격력 +${pc(v)}% · +${pc(v)}% damage on every attack`,
  hp: v => `체력 +${pc(v)}% · +${pc(v)}% max health`,
  ls: v => `흡혈 ${pc(v)}% · lifesteal: ${pc(v)}% of the damage you deal heals you`,
};
const statList = (o, k = 1) => [o.hp && STAT_TXT.hp(o.hp * k), o.dmg && STAT_TXT.dmg(o.dmg * k), o.ls && STAT_TXT.ls(o.ls * k)].filter(Boolean).join(" / ") || "보너스 없음 · no bonus";
function gearInfo0(g) { const d = GEAR[g]; if (d.slot === "weapon") return STAT_TXT.mul(WEAPON_MULT[d.tier]); return statList(d); }
const gearPrice = g => GEAR[g].slot === "weapon" && !GEAR[g].set ? WEAPON_PRICE[GEAR[g].tier] : GEAR[g].price;
const itemName = it => gearName(it.g) + (it.up ? ` +${it.up}` : "");
function weaponMult() { const it = itemBy(S.equip.weapon); return WEAPON_MULT[it ? GEAR[it.g].tier : 0] * (1 + .05 * (it?.up || 0)); }
function itemInfo(it) { const up = it.up || 0, d = GEAR[it.g]; if (!up) return gearInfo(it.g); if (d.slot === "weapon") return STAT_TXT.mul((WEAPON_MULT[d.tier] * (1 + .05 * up)).toFixed(2)); if (d.slot === "armor") return STAT_TXT.hp(d.hp + .03 * up); return statList(d, 1 + .2 * up); }
function weaponTier() { const it = itemBy(S.equip.weapon); return it ? GEAR[it.g].tier : 0; }
function gearStat(k) { let v = 0; for (const slot in S.equip) { const it = itemBy(S.equip[slot]); if (!it) continue; const d = GEAR[it.g], up = it.up || 0; if (d[k]) v += d[k] * (d.slot === "trinket" ? 1 + .2 * up : 1); if (k === "hp" && d.slot === "armor") v += .03 * up; } return v + setBonus(k); }
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
  if (n < deckSize(k)) return `카드 ${n}/${deckSize(k)} · this skill needs ${deckSize(k)} cards (K)`;
  return null;
}
// ---- level + XP (Danny 2026-10-11): XP from kills and from mastering a word; a level = +5% health, +4% damage ----
const MAX_LEVEL = 20, MASTER_XP = 15;
// Danny 2026-10-12: one book should take about 10 hours, a new chapter every 2 levels (8과 at Lv 15)
const xpNeed = L => Math.round(100 * Math.pow(L, 1.6) / 10) * 10;
const lvlHp = () => 1 + .05 * (S.level - 1), lvlDmg = () => 1 + .04 * (S.level - 1);
// monsters far below your level give little XP (no farming the first street), stronger ones give more
// level gap (Danny 2026-10-17): up to 2 levels above you is a fair fight ("Lv 3 vs Lv 5 should not be punished");
// every level beyond that the monster deals +25% damage to you (max x3). Damage YOU deal never depends on the gap
// (Danny 2026-10-17: reward damage builds; bosses are always higher level and would take forever). Monsters 2+ levels below you: a small bonus (max 25%).
const lvlGap = lv => (lv || S.level) - S.level;
const gapTaken = lv => { const g = lvlGap(lv); return g > 2 ? Math.min(3, 1 + .25 * (g - 2)) : g < -1 ? Math.max(.75, 1 + .05 * (g + 1)) : 1; };
const gapClass = lv => { const g = lvlGap(lv); return g >= 5 ? "lv-red" : g >= 3 ? "lv-orange" : g >= -1 ? "lv-yellow" : g >= -4 ? "lv-green" : "lv-gray"; };
// Danny 2026-10-17: Lv 9 after the 문어 왕 is too slow later on, early pace is good -> kill XP grows with the monster level
// (Lv 1 x1, Lv 7 x1.9, Lv 12 x2.65, Lv 15 x3.1)
const KILL_XP = lv => 1 + .15 * (lv - 1);
const monsterXp = m => .75 * m.def.xp * KILL_XP(m.lvl) * (1 + .3 * (m.lvl - m.def.lvl)) * Math.max(.2, Math.min(1.5, 1 + .2 * (m.lvl - S.level)));
function gainXp(n, at) {
  if (S.level >= MAX_LEVEL) return;
  n = Math.round(n); S.xp += n;
  floater(at || player.pos, `+${n} XP`, "#c3b2ff", true, at ? 2 : 3.2);
  if (S.level < MAX_LEVEL && S.xp >= xpNeed(S.level) && !examPending) { examPending = true; examSnooze = 0; toast("📝 레벨 업 시험 준비! 준비되면 📝 버튼 · level-up exam ready: press the 📝 button when you are"); SFX.charge(); }
  drawExamBtn(); save();
}
function levelUp() {
  {
    S.xp -= xpNeed(S.level); S.level++; recalcMax(); player.hp = player.maxHp; FX.pillarFx(player.pos, "#ffd23d"); learnSkills(true); syncStory(true); setTimeout(aptHint, 2500); setTimeout(() => growBasic(true), 3500);
    toast(`레벨 업! Lv ${S.level} · health +5%, damage +4%`); SFX.pickup(); floater(player.pos, "LEVEL UP!", "#ffd23d", false, 3.4);
  }
  save();
}
// ---- the level-up exam (Danny 2026-10-18): every word you have ever owned, the least practised ones most often ----
const EXAM_N = 5;
let examPending = false, examSnooze = 0, exam = null, calmT = 0;
const ownedWords = () => [...new Set([...(S.owned || []), ...S.cards.map(c => c.id)])].filter(id => WORD[id] && inPlay(WORD[id]));
function examWeight(id) { const k = mastery(id).k, basic = deckCards("basic").some(c => c.id === id); return (k === "mastered" ? .3 : k === "learned" ? 1 : 3) * (basic ? .35 : 1); }
function pickWeighted(ids, n) {
  const out = [], pool = ids.slice();
  while (out.length < n && pool.length) { const tot = pool.reduce((a, id) => a + examWeight(id), 0); let r = Math.random() * tot, i = 0; for (; i < pool.length - 1; i++) if ((r -= examWeight(pool[i])) < 0) break; out.push(pool.splice(i, 1)[0]); }
  return out;
}
function drawExamBtn() { const b = $("examBtn"); if (b) b.hidden = !examPending || !!exam; }
function levelExamTick(dt) {
  if (!examPending || exam || quiz || ritual || dialog || paused || duel || player.dead || clock < examSnooze) { calmT = 0; return; }
  if (monsters.some(m => !m.dead && m.zone === player.zone && m.state === "chase" && dist2(m.pos, player.pos) < 25)) { calmT = 0; return; }
  calmT += dt;   /* Danny 2026-10-18: no automatic exam any more, the player starts it with the 📝 button */
}
function startExam() {
  if (exam || !examPending || duel || cg) return;
  const pool = ownedWords();
  if (pool.length < 4) { examPending = false; levelUp(); drawExamBtn(); return; }   // nothing to test yet
  const need = Math.min(EXAM_N, pool.length);
  exam = { queue: pickWeighted(pool, need), right: 0, need, n: 0 }; cancelRitual(); closeDialog(); paused = !NET.role; drawExamBtn(); examNext();
}
function examNext() {
  if (!exam) return;
  if (exam.right >= exam.need) {
    exam = null; paused = false; examPending = false; levelUp(); drawExamBtn(); setTimeout(() => cardPack(1), 900);
    if (S.level < MAX_LEVEL && S.xp >= xpNeed(S.level)) gainXp(0);   // enough XP for the next level too: another exam
    return;
  }
  const id = exam.queue.shift(), w = WORD[id], pool = ownedWords().filter(x => x !== id);
  const others = shuffle(pool.length >= 3 ? pool : bookWords().map(x => x.id).filter(x => x !== id)).slice(0, 3).map(x => WORD[x]);
  exam.n++; const koToEn = false, ans = w;   /* Danny 2026-10-18: always the English meaning asked, Korean words as answers (English answers were awkward) */
  openQuiz({ title: `📝 레벨 업 시험 · level-up exam  ${exam.right} / ${exam.need}`,
    prompt: koToEn ? `<span class="qzKo">${esc(w.kr)}</span><span class="qzEn">무슨 뜻이에요? · what does it mean?</span>` : `<span class="qzKo">${esc(w.en)}</span><span class="qzEn">이 뜻의 단어는? · which word means this?</span>`,
    answer: ans, opts: shuffle([ans, ...others.map(o => koToEn ? { id: o.id, kr: o.en } : o)]),
    onDone: ok => { if (!exam) return; if (ok) exam.right++; else exam.queue.push(id); examNext(); } });
}
function postponeExam() { $("quiz").hidden = true; quiz = null; exam = null; paused = false; examSnooze = clock + 60; drawExamBtn(); toast("시험은 나중에 · exam postponed — 📝 button when you're ready"); }
function recalcMax() { const keep = player.hp / player.maxHp; player.maxHp = Math.round(classDef().hp * (1 + bonus().hp + gearStat("hp")) * lvlHp() * (buffOn("vigor") ? 1.2 : 1) * (perk("gayoung") ? 1.15 : 1) * (player.lsUntil > clock ? 1.3 : 1) * (player.cryUntil > clock ? 1.1 : 1)); player.hp = Math.min(player.maxHp, isFinite(keep) ? keep * player.maxHp : player.maxHp); }

// ---- collision -----------------------------------------------------------------------------------
const ZONES = ["street", "dungeon", "yeouido", "tower", "market", "museum"], RZONES = { dungeon: DUNGEON, tower: TOWER, yeouido: YEOUIDO, market: MARKET, museum: MUSEUM };
const isDun = z => z === "dungeon" || z === "tower" || z === "market" || z === "museum";
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
  snd("punchH", .7, .75); FX.shake(Math.min(1, .3 + amount / player.maxHp * 2.5)); FX.burst(player.pos, { n: 14, color: ["#ff5a4a", "#ffffff", "#ff9a8a"], speed: 6, size: .12, life: .45, shape: "spark", grav: 4 });
  $("vignette").classList.add("hit"); setTimeout(() => $("vignette").classList.remove("hit"), 120);
  SFX.hurt();
  if (src && src.def && src.def.root && !raw && Math.random() < src.def.root.chance) { player.rootedUntil = clock + src.def.root.dur; floater(player.pos, src.def.root.ko || "덩굴에 묶임! · rooted", "#9be66a", true, 3); }
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
function setTarget(m) { target = m; tRing.visible = !!m; $("tframe").hidden = !m; if (m) { $("tName").textContent = m.name; const g = lvlGap(m.lvl); $("tSub").className = gapClass(m.lvl); $("tSub").textContent = `Lv ${m.lvl} · ${m.def.en}` + (g > 2 ? ` · ⚠ 너무 강해요 · too strong: it hits you ×${gapTaken(m.lvl).toFixed(1)}` : g < -1 ? " · 약해요 · weak" : ""); } }
function cycleTarget() {
  if (player.zone === "station") return;
  const list = monsters.filter(m => !m.dead && m.zone === player.zone && !m.caged && dist2(m.pos, player.pos) < 40).sort((a, b) => dist2(a.pos, player.pos) - dist2(b.pos, player.pos));
  if (!list.length) { setTarget(null); toast("주변에 괴물이 없어요 · no monster nearby"); return; }
  const i = list.indexOf(target); setTarget(list[(i + 1) % list.length]);
}

// ---- the ritual (decisions 1, 8, 9, 17, 35) -------------------------------------------------------------
// every skill draws its cards from its own deck; the basic attack asks 1 word, stronger skills more
const cds = { basic: 0, s2: 0, s3: 0, sleep: 0, silence: 0 }, comeBacks = { basic: [], s2: [], s3: [], sleep: [], silence: [] };
// which deck card an attack asks (Danny 2026-10-19): new and weak words often, mastered ones rarely (but still sometimes)
const ritualWeight = id => { const m = mastery(id).k, st = S.stats[id]; return (m === "mastered" ? .35 : m === "learned" ? 1 : 2.5) * (st && st.w > st.c ? 1.5 : 1); };
function weightedOrder(ids, wf) { const pool = ids.slice(), out = []; while (pool.length) { const tot = pool.reduce((a, id) => a + wf(id), 0); let r = Math.random() * tot, i = 0; for (; i < pool.length - 1; i++) if ((r -= wf(pool[i])) < 0) break; out.push(pool.splice(i, 1)[0]); } return out; }
function startRitual(k = "basic") {
  if (player.dead || dialog || ritual) return;
  if (player.riding) setRiding(false);
  if (player.zone === "station") { toast("역 안은 안전해요 · no fighting in the station"); return; }
  const block = skillBlock(k); if (block) { toast(block); return; }
  const skP = skillDef(k);
  if (skP.summon && zoo.filter(a => a.k === k && !a.dead).length >= ZOO_MAX) { toast(`${ANIMALS[skP.summon].icon} 이미 ${ZOO_MAX}마리예요 · you already have ${ZOO_MAX} out (they leave after their 5 attacks)`); return; }
  if (skP.summon && !zooReady()) { loadZoo(); toast("동물을 데려오는 중… · the animals are on their way, try again in a moment"); return; }
  if (!skP.self && (!target || target.dead)) { cycleTarget(); if (!target) return; }
  if (clock < (cds[k] || 0)) { toast(`아직 준비 중 · not ready (${Math.ceil(cds[k] - clock)} s)`); return; }
  const sk = skillDef(k), range = (sk.range || classDef().range) + (k === "basic" && player.hawkUntil > clock ? 5 : 0);
  if (!sk.self && dist2(target.pos, player.pos) > range + .5) { toast(`너무 멀어요 · too far (${range} m)`); return; }
  const ids = deckIds(k);
  const back = [...new Set(comeBacks[k] || [])].filter(id => ids.includes(id)); comeBacks[k] = [];
  const words = back.concat(weightedOrder(ids.filter(id => !back.includes(id)), ritualWeight)).slice(0, sk.cards);
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
    if (mastery(id).k === "mastered" && !S.mastered.includes(id)) { S.mastered.push(id); toast(`마스터! ${WORD[id].kr} · +${MASTER_XP} XP` + (skillKeys().some(k => deckIds(k).includes(id)) && !(S.grad || []).includes(id) ? " · 🎓 졸업시킬 수 있어요 · ready to graduate (K): +0.5% damage" : "")); gainXp(MASTER_XP); }
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
  cds[r.k] = clock + sk.cd * (perk("gangsa") ? .9 : 1) * Math.max(.5, 1 - sumMod("cd") - b.cd) * (r.k === "basic" && player.hawkUntil > clock ? .5 : 1);
  if (!correct.length) { cds[r.k] = clock + Math.min(sk.cd, 3); toast("주문 실패! · the attack fizzled"); SFX.empty(); floater(player.pos, "실패", "#aaa", true, 2.8); return; }
  if (sk.summon || sk.feed || sk.rally || sk.treat) { player.model.trigger?.("attack"); zooCast(sk, r.k, correct.length / sk.cards); return; }
  const t = r.target, range = (sk.range || classDef().range) + (r.k === "basic" && player.hawkUntil > clock ? 5 : 0);
  if (t.dead || dist2(t.pos, player.pos) > range + 4) { toast("빗나갔어요 · it got away"); return; }
  if (sk.silence) { if (!t.def.alien) toast("외계인에게만 통해요 · it only works on aliens"); else applySilence(t, sk.silence * correct.length / sk.cards); return; }
  if (sk.sleep) { if (t.def.boss) toast("대장은 잠들지 않아요 · bosses don't sleep"); else applySleep(t, sk.sleep * correct.length / sk.cards); return; }
  // damage of this cast against any monster (area skills hit several, each with its own weaknesses)
  const nc = newestChapter();
  const calc = (tt, mult = sk.mult) => {
    let total = 0, weak = false, imm = false;
    const per = BASE_ATTACK * mult / sk.cards * classDef().dmg * weaponMult() * lvlDmg() * gradMul() * companionDamageMul(tt);
    for (const c of cards) {
      let part = per * (WORD[c.id].ch === nc ? NEW_CH_BONUS : 1);
      if (c.mod.t === "el" && c.mod.el === tt.def.weak) { part *= EL_MULT[c.rar]; weak = true; }
      if (!sk.pierce && c.mod.t === "el" && c.mod.el === tt.def.immune) { part = 0; imm = true; }
      if (sk.fire && tt.def.weak === "fire") { part *= 1.5; weak = true; }
      if (!sk.pierce && sk.fire && tt.def.immune === "fire") { part = 0; imm = true; }
      total += part;
    }
    total *= (1 + sumMod("dmg") + b.dmg + gearStat("dmg")) * (buffOn("dmg") ? 1.05 : 1) * (buffOn("power") ? 1.15 : 1) * (S.hunger <= 0 ? HUNGRY_MULT : 1) * (player.cryUntil > clock ? 1.15 : 1) * rand(.9, 1.1);
    return { dmg: Math.max(imm && total < 1 ? 0 : 1, Math.round(total)), weak, imm };
  };
  const { dmg, weak: weakHit, imm: immuneHit } = calc(t, sk.execute ? (t.hp / t.maxHp < .25 ? 5 : 1) : sk.mult);
  if (sk.fx) fxCast(sk, t, castCols(sk, cards));
  if (sk.fx && extraFx(sk, t, calc, correct.length / sk.cards)) return;
  if (sk.leap) leapBack(t, sk.leap);
  player.yaw = Math.atan2(-(t.pos.x - player.pos.x), -(t.pos.z - player.pos.z)); player.attackAnim = 1; player.model.trigger?.("attack");
  const ls = sumMod("ls") + b.ls + gearStat("ls"), share = correct.length / sk.cards;
  const fxCols = castCols(sk, cards), fxPow = Math.max(.7, (sk.mult || 1) * share * (r.k === "basic" ? 1 : 1.25));
  // skill effects that don't depend on hitting
  if (sk.heal) { const h = player.maxHp * sk.heal * share; player.hp = Math.min(player.maxHp, player.hp + h); floater(player.pos, "+" + Math.round(h), "#9be6a5", false, 2.6); SFX.heal(); }
  if (sk.guard) { player.guardUntil = clock + sk.guard.dur; floater(player.pos, "철벽!", "#9ec8ff", false, 3); }
  const land = () => {
    if (t.dead) return;
    if (sk.noHit && sk.spread) for (const m of monsters) if (m !== t && !m.dead && !m.caged && m.zone === t.zone && dist2(m.pos, t.pos) <= sk.spread) { addDot(m, calc(m).dmg, sk.burn.dur); FX.explosion(m.pos, FX.EL_COL.fire, .5); aggro(m); }
    if (sk.noHit) { addDot(t, dmg, sk.burn.dur); FX.explosion(t.pos, FX.EL_COL.fire, .8); if (dmg > 0) floater(t.pos, "🔥 " + sk.ko, "#ff8a3a", false, t.model.height); SFX.shotGood(); return; }
    if (dealDamage(t, dmg, sk.slow ? sk.slow.dur : 0) === false) return;
    if (sk.splash) { FX.ring(t.pos, { color: "#ffd23d", r: sk.splash.r, life: .6 }); for (const m of monsters) if (m !== t && !m.dead && !m.caged && m.zone === t.zone && dist2(m.pos, t.pos) <= sk.splash.r) { const d3 = calc(m, sk.splash.mult).dmg; if (dealDamage(m, d3) !== false) { dmgNum(m, d3, false, false, fxPow * .7); aggro(m); } } }
    const cl = classDef().cleave;
    if (cl) for (const m of monsters) if (m !== t && !m.dead && m.zone === t.zone && dist2(m.pos, t.pos) <= cl.r) {
      const d2 = Math.max(1, Math.round(calc(m).dmg * cl.mult)); if (dealDamage(m, d2) !== false) { dmgNum(m, d2, false, false, fxPow * .6); aggro(m); }
    }
    if (sk.burn) addDot(t, Math.round(dmg * sk.burn.mult / sk.mult), sk.burn.dur);
    if (sk.stun) applyCC(t, "stun", sk.stun);
    if (sk.slow) { floater(t.pos, "느려짐 · slowed", "#9ec8ff", true, t.model.height + .4); }
    FX.impact(t.pos, fxCols, fxPow, weakHit); if (S.cls === "mudang") snd("bell", .3, 1.4); else if (S.cls === "gungsu") snd("wood", .5, 1.2); else snd("metal", .45, 1.1); if (S.cls === "geomgaek") FX.slash(t.pos, player.yaw, { color: fxCols[0], size: .8 + fxPow * .4 });
    if (sk.stun) FX.burst(t.pos, { n: 10, color: ["#ffd23d", "#fff2a8"], speed: 2, size: .18, life: 1.2, grav: 0, shape: "star", y: t.model.height });
    dmgNum(t, dmg, weakHit, immuneHit && dmg === 0, fxPow);
    if (ls > 0) { const h = dmg * ls; player.hp = Math.min(player.maxHp, player.hp + h); }
    SFX.shotGood();
  };
  if (S.cls === "geomgaek") {
    if (sk.range) {                      // 돌진 베기: dash next to the target first
      const dx = t.pos.x - player.pos.x, dz = t.pos.z - player.pos.z, d = Math.hypot(dx, dz);
      if (d > 2.6) { player.pos.x += dx / d * (d - 2.2); player.pos.z += dz / d * (d - 2.2); collide(player.pos); }
    }
    SFX.dash(); setTimeout(land, 200);
  } else shootSpell(t, land, fxCols, fxPow);
}
// ---- combat effects (js/fx.js) ----
function castCols(sk, cards) {
  if (sk.fire) return FX.EL_COL.fire;
  const n = {}; for (const c of cards || []) if (c.mod?.t === "el") n[c.mod.el] = (n[c.mod.el] || 0) + 1;
  const top = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return top && FX.EL_COL[top[0]] ? FX.EL_COL[top[0]] : FX.CLASS_COL[S.cls] || FX.CLASS_COL.mudang;
}
function fxCast(sk, t, cols) {
  const me = player.pos;
  switch (sk.fx) {
    case "heal": case "hot": case "healArrow": FX.healFx(me); break;
    case "group": FX.healFx(me, true); break;
    case "absorb": case "reflect": FX.shieldFx(me); break;
    case "invuln": FX.pillarFx(me, "#ffd23d"); FX.shieldFx(me, "#ffd23d"); break;
    case "laststand": case "cry": case "hawk": case "revive": FX.pillarFx(me, sk.fx === "revive" ? "#fff2a8" : "#ffd23d"); FX.shake(.3); break;
    case "fear": FX.ring(me, { color: "#ffd23d", r: (sk.r || 8) * 1.2, life: .6 }); FX.ring(me, { color: "#ffffff", r: (sk.r || 8) * .7, life: .4 }); FX.shake(.45); break;
    case "taunt": FX.ring(t.pos, { color: "#ff5a4a", r: 3.5 }); FX.burst(t.pos, { n: 18, color: ["#ff5a4a", "#ffd23d"], speed: 4, size: .16, life: .7, shape: "star", y: t.model.height }); break;
    case "whirl": case "storm": for (let k = 0; k < 4; k++) setTimeout(() => FX.slash(player.pos, player.yaw + k * Math.PI / 2, { color: cols[0], size: 1.6, tilt: -1.5 }), k * 50); FX.ring(me, { color: cols[0], r: (sk.r || 4) * 1.3 }); FX.burst(me, { n: 40, color: cols, speed: 9, size: .14, life: .6, shape: "spark", grav: 2, flat: true }); FX.shake(.4); break;
    case "rain": FX.ring(t.pos, { color: "#ffd23d", r: (sk.r || 6) * 1.2, life: .8 }); for (let w = 0; w < (sk.waves || 3); w++) setTimeout(() => { const at = t.pos; for (let k = 0; k < 6; k++) FX.burst({ x: at.x + rand(-3, 3), z: at.z + rand(-3, 3) }, { n: 4, color: cols, dir: new THREE.Vector3(0, -1, 0), speed: 16, size: .12, life: .4, shape: "spark", y: 8, grav: 20 }); FX.shake(.2); }, 600 + w * 1000); break;
  }
}
function slamFx(at, r, wet) { if (wet) FX.waterSplash(at, r); else FX.dustSlam(at, r); if (player && dist2(player.pos, at) < r * 2.2) FX.shake(.6); }
function lineFx(l) {
  const cols = player.zone === "market" ? ["#5a3a7a", "#2a1a3a", "#c08aff"] : player.zone === "museum" && inRect(player.pos, MUSEUM.caveRect) ? ["#c8903a", "#8a6a3a", "#f0c87a"] : FX.EL_COL.fire;
  for (let k = 0; k < l.len; k += 1.6) FX.burst({ x: l.x + Math.sin(l.ang) * k, z: l.z + Math.cos(l.ang) * k }, { n: 3, color: cols, speed: 4, up: 1, size: .15, life: .55, y: .4, shape: "spark" });
  if (dist2(player.pos, { x: l.x, z: l.z }) < l.len + 4) FX.shake(.35);
}
function ccFx(m, kind) {
  const h = m.model.height, at = m.pos;
  const C = { stun: ["#ffd23d", "#fff2a8"], root: ["#5ad04a", "#b8f06a"], fear: ["#ffd23d", "#ffffff"], taunt: ["#ff5a4a", "#ffd23d"], sleep: ["#7ab8ff", "#d8ecff"], silence: ["#b47aff", "#e8d8ff"] }[kind] || ["#ffffff"];
  FX.burst(at, { n: 16, color: C, speed: 2.5, size: .18, life: 1.1, grav: 0, shape: "star", y: h }); FX.ring(at, { color: C[0], r: 2.6 });
}
// damage numbers: big, they pop; weakness hits are gold and bigger
function dmgNum(t, dmg, weak, immune, pow = 1) {
  tmpV.set(t.pos.x, t.model.height + .2, t.pos.z).project(camera); if (tmpV.z > 1) return;
  const d = document.createElement("div"); d.className = "fl dmg" + (weak ? " weak" : "") + (pow >= 2 ? " huge" : "") + (immune ? " imm" : "");
  d.textContent = immune ? "면역" : dmg + (weak ? " 약점!" : "");
  d.style.left = (tmpV.x * .5 + .5) * innerWidth + rand(-30, 30) + "px"; d.style.top = (-tmpV.y * .5 + .5) * innerHeight + "px";
  $("floaters").appendChild(d); setTimeout(() => d.remove(), 1300);
}
const talismanMat = toon("#f2df7a", { emissive: new THREE.Color("#ffcc33"), emissiveIntensity: .6 });
function shootSpell(t, land, cols = FX.CLASS_COL[S.cls] || FX.CLASS_COL.mudang, pow = 1) {
  const g = S.cls === "mudang" ? new THREE.BoxGeometry(.25, .4, .03) : new THREE.CylinderGeometry(.03, .03, 1.1, 5);
  const mesh = new THREE.Mesh(g, S.cls === "mudang" ? talismanMat : toon("#d9c7a0"));
  mesh.scale.setScalar(S.cls === "mudang" ? 1.8 : 1.4);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(.28, 10, 8), new THREE.MeshBasicMaterial({ color: cols[0], transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); mesh.add(halo);
  mesh.position.set(player.pos.x, 1.6, player.pos.z); scene.add(mesh);
  FX.burst({ x: player.pos.x - Math.sin(player.yaw) * .8, z: player.pos.z - Math.cos(player.yaw) * .8 }, { n: 10, color: cols, speed: 4, size: .1, life: .35, grav: 0, y: 1.6, shape: "spark" });
  snd(S.cls === "mudang" ? "laserS" : "draw", S.cls === "mudang" ? .22 : .45, S.cls === "mudang" ? 1.7 : 1.3);
  projectiles.push({ mesh, target: t, speed: S.cls === "mudang" ? 16 : 30, land, life: 3, spin: S.cls === "mudang", trail: cols, tsize: .08 + .04 * Math.min(3, pow) });
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
      if (p.trail) FX.burst(p.mesh.position, { n: 3, color: p.trail, speed: .8, size: p.tsize, life: .4, grav: 0, y: 0 });
    } else {
      p.mesh.position.addScaledVector(p.vel, dt); p.mesh.rotation.x += dt * 8;
      if (p.trail) FX.burst(p.mesh.position, { n: p.r ? 4 : 2, color: p.trail, speed: .7, size: p.r ? .2 : .1, life: .45, grav: 0, y: 0 });
      const pp = player.pos;
      if (!player.dead && player.zone !== "station" && Math.hypot(p.mesh.position.x - pp.x, p.mesh.position.z - pp.z) < (p.r || .7) && p.mesh.position.y < 2.4) { if (p.trail) FX.explosion({ x: p.mesh.position.x, y: p.mesh.position.y - 1.2, z: p.mesh.position.z }, p.trail, p.r ? .8 : .4); hurt(p.dmg, p.src); scene.remove(p.mesh); projectiles.splice(i, 1); continue; }
      if (p.life <= 0) { if (p.r && p.trail) FX.explosion({ x: p.mesh.position.x, y: p.mesh.position.y - 1.2, z: p.mesh.position.z }, p.trail, .5); scene.remove(p.mesh); projectiles.splice(i, 1); }
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
  if (food.buff) { S.buffs[food.buff] = S.time + (food.dur || 60); recalcMax(); }
  SFX.heal(); floater(player.pos, food.ko + " 냠냠", "#ffe7a8", true, 2.6);
}
function eatGimbap() {
  for (const k of Object.keys(SNACKS)) if (eatSnack(k)) return;
  if (!S.gimbap) { toast("먹을 게 없어요 · no food (gimbap at the restaurant, snacks at the 편의점)"); return; }
  if (S.hunger >= 95) { toast("배불러요 · you're full"); return; }
  S.gimbap--; eat(FOODS.gimbap); save();
}

// ---- NPCs + dialogue ----------------------------------------------------------------------------------------
const NPC_DEF = { driver: "기관사 아저씨", teacher: "시연 · 부적 선생님", gyeongbi: "경비 아저씨", minsu: "민수 · 생존자", jieun: "지유", grandma: "사장님 · 할머니 식당", smith: "무기점 아저씨", stranger: "낯선 사람", guard: "역무원", trader: "다미 · 카드 상인 · card trader", sitter: "생존자", sua: "수아", clerk: "편의점 알바", gayoung: "가현 · 생존자", mike: "Mike · 여행자", granny: "기억하는 할머니", gangsa: "유현 선생님 · 학원 강사", cupbap: "컵밥 아줌마", cb1: "민준 · 카드 배틀러", cb2: "서연 · 카드 배틀러", cb3: "지호 · 카드 배틀러", cb4: "하은 · 카드 배틀러", cb5: "도윤 · 카드 배틀러", cb6: "수빈 · 카드 배틀러", dealer: "수상한 경매사", handong: "한동 · 박물관 카페" };
// the Dreamcatcher-named women (Danny 2026-10-18: their group stage style, their own hair) replace the KayKit stand-ins
const DREAM_TEAM = ["jieun", "teacher", "sua", "gayoung", "gangsa", "trader", "handong"];
const WOMAN_OF = { jieun: "jiyu", teacher: "siyeon", sua: "sua", gayoung: "gahyeon", gangsa: "yoohyeon", trader: "dami", handong: "handong" };
const npcWoman = kind => womenReady() && WOMAN_OF[kind] ? makeWoman(WOMAN_OF[kind]) : null;
function placeNPCs() {
  const sp = world.npcSpots;
  sp.trader = { x: STATION.x + 5, z: STATION.z - 8.6, face: 0 };
  for (const kind of ["grandma", "smith", "stranger", "guard", "trader", "driver"]) {
    const model = npcWoman(kind) || (kind === "guard" || kind === "driver" ? makeMan("guard") : kind === "grandma" ? makeMan("grandma") : null) || (kayReady() && (kind === "smith" || kind === "stranger" || kind === "trader") ? makeKay(kind) : makeNPC(kind === "trader" ? "sitter" : kind === "driver" ? "guard" : kind)), at = sp[kind], n = { isNpc: true, kind, model, pos: new THREE.Vector3(at.x, 0, at.z), name: NPC_DEF[kind] };
    model.root.position.copy(n.pos); model.root.rotation.y = at.face; model.root.userData.ent = n; scene.add(model.root);
    n.plate = document.createElement("div"); n.plate.className = "plate npc"; n.plate.textContent = NPC_DEF[kind]; $("plates").appendChild(n.plate);
    npcs.push(n);
  }
  for (const kind of ["minsu", "jieun", "gyeongbi", "teacher", "sua", "clerk"]) {
    const at = STREET_NPCS[kind], model = kind === "gyeongbi" ? (makeMan("guard") || makeNPC("guard")) : npcWoman(kind) || (kayReady() ? makeKay(kind) : makeNPC("sitter")), n = { isNpc: true, kind, zone: "street", model, pos: new THREE.Vector3(at.x, 0, at.z), name: NPC_DEF[kind] };
    model.root.position.copy(n.pos); model.root.rotation.y = at.face; model.root.userData.ent = n; scene.add(model.root);
    n.plate = document.createElement("div"); n.plate.className = "plate npc"; $("plates").appendChild(n.plate);
    npcs.push(n); colliders_street_push(n.pos);
  }
  {
    const at = YEOUIDO.npc, model = npcWoman("gayoung") || (kayReady() ? makeKay("gayoung") : makeNPC("sitter")), n = { isNpc: true, kind: "gayoung", zone: "yeouido", model, pos: new THREE.Vector3(at.x, 0, at.z), name: NPC_DEF.gayoung };
    model.root.position.copy(n.pos); model.root.rotation.y = Math.PI; model.root.userData.ent = n; scene.add(model.root);
    n.plate = document.createElement("div"); n.plate.className = "plate npc"; $("plates").appendChild(n.plate);
    npcs.push(n); world.colliders.yeouido.push({ x: at.x, z: at.z, r: .6 });
  }
  for (const [kind, at, mdl] of [["gangsa", YEOUIDO.npcTeacher, () => kayReady() ? makeKay("gangsa") : makeNPC("sitter")], ["cupbap", YEOUIDO.npcCupbap, () => (makeMan("grandma") || makeNPC("grandma"))], ["handong", YEOUIDO.npcHandong, () => kayReady() ? makeKay("handong") : makeNPC("sitter")], ["dealer", MARKET.dealer, () => kayReady() ? makeKay("dealer") : makeNPC("sitter")]]) {
    const model = npcWoman(kind) || mdl(), n = { isNpc: true, kind, zone: kind === "dealer" ? "market" : "yeouido", model, pos: new THREE.Vector3(at.x, 0, at.z), name: NPC_DEF[kind] };
    model.root.position.copy(n.pos); model.root.rotation.y = Math.PI; model.root.userData.ent = n; scene.add(model.root);
    n.plate = document.createElement("div"); n.plate.className = "plate npc"; $("plates").appendChild(n.plate);
    npcs.push(n); world.colliders.yeouido.push({ x: at.x, z: at.z, r: .6 });
  }
  for (const [kind, c] of Object.entries(CB)) {
    const model = (c.woman && womenReady() ? makeWoman(c.woman) : null) || (kayReady() ? makeKay(c.model || "stuA") : makeNPC("sitter")), n = { isNpc: true, kind, zone: c.at.zone, model, pos: new THREE.Vector3(c.at.x, 0, c.at.z), name: NPC_DEF[kind] };
    model.root.position.copy(n.pos); model.root.rotation.y = Math.PI * .75; model.root.userData.ent = n; scene.add(model.root);
    n.plate = document.createElement("div"); n.plate.className = "plate npc"; $("plates").appendChild(n.plate);
    npcs.push(n); if (c.at.zone === "street") colliders_street_push(n.pos); else world.colliders.yeouido.push({ x: c.at.x, z: c.at.z, r: .6 });
  }
  for (const [kind, at, zone, mdl] of [["mike", MIKE_SPOTS[0], MIKE_SPOTS[0].zone, () => kayReady() ? makeKay("mike") : makeNPC("sitter")], ["granny", { x: 5, z: 121 }, "street", () => (makeMan("grandma") || makeNPC("grandma"))]]) {
    const model = mdl(), n = { isNpc: true, kind, zone, model, pos: new THREE.Vector3(at.x, 0, at.z), name: NPC_DEF[kind] };
    if (kind === "mike") { const bag = new THREE.Mesh(new THREE.BoxGeometry(.6, .8, .35), toon("#c8402f")); bag.position.set(0, 1.4, .32); bag.castShadow = true; model.root.add(bag); }
    model.root.position.copy(n.pos); model.root.rotation.y = Math.PI; model.root.userData.ent = n; scene.add(model.root);
    n.plate = document.createElement("div"); n.plate.className = "plate npc"; $("plates").appendChild(n.plate);
    npcs.push(n); if (kind === "granny") colliders_street_push(n.pos);
  }
  for (const [kind, d] of Object.entries(SQ_NPC)) {   /* side-quest people (2026-10-18) */
    const model = (d.woman && womenReady() ? makeWoman(d.woman) : null) || (d.npc ? makeNPC(d.npc) : kayReady() ? makeKay(d.role) : makeNPC("sitter")), n = { isNpc: true, kind, zone: d.at.zone, model, pos: new THREE.Vector3(d.at.x, 0, d.at.z), name: NPC_DEF[kind] };
    model.root.position.copy(n.pos); model.root.rotation.y = d.face ?? Math.PI; model.root.userData.ent = n; scene.add(model.root);
    n.plate = document.createElement("div"); n.plate.className = "plate npc"; $("plates").appendChild(n.plate);
    npcs.push(n); if (d.at.zone === "street") colliders_street_push(n.pos); else world.colliders.yeouido.push({ x: d.at.x, z: d.at.z, r: .6 });
  }
  sp.sitters.forEach((s, i) => {
    const m = kayReady() ? makeKay(i ? "sitterB" : "sitterA") : makeNPC("sitter");
    m.root.position.set(s.x, kayReady() ? 0 : -.45, s.z); m.root.rotation.y = -Math.PI / 2; scene.add(m.root); decor.push(m);
  });
}
function colliders_street_push(p) { world.colliders.street.push({ x: p.x, z: p.z, r: .6 }); }
// 지유 only shows up once Minsu has asked you to find her, and leaves when you've found her
function syncQuestNpcs() { const j = npcs.find(n => n.kind === "jieun"); if (j) { const home = S.quests.sister?.st === "done"; j.model.root.visible = home || (S.quests.sister?.st === "active" && !S.quests.sister.found); if (home) { j.pos.set(-36.2, 0, -26.2); j.model.root.position.copy(j.pos); j.zone = "street"; } }   /* after the reunion 지유 stays with her brother 민수, so you can still talk to her */ const su = npcs.find(n => n.kind === "sua"); if (su) su.model.root.visible = S.companion !== "gumiho";
  for (const n of npcs) if (DREAM_TEAM.includes(n.kind) && n.kind !== "sua" && n.kind !== "jieun") n.model.root.visible = S.compKey !== n.kind;
  if (j && S.compKey === "jieun") j.model.root.visible = false;
  if (su) { if (!su.home) su.home = { x: su.pos.x, z: su.pos.z, zone: su.zone }; const m = S.compKey && S.companion === "gumiho" ? npcs.find(n => n.kind === S.compKey) : null; const at = m ? { x: m.pos.x + 1.2, z: m.pos.z + .6, zone: m.zone } : su.home; su.pos.set(at.x, 0, at.z); su.model.root.position.copy(su.pos); su.zone = at.zone; su.model.root.visible = S.companion !== "gumiho" || !!S.compKey; }
}
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
  (S.talked = S.talked || {})[n.kind] = 1;
  const normal = {
    grandma: () => restaurant(n), smith: () => shop(n), trader: () => cardShop(n),
    stranger: () => (S.hasMirror && !S.metMirror) ? (S.metMirror = true, save(), revealTalk(n)) : (S.towerClears && S.sawPoster && !S.metHaneul) ? (S.metHaneul = true, save(), showLine(n, "x_haneul", [{ plr: "p_haneul", act: () => endWith(n, "x_haneul2") }])) : (S.sawList && !S.metList) ? (S.metList = true, save(), endWith(n, "x_list")) : (S.dunClears && !S.metAgain) ? (S.metAgain = true, save(), endWith(n, "x_return")) : showLine(n, "x_again", [{ plr: "p_yes", act: () => { closeDialog(); openDeckPicker(false); } }, { plr: "p_who", act: () => endWith(n, "x_who") }, { plr: "p_no", act: () => endWith(n, "x_bye") }]),
    guard: () => showLine(n, S.hasMap ? "g_hello" : "g_map", [{ plr: "p_yes", act: () => endWith(n, "g_sleep") }]),
    driver: () => showLine(n, S.spells?.sleep || S.dunClears ? "d_hello" : "d_hint", [{ plr: "p_enter", act: () => { closeDialog(); fade(toDungeon); } }, { plr: "p_later", act: closeDialog }]),
    teacher: () => teacherTalk(n), gayoung: () => campTalk(n), mike: () => mikeTalk(n), granny: () => grannyTalk(n), gangsa: () => teacher2Talk(n), cupbap: () => cupbapTalk(n), handong: () => handongShop(n), dealer: () => dealerTalk(n), ...Object.fromEntries(Object.keys(CB).map(k => [k, () => cbTalk(n)])), ...Object.fromEntries(Object.keys(SQ_NPC).map(k => [k, () => endWith(n, SQ_NPC[k].hi)])), cardteacher: () => dailyShop(n), sua: () => suaTalk(n), clerk: () => kioskTalk(n),
    minsu: () => endWith(n, "m_hello"), jieun: () => endWith(n, S.quests.sister?.st === "done" ? "j_home" : "j_hello"), gyeongbi: () => endWith(n, S.hasMapApt ? "b_hello" : "b_map"),
  }[n.kind];
  const dc = DREAM_TEAM.includes(n.kind) ? () => dcMenu(n, normal) : normal;
  if (questTalk(n, dc)) return;
  dc();
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
function nearestInteract() { return nearestInteract0() || (comp && !player.dead && comp.zone === player.zone && dist2(comp.pos, player.pos) < 2.6 && (S.compKey || S.companion === "gumiho") ? { t: "comp", label: `${keyName(SET.keys.interact)} · ${dcName(S.compKey || "sua")}와 이야기하기` } : null); }
function nearestInteract0() {
  if (player.dead) return null;
  const E = keyName(SET.keys.interact);
  for (const r of remotes.values()) if (r.dead && r.zone === player.zone && dist2(r.pos, player.pos) < 2.8) return { t: "revive", r, label: `${E} · ${r.nm} 살리기 · revive (word challenge)` };
  for (const r of remotes.values()) if (!r.dead && r.zone === player.zone && player.zone !== "arena" && dist2(r.pos, player.pos) < 2) return { t: "cgChal", r, label: `${E} · ${r.nm}에게 카드 배틀 신청 · challenge to a card battle` };
  { const q = sqSpotNear(); if (q) return { t: "qspot", q, label: `${E} · ${QUESTS[q.id].verb}` }; }
  if (player.zone === "museum") {
    if (dist2(player.pos, MUSEUM.up) < 3) return { t: "museumOut", label: `${E} · 용산으로 나가기 · back out to 용산` };
    if (dist2(player.pos, MUSEUM.end) < 4 && !monsters.some(m => m.def.boss && !m.dead && m.zone === "museum")) return { t: "museumOut", label: `${E} · 출구 · exit to 용산` };
    for (let i = 0; i < 3; i++) if (dist2(player.pos, MUSEUM.scrolls[i].spot) < 2.4) return { t: "scroll", i, label: `${E} · 두루마리 ${i + 1} · scroll ${i + 1}` };
    if (bossDown.museum) return { t: "museumOut", label: `${E} · 🚪 던전 나가기 · leave the dungeon now (to 용산)` };
    return null;
  }
  if (player.zone === "market") {
    if (dist2(player.pos, MARKET.up) < 3) return { t: "marketOut", label: `${E} · 노량진으로 나가기 · back out to 노량진` };
    if (dist2(player.pos, MARKET.end) < 4 && !monsters.some(m => m.def.boss && !m.dead && m.zone === "market")) return { t: "marketOut", label: `${E} · 출구 · exit to 노량진` };
    for (const n of npcs) if (n.zone === "market" && n.model.root.visible && dist2(n.pos, player.pos) < 3.4) return { t: "npc", n, label: `${E} · ${n.name}${wa(n.name)} 이야기하기` };
    for (let i = 0; i < 3; i++) if (dist2(player.pos, MARKET.boards[i].spot) < 2.4) return { t: "board", i, label: `${E} · 칠판 ${i + 1} · chalkboard ${i + 1}` };
    if (bossDown.market) return { t: "marketOut", label: `${E} · 🚪 던전 나가기 · leave the dungeon now (to 노량진)` };
    return null;
  }
  if (player.zone === "tower") {
    if (dist2(player.pos, TOWER.up) < 3) return { t: "towerOut", label: `${E} · 여의도로 나가기 · back out to 여의도` };
    if (dist2(player.pos, TOWER.end) < 4 && !monsters.some(m => m.def.boss && !m.dead && m.zone === "tower")) return { t: "towerOut", label: `${E} · 출구 · exit to 여의도` };
    if (dist2(player.pos, TOWER.poster) < 2.6) return { t: "poster", label: `${E} · 찢어진 포스터 보기 · look at the torn poster` };
    if (!tw.open && dist2(player.pos, TOWER.panel) < 2.6) return { t: "panel", label: `${E} · 엘리베이터 패널 · elevator panel (${tw.solved}/3)` };
    if (bossDown.tower) return { t: "towerOut", label: `${E} · 🚪 던전 나가기 · leave the dungeon now (to 여의도)` };
    return null;
  }
  if (player.zone === "yeouido") {
    if (dist2(player.pos, YEOUIDO.back) < 3) return { t: "ydBack", label: `${E} · 다리 건너 돌아가기 · climb back to 한강공원` };
    if ((S.camp || 0) >= 5 && dist2(player.pos, BEDROLL()) < 2.6) return { t: "bench", label: `${E} · 잠자리에서 자기 · sleep in a bedroll` };
    for (const rk of BIKE_RACKS) if (rk.zone === "yeouido" && dist2(player.pos, rk) < 2.8) return { t: "rack", label: S.bikeRented ? `${E} · 따릉이 반납 · return the bike` : `${E} · 따릉이 빌리기 ₩1,000 · rent a bike` };
    if (dist2(player.pos, YEOUIDO.museumDoor) < 3.4) return { t: "museum", label: `${E} · 박물관에 들어가기 · enter the museum (dungeon, Lv 16–18)` };
    if (dist2(player.pos, YEOUIDO.marketDoor) < 3.4) { const nw = new Set(S.cards.map(c => c.id)).size; return nw >= MARKET_CARDS ? { t: "market", label: `${E} · 수산시장에 들어가기 · enter the fish market (dungeon, Lv 12–15)` } : { t: "marketGate", label: `${E} · 수산시장 경비원 · the guard wants ${MARKET_CARDS} different words (you have ${nw})` }; }
    if (dist2(player.pos, YEOUIDO.towerDoor) < 3.4) return { t: "tower", label: `${E} · 63빌딩에 들어가기 · enter the 63 Building (dungeon, Lv 10–12)` };
    for (const [a, it] of Object.entries(MAP_ITEMS)) if (it.zone === "yeouido" && !S[it.flag] && dist2(player.pos, it.spot) < 2.8) return { t: "map", area: a, label: `${E} · ${it.ko} 가져가기 · take the ${it.en}` };
    { const a = travelSpotNear(); if (a) return { t: "travel", area: a, label: `${E} · 🧭 빠른 이동 · fast travel` }; }
    for (const n of npcs) if (n.zone === "yeouido" && dist2(n.pos, player.pos) < 3.4) return { t: "npc", n, label: `${E} · ${n.name}${wa(n.name)} 이야기하기` };
    return null;
  }
  if (player.zone === "dungeon") {
    if (dist2(player.pos, DUNGEON.up) < 3) return { t: "up", label: `${E} · 역으로 돌아가기 · back up to the station` };
    if (dist2(player.pos, DUNGEON.end) < 4 && !monsters.some(m => m.def.boss && !m.dead)) return { t: "up", label: `${E} · 출구 · exit to the station` };
    for (let i = 0; i < 3; i++) if (dist2(player.pos, DUNGEON.murals[i].spot) < 2.4) return { t: "mural", i, label: `${E} · 벽화 ${i + 1} 읽기 · read mural ${i + 1}` };
    if (bossDown.dungeon) return { t: "up", label: `${E} · 🚪 던전 나가기 · leave the dungeon now (to the station)` };
    return null;
  }
  if (player.zone === "street") {
    if (dist2(player.pos, { x: ENTRANCE.x, z: ENTRANCE.z - 2.6 }) < 2.6) return { t: "down", label: `${E} · 역으로 내려가기 · go down to the station` };
    for (const rk of BIKE_RACKS) if (rk.zone === "street" && dist2(player.pos, rk) < 2.8) return { t: "rack", label: S.bikeRented ? `${E} · 따릉이 반납 · return the bike` : `${E} · 따릉이 빌리기 ₩1,000 · rent a bike` };
    if (dist2(player.pos, BRIDGE_FOOT) < 4) return { t: "bridge", label: `${E} · 부서진 다리 오르기 → 여의도 (Lv 9+)` };
    for (const [a, it] of Object.entries(MAP_ITEMS)) if (!it.zone && !S[it.flag] && dist2(player.pos, it.spot) < 2.8) return { t: "map", area: a, label: `${E} · ${it.ko} 가져가기 · take the ${it.en}` };
    { const a = travelSpotNear(); if (a) return { t: "travel", area: a, label: `${E} · 🧭 빠른 이동 · fast travel` }; }
    for (const n of npcs) if (n.zone === "street" && n.model.root.visible && dist2(n.pos, player.pos) < 3.4) return { t: "npc", n, label: `${E} · ${n.name}${wa(n.name)} 이야기하기` };
    if (dist2(player.pos, PIER) < 3.5) return { t: "fish", label: fishing ? "🎣 낚시 연습 중 · fishing drill (walk away to stop)" : `${E} · 낚시하기 · fish` };
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
  else if (it.t === "comp") compTalk();
  else if (it.t === "revive") startRevive(it.r);
  else if (it.t === "cgChal") cgChallenge(it.r);
  else if (it.t === "bench") sleepBench();
  else if (it.t === "map") takeMap(it.area);
  else if (it.t === "travel") travelMenu(it.area);
  else if (it.t === "bank") openBank();
  else if (it.t === "mail") openMail();
  else if (it.t === "fish") startFishing();
  else if (it.t === "qspot") sqPick(it.q.id, it.q.i);
  else if (it.t === "bridge") { if (S.level < 8) toast("위험해요! Lv 9 이상 추천 · dangerous: level 9+ recommended"); fade(toYeouido); }
  else if (it.t === "ydBack") fade(toStreetBridge);
  else if (it.t === "tower") fade(toTower);
  else if (it.t === "towerOut") fade(towerToYd);
  else if (it.t === "poster") readPoster();
  else if (it.t === "panel") orderPuzzle();
  else if (it.t === "rack") rackUse();
  else if (it.t === "market") fade(toMarket);
  else if (it.t === "marketGate") endWith({ name: "수산시장 경비원 · market guard" }, "mg_gate");
  else if (it.t === "museum") fade(toMuseum);
  else if (it.t === "museumOut") fade(museumToYd);
  else if (it.t === "scroll") scrollQuiz(it.i);
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
function showScreen(id) { for (const s of ["title", "classPick", "deckPick", "deckView", "charView", "statsView", "invView", "questView", "mapView", "achView", "bankView", "mailView", "menu", "bookView", "friendsView", "rewardView"]) $(s).hidden = s !== id; }
let newBook = "5a", newMode = "story", newPrio = false;
const CHAPTER_LVL = i => 1 + 2 * i;   // story mode: 1과 at Lv 1, then one every 2 levels (8과 at Lv 15)
// Danny 2026-10-18: a chapter opens when you own 70% of the one before it (chapters never close again; old saves keep theirs)
const STORY_PCT = .7;
const chOwnedPct = ch => { const ws = bookWords().filter(w => w.ch === ch.id); if (!ws.length) return 1; const o = new Set(S.cards.map(c => c.id)); return ws.filter(w => o.has(w.id)).length / ws.length; };
function storyNext() { const chs = bookChapters(), open = chs.filter(c => S.chapters.includes(c.id)), cur = open[open.length - 1] || chs[0], next = chs[chs.indexOf(cur) + 1]; return { cur, next, pct: Math.round(chOwnedPct(cur) * 100) }; }
function syncStory(announce) {
  if (S.mode !== "story") return;
  const chs = bookChapters(), set = new Set(S.chapters.filter(id => chs.some(c => c.id === id))); set.add(chs[0].id);
  for (let i = 0; i < chs.length - 1; i++) if (set.has(chs[i].id) && chOwnedPct(chs[i]) >= STORY_PCT) set.add(chs[i + 1].id);
  const open = chs.filter(c => set.has(c.id)).map(c => c.id);
  const fresh = open.filter(id => !S.chapters.includes(id));
  S.chapters = open;
  if (announce) for (const id of fresh) { const c = DATA.chapters.find(x => x.id === id); toast(`📖 새 과가 열렸어요! ${c.title}${c.theme ? " " + c.theme : ""} · a new chapter opened — its words drop now`); logChat("system", `📖 ${c.title} 열림 · chapter opened`); SFX.kill(); }
}
function drawModePick() {
  const M = [["story", "이야기 모드 · Story", "1과부터 시작해서 70% 모으면 다음 과가 열려요 · start with 1과; the next chapter opens when you own 70% of the current one"], ["practice", "연습 모드 · Practice", "공부할 과를 직접 골라요 · choose the chapters you want to practise"]];
  $("modePick").innerHTML = `<span class="fine">모드 · mode</span>` + M.map(([k, t, d]) => `<button class="chip" data-m="${k}" aria-pressed="${k === newMode}" title="${d}">${t}</button>`).join("") + `<span class="fine modeDesc">${M.find(m => m[0] === newMode)[2]}</span>`;
  $("modePick").querySelectorAll("[data-m]").forEach(x => x.onclick = () => { newMode = x.dataset.m; drawModePick(); });
}
function drawPrioPick() {
  const n = p => DATA.words.filter(w => (w.book || "5a") === newBook && (!p || w.star)).length;
  $("prioPick").innerHTML = `<span class="fine">단어 · words</span>` + [[false, `전체 · all words (${n(false)})`], [true, `★ 시험 단어만 · exam words only (${n(true)})`]].map(([p, t]) => `<button class="chip" data-p="${p ? 1 : 0}" aria-pressed="${p === newPrio}">${t}</button>`).join("") + `<span class="fine modeDesc">${newPrio ? "책에 별표(★)가 있는 단어만 나와요 · only the words starred on your sheet and in your notes: the ones for the exam" : "모든 단어가 나와요 · every word of the book"}</span>`;
  $("prioPick").querySelectorAll("[data-p]").forEach(x => x.onclick = () => { newPrio = x.dataset.p === "1"; drawPrioPick(); });
}
function drawBookPick() {
  $("bookPick").innerHTML = `<span class="fine">교재 · textbook</span>` + BOOKS.map(b => `<button class="chip" data-b="${b.id}" aria-pressed="${b.id === newBook}">${b.title} · ${b.en} (${DATA.words.filter(w => (w.book || "5a") === b.id).length} words)</button>`).join("");
  $("bookPick").querySelectorAll("[data-b]").forEach(x => x.onclick = () => { newBook = x.dataset.b; drawBookPick(); drawPrioPick(); });
}
function buildClassPick() {
  drawBookPick(); drawModePick(); drawPrioPick();
  $("classes").innerHTML = "";
  for (const [k, c] of Object.entries(CLASSES)) {
    const b = document.createElement("button"); b.className = "cls" + (c.rec ? " rec" : "");
    b.innerHTML = (c.rec ? `<div class="recBadge">⭐ 초보자 추천 · beginner friendly</div>` : "") + `<h3>${c.ko}<small>${c.en}</small></h3><dl><dt>체력 · HP</dt><dd>${c.hp}</dd><dt>공격 · damage</dt><dd>×${c.dmg}</dd><dt>사거리 · range</dt><dd>${c.range} m</dd><dt>무기 · weapon</dt><dd>${c.weapons[0]}</dd></dl><div class="pass">${c.pass}</div><div class="solo">솔로: ${c.solo}</div>`;
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
  playWords().filter(w => w.ch === pickCh && pickSecs.includes(w.sec)).forEach(w => {
    const b = document.createElement("button"); b.className = "wcard"; b.setAttribute("aria-pressed", pickSel.includes(w.id)); b.dataset.tip = tipWord(w);
    const m = mastery(w.id);
    b.innerHTML = `<i>${POSKO[w.pos]}</i><b>${w.kr}</b><span>${w.en}</span>${m.k !== "new" ? `<span class="m">● ${m.ko}</span>` : ""}`;
    b.onclick = () => { if (pickSel.includes(w.id)) pickSel = pickSel.filter(x => x !== w.id); else if (pickSel.length < basicSize()) { pickSel.push(w.id); say([wordClip(w.id)], { interrupt: true }); } else toast(`이미 ${basicSize()}개예요 · already ${basicSize()}`); drawDeckPicker(); };
    g.appendChild(b);
  });
  drawTray();
}
function drawTray() {
  const t = $("traySlots"); t.innerHTML = "";
  for (let i = 0; i < basicSize(); i++) { const id = pickSel[i], d = document.createElement("div"); d.className = "tslot" + (id ? " full" : ""); d.textContent = id ? WORD[id].kr : ""; if (id) { d.title = "빼기 · remove"; d.onclick = () => { pickSel = pickSel.filter(x => x !== id); drawDeckPicker(); }; } t.appendChild(d); }
  const b = deckBonus(pickSel);
  $("trayCount").textContent = `${pickSel.length} / ${basicSize()} · 명사 ${b.c.noun} · 동사 ${b.c.verb} · 형용사 ${b.c.adjective} · 부사·기타 ${b.c.other}`;
  $("trayBonus").textContent = S.origin ? `출신 보너스 (already set) · ${S.origin.txt}` : pickSel.length === basicSize() ? `출신 보너스 · origin bonus: ${b.txt}` : "";
  $("deckDone").disabled = pickSel.length !== basicSize();
}
$("deckRandom").onclick = () => { if (!pickSecs) drawDeckPicker(); const pool = playWords().filter(w => w.ch === pickCh && pickSecs.includes(w.sec) && !pickSel.includes(w.id)); pickSel = pickSel.concat(shuffle(pool).slice(0, basicSize() - pickSel.length).map(w => w.id)); drawDeckPicker(); };
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
  return `<div class="dvCard ${extra}" data-uid="${c.uid}" data-tip="${esc(tipCard(c))}" style="border-color:${R.c}"><span class="rar" style="color:${R.c}">${R.ko} · ${R.en}${c.gift ? " · 선물 gift" : ""}${w.ch === newestChapter() ? " · ✨ 새 과 +10%" : ""}</span><b>${w.kr}</b><span class="en">${w.en}</span><span class="mod">${modText(c)}</span><span class="mst">${mastery(c.id).ko} · ${Math.min(st.c, 8)}/8</span></div>`;
}
function drawChapterPick() {
  if (S.mode === "story") {
    $("dvChapters").innerHTML = `<span class="fine">${(BOOKS.find(b => b.id === S.book) || BOOKS[0]).title} · 이야기 모드 · story mode: 70% 모으면 다음 과 · the next chapter opens at 70% collected (most drops come from the newest one)</span>` + bookChapters().map((c, i) => { const open = S.chapters.includes(c.id); return `<span class="chip" aria-pressed="${open}">${open ? "" : "🔒 "}${c.title}${c.theme ? " " + c.theme : ""} · ${Math.round(chOwnedPct(c) * 100)}%</span>`; }).join("");
    return;
  }
  $("dvChapters").innerHTML = `<span class="fine">${(BOOKS.find(b => b.id === S.book) || BOOKS[0]).title} · 단어가 나오는 과 · chapters your words come from (drops, the card trader, quizzes):</span>` + bookChapters().map(c => `<button class="chip" data-ch="${c.id}" aria-pressed="${S.chapters.includes(c.id)}">${c.title}${c.theme ? " " + c.theme : ""}</button>`).join("");
  $("dvChapters").querySelectorAll("[data-ch]").forEach(b => b.onclick = () => {
    const id = b.dataset.ch, on = S.chapters.includes(id);
    if (on && S.chapters.length === 1) { toast("한 과는 남겨야 해요 · keep at least one chapter"); return; }
    S.chapters = on ? S.chapters.filter(x => x !== id) : [...S.chapters, id]; S.shop = null; save(); drawChapterPick();
  });
}
// ---- 단어 도감: every word of a chapter, which ones you own, how complete it is; click a word to hear it ----
let collCh = null, collFilter = "all";
function drawCollection() {
  const chs = bookChapters(), copies = {}; for (const c of S.cards) copies[c.id] = (copies[c.id] || 0) + 1;
  const wordsOf = ch => bookWords().filter(w => w.ch === ch.id), ownedN = ws => ws.filter(w => copies[w.id]).length;
  if (!collCh || !chs.some(c => c.id === collCh)) collCh = (chs.filter(c => S.chapters.includes(c.id)).slice(-1)[0] || chs[0]).id;
  const all = bookWords(), cur = chs.find(c => c.id === collCh), ws = wordsOf(cur), o = ownedN(ws), p = Math.round(o / Math.max(1, ws.length) * 100);
  const open = S.mode !== "story" || S.chapters.includes(cur.id), prev = chs[chs.indexOf(cur) - 1], sn = storyNext();
  const shown = ws.filter(w => collFilter === "all" || (collFilter === "mastered" ? mastery(w.id).k === "mastered" : collFilter === "learning" ? mastery(w.id).k !== "mastered" : (collFilter === "own") === !!copies[w.id]));
  $("dvColl").innerHTML = `<div class="clChs">${chs.map(c => { const cw = wordsOf(c), cp = Math.round(ownedN(cw) / Math.max(1, cw.length) * 100), op = S.mode !== "story" || S.chapters.includes(c.id); return `<button class="chip" data-cc="${c.id}" aria-pressed="${c.id === collCh}">${op ? "" : "🔒 "}${c.title} · ${cp}%</button>`; }).join("")}</div>
    <div class="clHead"><div><b>${cur.title}${cur.theme ? " " + cur.theme : ""}</b> · ${o} / ${ws.length} 단어 · words owned (${p}%)${open ? "" : ` · <span class="warn">🔒 ${prev ? prev.title : ""}를 70% 모으면 열려요 · opens when ${prev ? prev.title : "the chapter before"} is 70% collected (now ${prev ? Math.round(chOwnedPct(prev) * 100) : 0}%)</span>`}${S.mode === "story" && open && sn.cur === cur && sn.next ? ` · <span class="okc">70%가 되면 ${sn.next.title}가 열려요 · ${sn.next.title} opens at 70%</span>` : ""}</div>
      <div class="bar xp clBar"><i style="width:${p}%"></i></div>
      <span class="fine">책 전체 · whole book: ${ownedN(all)} / ${all.length} (${Math.round(ownedN(all) / Math.max(1, all.length) * 100)}%) · 단어를 누르면 소리가 나요, 마우스를 올리면 예문이 보여요 · click a word to hear it, hover for an example</span></div>
    <div class="clFilt">${[["all", "전체 · all"], ["own", "가진 것 · owned"], ["miss", "없는 것 · missing"], ["mastered", "🏅 마스터 · mastered"], ["learning", "📖 아직 · not mastered"]].map(([k, t]) => `<button class="chip" data-cf="${k}" aria-pressed="${collFilter === k}">${t}</button>`).join("")}</div>
    <div class="clGrid">${shown.map(w => { const n = copies[w.id], m = mastery(w.id); return `<button class="clTile ${n ? "own" : "miss"} m-${m.k}" data-id="${w.id}" data-tip="${esc(w.ex ? w.ex[0] + " · " + w.ex[1] : w.en)}"><b>${esc(w.kb || w.kr)}</b><span>${esc(w.en)}</span><small>${POSKO[w.pos] || ""} · ${m.ko}${n ? ` · ✓ ${n}장` : " · 없음 · not owned"}</small></button>`; }).join("") || '<p class="fine">없어요 · nothing here</p>'}</div>`;
  $("dvColl").querySelectorAll("[data-cc]").forEach(b => b.onclick = () => { collCh = b.dataset.cc; drawCollection(); });
  $("dvColl").querySelectorAll("[data-cf]").forEach(b => b.onclick = () => { collFilter = b.dataset.cf; drawCollection(); });
  $("dvColl").querySelectorAll(".clTile").forEach(b => b.onclick = () => say([wordClip(b.dataset.id)], { interrupt: true }));
}
function drawDeckView() {
  drawChapterPick();
  if (dvTab !== "coll" && dvTab !== "battle") S.skillDecks[dvTab] = S.skillDecks[dvTab] || [];
  $("dvTitle").textContent = `${classDef().ko} · 덱 · Decks`;
  $("dvTabs").innerHTML = "";
  { const b = document.createElement("button"); b.className = "chip coll"; b.setAttribute("aria-pressed", dvTab === "coll"); b.textContent = "📚 도감 · collection"; b.onclick = () => { dvTab = "coll"; dvSel = null; drawDeckView(); }; $("dvTabs").appendChild(b); }
  { const b = document.createElement("button"); b.className = "chip coll"; b.id = "dvBattleTab"; b.setAttribute("aria-pressed", dvTab === "battle"); b.textContent = `⚔ 배틀 덱 · battle deck (${battleDeck().length}/${CG_DECK})`; b.onclick = () => { dvTab = "battle"; dvSel = null; drawDeckView(); }; $("dvTabs").appendChild(b); }
  const coll = dvTab === "coll" || dvTab === "battle"; $("dvColl").hidden = !coll; $("dvInfo").hidden = coll; $("dvAuto").hidden = coll; $("dvGrad").hidden = coll; $("dvAutoGrad").hidden = coll; document.querySelector(".dvCols").hidden = coll; document.querySelector(".dvFoot").hidden = coll;
  for (const k of skillKeys()) {
    const sk = skillDef(k), b = document.createElement("button"); b.className = "chip"; b.setAttribute("aria-pressed", k === dvTab);
    b.textContent = `${sk.key} · ${sk.ko}` + (S.level < sk.lvl ? ` 🔒 Lv ${sk.lvl}` : ` (${deckCards(k).length}/${deckSize(k)})`);
    b.onclick = () => { dvTab = k; dvSel = null; drawDeckView(); }; $("dvTabs").appendChild(b);
  }
  if (dvTab === "coll") { drawCollection(); return; }
  if (dvTab === "battle") { drawBattleDeck(); return; }
  const sk = skillDef(dvTab), block = skillBlock(dvTab);
  $("dvInfo").innerHTML = `<b>${sk.ko}</b> · ${sk.en} — ${dvTab === "basic" ? (skillDef("basic").info || "1 card · 1× damage") : sk.info}, cooldown ${sk.cd} s` + (block ? ` · <span class="warn">${block}</span>` : " · <span class=\"okc\">준비됨 · ready</span>");
  const deck = deckCards(dvTab);
  let html = deck.map(c => cardHTML(c, c.uid === dvSel ? "sel" : "")).join("");
  for (let i = deck.length; i < deckSize(dvTab); i++) html += `<div class="dvCard empty">빈 칸 · empty</div>`;
  $("dvGrid").innerHTML = html;
  const bag = bagCards().sort((a, b) => b.rar - a.rar || WORD[a.id].kr.localeCompare(WORD[b.id].kr));
  const inDeck = new Set(deck.map(c => c.id)), selWord = dvSel && cardBy(dvSel)?.id;
  $("dvBag").innerHTML = bag.length ? bag.map(c => cardHTML(c, inDeck.has(c.id) && c.id !== selWord ? "dim" : "")).join("") : `<p class="fine">가방이 비었어요. 괴물을 잡거나 (about half of them drop a card, aliens always) 역의 카드 상인에게 사세요. · Empty: monsters drop cards, and the card trader in the station sells them.</p>`;
  $("dvBonus").textContent = `출신 보너스 · origin bonus: ${bonus().txt} · 카드를 누르고 가방 카드를 누르면 바뀌어요 (click a deck card, then a bag card, to swap; click a selected card again to put it back in the bag). 선물 카드 (gift, from the stranger) only fit the basic attack, and go back to him when you swap them out.`;
  $("dvPick").hidden = dvTab !== "basic";
  { const on = S.autoGrad !== false; $("dvAutoGrad").textContent = on ? "🎓 자동 졸업 · auto-graduate: 켜짐 on" : "🎓 자동 졸업 · auto-graduate: 꺼짐 off"; $("dvAutoGrad").setAttribute("aria-pressed", on); $("dvGrad").style.display = on ? "none" : ""; }
  { const g = gradPlan().length; $("dvGrad").disabled = !g; $("dvGrad").textContent = g ? `🎓 졸업 · graduate mastered cards (${g}) · +0.5% damage each` : "🎓 졸업 · no mastered cards in your decks yet"; }
  { const better = autoFillPlan(dvTab); $("dvAuto").disabled = !better.changes; $("dvAuto").textContent = better.changes ? `⚡ 자동 채우기 · auto-fill with your best cards (${better.changes} ${better.changes === 1 ? "change" : "changes"})` : "⚡ 자동 채우기 · auto-fill: no better cards in your bag"; }
  $("dvGrid").querySelectorAll(".dvCard[data-uid]").forEach(el => el.onclick = () => deckClick(el.dataset.uid));
  $("dvBag").querySelectorAll(".dvCard[data-uid]").forEach(el => el.onclick = () => bagClick(el.dataset.uid));
}
function takeOut(uid) { S.skillDecks[dvTab] = S.skillDecks[dvTab].filter(u => u !== uid); dropGifts(); }   // the card goes back to the bag
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
  else if (deck.length < deckSize(dvTab)) deck.push(uid);
  else { toast("바꿀 카드를 먼저 고르세요 · pick a deck card to swap first"); return; }
  say([wordClip(c.id)], { interrupt: true }); save(); drawDeckView();
}
$("dvClose").onclick = () => { showScreen(null); paused = false; };
$("dvPick").onclick = () => openDeckPicker(false);
// auto-fill (Danny 2026-10-18): the deck's cards + the bag's, best copy of each word, highest rarity first; on a tie the card already
// in the deck stays. Cards that drop out go back to the bag. Gift cards only fit the basic attack, as with a hand swap.
function deck20Topup() {
  for (const k of Object.keys(S.skillDecks).sort((a, b) => (a === "basic") - (b === "basic"))) {   /* basic last: it can fall back on gift cards */
    const d = S.skillDecks[k]; if (!d.length || d.length >= deckSize(k)) continue;
    const have = new Set(deckIds(k)), add = bagCards().filter(c => (k === "basic" || !c.gift) && !have.has(c.id)).sort((a, b) => b.rar - a.rar);
    for (const c of add) { if (d.length >= deckSize(k)) break; if (have.has(c.id)) continue; have.add(c.id); d.push(c.uid); }
    if (k !== "basic") continue;
    const ch = new Set([...have].map(id => WORD[id].ch)), pool = shuffle(bookWords().filter(w => ch.has(w.ch) && !have.has(w.id)));
    while (d.length < deckSize(k) && pool.length) { const c = newCard(pool.pop().id, 0); c.gift = true; S.cards.push(c); d.push(c.uid); }
  }
}
// ---- graduation ----
const GRAD_BONUS = .005;
const gradMul = () => 1 + GRAD_BONUS * (S.grad || []).length;
function gradPlan() {
  const keys = [...new Set(skillKeys().map(k => k === "sleep" || k === "silence" ? "basic" : k))].filter(k => (S.skillDecks[k] || []).length);
  const used = new Set(), plan = [], nc = newestChapter();
  for (const k of keys) {
    const deck = deckCards(k), ids = new Set(deck.map(c => c.id)), out = deck.filter(c => mastery(c.id).k === "mastered");
    if (!out.length) continue;
    const bag = bagCards().filter(c => mastery(c.id).k !== "mastered" && inPlay(WORD[c.id]) && (k === "basic" || !c.gift)).sort((a, b) => (WORD[b.id].ch === nc) - (WORD[a.id].ch === nc) || b.rar - a.rar);
    for (const c of out) {
      const r = bag.find(x => !used.has(x.uid) && !ids.has(x.id));
      if (r) { used.add(r.uid); ids.add(r.id); plan.push({ k, out: c, inn: r }); continue; }
      if (k !== "basic") continue;   // the other skills only swap when there is a card for the slot, so they never drop below 20
      const order = [nc, ...[...S.chapters].reverse().filter(x => x !== nc)];
      let w = null; for (const ch of order) { w = shuffle(bookWords().filter(x => x.ch === ch && !ids.has(x.id) && mastery(x.id).k !== "mastered"))[0]; if (w) break; }
      if (w) { ids.add(w.id); plan.push({ k, out: c, gift: w }); }
    }
  }
  return plan;
}
let gradT = 2;
function autoGradTick(dt) {
  if ((gradT -= dt) > 0) return; gradT = 2;
  if (S.autoGrad === false || !S.cls || player.dead || ritual || exam || quiz || memo || fishing || order || cb || cg || duel || dialog) return;
  if (gradPlan().length) graduate();
}
function graduate() {
  const plan = gradPlan(); if (!plan.length) return;
  const fresh = [];
  for (const p of plan) {
    const d = S.skillDecks[p.k], i = d.indexOf(p.out.uid); if (i < 0) continue;
    let uid; if (p.inn) uid = p.inn.uid; else { const c = newCard(p.gift.id, 0); c.gift = true; S.cards.push(c); uid = c.uid; p.inn = c; }
    d.splice(i, 1, uid);
    S.grad = S.grad || []; if (!S.grad.includes(p.out.id)) { S.grad.push(p.out.id); fresh.push(p.out.id); }
  }
  dropGifts(); recalcMax(); save(); drawDeckView();
  // the ceremony: light, a chime, and a card at the side that goes away by itself (never a popup you must close)
  FX.pillarFx(player.pos, "#ffd23d"); floater(player.pos, "🎓 졸업!", "#ffd23d", false, 3.4);
  const seen = new Set(), rows = plan.filter(p => !seen.has(p.out.id + p.inn.id) && seen.add(p.out.id + p.inn.id));
  say([wordClip(rows[0].out.id), wordClip(rows[0].inn.id)], { interrupt: true });
  const card = $("gradCard");
  card.innerHTML = `<h3>🎓 졸업! · graduated</h3>` + rows.slice(0, 6).map(p => `<div class="gr"><span class="o"><b>${esc(WORD[p.out.id].kr)}</b> ${esc(WORD[p.out.id].en)}</span><span class="ar">→</span><span class="n"><b>${esc(WORD[p.inn.id].kr)}</b> ${esc(WORD[p.inn.id].en)}</span></div>`).join("")
    + (rows.length > 6 ? `<div class="fine">+ ${rows.length - 6} more</div>` : "")
    + `<div class="bon">${fresh.length ? `+${(fresh.length * GRAD_BONUS * 100).toFixed(1)}% damage · ` : "이미 졸업한 단어예요 · already graduated before · "}총 · total +${((S.grad.length) * GRAD_BONUS * 100).toFixed(1)}% (${S.grad.length})</div>`;
  card.hidden = false; card.classList.remove("on"); void card.offsetWidth; card.classList.add("on");
  clearTimeout(graduate.t); graduate.t = setTimeout(() => { card.hidden = true; }, 7000); card.onclick = () => { card.hidden = true; };
}
function autoFillPlan(k) {
  const deck = deckCards(k), inD = new Set(deck.map(c => c.uid)), best = {};
  for (const c of [...deck, ...bagCards().filter(c => k === "basic" || !c.gift)]) { const b = best[c.id]; if (!b || c.rar > b.rar || c.rar === b.rar && inD.has(c.uid) && !inD.has(b.uid)) best[c.id] = c; }
  const pick = Object.values(best).sort((a, b) => b.rar - a.rar || inD.has(b.uid) - inD.has(a.uid) || !!a.gift - !!b.gift).slice(0, deckSize(k)), keep = new Set(pick.map(c => c.uid));
  const stay = deck.filter(c => keep.has(c.uid)).map(c => c.uid), add = pick.filter(c => !inD.has(c.uid)).map(c => c.uid);
  return { uids: [...stay, ...add], changes: add.length };
}
function autoFill(k) { const p = autoFillPlan(k); if (!p.changes) return 0; S.skillDecks[k === "sleep" || k === "silence" ? "basic" : k] = p.uids; dropGifts(); return p.changes; }
$("dvGrad").onclick = () => graduate();
$("dvAutoGrad").onclick = () => { S.autoGrad = S.autoGrad === false; save(); SFX.select(); toast(S.autoGrad ? "🎓 자동 졸업 켜짐 · mastered cards graduate by themselves" : "🎓 자동 졸업 꺼짐 · graduate with the 🎓 button"); drawDeckView(); };
$("dvAuto").onclick = () => { if (dvTab === "coll" || dvTab === "battle") return; const n = autoFill(dvTab); dvSel = null; recalcMax(); save(); SFX.open(); toast(`⚡ ${n}장 바꿨어요 · ${n} ${n === 1 ? "card" : "cards"} in, the weakest went back to the bag`); drawDeckView(); };

// ---- card drops (1 in 3 kills): half a copy of a word you own, half from this monster's own word list ----
function monsterPool(kind) {
  let ch = S.chapters.length ? S.chapters : [...new Set(deckIds("basic").map(id => WORD[id].ch))];
  if (!ch.length) ch = bookChapters().map(c => c.id);
  const h = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return playWords().filter(w => ch.includes(w.ch)).sort((a, b) => h(kind + a.id) - h(kind + b.id)).slice(0, 15).map(w => w.id);
}
// a few cards at once from your newest chapter, missing words first (quests, exams)
function cardPack(n) {
  const ch = S.mode === "story" ? storyNext().cur : bookChapters().find(c => S.chapters.includes(c.id)) || bookChapters()[0];
  const pool = bookWords().filter(w => w.ch === ch.id), owned = new Set(S.cards.map(c => c.id)), miss = shuffle(pool.filter(w => !owned.has(w.id)));
  const got = [];
  for (let i = 0; i < n; i++) { const w = miss[i] || pick(pool); if (!w) break; const c = newCard(w.id, rollRarity()); S.cards.push(c); got.push(c); }
  if (got.length) { const names = got.map(c => `${WORD[c.id].kr}`).join(", "); toast(`🃏 카드 팩! ${names} · card pack (K)`); logChat("system", `🃏 카드 팩 · card pack: ${got.map(c => WORD[c.id].kr + " (" + WORD[c.id].en + ")").join(", ")}`); }
  save(); return got;
}
function dropChapters() {
  const ch = S.chapters.length ? S.chapters : bookChapters().map(c => c.id);
  if (S.mode !== "story" || ch.length < 2) return ch;   /* (chapters open by collection now, see syncStory) */
  const order = bookChapters().map(c => c.id).filter(id => ch.includes(id));
  return Math.random() < .7 ? order.slice(-1) : order.slice(0, -1);
}
// the words an active card quest still needs loose in the bag
function questWantWords() { const loose = new Set(bagCards().map(c => c.id)), out = []; for (const [id, st] of Object.entries(S.quests || {})) if (QUESTS[id]?.kind === "cards" && st?.st === "active") for (const w of st.words || []) if (WORD[w] && !loose.has(w)) out.push(w); return out; }
function dropCard(m) {
  if (Math.random() >= (m.def?.alien || m.def?.boss ? 1 : .7)) return;   /* Danny 2026-10-18: 45% → 70% */
  const chs = dropChapters(), pool = bookWords().filter(w => chs.includes(w.ch)).map(w => w.id); if (!pool.length) return;
  const owned = new Set(S.cards.map(c => c.id)), unowned = pool.filter(id => !owned.has(id));
  const want = questWantWords();
  const id = want.length && Math.random() < .35 ? pick(want) : unowned.length && Math.random() < .9 ? pick(unowned) : pick(pool);
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
  if (!S.shop || S.shop.day !== day || S.shop.v !== 2) {
    const owned = new Set(S.cards.map(c => c.id)), open = bookWords().filter(w => S.chapters.includes(w.ch)), rest = bookWords().filter(w => !S.chapters.includes(w.ch));
    const ids = [...shuffle(open.filter(w => !owned.has(w.id))), ...shuffle(rest.filter(w => !owned.has(w.id))), ...shuffle(open.filter(w => owned.has(w.id)))].map(w => w.id);
    const offers = [...new Set(ids)].slice(0, 4).map(id => { const rar = Math.min(2, rollRarity()); return { id, rar, mod: rollMod(rar), sold: false }; });
    S.shop = { day, offers, v: 2 };
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
let invMast = "all";   // the cards tab's mastery filter
const inAnyDeck = id => skillKeys().some(k => deckIds(k).includes(id));
const MAST_FILTERS = { all: ["전체 · all", () => true], mastered: ["🏅 마스터 · mastered", id => mastery(id).k === "mastered"],
  grad: ["🎓 졸업 가능 · ready to graduate", id => mastery(id).k === "mastered" && inAnyDeck(id)], learning: ["📖 아직 · not mastered yet", id => mastery(id).k !== "mastered"] };
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
  $("ivSlots").innerHTML = Object.keys(SLOTS).map(sl => { const it = itemBy(S.equip[sl]); return `<div class="ivSlot${it ? "" : " empty"}" data-slot="${sl}"${it ? ` data-tip="${esc(tipGear(it.g))}"` : ""}>${it ? gearIcon(it.g) : ""}<span class="sl">${SLOTS[sl]}</span>${it ? `<b>${itemName(it)}</b><span>${itemInfo(it)}</span>` : "<span>비었음 · empty</span>"}</div>`; }).join("");
  $("ivSum").innerHTML = `체력 (health) ${Math.ceil(player.hp)} / ${player.maxHp} · 공격력 (damage) ×${(weaponMult() * (1 + gearStat("dmg"))).toFixed(2)} · 흡혈 (lifesteal: heals you by this share of your damage) ${Math.round(gearStat("ls") * 100)}% · ${won(S.money)}`;
  $("ivTabs").innerHTML = "";
  for (const [k, label] of [["gear", "장비 · gear"], ["items", "소모품 · items"], ["cards", `카드 · cards (${S.cards.length})`]]) { const b = document.createElement("button"); b.className = "chip"; b.setAttribute("aria-pressed", k === invTab); b.textContent = label; b.onclick = () => { invTab = k; sellAllArm = false; drawInventory(); }; $("ivTabs").appendChild(b); }
  const box = $("ivBag");
  if (invTab === "gear") {
    const loose = S.items.filter(i => !Object.values(S.equip).includes(i.uid) && !S.bank.items.includes(i.uid)).sort(SORTS.gear[invSort.gear][1]);
    const sellable = loose.filter(i => !i.up && !GEAR[i.g].set), sellWon = sellable.reduce((a, i) => a + gearPrice(i.g) / 2, 0);
    box.innerHTML = sortBar("gear") + (sellable.length ? `<div class="ivTools"><button class="sellAll${sellAllArm ? " arm" : ""}" ${inStation ? "" : "disabled"}>${sellAllArm ? `정말요? 한 번 더 누르세요 · sure? click again (${sellable.length}개 → ${won(sellWon)})` : `모두 팔기 · sell all ${sellable.length} (${won(sellWon)})`}</button><span class="fine">강화한 장비는 빼고 · upgraded gear is kept</span></div>` : "") + (loose.length ? loose.map(i => `<div class="ivItem" data-uid="${i.uid}" data-tip="${esc(tipGear(i.g))}">${gearIcon(i.g)}<span class="sl">${SLOTS[GEAR[i.g].slot]}</span><b>${itemName(i)}</b><span>${itemInfo(i)}</span><div class="ivBtns"><button data-act="equip">착용 · equip</button><button data-act="sell" ${inStation ? "" : "disabled"}>${gearPrice(i.g) ? "팔기 " + won(gearPrice(i.g) / 2) : "버리기 · discard"}</button>${remotes.size ? '<button data-act="gift">🎁 선물</button>' : ""}</div></div>`).join("")
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
      + `<div class="ivItem sCards"><span class="sl">🃏 서울 카드 · Seoul cards (${Object.keys(S.seoulCards || {}).length} / 6)</span><div class="sGrid">${Object.keys(SEOUL_CARDS).map(k => seoulCardHTML(k, !!S.seoulCards?.[k])).join("")}</div><span>각 동네의 학생 카드 배틀러를 이기면 받아요 · beat the student card battler in each area</span></div>`
      + `<div class="ivItem"><span class="sl">재료 · materials</span><b>${mats.length ? mats.map(([k, c]) => MATS[k].ko + " ×" + c).join(", ") : "없음 · none"}</b><span>무기점 아저씨가 장비를 강화해 줘요 · the smith uses 3 to upgrade gear</span></div>`;
  } else {
    const where = {}; for (const k of skillKeys()) for (const u of S.skillDecks[k] || []) where[u] = skillDef(k).ko;
    const list = S.cards.filter(c => MAST_FILTERS[invMast][1](c.id)).sort(SORTS.cards[invSort.cards][1]);
    const mastBar = `<div class="ivTools"><span class="fine">보기 · show</span>${Object.entries(MAST_FILTERS).map(([k, [label, f]]) => `<button class="chip" data-mast="${k}" aria-pressed="${invMast === k}">${label} (${S.cards.filter(c => f(c.id)).length})</button>`).join("")}</div>`;
    box.innerHTML = sortBar("cards") + mastBar + (list.length ? "" : `<p class="fine">이 보기에 카드가 없어요 · no cards here</p>`) + `<p class="fine">모든 카드 · every card you own. 덱을 바꾸려면 K · to change decks press K.</p>` + list.map(c => cardHTML(c, where[c.uid] ? "" : "loose").replace("</div>", `<span class="where">${where[c.uid] ? "📌 " + where[c.uid] : S.bank.cards.includes(c.uid) ? "🔒 보관함 · storage" : "가방 · bag"}</span>${remotes.size && !where[c.uid] && !c.gift && !S.bank.cards.includes(c.uid) ? `<button class="giftBtn" data-gift="${c.uid}">🎁 선물</button>` : ""}${S.rerollStones ? `<button class="giftBtn rrBtn" data-rr="${c.uid}" title="다시 굴리기 · reroll">🔮</button>` : ""}</div>`)).join("");
    box.querySelectorAll("[data-rr]").forEach(b => b.onclick = e => { e.stopPropagation(); openReroll(b.dataset.rr); });
    box.querySelectorAll("[data-gift]").forEach(b => b.onclick = e => { e.stopPropagation(); const c = cardBy(b.dataset.gift); giftTo({ cards: [{ id: c.id, rar: c.rar, mod: c.mod }] }, () => { S.cards = S.cards.filter(x => x !== c); }); drawInventory(); });
  }
  box.querySelectorAll("[data-sort]").forEach(b => b.onclick = () => { invSort[invTab] = b.dataset.sort; drawInventory(); });
  box.querySelectorAll("[data-mast]").forEach(b => b.onclick = () => { invMast = b.dataset.mast; drawInventory(); });
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
// practice stats (Danny 2026-10-19: "is there a statistic which words have been practised the most?"): from S.stats, which counts for
// every word how often you saw it (s), got it right (c) and wrong (w) in attacks, exams, mini-games and battles
function openStats() {
  paused = true; showScreen("statsView");
  const mine = bookWords(), st = id => S.stats[id] || { s: 0, c: 0, w: 0 }, tries = id => st(id).c + st(id).w, acc = id => tries(id) ? st(id).c / tries(id) : 0;
  const owned = new Set(S.cards.map(c => c.id)), kinds = { new: 0, seen: 0, learned: 0, mastered: 0 }; for (const w of mine) kinds[mastery(w.id).k]++;
  const row = w => { const x = st(w.id), m = mastery(w.id); return `<tr><td><b>${esc(w.kr)}</b></td><td class="en">${esc(w.en)}</td><td>✔ ${x.c}</td><td>✖ ${x.w}</td><td>${tries(w.id) ? Math.round(acc(w.id) * 100) + "%" : "–"}</td><td class="m-${m.k}">${m.ko}</td></tr>`; };
  const table = (title, sub, list) => `<div class="stBox"><h3>${title}</h3><p class="fine">${sub}</p>` + (list.length ? `<table class="stTable"><tbody>${list.map(row).join("")}</tbody></table>` : `<p class="fine">아직 없어요 · nothing yet</p>`) + `</div>`;
  const most = mine.filter(w => tries(w.id)).sort((a, b) => tries(b.id) - tries(a.id)).slice(0, 15);
  const weak = mine.filter(w => st(w.id).w > 0).sort((a, b) => acc(a.id) - acc(b.id) || st(b.id).w - st(a.id).w).slice(0, 15);
  const least = mine.filter(w => owned.has(w.id)).sort((a, b) => tries(a.id) - tries(b.id)).slice(0, 15);
  const chs = bookChapters().map(c => { const ws = mine.filter(w => w.ch === c.id), n = ws.length || 1, own = ws.filter(w => owned.has(w.id)).length, mas = ws.filter(w => mastery(w.id).k === "mastered").length;
    return `<div class="stCh"><span class="t">${c.title}${c.theme ? " · " + esc(c.theme) : ""}${S.chapters.includes(c.id) ? "" : " 🔒"}</span><div class="stBar"><i class="own" style="width:${own / n * 100}%"></i><i class="mas" style="width:${mas / n * 100}%"></i></div><span class="n">${own} / ${ws.length} · 마스터 ${mas}</span></div>`; }).join("");
  $("stTitle").textContent = `${(BOOKS.find(b => b.id === S.book) || {}).title || ""} · ${S.prio ? "★ 시험 단어 · exam words" : "전체 · all words"}`;
  $("stBody").innerHTML = `<div class="stSum"><span><b>${mine.length}</b> 단어 · words</span><span><b>${mine.length - kinds.new}</b> 본 단어 · seen</span><span><b>${kinds.learned}</b> 배움 · learned</span><span><b>${kinds.mastered}</b> 마스터 · mastered</span><span><b>${mine.reduce((a, w) => a + tries(w.id), 0)}</b> 답 · answers</span><span><b>${(S.grad || []).length}</b> 🎓 졸업 · graduated</span></div>`
    + `<h3>과별 · per chapter</h3><p class="fine">파란 막대 = 가진 카드, 금색 = 마스터 · blue bar = cards you own, gold = mastered</p><div class="stChs">${chs}</div>`
    + `<div class="stCols">${table("가장 많이 연습한 단어 · most practised", "답한 횟수 순 · by number of answers", most)}${table("어려운 단어 · weakest", "정답률이 낮은 순 · lowest share right first", weak)}${table("덜 연습한 내 단어 · least practised of yours", "가진 카드 중 · among the cards you own", least)}</div>`;
}
$("stClose").onclick = () => { showScreen(null); paused = false; };
function openCharView() {
  if (!S.cls) return;
  paused = true; showScreen("charView");
  const cd = classDef(), b = bonus();
  const hit = BASE_ATTACK / CARDS_PER_ATTACK * cd.dmg * weaponMult() * lvlDmg() * gradMul() * (1 + b.dmg + gearStat("dmg")) * (buffOn("dmg") ? 1.05 : 1) * (S.hunger <= 0 ? HUNGRY_MULT : 1);
  $("cvTitle").textContent = `${cd.ko} · ${cd.en} · Lv ${S.level}`;
  const looks = LOOKS[S.cls] || [];
  $("cvLook").innerHTML = peopleReady() && looks.length ? `<span>외모 · look</span>` + looks.map((l, i) => `<button class="chip" data-i="${i}" aria-pressed="${(S.look || 0) === i}">${i + 1} · ${l.ko} <small>${l.en}</small></button>`).join("") : "";
  $("cvLook").querySelectorAll("button").forEach(b => b.onclick = () => { S.look = +b.dataset.i; save(); setPlayerModel(); SFX.select(); openCharView(); });
  $("cvPrio").innerHTML = `<span>단어 · words</span>` + [[false, "전체 · all"], [true, "★ 시험 단어만 · exam words only"]].map(([p, t]) => `<button class="chip" data-p="${p ? 1 : 0}" aria-pressed="${!!S.prio === p}">${t}</button>`).join("");
  $("cvPrio").insertAdjacentHTML("beforeend", `<button class="chip stBtn" id="cvStatsBtn">📊 연습 통계 · practice stats</button>`); $("cvStatsBtn").onclick = openStats;
  $("cvPrio").querySelectorAll("button[data-p]").forEach(b => b.onclick = () => { S.prio = b.dataset.p === "1"; syncStory(true); save(); SFX.select(); toast(S.prio ? "★ 이제 시험 단어만 나와요 · from now on only the exam words drop and get asked" : "이제 모든 단어가 나와요 · every word is back in play"); openCharView(); });
  $("cvXp").innerHTML = S.level >= MAX_LEVEL ? "최고 레벨 · max level" : `<div class="bar xp xpbig"><i style="width:${S.xp / xpNeed(S.level) * 100}%"></i><span>XP ${S.xp} / ${xpNeed(S.level)} · 다음 레벨까지 ${xpNeed(S.level) - S.xp}</span></div>`;
  const minsLeft = k => Math.max(0, Math.round((S.buffs[k] - S.time) / GAME_MIN_PER_SEC / 60));
  const food = Object.keys(BUFFS).filter(buffOn).map(k => `${BUFFS[k].ko} (${minsLeft(k)} min)`).join("<br>") || "없음 · none";
  const rows = [
    ["체력 · Health", `${Math.ceil(player.hp)} / ${player.maxHp}`],
    ["공격력 · Damage per correct card", `${Math.round(hit)}` + (S.hunger <= 0 ? " (배고픔 ×0.75)" : "")],
    ["사거리 · Range", `${cd.range} m`],
    ...Object.keys(SLOTS).map(sl => { const it = itemBy(S.equip[sl]); return [SLOTS[sl], it ? `${itemName(it)} (${itemInfo(it)})` : "없음 · none"]; }),
    ["🎓 졸업 · Graduated words", `${(S.grad || []).length}개 · +${((S.grad || []).length * GRAD_BONUS * 100).toFixed(1)}% damage on every attack (+0.5% per mastered word you graduate, K)`],
    ["레벨 보너스 · Level bonus", `health +${Math.round((lvlHp() - 1) * 100)}%, damage +${Math.round((lvlDmg() - 1) * 100)}%`],
    ["모드 · Mode", S.mode === "story" ? (() => { const n = storyNext(); return n.next ? `이야기 · story (${n.next.title} opens when ${n.cur.title} is 70% collected: now ${n.pct}%)` : "이야기 · story (every chapter open)"; })() : "연습 · practice (you choose the chapters, K)"],
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
  $("cvComp").innerHTML = S.compKey ? `<h3>동료 · Companion</h3><div class="cvc"><b>💞 ${dcName(S.compKey)} ♥ Lv ${relOf(S.compKey).lvl}</b><span class="fine">${PERKS[S.compKey].ko} · ${PERKS[S.compKey].en}</span></div>` : !S.companion ? "" : S.companion === "gumiho"
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
  if (!started || duel || cg) return;
  if (cb) { $("cardb").hidden = true; cb = null; paused = false; toast("배틀 포기 · you left the card battle"); return; }
  if (!$("reroll").hidden) { closeReroll(); return; }
  if (memo) { endMemory(true); return; }
  if (exam) { postponeExam(); return; }
  if (!$("rewardView").hidden) { closeReward(); return; }
  if (order) { orderClose(); return; }
  if (!$("nameBox").hidden) { $("nbOk").click(); return; }
  if (["deckView", "charView", "statsView", "invView", "questView", "mapView", "achView", "bankView", "mailView", "bookView", "friendsView"].some(id => !$(id).hidden)) { showScreen(null); paused = false; return; }
  if (!$("deckPick").hidden) { if (deckCards("basic").length === basicSize()) { showScreen(null); paused = false; } return; }
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
// the newest chapter you have open (story: the last one unlocked; practice: the last one you chose)
function newestChapter() { const chs = bookChapters(), open = chs.filter(c => S.chapters.includes(c.id)); return (open[open.length - 1] || chs[0]).id; }
const NEW_CH_BONUS = 1.1;   // cards of the newest chapter hit 10% harder (Danny 2026-10-19: new words should pay)
function growBasic(announce) {
  const d = S.skillDecks.basic; if (!d || !d.length) return 0;   // no deck yet: the stranger's word picker comes first
  const need = basicSize() - d.length; if (need <= 0) return 0;
  const have = new Set(deckIds("basic")), nc = newestChapter(), order = [nc, ...[...S.chapters].reverse().filter(c => c !== nc)], pool = [];
  for (const ch of order) pool.push(...shuffle(bookWords().filter(w => w.ch === ch && !have.has(w.id) && mastery(w.id).k !== "mastered")));
  if (pool.length < need) pool.push(...shuffle(bookWords().filter(w => !have.has(w.id) && !pool.includes(w))));
  const added = [];
  for (const w of pool) { if (added.length >= need) break; if (have.has(w.id)) continue; have.add(w.id); const c = newCard(w.id, 0); c.gift = true; S.cards.push(c); d.push(c.uid); added.push(w.kr); }
  if (added.length) { save(); if (announce) { toast(`🎁 기본 공격이 ${basicSize()}장이 됐어요! 낯선 사람이 새 단어 ${added.length}개를 줬어요 · your basic attack now holds ${basicSize()} cards: the stranger added ${added.length} words from your newest chapter`); logChat("system", `🎁 ${added.join(", ")}`); SFX.pickup(); } }
  return added.length;
}
function setPlayerModel() { if (player.model) scene.remove(player.model.root); player.model = classModel(S.cls, S.look); scene.add(player.model.root); }
function spawnPlayer() {
  if (player.model) scene.remove(player.model.root);
  ensureGear(); ensureFriendCode(); learnSkills(false); syncStory(false); syncDealer(); setTimeout(grantMissedSets, 3000); if (S.level < MAX_LEVEL && S.xp >= xpNeed(S.level)) { examPending = true; drawExamBtn(); } setTimeout(autoCreditBossQuests, 3500); if (S.level >= 4 && !S.visitedApt && S.aptHintLvl === undefined) S.visitedApt = true;   /* old saves: no nagging past Lv 4 */ syncQuestNpcs(); for (const a in mapItems) mapItems[a].visible = !S[MAP_ITEMS[a].flag];
  setPlayerModel(); syncCamp(); if (S.cls === "zoo") loadZoo(); setTimeout(() => growBasic(true), 2500);   /* syncCamp: the camp was only drawn before the save loaded (Danny 2026-10-19: it looked like level 1 again) */   /* saves from before the growing deck get their extra words too */
  player.maxHp = classDef().hp; player.hp = S.hp ?? player.maxHp; recalcMax(); spawnCompanion();
  if (S.hp == null) player.hp = player.maxHp;
}
function newGame(cls) {
  setTimeout(() => sendMail("역무원", "홍대입구역에 온 것을 환영해요. 배가 고프면 할머니 식당에 가세요. 밤에는 괴물이 많아요. 조심하세요!", "Welcome to Hongik University Station. When you're hungry, go to Grandma's restaurant. There are many monsters at night. Be careful!", { won: 3000 }), 4000);
  for (const k in cds) { cds[k] = 0; comeBacks[k] = []; }
  player.guardUntil = 0;
  wipe(); S = fresh(); S.cls = cls; S.book = newBook; S.mode = newMode; S.prio = newPrio; syncStory(false); spawnPlayer(); started = true;
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
  $("xpFill").style.width = (S.level >= MAX_LEVEL ? 100 : S.xp / xpNeed(S.level) * 100) + "%"; $("xpTxt").textContent = S.level >= MAX_LEVEL ? "MAX" : examPending ? "📝 시험 준비 · exam ready" : `XP ${S.xp} / ${xpNeed(S.level)}`; $("pGear").textContent = cd.weapons[weaponTier()];
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
  { const el = $("actAttack"), sm = el.querySelector("small"), ic = el.querySelector("span"), b = skillDef("basic"), icon = S.cls === "zoo" ? "🐑" : "⚔"; if (sm.textContent !== b.ko) sm.textContent = b.ko; if (ic.textContent !== icon) ic.textContent = icon; }   /* the zookeeper calls a sheep */
  for (const [k, n] of [["s2", 2], ["s3", 3], ["sleep", 4], ["silence", 5]]) { const sk = skillDef(k), blk = skillBlock(k); $(`s${n}Name`).textContent = sk.ko; $(`actSkill${n}`).classList.toggle("off", !!blk); $(`actSkill${n}`).dataset.tip = tipSkill(k);
    $(`s${n}Cd`).style.height = (blk ? 0 : Math.max(0, cds[k] - clock) / sk.cd * 100) + "%"; }
  if (target) { $("tFill").style.width = Math.max(0, target.hp / target.maxHp * 100) + "%"; $("tTxt").textContent = `${Math.max(0, Math.ceil(target.hp))} / ${target.maxHp}`;
    $("tWeak").innerHTML = `약점 <b style="color:${ELEMENTS[target.def.weak].c}">${ELEMENTS[target.def.weak].ko}</b>` + (target.def.immune ? ` · 면역 <b style="color:${ELEMENTS[target.def.immune].c}">${ELEMENTS[target.def.immune].ko}</b>` : "") + ` · ${dist2(target.pos, player.pos).toFixed(0)} m`; }
  const it = nearestInteract(); $("interact").hidden = !it || !!dialog; if (it) $("interact").textContent = it.label;
  // minimap: the 60 m around you (the whole district needs the map, M)
  if (player.zone === "dungeon") drawDungeonMap(mm, 170, 170, player.pos.x, player.pos.z, 80, false);
  else if (player.zone === "tower") drawDungeonMap(mm, 170, 170, player.pos.x, player.pos.z, 80, false, TOWER, "tower");
  else if (player.zone === "market") drawDungeonMap(mm, 170, 170, player.pos.x, player.pos.z, 80, false, MARKET, "market");
  else if (player.zone === "museum") drawDungeonMap(mm, 170, 170, player.pos.x, player.pos.z, 80, false, MUSEUM, "museum");
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
    if (e.isNpc) { const mk = npcMarker(e), html = (mk ? `<span class="qmk${mk === "…" ? " dim" : ""}">${mk}</span>` : "") + e.name + relBadge(e.kind); if (el.innerHTML !== html) el.innerHTML = html; }
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
            desc: "홍대 어딘가에서 지유 씨를 찾아 한국어로 말해 보세요, 그리고 민수 씨에게 · find Jiyu somewhere in Hongdae, talk to her, then tell Minsu" },
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
               desc: "여의도 한강공원의 장승 네 개를 쓰러뜨리고 가현 씨에게 돌아가세요 · knock down 4 guardian posts on 여의도, then go back to 가현 at the bridge" },
  statues: { giver: "handong", ko: "걸어 다니는 석상", en: "Walking statues", kind: "kill", target: "muinseok", n: 5,
          offer: "h_q", wait: "h_wait", done: "h_done", turn: "p_done", reward: { won: 60000, xp: 1200, card: 3 },
          desc: "용산의 무인석 다섯 개를 쓰러뜨리고 한동 씨에게 · knock down 5 tomb statues in 용산, then go back to 한동 at the café cart" },
  exam: { giver: "gangsa", ko: "학원의 귀신", en: "Ghosts of the academy", kind: "kill", target: "gwisin", n: 5,
          offer: "n_q", wait: "n_wait", done: "n_done", turn: "p_done", reward: { won: 30000, xp: 450, card: 3 },
          desc: "노량진 학원가의 시험 귀신 다섯 마리를 쫓아내고 유현 선생님에게 · chase away 5 exam ghosts on the 노량진 cram-school street, then see 유현 선생님" },
  cards: { giver: "trader", ko: "카드 수집가", en: "The card collector", kind: "cards", n: 3,
           offer: "q_t1", wait: "q_t1_wait", done: "q_t1_done", turn: "p_pay", reward: { won: 6000, xp: 60, card: 2 },
           desc: "이 단어 카드 세 장을 가방에 모아서 카드 상인에게 · collect these 3 word cards (loose, in your bag) for the card trader" },
};
// ---- side quests (Danny 2026-10-18: "all of them"): helping people, no fighting needed; every quest ends with a 🃏 card pack ----
// kinds: collect (pick up / leave something at marked spots), bring (a snack from a shop), fish (catches in the drill),
// ride (a 따릉이 to a spot within a time), quiz (a few questions with the person; wrong ones come back)
const SQ_NPC = {
  busker: { name: "버스커 · 거리 가수", at: { x: -32, z: -44, zone: "street" }, role: "sqBusker", hi: "sq_bu_hi" },
  tourist: { name: "엠마 · 관광객", at: { x: -46, z: 8, zone: "street" }, role: "sqTourist", hi: "sq_to_hi" },
  pcbang: { name: "PC방 사장님", at: { x: 23.5, z: -35.8, zone: "street" }, role: "sqPc", hi: "sq_pc_hi" },
  catgran: { name: "고양이 할머니", at: { x: 210, z: 30, zone: "street" }, npc: "grandma", hi: "sq_ca_hi" },
  fisher: { name: "낚시꾼 아저씨", at: { x: -12, z: 188, zone: "street" }, role: "sqFisher", hi: "sq_fi_hi" },
  bikeguy: { name: "따릉이 직원", at: { x: 66, z: 158, zone: "street" }, role: "sqBike", hi: "sq_bi_hi" },
  photog: { name: "사진작가", at: { x: YD.x + 30, z: YD.z + 150, zone: "yeouido" }, role: "sqPhoto", hi: "sq_ph_hi" },
  gongsi: { name: "태민 · 공시생", at: { x: YD.x + 92, z: YD.z + 515, zone: "yeouido" }, role: "sqGongsi", hi: "sq_go_hi" },
  florist: { name: "꽃집 사장님", at: { x: 40, z: -157.5, zone: "street" }, role: "sqFlorist", hi: "sq_fl_hi" },
  student: { name: "예린 · 대학생", at: { x: 245, z: -172, zone: "street" }, role: "sqStudent", hi: "sq_st_hi" },
  engineer: { name: "기술자 아저씨 · 발전소", at: { x: 350, z: 152, zone: "street" }, role: "sqEngineer", hi: "sq_en_hi" },
  researcher: { name: "수질 연구원", at: { x: YD.x - 318, z: YD.z + 212, zone: "yeouido" }, role: "sqResearcher", hi: "sq_re_hi" },
  caretaker: { name: "관리인 할아버지", at: { x: YD.x - 205, z: YD.z + 468, zone: "yeouido" }, role: "sqCaretaker", hi: "sq_ct_hi" },
  shopowner: { name: "이태원 가게 사장님", at: { x: YD.x + 536, z: YD.z + 51.5, zone: "yeouido" }, role: "sqShop", hi: "sq_sh_hi" },
  cardteacher: { name: "카드 선생님 · 단어 카드 가게", at: { x: 330, z: -219, zone: "street" }, woman: "card_ssaem", role: "qm", hi: "kt_hi" },
  docent: { name: "도슨트 · 박물관 해설사", at: { x: YD.x + 312, z: YD.z + 20, zone: "yeouido" }, role: "sqDocent", hi: "sq_do_hi" },
};
const SQ = (giver, ko, en, kind, more, lines, desc, reward) => ({ giver, ko, en, kind, ...more, offer: lines + "_q", wait: lines + "_wait", done: lines + "_done", turn: "p_done", reward, desc });
const SIDE_QUESTS = {
  lyrics: SQ("busker", "버스커의 가사", "The busker's lyrics", "collect", { n: 3, icon: "📄", verb: "가사 종이 줍기 · pick up the lyric sheet", spots: [{ x: -70, z: 60, zone: "street" }, { x: -10, z: 20, zone: "street" }, { x: -75, z: -90, zone: "street" }] }, "sq_bu", "홍대 거리에 날아간 가사 종이 세 장을 찾아 버스커에게 · find 3 lyric sheets blown around Hongdae, bring them to the busker", { won: 9000, xp: 80 }),
  tourist: SQ("tourist", "길 잃은 관광객", "The lost tourist", "quiz", { quiz: "tourist" }, "sq_to", "역 출구 앞의 엠마의 질문에 한국어로 대답하세요 · answer Emma's questions in Korean (by the station exit)", { won: 8000, xp: 80 }),
  pcbang: SQ("pcbang", "PC방 야식", "A late-night snack", "bring", { item: "ramyeon", n: 1 }, "sq_pc", "편의점에서 컵라면을 사서 걷고싶은거리의 PC방 사장님에게 · buy a cup ramyeon at the 편의점, bring it to the PC방 owner on 걷고싶은거리", { won: 7000, xp: 70 }),
  parcels: SQ("gyeongbi", "경비실 택배", "Parcels for the buildings", "collect", { n: 3, icon: "📦", verb: "택배 놓기 · leave the parcel at the door", spots: [{ x: 150, z: -62, zone: "street" }, { x: 232, z: -62, zone: "street" }, { x: 272, z: 12, zone: "street" }] }, "sq_pa", "택배 세 개를 아파트 문 앞에 놓고 경비 아저씨에게 · leave 3 parcels at the apartment doors, then see the guard", { won: 12000, xp: 110 }),
  cat: SQ("catgran", "할머니의 고양이", "Grandma's cat", "collect", { n: 1, icon: "🐈", verb: "나비 데려오기 · pick up Nabi the cat", spots: [{ x: 288, z: 77, zone: "street" }] }, "sq_ca", "서교 아파트 어딘가에 숨은 하얀 고양이 나비를 찾아 할머니에게 · find Nabi, the white cat hiding in the complex", { won: 12000, xp: 110 }),
  fishing: SQ("fisher", "낚시 대회", "The fishing contest", "fish", { n: 10 }, "sq_fi", "한강 낚시터에서 물고기 열 마리를 잡고 낚시꾼에게 · catch 10 fish at the 한강 pier", { won: 15000, xp: 140 }),
  ride: SQ("bikeguy", "따릉이 배달", "The 따릉이 delivery", "ride", { time: 60, spots: [{ x: 196, z: 162, zone: "street" }] }, "sq_bi", "따릉이를 타고 60초 안에 부서진 다리 앞의 빛까지, 그리고 직원에게 · ride a 따릉이 to the light by the broken bridge within 60 s, then back to the staff", { won: 15000, xp: 140 }),
  photos: SQ("photog", "벚꽃 사진", "Cherry-blossom photos", "collect", { n: 3, icon: "📷", verb: "사진 찍기 · take a photo", spots: [{ x: YD.x - 100, z: YD.z + 170, zone: "yeouido" }, { x: YD.x + 62, z: YD.z + 205, zone: "yeouido" }, { x: YD.x - 92, z: YD.z + 225, zone: "yeouido" }] }, "sq_ph", "여의도의 반짝이는 벚꽃 앞에서 사진 세 장을 찍고 사진작가에게 · take 3 photos at the sparkling cherry trees", { won: 20000, xp: 220 }),
  campfood: SQ("gayoung", "가현의 캠프 요리", "Food for the camp", "bring", { item: "cupbap", n: 2 }, "sq_ga", "노량진 컵밥 아줌마에게서 컵밥 두 개를 사서 가현에게 · buy 2 cup rice from the 컵밥 lady in 노량진, bring them to 가현", { won: 22000, xp: 240 }),
  gongsi: SQ("gongsi", "공시생의 단어장", "The exam student's word list", "quiz", { quiz: "words" }, "sq_go", "태민과 같이 단어 다섯 개를 맞히세요 · get 5 of 태민's words right together with him", { won: 26000, xp: 300 }),
  flowers: SQ("florist", "꽃밭에 물 주기", "Water the flower beds", "collect", { n: 3, icon: "🌼", verb: "꽃에 물 주기 · water the flowers", spots: [{ x: -25, z: -171, zone: "street" }, { x: 35, z: -178, zone: "street" }, { x: 88, z: -171, zone: "street" }] }, "sq_fl", "연트럴파크의 꽃밭 세 곳에 물을 주고 꽃집 사장님에게 · water the 3 flower beds in 연트럴파크, then see the florist", { won: 8000, xp: 70 }),
  books: SQ("student", "잃어버린 교과서", "The lost textbooks", "collect", { n: 3, icon: "📚", verb: "교과서 줍기 · pick up the textbook", spots: [{ x: 300, z: -150, zone: "street" }, { x: 238, z: -200, zone: "street" }, { x: 290, z: -244, zone: "street" }] }, "sq_st", "신촌대학교 캠퍼스에서 예린의 교과서 세 권을 찾으세요 · find 예린's 3 textbooks on the campus", { won: 12000, xp: 110 }),
  fuses: SQ("engineer", "발전소 퓨즈 갈기", "Fix the fuses", "collect", { n: 3, icon: "⚡", verb: "퓨즈 갈기 · replace the fuse", spots: [{ x: 345, z: 144, zone: "street" }, { x: 420, z: 139, zone: "street" }, { x: 462, z: 155, zone: "street" }] }, "sq_en", "당인리 발전소의 퓨즈 상자 세 개를 고치고 기술자 아저씨에게 · fix the 3 fuse boxes around the power plant", { won: 15000, xp: 140 }),
  samples: SQ("researcher", "수질 검사", "Water samples", "collect", { n: 3, icon: "🧪", verb: "물 샘플 뜨기 · take a water sample", spots: [{ x: YD.x - 350, z: YD.z + 202, zone: "yeouido" }, { x: YD.x - 300, z: YD.z + 202, zone: "yeouido" }, { x: YD.x - 350, z: YD.z + 248, zone: "yeouido" }] }, "sq_re", "선유도의 옛 정수지 세 곳에서 물 샘플을 떠서 연구원에게 · take water samples at the 3 old basins of 선유도", { won: 22000, xp: 240 }),
  incense: SQ("caretaker", "향 피우기", "Incense for the six", "collect", { n: 3, icon: "🕯", verb: "향 피우기 · light the incense", spots: [{ x: YD.x - 314, z: YD.z + 520, zone: "yeouido" }, { x: YD.x - 262, z: YD.z + 520, zone: "yeouido" }, { x: YD.x - 210, z: YD.z + 520, zone: "yeouido" }] }, "sq_ct", "사육신 묘 앞의 향로 세 개에 향을 피우고 관리인 할아버지에게 · light the incense at the 3 burners in front of the tombs", { won: 28000, xp: 320 }),
  neonsign: SQ("shopowner", "네온사인 다시 켜기", "Lights back on", "collect", { n: 3, icon: "💡", verb: "네온사인 켜기 · switch the neon sign on", spots: [{ x: YD.x + 512, z: YD.z + 31.6, zone: "yeouido" }, { x: YD.x + 590, z: YD.z + 48.4, zone: "yeouido" }, { x: YD.x + 642, z: YD.z + 31.6, zone: "yeouido" }] }, "sq_sh", "이태원로의 꺼진 네온사인 세 개를 다시 켜고 사장님에게 · switch the 3 dark neon signs on 이태원로 back on", { won: 32000, xp: 380 }),
  docent: SQ("docent", "박물관 도슨트", "Museum docent", "quiz", { quiz: "museum" }, "sq_do", "설명을 듣고 맞는 유물을 고르세요 · hear each description and pick the right relic", { won: 30000, xp: 360 }),
};
Object.assign(QUESTS, SIDE_QUESTS);
for (const [k, d] of Object.entries(SQ_NPC)) NPC_DEF[k] = d.name;
// the quizzes
const TOURIST_Q = [
  ["홍대입구역이 어디예요?", "Where is 홍대입구역?", "저쪽으로 쭉 가면 있어요.", ["저는 커피를 좋아해요.", "어제 영화를 봤어요.", "천천히 드세요."]],
  ["여기서 얼마나 걸려요?", "How long does it take from here?", "걸어서 오 분쯤 걸려요.", ["세 개 주세요.", "토요일에 만나요.", "저는 학생이에요."]],
  ["근처에 편의점이 있어요?", "Is there a convenience store nearby?", "네, 길 건너편에 있어요.", ["아니요, 배불러요.", "노래를 잘 불러요.", "생일 축하해요!"]],
  ["도와주셔서 감사합니다!", "Thank you for helping!", "아니에요. 좋은 여행 되세요!", ["얼마예요?", "다시 말해 주세요.", "저는 바빠요."]],
];
const MUSEUM_Q = [
  ["고려 시대에 만든 푸른빛 도자기예요.", "A blue-green pottery from the Goryeo era.", "청자", ["금관", "훈민정음", "무인석"]],
  ["신라의 왕이 머리에 썼던 금으로 만든 관이에요.", "A gold crown a Silla king wore.", "금관", ["청자", "신기전", "무인석"]],
  ["세종대왕이 만든 한국의 글자예요.", "The Korean letters King Sejong made.", "훈민정음", ["금관", "청자", "신기전"]],
  ["왕의 무덤을 지키는, 돌로 만든 사람이에요.", "A stone figure guarding a king's tomb.", "무인석", ["훈민정음", "금관", "청자"]],
  ["불을 붙여서 한꺼번에 많이 쏘던 화살이에요.", "Fire arrows shot many at once.", "신기전", ["청자", "무인석", "금관"]],
];
const SHOP_BUNDLE = 5, SHOP_PRICE = 5000, SHOP_MAX = 2;
const calDay = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function dailyStock() {
  const t = calDay(); if (S.dailyShop?.day !== t) {
    const chs = S.mode === "story" ? bookChapters().filter(c => S.chapters.includes(c.id)) : bookChapters();
    const owned = new Set(S.cards.map(c => c.id)), pool = bookWords().filter(w => chs.some(c => c.id === w.ch));
    S.dailyShop = { day: t, words: [...shuffle(pool.filter(w => !owned.has(w.id))), ...shuffle(pool.filter(w => owned.has(w.id)))].slice(0, SHOP_BUNDLE * SHOP_MAX).map(w => w.id), sold: 0 }; save();
  }
  return S.dailyShop;
}
function dailyShop(n) {
  const st = dailyStock(), b = st.words.slice(st.sold * SHOP_BUNDLE, (st.sold + 1) * SHOP_BUNDLE), cost = SHOP_PRICE * b.length;
  if (st.sold >= SHOP_MAX || !b.length) { endWith(n, "kt_sold"); return; }
  showLine(n, "kt_hi", [
    { ko: `📦 묶음 ${st.sold + 1} / ${SHOP_MAX} 사기 · ${won(cost)}`, en: `5 rare (희귀) cards: ${b.map(id => WORD[id].kr).join(", ")}`, act: () => {
      if (S.money < cost) { endWith(n, "kt_poor"); return; }
      S.money -= cost; st.sold++; SFX.coin?.();
      const rows = b.map(id => { const c = newCard(id, 1); S.cards.push(c); return { icon: "🃏", ko: `${WORD[id].kr} · ${RARITY[1].ko}`, en: `${WORD[id].en} · ${modText(c)}` }; });
      save(); showLine(n, "kt_buy", [{ ko: "(계속 · continue)", en: "", act: () => { closeDialog(); showReward("📦 단어 카드 묶음 · card bundle", rows); } }]);
    } },
    { ko: "(대화 끝내기)", en: `${SHOP_MAX - st.sold} bundle(s) left today (${won(SHOP_PRICE)} a card) · new cards tomorrow`, act: closeDialog }]);
}
function sideQuiz(id, n) {
  closeDialog();
  const q = QUESTS[id];
  let items;
  if (q.quiz === "tourist") items = TOURIST_Q.map(([qq, en, a, wrong]) => ({ prompt: `<span class="qzKo">${esc(qq)}</span><span class="qzEn">${esc(en)} · 맞는 대답은? · the right reply?</span>`, a: { id: "x", noStat: true, kr: a }, wrong }));
  else if (q.quiz === "museum") items = MUSEUM_Q.map(([d, en, a, wrong]) => ({ prompt: `<span class="qzKo">${esc(d)}</span><span class="qzEn">${esc(en)} · 무슨 유물이에요? · which relic?</span>`, a: { id: "x", noStat: true, kr: a }, wrong }));
  else { const ch = storyNext().cur, pool = shuffle(bookWords().filter(w => w.ch === ch.id)); items = pool.slice(0, 5).map(w => ({ word: w, pool, koToEn: false }));   /* English on top, Korean answers (Danny 2026-10-19) */ }
  const queue = items.slice(); let right = 0, need = items.length;
  const next = () => {
    if (right >= need) { completeQuest(id); showLine(n, q.done, [{ plr: "p_yes", act: closeDialog }]); return; }
    const it = queue.shift();
    let ans, opts, prompt;
    if (it.word) { const w = it.word, others = shuffle(it.pool.filter(x => x !== w)).slice(0, 3); ans = it.koToEn ? { id: w.id, kr: w.en } : w; opts = shuffle([ans, ...others.map(o => it.koToEn ? { id: o.id, kr: o.en } : o)]); prompt = it.koToEn ? `<span class="qzKo">${esc(w.kr)}</span><span class="qzEn">무슨 뜻이에요? · what does it mean?</span>` : `<span class="qzKo">${esc(w.en)}</span><span class="qzEn">이 뜻의 단어는? · which word means this?</span>`; }
    else { ans = it.a; opts = shuffle([ans, ...it.wrong.map(t => ({ id: "x", noStat: true, kr: t }))]); prompt = it.prompt; }
    openQuiz({ title: `${q.ko} · ${right} / ${need}`, prompt, answer: ans, opts, onDone: ok => { if (ok) right++; else queue.push(it); next(); } });
  };
  next();
}
// marked spots: built once, shown while the quest needs them
const sqSpots = [];
function buildSideSpots() {
  const ringM = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  for (const [id, q] of Object.entries(SIDE_QUESTS)) (q.spots || []).forEach((sp, i) => {
    const g = new THREE.Group(); g.position.set(sp.x, 0, sp.z);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1.15, 28), ringM(q.kind === "ride" ? "#7ae8ff" : "#ffd23d")); ring.rotation.x = -Math.PI / 2; ring.position.y = .06; g.add(ring);
    let obj;
    if (q.kind === "ride") obj = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 14, 16, 1, true), ringM("#7ae8ff"));
    else if (q.icon === "📄") obj = new THREE.Mesh(new THREE.BoxGeometry(.5, .02, .7), toon("#f8f6ee"));
    else if (q.icon === "📦") obj = new THREE.Mesh(new THREE.BoxGeometry(.7, .5, .7), toon("#b8864a"));
    else if (q.icon === "🐈") { obj = new THREE.Group(); const w = toon("#f6f4ee"); const b = new THREE.Mesh(new THREE.SphereGeometry(.35, 10, 8), w); b.scale.set(1.3, .8, .9); b.position.y = .3; obj.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), w); h.position.set(.42, .5, 0); obj.add(h); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(.07, .16, 4), w); e.position.set(.45, .72, s * .1); obj.add(e); } }
    else if (q.icon === "⚡" || q.icon === "💡") { obj = new THREE.Mesh(new THREE.OctahedronGeometry(.3, 0), new THREE.MeshBasicMaterial({ color: q.icon === "⚡" ? "#fff36a" : "#ffd89a", toneMapped: false })); obj.scale.y = 1.5; }
    else if (q.icon === "🧪") { obj = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .55, 10), new THREE.MeshBasicMaterial({ color: "#7af0ff", toneMapped: false })); }
    else if (q.icon === "🕯") { obj = new THREE.Group(); obj.add(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .6, 5), toon("#8a5a32"))); const f = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffb03a", toneMapped: false })); f.position.y = .35; obj.add(f); }
    else if (q.icon === "🌼") { obj = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), new THREE.MeshBasicMaterial({ color: "#5ab8ff", toneMapped: false })); obj.scale.y = 1.4; }
    else if (q.icon === "📚") { obj = new THREE.Group(); ["#c8402f", "#2f6db3", "#e0a21c"].forEach((c, k) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.6 - k * .06, .12, .45), toon(c)); b.position.y = k * .13; b.rotation.y = k * .3; obj.add(b); }); }
    else obj = new THREE.Mesh(new THREE.OctahedronGeometry(.35, 0), new THREE.MeshBasicMaterial({ color: "#ffe8f0", toneMapped: false }));
    obj.position.y = q.kind === "ride" ? 7 : obj.position.y || .35; g.add(obj);
    g.visible = false; scene.add(g); sqSpots.push({ id, i, g, obj, sp });
  });
}
const sqNeeds = (id, i) => { const q = QUESTS[id], st = S.quests[id]; return st?.st === "active" && (q.kind === "ride" ? st.c < 1 : !(st.got || [])[i]); };
function sqSpotNear() {
  for (const s of sqSpots) if (s.sp.zone === player.zone && QUESTS[s.id].kind === "collect" && sqNeeds(s.id, s.i) && dist2(player.pos, s.sp) < 2.6) return s;
  return null;
}
function sqPick(id, i) {
  const q = QUESTS[id], st = S.quests[id]; if (!st || st.st !== "active") return;
  st.got = st.got || []; if (st.got[i]) return; st.got[i] = 1; st.c = st.got.filter(Boolean).length;
  SFX.pickup(); FX.burst(player.pos, { n: 18, color: ["#ffd23d", "#ffffff"], speed: 4, size: .14, life: .7, shape: "star", grav: 1 });
  if (q.icon === "📷") { FX.glow(player.pos, { color: "#ffffff", r: 3, life: .25 }); snd("field", .4, 1.8); }
  toast(`${q.icon} ${q.ko} ${st.c} / ${q.n}` + (st.c >= q.n ? ` · 완료! ${NPC_DEF[q.giver]?.split(" · ")[0] || ""}에게 돌아가세요 · go back` : ""));
  save();
}
let rideT = 0, rideFail = false, sqT = 0;
function sqTick(dt) {
  if ((sqT -= dt) <= 0) { sqT = .5; for (const s of sqSpots) s.g.visible = sqNeeds(s.id, s.i); }
  for (const s of sqSpots) if (s.g.visible) { s.obj.rotation.y += dt * 1.5; if (QUESTS[s.id].kind !== "ride") s.obj.position.y = .35 + Math.sin(clock * 3 + s.i) * .1; }
  const st = S.quests.ride, q = QUESTS.ride;
  if (st?.st === "active" && st.c < 1) {
    if (!player.riding) { rideFail = false; if (rideT) { rideT = 0; toast("자전거에서 내렸어요 · you got off — get on a 따릉이 to start again"); } }
    else if (!rideFail) {
      if (!rideT) { rideT = clock + q.time; toast(`⏱ ${q.time}초! 부서진 다리 앞의 빛까지 · ${q.time} s — ride to the light by the broken bridge!`); }
      const left = rideT - clock;
      if (player.zone === "street" && dist2(player.pos, q.spots[0]) < 5) { st.c = 1; rideT = 0; SFX.kill(); FX.pillarFx(player.pos, "#7ae8ff"); toast("🚲 도착! 따릉이 직원에게 돌아가세요 · made it! back to the 따릉이 staff"); save(); }
      else if (left <= 0) { rideT = 0; rideFail = true; toast("⏱ 시간 초과! 내렸다가 다시 타면 다시 시작 · time's up — get off and on again to retry"); }
    }
  }
}
const qState = id => S.quests[id];
const qAvailable = id => { const q = QUESTS[id]; return q.kind !== "custom" && !S.quests[id] && (!q.needs || S.quests[q.needs]?.st === "done"); };
const qTurnInNpc = q => q.kind === "deliver" ? q.to : q.giver;
function qProgress(id) {
  const q = QUESTS[id], st = S.quests[id]; if (!st) return "";
  if (q.kind === "kill") return `${Math.min(st.c, q.n)} / ${q.n}`;
  if (q.kind === "cards") return `${cardsHave(st).length} / ${q.n}`;
  if (q.kind === "find") return st.found ? "찾았어요 · found" : "찾는 중 · searching";
  if (id === "sua") return S.gimbap ? "김밥 있음 → 수아" : "김밥 사기 · buy a gimbap";
  if (q.kind === "collect" || q.kind === "fish") return `${Math.min(st.c, q.n)} / ${q.n}`;
  if (q.kind === "bring") { const h = S.snacks?.[q.item] || 0; return `${SNACKS[q.item].ko} ${Math.min(h, q.n)} / ${q.n}`; }
  if (q.kind === "ride") return st.c ? "도착! · arrived" : "따릉이를 타면 시작 · get on a 따릉이 to start";
  if (q.kind === "quiz") return "대화하기 · talk to them";
  return "";
}
function cardsHave(st) { const bag = bagCards(); return st.words.filter(id => bag.some(c => c.id === id)); }
function qReady(id) {
  const q = QUESTS[id], st = S.quests[id]; if (!st || st.st !== "active" || q.kind === "custom") return false;
  if (q.kind === "kill") return st.c >= q.n;
  if (q.kind === "cards") return cardsHave(st).length >= q.n;
  if (q.kind === "find") return !!st.found;
  if (q.kind === "collect" || q.kind === "fish") return st.c >= q.n;
  if (q.kind === "ride") return st.c >= 1;
  if (q.kind === "bring") return (S.snacks?.[q.item] || 0) >= q.n;
  if (q.kind === "quiz") return false;             // the quiz itself completes it
  return q.kind === "deliver";                     // ready as soon as you reach the person
}
function acceptQuest(id) {
  const q = QUESTS[id], st = { st: "active", c: 0 };
  if (q.kind === "cards") { st.words = []; for (const k of ["dokkaebi", "vine", "haetae"]) st.words.push(pick(monsterPool(k).filter(w => !st.words.includes(w)))); }   // one per monster kind, all different
  S.quests[id] = st; SFX.pickup(); toast(`퀘스트 수락 · ${q.ko} (L)`); save();
  if (q.kind === "find") { const j = npcs.find(n => n.kind === "jieun"); if (j) j.model.root.visible = true; }
}
// boss quests count a boss you beat before you had the quest (Danny 2026-10-17: 터널의 주인 showed up after he had already cleared the tunnel)
function autoCreditBossQuests() {
  for (const [id, q] of Object.entries(QUESTS)) {
    const st = S.quests[id];
    if (q.kind !== "kill" || !MONS[q.target]?.boss || st?.st === "done" || (st && st.c >= q.n)) continue;
    const beaten = Math.max(S.killsBy?.[q.target] || 0, q.target === "chief" ? S.dunClears || 0 : 0);
    if (beaten < q.n) continue;
    S.quests[id] = { st: "active", c: q.n }; completeQuest(id); toast(`이미 했어요! 보상을 받았어요 · already done: ${q.ko} — reward received`);
  }
}
function completeQuest(id) {
  const q = QUESTS[id], st = S.quests[id], r = q.reward;
  if (q.kind === "cards") for (const w of st.words) { const c = bagCards().filter(x => x.id === w).sort((a, b) => a.rar - b.rar)[0]; if (c) S.cards = S.cards.filter(x => x !== c); }
  if (q.kind === "bring") S.snacks[q.item] -= q.n;
  st.st = "done"; addHeart(3);
  if (r.won) S.money += r.won;
  const att = {};
  if (r.gear) att.gear = [r.gear];
  if (r.card) { const pool = playWords().filter(w => (S.chapters.length ? S.chapters : [w.ch]).includes(w.ch)); att.cards = [{ id: pick(pool.filter(w => (w.book || "5a") === S.book)).id, rar: r.card }]; }
  if (att.gear || att.cards) setTimeout(() => sendMail(NPC_DEF[q.giver].split(" · ")[0], "도와줘서 고마워요. 작은 선물을 보내요. 역에 있는 우체통에서 받으세요.", "Thank you for helping. I'm sending a small gift. Pick it up at the post box in the station.", att), 1500);
  toast(`퀘스트 완료! ${q.ko} · +${won(r.won || 0)}`); SFX.kill(); setTimeout(() => cardPack(3), 600);
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
  if (CB[n.kind]) return CB[n.kind].rank ? (rankOpen(n.kind) && !S.cbWins?.[n.kind] ? "🃏" : "") : S.seoulCards?.[CB[n.kind].area] ? "" : "🃏";
  if (n.kind === "sua") return suaMarker();
  for (const id in QUESTS) { const q = QUESTS[id]; if (qReady(id) && qTurnInNpc(q) === n.kind) return "?"; }
  for (const id in QUESTS) if (QUESTS[id].giver === n.kind && qAvailable(id)) return "!";
  for (const id in QUESTS) { const q = QUESTS[id], st = S.quests[id]; if (st && st.st === "active" && (qTurnInNpc(q) === n.kind || (q.kind === "find" && q.to === n.kind && !st.found))) return "…"; }
  return "";
}
// talking: hand in first, then a new quest, then a reminder, then the NPC's normal business
function questTalk(n, normal, skip = 0) {
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
      if (skip-- > 0) continue;
      const words = () => q.kind === "cards" ? " " + S.quests[id].words.map(w => WORD[w].kr).join(", ") : "";
      showLine(n, q.offer, [{ plr: "p_ok", act: () => { acceptQuest(id); if (q.kind === "quiz") { sideQuiz(id, n); return; } if (q.kind === "cards") toast(`찾을 카드 · ${words()}`); normal ? normal() : closeDialog(); } }, { plr: "p_later", act: () => { if (!questTalk(n, normal, (arguments[2] || 0) + 1)) normal ? normal() : closeDialog(); } }]);
      return true;
    }
  }
  for (const id in QUESTS) {
    const q = QUESTS[id], st = S.quests[id];
    if (st && st.st === "active" && qTurnInNpc(q) === n.kind && q.kind !== "deliver" && q.kind !== "custom") {
      showLine(n, q.wait, q.kind === "quiz" ? [{ plr: "p_ok", act: () => sideQuiz(id, n) }, { plr: "p_later", act: closeDialog }] : [{ plr: "p_yes", act: () => normal ? normal() : closeDialog() }]);
      return true;
    }
  }
  return false;
}
// 지유: the Korean test of the "find" quest — pick the sentence that makes sense
function findTalk(n, id) {
  const ask = () => showLine(n, "j_hello", shuffle([
    { plr: "p_brother", act: () => { S.quests[id].found = true; save(); showLine(n, "j_relief", [{ plr: "p_yes", act: () => { closeDialog(); fade(() => { n.model.root.visible = false; toast("지유 씨가 민수 씨에게 갔어요 · Jiyu ran to Minsu"); }); } }]); } },
    { plr: "p_hungry", act: () => showLine(n, "j_what", [{ ko: "(다시 말해 보기)", en: "try again", act: ask }]) },
  ]));
  ask();
}

// ---- maps: the minimap shows the 60 m around you; the full map (M) shows each area you've found a map for ----
// 홍대 지도 at the 관광안내소 (park), 서교 아파트 지도 on the 경비실 counter at the apartment gate
const MAP_ITEMS = { sogang: { spot: MAPSPOT_SG, flag: "hasMapSg", line: "x_map13", ko: "서강대학교 지도", en: "Sogang University map" }, dangin: { spot: MAPSPOT_DI, flag: "hasMapDi", line: "x_map9", ko: "당인리 지도", en: "Danginri map" }, seonyudo: { spot: MAPSPOT_SY, flag: "hasMapSy", line: "x_map10", ko: "선유도 지도", en: "Seonyudo map", zone: "yeouido" }, sayuksin: { spot: MAPSPOT_SA, flag: "hasMapSa", line: "x_map11", ko: "사육신 공원 지도", en: "Sayuksin park map", zone: "yeouido" }, itaewon: { spot: MAPSPOT_IT, flag: "hasMapIt", line: "x_map12", ko: "이태원 지도", en: "Itaewon map", zone: "yeouido" }, yeonnam: { spot: MAPSPOT_YN, flag: "hasMapYn", line: "x_map7", ko: "연남동 지도", en: "Yeonnam-dong map" }, sinchon: { spot: MAPSPOT_SC, flag: "hasMapSc", line: "x_map8", ko: "신촌 지도", en: "Sinchon map" }, hongdae: { spot: MAPSPOT, flag: "hasMap", line: "x_map", ko: "홍대 지도", en: "Hongdae map" }, apt: { spot: MAPSPOT_APT, flag: "hasMapApt", line: "x_map2", ko: "서교 아파트 지도", en: "apartment map" }, river: { spot: MAPSPOT_RIVER, flag: "hasMapRiver", line: "x_map3", ko: "한강공원 지도", en: "Han River park map" }, yeouido: { spot: MAPSPOT_YD, flag: "hasMapYd", line: "x_map4", ko: "여의도 지도", en: "Yeouido map", zone: "yeouido" }, noryangjin: { spot: MAPSPOT_NR, flag: "hasMapNr", line: "x_map5", ko: "노량진 지도", en: "Noryangjin map", zone: "yeouido" }, yongsan: { spot: MAPSPOT_YS, flag: "hasMapYs", line: "x_map6", ko: "용산 지도", en: "Yongsan map", zone: "yeouido" } };
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
  if (player.zone === "dungeon") { $("mapNone").hidden = true; $("bigMap").hidden = false; $("mapTitle").textContent = "홍대 터널"; mapSet(DUNGEON.wrects[0].x0 + 150, 0, 316, (ctx, a, b, sp) => drawDungeonMap(ctx, 720, 720, a, b, sp, true)); return; }
  if (player.zone === "museum") { $("mapNone").hidden = true; $("bigMap").hidden = false; $("mapTitle").textContent = "국립중앙박물관"; mapSet(MU.x + 128, MU.z, 270, (ctx, a, b, sp) => drawDungeonMap(ctx, 720, 720, a, b, sp, true, MUSEUM, "museum")); return; }
  if (player.zone === "market") { $("mapNone").hidden = true; $("bigMap").hidden = false; $("mapTitle").textContent = "노량진 수산시장"; mapSet(MK.x + 128, MK.z, 270, (ctx, a, b, sp) => drawDungeonMap(ctx, 720, 720, a, b, sp, true, MARKET, "market")); return; }
  if (player.zone === "tower") { $("mapNone").hidden = true; $("bigMap").hidden = false; $("mapTitle").textContent = "63빌딩"; mapSet(TW.x + 131, TW.z, 276, (ctx, a, b, sp) => drawDungeonMap(ctx, 720, 720, a, b, sp, true, TOWER, "tower")); return; }
  const own = ownedAreas().filter(a => (MAP_ITEMS[a].zone || "street") === player.zone);
  $("mapNone").hidden = own.length > 0; $("bigMap").hidden = !own.length;
  $("mapTitle").textContent = own.map(a => MAP_ITEMS[a].ko.replace(" 지도", "")).join(" · ") || "지도";
  if (!own.length) return;
  const bs = own.map(a => world.map.areas[a]);
  const x0 = Math.min(...bs.map(b => b.minX)), x1 = Math.max(...bs.map(b => b.maxX)), z0 = Math.min(...bs.map(b => b.minZ)), z1 = Math.max(...bs.map(b => b.maxZ));
  mapSet((x0 + x1) / 2, (z0 + z1) / 2, Math.max(x1 - x0, z1 - z0) + 12, (ctx, a, b, sp) => drawMap(ctx, 720, 720, a, b, sp, true, own));
}
// fast travel (Danny 2026-10-19: "if you got the map in that location you should be allowed to be fast travelling to that spot from
// another fast travel spot"): every map stand whose map you own is a travel point; at one, E lists the others. Not while a monster
// is chasing you (no escaping fights), not on a bike.
const travelZone = a => MAP_ITEMS[a].zone || "street";
const TRAVEL_ORDER = ["hongdae", "apt", "river", "yeonnam", "sinchon", "sogang", "dangin", "yeouido", "noryangjin", "yongsan", "seonyudo", "sayuksin", "itaewon"];   // west to east, the street side first
function travelSpotNear() {
  if (ownedAreas().length < 2) return null;
  for (const a of ownedAreas()) if (travelZone(a) === player.zone && dist2(player.pos, MAP_ITEMS[a].spot) < 3.6) return a;
  return null;
}
function travelMenu(from) {
  const me = { name: "🧭 빠른 이동 · fast travel" };
  const opts = ownedAreas().filter(a => a !== from).sort((x, y) => TRAVEL_ORDER.indexOf(x) - TRAVEL_ORDER.indexOf(y)).map(a => ({ ko: MAP_ITEMS[a].ko.replace(" 지도", ""), en: MAP_ITEMS[a].en.replace(/ map$/, ""), act: () => { closeDialog(); travelTo(a); } }));
  showLine(me, "ft_where", [...opts, { ko: "(그만두기)", en: "stay here", act: closeDialog }]);
}
function travelTo(a) {
  if (monsters.some(m => !m.dead && m.zone === player.zone && m.state === "chase" && dist2(m.pos, player.pos) < 30)) { toast("괴물이 쫓아와요! 싸우는 중에는 못 가요 · a monster is chasing you: not during a fight"); return; }
  if (player.riding) setRiding(false);
  const it = MAP_ITEMS[a], z = travelZone(a);
  fade(() => {
    cancelRitual(); setTarget(null);
    if (z !== player.zone) { if (z === "yeouido") populateYeouido(); else populateStreet(); player.zone = z; }
    const p = new THREE.Vector3(it.spot.x, 0, it.spot.z + 2.4); collide(p); player.pos.copy(p); player.yaw = Math.PI; cam.yaw = Math.PI;
    toast(`🧭 ${it.ko.replace(" 지도", "")} · ${it.en.replace(/ map$/, "")}`); SFX.open(); save();
  });
}
// zoom (Danny 2026-10-19: "an option to zoom into this map, so we can read the names better"): scroll wheel or + / − zoom towards the
// pointer, drag moves, ⤢ shows the whole map again. The names keep their size on screen, so zooming in pulls them apart.
let mapZ = null;
function mapSet(cx, cz, span, draw) { const c = $("bigMap"); c.width = c.height = 720; mapZ = { cx, cz, span, fit: span, draw, x0: cx, z0: cz }; mapRedraw(); }
function mapRedraw() { if (!mapZ) return; mapZ.draw($("bigMap").getContext("2d"), mapZ.cx, mapZ.cz, mapZ.span); $("mzFit").disabled = mapZ.span >= mapZ.fit; }
function mapZoom(f, px = 360, pz = 360) {   // f < 1 zooms in; (px, pz) = the canvas point that stays put
  if (!mapZ) return;
  const k = 720 / mapZ.span, wx = mapZ.cx + (px - 360) / k, wz = mapZ.cz + (pz - 360) / k;
  mapZ.span = Math.max(mapZ.fit / 10, Math.min(mapZ.fit, mapZ.span * f));
  const k2 = 720 / mapZ.span; mapZ.cx = wx - (px - 360) / k2; mapZ.cz = wz - (pz - 360) / k2;
  if (mapZ.span >= mapZ.fit) { mapZ.cx = mapZ.x0; mapZ.cz = mapZ.z0; }
  mapRedraw();
}
{
  const c = $("bigMap"), at = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * 720 / r.width, (e.clientY - r.top) * 720 / r.height]; };
  c.addEventListener("wheel", e => { e.preventDefault(); const [x, z] = at(e); mapZoom(e.deltaY < 0 ? 1 / 1.25 : 1.25, x, z); }, { passive: false });
  let drag = null;
  c.addEventListener("pointerdown", e => { drag = at(e); c.setPointerCapture(e.pointerId); c.style.cursor = "grabbing"; });
  c.addEventListener("pointermove", e => { if (!drag || !mapZ) return; const p = at(e), k = 720 / mapZ.span; mapZ.cx -= (p[0] - drag[0]) / k; mapZ.cz -= (p[1] - drag[1]) / k; drag = p; mapRedraw(); });
  const end = () => { drag = null; c.style.cursor = ""; }; c.addEventListener("pointerup", end); c.addEventListener("pointercancel", end);
  $("mzIn").onclick = () => mapZoom(1 / 1.5); $("mzOut").onclick = () => mapZoom(1.5); $("mzFit").onclick = () => mapZoom(1e9);
}
const mapItems = {};
function takeMap(area) {
  const it = MAP_ITEMS[area]; if (S[it.flag]) return;
  S[it.flag] = true; save(); SFX.pickup(); speak(it.line);
  toast(`${it.ko}를 찾았어요! · you found the ${it.en} (${keyName(SET.keys.map)})` + (ownedAreas().length > 1 ? " · 🧭 이제 여기로 빠른 이동할 수 있어요 · you can fast-travel here now from any other map stand" : ""));
  if (mapItems[area]) mapItems[area].visible = false;
}
function placeMapItem() {
  for (const [area, it] of Object.entries(MAP_ITEMS)) {
    const g = new THREE.Group(); g.position.set(it.spot.x, area === "apt" ? 1.13 : area === "river" || area === "yeouido" || area === "noryangjin" || area === "yongsan" ? 1.75 : 1.25, it.spot.z + (area === "apt" ? -1.3 : area === "river" ? -1.24 : area === "yeouido" || area === "noryangjin" || area === "yongsan" ? 1.24 : .35)); if (area === "river" || area === "yeouido" || area === "noryangjin" || area === "yongsan") g.rotation.x = Math.PI / 2;
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
    const extra = q.kind === "cards" ? `<div class="qwords">${st.words.map(w => { const loose = bagCards().some(c => c.id === w), inDeck = !loose && skillKeys().some(k => deckIds(k).includes(w)); return `<span class="${loose ? "have" : ""}">${loose ? "✓ " : ""}${WORD[w].kr} · ${WORD[w].en}${loose ? "" : inDeck ? " · 📌 덱에 있어요, 빼면 돼요 · in a deck: take it out (K)" : " · 🎲 괴물이 자주 떨어뜨려요 · monsters drop it often now"}</span>`; }).join("")}</div>` : "";
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
  return `<b class="tk">${sk.ko}</b> <span class="tr">${sk.en} · key ${SET.keys[k] ? keyName(SET.keys[k]) : barKeyLabel(k)}</span><div class="tm">${k === "basic" ? (skillDef("basic").info || "1 card · 1× damage") : sk.info}</div><div class="ts">재사용 ${sk.cd} s · 덱 ${n}/${deckSize(k)} · Lv ${sk.lvl}${blk ? " · " + blk : " · 준비됨 ready"}</div>`;
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
  { id: "camp5", ko: "우리 캠프", en: "Our camp", desc: "Rebuild 가현's camp on 여의도 (5 steps)", prog: () => [S.camp || 0, 5], reward: { won: 20000, xp: 150 } },
  { id: "granny", ko: "그날 밤", en: "That night", desc: "Hear the grandmother's whole story by the 나들목", prog: () => [S.heardGranny ? 1 : 0, 1], reward: { xp: 60 } },
  { id: "map5", ko: "학원가 산책", en: "Exam street walk", desc: "Find the 노량진 map", prog: () => [S.hasMapNr ? 1 : 0, 1], reward: { xp: 50 } },
  { id: "list", ko: "명단", en: "The list", desc: "Read 유현 선생님's list of the missing", prog: () => [S.sawList ? 1 : 0, 1], reward: { xp: 60 } },
  { id: "market1", ko: "문어 왕을 잡다", en: "Octopus king", desc: "Defeat the octopus king in the fish market", prog: () => [S.marketClears ? 1 : 0, 1], reward: { won: 40000, xp: 250 } },
  { id: "map6", ko: "강 건너 용산", en: "Over to Yongsan", desc: "Find the 용산 map", prog: () => [S.hasMapYs ? 1 : 0, 1], reward: { xp: 80 } },
  { id: "map7", ko: "연트럴파크", en: "Yeontral Park", desc: "Find the 연남동 map", prog: () => [S.hasMapYn ? 1 : 0, 1], reward: { xp: 20 } },
  { id: "map9", ko: "발전소", en: "The power plant", desc: "Find the 당인리 map", prog: () => [S.hasMapDi ? 1 : 0, 1], reward: { xp: 60 } },
  { id: "map10", ko: "선유교 건너", en: "Over the 선유교", desc: "Find the 선유도 map", prog: () => [S.hasMapSy ? 1 : 0, 1], reward: { xp: 80 } },
  { id: "map11", ko: "여섯 신하", en: "The six ministers", desc: "Find the 사육신 공원 map", prog: () => [S.hasMapSa ? 1 : 0, 1], reward: { xp: 100 } },
  { id: "map12", ko: "네온 거리", en: "Neon streets", desc: "Find the 이태원 map", prog: () => [S.hasMapIt ? 1 : 0, 1], reward: { xp: 120 } },
  { id: "map13", ko: "카드 배틀 광장", en: "The card plaza", desc: "Find the 서강대학교 map", prog: () => [S.hasMapSg ? 1 : 0, 1], reward: { xp: 40 } },
  { id: "map8", ko: "대학가", en: "The university street", desc: "Find the 신촌 map", prog: () => [S.hasMapSc ? 1 : 0, 1], reward: { xp: 40 } },
  { id: "museum1", ko: "장군을 잠재우다", en: "The general sleeps again", desc: "Defeat the awakened general in the museum", prog: () => [S.museumClears ? 1 : 0, 1], reward: { won: 60000, xp: 400 } },
  { id: "truth", ko: "진실", en: "The truth", desc: "Hear the stranger's story", prog: () => [S.metMirror ? 1 : 0, 1], reward: { xp: 200 } },
  { id: "set1", ko: "세트 완성", en: "Full set", desc: "Own both pieces of a dungeon set", prog: () => [Object.values(SETS).some(st => ownsG(st.w) && ownsG(st.a)) ? 1 : 0, 1], reward: { won: 30000, xp: 150 } },
  { id: "dealer", ko: "수상한 거래", en: "A shady deal", desc: "Buy a card from someone who isn't on any map", prog: () => [S.dealerBuys ? 1 : 0, 1], reward: { xp: 150 } },
  // Danny 2026-10-18: talk to every Dreamcatcher-named character once (수아 and 지유 also count through their quests)
  { id: "dreamteam", ko: "드림팀", en: "The Dream Team", desc: "Talk to 지유, 시연, 수아, 가현, 유현, 다미 and 한동", prog: () => [DREAM_TEAM.filter(k => S.talked?.[k] || (k === "sua" && (S.sua?.step || 0) >= 1) || (k === "jieun" && (S.quests.sister?.found || S.quests.sister?.st === "done"))).length, DREAM_TEAM.length], reward: { won: 50000, xp: 300 } },
  { id: "duel1", ko: "첫 대결", en: "First duel", desc: "Win a quiz duel against one of the seven (6+ goblins)", prog: () => [Object.values(S.rel || {}).some(r => r.xp > 0) ? 1 : 0, 1], reward: { xp: 100 } },
  { id: "bestie", ko: "단짝", en: "Best friends", desc: "Reach ♥ Lv 5 with one of the seven", prog: () => [Math.max(0, ...Object.values(S.rel || {}).map(r => r.lvl)), 5], reward: { won: 60000, xp: 400 } },
  { id: "seoul6", ko: "서울 카드 컬렉터", en: "Seoul card collector", desc: "Collect all 6 Seoul cards from the student card battlers", prog: () => [Object.keys(S.seoulCards || {}).length, 6], reward: { won: 80000, xp: 500 } },
  { id: "cb1st", ko: "첫 카드 배틀", en: "First card battle", desc: "Beat a student in a word card battle", prog: () => [Object.keys(S.seoulCards || {}).length ? 1 : 0, 1], reward: { xp: 80 } },
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
function takeMail(m) {
  const a = m.attach; if (a.won) S.money += a.won;
  for (const g of a.gear || []) addItem(g);
  for (const c of a.cards || []) S.cards.push({ uid: newUid(), id: c.id, rar: c.rar, mod: c.mod || rollMod(c.rar) });
  m.taken = true;
}
// Danny 2026-10-18: take every gift at once, delete every letter at once (gifts are taken first, so nothing is lost)
function takeAllMail() {
  const open = S.mail.filter(m => hasAttach(m) && !m.taken); if (!open.length) return 0;
  let w = 0, n = 0, g = 0; for (const m of open) { w += m.attach.won || 0; n += (m.attach.cards || []).length; g += (m.attach.gear || []).length; takeMail(m); m.read = true; }
  toast(`📎 ${open.length}개 받았어요 · took ${open.length} gift${open.length > 1 ? "s" : ""}` + [w && ` · ${won(w)}`, n && ` · 카드 ${n}장 · ${n} card${n > 1 ? "s" : ""}`, g && ` · 장비 ${g} · ${g} gear`].filter(Boolean).join(""));
  SFX.pickup(); save(); return open.length;
}
function drawMailAll() {
  const open = S.mail.filter(m => hasAttach(m) && !m.taken).length;
  $("mlTakeAll").textContent = `📎 모두 받기 · take all (${open})`; $("mlTakeAll").disabled = !open;
  if (!$("mlDelAll").dataset.sure) $("mlDelAll").textContent = `🗑 모두 지우기 · delete all (${S.mail.length})`; $("mlDelAll").disabled = !S.mail.length;
}
$("mlTakeAll").onclick = () => { takeAllMail(); drawMail(); };
$("mlDelAll").onclick = () => {
  const b = $("mlDelAll");
  if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "정말 다 지울까요? · really delete all? (받지 않은 선물은 먼저 받아요 · gifts are taken first)"; clearTimeout(b.t); b.t = setTimeout(() => { delete b.dataset.sure; drawMailAll(); }, 4000); return; }
  delete b.dataset.sure; takeAllMail(); const n = S.mail.length; S.mail = []; mailSel = null; save(); toast(`🗑 편지 ${n}통을 지웠어요 · deleted ${n} letters`); drawMail();
};
function openMail() { paused = true; showScreen("mailView"); if (!mailSel && S.mail.length) mailSel = S.mail[S.mail.length - 1].id; drawMail(); }
function drawMail() {
  const list = S.mail.slice().reverse();
  $("mlList").innerHTML = list.length ? list.map(m => `<button class="mlItem${m.id === mailSel ? " sel" : ""}${m.read ? "" : " unread"}" data-id="${m.id}"><b>${esc(m.from)}</b><span>${esc(m.ko.split(/[.!?]/)[0])}…</span>${hasAttach(m) && !m.taken ? "<i>📎</i>" : ""}</button>`).join("") : `<p class="fine">편지가 없어요 · no mail</p>`;
  $("mlList").querySelectorAll(".mlItem").forEach(b => b.onclick = () => { mailSel = b.dataset.id; drawMail(); });
  drawMailAll();
  const m = S.mail.find(x => x.id === mailSel);
  if (!m) { $("mlRead").innerHTML = ""; return; }
  m.read = true;
  $("mlRead").innerHTML = `<div class="mlFrom">보낸 사람 · from <b>${esc(m.from)}</b></div><p class="mlKo" data-tip="${esc(m.en)}">${esc(m.ko)}</p><p class="mlEn">${esc(m.en)}</p>`
    + (hasAttach(m) ? `<div class="mlAtt">📎 ${attachText(m.attach)} <button id="mlTake" ${m.taken ? "disabled" : ""}>${m.taken ? "받았어요 · taken" : "받기 · take"}</button></div>` : "")
    + `<button id="mlDel" class="mlDel">지우기 · delete</button>`;
  $("mlEnToggle").checked ? $("mlRead").classList.remove("noen") : $("mlRead").classList.add("noen");
  const take = $("mlTake"); if (take) take.onclick = () => { takeMail(m); SFX.pickup(); save(); drawMail(); };
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
  for (const a of zoo) if (!a.dead && a.zone === zone) t.push({ id: "zoo:" + a.id, pos: a.pos });
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
        if (typeof def.volley === "object") generalTick(m, dt, tg);   /* the general's line volleys; the commander's volley: 3 is its orb count (Danny's crash 2026-10-18) */
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
              m.slamCd = def.slam.every; m.slamAnim = 0; SFX.slam(); slamFx(m.slamAt, def.slam.radius, m.kind === "kkotge" || m.zone === "market");
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
    m.model.anim(dt, { moving, attack: m.attackAnim, slam: m.slamAnim, charge: m.charging ? 1 - m.charging / CHARGE : 0, arms: m.arms, plates: m.plates }); if (def.shield) shieldVis(m);
    m.moving = moving;
  }
}
function monsterAttack(m, tg) {
  m.atkCd = m.def.rate * rand(.9, 1.1); m.attackAnim = 1; m.atkN = (m.atkN || 0) + 1;
  if (m.def.caster && !(m.silencedUntil > clock)) { m.attackAnim = 0; m.atkN--; casterAttack(m, tg); return; }
  if (m.def.ranged) { setTimeout(() => { if (!m.dead) shootThorn(m, tg.pos); }, 250); return; }
  setTimeout(() => {
    if (m.dead || dist2(m.pos, tg.pos) > rangeOf(m) + 1) return;
    if (String(tg.id).startsWith("zoo:")) { const a = zoo.find(x => "zoo:" + x.id === tg.id); if (a) hurtAnimal(a, mdmg(m)); return; }
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
  const mesh = new THREE.Mesh(thornGeo, src?.def?.shock ? shockMat : thornMat); mesh.position.copy(from); mesh.scale.setScalar(1.6); scene.add(mesh);
  snd("laserS", .3, src?.def?.shock ? 1.6 : .8);
  projectiles.push({ mesh, vel, life: 2.2, hostile: true, dmg, src: src || { def: MONS.vine }, trail: src?.def?.shock ? ["#fff36a", "#ffffff", "#9fd8ff"] : ["#9be66a", "#5a8a3a", "#d8ffb0"] });
  SFX.orb();
}
// a monster dies: the host (or solo game) decides, every player near enough gets the rewards on their own side
function killMonster(m, by = myId()) {
  FX.deathPoof(m.pos, !!m.def.boss);
  if (NET.role !== "guest") burstAt(m);
  m.dead = true; m.sp.mon = null; m.sp.respawnAt = clock + (night > .5 ? 15 : 30); m.plate.remove();
  const near = [...remotes.values()].filter(r => r.zone === m.zone && dist2(r.pos, m.pos) < 40).map(r => r.id);
  netSend({ t: "kill", mid: m.id, near });
  if (by === myId() || (player.zone === m.zone && dist2(player.pos, m.pos) < 40)) rewardKill(m);
  else if (target === m) setTarget(null);
}
const bossDown = {};   /* this run's boss is dead: E anywhere leaves the dungeon (Danny 2026-10-18) */
function rewardKill(m) {
  const money = Math.round(rand(...m.def.money) * (1 + .2 * (m.lvl - m.def.lvl)) * (perk("trader") ? 1.15 : 1) / 100) * 100; S.money += money; S.kills++; if (comp && comp.zone === m.zone && dist2(comp.pos, m.pos) < 20) addHeart(1); S.killsBy[m.kind] = (S.killsBy[m.kind] || 0) + 1;
  floater(m.pos, "+" + won(money), "#e5b84a", false, 1.6);
  SFX.kill(); if (m.def.boss) bossSnap = lootSnap(); gainXp(monsterXp(m) * (perk("jieun") ? 1.1 : 1), m.pos); dropCard(m); dropGear(m); dropMat(m); dropStones(m); dropScroll(m); onKillForQuests(m); if (m.def.boss) autoCreditBossQuests();
  if (m.def.boss) { bossDown[m.zone] = true; setTimeout(() => toast(`🚪 ${keyName(SET.keys.interact)} 키로 바로 나갈 수 있어요 · press ${keyName(SET.keys.interact)} anywhere to leave the dungeon`), 2500); }
  if (m.def.boss) (m.zone === "tower" ? towerCleared : m.zone === "market" ? marketCleared : m.zone === "museum" ? museumCleared : dungeonCleared)();
  if (target === m) setTarget(null);
  showMissed([...m.missed]);
  save();
  const next = monsters.find(o => !o.dead && o.state === "chase" && dist2(o.pos, player.pos) < 20);
  if (next) setTimeout(() => { if (!target) setTarget(next); }, 400);
}
// damage from your ritual: applied here (solo / host) or sent to the host (guest)
function dealDamage(t, dmg, slow) {
  if (t.shieldUntil > clock) { FX.shieldFx(t.pos, "#c8a8ff"); floater(t.pos, "방어막 · shielded", "#c8a8ff", true, t.model.height); SFX.resist(); return false; }
  t.sleepUntil = 0; t.punch = 1;
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
const ZOO_KINDS = Object.keys(ANIMALS);
const EL_KEYS = Object.keys(ELEMENTS);
const zooNet = () => zoo.filter(a => !a.dead && a.hits > 0).map(a => [a.id, ZOO_KINDS.indexOf(a.kind), +a.pos.x.toFixed(2), +a.pos.z.toFixed(2), +a.yaw.toFixed(2), a.mv ? 1 : 0, a.ak || 0, a.el ? EL_KEYS.indexOf(a.el) : -1]);
const myState = () => ({ zo: zooNet(), nm: S.name || classDef().ko, cls: S.cls, lk: S.look || 0, lvl: S.level, x: +player.pos.x.toFixed(2), z: +player.pos.z.toFixed(2), yaw: +player.yaw.toFixed(2), mv: player.moving ? 1 : 0, zone: player.zone, hp: Math.round(player.hp), mx: player.maxHp, dead: player.dead ? 1 : 0 });
function upsertRemote(id, st) {
  if (id === myId()) return;
  let r = remotes.get(id);
  if (!r) {
    const model = classModel(st.cls, st.lk); scene.add(model.root);
    const plate = document.createElement("div"); plate.className = "plate ally"; $("plates").appendChild(plate);
    r = { id, model, plate, pos: new THREE.Vector3(st.x, 0, st.z), tpos: new THREE.Vector3(st.x, 0, st.z), yaw: st.yaw, lk: st.lk | 0 };
    remotes.set(id, r); logChat("system", `👋 ${st.nm} 님이 왔어요 · joined`);
  }
  if ((st.lk | 0) !== r.lk && st.cls) { scene.remove(r.model.root); r.model = classModel(st.cls, st.lk); scene.add(r.model.root); r.lk = st.lk | 0; }   // they changed their look
  r.zo = st.zo || [];
  Object.assign(r, { nm: st.nm, cls: st.cls, lvl: st.lvl, moving: !!st.mv, zone: st.zone, hp: st.hp, mx: st.mx, dead: !!st.dead }); r.tpos.set(st.x, 0, st.z); r.tyaw = st.yaw;
  if (r.zone !== "street" && player.zone === "station") { /* both underground: positions are the station's */ }
}
function dropRemote(id) { const r = remotes.get(id); if (!r) return; scene.remove(r.model.root); for (const a of (r.zoo || new Map()).values()) scene.remove(a.model.root); r.plate.remove(); remotes.delete(id); logChat("system", `${r.nm} 님이 나갔어요 · left`); }
function onNet(d, from) {
  switch (d.t) {
    case "hello": case "st": upsertRemote(from, d); break;
    case "enter": if (NET.role === "host") populateStreet(); break;
    case "whisper": if (NET.role === "host") onWhisper(d, from); break;
    case "invite": if (NET.role === "host") showInvite(d, from); break;
    case "ping": if (NET.role === "host") { const wc = wordCounts(); netSend({ to: from, t: "pong", nm: S.name || classDef().ko, lvl: S.level, cls: S.cls, zone: player.zone, n: remotes.size + 1, ms: wc.mastered, lr: wc.learned + wc.mastered, bk: S.book }); } break;
    case "enterU": if (NET.role === "host" && !someoneIn("museum", from)) resetMuseum(); break;
    case "scroll": if (NET.role === "host") applyScroll(d.i, d.ok); break;
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
    case "kill": if (NET.role === "guest") { const m = monsters.find(x => x.id === d.mid); if (m && !m.dead) { FX.deathPoof(m.pos, !!m.def.boss); m.dead = true; m.deadT = 0; m.plate.remove(); if (d.near.includes(myId())) rewardKill(m); else if (target === m) setTarget(null); } } break;
    case "hurt": if (d.to === myId() && !player.dead && player.zone !== "station") { hurt(d.dmg, { lvl: d.lv }); if (d.root) { player.rootedUntil = clock + 2; floater(player.pos, "덩굴에 묶임! · rooted", "#9be66a", true, 3); } } break;
    case "th": if (NET.role === "guest" && d.orb) { spawnOrb(new THREE.Vector3(d.x, d.y, d.z), new THREE.Vector3(d.vx, d.vy, d.vz), d.dmg, { lvl: d.lv }); break; } if (NET.role === "guest") spawnThorn(new THREE.Vector3(d.x, d.y, d.z), new THREE.Vector3(d.vx, d.vy, d.vz), d.dmg, d.sh ? { def: MONS.jangeo, lvl: d.lv } : { lvl: d.lv }); break;
    case "sl": if (NET.role === "guest") { const at = new THREE.Vector3(d.x, 0, d.z); makeRing(at, d.r, d.tele); setTimeout(() => { SFX.slam(); slamFx(at, d.r, player.zone === "market"); if (!player.dead && player.zone !== "station" && dist2(player.pos, at) < d.r) hurt(d.dmg, { lvl: d.lv }); }, d.tele * 1000); } break;
    case "chat": if (NET.role === "host") netSend({ t: "chat", id: from, nm: d.nm, text: d.text }); showRemoteChat(d.id || from, d.nm, d.text); break;
    case "em": if (NET.role === "host") netSend({ t: "em", id: from, e: d.e }); { const r = remotes.get(d.id || from); if (r) { r.model.emote?.(d.e); remoteBubble(r, d.e === "wave" ? "👋" : "🙇"); } } break;
    case "cgReq": case "cgAcc": case "cgGo": case "cgPick": case "cgNo": case "cgQuit": case "cgQz": case "cgSteal": if (NET.role === "host" && d.to !== "host") { netSend({ ...d, from }); break; } if (d.to === myId()) cgOnNet(d, d.from || from); break;
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
  const ps = [["host", myState()], ...[...remotes.values()].map(r => [r.id, { zo: r.zo || [], lk: r.lk, nm: r.nm, cls: r.cls, lvl: r.lvl, x: +r.tpos.x.toFixed(2), z: +r.tpos.z.toFixed(2), yaw: r.tyaw, mv: r.moving ? 1 : 0, zone: r.zone, hp: r.hp, mx: r.mx, dead: r.dead ? 1 : 0 }])];
  netSend({ t: "w", ms, ps, tw: [tw.solved, tw.open ? 1 : 0], mk: mk.boards, dl: mk.dealer ? 1 : 0, mu: mu.scrolls, time: (timeT += .125) > 2 ? (timeT = 0, S.time) : undefined });
}
function applySnapshot(d) {
  if (d.time) S.time = d.time;
  if (d.mk) { mk.boards = d.mk; syncBoards(); }
  if (d.dl !== undefined && !!d.dl !== !!mk.dealer) { mk.dealer = !!d.dl; mk.offers = null; syncDealer(); }
  if (d.mu) { mu.scrolls = d.mu; syncScrolls(); }
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
function drawRemoteZoo(r, dt, vis) {
  r.zoo = r.zoo || new Map();
  if ((r.zo || []).length && !zooReady()) { loadZoo(); return; }
  const seen = new Set();
  for (const [id, ki, x, z, yaw, mv, ak, ei] of r.zo || []) {
    const kind = ZOO_KINDS[ki]; if (!kind) continue; seen.add(id);
    let a = r.zoo.get(id);
    if (!a) { const model = makeAnimal(kind); scene.add(model.root); a = { model, pos: new THREE.Vector3(x, 0, z), yaw, ak }; r.zoo.set(id, a); if (vis) FX.burst(a.pos, { n: 12, color: ["#9be6a5", "#ffffff"], speed: 2, up: 1.5, size: .12, life: .7, grav: -1, shape: "star" }); }
    a.tpos = a.tpos || new THREE.Vector3(); a.tpos.set(x, 0, z); a.tyaw = yaw; a.mv = !!mv;
    if (ak > a.ak) { a.ak = ak; if (vis) a.model.trigger("attack"); }
    { const el = ei >= 0 ? EL_KEYS[ei] : null; if ((a.model.el || null) !== el) elGlow(a.model, el); }
  }
  for (const [id, a] of r.zoo) if (!seen.has(id)) { if (vis) FX.burst(a.pos, { n: 10, color: ["#ffffff", "#9be6a5"], speed: 1.8, up: 1.5, size: .12, life: .6, grav: -1 }); scene.remove(a.model.root); r.zoo.delete(id); }
  for (const a of r.zoo.values()) {
    a.model.root.visible = vis; if (!vis) continue;
    a.pos.lerp(a.tpos, Math.min(1, dt * 10)); let dy = (a.tyaw || 0) - (a.yaw || 0); dy = Math.atan2(Math.sin(dy), Math.cos(dy)); a.yaw = (a.yaw || 0) + dy * Math.min(1, dt * 10);
    a.model.root.position.set(a.pos.x, 0, a.pos.z); a.model.root.rotation.y = a.yaw; a.model.anim(dt, { moving: a.mv });
  }
}
function drawRemotes(dt) {
  for (const r of remotes.values()) {
    drawRemoteZoo(r, dt, r.zone === player.zone);
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
  bossDown.dungeon = false; cancelRitual(); setTarget(null); closeDialog();
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
  if (WORD[q.answer?.id]) stat(q.answer.id).s++;   /* quizzes are practice too (Danny 2026-10-18) */
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
  if (quiz.answer.noStat) { if (ok) SFX.select(); else SFX.resist(); }
  else if (ok) { const id = quiz.answer.id; stat(id).c++; if (WORD[id] && mastery(id).k === "mastered" && !S.mastered.includes(id)) { S.mastered.push(id); toast(`마스터! ${WORD[id].kr} · +${MASTER_XP} XP`); gainXp(MASTER_XP); } say([wordClip(id)], { interrupt: true }); SFX.select(); } else { stat(quiz.answer.id).w++; SFX.resist(); }
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
  S.dunClears = (S.dunClears || 0) + 1; addHeart(10); clearReward("tunnel", "홍대 터널");
  toast("🏆 던전 클리어! 홍대 터널 · dungeon cleared!");
  if (S.dunClears === 1) setTimeout(() => sendMail("낯선 사람", "잘했어요. 터널의 주인을 물리쳤군요. 이건 선물이에요. 역에서 다시 만나요.", "Well done. You defeated the master of the tunnel. This is a present. Let's meet again at the station.",
    { cards: [{ id: pick(playWords().filter(w => S.chapters.includes(w.ch))).id, rar: 2 }], gear: ["t_club"] }), 2500);
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
  if (perk("teacher")) dur *= 1.3;
  ccFx(t, "sleep");
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
  if (perk("teacher")) dur *= 1.3;
  ccFx(t, "silence");
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
  const mesh = new THREE.Mesh(orbGeo, orbMat); mesh.position.copy(from); mesh.scale.setScalar(2.2); scene.add(mesh);
  mesh.add(new THREE.Mesh(new THREE.SphereGeometry(.5, 12, 10), new THREE.MeshBasicMaterial({ color: "#ff6aff", transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
  FX.burst(from, { n: 16, color: ["#c08aff", "#ff6aff", "#ffffff"], speed: 4, size: .14, life: .5, grav: 0, y: 0, shape: "spark" });
  snd("laserL", .5, .85);
  projectiles.push({ mesh, vel, life: 3, hostile: true, dmg, src: src || { def: MONS.alien_caster }, r: 1, trail: ["#c08aff", "#ff6aff", "#ffffff"] });
  SFX.orb();
}
// a silenced caster can't cast: it walks up and hits you with its hands instead
const rangeOf = m => m.def.caster && m.silencedUntil > clock ? 2.6 : m.def.range;

// ---- materials (decision 13): monsters drop them, the smith uses them to upgrade gear ----
const MATS = { feather: { ko: "까치 깃털", en: "magpie feather" }, paper: { ko: "찢어진 책장", en: "torn page" }, copper: { ko: "구리선", en: "copper wire" }, weed: { ko: "물풀", en: "water weed" }, ember: { ko: "도깨비불 불씨", en: "wisp ember" }, neonglass: { ko: "네온 유리", en: "neon glass" }, horn: { ko: "도깨비 뿔", en: "goblin horn" }, vine: { ko: "덩굴 줄기", en: "vine stem" }, stone: { ko: "석상 조각", en: "statue shard" }, metal: { ko: "외계 금속", en: "alien metal" }, wood: { ko: "장승 나무", en: "guardian wood" }, shell: { ko: "게 껍데기", en: "crab shell" }, shadow: { ko: "그림자 조각", en: "shadow shard" }, jade: { ko: "청자 조각", en: "celadon shard" }, iron: { ko: "녹슨 쇳조각", en: "rusty iron" } };
const MAT_OF = { kkachi: "feather", chaekgwi: "paper", jeongi: "copper", mulgwi: "weed", dokkaebibul: "ember", neon: "neonglass", dokkaebi: "horn", vine: "vine", haetae: "stone", chief: "horn", alien_scout: "metal", alien_caster: "metal", jangseung: "wood", geuseundae: "shadow", commander: "metal", gwisin: "shadow", kkotge: "shell", jangeo: "shell", munoh: "shell", muinseok: "stone", cheongja: "jade", gapot: "iron", dogul: "metal", janggun: "iron" };
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
// set items go to +10; a level costs more the better the set is; from +5 on it also needs 2 of the set's boss material
const SET_UP_COST = { tunnel: 20000, tower: 35000, market: 50000, museum: 70000 };
const upMax = it => GEAR[it.g].set ? 10 : 5;
const upCost = it => { const d = GEAR[it.g], up = it.up || 0; return d.set ? Math.round(SET_UP_COST[d.set] * (1 + .12 * up) / 1000) * 1000 : 3000 * (up + 1); };
const upBossMat = it => { const d = GEAR[it.g]; return d.set && (it.up || 0) >= 5 ? SETS[d.set].mat : null; };
function upgradeMenu(n) {
  const opts = [];
  for (const sl of Object.keys(SLOTS)) {
    const it = itemBy(S.equip[sl]); if (!it || it.g === "a0") continue;
    const up = it.up || 0; if (up >= upMax(it)) continue;
    const cost = upCost(it), bm = upBossMat(it);
    opts.push({ ko: `${itemName(it)} → +${up + 1} · ${cost.toLocaleString("en-US")}원 + 재료 3개${bm ? ` + ${MATS[bm].ko} 2개` : ""}`, en: `${SLOTS[sl]} · up to +${upMax(it)} · you have ${matCount()} materials${bm ? `, ${S.mats?.[bm] || 0} ${MATS[bm].en}` : ""}`, act: () => {
      if (bm && (S.mats?.[bm] || 0) < 2) { endWith(n, "s_no_mats"); toast(`${MATS[bm].ko} 2개가 필요해요 · needs 2 ${MATS[bm].en} (${SETS[GEAR[it.g].set].where}의 보스)`); return; }
      if (matCount() < 3 + (bm ? 2 : 0)) { endWith(n, "s_no_mats"); return; }
      if (S.money < cost) { endWith(n, "s_short"); return; }
      showLine(n, "s_up", [{ plr: "p_upgrade", act: () => { closeDialog(); S.money -= cost; if (bm) S.mats[bm] -= 2; const spent = spendMats(3); if (bm) spent[bm] = (spent[bm] || 0) + 2; save(); startMemory(it, n, spent); } }]);
    } });
  }
  if (!opts.length) { endWith(n, "s_best"); return; }
  opts.push({ plr: "p_look", act: () => endWith(n, "s_bye") });
  showLine(n, "s_welcome", opts);
}
function startMemory(item, n, spent) {
  const words = shuffle(nounPool()).slice(0, 10);
  const stones = shuffle(words.flatMap(w => [{ w, side: "ko" }, { w, side: "en" }]));
  memo = { item, n, spent, stones, open: [], found: 0, miss: 0, lock: true, run: false, t: 150 };
  paused = true; cancelRitual(); $("memory").hidden = false; $("mmGrid").classList.remove("hint"); $("mmMiss").textContent = "0"; $("mmTime").textContent = "150"; $("mmInfo").textContent = "기억하세요! · memorise the stones (2 s)";
  $("mmGrid").innerHTML = stones.map((s, i) => `<button class="stone up ${s.side}" data-i="${i}"><span>${esc(s.side === "ko" ? s.w.kr : s.w.en)}</span></button>`).join("");
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
    if (memo.miss === 17) { $("mmGrid").classList.add("hint"); $("mmInfo").textContent = "💡 힌트: 빨강 = 한국어, 파랑 = 영어 · hint: red tiles are Korean, blue tiles are English"; SFX.open(); }   /* Danny 2026-10-18: help after 16 mistakes */
    setTimeout(() => { if (!memo) return; $("mmGrid").children[a].classList.remove("up"); $("mmGrid").children[c].classList.remove("up"); memo.lock = false; }, 700);
  }
}
function endMemory(giveUp) {
  const m = memo; if (!m) return; memo = null; $("memory").hidden = true; paused = false;
  const gain = giveUp ? 0 : m.miss <= 16 ? 2 : m.miss <= 24 ? 1 : 0;   /* Danny 2026-10-18: was 12 / 20, too hard */
  m.item.up = Math.min(upMax(m.item), (m.item.up || 0) + gain); S.upgrades = (S.upgrades || 0) + gain;
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
  // Danny 2026-10-18: fishing is word drilling, so a fish bites right away and the line goes back out by itself until you walk off
  fishing = { t: .5 }; toast("낚시 연습 · fishing drill: 바로 물어요, 걸어가면 멈춰요 · a bite every cast, walk away to stop"); SFX.dash();
}
function fishTick(dt) {
  if (!fishing) return;
  if (player.moving || player.zone !== "street" || dialog || player.dead) { fishing = null; toast("낚시 그만 · stopped fishing"); return; }
  fishing.t -= dt; if (fishing.t > 0) return;
  fishing = null; SFX.charge();
  const pool = nounPool(), w = pick(pool);
  openQuiz({ title: "물었다! 빨리 고르세요 · a bite! pick the word, fast", prompt: `<span class="qzKo">${esc(w.en)}</span><span class="qzEn">이 뜻의 단어는? · which word means this?</span>`, answer: w, opts: shuffle([w, ...shuffle(pool.filter(x => x.id !== w.id)).slice(0, 3)]), time: 5,
    onDone: ok => {
      const again = () => { if (!player.moving && player.zone === "street" && !player.dead && !fishing && dist2(player.pos, PIER) < 6) { fishing = { t: .5 }; SFX.dash(); } };
      if (!ok) { toast("놓쳤어요… · it got away"); setTimeout(again, 350); return; }
      if (!S.cards.some(c => c.id === w.id)) { S.cards.push(newCard(w.id, 0)); toast(`🃏 새 카드! ${w.kr} · ${w.en} — you caught a word you didn't own`); }
      let r = Math.random(), f = FISH[0]; for (const x of FISH) { if ((r -= x.p) < 0) { f = x; break; } }
      S.fish = S.fish || {}; S.fish[f.ko] = (S.fish[f.ko] || 0) + 1; S.fishTotal = (S.fishTotal || 0) + 1;
      { const fq = S.quests.fishing; if (fq?.st === "active" && fq.c < QUESTS.fishing.n) { fq.c++; setTimeout(() => toast(`🎣 낚시 대회 ${fq.c} / ${QUESTS.fishing.n}` + (fq.c >= QUESTS.fishing.n ? " · 완료! 낚시꾼에게 · go back to the fisher" : "")), 700); } }
      toast(`🐟 ${f.ko} · ${f.en}! (편의점에서 ${won(f.won)})`); floater(player.pos, "🐟 " + f.ko, "#9ec8ff", false, 3); SFX.pickup(); save(); setTimeout(again, 350);
    } });
}
// 편의점: cup ramyeon and triangle gimbap to go (eat with F); the clerk buys your fish
const SNACKS = { ramyeon: { ko: "컵라면", en: "cup ramyeon", price: 1500, fill: 40, plr: "p_ramyeon" }, samgak: { ko: "삼각김밥", en: "triangle gimbap", price: 1300, fill: 30, plr: "p_samgak" }, cupbap: { ko: "컵밥", en: "cup rice", price: 3000, fill: 60, plr: "p_cupbap", camp: true }, banana: { ko: "바나나우유", en: "banana milk", price: 1800, fill: 35, plr: "p_banana", shop: "handong" }, hodu: { ko: "호두과자", en: "walnut cakes", price: 2500, fill: 50, plr: "p_hodu", shop: "handong" } };
const fishValue = () => Object.entries(S.fish || {}).reduce((a, [k, c]) => a + c * (FISH.find(f => f.ko === k)?.won || 0), 0);
function kioskTalk(n) {
  const opts = Object.entries(SNACKS).filter(([, sn]) => !sn.camp && !sn.shop).map(([k, sn]) => ({ plr: sn.plr, act: () => {
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
function compLabel() { return S.compKey ? `💞 ${dcName(S.compKey)} ♥${relOf(S.compKey).lvl}` : S.companion === "gumiho" ? `💗 수아 ${"♥".repeat(heartLvl())}${"♡".repeat(5 - heartLvl())}` : `🐾 ${esc(petName())}`; }
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
  if (!(S.companion || S.compKey) || !player.model) return;
  let model;
  if (S.compKey) { model = npcWoman(S.compKey) || makeNPC("sitter"); }
  else if (S.companion === "gumiho") {
    model = npcWoman("sua") || (kayReady() ? makeKay("sua") : makeNPC("sitter"));
    if (!womenReady()) {   /* the old KayKit 수아 gets her tails here; the new model has its own */
    const tailM = toon("#f6efe6"), tipM = toon("#e8a33a");
    for (let i = 0; i < 9; i++) { const a = (i - 4) * .26; const tail = new THREE.Group(); tail.position.set(0, .85, .3); tail.rotation.set(.6 - Math.abs(a) * .2, 0, a * .8); model.root.add(tail);
      const c = new THREE.Mesh(new THREE.ConeGeometry(.2, 1.6, 7), tailM); c.position.y = .8; c.rotation.x = Math.PI; tail.add(c); const tip = new THREE.Mesh(new THREE.ConeGeometry(.13, .5, 7), tipM); tip.position.y = 1.75; tail.add(tip); }
    }
  } else { model = makeMonster("pet"); model.root.scale.setScalar(.45); model.height *= .45; }
  scene.add(model.root);
  const plate = document.createElement("div"); plate.className = "plate npc"; plate.innerHTML = compLabel(); $("plates").appendChild(plate);
  comp = { model, plate, pos: player.pos.clone().add(new THREE.Vector3(1.5, 0, 1.5)), yaw: 0, healT: 4, tauntT: 6, fleeUntil: 0, flee: null, zone: player.zone };
}
// ---- the zookeeper's animals ----
// hit = damage per attack (× the attack base and your bonuses), hp = share of your max health, every = seconds between attacks
const ZOO_STAT = { sheep: { hit: .3, hp: .2, every: 2 }, shiba: { hit: .45, hp: .25, every: 2 }, fox: { hit: .5, hp: .22, every: 1.6 }, wolf: { hit: .6, hp: .3, every: 2 },
  zebra: { hit: .7, hp: .35, every: 2.2 }, deer: { hit: .75, hp: .35, every: 2 }, alpaca: { hit: .7, hp: .45, every: 2, range: 7 }, stag: { hit: .95, hp: .45, every: 2.2 }, bull: { hit: 1.2, hp: .6, every: 2.4 } };
const ZOO_MAX = 5, ZOO_HITS = 5;
const zoo = []; let zooN = 0, zooRallyUntil = 0;
function zooCast(sk, k, share) {
  if (sk.feed) {
    const mine = zoo.filter(a => !a.dead); if (!mine.length) { toast("먹이를 줄 동물이 없어요 · no animals to feed"); return; }
    let extra = 0;
    for (const a of mine) { a.hp = Math.min(a.maxHp, a.hp + a.maxHp * sk.feed.heal * share); if (!a.fed) { a.fed = true; a.hits += Math.round(sk.feed.hits * share); extra++; } floater(a.pos, "🥕", "#9be6a5", false, a.model.height); }
    SFX.heal(); toast(`🥕 ${mine.length}마리에게 먹이를 줬어요 · fed ${mine.length}: healed` + (extra ? `, ${extra} of them +${Math.round(sk.feed.hits * share)} attacks (once per animal)` : " · 더 싸울 힘은 한 번만 · extra attacks only once per animal")); return;
  }
  if (sk.treat) {
    const mine = zoo.filter(a => !a.dead && a.hits > 0); if (!mine.length) { toast("간식을 줄 동물이 없어요 · no animals to treat"); return; }
    const els = Object.keys(ELEMENTS), count = {};
    for (const a of mine) { a.hp = Math.min(a.maxHp, a.hp + a.maxHp * sk.treat.heal * share); a.el = pick(els); count[a.el] = (count[a.el] || 0) + 1; elGlow(a.model, a.el); floater(a.pos, "🍖 " + ELEMENTS[a.el].ko, ELEMENTS[a.el].c, false, a.model.height); }
    SFX.heal(); toast("🍖 원소 간식 · element treat: " + Object.entries(count).map(([e, n]) => `${ELEMENTS[e].ko} ×${n}`).join(", ")); return;
  }
  if (sk.rally) { zooRallyUntil = clock + sk.rally.dur * share; SFX.charge(); FX.pillarFx(player.pos, "#ffd23d"); toast("📯 총공격! · all-out: your animals attack twice as fast"); return; }
  const kind = sk.summon, st = ZOO_STAT[kind], b = bonus();
  const dmg = BASE_ATTACK * st.hit * weaponMult() * lvlDmg() * gradMul() * (1 + b.dmg + gearStat("dmg")) * (.5 + .5 * share);
  const maxHp = Math.round(player.maxHp * st.hp * (.5 + .5 * share)), model = makeAnimal(kind);
  const ang = Math.random() * Math.PI * 2, pos = new THREE.Vector3(player.pos.x + Math.cos(ang) * 1.6, 0, player.pos.z + Math.sin(ang) * 1.6); collide(pos, .35);
  const a = { id: ++zooN, k, kind, model, pos, yaw: player.yaw, zone: player.zone, hp: maxHp, maxHp, dmg, hits: ZOO_HITS, every: st.every, range: st.range || 1.7, cd: .6, tgt: null, dead: false, deadT: 0, slot: Math.random() * Math.PI * 2 };
  scene.add(model.root); model.root.position.copy(pos); zoo.push(a);
  FX.burst(pos, { n: 16, color: ["#9be6a5", "#ffffff"], speed: 2.5, up: 2, size: .14, life: .8, grav: -1, shape: "star" }); SFX.pickup();
  floater(pos, `${ANIMALS[kind].icon} ${ANIMALS[kind].ko}`, "#9be6a5", false, model.height);
}
function elGlow(model, el) {
  if (model.glow) { model.root.remove(model.glow); model.glow = null; }
  if (!el || !ELEMENTS[el]) return;
  const m = new THREE.Mesh(new THREE.RingGeometry(.5, .78, 28), new THREE.MeshBasicMaterial({ color: ELEMENTS[el].c, transparent: true, opacity: .8, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = .06; model.root.add(m); model.glow = m; model.el = el;
}
function hurtAnimal(a, dmg) {
  if (a.dead) return;
  a.hp -= dmg; a.model.trigger("hit"); floater(a.pos, "-" + Math.round(dmg), "#ff8a7a", true, a.model.height);
  if (a.hp <= 0) { a.dead = true; floater(a.pos, `${ANIMALS[a.kind].icon} 쓰러졌어요 · down`, "#c8b8b0", true, a.model.height + .3); }
}
function zooGone(a) { scene.remove(a.model.root); zoo.splice(zoo.indexOf(a), 1); }
function zooTick(dt) {
  const rally = zooRallyUntil > clock;
  for (const a of zoo.slice()) {
    if (a.dead || a.hits <= 0) {   // down, or done: lie down / fade, then go
      a.deadT += dt; a.model.anim(dt, { dead: a.dead });
      if (!a.dead) a.model.root.scale.setScalar(Math.max(.01, 1 - a.deadT * 1.5));
      if (a.deadT > (a.dead ? 2 : .7)) zooGone(a);
      if (!a.dead && a.deadT < dt * 1.5) FX.burst(a.pos, { n: 10, color: ["#ffffff", "#9be6a5"], speed: 1.8, up: 1.5, size: .12, life: .6, grav: -1 });
      continue;
    }
    if (a.zone !== player.zone || dist2(a.pos, player.pos) > 40) { a.zone = player.zone; a.pos.set(player.pos.x + Math.cos(a.slot) * 2, 0, player.pos.z + Math.sin(a.slot) * 2); a.tgt = null; }
    // a target: yours if you have one nearby, otherwise whatever is fighting you or your animals
    if (a.tgt && (a.tgt.dead || a.tgt.zone !== a.zone || a.tgt.caged)) a.tgt = null;
    if (!a.tgt) {
      if (target && !target.dead && target.zone === a.zone && dist2(target.pos, player.pos) < 25) a.tgt = target;
      else { let best = null, bd = 14; for (const m of monsters) if (!m.dead && !m.caged && m.zone === a.zone && m.state === "chase") { const d = Math.min(dist2(m.pos, a.pos), dist2(m.pos, player.pos)); if (d < bd) { bd = d; best = m; } } a.tgt = best; }
    }
    let want, moving = false;
    if (a.tgt) { const d = dist2(a.pos, a.tgt.pos); if (d > a.range) want = a.tgt.pos; a.yaw = Math.atan2(-(a.tgt.pos.x - a.pos.x), -(a.tgt.pos.z - a.pos.z)); }
    else { a.slot += dt * .05; want = new THREE.Vector3(player.pos.x + Math.cos(a.slot) * 2.4, 0, player.pos.z + Math.sin(a.slot) * 2.4); if (dist2(a.pos, want) < .6) want = null; }
    if (want) {
      const d = dist2(a.pos, want), sp = Math.min(d, 6.8 * dt * (d > 6 ? 1.5 : 1));
      if (d > .05) { a.pos.x += (want.x - a.pos.x) / d * sp; a.pos.z += (want.z - a.pos.z) / d * sp; if (!a.tgt) a.yaw = Math.atan2(-(want.x - a.pos.x), -(want.z - a.pos.z)); moving = true; }
      collide(a.pos, .35);
    }
    a.cd -= dt * (rally ? 2 : 1);
    if (a.tgt && dist2(a.pos, a.tgt.pos) <= a.range + .3 && a.cd <= 0) {
      a.cd = a.every; a.hits--; a.ak = (a.ak || 0) + 1; a.model.trigger("attack");
      const m = a.tgt, em = a.el ? (m.def.weak === a.el ? 1.75 : m.def.immune === a.el ? .25 : 1) : 1, dmg = Math.max(1, Math.round(a.dmg * em * rand(.9, 1.1)));
      setTimeout(() => {
        if (m.dead) return;
        if (a.range > 3) FX.burst(m.pos, { n: 6, color: ["#ffffff", "#d8e4f0"], speed: 1.5, up: 1, size: .1, life: .4, grav: 0, y: 1.2 });   /* the alpaca spits */
        if (dealDamage(m, dmg) !== false) { dmgNum(m, dmg, em > 1, false, .7); if (em < 1) floater(m.pos, "저항 · resisted", "#aaa", true, m.model.height + .4); if (!(m.tauntUntil > clock)) m.tgtId = "zoo:" + a.id; }
      }, 280);
    }
    a.model.root.position.set(a.pos.x, 0, a.pos.z); a.model.root.rotation.y = a.yaw; a.mv = moving;
    a.model.anim(dt, { moving });
  }
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
  if (!S.compKey && S.companion === "gumiho" && (comp.healT -= dt) <= 0) { comp.healT = 16;   /* Danny 2026-10-17: was 8 s, too strong */ if (player.hp < player.maxHp) { const h = player.maxHp * (.05 + .01 * heartLvl()); player.hp = Math.min(player.maxHp, player.hp + h); floater(player.pos, "💗 +" + Math.round(h), "#ff9ec4", true, 2.4); } }
  if (!S.compKey && S.companion === "pet" && NET.role !== "guest" && (comp.tauntT -= dt) <= 0) {
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
  if (!S.compKey && S.companion === "gumiho" && dist2(comp.pos, player.pos) < 10) return 1.05;
  if (!S.compKey && S.companion === "pet" && dist2(comp.pos, t.pos) < 6) return 1.08;
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
  toast("부서진 다리 · 무너진 곳을 건너야 해요 · climb across the broken span");
}
function toStreetBridge() {
  cancelRitual(); setTarget(null); closeDialog();
  populateStreet(); player.zone = "street"; player.pos.set(BRIDGE_FOOT.x, 0, BRIDGE_FOOT.z - 1); player.yaw = 0; cam.yaw = 0;
}
// rubble used to fall from the broken arch while you crossed the bridge; switched off (Danny 2026-10-19: "a bit useless"), rubbleTick isn't called
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
  bossDown.tower = false; cancelRitual(); setTarget(null); closeDialog();
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
// Danny 2026-10-18: Korean word order is flexible, so other natural orders count too (data/order_alts.js, checked sentence by
// sentence; only used while the sentence is still the same one)
function orderAlts(w, toks) { const a = (window.SEOUL_ORDER || {})[w.id]; return a && a.s === toks.join(" ") ? a.alts.map(p => p.map(i => toks[i]).join(" ")) : []; }
function orderCheck() {
  const o = order, got = o.picked.map(k => o.tiles[k].t).join(" "), book = o.toks.join(" "), alt = got !== book && orderAlts(o.w, o.toks).includes(got), ok = got === book || alt;
  o.lock = true; $("orLine").classList.add(ok ? "ok" : "no");
  if (ok) { stat(o.w.id).c++; say([exClip(o.w.id)], { interrupt: true }); SFX.shotGood(); if (alt) $("orEn").innerHTML = `이 순서도 맞아요! · this order works too — 책에서는 · the book says: <b>${esc(book)}</b>`; }
  else { stat(o.w.id).w++; SFX.resist(); $("orEn").innerHTML = `<b>${esc(o.toks.join(" "))}</b> · ${esc(o.w.ex[1])}`; }
  setTimeout(() => {
    $("order").hidden = true; $("orLine").classList.remove("ok", "no"); order = null; paused = false;
    if (NET.role === "guest") netSend({ t: "order", ok });
    applyOrder(ok);
  }, ok ? (alt ? 3000 : 1600) : 3200);
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
  S.towerClears = (S.towerClears || 0) + 1; addHeart(10); clearReward("tower", "63빌딩");
  toast("🏆 63빌딩 클리어! 외계인 사령관을 물리쳤어요 · the 63 Building is cleared!");
  if (S.towerClears === 1) setTimeout(() => sendMail("낯선 사람", "63빌딩의 사령관을 물리쳤군요. 고마워요. 거기에서 무엇을 봤어요? 역에서 이야기해요.", "You defeated the commander of the 63 Building. Thank you. What did you see there? Let's talk at the station.",
    { cards: [{ id: pick(playWords().filter(w => S.chapters.includes(w.ch))).id, rar: 3 }], gear: ["t_core"] }), 2500);
  save();
}
const mdmg = m => m.def.dmg * m.mul * (1 + (m.grow || 0)) * (m.feebleUntil > clock ? .8 : 1);

// ---- co-op party frames: every player in your room, their health, where they are (Danny 2026-10-12) ----
const ZONE_KO = { street: "거리", station: "역", dungeon: "홍대 터널", yeouido: "여의도", tower: "63빌딩", market: "수산시장", museum: "박물관" };
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

// ---- 가현's camp on 여의도: rebuild it in 5 steps with materials (decision 32; Danny 2026-10-12 "3 yes") ----
const CAMP = { x: YD.x + 18, z: YD.z + 143, r: 16 };
const CAMP_STEPS = [
  { ko: "모닥불과 쉼터", en: "fire + shelter", gives: "캠프에서 빨리 회복 · fast healing at the camp", cost: { wood: 3, vine: 2 }, won: 5000 },
  { ko: "식량 창고", en: "food store", gives: "가현 씨가 컵밥을 팔아요 · 가현 sells 컵밥", cost: { wood: 4, stone: 3 }, won: 10000 },
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
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128; const x = cv.getContext("2d"); x.fillStyle = "#3a8f4c"; x.fillRect(0, 0, 256, 128); x.fillStyle = "#fff"; x.font = `52px "Noto Sans KR",sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("가현 캠프", 128, 66);
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
    { id: "m5", lvl: 5, ko: "회복의 북", en: "drum of renewal", icon: "🥁", cards: 2, cd: 15, mult: 0, self: true, fx: "hot", v: .04, dur: 8, beat: .3, beatR: 6, info: "2 cards · heals 4% health every second for 8 s (you, or the most hurt teammate), and every beat hits monsters within 6 m of you for 0.3×" },
    { id: "m7", lvl: 7, ko: "굿", en: "gut ritual", icon: "🎎", cards: 2, cd: 25, mult: 0, self: true, fx: "group", v: .25, r: 15, info: "2 cards · heals you and every teammate within 15 m for 25%" },
    { id: "m9", lvl: 9, ko: "귀신 쫓기", en: "exorcism", icon: "👻", cards: 2, cd: 10, mult: 3.5, noHit: true, fire: true, burn: { mult: 3.5, dur: 6 }, spread: 4, info: "2 cards · burns the target and every monster within 4 m of it: 3.5× damage over 6 s, counts as 불" },
    { id: "m11", lvl: 11, ko: "방울 소리", en: "bell of fear", icon: "🔔", cards: 2, cd: 30, mult: 0, self: true, fx: "fear", r: 8, dur: 3, hit: 1.2, info: "2 cards · 1.2× damage to every monster within 8 m, and they run away for 3 s (bosses only take the damage)" },
    { id: "m13", lvl: 13, ko: "수호 부적", en: "guardian charm", icon: "🛡", cards: 3, cd: 20, mult: 0, self: true, fx: "absorb", v: .25, dur: 10, info: "3 cards · a shield that soaks up 25% of max health for 10 s (you, or the most hurt teammate)" },
    { id: "m15", lvl: 15, ko: "작두 타기", en: "walking the blades", icon: "🗡", cards: 3, cd: 90, mult: 0, self: true, fx: "invuln", dur: 4, v: .2, info: "3 cards · nothing can hurt you for 4 s, and you heal 20%" },
    { id: "m17", lvl: 17, ko: "천신 강림", en: "descent of the sky god", icon: "☀", cards: 3, cd: 20, mult: 4.5, fire: true, splash: { r: 6, mult: 2 }, info: "3 cards · a huge blast of holy fire: 4.5× on the target and 2× to everything within 6 m, counts as 불" },
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
    { id: "a9", lvl: 9, ko: "후퇴 사격", en: "disengage shot", icon: "↩", cards: 2, cd: 12, mult: 2.5, leap: 8, stun: 1.5, info: "2 cards · leap 8 m back and shoot for 2.5×; the target is stunned for 1.5 s, so it can't follow" },   /* Danny 2026-10-19: was 1.2× / 15 s, no better than a basic attack */
    { id: "a11", lvl: 11, ko: "불화살", en: "fire arrow", icon: "🔥", cards: 2, cd: 10, mult: 1.2, fire: true, burn: { mult: 1.2, dur: 6 }, info: "2 cards · 1.2× now plus a 6 s burn, counts as 불" },
    { id: "a13", lvl: 13, ko: "그물 화살", en: "net arrow", icon: "🕸", cards: 3, cd: 18, mult: 2.5, fx: "root", dur: 4, r: 5, info: "3 cards · 2.5× damage, and the net roots the target and every monster within 5 m for 4 s (bosses are only slowed)" },   /* Danny 2026-10-19: was 5 s root, no damage, 25 s */
    { id: "a15", lvl: 15, ko: "매의 눈", en: "hawk eye", icon: "🦅", cards: 3, cd: 60, mult: 0, self: true, fx: "hawk", dur: 10, info: "3 cards · for 10 s your basic attack is ready twice as fast and reaches 5 m further" },
    { id: "a17", lvl: 17, ko: "화살비", en: "rain of arrows", icon: "🌧", cards: 3, cd: 25, mult: .9, fx: "rain", r: 6, waves: 4, info: "3 cards · a 6 m circle around the target: 4 waves of 0.9× over 4 s" },
    { id: "a19", lvl: 19, ko: "신궁의 한 발", en: "the divine shot", icon: "✴", cards: 4, cd: 45, mult: 6, range: 30, pierce: true, info: "4 cards · 6× damage from up to 30 m; ignores immunity" },
  ],
  zoo: [
    { id: "z5", lvl: 5, ko: "원소 간식", en: "element treat", icon: "🍖", cards: 2, cd: 15, mult: 0, self: true, treat: { heal: .25 }, info: "2 cards · every animal heals 25% and takes a random element (불 물 나무 쇠 흙): ×1.75 against monsters weak to it, ×0.25 against ones immune to it, otherwise normal. Feed again to roll again." },   /* was the fox (Danny 2026-10-19: too like the dog and wolf) */
    { id: "z7", lvl: 7, ko: "늑대 부르기", en: "call a wolf", icon: "🐺", cards: 2, cd: 5, mult: 0, self: true, summon: "wolf", info: "2 cards · a wolf: 5 bites of 0.6×, 30% of your health" },
    { id: "z9", lvl: 9, ko: "얼룩말 부르기", en: "call a zebra", icon: "🦓", cards: 2, cd: 5, mult: 0, self: true, summon: "zebra", info: "2 cards · a zebra: 5 kicks of 0.7×, 35% of your health" },
    { id: "z11", lvl: 11, ko: "사슴 부르기", en: "call a deer", icon: "🦌", cards: 3, cd: 6, mult: 0, self: true, summon: "deer", info: "3 cards · a deer: 5 headbutts of 0.75×, 35% of your health" },
    { id: "z13", lvl: 13, ko: "알파카 부르기", en: "call an alpaca", icon: "🦙", cards: 3, cd: 6, mult: 0, self: true, summon: "alpaca", info: "3 cards · an alpaca: spits from 7 m, 5 times 0.7×, 45% of your health" },
    { id: "z15", lvl: 15, ko: "수사슴 부르기", en: "call a stag", icon: "🦌", cards: 3, cd: 7, mult: 0, self: true, summon: "stag", info: "3 cards · a stag: 5 headbutts of 0.95×, 45% of your health" },
    { id: "z17", lvl: 17, ko: "황소 부르기", en: "call a bull", icon: "🐂", cards: 3, cd: 8, mult: 0, self: true, summon: "bull", info: "3 cards · a bull: 5 charges of 1.2×, 60% of your health" },
    { id: "z19", lvl: 19, ko: "총공격", en: "all-out whistle", icon: "📯", cards: 3, cd: 40, mult: 0, self: true, rally: { dur: 10 }, info: "3 cards · for 10 s every animal of yours attacks twice as fast" },
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
    if (announce) { toast(`새 스킬! ${s.icon} ${s.ko} · ${s.en} — 카드 ${SKILL_DECK}장을 넣으세요 (K) · fill its deck with ${SKILL_DECK} cards`); logChat("system", `📖 새 스킬 · ${s.ko}`); }
  }
}
function useBar(i) { const id = (S.bar || [])[i]; if (!id) { toast(`빈 칸 · empty slot (${keyName(SET.keys.book)} = 스킬 북)`); return; } startRitual(id); }

// ---- effects ----
const selfTarget = () => ({ pos: player.pos, missed: new Set(), dead: false, def: {}, model: { height: 2 }, self: true });
const CC_TEXT = { stun: "기절 · stunned", fear: "도망쳐요! · fleeing", root: "묶임 · rooted", taunt: "도발! · taunted" };
function applyCC(m, kind, dur, by = myId()) {
  if (!m || m.dead) return;
  if (perk("teacher")) dur *= 1.3;
  if (NET.role === "guest") netSend({ t: "cc", mid: m.id, kind, dur });
  if (m.def.boss) { if (kind === "fear") { floater(m.pos, "면역 · immune", "#aaa", true, m.model.height); return; } if (kind === "root") { m.slowUntil = clock + dur; floater(m.pos, "느려짐 · slowed", "#9ec8ff", true, m.model.height); return; } if (kind === "stun") dur = Math.min(dur, 1); }
  m[kind + "Until"] = clock + dur;
  if (kind === "stun" && m.def.armor) m.flippedUntil = clock + dur + 1;
  if (kind === "stun") { m.charging = 0; m.slamT = 0; }
  if (kind === "taunt") { m.tgtId = by; m.state = "chase"; m.feebleUntil = clock + dur; }
  floater(m.pos, CC_TEXT[kind], "#ffd23d", true, m.model.height);
  ccFx(m, kind);
}
function hitT(m, dmg) { if (m.dead) return; if (dealDamage(m, dmg) !== false) { FX.impact(m.pos, FX.CLASS_COL[S.cls] || FX.CLASS_COL.mudang, .8); dmgNum(m, dmg, false, false, .8); } }
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
    case "hot": { const a = hurtAlly(20); if (a) { sendAlly(a.id, "hot", sk.v * share, sk.dur); toast(`🥁 → ${a.nm}`); } else applyAlly({ fx: "hot", v: sk.v * share, dur: sk.dur }); SFX.heal();
      if (sk.beat) player.drum = { until: clock + sk.dur, next: clock + 1, r: sk.beatR, hit: m => calc(m, sk.beat) };
      return true; }
    case "group": { applyAlly({ fx: "heal", v: sk.v * share }); for (const r of remotes.values()) if (!r.dead && r.zone === player.zone && dist2(r.pos, me) < sk.r) sendAlly(r.id, "heal", sk.v * share); makeRing(me.clone(), sk.r, .5, "#7bdc86"); return true; }
    case "fear": { face(); for (const m of near(me, sk.r)) { applyCC(m, "fear", sk.dur * share); if (sk.hit) { const { dmg } = calc(m, sk.hit); if (dealDamage(m, dmg) !== false) dmgNum(m, dmg, false, false, .8); } } makeRing(me.clone(), sk.r, .4, "#ffd23d"); SFX.resist(); return true; }
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
    case "root": { face(); shootSpell(t, () => {
      if (sk.mult) { const { dmg, weak } = calc(t, sk.mult); if (dealDamage(t, dmg) !== false) dmgNum(t, dmg, weak, false, 1.2); }
      const hit = sk.r ? near(t.pos, sk.r) : [t]; if (!hit.includes(t)) hit.push(t);
      for (const m of hit) applyCC(m, "root", sk.dur * share);
      if (sk.r) FX.ring?.(t.pos, { color: "#c8b48a", r: sk.r, life: .6 });
    }); return true; }
    case "hawk": { player.hawkUntil = clock + sk.dur; floater(player.pos, "🦅 매의 눈 · hawk eye", "#ffd23d", false, 3.2); return true; }
    case "rain": { face(); const at = t.pos.clone(); makeRing(at, sk.r, .5, "#ffd23d"); rains.push({ at, waves: sk.waves, next: .6, calc, r: sk.r }); SFX.shot(); return true; }
  }
  return false;
}
const rains = [];
function skillTick(dt) {
  for (let i = dots.length - 1; i >= 0; i--) { const d = dots[i]; if (d.t.dead) { dots.splice(i, 1); continue; } if ((d.next -= dt) > 0) continue; d.next += 1; d.left--; FX.burst(d.t.pos, { n: 8, color: FX.EL_COL.fire, speed: 2.5, up: 1.5, size: .14, life: .6, grav: -2 }); if (dealDamage(d.t, d.per) !== false) floater(d.t.pos, `-${d.per} 🔥`, "#ff8a3a", true, d.t.model.height); if (d.left <= 0) dots.splice(i, 1); }
  for (let i = rains.length - 1; i >= 0; i--) { const r = rains[i]; if ((r.next -= dt) > 0) continue; r.next = 1; r.waves--; for (const m of monsters) if (!m.dead && m.zone === player.zone && dist2(m.pos, r.at) < r.r) hitT(m, r.calc(m).dmg); SFX.shotGood(); if (r.waves <= 0) rains.splice(i, 1); }
  if (player.storm) { const s = player.storm; if (clock > s.until || player.dead) player.storm = null; else if ((s.next -= dt) <= 0) { s.next = 1; for (const m of monsters) if (!m.dead && m.zone === player.zone && dist2(m.pos, player.pos) < s.r) hitT(m, s.calc(m).dmg); player.attackAnim = 1; SFX.dash(); } }
  if (player.hot) { if (clock > player.hot.until) player.hot = null; else player.hp = Math.min(player.maxHp, player.hp + player.maxHp * player.hot.v * dt); }
  if (player.drum) {
    if (clock > player.drum.until || player.dead) player.drum = null;
    else if (clock >= player.drum.next) { player.drum.next += 1; FX.ring(player.pos, { color: "#9be6a5", r: player.drum.r, life: .45 }); snd("lowboom", .2, 1.3);
      for (const m of monsters) if (!m.dead && !m.caged && m.zone === player.zone && dist2(m.pos, player.pos) <= player.drum.r) { const { dmg } = player.drum.hit(m); if (dealDamage(m, dmg) !== false) dmgNum(m, dmg, false, false, .6); } }
  }
  if (player.absorb && clock > player.absorb.until) player.absorb = null;
  if (!!buffOn("vigor") !== !!player.vigorOn) { player.vigorOn = !!buffOn("vigor"); recalcMax(); }
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
      + `<div class="tx"><b>${s.ko}</b> <span class="en">${s.en}</span><p>${k === "basic" ? (skillDef("basic").info || "1 card · 1× damage") : s.info}</p></div>`
      + `<div class="st"><span>Lv ${s.lvl}</span><span>${locked ? "🔒" : blk ? `카드 ${n}/${deckSize(k)}` : "준비됨 · ready"}</span><span>⌨ ${fixed ? keyName(SET.keys[k]) : barKeyLabel(k)}</span>${locked ? "" : `<button data-deck="${k}">덱 · deck</button>`}</div></div>`;
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
const armorMul = m => m.def.plates ? 1 - .12 * (m.plates ?? 4) : m.def.armor && !(m.flippedUntil > clock) ? 1 - m.def.armor : 1;
// 문어 왕: tentacle sweeps in lines, arms come off as it loses health, ink while it asks its question
const lineMat = new THREE.MeshBasicMaterial({ color: "#ff3a2a", transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false });
const lines = [];
function makeLine(x, z, ang, len, w, tele, dmg, lv) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, len), lineMat); mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = ang;
  mesh.position.set(x + Math.sin(ang) * len / 2, .06, z + Math.cos(ang) * len / 2); scene.add(mesh);
  lines.push({ mesh, x, z, ang, len, w, t: 0, tele, dmg, lv });
}
function lineTick(dt) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i]; l.t += dt; l.mesh.material.opacity = .2 + .4 * Math.min(1, l.t / l.tele);
    if (l.t >= l.tele && !l.hit) {
      l.hit = true; SFX.slam(); lineFx(l);
      const dx = player.pos.x - l.x, dz = player.pos.z - l.z, along = dx * Math.sin(l.ang) + dz * Math.cos(l.ang), side = Math.abs(dx * Math.cos(l.ang) - dz * Math.sin(l.ang));
      if (!player.dead && isDun(player.zone) && along > 0 && along < l.len && side < l.w / 2) hurt(l.dmg, { lvl: l.lv }); else if (along > -2 && along < l.len + 2 && side < l.w + 3) floater(player.pos, "피했다! · dodged", "#9be6a5", true);
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
function syncDealer() { const d = npcs.find(n => n.kind === "dealer"); if (d) d.model.root.visible = !!mk.dealer; }
const DEALER_PRICE = [0, 0, 120000, 350000];
function dealerTalk(n) {
  if (!mk.offers) {
    const chs = S.chapters.length ? S.chapters : bookChapters().map(c => c.id), pool = bookWords().filter(w => chs.includes(w.ch)).map(w => w.id);
    const owned = new Set(S.cards.map(c => c.id)), fresh = pool.filter(id => !owned.has(id));
    mk.offers = [2, 3].map(rar => ({ id: pick(fresh.length ? fresh : pool), rar, mod: rollMod(rar), sold: false }));
  }
  const opts = mk.offers.map((o, i) => o.sold ? null : { ko: `[${RARITY[o.rar].ko}] ${WORD[o.id].kr} · ${DEALER_PRICE[o.rar].toLocaleString("en-US")}원`, en: `${WORD[o.id].en} · ${modText(o)}`, act: () => {
    if (S.money < DEALER_PRICE[o.rar]) { endWith(n, "t_short"); return; }
    S.money -= DEALER_PRICE[o.rar]; o.sold = true; S.dealerBuys = (S.dealerBuys || 0) + 1; S.cards.push({ uid: newUid(), id: o.id, rar: o.rar, mod: o.mod }); SFX.pickup(); save();
    FX.pillarFx(player.pos, RARITY[o.rar].c); toast(`[${RARITY[o.rar].ko}] ${WORD[o.id].kr} → 가방 (K)`); endWith(n, "t_buy");
  } }).filter(Boolean);
  opts.push({ plr: "p_look", act: () => endWith(n, "q_bye") });
  showLine(n, mk.offers.every(o => o.sold) ? "q_gone" : "q_hello", opts);
}
function syncBoards() { (MARKET.boardMeshes || []).forEach((m, i) => { m.material.color.set(mk.boards[i] === 1 ? "#9be6a5" : mk.boards[i] === -1 ? "#555555" : "#ffffff"); }); }
function resetMarket() {
  for (let i = monsters.length - 1; i >= 0; i--) { const m = monsters[i]; if (m.zone !== "market") continue; scene.remove(m.model.root); m.plate.remove(); monsters.splice(i, 1); if (target === m) setTarget(null); }
  for (const sp of mkPoints) { sp.mon = null; spawnMonster(sp); }
  mk.boards = [0, 0, 0]; syncBoards();
  mk.dealer = Math.random() < .5; mk.offers = null; syncDealer();
}
function toMarket() {
  bossDown.market = false; cancelRitual(); setTarget(null); closeDialog();
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
  S.marketClears = (S.marketClears || 0) + 1; addHeart(10); clearReward("market", "노량진 수산시장");
  toast("🏆 수산시장 클리어! 문어 왕을 물리쳤어요 · the fish market is cleared!");
  if (S.marketClears === 1) setTimeout(() => sendMail("유현 선생님", "문어 왕을 물리쳤다고 들었어요. 정말 대단해요! 학생들이 이걸 꼭 드리고 싶대요.", "I heard you defeated the octopus king. Amazing! My students really wanted you to have this.",
    { cards: [{ id: pick(bookWords().filter(w => S.chapters.includes(w.ch))).id, rar: 3 }], gear: ["t_ink"], won: 30000 }), 2500);
  save();
}
// 유현 선생님's list: the small clue (decision 19)
function teacher2Talk(n) {
  const opts = [];
  if (S.sawList) opts.push({ ko: "(명단 다시 보기 · read the list again)", en: "", act: readList });
  opts.push({ ko: "(대화 끝내기)", en: "leave", act: closeDialog });
  showLine(n, "n_hello", opts);
}
function readList() { showLine({ name: "실종자 명단 · list of the missing" }, "o_list", [{ ko: "(닫기)", en: "close", act: closeDialog }]); if (!S.sawList) { S.sawList = true; save(); } }
function buyBuffFood(n, k) {
  const f = BUFF_FOODS[k];
  if (S.money < f.price) { endWith(n, "r_short"); return; }
  S.money -= f.price; SFX.pickup(); eat(f); save(); FX.pillarFx(player.pos, f.buff === "power" ? "#ff9a3a" : "#ff6a6a");
  toast(`${f.ko} ${won(f.price)} · ${BUFFS[f.buff].ko} · 10분 · 10 min`); endWith(n, "k_thanks");
}
function cupbapTalk(n) {
  showLine(n, "c_hello", [{ plr: "p_samgye", act: () => buyBuffFood(n, "samgye") }, { plr: "p_cupbap", act: () => { if (S.money < 3000) { endWith(n, "r_short"); return; } S.money -= 3000; S.snacks = S.snacks || {}; S.snacks.cupbap = (S.snacks.cupbap || 0) + 1; SFX.pickup(); save(); toast(`컵밥 ₩3,000 → 소모품 · ${keyName(SET.keys.food)}로 먹기`); endWith(n, "k_thanks"); } }, { plr: "p_leave", act: () => endWith(n, "k_thanks") }]);
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
    if (st.online) { f.nm = st.nm || f.nm; f.info = { lvl: st.lvl, cls: st.cls, zone: st.zone, n: st.n, ms: st.ms, lr: st.lr, bk: st.bk }; f.seen = Date.now(); if (!was && !frFirst) { toast(`👥 ${f.nm || f.code} 님이 접속했어요 · is online (${keyName(SET.keys.friends)})`); logChat("system", `👥 ${f.nm || f.code} online`); } }
  });
  frFirst = false; frBusy = false; save(); if (!$("friendsView").hidden) drawFriends();
}
setInterval(() => { if (started && S.friends?.length) refreshFriends(); }, 60000);
function openFriends() { if (!S.cls) return; ensureFriendCode(); paused = true; showScreen("friendsView"); drawFriends(); refreshFriends(); }
// word leaderboard: me (live) + every friend's last numbers, most mastered words first
const wordCounts = () => { const c = { learned: 0, mastered: 0 }; for (const id in S.stats) { const k = mastery(id).k; if (k === "learned") c.learned++; else if (k === "mastered") c.mastered++; } return c; };
function drawBoard() {
  const wc = wordCounts(), has = f => f.info && f.info.ms !== undefined;
  const rows = [{ me: true, nm: S.name || "나", lvl: S.level, ms: wc.mastered, lr: wc.learned + wc.mastered }, ...S.friends.filter(has).map(f => ({ nm: f.nm || f.code, lvl: f.info.lvl, ms: f.info.ms, lr: f.info.lr, at: f.seen, on: f.online }))];
  rows.sort((a, b) => b.ms - a.ms || b.lr - a.lr || b.lvl - a.lvl);
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 2 ? "지금 · now" : m < 60 ? `${m}분 전 · ${m} min ago` : m < 1440 ? `${Math.round(m / 60)}시간 전 · ${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)}일 전 · ${Math.round(m / 1440)} d ago`; };
  const waiting = S.friends.filter(f => !has(f)).length;
  $("frBoard").innerHTML = `<h3>단어 순위 · word leaderboard</h3><div class="tw"><table><thead><tr><th>#</th><th>이름 · name</th><th>Lv</th><th>마스터 · mastered</th><th>배운 단어 · learned</th><th>기준 · as of</th></tr></thead><tbody>`
    + rows.map((r, i) => `<tr${r.me ? ' class="me"' : ""}><td>${i + 1}</td><td>${esc(r.nm)}${r.me && S.name ? " (나)" : ""}</td><td>${r.lvl}</td><td><b>${r.ms}</b></td><td>${r.lr}</td><td>${r.me ? "지금 · now" : (r.on ? "🟢 " : "") + ago(r.at)}</td></tr>`).join("") + "</tbody></table></div>"
    + (waiting ? `<p class="fine">${waiting}명은 아직 숫자가 없어요. 다음에 접속하면 나와요 · ${waiting} friend(s) appear here the next time they're online.</p>` : "");
}
function drawFriends() {
  drawBoard();
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

// ---- dungeon sets (Danny 2026-10-17: "the reward should be more obvious and more satisfying"; shop gear is too cheap to compete) ----
// Every boss drops a piece of its dungeon's set: one piece already beats anything in the shops; a second clear always gives the
// OTHER piece (never a duplicate), and wearing both adds the set bonus. After that a clear gives won + materials.
const SETS = {
  tunnel: { ko: "도깨비 대장 세트", en: "goblin chief set", where: "홍대 터널", w: "sw_tunnel", a: "sa_tunnel", bonus: { dmg: .04, hp: .04 }, won: 20000, xp: 200, mat: "horn" },
  tower: { ko: "사령관 세트", en: "commander set", where: "63빌딩", w: "sw_tower", a: "sa_tower", bonus: { dmg: .05, hp: .05 }, won: 40000, xp: 450, mat: "metal" },
  market: { ko: "문어 왕 세트", en: "octopus king set", where: "노량진 수산시장", w: "sw_market", a: "sa_market", bonus: { dmg: .06, ls: .04 }, won: 60000, xp: 800, mat: "shell" },
  museum: { ko: "장군 세트", en: "general's set", where: "국립중앙박물관", w: "sw_museum", a: "sa_museum", bonus: { dmg: .08, hp: .08 }, won: 90000, xp: 1200, mat: "iron" },
};
WEAPON_MULT.push(1.6, 1.75, 1.9, 2.1);
Object.assign(GEAR, {
  sw_tunnel: { slot: "weapon", tier: 3, set: "tunnel", price: 120000, names: { mudang: "도깨비불 방울", geomgaek: "도깨비 대장검", gungsu: "도깨비 뿔활" } },
  sa_tunnel: { slot: "armor", set: "tunnel", ko: "도깨비 가죽 갑옷", en: "goblin-hide armour", hp: .25, price: 100000 },
  sw_tower: { slot: "weapon", tier: 4, set: "tower", price: 180000, names: { mudang: "외계 수정 방울", geomgaek: "플라즈마 검", gungsu: "외계 합금 활" } },
  sa_tower: { slot: "armor", set: "tower", ko: "외계 합금 갑옷", en: "alien-alloy armour", hp: .32, price: 150000 },
  sw_market: { slot: "weapon", tier: 5, set: "market", price: 240000, names: { mudang: "용왕의 방울", geomgaek: "청새치 검", gungsu: "고래수염 활" } },
  sa_market: { slot: "armor", set: "market", ko: "먹물 비단 갑옷", en: "ink-silk armour", hp: .40, price: 200000 },
  sw_museum: { slot: "weapon", tier: 6, set: "museum", price: 320000, names: { mudang: "천신의 금방울", geomgaek: "장군의 보검", gungsu: "신기전 활" } },
  sa_museum: { slot: "armor", set: "museum", ko: "장군의 두정갑", en: "general's studded armour", hp: .50, price: 280000 },
});
// item icons (Danny 2026-10-17: "so you can actually see if an item is a weapon, armour or a trinket")
function gearQuality(g) { const d = GEAR[g]; if (d.set) return "set"; if (d.slot === "trinket") return "trinket"; const t = d.slot === "weapon" ? d.tier : +g.slice(1); return ["basic", "good", "great"][t] || "basic"; }
const QCOL = { basic: ["#5a5650", "#8a857c"], good: ["#2f6a3a", "#5cc46a"], great: ["#24508a", "#5aa8ff"], trinket: ["#4a2f7a", "#b47aff"], set: ["#7a5410", "#ffd23d"] };
function gearIcon(g, cls = "gi") {
  const d = GEAR[g], [bg, fg] = QCOL[gearQuality(g)], k = d.slot === "weapon" ? (S.cls || "geomgaek") : d.slot;
  const shape = {
    geomgaek: `<path d="M34 8 L38 10 L18 30 L15 27 Z" fill="${fg}"/><path d="M12 26 L22 36 M14 31 L9 36" stroke="${fg}" stroke-width="3" stroke-linecap="round"/>`,
    gungsu: `<path d="M14 8 Q36 24 14 40" fill="none" stroke="${fg}" stroke-width="3"/><path d="M14 8 L14 40" stroke="#f2ede4" stroke-width="1.2"/><path d="M10 24 L38 24 M33 20 L38 24 L33 28" stroke="#f2ede4" stroke-width="2" fill="none"/>`,
    mudang: `<path d="M24 8 C14 8 12 20 11 32 L37 32 C36 20 34 8 24 8 Z" fill="${fg}"/><circle cx="24" cy="36" r="3.5" fill="${fg}"/><path d="M24 4 L24 9" stroke="${fg}" stroke-width="3"/><path d="M15 24 L33 24" stroke="${bg}" stroke-width="2"/>`,
    armor: `<path d="M15 9 L20 7 Q24 12 28 7 L33 9 L40 15 L36 21 L34 19 L34 40 L14 40 L14 19 L12 21 L8 15 Z" fill="${fg}"/><path d="M18 24 L30 24 M18 30 L30 30 M18 36 L30 36" stroke="${bg}" stroke-width="2"/>`,
    trinket: `<path d="M14 8 Q24 22 34 8" fill="none" stroke="#e8d8a8" stroke-width="2"/><circle cx="24" cy="29" r="10" fill="${fg}"/><circle cx="24" cy="29" r="4.5" fill="${bg}"/>`,
  }[k];
  return `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true"><rect x="1" y="1" width="46" height="46" rx="9" fill="${bg}" stroke="${fg}" stroke-width="2"/>${shape}</svg>`;
}
const bonusTxt = b => [b.dmg && `공격력 +${Math.round(b.dmg * 100)}% (damage)`, b.hp && `체력 +${Math.round(b.hp * 100)}% (max health)`, b.ls && `흡혈 ${Math.round(b.ls * 100)}% (lifesteal)`].filter(Boolean).join(", ");
function setBonus(k) {
  const w = itemBy(S.equip?.weapon), a = itemBy(S.equip?.armor), sw = w && GEAR[w.g].set;
  return sw && a && GEAR[a.g].set === sw ? SETS[sw].bonus[k] || 0 : 0;
}
const MARKET_CARDS = 100;   /* Danny 2026-10-18: a guard before the fish market wants cards */
const ownsG = g => S.items.some(i => i.g === g);
let bossSnap = null;
const lootSnap = () => ({ cards: S.cards.length, items: S.items.length, mats: { ...(S.mats || {}) }, stones: S.rerollStones || 0, scrolls: S.scrolls || 0 });
function lootRows() {
  const b = bossSnap; bossSnap = null; if (!b) return [];
  const rows = [];
  for (const it of S.items.slice(b.items)) rows.push({ iconHtml: gearIcon(it.g, "gi rw"), ko: gearName(it.g), en: `${SLOTS[GEAR[it.g].slot]} · ${gearInfo(it.g)}` });
  for (const c of S.cards.slice(b.cards)) { const R = RARITY[c.rar]; rows.push({ icon: "🃏", ko: `${WORD[c.id]?.kr || c.id} · ${R.ko} 카드`, en: `${R.en} card · ${WORD[c.id]?.en || ""}`, color: R.c }); }
  for (const k in S.mats || {}) { const n = (S.mats[k] || 0) - (b.mats[k] || 0); if (n > 0) rows.push({ icon: "🪨", ko: `${MATS[k].ko} ×${n}`, en: `${MATS[k].en} (smith upgrades)` }); }
  if ((S.rerollStones || 0) > b.stones) rows.push({ icon: "🔮", ko: `다시 굴리기 돌 ×${S.rerollStones - b.stones}`, en: "reroll stones" });
  if ((S.scrolls || 0) > b.scrolls) rows.push({ icon: "📜", ko: `번역 두루마리 ×${S.scrolls - b.scrolls}`, en: "translation scroll" });
  return rows;
}
const FIRST_FLAG = { tunnel: "dunClears", tower: "towerClears", market: "marketClears", museum: "museumClears" };
function clearReward(key, title) {
  const loot = lootRows();
  const st = SETS[key], miss = ["w", "a"].filter(p => !ownsG(st[p])); S.setsGiven = S.setsGiven || {}; S.setsGiven[key] = true;
  const rows = [];
  if (miss.length) {
    const it = addItem(st[pick(miss)]), d = GEAR[it.g], done = ["w", "a"].every(p => ownsG(st[p]));
    rows.push({ big: true, iconHtml: gearIcon(it.g, "gi rw lg"), ko: gearName(it.g), en: `${SLOTS[d.slot]} · ${gearInfo(it.g)}`, equip: it.uid,
      note: done ? `${st.ko} 완성! 둘 다 입으면 · set complete — wear both: ${bonusTxt(st.bonus)}` : `${st.ko} 1/2 · 한 번 더 깨면 나머지 조각이 나와요 · clear it again for the other piece (both: ${bonusTxt(st.bonus)})` });
  } else {
    S.mats = S.mats || {}; S.mats[st.mat] = (S.mats[st.mat] || 0) + 3;
    rows.push({ big: true, icon: "🧰", ko: `${MATS[st.mat].ko} ×3`, en: `${MATS[st.mat].en} for the smith's upgrades`, note: `${st.ko}는 이미 다 있어요 · you already have the whole set` });
  }
  S.money += st.won; rows.push({ icon: "💰", ko: `클리어 보너스 ${won(st.won)}`, en: "clear bonus" });
  rows.push({ icon: "✨", ko: `+${st.xp} XP`, en: "clear bonus" });
  setTimeout(() => gainXp(st.xp), 400);
  if (loot.length) { rows.push({ head: "보스 전리품 · boss drops" }); rows.push(...loot); }
  if (S[FIRST_FLAG[key]] === 1) rows.push({ icon: "✉️", ko: "첫 클리어 선물이 우체통에 왔어요", en: "a first-clear present is waiting in your mailbox (station)" });
  save(); showReward(`🏆 ${title} 클리어!`, rows);
}
// your save may already have clears from before the sets: one piece per cleared dungeon comes by mail
function grantMissedSets() {
  S.setsGiven = S.setsGiven || {};
  for (const [key, flag] of [["tunnel", "dunClears"], ["tower", "towerClears"], ["market", "marketClears"]]) {
    if (!S[flag] || S.setsGiven[key]) continue;
    S.setsGiven[key] = true; const st = SETS[key];
    if (ownsG(st.w) || ownsG(st.a)) continue;
    sendMail("서울 생존자 모임", `${st.where}를 깨서 받는 보상이에요. 늦어서 미안해요! 한 번 더 깨면 나머지 조각도 받아요.`, `Your reward for clearing ${st.where}, sorry it's late! Clear it once more for the other piece of the ${st.en}.`, { gear: [st[pick(["w", "a"])]] });
  }
}
let rewardDone = null;
function showReward(title, rows, then) {
  cancelRitual(); closeDialog(); rewardDone = then || null;
  $("rwTitle").textContent = title;
  $("rwList").innerHTML = rows.map((r, i) => r.head ? `<div class="rwHead">${esc(r.head)}</div>` : `<div class="rwRow${r.big ? " hero" : ""}"${r.color ? ` style="border-color:${r.color}"` : ""}><span class="ic">${r.iconHtml || r.icon}</span><div class="tx"><b>${esc(r.ko)}</b><span>${esc(r.en || "")}</span>${r.note ? `<p>${esc(r.note)}</p>` : ""}</div>${r.equip ? `<button data-eq="${r.equip}">지금 장착 · equip</button>` : ""}</div>`).join("");
  $("rwList").querySelectorAll("[data-eq]").forEach(b => b.onclick = () => { const it = itemBy(b.dataset.eq); if (!it) return; S.equip[GEAR[it.g].slot] = it.uid; recalcMax(); save(); SFX.reload(); b.textContent = "장착했어요 ✓ · equipped"; b.disabled = true; });
  paused = true; showScreen("rewardView"); SFX.kill();
}
function closeReward() { showScreen(null); paused = false; const f = rewardDone; rewardDone = null; if (f) setTimeout(f, 300); }

// ---- 용산 + the national museum (Danny 2026-10-17: area 5 = B, Lv 15-18, quiz room = verb endings, story = the big reveal, 한동 = a shop and a quest) ----
// 청자 도깨비: bursts into shards when it breaks (the host makes the ring; guests get it as a slam)
function burstAt(m) {
  const b = m.def.burst; if (!b) return;
  const at = new THREE.Vector3(m.pos.x, 0, m.pos.z), dmg = b.dmg * m.mul, zone = m.zone, lv = m.lvl, bc = b.col || ["#8fc4b0", "#5f9a86", "#e8fff4"];
  makeRing(at, b.radius, b.tele, bc[0]);
  netSend({ t: "sl", x: at.x, z: at.z, r: b.radius, tele: b.tele, dmg, lv });
  if (player.zone === zone && dist2(player.pos, at) < b.radius + 3) floater(at, "깨져요! 피하세요 · it's bursting — step away!", "#9fe0c8", false, 2.4);
  FX.burst(at, { n: 12, color: [bc[0], bc[1]], speed: 3, size: .16, life: .6, additive: false });
  setTimeout(() => { SFX.slam(); snd("glass", .9, .8); snd("glass", .6, 1.2); FX.burst(at, { n: 50, color: bc, speed: 12, up: .6, size: .22, life: .9, grav: 12, additive: false, flat: true, y: .8 }); FX.ring(at, { color: "#9fe0c8", r: b.radius * 1.2 }); FX.shake(.3); if (!player.dead && player.zone === zone && dist2(player.pos, at) < b.radius) hurt(dmg, { lvl: lv }); }, b.tele * 1000);
}
// 선사관: the painted hunters throw spears across the room
let caveT = 3, caveTold = false;
function caveTick(dt) {
  if (player.zone !== "museum" || player.dead || !inRect(player.pos, MUSEUM.caveRect)) { caveT = 3; return; }
  if ((caveT -= dt) > 0) return; caveT = 4.5;
  const r = MUSEUM.caveRect;
  for (let k = 0; k < 2; k++) {
    const fromN = Math.random() < .5, x = k === 0 ? player.pos.x + rand(-1, 1) : rand(r.x0 + 3, r.x1 - 3);
    makeLine(x, fromN ? r.z0 : r.z1, fromN ? 0 : Math.PI, r.z1 - r.z0, 1.6, 1.3, 26, 17);
  }
  if (!caveTold) { caveTold = true; toast("벽화의 사냥꾼들이 창을 던져요! 빨간 선 밖으로 · the painted hunters throw spears — leave the red lines!"); }
}
// 깨어난 장군: 신기전 volleys in lines, a wall of shields now and then, four armour plates (each solved scroll breaks one)
function generalTick(m, dt, tg) {
  const v = m.def.volley; if (!v || !tg) return;
  const maxP = 4 - mu.scrolls.filter(b => b === 1).length;
  const plates = Math.max(0, Math.min(maxP, Math.ceil(m.hp / m.maxHp * 5) - 1));
  if (m.plates !== undefined && plates < m.plates) floater(m.pos, "갑옷이 깨졌어요! · an armour plate breaks!", "#ffd23d", false, m.model.height);
  m.plates = plates;
  m.wallCd = (m.wallCd ?? 16) - dt;
  if (m.wallCd <= 0) { m.wallCd = m.def.wall.every; m.shieldUntil = clock + m.def.wall.dur; SFX.charge(); if (player.zone === m.zone) toast("방패 벽! 5초만 피하세요 · a wall of shields — dodge for 5 s"); }
  m.volleyCd = (m.volleyCd ?? 5) - dt; if (m.volleyCd > 0) return;
  m.volleyCd = v.every; m.attackAnim = 1;
  const n = v.n + (m.hp < m.maxHp * .5 ? 2 : 0), base = Math.atan2(tg.pos.x - m.pos.x, tg.pos.z - m.pos.z);
  for (let k = 0; k < n; k++) {
    const ang = base + (k - (n - 1) / 2) * .3;
    makeLine(m.pos.x, m.pos.z, ang, v.len, v.w, v.tele, v.dmg * m.mul, m.lvl);
    netSend({ t: "ln", x: m.pos.x, z: m.pos.z, ang, len: v.len, w: v.w, tele: v.tele, dmg: v.dmg * m.mul, lv: m.lvl });
  }
  if (tg.id === myId()) toast("신기전! 빨간 선 밖으로 · fire arrows — get out of the red lines!");
}
// the museum dungeon
const muPoints = MUSEUM.spawns.map(s => ({ ...s, zone: "museum", mon: null, respawnAt: 0 }));
const mu = { scrolls: [0, 0, 0] };
function syncScrolls() { (MUSEUM.scrollMeshes || []).forEach((m, i) => { m.material.color.set(mu.scrolls[i] === 1 ? "#9be6a5" : mu.scrolls[i] === -1 ? "#555555" : "#ffffff"); }); }
function resetMuseum() {
  for (let i = monsters.length - 1; i >= 0; i--) { const m = monsters[i]; if (m.zone !== "museum") continue; scene.remove(m.model.root); m.plate.remove(); monsters.splice(i, 1); if (target === m) setTarget(null); }
  for (const sp of muPoints) { sp.mon = null; spawnMonster(sp); }
  mu.scrolls = [0, 0, 0]; syncScrolls();
}
function toMuseum() {
  bossDown.museum = false; cancelRitual(); setTarget(null); closeDialog(); caveTold = false;
  if (NET.role === "guest") netSend({ t: "enterU" }); else if (!someoneIn("museum", myId())) resetMuseum();
  player.zone = "museum"; player.pos.set(MUSEUM.entry.x, 0, MUSEUM.entry.z); player.yaw = -Math.PI / 2; cam.yaw = -Math.PI / 2; player.vel = null;
  toast("국립중앙박물관 · 밤이 되면 유물이 깨어나요 · at night the relics wake up");
}
function museumToYd() { cancelRitual(); setTarget(null); closeDialog(); player.zone = "yeouido"; player.pos.set(YEOUIDO.museumOut.x, 0, YEOUIDO.museumOut.z); player.yaw = Math.PI; cam.yaw = Math.PI; player.vel = null; }
// 훈민정음실: pick the right verb form for the time word (지금 / 어제 / 내일 …). Past questions offer the other tenses as wrong answers;
// present and future ones only offer the past plus broken forms, because Korean present tense can also mean the near future.
const VERB_Q = [
  ["어제 친구를 ＿. (만나다)", "Yesterday I met a friend.", "만났어요", ["만나요", "만날 거예요", "만나었어요"]],
  ["내일 영화를 ＿. (보다)", "Tomorrow I'll watch a movie.", "볼 거예요", ["봤어요", "보을 거예요", "봘 거예요"]],
  ["지금 밥을 ＿. (먹다)", "I'm eating now.", "먹어요", ["먹었어요", "먹아요", "먹으요"]],
  ["지난주에 부산에 ＿. (가다)", "Last week I went to Busan.", "갔어요", ["가요", "갈 거예요", "가았어요"]],
  ["이번 주말에 집에서 ＿. (쉬다)", "This weekend I'll rest at home.", "쉴 거예요", ["쉬었어요", "쉬을 거예요", "쉬일 거예요"]],
  ["요즘 한국어를 ＿. (공부하다)", "These days I study Korean.", "공부해요", ["공부했어요", "공부하어요", "공부하아요"]],
  ["지금 음악을 ＿. (듣다)", "I'm listening to music now.", "들어요", ["들었어요", "듣어요", "듣아요"]],
  ["어제 편지를 ＿. (쓰다)", "Yesterday I wrote a letter.", "썼어요", ["써요", "쓸 거예요", "쓰었어요"]],
  ["내일 아침에 일찍 ＿. (일어나다)", "Tomorrow morning I'll get up early.", "일어날 거예요", ["일어났어요", "일어나을 거예요", "일어낼 거예요"]],
  ["작년에 서울에서 ＿. (살다)", "Last year I lived in Seoul.", "살았어요", ["살아요", "살 거예요", "살었어요"]],
  ["지금 친구를 ＿. (기다리다)", "I'm waiting for a friend now.", "기다려요", ["기다렸어요", "기다리아요", "기다러요"]],
  ["내년에 한국에 다시 ＿. (오다)", "Next year I'll come to Korea again.", "올 거예요", ["왔어요", "오을 거예요", "와을 거예요"]],
  ["어제 커피를 많이 ＿. (마시다)", "Yesterday I drank a lot of coffee.", "마셨어요", ["마셔요", "마실 거예요", "마시았어요"]],
  ["지금 방을 ＿. (청소하다)", "I'm cleaning my room now.", "청소해요", ["청소했어요", "청소하아요", "청소하어요"]],
  ["이따가 엄마한테 전화를 ＿. (걸다)", "Later I'll call my mom.", "걸 거예요", ["걸었어요", "걸을 거예요", "걸를 거예요"]],
  ["아까 문을 ＿. (닫다)", "A moment ago I closed the door.", "닫았어요", ["닫아요", "닫을 거예요", "닫었어요"]],
  ["지금 창문을 ＿. (열다)", "I'm opening the window now.", "열어요", ["열었어요", "열아요", "여러요"]],
  ["다음 주에 시험을 ＿. (보다)", "Next week I'll take an exam.", "볼 거예요", ["봤어요", "보을 거예요", "봘 거예요"]],
  ["어젯밤에 늦게 ＿. (자다)", "Last night I went to bed late.", "잤어요", ["자요", "잘 거예요", "자았어요"]],
  ["지금 노래를 ＿. (부르다)", "I'm singing a song now.", "불러요", ["불렀어요", "부르어요", "부라요"]],
  ["어제 사진을 많이 ＿. (찍다)", "Yesterday I took a lot of photos.", "찍었어요", ["찍어요", "찍을 거예요", "찍았어요"]],
  ["내일 친구에게 선물을 ＿. (주다)", "Tomorrow I'll give my friend a present.", "줄 거예요", ["줬어요", "주을 거예요", "줄을 거예요"]],
  ["지난 주말에 산에 ＿. (올라가다)", "Last weekend I climbed a mountain.", "올라갔어요", ["올라가요", "올라갈 거예요", "올라가었어요"]],
  ["지금 손을 ＿. (씻다)", "I'm washing my hands now.", "씻어요", ["씻었어요", "씻아요", "씻으요"]],
];
function scrollQuiz(i) {
  if (mu.scrolls[i]) { toast(mu.scrolls[i] > 0 ? "이미 풀었어요 · already solved" : "이 두루마리는 찢어졌어요 · this scroll is torn for this run"); return; }
  const [s, en, a, wrong] = pick(VERB_Q), ans = { id: "v", kr: a }, opts = shuffle([ans, ...wrong.map(w => ({ id: "x", kr: w }))]);
  openQuiz({ title: `두루마리 ${i + 1} · 맞는 동사는? · which verb form fits?`, prompt: `<span class="qzKo">${esc(s)}</span><span class="qzEn">${esc(en)}</span>`, answer: ans, opts,
    onDone: ok => { if (NET.role === "guest") netSend({ t: "scroll", i, ok }); applyScroll(i, ok); } });
}
function applyScroll(i, ok) {
  if (mu.scrolls[i]) return; mu.scrolls[i] = ok ? 1 : -1; syncScrolls();
  if (ok) { toast(`정답! 장군의 갑옷 하나가 떨어졌어요 · right! the general loses an armour plate (${4 - mu.scrolls.filter(b => b === 1).length} left)`); return; }
  toast("틀렸어요! 도굴꾼이 와요 · wrong — looters are coming!");
  if (NET.role === "guest") return;
  for (const g of MUSEUM.guardSpots) { spawnMonster({ kind: "dogul", lvl: 17, x: g.x, z: g.z, mon: null, zone: "museum" }); monsters[monsters.length - 1].state = "chase"; }
}
function museumCleared() {
  S.museumClears = (S.museumClears || 0) + 1; addHeart(10);
  const first = S.museumClears === 1;
  if (first) { S.hasMirror = true; setTimeout(() => sendMail("한동", "장군을 물리쳤다고요? 정말 대단해요! 카페에서 작은 선물을 준비했어요.", "You beat the general? Amazing! I got you a little present from the café.", { cards: [{ id: pick(bookWords().filter(w => S.chapters.includes(w.ch))).id, rar: 3 }], won: 40000 }), 2500); }
  save();
  clearReward("museum", "국립중앙박물관");
  if (first) rewardDone = mirrorVision;
}
// the bronze mirror shows what someone loved: the way into the stranger's story (decision 19, Danny: the big reveal)
function mirrorVision() {
  showReward("🪞 청동 거울 · the bronze mirror", [
    { big: true, icon: "🎤", ko: "거울 속에서 한 여자가 무대에서 노래하고 있어요.", en: "In the mirror, a woman is singing on a stage." },
    { icon: "🏷️", ko: "이름표에 '하늘'이라고 쓰여 있어요.", en: "Her name tag says 'Haneul'." },
    { icon: "🧥", ko: "홍대입구역의 낯선 사람에게 거울을 보여 주세요.", en: "Show the mirror to the stranger at 홍대입구역." },
  ]);
}
function revealTalk(n) {
  showLine(n, "x_mirror", [{ plr: "p_saw_haneul", act: () => showLine(n, "x_rv1", [{ plr: "p_really", act: () => showLine(n, "x_rv2", [{ plr: "p_then", act: () => showLine(n, "x_rv3", [{ plr: "p_sorry", act: () => { endWith(n, "x_rv4"); SFX.kill(); toast("📖 이야기 · the stranger told you the truth"); } }]) }]) }]) }]);
}
// 한동: the museum café cart at the end of the bridge (shop + quest)
function handongShop(n) {
  const opts = Object.entries(SNACKS).filter(([, sn]) => sn.shop === "handong").map(([k, sn]) => ({ plr: sn.plr, act: () => {
    if (S.money < sn.price) { endWith(n, "r_short"); return; }
    S.money -= sn.price; S.snacks = S.snacks || {}; S.snacks[k] = (S.snacks[k] || 0) + 1; SFX.pickup(); save();
    toast(`${sn.ko} ${won(sn.price)} → 소모품 (${keyName(SET.keys.inv)}) · ${keyName(SET.keys.food)}로 먹기`); endWith(n, "k_thanks"); } }));
  opts.push({ plr: "p_hongsam", act: () => buyBuffFood(n, "hongsam") });
  opts.push({ plr: "p_museum", act: () => endWith(n, "h_mirror") });
  opts.push({ plr: "p_leave", act: () => endWith(n, "k_thanks") });
  showLine(n, "h_hello", opts);
}
$("rwOk").onclick = closeReward;
const inFight = () => monsters.some(m => !m.dead && m.zone === player.zone && m.state === "chase" && dist2(m.pos, player.pos) < 25);
$("examBtn").onclick = () => { if (inFight()) { toast("전투가 끝나면 시험을 봐요 · finish the fight first"); return; } examSnooze = 0; startExam(); };

// ---- quiz duels + relationship levels with the Dreamcatcher-named women (Danny 2026-10-18) ----
// A 1-on-1 race on a stage: 10 questions from "her" chapter (also words you haven't learned yet). No visible timer: after 10 s
// (minus 1 s per relationship level, 5 s at Lv 5) she answers; a wrong click locks you out and she answers a second later.
// Danny (same day): "it should be a battle who kills the most goblins": ten goblins stand in front of the stage; whoever answers right
// blasts the goblin that stepped forward with lightning, a fireball or an ice shard, and it explodes. The score is goblins.
// 6+ right = relationship XP (10/10 the most); 5 or less = "practise more". Each new level gives a card; at Lv 5 she can travel with you.
const PERKS = {
  sua: { ko: "16초마다 회복, 가까이 있으면 공격 +5%", en: "heals you every 16 s, +5% damage near her" },
  trader: { ko: "괴물이 주는 돈 +15%", en: "+15% won from monsters" },
  jieun: { ko: "괴물 경험치 +10%", en: "+10% XP from monsters" },
  teacher: { ko: "기절·잠·묶기·침묵 +30% 길게", en: "stuns, sleep, roots and silence last 30% longer" },
  gayoung: { ko: "최대 체력 +15%", en: "+15% max health" },
  gangsa: { ko: "스킬 재사용 대기 −10%", en: "−10% skill cooldowns" },
  handong: { ko: "배고픔이 반만 줄어요", en: "hunger drops half as fast" },
};
const perk = k => S.compKey === k;
const DC_CH = { trader: 0, jieun: 1, teacher: 2, sua: 3, gayoung: 4, gangsa: 5, handong: 6 };   // the order you meet them = 1과, 2과, …
const REL_XP = [0, 50, 130, 240, 380, 560], REL_CARD = [0, 0, 1, 1, 2, 3], DUEL_XP = [0, 0, 0, 0, 0, 0, 20, 30, 40, 55, 75];
const relOf = kind => (S.rel = S.rel || {})[kind] || (S.rel[kind] = { xp: 0, lvl: 0 });
const dcName = kind => NPC_DEF[kind].split(" · ")[0];
const relBadge = kind => DREAM_TEAM.includes(kind) && relOf(kind).lvl > 0 ? ` <span class="relB">♥${relOf(kind).lvl}</span>` : "";
function dcChapter(kind) { const chs = bookChapters(); return chs[Math.min(DC_CH[kind] ?? 0, chs.length - 1)]; }
// the talk menu: duel / companion / her usual business
function dcMenu(n, base) {
  const kind = n.kind, r = relOf(kind), ch = dcChapter(kind), compNow = kind === "sua" ? !S.compKey && S.companion === "gumiho" : S.compKey === kind;
  const opts = [{ ko: `⚔ 시험 대결 · quiz duel`, en: `${ch.title}${ch.theme ? " " + ch.theme : ""} · ♥ Lv ${r.lvl}${r.lvl < 5 ? ` (${r.xp - REL_XP[r.lvl]} / ${REL_XP[r.lvl + 1] - REL_XP[r.lvl]})` : " MAX"}`, act: () => { closeDialog(); fade(() => startDuel(kind)); } }];
  if (!compNow && (r.lvl >= 5 || (kind === "sua" && S.companion === "gumiho"))) opts.push({ ko: "💞 같이 다녀요 · travel with me", en: kind === "sua" ? `수아 comes back · ${PERKS.sua.en}` : `${dcName(kind)} becomes your companion · ${PERKS[kind].en}`, act: () => setCompanion(kind, n) });
  if (base) opts.push({ ko: "(다른 이야기 · something else)", en: "", act: base });
  opts.push({ ko: "(대화 끝내기)", en: "leave", act: closeDialog });
  showLine(n, "dc_hi", opts);
}
function setCompanion(kind, n) {
  S.compKey = kind === "sua" ? null : kind; recalcMax(); save();
  endWith(n, "dc_comp"); spawnCompanion(); syncQuestNpcs(); SFX.pickup();
  toast(kind === "sua" ? "💗 수아가 다시 함께해요 · Sua travels with you again" : `💞 ${dcName(kind)}와 함께해요 · ${PERKS[kind].ko} · ${PERKS[kind].en}`);
}
// talking to your companion opens the same menu
function compTalk() { const kind = S.compKey || "sua"; dcMenu({ kind, name: NPC_DEF[kind], model: comp.model, pos: comp.pos }, null); }
// ---- the arena: a stage far away; the world is paused while you duel ----
const ARENA = { x: 12000, z: 0 };
let arena = null, duel = null;
function buildArena() {
  if (arena) return arena;
  const g = new THREE.Group(); g.position.set(ARENA.x, 0, ARENA.z); scene.add(g);
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const glowM = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  add(new THREE.PlaneGeometry(240, 240), toon("#121016"), 0, -.02, 0).rotation.x = -Math.PI / 2;
  add(new THREE.CylinderGeometry(13, 14, .3, 40), toon("#2a2430"), 0, -.15, 0);
  add(new THREE.TorusGeometry(13.2, .12, 6, 60), new THREE.MeshBasicMaterial({ color: "#ff3a6a", toneMapped: false }), 0, .02, 0).rotation.x = Math.PI / 2;
  for (const [x, c] of [[-4, "#ffd23d"], [4, "#c08aff"]]) {
    add(new THREE.CylinderGeometry(1.5, 1.7, .06, 24), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }), x, .03, 0);
    add(new THREE.ConeGeometry(2.4, 12, 24, 1, true), glowM(c), x, 6, 0);
  }
  const c = document.createElement("canvas"); c.width = 1024; c.height = 256; const x = c.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 1024, 0); gr.addColorStop(0, "#3a0a2a"); gr.addColorStop(1, "#1a0a3a"); x.fillStyle = gr; x.fillRect(0, 0, 1024, 256);
  x.strokeStyle = "#ff3a6a"; x.lineWidth = 10; x.strokeRect(8, 8, 1008, 240); x.fillStyle = "#fff"; x.font = '700 110px "Noto Sans KR", sans-serif'; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("⚔ 시험 대결", 512, 132);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false }), 0, 6.4, -9);
  for (let i = 0; i < 9; i++) { const a = -1.1 + i * .275; add(new THREE.BoxGeometry(.4, rand(6, 10), .4), toon("#3a3442"), Math.sin(a) * 15, 4, -Math.cos(a) * 12); }
  const qm = kayReady() ? makeKay("qm") : (makeMan("guard") || makeNPC("guard")); qm.root.position.set(ARENA.x, 0, ARENA.z - 4.5); g.parent.add(qm.root);
  arena = { g, qm }; return arena;
}
function startDuel(kind) {
  if (duel || quiz || exam) return;
  const ch = dcChapter(kind), pool = bookWords().filter(w => w.ch === ch.id), all = pool.length >= 4 ? pool : bookWords();
  const qs = shuffle(all.slice()).slice(0, 10);
  const A = buildArena(), back = { zone: player.zone, x: player.pos.x, z: player.pos.z, yaw: player.yaw };
  const her = womenReady() ? makeWoman(WOMAN_OF[kind]) : makeNPC("sitter"); her.root.position.set(ARENA.x + 4, 0, ARENA.z); her.root.rotation.y = Math.PI; scene.add(her.root);
  cancelRitual(); setTarget(null); if (comp) comp.model.root.visible = false;
  player.zone = "arena"; player.pos.set(ARENA.x - 4, 0, ARENA.z); player.yaw = Math.PI;
  const gobs = qs.map((_, i) => { const g = makeMonster("dokkaebi"); g.root.scale.setScalar(.75); g.root.rotation.y = Math.PI; g.root.position.set(ARENA.x - 6.3 + i * 1.4, 0, ARENA.z - 7.5); scene.add(g.root); return { m: g, to: g.root.position.clone() }; });
  duel = { kind, ch, qs, i: -1, me: 0, her: 0, back, model: her, timer: null, open: false, lvl: relOf(kind).lvl, gobs, shots: [] };
  paused = !NET.role; $("hud").hidden = true;
  $("duName").textContent = dcName(kind); $("duMy").textContent = "0"; $("duHer").textContent = "0"; $("duOpts").innerHTML = ""; $("duPrompt").innerHTML = ""; $("duel").hidden = false;
  speak("qm_start"); SFX.charge();
  let n = 3; $("duMsg").textContent = `${ch.title}${ch.theme ? " " + ch.theme : ""} · 준비… · get ready`;
  const tick = () => { if (!duel) return; if (n > 0) { $("duMsg").textContent = String(n); snd("bell", .4, 1 + (3 - n) * .15); n--; setTimeout(tick, 800); } else { $("duMsg").textContent = "시작! · go!"; snd("bell", .6, 1.6); setTimeout(duelNext, 600); } };
  setTimeout(tick, 900);
}
function duelNext() {
  if (!duel) return;
  duel.i++;
  if (duel.i >= duel.qs.length) { duelEnd(); return; }
  const w = duel.qs[duel.i], koToEn = false,   /* Danny 2026-10-19: always English on top, Korean answers (like the level-up exam) */ pool = duel.qs.filter(x => x !== w).concat(bookWords().filter(x => x.ch === duel.ch.id && x !== w));
  const others = shuffle([...new Set(pool)]).filter(x => x !== w).slice(0, 3), opts = shuffle([w, ...others]);
  duel.cur = { w, opts, koToEn }; duel.open = true; stat(w.id).s++;
  const gb = duel.gobs[duel.i]; if (gb) gb.to.set(ARENA.x, 0, ARENA.z + 1.6);   /* the next goblin steps up */
  $("duQn").textContent = `${duel.i + 1} / ${duel.qs.length}`; $("duMsg").textContent = "";
  $("duPrompt").innerHTML = koToEn ? `<span class="qzKo">${esc(w.kr)}</span><span class="qzEn">무슨 뜻이에요? · what does it mean?</span>` : `<span class="qzKo">${esc(w.en)}</span><span class="qzEn">이 뜻의 단어는? · which word means this?</span>`;
  $("duOpts").innerHTML = opts.map((o, i) => `<button class="rcard" data-i="${i}"><kbd>${i + 1}</kbd>${esc(koToEn ? o.en : o.kr)}</button>`).join("");
  $("duOpts").querySelectorAll("button").forEach(b => b.onclick = () => duelPick(+b.dataset.i));
  duel.timer = setTimeout(() => duelHer(), (10 - Math.min(5, duel.lvl)) * 1000);
}
function duelPick(i) {
  if (!duel || !duel.open) return;
  const { w, opts } = duel.cur, ok = opts[i] === w, btns = $("duOpts").children;
  duel.open = false; clearTimeout(duel.timer);
  if (ok) {
    btns[i].classList.add("ok"); duel.me++; $("duMy").textContent = duel.me; stat(w.id).c++;
    if (mastery(w.id).k === "mastered" && !S.mastered.includes(w.id)) { S.mastered.push(w.id); toast(`마스터! ${w.kr} · +${MASTER_XP} XP`); gainXp(MASTER_XP); }
    say([wordClip(w.id)], { interrupt: true }); snd("bell", .5, 1.3); player.model.trigger?.("attack"); blastGoblin("me"); FX.burst(player.pos, { n: 24, color: ["#ffd23d", "#fff2a8"], speed: 5, size: .16, life: .8, shape: "star", grav: 2, y: 2 });
    $("duMsg").textContent = "정답! · you got it!"; setTimeout(duelNext, 1100);
  } else { btns[i].classList.add("no"); stat(w.id).w++; SFX.resist(); $("duMsg").textContent = "앗! · oops…"; setTimeout(() => duelHer(), 1000); }
}
function duelHer() {   // she picks the right answer
  if (!duel) return;
  duel.open = false; clearTimeout(duel.timer);
  const { w, opts } = duel.cur, i = opts.indexOf(w), b = $("duOpts").children[i];
  if (b) b.classList.add("her");
  duel.her++; $("duHer").textContent = duel.her; duel.model.trigger?.("attack"); snd("punchM", .4, 1.4); blastGoblin("her");
  FX.burst({ x: ARENA.x + 4, z: ARENA.z }, { n: 24, color: ["#c08aff", "#ffffff"], speed: 5, size: .16, life: .8, shape: "star", grav: 2, y: 2 });
  $("duMsg").textContent = `${dcName(duel.kind)}: 정답! · she got it`; say([wordClip(w.id)], { interrupt: true });
  setTimeout(duelNext, 1500);
}
function duelEnd() {
  const d = duel, r = relOf(d.kind), gain = DUEL_XP[d.me] || 0, rows = [];
  rows.push({ big: true, icon: d.me >= 6 ? "🏆" : "📚", ko: `👹 ${d.me} : ${d.her}`, en: `goblins: you ${d.me}, ${dcName(d.kind)} ${d.her}`, note: d.me >= 6 ? "" : "도깨비 6마리 이상 잡으면 친해져요 · blast 6 or more goblins to grow closer" });
  if (gain) {
    r.xp += gain; rows.push({ icon: "💞", ko: `${dcName(d.kind)} ♥ +${gain}`, en: "relationship XP" });
    while (r.lvl < 5 && r.xp >= REL_XP[r.lvl + 1]) {
      r.lvl++;
      const pool = bookWords().filter(w => w.ch === d.ch.id), wd = pick(pool.length ? pool : bookWords()), card = newCard(wd.id, REL_CARD[r.lvl]); S.cards.push(card);
      rows.push({ icon: "💗", ko: `${dcName(d.kind)} ♥ Lv ${r.lvl}!`, en: "your relationship grew" });
      rows.push({ icon: "🃏", ko: `[${RARITY[card.rar].ko}] ${wd.kr}`, en: `${RARITY[card.rar].en} card · ${wd.en} · ${modText(card)}`, color: RARITY[card.rar].c });
      if (r.lvl === 5) rows.push({ icon: "💞", ko: `${dcName(d.kind)}와 같이 다닐 수 있어요!`, en: "she can now travel with you as your companion (talk to her)" });
    }
  }
  save(); $("duel").hidden = true;
  showLine({ name: NPC_DEF[d.kind] }, d.me >= 6 ? "dc_win" : "dc_lose", [{ ko: "(계속 · continue)", en: "", act: () => { closeDialog(); showReward(d.me >= 6 ? `⚔ ${dcName(d.kind)}와 시험 대결 · you won!` : `⚔ ${dcName(d.kind)}와 시험 대결`, rows, () => fade(duelLeave)); } }]);
}
function duelLeave() {
  const d = duel; if (!d) return; duel = null;
  scene.remove(d.model.root); for (const g of d.gobs) scene.remove(g.m.root); for (const sh of d.shots) scene.remove(sh.mesh);
  player.zone = d.back.zone; player.pos.set(d.back.x, 0, d.back.z); player.yaw = d.back.yaw; paused = false; $("hud").hidden = false;
  if (comp) { comp.model.root.visible = true; comp.zone = player.zone; comp.pos.copy(player.pos).add(new THREE.Vector3(1.5, 0, 1.5)); }
}
// a spell from the winner of the question to the goblin in front: lightning strikes at once, fireballs and ice shards fly
const SPELLS = { bolt: ["#9fd8ff", "#ffffff", "#5ab4ff"], fire: FX.EL_COL.fire, ice: ["#bfe8ff", "#ffffff", "#7ac8ff"] };
function blastGoblin(who) {
  const g = duel.gobs[duel.i]; if (!g || g.dead) return; g.dead = true;
  const type = pick(["bolt", "fire", "ice"]), cols = SPELLS[type], from = new THREE.Vector3(ARENA.x + (who === "me" ? -4 : 4), 1.7, ARENA.z);
  if (type === "bolt") { FX.glow({ x: g.m.root.position.x, z: g.m.root.position.z }, { color: "#bfe8ff", pillar: true, r: .7, h: 18, life: .35, opacity: .9 }); snd("laserL", .5, 1.6); setTimeout(() => popGoblin(g, cols), 120); return; }
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(type === "fire" ? .45 : .3, 12, 10), new THREE.MeshBasicMaterial({ color: cols[0], toneMapped: false }));
  if (type === "ice") mesh.scale.set(1, 1, 2.6);
  mesh.position.copy(from); scene.add(mesh); snd(type === "fire" ? "laserL" : "laserS", .45, type === "fire" ? .7 : 1.5);
  duel.shots.push({ mesh, g, cols, t: 0 });
}
function popGoblin(g, cols) {
  const at = g.m.root.position.clone();
  FX.explosion(at, cols, 1.3);
  FX.burst(at, { n: 30, color: ["#d4553f", "#e8a33a", "#f3e3b0"], speed: 10, up: 1.2, size: .22, life: 1.1, grav: 14, additive: false, y: 1 });
  FX.burst(at, { n: 18, color: cols, speed: 8, size: .18, life: .8, shape: "star", grav: 2, y: 1.2 });
  snd("boom", .7, 1.1); scene.remove(g.m.root);
}
function duelRender(dt) {
  if (!duel) return;
  duel.model.anim(dt, {}); if (arena?.qm) arena.qm.anim(dt, {});
  for (const g of duel.gobs) if (!g.dead) { const p = g.m.root.position, d = g.to.distanceTo(p); if (d > .05) { p.lerp(g.to, Math.min(1, dt * 4)); } g.m.anim(dt, { moving: d > .3 }); }
  for (let i = duel.shots.length - 1; i >= 0; i--) {
    const s = duel.shots[i], to = s.g.m.root.position.clone().setY(1.1); s.t += dt;
    const step = to.clone().sub(s.mesh.position), dist = step.length();
    FX.burst(s.mesh.position, { n: 3, color: s.cols, speed: .8, size: .14, life: .35, grav: 0, y: 0 });
    if (dist < .5 || s.t > 1.2) { scene.remove(s.mesh); duel.shots.splice(i, 1); popGoblin(s.g, s.cols); continue; }
    s.mesh.position.addScaledVector(step.normalize(), Math.min(dist, dt * 22)); s.mesh.lookAt(to);
  }
  camera.position.set(ARENA.x + FX.shakeState.x, 3.6 + FX.shakeState.y, ARENA.z + 12.5 + FX.shakeState.z); camera.lookAt(ARENA.x, 2, ARENA.z + 1.5);
}
addEventListener("keydown", e => {
  if (!duel || !duel.open) return;
  const k = +e.key; if (k >= 1 && k <= 4) { e.preventDefault(); e.stopImmediatePropagation(); duelPick(k - 1); }
}, true);

// ---- 단어 카드 배틀 (Danny 2026-10-18): the card game every student in Seoul plays ----
// Lore: a noun card game that's all the rage among students. One challenger per area; a battle = 4 rounds: a Korean description of a
// noun, □ boxes for its syllables, the syllables scrambled underneath; put them in order. 3 of 4 right wins. The first win in an area
// gives that area's Seoul card (6 to collect); rematches are practice (a little XP).
const CB = {
  cb1: { name: "민준", area: "hongdae", ch: 0, at: { x: -36.4, z: 34.2, zone: "street" }, model: "stuA" },
  cb2: { name: "서연", area: "apt", ch: 1, at: { x: 124, z: -22.5, zone: "street" }, woman: "stu_seoyeon" },
  cb3: { name: "지호", area: "river", ch: 2, at: { x: 34.5, z: 124.6, zone: "street" }, model: "stuB" },
  cb4: { name: "하은", area: "yeouido", ch: 3, at: { x: YD.x - 14, z: YD.z + 145, zone: "yeouido" }, woman: "stu_haeun" },
  cb5: { name: "도윤", area: "noryangjin", ch: 4, at: { x: YD.x - 39.5, z: YD.z + 424.5, zone: "yeouido" }, model: "stuC" },
  cb6: { name: "수빈", area: "yongsan", ch: 5, at: { x: YD.x + 189.5, z: YD.z + 100.5, zone: "yeouido" }, woman: "stu_subin" },
};
// 서강대학교 (Danny 2026-10-18): eight ranked battlers in a ring on the plaza; beating one gives 2 cards of their chapter (missing words first)
[["민서", "sg_minseo"], ["준호", 0, "sgA"], ["유나", "sg_yuna"], ["태윤", 0, "sgB"], ["소율", "sg_soyul"], ["건우", 0, "sgC"], ["다인", "sg_dain"], ["현우", 0, "sgD"]].forEach(([name, woman, model], k) => {
  const a = Math.PI + k * Math.PI / 4;
  CB["sg" + (k + 1)] = { name, area: "sogang", ch: k, rank: k + 1, at: { x: 390 + Math.cos(a) * 15, z: -180 + Math.sin(a) * 15, zone: "street" }, ...(woman ? { woman } : { model }) };
  NPC_DEF["sg" + (k + 1)] = `${name} · 랭크 ${k + 1} 카드 배틀러`;
});
// your own 카드 랭크: 1 + every rank you've beaten in a row from the bottom; a student above it won't battle you
const cardRank = () => { let r = 1; while (r <= 8 && (S.cbWins?.["sg" + r] || 0) > 0) r++; return Math.min(r, 8); };
const rankOpen = kind => CB[kind].rank <= cardRank();
const RANK_CARDS = 2;
function chapterCards(ch, n) {
  const owned = new Set(S.cards.map(c => c.id)), pool = bookWords().filter(w => w.ch === ch.id), miss = shuffle(pool.filter(w => !owned.has(w.id)));
  const got = []; for (let i = 0; i < n; i++) { const w = miss[i] || pick(pool); if (!w) break; const c = newCard(w.id, rollRarity()); S.cards.push(c); got.push(c); }
  return got;
}
function rankTalk(n) {
  const c = CB[n.kind], ch = cbChapter(n.kind), beaten = S.cbWins?.[n.kind] || 0;
  const my = cardRank();
  if (!rankOpen(n.kind)) { const gap = c.rank - my; showLine(n, gap >= 3 ? "rb_mock3" : pick(["rb_mock1", "rb_mock2"]), [{ ko: "(대화 끝내기)", en: `your 카드 랭크 is ${my} · beat ${CB["sg" + my].name} (랭크 ${my}) to climb`, act: closeDialog }]); SFX.resist(); return; }
  showLine(n, beaten ? "rb_again" : "rb_hi", [
    { ko: "🃏 카드 배틀! · card battle", en: `your 카드 랭크 ${my} · their rank ${c.rank} · ${ch.title} words · win ${RANK_CARDS} ${ch.title} cards${beaten >= 2 ? " (longer words now)" : ""}`, act: () => { closeDialog(); cgBegin(n.kind); } },
    { ko: "(대화 끝내기)", en: "leave", act: closeDialog }]);
}
const SEOUL_CARDS = {
  hongdae: { ko: "홍대", en: "Hongdae", icon: "🎸", c: ["#ff3a8a", "#7a1a4a"], sub: "버스킹의 거리 · street of buskers" },
  apt: { ko: "서교 아파트", en: "Seogyo Apartments", icon: "🏢", c: ["#5aa8ff", "#1a3a7a"], sub: "경비실의 지도 · the guard's map" },
  river: { ko: "한강공원", en: "Hangang Park", icon: "🌉", c: ["#3ac8b0", "#0f4a4a"], sub: "부서진 다리 · the broken bridge" },
  yeouido: { ko: "여의도", en: "Yeouido", icon: "🌸", c: ["#ff9ec4", "#7a2a5a"], sub: "벚꽃과 63빌딩 · cherry trees, the 63 Building" },
  noryangjin: { ko: "노량진", en: "Noryangjin", icon: "🐟", c: ["#7a9aff", "#1a2a6a"], sub: "시험과 수산시장 · exams and the fish market" },
  yongsan: { ko: "용산", en: "Yongsan", icon: "🏛️", c: ["#e0b43a", "#5a3a0a"], sub: "박물관의 밤 · night at the museum" },
};
const seoulCardHTML = (k, owned = true, n = 0) => { const c = SEOUL_CARDS[k]; return owned
  ? `<div class="sCard" style="--c1:${c.c[0]};--c2:${c.c[1]}"><span class="sNo">${String(Object.keys(SEOUL_CARDS).indexOf(k) + 1).padStart(2, "0")} / 06</span><span class="sIc">${c.icon}</span><b>${c.ko}</b><small>${c.en}</small><em>${c.sub}</em><span class="sTag">SEOUL CARD</span></div>`
  : `<div class="sCard locked"><span class="sNo">${String(Object.keys(SEOUL_CARDS).indexOf(k) + 1).padStart(2, "0")} / 06</span><span class="sIc">?</span><b>???</b><small>${c.en}의 학생을 이기세요 · beat the student</small></div>`; };
const syl = s => [...s.replace(/\s/g, "")];
const cbChapter = kind => { const chs = bookChapters(); return chs[Math.min(CB[kind].ch + (CB[kind].rank ? 0 : S.cbWins?.[kind] || 0), chs.length - 1)]; };
const cbWords = kind => {
  const ch = cbChapter(kind), wins = S.cbWins?.[kind] || 0;
  const ok = (w, min = 2) => w.pos === "noun" && (window.DEFS || {})[w.id] && syl(w.kb || w.kr).length >= min && syl(w.kb || w.kr).length <= 4;
  const long = bookWords().filter(w => w.ch === ch.id && ok(w, 3));
  const pool = wins >= 2 && long.length >= 4 ? long : bookWords().filter(w => w.ch === ch.id && ok(w));
  return pool.length >= 4 ? pool : bookWords().filter(w => ok(w));
};
function cbTalk(n) {
  if (CB[n.kind].rank) { rankTalk(n); return; }
  const won = S.seoulCards?.[CB[n.kind].area];
  showLine(n, won ? "cb_again" : "cb_hi", [
    { ko: "🃏 카드 배틀! · card battle", en: won ? `rematch · ${cbChapter(n.kind).title} words${(S.cbWins?.[n.kind] || 0) >= 2 ? ", longer ones" : ""}` : `win the ${SEOUL_CARDS[CB[n.kind].area].ko} Seoul card`, act: () => { closeDialog(); cgBegin(n.kind); } },
    { ko: "(대화 끝내기)", en: "leave", act: closeDialog }]);
}
let cb = null;
function startCardBattle(kind) {
  if (cb || duel || quiz || exam) return;
  const words = shuffle(cbWords(kind).slice()).slice(0, 4);
  if (words.length < 4) { toast("카드가 아직 없어요 · no cards for this chapter yet"); return; }
  cb = { kind, words, i: -1, me: 0, her: 0 }; cancelRitual(); paused = !NET.role;
  $("cbName").textContent = CB[kind].name; $("cardb").hidden = false; SFX.open(); cbNext();
}
function cbHearts() { $("cbMeHp").textContent = "♥".repeat(Math.max(0, 4 - cb.her)) + "♡".repeat(Math.min(4, cb.her)); $("cbHerHp").textContent = "♥".repeat(Math.max(0, 4 - cb.me)) + "♡".repeat(Math.min(4, cb.me)); }
function cbNext() {
  cb.i++; cbHearts();
  if (cb.i >= cb.words.length) { cbEnd(); return; }
  const w = cb.words[cb.i], s = syl(w.kb || w.kr);
  let tiles = shuffle(s.map((t, j) => ({ t, j }))); for (let k = 0; k < 6 && tiles.every((x, j) => x.j === j); k++) tiles = shuffle(tiles);
  cb.cur = { w, s, tiles, picked: [] }; cb.open = true; stat(w.id).s++;
  $("cbRound").textContent = `${cb.i + 1} / 4`; $("cbMsg").textContent = ""; $("cbMsg").className = "cbMsg";
  $("cbClue").textContent = window.DEFS[w.id];
  cbDraw();
}
function cbDraw() {
  const c = cb.cur;
  $("cbSlots").innerHTML = c.s.map((_, j) => { const p = c.picked[j]; return `<button class="cbSlot${p !== undefined ? " full" : ""}" data-j="${j}">${p !== undefined ? esc(c.tiles[p].t) : ""}</button>`; }).join("");
  $("cbTiles").innerHTML = c.tiles.map((x, k) => `<button class="cbTile" data-k="${k}" ${c.picked.includes(k) ? "disabled" : ""}><kbd>${k + 1}</kbd>${esc(x.t)}</button>`).join("");
  $("cbTiles").querySelectorAll(".cbTile").forEach(b => b.onclick = () => cbPick(+b.dataset.k));
  $("cbSlots").querySelectorAll(".cbSlot").forEach(b => b.onclick = () => cbUndo(+b.dataset.j));
}
function cbPick(k) {
  const c = cb?.cur; if (!cb?.open || c.picked.includes(k) || c.picked.length >= c.s.length) return;
  c.picked.push(k); snd("wood", .35, 1.4); cbDraw();
  if (c.picked.length === c.s.length) cbCheck();
}
function cbUndo(j) { const c = cb?.cur; if (!cb?.open || j >= c.picked.length) return; c.picked.length = j; SFX.select(); cbDraw(); }
function cbCheck() {
  const c = cb.cur, word = c.picked.map(k => c.tiles[k].t).join(""), ok = word === c.s.join(""); cb.open = false;
  const w = c.w;
  if (ok) {
    cb.me++; stat(w.id).c++; if (mastery(w.id).k === "mastered" && !S.mastered.includes(w.id)) { S.mastered.push(w.id); toast(`마스터! ${w.kr} · +${MASTER_XP} XP`); gainXp(MASTER_XP); }
    say([wordClip(w.id)], { interrupt: true }); snd("boom", .5, 1.3); snd("bell", .5, 1.2);
    $("cbMsg").textContent = `정답! ${w.kb || w.kr} · ${w.en}`; $("cbMsg").className = "cbMsg ok"; $("cbHerCard").classList.remove("hit"); void $("cbHerCard").offsetWidth; $("cbHerCard").classList.add("hit");
  } else {
    cb.her++; stat(w.id).w++; SFX.resist(); snd("punchH", .5, 1.1);
    $("cbMsg").textContent = `정답은 ${w.kb || w.kr} · ${w.en}`; $("cbMsg").className = "cbMsg no"; $("cbMeCard").classList.remove("hit"); void $("cbMeCard").offsetWidth; $("cbMeCard").classList.add("hit");
    c.picked = c.s.map((_, j) => c.tiles.findIndex(x => x.j === j)); cbDraw();   /* show the right order */
  }
  cbHearts(); setTimeout(cbNext, ok ? 1500 : 2600);
}
function cbEnd() {
  const d = cb, win = d.me >= 3, area = CB[d.kind].area, rk = CB[d.kind].rank, first = win && !rk && !S.seoulCards?.[area];
  $("cardb").hidden = true; cb = null; paused = false;
  const rows = [{ big: true, icon: win ? "🏆" : "🃏", ko: `${d.me} : ${d.her}`, en: win ? `you beat ${CB[d.kind].name}` : `${CB[d.kind].name} won · 3 of 4 wins` }];
  if (win) (S.cbWins = S.cbWins || {})[d.kind] = (S.cbWins[d.kind] || 0) + 1;
  if (first) { (S.seoulCards = S.seoulCards || {})[area] = Date.now(); rows.push({ iconHtml: seoulCardHTML(area), ko: `서울 카드 · ${SEOUL_CARDS[area].ko}`, en: `Seoul card ${Object.keys(S.seoulCards).length} / 6 (inventory → 서울 카드)` }); }
  else if (win && rk) {
    const ch = cbChapter(d.kind); for (const c of chapterCards(ch, RANK_CARDS)) rows.push({ icon: "🃏", ko: `${WORD[c.id].kr} · ${RARITY[c.rar].ko}`, en: `${WORD[c.id].en} · ${ch.title} · ${modText(c)}` });
    if (S.cbWins[d.kind] === 1 && rk < 8) rows.push({ big: true, icon: "🏅", ko: `카드 랭크 업! 랭크 ${rk + 1}`, en: `card rank up: ${CB["sg" + (rk + 1)].name} (랭크 ${rk + 1}, ${bookChapters()[Math.min(rk, bookChapters().length - 1)].title}) will battle you now` });
    else if (S.cbWins[d.kind] === 1) rows.push({ big: true, icon: "👑", ko: "최고 랭크!", en: "you beat every rank on the plaza" });
  }
  else if (win) { rows.push({ icon: "✨", ko: "+60 XP", en: "rematch practice" }); setTimeout(() => gainXp(60), 400); }
  save();
  const n = npcs.find(x => x.kind === d.kind);
  showLine(n || { name: CB[d.kind].name }, win ? "cb_win" : "cb_lose", [{ ko: "(계속 · continue)", en: "", act: () => { closeDialog(); if (win) showReward(first ? "🃏 서울 카드 획득! · new Seoul card" : "🃏 카드 배틀 승리 · you won", rows); } }]);
}
addEventListener("keydown", e => {
  if (!cb || !cb.open) return;
  const k = +e.key;
  if (k >= 1 && k <= cb.cur.tiles.length) { e.preventDefault(); e.stopImmediatePropagation(); cbPick(k - 1); }
  else if (e.key === "Backspace") { e.preventDefault(); e.stopImmediatePropagation(); cbUndo(cb.cur.picked.length - 1); }
}, true);

// ---- 카드 배틀 2 (Danny 2026-10-18): the card game every student in Seoul plays, now in its own arena ----
// A 40-word battle deck (words may also be in skill decks; each word plays as your best copy of it). Best of 3 rounds. Each round both
// players get 10 new cards from their own deck (never a card from an earlier round) and one rule ("명사 최대 3 · 동사 최대 2", up to 5
// cards); only the Korean word shows, knowing its type is the practice. Points by rarity: 일반 1, 희귀 2, 영웅 3, 전설 4. Over a limit,
// the highest cards of that type score 0; a type the rule doesn't name scores 0. Ties: more scoring cards, then who ended the turn first,
// then the challenger loses. 12 s to choose, 9 s in round 2, 7 s in round 3 (Danny 2026-10-18: was 10/7/5, too hectic). Every card is a monster on the field (word type = species,
// rarity = size and glow); the round winner's monsters destroy the loser's. Against students (their chapter's words, better cards and
// fewer slips at higher ranks, more slips when they lead, and some days they're just unlucky) or a friend in co-op (no prize, for fun).
const CG_WRONG = -1;   /* Danny 2026-10-18: a card that doesn't fit the rule costs a point */
const CG_PTS = [1, 2, 3, 4], CG_DECK = 40, CG_HAND = 10, CG_TIME = [12, 9, 7];
const CG_TYPE = { noun: { ko: "명사", en: "noun", mon: "dokkaebi", col: ["#ff7a5a", "#ffd23d"] }, verb: { ko: "동사", en: "verb", mon: "spark", col: ["#fff36a", "#7af0ff"] }, adjective: { ko: "형용사", en: "adjective", mon: "wisp", col: ["#3ad8c8", "#9ff8e8"] }, adverb: { ko: "부사", en: "adverb", mon: "magpie", col: ["#5a6aff", "#ffffff"] }, other: { ko: "기타", en: "expression", mon: "book", col: ["#c8402f", "#f6f0e0"] } };
const CG_GLOW = [null, "#5aa8ff", "#b47aff", "#ffb03a"], CG_SIZE = [.55, .66, .8, .96];
const CARENA = { x: 13000, z: 0 }, CG_CAM = { y: 20, z: 12.5, look: 1.9 };   /* Danny 2026-10-18: zoomed out so the opponent's field shows too */
const cgPos = id => CG_TYPE[WORD[id]?.pos] ? WORD[id].pos : "other";
const bestRar = id => S.cards.reduce((m, c) => c.id === id && c.rar > m ? c.rar : m, -1);
// Danny 2026-10-18: words with no clear category (기타: grammar patterns, expressions) stay out of card battles
const cgOk = id => WORD[id] && cgPos(id) !== "other";
const battleDeck = () => [...new Set(S.battleDeck || [])].filter(id => cgOk(id) && bestRar(id) >= 0);
const myName = () => S.name || classDef().ko;
function autoBattleDeck() { S.battleDeck = shuffle([...new Set(S.cards.map(c => c.id))].filter(cgOk)).sort((a, b) => bestRar(b) - bestRar(a)).slice(0, CG_DECK); save(); }
let bdFilter = "all";
function drawBattleDeck() {
  const deck = new Set(battleDeck()), all = [...new Set(S.cards.map(c => c.id))].filter(id => WORD[id]), ids = all.filter(cgOk).sort((a, b) => bestRar(b) - bestRar(a) || (WORD[a].kb || WORD[a].kr).localeCompare(WORD[b].kb || WORD[b].kr));
  const shown = ids.filter(id => bdFilter === "all" || deck.has(id)), pts = [...deck].reduce((a, id) => a + CG_PTS[bestRar(id)], 0);
  $("dvColl").innerHTML = `<div class="clHead"><div><b>⚔ 배틀 덱 · battle deck</b> · ${deck.size} / ${CG_DECK} 단어 · words · 점수 · points ${pts} ${deck.size < CG_DECK ? `· <span class="warn">카드 배틀에는 ${CG_DECK}개가 필요해요 · card battles need ${CG_DECK}</span>` : `· <span class="okc">준비됨 · ready</span>`}</div>
    <div class="bar xp clBar"><i style="width:${deck.size / CG_DECK * 100}%"></i></div>
    <span class="fine">단어마다 가장 좋은 카드로 싸워요 · each word plays as your best copy of it: 일반 +1, 희귀 +2, 영웅 +3, 전설 +4 · 스킬 덱의 단어도 넣을 수 있어요 · words from your skill decks can be here too · 명사·동사·형용사·부사만 · only nouns, verbs, adjectives and adverbs (기타 · grammar and expressions: ${all.length - ids.length} of yours stay out)</span></div>
    <div class="clFilt"><button class="chip" data-bf="all" aria-pressed="${bdFilter === "all"}">전체 · all (${ids.length})</button><button class="chip" data-bf="in" aria-pressed="${bdFilter === "in"}">덱 · in the deck</button><button class="chip" id="bdAuto">✨ 자동 · best ${CG_DECK}</button><button class="chip" id="bdClear">비우기 · clear</button></div>
    <div class="clGrid">${shown.map(id => { const w = WORD[id], r = bestRar(id); return `<button class="clTile bd ${deck.has(id) ? "own" : "miss"}" data-id="${id}" style="--rc:${RARITY[r].c}"><b>${esc(w.kb || w.kr)}</b><span>${esc(w.en)}</span><small>${POSKO[w.pos] || "기타"} · ${RARITY[r].ko} +${CG_PTS[r]}${deck.has(id) ? " · ✓ 덱" : ""}</small></button>`; }).join("") || '<p class="fine">카드가 없어요 · no cards yet</p>'}</div>`;
  if ($("dvBattleTab")) $("dvBattleTab").textContent = `⚔ 배틀 덱 · battle deck (${deck.size}/${CG_DECK})`;
  $("dvColl").querySelectorAll("[data-bf]").forEach(b => b.onclick = () => { bdFilter = b.dataset.bf; drawBattleDeck(); });
  $("bdAuto").onclick = () => { autoBattleDeck(); drawBattleDeck(); };
  $("bdClear").onclick = () => { S.battleDeck = []; save(); drawBattleDeck(); };
  $("dvColl").querySelectorAll(".clTile.bd").forEach(b => b.onclick = () => {
    const id = b.dataset.id, d = battleDeck();
    if (d.includes(id)) S.battleDeck = d.filter(x => x !== id); else if (d.length < CG_DECK) S.battleDeck = [...d, id]; else { toast(`덱은 ${CG_DECK}개까지 · the deck holds ${CG_DECK} words`); return; }
    save(); drawBattleDeck();
  });
}
function cgNeedDeck() {
  const n = battleDeck().length, own = new Set(S.cards.map(c => c.id).filter(cgOk)).size;
  toast(`⚔ 배틀 덱에 단어 ${CG_DECK}개가 필요해요 (지금 ${n}개) · your battle deck needs ${CG_DECK} words (now ${n})` + (own < CG_DECK ? ` — 명사·동사·형용사·부사 카드를 더 모으세요 · collect more nouns, verbs, adjectives, adverbs (${own})` : ""));
  if (own >= CG_DECK) { dvTab = "battle"; openDeckView(); }
}
// the rule of a round: 1–3 word types, 3–5 cards in all
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const sShuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function cgRule(rnd) {
  const order = ["noun", "verb", "adjective", "adverb"], wt = [5, 4, 2, 2], k = rnd() < .3 ? 1 : rnd() < .75 ? 2 : 3, types = [];
  while (types.length < k) { let r = rnd() * 13, t = order[3]; for (let i = 0; i < 4; i++) if ((r -= wt[i]) < 0) { t = order[i]; break; } if (!types.includes(t)) types.push(t); }
  const lim = Object.fromEntries(types.map(t => [t, 1])); let left = Math.max(types.length, 3 + Math.floor(rnd() * 3)) - types.length;
  while (left-- > 0) lim[types[Math.floor(rnd() * types.length)]]++;
  return { lim };
}
const ruleKo = r => Object.entries(r.lim).map(([t, n]) => `${CG_TYPE[t].ko} 최대 ${n}`).join(" · ");
const ruleEn = r => "at most " + Object.entries(r.lim).map(([t, n]) => `${n} ${CG_TYPE[t].en}${n > 1 ? "s" : ""}`).join(" + ");
function cgScore(cards, rule) {
  const by = {}, pts = cards.map(() => 0); cards.forEach((c, i) => (by[cgPos(c.id)] = by[cgPos(c.id)] || []).push(i));
  for (const [t, idx] of Object.entries(by)) { const over = Math.max(0, idx.length - (rule.lim[t] || 0)); idx.sort((a, b) => cards[b].rar - cards[a].rar).forEach((i, k) => { pts[i] = k < over ? CG_WRONG : CG_PTS[cards[i].rar]; }); }
  return { total: pts.reduce((a, b) => a + b, 0), n: pts.filter(p => p > 0).length, pts };
}
// a student's deck and play: their chapter's words, better cards at higher ranks; they slip more at low ranks, when they lead, on bad days
function cgNpcDeck(kind) {
  const c = CB[kind], ch = cbChapter(kind), rank = c.rank || Math.min(8, c.ch + 1 + (S.cbWins?.[kind] || 0));
  let pool = bookWords().filter(w => w.ch === ch.id && cgOk(w.id)); if (pool.length < CG_DECK) pool = pool.concat(shuffle(bookWords().filter(w => w.ch !== ch.id && cgOk(w.id))).slice(0, CG_DECK - pool.length));
  const odds = [Math.max(.25, .8 - rank * .07), .17 + rank * .03, .03 + rank * .025, rank * .008], sum = odds.reduce((a, b) => a + b, 0);
  const roll = () => { let r = Math.random() * sum; for (let i = 0; i < 4; i++) if ((r -= odds[i]) < 0) return i; return 0; };
  return { rank, cards: shuffle(pool).slice(0, CG_DECK).map(w => ({ id: w.id, rar: roll() })) };
}
function cgAiPick(hand, rule, rank, leading, luck) {
  const slip = Math.min(.6, Math.max(.04, (.4 - rank * .04) * (leading ? 1.7 : 1) * luck));
  let sel = []; for (const [t, n] of Object.entries(rule.lim)) sel.push(...hand.map((c, i) => i).filter(i => cgPos(hand[i].id) === t).sort((a, b) => hand[b].rar - hand[a].rar).slice(0, n));
  const rest = () => hand.map((c, j) => j).filter(j => !sel.includes(j));
  sel = sel.flatMap(i => { if (Math.random() >= slip) return [i]; const r = rest(); return Math.random() < .5 || !r.length ? [] : [pick(r)]; });   /* forgot one, or took another word for this type */
  if (Math.random() < slip * .6) { const r = rest(); if (r.length) sel.push(pick(r)); }   /* one card too many */
  return [...new Set(sel)];
}
// the arena
let cgArena = null, cg = null;
function buildCardArena() {
  if (cgArena) return cgArena;
  const g = new THREE.Group(); g.position.set(CARENA.x, 0, CARENA.z); scene.add(g);
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.receiveShadow = true; g.add(m); return m; };
  const neon = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  add(new THREE.PlaneGeometry(260, 260), toon("#0e0c18"), 0, -.02, 0).rotation.x = -Math.PI / 2;
  add(new THREE.BoxGeometry(23, .4, 17), toon("#2a2440"), 0, -.2, 0);
  for (const [z, c] of [[3.8, "#ffd23d"], [-3.8, "#c08aff"]]) { const f = add(new THREE.PlaneGeometry(20, 4.6), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .13, toneMapped: false }), 0, .03, z); f.rotation.x = -Math.PI / 2; add(new THREE.BoxGeometry(20.4, .08, .12), neon(c), 0, .05, z + Math.sign(z) * 2.3); }
  add(new THREE.BoxGeometry(20, .06, .1), neon("#ffffff"), 0, .05, 0);
  for (let i = 0; i < 12; i++) { const a = -1.3 + i * .236, x = Math.sin(a) * 17, z = -Math.cos(a) * 12; add(new THREE.BoxGeometry(.5, 9, .5), toon("#3a3442"), x, 4.5, z); add(new THREE.BoxGeometry(.18, 8.6, .18), neon(i % 2 ? "#ff3d8b" : "#35e3ff"), x, 4.5, z + .3); }
  const c = document.createElement("canvas"); c.width = 1024; c.height = 256; const x = c.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 1024, 0); gr.addColorStop(0, "#1a0a3a"); gr.addColorStop(1, "#3a0a2a"); x.fillStyle = gr; x.fillRect(0, 0, 1024, 256);
  x.strokeStyle = "#35e3ff"; x.lineWidth = 10; x.strokeRect(8, 8, 1008, 240); x.fillStyle = "#fff"; x.font = '700 110px "Noto Sans KR", sans-serif'; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("🃏 카드 배틀", 512, 132);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.PlaneGeometry(16, 4), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false }), 0, 8, -13);
  return cgArena = { g };
}
// start: { npc: kind } or { pvp: { id, nm, cls, deck, mine, seed, challenger } }
function cgBegin(kind) { if (battleDeck().length < CG_DECK) { cgNeedDeck(); return; } cgStart({ npc: kind }); }
function cgStart(o) {
  if (cg || duel || quiz || exam || cb) return;
  const mine = o.pvp ? o.pvp.mine : battleDeck().slice(0, CG_DECK).map(id => ({ id, rar: bestRar(id) }));
  if (mine.length < CG_DECK) { cgNeedDeck(); return; }
  let rnd = Math.random, opp, rank = 0, oppName, oppModel;
  if (o.npc) { const c = CB[o.npc], d = cgNpcDeck(o.npc); opp = d.cards; rank = d.rank; oppName = c.name; oppModel = (c.woman && womenReady() ? makeWoman(c.woman) : null) || (kayReady() ? makeKay(c.model || "stuA") : makeNPC("sitter")); }
  else { rnd = mulberry(o.pvp.seed); opp = o.pvp.deck; oppName = o.pvp.nm; oppModel = classModel(o.pvp.cls || "geomgaek", o.pvp.lk); }
  const challenger = o.npc ? true : o.pvp.challenger, A = challenger ? mine : opp, B = challenger ? opp : mine;
  const oA = sShuffle(A, rnd), oB = sShuffle(B, rnd), rules = [0, 1, 2].map(() => cgRule(rnd));
  buildCardArena(); cancelRitual(); setTarget(null); closeDialog(); if (comp) comp.model.root.visible = false;
  const back = { zone: player.zone, x: player.pos.x, z: player.pos.z, yaw: player.yaw };
  player.zone = "arena"; player.pos.set(CARENA.x, 0, CARENA.z + 8.2); player.yaw = 0;
  oppModel.root.position.set(CARENA.x, 0, CARENA.z - 8.2); oppModel.root.rotation.y = 0; scene.add(oppModel.root);
  cg = { npc: o.npc, pvp: o.pvp, challenger, rank, luck: rand(.7, 1.4), oppName, oppModel, back, myOrder: challenger ? oA : oB, oppOrder: challenger ? oB : oA, rules,
    round: -1, wins: [0, 0], phase: "intro", sel: [], mons: [], fx: [], picks: {}, myEnd: 0, endAt: 0 };
  paused = !NET.role; $("hud").hidden = true; $("cg").hidden = false;
  $("cgMyName").textContent = myName(); $("cgOppName").textContent = oppName + (rank ? ` · 랭크 ${rank}` : "");
  SFX.open(); snd("bell", .6, .8); setTimeout(cgNextRound, 900);
}
function cgPips() { $("cgMyWins").textContent = "●".repeat(cg.wins[0]) + "○".repeat(2 - cg.wins[0]); $("cgOppWins").textContent = "●".repeat(cg.wins[1]) + "○".repeat(2 - cg.wins[1]); }
function cgClearField() { for (const m of cg.mons) if (!m.gone) { FX.deathPoof(m.m.root.position, false); scene.remove(m.m.root); } cg.mons = []; }
function cgNextRound() {
  if (!cg || cg.phase === "end") return;
  cgClearField(); cg.round++; const r = cg.round; $("cgVs").hidden = true; $("cgQz").hidden = true; $("cg").classList.remove("vsOn");
  cg.hand = cg.myOrder.slice(r * CG_HAND, (r + 1) * CG_HAND); cg.oppHand = cg.oppOrder.slice(r * CG_HAND, (r + 1) * CG_HAND);
  cg.rule = cg.rules[r]; cg.sel = []; cg.myPts = null; cg.time = CG_TIME[Math.min(r, 2)];
  cgPips(); $("cgScore").hidden = true; $("cgOppState").textContent = "고르는 중… · choosing";
  $("cgRound").textContent = `라운드 ${r + 1} · round ${r + 1}${r === 2 ? " · 마지막! · last one!" : ""}`; $("cgRule").textContent = ruleKo(cg.rule); $("cgRuleEn").textContent = ruleEn(cg.rule);   /* Danny 2026-10-18: the −1 line only confused; the −1 shows on the cards after the round */
  cgBanner(`라운드 ${r + 1}`, ruleKo(cg.rule)); snd("bell", .5, 1 + r * .15);
  cg.phase = "intro"; cgDrawHand(false);
  if (cg.npc) { const sel = cgAiPick(cg.oppHand, cg.rule, cg.rank, cg.wins[1] > cg.wins[0], cg.luck); cg.picks[r] = { sel, t: +(cg.time * rand(.35, .9) * (1.1 - cg.rank * .06)).toFixed(2) }; }
  setTimeout(() => { if (!cg || cg.round !== r || cg.phase === "end") return; cg.phase = "pick"; cg.t0 = performance.now(); cg.endAt = cg.t0 + cg.time * 1000; $("cgEnd").disabled = false; }, 1400);
}
function cgVs(ma, mb, win, why) {
  const v = $("cgVs"); v.className = "cgVs " + (win ? "win" : "lose");
  v.innerHTML = `<div class="vsRow"><span class="vsMe"><small>${esc(myName())}</small>${ma}</span><b>:</b><span class="vsOp"><small>${esc(cg.oppName)}</small>${mb}</span></div><em>${win ? "라운드 승리! 🏆 · you win the round" : "라운드 패배… · you lose the round"}</em>${why ? `<small class="vsWhy">${why}</small>` : ""}`;
  v.hidden = false; $("cg").classList.add("vsOn"); void v.offsetWidth; v.classList.add("show"); snd(win ? "bell" : "punchM", .55, win ? 1.3 : .8);
}
function cgBanner(big, small, cls = "") { const b = $("cgBanner"); b.innerHTML = `<b>${big}</b>${small ? `<span>${small}</span>` : ""}`; b.className = "cgBanner " + cls; b.hidden = false; void b.offsetWidth; b.classList.add("show"); clearTimeout(cgBanner.t); cgBanner.t = setTimeout(() => { b.hidden = true; }, 1600); }
function cgDrawHand(reveal) {
  $("cgHand").innerHTML = cg.hand.map((c, i) => { const w = WORD[c.id], on = cg.sel.includes(i), p = reveal && on ? cg.myPts[cg.sel.indexOf(i)] : null;
    return `<button class="cgCard r${c.rar}${on ? " on" : ""}${reveal ? " rev" : ""}${p === null ? "" : p > 0 ? " ok" : " no"}" data-i="${i}" ${reveal ? "disabled" : ""}><kbd>${(i + 1) % 10}</kbd><b style="font-size:${[...(w.kb || w.kr)].length > 6 ? "clamp(11px,1vw,17px)" : [...(w.kb || w.kr)].length > 4 ? "clamp(13px,1.35vw,22px)" : "clamp(16px,1.8vw,28px)"}">${esc(w.kb || w.kr)}</b><span class="pt">+${CG_PTS[c.rar]}</span>${reveal ? `<small>${CG_TYPE[cgPos(c.id)].ko}${on ? (p > 0 ? ` ✓ +${p}` : ` ✗ ${p}`) : cg.rmMine === i ? " 🗑" : ""}</small>` : ""}</button>`; }).join("");
  if (!reveal) $("cgHand").querySelectorAll(".cgCard").forEach(b => b.onclick = () => cgToggle(+b.dataset.i));
  $("cgEnd").disabled = reveal || cg.phase !== "pick"; $("cgCount").textContent = reveal ? "" : `${cg.sel.length}장 · cards`;
}
function cgToggle(i) {
  if (!cg || cg.phase !== "pick" || i < 0 || i >= cg.hand.length) return;
  cg.sel = cg.sel.includes(i) ? cg.sel.filter(x => x !== i) : [...cg.sel, i]; snd("wood", .3, cg.sel.includes(i) ? 1.5 : 1.1); cgDrawHand(false);
}
function cgEndTurn(timeout) {
  if (!cg || cg.phase !== "pick") return;
  cg.phase = "wait"; cg.myEnd = timeout ? cg.time : +((performance.now() - cg.t0) / 1000).toFixed(2); cg.waitT = performance.now();
  $("cgEnd").disabled = true; if (timeout) { snd("punchM", .4, 1.4); cgBanner("⏰ 시간 끝!", "time's up"); } else SFX.select();
  if (cg.pvp) netSend({ t: "cgPick", to: cg.pvp.id, r: cg.round, sel: cg.sel, tm: cg.myEnd });
  for (const id of cg.sel.map(i => cg.hand[i].id)) stat(id).s++;
  cgTryResolve();
}
function cgTryResolve() { if (cg?.phase === "wait" && cg.picks[cg.round]) cgQuizStart(); }
// ---- ⚡ the speed quiz ----
const QZ_N = 10, QZ_MAX = 30, QZ_STEAL = 5, QZ_T = ["noun", "verb", "adjective", "adverb"];
function cgQuizStart() {
  const r = cg.round; cg.phase = "quiz"; cg.rmMine = cg.rmOpp = null;
  const words = shuffle([...new Set(cg.myOrder.map(c => c.id))]).slice(0, QZ_N);
  cg.qz = { r, words, i: 0, c: 0, t0: performance.now() + 1e9, done: false, lock: false, go: false };
  if (cg.npc) {   /* the student's run (Danny 2026-10-18: always winnable): about 4 + rank/2 right, ±1, at most 9; ~2.5–3 s a word */
    const c = Math.max(3, Math.min(9, 4 + Math.floor(cg.rank / 2) + Math.round(rand(-1.4, 1.4)))); let t = 0; const at = [];
    for (let k = 0; k < QZ_N; k++) { t += Math.max(1.6, rand(2.2, 3.2) - cg.rank * .08); at.push(t); }
    cg.qzOpp = { r, c, t: +t.toFixed(2), at };
  } else cg.qzOpp = cg.qzOppEarly?.[r] || null;
  const box = $("cgQz"); box.hidden = false; box.className = "cgQz";
  $("cgQzHead").innerHTML = `<b>⚡ 스피드 퀴즈 · speed quiz</b><span>무슨 단어예요? 더 많이 맞히면 (같으면 더 빨리) 상대 카드 1장을 없앨 수 있어요 · what kind of word? most right (then fastest) removes one of their cards</span>`;
  $("cgQzOpts").innerHTML = QZ_T.map((t, k) => `<button data-k="${k}"><kbd>${k + 1}</kbd>${CG_TYPE[t].ko}<small>${CG_TYPE[t].en}</small></button>`).join("");
  $("cgQzOpts").querySelectorAll("button").forEach(b => b.onclick = () => cgQzAnswer(+b.dataset.k));
  let n = 3; const qq = cg.qz, tick = () => {
    if (!cg || cg.qz !== qq || cg.phase !== "quiz") return;
    if (n > 0) { $("cgQzWord").textContent = String(n); $("cgQzOpts").querySelectorAll("button").forEach(b => b.disabled = true); snd("bell", .4, 1 + (3 - n) * .15); n--; setTimeout(tick, 700); return; }
    cg.qz.go = true; cg.qz.t0 = performance.now(); snd("bell", .6, 1.6); cgQzDraw();
  };
  $("cgQzMe").textContent = "준비… · get ready"; tick();
}
function cgQzDraw() {
  const q = cg.qz, id = q.words[q.i];
  $("cgQzWord").textContent = q.done ? "✓" : WORD[id] ? (WORD[id].kb || WORD[id].kr) : "";
  $("cgQzMe").textContent = `나 · you ${q.c} ✓ / ${q.i} 문제`;
  $("cgQzOpts").querySelectorAll("button").forEach(b => { b.className = ""; b.disabled = q.done; });
}
function cgQzAnswer(k) {
  const q = cg?.qz; if (!q || !q.go || cg.phase !== "quiz" || q.done || q.lock || k < 0 || k > 3) return;
  const id = q.words[q.i], right = cgPos(id), ok = QZ_T[k] === right, btns = $("cgQzOpts").children;
  q.lock = true; if (ok) q.c++;
  btns[k].className = ok ? "ok" : "no"; if (!ok && QZ_T.indexOf(right) >= 0) btns[QZ_T.indexOf(right)].className = "ok";
  snd(ok ? "wood" : "punchM", .35, ok ? 1.6 : .8);
  setTimeout(() => { if (!cg?.qz || cg.qz !== q) return; q.lock = false; q.i++; if (q.i >= QZ_N) cgQzDone(); else cgQzDraw(); }, ok ? 180 : 650);
}
function cgQzDone() {
  const q = cg.qz; if (q.done) return; q.done = true; q.t = +((performance.now() - q.t0) / 1000).toFixed(2); cgQzDraw();
  if (cg.pvp) netSend({ t: "cgQz", to: cg.pvp.id, r: q.r, c: q.c, tm: q.t });
  cgQzTry();
}
function cgQzTry() {
  const q = cg?.qz, o = cg?.qzOpp; if (!q || !o || o.r !== q.r || cg.phase !== "quiz") return;
  const el = (performance.now() - q.t0) / 1000;
  if (!q.done && o.c >= QZ_N && el > o.t) { q.i = QZ_N; cgQzDone(); return; }   /* they got all 10 before you could: no need to go on */
  if (!q.done) return;
  cg.phase = "steal";
  const me = q.c > o.c || (q.c === o.c && (q.t < o.t || (q.t === o.t && !cg.challenger))), none = !q.c && !o.c;
  $("cgQzOpp").textContent = `${cg.oppName} ${o.c} ✓ · ${o.t}s`; $("cgQzMe").textContent = `나 · you ${q.c} ✓ · ${q.t}s`;
  const them = cg.picks[q.r].sel.filter(i => i >= 0 && i < cg.oppHand.length);
  if (none) { cgQzMsg("아무도 못 맞혔어요 · nobody got one right", "", () => cgAfterSteal()); return; }
  if (me && !them.length) { cgQzMsg("⚡ 퀴즈 승리! · you won the quiz", "상대 필드에 카드가 없어요 · their field is empty", () => cgAfterSteal()); return; }
  if (!me && !cg.sel.length) { cgQzMsg(`⚡ ${cg.oppName} 승리 · they won the quiz`, "내 필드에 카드가 없어요 · your field is empty", () => cgAfterSteal()); return; }
  if (me) {
    $("cgQz").className = "cgQz steal"; $("cgQzWord").textContent = "🗑";
    $("cgQzHead").innerHTML = `<b>⚡ 퀴즈 승리! · you won the quiz (${q.c} ✓, ${q.t}s)</b><span>${QZ_STEAL}초 안에 상대 카드 1장을 없애세요 · remove one of their cards in ${QZ_STEAL} s (a card that didn't count anyway is a waste)</span>`;
    $("cgQzOpts").innerHTML = them.map((hi, k) => { const c = cg.oppHand[hi], w = WORD[c.id]; return `<button class="r${c.rar}" data-h="${hi}"><kbd>${k + 1}</kbd>${esc(w.kb || w.kr)}<small>+${CG_PTS[c.rar]}</small></button>`; }).join("");
    $("cgQzOpts").querySelectorAll("button").forEach(b => b.onclick = () => cgSteal(+b.dataset.h));
    cg.stealEnd = performance.now() + QZ_STEAL * 1000; snd("bell", .6, 1.2);
  } else {
    cgQzMsg(`⚡ ${cg.oppName} 승리 · they won the quiz (${o.c} ✓)`, "상대가 내 카드 1장을 고르고 있어요… · they're choosing one of your cards to remove", null);
    if (cg.npc) setTimeout(() => {   /* the student usually takes your best card that counts; low ranks often pick wrong */
      if (!cg || cg.phase !== "steal") return;
      const mine = cg.sel.map(i => cg.hand[i]), sc = cgScore(mine, cg.rule), best = sc.pts.indexOf(Math.max(...sc.pts));
      const k = Math.random() < Math.min(.9, .45 + cg.rank * .06) ? best : Math.floor(Math.random() * mine.length);
      cgStolen(cg.sel[k]);
    }, rand(1200, 2600));
    else cg.stealWait = performance.now() + (QZ_STEAL + 7) * 1000;
  }
}
function cgQzMsg(big, small, then) {
  $("cgQz").className = "cgQz msg"; $("cgQzOpts").innerHTML = ""; $("cgQzWord").textContent = "";
  $("cgQzHead").innerHTML = `<b>${big}</b>${small ? `<span>${small}</span>` : ""}`;
  if (then) setTimeout(() => { if (cg && cg.phase === "steal") then(); }, 1600);
}
function cgSteal(hi) {   /* I remove the opponent's card at their hand index hi (−1 = time ran out) */
  if (!cg || cg.phase !== "steal" || cg.rmOpp !== null) return;
  cg.rmOpp = hi; cg.stealEnd = 0;
  if (cg.pvp) netSend({ t: "cgSteal", to: cg.pvp.id, r: cg.round, h: hi });
  if (hi >= 0) { const w = WORD[cg.oppHand[hi].id]; cgQzMsg(`🗑 ${w.kb || w.kr} 없앴어요!`, "removed from their field", () => cgAfterSteal()); snd("boom", .5, 1.4); }
  else cgQzMsg("⏰ 시간 끝 · time's up", "아무 카드도 없애지 못했어요 · nothing removed", () => cgAfterSteal());
}
function cgStolen(hi) {   /* the opponent removed my card at hand index hi */
  if (!cg || cg.phase !== "steal" || cg.rmMine !== null) return;
  cg.rmMine = hi; cg.stealWait = 0;
  if (hi >= 0 && cg.sel.includes(hi)) { const w = WORD[cg.hand[hi].id]; cg.sel = cg.sel.filter(x => x !== hi); cgQzMsg(`🗑 ${cg.oppName}: ${w.kb || w.kr} 없앴어요`, "they removed one of your cards", () => cgAfterSteal()); snd("punchH", .5, .9); }
  else cgQzMsg("상대가 아무것도 못 없앴어요 · they removed nothing", "", () => cgAfterSteal());
}
function cgAfterSteal() {
  if (!cg) return; $("cgQz").hidden = true;
  if (cg.rmOpp !== null && cg.rmOpp >= 0) cg.picks[cg.round].sel = cg.picks[cg.round].sel.filter(x => x !== cg.rmOpp);
  cg.phase = "wait"; cgResolve();
}
function cgResolve() {
  const r = cg.round, op = cg.picks[r]; if (cg.phase !== "wait") return; cg.phase = "reveal"; $("cgOppState").textContent = "✓";
  const my = cg.sel.map(i => cg.hand[i]), them = op.sel.filter(i => i >= 0 && i < cg.oppHand.length).map(i => cg.oppHand[i]);
  const a = cgScore(my, cg.rule), b = cgScore(them, cg.rule); cg.myPts = a.pts;
  const win = a.total !== b.total ? a.total > b.total : a.n !== b.n ? a.n > b.n : cg.myEnd !== op.t ? cg.myEnd < op.t : !cg.challenger;
  const why = a.total !== b.total ? "" : a.n !== b.n ? "같은 점수 → 카드가 더 많은 쪽 · tie: more cards wins" : cg.myEnd !== op.t ? "같은 점수, 같은 장수 → 더 빨리 끝낸 쪽 · tie: the faster turn wins" : "완전히 같아요 → 도전한 쪽이 져요 · dead even: the challenger loses";
  my.forEach((c, k) => { if (a.pts[k] > 0) stat(c.id).c++; else stat(c.id).w++; });
  (cg.hist = cg.hist || []).push({ r, rule: cg.rule, hand: cg.hand, sel: cg.sel.slice(), pts: a.pts, got: a.total, best: cgBest(cg.hand, cg.rule), rm: cg.rmMine });
  cgDrawHand(true); cg.wins[win ? 0 : 1]++;
  const now = performance.now();
  cg.mons = [...cgSpawn(1, my, a.pts, now), ...cgSpawn(-1, them, b.pts, now)];
  $("cgMyPts").textContent = "0"; $("cgOppPts").textContent = "0"; $("cgScore").hidden = false;
  cgCount(a.total, b.total, now + 900);
  const tScore = 900 + cg.mons.length * 110 + 350;   /* the points have counted up: show the score, then attack */
  setTimeout(() => { if (!cg || cg.phase === "end") return; cgPips(); cgVs(a.total, b.total, win, why); }, tScore);
  setTimeout(() => cgAttack(win), tScore + 1300);
  setTimeout(() => { if (!cg || cg.phase === "end") return; if (cg.wins[0] >= 2 || cg.wins[1] >= 2) cgFinish(); else cgNextRound(); }, tScore + 1300 + Math.max(2200, cg.mons.length * 260));
}
function cgSpawn(side, cards, pts, now) {
  const n = cards.length;
  return cards.map((c, i) => {
    const t = CG_TYPE[cgPos(c.id)], m = makeMonster(t.mon), x = CARENA.x + (i - (n - 1) / 2) * Math.min(2.3, 18 / Math.max(1, n)), z = CARENA.z + side * 3.6;
    m.root.scale.setScalar(.01); m.root.position.set(x, 0, z); m.root.rotation.y = side > 0 ? Math.PI : 0; scene.add(m.root);
    if (CG_GLOW[c.rar]) { const ring = new THREE.Mesh(new THREE.RingGeometry(.7, 1.25, 28), new THREE.MeshBasicMaterial({ color: CG_GLOW[c.rar], transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = .08; m.root.add(ring); m.ring = ring; }
    if (c.rar === 3) { const crown = new THREE.Group(), gold = new THREE.MeshBasicMaterial({ color: "#ffd23d", toneMapped: false }); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, sp = new THREE.Mesh(new THREE.ConeGeometry(.09, .32, 5), gold); sp.position.set(Math.cos(a) * .28, .16, Math.sin(a) * .28); crown.add(sp); } const band = new THREE.Mesh(new THREE.TorusGeometry(.3, .05, 6, 18), gold); band.rotation.x = Math.PI / 2; crown.add(band); crown.position.y = m.height + .15; m.root.add(crown); }
    return { m, s: CG_SIZE[c.rar], x, z, side, id: c.id, rar: c.rar, pts: pts[i], born: now + i * 140 + (side < 0 ? 70 : 0), shown: false, gone: false, t };
  });
}
function cgCount(ma, mb, at) {   /* the totals tick up while each monster's points pop over it */
  let a = 0, b = 0;
  cg.mons.forEach((o, k) => setTimeout(() => { if (!cg || o.gone) return;
    floater({ x: o.x, z: o.z }, `${WORD[o.id].kb || WORD[o.id].kr} ${o.pts > 0 ? "+" + o.pts : "✗ " + o.pts}`, o.pts > 0 ? (o.side > 0 ? "#ffd23d" : "#d8b8ff") : "#9a9a9a", false, o.m.height * o.s + .6 + (k % 2) * 1.1);   /* every second one higher: neighbours don't overlap */
    if (o.pts > 0) { if (o.side > 0) a += o.pts; else b += o.pts; $("cgMyPts").textContent = a; $("cgOppPts").textContent = b; snd("coins", .25, 1 + o.pts * .1); }
    else { if (o.side > 0) a += o.pts; else b += o.pts; $("cgMyPts").textContent = a; $("cgOppPts").textContent = b; o.fizzle = performance.now(); snd("punchM", .25, .7); }
  }, at - performance.now() + k * 110));
}
function cgAttack(win) {
  if (!cg) return;
  const att = cg.mons.filter(o => o.side === (win ? 1 : -1) && !o.gone && o.pts > 0), vic = cg.mons.filter(o => o.side === (win ? -1 : 1) && !o.gone);
  vic.forEach((v, k) => { const ai = att.length ? k % att.length : -1, a = att[ai], m = att.length ? Math.floor(k / att.length) : k; setTimeout(() => { if (!cg) return; if (a && !a.gone) a.charge = { to: v, t: 0, from: { x: a.x, z: a.z } }; else cgKill(v); }, (ai < 0 ? 0 : ai * 160) + m * 520); });
  if (!vic.length) att.forEach(o => o.cheer = performance.now());
}
function cgKill(v) {
  if (v.gone) return; v.gone = true; const at = v.m.root.position.clone(), cols = [...v.t.col, "#ffffff"];
  FX.explosion(at, cols, .9 + v.rar * .25); FX.burst(at, { n: 26 + v.rar * 10, color: cols, speed: 9, up: 1.3, size: .2, life: 1, grav: 12, additive: false, y: 1 });
  FX.ring(at, { color: CG_GLOW[v.rar] || "#ffffff", r: 2 + v.rar * .5 }); FX.shake(.2 + v.rar * .08); FX.stop(.05);
  snd("boom", .55, 1.2 - v.rar * .1); snd("glass", .3, 1.4); scene.remove(v.m.root);
}
// the best hand of a round: for every type the rule names, its highest cards up to the limit
function cgBest(hand, rule) { const sel = []; for (const [t, n] of Object.entries(rule.lim)) sel.push(...hand.map((c, i) => i).filter(i => cgPos(hand[i].id) === t).sort((a, b) => hand[b].rar - hand[a].rar).slice(0, n)); return sel; }
function cgFinish() {
  if (!cg || cg.phase === "end") return;
  cg.phase = "end"; $("cg").hidden = true; $("cgVs").hidden = true; $("cgQz").hidden = true;
  if (cg.hist?.length) cgReview(cgFinishRewards); else cgFinishRewards();
}
function cgReview(then) {
  const box = $("cgReview"), h0 = cg.hist;
  box.innerHTML = `<div class="crIn"><h2>📖 복습 · the best hand you could have played</h2><p class="fine">★ 최고의 패 · the best hand · ✓ 낸 카드 · you played it (✗ = 0 points) · 단어를 누르면 소리가 나요 · click a word to hear it</p>` +
    h0.map(h => { const bp = cgScore(h.best.map(i => h.hand[i]), h.rule).total, perfect = h.got >= bp;
      return `<section><div class="crHead"><b>라운드 ${h.r + 1}</b><span>${ruleKo(h.rule)} · ${ruleEn(h.rule)}</span><span class="${perfect ? "okc" : "warn"}">내 점수 · yours ${h.got} / 최고 · best ${bp}${perfect ? " · 완벽! · perfect" : ""}</span></div>
        <div class="crGrid">${h.hand.map((c, i) => { const w = WORD[c.id], t = CG_TYPE[cgPos(c.id)], b = h.best.includes(i), p = h.sel.includes(i), ok = p && h.pts[h.sel.indexOf(i)] > 0;
          return `<button class="crCard r${c.rar}${b ? " best" : ""}${p ? (ok ? " ok" : " no") : ""}" data-id="${c.id}"><b>${esc(w.kb || w.kr)}</b><span class="ty">${t.ko} · ${t.en}</span><small>${esc(w.en)}</small><i>+${CG_PTS[c.rar]}${b ? " ★" : ""}${p ? (ok ? " ✓" : " ✗ " + h.pts[h.sel.indexOf(i)]) : h.rm === i ? " 🗑 removed" : ""}</i></button>`; }).join("")}</div></section>`; }).join("") +
    `<button class="crGo" id="crGo">계속 · continue <kbd>Enter</kbd></button></div>`;
  box.hidden = false; box.scrollTop = 0;
  box.querySelectorAll(".crCard").forEach(b => b.onclick = () => say([wordClip(b.dataset.id)], { interrupt: true }));
  $("crGo").onclick = () => { box.hidden = true; then(); };
}
addEventListener("keydown", e => { if ($("cgReview").hidden || (e.key !== "Enter" && e.key !== " ")) return; e.preventDefault(); e.stopImmediatePropagation(); $("crGo").click(); }, true);
function cgFinishRewards() {
  const d = cg, won = d.wins[0] >= 2; d.phase = "end"; $("cg").hidden = true; $("cgVs").hidden = true;
  const rows = [{ big: true, icon: won ? "🏆" : "🃏", ko: `${d.wins[0]} : ${d.wins[1]}`, en: won ? `you beat ${d.oppName}` : `${d.oppName} won (first to 2 rounds)` }];
  if (d.gaveUp) rows.push({ icon: "🏳", ko: "포기했어요 · you gave up", en: "" }); else if (d.oppQuit) rows.push({ icon: "🏳", ko: `${d.oppName} 님이 포기했어요`, en: "your opponent gave up" });
  if (d.npc) {
    const kind = d.npc, c = CB[kind], ch = cbChapter(kind);
    if (won) {
      (S.cbWins = S.cbWins || {})[kind] = (S.cbWins[kind] || 0) + 1;
      if (!c.rank && !S.seoulCards?.[c.area]) { (S.seoulCards = S.seoulCards || {})[c.area] = Date.now(); rows.push({ iconHtml: seoulCardHTML(c.area), ko: `서울 카드 · ${SEOUL_CARDS[c.area].ko}`, en: `Seoul card ${Object.keys(S.seoulCards).length} / 6 (inventory → 서울 카드)` }); }
      else for (const cc of chapterCards(ch, RANK_CARDS)) rows.push({ icon: "🃏", ko: `${WORD[cc.id].kr} · ${RARITY[cc.rar].ko}`, en: `${WORD[cc.id].en} · ${ch.title} · ${modText(cc)}`, color: RARITY[cc.rar].c });
      if (c.rank && S.cbWins[kind] === 1) rows.push(c.rank < 8 ? { big: true, icon: "🏅", ko: `카드 랭크 업! 랭크 ${c.rank + 1}`, en: `card rank up: ${CB["sg" + (c.rank + 1)].name} (랭크 ${c.rank + 1}) will battle you now` } : { big: true, icon: "👑", ko: "최고 랭크!", en: "you beat every rank on the plaza" });
    }
    save();
    showLine({ name: NPC_DEF[kind] || c.name }, won ? "cb_win" : "cb_lose", [{ ko: "(계속 · continue)", en: "", act: () => { closeDialog(); showReward(won ? "🃏 카드 배틀 승리! · you won" : "🃏 카드 배틀 · card battle", rows, () => fade(cgLeave)); } }]);
  } else { rows.push({ icon: "🤝", ko: "친구와 연습 · a friendly match", en: "no prize in battles between friends (yet)" }); showReward(won ? "🃏 카드 배틀 승리! · you won" : "🃏 카드 배틀 · card battle", rows, () => fade(cgLeave)); }
}
function cgLeave() {
  const d = cg; if (!d) return; cg = null;
  for (const o of d.mons) scene.remove(o.m.root); scene.remove(d.oppModel.root); $("cg").hidden = true;
  player.zone = d.back.zone; player.pos.set(d.back.x, 0, d.back.z); player.yaw = d.back.yaw; paused = false; $("hud").hidden = false;
  if (comp) { comp.model.root.visible = true; comp.zone = player.zone; comp.pos.copy(player.pos).add(new THREE.Vector3(1.5, 0, 1.5)); }
}
function cgRender(dt) {
  if (!cg) return;
  const now = performance.now();
  if (cg.phase === "pick") { const left = Math.max(0, (cg.endAt - now) / 1000); $("cgBar").style.width = left / cg.time * 100 + "%"; $("cgSec").textContent = Math.ceil(left); $("cg").classList.toggle("hurry", left < 3); if (left <= 0) cgEndTurn(true); }
  if (cg.phase === "wait" && cg.pvp && !cg.picks[cg.round] && now - cg.waitT > cg.time * 1000 + 8000) { cg.picks[cg.round] = { sel: [], t: cg.time }; cgQuizStart(); }
  if (cg.phase === "quiz" && cg.qz) {
    const el = (now - cg.qz.t0) / 1000;
    if (!cg.qz.done && el > QZ_MAX) { cg.qz.i = QZ_N; cgQzDone(); }
    if (cg.npc && cg.qzOpp) { const n = cg.qzOpp.at.filter(t => t <= el).length; $("cgQzOpp").textContent = `${cg.oppName} ${n} / ${QZ_N}`; cgQzTry(); }
    else if (cg.pvp && !cg.qzOpp) { $("cgQzOpp").textContent = `${cg.oppName} 푸는 중… · answering`; if (cg.qz.done && el > QZ_MAX + 10) { cg.qzOpp = { r: cg.round, c: 0, t: 99 }; cgQzTry(); } }
  }
  if (cg.phase === "steal" && cg.stealEnd) { const left = Math.max(0, (cg.stealEnd - now) / 1000); $("cgQzWord").textContent = "🗑 " + Math.ceil(left); if (left <= 0) cgSteal(-1); }
  if (cg.phase === "steal" && cg.stealWait && now > cg.stealWait) cgStolen(-1);
  if (cg.npc && cg.phase === "pick" && cg.picks[cg.round] && (now - cg.t0) / 1000 > cg.picks[cg.round].t) $("cgOppState").textContent = "✓ 다 골랐어요 · done";
  cg.oppModel.anim?.(dt, {}); player.model.root.position.set(player.pos.x, 0, player.pos.z); player.model.root.rotation.y = Math.PI; player.model.anim(dt, {});
  for (const r of remotes.values()) { if (r.model) r.model.root.visible = false; if (r.plate) r.plate.style.display = "none"; }
  for (const o of cg.mons) {
    if (o.gone) continue;
    const age = (now - o.born) / 1000; if (age < 0) continue;
    if (!o.shown) { o.shown = true; if (o.rar) FX.glow({ x: o.x, z: o.z }, { color: CG_GLOW[o.rar], pillar: true, r: .4 + o.rar * .15, h: 3 + o.rar * 2.5, life: .45, opacity: .55 }); FX.ring({ x: o.x, z: o.z }, { color: CG_GLOW[o.rar] || "#ffffff", r: 1.4 }); snd("field", .25, 1.4 + o.rar * .15); }
    let sc = age < .35 ? o.s * (1 - Math.pow(1 - age / .35, 3)) * 1.15 : o.s;
    if (o.fizzle) { const f = (now - o.fizzle) / 1000; sc = o.s * Math.max(0, 1 - f * 1.6); if (f > .62) { o.gone = true; FX.deathPoof(o.m.root.position, false); scene.remove(o.m.root); continue; } }
    o.m.root.scale.setScalar(Math.max(.01, sc)); if (o.ring) o.ring.material.opacity = .45 + Math.sin(now / 180 + o.x) * .3;
    let moving = false;
    if (o.charge) {
      const c = o.charge, v = c.to, tx = v.x, tz = v.z + o.side * 1.1; c.t += dt;
      if (!c.hit) { const k = Math.min(1, c.t / .22); o.m.root.position.set(c.from.x + (tx - c.from.x) * k, Math.sin(k * Math.PI) * 1.2, c.from.z + (tz - c.from.z) * k); moving = true; if (k >= 1) { c.hit = true; c.t = 0; cgKill(v); } }
      else { const k = Math.min(1, c.t / .25); o.m.root.position.set(tx + (c.from.x - tx) * k, 0, tz + (c.from.z - tz) * k); moving = true; if (k >= 1) { o.charge = null; o.m.root.position.set(o.x, 0, o.z); o.cheer = now; } }
    }
    if (o.cheer && now - o.cheer < 900) o.m.root.position.y = Math.abs(Math.sin((now - o.cheer) / 140)) * .5;
    o.m.anim(dt, { moving, attack: o.charge && !o.charge.hit ? Math.min(1, o.charge.t / .22) : 0 });
  }
  const ak = Math.max(1, 1.7 / camera.aspect);   /* narrow windows: step back so the whole arena still fits */
  camera.position.set(CARENA.x + FX.shakeState.x, CG_CAM.y * ak + FX.shakeState.y, CARENA.z + CG_CAM.z * ak + FX.shakeState.z); camera.lookAt(CARENA.x, 0, CARENA.z + CG_CAM.look);
}
addEventListener("keydown", e => {
  if (!cg || $("cg").hidden) return;
  e.stopImmediatePropagation();
  if (cg.phase === "quiz" && e.key >= "1" && e.key <= "4") { e.preventDefault(); cgQzAnswer(+e.key - 1); return; }
  if (cg.phase === "steal" && cg.stealEnd && e.key >= "1" && e.key <= "9") { e.preventDefault(); const b = $("cgQzOpts").children[+e.key - 1]; if (b) b.click(); return; }
  if (cg.phase !== "pick") { if (!/^F\d+$/.test(e.key)) e.preventDefault(); return; }
  const k = e.key === "0" ? 9 : +e.key - 1;
  if (e.key >= "0" && e.key <= "9") { e.preventDefault(); cgToggle(k); }
  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cgEndTurn(false); }
  else if (!/^F\d+$/.test(e.key)) e.preventDefault();
}, true);
// co-op: challenge a friend standing next to you; the challenger deals (a shared seed), both play the same rules, picks are swapped
let cgAsk = null, cgAccepted = null;
$("cgQuit").onclick = () => cgGiveUp();
$("cgEnd").onclick = () => cgEndTurn(false);   /* Danny 2026-10-19: the button had no click handler, only Enter worked */
function cgChallenge(r) {
  if (battleDeck().length < CG_DECK) { cgNeedDeck(); return; }
  cgAsk = { id: r.id, at: Date.now() }; netSend({ t: "cgReq", to: r.id, nm: myName() }); toast(`🃏 ${r.nm}에게 카드 배틀을 신청했어요 · challenge sent`);
}
function cgOnNet(d, src) {
  if (d.t === "cgReq") {
    if (cg || duel || exam) { netSend({ t: "cgNo", to: src, why: "busy" }); return; }
    const box = $("inviteBox"); box.hidden = false;
    box.innerHTML = `<b>🃏 ${esc(d.nm)}</b> 님이 카드 배틀을 신청했어요 · challenges you to a card battle<div class="ib"><button id="cgYes">배틀! · accept</button><button id="cgNo">거절 · decline</button></div>`;
    $("cgYes").onclick = () => { box.hidden = true; if (battleDeck().length < CG_DECK) { cgNeedDeck(); netSend({ t: "cgNo", to: src, why: "deck" }); return; } const mine = battleDeck().slice(0, CG_DECK).map(id => ({ id, rar: bestRar(id) })); cgAccepted = { id: src, mine }; netSend({ t: "cgAcc", to: src, nm: myName(), cls: S.cls, lk: S.look || 0, deck: mine }); };
    $("cgNo").onclick = () => { box.hidden = true; netSend({ t: "cgNo", to: src, why: "no" }); };
    clearTimeout(showInvite.t); showInvite.t = setTimeout(() => { box.hidden = true; }, 30000); SFX.pickup(); logChat("system", `🃏 ${d.nm} challenges you to a card battle`);
  } else if (d.t === "cgAcc") {
    if (!cgAsk || cgAsk.id !== src || cg) return; cgAsk = null;
    const mine = battleDeck().slice(0, CG_DECK).map(id => ({ id, rar: bestRar(id) })), seed = Math.floor(Math.random() * 2 ** 31);
    netSend({ t: "cgGo", to: src, nm: myName(), cls: S.cls, lk: S.look || 0, deck: mine, seed });
    cgStart({ pvp: { id: src, nm: d.nm, cls: d.cls, lk: d.lk, deck: d.deck, mine, seed, challenger: true } });
  } else if (d.t === "cgGo") {
    if (!cgAccepted || cgAccepted.id !== src || cg) return; const mine = cgAccepted.mine; cgAccepted = null;
    cgStart({ pvp: { id: src, nm: d.nm, cls: d.cls, lk: d.lk, deck: d.deck, mine, seed: d.seed, challenger: false } });
  } else if (d.t === "cgQz") { if (cg?.pvp?.id === src) { const o = { r: d.r, c: d.c, t: d.tm }; if (cg.qz?.r === d.r) { cg.qzOpp = o; cgQzTry(); } else (cg.qzOppEarly = cg.qzOppEarly || {})[d.r] = o; } }
  else if (d.t === "cgSteal") { if (cg?.pvp?.id === src && d.r === cg.round) cgStolen(d.h); }
  else if (d.t === "cgPick") { if (cg?.pvp?.id === src) { cg.picks[d.r] = { sel: d.sel || [], t: d.tm }; if (d.r === cg.round) { $("cgOppState").textContent = "✓ 다 골랐어요 · done"; cgTryResolve(); } } }
  else if (d.t === "cgNo") { cgAsk = null; toast(d.why === "deck" ? "상대의 배틀 덱이 아직 40장이 안 돼요 · their battle deck isn't ready" : d.why === "busy" ? "지금 바빠요 · they're busy" : "거절했어요 · they declined"); }
  else if (d.t === "cgQuit") { if (cg?.pvp?.id === src && cg.phase !== "end") { cg.wins = [2, cg.wins[1]]; cg.oppQuit = true; toast(`🏳 ${cg.oppName} 님이 포기했어요 · your opponent gave up`); cgFinish(); } }
}
function cgGiveUp() {
  if (!cg || cg.phase === "end") return;
  const b = $("cgQuit");
  if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "정말 포기할까요? · really give up?"; clearTimeout(cgGiveUp.t); cgGiveUp.t = setTimeout(() => { delete b.dataset.sure; b.textContent = "🏳 포기 · give up"; }, 3000); return; }
  delete b.dataset.sure; b.textContent = "🏳 포기 · give up";
  if (cg.pvp) netSend({ t: "cgQuit", to: cg.pvp.id });
  cg.gaveUp = true; cg.wins = [cg.wins[0], 2]; snd("punchM", .4, .8); cgFinish();
}

// ---- main loop ------------------------------------------------------------------------------------------
let last = performance.now(), saveT = 0;
// ---- area guidance (Danny 2026-10-17) -------------------------------------------------------------------
const AREA_LV = { hongdae: 1, yeonnam: 1, sinchon: 4, sogang: 4, apt: 4, dangin: 6, seonyudo: 9, sayuksin: 12, itaewon: 15, river: 6, yeouido: 9, tower: 10, noryangjin: 12, market: 15, yongsan: 15, museum: 16 };
const AREA_KO = { hongdae: "홍대 거리", yeonnam: "연남동", sinchon: "신촌", sogang: "서강대학교", dangin: "당인리 발전소", seonyudo: "선유도공원", sayuksin: "사육신 공원", itaewon: "이태원", apt: "서교 아파트", river: "한강공원", yeouido: "여의도", tower: "63빌딩", noryangjin: "노량진", market: "수산시장", yongsan: "용산", museum: "국립중앙박물관" };
const AREA_GO = ["hongdae", "apt", "river", "yeouido", "noryangjin", "yongsan"];   // where 민수 sends you instead (overworld only)
function areaOf() {
  const p = player.pos, z = player.zone;
  if (z === "street") return p.z >= 108 ? (p.x > 310 ? "dangin" : "river") : p.z < -110 ? (p.x > 310 ? "sogang" : p.x > 108 ? "sinchon" : "yeonnam") : p.x > 108 ? "apt" : "hongdae";
  if (z === "yeouido") return p.x > YD.x + 462 ? "itaewon" : p.x < YD.x - 152 ? (p.z > YD.z + 400 ? "sayuksin" : "seonyudo") : p.x > YD.x + 152 ? "yongsan" : p.z > YD.z + 330 ? "noryangjin" : "yeouido";
  return z === "tower" || z === "market" || z === "museum" ? z : null;
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

let storyT = 0;
function step(dt) {
  if (paused || !started) return;
  if ((storyT -= dt) <= 0) { storyT = 2; syncStory(true); }   /* a new chapter can open as soon as a card arrives */
  clock += dt;
  S.time += dt * GAME_MIN_PER_SEC;
  night = nightFactor();
  S.hunger = Math.max(0, S.hunger - dt * 100 / HUNGER_SECONDS * (perk("handong") ? .5 : 1));
  checkAchievements(dt); netTick(dt); quizTick(dt); areaWatch(dt); levelExamTick(dt);
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
  updateMonsters(dt); updateProjectiles(dt); updateRings(dt); fishTick(dt); sqTick(dt); companionTick(dt); zooTick(dt); autoGradTick(dt); syncMike(); skillTick(dt); coldTick(dt); lineTick(dt); caveTick(dt);
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
  FX.fxTick(dt);
  for (const m of monsters) if (m.punch > 0) {   // a hit squashes the monster for a moment
    m.punch = Math.max(0, m.punch - dt * 7); const b = m.baseScale * (1 + (m.grow || 0)), k = m.punch;
    if (k > 0) m.model.root.scale.set(b * (1 + .16 * k), b * (1 - .2 * k), b * (1 + .16 * k)); else m.model.root.scale.setScalar(b);
  }
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
    const RZc = player.zone === "dungeon" ? DUNGEON : player.zone === "tower" ? TOWER : player.zone === "market" ? MARKET : player.zone === "museum" ? MUSEUM : null;
    if (player.zone === "street" || player.zone === "yeouido") cd = Math.max(1.6, Math.min(cd, camClear(p.x, p.z, dx, dz, cam.dist) - .6));
    if (RZc) cd = Math.min(cd, 7);
    camera.position.set(p.x + dx * cd, 1.8 + Math.sin(cam.pitch) * cd, p.z + dz * cd);
    if (RZc) { const cp2 = { x: camera.position.x, z: camera.position.z }; clampDungeon(cp2, .4, RZc.wrects); camera.position.x = cp2.x; camera.position.z = cp2.z; const room = RZc.wrects.find(q => inRect(cp2, q)); if (!(room && room.roof)) camera.position.y = Math.min(camera.position.y, room && room.room ? 7.2 : room ? 4.4 : 5.3); }
    else if (player.zone === "street") { camera.position.x = Math.min(STREET.maxX + 1, Math.max(STREET.minX - 1, camera.position.x)); camera.position.z = Math.min(STREET.maxZ + 1, Math.max(STREET.minZ - 1, camera.position.z)); }
    else if (player.zone === "station") { camera.position.x = Math.min(STATION.x + 17, Math.max(STATION.x - 17, camera.position.x)); camera.position.z = Math.min(STATION.z + 9.4, Math.max(STATION.z - 9.4, camera.position.z)); camera.position.y = Math.min(4.6, camera.position.y); }
    camera.lookAt(p.x, 1.6, p.z);
    camera.position.x += FX.shakeState.x; camera.position.y += FX.shakeState.y; camera.position.z += FX.shakeState.z;
    duelRender(dt); cgRender(dt);
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
    else if (player.zone === "museum") { world.sun.intensity = .25; world.hemi.intensity = .7; }
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
// Danny 2026-10-18 "the game just crashed": one error in a frame used to stop the loop for good (the next frame was asked for after
// it). Now the next frame is asked for first, and an error is caught, kept (localStorage seoulmmo_err, newest first) and shown once
let errShown = 0;
function frameError(e) {
  const msg = String(e && e.message || e), at = String(e && e.stack || "").split("\n").slice(1, 4).map(l => l.trim()).join(" | ");
  console.error(e);
  try { const L = JSON.parse(localStorage.getItem("seoulmmo_err") || "[]"); if (!L.length || L[0].msg !== msg) { L.unshift({ t: new Date().toISOString(), msg, at, zone: player.zone }); localStorage.setItem("seoulmmo_err", JSON.stringify(L.slice(0, 10))); } } catch (x) {}
  if (performance.now() - errShown > 20000) { errShown = performance.now(); try { toast("⚠ 오류 · error: " + msg.slice(0, 80) + " — the game keeps going"); } catch (x) {} }
}
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  try { step(performance.now() < FX.hitStop.until ? dt * .06 : dt); } catch (e) { frameError(e); }
  try { render(dt); } catch (e) { frameError(e); }
}

// ---- boot ---------------------------------------------------------------------------------------------
async function boot() {
  try { await Promise.race([Promise.all([document.fonts.load('64px "Black Han Sans"'), document.fonts.load('700 20px "Noto Sans KR"', '가나다')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  world = buildWorld(scene);
  await Promise.all([loadKayKit(), loadWomen(), loadPeople()]);
  placeNPCs(); buildSideSpots(); placeMapItem(); placeRacks(); buildCampParts(); applyQuality(); refreshKeyLabels(); setMusicVolume(SET.music); makeSpawnPoints();
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
  give(n) { S.money += n; }, growBasic: a => growBasic(a), campVis: () => campParts.map(g => g.visible), shopOffers: () => shopOffers(), get zoo() { return zoo; }, newestChapter: () => newestChapter(), ritualWeight: id => ritualWeight(id),
  step(sec) { for (let t = 0; t < sec; t += 1 / 30) step(1 / 30); render(1 / 30); },
  answer(right = true) { if (!ritual) return; const id = ritual.words[ritual.idx]; const i = ritual.opts.indexOf(id); pickCard(right ? i : (i + 1) % CHOICES); },
  attack: (k = "basic") => startRitual(k),
  setBook(b) { S.book = b; S.chapters = []; }, bookChapters: () => bookChapters(), bookWords: () => bookWords(), setNewBook(b) { newBook = b; },
  gap: lv => ({ g: lvlGap(lv), taken: gapTaken(lv), cls: gapClass(lv) }), areaOf: () => areaOf(), aptHint: () => aptHint(),
  syncStory: () => syncStory(true), xpNeed: L => xpNeed(L), setMode(m) { S.mode = m; syncStory(false); }, setNewMode(m) { newMode = m; },
  giveDeck(ids, k = "basic") { const cs = ids.map(id => newCard(id, 0)); S.cards.push(...cs); S.skillDecks[k] = cs.map(c => c.uid); if (!S.origin) { S.origin = deckBonus(ids); S.chapters = [...new Set(ids.map(id => WORD[id].ch))]; } recalcMax(); },
  drop: m => dropCard(m || { kind: "dokkaebi", pos: player.pos }),
  gear: (kind = "dokkaebi") => { const g = Object.keys(GEAR).find(k => GEAR[k].drop === kind); addItem(g); }, tab: () => cycleTarget(), toStreet: () => toStreet(), toStation: () => toStation(),
  tp(x, z) { player.pos.set(x, 0, z); },
  spawn(kind, lvl, x, z, zone = "street") { spawnMonster({ kind, lvl, x, z, mon: null, zone }); return monsters[monsters.length - 1]; },
  wordCounts: () => wordCounts(), drawFriends: () => drawFriends(),
  toYeouido: () => toYeouido(), toTower: () => toTower(), towerToYd: () => towerToYd(), toStreetBridge: () => toStreetBridge(), get tw() { return tw; }, get order() { return order; }, orderPick: k => orderPick(k), get rubble() { return rubble; }, rackUse: () => rackUse(), FX, startCardBattle: k => startCardBattle(k), get cb() { return cb; }, cgStart: o => cgStart(o), cgBegin: k => cgBegin(k), get cg() { return cg; }, get bossDown() { return bossDown; }, CG_CAM, cgToggle: i => cgToggle(i), cgEndTurn: () => cgEndTurn(false), autoBattleDeck: () => autoBattleDeck(), battleDeck: () => battleDeck(), cgScore: (c, r) => cgScore(c, r), cgRule: () => cgRule(Math.random), cbPick: k => cbPick(k), CB, startDuel: k => startDuel(k), get duel() { return duel; }, duelPick: i => duelPick(i), relOf: k => relOf(k), setCompanion: k => setCompanion(k, { name: "test" }), dcMenu: k => dcMenu(npcs.find(n => n.kind === k), null), startExam: () => startExam(), get exam() { return exam; }, get examPending() { return examPending; }, toMuseum: () => toMuseum(), museumToYd: () => museumToYd(), get mu() { return mu; }, scrollQuiz: i => scrollQuiz(i), clearReward: (k, t) => clearReward(k, t), grantMissedSets: () => grantMissedSets(), autoCreditBossQuests: () => autoCreditBossQuests(), MUSEUM, SETS, openFriends: () => openFriends(), sendChat: t => sendChat(t), invite: i => invite(S.friends[i]), refreshFriends: () => refreshFriends(), probeFriend: c => probeFriend(c), get NET() { return NET; }, toMarket: () => toMarket(), marketToYd: () => marketToYd(), get mk() { return mk; }, boardQuiz: i => boardQuiz(i), particleQuestion: () => particleQuestion(), MARKET, get lines() { return lines; }, openBook: () => openBook(), learnSkills: () => learnSkills(true), useBar: i => useBar(i), EXTRA, get cds() { return cds; }, campTalk: () => campTalk(npcs.find(n => n.kind === "gayoung")), syncMike: () => { mikeDay = -1; syncMike(); }, CAMP, toggleBike: () => toggleBike(), openReroll: uid => openReroll(uid), upsertRemote: (id, st) => upsertRemote(id, st), remotes, interact: () => interact(), YEOUIDO, TOWER,
  get memo() { return memo; }, heart: n => addHeart(n), get comp() { return comp; }, get fishing() { return fishing; }, flip: i => flipStone(i), upgrade: () => upgradeMenu(npcs.find(n => n.kind === "smith")),
  talk: kind => talkTo(npcs.find(n => n.kind === kind)), get dialog() { return dialog; }, opt(i) { $("dOpts").children[i]?.click(); }, get quiz() { return quiz; }, quizAnswer(right = true) { if (quiz) answerQuiz(right ? quiz.opts.indexOf(quiz.answer) : (quiz.opts.indexOf(quiz.answer) + 1) % quiz.opts.length); },
};

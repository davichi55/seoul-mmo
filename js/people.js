// People (Danny 2026-10-19: change the models, "both/all", "just man for now"): the three player classes and the town's men on
// Quaternius "Ultimate Modular Men" bodies (assets/quaternius/men/, CC0), dressed the same way as the Dreamcatcher women (women.js
// builds them). Every class has three looks (the character screen switches them); every man in town gets a body and colours for his
// job. Colours name the model's own materials ("Hair", "Suit", ...; "Head/Red" = only on the head). Sitting people stay KayKit
// (this pack has no sitting animation).
import { loadBase, makePerson } from "./women.js?v=mve0epao";

const INK = "#16141a", NAVY = "#1f2a44", WINE = "#7a1f2b", GOLD = "#c9a43a", HAIR = "#1d1612", WHITE = "#f2efe6";

// the player classes: 검 (sword), 각궁 (horn bow), 방울 (bell rattle)
const SWORD = { weapon: "sword", anims: { idle: "Idle_Sword", attack: "Sword_Slash", cast: "Idle_Sword" } };
const BOW = { weapon: "bow", anims: { idle: "Idle", attack: "Gun_Shoot", cast: "Idle_Gun_Pointing" } };
const BELL = { weapon: "bell", anims: { idle: "Idle", attack: "Punch_Right", cast: "Wave" } };
export const LOOKS = {
  geomgaek: [
    { ko: "여행자", en: "traveller", base: "men/Adventurer", ...SWORD, hideNodes: ["Backpack"], col: { Green: NAVY, LightGreen: "#2a3658", Brown2: INK, Brown: "#3b2620", Black: INK, Gold: GOLD, Hair: HAIR } },
    { ko: "검은 갑옷", en: "dark armour", base: "men/Swat", ...SWORD, col: { Swat: "#3a3f4a", Swat_Black: INK, Visor: WINE } },
    { ko: "도시", en: "street", base: "men/Punk", ...SWORD, col: { Black: INK, White: WINE, LightBlue: "#22252c", "Head/Red_Dark": HAIR, "Head/Red": HAIR } },
  ],
  gungsu: [
    { ko: "사냥꾼", en: "ranger", base: "men/Adventurer", ...BOW, col: { Green: "#2f4a2a", LightGreen: "#3d5c33", Brown2: "#3b2a1a", Brown: "#5a4026", Gold: GOLD, Hair: "#2a1c14" } },
    { ko: "후드", en: "hoodie", base: "men/Hoodie", ...BOW, col: { Purple: "#2f4a3a", LightBlue: "#22303a", White: "#e8e4da", Hair: HAIR } },
    { ko: "산골", en: "mountain", base: "men/Farmer", ...BOW, col: { Brown: "#6a4a2a", LightBlue: "#2a3a30", Beige: "#d8cfb4", Red: WINE, Brown2: "#3b2a1a" } },
  ],
  mudang: [
    { ko: "도포", en: "robe", base: "men/King", ...BELL, hair: { len: 0, hide: ["Head/Gold"] }, col: { Metal: WHITE, Metal_Dark: "#c8402f", Blue: "#2f4f8a", Beige: "#e8dcc0", DarkBrown: INK, Gold: GOLD, Hair_White: HAIR } },
    { ko: "현대", en: "modern", base: "men/Business", ...BELL, col: { Suit: "#e8e2d4", Tie: "#c8402f", White: "#2f4f8a", Black: INK, Hair: HAIR } },
    { ko: "자유", en: "loose", base: "men/Beach", ...BELL, col: { LightBrown: "#c8402f", Red_Dark: "#2f4f8a", White: WHITE, Hair: HAIR } },
  ],
};

// the town's men, by the role names the game used for their KayKit look
const BUSY = { anims: { busy: "Interact" } };
export const MEN = {
  stranger: { base: "men/Business", col: { Suit: "#231d33", Tie: "#7a6aa8", White: "#3a3150", Black: INK, Hair: HAIR } },   // the man in black
  smith: { base: "men/Worker", ...BUSY, hideMats: [], col: { Worker_Yellow: "#3b2f26", Worker_Vest: "#5a4636", LightBrown: "#8a7a66", Brown: "#3b2620", Brown2: "#2a221c", Moustache: "#2a2522" } },
  minsu: { base: "men/Hoodie", col: { Purple: "#8aa8d8", LightBlue: "#2a3348", White: WHITE, Hair: HAIR } },
  clerk: { base: "men/Casual", col: { LightBrown: "#3a8f4c", LightBlue: "#2a3348", White: WHITE, Red_Dark: "#2a2a2e", Hair: HAIR } },   // 편의점 green
  mike: { base: "men/Casual", col: { LightBrown: "#c8d8f0", LightBlue: "#3a4a6a", White: WHITE, Red_Dark: "#8a2a22", Hair: "#d8b878" } },
  dealer: { base: "men/Punk", col: { Black: "#2a2f38", White: "#6a7a8a", LightBlue: "#1d2028", "Head/Red_Dark": "#2a2522", "Head/Red": "#2a2522" } },
  qm: { base: "men/Business", col: { Suit: "#e0b830", Tie: "#c8402f", White: WHITE, Black: INK, Hair: HAIR } },   // the quiz host's yellow suit
  stuA: { base: "men/Hoodie", col: { Purple: "#3a4a7a", LightBlue: "#2a2f3a", White: WHITE, Hair: HAIR } },
  stuB: { base: "men/Casual", col: { LightBrown: "#d8e4d0", LightBlue: "#2a3348", White: WHITE, Red_Dark: "#3a3f4a", Hair: "#2a1c14" } },
  stuC: { base: "men/Hoodie", col: { Purple: "#4a4a52", LightBlue: "#1f2228", White: "#d8d4cc", Hair: HAIR } },
  sqBusker: { base: "men/Punk", col: { Black: "#3a2440", White: "#e8b8d8", LightBlue: "#22252c", "Head/Red_Dark": "#c84a8a", "Head/Red": "#c84a8a" } },
  // Danny 2026-10-19: 엠마 and 예린 are women's names; the florist, photographer and docent (no name given) are women too
  sqTourist: { base: "Casual", col: { White: "#e8a83a", Orange: "#2f6db3", Grey: "#f0efe8", Brown: "#5a3a22", Hair_Brown: "#d8b878" }, hair: { mat: ["Head/Hair_Blond"], color: "#d8b878", len: .5, locks: true } },   // 엠마, the lost tourist
  sqPc: { base: "men/Hoodie", col: { Purple: "#5a5a66", LightBlue: "#2a2a30", White: "#c8c8d8", Hair: HAIR } },
  sqFisher: { base: "men/Farmer", col: { Brown: "#4a6a5a", LightBlue: "#3a4a52", Beige: "#c8c0a8", Red: "#2a3a30", Brown2: "#2a221c" } },
  sqBike: { base: "men/Beach", col: { LightBrown: "#3bb54a", Red_Dark: "#2a2f38", White: WHITE, Hair: HAIR } },   // 따릉이 green
  sqPhoto: { base: "Suit", col: { Black: "#2a2a30", White: "#ffd0d8", Brown: "#3b2620", Hair_Brown: "#2a1c14" }, hair: { mat: ["Head/Hair_Blond"], color: "#2a1c14", len: .3, sides: true } },
  sqGongsi: { base: "men/Hoodie", col: { Purple: "#2a3040", LightBlue: "#1f2228", White: "#a8a8b0", Hair: HAIR } },   // 공시생, all grey
  sqFlorist: { base: "Formal", col: { "Body/LimeGreen": "#e8a8b8", "Legs/LimeGreen": "#5a4a3a", Gold: "#3a8f4c", "Feet/Red": "#3a3026", Brown: "#3b2620" }, hair: { mat: ["Head/Red"], color: "#3a2418", len: .45, bangs: "side" } },
  sqStudent: { base: "Casual", col: { White: "#f4f2ec", Orange: "#2f5aa8", Grey: "#e8e4da", Brown: "#3b2620", Hair_Brown: "#2a1c14" }, hair: { mat: ["Head/Hair_Blond"], color: "#2a1c14", len: .55, bangs: "full" } },   // 예린, the student
  sqEngineer: { base: "men/Worker", col: { Moustache: "#2a2522" } },   // 기술자 아저씨: as he comes, hard hat and vest
  sqResearcher: { base: "men/Business", col: { Suit: "#e8eef0", Tie: "#2f6db3", White: "#c8d8e0", Black: "#3a3f4a", Hair: HAIR } },   // lab white
  sqCaretaker: { base: "men/Farmer", col: { Brown: "#8a7a5a", LightBlue: "#4a4a42", Beige: "#d8d0c0", Red: "#5a4a3a", Brown2: "#3a3026" } },
  sqShop: { base: "men/Casual", col: { LightBrown: "#f0b8d8", LightBlue: "#3a3348", White: WHITE, Red_Dark: "#2a2a2e", Hair: HAIR } },
  sqDocent: { base: "Suit", col: { Black: "#5a4a3a", White: "#e8dcc0", Brown: "#3b2620", Hair_Brown: "#3a2418" }, hair: { mat: ["Head/Hair_Blond"], color: "#3a2418", len: .35, bangs: "side" } },
  sgA: { base: "men/Hoodie", col: { Purple: "#7a1f2b", LightBlue: "#2a2f3a", White: WHITE, Hair: HAIR } },   // 서강 maroon
  sgB: { base: "men/Casual", col: { LightBrown: "#a8c8b8", LightBlue: "#2a3348", White: WHITE, Red_Dark: "#2a2a2e", Hair: "#2a1c14" } },
  sgC: { base: "men/Adventurer", hideNodes: ["Backpack"], col: { Green: "#8a7a5a", LightGreen: "#a8946a", Brown2: "#2a2f3a", Brown: "#3a3f4a", Hair: HAIR } },
  sgD: { base: "men/Punk", col: { Black: "#2a3a5a", White: "#b8c8e8", LightBlue: "#22252c", "Head/Red_Dark": HAIR, "Head/Red": HAIR } },
  // the grandmothers (station, 국밥집, by the river): a woman's body, grey hair, cardigan colours
  grandma: { base: "Casual", hair: { mat: ["Head/Hair_Blond"], color: "#d8d4cc", len: 0 }, col: { White: "#c8a8a0", Orange: "#6a4a5a", Grey: "#4a3f52", Brown: "#3b2620", Hair_Brown: "#d8d4cc" } },
  guard: { base: "men/Business", col: { Suit: "#2f4f6e", Tie: "#1f2533", White: "#c8d8e8", Black: INK, Hair: HAIR } },   // 경비 아저씨 / guards: navy uniform
};

let ready = false;
export async function loadPeople() {
  const bases = [...new Set([...Object.values(LOOKS).flat(), ...Object.values(MEN)].map(d => d.base))];
  try { await Promise.all(bases.map(b => loadBase(b))); ready = true; } catch (e) { console.warn("men models not loaded, using KayKit", e); }
  return ready;
}
export const peopleReady = () => ready;
const dress = d => ({ hair: { len: 0 }, ...d, col: { Hair: HAIR, ...(d.col || {}) } });
export const lookCount = cls => (LOOKS[cls] || []).length;
export function makeLook(cls, i = 0) { const L = LOOKS[cls]; return ready && L ? makePerson(dress(L[((i | 0) % L.length + L.length) % L.length]), 2.1) : null; }
export function makeMan(role) { return ready && MEN[role] ? makePerson(dress(MEN[role]), 2.1) : null; }

// The world: an overgrown block of Hongdae (Danny's pick A, 2026-10-11) + the 홍대입구역 station underneath (the safe place).
// Look = Danny's pick D: "painted summer" toon shading by day, neon signs + bloom at night.
// Layout (metres): the 양화로 boulevard runs north-south on the west side, alleys form a grid of shop blocks,
// 경의선숲길 (the park on the old railway line) is an open green band across the middle, a busking square in the
// south-west, apartment towers and office glass around the edges, mountains on the horizon.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const STATION = { x: 400, z: 0 };            // the station interior lives far from the street
export const STREET = { minX: -84, maxX: 470, minZ: -249, maxZ: 198 };   /* x > 310 by the river: 당인리 발전소 (2026-10-18) */   /* z < −110: 연남동 + 신촌 (2026-10-18) */   // walkable bounds: Hongdae (x < 108) + 서교 아파트 (x 110..308)   // walkable district bounds (name kept from the 1-street version)
export const ENTRANCE = { x: -51.5, z: 2 };         // Line 2 exit on the boulevard's east sidewalk (stairs open to -z)
const FONT = '"Black Han Sans","Malgun Gothic","Apple SD Gothic Neo",sans-serif';

const DAY = { sky: ["#79bde8", "#f7e3b5"], fog: "#efdcb8", near: 90, far: 430, sun: "#ffdca0", sunI: 3.0, hemiS: "#d4ecff", hemiG: "#5f7d3a", hemiI: 1.1 };
const NIGHT = { sky: ["#0f0a22", "#3a2050"], fog: "#24163a", near: 30, far: 160, sun: "#8ea2ff", sunI: 1.1, hemiS: "#6a5ab0", hemiG: "#0a140d", hemiI: 1.0 };
const LEAF = ["#4f9c39", "#6fbb48", "#8fd15a", "#3e8034", "#5aa83e"];
const WALLS = ["#eab78a", "#dd9271", "#a5c7cc", "#f1d49b", "#c9a5c9", "#aecb92", "#e8c7a0"];
const TRIM = "#8a5a3c", TRUNK = "#7a5236", VINE = "#3f6e2a", ROAD = "#80818a", WALK = "#cdbc9f";
const SIGNS = ["노래방", "치킨", "카페 숲", "편의점", "떡볶이", "PC방", "호프", "고기집", "약국", "옷가게", "버스킹", "분식", "만화카페", "라이브 클럽", "코인 노래방", "꽃집", "빵집", "닭갈비", "타투", "LP바", "보드게임", "인형뽑기"];
const PAINT = ["#c8402f", "#2f6db3", "#e0a21c", "#3a8f4c", "#8a3fa0", "#d2601e"];
const NEON = ["#ff3d8b", "#35e3ff", "#ffd23d", "#b06bff", "#5cff9d"];

// district plan --------------------------------------------------------------------------------------
const BOUL = { x0: -85, x1: -55 };                                   // 양화로 roadway; sidewalk -55..-48
const BX = [[-46, -30], [-20, 15], [25, 60], [70, 106]];             // shop block columns (alleys at x -25, 20, 65)
const BZ = [[-106, -65], [-55, -25], [-15, 5], [45, 75], [85, 106]]; // shop block rows (alleys at z -60, -20, 40, 80; park 8..35)
const PARK = { x0: -46, x1: 107, z0: 8, z1: 35 };                    // 경의선숲길
const SQUARE = { x0: -46, x1: -30, z0: -55, z1: -25 };               // busking square (a block left open)
const isSquare = (x, z) => x[0] === SQUARE.x0 && z[0] === SQUARE.z0;
// monster spawn points: open ground only, ~25 m apart, nothing near the subway exit (overworld = 1 against 1)
export const SPAWNS = [
  { x: -5, z: 20, kind: "dokkaebi" }, { x: 20, z: 14, kind: "vine" }, { x: 45, z: 26, kind: "dokkaebi" }, { x: 75, z: 18, kind: "haetae" },
  { x: 100, z: 26, kind: "vine" }, { x: -38, z: -46, kind: "dokkaebi" }, { x: -70, z: -45, kind: "haetae" }, { x: -70, z: 55, kind: "dokkaebi" },
  { x: 20, z: -60, kind: "vine" }, { x: 65, z: -20, kind: "dokkaebi" }, { x: -25, z: 80, kind: "vine" }, { x: 65, z: 80, kind: "haetae" },
  { x: -70, z: -92, kind: "dokkaebi", night: true }, { x: 20, z: 40, kind: "vine", night: true }, { x: 100, z: -60, kind: "haetae", night: true }, { x: -25, z: -92, kind: "dokkaebi", night: true },
  // 서교 아파트: stronger (Lv 4-5), still ~40 m apart
  { x: 150, z: -42, kind: "dokkaebi", lvl: 4 }, { x: 200, z: -44, kind: "vine", lvl: 4 }, { x: 250, z: -44, kind: "dokkaebi", lvl: 4 }, { x: 295, z: -42, kind: "haetae", lvl: 5 },
  { x: 150, z: 38, kind: "vine", lvl: 4 }, { x: 205, z: 52, kind: "dokkaebi", lvl: 4 }, { x: 255, z: 38, kind: "haetae", lvl: 5 }, { x: 295, z: 20, kind: "dokkaebi", lvl: 5 },
  { x: 175, z: 96, kind: "vine", lvl: 5, night: true }, { x: 265, z: 96, kind: "haetae", lvl: 5, night: true }, { x: 225, z: -98, kind: "dokkaebi", lvl: 5, night: true },
  // 한강공원: Lv 6-7, and a pair of aliens by the crashed pod that is only there 40% of the time (decision 16)
  { x: -60, z: 150, kind: "dokkaebi", lvl: 6 }, { x: -20, z: 172, kind: "vine", lvl: 6 }, { x: 70, z: 182, kind: "haetae", lvl: 7 }, { x: 110, z: 150, kind: "dokkaebi", lvl: 6 },
  { x: 250, z: 152, kind: "haetae", lvl: 7 }, { x: 292, z: 182, kind: "dokkaebi", lvl: 7 }, { x: 140, z: 186, kind: "vine", lvl: 7, night: true },
  { x: 166, z: 160, kind: "alien_scout", lvl: 7, alien: true }, { x: 180, z: 164, kind: "alien_caster", lvl: 8, alien: true },
];

// the tourist information booth where the Hongdae map lies, and where the quest people stand on the street
export const MAPSPOT = { x: -40, z: 31 };
// 연남동 + 신촌 (2026-10-18): map stands, and their monsters (연남동 like 홍대, 신촌 like the complex)
export const MAPSPOT_YN = { x: -42, z: -165 }, MAPSPOT_SC = { x: 224, z: -141 }, MAPSPOT_DI = { x: 322, z: 152 }, MAPSPOT_SG = { x: 318, z: -200 };
export const DANGIN_SPAWNS = [
  { x: 335, z: 170, kind: "jeongi", lvl: 6 }, { x: 372, z: 158, kind: "jeongi", lvl: 6 }, { x: 405, z: 185, kind: "dokkaebi", lvl: 7 }, { x: 440, z: 165, kind: "jeongi", lvl: 7 },
  { x: 458, z: 190, kind: "haetae", lvl: 7 }, { x: 420, z: 148, kind: "jeongi", lvl: 7, night: true }, { x: 350, z: 192, kind: "jeongi", lvl: 7, night: true },
];
export const NORTH_SPAWNS = [
  { x: -10, z: -174, kind: "dokkaebi" }, { x: 25, z: -170, kind: "kkachi" }, { x: 70, z: -178, kind: "haetae" }, { x: 100, z: -166, kind: "kkachi" },
  { x: -62, z: -150, kind: "dokkaebi" }, { x: -62, z: -225, kind: "vine" }, { x: 0, z: -214, kind: "haetae" }, { x: 50, z: -214, kind: "kkachi", lvl: 2 }, { x: 95, z: -214, kind: "vine" },
  { x: 35, z: -214, kind: "kkachi", lvl: 3, night: true }, { x: -62, z: -190, kind: "haetae", night: true },
  { x: 211, z: -150, kind: "dokkaebi", lvl: 4 }, { x: 211, z: -235, kind: "chaekgwi", lvl: 5 }, { x: 145, z: -140, kind: "dokkaebi", lvl: 4 }, { x: 145, z: -190, kind: "chaekgwi", lvl: 4 }, { x: 145, z: -235, kind: "haetae", lvl: 5 },
  { x: 250, z: -155, kind: "chaekgwi", lvl: 5 }, { x: 300, z: -170, kind: "dokkaebi", lvl: 4 }, { x: 300, z: -232, kind: "chaekgwi", lvl: 5 }, { x: 262, z: -205, kind: "dokkaebi", lvl: 4 },
  { x: 145, z: -165, kind: "haetae", lvl: 5, night: true }, { x: 240, z: -245, kind: "chaekgwi", lvl: 5, night: true },
];
// the first dungeon: a Line 2 tunnel, its own zone far from the city. Rects are local (group at DUN), the rest world coords.
export const DUN = { x: -1000, z: 0 };
const W = (x, z) => ({ x: DUN.x + x, z: DUN.z + z });
export const DUNGEON = {
  rects: [
    { x0: 0, x1: 20, z0: -9, z1: 9, room: true, name: "승강장" }, { x0: 18, x1: 58, z0: -4, z1: 4 },
    { x0: 55, x1: 87, z0: -13, z1: 13, room: true, name: "대피소" }, { x0: 85, x1: 112, z0: -4, z1: 4 },
    { x0: 110, x1: 142, z0: -13, z1: 13, room: true, name: "환기실" }, { x0: 140, x1: 162, z0: -4, z1: 4 },
    { x0: 160, x1: 192, z0: -12, z1: 12, room: true, name: "벽화의 방" }, { x0: 190, x1: 212, z0: -4, z1: 4 },
    { x0: 210, x1: 242, z0: -13, z1: 13, room: true, name: "선로 기지" }, { x0: 240, x1: 257, z0: -4, z1: 4 },
    { x0: 255, x1: 300, z0: -20, z1: 20, room: true, name: "대장의 방" },
  ],
  spawns: [
    { ...W(66, -5), kind: "dokkaebi", lvl: 5 }, { ...W(73, 6), kind: "dokkaebi", lvl: 5 },
    { ...W(120, -7), kind: "vine", lvl: 5 }, { ...W(132, 7), kind: "vine", lvl: 5 }, { ...W(127, -1), kind: "haetae", lvl: 6 },
    { ...W(220, -6), kind: "dokkaebi", lvl: 6 }, { ...W(232, 6), kind: "vine", lvl: 6 }, { ...W(226, 0), kind: "haetae", lvl: 6 },
    { ...W(280, 0), kind: "chief", lvl: 8, boss: true },
    { ...W(292, -13), kind: "dokkaebi", lvl: 6, guard: 0 }, { ...W(292, 13), kind: "dokkaebi", lvl: 6, guard: 1 }, { ...W(296, 0), kind: "vine", lvl: 6, guard: 2 },
  ],
  murals: [{ ...W(168, -11.75), wz: DUN.z - 11.75, rot: 0, spot: W(168, -9.4) }, { ...W(184, -11.75), wz: DUN.z - 11.75, rot: 0, spot: W(184, -9.4) }, { ...W(176, 11.75), wz: DUN.z + 11.75, rot: Math.PI, spot: W(176, 9.4) }],
  entry: W(7, 0), up: W(3.5, 0), end: W(296.5, -6), pillars: [],
};
DUNGEON.wrects = DUNGEON.rects.map(r => ({ ...r, x0: r.x0 + DUN.x, x1: r.x1 + DUN.x, z0: r.z0 + DUN.z, z1: r.z1 + DUN.z }));
// 여의도, across the broken bridge (Danny 2026-10-12: option A, you climb over the fallen span), and the 63빌딩 dungeon.
// Both are their own zones far away, like the tunnel. Rects are local to the group; wrects are world coords.
export const YD = { x: 2000, z: 0 };
const Yw = (x, z) => ({ x: YD.x + x, z: YD.z + z });
export const YEOUIDO = {
  rects: [
    { x0: -7, x1: 7, z0: 0, z1: 50, bridge: true }, { x0: -2.5, x1: 2.5, z0: 49, z1: 81, bridge: true, climb: true }, { x0: -7, x1: 7, z0: 80, z1: 131, bridge: true },
    { x0: -150, x1: 150, z0: 130, z1: 330 },
  ],
  spawns: [
    { ...Yw(-60, 172), kind: "jangseung", lvl: 9 }, { ...Yw(45, 172), kind: "jangseung", lvl: 9 }, { ...Yw(-25, 238), kind: "jangseung", lvl: 10 }, { ...Yw(85, 232), kind: "jangseung", lvl: 10 },
    { ...Yw(-125, 195), kind: "geuseundae", lvl: 10 }, { ...Yw(130, 195), kind: "geuseundae", lvl: 10 }, { ...Yw(-30, 315), kind: "geuseundae", lvl: 11 }, { ...Yw(75, 318), kind: "geuseundae", lvl: 11, night: true },
    { ...Yw(-55, 252), kind: "alien_scout", lvl: 10, alien: true }, { ...Yw(-135, 252), kind: "alien_caster", lvl: 11, alien: true }, { ...Yw(-95, 318), kind: "alien_scout", lvl: 11, alien: true },
  ],
  entry: Yw(0, 6), back: Yw(0, 2.5), towerDoor: Yw(110, 276.5), towerOut: Yw(110, 272), npc: Yw(8, 142), pillars: [],
};
// 노량진 (Danny 2026-10-12: area 4 = A, Lv 12-15): across the 샛강 footbridge south of the island, same zone as 여의도
YEOUIDO.rects.push({ x0: -62, x1: -56, z0: 329, z1: 411, bridge: true }, { x0: -150, x1: 150, z0: 410, z1: 560 });
YEOUIDO.spawns.push(
  { ...Yw(20, 505), kind: "gwisin", lvl: 12 }, { ...Yw(110, 498), kind: "gwisin", lvl: 13 }, { ...Yw(-60, 548), kind: "gwisin", lvl: 14, night: true },
  { ...Yw(-120, 522), kind: "kkotge", lvl: 12 }, { ...Yw(-10, 522), kind: "kkotge", lvl: 13 },
  { ...Yw(-140, 452), kind: "jangeo", lvl: 13 }, { ...Yw(60, 428), kind: "jangeo", lvl: 13 },
  { ...Yw(130, 460), kind: "alien_scout", lvl: 13, alien: true }, { ...Yw(0, 445), kind: "alien_caster", lvl: 14, alien: true },
);
Object.assign(YEOUIDO, { marketDoor: Yw(-70, 436.6), marketOut: Yw(-70, 432), npcTeacher: Yw(70, 512.5), npcCupbap: Yw(40, 466.5) });
export const MAPSPOT_NR = Yw(-45, 418.6);   // the board at the end of the footbridge
// the fish-market dungeon: six rooms (decision 23), the particle room is the quiz room (Danny: quiz style C)
export const MK = { x: 5000, z: 0 };
const Mw = (x, z) => ({ x: MK.x + x, z: MK.z + z });
export const MARKET = {
  rects: [
    { x0: 0, x1: 30, z0: -12, z1: 12, room: true, name: "경매장", kind: "auction" }, { x0: 28, x1: 44, z0: -3, z1: 3 },
    { x0: 42, x1: 74, z0: -11, z1: 11, room: true, name: "수조 통로", kind: "tanks" }, { x0: 72, x1: 88, z0: -3, z1: 3 },
    { x0: 86, x1: 116, z0: -13, z1: 13, room: true, name: "냉동 창고", kind: "freezer" }, { x0: 114, x1: 130, z0: -3, z1: 3 },
    { x0: 128, x1: 156, z0: -11, z1: 11, room: true, name: "조사의 방", kind: "boards" }, { x0: 154, x1: 170, z0: -3, z1: 3 },
    { x0: 168, x1: 200, z0: -12, z1: 12, room: true, name: "얼음 방", kind: "ice" }, { x0: 198, x1: 214, z0: -3, z1: 3 },
    { x0: 212, x1: 256, z0: -20, z1: 20, room: true, name: "큰 수조", kind: "boss" },
  ],
  spawns: [
    { ...Mw(12, -6), kind: "kkotge", lvl: 12 }, { ...Mw(19, 6), kind: "kkotge", lvl: 12 },
    { ...Mw(52, -6), kind: "jangeo", lvl: 13 }, { ...Mw(64, 6), kind: "jangeo", lvl: 13 },
    { ...Mw(100, -6), kind: "kkotge", lvl: 13 }, { ...Mw(106, 7), kind: "gwisin", lvl: 13 },
    { ...Mw(180, -5), kind: "kkotge", lvl: 13 }, { ...Mw(190, 6), kind: "jangeo", lvl: 14 },
    { ...Mw(240, 0), kind: "munoh", lvl: 15, boss: true }, { ...Mw(228, -14), kind: "jangeo", lvl: 13 }, { ...Mw(228, 14), kind: "jangeo", lvl: 13 },
  ],
  entry: Mw(6, 0), up: Mw(2.5, 0), end: Mw(253, -16),
  boards: [{ ...Mw(136, -10.6), spot: Mw(136, -8.6), rot: 0 }, { ...Mw(148, -10.6), spot: Mw(148, -8.6), rot: 0 }, { ...Mw(142, 10.6), spot: Mw(142, 8.6), rot: Math.PI }],
  heaters: [Mw(93, -9), Mw(101, 9), Mw(110, -1)], dealer: Mw(104, 11.4), guardSpots: [Mw(132, -6), Mw(132, 6)], pillars: [],
};
MARKET.wrects = MARKET.rects.map(r => ({ ...r, x0: r.x0 + MK.x, x1: r.x1 + MK.x, z0: r.z0 + MK.z, z1: r.z1 + MK.z }));
MARKET.coldRect = MARKET.wrects.find(r => r.kind === "freezer"); MARKET.iceRect = MARKET.wrects.find(r => r.kind === "ice");
// 용산 (Danny 2026-10-17: area 5 = B, Lv 15-18): from 노량진's north-east corner over the 한강대교 and 노들섬, same zone as 여의도.
// The district sits east of the island; the museum is the dungeon (its own zone, like the fish market).
YEOUIDO.rects.push(
  { x0: 149, x1: 215, z0: 415, z1: 427 },              // the approach road along 노량진's east side
  { x0: 203, x1: 215, z0: 250, z1: 427 },              // 한강대교, south half
  { x0: 170, x1: 250, z0: 196, z1: 252 },              // 노들섬
  { x0: 203, x1: 215, z0: 112, z1: 198 },              // 한강대교, north half
  { x0: 158, x1: 460, z0: -32, z1: 114 },              // 용산: the museum, 거울못, 용산가족공원
);
// 2026-10-18, same-level neighbours: 선유도공원 over the 선유교 (west of the island), 사육신 공원 (west along 노량진's road), 이태원 (east of 용산)
YEOUIDO.rects.push(
  { x0: -202, x1: -148, z0: 225, z1: 233, bridge: true }, { x0: -398, x1: -200, z0: 152, z1: 298 },
  { x0: -165, x1: -148, z0: 449, z1: 461 }, { x0: -380, x1: -163, z0: 426, z1: 558 },
  { x0: 455, x1: 472, z0: 30, z1: 50 }, { x0: 470, x1: 680, z0: -30, z1: 112 },
);
YEOUIDO.spawns.push(
  { ...Yw(-380, 170), kind: "mulgwi", lvl: 9 }, { ...Yw(-262, 172), kind: "mulgwi", lvl: 9 }, { ...Yw(-320, 282), kind: "mulgwi", lvl: 10 }, { ...Yw(-222, 280), kind: "mulgwi", lvl: 10 },
  { ...Yw(-375, 230), kind: "geuseundae", lvl: 10 }, { ...Yw(-265, 215), kind: "mulgwi", lvl: 11 }, { ...Yw(-222, 214), kind: "mulgwi", lvl: 11, night: true },
  { ...Yw(-230, 440), kind: "dokkaebibul", lvl: 12 }, { ...Yw(-350, 440), kind: "dokkaebibul", lvl: 12 }, { ...Yw(-252, 492), kind: "dokkaebibul", lvl: 13 }, { ...Yw(-360, 500), kind: "dokkaebibul", lvl: 13 },
  { ...Yw(-190, 545), kind: "gwisin", lvl: 13 }, { ...Yw(-300, 546), kind: "dokkaebibul", lvl: 14 }, { ...Yw(-200, 500), kind: "dokkaebibul", lvl: 14, night: true },
  { ...Yw(500, 40), kind: "neon", lvl: 15 }, { ...Yw(570, 40), kind: "neon", lvl: 15 }, { ...Yw(640, 40), kind: "neon", lvl: 16 }, { ...Yw(575, 80), kind: "neon", lvl: 16 },
  { ...Yw(505, 6), kind: "neon", lvl: 16 }, { ...Yw(630, 6), kind: "dogul", lvl: 16 }, { ...Yw(520, 80), kind: "neon", lvl: 17 }, { ...Yw(600, 6), kind: "neon", lvl: 17, night: true }, { ...Yw(480, 80), kind: "dogul", lvl: 17, night: true },
);
export const MAPSPOT_SY = Yw(-206, 238), MAPSPOT_SA = Yw(-180, 444), MAPSPOT_IT = Yw(476, 49);
// quest people and spots in these areas (local coordinates): trees keep away from them
const YD_KEEP = [{ x: -318, z: 212 }, { x: -350, z: 202 }, { x: -300, z: 202 }, { x: -350, z: 248 }, { x: -206, z: 238 }, { x: -205, z: 468 }, { x: -314, z: 520 }, { x: -262, z: 520 }, { x: -210, z: 520 }, { x: -180, z: 444 }, { x: 536, z: 51.5 }];
YEOUIDO.spawns.push(
  { ...Yw(186, 214), kind: "cheongja", lvl: 15 }, { ...Yw(238, 238), kind: "muinseok", lvl: 15 },
  { ...Yw(178, 30), kind: "muinseok", lvl: 15 }, { ...Yw(215, 72), kind: "cheongja", lvl: 15 }, { ...Yw(250, 32), kind: "cheongja", lvl: 16 },
  { ...Yw(300, 94), kind: "gapot", lvl: 16 }, { ...Yw(395, 86), kind: "muinseok", lvl: 16 }, { ...Yw(432, 42), kind: "gapot", lvl: 17 },
  { ...Yw(422, 0), kind: "dogul", lvl: 16, alien: true }, { ...Yw(188, -16), kind: "dogul", lvl: 17, alien: true }, { ...Yw(440, -22), kind: "gapot", lvl: 17, night: true },
);
Object.assign(YEOUIDO, { museumDoor: Yw(325, 12.6), museumOut: Yw(325, 17), npcHandong: Yw(229.4, 103) });
export const MAPSPOT_YS = Yw(196, 106.6);   // the board at the north end of the 한강대교
// the national museum at night: six rooms, the 훈민정음실 is the quiz room (Danny: verb endings)
export const MU = { x: 9000, z: 0 };
const Uw = (x, z) => ({ x: MU.x + x, z: MU.z + z });
export const MUSEUM = {
  rects: [
    { x0: 0, x1: 40, z0: -8, z1: 8, room: true, name: "역사의 길", kind: "hall" }, { x0: 38, x1: 54, z0: -3, z1: 3 },
    { x0: 52, x1: 82, z0: -12, z1: 12, room: true, name: "선사관", kind: "cave" }, { x0: 80, x1: 94, z0: -3, z1: 3 },
    { x0: 92, x1: 122, z0: -12, z1: 12, room: true, name: "고려 청자실", kind: "celadon" }, { x0: 120, x1: 134, z0: -3, z1: 3 },
    { x0: 132, x1: 160, z0: -11, z1: 11, room: true, name: "훈민정음실", kind: "scrolls" }, { x0: 158, x1: 172, z0: -3, z1: 3 },
    { x0: 170, x1: 202, z0: -12, z1: 12, room: true, name: "왕의 보물실", kind: "treasure" }, { x0: 200, x1: 214, z0: -3, z1: 3 },
    { x0: 212, x1: 256, z0: -20, z1: 20, room: true, name: "장군의 방", kind: "boss" },
  ],
  spawns: [
    { ...Uw(16, -4), kind: "muinseok", lvl: 16 }, { ...Uw(30, 4), kind: "muinseok", lvl: 16 },
    { ...Uw(62, -6), kind: "gapot", lvl: 16 }, { ...Uw(74, 6), kind: "muinseok", lvl: 17 },
    { ...Uw(100, -6), kind: "cheongja", lvl: 16 }, { ...Uw(107, 7), kind: "cheongja", lvl: 17 }, { ...Uw(115, -2), kind: "cheongja", lvl: 17 },
    { ...Uw(180, -6), kind: "dogul", lvl: 17 }, { ...Uw(192, 6), kind: "gapot", lvl: 17 },
    { ...Uw(240, 0), kind: "janggun", lvl: 18, boss: true }, { ...Uw(228, -14), kind: "gapot", lvl: 17 }, { ...Uw(228, 14), kind: "gapot", lvl: 17 },
  ],
  entry: Uw(6, 0), up: Uw(2.5, 0), end: Uw(253, -16),
  scrolls: [{ ...Uw(140, -10.6), spot: Uw(140, -8.6), rot: 0 }, { ...Uw(152, -10.6), spot: Uw(152, -8.6), rot: 0 }, { ...Uw(146, 10.6), spot: Uw(146, 8.6), rot: Math.PI }],
  guardSpots: [Uw(136, -6), Uw(136, 6)], pillars: [],
};
MUSEUM.wrects = MUSEUM.rects.map(r => ({ ...r, x0: r.x0 + MU.x, x1: r.x1 + MU.x, z0: r.z0 + MU.z, z1: r.z1 + MU.z }));
MUSEUM.caveRect = MUSEUM.wrects.find(r => r.kind === "cave");
YEOUIDO.wrects = YEOUIDO.rects.map(r => ({ ...r, x0: r.x0 + YD.x, x1: r.x1 + YD.x, z0: r.z0 + YD.z, z1: r.z1 + YD.z }));
export const MAPSPOT_YD = Yw(-8, 138.6);   // on the park information board at the end of the bridge
export const TW = { x: 3000, z: 0 };
const Tw = (x, z) => ({ x: TW.x + x, z: TW.z + z });
export const TOWER = {
  rects: [
    { x0: 0, x1: 30, z0: -12, z1: 12, room: true, name: "로비", kind: "lobby" }, { x0: 28, x1: 44, z0: -3, z1: 3 },
    { x0: 42, x1: 74, z0: -13, z1: 13, room: true, name: "아쿠아리움", kind: "aqua" }, { x0: 72, x1: 88, z0: -3, z1: 3 },
    { x0: 86, x1: 112, z0: -11, z1: 11, room: true, name: "엘리베이터 홀", kind: "lift" }, { x0: 110, x1: 126, z0: -3, z1: 3 },
    { x0: 124, x1: 160, z0: -14, z1: 14, room: true, name: "사무실 층", kind: "office" }, { x0: 158, x1: 174, z0: -3, z1: 3 },
    { x0: 172, x1: 204, z0: -12, z1: 12, room: true, name: "전망대 60층", kind: "deck" }, { x0: 202, x1: 218, z0: -3, z1: 3 },
    { x0: 216, x1: 262, z0: -22, z1: 22, room: true, name: "옥상", kind: "roof", roof: true },
  ],
  spawns: [
    { ...Tw(14, -6), kind: "alien_scout", lvl: 10 }, { ...Tw(20, 6), kind: "alien_scout", lvl: 10 },
    { ...Tw(54, -7), kind: "geuseundae", lvl: 10 }, { ...Tw(62, 7), kind: "geuseundae", lvl: 10 },
    { ...Tw(136, -9), kind: "alien_caster", lvl: 11 }, { ...Tw(148, 9), kind: "alien_caster", lvl: 11 }, { ...Tw(150, -1), kind: "alien_scout", lvl: 11 },
    { ...Tw(184, -6), kind: "jangseung", lvl: 11 }, { ...Tw(194, 6), kind: "geuseundae", lvl: 11 },
    { ...Tw(246, 0), kind: "commander", lvl: 12, boss: true }, { ...Tw(236, -12), kind: "alien_scout", lvl: 11 }, { ...Tw(236, 12), kind: "alien_scout", lvl: 11 },
  ],
  entry: Tw(6, 0), up: Tw(2.5, 0), end: Tw(258, -8), poster: Tw(66, -10.6), panel: Tw(99, -8.8),
  door: { x0: TW.x + 116.8, x1: TW.x + 119.2 }, guardSpots: [Tw(90, -6), Tw(90, 6)], pillars: [],
};
TOWER.wrects = TOWER.rects.map(r => ({ ...r, x0: r.x0 + TW.x, x1: r.x1 + TW.x, z0: r.z0 + TW.z, z1: r.z1 + TW.z }));
TOWER.windRect = TOWER.wrects.find(r => r.kind === "deck");
export const MAPSPOT_RIVER = { x: 30, z: 121.4 };   // pinned to the park information board by the 나들목
export const MAPSPOT_APT = { x: 117, z: -27.6 };   // on the 경비실 counter at the apartment gate
export const STREET_NPCS = { minsu: { x: -38, z: -27.5, face: Math.PI }, jieun: { x: -25, z: 58, face: Math.PI / 2 }, gyeongbi: { x: 120.5, z: -27, face: -Math.PI / 2 }, teacher: { x: 170, z: 16.6, face: Math.PI }, sua: { x: 206, z: 190, face: Math.PI / 2 }, clerk: { x: 42.6, z: 150.6, face: Math.PI } };

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// shared toon look ----------------------------------------------------------------------------------
const grad = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const cache = {};
export function toon(color, extra) {
  if (!extra && cache[color]) return cache[color];
  const m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: grad }, extra || {}));
  if (!extra) cache[color] = m;
  return m;
}
export const outlineMat = new THREE.MeshBasicMaterial({ color: "#2a1f17", side: THREE.BackSide });
export function outline(mesh, t = .06) {
  const g = mesh.geometry; g.computeBoundingBox(); const s = new THREE.Vector3(); g.boundingBox.getSize(s);
  const o = new THREE.Mesh(g, outlineMat); o.raycast = () => {};
  o.scale.set(1 + 2 * t / Math.max(s.x, .01), 1 + 2 * t / Math.max(s.y, .01), 1 + 2 * t / Math.max(s.z, .01)); mesh.add(o); return o;
}
export function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

export function buildWorld(scene) {
  const R = rng(1234), rand = (a, b) => a + R() * (b - a), pick = a => a[Math.floor(R() * a.length)];
  const street = new THREE.Group(), station = new THREE.Group();
  station.position.set(STATION.x, 0, STATION.z);
  scene.add(street, station);
  const colliders = { street: [], station: [] };   // circles {x,z,r} and boxes {x0,x1,z0,z1} in world coords
  const camBlocks = [];   // tall boxes the camera may not pass through
  const swaps = [], glowMats = [], neonLights = [];

  function add(geo, mat, x, y, z, parent = street, ol = 0, shadow = true) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = shadow; parent.add(m); if (ol) outline(m, ol); return m;
  }
  function flat(w, d, x, z, mat, y = .02) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), typeof mat === "string" ? toon(mat) : mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; m.name = "ground"; street.add(m); return m; }
  const solid = (x0, x1, z0, z1, cam = true) => { colliders.street.push({ x0, x1, z0, z1 }); if (cam) camBlocks.push({ x0, x1, z0, z1 }); };

  // sky + fog + lights -----------------------------------------------------------------------------
  const skyC = document.createElement("canvas"); skyC.width = 4; skyC.height = 256;
  const skyT = canvasTex(skyC); scene.background = skyT;
  scene.fog = new THREE.Fog(DAY.fog, DAY.near, DAY.far);
  const hemi = new THREE.HemisphereLight(DAY.hemiS, DAY.hemiG, DAY.hemiI); scene.add(hemi);
  const sun = new THREE.DirectionalLight(DAY.sun, DAY.sunI); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 220 });
  sun.shadow.bias = -.0006; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);

  // instanced foliage collectors
  const leafM = [], leafC = [], tuftM = [], tuftC = [], dummy = new THREE.Object3D(), col = new THREE.Color();
  function leaf(x, y, z, s) { dummy.position.set(x, y, z); dummy.rotation.set(R() * 6, R() * 6, R() * 6); dummy.scale.setScalar(s); dummy.updateMatrix(); leafM.push(dummy.matrix.clone()); leafC.push(col.set(pick(LEAF)).clone()); }
  function tuft(x, z, s = 1) { dummy.position.set(x, .2 * s, z); dummy.rotation.set(rand(-.3, .3), R() * 6, rand(-.3, .3)); dummy.scale.set(s, s * rand(.7, 1.4), s); dummy.updateMatrix(); tuftM.push(dummy.matrix.clone()); tuftC.push(col.set(pick(LEAF)).clone()); }
  const trees = [];
  function tree(x, z, h = rand(4.5, 7.5), coll = true) {
    const tilt = rand(-.1, .1), t = add(new THREE.CylinderGeometry(.22, .38, h, 7), toon(TRUNK), x, h / 2, z, street, .05); t.rotation.z = tilt;
    trees.push({ x, z, i0: leafM.length, n: 8, hidden: false });   // its leaves can be hidden when they block the camera
    for (let j = 0; j < 8; j++) leaf(x + rand(-2, 2) - tilt * h, h + rand(-.6, 1.6), z + rand(-2, 2), rand(1, 1.8));
    for (let k = 0; k < 14; k++) tuft(x + rand(-2, 2), z + rand(-2, 2), rand(.8, 1.3));
    if (coll) colliders.street.push({ x, z, r: .6 });
  }

  function ivyTex() {
    const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d");
    for (let i = 0; i < 900; i++) { const y = Math.pow(R(), 1.7) * 256, x = R() * 256; g.fillStyle = pick(LEAF); g.save(); g.translate(x, y); g.rotate(R() * 6); g.beginPath(); g.ellipse(0, 0, rand(5, 11), rand(3, 6), 0, 0, 7); g.fill(); g.restore(); }
    for (let i = 0; i < 14; i++) { g.strokeStyle = VINE; g.lineWidth = 2; g.beginPath(); let x = R() * 256, y = 0; g.moveTo(x, y); while (y < 256) { x += rand(-8, 8); y += rand(8, 20); g.lineTo(x, y); } g.stroke(); }
    return canvasTex(c);
  }
  const ivyMats = [0, 1, 2].map(() => toon("#ffffff", { map: ivyTex(), alphaTest: .5, side: THREE.DoubleSide }));

  // sign textures are cached: the same text + colour is drawn once
  const signCache = {};
  function signMat(text, vertical, i, neon) {
    const key = [text, vertical, i % 6, neon].join("|"); if (signCache[key]) return signCache[key];
    const color = neon ? NEON[i % NEON.length] : PAINT[i % PAINT.length];
    const c = document.createElement("canvas"), n = [...text].length;
    if (vertical) { c.width = 96; c.height = 96 * Math.max(3, n); } else { c.width = 512; c.height = 128; }
    const g = c.getContext("2d");
    if (neon) { g.fillStyle = "#0b0910"; g.fillRect(0, 0, c.width, c.height); g.shadowColor = color; g.shadowBlur = 18; g.strokeStyle = color; g.lineWidth = 5; g.strokeRect(8, 8, c.width - 16, c.height - 16); g.fillStyle = "#fff"; }
    else { g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(0, 0, c.width, c.height * .18); g.fillStyle = "#fff"; }
    g.textAlign = "center"; g.textBaseline = "middle";
    if (vertical) { g.font = `64px ${FONT}`; [...text].forEach((ch, k) => { if (neon) { g.shadowColor = color; g.shadowBlur = 22; } g.fillText(ch, 48, c.height / n * (k + .5)); }); }
    else { g.font = `${Math.min(84, 880 / n)}px ${FONT}`; if (neon) { g.shadowColor = color; g.shadowBlur = 26; } g.fillText(text, 256, 68); }
    return signCache[key] = neon ? new THREE.MeshBasicMaterial({ map: canvasTex(c), toneMapped: false }) : toon("#ffffff", { map: canvasTex(c) });
  }
  // facade textures are cached per wall colour and height band; the ground floor (shop window) is painted in
  const facadeCache = {};
  function facadeMat(wall, floors) {
    const key = wall + floors; if (facadeCache[key]) return facadeCache[key];
    const h = floors * 3.1 + 4, w = 8;
    const c = document.createElement("canvas"), e = document.createElement("canvas");
    c.width = e.width = 128; c.height = e.height = Math.round(128 * h / w);
    const g = c.getContext("2d"), ge = e.getContext("2d"), px = c.height / h;
    g.fillStyle = wall; g.fillRect(0, 0, c.width, c.height); ge.fillStyle = "#000"; ge.fillRect(0, 0, e.width, e.height);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${R() * .05})`; g.fillRect(R() * c.width, R() * c.height, rand(2, 6), rand(2, 6)); }
    const cols = 3, cw = c.width / cols;
    for (let r = 0; r < floors; r++) for (let k = 0; k < cols; k++) {
      const x = k * cw + cw * .2, y = (r * 3.1 + .8) * px, ww = cw * .6, hh = 1.7 * px;
      g.fillStyle = R() < .5 ? "#bfe6ff" : "#5a6d7e"; g.fillRect(x, y, ww, hh);
      g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(x + ww * .1, y + hh * .1, ww * .18, hh * .75);
      g.fillStyle = TRIM; g.fillRect(x - 2, y + hh, ww + 4, 3);
      if (R() < .25) { ge.fillStyle = R() < .5 ? "#ffb46a" : "#ffd89a"; ge.fillRect(x, y, ww, hh); }
    }
    const gy = c.height - 4 * px;                                   // ground floor: dark band + shop window
    g.fillStyle = "#3d3a38"; g.fillRect(0, gy, c.width, 4 * px); g.fillStyle = "#bfe6ff"; g.fillRect(c.width * .12, gy + 1.1 * px, c.width * .76, 2.5 * px);
    ge.fillStyle = "#ffcf8a"; ge.fillRect(c.width * .12, gy + 1.1 * px, c.width * .76, 2.5 * px);
    const m = toon("#ffffff", { map: canvasTex(c), emissiveMap: canvasTex(e), emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0 });
    glowMats.push({ m, k: .5 });
    return facadeCache[key] = m;
  }

  // ground: roads, sidewalks, park ------------------------------------------------------------------
  {
    const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d");
    g.fillStyle = ROAD; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${R() < .5 ? 0 : 255},${R() < .5 ? 0 : 255},${R() < .5 ? 0 : 255},.035)`; g.fillRect(R() * 256, R() * 256, 2, 2); }
    g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 1.5;
    for (let k = 0; k < 10; k++) { g.beginPath(); let x = R() * 256, y = R() * 256; g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += rand(-14, 14); y += rand(-20, 20); g.lineTo(x, y); } g.stroke(); }
    const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(24, 24);
    flat(240, 240, 10, 0, toon("#ffffff", { map: t }), 0);
    flat(1400, 1400, 0, 0, "#8e9a7c", -.05);   // land around the district, under the mountains
  }
  // boulevard lane markings + median trees
  flat(.4, 214, -70.4, 0, "#e3c24a", .03); flat(.4, 214, -69.6, 0, "#e3c24a", .03);
  for (const x of [-78, -62]) for (let z = -104; z < 106; z += 8) flat(.3, 3.6, x, z, "#e9e7df", .03);
  for (let z = -100; z <= 100; z += 13) if (Math.abs(z - ENTRANCE.z) > 6) tree(-70, z, rand(5, 7));
  for (const z of [-60, -20, 40, 80]) for (let i = 0; i < 6; i++) flat(1, 3, -60 - i * 1.8 + 1, z, "#efece4", .03);   // crosswalks on the boulevard
  // sidewalks around every block (raised slab, walkable)
  flat(7, 214, -51.5, 0, WALK, .05);
  for (const [x0, x1] of BX) for (const [z0, z1] of BZ) flat(x1 - x0 + 4, z1 - z0 + 4, (x0 + x1) / 2, (z0 + z1) / 2, WALK, .04);
  // 경의선숲길: grass, a winding path, many trees
  flat(PARK.x1 - PARK.x0, PARK.z1 - PARK.z0, (PARK.x0 + PARK.x1) / 2, (PARK.z0 + PARK.z1) / 2, "#5e9a3e", .06);
  for (let x = PARK.x0; x < PARK.x1; x += 4) flat(4.2, 3, x + 2, 21.5 + Math.sin(x * .06) * 4, "#d7c9a6", .07);
  for (let x = PARK.x0 + 6; x < PARK.x1 - 3; x += rand(6, 9)) {
    if (SPAWNS.some(s => Math.hypot(s.x - x, s.z - 12) < 5) || Math.abs(x - MAPSPOT.x) < 5) continue;
    tree(x, rand(10, 13)); if (R() < .7) tree(x + rand(-2, 2), rand(30, 33));
  }
  for (let i = 0; i < 1600; i++) tuft(rand(PARK.x0, PARK.x1), rand(PARK.z0, PARK.z1), rand(.7, 1.4));
  // old railway tracks in the park (경의선 was a railway)
  for (let x = PARK.x0 + 2; x < PARK.x1; x += 1.2) add(new THREE.BoxGeometry(.25, .12, 2.4), toon("#6b4a32"), x, .1, 31.5, street, 0, false);
  for (const z of [30.8, 32.2]) add(new THREE.BoxGeometry(PARK.x1 - PARK.x0, .14, .12), toon("#7d7a70"), (PARK.x0 + PARK.x1) / 2, .2, z, street, 0, false);
  // busking square: paving, stage, benches
  flat(SQUARE.x1 - SQUARE.x0 + 4, SQUARE.z1 - SQUARE.z0 + 4, (SQUARE.x0 + SQUARE.x1) / 2, (SQUARE.z0 + SQUARE.z1) / 2, "#c9b9a0", .07);
  add(new THREE.BoxGeometry(8, .8, 5), toon("#8a5a32"), -38, .4, -51, street, .05); solid(-42, -34, -53.5, -48.5, false);
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(3, .45, .7), toon("#6b4a32"), -42 + i * 4, .25, -30, street, .03);
  // grass breaking through the asphalt
  for (let k = 0; k < 60; k++) {
    const px = rand(-82, 105), pz = rand(-105, 105);
    const p = flat(rand(1.5, 4), rand(1.5, 4), px, pz, LEAF[3], .055); p.rotation.z = R() * 3;
    for (let j = 0; j < 25; j++) tuft(px + rand(-1.6, 1.6), pz + rand(-1.6, 1.6), rand(.6, 1.2));
  }

  // shop blocks: buildings along every alley-facing edge, a solid core behind them ------------------------
  let signI = 0, vsI = 0;
  function shop(cx, cz, w, d, face) {   // face = direction the front looks at: "+x" | "-x" | "+z" | "-z"
    const floors = 2 + Math.floor(R() * 5), h = floors * 3.1 + 4, wall = pick(WALLS);
    const b = add(new THREE.BoxGeometry(w, h, d), facadeMat(wall, floors), cx, h / 2, cz, street, .1);
    const fx = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] }[face], rotY = { "+x": Math.PI / 2, "-x": -Math.PI / 2, "+z": 0, "-z": Math.PI }[face];
    const along = face[1] === "x" ? d : w, half = face[1] === "x" ? w / 2 : d / 2;
    const st = SIGNS[signI % SIGNS.length], si = signI++;
    const sg = add(new THREE.PlaneGeometry(along * .84, 1.2), signMat(st, false, si, false), cx + fx[0] * (half + .08), 4.3, cz + fx[1] * (half + .08), street, 0, false);
    sg.rotation.y = rotY; swaps.push({ mesh: sg, day: signMat(st, false, si, false), night: signMat(st, false, si, true) });
    if (R() < .35) {
      const vt = VSIGNS[vsI % VSIGNS.length], vi = vsI++ + 3, n = [...vt].length, vh = Math.max(3, n) * 1.05, vy = Math.min(h - 1.5, rand(6.5, 9));
      const side = toon(TRIM), dm = signMat(vt, true, vi, false), nm = signMat(vt, true, vi, true);
      const off = (R() < .5 ? -1 : 1) * along * .36;
      const vx = cx + fx[0] * (half + .6) + (face[1] === "z" ? off : 0), vz = cz + fx[1] * (half + .6) + (face[1] === "x" ? off : 0);
      const v = add(new THREE.BoxGeometry(1.1, vh, .35), [side, side, side, side, dm, dm], vx, vy, vz, street, .04); v.rotation.y = rotY + Math.PI / 2;
      swaps.push({ mesh: v, day: [side, side, side, side, dm, dm], night: [side, side, side, side, nm, nm] });
    }
    if (R() < .5) {                     // ivy over part of the front
      const ih = h * rand(.3, .7), iv = add(new THREE.PlaneGeometry(along * rand(.4, .8), ih), pick(ivyMats), cx + fx[0] * (half + .05), h - ih / 2, cz + fx[1] * (half + .05), street, 0, false); iv.rotation.y = rotY;
    }
    add(new THREE.BoxGeometry(w * .92, .3, d * .92), toon(LEAF[3]), cx, h + .15, cz, street, 0, false);   // moss roof
    for (let k = 0; k < 3; k++) leaf(cx + rand(-w / 2.5, w / 2.5), h + .5 + rand(0, .5), cz + rand(-d / 2.5, d / 2.5), rand(.6, 1.2));
    if (R() < .25) { const th = rand(2, 3.2); add(new THREE.CylinderGeometry(.14, .2, th, 6), toon(TRUNK), cx, h + th / 2, cz, street, 0); for (let j = 0; j < 5; j++) leaf(cx + rand(-1, 1), h + th + rand(-.3, .8), cz + rand(-1, 1), rand(.8, 1.3)); }
    for (let k = 0; k < 6; k++) tuft(cx + fx[0] * (half + rand(.3, 2)) + (face[1] === "z" ? rand(-w / 2, w / 2) : 0), cz + fx[1] * (half + rand(.3, 2)) + (face[1] === "x" ? rand(-d / 2, d / 2) : 0), rand(.7, 1.2));
  }
  for (const xr of BX) for (const zr of BZ) {
    if (isSquare(xr, zr)) continue;
    const [x0, x1] = xr, [z0, z1] = zr, D = 9;
    // fronts on the four sides
    for (let x = x0; x < x1 - 3;) { const w = Math.min(rand(6, 9), x1 - x); shop(x + w / 2, z0 + D / 2, w, D, "-z"); shop(x + w / 2, z1 - D / 2, w, D, "+z"); x += w; }
    for (let z = z0 + D; z < z1 - D - 3;) { const d = Math.min(rand(6, 9), z1 - D - z); shop(x0 + D / 2, z + d / 2, D, d, "-x"); shop(x1 - D / 2, z + d / 2, D, d, "+x"); z += d; }
    // a solid core so nobody walks into the gaps; it's tall enough to hide behind the fronts
    if (x1 - x0 > 2 * D + 1 && z1 - z0 > 2 * D + 1) add(new THREE.BoxGeometry(x1 - x0 - 2 * D, 10, z1 - z0 - 2 * D), toon("#9a8f80"), (x0 + x1) / 2, 5, (z0 + z1) / 2, street, 0);
    solid(x0, x1, z0, z1);
  }
  // edges: office glass west of the boulevard, apartment towers east and south, barricades on every street exit
  function office(x, z, w, d, h) {
    const c = document.createElement("canvas"); c.width = 128; c.height = 512; const g = c.getContext("2d");
    g.fillStyle = "#9db8cc"; g.fillRect(0, 0, 128, 512); g.fillStyle = "#5a8db0"; for (let y = 4; y < 512; y += 9) g.fillRect(3, y, 122, 5); g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(8, 0, 14, 512);
    const e = document.createElement("canvas"); e.width = 128; e.height = 512; const ge = e.getContext("2d"); ge.fillStyle = "#000"; ge.fillRect(0, 0, 128, 512); for (let y = 4; y < 512; y += 9) if (R() < .3) { ge.fillStyle = "#cfe8ff"; ge.fillRect(3 + (R() * 80 | 0), y, 40, 5); }
    const m = toon("#ffffff", { map: canvasTex(c), emissiveMap: canvasTex(e), emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0 }); glowMats.push({ m, k: .9 });
    add(new THREE.BoxGeometry(w, h, d), m, x, h / 2, z, street, .2); solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    const iv = add(new THREE.PlaneGeometry(w * .6, h * .35), pick(ivyMats), x + w / 2 + .1, h * .175, z, street, 0, false); iv.rotation.y = Math.PI / 2;
  }
  office(-97, -70, 18, 26, 70); office(-98, -20, 16, 22, 52); office(-97, 30, 18, 24, 84); office(-99, 80, 20, 26, 60);
  function apartment(x, z, rot, floors, num, len = 38) {
    const h = floors * 2.8, d = 11, wall = pick(["#efe9dd", "#e9e4da", "#f2ede4"]);
    const lc = document.createElement("canvas"); lc.width = 256; lc.height = Math.min(1024, Math.round(256 * h / len)); const lg = lc.getContext("2d"), lpx = lc.height / h;
    lg.fillStyle = wall; lg.fillRect(0, 0, 256, lc.height);
    for (let f = 0; f * 2.8 < h - 2; f++) { const y = lc.height - (f + 1) * 2.8 * lpx; lg.fillStyle = "#dfe6ea"; lg.fillRect(0, y + 2.8 * lpx * .62, 256, Math.max(1, 2.8 * lpx * .12)); lg.fillStyle = f % 3 ? "#8fb3c4" : "#a8c8d6"; for (let xx = 6; xx < 246; xx += 28) lg.fillRect(xx, y + 2.8 * lpx * .18, 20, Math.max(1, 2.8 * lpx * .42)); }
    const ec = document.createElement("canvas"); ec.width = 128; ec.height = 512; const eg = ec.getContext("2d");
    eg.fillStyle = wall; eg.fillRect(0, 0, 128, 512); eg.fillStyle = "#2f5aa8"; eg.fillRect(0, 30, 128, 10); eg.fillStyle = "#1f2a3a"; eg.font = `52px ${FONT}`; eg.textAlign = "center"; eg.fillText(String(num), 64, 110); eg.font = `30px ${FONT}`; eg.fillText("동", 64, 150);
    const long = toon("#ffffff", { map: canvasTex(lc) }), end = toon("#ffffff", { map: canvasTex(ec) }), top = toon("#cfc8bb");
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; street.add(g);
    const b = new THREE.Mesh(new THREE.BoxGeometry(len, h, d), [end, end, top, top, long, long]); b.position.y = h / 2; b.castShadow = b.receiveShadow = true; g.add(b); outline(b, .25);
    add(new THREE.BoxGeometry(5, 3, 4), toon("#d8d2c6"), -len / 3, h + 1.5, 0, g, .1); add(new THREE.BoxGeometry(3, 2.4, 3), toon("#9fb3c2"), len / 3, h + 1.2, 0, g, .1);
    const ih = h * rand(.25, .55), iv = new THREE.Mesh(new THREE.PlaneGeometry(len * rand(.3, .6), ih), pick(ivyMats)); iv.position.set(rand(-len / 4, len / 4), ih / 2, d / 2 + .05); g.add(iv);
    const hw = rot ? d / 2 : len / 2, hd = rot ? len / 2 : d / 2; solid(x - hw, x + hw, z - hd, z + hd);
  }
  for (let i = 0; i < 4; i++) apartment(-20 + i * 42, -128, 0, 18 + (i % 2) * 5, 106 + i);
  // mountains around the city (북한산 / 안산 style ridges)
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2 + rand(-.1, .1), r = rand(380, 470), h = rand(60, 120); const m = new THREE.Mesh(new THREE.ConeGeometry(rand(70, 120), h, 7), toon(pick(["#7f9a86", "#8aa48f", "#748f7c"]))); m.position.set(110 + Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r); street.add(m); }
  // rubble + vine walls closing the district (B and C will open later)
  function barricade(x0, z0, x1, z1) {
    colliders.street.push({ x0: Math.min(x0, x1) - 1.4, x1: Math.max(x0, x1) + 1.4, z0: Math.min(z0, z1) - 1.4, z1: Math.max(z0, z1) + 1.4 });
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 2.2);
    for (let i = 0; i <= n; i++) { const f = i / n, bx = x0 + (x1 - x0) * f, bz = z0 + (z1 - z0) * f, sz = rand(1.2, 2.4);
      const r = add(new THREE.DodecahedronGeometry(sz, 0), toon(pick(["#8d8a84", "#a39a8c", "#77736c"])), bx + rand(-.5, .5), sz * .5, bz + rand(-.5, .5), street, .05); r.rotation.set(R() * 3, R() * 3, R() * 3);
      for (let j = 0; j < 4; j++) leaf(bx + rand(-1.5, 1.5), sz + rand(-.5, .8), bz + rand(-1, 1), rand(.5, 1)); }
  }
  barricade(-85, -109, -48, -109); barricade(-86, -108, -86, 108);
  for (const [x0, x1] of [[-30, -20], [15, 25], [60, 70]]) barricade(x0, -109, x1, -109);   // the south side is the sound-barrier wall now
  barricade(108, -108, 108, -27); barricade(108, -13, 108, 108);   // the gap at z -20 is the way to 서교 아파트

  // subway entrance (Line 2, 홍대입구역) on the boulevard sidewalk --------------------------------------
  {
    const g = new THREE.Group(); g.position.set(ENTRANCE.x, 0, ENTRANCE.z); street.add(g);
    const roofM = toon("#55606a"), glass = toon("#9fc4d4");
    add(new THREE.BoxGeometry(3.4, .25, 5.2), roofM, 0, 3, 0, g, .05);
    for (const sx of [-1.6, 1.6]) add(new THREE.BoxGeometry(.12, 3, 5), glass, sx, 1.5, 0, g);
    add(new THREE.BoxGeometry(3.4, 3, .12), glass, 0, 1.5, 2.5, g);
    for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(3, .25, .6), toon("#6e6b66"), 0, .05 - i * .28, -1.6 + i * .55, g);
    const c = document.createElement("canvas"); c.width = 512; c.height = 128; const x = c.getContext("2d");
    x.fillStyle = "#f4f4f0"; x.fillRect(0, 0, 512, 128); x.fillStyle = "#00a84d"; x.beginPath(); x.arc(64, 64, 44, 0, 7); x.fill();
    x.fillStyle = "#fff"; x.font = `64px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("2", 64, 68);
    x.fillStyle = "#1b1b1b"; x.font = `58px ${FONT}`; x.fillText("홍대입구역", 310, 68);
    const pm = toon("#ffffff", { map: canvasTex(c), emissive: new THREE.Color("#ffffff"), emissiveMap: canvasTex(c), emissiveIntensity: 0 }); glowMats.push({ m: pm, k: .8 });
    const sp = add(new THREE.PlaneGeometry(3.3, .82), pm, 0, 3.6, -2.62, g); sp.rotation.y = Math.PI;
    add(new THREE.BoxGeometry(3.3, .85, .1), roofM, 0, 3.6, -2.56, g);
    const iv = add(new THREE.PlaneGeometry(3.4, 2.2), ivyMats[1], 0, 3.15, 0, g); iv.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 10; i++) leaf(ENTRANCE.x + rand(-1.7, 1.7), 3.2, ENTRANCE.z + rand(-2.6, 2.6), rand(.3, .6));
    const L = new THREE.PointLight("#5cff9d", 0, 10, 2); L.position.set(ENTRANCE.x - 2, 3, ENTRANCE.z - 3); street.add(L); neonLights.push(L);
    colliders.street.push({ x0: ENTRANCE.x - 1.8, x1: ENTRANCE.x + 1.8, z0: ENTRANCE.z - 0.6, z1: ENTRANCE.z + 2.7 });
  }
  // 관광안내소: tourist information booth (the Hongdae map lies on its counter)
  {
    const k = new THREE.Group(); k.position.set(MAPSPOT.x, 0, MAPSPOT.z + 1.6); street.add(k);
    add(new THREE.BoxGeometry(3.2, 2.6, 2.2), toon("#2f6db3"), 0, 1.3, 0, k, .06); add(new THREE.BoxGeometry(3.6, .3, 2.6), toon("#e0882a"), 0, 2.75, 0, k, .05);
    add(new THREE.BoxGeometry(3.2, .12, .7), toon("#e9e4d8"), 0, 1.1, -1.3, k, .03);
    const c = document.createElement("canvas"); c.width = 512; c.height = 128; const x = c.getContext("2d"); x.fillStyle = "#2f6db3"; x.fillRect(0, 0, 512, 128); x.fillStyle = "#fff"; x.beginPath(); x.arc(64, 64, 42, 0, 7); x.fill(); x.fillStyle = "#2f6db3"; x.font = `70px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("i", 64, 68); x.fillStyle = "#fff"; x.font = `58px ${FONT}`; x.fillText("관광안내소", 300, 68);
    const sp = add(new THREE.PlaneGeometry(3, .75), toon("#ffffff", { map: canvasTex(c) }), 0, 2.3, -1.12, k, 0, false); sp.rotation.y = Math.PI;
    const iv = add(new THREE.PlaneGeometry(2, 1.4), ivyMats[0], 1.61, 1.6, 0, k, 0, false); iv.rotation.y = Math.PI / 2;
    colliders.street.push({ x0: MAPSPOT.x - 1.7, x1: MAPSPOT.x + 1.7, z0: MAPSPOT.z + .4, z1: MAPSPOT.z + 2.8 });
  }
  // the abandoned bus and a taxi on the boulevard
  {
    const g = new THREE.Group(); g.position.set(-74, 0, -28); g.rotation.y = .3; street.add(g);
    add(new THREE.BoxGeometry(2.5, 2.6, 10), toon("#2f6fc0"), 0, 1.75, 0, g, .06); add(new THREE.BoxGeometry(2.55, .9, 8.6), toon("#1c2228"), 0, 2.2, .3, g); add(new THREE.BoxGeometry(2.55, .3, 10.05), toon("#e9e4d8"), 0, .65, 0, g);
    const iv = add(new THREE.PlaneGeometry(2.5, 7), ivyMats[2], 0, 3.07, -1, g); iv.rotation.x = -Math.PI / 2;
    for (let k = -4; k <= 4; k += 2) colliders.street.push({ x: -74 + Math.sin(.3) * k, z: -28 + Math.cos(.3) * k, r: 1.45 });
    const t = new THREE.Group(); t.position.set(-63, 0, 70); t.rotation.y = -.6; street.add(t);
    add(new THREE.BoxGeometry(1.9, .8, 4.3), toon("#e8892b"), 0, .7, 0, t, .05); add(new THREE.BoxGeometry(1.7, .7, 2.2), toon("#26323a"), 0, 1.4, -.1, t, .04);
    colliders.street.push({ x: -63, z: 70, r: 2.2 });
  }
  // neon lights for the night: a few along the park and the alleys
  for (const [x, z] of [[-25, -20], [20, -20], [65, -20], [-25, 40], [20, 40], [65, 40], [-50, -60], [-50, 60]]) { const L = new THREE.PointLight(NEON[(x + z) & 3], 0, 18, 2); L.position.set(x, 5, z); street.add(L); neonLights.push(L); }

  // ===== district B: 서교 아파트 (apartment complex), east of the Hongdae blocks, through the gate at z = -20 =====
  {
    const AX0 = 110, AX1 = 310;
    flat(AX1 - AX0, 216, (AX0 + AX1) / 2, 0, toon("#8a8b92"), .01);
    // ring road markings
    for (const z of [-104, 104]) flat(AX1 - AX0 - 6, .3, (AX0 + AX1) / 2, z, "#e9e7df", .03);
    // the gate: arch with the complex name, 경비실 (guard booth) where the map lies
    for (const z of [-26, -14]) add(new THREE.BoxGeometry(1.2, 6, 1.2), toon("#c9c2b4"), 112, 3, z, street, .06);
    add(new THREE.BoxGeometry(1.4, 1.4, 13.6), toon("#2f5aa8"), 112, 6.6, -20, street, .06);
    {
      const c = document.createElement("canvas"); c.width = 512; c.height = 96; const x = c.getContext("2d");
      x.fillStyle = "#2f5aa8"; x.fillRect(0, 0, 512, 96); x.fillStyle = "#fff"; x.font = `62px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("서교 아파트", 256, 52);
      for (const sx of [-1, 1]) { const p = add(new THREE.PlaneGeometry(12, 1.2), toon("#ffffff", { map: canvasTex(c) }), 112 + sx * .72, 6.6, -20, street, 0, false); p.rotation.y = sx * Math.PI / 2; }
    }
    add(new THREE.BoxGeometry(3.4, 2.8, 3.4), toon("#e9e4d8"), 117, 1.4, -31, street, .06);
    add(new THREE.BoxGeometry(3.8, .3, 3.8), toon("#2f5aa8"), 117, 2.95, -31, street, .05);
    add(new THREE.PlaneGeometry(2.2, 1.1), toon("#9fc4d4"), 117, 1.7, -29.28, street, 0, false);
    {
      const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d");
      x.fillStyle = "#1f2a3a"; x.fillRect(0, 0, 256, 64); x.fillStyle = "#fff"; x.font = `40px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("경비실", 128, 34);
      add(new THREE.PlaneGeometry(1.8, .45), toon("#ffffff", { map: canvasTex(c) }), 117, 2.45, -29.27, street, 0, false);
    }
    add(new THREE.BoxGeometry(2.4, .12, .6), toon("#b08a5a"), 117, 1.05, -29, street, .03);   // counter (the map lies here)
    colliders.street.push({ x0: 115.2, x1: 118.8, z0: -32.8, z1: -29.2 });
    // apartment slabs 101동 – 110동
    let num = 101;
    for (const z of [-80, 70]) for (const x of [145, 195, 245, 288]) apartment(x, z, 0, 15 + (num * 7) % 11, num++, 40);
    for (const x of [145, 288]) apartment(x, -5, 0, 18 + (num * 5) % 8, num++, 40);
    // 상가 (shopping block) in the middle, fronts facing south
    for (let i = 0; i < 5; i++) shop(201 + i * 8, -8, 8, 12, "+z");
    solid(197, 237, -14, -2);
    // parking lots turned meadow, with rusty cars
    for (const [cx, cz] of [[170, -42], [220, -45], [270, -42], [170, 38], [270, 38]]) {
      flat(36, 22, cx, cz, "#6f6f6a", .03);
      const g = flat(rand(18, 30), rand(10, 18), cx + rand(-4, 4), cz + rand(-3, 3), "#5e9a3e", .05); g.rotation.z = rand(-.3, .3);
      for (let i = 0; i < 260; i++) tuft(cx + rand(-16, 16), cz + rand(-10, 10), rand(.7, 1.4));
      for (let i = 0; i < 4; i++) {
        const px = cx + rand(-14, 14), pz = cz + rand(-8, 8), rot = R() < .5 ? 0 : Math.PI, colr = pick(["#7a5a4a", "#5a6a7a", "#9a6a3a", "#c9c2b4"]);
        const cg = new THREE.Group(); cg.position.set(px, 0, pz); cg.rotation.y = rot + rand(-.2, .2); street.add(cg);
        add(new THREE.BoxGeometry(1.9, .85, 4.2), toon(colr), 0, .7, 0, cg, .05); add(new THREE.BoxGeometry(1.7, .7, 2.2), toon("#26323a"), 0, 1.45, -.1, cg, .04);
        if (R() < .6) { const iv = add(new THREE.PlaneGeometry(1.9, 2.4), pick(ivyMats), 0, 1.82, 0, cg, 0, false); iv.rotation.x = -Math.PI / 2; }
        colliders.street.push({ x: px, z: pz, r: 2.1 });
      }
    }
    // playground (놀이터) south of the 상가
    {
      const px = 217, pz = 22;
      flat(22, 16, px, pz, "#d8b98a", .05);
      add(new THREE.BoxGeometry(3, 2.4, 3), toon("#e0a21c"), px - 5, 1.2, pz, street, .05);
      const sl = add(new THREE.BoxGeometry(1.4, .2, 5), toon("#2f6db3"), px - 5, 1.3, pz + 3.6, street, .04); sl.rotation.x = .5;
      for (const sx of [3, 7]) add(new THREE.BoxGeometry(.25, 3, .25), toon("#c8402f"), px + sx, 1.5, pz - 2, street, .03);
      add(new THREE.BoxGeometry(4.4, .25, .25), toon("#c8402f"), px + 5, 3, pz - 2, street, .03);
      for (const sx of [4, 6]) add(new THREE.BoxGeometry(.8, .1, .4), toon("#3a3a3a"), px + sx, .6, pz - 2, street, .02);
      colliders.street.push({ x0: px - 6.6, x1: px - 3.4, z0: pz - 1.6, z1: pz + 1.6 });
    }
    // 정자: a traditional pavilion in the courtyard, painted in 단청 colours
    {
      const px = 170, pz = 12;
      for (const [dx, dz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) add(new THREE.CylinderGeometry(.18, .2, 3, 8), toon("#8a3a2a"), px + dx, 1.5, pz + dz, street, .03);
      add(new THREE.BoxGeometry(6, .4, 6), toon("#3a8f6c"), px, 3.1, pz, street, .05);
      const roof = add(new THREE.ConeGeometry(5.2, 2, 4), toon("#4a4f55"), px, 4.3, pz, street, .06); roof.rotation.y = Math.PI / 4;
      add(new THREE.BoxGeometry(5.2, .4, 5.2), toon("#b08a5a"), px, .5, pz, street, .03);
      colliders.street.push({ x0: px - 2.7, x1: px + 2.7, z0: pz - 2.7, z1: pz + 2.7 });
    }
    // trees along the inner roads, grass in the cracks
    for (let i = 0; i < 34; i++) { const tx = rand(AX0 + 8, AX1 - 6), tz = pick([-100, -58, -22, 14, 52, 100]) + rand(-1.5, 1.5); if (SPAWNS.some(s => Math.hypot(s.x - tx, s.z - tz) < 5) || (tx > 195 && tx < 240 && tz > -16 && tz < 32) || Math.hypot(tx - 170, tz - 12) < 7) continue; tree(tx, tz); }
    for (let k = 0; k < 40; k++) { const px = rand(AX0 + 4, AX1 - 4), pz = rand(-105, 105); const p = flat(rand(1.5, 4), rand(1.5, 4), px, pz, LEAF[3], .055); p.rotation.z = R() * 3; for (let j = 0; j < 20; j++) tuft(px + rand(-1.6, 1.6), pz + rand(-1.6, 1.6), rand(.6, 1.2)); }
    // the complex's own edges
    barricade(AX1, -108, AX1, 108); barricade(AX0, -109, AX1, -109);
  }

  // the station (safe place) ----------------------------------------------------------------------------
  const npcSpots = buildStation(station, colliders.station, add, toon, glowMats, rand, R);

  // tree crowns between the camera and you disappear (Danny 2026-10-11: trees see-through when they block the camera)
  const zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
  function occlude(cam, p) {
    const ax = cam.x, az = cam.z, bx = p.x - ax, bz = p.z - az, L2 = bx * bx + bz * bz || 1;
    let changed = false;
    for (const t of trees) {
      const u = Math.max(0, Math.min(1, ((t.x - ax) * bx + (t.z - az) * bz) / L2)), d = Math.hypot(ax + bx * u - t.x, az + bz * u - t.z);
      const hide = d < 3 && u < .97 && cam.y < 12;
      if (hide === t.hidden) continue;
      t.hidden = hide; changed = true;
      for (let i = t.i0; i < t.i0 + t.n; i++) { lm.setMatrixAt(i, hide ? zeroM : leafM[i]); lo.setMatrixAt(i, hide ? zeroM : leafM[i].clone().multiply(sc)); }
    }
    if (changed) { lm.instanceMatrix.needsUpdate = true; lo.instanceMatrix.needsUpdate = true; }
  }

  // floating pollen by day / fireflies at night
  const PN = 260, pg = new THREE.BufferGeometry(), pp = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) { pp[i * 3] = rand(-25, 25); pp[i * 3 + 1] = rand(.5, 12); pp[i * 3 + 2] = rand(-25, 25); }
  pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  const pmat = new THREE.PointsMaterial({ color: "#fff1bf", size: .14, transparent: true, opacity: .85, depthWrite: false });
  const motes = new THREE.Points(pg, pmat); motes.frustumCulled = false; street.add(motes);

  // ---- time of day -------------------------------------------------------------------------------
  const cA = new THREE.Color(), cB = new THREE.Color();
  const lerpC = (a, b, f) => cA.set(a).lerp(cB.set(b), f).getStyle();
  let nightState = null;
  function setNight(f) {
    const g = skyC.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, lerpC(DAY.sky[0], NIGHT.sky[0], f)); gr.addColorStop(.75, lerpC(DAY.sky[1], NIGHT.sky[1], f)); gr.addColorStop(1, lerpC(DAY.sky[1], NIGHT.sky[1], f));
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256); skyT.needsUpdate = true;
    scene.fog.color.set(DAY.fog).lerp(cB.set(NIGHT.fog), f);
    scene.fog.near = DAY.near + (NIGHT.near - DAY.near) * f; scene.fog.far = DAY.far + (NIGHT.far - DAY.far) * f;
    hemi.color.set(DAY.hemiS).lerp(cB.set(NIGHT.hemiS), f); hemi.groundColor.set(DAY.hemiG).lerp(cB.set(NIGHT.hemiG), f);
    hemi.intensity = DAY.hemiI + (NIGHT.hemiI - DAY.hemiI) * f;
    sun.color.set(DAY.sun).lerp(cB.set(NIGHT.sun), f); sun.intensity = DAY.sunI + (NIGHT.sunI - DAY.sunI) * f;
    neonLights.forEach(L => L.intensity = 30 * f);
    glowMats.forEach(({ m, k }) => m.emissiveIntensity = k * f);
    const isNight = f > .5;
    if (isNight !== nightState) {
      nightState = isNight;
      swaps.forEach(s => s.mesh.material = isNight ? s.night : s.day);
      pmat.color.set(isNight ? "#c5ff7a" : "#fff1bf"); pmat.size = isNight ? .11 : .14;
      pmat.blending = isNight ? THREE.AdditiveBlending : THREE.NormalBlending; pmat.toneMapped = !isNight; pmat.needsUpdate = true;
    }
  }
  function update(t, focus) {
    sun.position.set(focus.x - 40, 60, focus.z + 30); sun.target.position.set(focus.x, 0, focus.z);
    motes.position.set(focus.x, 0, focus.z);
    const p = pg.attributes.position;
    for (let i = 0; i < PN; i++) { let y = p.getY(i) + .004; if (y > 12) y = .5; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * .001 + i) * .004); }
    p.needsUpdate = true;
  }
  // ===== district C: 한강공원 (Han River park), south of the city through the 나들목 underpass at x 15..25 =====
  {
    // the sound-barrier wall that closes the city's south side, with the 나들목 (pedestrian underpass) in the gap
    for (const [x0, x1] of [[-86, 15], [25, 310]]) {
      add(new THREE.BoxGeometry(x1 - x0, 4.6, 1.4), toon("#9a978e"), (x0 + x1) / 2, 2.3, 110.3, street, .06);
      colliders.street.push({ x0, x1, z0: 109.4, z1: 111.2 });
      for (let x = x0 + 4; x < x1 - 4; x += rand(9, 16)) { const iv = add(new THREE.PlaneGeometry(rand(4, 8), rand(2, 4.4)), pick(ivyMats), x, 2, 109.5, street, 0, false); iv.rotation.y = Math.PI; }
    }
    add(new THREE.BoxGeometry(11, .6, 6), toon("#7d7a72"), 20, 4.4, 111, street, .06);   // underpass roof
    for (const x of [14.6, 25.4]) add(new THREE.BoxGeometry(.8, 4.4, 6), toon("#8a877e"), x, 2.2, 111, street, .05);
    {
      const c = document.createElement("canvas"); c.width = 512; c.height = 96; const x = c.getContext("2d");
      x.fillStyle = "#3a8f4c"; x.fillRect(0, 0, 512, 96); x.fillStyle = "#fff"; x.font = `52px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("한강공원 나들목", 256, 52);
      for (const z of [107.9, 114.1]) { const p = add(new THREE.PlaneGeometry(8, 1.5), toon("#ffffff", { map: canvasTex(c) }), 20, 5.6, z, street, 0, false); if (z > 110) p.rotation.y = Math.PI; }
    }
    // ground: lawn, bike path, walking path; the river beyond
    flat(394, 88, 112, 155, "#5e9a3e", .02);
    flat(394, 4, 112, 160, "#c85a3c", .04); flat(394, 3, 112, 176, "#d7c9a6", .04);
    for (let x = -84; x < 308; x += 6) flat(.3, 1.6, x, 160, "#f2efe6", .05);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 150), new THREE.MeshToonMaterial({ color: "#4f8fb8", gradientMap: grad })); water.rotation.x = -Math.PI / 2; water.position.set(112, .06, 275); street.add(water);
    flat(1400, 3, 112, 199.5, "#8f8c84", .07);   // river edge
    colliders.street.push({ x0: -200, x1: 400, z0: 198.6, z1: 230 });
    // far bank: grass and the classic wall of apartment towers
    flat(1400, 160, 112, 430, "#7d9a6a", .03);
    for (let i = 0; i < 14; i++) apartment(-110 + i * 34, 372 + (i % 2) * 18, 0, 18 + (i * 5) % 12, 201 + i, 28);
    // 강변북로: elevated expressway on pillars, one span collapsed
    for (let x = -84; x <= 306; x += 16) { if (x > 150 && x < 192) continue; add(new THREE.BoxGeometry(1.6, 9, 1.6), toon("#a9a69a"), x, 4.5, 133, street, .06); colliders.street.push({ x, z: 133, r: 1.2 }); }
    add(new THREE.BoxGeometry(236, 1.2, 16), toon("#9d9a8f"), -84 + 118, 9.6, 133, street, .08); add(new THREE.BoxGeometry(116, 1.2, 16), toon("#9d9a8f"), 250, 9.6, 133, street, .08);
    const fallen = add(new THREE.BoxGeometry(42, 1.2, 16), toon("#9d9a8f"), 171, 4.6, 133, street, .08); fallen.rotation.z = .22;
    colliders.street.push({ x0: 152, x1: 190, z0: 125, z1: 141 });
    for (let i = 0; i < 30; i++) leaf(rand(152, 190), rand(1, 9), 133 + rand(-8, 8), rand(.8, 1.6));
    // a crashed alien pod in the rubble (where the aliens of this area come from)
    { const pod = add(new THREE.SphereGeometry(3.2, 20, 14), toon("#3a2f52", { emissive: new THREE.Color("#7a4ad8"), emissiveIntensity: .6 }), 172, 1.2, 150, street, .08); pod.scale.y = .7;
      const ringM = new THREE.MeshBasicMaterial({ color: "#c8a8ff", toneMapped: false }); const ring = add(new THREE.TorusGeometry(3.4, .12, 8, 40), ringM, 172, 1.4, 150, street, 0, false); ring.rotation.x = Math.PI / 2 + .2;
      colliders.street.push({ x: 172, z: 150, r: 3.4 }); const L = new THREE.PointLight("#b48cff", 40, 22, 2); L.position.set(172, 4, 150); street.add(L); }
    // 편의점 kiosk (cup ramyeon, triangle gimbap; buys fish)
    { add(new THREE.BoxGeometry(6, 3.2, 4), toon("#f4f1e8"), 40, 1.6, 147, street, .06); add(new THREE.BoxGeometry(6.6, .3, 4.6), toon("#2f6db3"), 40, 3.35, 147, street, .05);
      const c = document.createElement("canvas"); c.width = 512; c.height = 96; const x = c.getContext("2d"); x.fillStyle = "#2f6db3"; x.fillRect(0, 0, 512, 96); x.fillStyle = "#fff"; x.font = `54px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("편의점 · 한강", 256, 52);
      add(new THREE.PlaneGeometry(5, .9), toon("#ffffff", { map: canvasTex(c) }), 40, 2.7, 149.02, street, 0, false); add(new THREE.PlaneGeometry(3.6, 1.4), toon("#bfe6ff"), 40, 1.3, 149.02, street, 0, false);
      for (const [px, pz] of [[34, 153], [46, 153]]) { add(new THREE.CylinderGeometry(.7, .7, .08, 12), toon("#e0a21c"), px, .8, pz, street, .03); add(new THREE.CylinderGeometry(.08, .08, .8, 6), toon("#555"), px, .4, pz, street); }
      colliders.street.push({ x0: 36.8, x1: 43.2, z0: 144.8, z1: 149.2 }); }
    // park information board (the Han River map is pinned to it)
    { add(new THREE.BoxGeometry(3, 2, .2), toon("#3a8f4c"), 30, 1.6, 120, street, .04); for (const x of [28.8, 31.2]) add(new THREE.BoxGeometry(.15, 1.4, .15), toon("#555"), x, .7, 120, street);
      colliders.street.push({ x0: 28.4, x1: 31.6, z0: 119.7, z1: 120.3 }); }
    // fishing pier (낚시터)
    { add(new THREE.BoxGeometry(10, .3, 5), toon("#8a5a32"), -20, .35, 197, street, .04); for (const x of [-24.5, -15.5]) add(new THREE.BoxGeometry(.2, 1, 5), toon("#6b4a32"), x, .9, 197, street);
      const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d"); x.fillStyle = "#2f5aa8"; x.fillRect(0, 0, 256, 64); x.fillStyle = "#fff"; x.font = `36px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("낚시터", 128, 34);
      add(new THREE.BoxGeometry(.15, 2, .15), toon("#555"), -26, 1, 194, street); add(new THREE.PlaneGeometry(1.6, .4), toon("#ffffff", { map: canvasTex(c) }), -26, 2.1, 193.9, street, 0, false); }
    // the broken bridge reaching into the river (the far side is another story)
    { for (let z = 215; z < 360; z += 22) { if (z > 245 && z < 270) continue; add(new THREE.BoxGeometry(3, 14, 3), toon("#a9a69a"), 220, 1, z, street, .06); }
      add(new THREE.BoxGeometry(14, 1.6, 50), toon("#8f8c82"), 220, 8, 222, street, .08); add(new THREE.BoxGeometry(14, 1.6, 90), toon("#8f8c82"), 220, 8, 318, street, .08);
      const bs = add(new THREE.BoxGeometry(14, 1.6, 28), toon("#8f8c82"), 220, 3.5, 258, street, .08); bs.rotation.x = -.42;
      for (let i = 0; i < 12; i++) leaf(220 + rand(-6, 6), 8.6, rand(198, 245), rand(.6, 1.2)); }
    // trees, grass
    for (let i = 0; i < 46; i++) { const tx = rand(-80, 304), tz = rand(115, 195); if (SPAWNS.some(s => Math.hypot(s.x - tx, s.z - tz) < 6) || Math.abs(tz - 133) < 10 || Math.abs(tz - 160) < 3 || Math.abs(tz - 176) < 2.5 || Math.hypot(tx - 40, tz - 147) < 7 || Math.hypot(tx - 172, tz - 150) < 8 || Math.hypot(tx + 20, tz - 194) < 8 || Math.hypot(tx - 20, tz - 116) < 8) continue; tree(tx, tz); }
    for (let i = 0; i < 2600; i++) tuft(rand(-84, 308), rand(113, 197), rand(.7, 1.4));
  }
  // ===== the first dungeon: the Line 2 tunnel under Hongdae (decisions 15, 23, 24), its own zone far away =====
  const dungeon = new THREE.Group(); dungeon.position.set(DUN.x, 0, DUN.z); scene.add(dungeon);
  {
    const D = dungeon, X = x => DUN.x + x;
    const concrete = toon("#4a4a50"), wallM = toon("#6b6e73"), ceil = toon("#2e2f34"), tile = (() => {
      const c = document.createElement("canvas"); c.width = 256; c.height = 128; const g = c.getContext("2d");
      g.fillStyle = "#cfcfc6"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "#a9a9a0"; for (let x = 0; x < 256; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
      g.fillStyle = "#00a84d"; g.fillRect(0, 60, 256, 12); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(30,40,20,${R() * .35})`; g.fillRect(R() * 256, R() * 128, rand(4, 30), rand(4, 30)); }
      const t = canvasTex(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return toon("#ffffff", { map: t }); })();
    // floor, ceiling and walls from the walkable rectangles; a wall piece is left out where two rectangles meet
    const RECTS = DUNGEON.rects;
    const covered = (axis, fixed, a0, a1, self) => {   // parts of the edge [a0,a1] that another rect covers
      const out = [];
      for (const o of RECTS) if (o !== self) {
        if (axis === "x" && fixed > o.z0 - .01 && fixed < o.z1 + .01) out.push([Math.max(a0, o.x0), Math.min(a1, o.x1)]);
        if (axis === "z" && fixed > o.x0 - .01 && fixed < o.x1 + .01) out.push([Math.max(a0, o.z0), Math.min(a1, o.z1)]);
      }
      return out.filter(([a, b]) => b > a);
    };
    const minus = (a0, a1, cuts) => { let segs = [[a0, a1]]; for (const [c0, c1] of cuts) segs = segs.flatMap(([s0, s1]) => c1 <= s0 || c0 >= s1 ? [[s0, s1]] : [[s0, c0], [c1, s1]].filter(([u, v]) => v - u > .05)); return segs; };
    for (const r of RECTS) {
      const w = r.x1 - r.x0, d = r.z1 - r.z0, h = r.room ? 8 : 6, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
      const f = add(new THREE.PlaneGeometry(w, d), concrete, cx, .01, cz, D, 0, false); f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
      const c = add(new THREE.PlaneGeometry(w, d), ceil, cx, h, cz, D, 0, false); c.rotation.x = Math.PI / 2;
      const wm = r.room ? tile : wallM;
      for (const [z, sgn] of [[r.z0, -1], [r.z1, 1]]) for (const [a, b] of minus(r.x0, r.x1, covered("x", z + sgn * .02, r.x0, r.x1, r))) add(new THREE.BoxGeometry(b - a, h, .4), wm, (a + b) / 2, h / 2, z + sgn * .2, D, 0);
      for (const [x, sgn] of [[r.x0, -1], [r.x1, 1]]) for (const [a, b] of minus(r.z0, r.z1, covered("z", x + sgn * .02, r.z0, r.z1, r))) add(new THREE.BoxGeometry(.4, h, b - a), wm, x + sgn * .2, h / 2, (a + b) / 2, D, 0);
      if (!r.room) {   // tracks + sleepers + cable tray
        for (const z of [-.75, .75]) add(new THREE.BoxGeometry(w, .14, .12), toon("#8a8780"), cx, .08, z, D, 0, false);
        for (let x = r.x0 + .6; x < r.x1; x += 1.2) add(new THREE.BoxGeometry(.3, .08, 2.2), toon("#5a4030"), x, .04, 0, D, 0, false);
        add(new THREE.BoxGeometry(w, .2, .3), toon("#3a3a3a"), cx, 4.2, r.z0 + .4, D, 0, false);
      }
      // roots coming through the ceiling: nature reached the tunnel too
      for (let k = 0; k < (r.room ? 10 : 4); k++) { const lx = rand(r.x0 + 1, r.x1 - 1), lz = rand(r.z0 + 1, r.z1 - 1), len = rand(1, 3); add(new THREE.CylinderGeometry(.05, .12, len, 5), toon(VINE), lx, h - len / 2, lz, D, 0, false); }
    }
    // emergency lights (the only light down here)
    for (const [x, z, c] of [[8, 0, "#ffb46a"], [70, 0, "#ff5a3a"], [126, 0, "#ff5a3a"], [176, 0, "#ffd89a"], [226, 0, "#ff5a3a"], [270, -10, "#ff3a2a"], [270, 10, "#ff3a2a"], [292, 0, "#b48cff"]]) {
      const L = new THREE.PointLight(c, 45, 30, 2); L.position.set(X(x), 5, DUN.z + z); scene.add(L);
      add(new THREE.BoxGeometry(.5, .2, .3), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }), x, 5.6, z, D, 0, false);
    }
    // start platform: stairs back up to the station
    for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(.7, .3, 6), toon("#7a7770"), 1.2 + i * .6, .15 + i * .3, 0, D);
    // boss hall pillars
    for (const [x, z] of [[266, -12], [266, 12], [284, -12], [284, 12]]) { add(new THREE.BoxGeometry(1.4, 8, 1.4), tile, x, 4, z, D, .06); DUNGEON.pillars.push({ x: X(x), z: DUN.z + z, r: 1.1 }); }
    // the three murals (벽화) of the quiz room: folk paintings with a sentence missing a word
    const art = (kind) => {
      const c = document.createElement("canvas"); c.width = 512; c.height = 384; const g = c.getContext("2d");
      g.fillStyle = "#d9c49a"; g.fillRect(0, 0, 512, 384); g.strokeStyle = "#6b3f22"; g.lineWidth = 16; g.strokeRect(8, 8, 496, 368);
      for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(80,50,20,${R() * .08})`; g.fillRect(R() * 512, R() * 384, rand(3, 18), rand(3, 18)); }
      if (kind === 0) { g.fillStyle = "#c8402f"; g.beginPath(); g.arc(380, 90, 46, 0, 7); g.fill(); g.fillStyle = "#3e6b35"; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(40 + i * 140, 300); g.lineTo(120 + i * 140, 140); g.lineTo(200 + i * 140, 300); g.fill(); } }
      else if (kind === 1) { g.fillStyle = "#e0a21c"; g.beginPath(); g.ellipse(256, 210, 150, 70, 0, 0, 7); g.fill(); g.fillStyle = "#2a1f17"; for (let i = 0; i < 9; i++) g.fillRect(140 + i * 26, 150, 8, 120); g.beginPath(); g.arc(380, 175, 40, 0, 7); g.fillStyle = "#e0a21c"; g.fill(); }
      else { g.fillStyle = "#2f5aa8"; g.beginPath(); g.arc(256, 120, 70, 0, 7); g.fill(); g.fillStyle = "#f6ead2"; g.beginPath(); g.arc(256, 120, 50, 0, 7); g.fill(); g.strokeStyle = "#2a1f17"; g.lineWidth = 6; g.beginPath(); g.moveTo(120, 320); g.quadraticCurveTo(256, 200, 392, 320); g.stroke(); }
      return toon("#ffffff", { map: canvasTex(c) });
    };
    DUNGEON.murals.forEach((m, i) => { const p = add(new THREE.PlaneGeometry(4.2, 3.15), art(i), m.x - DUN.x, 3.2, m.wz - DUN.z, D, 0, false); p.rotation.y = m.rot; });
    // exit stairs at the far end of the boss hall
    for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(.7, .3, 6), toon("#7a7770"), 298.8 - i * .6, .15 + i * .3, 0, D);
  }
  // ===== 여의도: across the broken bridge (option A), its own zone far away =====
  const yeouido = new THREE.Group(); yeouido.position.set(YD.x, 0, YD.z); scene.add(yeouido);
  const tower = new THREE.Group(); tower.position.set(TW.x, 0, TW.z); scene.add(tower);
  colliders.yeouido = []; colliders.tower = [];
  const ydMap = { rects: [], labels: [] };
  {
    const G = yeouido, X = x => YD.x + x, Z = z => YD.z + z;
    const ycol = (x0, x1, z0, z1, cam = true) => { const b = { x0: X(x0), x1: X(x1), z0: Z(z0), z1: Z(z1) }; colliders.yeouido.push(b); if (cam) camBlocks.push(b); };
    const gflat = (w, d, x, z, c, y = .02) => { const m = add(new THREE.PlaneGeometry(w, d), typeof c === "string" ? toon(c) : c, x, y, z, G, 0, false); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m; };
    const MR = (x0, x1, z0, z1, c) => ydMap.rects.push({ x0: X(x0), x1: X(x1), z0: Z(z0), z1: Z(z1), c, area: "yeouido" });
    const ML = (t, x, z, rot) => ydMap.labels.push({ t, x: X(x), z: Z(z), rot, area: "yeouido" });
    // the river all around; the banks you came from and the one beyond
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1400), new THREE.MeshToonMaterial({ color: "#4f8fb8", gradientMap: grad })); water.rotation.x = -Math.PI / 2; water.position.set(0, -5, 160); G.add(water);
    add(new THREE.BoxGeometry(1800, 6, 300), toon("#7d9a6a"), 0, -3, -190, G, 0, false);
    add(new THREE.BoxGeometry(1800, 6, 300), toon("#7d9a6a"), 0, -3, 560, G, 0, false);
    const towerM = ["#efe9dd", "#e9e4da", "#f2ede4", "#dfe3e6"].map(c => toon(c));
    for (let i = 0; i < 18; i++) { const h = rand(30, 70), x = -420 + i * 50 + rand(-8, 8); add(new THREE.BoxGeometry(34, h, 12), pick(towerM), x, h / 2, -80 - (i % 3) * 22, G, .2); }
    for (let i = 0; i < 16; i++) { const h = rand(40, 95), x = -400 + i * 52 + rand(-8, 8); if (Math.abs(x) < 180) continue; add(new THREE.BoxGeometry(rand(16, 30), h, rand(14, 24)), pick(towerM), x, h / 2, 440 + (i % 3) * 26, G, .2); }
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = rand(520, 620), h = rand(70, 130); const m = new THREE.Mesh(new THREE.ConeGeometry(rand(80, 130), h, 7), toon(pick(["#7f9a86", "#8aa48f", "#748f7c"]))); m.position.set(Math.cos(a) * r, h / 2 - 8, 160 + Math.sin(a) * r); G.add(m); }

    // ---- the bridge: deck, the fallen span with one steel beam left to climb, a broken arch dropping rubble ----
    const deckM = toon("#9d9a8f"), railM = toon("#7d7a72"), steel = toon("#5a5f66"), rust = toon("#8a5a3c");
    for (const [z0, z1] of [[0, 50], [80, 131]]) {
      add(new THREE.BoxGeometry(14, .8, z1 - z0), deckM, 0, -.4, (z0 + z1) / 2, G, .08);
      for (const x of [-7, 7]) add(new THREE.BoxGeometry(.3, 1.1, z1 - z0), railM, x, .55, (z0 + z1) / 2, G, .03);
      for (let z = z0 + 2; z < z1 - 1; z += 4) gflat(.25, 2, 0, z, "#e9e7df", .02);
    }
    for (const z of [12, 40, 92, 120]) add(new THREE.BoxGeometry(5, 5, 3), toon("#a9a69a"), 0, -2.6, z, G, .06);
    const fa = add(new THREE.BoxGeometry(14, .8, 20), deckM, 0, -3.4, 59.4, G, .08); fa.rotation.x = .35;
    const fb = add(new THREE.BoxGeometry(14, .8, 12), deckM, 0, -2.1, 74.4, G, .08); fb.rotation.x = -.35;
    add(new THREE.BoxGeometry(5, .4, 32), steel, 0, -.2, 65, G, .05);
    for (const x of [-2.3, 2.3]) add(new THREE.BoxGeometry(.25, .6, 32), rust, x, .3, 65, G, .02);
    for (let i = 0; i < 9; i++) { const r = add(new THREE.DodecahedronGeometry(rand(.25, .5), 0), toon("#8d8a84"), pick([-2.1, 2.1]), .2, rand(51, 79), G, .03); r.rotation.set(R() * 3, R() * 3, R() * 3); }
    for (let i = 0; i < 6; i++) { const b = add(new THREE.BoxGeometry(.12, .12, rand(2, 4)), rust, rand(-2, 2), .4, rand(52, 78), G, 0); b.rotation.set(rand(-.6, .6), R() * 3, rand(-.4, .4)); }
    for (const z of [44, 86]) for (const x of [-6.6, 6.6]) add(new THREE.BoxGeometry(.7, 13, .7), steel, x, 6.5, z, G, .04);
    for (const [z, rx] of [[50, -.25], [80, .3]]) { const top = add(new THREE.BoxGeometry(14, .7, .7), steel, 0, 12.6, z, G, .04); top.rotation.x = rx; }
    for (let i = 0; i < 5; i++) { const b = add(new THREE.BoxGeometry(.6, .6, rand(6, 10)), steel, rand(-6, 6), rand(9, 12.5), rand(52, 78), G, .03); b.rotation.set(rand(-.5, .5), rand(-.3, .3), rand(-.3, .3)); }
    // the north end: a pile of rubble you climbed up from the 한강공원 side
    for (let i = 0; i < 10; i++) { const r = add(new THREE.DodecahedronGeometry(rand(.8, 1.6), 0), toon(pick(["#8d8a84", "#a39a8c", "#77736c"])), rand(-6, 6), rand(-1.2, -.2), rand(-3, -.5), G, .05); r.rotation.set(R() * 3, R() * 3, R() * 3); }
    {
      const c = document.createElement("canvas"); c.width = 512; c.height = 128; const x = c.getContext("2d");
      x.fillStyle = "#2f6db3"; x.fillRect(0, 0, 512, 128); x.fillStyle = "#fff"; x.font = `56px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("← 한강공원 · 여의도 →", 256, 68);
      add(new THREE.BoxGeometry(.15, 2.6, .15), toon("#555"), 5.5, 1.3, 4, G); const s = add(new THREE.PlaneGeometry(3.2, .8), toon("#ffffff", { map: canvasTex(c) }), 5.5, 2.7, 4.08, G, 0, false); s.rotation.y = 0;
    }
    MR(-7, 7, 0, 131, "rgba(128,129,138,.95)"); ML("부서진 다리", 18, 65, -Math.PI / 2);

    // ---- the island ----
    add(new THREE.BoxGeometry(300, 5.2, 200), [toon("#a39d8f"), toon("#a39d8f"), toon("#6d9a52"), toon("#a39d8f"), toon("#a39d8f"), toon("#a39d8f")], 0, -2.6, 230, G, 0);
    gflat(300, 165, 0, 247.5, "#bdb6a6", .01);                        // the city part is paved
    gflat(300, 32, 0, 147, "#6d9a52", .015);                          // 여의도 한강공원 strip
    gflat(300, 3, 0, 152, "#d7c9a6", .03); gflat(300, 3.6, 0, 158, "#c85a3c", .03);
    gflat(20, 14, 0, 137, "#c9c2b2", .035);                           // the landing plaza
    gflat(300, 14, 0, 207, ROAD, .03); for (let x = -146; x < 148; x += 6) gflat(2.2, .3, x, 207, "#e9e7df", .04);   // 여의대로
    gflat(14, 160, 66, 250, ROAD, .03); for (let z = 172; z < 330; z += 6) gflat(.3, 2.2, 66, z, "#e9e7df", .04);
    for (const z of [130.2, 329.8]) for (const [x0, x1] of z < 200 ? [[-150, -7], [7, 150]] : [[-150, -62], [-56, 150]]) add(new THREE.BoxGeometry(x1 - x0, 1, .3), railM, (x0 + x1) / 2, .5, z, G, .02);
    for (const x of [-149.8, 149.8]) add(new THREE.BoxGeometry(.3, 1, 200), railM, x, .5, 230, G, .02);
    MR(-150, 150, 130, 330, "rgba(189,182,166,.95)"); MR(-150, 150, 131, 163, "rgba(94,154,62,.95)"); MR(-150, 150, 200, 214, "rgba(95,97,105,.95)"); MR(59, 73, 170, 330, "rgba(95,97,105,.95)");
    ML("여의도 한강공원", -70, 146); ML("여의대로", -110, 207);

    // 국회의사당 with the alien ship sitting on its dome
    {
      const cx = -95, cz = 280;
      add(new THREE.BoxGeometry(76, 16, 40), toon("#e6e1d3"), cx, 8, cz, G, .15);
      for (let i = 0; i < 12; i++) add(new THREE.CylinderGeometry(.9, .9, 14, 10), toon("#f2eee3"), cx - 30 + i * 5.45, 7, cz - 21.5, G, .05);
      add(new THREE.BoxGeometry(76, 2, 6), toon("#d8d2c2"), cx, 15, cz - 21, G, .08);
      add(new THREE.CylinderGeometry(15, 16, 5, 32), toon("#d8d2c2"), cx, 18.5, cz, G, .08);
      const dome = add(new THREE.SphereGeometry(15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), toon("#6f9a8a"), cx, 21, cz, G, .1); dome.scale.y = .62;
      ycol(cx - 38, cx + 38, cz - 23, cz + 20);
      const ship = add(new THREE.SphereGeometry(24, 32, 12), toon("#3a2f52", { emissive: new THREE.Color("#7a4ad8"), emissiveIntensity: .5 }), cx, 36, cz, G, .12); ship.scale.y = .22;
      const ringM = new THREE.MeshBasicMaterial({ color: "#c8a8ff", toneMapped: false });
      for (const r of [16, 25]) { const ring = add(new THREE.TorusGeometry(r, .35, 8, 64), ringM, cx, 35, cz, G, 0, false); ring.rotation.x = Math.PI / 2; }
      add(new THREE.CylinderGeometry(6, 10, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: "#b48cff", transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), cx, 28, cz, G, 0, false);
      const L = new THREE.PointLight("#b48cff", 160, 80, 2); L.position.set(X(cx), 24, Z(cz) - 26); scene.add(L);
      MR(cx - 38, cx + 38, cz - 23, cz + 20, "rgba(180,140,255,.95)"); ML("국회의사당", cx, cz);
    }
    // IFC towers and the 63빌딩 (the dungeon)
    const glass = (tint, win) => {
      const c = document.createElement("canvas"); c.width = 128; c.height = 512; const g = c.getContext("2d");
      g.fillStyle = tint; g.fillRect(0, 0, 128, 512); g.fillStyle = win; for (let y = 4; y < 512; y += 8) g.fillRect(2, y, 124, 4); g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(10, 0, 16, 512);
      const e = document.createElement("canvas"); e.width = 128; e.height = 512; const ge = e.getContext("2d"); ge.fillStyle = "#000"; ge.fillRect(0, 0, 128, 512); for (let y = 4; y < 512; y += 8) if (R() < .25) { ge.fillStyle = "#cfe8ff"; ge.fillRect(2 + (R() * 80 | 0), y, 40, 4); }
      const m = toon("#ffffff", { map: canvasTex(c), emissiveMap: canvasTex(e), emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0 }); glowMats.push({ m, k: .9 }); return m;
    };
    const ifc = glass("#7fa3bd", "#4f7a98");
    for (const [x, z, w, d, h] of [[10, 300, 22, 22, 96], [44, 286, 20, 20, 74], [40, 318, 18, 18, 58]]) { add(new THREE.BoxGeometry(w, h, d), ifc, x, h / 2, z, G, .2); ycol(x - w / 2, x + w / 2, z - d / 2, z + d / 2); MR(x - w / 2, x + w / 2, z - d / 2, z + d / 2, "rgba(70,52,40,.95)"); }
    ML("IFC", 30, 300);
    {
      const gold = glass("#d9a93a", "#b07d1e"), cx = 110, cz = 290;
      add(new THREE.BoxGeometry(28, 150, 22), gold, cx, 75, cz, G, .25);
      add(new THREE.BoxGeometry(20, 12, 16), gold, cx, 156, cz, G, .2);
      const c = document.createElement("canvas"); c.width = 256; c.height = 256; const x = c.getContext("2d"); x.fillStyle = "#3a2a10"; x.fillRect(0, 0, 256, 256); x.fillStyle = "#ffd23d"; x.font = `180px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("63", 128, 140);
      const sm = new THREE.MeshBasicMaterial({ map: canvasTex(c), toneMapped: false }); const s = add(new THREE.PlaneGeometry(12, 12), sm, cx, 140, cz - 11.05, G, 0, false); s.rotation.y = Math.PI;
      add(new THREE.BoxGeometry(14, .6, 6), toon("#3a3a3a"), cx, 5, cz - 13.5, G, .05);
      for (const dx of [-6.5, 6.5]) add(new THREE.BoxGeometry(.5, 5, .5), toon("#3a3a3a"), cx + dx, 2.5, cz - 16, G, .03);
      add(new THREE.BoxGeometry(6, 4, .4), toon("#14161a"), cx, 2, cz - 11.1, G, 0, false);
      add(new THREE.BoxGeometry(6.6, .3, .5), new THREE.MeshBasicMaterial({ color: "#b48cff", toneMapped: false }), cx, 4.1, cz - 11.2, G, 0, false);
      const c2 = document.createElement("canvas"); c2.width = 512; c2.height = 96; const y = c2.getContext("2d"); y.fillStyle = "#3a2a10"; y.fillRect(0, 0, 512, 96); y.fillStyle = "#ffd23d"; y.font = `54px ${FONT}`; y.textAlign = "center"; y.textBaseline = "middle"; y.fillText("63빌딩 · 입구", 256, 52);
      const s2 = add(new THREE.PlaneGeometry(6, 1.1), toon("#ffffff", { map: canvasTex(c2) }), cx, 5.9, cz - 16.6, G, 0, false); s2.rotation.y = Math.PI;
      ycol(cx - 14, cx + 14, cz - 11, cz + 11);
      MR(cx - 14, cx + 14, cz - 11, cz + 11, "rgba(224,162,28,.95)"); ML("63빌딩", cx, cz + 18);
    }
    // the survivors' camp at the landing, the information board with the map
    {
      for (const [x, z, c] of [[16, 146, "#c8402f"], [22, 140, "#2f7f86"], [14, 136, "#e0a21c"]]) { const t = add(new THREE.ConeGeometry(2, 2.4, 4), toon(c), x, 1.2, z, G, .05); t.rotation.y = R() * 3; colliders.yeouido.push({ x: X(x), z: Z(z), r: 1.8 }); }
      add(new THREE.CylinderGeometry(.8, .9, .3, 10), toon("#555"), 19, .15, 144, G, .03); add(new THREE.ConeGeometry(.4, .7, 6), new THREE.MeshBasicMaterial({ color: "#ffb46a", toneMapped: false }), 19, .6, 144, G, 0, false);
      colliders.yeouido.push({ x: X(19), z: Z(144), r: 1 });
      add(new THREE.BoxGeometry(3, 2, .2), toon("#3a8f4c"), -8, 1.6, 140, G, .04); for (const x of [-9.2, -6.8]) add(new THREE.BoxGeometry(.15, 1.4, .15), toon("#555"), x, .7, 140, G);
      colliders.yeouido.push({ x0: X(-9.6), x1: X(-6.4), z0: Z(139.8), z1: Z(140.4) });
    }
    // 여의도 is famous for its cherry trees: pink ones along the park and the boulevard
    const pinks = ["#f4b6c8", "#f7c9d6", "#eaa3b8", "#f9d7e2"].map(c => toon(c));
    const cherry = (x, z) => {
      const h = rand(3.5, 5); add(new THREE.CylinderGeometry(.2, .32, h, 7), toon(TRUNK), x, h / 2, z, G, .04);
      for (let j = 0; j < 5; j++) add(new THREE.IcosahedronGeometry(rand(1, 1.6), 1), pick(pinks), x + rand(-1.4, 1.4), h + rand(-.3, 1.2), z + rand(-1.4, 1.4), G, .03);
      colliders.yeouido.push({ x: X(x), z: Z(z), r: .6 });
    };
    const clear = (x, z) => YEOUIDO.spawns.every(s => Math.hypot(s.x - X(x), s.z - Z(z)) > 7) && Math.abs(x) > 14;
    for (let x = -144; x < 146; x += rand(9, 14)) { if (clear(x, 164)) cherry(x, 164); if (clear(x, 197)) cherry(x, 197); if (clear(x, 217) && (x < -60 || x > 75)) cherry(x, 217); }
    for (let i = 0; i < 900; i++) tuft(X(rand(-148, 148)), Z(rand(132, 162)), rand(.7, 1.3));
    // abandoned cars on the boulevard
    for (const [x, z, r, c] of [[-40, 205, .3, "#e8892b"], [25, 209, -.2, "#2f6fc0"], [90, 204, 1.2, "#d4d4d4"], [66, 260, 1.6, "#1c2228"]]) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r; G.add(g);
      add(new THREE.BoxGeometry(1.9, .8, 4.3), toon(c), 0, .7, 0, g, .05); add(new THREE.BoxGeometry(1.7, .7, 2.2), toon("#26323a"), 0, 1.4, -.1, g, .04);
      colliders.yeouido.push({ x: X(x), z: Z(z), r: 2.2 });
    }
    // street lamps
    for (let x = -140; x <= 140; x += 28) for (const z of [199, 215]) { add(new THREE.CylinderGeometry(.08, .1, 5, 6), toon("#3a3a3a"), x, 2.5, z, G); add(new THREE.SphereGeometry(.25, 8, 6), toon("#fff1c0", { emissive: new THREE.Color("#ffd89a"), emissiveIntensity: .6 }), x, 5.1, z, G, 0, false); }
    // ===== 노량진, across the 샛강 footbridge (area 4 = A) =====
    {
      const MRN = (x0, x1, z0, z1, c) => ydMap.rects.push({ x0: X(x0), x1: X(x1), z0: Z(z0), z1: Z(z1), c, area: "noryangjin" });
      const MLN = (t, x, z, rot) => ydMap.labels.push({ t, x: X(x), z: Z(z), rot, area: "noryangjin" });
      // the footbridge over the 샛강
      add(new THREE.BoxGeometry(6, .6, 82), deckM, -59, -.3, 370, G, .06);
      for (const x of [-62, -56]) add(new THREE.BoxGeometry(.2, 1.1, 82), toon("#3a8f4c"), x, .55, 370, G, .02);
      for (const z of [345, 370, 395]) add(new THREE.BoxGeometry(2.5, 5, 2.5), toon("#a9a69a"), -59, -2.8, z, G, .05);
      MRN(-62, -56, 329, 411, "rgba(128,129,138,.95)"); MLN("샛강 다리", -40, 372, -Math.PI / 2);
      // ground: the bank, streets, puddles
      gflat(300, 150, 0, 485, "#a8a395", .015);
      gflat(300, 12, 0, 455, ROAD, .03); gflat(12, 150, 0, 485, ROAD, .03);
      for (let i = 0; i < 9; i++) gflat(rand(2, 5), rand(1.5, 3.5), rand(-140, 140), rand(415, 555), toon("#5d8aa8", { transparent: true, opacity: .7 }), .04);
      for (const z of [409.8, 560.2]) add(new THREE.BoxGeometry(300, 1, .3), railM, 0, .5, z, G, .02);
      add(new THREE.BoxGeometry(.3, 1, 150), railM, -149.8, .5, 485, G, .02);
      for (const [a, b] of [[410, 415], [427, 560]]) add(new THREE.BoxGeometry(.3, 1, b - a), railM, 149.8, .5, (a + b) / 2, G, .02);   // the gap: the road to the 한강대교
      MRN(-150, 150, 410, 560, "rgba(168,163,149,.95)"); MRN(-150, 150, 449, 461, "rgba(95,97,105,.95)"); MRN(-6, 6, 410, 560, "rgba(95,97,105,.95)");
      // 노량진 수산시장: a long hall with a rounded roof; the dungeon door faces the footbridge
      { const cx = -70, cz = 470;
        add(new THREE.BoxGeometry(80, 8, 60), toon("#d8d4c8"), cx, 4, cz, G, .15);
        const roof = add(new THREE.CylinderGeometry(30, 30, 80, 24, 1, false, 0, Math.PI), toon("#5d8aa8"), cx, 8, cz, G, .12); roof.rotation.z = Math.PI / 2; roof.scale.set(1, 1, .35);
        ycol(cx - 40, cx + 40, cz - 30, cz + 30);
        add(new THREE.BoxGeometry(8, 5, .4), toon("#14161a"), cx, 2.5, cz - 30.1, G, 0, false);
        const c = document.createElement("canvas"); c.width = 512; c.height = 96; const x = c.getContext("2d"); x.fillStyle = "#2f5aa8"; x.fillRect(0, 0, 512, 96); x.fillStyle = "#fff"; x.font = `54px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("노량진 수산시장", 256, 52);
        const s = add(new THREE.PlaneGeometry(14, 2.6), toon("#ffffff", { map: canvasTex(c) }), cx, 6.6, cz - 30.25, G, 0, false); s.rotation.y = Math.PI;
        for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(1.2, .8, 1), toon(pick(["#f2f2ee", "#e0e6ea"])), cx + rand(-14, 14), .4, cz - 33 - rand(0, 3), G, .03);
        MRN(cx - 40, cx + 40, cz - 30, cz + 30, "rgba(93,138,168,.95)"); MLN("수산시장", cx, cz); }
      // the cram-school street: narrow tall buildings with academy signs
      const ACAD = ["합격 학원", "공무원", "임용 고시", "영어 단기", "수학의 정석", "고시원", "편입 학원", "합격!"];
      for (let i = 0; i < 8; i++) {
        const x = 8 + i * 17.5, h = rand(22, 40), w = 15, z = 536;
        add(new THREE.BoxGeometry(w, h, 22), toon(pick(["#e8e2d4", "#d8dce0", "#e4d8c8"])), x, h / 2, z, G, .15); ycol(x - w / 2, x + w / 2, z - 11, z + 11);
        const c = document.createElement("canvas"); c.width = 128; c.height = 512; const g = c.getContext("2d"); const col = NEON[i % NEON.length];
        g.fillStyle = "#0b0910"; g.fillRect(0, 0, 128, 512); g.shadowColor = col; g.shadowBlur = 18; g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(8, 8, 112, 496); g.fillStyle = "#fff"; g.font = `60px ${FONT}`; g.textAlign = "center";
        const chars = [...ACAD[i].replace(/\s/g, "")]; chars.forEach((ch, k) => g.fillText(ch, 64, 80 + k * (420 / Math.max(4, chars.length))));
        const sm = new THREE.MeshBasicMaterial({ map: canvasTex(c), toneMapped: false }); const sg = add(new THREE.PlaneGeometry(2.4, 9), sm, x - w / 2 + 2, h * .55, z - 11.05, G, 0, false); sg.rotation.y = Math.PI;
        MRN(x - w / 2, x + w / 2, z - 11, z + 11, "rgba(70,52,40,.95)");
      }
      MLN("학원가", 70, 520);
      // 컵밥 거리: stalls with orange tarps
      for (let i = 0; i < 5; i++) { const x = 18 + i * 16, z = 470;
        add(new THREE.BoxGeometry(5, 1, 2), toon("#8a6a4a"), x, .5, z, G, .03); const t = add(new THREE.BoxGeometry(5.6, .1, 3), toon("#e0882a"), x, 2.6, z - .4, G, .03); t.rotation.x = -.15;
        for (const dx of [-2.6, 2.6]) add(new THREE.CylinderGeometry(.05, .05, 2.6, 6), toon("#555"), x + dx, 1.3, z + .6, G);
        colliders.yeouido.push({ x0: X(x - 2.6), x1: X(x + 2.6), z0: Z(z - 1), z1: Z(z + 1) }); }
      MLN("컵밥 거리", 50, 478);
      // the map board and the 노량진역 (Line 1) entrance
      add(new THREE.BoxGeometry(3, 2, .2), toon("#3a8f4c"), -45, 1.6, 420, G, .04); for (const x of [-46.2, -43.8]) add(new THREE.BoxGeometry(.15, 1.4, .15), toon("#555"), x, .7, 420, G);
      colliders.yeouido.push({ x0: X(-46.6), x1: X(-43.4), z0: Z(419.7), z1: Z(420.3) });
      { add(new THREE.BoxGeometry(5, 3, 4), toon("#9fc4d4"), 120, 1.5, 428, G, .05); add(new THREE.BoxGeometry(5.4, .3, 4.4), toon("#263c96"), 120, 3.15, 428, G, .04);
        const c = document.createElement("canvas"); c.width = 512; c.height = 128; const x = c.getContext("2d"); x.fillStyle = "#f4f4f0"; x.fillRect(0, 0, 512, 128); x.fillStyle = "#263c96"; x.beginPath(); x.arc(64, 64, 44, 0, 7); x.fill(); x.fillStyle = "#fff"; x.font = `64px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("1", 64, 68); x.fillStyle = "#1b1b1b"; x.font = `58px ${FONT}`; x.fillText("노량진역", 300, 68);
        add(new THREE.PlaneGeometry(4.6, 1.1), toon("#ffffff", { map: canvasTex(c) }), 120, 3.9, 425.9, G, 0, false).rotation.y = Math.PI;
        ycol(117.5, 122.5, 426, 430); MLN("노량진역", 120, 438); }
      for (let i = 0; i < 400; i++) tuft(X(rand(-148, 148)), Z(rand(412, 445)), rand(.6, 1.1));
    }
    // ===== 용산, over the 한강대교 from 노량진 (area 5 = B) =====
    {
      const MRY = (x0, x1, z0, z1, c) => ydMap.rects.push({ x0: X(x0), x1: X(x1), z0: Z(z0), z1: Z(z1), c, area: "yongsan" });
      const MLY = (t, x, z, rot) => ydMap.labels.push({ t, x: X(x), z: Z(z), rot, area: "yongsan" });
      const sign = (text, bg, w, h, x, y, z, ry = 0, fg = "#fff") => { const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext("2d"); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.font = `${Math.round(c.height * .55)}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 256, c.height * .54); const m = add(new THREE.PlaneGeometry(w, h), toon("#ffffff", { map: canvasTex(c) }), x, y, z, G, 0, false); m.rotation.y = ry; return m; };
      const green = ["#6f9a5a", "#7fa866", "#5f8a4e", "#8ab26e"].map(c => toon(c));
      const ytree = (x, z, h = rand(4.5, 7)) => {
        add(new THREE.CylinderGeometry(.22, .36, h, 7), toon(TRUNK), x, h / 2, z, G, .04);
        for (let j = 0; j < 6; j++) add(new THREE.IcosahedronGeometry(rand(1.1, 1.8), 1), pick(green), x + rand(-1.5, 1.5), h + rand(-.4, 1.4), z + rand(-1.5, 1.5), G, .03);
        colliders.yeouido.push({ x: X(x), z: Z(z), r: .6 });
      };
      const yclear = (x, z) => YEOUIDO.spawns.every(s => Math.hypot(s.x - X(x), s.z - Z(z)) > 7);
      // the approach road along 노량진's east side, then the bridge north
      gflat(66, 12, 182, 421, ROAD, .03); for (let x = 152; x < 214; x += 4) gflat(2, .25, x, 421, "#e9e7df", .035);
      MRY(149, 215, 415, 427, "rgba(95,97,105,.95)");
      // 한강대교: two decks with the famous steel arches, 노들섬 in the middle
      for (const [z0, z1] of [[250, 415], [112, 198]]) {
        add(new THREE.BoxGeometry(12, .8, z1 - z0), deckM, 209, -.4, (z0 + z1) / 2, G, .08);
        for (const x of [203.1, 214.9]) add(new THREE.BoxGeometry(.3, 1.1, z1 - z0), railM, x, .55, (z0 + z1) / 2, G, .03);
        for (let z = z0 + 2; z < z1 - 1; z += 4) gflat(.25, 2, 209, z, "#e9e7df", .02);
        for (let z = z0 + 14; z < z1 - 6; z += 38) add(new THREE.BoxGeometry(6, 6, 3), toon("#a9a69a"), 209, -3.4, z, G, .06);
        MRY(203, 215, z0, z1, "rgba(128,129,138,.95)");
      }
      const archM = toon("#2f7a8a");
      for (const [z0, z1] of [[262, 320], [330, 395], [125, 190]]) {
        const pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(new THREE.Vector3(0, Math.sin(t * Math.PI) * 9, z0 + (z1 - z0) * t)); }
        for (const x of [203.4, 214.6]) { const tube = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .32, 6), archM, x, .5, 0, G, .03); }
        for (let k = 1; k < 8; k++) { const t = k / 8, y = Math.sin(t * Math.PI) * 9; for (const x of [203.4, 214.6]) add(new THREE.BoxGeometry(.12, y, .12), archM, x, .5 + y / 2, z0 + (z1 - z0) * t, G, 0); }
      }
      sign("한강대교 · 용산 ↑", "#2f6db3", 7, 1.4, 209, 4.2, 412.2);
      // 노들섬: a grass island with the music hall and a little lawn stage
      add(new THREE.BoxGeometry(80, 6, 56), toon("#7d9a6a"), 210, -3, 224, G, .05);
      gflat(80, 56, 210, 224, "#8fb27a", .02); gflat(12, 56, 209, 224, "#b9b2a2", .03);
      { add(new THREE.BoxGeometry(18, 7, 14), toon("#d8d4c8"), 236, 3.5, 210, G, .12); add(new THREE.BoxGeometry(19, .5, 15), toon("#3a8f4c"), 236, 7.2, 210, G, .05);
        ycol(227, 245, 203, 217); sign("노들섬", "#3a8f4c", 6, 1.3, 236, 5, 217.1); }
      for (const [x, z] of [[176, 202], [178, 246], [244, 246], [194, 236]]) if (yclear(x, z)) ytree(x, z);
      for (let i = 0; i < 260; i++) tuft(X(rand(171, 249)), Z(rand(197, 251)), rand(.7, 1.2));
      MRY(170, 250, 196, 252, "rgba(143,178,122,.95)"); MLY("노들섬", 224, 236);
      // the 용산 bank: lawn, paths, the museum, 거울못 and the family park
      add(new THREE.BoxGeometry(304, 6, 154), toon("#7d9a6a"), 309, -3, 41, G, .05);
      gflat(302, 146, 309, 41, "#a9c28f", .02);
      gflat(302, 10, 309, 104, "#c9c2b2", .03); gflat(10, 146, 209, 41, "#c9c2b2", .03); gflat(120, 8, 325, 22, "#d8d2c4", .03);
      for (const x of [157.8, 460.2]) add(new THREE.BoxGeometry(.3, 1, 146), railM, x, .5, 41, G, .02);
      add(new THREE.BoxGeometry(302, 1, .3), railM, 309, .5, -32.2, G, .02);
      for (const [a, b] of [[158, 203], [215, 460]]) add(new THREE.BoxGeometry(b - a, 1, .3), railM, (a + b) / 2, .5, 114.2, G, .02);
      MRY(158, 460, -32, 114, "rgba(169,194,143,.95)"); MRY(158, 460, 99, 109, "rgba(201,194,178,.95)");
      // 국립중앙박물관: two long stone wings with the open court (열린마당) between them under one flat roof
      { const stone = toon("#d9d2c2"), roofM = toon("#b8b0a0");
        add(new THREE.BoxGeometry(60, 14, 30), stone, 280, 7, -5, G, .15); add(new THREE.BoxGeometry(60, 14, 30), stone, 370, 7, -5, G, .15);
        add(new THREE.BoxGeometry(150, 1.4, 32), roofM, 325, 14.7, -5, G, .12);
        add(new THREE.BoxGeometry(30, 10, 2), toon("#c9c2b2"), 325, 5, -19, G, .08);
        for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(30, .3, 1), toon("#cfc8b8"), 325, .15 + i * .3, 8 - i * .9, G, 0);
        ycol(250, 310, -20, 10); ycol(340, 400, -20, 10); ycol(310, 340, -20, -17);
        add(new THREE.BoxGeometry(6, 5, .4), toon("#14161a"), 325, 2.5, 9.9, G, 0, false);
        sign("국립중앙박물관", "#3a3a3a", 16, 2.2, 325, 11.6, 10.25, 0, "#f2e6c8");
        MRY(250, 400, -20, 10, "rgba(201,194,178,.95)"); MLY("국립중앙박물관", 325, -5); }
      // 거울못: the reflecting pond, with the little 청자정 pavilion
      { const pond = gflat(90, 30, 325, 55, toon("#5d8aa8", { emissive: new THREE.Color("#2a4a66"), emissiveIntensity: .25 }), .05);
        ycol(280, 370, 40, 70, false);
        add(new THREE.CylinderGeometry(3.4, 3.4, .4, 8), toon("#e8e2d4"), 360, .25, 46, G, .04);
        for (let k = 0; k < 4; k++) { const a = k / 4 * 6.28 + .4; add(new THREE.CylinderGeometry(.15, .15, 3, 6), toon("#7a5a3a"), 360 + Math.cos(a) * 2.6, 1.7, 46 + Math.sin(a) * 2.6, G, .02); }
        add(new THREE.ConeGeometry(4.2, 1.6, 8), toon("#5f9a8a"), 360, 3.9, 46, G, .04);
        MRY(280, 370, 40, 70, "rgba(93,138,168,.95)"); MLY("거울못", 318, 56); }
      // 용산가족공원: trees on the east lawn, benches
      for (let i = 0; i < 26; i++) { const x = rand(404, 456), z = rand(-28, 96); if (yclear(x, z)) ytree(x, z); }
      for (let i = 0; i < 10; i++) { const x = rand(165, 245), z = rand(-28, 92); if (yclear(x, z) && Math.abs(x - 209) > 8) ytree(x, z, rand(4, 6)); }
      MLY("용산가족공원", 430, 30);
      // the map board at the end of the bridge, and 한동's museum café cart
      add(new THREE.BoxGeometry(3, 2, .2), toon("#3a8f4c"), 196, 1.6, 108, G, .04); for (const x of [194.8, 197.2]) add(new THREE.BoxGeometry(.15, 1.4, .15), toon("#555"), x, .7, 108, G);
      colliders.yeouido.push({ x0: X(194.4), x1: X(197.6), z0: Z(107.7), z1: Z(108.3) });
      { add(new THREE.BoxGeometry(3.2, 1.1, 1.6), toon("#e8e2d4"), 226, .55, 101.6, G, .04); const aw = add(new THREE.BoxGeometry(3.6, .1, 2.2), toon("#c8402f"), 226, 2.7, 101.4, G, .03); aw.rotation.x = -.12;
        for (const dx of [-1.6, 1.6]) add(new THREE.CylinderGeometry(.05, .05, 2.6, 6), toon("#555"), 226 + dx, 1.3, 102.3, G);
        sign("박물관 카페", "#c8402f", 3, .6, 226, 1.5, 102.45);
        colliders.yeouido.push({ x0: X(224.4), x1: X(227.6), z0: Z(100.8), z1: Z(102.4) }); }
      for (let i = 0; i < 700; i++) { const x = rand(160, 458), z = rand(-30, 112); if ((x > 248 && x < 402 && z > -22 && z < 12) || (x > 278 && x < 372 && z > 38 && z < 72)) continue; tuft(X(x), Z(z), rand(.7, 1.3)); }
      MLY("용산", 300, 85);
    }
  }
  // the street side: a slope of rubble under the end of the broken bridge (that's where you climb up)
  for (let i = 0; i < 14; i++) { const r = add(new THREE.DodecahedronGeometry(rand(.6, 1.4), 0), toon(pick(["#8d8a84", "#a39a8c", "#77736c"])), 220 + rand(-5, 5), rand(.2, 6) * (i / 14), 197 + i * .35 + rand(-.3, .3), street, .05); r.rotation.set(R() * 3, R() * 3, R() * 3); }
  for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(2.4, .2, .5), toon("#6b4a32"), 220, 1 + i * 1.5, 197.6 + i * .7, street, .02);
  for (const x of [218.6, 221.4]) { const p = add(new THREE.BoxGeometry(.18, 8.4, .18), toon("#6b4a32"), x, 4.2, 199.6, street); p.rotation.x = -.38; }

  // ===== the second dungeon: the 63빌딩, six rooms from the lobby to the roof =====
  {
    const D = tower, X = x => TW.x + x;
    const RECTS = TOWER.rects;
    const tex = (bg, fn, rep = [1, 1]) => { const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d"); g.fillStyle = bg; g.fillRect(0, 0, 256, 256); fn(g); const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); return toon("#ffffff", { map: t }); };
    const marble = tex("#e6e0d2", g => { g.strokeStyle = "#cfc6b4"; for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } for (let i = 0; i < 30; i++) { g.strokeStyle = `rgba(150,140,120,${R() * .3})`; g.beginPath(); g.moveTo(R() * 256, R() * 256); g.lineTo(R() * 256, R() * 256); g.stroke(); } }, [6, 6]);
    const carpet = tex("#7a2f2f", g => { g.fillStyle = "#8c3a36"; for (let i = 0; i < 256; i += 32) g.fillRect(i, 0, 16, 256); }, [4, 1]);
    const goldWall = tex("#c99a3a", g => { g.fillStyle = "#b8862a"; for (let i = 0; i < 256; i += 32) g.fillRect(0, i, 256, 4); }, [3, 1]);
    const aquaWall = tex("#20506e", g => { g.fillStyle = "#2c6a8e"; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(R() * 256, R() * 256, rand(2, 8), 0, 7); g.fill(); } }, [3, 1]);
    const metalWall = tex("#8c939a", g => { g.strokeStyle = "#6c737a"; for (let i = 0; i < 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); } }, [3, 1]);
    const officeWall = tex("#d8d2c4", g => { g.fillStyle = "#c4bcac"; g.fillRect(0, 200, 256, 56); }, [3, 1]);
    const skyWall = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#79bde8"); gr.addColorStop(.7, "#f7e3b5"); gr.addColorStop(1, "#8e9a7c"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = "#3a3f4a"; for (let i = 0; i < 256; i += 64) g.fillRect(i, 0, 6, 256); g.fillStyle = "rgba(90,100,110,.6)"; for (let i = 0; i < 12; i++) { const h = rand(20, 60); g.fillRect(R() * 256, 200 - h, rand(8, 20), h); } const t = canvasTex(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return new THREE.MeshBasicMaterial({ map: t, toneMapped: false }); })();
    const roofWall = toon("#9a978e"), ceil = toon("#3a3a40");
    const WALL = { lobby: goldWall, aqua: aquaWall, lift: metalWall, office: officeWall, deck: skyWall, roof: roofWall };
    const FLOOR = { lobby: marble, aqua: toon("#2a4a5e"), lift: marble, office: toon("#8a8478"), deck: marble, roof: toon("#6b6e73") };
    const covered = (axis, fixed, a0, a1, self) => { const out = []; for (const o of RECTS) if (o !== self) { if (axis === "x" && fixed > o.z0 - .01 && fixed < o.z1 + .01) out.push([Math.max(a0, o.x0), Math.min(a1, o.x1)]); if (axis === "z" && fixed > o.x0 - .01 && fixed < o.x1 + .01) out.push([Math.max(a0, o.z0), Math.min(a1, o.z1)]); } return out.filter(([a, b]) => b > a); };
    const minus = (a0, a1, cuts) => { let segs = [[a0, a1]]; for (const [c0, c1] of cuts) segs = segs.flatMap(([s0, s1]) => c1 <= s0 || c0 >= s1 ? [[s0, s1]] : [[s0, c0], [c1, s1]].filter(([u, v]) => v - u > .05)); return segs; };
    for (const r of RECTS) {
      const w = r.x1 - r.x0, d = r.z1 - r.z0, h = r.roof ? 1.4 : r.room ? 8 : 5, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
      const f = add(new THREE.PlaneGeometry(w, d), r.room ? FLOOR[r.kind] : carpet, cx, .01, cz, D, 0, false); f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
      if (!r.roof) { const c = add(new THREE.PlaneGeometry(w, d), ceil, cx, h, cz, D, 0, false); c.rotation.x = Math.PI / 2; }
      const wm = r.room ? WALL[r.kind] : officeWall;
      for (const [z, sgn] of [[r.z0, -1], [r.z1, 1]]) for (const [a, b] of minus(r.x0, r.x1, covered("x", z + sgn * .02, r.x0, r.x1, r))) add(new THREE.BoxGeometry(b - a, h, .4), wm, (a + b) / 2, h / 2, z + sgn * .2, D, 0);
      for (const [x, sgn] of [[r.x0, -1], [r.x1, 1]]) for (const [a, b] of minus(r.z0, r.z1, covered("z", x + sgn * .02, r.z0, r.z1, r))) add(new THREE.BoxGeometry(.4, h, b - a), wm, x + sgn * .2, h / 2, (a + b) / 2, D, 0);
    }
    const tcol = (x0, x1, z0, z1) => colliders.tower.push({ x0: X(x0), x1: X(x1), z0: TW.z + z0, z1: TW.z + z1 });
    const pillar = (x, z, r, mat, h = 8) => { add(new THREE.CylinderGeometry(r * .8, r * .8, h, 12), mat, x, h / 2, z, D, .05); TOWER.pillars.push({ x: X(x), z: TW.z + z, r }); };
    const label = (text, color, w, h) => { const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * h / w); const x = c.getContext("2d"); x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#fff"; x.font = `${Math.round(c.height * .6)}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 256, c.height * .54); return toon("#ffffff", { map: canvasTex(c) }); };
    // 1 lobby: gold pillars, the reception desk, stairs down to the street door
    for (const [x, z] of [[10, -7], [10, 7], [22, -7], [22, 7]]) pillar(x, z, 1, toon("#d9a93a"));
    add(new THREE.BoxGeometry(8, 1.1, 1.4), toon("#3a2a10"), 16, .55, -10.4, D, .04); tcol(12, 20, -11.2, -9.6);
    { const s = add(new THREE.PlaneGeometry(7, 1.2), label("63빌딩 · 로비", "#3a2a10", 7, 1.2), 15, 5.2, -11.75, D, 0, false); }
    // 2 aquarium: tanks along the walls, a round tank in the middle, the torn poster
    const glassM = new THREE.MeshBasicMaterial({ color: "#5ab4e0", transparent: true, opacity: .35, depthWrite: false, toneMapped: false });
    for (const [x, z] of [[49, -12], [58, -12], [50, 12], [60, 12], [69, 12]]) { add(new THREE.BoxGeometry(7, 4.5, 1.4), glassM, x, 2.8, z, D, 0, false); for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(.5, .25, .12), toon(pick(["#ff8a3a", "#ffd23d", "#e8e8e8"])), x + rand(-3, 3), rand(1.5, 4.5), z, D, 0, false); tcol(x - 3.5, x + 3.5, z - .7, z + .7); }
    add(new THREE.CylinderGeometry(3, 3, 6, 24, 1, true), glassM, 58, 3, 0, D, 0, false); add(new THREE.CylinderGeometry(3.1, 3.1, .3, 24), toon("#3a3f4a"), 58, .15, 0, D); TOWER.pillars.push({ x: X(58), z: TW.z, r: 3.2 });
    {
      const c = document.createElement("canvas"); c.width = 384; c.height = 512; const g = c.getContext("2d");
      g.fillStyle = "#1f1630"; g.fillRect(0, 0, 384, 512); const gr = g.createRadialGradient(192, 200, 20, 192, 200, 220); gr.addColorStop(0, "#ff9ec4"); gr.addColorStop(1, "#3a2050"); g.fillStyle = gr; g.fillRect(20, 20, 344, 340);
      g.fillStyle = "#2a1f17"; g.beginPath(); g.arc(192, 170, 60, 0, 7); g.fill(); g.fillRect(150, 220, 84, 140); g.fillStyle = "#f0c7a0"; g.beginPath(); g.arc(192, 180, 44, 0, 7); g.fill();
      g.fillStyle = "#fff"; g.font = `64px ${FONT}`; g.textAlign = "center"; g.fillText("하늘", 192, 420); g.font = `26px ${FONT}`; g.fillText("HANEUL · 서울 콘서트", 192, 460);
      g.fillStyle = "#d9d4c8"; g.beginPath(); g.moveTo(384, 0); g.lineTo(384, 512); g.lineTo(300, 512); g.lineTo(330, 380); g.lineTo(280, 260); g.lineTo(340, 120); g.lineTo(300, 0); g.closePath(); g.fill();
      g.fillStyle = "#b8382a"; g.font = `22px "Malgun Gothic",sans-serif`; g.save(); g.translate(80, 490); g.rotate(-.12); g.fillText("미안해요", 0, 0); g.restore();
      const p = add(new THREE.PlaneGeometry(2.1, 2.8), toon("#ffffff", { map: canvasTex(c) }), 66, 2.6, -12.75, D, 0, false);
    }
    // 3 elevator hall: four lift doors, the panel, the shutter that keeps the way up closed
    for (const [x, z, ry] of [[92, -10.75, 0], [104, -10.75, 0], [92, 10.75, Math.PI], [104, 10.75, Math.PI]]) { const dd = add(new THREE.BoxGeometry(3.4, 4.6, .2), toon("#b8bec4"), x, 2.3, z, D, .03); add(new THREE.BoxGeometry(.06, 4.6, .24), toon("#5a5f66"), x, 2.3, z, D, 0, false); }
    {
      const c = document.createElement("canvas"); c.width = 256; c.height = 384; const g = c.getContext("2d"); g.fillStyle = "#2a2f36"; g.fillRect(0, 0, 256, 384); g.fillStyle = "#ffd23d"; g.font = `40px ${FONT}`; g.textAlign = "center"; g.fillText("▲ 60F", 128, 70);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { g.fillStyle = "#4a525c"; g.beginPath(); g.arc(64 + k * 64, 130 + r * 60, 22, 0, 7); g.fill(); g.fillStyle = "#cfe8ff"; g.font = `22px sans-serif`; g.fillText(String(r * 3 + k + 1), 64 + k * 64, 138 + r * 60); }
      add(new THREE.PlaneGeometry(1.1, 1.65), new THREE.MeshBasicMaterial({ map: canvasTex(c), toneMapped: false }), 99, 1.8, -10.74, D, 0, false);
    }
    const shutter = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#3a3a3a"; g.fillRect(0, 0, 256, 256); for (let i = -256; i < 512; i += 48) { g.fillStyle = "#ffd23d"; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 24, 0); g.lineTo(i + 24 + 256, 256); g.lineTo(i + 256, 256); g.fill(); } return toon("#ffffff", { map: canvasTex(c) }); })();
    const door = new THREE.Mesh(new THREE.BoxGeometry(.6, 5, 6.4), shutter); door.position.set(118, 2.5, 0); door.castShadow = true; D.add(door); outline(door, .04); TOWER.doorMesh = door;
    // 4 offices: rows of desks with monitors
    for (const x of [130, 138, 146, 154]) for (const z of [-4, 4]) { add(new THREE.BoxGeometry(3, .8, 1.6), toon("#8a6a4a"), x, .4, z, D, .03); add(new THREE.BoxGeometry(.9, .6, .08), toon("#1f2a3a"), x, 1.1, z - .3, D, 0, false); tcol(x - 1.5, x + 1.5, z - .8, z + .8); }
    add(new THREE.PlaneGeometry(7, 1.2), label("사무실 · 41층", "#2f4b6e", 7, 1.2), 142, 5.2, -13.75, D, 0, false);
    // 5 observation deck: windows all round, telescopes
    for (const [x, z] of [[180, -10], [196, -10], [180, 10], [196, 10]]) { add(new THREE.CylinderGeometry(.12, .16, 1.3, 8), toon("#3a3a3a"), x, .65, z, D); const t = add(new THREE.CylinderGeometry(.18, .14, .9, 8), toon("#2f6db3"), x, 1.5, z, D, .02); t.rotation.z = Math.PI / 2.4; TOWER.pillars.push({ x: X(x), z: TW.z + z, r: .5 }); }
    add(new THREE.PlaneGeometry(7, 1.2), label("60F · 전망대", "#00a84d", 7, 1.2), 188, 6.2, -11.75, D, 0, false);
    // 6 roof: helipad, the alien ship hovering above
    { const pad = add(new THREE.CircleGeometry(12, 40), toon("#4a4d52"), 242, .03, 0, D, 0, false); pad.rotation.x = -Math.PI / 2;
      const ring = add(new THREE.RingGeometry(10.6, 11.4, 40), toon("#ffd23d"), 242, .05, 0, D, 0, false); ring.rotation.x = -Math.PI / 2;
      const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#ffd23d"; g.font = `200px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("H", 128, 140);
      const H = add(new THREE.PlaneGeometry(8, 8), toon("#ffffff", { map: canvasTex(c), transparent: true }), 242, .06, 0, D, 0, false); H.rotation.x = -Math.PI / 2;
      const ship = add(new THREE.SphereGeometry(16, 28, 10), toon("#3a2f52", { emissive: new THREE.Color("#7a4ad8"), emissiveIntensity: .6 }), 242, 24, 0, D, .1); ship.scale.y = .22;
      const r2 = add(new THREE.TorusGeometry(12, .3, 8, 48), new THREE.MeshBasicMaterial({ color: "#c8a8ff", toneMapped: false }), 242, 23, 0, D, 0, false); r2.rotation.x = Math.PI / 2; }
    // the doors between the street and the lobby, and the roof exit
    add(new THREE.BoxGeometry(.3, 4, 4), toon("#14161a"), .4, 2, 0, D, 0, false);
    add(new THREE.BoxGeometry(.3, 4, 4), toon("#14161a"), 261.6, 2, -8, D, 0, false);
    // lights
    for (const [x, z, c, i] of [[15, 0, "#ffe2b0", 60], [58, 0, "#5ab4e0", 60], [142, 0, "#ffe9c8", 60], [242, 0, "#b48cff", 90]]) { const L = new THREE.PointLight(c, i, 40, 2); L.position.set(X(x), 6, TW.z + z); scene.add(L); }
  }
  // ===== the third dungeon: 노량진 수산시장, flooded and frozen, six rooms =====
  const market = new THREE.Group(); market.position.set(MK.x, 0, MK.z); scene.add(market);
  colliders.market = [];
  {
    const D = market, X = x => MK.x + x, RECTS = MARKET.rects;
    const tex = (bg, fn, rep = [1, 1]) => { const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d"); g.fillStyle = bg; g.fillRect(0, 0, 256, 256); fn(g); const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); return toon("#ffffff", { map: t }); };
    const wetTile = tex("#6f7a7e", g => { g.strokeStyle = "#5d676b"; for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } for (let i = 0; i < 20; i++) { g.fillStyle = "rgba(120,170,200,.25)"; g.beginPath(); g.ellipse(R() * 256, R() * 256, rand(8, 30), rand(4, 14), 0, 0, 7); g.fill(); } }, [6, 6]);
    const tileWall = tex("#c8d2d0", g => { g.strokeStyle = "#aab6b4"; for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); } g.fillStyle = "#2f5aa8"; g.fillRect(0, 150, 256, 10); }, [3, 1]);
    const tankWall = tex("#1d4a66", g => { for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(160,220,255,${R() * .3})`; g.beginPath(); g.arc(R() * 256, R() * 256, rand(2, 7), 0, 7); g.fill(); } }, [3, 1]);
    const frostWall = tex("#dfeaf0", g => { for (let i = 0; i < 60; i++) { g.strokeStyle = "rgba(160,190,210,.5)"; g.beginPath(); const x = R() * 256, y = R() * 256; g.moveTo(x, y); g.lineTo(x + rand(-20, 20), y + rand(10, 30)); g.stroke(); } }, [3, 1]);
    const boardWall = tex("#8a8478", g => { g.fillStyle = "#7a7468"; g.fillRect(0, 200, 256, 56); }, [3, 1]);
    const iceFloor = toon("#cfeaf5", { emissive: new THREE.Color("#7ac8e8"), emissiveIntensity: .25 });
    const WALL = { auction: tileWall, tanks: tankWall, freezer: frostWall, boards: boardWall, ice: frostWall, boss: tankWall };
    const FLOOR = { auction: wetTile, tanks: wetTile, freezer: toon("#b8c8d0"), boards: wetTile, ice: iceFloor, boss: toon("#1f3f55") };
    const covered = (axis, fixed, a0, a1, self) => { const out = []; for (const o of RECTS) if (o !== self) { if (axis === "x" && fixed > o.z0 - .01 && fixed < o.z1 + .01) out.push([Math.max(a0, o.x0), Math.min(a1, o.x1)]); if (axis === "z" && fixed > o.x0 - .01 && fixed < o.x1 + .01) out.push([Math.max(a0, o.z0), Math.min(a1, o.z1)]); } return out.filter(([a, b]) => b > a); };
    const minus = (a0, a1, cuts) => { let segs = [[a0, a1]]; for (const [c0, c1] of cuts) segs = segs.flatMap(([s0, s1]) => c1 <= s0 || c0 >= s1 ? [[s0, s1]] : [[s0, c0], [c1, s1]].filter(([u, v]) => v - u > .05)); return segs; };
    for (const r of RECTS) {
      const w = r.x1 - r.x0, d = r.z1 - r.z0, h = r.room ? 7 : 5, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
      const f = add(new THREE.PlaneGeometry(w, d), r.room ? FLOOR[r.kind] : wetTile, cx, .01, cz, D, 0, false); f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
      const c = add(new THREE.PlaneGeometry(w, d), toon("#2e3438"), cx, h, cz, D, 0, false); c.rotation.x = Math.PI / 2;
      const wm = r.room ? WALL[r.kind] : tileWall;
      for (const [z, sgn] of [[r.z0, -1], [r.z1, 1]]) for (const [a, b] of minus(r.x0, r.x1, covered("x", z + sgn * .02, r.x0, r.x1, r))) add(new THREE.BoxGeometry(b - a, h, .4), wm, (a + b) / 2, h / 2, z + sgn * .2, D, 0);
      for (const [x, sgn] of [[r.x0, -1], [r.x1, 1]]) for (const [a, b] of minus(r.z0, r.z1, covered("z", x + sgn * .02, r.z0, r.z1, r))) add(new THREE.BoxGeometry(.4, h, b - a), wm, x + sgn * .2, h / 2, (a + b) / 2, D, 0);
    }
    const mcol = (x0, x1, z0, z1) => colliders.market.push({ x0: X(x0), x1: X(x1), z0: MK.z + z0, z1: MK.z + z1 });
    const label = (text, color, w, h) => { const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * h / w); const x = c.getContext("2d"); x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#fff"; x.font = `${Math.round(c.height * .6)}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 256, c.height * .54); return toon("#ffffff", { map: canvasTex(c) }); };
    // 1 auction hall: styrofoam boxes, pallets, the auctioneer's stand
    for (let i = 0; i < 10; i++) { const x = rand(4, 26), z = pick([-10, 10]) + rand(-1, 1); add(new THREE.BoxGeometry(1.2, .7, .9), toon(pick(["#f2f2ee", "#e0e6ea"])), x, .35, z, D, .03); }
    add(new THREE.BoxGeometry(3, 1.6, 1.6), toon("#8a5a32"), 26, .8, 0, D, .04); mcol(24.5, 27.5, -.8, .8);
    add(new THREE.PlaneGeometry(7, 1.2), label("경매장 · 새벽 3시", "#2f5aa8", 7, 1.2), 15, 5, -11.75, D, 0, false);
    // 2 tank corridor: tanks along both walls, fish inside
    const glassM = new THREE.MeshBasicMaterial({ color: "#5ab4e0", transparent: true, opacity: .35, depthWrite: false, toneMapped: false });
    for (const z of [-10, 10]) for (let x = 46; x < 72; x += 6.5) { add(new THREE.BoxGeometry(5.6, 3.2, 1.4), glassM, x, 2.2, z, D, 0, false); for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(.6, .3, .14), toon(pick(["#ff8a3a", "#c8c8c8", "#6a8aa8"])), x + rand(-2, 2), rand(1, 3.4), z, D, 0, false); mcol(x - 2.8, x + 2.8, z - .7, z + .7); }
    // 3 freezer: hanging frozen fish, the heaters (stand near them or freeze)
    for (let i = 0; i < 16; i++) { const f = add(new THREE.ConeGeometry(.3, 1.4, 6), toon("#9fb8c8"), rand(88, 114), 5.5, rand(-11, 11), D, .02); f.rotation.x = Math.PI; }
    const heatM = new THREE.MeshBasicMaterial({ color: "#ff8a3a", toneMapped: false });
    for (const h of MARKET.heaters) { const lx = h.x - MK.x, lz = h.z - MK.z; add(new THREE.BoxGeometry(1.2, 1.4, 1.2), toon("#3a3a3a"), lx, .7, lz, D, .04); add(new THREE.BoxGeometry(1, .5, .05), heatM, lx, .9, lz - .62, D, 0, false); add(new THREE.BoxGeometry(1, .5, .05), heatM, lx, .9, lz + .62, D, 0, false); MARKET.pillars.push({ x: h.x, z: h.z, r: .9 }); }
    add(new THREE.PlaneGeometry(7, 1.2), label("냉동 창고 · −20°C", "#2f6db3", 7, 1.2), 101, 5, -12.75, D, 0, false);
    // 4 the particle room: three chalkboards (tinted when solved / failed)
    MARKET.boardMeshes = MARKET.boards.map((b, i) => {
      const c = document.createElement("canvas"); c.width = 512; c.height = 320; const g = c.getContext("2d");
      g.fillStyle = "#2d4a3a"; g.fillRect(0, 0, 512, 320); g.strokeStyle = "#8a5a32"; g.lineWidth = 18; g.strokeRect(9, 9, 494, 302);
      g.fillStyle = "#f2f2ee"; g.font = `64px ${FONT}`; g.textAlign = "center"; g.fillText(["은/는?", "이/가?", "을/를?"][i], 256, 140); g.font = `34px ${FONT}`; g.fillText(`칠판 ${i + 1} · 조사`, 256, 230);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), toon("#ffffff", { map: canvasTex(c) })); m.position.set(b.x - MK.x, 3, b.z - MK.z + (b.rot ? -.1 : .1)); m.rotation.y = b.rot; D.add(m); return m;
    });
    // 5 ice room: icicles; the floor is the ice (you slide)
    for (let i = 0; i < 20; i++) { const ic = add(new THREE.ConeGeometry(rand(.15, .3), rand(.8, 1.8), 6), toon("#cfeaf5", { emissive: new THREE.Color("#7ac8e8"), emissiveIntensity: .3 }), rand(170, 198), 6.3, rand(-11, 11), D, 0, false); ic.rotation.x = Math.PI; }
    add(new THREE.PlaneGeometry(7, 1.2), label("얼음 방 · 미끄러워요", "#2f6db3", 7, 1.2), 184, 5, -11.75, D, 0, false);
    // 6 the great tank: the boss arena, a ring of pipes
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; add(new THREE.CylinderGeometry(.4, .4, 7, 10), toon("#5a5f66"), 234 + Math.cos(a) * 20, 3.5, Math.sin(a) * 17, D, .04); }
    add(new THREE.BoxGeometry(.3, 4, 4), toon("#14161a"), .4, 2, 0, D, 0, false); add(new THREE.BoxGeometry(4, 4, .3), toon("#14161a"), 253, 2, -19.6, D, 0, false);
    for (const [x, z, c, i] of [[15, 0, "#ffe2b0", 50], [58, 0, "#5ab4e0", 60], [101, 0, "#bfe6ff", 50], [142, 0, "#ffe2b0", 50], [184, 0, "#9fdcff", 50], [234, 0, "#d06070", 90]]) { const L = new THREE.PointLight(c, i, 40, 2); L.position.set(X(x), 5.5, MK.z + z); scene.add(L); }
  }
  // ===== the fifth dungeon: 국립중앙박물관 at night, six rooms =====
  const museum = new THREE.Group(); museum.position.set(MU.x, 0, MU.z); scene.add(museum);
  colliders.museum = [];
  {
    const D = museum, X = x => MU.x + x, RECTS = MUSEUM.rects;
    const tex = (bg, fn, rep = [1, 1]) => { const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d"); g.fillStyle = bg; g.fillRect(0, 0, 256, 256); fn(g); const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); return toon("#ffffff", { map: t }); };
    const marble = tex("#cfc8bc", g => { for (let i = 0; i <= 256; i += 64) { g.strokeStyle = "#b8b0a2"; g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } for (let i = 0; i < 14; i++) { g.strokeStyle = "rgba(150,140,128,.35)"; g.beginPath(); g.moveTo(R() * 256, R() * 256); g.lineTo(R() * 256, R() * 256); g.stroke(); } }, [6, 6]);
    const hallWall = tex("#e6dfd2", g => { g.fillStyle = "#8a6a4a"; g.fillRect(0, 196, 256, 18); g.fillStyle = "#c9bfae"; g.fillRect(0, 230, 256, 26); }, [3, 1]);
    const caveWall = tex("#8a6a4e", g => {
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,40,26,${R() * .4})`; g.beginPath(); g.ellipse(R() * 256, R() * 256, rand(10, 40), rand(6, 20), R() * 3, 0, 7); g.fill(); }
      g.strokeStyle = "#3a1e10"; g.fillStyle = "#3a1e10"; g.lineWidth = 4;
      for (let k = 0; k < 3; k++) { const x = 40 + k * 80, y = 120; g.beginPath(); g.arc(x, y - 30, 7, 0, 7); g.fill(); g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x, y + 10); g.lineTo(x - 12, y + 34); g.moveTo(x, y + 10); g.lineTo(x + 12, y + 34); g.moveTo(x - 14, y - 10); g.lineTo(x + 30, y - 22); g.stroke(); }
      g.fillStyle = "#6a2a14"; g.beginPath(); g.ellipse(200, 190, 34, 16, 0, 0, 7); g.fill(); g.fillRect(176, 200, 6, 22); g.fillRect(218, 200, 6, 22);
    }, [3, 1]);
    const jadeWall = tex("#3d5a52", g => { g.fillStyle = "#4a6a60"; g.fillRect(0, 210, 256, 46); }, [3, 1]);
    const paperWall = tex("#efe6d0", g => { g.fillStyle = "#c8402f"; g.fillRect(0, 0, 256, 10); g.fillStyle = "rgba(60,40,20,.5)"; g.font = "28px serif"; for (let i = 0; i < 6; i++) g.fillText("ㄱㄴㄷㄹㅁㅂ".slice(i, i + 1), 20 + i * 40, 120); }, [3, 1]);
    const goldWall = tex("#4a2a2a", g => { g.fillStyle = "#c9a43a"; g.fillRect(0, 200, 256, 10); g.fillRect(0, 30, 256, 6); }, [3, 1]);
    const WALL = { hall: hallWall, cave: caveWall, celadon: jadeWall, scrolls: paperWall, treasure: goldWall, boss: goldWall };
    const FLOOR = { hall: marble, cave: toon("#6a5440"), celadon: marble, scrolls: toon("#b89a6a"), treasure: toon("#5a3a2a"), boss: toon("#3a2a22") };
    const covered = (axis, fixed, a0, a1, self) => { const out = []; for (const o of RECTS) if (o !== self) { if (axis === "x" && fixed > o.z0 - .01 && fixed < o.z1 + .01) out.push([Math.max(a0, o.x0), Math.min(a1, o.x1)]); if (axis === "z" && fixed > o.x0 - .01 && fixed < o.x1 + .01) out.push([Math.max(a0, o.z0), Math.min(a1, o.z1)]); } return out.filter(([a, b]) => b > a); };
    const minus = (a0, a1, cuts) => { let segs = [[a0, a1]]; for (const [c0, c1] of cuts) segs = segs.flatMap(([s0, s1]) => c1 <= s0 || c0 >= s1 ? [[s0, s1]] : [[s0, c0], [c1, s1]].filter(([u, v]) => v - u > .05)); return segs; };
    for (const r of RECTS) {
      const w = r.x1 - r.x0, d = r.z1 - r.z0, h = r.room ? 8 : 5, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
      const f = add(new THREE.PlaneGeometry(w, d), r.room ? FLOOR[r.kind] : marble, cx, .01, cz, D, 0, false); f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
      const c = add(new THREE.PlaneGeometry(w, d), toon("#2a2622"), cx, h, cz, D, 0, false); c.rotation.x = Math.PI / 2;
      const wm = r.room ? WALL[r.kind] : hallWall;
      for (const [z, sgn] of [[r.z0, -1], [r.z1, 1]]) for (const [a, b] of minus(r.x0, r.x1, covered("x", z + sgn * .02, r.x0, r.x1, r))) add(new THREE.BoxGeometry(b - a, h, .4), wm, (a + b) / 2, h / 2, z + sgn * .2, D, 0);
      for (const [x, sgn] of [[r.x0, -1], [r.x1, 1]]) for (const [a, b] of minus(r.z0, r.z1, covered("z", x + sgn * .02, r.z0, r.z1, r))) add(new THREE.BoxGeometry(.4, h, b - a), wm, x + sgn * .2, h / 2, (a + b) / 2, D, 0);
    }
    const ucol = (x0, x1, z0, z1) => colliders.museum.push({ x0: X(x0), x1: X(x1), z0: MU.z + z0, z1: MU.z + z1 });
    const label = (text, color, w, h) => { const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * h / w); const x = c.getContext("2d"); x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#fff"; x.font = `${Math.round(c.height * .6)}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 256, c.height * .54); return toon("#ffffff", { map: canvasTex(c) }); };
    const glassM = new THREE.MeshBasicMaterial({ color: "#bfe6ff", transparent: true, opacity: .25, depthWrite: false, toneMapped: false });
    const vitrine = (x, z, fill) => { add(new THREE.BoxGeometry(1.6, 1, 1.6), toon("#3a2e26"), x, .5, z, D, .03); add(new THREE.BoxGeometry(1.5, 1.4, 1.5), glassM, x, 1.7, z, D, 0, false); fill(x, z); ucol(x - .8, x + .8, z - .8, z + .8); };
    // 1 역사의 길: the long hall, empty plinths (the statues walked off them), banners
    for (let x = 6; x < 38; x += 8) for (const z of [-6.6, 6.6]) { add(new THREE.BoxGeometry(1.6, .8, 1.6), toon("#bdb5a6"), x, .4, z, D, .03); ucol(x - .8, x + .8, z - .8, z + .8); }
    for (let x = 10; x < 38; x += 12) add(new THREE.PlaneGeometry(1.4, 4), toon("#7a2a2a"), x, 5, -7.75, D, 0, false);
    add(new THREE.PlaneGeometry(7, 1.2), label("역사의 길", "#5a4a3a", 7, 1.2), 20, 6.6, -7.75, D, 0, false);
    // 2 선사관: cave walls with painted hunters (they throw spears across the room), a fire pit
    add(new THREE.CylinderGeometry(1.2, 1.4, .5, 10), toon("#4a3a2a"), 67, .25, 0, D, .03); add(new THREE.ConeGeometry(.8, 1.4, 6), new THREE.MeshBasicMaterial({ color: "#ff8a3a", toneMapped: false }), 67, 1, 0, D, 0, false); ucol(65.6, 68.4, -1.4, 1.4);
    add(new THREE.PlaneGeometry(7, 1.2), label("선사관 · 창을 피하세요", "#6a3a1e", 7, 1.2), 67, 6.6, -11.75, D, 0, false);
    // 3 고려 청자실: glass cases with celadon vases (some of them are monsters)
    const jade = toon("#8fc4b0"), jadeD = toon("#5f9a86");
    for (const [x, z] of [[96, -9], [104, -9], [112, -9], [120, -9], [96, 9], [104, 9], [112, 9], [120, 9]]) vitrine(x, z, (vx, vz) => { const v = add(new THREE.SphereGeometry(.4, 12, 10), jade, vx, 1.6, vz, D, .02); v.scale.set(1, 1.3, 1); add(new THREE.CylinderGeometry(.14, .2, .3, 10), jadeD, vx, 2.15, vz, D, .01); });
    add(new THREE.PlaneGeometry(7, 1.2), label("고려 청자실", "#2f5a4e", 7, 1.2), 107, 6.6, -11.75, D, 0, false);
    // 4 훈민정음실: three scroll stands (the verb-ending quiz), the big ㄱ ㄴ ㄷ wall
    MUSEUM.scrollMeshes = MUSEUM.scrolls.map((b, i) => {
      const c = document.createElement("canvas"); c.width = 512; c.height = 320; const g = c.getContext("2d");
      g.fillStyle = "#f2e8cc"; g.fillRect(0, 0, 512, 320); g.fillStyle = "#7a2a2a"; g.fillRect(0, 0, 512, 22); g.fillRect(0, 298, 512, 22);
      g.fillStyle = "#2a1e14"; g.font = `60px ${FONT}`; g.textAlign = "center"; g.fillText(["-아요/-어요", "-았/었어요", "-(으)ㄹ 거예요"][i], 256, 150); g.font = `34px ${FONT}`; g.fillText(`두루마리 ${i + 1} · 동사`, 256, 240);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), toon("#ffffff", { map: canvasTex(c) })); m.position.set(b.x - MU.x, 3, b.z - MU.z + (b.rot ? -.1 : .1)); m.rotation.y = b.rot; D.add(m); return m;
    });
    add(new THREE.PlaneGeometry(7, 1.2), label("훈민정음실", "#7a2a2a", 7, 1.2), 146, 6.6, -10.75, D, 0, false);
    // 5 왕의 보물실: gold crowns in cases, the looters' crates
    const gold = toon("#e0b43a", { emissive: new THREE.Color("#5a4010"), emissiveIntensity: .3 });
    for (const [x, z] of [[176, -9], [186, -9], [196, -9], [176, 9], [196, 9]]) vitrine(x, z, (vx, vz) => { add(new THREE.CylinderGeometry(.42, .38, .4, 12, 1, true), gold, vx, 1.4, vz, D, .02); for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(.06, .5, .06), gold, vx + (k - 1) * .3, 1.8, vz - .3, D, 0); });
    for (let i = 0; i < 5; i++) { const x = rand(178, 198), z = rand(-3, 3); add(new THREE.BoxGeometry(1, .8, .8), toon("#7a5a3a"), x, .4, z + (z > 0 ? 3 : -3), D, .03); }
    add(new THREE.PlaneGeometry(7, 1.2), label("왕의 보물실", "#6a4a14", 7, 1.2), 186, 6.6, -11.75, D, 0, false);
    // 6 장군의 방: weapon racks, war banners, a 화차 (the 신기전 launcher) behind the general's dais
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; add(new THREE.CylinderGeometry(.45, .45, 8, 10), toon("#6a2a22"), 234 + Math.cos(a) * 19, 4, Math.sin(a) * 16, D, .04); }
    for (const z of [-19.75, 19.75]) for (let x = 218; x < 254; x += 9) { const b = add(new THREE.PlaneGeometry(1.6, 4.4), toon(pick(["#c8402f", "#2f5aa8", "#e0b43a"])), x, 4.6, z, D, 0, false); if (z > 0) b.rotation.y = Math.PI; }
    { add(new THREE.BoxGeometry(3, .5, 8), toon("#8a6a4a"), 252, 1.2, 0, D, .04); for (const z of [-3, 3]) { const w = add(new THREE.CylinderGeometry(.9, .9, .3, 12), toon("#5a3a2a"), 252, .9, z, D, .03); w.rotation.x = Math.PI / 2; }
      const rack = add(new THREE.BoxGeometry(2.4, 2.4, 6), toon("#6a4a2a"), 252, 2.8, 0, D, .04); rack.rotation.z = .5;
      for (let i = 0; i < 18; i++) { const r = add(new THREE.CylinderGeometry(.05, .05, 2.6, 5), toon("#c8402f"), 251.2, 3.6, -2.6 + i * .3, D, 0); r.rotation.z = .5 + Math.PI / 2; } ucol(250.4, 253.6, -4, 4); }
    add(new THREE.BoxGeometry(.3, 4, 4), toon("#14161a"), .4, 2, 0, D, 0, false); add(new THREE.BoxGeometry(4, 4, .3), toon("#14161a"), 253, 2, -19.6, D, 0, false);
    for (const [x, z, c, i] of [[20, 0, "#ffe2b0", 50], [67, 0, "#ff9a4a", 70], [107, 0, "#9fe0c8", 55], [146, 0, "#ffe2b0", 50], [186, 0, "#ffd27a", 60], [234, 0, "#ff7a5a", 90]]) { const L = new THREE.PointLight(c, i, 40, 2); L.position.set(X(x), 6, MU.z + z); scene.add(L); }
  }
  // ===== 연남동 (Lv 1–3) + 신촌 (Lv 4–5): Danny 2026-10-18 "areas next to the old ones with the same level of monsters, so there is more
  // to do without the levels rushing". A band north of 홍대 and 서교 아파트 (z −250..−110). 양화로 runs on north into 연남동; 신촌 is
  // through a gap in the complex's north wall. Built last so the seeded layout of everything before it stays exactly the same.
  {
    const N0 = -250;
    const board = (text, bg, w = 8, h = 1.4, fs = 54, fg = "#fff") => { const c = document.createElement("canvas"); c.width = 512; c.height = Math.max(32, Math.round(512 * h / w)); const x = c.getContext("2d"); x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); x.fillStyle = fg; x.font = `${fs}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 256, c.height / 2 + 3); return toon("#ffffff", { map: canvasTex(c) }); };
    // open the two ways in: take away the rubble on the 양화로 and in the middle of the complex's north wall
    const zero = new THREE.Matrix4().makeScale(0, 0, 0), v = new THREE.Vector3();
    const clearRubble = (x0, x1, z0, z1) => {
      for (const o of [...street.children]) if (o.isMesh && o.geometry.type === "DodecahedronGeometry" && o.position.x > x0 && o.position.x < x1 && o.position.z > z0 && o.position.z < z1) street.remove(o);
      leafM.forEach((m, i) => { v.setFromMatrixPosition(m); if (v.x > x0 && v.x < x1 && v.z > z0 && v.z < z1 && v.y < 4) leafM[i] = zero; });
    };
    const dropCol = (x0, x1, z0) => { const i = colliders.street.findIndex(c => c.x0 !== undefined && Math.abs(c.x0 - x0) < .01 && Math.abs(c.x1 - x1) < .01 && Math.abs(c.z0 - z0) < .01); if (i >= 0) colliders.street.splice(i, 1); };
    clearRubble(-88, -45, -112, -106); dropCol(-86.4, -46.6, -110.4);
    clearRubble(199, 223, -112, -106); dropCol(108.6, 311.4, -110.4);
    colliders.street.push({ x0: 108.6, x1: 199, z0: -110.4, z1: -107.6 }, { x0: 223, x1: 311.4, z0: -110.4, z1: -107.6 });
    for (const x of [198.4, 223.6]) add(new THREE.BoxGeometry(1.2, 4, 1.2), toon("#c9c2b4"), x, 2, -109, street, .06);
    add(new THREE.PlaneGeometry(10, 1.3), board("↑ 신촌", "#2f5aa8", 10, 1.3, 60), 211, 4.6, -108.4, street, 0, false);
    // edges: rubble on the west, north and east, a wall between the two areas with a gap at z −200
    barricade(-86, -110, -86, N0); barricade(-86, N0, 310, N0); barricade(310, -110, 310, N0);
    barricade(108, -136, 108, -192); barricade(108, -208, 108, N0);
    // ground
    flat(394, 140, 112, -180, ROAD, .012);
    flat(30, 140, -70, -180, "#6f7078", .02); flat(.4, 140, -70.4, -180, "#e3c24a", .03); flat(.4, 140, -69.6, -180, "#e3c24a", .03);
    for (const x of [-78, -62]) for (let z = -246; z < -112; z += 8) flat(.3, 3.6, x, z, "#e9e7df", .03);
    flat(7, 140, -51.5, -180, WALK, .05);
    for (let z = -118; z > N0 + 4; z -= 13) if (Math.abs(z + 150) > 6 && Math.abs(z + 225) > 6 && Math.abs(z + 190) > 6) tree(-70, z, rand(5, 7));
    for (let k = 0; k < 40; k++) { const px = rand(-82, 305), pz = rand(-246, -114); const p = flat(rand(1.5, 4), rand(1.5, 4), px, pz, LEAF[3], .055); p.rotation.z = R() * 3; for (let j = 0; j < 20; j++) tuft(px + rand(-1.6, 1.6), pz + rand(-1.6, 1.6), rand(.6, 1.2)); }
    const keepOut = [...NORTH_SPAWNS, { x: -25, z: -171 }, { x: 35, z: -178 }, { x: 88, z: -171 }, { x: -42, z: -165 }, { x: -44, z: -173 }, { x: 40, z: -157.5 }, { x: 245, z: -172 }, { x: 300, z: -150 }, { x: 238, z: -200 }, { x: 290, z: -244 }];
    const free = (x, z, r = 5) => !keepOut.some(s => Math.hypot(s.x - x, s.z - z) < r);
    const row = (xs, z, w, d, face) => { for (const x of xs) { shop(x, z, w, d, face); solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2); } };
    const xsFrom = (a, b, step, gaps) => { const o = []; for (let x = a; x <= b; x += step) if (!gaps.some(([g0, g1]) => x > g0 && x < g1)) o.push(x); return o; };
    // --- 연남동 ---
    // 연트럴파크: the 경의선숲길 goes on here (grass, a winding path, the old tracks, lots of trees)
    const PK = { x0: -48, x1: 108, z0: -186, z1: -160 };
    flat(PK.x1 - PK.x0, PK.z1 - PK.z0, (PK.x0 + PK.x1) / 2, (PK.z0 + PK.z1) / 2, "#5e9a3e", .06);
    for (let x = PK.x0; x < PK.x1; x += 4) flat(4.2, 3, x + 2, -174 + Math.sin(x * .07) * 5, "#d7c9a6", .07);
    for (let x = PK.x0 + 2; x < PK.x1; x += 1.2) add(new THREE.BoxGeometry(.25, .12, 2.4), toon("#6b4a32"), x, .1, -163.5, street, 0, false);
    for (const z of [-164.2, -162.8]) add(new THREE.BoxGeometry(PK.x1 - PK.x0, .14, .12), toon("#7d7a70"), (PK.x0 + PK.x1) / 2, .2, z, street, 0, false);
    for (let x = PK.x0 + 6; x < PK.x1 - 3; x += rand(6, 9)) { if (free(x, -183, 6)) tree(x, rand(-184, -181)); if (R() < .6 && free(x, -167, 6)) tree(x + rand(-2, 2), rand(-168, -166)); }
    for (let i = 0; i < 1300; i++) tuft(rand(PK.x0, PK.x1), rand(PK.z0, PK.z1), rand(.7, 1.4));
    for (let i = 0; i < 5; i++) { const bx = rand(-30, 100); if (free(bx, -176)) add(new THREE.BoxGeometry(3, .45, .7), toon("#6b4a32"), bx, .25, -177.5 + Math.sin(bx * .07) * 5 + 2.6, street, .03); }
    { add(new THREE.BoxGeometry(.2, 2.6, .2), toon("#555"), -44, 1.3, -173, street); const p = add(new THREE.PlaneGeometry(4.4, 1.1), board("연트럴파크", "#3a8f4c", 4.4, 1.1, 64), -44, 2.9, -172.9, street, 0, false); p.rotation.y = Math.PI / 2; }
    // the park's info stand: the 연남동 map lies on it
    { add(new THREE.BoxGeometry(1.6, 1.2, .9), toon("#3a8f4c"), -42, .6, -164.65, street, .04); add(new THREE.PlaneGeometry(1.4, .5), board("안내 · info", "#1f2a3a", 1.4, .5, 60), -42, .8, -164.19, street, 0, false); colliders.street.push({ x0: -42.9, x1: -41.1, z0: -165.2, z1: -164.1 }); }
    // cafés facing the park (south side), houses north of it on both sides of 연남로; gaps are alleys
    row(xsFrom(-38, 100, 12, [[10, 28], [58, 74]]), -150, 10, 9, "-z");
    row(xsFrom(-38, 100, 12, [[10, 28], [58, 74]]), -197, 10, 9, "+z");
    row(xsFrom(-38, 100, 12, [[-6, 6], [40, 52], [84, 96]]), -232, 10, 9, "+z");
    // the flower shop: a stall of pots in the lane between the cafés and the park
    { add(new THREE.BoxGeometry(5, .9, 1.4), toon("#8a5a32"), 40, .45, -155.6, street, .04); add(new THREE.PlaneGeometry(4, .9), board("꽃집", "#d2601e", 4, .9, 70), 40, 1.9, -154.9, street, 0, false).rotation.y = Math.PI;
      for (let i = 0; i < 6; i++) { const px = 38 + i * .8; add(new THREE.CylinderGeometry(.22, .16, .35, 8), toon("#b8644a"), px, 1.08, -155.6, street); add(new THREE.SphereGeometry(.26, 8, 6), toon(pick(["#ff6fa0", "#ffd23d", "#ff9a3a", "#c88aff"])), px, 1.4, -155.6, street); }
      colliders.street.push({ x0: 37.4, x1: 42.6, z0: -156.4, z1: -154.8 }); }
    // the three flower beds that need water (side quest)
    for (const [fx, fz] of [[-25, -171], [35, -178], [88, -171]]) { flat(3.4, 2.2, fx, fz - 1.8, "#6a4a32", .075); for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(.2, 6, 5), toon(pick(["#ff6fa0", "#ffd23d", "#ffffff"])), fx + rand(-1.4, 1.4), .3, fz - 1.8 + rand(-.8, .8), street); }
    // --- 신촌 ---
    // 연세로: the bus street north from the complex, sidewalks on both sides
    flat(22, 140, 211, -180, "#6f7078", .02); for (const x of [200.6, 221.4]) flat(1.2, 140, x, -180, "#c85a3c", .03);
    for (let z = -246; z < -112; z += 8) flat(.3, 3.6, 211, z, "#e9e7df", .03);
    for (const x of [198, 224]) flat(4, 140, x, -180, WALK, .05);
    // shop rows: 연세로 west side (facing the street), back to back with the rows of the 먹자골목, and the row by the wall
    const scZ = xsFrom(-245, -120, 11, [[-172, -158], [-212, -195]]);
    for (const z of scZ) { shop(186, z, 10, 9, "+x"); shop(168, z, 10, 9, "-x"); solid(163, 191, z - 4.5, z + 4.5); }
    for (const z of xsFrom(-245, -140, 11, [[-210, -190]])) { shop(124, z, 10, 9, "+x"); solid(119, 129, z - 4.5, z + 4.5); }
    flat(32, 120, 146, -185, "#b8a890", .045);   // the 먹자골목's paving
    // the campus: a stone wall along 연세로 with the gate, lawn, halls, a clock tower and the library
    flat(78, 136, 269, -180, "#5e9a3e", .04);
    for (const [z0, z1] of [[-112, -170], [-185, -250]]) { add(new THREE.BoxGeometry(1, 1.6, z0 - z1), toon("#b8a88a"), 228, .8, (z0 + z1) / 2, street, .05); colliders.street.push({ x0: 227.5, x1: 228.5, z0: z1, z1: z0 }); }
    for (const z of [-170.5, -184.5]) add(new THREE.BoxGeometry(1.8, 6, 1.8), toon("#a89878"), 228, 3, z, street, .06);
    { add(new THREE.BoxGeometry(1.4, 1.2, 16), toon("#7a2a2a"), 228, 6.4, -177.5, street, .05); for (const s of [-1, 1]) { const p = add(new THREE.PlaneGeometry(13, 1), board("신촌대학교 · 정문", "#7a2a2a", 13, 1, 58), 228 + s * .72, 6.4, -177.5, street, 0, false); p.rotation.y = s * Math.PI / 2; } }
    for (let x = 230; x < 306; x += 4) flat(4.2, 3.4, x + 2, -177.5, "#d7c9a6", .06);
    for (let z = -244; z < -142; z += 4) flat(3.4, 4.2, 262, z + 2, "#d7c9a6", .06);
    const stone = "#cbbca2", roofC = "#5a4a44";
    const hall = (x, z, w, d, h, name, s) => {   /* s = +1: the front looks to +z, −1: to −z */
      add(new THREE.BoxGeometry(w, h, d), toon(stone), x, h / 2, z, street, .12); solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
      const rg = new THREE.CylinderGeometry(.01, d * .76, 4, 4, 1); rg.rotateY(Math.PI / 4); const r = add(rg, toon(roofC), x, h + 2, z, street, .1); r.scale.set(w / d, 1, 1);
      for (let k = 0; k < Math.floor(w / 4); k++) for (let f = 0; f < Math.floor(h / 4); f++) add(new THREE.PlaneGeometry(1.3, 2.2), toon("#6a8aa0"), x - w / 2 + 2 + k * 4, 2 + f * 4, z + s * (d / 2 + .03), street, 0, false).rotation.y = s > 0 ? 0 : Math.PI;
      if (name) add(new THREE.PlaneGeometry(Math.min(w * .6, 10), .9), board(name, "#3a2a22", Math.min(w * .6, 10), .9, 56), x, h - 1.2, z + s * (d / 2 + .05), street, 0, false).rotation.y = s > 0 ? 0 : Math.PI;
    };
    hall(272, -132, 32, 12, 13, "본관", -1);
    hall(246, -228, 24, 12, 10, "도서관", 1);
    { add(new THREE.BoxGeometry(7, 22, 7), toon(stone), 285, 11, -195, street, .12); solid(281.5, 288.5, -198.5, -191.5);
      const pr = add(new THREE.ConeGeometry(5.6, 6, 4), toon(roofC), 285, 25, -195, street, .1); pr.rotation.y = Math.PI / 4;
      const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#f6f0e0"; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = "#2a1f17"; g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 22); g.moveTo(64, 64); g.lineTo(94, 72); g.stroke();
      for (const [dx, dz, ry] of [[0, 3.53, 0], [-3.53, 0, -Math.PI / 2]]) { const p = add(new THREE.CircleGeometry(2, 20), toon("#ffffff", { map: canvasTex(c) }), 285 + dx, 17, -195 + dz, street, 0, false); p.rotation.y = ry; } }
    for (let i = 0; i < 30; i++) { const tx = rand(234, 304), tz = rand(-246, -116); if (free(tx, tz, 6) && Math.abs(tz + 177.5) > 4 && Math.abs(tx - 264) > 4 && !(tx > 253 && tx < 291 && tz > -141 && tz < -123) && !(tx > 230 && tx < 262 && tz > -237 && tz < -219) && Math.hypot(tx - 285, tz + 195) > 8 && Math.hypot(tx - 245, tz + 172) > 4) tree(tx, tz); }
    for (let i = 0; i < 900; i++) tuft(rand(230, 308), rand(-248, -112), rand(.7, 1.3));
    // the bus stop on 연세로 (the 신촌 map is left on its bench)
    { add(new THREE.BoxGeometry(4, .12, 1.6), toon("#2f6db3"), 224.5, 2.6, -137, street, .03); for (const z of [-138.8, -135.2]) add(new THREE.BoxGeometry(.12, 2.6, .12), toon("#555"), 225.2, 1.3, z, street);
      add(new THREE.PlaneGeometry(3.6, 2.2), toon("#bfe6ff", { transparent: true, opacity: .45 }), 225.3, 1.4, -137, street, 0, false).rotation.y = -Math.PI / 2;
      add(new THREE.BoxGeometry(1.6, 1.2, .9), toon("#2f6db3"), 224, .6, -140.65, street, .04); add(new THREE.PlaneGeometry(1.4, .5), board("버스 · bus", "#1f2a3a", 1.4, .5, 60), 224, .8, -140.19, street, 0, false);
      colliders.street.push({ x0: 223.1, x1: 224.9, z0: -141.2, z1: -140.1 }); }
    SPAWNS.push(...NORTH_SPAWNS);
  }
  // ===== more same-level neighbours (Danny 2026-10-18 "1 yes 2 yes"): 당인리 발전소 (Lv 6–7) east along the river, and in the 여의도 zone
  // 선유도공원 (Lv 9–11) west of the island, 사육신 공원 (Lv 12–15) west of 노량진, 이태원 (Lv 15–18) east of 용산. Built last (seeded layout).
  {
    const brd = (text, bg, w, h, fs = 54, fg = "#fff") => { const c = document.createElement("canvas"); c.width = 512; c.height = Math.max(32, Math.round(512 * h / w)); const x = c.getContext("2d"); x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); x.fillStyle = fg; x.font = `${fs}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 256, c.height / 2 + 3); return toon("#ffffff", { map: canvasTex(c) }); };
    // mountains standing where a new area goes are moved further out along their own direction
    const pushMountains = (group, cx, cz, boxes) => {
      for (const m of group.children) {
        const p = m.geometry?.parameters; if (!m.isMesh || m.geometry.type !== "ConeGeometry" || p.radialSegments !== 7 || p.radius < 60) continue;
        const r0 = p.radius + 15, a = Math.atan2(m.position.z - cz, m.position.x - cx); let d = Math.hypot(m.position.x - cx, m.position.z - cz), n = 0;
        const hit = () => boxes.some(b => Math.hypot(Math.max(b.x0, Math.min(b.x1, m.position.x)) - m.position.x, Math.max(b.z0, Math.min(b.z1, m.position.z)) - m.position.z) < r0);
        while (hit() && n++ < 120) { d += 10; m.position.x = cx + Math.cos(a) * d; m.position.z = cz + Math.sin(a) * d; }
      }
    };
    pushMountains(street, 110, 0, [{ x0: 305, x1: 476, z0: 100, z1: 206 }, { x0: -90, x1: 316, z0: -256, z1: -100 }]);
    pushMountains(yeouido, 0, 160, [{ x0: -408, x1: -140, z0: 140, z1: 310 }, { x0: -392, x1: -140, z0: 415, z1: 568 }, { x0: 455, x1: 905, z0: -42, z1: 124 }]);

    // ---------- 당인리 발전소 (street zone, x 310..470 along the river) ----------
    {
      add(new THREE.BoxGeometry(160, 4.6, 1.4), toon("#9a978e"), 390, 2.3, 110.3, street, .06); colliders.street.push({ x0: 310, x1: 470, z0: 109.4, z1: 111.2 });
      for (let x = 314; x < 466; x += rand(9, 16)) add(new THREE.PlaneGeometry(rand(4, 8), rand(2, 4.4)), pick(ivyMats), x, 2, 111.05, street, 0, false);
      colliders.street.push({ x0: 400, x1: 900, z0: 198.6, z1: 230 });
      barricade(470, 112, 470, 198);
      flat(160, 88, 390, 155, "#5e9a3e", .02); flat(160, 4, 390, 160, "#c85a3c", .04); flat(160, 3, 390, 176, "#d7c9a6", .04);
      for (let x = 312; x < 470; x += 6) flat(.3, 1.6, x, 160, "#f2efe6", .05);
      flat(160, 30, 390, 125, "#8a8b92", .03);   // the plant's yard
      // the main hall: brick, rows of tall windows, the name on the front
      const brick = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#9a4a34"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#7a3a28"; for (let y = 0; y < 256; y += 8) { g.fillRect(0, y, 256, 1.5); for (let x = (y / 8 % 2) * 8; x < 256; x += 16) g.fillRect(x, y, 1.5, 8); } const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3); return toon("#ffffff", { map: t }); })();
      add(new THREE.BoxGeometry(50, 20, 22), brick, 420, 10, 125, street, .15); solid(395, 445, 114, 136);
      add(new THREE.BoxGeometry(51, .8, 23), toon("#5a4a44"), 420, 20.4, 125, street, .08);
      for (let k = 0; k < 8; k++) for (let f = 0; f < 2; f++) add(new THREE.PlaneGeometry(2.6, 3.6), toon("#5a7a8a"), 399 + k * 6, 4 + f * 6, 136.04, street, 0, false);
      add(new THREE.PlaneGeometry(16, 2), brd("당인리 발전소", "#2a2522", 16, 2, 70), 420, 16.6, 136.06, street, 0, false);
      // two striped chimneys; the aliens' purple glow on top of the tall one
      for (const [cx, cz, r, h] of [[452, 121, 2.6, 52], [462, 134, 2.2, 44]]) {
        for (let k = 0; k < 8; k++) add(new THREE.CylinderGeometry(r * (1 - (k + 1) * .03), r * (1 - k * .03), h / 8, 14), toon(k % 2 ? "#f2efe6" : "#c8402f"), cx, h / 16 + k * h / 8, cz, street, .08);
        colliders.street.push({ x: cx, z: cz, r: r + .3 });
      }
      { const ring = add(new THREE.TorusGeometry(2.4, .25, 8, 24), new THREE.MeshBasicMaterial({ color: "#b48cff", toneMapped: false }), 452, 51, 121, street, 0, false); ring.rotation.x = Math.PI / 2; const L = new THREE.PointLight("#b48cff", 60, 30, 2); L.position.set(452, 50, 121); street.add(L); }
      // the transformer yard behind a fence (gate on the south side), purple alien cables running into the hall
      const fenceM = toon("#8a8f96", { transparent: true, opacity: .55 });
      const fence = (x0, z0, x1, z1) => { const f = add(new THREE.BoxGeometry(Math.hypot(x1 - x0, z1 - z0), 2.2, .12), fenceM, (x0 + x1) / 2, 1.1, (z0 + z1) / 2, street, .02); f.rotation.y = -Math.atan2(z1 - z0, x1 - x0); colliders.street.push({ x0: Math.min(x0, x1) - .2, x1: Math.max(x0, x1) + .2, z0: Math.min(z0, z1) - .2, z1: Math.max(z0, z1) + .2 }); };
      fence(325, 114, 375, 114); fence(325, 114, 325, 140); fence(375, 114, 375, 140); fence(325, 140, 345, 140); fence(355, 140, 375, 140);
      for (const tx of [333, 345, 357, 369]) for (const tz of [121, 132]) {
        add(new THREE.BoxGeometry(5, 4, 3.4), toon("#7d838a"), tx, 2, tz, street, .06);
        for (const dx of [-1.4, 0, 1.4]) add(new THREE.CylinderGeometry(.18, .26, 1.4, 8), toon("#c8b48a"), tx + dx, 4.7, tz, street, .02);
        colliders.street.push({ x0: tx - 2.7, x1: tx + 2.7, z0: tz - 1.9, z1: tz + 1.9 });
      }
      const cableM = new THREE.MeshBasicMaterial({ color: "#b48cff", toneMapped: false });
      for (const [sx, sz, ez] of [[369, 121, 118], [369, 132, 124], [357, 132, 130]]) add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(sx, 5.2, sz), new THREE.Vector3((sx + 395) / 2, 3.5, (sz + ez) / 2), new THREE.Vector3(395, 8, ez)]), 20, .12, 6), cableM, 0, 0, 0, street, 0, false);
      // the fuse boxes (side quest), the info stand with the map
      for (const [fx, fz] of [[345, 142.8], [420, 137.8], [462, 153.8]]) { add(new THREE.BoxGeometry(.8, 1.1, .4), toon("#5a5f66"), fx, 1.5, fz, street, .03); add(new THREE.BoxGeometry(.12, 1, .12), toon("#555"), fx, .5, fz, street); add(new THREE.PlaneGeometry(.5, .5), brd("⚡", "#e0a21c", .5, .5, 300, "#1d1612"), fx, 1.5, fz + .21, street, 0, false); colliders.street.push({ x: fx, z: fz, r: .5 }); }
      add(new THREE.BoxGeometry(1.6, 1.2, .9), toon("#3a8f4c"), 322, .6, 152.35, street, .04); add(new THREE.PlaneGeometry(1.4, .5), brd("안내 · info", "#1f2a3a", 1.4, .5, 60), 322, .8, 152.81, street, 0, false); colliders.street.push({ x0: 321.1, x1: 322.9, z0: 151.8, z1: 152.9 });
      const keepDI = [...DANGIN_SPAWNS, { x: 322, z: 152 }, { x: 350, z: 152 }, { x: 345, z: 144 }, { x: 420, z: 139 }, { x: 462, z: 155 }];
      for (let i = 0; i < 16; i++) { const tx = rand(314, 466), tz = rand(146, 196); if (keepDI.some(s => Math.hypot(s.x - tx, s.z - tz) < 6) || Math.abs(tz - 160) < 3.5 || Math.abs(tz - 176) < 3) continue; tree(tx, tz); }
      for (let i = 0; i < 1000; i++) tuft(rand(311, 469), rand(141, 197), rand(.7, 1.4));
      SPAWNS.push(...DANGIN_SPAWNS);
    }

    // ---------- the 여의도 zone: shared helpers ----------
    const G = yeouido, X = x => YD.x + x, Z = z => YD.z + z;
    const ycol = (x0, x1, z0, z1, cam = true) => { const b = { x0: X(x0), x1: X(x1), z0: Z(z0), z1: Z(z1) }; colliders.yeouido.push(b); if (cam) camBlocks.push(b); };
    const ycirc = (x, z, r) => colliders.yeouido.push({ x: X(x), z: Z(z), r });
    const gf = (w, d, x, z, c, y = .02) => { const m = add(new THREE.PlaneGeometry(w, d), typeof c === "string" ? toon(c) : c, x, y, z, G, 0, false); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m; };
    const MRa = area => (x0, x1, z0, z1, c) => ydMap.rects.push({ x0: X(x0), x1: X(x1), z0: Z(z0), z1: Z(z1), c, area });
    const MLa = area => (t, x, z, rot) => ydMap.labels.push({ t, x: X(x), z: Z(z), rot, area });
    const sgn = (text, bg, w, h, x, y, z, ry = 0, fs = 54, fg) => { const p = add(new THREE.PlaneGeometry(w, h), brd(text, bg, w, h, fs, fg), x, y, z, G, 0, false); p.rotation.y = ry; return p; };
    const railY = toon("#7d7a72");
    const swapRail = (x, z, len, z0, z1, gaps) => {   // replace one long railing along z with pieces that leave the given gaps open
      const old = G.children.find(m => m.isMesh && m.geometry.type === "BoxGeometry" && Math.abs(m.position.x - x) < .05 && Math.abs(m.position.z - z) < .05 && Math.abs(m.geometry.parameters.depth - len) < .5); if (old) G.remove(old);
      let a = z0; for (const [g0, g1] of [...gaps, [z1, z1]]) { if (g0 > a) add(new THREE.BoxGeometry(.3, 1, g0 - a), railY, x, .5, (a + g0) / 2, G, .02); a = g1; }
    };
    const railX = (x0, x1, z) => add(new THREE.BoxGeometry(x1 - x0, 1, .3), railY, (x0 + x1) / 2, .5, z, G, .02);
    const railZ = (z0, z1, x) => add(new THREE.BoxGeometry(.3, 1, z1 - z0), railY, x, .5, (z0 + z1) / 2, G, .02);
    const keepY = [...YEOUIDO.spawns.map(s => ({ x: s.x - YD.x, z: s.z - YD.z })), ...YD_KEEP];
    const clear = (x, z, r = 6) => keepY.every(s => Math.hypot(s.x - x, s.z - z) > r);
    const greenM = ["#6f9a5a", "#7fa866", "#5f8a4e", "#8ab26e"].map(c => toon(c));
    const ytree = (x, z, h = rand(4.5, 7)) => { add(new THREE.CylinderGeometry(.22, .36, h, 7), toon(TRUNK), x, h / 2, z, G, .04); for (let j = 0; j < 6; j++) add(new THREE.IcosahedronGeometry(rand(1.1, 1.8), 1), pick(greenM), x + rand(-1.5, 1.5), h + rand(-.4, 1.4), z + rand(-1.5, 1.5), G, .03); ycirc(x, z, .6); };
    const pine = (x, z, h = rand(6, 9)) => { add(new THREE.CylinderGeometry(.2, .32, h * .5, 7), toon("#6a4a32"), x, h * .25, z, G, .04); for (let k = 0; k < 3; k++) add(new THREE.ConeGeometry(2.2 - k * .55, h * .38, 8), toon(pick(["#2f6a3a", "#3a7a42", "#285a32"])), x, h * .45 + k * h * .17, z, G, .04); ycirc(x, z, .6); };

    // ---------- 선유도공원: the old water-treatment plant turned garden, over the white 선유교 ----------
    {
      const MR = MRa("seonyudo"), ML = MLa("seonyudo");
      MR(-400, -200, 150, 300, "rgba(127,168,102,.95)"); MR(-200, -150, 225, 233, "rgba(232,226,212,.95)"); MR(-327, -323, 150, 300, "rgba(215,201,166,.95)");
      add(new THREE.BoxGeometry(204, 6, 158), [toon("#a39d8f"), toon("#a39d8f"), toon("#7fa866"), toon("#a39d8f"), toon("#a39d8f"), toon("#a39d8f")], -300, -3, 225, G, 0);
      gf(200, 150, -300, 225, "#7fa866", .015);
      gf(196, 4, -300, 229, "#d7c9a6", .03); gf(4, 146, -325, 225, "#d7c9a6", .03);
      railX(-400, -200, 150.2); railX(-400, -200, 299.8); railZ(150, 300, -399.8); railZ(150, 225, -200.2); railZ(233, 300, -200.2);
      swapRail(-149.8, 230, 200, 130, 330, [[225, 233]]);
      // 선유교: a white arched footbridge
      const white = toon("#e8e2d4");
      add(new THREE.BoxGeometry(50, .6, 8), white, -175, -.3, 229, G, .06); add(new THREE.BoxGeometry(4, 6, 3), toon("#a9a69a"), -175, -3.3, 229, G, .05);
      for (const z of [225.2, 232.8]) { railX(-200, -150, z);
        const pts = []; for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push(new THREE.Vector3(-200 + 50 * t, Math.sin(t * Math.PI) * 8, z)); }
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, .25, 6), white, 0, .3, 0, G, .02);
        for (let k = 2; k < 15; k += 2) { const t = k / 16, y = Math.sin(t * Math.PI) * 8; add(new THREE.BoxGeometry(.08, y, .08), white, -200 + 50 * t, .3 + y / 2, z, G, 0); } }
      sgn("선유교 · 선유도공원 →", "#3a8f4c", 6, 1.2, -152, 2.6, 233.6, Math.PI);
      // three old filtration basins (sunken, with water plants)
      const basin = (cx, cz, w, d) => {
        const wall = toon("#b8b4a8");
        for (const [bw, bd, bx, bz] of [[w, .8, cx, cz - d / 2], [w, .8, cx, cz + d / 2], [.8, d, cx - w / 2, cz], [.8, d, cx + w / 2, cz]]) add(new THREE.BoxGeometry(bw, 1, bd), wall, bx, .5, bz, G, .04);
        gf(w - .8, d - .8, cx, cz, toon("#4f8fb8", { emissive: new THREE.Color("#1a3a5a"), emissiveIntensity: .3 }), .3);
        for (let i = 0; i < 12; i++) add(new THREE.CylinderGeometry(.05, .08, rand(.8, 1.6), 5), toon("#5aa83e"), cx + rand(-w / 2 + 1, w / 2 - 1), .8, cz + rand(-d / 2 + 1, d / 2 - 1), G);
        ycol(cx - w / 2 - .4, cx + w / 2 + .4, cz - d / 2 - .4, cz + d / 2 + .4, false); MR(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, "rgba(93,138,168,.95)");
      };
      basin(-350, 190, 30, 20); basin(-300, 190, 30, 20); basin(-350, 260, 30, 20);
      for (const [sx, sz] of [[-350, 201.6], [-300, 201.6], [-350, 248.4]]) { add(new THREE.CylinderGeometry(.18, .18, .5, 8), toon("#e8f4f8", { transparent: true, opacity: .8 }), sx + 1.6, .25, sz, G); }
      // 녹색 기둥의 정원: the old concrete pillars, all grown over with ivy
      for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const px = -290 + i * 12.5, pz = 248 + j * 12;
        add(new THREE.BoxGeometry(1.8, 6, 1.8), toon("#b8b4a8"), px, 3, pz, G, .05);
        for (const [dx, dz, ry] of [[0, .92, 0], [0, -.92, Math.PI], [.92, 0, Math.PI / 2], [-.92, 0, -Math.PI / 2]]) { const ih = rand(3, 5.6), iv = add(new THREE.PlaneGeometry(1.7, ih), pick(ivyMats), px + dx, ih / 2, pz + dz, G, 0, false); iv.rotation.y = ry; }
        ycirc(px, pz, 1.4); }
      // the greenhouse
      { const glass = toon("#cfeef0", { transparent: true, opacity: .35 }), frame = toon("#e8e2d4");
        add(new THREE.BoxGeometry(25, 6, 20), glass, -227.5, 3, 170, G, 0); const roof = add(new THREE.CylinderGeometry(10, 10, 25, 12, 1, false, 0, Math.PI), glass, -227.5, 6, 170, G, 0); roof.rotation.z = Math.PI / 2; roof.scale.set(1, 1, .4);
        for (let x = -240; x <= -215; x += 5) add(new THREE.BoxGeometry(.15, 6, 20.1), frame, x, 3, 170, G, 0);
        for (let i = 0; i < 14; i++) add(new THREE.IcosahedronGeometry(rand(.6, 1.2), 1), pick(greenM), rand(-238, -217), rand(.6, 2), rand(162, 178), G, 0);
        ycol(-240, -215, 160, 180); MR(-240, -215, 160, 180, "rgba(207,238,240,.95)"); }
      // map stand by the bridge
      add(new THREE.BoxGeometry(1.6, 1.2, .9), toon("#3a8f4c"), -206, .6, 238.35, G, .04); add(new THREE.PlaneGeometry(1.4, .5), brd("안내 · info", "#1f2a3a", 1.4, .5, 60), -206, .8, 237.89, G, 0, false).rotation.y = Math.PI; ycol(-206.9, -205.1, 237.8, 238.9, false);
      for (let i = 0; i < 40; i++) { const x = rand(-395, -205), z = rand(155, 295); if (!clear(x, z, 7) || (x > -367 && x < -283 && z > 178 && z < 202) || (x > -367 && x < -333 && z > 248 && z < 272) || (x > -296 && x < -234 && z > 242 && z < 290) || (x > -244 && x < -211 && z > 156 && z < 184) || Math.abs(z - 229) < 4 || Math.abs(x + 325) < 4) continue; ytree(x, z); }
      for (let i = 0; i < 1200; i++) { const x = rand(-398, -202), z = rand(152, 298); tuft(X(x), Z(z), rand(.7, 1.3)); }
      ML("선유도공원", -300, 160); ML("선유교", -175, 240); ML("정수지", -325, 210); ML("녹색 기둥의 정원", -265, 292); ML("온실", -227, 186);
    }

    // ---------- 사육신 공원: the shrine and the six tombs, west of 노량진 along its road ----------
    {
      const MR = MRa("sayuksin"), ML = MLa("sayuksin");
      MR(-382, -162, 424, 560, "rgba(127,168,102,.95)"); MR(-164, -148, 449, 461, "rgba(95,97,105,.95)"); MR(-382, -162, 453, 457, "rgba(201,194,178,.95)");
      for (const m of [...G.children]) if (m.isMesh && m.geometry.type === "BoxGeometry" && m.position.x < -150 && m.position.x > -470 && m.position.z > 430 && m.position.z < 500 && m.geometry.parameters.height > 30) G.remove(m);
      swapRail(-149.8, 485, 150, 410, 560, [[449, 461]]);
      gf(220, 136, -272, 492, "#7fa866", .016); gf(16, 12, -156, 455, ROAD, .03);
      gf(150, 4, -240, 455, "#c9c2b2", .03); gf(4, 104, -240, 506, "#c9c2b2", .03); gf(170, 4, -275, 512, "#c9c2b2", .03);
      const wallM = toon("#6a6a66"); railX(-382, -162, 423.8); railX(-382, -162, 560.2); railZ(424, 560, -382.2); railZ(424, 449, -161.8); railZ(461, 560, -161.8);
      // 홍살문: the red gate on the way in
      { const red = toon("#b8382a"); for (const z of [449.6, 460.4]) { add(new THREE.CylinderGeometry(.25, .3, 6.5, 8), red, -172, 3.25, z, G, .03); ycirc(-172, z, .35); }
        add(new THREE.BoxGeometry(.4, .4, 12.4), red, -172, 6.2, 455, G, .03); add(new THREE.BoxGeometry(.3, .3, 11.6), red, -172, 5.3, 455, G, .02);
        for (let z = 449.8; z <= 460.2; z += .7) add(new THREE.CylinderGeometry(.04, .04, 1.1, 5), red, -172, 5.75, z, G, 0); }
      // 의절사: the shrine inside a low wall (open to the east)
      { const cx = -300, cz = 470, red = toon("#8a3a2a");
        add(new THREE.BoxGeometry(20, 1, 14), toon("#b8b0a0"), cx, .5, cz, G, .05);
        for (const dx of [-8, -4, 0, 4, 8]) for (const dz of [-5.5, 5.5]) add(new THREE.CylinderGeometry(.25, .28, 4, 8), red, cx + dx, 3, cz + dz, G, .02);
        add(new THREE.BoxGeometry(17, 3.4, 9), toon("#efe9dd"), cx, 2.7, cz, G, .05);
        add(new THREE.BoxGeometry(21, .6, 15), toon("#3a8f6c"), cx, 5.1, cz, G, .04);
        const rg = new THREE.CylinderGeometry(4, 12, 3.6, 4, 1); rg.rotateY(Math.PI / 4); const roof = add(rg, toon("#4a4f55"), cx, 7.2, cz, G, .08); roof.scale.set(1.45, 1, 1);
        ycol(cx - 10, cx + 10, cz - 7, cz + 7);
        for (const [x0, x1, z0, z1] of [[-322, -278, 451.6, 452.4], [-322, -278, 487.6, 488.4], [-322.4, -321.6, 452, 488], [-278.4, -277.6, 452, 466], [-278.4, -277.6, 474, 488]]) { add(new THREE.BoxGeometry(x1 - x0, 1.8, z1 - z0), toon("#d8d0c0"), (x0 + x1) / 2, .9, (z0 + z1) / 2, G, .03); add(new THREE.BoxGeometry(x1 - x0 + .4, .3, z1 - z0 + .4), toon("#4a4f55"), (x0 + x1) / 2, 1.95, (z0 + z1) / 2, G, 0); ycol(x0, x1, z0, z1, false); }
        sgn("의절사", "#3a2a22", 4, 1, cx + 10.05, 4.3, cz, Math.PI / 2, 70);
        MR(-322, -278, 452, 488, "rgba(216,208,192,.95)"); ML("의절사", -300, 496); }
      // the six tombs, each with its stone and an incense burner in front of every second one (side quest)
      for (let k = 0; k < 6; k++) { const x = -340 + k * 26, z = 528;
        add(new THREE.SphereGeometry(3.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon("#6f9a5a"), x, 0, z, G, .04); ycirc(x, z, 3.7);
        add(new THREE.BoxGeometry(.8, 1.4, .25), toon("#c8c4b8"), x, .7, z - 4.4, G, .02); ycol(x - .5, x + .5, z - 4.6, z - 4.2, false);
        if (k % 2) { add(new THREE.CylinderGeometry(.35, .25, .4, 10), toon("#5a5f66"), x, .55, 521.8, G, .02); add(new THREE.CylinderGeometry(.3, .3, .35, 8), toon("#7a7a74"), x, .17, 521.8, G); ycirc(x, 521.8, .45); }
        MR(x - 3.5, x + 3.5, z - 3.5, z + 3.5, "rgba(111,154,90,.95)"); }
      ML("사육신 묘", -275, 548);
      for (let i = 0; i < 8; i++) { const x = -230 - i * 12, z = 451; add(new THREE.BoxGeometry(.7, .9, .7), toon("#a9a69a"), x, .45, z, G, .02); add(new THREE.BoxGeometry(.9, .7, .9), toon("#c8c4b8"), x, 1.25, z, G, .02); ycirc(x, z, .55); }
      add(new THREE.BoxGeometry(1.6, 1.2, .9), toon("#3a8f4c"), -180, .6, 444.35, G, .04); add(new THREE.PlaneGeometry(1.4, .5), brd("안내 · info", "#1f2a3a", 1.4, .5, 60), -180, .8, 443.89, G, 0, false).rotation.y = Math.PI; ycol(-180.9, -179.1, 443.8, 444.9, false);
      for (let i = 0; i < 45; i++) { const x = rand(-378, -168), z = rand(428, 556); if (!clear(x, z, 7) || (x > -326 && x < -274 && z > 448 && z < 492) || (z > 518 && z < 538) || Math.abs(z - 455) < 4 || Math.abs(x + 240) < 4 || Math.abs(z - 512) < 4 || (x > -186 && z < 466)) continue; pine(x, z); }
      for (let i = 0; i < 900; i++) tuft(X(rand(-380, -164)), Z(rand(426, 558)), rand(.6, 1.2));
      ML("사육신 공원", -272, 436); ML("홍살문", -172, 468);
    }

    // ---------- 이태원: neon streets east of 용산 (through a gap in the park's railing) ----------
    {
      const MR = MRa("itaewon"), ML = MLa("itaewon");
      MR(470, 680, -32, 114, "rgba(128,129,138,.95)"); MR(458, 472, 30, 50, "rgba(95,97,105,.95)"); MR(470, 680, 33, 47, "rgba(95,97,105,.95)"); MR(470, 680, 74, 86, "rgba(90,90,98,.95)"); MR(470, 680, 0, 12, "rgba(95,97,105,.95)");
      swapRail(460.2, 41, 146, -32, 114, [[30, 50]]);
      add(new THREE.BoxGeometry(440, 6, 158), toon("#8a8b92"), 682, -3, 41, G, .05);
      gf(212, 146, 575, 41, "#8a8b92", .015); gf(14, 20, 465, 40, "#6f7078", .026);
      gf(212, 14, 575, 40, "#6f7078", .025); for (let x = 472; x < 680; x += 6) gf(2.2, .3, x, 40, "#e9e7df", .035);
      gf(212, 3, 575, 31.5, WALK, .035); gf(212, 3, 575, 48.5, WALK, .035);
      gf(212, 12, 575, 80, "#5a5a62", .025); gf(212, 12, 575, 6, "#6f7078", .025);
      railX(470, 680, -32.2); railX(470, 680, 114.2); railZ(-32, 114, 680.2);
      let ni = 0;
      const ishop = (x, z, w, d, face, text) => {
        const floors = 2 + Math.floor(R() * 3), h = floors * 3.1 + 4;
        add(new THREE.BoxGeometry(w, h, d), facadeMat(pick(WALLS), floors), x, h / 2, z, G, .1); ycol(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
        const s = face === "+z" ? 1 : -1, col = NEON[ni++ % NEON.length];
        const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#0b0910"; g.fillRect(0, 0, 512, 128); g.shadowColor = col; g.shadowBlur = 20; g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112); g.fillStyle = "#fff"; g.font = `66px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 256, 68);
        const p = add(new THREE.PlaneGeometry(w * .8, w * .2), new THREE.MeshBasicMaterial({ map: canvasTex(c), toneMapped: false }), x, 4.3, z + s * (d / 2 + .06), G, 0, false); p.rotation.y = s > 0 ? 0 : Math.PI;
        MR(x - w / 2, x + w / 2, z - d / 2, z + d / 2, "rgba(70,52,40,.95)");
      };
      const FOOD = ["케밥", "타코", "버거", "피자", "카레", "쌀국수", "브런치", "베이글", "바베큐", "수제 맥주", "와인 바", "디저트", "훠궈", "파스타", "커피"];
      const CLUB = ["클럽", "재즈 바", "라운지", "펍", "노래방", "칵테일", "DJ 바", "루프탑", "댄스", "라이브"];
      const xs = []; for (let x = 486; x <= 650; x += 13) if (!(x > 530 && x < 548) && !(x > 604 && x < 618)) xs.push(x);
      xs.forEach((x, i) => { ishop(x, 24, 11, 12, "+z", FOOD[i % FOOD.length]); ishop(x, 56, 11, 12, "-z", FOOD[(i + 7) % FOOD.length]); ishop(x, 94, 11, 12, "-z", CLUB[i % CLUB.length]); if (x < 645) ishop(x, -12, 11, 12, "+z", CLUB[(i + 4) % CLUB.length]); });
      { add(new THREE.BoxGeometry(25, 48, 26), toon("#9db8cc"), 667.5, 24, -15, G, .2); for (let f = 0; f < 14; f++) add(new THREE.PlaneGeometry(23, 1.2), toon("#5a8db0"), 667.5, 3 + f * 3.2, -1.95, G, 0, false);
        sgn("호텔 · HOTEL", "#1f2a3a", 12, 2, 667.5, 45, -1.9, 0, 64); ycol(655, 680, -28, -2); MR(655, 680, -28, -2, "rgba(157,184,204,.95)"); }
      for (let i = 0; i < 16; i++) { const h = rand(30, 80), x = rand(700, 880), z = rand(-30, 110); add(new THREE.BoxGeometry(rand(16, 28), h, rand(14, 24)), toon(pick(["#efe9dd", "#e9e4da", "#dfe3e6"])), x, h / 2, z, G, .2); }
      for (const [x, z] of [[512, 30.2], [590, 49.8], [642, 30.2]]) { const off = add(new THREE.BoxGeometry(2, .5, .1), toon("#2a2a30"), x, 2.6, z, G, 0, false); }
      add(new THREE.BoxGeometry(1.6, 1.2, .9), toon("#3a8f4c"), 476, .6, 49.35, G, .04); add(new THREE.PlaneGeometry(1.4, .5), brd("안내 · info", "#1f2a3a", 1.4, .5, 60), 476, .8, 48.89, G, 0, false).rotation.y = Math.PI; ycol(475.1, 476.9, 48.8, 49.9, false);
      for (const [x, z] of [[476, 66], [476, 18], [679, 66]]) { add(new THREE.CylinderGeometry(.08, .1, 5, 6), toon("#3a3a3a"), x, 2.5, z, G); add(new THREE.SphereGeometry(.3, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffd89a", toneMapped: false }), x, 5.1, z, G); }
      ML("이태원로", 575, 40); ML("클럽 거리", 575, 80); ML("이태원", 520, -24); ML("호텔", 667, -15);
    }
  }
  // ===== 서강대학교 (Danny 2026-10-18): east of 신촌's campus through a gap in its east wall; the card battlers' plaza (8 ranks,
  // one per chapter) and the 카드 선생님's stall. No monsters here. Built last (seeded layout of everything before stays the same).
  {
    const brd = (text, bg, w, h, fs = 54, fg = "#fff") => { const c = document.createElement("canvas"); c.width = 512; c.height = Math.max(32, Math.round(512 * h / w)); const x = c.getContext("2d"); x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); x.fillStyle = fg; x.font = `${fs}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 256, c.height / 2 + 3); return toon("#ffffff", { map: canvasTex(c) }); };
    const zero = new THREE.Matrix4().makeScale(0, 0, 0), v = new THREE.Vector3();
    for (const o of [...street.children]) if (o.isMesh && o.geometry.type === "DodecahedronGeometry" && o.position.x > 306 && o.position.x < 314 && o.position.z > -217 && o.position.z < -201) street.remove(o);
    leafM.forEach((m, i) => { v.setFromMatrixPosition(m); if (v.x > 306 && v.x < 314 && v.z > -217 && v.z < -201 && v.y < 4) leafM[i] = zero; });
    { const i = colliders.street.findIndex(c => c.x0 !== undefined && Math.abs(c.x0 - 308.6) < .01 && Math.abs(c.x1 - 311.4) < .01 && Math.abs(c.z0 + 251.4) < .01); if (i >= 0) colliders.street.splice(i, 1); }
    colliders.street.push({ x0: 308.6, x1: 311.4, z0: -251.4, z1: -216 }, { x0: 308.6, x1: 311.4, z0: -202, z1: -108.6 });
    barricade(310, -110, 470, -110); barricade(470, -110, 470, -250); barricade(310, -250, 470, -250);
    for (const m of street.children) { const p = m.geometry?.parameters; if (!m.isMesh || m.geometry.type !== "ConeGeometry" || p.radialSegments !== 7 || p.radius < 60) continue;
      const a = Math.atan2(m.position.z, m.position.x - 110); let d = Math.hypot(m.position.x - 110, m.position.z), n = 0;
      while (Math.hypot(Math.max(305, Math.min(476, m.position.x)) - m.position.x, Math.max(-256, Math.min(-104, m.position.z)) - m.position.z) < p.radius + 15 && n++ < 120) { d += 10; m.position.x = 110 + Math.cos(a) * d; m.position.z = Math.sin(a) * d; } }
    // the gate, lawn, paths and the plaza
    for (const z of [-216.5, -201.5]) add(new THREE.BoxGeometry(1.6, 5.5, 1.6), toon("#8a7a6a"), 312, 2.75, z, street, .06);
    add(new THREE.BoxGeometry(1.4, 1.2, 16.4), toon("#7a1f2b"), 312, 6, -209, street, .05);
    for (const s of [-1, 1]) { const p = add(new THREE.PlaneGeometry(14, 1), brd("서강대학교", "#7a1f2b", 14, 1, 64), 312 + s * .72, 6, -209, street, 0, false); p.rotation.y = s * Math.PI / 2; }
    flat(156, 136, 390, -180, "#6fa24e", .03);
    flat(56, 6, 340, -209, "#d7c9a6", .04); flat(6, 40, 390, -226, "#d7c9a6", .04); flat(6, 40, 390, -135, "#d7c9a6", .04); flat(40, 6, 432, -180, "#d7c9a6", .04);
    { const pl = new THREE.Mesh(new THREE.CircleGeometry(24, 40), toon("#c9b9a0")); pl.rotation.x = -Math.PI / 2; pl.position.set(390, .05, -180); pl.receiveShadow = true; pl.name = "ground"; street.add(pl);
      const rg = new THREE.Mesh(new THREE.RingGeometry(14, 16, 40), toon("#b8a688")); rg.rotation.x = -Math.PI / 2; rg.position.set(390, .06, -180); street.add(rg); }
    // the albatross (서강's bird) on a pedestal in the middle of the plaza
    { add(new THREE.CylinderGeometry(1.3, 1.6, 3, 10), toon("#b8b0a0"), 390, 1.5, -180, street, .05); colliders.street.push({ x: 390, z: -180, r: 1.8 });
      const wM = toon("#f4f2ec"), g = new THREE.Group(); g.position.set(390, 3.6, -180); street.add(g);
      const b = new THREE.Mesh(new THREE.SphereGeometry(.6, 12, 8), wM); b.scale.set(.8, .7, 1.6); b.castShadow = true; g.add(b); outline(b, .04);
      const h = new THREE.Mesh(new THREE.SphereGeometry(.32, 10, 8), wM); h.position.set(0, .35, -1); g.add(h); outline(h, .03);
      const bk = new THREE.Mesh(new THREE.ConeGeometry(.1, .6, 6), toon("#e0b43a")); bk.rotation.x = -Math.PI / 2; bk.position.set(0, .3, -1.45); g.add(bk);
      for (const s of [-1, 1]) { const wg = new THREE.Mesh(new THREE.BoxGeometry(3.4, .08, .8), wM); wg.position.set(s * 1.9, .25, 0); wg.rotation.z = s * .25; wg.castShadow = true; g.add(wg); outline(wg, .02);
        const tip = new THREE.Mesh(new THREE.BoxGeometry(.9, .085, .6), toon("#2a2522")); tip.position.set(s * 3.4, .62, .05); tip.rotation.z = s * .25; g.add(tip); } }
    // a banner at the plaza and a numbered flag next to every battler (rank 1 nearest the gate, going round)
    { for (const z of [-200.5, -191.5]) add(new THREE.BoxGeometry(.2, 4.6, .2), toon("#555"), 362, 2.3, z, street);
      const p = add(new THREE.PlaneGeometry(8.6, 1.3), brd("🃏 카드 배틀 광장", "#2f5aa8", 8.6, 1.3, 60), 362, 4, -196, street, 0, false); p.rotation.y = -Math.PI / 2; }
    for (let k = 0; k < 8; k++) { const a = Math.PI + k * Math.PI / 4, fx = 390 + Math.cos(a) * 17.6, fz = -180 + Math.sin(a) * 17.6;
      add(new THREE.CylinderGeometry(.06, .06, 3, 6), toon("#555"), fx, 1.5, fz, street);
      const f = add(new THREE.PlaneGeometry(1, .8), brd(String(k + 1), ["#c9c4b8", "#7ab8ff", "#5aa8ff", "#b47aff", "#9a5aff", "#ff9a3a", "#ff7a2a", "#ffd23d"][k], 1, .8, 340, "#1d1612"), fx + .55, 2.6, fz, street, 0, false); f.material.side = THREE.DoubleSide; f.rotation.y = -a; }
    for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4, bx = 390 + Math.cos(a) * 21.5, bz = -180 + Math.sin(a) * 21.5; const bn = add(new THREE.BoxGeometry(3, .45, .7), toon("#6b4a32"), bx, .25, bz, street, .03); bn.rotation.y = -a + Math.PI / 2; colliders.street.push({ x: bx, z: bz, r: 1.2 }); }
    // buildings: 본관 (north), 로욜라 도서관 (east), 강의동 (south)
    const bldg = (x, z, w, d, h, col, name, face) => {
      add(new THREE.BoxGeometry(w, h, d), toon(col), x, h / 2, z, street, .12); solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
      add(new THREE.BoxGeometry(w + .6, .6, d + .6), toon("#5a4a44"), x, h + .3, z, street, .06);
      const along = face[1] === "z" ? w : d, s = face[0] === "+" ? 1 : -1, ry = face === "+z" ? 0 : face === "-z" ? Math.PI : face === "+x" ? Math.PI / 2 : -Math.PI / 2;
      for (let k = 0; k < Math.floor(along / 4); k++) for (let f = 0; f < Math.floor(h / 4); f++) { const o = -along / 2 + 2 + k * 4, p = add(new THREE.PlaneGeometry(1.4, 2.2), toon("#6a8aa0"), face[1] === "z" ? x + o : x + s * (w / 2 + .03), 2 + f * 4, face[1] === "z" ? z + s * (d / 2 + .03) : z + o, street, 0, false); p.rotation.y = ry; }
      const n = add(new THREE.PlaneGeometry(Math.min(along * .5, 12), 1.1), brd(name, "#7a1f2b", Math.min(along * .5, 12), 1.1, 60), face[1] === "z" ? x : x + s * (w / 2 + .06), h - 1.4, face[1] === "z" ? z + s * (d / 2 + .06) : z, street, 0, false); n.rotation.y = ry;
    };
    bldg(390, -238, 50, 14, 16, "#d8d4cc", "본관", "+z");
    bldg(452, -180, 14, 44, 14, "#c8b8a0", "로욜라 도서관", "-x");
    bldg(390, -122, 50, 12, 12, "#e2ddd2", "강의동", "-z");
    // 카드 선생님's stall by the gate
    { add(new THREE.BoxGeometry(5, 1, 1.4), toon("#8a5a32"), 330, .5, -222, street, .04); const aw = add(new THREE.BoxGeometry(5.6, .1, 2.2), toon("#2f5aa8"), 330, 2.8, -222.4, street, .03); aw.rotation.x = .12;
      for (const dx of [-2.6, 2.6]) add(new THREE.CylinderGeometry(.05, .05, 2.8, 6), toon("#555"), 330 + dx, 1.4, -223.1, street);
      add(new THREE.PlaneGeometry(4.6, .8), brd("단어 카드 가게 · 희귀 카드", "#2f5aa8", 4.6, .8, 50), 330, 1.9, -221.28, street, 0, false);
      for (let i = 0; i < 5; i++) { const c = add(new THREE.BoxGeometry(.5, .04, .7), toon(["#5aa8ff", "#7ab8ff", "#5aa8ff", "#9ac8ff", "#5aa8ff"][i]), 328.2 + i * .9, 1.03, -222, street); c.rotation.y = (i - 2) * .12; }
      colliders.street.push({ x0: 327.4, x1: 332.6, z0: -222.8, z1: -221.2 }); }
    // the map on a stand just inside the gate
    add(new THREE.BoxGeometry(1.6, 1.2, .9), toon("#7a1f2b"), 318, .6, -199.65, street, .04); add(new THREE.PlaneGeometry(1.4, .5), brd("안내 · info", "#1f2a3a", 1.4, .5, 60), 318, .8, -200.11, street, 0, false).rotation.y = Math.PI;
    colliders.street.push({ x0: 317.1, x1: 318.9, z0: -200.2, z1: -199.1 });
    for (let i = 0; i < 40; i++) { const tx = rand(316, 466), tz = rand(-246, -114);
      if (Math.hypot(tx - 390, tz + 180) < 28 || (tx > 361 && tx < 419 && (tz < -228 || tz > -131)) || (tx > 441 && tz > -206 && tz < -154) || Math.abs(tz + 209) < 5 && tx < 370 || Math.abs(tx - 390) < 5 || Math.abs(tz + 180) < 5 && tx > 410 || Math.hypot(tx - 330, tz + 221) < 6 || Math.hypot(tx - 318, tz + 200) < 4) continue;
      tree(tx, tz); }
    for (let i = 0; i < 1100; i++) { const tx = rand(312, 468), tz = rand(-248, -112); if (Math.hypot(tx - 390, tz + 180) > 25) tuft(tx, tz, rand(.7, 1.3)); }
    const SR = (x0, x1, z0, z1, c) => ydMap.rects.push({ x0, x1, z0, z1, c, area: "sogang" });
    SR(310, 470, -250, -110, "rgba(111,162,78,.95)"); SR(366, 414, -204, -156, "rgba(201,185,160,.95)"); SR(312, 368, -212, -206, "rgba(215,201,166,.95)");
    SR(365, 415, -245, -231, "rgba(216,212,204,.95)"); SR(445, 459, -202, -158, "rgba(200,184,160,.95)"); SR(365, 415, -128, -116, "rgba(226,221,210,.95)");
    for (const L of [["서강대학교", 340, -230], ["카드 배틀 광장", 390, -168], ["본관", 390, -238], ["로욜라 도서관", 452, -180, -Math.PI / 2], ["강의동", 390, -122], ["카드 가게", 330, -228]]) ydMap.labels.push({ t: L[0], x: L[1], z: L[2], rot: L[3], area: "sogang" });
  }
  // instanced foliage, cel outline on leaves too
  const leafGeo = new THREE.IcosahedronGeometry(1, 1), tuftGeo = new THREE.ConeGeometry(.07, .5, 4);
  const lm = new THREE.InstancedMesh(leafGeo, toon("#ffffff", {}), leafM.length);
  leafM.forEach((m, i) => { lm.setMatrixAt(i, m); lm.setColorAt(i, leafC[i]); }); lm.castShadow = lm.receiveShadow = true; street.add(lm);
  const lo = new THREE.InstancedMesh(leafGeo, outlineMat, leafM.length), sc = new THREE.Matrix4().makeScale(1.12, 1.12, 1.12);
  leafM.forEach((m, i) => lo.setMatrixAt(i, m.clone().multiply(sc))); street.add(lo);
  const tm = new THREE.InstancedMesh(tuftGeo, toon("#ffffff", {}), tuftM.length);
  tuftM.forEach((m, i) => { tm.setMatrixAt(i, m); tm.setColorAt(i, tuftC[i]); }); street.add(tm);
  lm.raycast = lo.raycast = tm.raycast = () => {};
  mergeStatic(dungeon, new Set());
  mergeStatic(yeouido, new Set());
  mergeStatic(tower, new Set([TOWER.doorMesh]));
  mergeStatic(market, new Set(MARKET.boardMeshes));
  mergeStatic(museum, new Set(MUSEUM.scrollMeshes));
  mergeStatic(street, new Set(swaps.map(s => s.mesh)));
  const C = { bike: "rgba(200,90,60,.95)", water: "rgba(79,143,184,.95)", alien: "rgba(180,140,255,.95)", road: "rgba(128,129,138,.9)", boul: "rgba(95,97,105,.95)", park: "rgba(94,154,62,.95)", square: "rgba(201,185,160,.95)", block: "rgba(70,52,40,.95)", slab: "rgba(225,220,205,.95)", lot: "rgba(110,110,106,.95)", play: "rgba(216,185,138,.95)", green: "rgba(58,143,108,.95)" };
  const R2 = (x0, x1, z0, z1, c, area) => ({ x0, x1, z0, z1, c: C[c], area });
  const rects = [
    R2(-84, 108, -108, 108, "road", "hongdae"), R2(BOUL.x0, BOUL.x1, -108, 108, "boul", "hongdae"), R2(PARK.x0, PARK.x1, PARK.z0, PARK.z1, "park", "hongdae"), R2(SQUARE.x0, SQUARE.x1, SQUARE.z0, SQUARE.z1, "square", "hongdae"),
    ...BX.flatMap(x => BZ.filter(z => !isSquare(x, z)).map(z => R2(x[0], x[1], z[0], z[1], "block", "hongdae"))),
    R2(108, 112, -26, -14, "road", "apt"), R2(110, 310, -108, 108, "road", "apt"),
    ...[[-80, [145, 195, 245, 288]], [70, [145, 195, 245, 288]], [-5, [145, 288]]].flatMap(([z, xs]) => xs.map(x => R2(x - 20, x + 20, z - 5.5, z + 5.5, "slab", "apt"))),
    R2(197, 237, -14, -2, "block", "apt"), ...[[170, -42], [220, -45], [270, -42], [170, 38], [270, 38]].map(([x, z]) => R2(x - 18, x + 18, z - 11, z + 11, "lot", "apt")),
    R2(206, 228, 14, 30, "play", "apt"), R2(167, 173, 9, 15, "green", "apt"),
    R2(-84, 310, 111, 199, "park", "river"), R2(-84, 310, 158, 162, "bike", "river"), R2(-84, 310, 126, 140, "boul", "river"), R2(-84, 310, 199, 260, "water", "river"), R2(213, 227, 199, 245, "boul", "river"), R2(37, 43, 145, 149, "block", "river"), R2(-25, -15, 195, 199, "play", "river"), R2(169, 175, 147, 153, "alien", "river"), R2(15, 25, 108, 114, "road", "river"),
  ];
  const labels = [
    { t: "양화로", x: -70, z: -70, rot: -Math.PI / 2, area: "hongdae" }, { t: "경의선숲길", x: 30, z: 21, area: "hongdae" }, { t: "버스킹 광장", x: -38, z: -40, area: "hongdae" },
    { t: "걷고싶은거리", x: 20, z: -40, rot: -Math.PI / 2, area: "hongdae" }, { t: "홍대입구역", x: ENTRANCE.x + 2, z: ENTRANCE.z - 6, area: "hongdae" }, { t: "관광안내소", x: MAPSPOT.x, z: MAPSPOT.z + 6, area: "hongdae" },
    { t: "서교 아파트", x: 210, z: -97, area: "apt" }, { t: "상가", x: 217, z: -8, area: "apt" }, { t: "놀이터", x: 217, z: 22, area: "apt" }, { t: "정자", x: 170, z: 5, area: "apt" },
    { t: "경비실", x: 117, z: -38, area: "apt" }, { t: "한강", x: 112, z: 220, area: "river" }, { t: "강변북로", x: 60, z: 133, area: "river" }, { t: "나들목", x: 20, z: 117, area: "river" },
    { t: "편의점", x: 40, z: 141, area: "river" }, { t: "낚시터", x: -20, z: 190, area: "river" }, { t: "부서진 다리", x: 220, z: 214, area: "river" }, { t: "자전거길", x: -40, z: 164, area: "river" }, { t: "주차장", x: 170, z: -42, area: "apt" }, { t: "주차장", x: 270, z: 38, area: "apt" },
  ];
  rects.push(...ydMap.rects); labels.push(...ydMap.labels);
  rects.push(R2(-84, 108, -250, -110, "road", "yeonnam"), R2(BOUL.x0, BOUL.x1, -250, -110, "boul", "yeonnam"), R2(-48, 108, -186, -160, "park", "yeonnam"),
    ...[-150, -197].flatMap(z => [[-43, 15], [29, 63], [77, 99]].map(([a, b]) => R2(a, b, z - 4.5, z + 4.5, "block", "yeonnam"))), ...[[-43, -9], [5, 39], [53, 87]].map(([a, b]) => R2(a, b, -236.5, -227.5, "block", "yeonnam")),
    ...[-20, 22, 64, 106].map(x => R2(x - 19, x + 19, -133.5, -122.5, "slab", "yeonnam")),
    R2(108, 310, -250, -110, "road", "sinchon"), R2(130, 162, -245, -125, "square", "sinchon"), R2(200, 222, -250, -110, "boul", "sinchon"), R2(229, 308, -249, -111, "park", "sinchon"),
    ...[[-249.5, -207.5], [-194.5, -174.5], [-161.5, -119.5]].map(([a, b]) => R2(163, 191, a, b, "block", "sinchon")), ...[[-249.5, -207.5], [-194.5, -141.5]].map(([a, b]) => R2(119, 129, a, b, "block", "sinchon")),
    R2(256, 288, -138, -126, "slab", "sinchon"), R2(234, 258, -234, -222, "slab", "sinchon"), R2(281.5, 288.5, -198.5, -191.5, "slab", "sinchon"));
  labels.push({ t: "연트럴파크", x: 30, z: -173, area: "yeonnam" }, { t: "연남로", x: 30, z: -214, area: "yeonnam" }, { t: "양화로", x: -70, z: -200, rot: -Math.PI / 2, area: "yeonnam" }, { t: "꽃집", x: 40, z: -159, area: "yeonnam" },
    { t: "연세로", x: 211, z: -200, rot: -Math.PI / 2, area: "sinchon" }, { t: "먹자골목", x: 146, z: -185, area: "sinchon" }, { t: "신촌대학교", x: 268, z: -165, area: "sinchon" }, { t: "도서관", x: 246, z: -241, area: "sinchon" }, { t: "버스", x: 232, z: -139, area: "sinchon" });
  const areas = { yongsan: { minX: YD.x + 149, maxX: YD.x + 460, minZ: YD.z - 32, maxZ: YD.z + 427 }, noryangjin: { minX: YD.x - 152, maxX: YD.x + 152, minZ: YD.z + 330, maxZ: YD.z + 562 }, yeouido: { minX: YD.x - 152, maxX: YD.x + 152, minZ: YD.z - 4, maxZ: YD.z + 332 }, hongdae: { minX: -84, maxX: 108, minZ: -108, maxZ: 108 }, yeonnam: { minX: -84, maxX: 108, minZ: -250, maxZ: -108 }, dangin: { minX: 310, maxX: 470, minZ: 108, maxZ: 250 }, seonyudo: { minX: YD.x - 402, maxX: YD.x - 148, minZ: YD.z + 145, maxZ: YD.z + 305 }, sayuksin: { minX: YD.x - 385, maxX: YD.x - 148, minZ: YD.z + 420, maxZ: YD.z + 565 }, itaewon: { minX: YD.x + 455, maxX: YD.x + 685, minZ: YD.z - 36, maxZ: YD.z + 118 }, sinchon: { minX: 108, maxX: 310, minZ: -250, maxZ: -108 }, sogang: { minX: 310, maxX: 470, minZ: -250, maxZ: -108 }, apt: { minX: 108, maxX: 310, minZ: -108, maxZ: 108 }, river: { minX: -84, maxX: 310, minZ: 108, maxZ: 250 } };
  const map = { bounds: STREET, rects, labels, areas };
  return { street, station, dungeon, yeouido, tower, market, museum, colliders, camBlocks, npcSpots, setNight, update, occlude, sun, hemi, map };
}
// Bake every static mesh of the district into one mesh per material (thousands of draw calls -> a few dozen).
// Signs that swap day/night materials, instanced foliage and multi-material boxes stay as they are.
function mergeStatic(root, keep) {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert(), mtx = new THREE.Matrix4();   // bake relative to the group (the tunnel sits far away)
  const groups = new Map(), victims = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || keep.has(o) || (o.parent && keep.has(o.parent))) return;
    const key = o.material.uuid + (o.castShadow ? "c" : "n");
    if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, geos: [] });
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (n !== "position" && n !== "normal" && n !== "uv") g.deleteAttribute(n);
    g.applyMatrix4(mtx.multiplyMatrices(toRoot, o.matrixWorld));
    groups.get(key).geos.push(g); victims.push(o);
  });
  for (const o of victims) if (o.parent) o.parent.remove(o);
  for (const { mat, cast, geos } of groups.values()) {
    const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
    m.castShadow = cast; m.receiveShadow = true; m.matrixAutoUpdate = false; m.raycast = () => {};
    root.add(m);
  }
}
const VSIGNS = ["노래방", "PC방", "당구장", "미용실", "치킨", "호프", "학원", "안경"];

// ---------------------------------------------------------------------------------------------------
// 홍대입구역 concourse: restaurant, weapon shop, bench, the stranger, the station worker, the exit.
// Local coordinates (group sits at STATION). Room: x -18..18, z -10..10, exit stairs at z = +10.
function buildStation(g, col, add, toon, glowMats, rand, R) {
  const SX = STATION.x, SZ = STATION.z;
  const floorC = document.createElement("canvas"); floorC.width = floorC.height = 256; const fg = floorC.getContext("2d");
  fg.fillStyle = "#d9d4c8"; fg.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) { fg.fillStyle = (x + y) % 64 ? "#cfc9bc" : "#d9d4c8"; fg.fillRect(x + 1, y + 1, 30, 30); }
  const ft = canvasTex(floorC); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(9, 5);
  const floor = add(new THREE.PlaneGeometry(36, 20), toon("#ffffff", { map: ft }), 0, 0, 0, g, 0, false); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.name = "ground";
  add(new THREE.PlaneGeometry(36, 20), toon("#c9cfc9"), 0, 5, 0, g, 0, false).rotation.x = Math.PI / 2;
  // walls: white tiles with the Line 2 green stripe
  const wallC = document.createElement("canvas"); wallC.width = 512; wallC.height = 128; const wg = wallC.getContext("2d");
  wg.fillStyle = "#eeeee8"; wg.fillRect(0, 0, 512, 128); wg.strokeStyle = "#d6d6ce"; for (let x = 0; x < 512; x += 16) { wg.beginPath(); wg.moveTo(x, 0); wg.lineTo(x, 128); wg.stroke(); }
  wg.fillStyle = "#00a84d"; wg.fillRect(0, 60, 512, 14);
  const wt = canvasTex(wallC); wt.wrapS = THREE.RepeatWrapping; wt.repeat.set(4, 1);
  const wm = toon("#ffffff", { map: wt });
  add(new THREE.PlaneGeometry(36, 5), wm, 0, 2.5, -10, g, 0, false);
  const wl = add(new THREE.PlaneGeometry(20, 5), wm, -18, 2.5, 0, g, 0, false); wl.rotation.y = Math.PI / 2;
  const wr = add(new THREE.PlaneGeometry(20, 5), wm, 18, 2.5, 0, g, 0, false); wr.rotation.y = -Math.PI / 2;
  for (const x of [-11, 11]) { const wf = add(new THREE.PlaneGeometry(14, 5), wm, x, 2.5, 10, g, 0, false); wf.rotation.y = Math.PI; }
  // exit stairs going up at the front middle
  for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(8, .3, .7), toon("#8a8780"), 0, .15 + i * .3, 10.4 + i * .6, g);
  const exitSign = signBoard("출구 2 · 홍대 거리 ↑", "#00a84d", 6, .7); exitSign.position.set(0, 4.2, 9.9); exitSign.rotation.y = Math.PI; g.add(exitSign);
  // pillars
  const occluders = [];
  for (const x of [-9, 0, 9]) for (const z of [-3, 4]) { const p = add(new THREE.BoxGeometry(.9, 5, .9), toon("#e8e6df", { transparent: true }), x, 2.5, z, g, .04); occluders.push(p); col.push({ x: SX + x, z: SZ + z, r: .75 }); }
  // ticket gates (decor)
  for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(.3, 1.1, 1.6), toon("#9aa3a8"), -2.4 + i * 1.2, .55, 6.5, g, .03);
  col.push({ x0: SX - 3, x1: SX + 3, z0: SZ + 5.6, z1: SZ + 7.4 });

  // restaurant (left back corner)
  add(new THREE.BoxGeometry(7, 1.1, 1.2), toon("#8a5a32"), -13, .55, -6.2, g, .04);
  add(new THREE.BoxGeometry(7.2, .12, 1.4), toon("#d7b98c"), -13, 1.16, -6.2, g);
  add(new THREE.BoxGeometry(8, 3.4, .3), toon("#c8402f"), -13, 1.7, -9.8, g);
  const rs = signBoard("홍대 할머니 식당", "#c8402f", 6.4, 1); rs.position.set(-13, 4.1, -9.7); g.add(rs);
  const menuC = document.createElement("canvas"); menuC.width = 256; menuC.height = 320; const mg = menuC.getContext("2d");
  mg.fillStyle = "#2b2320"; mg.fillRect(0, 0, 256, 320); mg.fillStyle = "#f6ead2"; mg.font = `30px ${FONT}`; mg.textAlign = "left";
  [["김치찌개", "9,000"], ["비빔밥", "10,000"], ["떡볶이", "5,000"], ["김밥(포장)", "4,000"]].forEach(([n, p], i) => { mg.fillText(n, 18, 60 + i * 66); mg.textAlign = "right"; mg.fillText(p, 240, 60 + i * 66); mg.textAlign = "left"; });
  const mb = add(new THREE.PlaneGeometry(1.6, 2), toon("#ffffff", { map: canvasTex(menuC) }), -9.6, 2.5, -9.6, g, 0, false);
  for (const [tx, tz] of [[-14.5, -2.5], [-11, -2.5]]) { add(new THREE.CylinderGeometry(.9, .9, .08, 14), toon("#b07a48"), tx, .78, tz, g); add(new THREE.CylinderGeometry(.12, .2, .75, 8), toon("#5a3b25"), tx, .38, tz, g); col.push({ x: SX + tx, z: SZ + tz, r: 1.0 }); }
  col.push({ x0: SX - 16.6, x1: SX - 9.4, z0: SZ - 7, z1: SZ - 5.4 });
  // steam from the pot
  add(new THREE.CylinderGeometry(.35, .3, .35, 12), toon("#3a3a3a"), -11.5, 1.4, -6.2, g);

  // weapon shop (right back corner)
  add(new THREE.BoxGeometry(6, 1.1, 1.2), toon("#59616b"), 13, .55, -6.2, g, .04);
  add(new THREE.BoxGeometry(8, 3.4, .3), toon("#2f4b6e"), 13, 1.7, -9.8, g);
  const ws = signBoard("무기점", "#2f4b6e", 4, 1); ws.position.set(13, 4.1, -9.7); g.add(ws);
  // weapons on the wall rack
  for (let i = 0; i < 3; i++) { const sw = add(new THREE.BoxGeometry(.1, 1.6, .06), toon("#d0d6dc"), 11 + i * .8, 2.2, -9.55, g); sw.rotation.z = .2; }
  const bow = add(new THREE.TorusGeometry(.7, .04, 6, 16, Math.PI), toon("#8a5a32"), 14.6, 2.2, -9.55, g); bow.rotation.z = Math.PI / 2;
  add(new THREE.SphereGeometry(.2, 10, 8), toon("#e0b43a"), 15.6, 2.4, -9.55, g);
  col.push({ x0: SX + 9.8, x1: SX + 16.2, z0: SZ - 7, z1: SZ - 5.4 });

  // bench (sleep)
  add(new THREE.BoxGeometry(3, .15, .8), toon("#8a5a32"), 13.5, .55, 3, g, .03);
  for (const x of [12.3, 14.7]) add(new THREE.BoxGeometry(.15, .5, .7), toon("#444"), x, .25, 3, g);
  col.push({ x0: SX + 11.9, x1: SX + 15.1, z0: SZ + 2.5, z1: SZ + 3.5 });

  // survivors' corner: mats and boxes (decor)
  for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(1.6, .1, 2.2), toon(["#b8382a", "#2f7f86", "#e0a21c", "#6a4fa0"][i]), -15 + i * .2, .05, 2 + i * 2.2, g, 0, false);
  for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(.8, .8, .8), toon("#b08a5a"), -16.8, .4 + (i > 2 ? .8 : 0), -1 + (i % 3) * .9, g, .03);
  col.push({ x0: SX - 18, x1: SX - 16.2, z0: SZ - 1.6, z1: SZ + 1.4 });

  // 우체통: the red Korean post box by the exit = your mailbox
  {
    add(new THREE.CylinderGeometry(.42, .42, 1.3, 16), toon("#d4372b"), -6, .65, 8.4, g, .04);
    add(new THREE.SphereGeometry(.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon("#d4372b"), -6, 1.3, 8.4, g, .03);
    add(new THREE.BoxGeometry(.5, .06, .1), toon("#2a1f17"), -6, 1.05, 7.98, g);
    const c = document.createElement("canvas"); c.width = 128; c.height = 48; const x = c.getContext("2d"); x.fillStyle = "#d4372b"; x.fillRect(0, 0, 128, 48); x.fillStyle = "#fff"; x.font = `30px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("우체통", 64, 26);
    const sg = add(new THREE.PlaneGeometry(.6, .22), toon("#ffffff", { map: canvasTex(c) }), -6, .75, 7.97, g, 0, false); sg.rotation.y = Math.PI;
    col.push({ x: SX - 6, z: SZ + 8.4, r: .6 });
  }
  // the way down to the tracks: a broken screen door on the right wall, taped off
  {
    add(new THREE.BoxGeometry(.3, 3.4, 3.4), toon("#14161a"), 17.8, 1.7, -3.2, g, 0, false);
    for (const dz of [-1.9, 1.9]) add(new THREE.BoxGeometry(.4, 3.6, .3), toon("#9aa3a8"), 17.6, 1.8, -3.2 + dz, g, .03);
    for (const y of [.9, 1.6]) { const t = add(new THREE.BoxGeometry(.06, .14, 3.6), toon("#ffd23d"), 17.4, y, -3.2, g, 0, false); t.rotation.x = y > 1 ? .2 : -.15; }
    const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d"); x.fillStyle = "#c8402f"; x.fillRect(0, 0, 256, 64); x.fillStyle = "#fff"; x.font = `32px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("선로 · 출입 금지", 128, 34);
    const sg = add(new THREE.PlaneGeometry(2.6, .65), toon("#ffffff", { map: canvasTex(c) }), 17.55, 3.9, -3.2, g, 0, false); sg.rotation.y = -Math.PI / 2;
  }
  // 물품보관함: coin lockers on the right wall = your storage
  {
    const c = document.createElement("canvas"); c.width = 256; c.height = 256; const x = c.getContext("2d");
    x.fillStyle = "#7f97a8"; x.fillRect(0, 0, 256, 256); x.strokeStyle = "#4f6474"; x.lineWidth = 4;
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { x.strokeRect(6 + k * 62, 40 + r * 54, 56, 48); x.fillStyle = "#e9e4d8"; x.fillRect(46 + k * 62, 58 + r * 54, 8, 10); x.fillStyle = "#1f2a3a"; x.font = "14px sans-serif"; x.fillText(String(r * 4 + k + 1), 12 + k * 62, 58 + r * 54); }
    x.fillStyle = "#00a84d"; x.fillRect(0, 0, 256, 32); x.fillStyle = "#fff"; x.font = `24px ${FONT}`; x.textAlign = "center"; x.fillText("물품보관함", 128, 24);
    const lk = add(new THREE.BoxGeometry(1, 2.6, 3.6), [toon("#ffffff", { map: canvasTex(c) }), toon("#6f8798"), toon("#6f8798"), toon("#6f8798"), toon("#6f8798"), toon("#6f8798")], 17.4, 1.3, 7.2, g, .04);
    lk.material[0] = lk.material[1]; lk.material[1] = toon("#ffffff", { map: canvasTex(c) });
    col.push({ x0: SX + 16.8, x1: SX + 18, z0: SZ + 5.3, z1: SZ + 9.1 });
  }
  // warm lights
  for (const [x, z] of [[-12, -4], [12, -4], [0, 0], [-12, 5], [12, 5]]) { const L = new THREE.PointLight("#ffe2b0", 30, 16, 2); L.position.set(SX + x, 4.2, SZ + z); g.parent.add(L); }
  const amb = new THREE.PointLight("#ffffff", 40, 30, 2); amb.position.set(SX, 4.6, SZ + 2); g.parent.add(amb);

  function signBoard(text, color, w, h) {
    const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * h / w); const x = c.getContext("2d");
    x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#fff"; x.font = `${Math.round(c.height * .62)}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 256, c.height * .54);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), toon("#ffffff", { map: canvasTex(c) })); return m;
  }

  // NPC standing spots (world coords) and points of interest
  return {
    grandma: { x: SX - 13, z: SZ - 7.3, face: 0 },
    smith: { x: SX + 13, z: SZ - 7.3, face: 0 },
    stranger: { x: SX - 6, z: SZ - 8.6, face: 0 },
    guard: { x: SX + 4, z: SZ + 5, face: Math.PI },
    bench: { x: SX + 13.5, z: SZ + 3.8 },
    exit: { x: SX, z: SZ + 9.3 },
    spawn: { x: SX + 2, z: SZ + 3, face: Math.PI },
    lockers: { x: SX + 15.6, z: SZ + 7.2 },
    mailbox: { x: SX - 6, z: SZ + 7 },
    tunnel: { x: SX + 16.2, z: SZ - 3.2 },
    driver: { x: SX + 15.6, z: SZ + .4, face: -Math.PI / 2 },
    sitters: [{ x: SX - 15, z: SZ + 3 }, { x: SX - 14.6, z: SZ + 7.6 }],
    occluders,
  };
}

// The Dreamcatcher-named women (Danny 2026-10-18: "go for their group stage style, but at least make their hair feel like it is
// theirs"): original characters on Quaternius "Ultimate Modular Women" bodies (CC0, assets/quaternius/LICENSE.txt), dressed in a
// dark gothic / rock stage style; only the hair (colour, length, fringe) follows each member's best-known look. No faces are copied.
// 수아 keeps the look Danny picked on 2026-10-17 (look A + fox ears, tails, bag).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { toon, outline } from "./world.js?v=mvf488lb";

const BLACK = "#16141a", INK = "#232028", WINE = "#6a1a2a", GOLD = "#c9a43a", SILVER = "#c8ccd6";
// hair: what the original hair material is (recoloured) or hides (hats, hoods, the mohawk: then `cap` builds a new crown);
// len = how far down the back (0 = keeps the model's own short hair), bangs = full / side / null, sides = a bob around the face
export const CHARS = {
  sua: { base: "Formal", ko: "수아", col: { "Body/LimeGreen": "#7a1f2b", "Legs/LimeGreen": BLACK, Gold: "#3a2a24", "Feet/Red": BLACK, Brown: "#3b2620" },
    hair: { mat: ["Head/Red"], color: "#2a1c19", len: .74, locks: true }, fox: true, bag: "#7a1f2b" },
  jiyu: { base: "Medieval", ko: "지유", col: { DarkBrown: BLACK, LightBrown: WINE, Gold: GOLD, Black: INK, Metal: SILVER, Brown: "#3b2620" }, hideNodes: ["Sword"],
    hair: { mat: ["Head/White"], hide: ["Head/DarkBrown"], cap: true, color: "#7a2034", len: .62, bangs: "side", locks: true } },
  siyeon: { base: "Punk", ko: "시연", col: { "Body/Pink": BLACK, "Body/Black": INK, "Head/Black": SILVER, "Legs/Black": "#1c1a22", Grey: SILVER, "Feet/Black": BLACK, Brown: "#3b2620", Hair_Brown: "#8a8478" },
    hair: { hide: ["Head/Pink"], cap: true, color: "#dcd4c4", len: .26, wrap: .5 } },
  // Danny 2026-10-18 ("sure"): 가현 and 유현 swapped outfits: 가현 wears the suit, 유현 the military look
  gahyeon: { base: "Suit", ko: "가현", col: { Black: BLACK, White: "#f2efe8", Brown: "#3b2620", Hair_Brown: "#8a5a6a" },
    hair: { mat: ["Head/Hair_Blond"], color: "#f2a6c4", len: .5, bangs: "full" } },
  yoohyeon: { base: "Soldier", ko: "유현", col: { Black: BLACK, Swat: WINE, Grey: INK, Brown: "#3b2620" },
    hair: { mat: ["Head/Hair_Brown"], color: "#3a2418", len: .66, locks: true } },
  dami: { base: "Casual", ko: "다미", col: { White: BLACK, Orange: "#2a2830", Grey: "#ecebe6", Brown: "#3b2620", Hair_Brown: "#121014" },
    hair: { mat: ["Head/Hair_Blond"], color: "#121014", len: 0, bangs: "side" } },
  // the student card battlers (2026-10-18): school uniforms
  stu_seoyeon: { base: "Suit", ko: "서연", col: { Black: "#1f2a4a", White: "#f4f2ec", "Legs/Black": "#3a3048", Brown: "#3b2620", Hair_Brown: "#1a1210" }, hair: { mat: ["Head/Hair_Blond"], color: "#1a1416", len: .42, bangs: "full" } },
  stu_haeun: { base: "Casual", ko: "하은", col: { White: "#f4f2ec", Orange: "#2a3352", Grey: "#f0efe8", Brown: "#3b2620", Hair_Brown: "#4a2e1e" }, hair: { mat: ["Head/Hair_Blond"], color: "#5a3a22", len: 0, bangs: "side" } },
  stu_subin: { base: "Formal", ko: "수빈", col: { "Body/LimeGreen": "#1f2a4a", "Legs/LimeGreen": "#6a2a3a", Gold: "#c8402f", "Feet/Red": "#1a1a1e", Brown: "#3b2620" }, hair: { mat: ["Head/Red"], color: "#2a1a14", len: .5, locks: true } },
  // 서강대학교 (2026-10-18): four of the ranked card battlers, and the 카드 선생님
  sg_minseo: { base: "Casual", ko: "민서", col: { White: "#f4f2ec", Orange: "#7a2a3a", Grey: "#f0efe8", Brown: "#3b2620", Hair_Brown: "#2a1a14" }, hair: { mat: ["Head/Hair_Blond"], color: "#2a1a14", len: .5, bangs: "full" } },
  sg_yuna: { base: "Suit", ko: "유나", col: { Black: "#2a4a3a", White: "#f4f2ec", "Legs/Black": "#2a2a30", Brown: "#3b2620", Hair_Brown: "#4a2e1e" }, hair: { mat: ["Head/Hair_Blond"], color: "#5a3a22", len: .3, bangs: "side" } },
  sg_soyul: { base: "Formal", ko: "소율", col: { "Body/LimeGreen": "#5a3a7a", "Legs/LimeGreen": "#2a2a30", Gold: "#e0b43a", "Feet/Red": "#1a1a1e", Brown: "#3b2620" }, hair: { mat: ["Head/Red"], color: "#1a1214", len: .7, locks: true } },
  sg_dain: { base: "Casual", ko: "다인", col: { White: "#2a2a30", Orange: "#c8a050", Grey: "#ecebe6", Brown: "#3b2620", Hair_Brown: "#8a5a3a" }, hair: { mat: ["Head/Hair_Blond"], color: "#9a6a42", len: .2, bangs: "side" } },
  card_ssaem: { base: "Formal", ko: "카드 선생님", col: { "Body/LimeGreen": "#7a1f2b", "Legs/LimeGreen": "#2a2a30", Gold: "#f4f2ec", "Feet/Red": "#1a1a1e", Brown: "#3b2620" }, hair: { mat: ["Head/Red"], color: "#2a1c19", len: .35, bangs: "side" } },
  handong: { base: "Witch", ko: "한동", col: { Purple: "#2a1430", Brown2: BLACK, Gold: GOLD, "Legs/Brown": BLACK, Brown: "#3b2620" },
    hair: { mat: ["Head/Hair_Black"], hide: ["Head/Purple", "Head/Gold"], cap: true, color: "#d9b46a", len: .6, bangs: "full", locks: true } },
};

const lib = {};
let ready = false;
// the men (Ultimate Modular Men, same rig and animations) live in assets/quaternius/men/ and are named "men/<file>"; their clips are
// called "CharacterArmature|Idle", so the prefix is cut off to match the women
const loader = new GLTFLoader();
export async function loadBase(b, base = "assets/quaternius/") {
  if (!lib[b]) { const g = await loader.loadAsync(`${base}${b}.glb`); for (const a of g.animations) a.name = a.name.replace(/^.*\|/, "");   /* "CharacterArmature|Run" -> "Run"; the \| matters: without it every name was wiped and nobody walked */ lib[b] = g; }
  return lib[b];
}
export async function loadWomen(base = "assets/quaternius/") {
  const need = [...new Set(Object.values(CHARS).map(c => c.base))];
  try { await Promise.all(need.map(b => loadBase(b, base))); ready = true; }
  catch (e) { console.warn("women models not loaded, using KayKit", e); }
  return ready;
}
export const womenReady = () => ready;

function outlineMat(t) {   // the same skinned outline as the KayKit characters
  const m = new THREE.MeshBasicMaterial({ color: "#2a1f17", side: THREE.BackSide });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n transformed += normalize(normal) * ${t.toFixed(6)};`); };
  m.customProgramCacheKey = () => "outline" + t.toFixed(6);   // otherwise three reuses the first outline shader it compiled, whatever its thickness (2026-10-18)
  return m;
}
const partOf = o => ((o.parent && o.parent.name) || o.name).replace(/^[A-Za-z]+_/, "");

// hair, (수아's) fox ears + tails + bag: built in the model's own units and hung on its bones so they move with the animations
function addExtras(scene, c, src) {
  scene.updateMatrixWorld(true);
  const bone = n => scene.getObjectByName(n), wp = n => bone(n).getWorldPosition(new THREE.Vector3());
  const box = new THREE.Box3(); scene.traverse(o => { if (o.isSkinnedMesh && o.visible) box.expandByObject(o); });
  const neck = wp("Neck"), chest = wp("Chest"), hips = wp("Hips"), head = wp("Head");
  const H = neck.y * 1.16, hr = H * .068;   // the body height from the neck, so hats and mohawks don't count
  const headC = new THREE.Vector3(head.x, neck.y + hr * 1.9, head.z), top = headC.y + hr * 1.05;
  const h = c.hair || { len: 0 }, hairM = toon(h.color || "#222", { side: THREE.DoubleSide }), ol = H * .006;
  const hang = (mesh, b, line = true) => { if (line && mesh.isMesh) outline(mesh, ol); scene.add(mesh); mesh.updateMatrixWorld(true); bone(b).attach(mesh); };
  if (h.cap) {   // a new crown where a hat, hood or mohawk was
    const cap = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.12, 20, 12, 0, Math.PI * 2, 0, Math.PI * .56), hairM);
    cap.position.set(headC.x, headC.y + hr * .02, headC.z - hr * .06); cap.scale.set(1, 1, 1.08); hang(cap, "Head");
  }
  if (h.len > 0) {   // the length down the back: a half shell from the crown, leaning back over the shoulders
    const endY = neck.y - (neck.y - hips.y) * h.len, len = headC.y + hr * .2 - endY;
    const wrap = h.wrap || 0, g = new THREE.CylinderGeometry(hr * 1.06, hr * (1.06 + .35 * Math.min(1, h.len * 1.4)), len, 20, 8, true, Math.PI / 2 - .35 - wrap, Math.PI + .7 + 2 * wrap);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = (len / 2 - p.getY(i)) / len; p.setZ(i, p.getZ(i) - t * t * H * .05 * Math.min(1, h.len * 1.5) - t * H * .015); p.setX(i, p.getX(i) * (1 - .25 * Math.max(0, t - .7))); }
    g.computeVertexNormals();
    const back = new THREE.Mesh(g, hairM); back.position.set(headC.x, endY + len / 2, headC.z - hr * .08); hang(back, "Head", false);
  }
  if (h.locks) for (const s of [-1, 1]) {   // two locks over the collarbones
    const l = new THREE.Mesh(new THREE.BoxGeometry(hr * .38, (headC.y - chest.y) + hr * .6, hr * .22), hairM);
    l.position.set(headC.x + s * hr * .92, (headC.y + chest.y) / 2 - hr * .35, headC.z + hr * .22); l.rotation.z = s * .08; hang(l, "Head");
  }
  if (h.sides) for (const s of [-1, 1]) {   // a shoulder-length cut around the face
    const l = new THREE.Mesh(new THREE.BoxGeometry(hr * .26, hr * 1.7, hr * .95), hairM);
    l.position.set(headC.x + s * hr * 1.02, headC.y - hr * .5, headC.z - hr * .2); l.rotation.set(-.12, 0, s * .16); hang(l, "Head");
  }
  if (h.bangs) {   // a fringe: a curved strip that follows the forehead (full = straight across, side = swept to one side)
    const side = h.bangs === "side", g = new THREE.CylinderGeometry(hr * 1.1, hr * 1.16, hr * (side ? .5 : .55), 16, 1, true, -1.05, 2.1);
    const b = new THREE.Mesh(g, hairM); b.position.set(headC.x, headC.y + hr * .52, headC.z + hr * .02); if (side) b.rotation.set(0, -.2, .3); hang(b, "Head");
  }
  if (c.weapon) addWeapon(scene, c.weapon, H, ol, hang, wp, src);
  if (!c.fox) return H;
  for (const s of [-1, 1]) {   // 수아: fox ears
    const e = new THREE.Mesh(new THREE.ConeGeometry(hr * .36, hr * .85, 4), toon(h.color)); e.position.set(headC.x + s * hr * .55, top + hr * .15, headC.z - hr * .05); e.rotation.set(0, Math.PI / 4, -s * .32); hang(e, "Head");
    const inner = new THREE.Mesh(new THREE.ConeGeometry(hr * .2, hr * .55, 4), toon("#f4a9bf")); inner.position.set(headC.x + s * hr * .55, top + hr * .08, headC.z + hr * .06); inner.rotation.set(0, Math.PI / 4, -s * .32); hang(inner, "Head", false);
  }
  for (let i = 0; i < 9; i++) {   // nine cream tails with amber tips
    const a = (i - 4) * .15, grp = new THREE.Group(); grp.position.set(hips.x, hips.y - H * .02, hips.z - H * .07); grp.rotation.set(-.62 - Math.abs(a) * .6, 0, a);
    const tl = new THREE.Mesh(new THREE.CapsuleGeometry(H * .03, H * .24, 4, 8), toon("#f6efe6")); tl.position.y = H * .15; grp.add(tl); outline(tl, ol);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(H * .03, H * .07, 8), toon("#e8a33a")); tip.position.y = H * .3; grp.add(tip);
    hang(grp, "Hips", false);
  }
  const bagC = c.bag, bagPos = new THREE.Vector3(hips.x + H * .1, hips.y + H * .015, hips.z + H * .065);   // crossbody bag
  const bag = new THREE.Mesh(new THREE.BoxGeometry(H * .12, H * .085, H * .04), toon(bagC)); bag.position.copy(bagPos); bag.rotation.z = -.08; hang(bag, "Hips");
  const flap = new THREE.Mesh(new THREE.BoxGeometry(H * .122, H * .04, H * .043), toon(bagC)); flap.position.copy(bagPos).add(new THREE.Vector3(0, H * .025, .002)); hang(flap, "Hips", false);
  const sh = new THREE.Vector3(chest.x - H * .085, neck.y - H * .01, chest.z + H * .045), to = bagPos.clone().add(new THREE.Vector3(0, H * .04, 0));
  const dir = to.clone().sub(sh), strap = new THREE.Mesh(new THREE.BoxGeometry(H * .012, dir.length(), H * .006), toon(bagC));
  strap.position.copy(sh).addScaledVector(dir, .5).add(new THREE.Vector3(0, 0, H * .01)); strap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); hang(strap, "Chest", false);
  return H;
}

// the class weapons (2026-10-18): 검 for the 검객, a Korean horn bow (각궁) for the 궁수, a 방울 bell rattle for the 무당. Built along the
// line across the knuckles (pinky -> index), so they sit in the fist in any rest pose, and hung on the wrist so they follow the hand
function addWeapon(scene, kind, H, ol, hang, wp, src) {
  // placed in the idle pose (the two packs' hand bones point different ways in their rest poses): bow and bell straight up, the sword
  // up and a little forward; then hung on the wrist, so every other animation carries it along
  const saved = []; scene.traverse(o => { if (o.isBone) saved.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]); });
  const mixer = new THREE.AnimationMixer(scene), clip = THREE.AnimationClip.findByName(src.animations, "Idle");
  if (clip) { mixer.clipAction(clip).play(); mixer.update(.4); } scene.updateMatrixWorld(true);
  const side = kind === "bow" ? "L" : "R", idx = wp("Index1" + side), pk = wp("Pinky1" + side), wr = wp("Wrist" + side);   // three drops the dots: Wrist.R -> WristR
  const axis = kind === "sword" ? new THREE.Vector3(0, 1, .45).normalize() : new THREE.Vector3(0, 1, 0);
  const grip = idx.clone().add(pk).add(wr).multiplyScalar(1 / 3), Y = new THREE.Vector3(0, 1, 0);
  const g = new THREE.Group(), add = (geo, col, x, y, z, line = true) => { const m = new THREE.Mesh(geo, toon(col)); m.position.set(x, y, z); g.add(m); if (line) outline(m, ol); return m; };
  if (kind === "sword") {
    add(new THREE.CylinderGeometry(H * .012, H * .012, H * .1, 8), "#3a1a22", 0, 0, 0);                       // the grip
    add(new THREE.BoxGeometry(H * .07, H * .012, H * .03), "#c9a43a", 0, H * .055, 0);                       // the guard
    const bl = add(new THREE.BoxGeometry(H * .022, H * .4, H * .006), "#dfe4ea", 0, H * .26, 0); bl.scale.x = 1;   // the blade
    add(new THREE.ConeGeometry(H * .0156, H * .05, 4), "#dfe4ea", 0, H * .485, 0, false).scale.z = .3;
  } else if (kind === "bow") {
    const L = H * .34, pts = [];   // a recurve: bends back towards the archer, the tips flick forward again
    for (let i = 0; i <= 24; i++) { const t = i / 12 - 1, a = Math.abs(t); pts.push(new THREE.Vector3(0, t * L, -H * .07 * (1 - t * t) + (a > .8 ? H * .05 * ((a - .8) / .2) ** 2 : 0))); }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, H * .009, 6), "#5a2e1a", 0, 0, 0);
    add(new THREE.CylinderGeometry(H * .014, H * .014, H * .08, 8), "#c9a43a", 0, 0, -H * .07, false);         // the grip wrap
    add(new THREE.CylinderGeometry(H * .0016, H * .0016, L * 1.9, 4), "#f2efe6", 0, 0, -H * .005, false);     // the string
  } else if (kind === "bell") {
    add(new THREE.CylinderGeometry(H * .01, H * .012, H * .16, 8), "#7a1f2b", 0, 0, 0);                       // the handle
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, r = i ? H * .028 : 0; add(new THREE.SphereGeometry(H * .018, 10, 8), "#d8b040", Math.cos(a) * r, H * (.1 + (i ? 0 : .02)) + (i % 2) * H * .02, Math.sin(a) * r); }
    ["#c8402f", "#2f6db3", "#e0b020", "#f2efe6", "#2f8a4a"].forEach((c, i) => { const r = add(new THREE.BoxGeometry(H * .012, H * .16, H * .002), c, (i - 2) * H * .01, -H * .15, 0, false); r.rotation.z = (i - 2) * .12; });   // 오방색 ribbons
  } else if (kind === "whistle") {   // the zookeeper's whistle (호루라기) on a red cord, on his chest
    const ch = wp("Chest"), nk = wp("Neck"), at = ch.clone().lerp(nk, .35).add(new THREE.Vector3(0, 0, H * .085));
    add(new THREE.CylinderGeometry(H * .016, H * .016, H * .05, 10), "#d8dde4", 0, 0, 0).rotation.z = Math.PI / 2;
    add(new THREE.BoxGeometry(H * .022, H * .012, H * .02), "#d8dde4", H * .03, H * .006, 0);
    for (const s of [-1, 1]) { const c = add(new THREE.BoxGeometry(H * .006, H * .16, H * .006), "#c8402f", s * H * .045, H * .075, -H * .02, false); c.rotation.z = -s * .55; }
    g.position.copy(at); hang(g, "Chest", false);
    mixer.stopAllAction(); mixer.uncacheRoot(scene); for (const [o, p, q, sc] of saved) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(sc); } scene.updateMatrixWorld(true);
    return;
  }
  g.position.copy(grip); g.quaternion.setFromUnitVectors(Y, axis); hang(g, "Wrist" + side, false);
  mixer.stopAllAction(); mixer.uncacheRoot(scene); for (const [o, p, q, sc] of saved) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(sc); } scene.updateMatrixWorld(true);
}
// all the coloured parts of one person in ONE skinned mesh with the colours per vertex (Danny 2026-10-19 asked what the new models cost:
// a man is 10-17 coloured parts, each drawn for itself, its outline and its shadow; merged he is one). Only when the parts share one
// bind pose, otherwise they stay as they are.
function mergeParts(skinned) {
  const sk = skinned.filter(o => o.isSkinnedMesh && o.visible), rest = skinned.filter(o => !sk.includes(o));
  if (sk.length < 2) return skinned;
  const a = sk[0];   // a skinned part is placed by its bones, not by its parent, so parts merge when they share the bind pose
  if (!sk.every(o => o.bindMode === "attached" && o.bindMatrix.equals(a.bindMatrix))) return skinned;
  // a bone counts as the same only with the same inverse: parts rigged in another pose (the explorer's backpack) keep their own
  // (Danny 2026-10-19: merging them with the body's inverses stretched the backpack along the floor)
  const bones = [], inv = [], local = new Map();
  for (const o of sk) local.set(o, o.skeleton.bones.map((b, i) => { const iv = o.skeleton.boneInverses[i]; let k = bones.findIndex((x, j) => x === b && inv[j].equals(iv)); if (k < 0) { k = bones.length; bones.push(b); inv.push(iv.clone()); } return k; }));
  const indexed = sk.every(o => o.geometry.index);
  const geos = sk.map(o => {
    let g = o.geometry.clone(); if (!indexed && g.index) g = g.toNonIndexed();
    for (const n of Object.keys(g.attributes)) if (!["position", "normal", "skinIndex", "skinWeight"].includes(n)) g.deleteAttribute(n);
    const n = g.attributes.position.count, col = new Float32Array(n * 3), c = o.material.color;
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const si = g.attributes.skinIndex, out = new Uint16Array(si.count * 4);
    const map = local.get(o); for (let i = 0; i < si.count; i++) for (let j = 0; j < 4; j++) out[i * 4 + j] = map[si.getComponent(i, j)] ?? 0;
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(out, 4));
    g.morphAttributes = {}; return g;
  });
  const merged = mergeGeometries(geos, false); if (!merged) return skinned;
  const m = new THREE.SkinnedMesh(merged, toon("#ffffff", { vertexColors: true, side: THREE.DoubleSide }));
  m.position.copy(a.position); m.quaternion.copy(a.quaternion); m.scale.copy(a.scale); m.castShadow = true; m.frustumCulled = false; m.name = "merged";
  a.parent.add(m); m.bind(new THREE.Skeleton(bones, inv), a.bindMatrix);
  for (const o of sk) o.parent.remove(o);
  return [m, ...rest];
}
export const makeWoman = (key, height = 2.1) => makePerson(CHARS[key], height);
// any body from either pack, dressed by a description like the ones in CHARS (also used by the model comparison page)
export function makePerson(c, height = 2.1) {
  const src = lib[c.base];
  const scene = SkeletonUtils.clone(src.scene);
  const root = new THREE.Group(), inner = new THREE.Group(), skinned = [];
  for (const n of c.hideNodes || []) { const o = scene.getObjectByName(n); if (o) o.visible = false; }
  const hairMats = new Set(c.hair?.mat || []), hideMats = new Set(c.hair?.hide || []), col0 = c.col || {};
  scene.traverse(o => {
    if (!o.isMesh || !o.visible) return;
    const part = partOf(o), m = o.material.name, key2 = part + "/" + m;
    if (hideMats.has(key2)) { o.visible = false; return; }
    const col = hairMats.has(key2) ? c.hair.color : col0[key2] ?? col0[m] ?? "#" + o.material.color.getHexString();
    o.material = toon(col, { side: THREE.DoubleSide }); o.castShadow = true; o.frustumCulled = false; skinned.push(o);
  });
  if (!c.noMerge) skinned.splice(0, skinned.length, ...mergeParts(skinned));
  // the outline thickness is in the mesh's own units: the women's meshes are ~1.84 tall, the men's are stored 100x smaller
  let gy = 0; for (const o of skinned) { o.geometry.computeBoundingBox(); gy = Math.max(gy, o.geometry.boundingBox.max.y - o.geometry.boundingBox.min.y); }
  const om = outlineMat(.012 * Math.min(1, (gy || 1.84) / 1.84));
  for (const o of skinned) {
    const l = o.isSkinnedMesh ? new THREE.SkinnedMesh(o.geometry, om) : new THREE.Mesh(o.geometry, om); if (o.isSkinnedMesh) l.bind(o.skeleton, o.bindMatrix);
    l.position.copy(o.position); l.quaternion.copy(o.quaternion); l.scale.copy(o.scale); l.frustumCulled = false; l.raycast = () => {};
    o.parent.add(l);
  }
  const H = addExtras(scene, c, src);
  inner.add(scene); root.add(inner);
  inner.rotation.y = Math.PI;                    // the model faces +z, our characters face -z
  inner.scale.setScalar(height / H);
  const mixer = new THREE.AnimationMixer(scene), actions = {};
  const act = n => { if (actions[n]) return actions[n]; const clip = THREE.AnimationClip.findByName(src.animations, n); return clip ? (actions[n] = mixer.clipAction(clip)) : null; };
  let cur = null, oneShot = null, deadPlayed = false;
  function play(n, fade = .2) { const a = act(n); if (!a || a === cur) return; a.reset().setEffectiveWeight(1).fadeIn(fade).play(); if (cur) cur.fadeOut(fade); cur = a; }
  function once(n, fade = .1) {
    const a = act(n); if (!a) return;
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.setEffectiveWeight(1); a.fadeIn(fade).play(); if (cur) cur.fadeOut(fade); oneShot = a;
    if (n !== "Death") setTimeout(() => { if (oneShot === a) { a.fadeOut(.15); oneShot = null; if (cur) cur.fadeIn(.15); } }, a.getClip().duration * 900);
  }
  // which clip does what (the player classes swing, aim or shake their weapon; shopkeepers now and then do something with their hands)
  const A = { idle: "Idle", attack: "Interact", hit: "HitRecieve", cast: null, busy: null, ...(c.anims || {}) };
  let busyT = 4 + Math.random() * 6;
  play(A.idle, 0); mixer.update(Math.random() * 2);
  return {
    root, height: height + .35,
    emote(name) { once(name === "wave" ? "Wave" : "Interact", .2); },
    trigger(evt) { if (evt === "hit" && !deadPlayed) once(A.hit); else if (evt === "attack") once(A.attack); },
    anim(dt, s = {}) {
      if (s.dead) { if (!deadPlayed) { deadPlayed = true; once("Death"); } mixer.update(dt); return; }
      if (deadPlayed) { deadPlayed = false; act("Death")?.stop(); cur = null; }
      if (s.moving) play(s.walk ? "Walk" : "Run");
      else if (s.casting && A.cast) play(A.cast);
      else if (A.busy && (busyT -= dt) < 0) { busyT = 6 + Math.random() * 8; once(A.busy, .3); play(A.idle); }
      else play(A.idle);
      mixer.update(dt);
    },
  };
}

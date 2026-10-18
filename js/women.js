// The Dreamcatcher-named women (Danny 2026-10-18: "go for their group stage style, but at least make their hair feel like it is
// theirs"): original characters on Quaternius "Ultimate Modular Women" bodies (CC0, assets/quaternius/LICENSE.txt), dressed in a
// dark gothic / rock stage style; only the hair (colour, length, fringe) follows each member's best-known look. No faces are copied.
// 수아 keeps the look Danny picked on 2026-10-17 (look A + fox ears, tails, bag).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { toon, outline } from "./world.js?v=mvdt7esv";

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
export async function loadWomen(base = "assets/quaternius/") {
  const loader = new GLTFLoader(), need = [...new Set(Object.values(CHARS).map(c => c.base))];
  try { await Promise.all(need.map(async b => { lib[b] = await loader.loadAsync(`${base}${b}.glb`); })); ready = true; }
  catch (e) { console.warn("women models not loaded, using KayKit", e); }
  return ready;
}
export const womenReady = () => ready;

function outlineMat(t) {   // the same skinned outline as the KayKit characters
  const m = new THREE.MeshBasicMaterial({ color: "#2a1f17", side: THREE.BackSide });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n transformed += normalize(normal) * ${t.toFixed(4)};`); };
  return m;
}
const partOf = o => ((o.parent && o.parent.name) || o.name).replace(/^[A-Za-z]+_/, "");

// hair, (수아's) fox ears + tails + bag: built in the model's own units and hung on its bones so they move with the animations
function addExtras(scene, c) {
  scene.updateMatrixWorld(true);
  const bone = n => scene.getObjectByName(n), wp = n => bone(n).getWorldPosition(new THREE.Vector3());
  const box = new THREE.Box3(); scene.traverse(o => { if (o.isSkinnedMesh && o.visible) box.expandByObject(o); });
  const neck = wp("Neck"), chest = wp("Chest"), hips = wp("Hips"), head = wp("Head");
  const H = neck.y * 1.16, hr = H * .068;   // the body height from the neck, so hats and mohawks don't count
  const headC = new THREE.Vector3(head.x, neck.y + hr * 1.9, head.z), top = headC.y + hr * 1.05;
  const h = c.hair, hairM = toon(h.color, { side: THREE.DoubleSide }), ol = H * .006;
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

export function makeWoman(key, height = 2.1) {
  const c = CHARS[key], src = lib[c.base];
  const scene = SkeletonUtils.clone(src.scene);
  const root = new THREE.Group(), inner = new THREE.Group(), skinned = [];
  for (const n of c.hideNodes || []) { const o = scene.getObjectByName(n); if (o) o.visible = false; }
  const hairMats = new Set(c.hair.mat || []), hideMats = new Set(c.hair.hide || []);
  scene.traverse(o => {
    if (!o.isMesh || !o.visible) return;
    const part = partOf(o), m = o.material.name, key2 = part + "/" + m;
    if (hideMats.has(key2)) { o.visible = false; return; }
    const col = hairMats.has(key2) ? c.hair.color : c.col[key2] ?? c.col[m] ?? "#" + o.material.color.getHexString();
    o.material = toon(col, { side: THREE.DoubleSide }); o.castShadow = true; o.frustumCulled = false; skinned.push(o);
  });
  const om = outlineMat(.012);
  for (const o of skinned) {
    const l = o.isSkinnedMesh ? new THREE.SkinnedMesh(o.geometry, om) : new THREE.Mesh(o.geometry, om); if (o.isSkinnedMesh) l.bind(o.skeleton, o.bindMatrix);
    l.position.copy(o.position); l.quaternion.copy(o.quaternion); l.scale.copy(o.scale); l.frustumCulled = false; l.raycast = () => {};
    o.parent.add(l);
  }
  const H = addExtras(scene, c);
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
  play("Idle", 0); mixer.update(Math.random() * 2);
  return {
    root, height: height + .35,
    emote(name) { once(name === "wave" ? "Wave" : "Interact", .2); },
    trigger(evt) { if (evt === "hit" && !deadPlayed) once("HitRecieve"); else if (evt === "attack") once("Interact"); },
    anim(dt, s = {}) {
      if (s.dead) { if (!deadPlayed) { deadPlayed = true; once("Death"); } mixer.update(dt); return; }
      if (deadPlayed) { deadPlayed = false; act("Death")?.stop(); cur = null; }
      play(s.moving ? (s.walk ? "Walk" : "Run") : "Idle");
      mixer.update(dt);
    },
  };
}

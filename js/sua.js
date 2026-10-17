// 수아 (Danny 2026-10-17 picked look A on https://claude.ai/artifact/PxoFxJsnL8RSW7jNVLPJz9):
// Quaternius "Ultimate Modular Women" Formal (CC0, assets/quaternius/LICENSE.txt) recoloured to a dark red top over a short
// black skirt, plus code-built long hair to the middle of her back, fox ears, nine tails and a crossbody bag.
// Original character: style cues only. Same interface as makeKay (root, height, anim, trigger, emote).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { toon, outline } from "./world.js";

let src = null;
export async function loadSua() {
  try { src = await new GLTFLoader().loadAsync("assets/quaternius/Formal.gltf"); } catch (e) { console.warn("수아 model not loaded, using KayKit", e); }
  return !!src;
}
export const suaReady = () => !!src;

const HAIR = "#2a1c19", BURG = "#7a1f2b", BLACK = "#1e1c22";
const COL = { "Body/LimeGreen": BURG, "Legs/LimeGreen": BLACK, Gold: "#3a2a24", "Head/Red": HAIR, "Feet/Red": BLACK, Brown: "#3b2620" };

function outlineMat(t) {   // same skinned outline as the KayKit characters
  const m = new THREE.MeshBasicMaterial({ color: "#2a1f17", side: THREE.BackSide });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n transformed += normalize(normal) * ${t.toFixed(4)};`); };
  return m;
}

// hair, ears, tails and bag, built in the model's own units and hung on its bones so they follow the animations
function addExtras(scene) {
  scene.updateMatrixWorld(true);
  const bone = n => scene.getObjectByName(n), wp = n => bone(n).getWorldPosition(new THREE.Vector3());
  const box = new THREE.Box3(); scene.traverse(o => { if (o.isSkinnedMesh) box.expandByObject(o); });
  const H = box.max.y - box.min.y, neck = wp("Neck"), chest = wp("Chest"), hips = wp("Hips");
  const top = box.max.y, hr = H * .068;
  const headC = new THREE.Vector3(wp("Head").x, top - hr * 1.05, wp("Head").z);
  const hairM = toon(HAIR, { side: THREE.DoubleSide }), ol = H * .006;
  const hang = (mesh, b, line = true) => { if (line && mesh.isMesh) outline(mesh, ol); scene.add(mesh); mesh.updateMatrixWorld(true); bone(b).attach(mesh); };

  // long hair: a half shell from the crown to the middle of the back, leaning back over the shoulders
  const endY = hips.y + (chest.y - hips.y) * .35, len = headC.y + hr * .2 - endY;
  const g = new THREE.CylinderGeometry(hr * 1.06, hr * 1.3, len, 20, 8, true, Math.PI / 2 - .35, Math.PI + .7);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = (len / 2 - p.getY(i)) / len; p.setZ(i, p.getZ(i) - t * t * H * .05 - t * H * .015); p.setX(i, p.getX(i) * (1 - .25 * Math.max(0, t - .7))); }
  g.computeVertexNormals();
  const back = new THREE.Mesh(g, hairM); back.position.set(headC.x, endY + len / 2, headC.z - hr * .08); hang(back, "Head", false);
  for (const s of [-1, 1]) {   // two front locks over the collarbones
    const l = new THREE.Mesh(new THREE.BoxGeometry(hr * .38, (headC.y - chest.y) + hr * .6, hr * .22), hairM);
    l.position.set(headC.x + s * hr * .92, (headC.y + chest.y) / 2 - hr * .35, headC.z + hr * .22); l.rotation.z = s * .08; hang(l, "Head");
  }
  for (const s of [-1, 1]) {   // fox ears
    const e = new THREE.Mesh(new THREE.ConeGeometry(hr * .36, hr * .85, 4), toon(HAIR)); e.position.set(headC.x + s * hr * .55, top + hr * .15, headC.z - hr * .05); e.rotation.set(0, Math.PI / 4, -s * .32); hang(e, "Head");
    const inner = new THREE.Mesh(new THREE.ConeGeometry(hr * .2, hr * .55, 4), toon("#f4a9bf")); inner.position.set(headC.x + s * hr * .55, top + hr * .08, headC.z + hr * .06); inner.rotation.set(0, Math.PI / 4, -s * .32); hang(inner, "Head", false);
  }
  for (let i = 0; i < 9; i++) {   // nine cream tails with amber tips
    const a = (i - 4) * .15, grp = new THREE.Group(); grp.position.set(hips.x, hips.y - H * .02, hips.z - H * .07); grp.rotation.set(-.62 - Math.abs(a) * .6, 0, a);
    const c = new THREE.Mesh(new THREE.CapsuleGeometry(H * .03, H * .24, 4, 8), toon("#f6efe6")); c.position.y = H * .15; grp.add(c); outline(c, ol);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(H * .03, H * .07, 8), toon("#e8a33a")); tip.position.y = H * .3; grp.add(tip);
    hang(grp, "Hips", false);
  }
  // crossbody bag: strap from the right shoulder to the left hip
  const bagPos = new THREE.Vector3(hips.x + H * .1, hips.y + H * .015, hips.z + H * .065);
  const bag = new THREE.Mesh(new THREE.BoxGeometry(H * .12, H * .085, H * .04), toon(BURG)); bag.position.copy(bagPos); bag.rotation.z = -.08; hang(bag, "Hips");
  const flap = new THREE.Mesh(new THREE.BoxGeometry(H * .122, H * .04, H * .043), toon(BURG)); flap.position.copy(bagPos).add(new THREE.Vector3(0, H * .025, .002)); hang(flap, "Hips", false);
  const sh = new THREE.Vector3(chest.x - H * .085, neck.y - H * .01, chest.z + H * .045), to = bagPos.clone().add(new THREE.Vector3(0, H * .04, 0));
  const dir = to.clone().sub(sh), strap = new THREE.Mesh(new THREE.BoxGeometry(H * .012, dir.length(), H * .006), toon(BURG));
  strap.position.copy(sh).addScaledVector(dir, .5).add(new THREE.Vector3(0, 0, H * .01)); strap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); hang(strap, "Chest", false);
  return H;
}

export function makeSua(height = 2.1) {
  const scene = SkeletonUtils.clone(src.scene);
  const root = new THREE.Group(), inner = new THREE.Group();
  const skinned = [];
  scene.traverse(o => {
    if (!o.isMesh) return;
    const part = ((o.parent && o.parent.name) || o.name).replace(/^Forma[dl]_/, ""), m = o.material.name;
    const c = COL[part + "/" + m] ?? COL[m] ?? "#" + o.material.color.getHexString();
    o.material = toon(c, { side: THREE.DoubleSide }); o.castShadow = true; o.frustumCulled = false; skinned.push(o);
  });
  const om = outlineMat(.012);   // in model units, before the scale below
  for (const o of skinned) {
    const l = new THREE.SkinnedMesh(o.geometry, om); l.bind(o.skeleton, o.bindMatrix);
    l.position.copy(o.position); l.quaternion.copy(o.quaternion); l.scale.copy(o.scale); l.frustumCulled = false; l.raycast = () => {};
    o.parent.add(l);
  }
  const H = addExtras(scene);
  inner.add(scene); root.add(inner);
  inner.rotation.y = Math.PI;                    // the model faces +z, our characters face -z
  inner.scale.setScalar(height / H);
  const mixer = new THREE.AnimationMixer(scene), actions = {};
  const act = n => actions[n] || (actions[n] = THREE.AnimationClip.findByName(src.animations, n) ? mixer.clipAction(THREE.AnimationClip.findByName(src.animations, n)) : null);
  let cur = null, oneShot = null, deadPlayed = false;
  function play(n, fade = .2) { const a = act(n); if (!a || a === cur) return; a.reset().setEffectiveWeight(1).fadeIn(fade).play(); if (cur) cur.fadeOut(fade); cur = a; }
  function once(n, fade = .1) {
    const a = act(n); if (!a) return;
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.setEffectiveWeight(1); a.fadeIn(fade).play(); if (cur) cur.fadeOut(fade); oneShot = a;
    if (n !== "Death") setTimeout(() => { if (oneShot === a) { a.fadeOut(.15); oneShot = null; if (cur) cur.fadeIn(.15); } }, a.getClip().duration * 900);
  }
  play("Idle", 0);
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
